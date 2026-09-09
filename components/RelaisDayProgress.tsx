import { View, Text, StyleSheet } from "react-native";
import { buildDaySquares, type RelaisCoverageRange } from "@/lib/relaisCoverage";
import type { Theme } from "@/lib/themes";

interface Props {
  startIso: string;
  endIso: string;
  coverage: RelaisCoverageRange[];
  C: Theme;
}

// Barre de progression jour par jour (vert = couvert par au moins un
// contributeur, rouge = pas encore) d'un besoin de relais — même
// présentation partout où un besoin relais est affiché : Mon Compte
// (MyRelaisCommitments), Besoins SOS admin (coadmins.tsx) et mur d'entraide
// (Entraide.tsx).
export default function RelaisDayProgress({ startIso, endIso, coverage, C }: Props) {
  const daySquares = buildDaySquares(startIso, endIso, coverage);
  if (daySquares.length === 0) return null;
  return (
    <View style={styles.row}>
      {daySquares.map((d) => (
        <View key={d.iso} style={[styles.square, { backgroundColor: d.covered ? C.success : C.danger }]}>
          <Text style={styles.text}>{d.day}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 8 },
  square: { width: 26, height: 26, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  text: { fontFamily: "DM_Sans_700Bold", fontSize: 11, color: "#fff" },
});
