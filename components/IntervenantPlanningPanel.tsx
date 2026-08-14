import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { Theme } from "@/lib/themes";
import type { Reservation } from "@/lib/types";
import { toFrShort, isSlotFullyPast } from "@/lib/slotUtils";

// Panneau planning intégré au calendrier visiteur, commun aux 3 rôles —
// affiche les soins (tous intervenants) ou les visites/nuitées (selon
// soinsMode, voir plus bas) sous le calendrier familial
// (Mensuel) ou la bande Hebdo (WeekStrip), qui couvrent déjà la vue du jour
// courant/sélectionné pour tous les rôles (voir home/calendar.tsx) — plus
// besoin d'une grille dédiée ici. Scindé en deux sous-sections : à venir
// (toujours visible) et historique (déjà passé, repliée par défaut — même
// pattern que SoinsPlanifiesBlock). Le bascule à venir/passé est précise à la
// minute près via isSlotFullyPast, pas seulement au jour près.
// soinsMode (vue Visites/Soins du calendrier, home/calendar.tsx) détermine ce
// que ce panneau liste : soins réservés par des intervenants (soinsMode) ou
// visites/nuitées réservées par des visiteurs (!soinsMode) — labels et filtre
// de type basculent ensemble, même quand l'intervenant regarde la vue
// Visites.
interface Props {
  C: Theme;
  reservations: Reservation[];
  soinsMode: boolean;
}

function PlanningCard({ group, C, done, soinsMode }: { group: Reservation[]; C: Theme; done: boolean; soinsMode: boolean }) {
  const first = group[0];
  return (
    <View style={[styles.historyCard, { backgroundColor: C.card, borderColor: C.border }]}>
      <View style={styles.historyHeader}>
        <Text style={[styles.historyDate, { color: C.text }]}>
          {toFrShort(new Date(first.date + "T12:00:00"))} · {first.creneau}
        </Text>
        <Text style={[styles.historyStatus, { color: done ? C.success : C.orange }]}>
          {soinsMode ? (done ? "Effectué" : "Planifié") : (done ? "Passée" : "À venir")}
        </Text>
      </View>
      {group.map((r, i) => (
        <View key={r.id} style={i > 0 ? { marginTop: 8 } : undefined}>
          <Text style={[styles.historyLabel, { color: C.text }]}>
            {soinsMode ? r.intervention_label : (r.type === "Nuit" ? "Nuitée" : "Visite")}
          </Text>
          <Text style={[styles.historyBy, { color: C.muted }]}>{r.prenom} {r.nom}</Text>
        </View>
      ))}
    </View>
  );
}

// Regroupe les réservations partageant le même date+créneau (ex : 2
// visiteurs réservés sur le même créneau) dans un seul bloc/carte au lieu
// d'une carte par réservation.
function groupByDateCreneau(list: Reservation[]): Reservation[][] {
  const map = new Map<string, Reservation[]>();
  for (const r of list) {
    const key = `${r.date}|${r.creneau}`;
    const existing = map.get(key);
    if (existing) existing.push(r);
    else map.set(key, [r]);
  }
  return Array.from(map.values());
}

export default function IntervenantPlanningPanel({ C, reservations, soinsMode }: Props) {
  const [historyOpen, setHistoryOpen] = useState(false);

  const filtered = reservations.filter((r) => (soinsMode ? r.type === "Intervention" : r.type === "Visite" || r.type === "Nuit"));

  // Liste "à venir" : chronologique, la prochaine réservation en premier.
  // Historique : anté-chronologique, la plus récemment passée en premier.
  // Regroupées par date+créneau : 2 réservations sur le même créneau
  // (ex. 2 visiteurs) forment un seul bloc au lieu de deux cartes séparées.
  const upcoming = groupByDateCreneau(
    filtered.filter((r) => !isSlotFullyPast(r.date, r.creneau))
  ).sort((a, b) => (a[0].date + a[0].creneau).localeCompare(b[0].date + b[0].creneau));
  const past = groupByDateCreneau(
    filtered.filter((r) => isSlotFullyPast(r.date, r.creneau))
  ).sort((a, b) => (b[0].date + b[0].creneau).localeCompare(a[0].date + a[0].creneau));

  const upcomingTitle = soinsMode ? "Soins planifiés" : "Visites planifiées";
  const historyTitle = soinsMode ? "Historique des soins" : "Historique des visites";

  return (
    <View>
      <Text style={[styles.sectionTitle, { color: C.gold }]}>{upcomingTitle}</Text>
      {upcoming.length === 0 ? (
        <Text style={[styles.emptyText, { color: C.muted }]}>
          {soinsMode ? "Aucun soin planifié pour l'instant." : "Aucune visite planifiée pour l'instant."}
        </Text>
      ) : (
        upcoming.map((g) => <PlanningCard key={g[0].id} group={g} C={C} done={false} soinsMode={soinsMode} />)
      )}

      <TouchableOpacity onPress={() => setHistoryOpen((o) => !o)} activeOpacity={0.7} style={styles.historyToggle}>
        <Text style={[styles.sectionTitle, { color: C.gold, marginBottom: 0 }]}>
          {historyTitle}{past.length > 0 ? ` (${past.length})` : ""}
        </Text>
        <Text style={[styles.toggleIcon, { color: C.muted }]}>{historyOpen ? "▾" : "▸"}</Text>
      </TouchableOpacity>

      {historyOpen && (
        past.length === 0 ? (
          <Text style={[styles.emptyText, { color: C.muted }]}>
            {soinsMode ? "Aucun soin effectué pour l'instant." : "Aucune visite passée pour l'instant."}
          </Text>
        ) : (
          past.map((g) => <PlanningCard key={g[0].id} group={g} C={C} done={true} soinsMode={soinsMode} />)
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginBottom: 12 },

  historyToggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 20, marginBottom: 10 },
  toggleIcon: { fontSize: 14 },

  historyCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  historyDate: { fontFamily: "DM_Sans_700Bold", fontSize: 13, textTransform: "capitalize" },
  historyStatus: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, textTransform: "uppercase" },
  historyLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, marginTop: 2 },
  historyBy: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },
});
