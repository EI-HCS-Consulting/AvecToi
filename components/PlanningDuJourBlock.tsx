import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { toISO } from "@/lib/slotUtils";
import type { Theme } from "@/lib/themes";
import type { Reservation } from "@/lib/types";

// Bloc "Planning du jour" de l'onglet Planning intervenant (soins.tsx) —
// affiche les soins d'UN seul jour : aujourd'hui par défaut, ou le dernier
// jour tapé sur IntervenantGlobalCalendar (voir selectedIso dans soins.tsx).
// Les soins des autres jours restent dans la rubrique "Planning
// mensuel/hebdo" (SoinsPeriodBlock) juste en dessous, qui exclut ce jour-là
// pour ne pas le lister deux fois.
interface Props {
  C: Theme;
  iso: string;
  reservations: Reservation[];
  patientNameBySpaceId: Record<string, string>;
  locationBySpaceId: Record<string, string>;
  onSoinPress: (r: Reservation) => void;
  // Bouton "Autres intervenants" affiché sur la même ligne que le titre —
  // inclut, quand actif, les soins des autres intervenants (mêmes espaces
  // patients) dans ce bloc ET dans "Planning mensuel/hebdo" juste en dessous
  // (voir soins.tsx, plannedReservations). Absent : pas de bouton (usages
  // hors onglet Planning intervenant, s'il y en a un jour).
  showOtherIntervenants?: boolean;
  onToggleOtherIntervenants?: () => void;
  // Libellé de repli quand r.intervention_label est vide — "Intervention" par
  // défaut (comportement historique). Passer "Visite" pour le planning des
  // visites (home/calendar.tsx, mode Visites), où intervention_label n'est
  // jamais renseigné.
  reservationType?: "Intervention" | "Visite";
  // Accompagnants d'une réservation, indexés par son id (voir
  // home/calendar.tsx, companionsByMainId) — affichés sous le nom du
  // réservant principal. Absent : rien n'est affiché (usages hors visites).
  companionsById?: Record<string, Reservation[]>;
}

export default function PlanningDuJourBlock({ C, iso, reservations, patientNameBySpaceId, locationBySpaceId, onSoinPress, showOtherIntervenants, onToggleOtherIntervenants, reservationType = "Intervention", companionsById }: Props) {
  const isToday = iso === toISO(new Date());
  const dayDate = new Date(iso + "T00:00:00");
  const sorted = [...reservations].sort((a, b) => a.creneau.localeCompare(b.creneau));

  return (
    <>
      <View style={styles.titleRow}>
        <Text style={[styles.sectionTitle, { color: C.gold, marginBottom: 0 }]}>Planning du jour</Text>
        {onToggleOtherIntervenants && (
          <TouchableOpacity
            onPress={onToggleOtherIntervenants}
            activeOpacity={0.75}
            style={[
              styles.otherToggle,
              {
                backgroundColor: showOtherIntervenants ? C.gold : "transparent",
                borderColor: C.gold,
              },
            ]}
          >
            <Text style={[styles.otherToggleText, { color: showOtherIntervenants ? "#fff" : C.gold }]}>
              👥 Autres intervenants
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
        <Text style={[styles.dayTitle, { color: isToday ? C.gold : C.text }]}>
          {dayDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          {isToday ? " · Aujourd'hui" : ""}
        </Text>
        {sorted.length === 0 ? (
          <Text style={[styles.emptyText, { color: C.muted }]}>Aucun soin prévu ce jour-là.</Text>
        ) : (
          sorted.map((r) => (
            <TouchableOpacity key={r.id} style={styles.soinRow} activeOpacity={0.7} onPress={() => onSoinPress(r)}>
              <Text style={[styles.soinTime, { color: C.orange }]}>{r.creneau}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.soinLabel, { color: C.text }]} numberOfLines={1}>
                  {patientNameBySpaceId[r.space_id] ?? `${r.prenom} ${r.nom}`}
                </Text>
                <Text style={[styles.soinBy, { color: C.muted }]} numberOfLines={1}>
                  {r.intervention_label ?? reservationType}{r.duration_minutes ? ` (${r.duration_minutes} min)` : ""}
                </Text>
                {!!locationBySpaceId[r.space_id] && (
                  <Text style={[styles.soinBy, { color: C.muted }]} numberOfLines={1}>📍 {locationBySpaceId[r.space_id]}</Text>
                )}
                <Text style={[styles.soinBy, { color: C.muted }]} numberOfLines={1}>{r.prenom} {r.nom}</Text>
                {!!companionsById?.[r.id]?.length && (
                  <Text style={[styles.soinBy, { color: C.muted }]} numberOfLines={1}>
                    + {companionsById[r.id].map((c) => `${c.prenom} ${c.nom}`).join(", ")}
                  </Text>
                )}
              </View>
              <Text style={[styles.chevron, { color: C.muted }]}>›</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8 },
  otherToggle: { borderWidth: 1, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10 },
  otherToggleText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11 },
  sectionTitle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 20 },
  dayTitle: { fontFamily: "DM_Sans_700Bold", fontSize: 13, textTransform: "capitalize", marginBottom: 8 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },
  soinRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  soinTime: { fontFamily: "DM_Sans_700Bold", fontSize: 13, minWidth: 42 },
  soinLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  soinBy: { fontFamily: "DM_Sans_400Regular", fontSize: 11.5, marginTop: 1 },
  chevron: { fontFamily: "DM_Sans_700Bold", fontSize: 16 },
});
