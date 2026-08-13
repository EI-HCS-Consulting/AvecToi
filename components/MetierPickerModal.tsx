import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FAMILLES, metiersByFamille } from "@/lib/metiers";
import type { Theme } from "@/lib/themes";

// Popup métier/spécialisation — familles repliables (une ouverte à la fois),
// même pattern accordéon que l'écran "Autres soins" de SoinPickerModal.tsx.
// "Autre" ouvre un écran de saisie libre : la valeur tapée est alors stockée
// telle quelle dans intervenant_profiles.metier/metier_secondaire (pas de
// clé de catalogue associée, voir lib/metiers.ts metierLabel()).
interface Props {
  visible: boolean;
  C: Theme;
  // Masque un métier déjà choisi ailleurs sur le profil (ex. le métier
  // principal, quand on choisit la 2ᵉ spécialisation).
  excludeKey?: string | null;
  onClose: () => void;
  onPick: (value: string) => void;
}

type Screen = "main" | "custom";

export default function MetierPickerModal({ visible, C, excludeKey, onClose, onPick }: Props) {
  const [screen, setScreen] = useState<Screen>("main");
  const [openFamille, setOpenFamille] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");

  useEffect(() => {
    if (!visible) return;
    setScreen("main");
    setOpenFamille(null);
    setCustomText("");
  }, [visible]);

  function pick(value: string) {
    onPick(value);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          {screen === "main" && (
            <>
              <Text style={[styles.title, { color: C.text }]}>Métier / spécialisation</Text>
              <ScrollView style={{ maxHeight: 400 }}>
                {FAMILLES.map((famille) => {
                  const open = openFamille === famille.key;
                  const metiers = metiersByFamille(famille.key).filter((m) => m.key !== excludeKey);
                  if (metiers.length === 0) return null;
                  return (
                    <View key={famille.key} style={{ marginBottom: 8 }}>
                      <TouchableOpacity
                        onPress={() => setOpenFamille(open ? null : famille.key)}
                        activeOpacity={0.8}
                        style={[styles.familleAccordionRow, { borderColor: C.border }]}
                      >
                        <View style={styles.familleHeader}>
                          <Ionicons name={famille.icon} size={16} color={C.muted} />
                          <Text style={[styles.familleAccordionText, { color: C.text }]}>{famille.label}</Text>
                        </View>
                        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={C.muted} />
                      </TouchableOpacity>
                      {open && (
                        <View style={{ marginTop: 6 }}>
                          {metiers.map((m) => (
                            <TouchableOpacity key={m.key} onPress={() => pick(m.key)} activeOpacity={0.8} style={styles.row}>
                              <Ionicons name={m.icon} size={17} color={C.muted} />
                              <Text style={[styles.rowText, { color: C.text }]}>{m.label}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
                <TouchableOpacity onPress={() => setScreen("custom")} activeOpacity={0.8} style={[styles.row, { borderColor: "transparent" }]}>
                  <Ionicons name="create-outline" size={17} color={C.muted} />
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
              <Text style={[styles.title, { color: C.text }]}>Autre métier</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                placeholder="ex. Ostéopathe"
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
  familleHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  familleAccordionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderRadius: 10, padding: 12 },
  familleAccordionText: { fontFamily: "DM_Sans_700Bold", fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  rowText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  closeBtn: { alignItems: "center", marginTop: 8 },
  closeBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  linkText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontFamily: "DM_Sans_400Regular", fontSize: 14, marginBottom: 4 },
  validateBtn: { borderRadius: 12, paddingVertical: 13, alignItems: "center", marginTop: 12 },
  validateBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
});
