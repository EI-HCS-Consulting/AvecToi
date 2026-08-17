import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from "react-native";
import type { Reservation, ReservationChangeHistoryEntry } from "@/lib/types";
import type { Theme } from "@/lib/themes";

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
    ? new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
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
  // Alerte RGPD (conservation des données proche de l'échéance, admin
  // uniquement) — voir lib/rgpd.ts et RgpdAlertModal.tsx pour le popup
  // équivalent à l'ouverture de l'app. Absente/nulle si pas d'espace ou hors
  // fenêtre d'alerte.
  rgpdAlert?: { message: string; onProlong: () => void; prolonging: boolean } | null;
}

export default function MyAlertsModal({ visible, onClose, C, activeAlerts, history, onModify, onMarkSeen, rgpdAlert }: Props) {
  function handleModify(r: Reservation) {
    onClose();
    onModify(r);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.title, { color: C.text }]}>🔔 Mes alertes</Text>

          <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 4 }}>
            {!rgpdAlert && activeAlerts.length === 0 && history.length === 0 ? (
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

                {activeAlerts.length > 0 && (
                  <>
                    <Text style={[styles.sectionLabel, { color: C.gold, marginTop: rgpdAlert ? 16 : 0 }]}>À traiter</Text>
                    {activeAlerts.map((r) => (
                      <View
                        key={r.id}
                        style={[styles.activeCard, { borderColor: "rgba(233,69,96,0.4)", backgroundColor: "rgba(233,69,96,0.08)" }]}
                      >
                        <Text style={[styles.activeMessage, { color: C.text }]}>{r.alert_message}</Text>
                        <View style={styles.activeRow}>
                          <TouchableOpacity style={[styles.smallBtn, { borderColor: C.border }]} onPress={() => onMarkSeen(r)}>
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

                {history.length > 0 && (
                  <>
                    <Text style={[styles.sectionLabel, { color: C.gold, marginTop: (activeAlerts.length > 0 || rgpdAlert) ? 16 : 0 }]}>Historique</Text>
                    {history.map((h) => (
                      <View key={h.id} style={[styles.historyRow, { borderLeftColor: C.danger }]}>
                        <Text style={[styles.historyType, { color: C.text }]}>
                          {h.change_type === "night_cancelled" ? "🌙" : "☀️"} {h.type}
                        </Text>
                        <Text style={[styles.historyLine, { color: C.muted }]}>{changeLine(h)}</Text>
                        <Text style={[styles.historyMsg, { color: C.danger }]}>{h.message}</Text>
                        <Text style={[styles.historyDate, { color: C.muted }]}>
                          {new Date(h.changed_at).toLocaleString("fr-FR", {
                            day: "numeric", month: "long", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </Text>
                      </View>
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
