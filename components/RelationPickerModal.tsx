import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from "react-native";
import { VISITOR_RELATIONS } from "@/lib/relations";
import type { Theme } from "@/lib/themes";

// Popup "lien avec le patient" — même principe de liste tappable que
// MetierPickerModal.tsx, mais sans accordéon par famille : la liste des
// relations est courte et plate, pas besoin de la replier par catégorie.
// Pas d'écran "Autre" à saisie libre non plus (contrairement au métier) :
// le catalogue lib/relations.ts couvre déjà "autre" comme choix fixe.
interface Props {
  visible: boolean;
  C: Theme;
  value: string;
  onClose: () => void;
  onPick: (value: string) => void;
}

export default function RelationPickerModal({ visible, C, value, onClose, onPick }: Props) {
  function pick(key: string) {
    onPick(key);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.title, { color: C.text }]}>Lien avec le patient</Text>
          <ScrollView style={{ maxHeight: 400 }}>
            <TouchableOpacity
              onPress={() => pick("")}
              activeOpacity={0.8}
              style={[styles.row, { borderColor: value === "" ? C.accent : C.border, backgroundColor: value === "" ? `${C.accent}22` : "transparent" }]}
            >
              <Text style={[styles.rowText, { color: value === "" ? C.accent : C.muted }]}>Non renseigné</Text>
            </TouchableOpacity>
            {VISITOR_RELATIONS.map((r) => {
              const selected = value === r.key;
              return (
                <TouchableOpacity
                  key={r.key}
                  onPress={() => pick(r.key)}
                  activeOpacity={0.8}
                  style={[styles.row, { borderColor: selected ? C.accent : C.border, backgroundColor: selected ? `${C.accent}22` : "transparent" }]}
                >
                  <Text style={[styles.rowText, { color: selected ? C.accent : C.text }]}>{r.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={[styles.closeBtnText, { color: C.muted }]}>Fermer</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", maxWidth: 400, maxHeight: "80%", borderRadius: 20, borderWidth: 1, padding: 24 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 12, textAlign: "center" },
  row: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  rowText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  closeBtn: { alignItems: "center", marginTop: 8 },
  closeBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});
