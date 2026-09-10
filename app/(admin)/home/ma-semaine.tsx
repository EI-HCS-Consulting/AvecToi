import { View, Text, StyleSheet } from "react-native";
import { useSpace } from "@/lib/SpaceContext";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import SpaceHeader from "@/components/SpaceHeader";
import MyWeekScreen from "@/components/MyWeekScreen";

// Enveloppe fine autour de MyWeekScreen (commun admin/visiteur) — même
// garde d'identité que home/calendar.tsx (identityReady avant de transmettre
// le PIN, pour ne jamais confondre l'admin avec un visiteur au PIN identique).
export default function AdminMaSemaineScreen() {
  const { space, reservations, loading, hasSpace } = useSpace();
  const { theme: C } = useDisplayMode();

  if (loading) return null;

  if (!hasSpace || !space) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <Text style={[styles.emptyText, { color: C.muted }]}>Aucun espace patient actif.</Text>
      </View>
    );
  }

  const myPrenom = space.admin_firstname ?? null;
  const myNom = space.admin_lastname ?? null;
  const identityReady = !!myPrenom && !!myNom;
  const effectiveMyPin = identityReady ? (space.admin_pin ?? null) : null;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SpaceHeader space={space} active="ma-semaine" basePath="/(admin)/home" C={C} />
      <MyWeekScreen
        space={space}
        reservations={reservations}
        basePath="/(admin)/home"
        myPin={effectiveMyPin}
        myPrenom={myPrenom}
        myNom={myNom}
        isAdmin
        C={C}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 14 },
});
