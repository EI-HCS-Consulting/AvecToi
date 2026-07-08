import { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Tabs, useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { VisitorSpaceProvider, useVisitorSpace } from "@/lib/VisitorContext";
import { themes } from "@/lib/themes";
import { setupNotifications } from "@/lib/notifications";
import { getVisitorSession, saveVisitorSession } from "@/lib/visitorSession";
import { isSpaceCapped } from "@/lib/freemiumCap";
import PinPad from "@/components/PinPad";

function VisitorTabs() {
  const { space, token, reservations, loading } = useVisitorSpace();
  const router = useRouter();
  const pathname = usePathname();
  const C = themes[space?.theme ?? "blue"];
  const [consentGiven, setConsentGiven] = useState<boolean | null>(null);
  const capped = isSpaceCapped(space, reservations);

  // Identité stable du visiteur — demandée une seule fois, à la toute
  // première arrivée sur cet espace (avant même le consentement RGPD),
  // et jamais réécrite ensuite par une réservation ou une autre action :
  // c'est elle qui préremplit les formulaires par défaut, y compris quand
  // le visiteur réserve pour quelqu'un d'autre (ex. un proche âgé sans
  // téléphone) — voir BookingFlow.tsx.
  const [identityKnown, setIdentityKnown] = useState<boolean | null>(null);
  const [identityPrenom, setIdentityPrenom] = useState("");
  const [identityNom, setIdentityNom] = useState("");
  // Choisi une seule fois ici, dès la connexion — devient le PIN par défaut
  // préempli (mais toujours modifiable) sur toutes les actions protégées
  // (Entraide, nouvelles, soutien, souvenirs, réservations) : voir samePerson()
  // dans Entraide.tsx et les écrans équivalents.
  const [identityPin, setIdentityPin] = useState("");
  const [savingIdentity, setSavingIdentity] = useState(false);

  useEffect(() => {
    setupNotifications();
  }, []);

  useEffect(() => {
    if (!loading && !space) {
      router.replace("/auth/visitor-entry");
    }
  }, [loading, space]);

  useEffect(() => {
    if (!space) return;
    getVisitorSession().then((s) => {
      setIdentityKnown(!!(s?.prenom.trim() && s?.nom.trim()));
    });
  }, [space?.id]);

  useEffect(() => {
    if (!space) return;
    AsyncStorage.getItem(`consent_${space.id}`).then((val) => {
      setConsentGiven(val === "true");
    });
  }, [space?.id]);

  async function handleSaveIdentity() {
    if (!space || !identityPrenom.trim() || !identityNom.trim() || identityPin.length < 4) return;
    setSavingIdentity(true);
    await saveVisitorSession({ token, spaceId: space.id, prenom: identityPrenom.trim(), nom: identityNom.trim(), pin: identityPin });
    setSavingIdentity(false);
    setIdentityKnown(true);
  }

  // Espace bloqué (cap freemium atteint) : seul "Mon compte" reste
  // accessible (PIN, profil) — tout le reste renvoie vers cet onglet.
  useEffect(() => {
    if (capped && !pathname.endsWith("/account")) {
      router.replace("/(visitor)/account");
    }
  }, [capped, pathname]);

  async function handleConsent() {
    if (!space) return;
    await AsyncStorage.setItem(`consent_${space.id}`, "true");
    setConsentGiven(true);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: themes.blue.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={themes.blue.accent} size="large" />
      </View>
    );
  }

  return (
    <>
      <Modal visible={identityKnown === false} transparent animationType="fade" statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[consentStyles.overlay, { flexGrow: 1, justifyContent: "center", paddingVertical: 16 }]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[consentStyles.card, identityStyles.compactCard, { backgroundColor: C.card, borderColor: C.border }]}>
              <Text style={[consentStyles.title, identityStyles.compactTitle, { color: "#fff" }]}>👋 Bienvenue !</Text>
              <View style={identityStyles.row}>
                <TextInput
                  style={[identityStyles.input, identityStyles.rowInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                  placeholder="Prénom" placeholderTextColor={C.muted}
                  value={identityPrenom} onChangeText={setIdentityPrenom} autoCapitalize="words"
                />
                <TextInput
                  style={[identityStyles.input, identityStyles.rowInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                  placeholder="Nom" placeholderTextColor={C.muted}
                  value={identityNom} onChangeText={setIdentityNom} autoCapitalize="words"
                />
              </View>
              <Text style={[identityStyles.pinLabel, { color: C.gold }]}>
                Ton code à 4 chiffres
              </Text>
              <PinPad value={identityPin} onChange={setIdentityPin} theme={C} />
              <TouchableOpacity
                style={[consentStyles.btn, identityStyles.compactBtn, { backgroundColor: C.accent }, (!identityPrenom.trim() || !identityNom.trim() || identityPin.length < 4 || savingIdentity) && { opacity: 0.5 }]}
                onPress={handleSaveIdentity}
                disabled={!identityPrenom.trim() || !identityNom.trim() || identityPin.length < 4 || savingIdentity}
                activeOpacity={0.85}
              >
                {savingIdentity ? <ActivityIndicator color="#fff" size="small" /> : <Text style={consentStyles.btnText}>Continuer</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={identityKnown === true && consentGiven === false} transparent animationType="fade" statusBarTranslucent>
        <View style={consentStyles.overlay}>
          <View style={[consentStyles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={consentStyles.emoji}>👥</Text>
            <Text style={[consentStyles.title, { color: "#fff" }]}>Avant de continuer</Text>
            <Text style={[consentStyles.body, { color: C.muted }]}>
              Ton prénom et ton nom seront visibles par les autres personnes qui consultent ce planning.
            </Text>
            <TouchableOpacity
              style={[consentStyles.btn, { backgroundColor: C.accent }]}
              onPress={handleConsent}
              activeOpacity={0.85}
            >
              <Text style={consentStyles.btnText}>J'ai compris, continuer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: C.card, borderTopColor: C.border, borderTopWidth: 1 },
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.muted,
        tabBarLabelStyle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="news"
        options={{
          href: capped ? null : undefined,
          title: "Nouvelles",
          tabBarIcon: ({ color, size }) => <Ionicons name="newspaper-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="souvenirs"
        options={{
          href: capped ? null : undefined,
          title: "Souvenirs",
          tabBarIcon: ({ color, size }) => <Ionicons name="images-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="entraide"
        options={{
          href: capped ? null : undefined,
          title: "Entraide",
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="soutien"
        options={{
          href: capped ? null : undefined,
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
    </Tabs>
    </>
  );
}

const consentStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
  },
  emoji: { fontSize: 44, marginBottom: 16 },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 20,
    marginBottom: 14,
    textAlign: "center",
  },
  body: {
    fontFamily: "DM_Sans_400Regular",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 28,
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 15,
    width: "100%",
    alignItems: "center",
  },
  btnText: {
    fontFamily: "DM_Sans_700Bold",
    fontSize: 15,
    color: "#fff",
  },
});

const identityStyles = StyleSheet.create({
  input: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 10,
    padding: 11,
    fontFamily: "DM_Sans_400Regular",
    fontSize: 15,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
    marginBottom: 12,
  },
  rowInput: {
    flex: 1,
    width: undefined,
  },
  pinLabel: {
    fontFamily: "DM_Sans_600SemiBold",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 6,
  },
  compactCard: {
    padding: 18,
  },
  compactTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  compactBtn: {
    marginTop: 14,
    paddingVertical: 13,
  },
});

export default function VisitorLayout() {
  // The ?token= param attached when navigating to a deeply nested route
  // (Tabs > home Stack > calendar/slots/...) doesn't reliably survive that
  // navigation — neither local nor global search params see it here. Rather
  // than depend on that, fall back to the session already persisted in
  // lib/visitorSession.ts: every entry point (visitor-entry.tsx, invite.tsx)
  // saves the token there *before* navigating, so it's always available by
  // the time this layout mounts.
  const params = useGlobalSearchParams<{ token: string }>();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (params.token) {
      setToken(params.token);
      return;
    }
    getVisitorSession().then((s) => setToken(s?.token ?? ""));
  }, [params.token]);

  if (token === null) {
    return (
      <View style={{ flex: 1, backgroundColor: themes.blue.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={themes.blue.accent} size="large" />
      </View>
    );
  }

  return (
    <VisitorSpaceProvider token={token}>
      <VisitorTabs />
    </VisitorSpaceProvider>
  );
}
