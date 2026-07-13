import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { themes } from "@/lib/themes";
import { enterByToken, completeVisitorEntry } from "@/lib/visitorEntry";

const C = themes.dark;

export default function VisitorEntryScreen() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [loadingToken, setLoadingToken] = useState(false);

  async function handleResult(result: Awaited<ReturnType<typeof enterByToken>>) {
    if (!result.ok) {
      if (result.reason === "inactive") {
        Alert.alert(
          "Espace inactif",
          result.patientFirstname
            ? `L'espace pour ${result.patientFirstname} n'est pas encore actif.`
            : "Cet espace n'est pas encore actif.",
        );
      } else {
        Alert.alert("Introuvable", "Ce lien ou ce code n'existe pas ou a expiré.");
      }
      return;
    }

    await completeVisitorEntry(result);
    router.replace({
      pathname: "/(visitor)/home/calendar",
      params: { spaceId: result.spaceId, token: result.token },
    });
  }

  async function handleEnterByToken() {
    const t = token.trim();
    if (!t) return;
    setLoadingToken(true);
    const result = await enterByToken(t);
    setLoadingToken(false);
    await handleResult(result);
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

        <Text style={styles.title}>Accès visiteur</Text>

        <Text style={styles.sectionLabel}>Lien d'invitation</Text>
        <Text style={styles.subtitle}>
          Collez le lien d'invitation reçu par SMS ou WhatsApp.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Lien d'invitation…"
          placeholderTextColor={C.muted}
          value={token}
          onChangeText={(v) => {
            const parsed = v.includes("token=")
              ? v.split("token=")[1].split("&")[0]
              : v;
            setToken(parsed);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
        />

        <TouchableOpacity
          style={[styles.btn, (!token.trim() || loadingToken) && styles.btnDisabled]}
          onPress={handleEnterByToken}
          disabled={!token.trim() || loadingToken}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>
            {loadingToken ? "Vérification…" : "Accéder au planning"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          AvecToi prend soin de vos données en les sécurisant. Aucune de vos
          données ne seront jamais vendues ou communiquées à des Tiers.
        </Text>
        <Text style={[styles.hint, styles.hintStacked]}>
          Merci pour votre confiance
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: C.bg,
    padding: 24,
    paddingTop: 60,
    paddingBottom: 48,
  },
  back: { marginBottom: 32 },
  backText: { fontFamily: "DM_Sans_400Regular", color: C.muted, fontSize: 15 },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 28,
    color: "#fff",
    marginBottom: 24,
  },
  sectionLabel: {
    fontFamily: "DM_Sans_700Bold",
    fontSize: 15,
    color: "#fff",
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: "DM_Sans_400Regular",
    fontSize: 14,
    color: C.muted,
    lineHeight: 22,
    marginBottom: 16,
  },
  input: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 14,
    color: C.text,
    fontFamily: "DM_Sans_400Regular",
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  btn: {
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    fontFamily: "DM_Sans_700Bold",
    fontSize: 16,
    color: "#fff",
  },
  hint: {
    fontFamily: "DM_Sans_400Regular",
    fontSize: 12,
    color: C.muted,
    textAlign: "center",
    marginTop: 32,
    lineHeight: 20,
  },
  hintStacked: { marginTop: 10 },
});
