import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet, ActivityIndicator, Alert } from "react-native";
import type { PersonalDocument } from "@/lib/types";
import type { Theme } from "@/lib/themes";
import { LETTER_TEMPLATES } from "@/lib/letterTemplates";
import { splitAlignedLines } from "@/lib/mediaShare";

// Sous-menu "Mes documents" (Mon Compte, juste sous "✨ Checklists
// suggérées", voir MyChecklist.tsx) — liste les courriers déjà générés via
// "✉️ Préparer le courrier" (downloadLetter dans MyChecklist.tsx). "Aperçu"
// affiche le document déjà rempli/mis en forme (même rendu WYSIWYG que la
// prévisualisation de MyChecklist, via splitAlignedLines) sans ressaisir le
// formulaire ; depuis cet aperçu on peut Modifier ou Télécharger.
// Le fichier .doc lui-même n'est jamais stocké côté serveur, seules les
// valeurs de champs le sont (personal_documents.values) : le contenu est
// reconstitué à la volée depuis LETTER_TEMPLATES à chaque aperçu/téléchargement.
function frDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

interface Props {
  visible: boolean;
  onClose: () => void;
  C: Theme;
  documents: PersonalDocument[];
  loading: boolean;
  onDownload: (doc: PersonalDocument) => void;
  downloadingId: string | null;
  onEdit: (doc: PersonalDocument) => void;
  onDelete: (doc: PersonalDocument) => void;
}

export default function MesDocumentsModal({ visible, onClose, C, documents, loading, onDownload, downloadingId, onEdit, onDelete }: Props) {
  const [previewDoc, setPreviewDoc] = useState<PersonalDocument | null>(null);

  // Repart de la liste à chaque réouverture plutôt que de garder l'aperçu
  // précédent affiché (le composant reste monté entre deux ouvertures du Modal).
  useEffect(() => { if (!visible) setPreviewDoc(null); }, [visible]);

  function handleLongPress(doc: PersonalDocument) {
    Alert.alert(doc.label, "Que veux-tu faire avec ce document ?", [
      { text: "Modifier", onPress: () => onEdit(doc) },
      { text: "Supprimer", style: "destructive", onPress: () => onDelete(doc) },
      { text: "Annuler", style: "cancel" },
    ]);
  }

  const previewTpl = previewDoc ? LETTER_TEMPLATES.find((lt) => lt.id === previewDoc.letter_id) : null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          {previewDoc ? (
            <View style={styles.previewHeader}>
              <TouchableOpacity onPress={() => setPreviewDoc(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.backArrow, { color: C.text }]}>←</Text>
              </TouchableOpacity>
              <Text style={[styles.title, { color: C.text, marginBottom: 0, flexShrink: 1 }]} numberOfLines={1}>
                {previewDoc.label}
              </Text>
            </View>
          ) : (
            <Text style={[styles.title, { color: C.text }]}>📄 Mes documents</Text>
          )}

          {previewDoc ? (
            !previewTpl ? (
              <Text style={[styles.emptyText, { color: C.muted }]}>Ce type de courrier n'existe plus.</Text>
            ) : (
              <>
                <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 4 }}>
                  <View style={[styles.letterPreview, { borderColor: C.border, backgroundColor: C.bg }]}>
                    {splitAlignedLines(previewTpl.body(previewDoc.values)).map((line, i) => (
                      <Text
                        key={i}
                        style={[styles.letterPreviewLine, { color: C.text, textAlign: line.rightAlign ? "right" : "left" }]}
                      >
                        {line.text || " "}
                      </Text>
                    ))}
                  </View>
                  {!!previewTpl.piecesJointes.length && (
                    <View style={[styles.letterPieces, { borderColor: C.gold, backgroundColor: `${C.gold}14` }]}>
                      <Text style={[styles.piecesTitle, { color: C.gold }]}>📎 Pièces jointes à envoyer avec ce courrier</Text>
                      {previewTpl.piecesJointes.map((p, i) => (
                        <Text key={i} style={[styles.pieceText, { color: C.text }]}>• {p}</Text>
                      ))}
                    </View>
                  )}
                </ScrollView>

                <View style={styles.previewBtns}>
                  <TouchableOpacity
                    style={[styles.previewBtn, { backgroundColor: C.accent, borderColor: C.accent }]}
                    onPress={() => onEdit(previewDoc)}
                  >
                    <Text style={[styles.previewBtnText, { color: "#fff" }]}>Modifier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.previewBtn, { backgroundColor: C.orange, borderColor: C.orange }]}
                    onPress={() => onDownload(previewDoc)}
                    disabled={downloadingId === previewDoc.id}
                  >
                    {downloadingId === previewDoc.id
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={[styles.previewBtnText, { color: "#fff" }]}>Télécharger</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )
          ) : (
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
                      onPress={() => setPreviewDoc(doc)}
                    >
                      <Text style={styles.smallBtnText}>👁️ Aperçu</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              )}
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

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", maxWidth: 440, maxHeight: "88%", borderRadius: 20, borderWidth: 1, padding: 24 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 14 },
  scroll: { maxHeight: 420 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginVertical: 12, lineHeight: 19 },

  previewHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  backArrow: { fontFamily: "DM_Sans_700Bold", fontSize: 20 },

  letterPreview: { borderWidth: 1, borderRadius: 10, padding: 12 },
  letterPreviewLine: { fontFamily: "DM_Sans_400Regular", fontSize: 13, lineHeight: 20 },
  letterPieces: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 12 },
  piecesTitle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, marginBottom: 4 },
  pieceText: { fontFamily: "DM_Sans_400Regular", fontSize: 12.5, lineHeight: 17, marginTop: 2 },

  previewBtns: { flexDirection: "row", gap: 8, marginTop: 14 },
  previewBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  previewBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 12.5 },

  docCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  docLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13.5, marginBottom: 4 },
  docDate: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginBottom: 10 },
  smallBtn: { borderRadius: 8, paddingVertical: 9, alignItems: "center" },
  smallBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 12, color: "#fff" },

  closeFooterBtn: { alignItems: "center", marginTop: 16 },
  closeFooterBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});
