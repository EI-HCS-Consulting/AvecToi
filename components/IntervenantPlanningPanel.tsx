import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { Theme } from "@/lib/themes";
import type { Reservation } from "@/lib/types";
import { toFrShort, isSlotFullyPast } from "@/lib/slotUtils";

// Panneau planning intégré au calendrier visiteur pour le rôle intervenant —
// affiche les soins (tous intervenants) sous le calendrier familial
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

function PlanningCard({ r, C, done, soinsMode }: { r: Reservation; C: Theme; done: boolean; soinsMode: boolean }) {
  return (
    <View style={[styles.historyCard, { backgroundColor: C.card, borderColor: C.border }]}>
      <View style={styles.historyHeader}>
        <Text style={[styles.historyDate, { color: C.text }]}>
          {toFrShort(new Date(r.date + "T12:00:00"))} · {r.creneau}
        </Text>
        <Text style={[styles.historyStatus, { color: done ? C.success : C.orange }]}>
          {soinsMode ? (done ? "Effectué" : "Planifié") : (done ? "Passée" : "À venir")}
        </Text>
      </View>
      <Text style={[styles.historyLabel, { color: C.text }]}>
        {soinsMode ? r.intervention_label : (r.type === "Nuit" ? "Nuitée" : "Visite")}
      </Text>
      <Text style={[styles.historyBy, { color: C.muted }]}>{r.prenom} {r.nom}</Text>
    </View>
  );
}

export default function IntervenantPlanningPanel({ C, reservations, soinsMode }: Props) {
  const [historyOpen, setHistoryOpen] = useState(false);

  const filtered = reservations.filter((r) => (soinsMode ? r.type === "Intervention" : r.type === "Visite" || r.type === "Nuit"));

  // Anté-chronologique : la date la plus lointaine en premier, y compris
  // pour la liste "à venir" (comme pour l'historique, déjà dans ce sens).
  const upcoming = filtered
    .filter((r) => !isSlotFullyPast(r.date, r.creneau))
    .sort((a, b) => (b.date + b.creneau).localeCompare(a.date + a.creneau));
  const past = filtered
    .filter((r) => isSlotFullyPast(r.date, r.creneau))
    .sort((a, b) => (b.date + b.creneau).localeCompare(a.date + a.creneau));

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
        upcoming.map((r) => <PlanningCard key={r.id} r={r} C={C} done={false} soinsMode={soinsMode} />)
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
          past.map((r) => <PlanningCard key={r.id} r={r} C={C} done={true} soinsMode={soinsMode} />)
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
