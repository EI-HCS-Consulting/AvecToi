import { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Tabs, useGlobalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { VisitorSpaceProvider, useVisitorSpace } from "@/lib/VisitorContext";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { setupNotifications } from "@/lib/notifications";
import { getVisitorSession, saveVisitorSession } from "@/lib/visitorSession";
import PinPad from "@/components/PinPad";
import RebookingAlertModal from "@/components/RebookingAlertModal";
import IntervenantFicheModal from "@/components/IntervenantFicheModal";

function VisitorTabs() {
  const { space, token, loading } = useVisitorSpace();
  const router = useRouter();
  const { theme: C } = useDisplayMode();
  const [consentGiven, setConsentGiven] = useState<boolean | null>(null);

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

  // Rôle de la session (visiteur par défaut) — un intervenant doit créer sa
  // fiche (types d'intervention + durée) avant de pouvoir continuer, voir
  // IntervenantFicheModal.tsx. La fiche n'est jamais redemandée une fois
  // intervenantProfileId connu.
  const [role, setRole] = useState<"visiteur" | "intervenant">("visiteur");
  const [intervenantProfileId, setIntervenantProfileId] = useState<string | null>(null);

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
      setRole(s?.role ?? "visiteur");
      setIntervenantProfileId(s?.intervenantProfileId ?? null);
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

  async function handleConsent() {
    if (!space) return;
    await AsyncStorage.setItem(`consent_${space.id}`, "true");
    setConsentGiven(true);
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={C.accent} size="large" />
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
              <Text style={[consentStyles.title, identityStyles.compactTitle, { color: C.text }]}>👋 Bienvenue !</Text>
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

      {identityKnown === true && role === "intervenant" && !intervenantProfileId && space && (
        <IntervenantFicheModal
          visible
          mode="create"
          spaceId={space.id}
          prenom={identityPrenom}
          nom={identityNom}
          pin={identityPin}
          theme={C}
          onSaved={async (profileId, savedPrenom, savedNom) => {
            await saveVisitorSession({
              token, spaceId: space.id, intervenantProfileId: profileId,
              prenom: savedPrenom, nom: savedNom,
            });
            setIdentityPrenom(savedPrenom);
            setIdentityNom(savedNom);
            setIntervenantProfileId(profileId);
          }}
        />
      )}

      <Modal
        visible={identityKnown === true && (role !== "intervenant" || !!intervenantProfileId) && consentGiven === false}
        transparent animationType="fade" statusBarTranslucent
      >
        <View style={consentStyles.overlay}>
          <View style={[consentStyles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={consentStyles.emoji}>👥</Text>
            <Text style={[consentStyles.title, { color: C.text }]}>Avant de continuer</Text>
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

      {identityKnown === true && (role !== "intervenant" || !!intervenantProfileId) && consentGiven === true && <RebookingAlertModal />}

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
        options={{ href: null }}
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
        options={{
          title: "Souvenirs",
          tabBarIcon: ({ color, size }) => <Ionicons name="images-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="entraide"
        options={{
          title: "Entraide",
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
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
  const { theme: C } = useDisplayMode();
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
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  return (
    <VisitorSpaceProvider token={token}>
      <VisitorTabs />
    </VisitorSpaceProvider>
  );
}
