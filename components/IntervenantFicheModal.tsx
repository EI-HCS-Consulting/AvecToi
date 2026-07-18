import { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Modal, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from "react-native";
import { supabase } from "@/lib/supabase";
import type { Theme } from "@/lib/themes";

interface TypeRow {
  // undefined tant que la ligne n'a jamais été sauvegardée (mode edit,
  // nouvelle ligne ajoutée) — sert à distinguer insert/update/delete au
  // moment d'enregistrer, sans avoir à tout recréer depuis zéro.
  id?: string;
  label: string;
  duration_minutes: string;
}

interface Props {
  visible: boolean;
  mode: "create" | "edit";
  spaceId: string;
  prenom: string;
  nom: string;
  pin: string;
  intervenantProfileId?: string | null;
  theme: Theme;
  // Uniquement en mode "edit" — le mode "create" est bloquant (première
  // connexion d'un intervenant, voir app/(visitor)/_layout.tsx).
  onClose?: () => void;
  // prenom/nom renvoyés tels qu'enregistrés dans intervenant_profiles —
  // l'appelant doit les répercuter sur la session locale (saveVisitorSession)
  // pour rester la source affichée ailleurs dans l'app (Mes informations,
  // matching des alertes RebookingAlertModal…).
  onSaved: (profileId: string, prenom: string, nom: string) => void;
}

// Fiche intervenant : liste ajoutable/supprimable de types d'intervention
// (label + durée), rattachée à intervenant_profiles. Utilisé en mode
// "create" (bloquant, première connexion) et "edit" (depuis Mon compte).
// Pas de FK reservations -> intervention_types (voir migration
// 20260722_reservations_intervention_columns.sql) : supprimer/recréer les
// types ici ne touche jamais les interventions déjà réservées, dont le
// libellé/durée est copié au moment de la réservation.
export default function IntervenantFicheModal({
  visible, mode, spaceId, prenom, nom, pin, intervenantProfileId, theme: C, onClose, onSaved,
}: Props) {
  const [ficheePrenom, setFichePrenom] = useState(prenom);
  const [ficheNom, setFicheNom] = useState(nom);
  const [rows, setRows] = useState<TypeRow[]>([{ label: "", duration_minutes: "" }]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setFichePrenom(prenom);
    setFicheNom(nom);
    if (mode === "create") {
      setRows([{ label: "", duration_minutes: "" }]);
      setRemovedIds([]);
      setLoading(false);
      return;
    }
    if (!intervenantProfileId) return;
    setLoading(true);
    supabase
      .from("intervention_types")
      .select("*")
      .eq("intervenant_profile_id", intervenantProfileId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setRows(
          (data && data.length > 0)
            ? data.map((t) => ({ id: t.id, label: t.label, duration_minutes: String(t.duration_minutes) }))
            : [{ label: "", duration_minutes: "" }],
        );
        setRemovedIds([]);
        setLoading(false);
      });
  }, [visible, mode, intervenantProfileId]);

  function updateRow(index: number, patch: Partial<TypeRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { label: "", duration_minutes: "" }]);
  }

  function removeRow(index: number) {
    setRows((prev) => {
      const row = prev[index];
      if (row.id) setRemovedIds((ids) => [...ids, row.id!]);
      return prev.filter((_, i) => i !== index);
    });
  }

  const validRows = rows
    .map((r) => ({ label: r.label.trim(), duration_minutes: parseInt(r.duration_minutes, 10) }))
    .filter((r) => r.label.length > 0 && Number.isFinite(r.duration_minutes) && r.duration_minutes > 0);
  const canSave = validRows.length > 0 && !!ficheePrenom.trim() && !!ficheNom.trim() && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const trimmedPrenom = ficheePrenom.trim();
      const trimmedNom = ficheNom.trim();
      let profileId = intervenantProfileId ?? null;

      if (!profileId) {
        const { data, error } = await supabase
          .from("intervenant_profiles")
          .insert({ space_id: spaceId, prenom: trimmedPrenom, nom: trimmedNom, pin })
          .select("id")
          .single();
        if (error || !data) throw error ?? new Error("Création de la fiche impossible.");
        profileId = data.id;
      } else if (trimmedPrenom !== prenom || trimmedNom !== nom) {
        const { error } = await supabase
          .from("intervenant_profiles")
          .update({ prenom: trimmedPrenom, nom: trimmedNom })
          .eq("id", profileId);
        if (error) throw error;
      }

      if (removedIds.length > 0) {
        await supabase.from("intervention_types").delete().in("id", removedIds);
      }

      const toInsert = rows.filter((r) => !r.id).map((r) => ({
        intervenant_profile_id: profileId,
        label: r.label.trim(),
        duration_minutes: parseInt(r.duration_minutes, 10),
      })).filter((r) => r.label.length > 0 && Number.isFinite(r.duration_minutes) && r.duration_minutes > 0);
      if (toInsert.length > 0) {
        await supabase.from("intervention_types").insert(toInsert);
      }

      const toUpdate = rows.filter((r) => r.id);
      for (const r of toUpdate) {
        const duration = parseInt(r.duration_minutes, 10);
        if (!r.label.trim() || !Number.isFinite(duration) || duration <= 0) continue;
        await supabase
          .from("intervention_types")
          .update({ label: r.label.trim(), duration_minutes: duration })
          .eq("id", r.id);
      }

      onSaved(profileId!, trimmedPrenom, trimmedNom);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible d'enregistrer la fiche intervenant.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.overlay, { flexGrow: 1, justifyContent: "center", paddingVertical: 16 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.title, { color: C.text }]}>🩺 Fiche intervenant</Text>
            <Text style={[styles.subtitle, { color: C.muted }]}>
              {mode === "create"
                ? "Confirme ton prénom et ton nom, puis indique les types d'intervention que tu peux réaliser, et leur durée habituelle. Tu pourras tout modifier plus tard."
                : "Modifie ton prénom, ton nom, ou tes types d'intervention et leur durée."}
            </Text>

            {loading ? (
              <ActivityIndicator color={C.accent} style={{ marginVertical: 24 }} />
            ) : (
              <>
                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, styles.labelInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                    placeholder="Prénom"
                    placeholderTextColor={C.muted}
                    value={ficheePrenom}
                    onChangeText={setFichePrenom}
                    autoCapitalize="words"
                  />
                  <TextInput
                    style={[styles.input, styles.labelInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                    placeholder="Nom"
                    placeholderTextColor={C.muted}
                    value={ficheNom}
                    onChangeText={setFicheNom}
                    autoCapitalize="words"
                  />
                </View>

                {rows.map((row, i) => (
                  <View key={row.id ?? `new-${i}`} style={styles.row}>
                    <TextInput
                      style={[styles.input, styles.labelInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                      placeholder="Type (ex. Kiné)"
                      placeholderTextColor={C.muted}
                      value={row.label}
                      onChangeText={(v) => updateRow(i, { label: v })}
                    />
                    <TextInput
                      style={[styles.input, styles.durationInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                      placeholder="Min"
                      placeholderTextColor={C.muted}
                      value={row.duration_minutes}
                      onChangeText={(v) => updateRow(i, { duration_minutes: v.replace(/[^0-9]/g, "") })}
                      keyboardType="number-pad"
                    />
                    <TouchableOpacity
                      onPress={() => removeRow(i)}
                      disabled={rows.length === 1}
                      style={[styles.removeBtn, rows.length === 1 && { opacity: 0.3 }]}
                    >
                      <Text style={{ color: C.danger, fontSize: 18 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity onPress={addRow} style={styles.addBtn}>
                  <Text style={[styles.addBtnText, { color: C.accent }]}>+ Ajouter un type</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: C.accent }, !canSave && { opacity: 0.5 }]}
                  onPress={handleSave}
                  disabled={!canSave}
                  activeOpacity={0.85}
                >
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Enregistrer</Text>}
                </TouchableOpacity>

                {mode === "edit" && onClose && (
                  <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                    <Text style={[styles.cancelBtnText, { color: C.muted }]}>Annuler</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
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
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "DM_Sans_400Regular",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 11,
    fontFamily: "DM_Sans_400Regular",
    fontSize: 14,
  },
  labelInput: { flex: 2 },
  durationInput: { flex: 1, textAlign: "center" },
  removeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: {
    alignSelf: "flex-start",
    marginBottom: 20,
    marginTop: 4,
  },
  addBtnText: {
    fontFamily: "DM_Sans_600SemiBold",
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
  cancelBtn: {
    alignItems: "center",
    marginTop: 14,
  },
  cancelBtnText: {
    fontFamily: "DM_Sans_600SemiBold",
    fontSize: 14,
  },
});
