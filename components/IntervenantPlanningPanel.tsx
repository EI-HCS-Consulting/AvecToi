import { View, Text, StyleSheet } from "react-native";
import type { Theme } from "@/lib/themes";
import type { Reservation } from "@/lib/types";
import { toISO, toFrShort } from "@/lib/slotUtils";

// Panneau planning intégré au calendrier visiteur pour le rôle intervenant —
// affiche l'historique global anté-chronologique des soins (tous
// intervenants, planifiés et effectués), sous le calendrier familial
// (Mensuel) ou la bande Hebdo (WeekStrip), qui couvrent déjà la vue du jour
// courant/sélectionné pour tous les rôles (voir home/calendar.tsx) — plus
// besoin d'une grille dédiée ici.
interface Props {
  C: Theme;
  reservations: Reservation[];
}

export default function IntervenantPlanningPanel({ C, reservations }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = toISO(today);

  const allInterventions = [...reservations]
    .filter((r) => r.type === "Intervention")
    .sort((a, b) => (b.date + b.creneau).localeCompare(a.date + a.creneau));

  return (
    <View>
      <Text style={[styles.sectionTitle, { color: C.gold }]}>Historique des soins</Text>
      {allInterventions.length === 0 ? (
        <Text style={[styles.emptyText, { color: C.muted }]}>Aucun soin planifié pour l&apos;instant.</Text>
      ) : (
        allInterventions.map((r) => {
          const done = r.date < todayIso;
          return (
            <View key={r.id} style={[styles.historyCard, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={styles.historyHeader}>
                <Text style={[styles.historyDate, { color: C.text }]}>
                  {toFrShort(new Date(r.date + "T12:00:00"))} · {r.creneau}
                </Text>
                <Text style={[styles.historyStatus, { color: done ? C.success : C.orange }]}>
                  {done ? "Effectué" : "Planifié"}
                </Text>
              </View>
              <Text style={[styles.historyLabel, { color: C.text }]}>{r.intervention_label}</Text>
              <Text style={[styles.historyBy, { color: C.muted }]}>{r.prenom} {r.nom}</Text>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginBottom: 12 },

  historyCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  historyDate: { fontFamily: "DM_Sans_700Bold", fontSize: 13, textTransform: "capitalize" },
  historyStatus: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, textTransform: "uppercase" },
  historyLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, marginTop: 2 },
  historyBy: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },
});
