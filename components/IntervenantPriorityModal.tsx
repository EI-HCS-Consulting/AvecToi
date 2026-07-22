import { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet, ActivityIndicator, Switch } from "react-native";
import { supabase } from "@/lib/supabase";
import PatientAvatar from "@/components/PatientAvatar";
import { metierLabel } from "@/lib/metiers";
import type { Theme } from "@/lib/themes";

// Popup dédié "Règles de visite" > bloc Intervenants — permet à l'admin de
// choisir si TOUS les créneaux intervenants sont prioritaires sur les
// visites (comportement historique, slot_config.intervenant_priority_mode =
// 'all'), ou seulement ceux des intervenants cochés individuellement
// (intervenant_profiles.priority_slots) — voir check_slot_capacity() et
// book_intervention() côté serveur (migration 20260722).
//
// Écrit directement en base (pas de passage par apply_slot_rule_change) :
// changer ce réglage ne modifie ni ne recase aucune réservation existante,
// il ne fait que changer le comportement des prochaines demandes de créneau
// — aucune des logiques structurelles gérées par cette RPC (recasage,
// nuitées, plafond jour) ne s'applique ici.

interface IntervenantRow {
  id: string;
  prenom: string;
  nom: string;
  photo: string | null;
  photo_updated_at: string | null;
  metier: string | null;
  priority_slots: boolean;
}

function intervenantPhotoUrl(filename: string, updatedAt?: string | null) {
  const { data } = supabase.storage.from("intervenant-photos").getPublicUrl(filename);
  return updatedAt ? `${data.publicUrl}?v=${new Date(updatedAt).getTime()}` : data.publicUrl;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  spaceId: string;
  currentMode: "all" | "selected";
  C: Theme;
  onSaved: (mode: "all" | "selected") => void;
}

export default function IntervenantPriorityModal({ visible, onClose, spaceId, currentMode, C, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"all" | "selected">(currentMode);
  const [intervenants, setIntervenants] = useState<IntervenantRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("intervenant_profiles")
      .select("id, prenom, nom, photo, photo_updated_at, metier, priority_slots")
      .eq("space_id", spaceId)
      .order("prenom", { ascending: true });
    if (error) console.error("[IntervenantPriorityModal] intervenant_profiles select failed:", error);
    setIntervenants(data || []);
    setLoading(false);
  }, [spaceId]);

  useEffect(() => {
    if (visible) {
      setMode(currentMode);
      load();
    }
  }, [visible, currentMode, load]);

  function toggleIntervenant(id: string) {
    setIntervenants((list) => list.map((it) => (it.id === id ? { ...it, priority_slots: !it.priority_slots } : it)));
  }

  async function handleSave() {
    setSaving(true);
    const { error: configError } = await supabase
      .from("slot_config")
      .update({ intervenant_priority_mode: mode })
      .eq("space_id", spaceId);

    let profilesError = null;
    if (mode === "selected") {
      const results = await Promise.all(
        intervenants.map((it) =>
          supabase.from("intervenant_profiles").update({ priority_slots: it.priority_slots }).eq("id", it.id),
        ),
      );
      profilesError = results.find((r) => r.error)?.error ?? null;
    }

    setSaving(false);
    if (configError || profilesError) {
      console.error("[IntervenantPriorityModal] save failed:", configError || profilesError);
      return;
    }
    onSaved(mode);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.accent }]}>
          <Text style={[styles.title, { color: C.text }]}>Priorité des créneaux intervenants</Text>
          <Text style={[styles.desc, { color: C.muted }]}>
            Quand un créneau intervention chevauche des visites déjà réservées, ces visites sont automatiquement
            recasées si l'intervention est prioritaire.
          </Text>

          <TouchableOpacity
            style={[styles.option, { borderColor: mode === "all" ? C.accent : C.border, backgroundColor: mode === "all" ? `${C.accent}18` : "transparent" }]}
            onPress={() => setMode("all")}
            activeOpacity={0.8}
          >
            <View style={[styles.radio, { borderColor: mode === "all" ? C.accent : C.muted }]}>
              {mode === "all" && <View style={[styles.radioDot, { backgroundColor: C.accent }]} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, { color: C.text }]}>Tous les intervenants</Text>
              <Text style={[styles.optionDesc, { color: C.muted }]}>Comportement actuel : chaque intervention est prioritaire sur les visites.</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.option, { borderColor: mode === "selected" ? C.accent : C.border, backgroundColor: mode === "selected" ? `${C.accent}18` : "transparent" }]}
            onPress={() => setMode("selected")}
            activeOpacity={0.8}
          >
            <View style={[styles.radio, { borderColor: mode === "selected" ? C.accent : C.muted }]}>
              {mode === "selected" && <View style={[styles.radioDot, { backgroundColor: C.accent }]} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, { color: C.text }]}>Seulement certains intervenants</Text>
              <Text style={[styles.optionDesc, { color: C.muted }]}>Choisis ci-dessous lesquels sont prioritaires — les autres coexistent avec les visites.</Text>
            </View>
          </TouchableOpacity>

          {mode === "selected" && (
            loading ? (
              <ActivityIndicator color={C.accent} style={{ marginVertical: 20 }} />
            ) : intervenants.length === 0 ? (
              <Text style={[styles.emptyText, { color: C.muted }]}>Aucun intervenant enregistré pour l'instant.</Text>
            ) : (
              <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 4 }}>
                {intervenants.map((it) => (
                  <View key={it.id} style={[styles.row, { borderBottomColor: C.border }]}>
                    <PatientAvatar
                      photoUrl={it.photo ? intervenantPhotoUrl(it.photo, it.photo_updated_at) : null}
                      firstname={it.prenom}
                      lastname={it.nom}
                      size={36}
                      C={C}
                      metier={it.metier}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowName, { color: C.text }]} numberOfLines={1}>{it.prenom} {it.nom}</Text>
                      {!!it.metier && <Text style={[styles.rowMetier, { color: C.muted }]} numberOfLines={1}>{metierLabel(it.metier)}</Text>}
                    </View>
                    <Switch
                      value={it.priority_slots}
                      onValueChange={() => toggleIntervenant(it.id)}
                      trackColor={{ false: C.border, true: C.accent }}
                      thumbColor="#fff"
                    />
                  </View>
                ))}
              </ScrollView>
            )
          )}

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: C.accent }, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Enregistrer</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.closeFooterBtn}>
            <Text style={[styles.closeFooterBtnText, { color: C.muted }]}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", maxWidth: 440, maxHeight: "88%", borderRadius: 20, borderWidth: 1, padding: 24 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 6 },
  desc: { fontFamily: "DM_Sans_400Regular", fontSize: 13, lineHeight: 19, marginBottom: 16 },

  option: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  optionLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  optionDesc: { fontFamily: "DM_Sans_400Regular", fontSize: 12, lineHeight: 17, marginTop: 2 },

  list: { maxHeight: 260, marginTop: 4, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  rowName: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  rowMetier: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 1 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginVertical: 12 },

  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 12 },
  saveBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
  closeFooterBtn: { alignItems: "center", marginTop: 12 },
  closeFooterBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});
