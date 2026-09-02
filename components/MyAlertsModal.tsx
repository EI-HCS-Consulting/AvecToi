import { useState } from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from "react-native";
import type { Reservation, ReservationChangeHistoryEntry, Task } from "@/lib/types";
import type { Theme } from "@/lib/themes";
import { toFrShort } from "@/lib/slotUtils";
import type { RelaisCoverageSummary } from "@/lib/relaisAlerts";
import type { PinResetRequest } from "@/lib/pinResetRequests";

function relaisCoverageLine(s: RelaisCoverageSummary): string {
  const periods = s.ranges.map((r) => `du ${toFrShort(new Date(r.start_date + "T12:00:00"))} au ${toFrShort(new Date(r.end_date + "T12:00:00"))}`).join(", ");
  return s.fullyCovered ? `Tu as pris en charge la totalité de la période : ${periods}` : `Tu as pris en charge une partie de la période : ${periods}`;
}

// Sous-menu "Mes alertes" (Mon compte, juste après "Mes Checklists") —
// regroupe en un seul endroit les recasages/annulations automatiques posés
// par book_intervention() (intervention prioritaire) et
// apply_slot_rule_change() (changement de règles fait par l'admin) sur les
// réservations "Visite"/"Nuit" de ce visiteur/intervenant/admin. Complète
// RebookingAlertModal (popup bloquant à l'ouverture de l'app pour la toute
// première alerte non lue, visiteur/intervenant uniquement) : ici on peut
// consulter à tout moment les alertes actives (activeAlerts, prop calculée
// par l'écran appelant à partir de ses réservations) et l'historique
// permanent (reservation_change_history, jamais effacé, contrairement aux
// champs alert_* qui disparaissent dès que la réservation concernée est
// modifiée/vue).
//
// Composant volontairement sans contexte (pas de useVisitorSpace/useSpace) :
// visiteur, intervenant et admin l'utilisent tous les trois depuis des
// écrans (et des contextes React) différents — onModify/onMarkSeen laissent
// chaque appelant brancher sa propre navigation et sa propre synchro
// calendrier/BDD.
function frDate(iso: string | null): string {
  return iso
    ? new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "";
}

function changeLine(h: ReservationChangeHistoryEntry): string {
  if (h.change_type === "night_cancelled") return `${frDate(h.previous_date)} à ${h.previous_creneau} — nuitée annulée`;
  if (h.change_type === "rebooking_failed") return `${frDate(h.previous_date)} à ${h.previous_creneau} → non replacé`;
  return `${frDate(h.previous_date)} à ${h.previous_creneau} → ${frDate(h.new_date)} à ${h.new_creneau}`;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  C: Theme;
  activeAlerts: Reservation[];
  history: ReservationChangeHistoryEntry[];
  onModify: (r: Reservation) => void;
  onMarkSeen: (r: Reservation) => void | Promise<void>;
  // Marque une entrée de reservation_change_history comme vue — action
  // explicite (bouton), plus jamais déclenchée par la simple fermeture du
  // popup (sinon un visiteur qui ouvre "Mes alertes" pour tout autre motif
  // et referme perd sans le vouloir ses alertes de changement de créneau).
  onMarkHistorySeen?: (h: ReservationChangeHistoryEntry) => void | Promise<void>;
  // Alerte RGPD (conservation des données proche de l'échéance, admin
  // uniquement) — voir lib/rgpd.ts et RgpdAlertModal.tsx pour le popup
  // équivalent à l'ouverture de l'app. Absente/nulle si pas d'espace ou hors
  // fenêtre d'alerte.
  rgpdAlert?: { message: string; onProlong: () => void; prolonging: boolean } | null;
  // Besoins de relais ouverts ciblant cette identité (voir
  // lib/relaisAlerts.ts) — même source que le popup RelaisAlertModal, mais
  // consultable ici à tout moment plutôt que sur une seule connexion.
  relaisAlerts?: Task[];
  onClaimRelais?: (t: Task) => void;
  onDismissRelais?: (t: Task) => void | Promise<void>;
  // Besoins de relais déjà pris en charge (en tout ou partie) par cette
  // identité — voir lib/relaisAlerts.ts, fetchMyRelaisCoverageHistory.
  // Affichés dans "Historique" plutôt que dans "Besoins de relais", puisqu'il
  // n'y a plus rien à demander à la personne pour ces besoins-là.
  relaisCoverageHistory?: RelaisCoverageSummary[];
  // Demandes de réinitialisation de code envoyées depuis l'écran "Qui
  // êtes-vous ?" (visitor-identify.tsx) — admin uniquement. Même popup
  // source que PinResetAlertModal à l'ouverture de l'app, consultable ici à
  // tout moment. Voir supabase/migrations/20260901_pin_reset_requests.sql.
  pinResetRequests?: PinResetRequest[];
  onResetPinRequest?: (r: PinResetRequest) => void | Promise<void>;
  onDismissPinResetRequest?: (r: PinResetRequest) => void | Promise<void>;
  // Demandes déjà traitées (resolved_at non nul) — message symétrique visible
  // aussi bien côté visiteur (a-t-il fait la demande, quand a-t-elle été
  // traitée) que côté admin (qui a demandé, quand il/elle l'a traitée).
  // adminFirstname/adminLastname viennent de patient_spaces, déjà disponibles
  // chez les deux appelants (space.admin_firstname/admin_lastname).
  pinResetHistory?: PinResetRequest[];
  adminFirstname?: string | null;
  adminLastname?: string | null;
  // Le contenu diffère selon qui regarde : l'admin voit qui a demandé, le
  // visiteur voit qui a traité. Défaut visiteur (les deux autres appelants —
  // intervenant compris — n'utilisent jamais pinResetHistory).
  pinResetHistoryIsAdmin?: boolean;
}

// Un item "Marquer comme lu" (activeAlerts ou history) est capturé ici au
// moment du clic, avant que le parent ne le fasse disparaître de ses props —
// c'est ce qui alimente le bloc "Archives" repliable. Purement local à la
// session de ce composant monté (même principe que sessionHiddenIds dans
// PinResetAlertModal) : pas de persistance en base, la liste est réinitialisée
// à chaque remontage de l'écran appelant.
type ArchivedEntry =
  | { kind: "alert"; id: string; message: string }
  | { kind: "history"; id: string; type: string; changeType: string; line: string; msg: string; changedAt: string };

function frDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${date} à ${time}`;
}

// Une ligne par info, comme demandé : la version admin ajoute "Demandée par"
// (l'admin ne connaît pas déjà le nom, contrairement au visiteur qui est
// lui-même le demandeur) et omet le nom de l'admin sur la ligne "PIN
// Réinitialisé" (implicite, c'est lui/elle qui vient de la traiter).
function pinResetHistoryLines(
  r: PinResetRequest,
  isAdmin: boolean,
  adminFirstname?: string | null,
  adminLastname?: string | null,
): string[] {
  const requested = `Demande de réinitialisation : le ${frDateTime(r.created_at)}`;
  const resolved = r.resolved_at ? frDateTime(r.resolved_at) : "";
  if (isAdmin) {
    return [requested, `Demandée par : ${r.prenom} / ${r.nom}`, `PIN Réinitialisé : le ${resolved}`];
  }
  const adminName = [adminFirstname, adminLastname].filter(Boolean).join(" ");
  return [requested, `PIN Réinitialisé : le ${resolved}${adminName ? ` - par ${adminName}` : ""}`];
}

export default function MyAlertsModal({ visible, onClose, C, activeAlerts, history, onModify, onMarkSeen, rgpdAlert, relaisAlerts = [], onClaimRelais, onDismissRelais, relaisCoverageHistory = [], onMarkHistorySeen, pinResetRequests = [], onResetPinRequest, onDismissPinResetRequest, pinResetHistory = [], adminFirstname, adminLastname, pinResetHistoryIsAdmin = false }: Props) {
  const [archived, setArchived] = useState<ArchivedEntry[]>([]);
  const [archivesOpen, setArchivesOpen] = useState(false);

  function handleModify(r: Reservation) {
    onClose();
    onModify(r);
  }

  function handleClaimRelais(t: Task) {
    onClose();
    onClaimRelais?.(t);
  }

  // Capture l'item dans les Archives (en tête, ordre antéchronologique de
  // traitement) avant de déclencher l'action réelle du parent, qui le fera
  // disparaître d'activeAlerts/history au prochain rendu.
  function handleMarkSeen(r: Reservation) {
    setArchived((prev) => [{ kind: "alert", id: r.id, message: r.alert_message ?? "" }, ...prev]);
    onMarkSeen(r);
  }

  function handleMarkHistorySeen(h: ReservationChangeHistoryEntry) {
    setArchived((prev) => [
      { kind: "history", id: h.id, type: h.type, changeType: h.change_type, line: changeLine(h), msg: h.message, changedAt: h.changed_at },
      ...prev,
    ]);
    onMarkHistorySeen?.(h);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.title, { color: C.text }]}>🔔 Mes alertes</Text>

          <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 4 }}>
            {!rgpdAlert && pinResetRequests.length === 0 && relaisAlerts.length === 0 && activeAlerts.length === 0 && history.length === 0 && relaisCoverageHistory.length === 0 && pinResetHistory.length === 0 ? (
              <Text style={[styles.emptyText, { color: C.muted }]}>Aucune alerte pour l'instant.</Text>
            ) : (
              <>
                {!!rgpdAlert && (
                  <>
                    <Text style={[styles.sectionLabel, { color: C.gold }]}>🗄️ Conservation des données</Text>
                    <View
                      style={[styles.activeCard, { borderColor: "rgba(233,69,96,0.4)", backgroundColor: "rgba(233,69,96,0.08)" }]}
                    >
                      <Text style={[styles.activeMessage, { color: C.text }]}>{rgpdAlert.message}</Text>
                      <TouchableOpacity
                        style={[styles.smallBtn, { backgroundColor: C.accent }, rgpdAlert.prolonging && { opacity: 0.6 }]}
                        onPress={rgpdAlert.onProlong}
                        disabled={rgpdAlert.prolonging}
                      >
                        <Text style={styles.smallBtnPrimaryText}>Prolonger</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {pinResetRequests.length > 0 && (
                  <>
                    <Text style={[styles.sectionLabel, { color: C.gold, marginTop: rgpdAlert ? 16 : 0 }]}>🔑 Réinitialisations demandées</Text>
                    {pinResetRequests.map((r) => (
                      <View
                        key={r.id}
                        style={[styles.activeCard, { borderColor: "rgba(233,69,96,0.4)", backgroundColor: "rgba(233,69,96,0.08)" }]}
                      >
                        <Text style={[styles.activeMessage, { color: C.text }]}>
                          {r.prenom} {r.nom} n'arrive plus à se connecter et demande la réinitialisation de son code.
                        </Text>
                        <View style={styles.activeRow}>
                          <TouchableOpacity style={[styles.smallBtn, { borderColor: C.border }]} onPress={() => onDismissPinResetRequest?.(r)}>
                            <Text style={[styles.smallBtnText, { color: C.muted }]}>Ignorer</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.smallBtn, { backgroundColor: C.accent }]} onPress={() => onResetPinRequest?.(r)}>
                            <Text style={styles.smallBtnPrimaryText}>Réinitialiser</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </>
                )}

                {relaisAlerts.length > 0 && (
                  <>
                    <Text style={[styles.sectionLabel, { color: C.gold, marginTop: (rgpdAlert || pinResetRequests.length > 0) ? 16 : 0 }]}>🆘 Besoins de relais</Text>
                    {relaisAlerts.map((t) => (
                      <View
                        key={t.id}
                        style={[styles.activeCard, { borderColor: "rgba(233,69,96,0.4)", backgroundColor: "rgba(233,69,96,0.08)" }]}
                      >
                        {!!t.author_prenom && (
                          <Text style={[styles.activeMessage, { color: C.text, marginBottom: 2 }]}>🙋 Publié par {t.author_prenom}</Text>
                        )}
                        {!!t.relais_start_date && !!t.date_limite && (
                          <Text style={[styles.activeMessage, { color: C.text, marginBottom: 2 }]}>
                            📅 Du {toFrShort(new Date(t.relais_start_date + "T12:00:00"))} au {toFrShort(new Date(t.date_limite + "T12:00:00"))}
                          </Text>
                        )}
                        {t.relais_visible_to === "some" && !!t.relais_recipients?.length && (
                          <Text style={[styles.activeMessage, { color: C.text, marginBottom: 2 }]}>
                            🙋 Sollicité·e·s : {t.relais_recipients.map((r) => `${r.prenom} ${r.nom}`.trim()).join(", ")}
                          </Text>
                        )}
                        {!!t.description && (
                          <Text style={[styles.activeMessage, { color: C.text }]}>{t.description}</Text>
                        )}
                        <View style={styles.activeRow}>
                          <TouchableOpacity style={[styles.smallBtn, { borderColor: C.border }]} onPress={() => onDismissRelais?.(t)}>
                            <Text style={[styles.smallBtnText, { color: C.muted }]}>Pas cette fois</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.smallBtn, { backgroundColor: C.accent }]} onPress={() => handleClaimRelais(t)}>
                            <Text style={styles.smallBtnPrimaryText}>🙋 Je m'en occupe</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </>
                )}

                {activeAlerts.length > 0 && (
                  <>
                    <Text style={[styles.sectionLabel, { color: C.gold, marginTop: (rgpdAlert || pinResetRequests.length > 0 || relaisAlerts.length > 0) ? 16 : 0 }]}>À traiter</Text>
                    {activeAlerts.map((r) => (
                      <View
                        key={r.id}
                        style={[styles.activeCard, { borderColor: "rgba(233,69,96,0.4)", backgroundColor: "rgba(233,69,96,0.08)" }]}
                      >
                        <Text style={[styles.activeMessage, { color: C.text }]}>{r.alert_message}</Text>
                        <View style={styles.activeRow}>
                          <TouchableOpacity style={[styles.smallBtn, { borderColor: C.border }]} onPress={() => handleMarkSeen(r)}>
                            <Text style={[styles.smallBtnText, { color: C.muted }]}>Marquer comme lu</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.smallBtn, { backgroundColor: C.accent }]} onPress={() => handleModify(r)}>
                            <Text style={styles.smallBtnPrimaryText}>Modifier</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </>
                )}

                {(history.length > 0 || relaisCoverageHistory.length > 0 || pinResetHistory.length > 0) && (
                  <>
                    <Text style={[styles.sectionLabel, { color: C.gold, marginTop: (activeAlerts.length > 0 || relaisAlerts.length > 0 || pinResetRequests.length > 0 || rgpdAlert) ? 16 : 0 }]}>Historique</Text>
                    {pinResetHistory.map((r) => (
                      <View key={r.id} style={[styles.historyRow, { borderLeftColor: C.gold }]}>
                        <Text style={[styles.historyType, { color: C.text }]}>🔑 Réinitialisation du code</Text>
                        {pinResetHistoryLines(r, pinResetHistoryIsAdmin, adminFirstname, adminLastname).map((line, i) => (
                          <Text key={i} style={[styles.historyLine, { color: C.muted }]}>{line}</Text>
                        ))}
                      </View>
                    ))}
                    {relaisCoverageHistory.map((s) => (
                      <View key={s.task.id} style={[styles.historyRow, { borderLeftColor: C.gold }]}>
                        <Text style={[styles.historyType, { color: C.text }]}>🆘 {s.task.title}</Text>
                        <Text style={[styles.historyLine, { color: C.muted }]}>{relaisCoverageLine(s)}</Text>
                      </View>
                    ))}
                    {history.map((h) => (
                      <View key={h.id} style={[styles.historyRow, { borderLeftColor: C.danger }]}>
                        <Text style={[styles.historyType, { color: C.text }]}>
                          {h.change_type === "night_cancelled" ? "🌙" : "☀️"} {h.type}
                        </Text>
                        <Text style={[styles.historyLine, { color: C.muted }]}>{changeLine(h)}</Text>
                        <Text style={[styles.historyMsg, { color: C.danger }]}>{h.message}</Text>
                        <Text style={[styles.historyDate, { color: C.muted }]}>
                          {frDateTime(h.changed_at)}
                        </Text>
                        {!!onMarkHistorySeen && (
                          <TouchableOpacity
                            style={[styles.smallBtn, { borderColor: C.border, alignSelf: "flex-start", marginTop: 8, paddingHorizontal: 14 }]}
                            onPress={() => handleMarkHistorySeen(h)}
                          >
                            <Text style={[styles.smallBtnText, { color: C.muted }]}>Marquer comme lu</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  </>
                )}

                {archived.length > 0 && (
                  <>
                    <TouchableOpacity onPress={() => setArchivesOpen((v) => !v)} activeOpacity={0.7}>
                      <Text style={[styles.sectionLabel, { color: C.gold, marginTop: 16 }]}>
                        {archivesOpen ? "▾" : "▸"} Archives ({archived.length})
                      </Text>
                    </TouchableOpacity>
                    {archivesOpen && archived.map((a) => (
                      a.kind === "alert" ? (
                        <View key={`archived-${a.id}`} style={[styles.historyRow, { borderLeftColor: C.border }]}>
                          <Text style={[styles.historyLine, { color: C.muted }]}>{a.message}</Text>
                        </View>
                      ) : (
                        <View key={`archived-${a.id}`} style={[styles.historyRow, { borderLeftColor: C.border }]}>
                          <Text style={[styles.historyType, { color: C.text }]}>
                            {a.changeType === "night_cancelled" ? "🌙" : "☀️"} {a.type}
                          </Text>
                          <Text style={[styles.historyLine, { color: C.muted }]}>{a.line}</Text>
                          <Text style={[styles.historyMsg, { color: C.danger }]}>{a.msg}</Text>
                          <Text style={[styles.historyDate, { color: C.muted }]}>{frDateTime(a.changedAt)}</Text>
                        </View>
                      )
                    ))}
                  </>
                )}
              </>
            )}
          </ScrollView>

          <TouchableOpacity onPress={onClose} style={styles.closeFooterBtn}>
            <Text style={[styles.closeFooterBtnText, { color: C.muted }]}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", maxWidth: 440, maxHeight: "88%", borderRadius: 20, borderWidth: 1, padding: 24 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 14 },
  scroll: { maxHeight: 420 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginVertical: 12 },

  sectionLabel: { fontFamily: "DM_Sans_700Bold", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },

  activeCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  activeMessage: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, lineHeight: 19, marginBottom: 10 },
  activeRow: { flexDirection: "row", gap: 8 },
  smallBtn: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 9, alignItems: "center" },
  smallBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
  smallBtnPrimaryText: { fontFamily: "DM_Sans_700Bold", fontSize: 12, color: "#fff" },

  historyRow: { borderLeftWidth: 3, paddingLeft: 10, paddingVertical: 6, marginBottom: 12 },
  historyType: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  historyLine: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },
  historyMsg: { fontFamily: "DM_Sans_400Regular", fontSize: 12, fontStyle: "italic", marginTop: 3, lineHeight: 17 },
  historyDate: { fontFamily: "DM_Sans_400Regular", fontSize: 11, marginTop: 3 },

  closeFooterBtn: { alignItems: "center", marginTop: 16 },
  closeFooterBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});
