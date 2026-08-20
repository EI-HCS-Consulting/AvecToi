import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { remainingSpotsLabel } from "@/lib/slotUtils";
import type { Theme } from "@/lib/themes";
import type { Reservation } from "@/lib/types";

// Popup ouverte au tap sur un soin dans l'onglet Planning intervenant
// (app/(visitor)/soins.tsx) — que ce soit depuis PlanningDuJourBlock,
// SoinsPeriodBlock ou SoinsPlanifiesBlock, un tap ouvre désormais ce choix
// plutôt que d'agir directement : "Modifier" ouvre InterventionEditFlow (édition
// jour/horaire/type), "Y Aller" bascule sur l'espace du patient concerné et
// navigue vers son calendrier/jour (même logique qu'un tap sur une case du
// calendrier global, voir handleCalendarDayPress), "Fermer" referme le popup
// sans action et revient sur la page Planning.
interface Props {
  C: Theme;
  visible: boolean;
  reservation: Reservation | null;
  patientNameBySpaceId: Record<string, string>;
  locationBySpaceId: Record<string, string>;
  onModifier: () => void;
  onYAller: () => void;
  onClose: () => void;
  // Bouton "Ajouter une Visite" supplémentaire — permet de réserver un autre
  // créneau (même jour ou un autre) sans quitter le popup, plutôt que d'avoir
  // à fermer puis rouvrir l'écran des créneaux depuis zéro. Absent : le
  // bouton n'est pas affiché (usage intervenant, soins.tsx, qui n'a pas
  // cette notion de créneaux visite).
  onAjouterVisite?: () => void;
  // Places prises/max du créneau de cette réservation (voir home/calendar.tsx,
  // pendingVisiteCapacity) — affiché sous la ligne date/créneau pour savoir
  // d'un coup d'œil s'il reste une place sur ce même créneau. Absent : rien
  // n'est affiché (usage intervenant, soins.tsx, un seul soin possible par
  // créneau, la notion ne s'applique pas).
  remaining?: { taken: number; max: number } | null;
}

export default function SoinActionModal({
  C, visible, reservation, patientNameBySpaceId, locationBySpaceId, onModifier, onYAller, onClose, onAjouterVisite, remaining,
}: Props) {
  if (!reservation) return null;
  const dayDate = new Date(reservation.date + "T00:00:00");

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.title, { color: C.text }]} numberOfLines={1}>
            {patientNameBySpaceId[reservation.space_id] ?? `${reservation.prenom} ${reservation.nom}`}
          </Text>
          <Text style={[styles.sub, { color: C.muted }]}>
            {dayDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} · {reservation.creneau}
          </Text>
          {!!remaining && (
            <Text style={[styles.sub, { color: remaining.taken >= remaining.max ? C.danger : C.success }]}>
              {remainingSpotsLabel(remaining.taken, remaining.max)}
            </Text>
          )}
          {!!reservation.intervention_label && (
            <Text style={[styles.sub, { color: C.muted }]}>{reservation.intervention_label}</Text>
          )}
          {!!locationBySpaceId[reservation.space_id] && (
            <Text style={[styles.sub, { color: C.muted }]} numberOfLines={1}>📍 {locationBySpaceId[reservation.space_id]}</Text>
          )}

          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, { borderColor: C.border }]} onPress={onModifier}>
              <Text style={[styles.btnText, { color: C.text }]}>Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: C.accent, borderColor: C.accent }]} onPress={onYAller}>
              <Text style={[styles.btnText, { color: "#fff" }]}>Y Aller</Text>
            </TouchableOpacity>
          </View>

          {onAjouterVisite && (
            <TouchableOpacity
              style={[styles.addVisiteBtn, { backgroundColor: C.orange }]}
              onPress={onAjouterVisite}
            >
              <Text style={styles.addVisiteBtnText}>+ Ajouter une Visite</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={[styles.closeBtnText, { color: C.muted }]}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "center", alignItems: "center", padding: 24 },
  sheet: { width: "100%", maxWidth: 380, borderRadius: 20, borderWidth: 1, padding: 24, alignItems: "center" },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, textAlign: "center", textTransform: "capitalize" },
  sub: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center", marginTop: 4 },
  row: { flexDirection: "row", gap: 10, width: "100%", marginTop: 20 },
  btn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  btnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14 },
  addVisiteBtn: { width: "100%", borderRadius: 10, paddingVertical: 13, alignItems: "center", marginTop: 10 },
  addVisiteBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
  closeBtn: { alignItems: "center", marginTop: 14 },
  closeBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});
