import { useEffect, useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  Modal, StyleSheet, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { isSlotFullyPast } from "@/lib/slotUtils";
import PatientAvatar from "@/components/PatientAvatar";
import { metierLabel } from "@/lib/metiers";
import type { Reservation } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Fiche intervenant en lecture seule — ouverte en cliquant un intervenant
// dans la liste "Fiches intervenants" de (admin)/intervenants.tsx, le bloc
// "Intervenants" des Paramètres admin, ou la liste "Intervenants" côté
// visiteur (Mon compte). Contrairement à VisitorProfileModal (rapprochement
// par prénom+nom, pas de compte visiteur), intervenant_profile_id est une
// vraie FK sur reservations : le rapprochement est donc exact, pas
// approximatif.

// updatedAt bust le cache CDN/<Image> — voir IntervenantFicheModal.tsx pour
// le détail (nom de fichier fixe + upsert, sans ça un ré-upload continuerait
// d'afficher l'ancienne photo).
function intervenantPhotoUrl(filename: string, updatedAt?: string | null) {
  const { data } = supabase.storage.from("intervenant-photos").getPublicUrl(filename);
  return updatedAt ? `${data.publicUrl}?v=${new Date(updatedAt).getTime()}` : data.publicUrl;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  spaceId: string;
  intervenantProfileId: string;
  prenom: string;
  nom: string;
  C: Theme;
  isAdmin: boolean;
  // Côté visiteur, permet au parent de positionner le bon jour avant de
  // naviguer (voir app/(visitor)/account.tsx handleOpenReservation, même
  // pattern) — le paramètre focusDate n'existe que sur la route admin des
  // créneaux (app/(admin)/home/slots.tsx), pas sur celle du visiteur.
  onGoToSlot?: (date: string) => void;
}

export default function IntervenantProfileModal({
  visible, onClose, spaceId, intervenantProfileId, prenom, nom, C, isAdmin, onGoToSlot,
}: Props) {
  const router = useRouter();
  const basePath = isAdmin ? "/(admin)" : "/(visitor)";

  const [loading, setLoading] = useState(true);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [metier, setMetier] = useState<string | null>(null);
  const [planifies, setPlanifies] = useState<Reservation[]>([]);
  const [faits, setFaits] = useState<Reservation[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data }, { data: profileData }] = await Promise.all([
      supabase
        .from("reservations")
        .select("*")
        .eq("space_id", spaceId)
        .eq("intervenant_profile_id", intervenantProfileId)
        .eq("type", "Intervention")
        .order("date", { ascending: true })
        .order("creneau", { ascending: true }),
      supabase
        .from("intervenant_profiles")
        .select("photo, photo_updated_at, metier")
        .eq("id", intervenantProfileId)
        .maybeSingle(),
    ]);

    const soins: Reservation[] = data || [];
    setPlanifies(soins.filter((r) => !isSlotFullyPast(r.date, r.creneau)));
    setFaits(soins.filter((r) => isSlotFullyPast(r.date, r.creneau)).reverse());
    setPhotoUrl(profileData?.photo ? intervenantPhotoUrl(profileData.photo, profileData.photo_updated_at) : null);
    setMetier(profileData?.metier ?? null);
    setLoading(false);
  }, [spaceId, intervenantProfileId]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  function goToSlot(date: string) {
    onClose();
    if (onGoToSlot) {
      onGoToSlot(date);
      return;
    }
    router.push({ pathname: `${basePath}/home/slots`, params: { focusDate: date } } as any);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.accent }]}>
          <View style={[styles.headerRow, { borderBottomColor: C.border }]}>
            <PatientAvatar photoUrl={photoUrl} firstname={prenom} lastname={nom} size={64} C={C} metier={metier} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.name, { color: C.text }]}>{prenom} {nom}</Text>
              <Text style={[styles.sub, { color: C.muted }]}>
                {metier ? metierLabel(metier) : "Fiche intervenant"}
              </Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator color={C.accent} style={{ marginVertical: 32 }} />
          ) : (
            <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 4 }}>
              <Section title={`🩺 Soins planifiés (${planifies.length})`} C={C} empty={planifies.length === 0} emptyText="Aucun soin planifié.">
                {planifies.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={styles.row}
                    activeOpacity={0.7}
                    onPress={() => goToSlot(r.date)}
                  >
                    <Text style={[styles.rowText, { color: C.text, flex: 1 }]}>
                      {new Date(r.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} · {r.creneau}
                      {r.intervention_label ? ` — ${r.intervention_label}` : ""}
                    </Text>
                    <Text style={[styles.chevron, { color: C.muted }]}>›</Text>
                  </TouchableOpacity>
                ))}
              </Section>

              <Section title={`✅ Soins faits (${faits.length})`} C={C} empty={faits.length === 0} emptyText="Aucun soin réalisé pour le moment." last>
                {faits.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={styles.row}
                    activeOpacity={0.7}
                    onPress={() => goToSlot(r.date)}
                  >
                    <Text style={[styles.rowText, { color: C.text, flex: 1 }]}>
                      {new Date(r.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} · {r.creneau}
                      {r.intervention_label ? ` — ${r.intervention_label}` : ""}
                    </Text>
                    <Text style={[styles.chevron, { color: C.muted }]}>›</Text>
                  </TouchableOpacity>
                ))}
              </Section>
            </ScrollView>
          )}

          <TouchableOpacity onPress={onClose} style={styles.closeFooterBtn}>
            <Text style={[styles.closeFooterBtnText, { color: C.muted }]}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Section({
  title, C, empty, emptyText, last, children,
}: { title: string; C: Theme; empty: boolean; emptyText: string; last?: boolean; children: React.ReactNode }) {
  return (
    <View style={[styles.section, !last && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
      <Text style={[styles.sectionTitle, { color: C.gold }]}>{title}</Text>
      {empty ? <Text style={[styles.emptyText, { color: C.muted }]}>{emptyText}</Text> : children}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", maxWidth: 400, maxHeight: "85%", borderRadius: 20, borderWidth: 1, padding: 24 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, paddingBottom: 16, borderBottomWidth: 1 },
  name: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18 },
  sub: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },
  closeFooterBtn: { alignItems: "center", marginTop: 14 },
  closeFooterBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },

  scroll: { maxHeight: 360 },
  section: { paddingVertical: 14 },
  sectionTitle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 6, gap: 8 },
  rowText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, lineHeight: 19 },
  chevron: { fontFamily: "DM_Sans_700Bold", fontSize: 16 },
});
