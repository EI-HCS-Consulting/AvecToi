import { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { isSlotFullyPast } from "@/lib/slotUtils";
import type { Theme } from "@/lib/themes";
import type { Reservation } from "@/lib/types";

// Bloc "Soins planifiés" — triés anté-chronologiquement (le plus récent/
// tardif en haut, le plus ancien tout en bas). Extrait ici en composant
// autonome pour être réutilisé dans (admin)/intervenants.tsx et
// (visitor)/soins.tsx sans dupliquer la requête.
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
  // Historique complet (passés ET à venir) plutôt que les seuls soins à
  // venir — utilisé par (admin)/intervenants.tsx (Paramètres > Planning des
  // intervenants), même comportement que Paramètres > Historique. Ajoute une
  // sous-section repliable "Autres soins réalisés" pour les soins passés,
  // sous la liste (sans sous-titre, on est déjà dans "Soins planifiés") des
  // soins qui restent à faire. Par défaut false : app/(visitor)/soins.tsx
  // (onglet "Mes soins" de l'intervenant) garde son comportement d'origine,
  // une seule liste tournée vers ce qui reste à faire.
  includePast?: boolean;
}

function SoinRow({ r, isLast, C, onPress }: { r: Reservation; isLast: boolean; C: Theme; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: C.border }]}
      onPress={onPress}
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
  );
}

export default function SoinsPlanifiesBlock({ spaceId, C, filterIntervenantProfileId, onPressRow, includePast = false }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [soins, setSoins] = useState<Reservation[]>([]);
  const [pastOpen, setPastOpen] = useState(false);

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
    setSoins(data || []);
    setLoading(false);
  }, [spaceId, filterIntervenantProfileId]);

  useEffect(() => { load(); }, [load]);

  function goTo(r: Reservation) {
    return onPressRow ? () => onPressRow(r.date) : () => router.push({ pathname: "/(admin)/home/slots", params: { focusDate: r.date } } as any);
  }

  const upcoming = soins.filter((r) => !isSlotFullyPast(r.date, r.creneau));
  const past = includePast ? soins.filter((r) => isSlotFullyPast(r.date, r.creneau)) : [];

  return (
    <>
      <Text style={[styles.sectionTitle, { color: C.gold }]}>
        Soins planifiés{upcoming.length > 0 ? ` (${upcoming.length})` : ""}
      </Text>
      <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
        {loading ? (
          <ActivityIndicator color={C.accent} style={{ marginVertical: 8 }} />
        ) : upcoming.length === 0 ? (
          <Text style={[styles.emptyText, { color: C.muted }]}>Aucun soin planifié.</Text>
        ) : (
          upcoming.map((r, i) => (
            <SoinRow key={r.id} r={r} isLast={i === upcoming.length - 1} C={C} onPress={goTo(r)} />
          ))
        )}
      </View>

      {includePast && !loading && (
        <View style={{ marginBottom: 10 }}>
          <TouchableOpacity onPress={() => setPastOpen((o) => !o)} activeOpacity={0.7} style={styles.pastToggle}>
            <Text style={[styles.pastToggleText, { color: C.muted }]}>
              Autres soins réalisés{past.length > 0 ? ` (${past.length})` : ""}
            </Text>
            <Text style={[styles.toggleIcon, { color: C.muted }]}>{pastOpen ? "▾" : "▸"}</Text>
          </TouchableOpacity>

          {pastOpen && (
            <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border, marginTop: 8 }]}>
              {past.length === 0 ? (
                <Text style={[styles.emptyText, { color: C.muted }]}>Aucun soin réalisé.</Text>
              ) : (
                past.map((r, i) => (
                  <SoinRow key={r.id} r={r} isLast={i === past.length - 1} C={C} onPress={goTo(r)} />
                ))
              )}
            </View>
          )}
        </View>
      )}
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
  pastToggle: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  pastToggleText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, letterSpacing: 0.4, flex: 1 },
  toggleIcon: { fontSize: 14 },
});
