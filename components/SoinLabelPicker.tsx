import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  FAMILLES, METIERS, metiersByFamille, metierByKey,
  soinsForMetier, otherFamilleSoinsForMetier,
} from "@/lib/metiers";
import { soinIconName } from "@/lib/soinIcons";
import type { MetierSoin } from "@/lib/metiers";
import type { Theme } from "@/lib/themes";

// Champ "Nom du soin" réutilisable — SoinFormModal.tsx ("+ Ajouter un soin")
// et IntervenantFicheModal.tsx (lignes de la fiche en mode création)
// partagent ce même composant pour rester cohérents. Trois façons de
// renseigner un soin :
//  1. Liste déroulante par défaut : soins du métier de l'intervenant, "Autre"
//     en dernière position de cette même liste (bascule en saisie libre), et
//     un bouton "Autres soins" pour parcourir les autres familles/métiers.
//  2. "Autre" -> saisie libre avec auto-complétion par mot-clé sur tout le
//     catalogue (ex. taper "massage" propose tous les soins contenant ce mot,
//     toutes familles confondues).
//  3. "Autres soins" (depuis la liste ou la saisie libre) -> familles en
//     accordéon (une seule ouverte à la fois) puis métiers, puis soins de ce
//     métier — "Autre" toujours en dernière position de chaque écran pour
//     retomber sur la saisie libre.
// Une fois une valeur choisie dans le catalogue, la liste déroulante affiche
// son icône + une coche pour matérialiser la sélection comme "validée".
// Remonter `key` (côté appelant) quand la cible change (nouveau soin, popup
// rouverte…) pour réinitialiser proprement le mode (liste vs saisie libre).
interface Props {
  metier: string | null;
  value: string;
  onChange: (label: string) => void;
  C: Theme;
  placeholder?: string;
  // Ouvre directement le picker au montage (liste catalogue) — utilisé par
  // IntervenantFicheModal.tsx quand une ligne vient d'être ajoutée via
  // "+ Ajouter un type", pour éviter le clic supplémentaire "ouvrir le
  // menu déroulant" avant de pouvoir choisir un soin.
  autoOpen?: boolean;
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

export default function SoinLabelPicker({ metier, value, onChange, C, placeholder, autoOpen }: Props) {
  const ownSoins = soinsForMetier(metier);
  const otherSoins = otherFamilleSoinsForMetier(metier);
  const hasCatalog = ownSoins.length > 0 || otherSoins.length > 0;
  const catalogLabelsLower = new Set([...ownSoins, ...otherSoins].map((s) => s.label.toLowerCase()));

  const initialCustomMode = !hasCatalog || (!!value && !catalogLabelsLower.has(value.toLowerCase()));
  const [customMode, setCustomMode] = useState(initialCustomMode);
  const [pickerOpen, setPickerOpen] = useState(() => !!autoOpen && !initialCustomMode);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [browseMetier, setBrowseMetier] = useState<string | null>(null);
  const [browseFamilleOpen, setBrowseFamilleOpen] = useState<string | null>(null);

  const metierLabelText = metierByKey(metier)?.label ?? "";

  function openBrowse() {
    setBrowseMetier(null);
    setBrowseFamilleOpen(null);
    setBrowseOpen(true);
  }

  function pickCustom(fromModal: "picker" | "browse") {
    setCustomMode(true);
    onChange("");
    if (fromModal === "picker") setPickerOpen(false);
    else setBrowseOpen(false);
  }

  const query = value.trim().toLowerCase();
  const suggestions = customMode && query.length >= 2
    ? ALL_SOINS.filter((s) => s.label.toLowerCase().includes(query)).slice(0, 8)
    : [];

  return (
    <>
      {customMode ? (
        <>
          <TextInput
            style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
            placeholder={placeholder ?? "ex. Massage du dos"}
            placeholderTextColor={C.muted}
            value={value}
            onChangeText={onChange}
          />
          {suggestions.length > 0 && (
            <View style={[styles.suggestBox, { backgroundColor: C.bg, borderColor: C.border }]}>
              {suggestions.map((s) => (
                <TouchableOpacity
                  key={s.label}
                  onPress={() => onChange(s.label)}
                  activeOpacity={0.7}
                  style={styles.suggestRow}
                >
                  <Ionicons name={s.icon} size={15} color={C.muted} />
                  <Text style={[styles.suggestText, { color: C.text }]} numberOfLines={1}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={styles.linkRow}>
            {hasCatalog && (
              <TouchableOpacity onPress={() => { setCustomMode(false); onChange(""); }}>
                <Text style={[styles.linkText, { color: C.accent }]}>↩ Choisir dans la liste</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={openBrowse}>
              <Text style={[styles.linkText, { color: C.accent }]}>🔍 Autres soins</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <TouchableOpacity
          style={[styles.input, styles.dropdown, { backgroundColor: C.bg, borderColor: value ? C.accent : C.border }]}
          onPress={() => setPickerOpen(true)}
          activeOpacity={0.8}
        >
          <View style={styles.dropdownLeft}>
            {!!value && <Ionicons name={soinIconName(value)} size={18} color={C.accent} style={{ marginRight: 8 }} />}
            <Text style={[styles.dropdownText, { color: value ? C.text : C.muted }]} numberOfLines={1}>
              {value || "Choisir un soin"}
            </Text>
          </View>
          <Ionicons name={value ? "checkmark-circle" : "chevron-down"} size={18} color={value ? C.accent : C.muted} />
        </TouchableOpacity>
      )}

      <Modal visible={pickerOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setPickerOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.title, { color: C.text }]}>Choisir un soin</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              <View style={{ marginBottom: 4 }}>
                <Text style={[styles.sectionHeader, { color: C.muted }]}>Soins de {metierLabelText}</Text>
                {ownSoins.map((s) => (
                  <SoinRow key={s.label} soin={s} selected={value === s.label} C={C}
                    onPress={() => { onChange(s.label); setPickerOpen(false); }} />
                ))}
                <AutreRow C={C} onPress={() => pickCustom("picker")} />
              </View>
            </ScrollView>
            <TouchableOpacity onPress={() => { setPickerOpen(false); openBrowse(); }} style={[styles.otherSoinsBtn, { borderTopColor: C.border }]}>
              <Text style={[styles.otherSoinsBtnText, { color: C.accent }]}>Autres soins</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPickerOpen(false)} style={styles.closeBtn}>
              <Text style={[styles.closeBtnText, { color: C.muted }]}>Fermer</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={browseOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setBrowseOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setBrowseOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            {!browseMetier ? (
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
                                onPress={() => setBrowseMetier(m.key)}
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
                  <AutreRow C={C} onPress={() => pickCustom("browse")} />
                </ScrollView>
              </>
            ) : (
              <>
                <TouchableOpacity onPress={() => setBrowseMetier(null)} style={{ marginBottom: 8 }}>
                  <Text style={[styles.linkText, { color: C.accent }]}>‹ Retour aux métiers</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: C.text }]}>Soins de {metierByKey(browseMetier)?.label}</Text>
                <ScrollView style={{ maxHeight: 360 }}>
                  {soinsForMetier(browseMetier).map((s) => (
                    <SoinRow key={s.label} soin={s} selected={value === s.label} C={C}
                      onPress={() => { onChange(s.label); setBrowseOpen(false); }} />
                  ))}
                  <AutreRow C={C} onPress={() => pickCustom("browse")} />
                </ScrollView>
              </>
            )}
            <TouchableOpacity onPress={() => setBrowseOpen(false)} style={styles.closeBtn}>
              <Text style={[styles.closeBtnText, { color: C.muted }]}>Fermer</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function SoinRow({ soin, selected, C, onPress }: { soin: MetierSoin; selected: boolean; C: Theme; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.row, { borderColor: selected ? C.accent : "transparent", backgroundColor: selected ? `${C.accent}22` : "transparent" }]}
    >
      <Ionicons name={soin.icon} size={17} color={selected ? C.accent : C.muted} />
      <Text style={[styles.rowText, { color: selected ? C.accent : C.text }]}>{soin.label}</Text>
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
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontFamily: "DM_Sans_400Regular", fontSize: 14 },
  dropdown: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dropdownLeft: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 },
  dropdownText: { fontFamily: "DM_Sans_400Regular", fontSize: 14, flexShrink: 1 },
  suggestBox: { borderWidth: 1, borderRadius: 10, marginTop: 6, paddingVertical: 4 },
  suggestRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 12 },
  suggestText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, flex: 1 },
  linkRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, gap: 12 },
  linkText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
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
});
