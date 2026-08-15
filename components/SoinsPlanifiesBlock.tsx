import { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { isSlotFullyPast } from "@/lib/slotUtils";
import type { Theme } from "@/lib/themes";
import type { Reservation } from "@/lib/types";

// Bloc "Soins planifiés" — triés anté-chronologiquement par défaut (le plus
// récent/tardif en haut, le plus ancien tout en bas), sauf pour les soins à
// venir de (admin)/intervenants.tsx qui utilise chronological (le prochain
// soin en haut, voir plus bas). Extrait ici en composant autonome pour être
// réutilisé dans (admin)/intervenants.tsx et (visitor)/soins.tsx sans
// dupliquer la requête.
interface Props {
  // Optionnel quand filterIntervenantProfileIds est fourni (vue cross-space,
  // voir plus bas) — sinon requis (comportement historique, un seul espace).
  spaceId?: string;
  C: Theme;
  // Restreint la liste aux soins d'un seul intervenant — utilisé par
  // app/(visitor)/soins.tsx (bascule "Mes interventions"/"Tous"). Absent ou
  // null : tous les intervenants (comportement admin inchangé).
  filterIntervenantProfileId?: string | null;
  // Restreint aux soins de PLUSIEURS profils intervenant (un par espace,
  // même téléphone) au lieu d'un seul spaceId — utilisé par
  // app/(visitor)/home/mes-espaces-patients.tsx pour lister les
  // interventions d'un intervenant à travers tous ses espaces patients.
  // Remplace le filtre spaceId/filterIntervenantProfileId ci-dessus quand
  // fourni (spaceId devient alors inutile, voir la requête plus bas).
  filterIntervenantProfileIds?: string[];
  // Lieu du soin par space_id (voir lib/address.ts, careLocationDetail) —
  // affiché sous la date de chaque ligne quand fourni. Pertinent seulement en
  // vue cross-space (mes-espaces-patients.tsx) : dans un espace unique déjà
  // connu, répéter son lieu sur chaque ligne serait redondant.
  locationBySpaceId?: Record<string, string>;
  // Nom du patient par space_id — en vue cross-space, r.prenom/r.nom
  // désignent l'intervenant lui-même (identique sur toutes les lignes), pas
  // le patient : ce prop remplace alors ce libellé par le nom du patient
  // concerné, seule info vraiment distinctive d'une ligne à l'autre.
  patientNameBySpaceId?: Record<string, string>;
  // Remplace la navigation par défaut vers (admin)/home/slots (réservée à
  // l'admin) — voir app/(visitor)/soins.tsx. Le 2e argument (réservation
  // complète) sert à mes-espaces-patients.tsx pour distinguer plusieurs
  // soins d'espaces différents tombant sur la même date (ambigu avec la
  // seule date, contrairement au cas single-space historique).
  onPressRow?: (date: string, r: Reservation) => void;
  // Historique complet (passés ET à venir) plutôt que les seuls soins à
  // venir — utilisé par (admin)/intervenants.tsx (Paramètres > Planning des
  // intervenants), même comportement que Paramètres > Historique. Ajoute une
  // sous-section repliable "Autres soins réalisés" pour les soins passés,
  // sous la liste (sans sous-titre, on est déjà dans "Soins planifiés") des
  // soins qui restent à faire. Par défaut false : app/(visitor)/soins.tsx
  // (onglet "Mes soins" de l'intervenant) garde son comportement d'origine,
  // une seule liste tournée vers ce qui reste à faire.
  includePast?: boolean;
  // Affiche les soins à venir dans l'ordre chronologique (le plus proche en
  // premier) au lieu de l'ordre anté-chronologique par défaut ci-dessus —
  // utilisé par (admin)/intervenants.tsx (Planning des intervenants), où
  // l'admin veut voir en premier le prochain soin à venir. Les soins passés
  // (includePast) gardent l'ordre anté-chronologique (le plus récent en
  // haut) quel que soit ce réglage.
  chronological?: boolean;
}

function SoinRow({ r, isLast, C, onPress, patientName, location }: { r: Reservation; isLast: boolean; C: Theme; onPress: () => void; patientName?: string; location?: string }) {
  return (
    <TouchableOpacity
      style={[styles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: C.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: C.text }]}>
          {patientName ?? `${r.prenom} ${r.nom}`}{r.intervention_label ? ` — ${r.intervention_label}` : ""}
        </Text>
        <Text style={[styles.rowDate, { color: C.muted }]}>
          {new Date(r.date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} · {r.creneau}
        </Text>
        {!!location && (
          <Text style={[styles.rowLocation, { color: C.muted }]} numberOfLines={1}>📍 {location}</Text>
        )}
      </View>
      <Text style={[styles.rowChevron, { color: C.muted }]}>›</Text>
    </TouchableOpacity>
  );
}

export default function SoinsPlanifiesBlock({ spaceId, C, filterIntervenantProfileId, filterIntervenantProfileIds, locationBySpaceId, patientNameBySpaceId, onPressRow, includePast = false, chronological = false }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [soins, setSoins] = useState<Reservation[]>([]);
  const [pastOpen, setPastOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("reservations")
      .select("*")
      .eq("type", "Intervention");
    if (spaceId) query = query.eq("space_id", spaceId);
    if (filterIntervenantProfileIds && filterIntervenantProfileIds.length > 0) {
      query = query.in("intervenant_profile_id", filterIntervenantProfileIds);
    } else if (filterIntervenantProfileId) {
      query = query.eq("intervenant_profile_id", filterIntervenantProfileId);
    }
    const { data } = await query
      .order("date", { ascending: false })
      .order("creneau", { ascending: false });
    setSoins(data || []);
    setLoading(false);
  }, [spaceId, filterIntervenantProfileId, filterIntervenantProfileIds]);

  useEffect(() => { load(); }, [load]);

  function goTo(r: Reservation) {
    return onPressRow ? () => onPressRow(r.date, r) : () => router.push({ pathname: "/(admin)/home/slots", params: { focusDate: r.date } } as any);
  }

  const upcomingDesc = soins.filter((r) => !isSlotFullyPast(r.date, r.creneau));
  // soins est trié date/créneau descendant (voir la requête ci-dessus) :
  // reverse() suffit à obtenir l'ordre chronologique ascendant demandé,
  // sans requête ni tri supplémentaire.
  const upcoming = chronological ? [...upcomingDesc].reverse() : upcomingDesc;
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
            <SoinRow
              key={r.id}
              r={r}
              isLast={i === upcoming.length - 1}
              C={C}
              onPress={goTo(r)}
              patientName={patientNameBySpaceId?.[r.space_id]}
              location={locationBySpaceId?.[r.space_id]}
            />
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
                  <SoinRow
                    key={r.id}
                    r={r}
                    isLast={i === past.length - 1}
                    C={C}
                    onPress={goTo(r)}
                    patientName={patientNameBySpaceId?.[r.space_id]}
                    location={locationBySpaceId?.[r.space_id]}
                  />
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
  rowLocation: { fontFamily: "DM_Sans_400Regular", fontSize: 11.5, marginTop: 2 },
  rowChevron: { fontSize: 18, marginLeft: 8 },
  pastToggle: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  pastToggleText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, letterSpacing: 0.4, flex: 1 },
  toggleIcon: { fontSize: 14 },
});
