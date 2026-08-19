import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet, ActivityIndicator, Alert } from "react-native";
import type { PersonalDocument } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Sous-menu "Mes documents" (Mon Compte, juste sous "✨ Checklists
// suggérées", voir MyChecklist.tsx) — liste les courriers déjà générés via
// "✉️ Préparer le courrier" (downloadLetter dans MyChecklist.tsx) pour
// pouvoir les re-télécharger sans ressaisir le formulaire. Le fichier .doc
// lui-même n'est jamais stocké côté serveur, seules les valeurs de champs le
// sont (personal_documents.values) : onRedownload régénère le contenu à la
// volée côté appelant.
function frDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

interface Props {
  visible: boolean;
  onClose: () => void;
  C: Theme;
  documents: PersonalDocument[];
  loading: boolean;
  onRedownload: (doc: PersonalDocument) => void;
  redownloadingId: string | null;
  onEdit: (doc: PersonalDocument) => void;
  onDelete: (doc: PersonalDocument) => void;
}

export default function MesDocumentsModal({ visible, onClose, C, documents, loading, onRedownload, redownloadingId, onEdit, onDelete }: Props) {
  function handleLongPress(doc: PersonalDocument) {
    Alert.alert(doc.label, "Que veux-tu faire avec ce document ?", [
      { text: "Modifier", onPress: () => onEdit(doc) },
      { text: "Supprimer", style: "destructive", onPress: () => onDelete(doc) },
      { text: "Annuler", style: "cancel" },
    ]);
  }
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.title, { color: C.text }]}>📄 Mes documents</Text>

          <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 4 }}>
            {loading ? (
              <ActivityIndicator color={C.orange} style={{ marginVertical: 16 }} />
            ) : documents.length === 0 ? (
              <Text style={[styles.emptyText, { color: C.muted }]}>
                Aucun document pour l'instant. Les courriers générés via "✉️ Préparer le courrier" apparaîtront ici.
              </Text>
            ) : (
              documents.map((doc) => (
                <TouchableOpacity
                  key={doc.id}
                  activeOpacity={0.85}
                  onLongPress={() => handleLongPress(doc)}
                  style={[styles.docCard, { borderColor: C.border, backgroundColor: `${C.orange}0d` }]}
                >
                  <Text style={[styles.docLabel, { color: C.text }]}>{doc.label}</Text>
                  <Text style={[styles.docDate, { color: C.muted }]}>Généré le {frDateTime(doc.created_at)}</Text>
                  <TouchableOpacity
                    style={[styles.smallBtn, { backgroundColor: C.orange }]}
                    onPress={() => onRedownload(doc)}
                    disabled={redownloadingId === doc.id}
                  >
                    {redownloadingId === doc.id
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.smallBtnText}>⬇️ Retélécharger</Text>}
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
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
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginVertical: 12, lineHeight: 19 },

  docCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  docLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13.5, marginBottom: 4 },
  docDate: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginBottom: 10 },
  smallBtn: { borderRadius: 8, paddingVertical: 9, alignItems: "center" },
  smallBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 12, color: "#fff" },

  closeFooterBtn: { alignItems: "center", marginTop: 16 },
  closeFooterBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});
