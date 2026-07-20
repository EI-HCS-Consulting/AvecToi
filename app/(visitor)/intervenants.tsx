import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useVisitorSpace } from "@/lib/VisitorContext";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import IntervenantsList from "@/components/IntervenantsList";

// Onglet racine dédié au rôle intervenant (remplace "Souvenirs" dans la barre
// d'onglets, voir app/(visitor)/_layout.tsx) — liste des intervenants de
// l'espace, avatar photo + fiche en lecture seule.
export default function VisitorIntervenantsScreen() {
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
      <Text style={[styles.title, { color: C.text }]}>🩺 Intervenants</Text>
      <View style={styles.body}>
        <IntervenantsList spaceId={space.id} C={C} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 52 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, textAlign: "center", marginBottom: 12 },
  body: { flex: 1, paddingHorizontal: 20 },
});
