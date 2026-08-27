import { useEffect, useState } from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { AdminSpaceProvider, useSpace } from "@/lib/SpaceContext";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import PatientOnboarding from "@/components/PatientOnboarding";
import RgpdAlertModal from "@/components/RgpdAlertModal";
import RelaisAlertModal from "@/components/RelaisAlertModal";
import BirthdayAlertModal from "@/components/BirthdayAlertModal";
import EntraideTabIcon from "@/components/EntraideTabIcon";

// Sits inside AdminSpaceProvider — shows the onboarding form instead of the
// tabs until the admin has an active patient_spaces row. Renders the Tabs
// itself (rather than receiving them as children) so it can pass space.id
// down to EntraideTabIcon.
function AdminGate() {
  const { loading, hasSpace, space } = useSpace();
  const { theme: C } = useDisplayMode();
  const router = useRouter();

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: C.bg }]}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  if (!hasSpace) {
    return <PatientOnboarding />;
  }

  return (
    <>
      <RgpdAlertModal />
      {!!space && <RelaisAlertModal spaceId={space.id} isAdmin />}
      {!!space && <BirthdayAlertModal spaceId={space.id} birthdate={space.patient_birthdate} patientFirstname={space.patient_firstname} />}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: C.card, borderTopColor: C.border, borderTopWidth: 1, paddingBottom: 6 },
          tabBarActiveTintColor: C.accent,
          tabBarInactiveTintColor: C.muted,
          tabBarLabelStyle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11 },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            href: undefined,
            title: "Accueil",
            tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
          }}
          listeners={{
            // Le groupe "home" est un Stack à plusieurs écrans (calendrier,
            // créneaux, nuits...) sans route "index" — un appui direct sur cet
            // onglet doit toujours ramener au calendrier plutôt que de
            // dépendre de l'état interne du Stack.
            tabPress: (e) => {
              e.preventDefault();
              router.push("/(admin)/home/calendar" as any);
            },
          }}
        />
        <Tabs.Screen
          name="news"
          options={{
            title: "Nouvelles",
            tabBarIcon: ({ color, size }) => <Ionicons name="newspaper-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="souvenirs"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="entraide"
          options={{
            title: "Entraide",
            tabBarIcon: ({ color, size }) => (
              <EntraideTabIcon spaceId={space?.id ?? null} isAdmin color={color} size={size} theme={C} />
            ),
          }}
        />
        <Tabs.Screen
          name="soutien"
          options={{
            title: "Soutien",
            tabBarIcon: ({ color, size }) => <Ionicons name="heart-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            title: "Compte",
            tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="intervenants"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="mes-souvenirs"
          options={{ href: null }}
        />
      </Tabs>
    </>
  );
}

export default function AdminLayout() {
  const { theme: C } = useDisplayMode();
  const [adminId, setAdminId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/auth/login");
        return;
      }
      setAdminId(session.user.id);
      setReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        router.replace("/");
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (!ready || !adminId) {
    return (
      <View style={[styles.loader, { backgroundColor: C.bg }]}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  return (
    <AdminSpaceProvider adminId={adminId}>
      <AdminGate />
    </AdminSpaceProvider>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
});
