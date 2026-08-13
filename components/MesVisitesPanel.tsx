import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { Theme } from "@/lib/themes";
import type { Reservation } from "@/lib/types";
import { toFrShort, isSlotFullyPast } from "@/lib/slotUtils";

// Panneau planning intégré au calendrier visiteur pour le rôle visiteur —
// pendant de IntervenantPlanningPanel.tsx, mais pour les visites/nuitées au
// lieu des soins. Reçoit déjà les réservations filtrées par le parent selon
// "Afficher mes créneaux" (home/calendar.tsx, panelReservations).
interface Props {
  C: Theme;
  reservations: Reservation[];
}

function VisiteCard({ r, C, done }: { r: Reservation; C: Theme; done: boolean }) {
  return (
    <View style={[styles.historyCard, { backgroundColor: C.card, borderColor: C.border }]}>
      <View style={styles.historyHeader}>
        <Text style={[styles.historyDate, { color: C.text }]}>
          {toFrShort(new Date(r.date + "T12:00:00"))} · {r.creneau}
        </Text>
        <Text style={[styles.historyStatus, { color: done ? C.success : C.orange }]}>
          {done ? "Passée" : "À venir"}
        </Text>
      </View>
      <Text style={[styles.historyLabel, { color: C.text }]}>{r.type === "Nuit" ? "Nuitée" : "Visite"}</Text>
      <Text style={[styles.historyBy, { color: C.muted }]}>{r.prenom} {r.nom}</Text>
    </View>
  );
}

export default function MesVisitesPanel({ C, reservations }: Props) {
  const [historyOpen, setHistoryOpen] = useState(false);

  const visites = reservations.filter((r) => r.type === "Visite" || r.type === "Nuit");

  const upcoming = visites
    .filter((r) => !isSlotFullyPast(r.date, r.creneau))
    .sort((a, b) => (a.date + a.creneau).localeCompare(b.date + b.creneau));
  const past = visites
    .filter((r) => isSlotFullyPast(r.date, r.creneau))
    .sort((a, b) => (b.date + b.creneau).localeCompare(a.date + a.creneau));

  return (
    <View>
      <Text style={[styles.sectionTitle, { color: C.gold }]}>Visites à venir</Text>
      {upcoming.length === 0 ? (
        <Text style={[styles.emptyText, { color: C.muted }]}>Aucune visite à venir.</Text>
      ) : (
        upcoming.map((r) => <VisiteCard key={r.id} r={r} C={C} done={false} />)
      )}

      <TouchableOpacity onPress={() => setHistoryOpen((o) => !o)} activeOpacity={0.7} style={styles.historyToggle}>
        <Text style={[styles.sectionTitle, { color: C.gold, marginBottom: 0 }]}>
          Historique des visites{past.length > 0 ? ` (${past.length})` : ""}
        </Text>
        <Text style={[styles.toggleIcon, { color: C.muted }]}>{historyOpen ? "▾" : "▸"}</Text>
      </TouchableOpacity>

      {historyOpen && (
        past.length === 0 ? (
          <Text style={[styles.emptyText, { color: C.muted }]}>Aucune visite passée.</Text>
        ) : (
          past.map((r) => <VisiteCard key={r.id} r={r} C={C} done={true} />)
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
