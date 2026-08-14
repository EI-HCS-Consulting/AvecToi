import { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { supabase } from "@/lib/supabase";
import PatientAvatar from "@/components/PatientAvatar";
import { metierLabel } from "@/lib/metiers";
import type { Theme } from "@/lib/themes";

// Popup admin (Paramètres > bloc Planning des intervenants) — autorise un ou
// plusieurs intervenants à publier, sur l'onglet "Nouvelles", des messages
// visibles aussi par les visiteurs (au lieu de rester dans le canal privé
// intervenants+admin) : "disabled" (défaut, aucun intervenant), "some"
// (seuls ceux cochés ci-dessous, via news_authorized_intervenants) ou "all"
// (tous). Même principe que NightIntervenantModal.tsx.

interface IntervenantRow {
  id: string;
  prenom: string;
  nom: string;
  photo: string | null;
  photo_updated_at: string | null;
  metier: string | null;
}

function intervenantPhotoUrl(filename: string, updatedAt?: string | null) {
  const { data } = supabase.storage.from("intervenant-photos").getPublicUrl(filename);
  return updatedAt ? `${data.publicUrl}?v=${new Date(updatedAt).getTime()}` : data.publicUrl;
}

type NewsIntervenantMode = "disabled" | "some" | "all";

interface Props {
  visible: boolean;
  onClose: () => void;
  spaceId: string;
  currentMode: NewsIntervenantMode;
  C: Theme;
  onSaved: (mode: NewsIntervenantMode) => void;
}

export default function NewsIntervenantModal({
  visible, onClose, spaceId, currentMode, C, onSaved,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<NewsIntervenantMode>(currentMode);
  const [intervenants, setIntervenants] = useState<IntervenantRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [profiles, authorized] = await Promise.all([
      supabase.from("intervenant_profiles").select("id, prenom, nom, photo, photo_updated_at, metier").eq("space_id", spaceId).order("prenom", { ascending: true }),
      supabase.from("news_authorized_intervenants").select("intervenant_profile_id").eq("space_id", spaceId),
    ]);
    if (profiles.error) console.error("[NewsIntervenantModal] intervenant_profiles select failed:", profiles.error);
    if (authorized.error) console.error("[NewsIntervenantModal] news_authorized_intervenants select failed:", authorized.error);
    setIntervenants(profiles.data || []);
    setSelectedIds(new Set((authorized.data || []).map((a) => a.intervenant_profile_id)));
    setLoading(false);
  }, [spaceId]);

  useEffect(() => {
    if (visible) {
      setMode(currentMode);
      load();
    }
  }, [visible, currentMode, load]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // Cocher un intervenant bascule directement en mode "some" — la liste
    // est toujours visible (cf. plus bas), inutile de forcer un choix de
    // mode avant de pouvoir cocher quelqu'un.
    setMode("some");
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    const { error: configError } = await supabase
      .from("slot_config")
      .update({ news_intervenant_mode: mode })
      .eq("space_id", spaceId);
    if (configError) {
      console.error("[NewsIntervenantModal] slot_config update failed:", configError);
      setSaveError(configError.message);
      setSaving(false);
      return;
    }

    if (mode === "some") {
      const { error: deleteError } = await supabase.from("news_authorized_intervenants").delete().eq("space_id", spaceId);
      if (deleteError) {
        console.error("[NewsIntervenantModal] news_authorized_intervenants delete failed:", deleteError);
        setSaveError(deleteError.message);
        setSaving(false);
        return;
      }
      if (selectedIds.size > 0) {
        const { error: insertError } = await supabase
          .from("news_authorized_intervenants")
          .insert(Array.from(selectedIds).map((id) => ({ space_id: spaceId, intervenant_profile_id: id })));
        if (insertError) {
          console.error("[NewsIntervenantModal] news_authorized_intervenants insert failed:", insertError);
          setSaveError(insertError.message);
          setSaving(false);
          return;
        }
      }
    }

    setSaving(false);
    onSaved(mode);
    onClose();
  }

  const canSave = mode !== "some" || selectedIds.size > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.orange }]}>
          <Text style={[styles.title, { color: C.text }]}>Publications Nouvelles des intervenants</Text>
          <Text style={[styles.desc, { color: C.muted }]}>
            Autorise tous les intervenants, ou seulement certains, à publier sur l'onglet "Nouvelles" des messages visibles aussi par les visiteurs. Les autres restent dans le canal privé intervenants + admin.
          </Text>

          <TouchableOpacity
            style={[styles.option, { borderColor: mode === "disabled" ? C.orange : C.border, backgroundColor: mode === "disabled" ? `${C.orange}18` : "transparent" }]}
            onPress={() => setMode("disabled")}
            activeOpacity={0.8}
          >
            <View style={[styles.radio, { borderColor: mode === "disabled" ? C.orange : C.muted }]}>
              {mode === "disabled" && <View style={[styles.radioDot, { backgroundColor: C.orange }]} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, { color: C.text }]}>Désactivé</Text>
              <Text style={[styles.optionDesc, { color: C.muted }]}>Aucun intervenant ne peut publier pour les visiteurs — canal privé intervenants + admin uniquement.</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.option, { borderColor: mode === "all" ? C.orange : C.border, backgroundColor: mode === "all" ? `${C.orange}18` : "transparent" }]}
            onPress={() => setMode("all")}
            activeOpacity={0.8}
          >
            <View style={[styles.radio, { borderColor: mode === "all" ? C.orange : C.muted }]}>
              {mode === "all" && <View style={[styles.radioDot, { backgroundColor: C.orange }]} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, { color: C.text }]}>Tous les intervenants</Text>
              <Text style={[styles.optionDesc, { color: C.muted }]}>Chaque intervenant peut publier pour les visiteurs.</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.option, { borderColor: mode === "some" ? C.orange : C.border, backgroundColor: mode === "some" ? `${C.orange}18` : "transparent" }]}
            onPress={() => setMode("some")}
            activeOpacity={0.8}
          >
            <View style={[styles.radio, { borderColor: mode === "some" ? C.orange : C.muted }]}>
              {mode === "some" && <View style={[styles.radioDot, { backgroundColor: C.orange }]} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, { color: C.text }]}>Certains intervenants seulement</Text>
              <Text style={[styles.optionDesc, { color: C.muted }]}>Coche-les ci-dessous — plusieurs choix possibles.</Text>
            </View>
          </TouchableOpacity>

          {loading ? (
            <ActivityIndicator color={C.orange} style={{ marginVertical: 16 }} />
          ) : intervenants.length === 0 ? (
            <Text style={[styles.emptyText, { color: C.muted }]}>Aucun intervenant enregistré pour l'instant.</Text>
          ) : (
            <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 4 }}>
              {intervenants.map((it) => {
                const selected = selectedIds.has(it.id);
                return (
                  <TouchableOpacity
                    key={it.id}
                    style={[styles.row, { borderBottomColor: C.border }]}
                    onPress={() => toggleSelected(it.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.checkbox, { borderColor: selected ? C.orange : C.muted, backgroundColor: selected ? C.orange : "transparent" }]}>
                      {selected && <Text style={styles.checkboxMark}>✓</Text>}
                    </View>
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
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {!!saveError && (
            <Text style={[styles.errorText, { color: C.danger }]}>Échec de l'enregistrement : {saveError}</Text>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: C.orange }, (saving || !canSave) && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving || !canSave}
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

  list: { maxHeight: 220, marginTop: -2, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingLeft: 4, borderBottomWidth: 1 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  checkboxMark: { color: "#fff", fontSize: 12, fontFamily: "DM_Sans_700Bold" },
  rowName: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  rowMetier: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 1 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginVertical: 12 },
  errorText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginTop: 10 },

  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 12 },
  saveBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
  closeFooterBtn: { alignItems: "center", marginTop: 12 },
  closeFooterBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});
