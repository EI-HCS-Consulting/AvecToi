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
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.accent }]}>
          <View style={[styles.headerRow, { borderBottomColor: C.border }]}>
            <Text style={[styles.title, { color: C.text }]}>🩺 Intervenants</Text>
          </View>

          <View style={styles.body}>
            {visible && <IntervenantsList spaceId={spaceId} C={C} />}
          </View>

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
  card: { width: "100%", maxWidth: 400, maxHeight: "85%", borderRadius: 20, borderWidth: 1, padding: 24 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingBottom: 16, borderBottomWidth: 1 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18 },
  body: { maxHeight: 400 },
  closeFooterBtn: { alignItems: "center", marginTop: 14 },
  closeFooterBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});
