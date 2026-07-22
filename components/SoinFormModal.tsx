import { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Modal, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from "react-native";
import { supabase } from "@/lib/supabase";
import ConfirmModal from "@/components/ConfirmModal";
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
  C: Theme;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export default function SoinFormModal({
  visible, intervenantProfileId, soin, C, onClose, onSaved, onDeleted,
}: Props) {
  const [label, setLabel] = useState("");
  const [duration, setDuration] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLabel(soin?.label ?? "");
    setDuration(soin ? String(soin.duration_minutes) : "");
    setConfirmDelete(false);
  }, [visible, soin]);

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
      } else {
        const { error } = await supabase
          .from("intervention_types")
          .insert({ intervenant_profile_id: intervenantProfileId, ...payload });
        if (error) throw error;
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
              <TextInput
                style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                placeholder="ex. Kiné"
                placeholderTextColor={C.muted}
                value={label}
                onChangeText={setLabel}
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
