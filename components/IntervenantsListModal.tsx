import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import IntervenantsList from "@/components/IntervenantsList";
import type { Theme } from "@/lib/themes";

// Liste des intervenants enregistrés — ouverte depuis le bouton "Intervenants"
// de Mon compte (app/(visitor)/account.tsx), juste sous "Fiche patient". Même
// principe que le bloc "Intervenants" des Paramètres admin
// (components/IntervenantsBlock.tsx), mais en plein écran (bottom-sheet) côté
// visiteur puisqu'il n'y a pas d'écran Paramètres visiteur pour l'accueillir.
// Corps de liste partagé avec l'onglet dédié côté intervenant, voir
// components/IntervenantsList.tsx.
interface Props {
  visible: boolean;
  onClose: () => void;
  spaceId: string;
  C: Theme;
}

export default function IntervenantsListModal({ visible, onClose, spaceId, C }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.accent }]}>
          <View style={[styles.headerRow, { borderBottomColor: C.border }]}>
            <Text style={[styles.title, { color: C.text }]}>🩺 Intervenants</Text>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { borderColor: C.border }]}>
              <Text style={[styles.closeBtnText, { color: C.muted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {visible && <IntervenantsList spaceId={spaceId} C={C} />}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "flex-end" },
  sheet: { maxHeight: "80%", borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, paddingTop: 20, paddingHorizontal: 20, marginBottom: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingBottom: 16, borderBottomWidth: 1 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  closeBtnText: { fontSize: 14, fontFamily: "DM_Sans_700Bold" },
});
