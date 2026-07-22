import { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useVisitorSpace } from "@/lib/VisitorContext";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { getVisitorSession } from "@/lib/visitorSession";
import SoinsPlanifiesBlock from "@/components/SoinsPlanifiesBlock";
import MesSoinsList from "@/components/MesSoinsList";

// Onglet racine dédié au rôle intervenant (remplace "Entraide" dans la barre
// d'onglets, voir app/(visitor)/_layout.tsx) — gestion des soins proposés par
// CET intervenant (MesSoinsList : nom/durée, créer/modifier/supprimer) +
// rappel de ses soins planifiés (SoinsPlanifiesBlock). L'ajout d'une visite de
// soin se fait depuis le calendrier de la page d'accueil (voir
// InterventionBookingFlow.tsx via home/slots.tsx), qui ne propose déjà que les
// prestations de cet intervenant, toujours prioritaires.
export default function VisitorSoinsScreen() {
  const router = useRouter();
  const { theme: C } = useDisplayMode();
  const { space, setSelectedDay: setContextSelectedDay } = useVisitorSpace();

  const [intervenantProfileId, setIntervenantProfileId] = useState<string | null>(null);
  useEffect(() => {
    getVisitorSession().then((s) => {
      setIntervenantProfileId(s?.intervenantProfileId ?? null);
    });
  }, []);

  if (!space) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  function goToSlot(date: string) {
    setContextSelectedDay(new Date(date + "T12:00:00"));
    router.push("/(visitor)/home/slots" as any);
  }

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <Text style={[styles.headerTitle, { color: C.text }]}>🩺 Soins</Text>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.sectionTitle, { color: C.gold }]}>Mes soins</Text>
        {intervenantProfileId && <MesSoinsList intervenantProfileId={intervenantProfileId} C={C} />}

        <SoinsPlanifiesBlock
          spaceId={space.id}
          C={C}
          filterIntervenantProfileId={intervenantProfileId}
          onPressRow={goToSlot}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 52 },
  headerTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, textAlign: "center", marginBottom: 12 },

  scroll: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 },
});
