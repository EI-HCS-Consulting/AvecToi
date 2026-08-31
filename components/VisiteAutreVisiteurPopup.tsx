import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { remainingSpotsLabel } from "@/lib/slotUtils";
import type { Theme } from "@/lib/themes";
import type { Reservation } from "@/lib/types";

// Popup ouverte au tap sur le bloc visite d'un AUTRE visiteur dans le
// planning mensuel/hebdo (HomeCalendarScreen, openVisiteActions) — visiteur
// uniquement (session PIN disponible pour porter une réservation rapide),
// jamais côté admin qui garde sa navigation directe vers l'écran des
// créneaux (pas de réservation inline possible sans le flux de saisie
// complet). Propose de réserver la place restante si le créneau n'est pas
// complet, sinon d'aller voir la journée pour choisir un autre créneau.
interface Props {
  C: Theme;
  visible: boolean;
  reservation: Reservation | null;
  remaining: { taken: number; max: number } | null;
  onReserver: () => void;
  onVoirJournee: () => void;
  onClose: () => void;
}

export default function VisiteAutreVisiteurPopup({
  C, visible, reservation, remaining, onReserver, onVoirJournee, onClose,
}: Props) {
  if (!reservation) return null;
  const dayDate = new Date(reservation.date + "T00:00:00");
  const complet = !!remaining && remaining.taken >= remaining.max;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.title, { color: C.text }]} numberOfLines={1}>
            {reservation.prenom} {reservation.nom}
          </Text>
          <Text style={[styles.sub, { color: C.muted }]}>
            {dayDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} · {reservation.creneau}
          </Text>
          {!!remaining && (
            <Text style={[styles.sub, { color: complet ? C.danger : C.success }]}>
              {remainingSpotsLabel(remaining.taken, remaining.max)}
            </Text>
          )}

          {complet ? (
            <TouchableOpacity
              style={[styles.btnFull, { backgroundColor: C.accent, borderColor: C.accent }]}
              onPress={onVoirJournee}
            >
              <Text style={[styles.btnFullText, { color: "#fff" }]}>Voir la journée</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.btnFull, { backgroundColor: C.accent, borderColor: C.accent }]}
              onPress={onReserver}
            >
              <Text style={[styles.btnFullText, { color: "#fff" }]}>Réserver cette place</Text>
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
  btnFull: { width: "100%", borderWidth: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center", marginTop: 20 },
  btnFullText: { fontFamily: "DM_Sans_700Bold", fontSize: 14 },
  closeBtn: { alignItems: "center", marginTop: 14 },
  closeBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});
