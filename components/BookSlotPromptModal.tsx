import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from "react-native";
import type { Theme } from "@/lib/themes";

// Popup ouvert par un appui prolongé sur une case du calendrier Planning
// (app/(visitor)/soins.tsx, handleCalendarDayLongPress) — "Réserver un
// créneau". Si un patient précis est déjà sélectionné dans la légende, ne
// demande qu'une confirmation. En mode "Tous" (aucun patient sélectionné),
// demande d'abord POUR QUI réserver (impossible de le savoir depuis la vue
// cumulée) : le jour/horaire/type de soin sont ensuite choisis sur l'écran
// de réservation existant (home/slots.tsx → InterventionBookingFlow), qui
// fait déjà ce travail — inutile de le dupliquer ici.
interface Props {
  C: Theme;
  visible: boolean;
  iso: string | null;
  selectedSpaceId: string | null;
  legendItems: { spaceId: string; name: string; color: string }[];
  patientNameBySpaceId: Record<string, string>;
  onChoosePatient: (spaceId: string) => void;
  onClose: () => void;
}

export default function BookSlotPromptModal({
  C, visible, iso, selectedSpaceId, legendItems, patientNameBySpaceId, onChoosePatient, onClose,
}: Props) {
  if (!iso) return null;
  const dayDate = new Date(iso + "T00:00:00");
  const dayLabel = dayDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.title, { color: C.text }]}>Réserver un créneau</Text>
          <Text style={[styles.sub, { color: C.muted }]}>{dayLabel}</Text>

          {selectedSpaceId ? (
            <>
              <Text style={[styles.message, { color: C.text }]}>
                Réserver un créneau pour {patientNameBySpaceId[selectedSpaceId] ?? "ce patient"} ?
              </Text>
              <View style={styles.row}>
                <TouchableOpacity style={[styles.btn, { borderColor: C.border }]} onPress={onClose}>
                  <Text style={[styles.btnText, { color: C.text }]}>Fermer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: C.accent, borderColor: C.accent }]}
                  onPress={() => onChoosePatient(selectedSpaceId)}
                >
                  <Text style={[styles.btnText, { color: "#fff" }]}>Réserver</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.message, { color: C.text }]}>Pour quel patient ?</Text>
              <ScrollView style={styles.patientScroll}>
                {legendItems.map((item) => (
                  <TouchableOpacity
                    key={item.spaceId}
                    style={[styles.patientRow, { borderColor: C.border }]}
                    onPress={() => onChoosePatient(item.spaceId)}
                  >
                    <View style={[styles.dot, { backgroundColor: item.color }]} />
                    <Text style={[styles.patientName, { color: C.text }]} numberOfLines={1}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={[styles.closeBtnText, { color: C.muted }]}>Fermer</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "center", alignItems: "center", padding: 24 },
  sheet: { width: "100%", maxWidth: 380, maxHeight: "80%", borderRadius: 20, borderWidth: 1, padding: 24 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, textAlign: "center", textTransform: "capitalize" },
  sub: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center", marginTop: 4 },
  message: { fontFamily: "DM_Sans_400Regular", fontSize: 14, textAlign: "center", marginTop: 18 },
  row: { flexDirection: "row", gap: 10, width: "100%", marginTop: 20 },
  btn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  btnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14 },
  patientScroll: { maxHeight: 260, marginTop: 14 },
  patientRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  patientName: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14, flex: 1 },
  closeBtn: { alignItems: "center", marginTop: 6 },
  closeBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});
