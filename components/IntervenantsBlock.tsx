import { useState, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { toFrShort } from "@/lib/slotUtils";
import type { Theme } from "@/lib/themes";

// Bloc "Intervenants" des Paramètres admin — juste après le bloc "Visiteurs"
// (voir components/VisitorsBlock.tsx, même pattern de carte repliable).
// Résumé en lecture seule de tout ce qui a été programmé par les intervenants
// (infirmier·ère, kiné, aide à domicile…) ; l'édition/suppression complète
// reste réservée à l'écran dédié (app/(admin)/intervenants.tsx).
interface InterventionRow {
  id: string;
  date: string;
  creneau: string;
  duration_minutes: number | null;
  intervention_label: string | null;
  prenom: string;
  nom: string;
}

interface Props {
  spaceId: string;
  C: Theme;
}

export default function IntervenantsBlock({ spaceId, C }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<InterventionRow[]>([]);
  // Replié par défaut, comme VisitorsBlock juste au-dessus.
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("reservations")
      .select("id, date, creneau, duration_minutes, intervention_label, prenom, nom")
      .eq("space_id", spaceId)
      .eq("type", "Intervention")
      .order("date", { ascending: false })
      .order("creneau", { ascending: false });

    if (error) console.error("[IntervenantsBlock] reservations select failed:", error);
    setRows(data || []);
    setLoading(false);
  }, [spaceId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <Text style={[styles.sectionTitle, { color: C.gold }]}>Intervenants</Text>
      <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
        <TouchableOpacity
          onPress={() => setExpanded((e) => !e)}
          activeOpacity={0.7}
          style={styles.headerRow}
        >
          <Text style={[styles.cardDesc, { color: C.muted, marginBottom: 0, flex: 1 }]}>
            Interventions programmées par les intervenants (infirmier·ère, kiné, aide à domicile…).
          </Text>
          <Text style={[styles.toggleIcon, { color: C.muted }]}>{expanded ? "▾" : "▸"}</Text>
        </TouchableOpacity>

        {expanded && (
          <View style={{ marginTop: 10 }}>
            {loading ? (
              <ActivityIndicator color={C.accent} style={{ marginVertical: 8 }} />
            ) : rows.length === 0 ? (
              <Text style={[styles.emptyText, { color: C.muted }]}>Aucune intervention programmée pour l'instant.</Text>
            ) : (
              rows.map((r, i) => (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.row, i < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
                  activeOpacity={0.7}
                  onPress={() => router.push({ pathname: "/(admin)/home/slots", params: { focusDate: r.date } } as any)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>
                      {r.intervention_label || "Intervention"} · {r.prenom} {r.nom}
                    </Text>
                    <Text style={[styles.dateText, { color: C.muted }]}>
                      {toFrShort(new Date(`${r.date}T00:00:00`))} à {r.creneau}
                      {r.duration_minutes ? ` · ${r.duration_minutes} min` : ""}
                    </Text>
                  </View>
                  <Text style={[styles.openIcon, { color: C.orange }]}>›</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontFamily: "DM_Sans_600SemiBold", fontSize: 11,
    letterSpacing: 1, textTransform: "uppercase",
    marginBottom: 10, marginTop: 20,
  },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 4 },
  cardDesc: { fontFamily: "DM_Sans_400Regular", fontSize: 13, lineHeight: 20, marginBottom: 10 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  toggleIcon: { fontSize: 14 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 },
  name: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  dateText: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },
  openIcon: { fontFamily: "DM_Sans_700Bold", fontSize: 18 },
});
