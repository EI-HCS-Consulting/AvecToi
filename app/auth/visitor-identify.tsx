import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { themes } from "@/lib/themes";
import PinPad from "@/components/PinPad";
import { loginVisitorProfile } from "@/lib/visitorProfile";
import { saveVisitorSession } from "@/lib/visitorSession";

const C = themes.dark;

// Écran B du flow de reconnaissance serveur (voir
// SPEC_reconnaissance_visiteur_serveur.md §3.2) : le visiteur (déjà résolu
// vers un spaceId/token via visitor-entry.tsx, ou redirigé ici depuis
// app/index.tsx si sa session locale ne matche plus le serveur) confirme
// son identité par Prénom + Nom + PIN pour retrouver son profil.
export default function VisitorIdentifyScreen() {
  const router = useRouter();
  const { spaceId, token, prenom: prefilledPrenom, nom: prefilledNom } = useLocalSearchParams<{
    spaceId: string; token: string; prenom?: string; nom?: string;
  }>();
  const [prenom, setPrenom] = useState(prefilledPrenom ?? "");
  const [nom, setNom] = useState(prefilledNom ?? "");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const canSubmit = prenom.trim() && nom.trim() && pin.length === 4 && !loading;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setErrorMsg("");
    const row = await loginVisitorProfile(spaceId, prenom.trim(), nom.trim(), pin);
    setLoading(false);

    if (!row) {
      setErrorMsg("Prénom, nom ou code incorrect.");
      return;
    }

    await saveVisitorSession({
      token,
      spaceId,
      prenom: row.prenom,
      nom: row.nom,
      pin,
      motto: row.motto ?? "",
      relation: row.relation ?? "",
    });
    router.replace({ pathname: "/(visitor)/home/calendar", params: { spaceId, token } });
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Qui êtes-vous ?</Text>
        <Text style={styles.subtitle}>
          Entrez votre prénom, nom et code personnel pour retrouver votre profil.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Prénom"
          placeholderTextColor={C.muted}
          value={prenom}
          onChangeText={(v) => { setPrenom(v); setErrorMsg(""); }}
          autoCapitalize="words"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="Nom"
          placeholderTextColor={C.muted}
          value={nom}
          onChangeText={(v) => { setNom(v); setErrorMsg(""); }}
          autoCapitalize="words"
          autoCorrect={false}
        />

        <Text style={styles.sectionLabel}>Code personnel</Text>
        <PinPad
          value={pin}
          onChange={(v) => { setPin(v); setErrorMsg(""); }}
          theme={C}
          hasError={!!errorMsg}
        />

        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

        <TouchableOpacity
          style={[styles.btn, !canSubmit && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>
            {loading ? "Vérification…" : "Continuer"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => router.push({
            pathname: "/auth/visitor-create-profile",
            params: { spaceId, token, prenom: prenom.trim(), nom: nom.trim() },
          })}
          activeOpacity={0.85}
        >
          <Text style={styles.btnSecondaryText}>Première visite ? Créer mon profil</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: C.bg,
    padding: 24,
    paddingTop: 32,
    paddingBottom: 32,
  },
  back: { marginBottom: 16 },
  backText: { fontFamily: "DM_Sans_400Regular", color: C.muted, fontSize: 15 },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 24,
    color: "#fff",
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: "DM_Sans_400Regular",
    fontSize: 14,
    color: C.muted,
    lineHeight: 20,
    marginBottom: 16,
  },
  sectionLabel: {
    fontFamily: "DM_Sans_700Bold",
    fontSize: 15,
    color: "#fff",
    marginBottom: 8,
  },
  input: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 12,
    color: C.text,
    fontFamily: "DM_Sans_400Regular",
    fontSize: 14,
    marginBottom: 10,
  },
  errorText: {
    fontFamily: "DM_Sans_400Regular",
    color: C.danger,
    fontSize: 13,
    marginBottom: 12,
    textAlign: "center",
  },
  btn: {
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    fontFamily: "DM_Sans_700Bold",
    fontSize: 16,
    color: "#fff",
  },
  btnSecondary: {
    backgroundColor: "transparent",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 12,
  },
  btnSecondaryText: {
    fontFamily: "DM_Sans_600SemiBold",
    fontSize: 14,
    color: C.text,
  },
});
