import { useState, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { supabase } from "@/lib/supabase";
import SoinAvatar from "@/components/SoinAvatar";
import SoinFormModal from "@/components/SoinFormModal";
import type { InterventionType } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// "MES SOINS" — même présentation que IntervenantsList.tsx (bouton par
// ligne, icône ronde à la place de l'avatar) mais pour les soins que propose
// CET intervenant (intervention_types) : ouvre SoinFormModal pour modifier,
// enregistrer ou supprimer. Voir app/(visitor)/soins.tsx.
interface Props {
  intervenantProfileId: string;
  C: Theme;
}

export default function MesSoinsList({ intervenantProfileId, C }: Props) {
  const [loading, setLoading] = useState(true);
  const [soins, setSoins] = useState<InterventionType[]>([]);
  const [formTarget, setFormTarget] = useState<InterventionType | null | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("intervention_types")
      .select("*")
      .eq("intervenant_profile_id", intervenantProfileId)
      .order("created_at", { ascending: true });

    if (error) console.error("[MesSoinsList] intervention_types select failed:", error);
    setSoins(data || []);
    setLoading(false);
  }, [intervenantProfileId]);

  useEffect(() => {
    load();
  }, [load]);

  function closeForm() {
    setFormTarget(undefined);
  }

  return (
    <>
      {loading ? (
        <ActivityIndicator color={C.accent} style={{ marginVertical: 32 }} />
      ) : (
        <View style={styles.scroll}>
          {soins.length === 0 ? (
            <Text style={[styles.emptyText, { color: C.muted }]}>Aucun soin enregistré pour l'instant.</Text>
          ) : (
            soins.map((s, i) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.row, i < soins.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
                onPress={() => setFormTarget(s)}
                activeOpacity={0.7}
              >
                <SoinAvatar label={s.label} size={44} C={C} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>{s.label}</Text>
                  <Text style={[styles.duration, { color: C.muted }]}>{s.duration_minutes} min</Text>
                </View>
                <Text style={[styles.chevron, { color: C.muted }]}>›</Text>
              </TouchableOpacity>
            ))
          )}

          <TouchableOpacity style={styles.addBtn} onPress={() => setFormTarget(null)}>
            <Text style={[styles.addBtnText, { color: C.accent }]}>+ Ajouter un soin</Text>
          </TouchableOpacity>
        </View>
      )}

      <SoinFormModal
        visible={formTarget !== undefined}
        intervenantProfileId={intervenantProfileId}
        soin={formTarget ?? null}
        C={C}
        onClose={closeForm}
        onSaved={async () => { closeForm(); await load(); }}
        onDeleted={async () => { closeForm(); await load(); }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 4 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  name: { fontFamily: "DM_Sans_600SemiBold", fontSize: 15 },
  duration: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },
  chevron: { fontFamily: "DM_Sans_700Bold", fontSize: 16 },
  addBtn: { alignSelf: "flex-start", marginTop: 8 },
  addBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});
