import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";
import { themes } from "@/lib/themes";
import ConfirmModal from "@/components/ConfirmModal";

const C = themes.dark;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { email: prefillEmail } = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(prefillEmail ?? "");
  const [loading, setLoading] = useState(false);
  const [sentModal, setSentModal] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  async function handleSend() {
    if (!email.trim() || loading) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      // Voir app/auth/reset-password.tsx — doit aussi être autorisé dans
      // Supabase > Auth > URL Configuration > Redirect URLs (avectoi://*).
      redirectTo: Linking.createURL("auth/reset-password"),
    });
    setLoading(false);

    if (error) {
      setErrorModal(error.message);
      return;
    }
    // Supabase répond toujours succès ici, même si l'adresse n'existe pas
    // (anti-énumération) — le message reste volontairement neutre.
    setSentModal(true);
  }

  function closeSentModal() {
    setSentModal(false);
    router.replace("/auth/login");
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

        <Text style={styles.title}>Mot de passe oublié</Text>
        <Text style={styles.subtitle}>
          Indique ton email, on t'envoie un lien pour choisir un nouveau mot de passe.
        </Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={C.muted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
          <TouchableOpacity
            style={[styles.btn, (!email.trim() || loading) && styles.btnDisabled]}
            onPress={handleSend}
            disabled={!email.trim() || loading}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>
              {loading ? "Envoi…" : "Envoyer le lien"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ConfirmModal
        visible={sentModal}
        icon="✉️"
        title="Email envoyé"
        message="Si un compte existe avec cette adresse, tu vas recevoir un lien pour choisir un nouveau mot de passe."
        confirmLabel="OK"
        destructive={false}
        singleButton
        onCancel={closeSentModal}
        onConfirm={closeSentModal}
        C={C}
      />

      <ConfirmModal
        visible={!!errorModal}
        icon="⚠️"
        title="Envoi impossible"
        message={errorModal ?? undefined}
        confirmLabel="OK"
        singleButton
        onCancel={() => setErrorModal(null)}
        onConfirm={() => setErrorModal(null)}
        C={C}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: C.bg,
    padding: 24,
    paddingTop: 60,
  },
  back: { marginBottom: 32 },
  backText: { fontFamily: "DM_Sans_400Regular", color: C.muted, fontSize: 15 },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 28,
    color: "#fff",
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: "DM_Sans_400Regular",
    fontSize: 14,
    color: C.muted,
    lineHeight: 22,
    marginBottom: 32,
  },
  form: { gap: 12 },
  input: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 14,
    color: C.text,
    fontFamily: "DM_Sans_400Regular",
    fontSize: 15,
  },
  btn: {
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    fontFamily: "DM_Sans_700Bold",
    fontSize: 16,
    color: "#fff",
  },
});
