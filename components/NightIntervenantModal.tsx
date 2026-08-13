import { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { supabase } from "@/lib/supabase";
import PatientAvatar from "@/components/PatientAvatar";
import { metierLabel } from "@/lib/metiers";
import type { Theme } from "@/lib/themes";

// Popup admin (Paramètres > bloc Intervenants) — autorise les intervenants à
// réserver des nuitées (type "Nuit"), désactivé par défaut : "disabled"
// (comportement historique, aucun intervenant ne voit le bouton Réserver sur
// (visitor)/home/nights.tsx), "one" (un seul intervenant désigné ici) ou
// "all" (tous). Même principe que IntervenantPriorityModal.tsx : écrit
// directement dans slot_config, pas de passage par apply_slot_rule_change ni
// de suivi dans slot_config_history (réglage live).

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

type NightIntervenantMode = "disabled" | "one" | "all";

interface Props {
  visible: boolean;
  onClose: () => void;
  spaceId: string;
  currentMode: NightIntervenantMode;
  currentProfileId: string | null;
  C: Theme;
  onSaved: (mode: NightIntervenantMode, profileId: string | null) => void;
}

export default function NightIntervenantModal({
  visible, onClose, spaceId, currentMode, currentProfileId, C, onSaved,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<NightIntervenantMode>(currentMode);
  const [selectedId, setSelectedId] = useState<string | null>(currentProfileId);
  const [intervenants, setIntervenants] = useState<IntervenantRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("intervenant_profiles")
      .select("id, prenom, nom, photo, photo_updated_at, metier")
      .eq("space_id", spaceId)
      .order("prenom", { ascending: true });
    if (error) console.error("[NightIntervenantModal] intervenant_profiles select failed:", error);
    setIntervenants(data || []);
    setLoading(false);
  }, [spaceId]);

  useEffect(() => {
    if (visible) {
      setMode(currentMode);
      setSelectedId(currentProfileId);
      load();
    }
  }, [visible, currentMode, currentProfileId, load]);

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase
      .from("slot_config")
      .update({
        night_intervenant_mode: mode,
        night_intervenant_profile_id: mode === "one" ? selectedId : null,
      })
      .eq("space_id", spaceId);
    setSaving(false);
    if (error) {
      console.error("[NightIntervenantModal] save failed:", error);
      return;
    }
    onSaved(mode, mode === "one" ? selectedId : null);
    onClose();
  }

  const canSave = mode !== "one" || !!selectedId;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.orange }]}>
          <Text style={[styles.title, { color: C.text }]}>Nuitées chez les intervenants</Text>
          <Text style={[styles.desc, { color: C.muted }]}>
            Autorise un ou plusieurs intervenants à réserver des nuitées. Tant qu'aucun choix n'est fait, le bouton
            "Réserver" reste invisible côté intervenant.
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
              <Text style={[styles.optionDesc, { color: C.muted }]}>Aucun intervenant ne peut réserver de nuitée.</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.option, { borderColor: mode === "one" ? C.orange : C.border, backgroundColor: mode === "one" ? `${C.orange}18` : "transparent" }]}
            onPress={() => setMode("one")}
            activeOpacity={0.8}
          >
            <View style={[styles.radio, { borderColor: mode === "one" ? C.orange : C.muted }]}>
              {mode === "one" && <View style={[styles.radioDot, { backgroundColor: C.orange }]} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, { color: C.text }]}>Un seul intervenant</Text>
              <Text style={[styles.optionDesc, { color: C.muted }]}>Choisis-le ci-dessous.</Text>
            </View>
          </TouchableOpacity>

          {loading ? (
            <ActivityIndicator color={C.orange} style={{ marginVertical: 16 }} />
          ) : intervenants.length === 0 ? (
            <Text style={[styles.emptyText, { color: C.muted }]}>Aucun intervenant enregistré pour l'instant.</Text>
          ) : (
            <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 4 }}>
              {intervenants.map((it) => {
                const selected = it.id === selectedId;
                return (
                  <TouchableOpacity
                    key={it.id}
                    style={[styles.row, { borderBottomColor: C.border }]}
                    onPress={() => {
                      setSelectedId(it.id);
                      // Choisir quelqu'un dans la liste bascule directement en
                      // mode "one" — la liste est toujours visible (voir
                      // plus haut), inutile de forcer le choix du mode avant.
                      setMode("one");
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.radio, { borderColor: selected ? C.orange : C.muted }]}>
                      {selected && <View style={[styles.radioDot, { backgroundColor: C.orange }]} />}
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
              <Text style={[styles.optionDesc, { color: C.muted }]}>Chaque intervenant peut réserver une nuitée.</Text>
            </View>
          </TouchableOpacity>

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
  rowName: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  rowMetier: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 1 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginVertical: 12 },

  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 12 },
  saveBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
  closeFooterBtn: { alignItems: "center", marginTop: 12 },
  closeFooterBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});
