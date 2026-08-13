import { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Modal, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import ConfirmModal from "@/components/ConfirmModal";
import { propagateSoinChange } from "@/lib/interventionTypesSync";
import { metierByKey, familleByKey, soinsForMetier, otherFamilleSoinsForMetier } from "@/lib/metiers";
import type { InterventionType } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Popup création/modification/suppression d'UN SEUL soin (intervention_type)
// — utilisé par MesSoinsList.tsx ("MES SOINS" côté intervenant). Distinct
// d'IntervenantFicheModal.tsx qui édite toute la fiche (identité + tous les
// types) d'un coup ; ici on modifie une ligne à la fois, par bouton.
interface Props {
  visible: boolean;
  intervenantProfileId: string;
  soin: InterventionType | null;
  // Clé du métier de l'intervenant (voir lib/metiers.ts) — détermine la
  // liste de soins suggérés (métier puis reste de la famille). Null si
  // jamais renseigné : repli direct sur la saisie libre.
  metier: string | null;
  C: Theme;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export default function SoinFormModal({
  visible, intervenantProfileId, soin, metier, C, onClose, onSaved, onDeleted,
}: Props) {
  const [label, setLabel] = useState("");
  const [duration, setDuration] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // false = liste suggérée (métier/famille) affichée sous forme de menu
  // déroulant ; true = saisie libre (option "Autre", ou soin déjà enregistré
  // dont le libellé ne correspond à aucune entrée du catalogue — fiches
  // créées avant son introduction, ou libellé personnalisé antérieur).
  const [customMode, setCustomMode] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

  const ownSoins = soinsForMetier(metier);
  const otherSoins = otherFamilleSoinsForMetier(metier);
  const hasCatalog = ownSoins.length > 0 || otherSoins.length > 0;
  const metierLabelText = metierByKey(metier)?.label ?? "";
  const familleLabelText = familleByKey(metierByKey(metier)?.familleKey)?.label ?? "";

  useEffect(() => {
    if (!visible) return;
    const initialLabel = soin?.label ?? "";
    setLabel(initialLabel);
    setDuration(soin ? String(soin.duration_minutes) : "");
    setConfirmDelete(false);
    setPickerOpen(false);
    const allCatalogLabels = new Set(
      [...ownSoins, ...otherSoins].map((s) => s.label.toLowerCase()),
    );
    // Repli direct en saisie libre si aucun catalogue n'est disponible pour ce
    // métier, ou si le libellé existant (mode édition) n'y figure pas.
    setCustomMode(!hasCatalog || (!!initialLabel && !allCatalogLabels.has(initialLabel.toLowerCase())));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, soin, metier]);

  const parsedDuration = parseInt(duration, 10);
  const canSave = label.trim().length > 0 && Number.isFinite(parsedDuration) && parsedDuration > 0 && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = { label: label.trim(), duration_minutes: parsedDuration };
      if (soin) {
        const { error } = await supabase.from("intervention_types").update(payload).eq("id", soin.id);
        if (error) throw error;
        await propagateSoinChange(intervenantProfileId, { type: "update", oldLabel: soin.label, ...payload });
      } else {
        const { error } = await supabase
          .from("intervention_types")
          .insert({ intervenant_profile_id: intervenantProfileId, ...payload });
        if (error) throw error;
        await propagateSoinChange(intervenantProfileId, { type: "create", ...payload });
      }
      onSaved();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible d'enregistrer ce soin.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!soin) return;
    setDeleting(true);
    const { error } = await supabase.from("intervention_types").delete().eq("id", soin.id);
    setDeleting(false);
    if (error) {
      Alert.alert("Erreur", "Impossible de supprimer ce soin.");
      return;
    }
    await propagateSoinChange(intervenantProfileId, { type: "delete", label: soin.label });
    setConfirmDelete(false);
    onDeleted();
  }

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.overlay, { flexGrow: 1, justifyContent: "center", paddingVertical: 16 }]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
              <Text style={[styles.title, { color: C.text }]}>{soin ? "🩺 Modifier ce soin" : "🩺 Nouveau soin"}</Text>

              <Text style={[styles.fieldLabel, { color: C.gold }]}>Nom du soin</Text>
              {customMode ? (
                <>
                  <TextInput
                    style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                    placeholder="ex. Kiné"
                    placeholderTextColor={C.muted}
                    value={label}
                    onChangeText={setLabel}
                  />
                  {hasCatalog && (
                    <TouchableOpacity onPress={() => { setCustomMode(false); setLabel(""); }} style={{ marginTop: 8 }}>
                      <Text style={[styles.backToListText, { color: C.accent }]}>↩ Choisir dans la liste</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.input, styles.dropdown, { backgroundColor: C.bg, borderColor: C.border }]}
                  onPress={() => setPickerOpen(true)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dropdownText, { color: label ? C.text : C.muted }]}>
                    {label || "Choisir un soin"}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={C.muted} />
                </TouchableOpacity>
              )}

              <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 14 }]}>Durée habituelle (minutes)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                placeholder="ex. 30"
                placeholderTextColor={C.muted}
                value={duration}
                onChangeText={(v) => setDuration(v.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
              />

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: C.accent, marginTop: 22 }, !canSave && { opacity: 0.5 }]}
                onPress={handleSave}
                disabled={!canSave}
                activeOpacity={0.85}
              >
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Enregistrer</Text>}
              </TouchableOpacity>

              {soin && (
                <TouchableOpacity style={styles.deleteBtn} onPress={() => setConfirmDelete(true)} disabled={saving}>
                  <Text style={[styles.deleteBtnText, { color: C.danger }]}>🗑️ Supprimer ce soin</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={onClose} style={styles.cancelBtn} disabled={saving}>
                <Text style={[styles.cancelBtnText, { color: C.muted }]}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmModal
        visible={confirmDelete}
        icon="🗑️"
        title="Supprimer ce soin ?"
        message={soin ? `"${soin.label}" ne sera plus proposable pour de nouvelles réservations.` : undefined}
        confirmLabel="Supprimer"
        saving={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        C={C}
      />

      <Modal visible={pickerOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setPickerOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.pickerCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.title, { color: C.text, marginBottom: 12 }]}>Choisir un soin</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {ownSoins.length > 0 && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={[styles.sectionHeader, { color: C.muted }]}>Soins de {metierLabelText}</Text>
                  {ownSoins.map((s) => (
                    <TouchableOpacity
                      key={s.label}
                      onPress={() => { setLabel(s.label); setPickerOpen(false); }}
                      activeOpacity={0.8}
                      style={[styles.pickerRow, { borderColor: label === s.label ? C.accent : "transparent", backgroundColor: label === s.label ? `${C.accent}22` : "transparent" }]}
                    >
                      <Ionicons name={s.icon} size={17} color={label === s.label ? C.accent : C.muted} />
                      <Text style={[styles.pickerRowText, { color: label === s.label ? C.accent : C.text }]}>{s.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {otherSoins.length > 0 && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={[styles.sectionHeader, { color: C.muted }]}>Autres soins de {familleLabelText}</Text>
                  {otherSoins.map((s) => (
                    <TouchableOpacity
                      key={s.label}
                      onPress={() => { setLabel(s.label); setPickerOpen(false); }}
                      activeOpacity={0.8}
                      style={[styles.pickerRow, { borderColor: label === s.label ? C.accent : "transparent", backgroundColor: label === s.label ? `${C.accent}22` : "transparent" }]}
                    >
                      <Ionicons name={s.icon} size={17} color={label === s.label ? C.accent : C.muted} />
                      <Text style={[styles.pickerRowText, { color: label === s.label ? C.accent : C.text }]}>{s.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <TouchableOpacity
                onPress={() => { setCustomMode(true); setLabel(""); setPickerOpen(false); }}
                activeOpacity={0.8}
                style={[styles.pickerRow, { borderColor: "transparent" }]}
              >
                <Ionicons name="create-outline" size={17} color={C.muted} />
                <Text style={[styles.pickerRowText, { color: C.text }]}>Autre (personnalisé)</Text>
              </TouchableOpacity>
            </ScrollView>
            <TouchableOpacity onPress={() => setPickerOpen(false)} style={styles.cancelBtn}>
              <Text style={[styles.cancelBtnText, { color: C.muted }]}>Fermer</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
  },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 20,
    marginBottom: 18,
    textAlign: "center",
  },
  fieldLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontFamily: "DM_Sans_400Regular",
    fontSize: 14,
  },
  dropdown: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dropdownText: { fontFamily: "DM_Sans_400Regular", fontSize: 14 },
  backToListText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 24 },
  pickerCard: { width: "100%", maxWidth: 400, maxHeight: "80%", borderRadius: 20, borderWidth: 1, padding: 24 },
  sectionHeader: { fontFamily: "DM_Sans_700Bold", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 6, paddingHorizontal: 2 },
  pickerRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  pickerRowText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  saveBtnText: {
    fontFamily: "DM_Sans_700Bold",
    fontSize: 15,
    color: "#fff",
  },
  deleteBtn: {
    alignItems: "center",
    marginTop: 16,
  },
  deleteBtnText: {
    fontFamily: "DM_Sans_600SemiBold",
    fontSize: 13,
  },
  cancelBtn: {
    alignItems: "center",
    marginTop: 14,
  },
  cancelBtnText: {
    fontFamily: "DM_Sans_600SemiBold",
    fontSize: 14,
  },
});
