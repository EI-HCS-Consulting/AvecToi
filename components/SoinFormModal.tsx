import { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Modal, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from "react-native";
import { supabase } from "@/lib/supabase";
import ConfirmModal from "@/components/ConfirmModal";
import SoinLabelPicker from "@/components/SoinLabelPicker";
import { propagateSoinChange } from "@/lib/interventionTypesSync";
import type { InterventionType } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Popup modification/suppression d'UN SEUL soin (intervention_type) existant
// — déclenché par un appui long sur une ligne de MesSoinsList.tsx ("MES
// SOINS" côté intervenant). La création d'un nouveau soin se fait par un
// flux séparé (SoinPickerModal puis SoinDurationModal, voir MesSoinsList.tsx
// "+ Ajouter un soin") : ce popup ne gère donc plus que l'édition.
interface Props {
  visible: boolean;
  intervenantProfileId: string;
  soin: InterventionType;
  // Clé(s) du/des métier(s) de l'intervenant (voir lib/metiers.ts) —
  // détermine la liste de soins suggérés si l'intervenant change le nom.
  metiers: (string | null | undefined)[];
  C: Theme;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export default function SoinFormModal({
  visible, intervenantProfileId, soin, metiers, C, onClose, onSaved, onDeleted,
}: Props) {
  const [label, setLabel] = useState("");
  const [duration, setDuration] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLabel(soin.label);
    setDuration(String(soin.duration_minutes));
    setConfirmDelete(false);
  }, [visible, soin]);

  const parsedDuration = parseInt(duration, 10);
  const canSave = label.trim().length > 0 && Number.isFinite(parsedDuration) && parsedDuration > 0 && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = { label: label.trim(), duration_minutes: parsedDuration };
      const { error } = await supabase.from("intervention_types").update(payload).eq("id", soin.id);
      if (error) throw error;
      await propagateSoinChange(intervenantProfileId, { type: "update", oldLabel: soin.label, ...payload });
      onSaved();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible d'enregistrer ce soin.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
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
              <Text style={[styles.title, { color: C.text }]}>🩺 Modifier ce soin</Text>

              <Text style={[styles.fieldLabel, { color: C.gold }]}>Nom du soin</Text>
              <SoinLabelPicker
                key={`${soin.id}-${visible}`}
                metier={metiers[0] ?? null}
                value={label}
                onChange={setLabel}
                C={C}
              />

              <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 14 }]}>Durée habituelle (minutes)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                placeholder="ex. 30"
                placeholderTextColor={C.muted}
                value={duration}
                onChangeText={(v) => setDuration(v.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
              />

              <View style={styles.buttons}>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: C.accent }, !canSave && { opacity: 0.5 }]}
                  onPress={handleSave}
                  disabled={!canSave}
                  activeOpacity={0.85}
                >
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>Modifier</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: C.danger }, saving && { opacity: 0.5 }]}
                  onPress={() => setConfirmDelete(true)}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  <Text style={styles.btnText}>Supprimer</Text>
                </TouchableOpacity>
              </View>

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
        message={`"${soin.label}" ne sera plus proposable pour de nouvelles réservations.`}
        confirmLabel="Supprimer"
        saving={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        C={C}
      />

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
  buttons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
  },
  btn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  btnText: {
    fontFamily: "DM_Sans_700Bold",
    fontSize: 15,
    color: "#fff",
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
