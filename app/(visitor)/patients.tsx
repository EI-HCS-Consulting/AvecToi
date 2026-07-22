import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useVisitorSpace } from "@/lib/VisitorContext";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import PatientsList from "@/components/PatientsList";

// Onglet racine dédié au rôle intervenant (remplace "Soutien" dans la barre
// d'onglets, voir app/(visitor)/_layout.tsx) — liste des patients auxquels
// l'intervenant est rattaché, même présentation que intervenants.tsx.
export default function VisitorPatientsScreen() {
  const { space } = useVisitorSpace();
  const { theme: C } = useDisplayMode();

  if (!space) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <Text style={[styles.title, { color: C.text }]}>🩺 Patients</Text>
      <View style={styles.body}>
        <PatientsList C={C} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 52 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, textAlign: "center", marginBottom: 12 },
  body: { flex: 1, paddingHorizontal: 20 },
});
