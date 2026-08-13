import { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { supabase } from "@/lib/supabase";
import PatientAvatar from "@/components/PatientAvatar";
import type { Theme } from "@/lib/themes";

// Popup admin (Paramètres > bloc Nuitées) — autorise les visiteurs à
// réserver des nuitées (type "Nuit"), "all" (tous, défaut — comportement
// historique) ou "some" (seuls ceux cochés ci-dessous). Même principe que
// NightIntervenantModal.tsx, mais sans identifiant de compte stable côté
// visiteur : la sélection se fait par prénom+nom (table à part
// night_authorized_visitors), et la liste des candidats vient des
// réservations + fiches visiteur existantes (comme VisitorsBlock.tsx, en
// plus léger : pas besoin de couvrir publications/souvenirs/entraide ici,
// seulement "qui a déjà réservé ou laissé une fiche").

interface VisitorRow {
  prenom: string;
  nom: string;
}

// Insensible aux accents en plus de la casse, même principe que
// VisitorsBlock.tsx.
function identityKey(prenom: string, nom: string) {
  const norm = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return `${norm(prenom)}|${norm(nom)}`;
}

type NightVisitorMode = "all" | "some";

interface Props {
  visible: boolean;
  onClose: () => void;
  spaceId: string;
  currentMode: NightVisitorMode;
  C: Theme;
  onSaved: (mode: NightVisitorMode) => void;
}

export default function NightVisitorModal({
  visible, onClose, spaceId, currentMode, C, onSaved,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<NightVisitorMode>(currentMode);
  const [visitors, setVisitors] = useState<VisitorRow[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const [resv, profiles, authorized] = await Promise.all([
      supabase.from("reservations").select("prenom,nom").eq("space_id", spaceId),
      supabase.from("visitor_profiles").select("prenom,nom").eq("space_id", spaceId),
      supabase.from("night_authorized_visitors").select("prenom,nom").eq("space_id", spaceId),
    ]);
    if (resv.error) console.error("[NightVisitorModal] reservations select failed:", resv.error);
    if (profiles.error) console.error("[NightVisitorModal] visitor_profiles select failed:", profiles.error);
    if (authorized.error) console.error("[NightVisitorModal] night_authorized_visitors select failed:", authorized.error);

    const byKey = new Map<string, VisitorRow>();
    function add(prenom?: string | null, nom?: string | null) {
      if (!prenom?.trim() || !nom?.trim()) return;
      const key = identityKey(prenom, nom);
      if (!byKey.has(key)) byKey.set(key, { prenom: prenom.trim(), nom: nom.trim() });
    }
    (resv.data || []).forEach((r) => add(r.prenom, r.nom));
    (profiles.data || []).forEach((p) => add(p.prenom, p.nom));
    (authorized.data || []).forEach((a) => add(a.prenom, a.nom));

    setVisitors(
      Array.from(byKey.values()).sort(
        (a, b) => a.nom.localeCompare(b.nom, "fr") || a.prenom.localeCompare(b.prenom, "fr")
      )
    );
    setSelectedKeys(new Set((authorized.data || []).map((a) => identityKey(a.prenom, a.nom))));
    setLoading(false);
  }, [spaceId]);

  useEffect(() => {
    if (visible) {
      setMode(currentMode);
      load();
    }
  }, [visible, currentMode, load]);

  function toggleSelected(v: VisitorRow) {
    const key = identityKey(v.prenom, v.nom);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    const { error: configError } = await supabase
      .from("slot_config")
      .update({ night_visitor_mode: mode })
      .eq("space_id", spaceId);
    if (configError) {
      console.error("[NightVisitorModal] slot_config update failed:", configError);
      setSaving(false);
      return;
    }

    if (mode === "some") {
      const selected = visitors.filter((v) => selectedKeys.has(identityKey(v.prenom, v.nom)));
      const { error: deleteError } = await supabase.from("night_authorized_visitors").delete().eq("space_id", spaceId);
      if (deleteError) console.error("[NightVisitorModal] night_authorized_visitors delete failed:", deleteError);
      if (selected.length > 0) {
        const { error: insertError } = await supabase
          .from("night_authorized_visitors")
          .insert(selected.map((v) => ({ space_id: spaceId, prenom: v.prenom, nom: v.nom })));
        if (insertError) console.error("[NightVisitorModal] night_authorized_visitors insert failed:", insertError);
      }
    }

    setSaving(false);
    onSaved(mode);
    onClose();
  }

  const canSave = mode !== "some" || selectedKeys.size > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.accent }]}>
          <Text style={[styles.title, { color: C.text }]}>Nuitées chez les visiteurs</Text>
          <Text style={[styles.desc, { color: C.muted }]}>
            Autorise tous les visiteurs, ou seulement certains, à réserver une nuitée.
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
              <Text style={[styles.optionLabel, { color: C.text }]}>Tous les visiteurs</Text>
              <Text style={[styles.optionDesc, { color: C.muted }]}>Comportement actuel, aucune restriction.</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.option, { borderColor: mode === "some" ? C.accent : C.border, backgroundColor: mode === "some" ? `${C.accent}18` : "transparent" }]}
            onPress={() => setMode("some")}
            activeOpacity={0.8}
          >
            <View style={[styles.radio, { borderColor: mode === "some" ? C.accent : C.muted }]}>
              {mode === "some" && <View style={[styles.radioDot, { backgroundColor: C.accent }]} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, { color: C.text }]}>Certains visiteurs seulement</Text>
              <Text style={[styles.optionDesc, { color: C.muted }]}>Coche-les ci-dessous.</Text>
            </View>
          </TouchableOpacity>

          {mode === "some" && (
            loading ? (
              <ActivityIndicator color={C.accent} style={{ marginVertical: 16 }} />
            ) : visitors.length === 0 ? (
              <Text style={[styles.emptyText, { color: C.muted }]}>Aucun visiteur enregistré pour l'instant.</Text>
            ) : (
              <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 4 }}>
                {visitors.map((v) => {
                  const key = identityKey(v.prenom, v.nom);
                  const selected = selectedKeys.has(key);
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[styles.row, { borderBottomColor: C.border }]}
                      onPress={() => toggleSelected(v)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.checkbox, { borderColor: selected ? C.accent : C.muted, backgroundColor: selected ? C.accent : "transparent" }]}>
                        {selected && <Text style={styles.checkboxMark}>✓</Text>}
                      </View>
                      <PatientAvatar photoUrl={null} firstname={v.prenom} lastname={v.nom} size={36} C={C} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.rowName, { color: C.text }]} numberOfLines={1}>{v.prenom} {v.nom}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )
          )}

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: C.accent }, (saving || !canSave) && { opacity: 0.6 }]}
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
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginVertical: 12 },

  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 12 },
  saveBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
  closeFooterBtn: { alignItems: "center", marginTop: 12 },
  closeFooterBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});
