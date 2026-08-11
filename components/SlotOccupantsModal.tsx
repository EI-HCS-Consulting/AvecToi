import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet } from "react-native";
import type { Theme } from "@/lib/themes";
import type { Reservation } from "@/lib/types";
import { toFrShort } from "@/lib/slotUtils";

export interface SelectedSlot {
  iso: string;
  slot: string;
  occupants: Reservation[];
}

interface Props {
  C: Theme;
  selected: SelectedSlot | null;
  onClose: () => void;
  // Lecture seule côté visiteur/intervenant — pas de boutons Modifier/✕.
  readOnly: boolean;
  onEdit?: (r: Reservation) => void;
  onDelete?: (r: Reservation) => void;
}

// Modal "qui occupe ce créneau" — partagé entre l'affichage mensuel (une
// carte, un créneau) et hebdomadaire (grille de la semaine) du planning des
// intervenants.
export default function SlotOccupantsModal({ C, selected, onClose, readOnly, onEdit, onDelete }: Props) {
  return (
    <Modal transparent visible={!!selected} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[styles.modalCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.modalTitle, { color: C.text }]}>
            {selected ? `${toFrShort(new Date(selected.iso + "T00:00:00"))} · ${selected.slot}` : ""}
          </Text>
          <ScrollView style={{ maxHeight: 320 }}>
            {selected?.occupants.map((r) => (
              <View key={r.id} style={[styles.occupantRow, { borderColor: C.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.occupantName, { color: C.text }]}>
                    {r.type === "Intervention" ? "🩺" : "🧑"} {r.prenom} {r.nom}
                  </Text>
                  <Text style={[styles.occupantType, { color: C.muted }]}>
                    {r.type === "Intervention" ? r.intervention_label ?? "Intervention" : "Visite"}
                  </Text>
                </View>
                {!readOnly && (
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      style={[styles.modalBtn, { borderColor: C.border }]}
                      onPress={() => { onClose(); onEdit?.(r); }}
                    >
                      <Text style={[styles.modalBtnText, { color: C.muted }]}>Modifier</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.deleteBtn, { borderColor: "rgba(233,69,96,0.4)" }]}
                      onPress={() => { onClose(); onDelete?.(r); }}
                    >
                      <Text style={{ color: "#e94560", fontSize: 13 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={[styles.closeBtn, { borderColor: C.border }]} onPress={onClose}>
            <Text style={[styles.closeBtnText, { color: C.text }]}>Fermer</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalCard: { width: "100%", maxWidth: 400, borderWidth: 1, borderRadius: 16, padding: 18 },
  modalTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 17, marginBottom: 12, textTransform: "capitalize" },
  occupantRow: { flexDirection: "row", alignItems: "center", gap: 8, borderBottomWidth: 1, paddingVertical: 10 },
  occupantName: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  occupantType: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },
  modalBtn: { borderWidth: 1, borderRadius: 7, paddingVertical: 6, paddingHorizontal: 10 },
  modalBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
  deleteBtn: { width: 28, height: 28, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  closeBtn: { marginTop: 14, borderWidth: 1, borderRadius: 10, paddingVertical: 11, alignItems: "center" },
  closeBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
});
