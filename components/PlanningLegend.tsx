import { View, Text, StyleSheet } from "react-native";
import type { Theme } from "@/lib/themes";

// Légende partagée entre l'affichage mensuel et hebdomadaire du planning des
// intervenants — pastilles de couleur pour l'occupation des créneaux de
// soins (interventions). Les visites ne sont plus affichées sur cet écran.
export default function PlanningLegend({ C }: { C: Theme }) {
  return (
    <View style={styles.legend}>
      {([[C.success, "Dispo"], [C.orange, "Partiel"], [C.danger, "Complet"]] as [string, string][]).map(([color, label]) => (
        <View key={label} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: color }]} />
          <Text style={[styles.legendLabel, { color: C.muted }]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", gap: 16, marginBottom: 14 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontFamily: "DM_Sans_400Regular", fontSize: 11 },
});
