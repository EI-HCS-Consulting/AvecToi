import { useState, useEffect } from "react";
import { Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet } from "react-native";
import { VISITOR_RELATIONS } from "@/lib/relations";
import type { Theme } from "@/lib/themes";

// Popup "lien avec le patient" — même principe de liste tappable que
// MetierPickerModal.tsx, mais sans accordéon par famille : la liste des
// relations est courte et plate, pas besoin de la replier par catégorie.
// "Autre" ouvre un écran de saisie libre, même pattern que
// MetierPickerModal : la valeur tapée est stockée telle quelle dans
// visitor_profiles.relation (pas de clé de catalogue associée, voir
// lib/relations.ts relationLabel()).
interface Props {
  visible: boolean;
  C: Theme;
  value: string;
  onClose: () => void;
  onPick: (value: string) => void;
}

type Screen = "main" | "custom";

export default function RelationPickerModal({ visible, C, value, onClose, onPick }: Props) {
  const [screen, setScreen] = useState<Screen>("main");
  const [customText, setCustomText] = useState("");

  useEffect(() => {
    if (!visible) return;
    setScreen("main");
    setCustomText("");
  }, [visible]);

  function pick(key: string) {
    onPick(key);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          {screen === "main" && (
            <>
              <Text style={[styles.title, { color: C.text }]}>Lien avec le patient</Text>
              <ScrollView style={{ maxHeight: 400 }}>
                <TouchableOpacity
                  onPress={() => pick("")}
                  activeOpacity={0.8}
                  style={[styles.row, { borderColor: value === "" ? C.accent : C.border, backgroundColor: value === "" ? `${C.accent}22` : "transparent" }]}
                >
                  <Text style={[styles.rowText, { color: value === "" ? C.accent : C.muted }]}>Non renseigné</Text>
                </TouchableOpacity>
                {VISITOR_RELATIONS.filter((r) => r.key !== "autre").map((r) => {
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
                <TouchableOpacity onPress={() => setScreen("custom")} activeOpacity={0.8} style={styles.row}>
                  <Text style={[styles.rowText, { color: C.text }]}>Autre</Text>
                </TouchableOpacity>
              </ScrollView>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={[styles.closeBtnText, { color: C.muted }]}>Fermer</Text>
              </TouchableOpacity>
            </>
          )}

          {screen === "custom" && (
            <>
              <TouchableOpacity onPress={() => setScreen("main")} style={{ marginBottom: 8 }}>
                <Text style={[styles.linkText, { color: C.accent }]}>‹ Retour à la liste</Text>
              </TouchableOpacity>
              <Text style={[styles.title, { color: C.text }]}>Préciser le lien</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                placeholder="ex. Marraine, Filleul..."
                placeholderTextColor={C.muted}
                value={customText}
                onChangeText={setCustomText}
                autoFocus
                autoCapitalize="sentences"
              />
              <TouchableOpacity
                onPress={() => customText.trim() && pick(customText.trim())}
                disabled={!customText.trim()}
                style={[styles.validateBtn, { backgroundColor: C.accent }, !customText.trim() && { opacity: 0.5 }]}
              >
                <Text style={styles.validateBtnText}>Valider</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={[styles.closeBtnText, { color: C.muted }]}>Fermer</Text>
              </TouchableOpacity>
            </>
          )}
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
  linkText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontFamily: "DM_Sans_400Regular", fontSize: 14, marginBottom: 4 },
  validateBtn: { borderRadius: 12, paddingVertical: 13, alignItems: "center", marginTop: 12 },
  validateBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
});
