import { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import type { Theme } from "@/lib/themes";

// Popup "confirmer la durée" — 2ᵉ étape du flux d'ajout d'un soin (1ère
// étape : choix du nom via SoinPickerModal.tsx). Le nom est affiché en
// lecture seule ici : il vient d'être choisi juste avant, on ne le modifie
// pas à cette étape (contrairement à SoinFormModal.tsx qui, lui, permet de
// changer le nom d'un soin déjà existant).
interface Props {
  visible: boolean;
  label: string;
  initialMinutes?: number | null;
  saving?: boolean;
  C: Theme;
  onClose: () => void;
  onSave: (minutes: number) => void;
}

export default function SoinDurationModal({ visible, label, initialMinutes, saving = false, C, onClose, onSave }: Props) {
  const [duration, setDuration] = useState("");

  useEffect(() => {
    if (!visible) return;
    setDuration(initialMinutes ? String(initialMinutes) : "");
  }, [visible, initialMinutes]);

  const parsedDuration = parseInt(duration, 10);
  const canSave = Number.isFinite(parsedDuration) && parsedDuration > 0 && !saving;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.title, { color: C.text }]}>🩺 {label}</Text>
            <Text style={[styles.fieldLabel, { color: C.gold }]}>Durée habituelle (minutes)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
              placeholder="ex. 30"
              placeholderTextColor={C.muted}
              value={duration}
              onChangeText={(v) => setDuration(v.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
              autoFocus
            />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: C.accent }, !canSave && { opacity: 0.5 }]}
              onPress={() => canSave && onSave(parsedDuration)}
              disabled={!canSave}
              activeOpacity={0.85}
            >
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Enregistrer</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn} disabled={saving}>
              <Text style={[styles.cancelBtnText, { color: C.muted }]}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", maxWidth: 400, borderRadius: 20, borderWidth: 1, padding: 24 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 18, textAlign: "center" },
  fieldLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontFamily: "DM_Sans_400Regular", fontSize: 14 },
  saveBtn: { borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 20 },
  saveBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 15, color: "#fff" },
  cancelBtn: { alignItems: "center", marginTop: 14 },
  cancelBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});
