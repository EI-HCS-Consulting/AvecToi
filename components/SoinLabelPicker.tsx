import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  FAMILLES, METIERS, metiersByFamille, metierByKey, familleByKey,
  soinsForMetier, otherFamilleSoinsForMetier,
} from "@/lib/metiers";
import type { MetierSoin } from "@/lib/metiers";
import type { Theme } from "@/lib/themes";

// Champ "Nom du soin" réutilisable — SoinFormModal.tsx ("+ Ajouter un soin")
// et IntervenantFicheModal.tsx (lignes de la fiche en mode création)
// partagent ce même composant pour rester cohérents. Trois façons de
// renseigner un soin :
//  1. Liste déroulante par défaut : soins du métier de l'intervenant, puis
//     reste de sa famille (voir lib/metiers.ts).
//  2. "Autre" -> saisie libre avec auto-complétion par mot-clé sur tout le
//     catalogue (ex. taper "massage" propose tous les soins contenant ce mot,
//     toutes familles confondues).
//  3. Depuis la saisie libre, "Parcourir une autre famille / métier" ouvre un
//     second picker (métier groupé par famille, puis ses soins) pour les cas
//     où le soin recherché n'appartient ni au métier ni à la famille de
//     l'intervenant.
// Remonter `key` (côté appelant) quand la cible change (nouveau soin, popup
// rouverte…) pour réinitialiser proprement le mode (liste vs saisie libre).
interface Props {
  metier: string | null;
  value: string;
  onChange: (label: string) => void;
  C: Theme;
  placeholder?: string;
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

export default function SoinLabelPicker({ metier, value, onChange, C, placeholder }: Props) {
  const ownSoins = soinsForMetier(metier);
  const otherSoins = otherFamilleSoinsForMetier(metier);
  const hasCatalog = ownSoins.length > 0 || otherSoins.length > 0;
  const catalogLabelsLower = new Set([...ownSoins, ...otherSoins].map((s) => s.label.toLowerCase()));

  const [customMode, setCustomMode] = useState(
    () => !hasCatalog || (!!value && !catalogLabelsLower.has(value.toLowerCase())),
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [browseMetier, setBrowseMetier] = useState<string | null>(null);

  const metierLabelText = metierByKey(metier)?.label ?? "";
  const familleLabelText = familleByKey(metierByKey(metier)?.familleKey)?.label ?? "";

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
            <TouchableOpacity onPress={() => { setBrowseMetier(null); setBrowseOpen(true); }}>
              <Text style={[styles.linkText, { color: C.accent }]}>🔍 Autre métier / famille</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <TouchableOpacity
          style={[styles.input, styles.dropdown, { backgroundColor: C.bg, borderColor: C.border }]}
          onPress={() => setPickerOpen(true)}
          activeOpacity={0.8}
        >
          <Text style={[styles.dropdownText, { color: value ? C.text : C.muted }]}>
            {value || "Choisir un soin"}
          </Text>
          <Ionicons name="chevron-down" size={16} color={C.muted} />
        </TouchableOpacity>
      )}

      <Modal visible={pickerOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setPickerOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.title, { color: C.text }]}>Choisir un soin</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {ownSoins.length > 0 && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={[styles.sectionHeader, { color: C.muted }]}>Soins de {metierLabelText}</Text>
                  {ownSoins.map((s) => (
                    <SoinRow key={s.label} soin={s} selected={value === s.label} C={C}
                      onPress={() => { onChange(s.label); setPickerOpen(false); }} />
                  ))}
                </View>
              )}
              {otherSoins.length > 0 && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={[styles.sectionHeader, { color: C.muted }]}>Autres soins de {familleLabelText}</Text>
                  {otherSoins.map((s) => (
                    <SoinRow key={s.label} soin={s} selected={value === s.label} C={C}
                      onPress={() => { onChange(s.label); setPickerOpen(false); }} />
                  ))}
                </View>
              )}
              <TouchableOpacity
                onPress={() => { setCustomMode(true); onChange(""); setPickerOpen(false); }}
                activeOpacity={0.8}
                style={[styles.row, { borderColor: "transparent" }]}
              >
                <Ionicons name="create-outline" size={17} color={C.muted} />
                <Text style={[styles.rowText, { color: C.text }]}>Autre (personnalisé)</Text>
              </TouchableOpacity>
            </ScrollView>
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
                <Text style={[styles.title, { color: C.text }]}>Choisir un métier</Text>
                <ScrollView style={{ maxHeight: 400 }}>
                  {FAMILLES.map((famille) => (
                    <View key={famille.key} style={{ marginBottom: 14 }}>
                      <View style={styles.familleHeader}>
                        <Ionicons name={famille.icon} size={14} color={C.muted} />
                        <Text style={[styles.sectionHeader, { color: C.muted, marginBottom: 0 }]}>{famille.label}</Text>
                      </View>
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
                  ))}
                </ScrollView>
              </>
            ) : (
              <>
                <TouchableOpacity onPress={() => setBrowseMetier(null)} style={{ marginBottom: 8 }}>
                  <Text style={[styles.linkText, { color: C.accent }]}>‹ Retour aux métiers</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: C.text }]}>Soins de {metierByKey(browseMetier)?.label}</Text>
                <ScrollView style={{ maxHeight: 360 }}>
                  {soinsForMetier(browseMetier).length === 0 ? (
                    <Text style={[styles.emptyText, { color: C.muted }]}>Aucun soin répertorié pour ce métier.</Text>
                  ) : (
                    soinsForMetier(browseMetier).map((s) => (
                      <SoinRow key={s.label} soin={s} selected={value === s.label} C={C}
                        onPress={() => { onChange(s.label); setBrowseOpen(false); }} />
                    ))
                  )}
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

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontFamily: "DM_Sans_400Regular", fontSize: 14 },
  dropdown: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dropdownText: { fontFamily: "DM_Sans_400Regular", fontSize: 14 },
  suggestBox: { borderWidth: 1, borderRadius: 10, marginTop: 6, paddingVertical: 4 },
  suggestRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 12 },
  suggestText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, flex: 1 },
  linkRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, gap: 12 },
  linkText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", maxWidth: 400, maxHeight: "80%", borderRadius: 20, borderWidth: 1, padding: 24 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 12, textAlign: "center" },
  sectionHeader: { fontFamily: "DM_Sans_700Bold", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 6, paddingHorizontal: 2 },
  familleHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6, paddingHorizontal: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  rowText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center", paddingVertical: 12 },
  closeBtn: { alignItems: "center", marginTop: 8 },
  closeBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});
