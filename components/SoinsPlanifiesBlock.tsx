import { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { isSlotFullyPast } from "@/lib/slotUtils";
import type { Theme } from "@/lib/themes";
import type { Reservation } from "@/lib/types";

// Bloc "Soins planifiés" — même donnée/tri que le "Bloc 3bis" de
// (admin)/settings.tsx (Historique > Soins planifiés) : toutes les
// interventions à venir, tous intervenants confondus, triées du plus
// tardif (haut) au plus proche (bas). Extrait ici en composant autonome
// pour être réutilisé dans (admin)/intervenants.tsx sans dupliquer une
// 3e fois la requête — settings.tsx garde sa propre copie inline
// (accordéon Historique) inchangée.
interface Props {
  spaceId: string;
  C: Theme;
  // Restreint la liste aux soins d'un seul intervenant — utilisé par
  // app/(visitor)/soins.tsx (bascule "Mes interventions"/"Tous"). Absent ou
  // null : tous les intervenants (comportement admin inchangé).
  filterIntervenantProfileId?: string | null;
  // Remplace la navigation par défaut vers (admin)/home/slots (réservée à
  // l'admin) — voir app/(visitor)/soins.tsx.
  onPressRow?: (date: string) => void;
}

export default function SoinsPlanifiesBlock({ spaceId, C, filterIntervenantProfileId, onPressRow }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [soins, setSoins] = useState<Reservation[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("reservations")
      .select("*")
      .eq("space_id", spaceId)
      .eq("type", "Intervention");
    if (filterIntervenantProfileId) {
      query = query.eq("intervenant_profile_id", filterIntervenantProfileId);
    }
    const { data } = await query
      .order("date", { ascending: false })
      .order("creneau", { ascending: false });
    setSoins((data || []).filter((r) => !isSlotFullyPast(r.date, r.creneau)));
    setLoading(false);
  }, [spaceId, filterIntervenantProfileId]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <Text style={[styles.sectionTitle, { color: C.gold }]}>
        Soins planifiés{soins.length > 0 ? ` (${soins.length})` : ""}
      </Text>
      <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
        {loading ? (
          <ActivityIndicator color={C.accent} style={{ marginVertical: 8 }} />
        ) : soins.length === 0 ? (
          <Text style={[styles.emptyText, { color: C.muted }]}>Aucun soin planifié.</Text>
        ) : (
          soins.map((r, i) => (
            <TouchableOpacity
              key={r.id}
              style={[styles.row, i < soins.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
              onPress={() => (onPressRow ? onPressRow(r.date) : router.push({ pathname: "/(admin)/home/slots", params: { focusDate: r.date } } as any))}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: C.text }]}>
                  {r.prenom} {r.nom}{r.intervention_label ? ` — ${r.intervention_label}` : ""}
                </Text>
                <Text style={[styles.rowDate, { color: C.muted }]}>
                  {new Date(r.date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} · {r.creneau}
                </Text>
              </View>
              <Text style={[styles.rowChevron, { color: C.muted }]}>›</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10, marginTop: 24 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  rowLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14, marginBottom: 2 },
  rowDate: { fontFamily: "DM_Sans_400Regular", fontSize: 12 },
  rowChevron: { fontSize: 18, marginLeft: 8 },
});
