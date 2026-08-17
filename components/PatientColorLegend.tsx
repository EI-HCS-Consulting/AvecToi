import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { Theme } from "@/lib/themes";

// Légende du calendrier "Planning" (app/(visitor)/soins.tsx, onglet
// intervenant) — associe chaque patient rattaché à l'intervenant à la
// couleur de ses pastilles sur IntervenantGlobalCalendar.tsx. Nommé
// différemment de components/PlanningLegend.tsx (légende Dispo/Partiel/
// Complet d'un tout autre écran, home/planning.tsx) pour éviter toute
// confusion entre les deux. Grille 2 colonnes fixe (largeur nécessaire pour
// ne pas couper les noms/prénoms). Chaque nom (+ "Tous") est tapable : filtre
// le calendrier et les blocs de jours planifiés en dessous sur ce seul
// patient — voir selectedSpaceId/onSelect dans soins.tsx.
interface Item {
  id: string;
  name: string;
  color: string;
}

interface Props {
  C: Theme;
  items: Item[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function PatientColorLegend({ C, items, selectedId, onSelect }: Props) {
  if (items.length === 0) return null;
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <TouchableOpacity key={item.id} style={styles.item} onPress={() => onSelect(item.id)} activeOpacity={0.7}>
          <View style={[styles.swatch, { backgroundColor: item.color }]} />
          <Text
            style={[styles.label, { color: C.text }, selectedId === item.id && styles.labelActive]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.item} onPress={() => onSelect(null)} activeOpacity={0.7}>
        <View
          style={[
            styles.swatch,
            styles.allSwatch,
            { borderColor: C.text },
            selectedId === null && { backgroundColor: C.text },
          ]}
        />
        <Text
          style={[styles.label, { color: C.text }, selectedId === null && styles.labelActive]}
          numberOfLines={1}
        >
          Tous
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap" },
  item: { width: "50%", flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 5, paddingRight: 6 },
  swatch: { width: 10, height: 10, borderRadius: 5 },
  allSwatch: { borderWidth: 1.5, backgroundColor: "transparent" },
  label: { fontFamily: "DM_Sans_400Regular", fontSize: 12, flexShrink: 1 },
  labelActive: { fontFamily: "DM_Sans_700Bold" },
});
