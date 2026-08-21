import { View, Text, StyleSheet } from "react-native";
import { useSpace } from "@/lib/SpaceContext";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import HomeCalendarScreen from "@/components/HomeCalendarScreen";

// Enveloppe fine autour du calendrier commun (HomeCalendarScreen), désormais
// identique à celui du visiteur (l'admin n'a plus de vue intervenants depuis
// cette page — voir Développement V2/ pour le détail de cette décision).
export default function AdminCalendarScreen() {
  const {
    space, slotConfig, slots, reservations, loading, hasSpace, selectedDay, setSelectedDay,
    setPendingBookingSlot, refreshReservations, getConfigForDate, getSlotsForDate,
  } = useSpace();
  const { theme: C } = useDisplayMode();

  if (loading) return null;

  if (!hasSpace || !space || !slotConfig) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <Text style={[styles.emptyText, { color: C.muted }]}>Aucun espace patient actif.</Text>
      </View>
    );
  }

  // Identité personnelle de l'admin — toujours issue du space, jamais d'une
  // session à charger comme côté visiteur. isMyReservation() retombe sur un
  // simple match de PIN (sans vérifier le nom) quand myPrenom/myNom sont
  // vides — sûr côté visiteur (nom chargé de façon asynchrone, au pire
  // brièvement absent) mais pas pour l'admin : son PIN peut être défini
  // (recopié depuis son profil, voir account.tsx) sans que admin_firstname/
  // admin_lastname le soient (colonnes renseignées une fois à la création de
  // l'espace seulement). Sans cette garde, un visiteur ayant choisi le même
  // PIN à 4 chiffres que l'admin (pas garanti unique dans l'espace) serait à
  // tort reconnu comme "mien". On ignore donc le PIN tant que le nom n'est
  // pas fiable, avant de le transmettre au composant commun (qui, lui, ne
  // connaît que la version déjà garantie sûre : identityReady = !!myPin).
  const myPrenom = space.admin_firstname ?? null;
  const myNom = space.admin_lastname ?? null;
  const identityReady = !!myPrenom && !!myNom;
  const effectiveMyPin = identityReady ? (space.admin_pin ?? null) : null;

  return (
    <HomeCalendarScreen
      space={space}
      slotConfig={slotConfig}
      slots={slots}
      reservations={reservations}
      selectedDay={selectedDay}
      setSelectedDay={setSelectedDay}
      setPendingBookingSlot={setPendingBookingSlot}
      refreshReservations={refreshReservations}
      getConfigForDate={getConfigForDate}
      getSlotsForDate={getSlotsForDate}
      basePath="/(admin)/home"
      myPin={effectiveMyPin}
      myPrenom={myPrenom}
      myNom={myNom}
      token={null}
      C={C}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 14 },
});
