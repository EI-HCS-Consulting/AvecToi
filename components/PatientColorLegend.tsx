import { View, Text, StyleSheet } from "react-native";
import type { Theme } from "@/lib/themes";

// Légende du calendrier "Planning" (app/(visitor)/soins.tsx, onglet
// intervenant) — associe chaque patient rattaché à l'intervenant à la
// couleur de ses pastilles sur IntervenantGlobalCalendar.tsx. Nommé
// différemment de components/PlanningLegend.tsx (légende Dispo/Partiel/
// Complet d'un tout autre écran, home/planning.tsx) pour éviter toute
// confusion entre les deux. Grille 3 colonnes fixe : le 4ème patient revient
// à la ligne, quel que soit le nombre total de patients.
interface Item {
  spaceId: string;
  name: string;
  color: string;
}

interface Props {
  C: Theme;
  items: Item[];
}

export default function PatientColorLegend({ C, items }: Props) {
  if (items.length === 0) return null;
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View key={item.spaceId} style={styles.item}>
          <View style={[styles.swatch, { backgroundColor: item.color }]} />
          <Text style={[styles.label, { color: C.text }]} numberOfLines={1}>{item.name}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap" },
  item: { width: "33.33%", flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 5, paddingRight: 6 },
  swatch: { width: 10, height: 10, borderRadius: 5 },
  label: { fontFamily: "DM_Sans_400Regular", fontSize: 12, flexShrink: 1 },
});
