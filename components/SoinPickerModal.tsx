import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  FAMILLES, METIERS, metiersByFamille, metierByKey,
  soinsForMetier,
} from "@/lib/metiers";
import type { MetierSoin } from "@/lib/metiers";
import type { Theme } from "@/lib/themes";
import { LOGO_GREEN } from "@/lib/themes";

// Popup "Type d'intervention" — bouton vert (couleur du bonhomme turquoise du
// logo, voir IntervenantFicheModal.tsx, bloc Métier / spécialisation, mode
// création). Contrairement à SoinLabelPicker.tsx (champ par ligne qui bascule
// en saisie libre inline dans le formulaire), tout se passe ici dans la
// popup : liste du métier, "Autres soins" (familles -> métiers -> soins), ou
// "Autre" -> saisie libre avec suggestions, toujours validée par un bouton
// avant de fermer. Le formulaire appelant n'affiche donc jamais de TextInput
// brut sous le champ.
interface Props {
  visible: boolean;
  metier: string | null;
  value: string;
  C: Theme;
  onClose: () => void;
  onPick: (label: string) => void;
}

function allCatalogSoins(): MetierSoin[] {
  const seen = new Set<string>();
  const result: MetierSoin[] = [];
  for (const m of METIERS) {
    for (const s of m.soins) {
      const lower = s.label.toLowerCase();
      if (seen.has(lower)) continue;
      seen.add(lower);
      result.push(s);
    }
  }
  return result;
}
const ALL_SOINS = allCatalogSoins();

type Screen = "main" | "browse-familles" | "browse-metier" | "custom";

export default function SoinPickerModal({ visible, metier, value, C, onClose, onPick }: Props) {
  const [screen, setScreen] = useState<Screen>("main");
  const [browseMetier, setBrowseMetier] = useState<string | null>(null);
  const [browseFamilleOpen, setBrowseFamilleOpen] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");

  useEffect(() => {
    if (!visible) return;
    const known = ALL_SOINS.some((s) => s.label.toLowerCase() === value.toLowerCase());
    setScreen("main");
    setBrowseMetier(null);
    setBrowseFamilleOpen(null);
    setCustomText(value && !known ? value : "");
  }, [visible, value]);

  const ownSoins = soinsForMetier(metier);
  const metierLabelText = metierByKey(metier)?.label ?? "";

  function pick(label: string) {
    onPick(label);
    onClose();
  }

  function openBrowse() {
    setBrowseMetier(null);
    setBrowseFamilleOpen(null);
    setScreen("browse-familles");
  }

  const query = customText.trim().toLowerCase();
  const suggestions = query.length >= 2
    ? ALL_SOINS.filter((s) => s.label.toLowerCase().includes(query)).slice(0, 8)
    : [];

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[styles.card, { backgroundColor: C.card, borderColor: LOGO_GREEN }]}>
          {screen === "main" && (
            <>
              <Text style={[styles.title, { color: C.text }]}>Type d'intervention</Text>
              <ScrollView style={{ maxHeight: 400 }}>
                {ownSoins.length > 0 && (
                  <View style={{ marginBottom: 4 }}>
                    <Text style={[styles.sectionHeader, { color: C.muted }]}>
                      {metierLabelText ? `Soins de ${metierLabelText}` : "Soins"}
                    </Text>
                    {ownSoins.map((s) => (
                      <SoinRow key={s.label} soin={s} selected={value === s.label} C={C} onPress={() => pick(s.label)} />
                    ))}
                  </View>
                )}
                <AutreRow C={C} onPress={() => setScreen("custom")} />
              </ScrollView>
              <TouchableOpacity onPress={openBrowse} style={[styles.otherSoinsBtn, { borderTopColor: C.border }]}>
                <Text style={[styles.otherSoinsBtnText, { color: LOGO_GREEN }]}>Autres soins</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={[styles.closeBtnText, { color: C.muted }]}>Fermer</Text>
              </TouchableOpacity>
            </>
          )}

          {screen === "browse-familles" && (
            <>
              <Text style={[styles.title, { color: C.text }]}>Autres soins</Text>
              <ScrollView style={{ maxHeight: 400 }}>
                {FAMILLES.map((famille) => {
                  const open = browseFamilleOpen === famille.key;
                  return (
                    <View key={famille.key} style={{ marginBottom: 8 }}>
                      <TouchableOpacity
                        onPress={() => setBrowseFamilleOpen(open ? null : famille.key)}
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
                          {metiersByFamille(famille.key).map((m) => (
                            <TouchableOpacity
                              key={m.key}
                              onPress={() => { setBrowseMetier(m.key); setScreen("browse-metier"); }}
                              activeOpacity={0.8}
                              style={styles.row}
                            >
                              <Ionicons name={m.icon} size={17} color={C.muted} />
                              <Text style={[styles.rowText, { color: C.text }]}>{m.label}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
                <AutreRow C={C} onPress={() => setScreen("custom")} />
              </ScrollView>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={[styles.closeBtnText, { color: C.muted }]}>Fermer</Text>
              </TouchableOpacity>
            </>
          )}

          {screen === "browse-metier" && (
            <>
              <TouchableOpacity onPress={() => setScreen("browse-familles")} style={{ marginBottom: 8 }}>
                <Text style={[styles.linkText, { color: LOGO_GREEN }]}>‹ Retour aux métiers</Text>
              </TouchableOpacity>
              <Text style={[styles.title, { color: C.text }]}>Soins de {metierByKey(browseMetier)?.label}</Text>
              <ScrollView style={{ maxHeight: 360 }}>
                {soinsForMetier(browseMetier).map((s) => (
                  <SoinRow key={s.label} soin={s} selected={value === s.label} C={C} onPress={() => pick(s.label)} />
                ))}
                <AutreRow C={C} onPress={() => setScreen("custom")} />
              </ScrollView>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={[styles.closeBtnText, { color: C.muted }]}>Fermer</Text>
              </TouchableOpacity>
            </>
          )}

          {screen === "custom" && (
            <>
              <TouchableOpacity onPress={() => setScreen("main")} style={{ marginBottom: 8 }}>
                <Text style={[styles.linkText, { color: LOGO_GREEN }]}>‹ Retour à la liste</Text>
              </TouchableOpacity>
              <Text style={[styles.title, { color: C.text }]}>Autre type d'intervention</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                placeholder="ex. Massage du dos"
                placeholderTextColor={C.muted}
                value={customText}
                onChangeText={setCustomText}
                autoFocus
              />
              {suggestions.length > 0 && (
                <View style={[styles.suggestBox, { backgroundColor: C.bg, borderColor: C.border }]}>
                  {suggestions.map((s) => (
                    <TouchableOpacity key={s.label} onPress={() => setCustomText(s.label)} activeOpacity={0.7} style={styles.suggestRow}>
                      <Ionicons name={s.icon} size={15} color={C.muted} />
                      <Text style={[styles.suggestText, { color: C.text }]} numberOfLines={1}>{s.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <TouchableOpacity
                onPress={() => customText.trim() && pick(customText.trim())}
                disabled={!customText.trim()}
                style={[styles.validateBtn, { backgroundColor: LOGO_GREEN }, !customText.trim() && { opacity: 0.5 }]}
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

function SoinRow({ soin, selected, C, onPress }: { soin: MetierSoin; selected: boolean; C: Theme; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.row, { borderColor: selected ? LOGO_GREEN : "transparent", backgroundColor: selected ? `${LOGO_GREEN}22` : "transparent" }]}
    >
      <Ionicons name={soin.icon} size={17} color={selected ? LOGO_GREEN : C.muted} />
      <Text style={[styles.rowText, { color: selected ? LOGO_GREEN : C.text }]}>{soin.label}</Text>
    </TouchableOpacity>
  );
}

function AutreRow({ C, onPress }: { C: Theme; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.row, { borderColor: "transparent" }]}>
      <Ionicons name="create-outline" size={17} color={C.muted} />
      <Text style={[styles.rowText, { color: C.text }]}>Autre</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", maxWidth: 400, maxHeight: "80%", borderRadius: 20, borderWidth: 1, padding: 24 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 12, textAlign: "center" },
  sectionHeader: { fontFamily: "DM_Sans_700Bold", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 6, paddingHorizontal: 2 },
  familleHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  familleAccordionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderRadius: 10, padding: 12 },
  familleAccordionText: { fontFamily: "DM_Sans_700Bold", fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  rowText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  otherSoinsBtn: { alignItems: "center", paddingTop: 12, marginTop: 8, borderTopWidth: 1 },
  otherSoinsBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  closeBtn: { alignItems: "center", marginTop: 8 },
  closeBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  linkText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontFamily: "DM_Sans_400Regular", fontSize: 14, marginBottom: 4 },
  suggestBox: { borderWidth: 1, borderRadius: 10, marginTop: 6, paddingVertical: 4 },
  suggestRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 12 },
  suggestText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, flex: 1 },
  validateBtn: { borderRadius: 12, paddingVertical: 13, alignItems: "center", marginTop: 12 },
  validateBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
});
