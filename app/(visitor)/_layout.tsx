import { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert } from "react-native";
import { Tabs, useGlobalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { File, Paths } from "expo-file-system";
import { supabase } from "@/lib/supabase";
import { VisitorSpaceProvider, useVisitorSpace } from "@/lib/VisitorContext";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { setupNotifications } from "@/lib/notifications";
import { getVisitorSession, saveVisitorSession } from "@/lib/visitorSession";
import PinPad from "@/components/PinPad";
import PatientAvatar from "@/components/PatientAvatar";
import RebookingAlertModal from "@/components/RebookingAlertModal";
import IntervenantOnboardingFlow from "@/components/IntervenantOnboardingFlow";

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
  // Photo choisie sur ce même popup identité — intervenant uniquement (voir
  // rendu ci-dessous). Uploadée seulement après création de la fiche par
  // IntervenantOnboardingFlow.tsx, qui a besoin de l'id du profil.
  const [identityPhotoUri, setIdentityPhotoUri] = useState<string | null>(null);

  // Rôle de la session (visiteur par défaut) — un intervenant doit créer sa
  // fiche (métier + soins pratiqués) avant de pouvoir continuer, voir
  // IntervenantOnboardingFlow.tsx. La fiche n'est jamais redemandée une fois
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
    const trimmedPrenom = identityPrenom.trim();
    const trimmedNom = identityNom.trim();

    // Un intervenant qui se connecte depuis un nouvel appareil (ou après
    // réinstallation/vidage du cache) n'a plus intervenantProfileId en
    // session locale — sans ce contrôle, la fiche "create" plus bas
    // recréerait systématiquement un doublon pour le même prénom/nom au
    // lieu de rattacher l'appareil à la fiche existante. Le code à 4
    // chiffres saisi ci-dessus sert de vérification avant rattachement.
    if (role === "intervenant") {
      const { data: existing } = await supabase
        .from("intervenant_profiles")
        .select("id, pin")
        .eq("space_id", space.id)
        .ilike("prenom", trimmedPrenom)
        .ilike("nom", trimmedNom)
        .maybeSingle();

      if (existing) {
        if (existing.pin !== identityPin) {
          setSavingIdentity(false);
          Alert.alert(
            "Code différent",
            "Un intervenant du même prénom et nom existe déjà pour cet espace, avec un autre code. Demande-lui son code à 4 chiffres, ou contacte l'administrateur.",
          );
          return;
        }
        await saveVisitorSession({
          token, spaceId: space.id, prenom: trimmedPrenom, nom: trimmedNom,
          pin: identityPin, intervenantProfileId: existing.id,
        });
        setSavingIdentity(false);
        setIntervenantProfileId(existing.id);
        setIdentityKnown(true);
        return;
      }
    }

    await saveVisitorSession({ token, spaceId: space.id, prenom: trimmedPrenom, nom: trimmedNom, pin: identityPin });
    setSavingIdentity(false);
    setIdentityKnown(true);
  }

  async function pickIdentityPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission refusée", "Autorise l'accès à la galerie dans les paramètres.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;

    // Copie dans le dossier document (persistant) — même précaution que
    // IntervenantFicheModal.tsx pickPhoto (le fichier renvoyé par le picker
    // vit dans le cache de l'app, non garanti de survivre jusqu'à la création
    // du compte, plusieurs popups plus tard).
    let persistedUri = result.assets[0].uri;
    try {
      const dest = new File(Paths.document, `intervenant_onboarding_photo_${Date.now()}.jpg`);
      new File(result.assets[0].uri).copy(dest);
      persistedUri = dest.uri;
    } catch {
      // Copie échouée : on garde l'uri d'origine, aperçu immédiat quand même
      // fonctionnel.
    }
    setIdentityPhotoUri(persistedUri);
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
              {role === "intervenant" && (
                <TouchableOpacity style={identityStyles.photoPicker} onPress={pickIdentityPhoto} activeOpacity={0.8}>
                  <PatientAvatar
                    photoUrl={identityPhotoUri}
                    firstname={identityPrenom}
                    lastname={identityNom}
                    size={64}
                    C={C}
                  />
                  <Text style={[identityStyles.photoPickerText, { color: C.accent }]}>Ajouter une photo</Text>
                </TouchableOpacity>
              )}
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
        <IntervenantOnboardingFlow
          visible
          spaceId={space.id}
          prenom={identityPrenom}
          nom={identityNom}
          pin={identityPin}
          pickedPhotoUri={identityPhotoUri}
          theme={C}
          onCreated={async (profileId, savedPrenom, savedNom, _telephone, _phraseTotem, _photo, _photoUpdatedAt, savedMetier) => {
            await saveVisitorSession({
              token, spaceId: space.id, intervenantProfileId: profileId,
              prenom: savedPrenom, nom: savedNom, metier: savedMetier ?? "",
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
        options={{
          href: role === "intervenant" ? undefined : null,
          title: "Accueil",
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
        listeners={{
          // Le groupe "home" est un Stack à plusieurs écrans (calendrier,
          // créneaux, nuits...) sans route "index" — un appui direct sur cet
          // onglet doit toujours ramener au calendrier plutôt que de
          // dépendre de l'état interne du Stack.
          tabPress: (e) => {
            if (role !== "intervenant") return;
            e.preventDefault();
            router.push("/(visitor)/home/calendar" as any);
          },
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          title: "Nouvelles",
          tabBarIcon: ({ color, size }) => <Ionicons name="newspaper-outline" size={size} color={color} />,
          href: role === "intervenant" ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="souvenirs"
        options={{
          title: "Souvenirs",
          tabBarIcon: ({ color, size }) => <Ionicons name="images-outline" size={size} color={color} />,
          href: role === "intervenant" ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="intervenants"
        options={{
          title: "Intervenants",
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
          href: role === "intervenant" ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="entraide"
        options={{
          title: "Entraide",
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
          href: role === "intervenant" ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="soins"
        options={{
          title: "Soins",
          tabBarIcon: ({ color, size }) => <Ionicons name="medkit-outline" size={size} color={color} />,
          href: role === "intervenant" ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="soutien"
        options={{
          title: "Soutien",
          tabBarIcon: ({ color, size }) => <Ionicons name="heart-outline" size={size} color={color} />,
          href: role === "intervenant" ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: "Patients",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
          href: role === "intervenant" ? undefined : null,
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
  photoPicker: {
    alignItems: "center",
    marginBottom: 14,
    gap: 6,
  },
  photoPickerText: {
    fontFamily: "DM_Sans_600SemiBold",
    fontSize: 12,
  },
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
