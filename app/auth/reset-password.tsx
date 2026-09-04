import { useEffect, useRef, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { themes } from "@/lib/themes";
import ConfirmModal from "@/components/ConfirmModal";

const C = themes.dark;

// Le lien "mot de passe oublié" (avectoi://auth/reset-password, voir
// forgot-password.tsx) porte les jetons Supabase soit en query (?code=...,
// flux PKCE) soit en fragment (#access_token=...&refresh_token=...&type=
// recovery, flux implicite) selon la config du projet — on gère les deux
// pour ne pas dépendre de ce réglage. lib/supabase.ts a detectSessionInUrl:
// false, donc rien n'est fait automatiquement : on ouvre la session ici à la
// main, juste le temps de poser le nouveau mot de passe.
function extractAuthParams(url: string) {
  const [beforeHash, hash] = url.split("#");
  const query = beforeHash.includes("?") ? beforeHash.split("?")[1] : "";
  return new URLSearchParams([query, hash].filter(Boolean).join("&"));
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  // Expo Router a déjà parsé la query string du lien pour ouvrir cet écran —
  // source fiable, contrairement à Linking.useURL() qui peut ne jamais
  // résoudre l'URL de lancement au cold start sur un Dev Client (bug observé :
  // écran bloqué indéfiniment sur "Vérification du lien…"). On ne garde
  // Linking.useURL() qu'en repli, pour le flux implicite (#access_token=...)
  // que les search params de Router ne capturent pas (fragment, pas query).
  const searchParams = useLocalSearchParams<{
    code?: string; access_token?: string; refresh_token?: string;
  }>();
  const url = Linking.useURL();
  const [ready, setReady] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [doneModal, setDoneModal] = useState(false);
  const handledRef = useRef(false);
  // DIAGNOSTIC TEMPORAIRE — à retirer une fois le bug du lien de reset
  // résolu. Affiché sur les écrans "Vérification…"/"Lien invalide" pour
  // voir sur l'appareil ce que l'app reçoit réellement (pas de débogueur
  // distant disponible sur ce Dev Build).
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  function logDebug(line: string) {
    setDebugInfo((prev) => [...prev, line]);
  }

  useEffect(() => {
    Linking.getInitialURL().then((u) => logDebug(`getInitialURL: ${u ?? "null"}`));
  }, []);

  useEffect(() => {
    logDebug(`useURL: ${url ?? "null"}`);
  }, [url]);

  useEffect(() => {
    logDebug(`searchParams: ${JSON.stringify(searchParams)}`);
  }, [searchParams.code, searchParams.access_token, searchParams.refresh_token]);

  useEffect(() => {
    async function process(code: string | null, access_token: string | null, refresh_token: string | null) {
      if (handledRef.current || (!code && !(access_token && refresh_token))) return;
      handledRef.current = true;
      if (code) {
        logDebug(`exchangeCodeForSession(${code.slice(0, 8)}…)`);
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) { logDebug(`exchange error: ${error.message}`); setInvalidLink(true); return; }
        setReady(true);
        return;
      }
      logDebug("setSession(access_token, refresh_token)");
      const { error } = await supabase.auth.setSession({ access_token: access_token!, refresh_token: refresh_token! });
      if (error) { logDebug(`setSession error: ${error.message}`); setInvalidLink(true); return; }
      setReady(true);
    }

    if (searchParams.code || (searchParams.access_token && searchParams.refresh_token)) {
      process(searchParams.code ?? null, searchParams.access_token ?? null, searchParams.refresh_token ?? null);
      return;
    }
    if (url) {
      const params = extractAuthParams(url);
      process(params.get("code"), params.get("access_token"), params.get("refresh_token"));
    }
  }, [searchParams.code, searchParams.access_token, searchParams.refresh_token, url]);

  // Filet de sécurité : si rien n'a pu être extrait du lien après quelques
  // secondes (ni Router params ni Linking.useURL() n'ont livré de jeton),
  // ne pas laisser l'écran bloqué indéfiniment sur "Vérification du lien…".
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!handledRef.current) setInvalidLink(true);
    }, 6000);
    return () => clearTimeout(timeout);
  }, []);

  async function handleReset() {
    if (password.length < 6) {
      setErrorModal("Utilise au moins 6 caractères.");
      return;
    }
    if (password !== confirm) {
      setErrorModal("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: password.trim() });
    setLoading(false);
    if (error) {
      setErrorModal(error.message);
      return;
    }
    await supabase.auth.signOut();
    setDoneModal(true);
  }

  function closeDoneModal() {
    setDoneModal(false);
    router.replace("/auth/login");
  }

  if (invalidLink) {
    return (
      <ScrollView contentContainerStyle={styles.centered}>
        <Text style={styles.title}>Lien invalide</Text>
        <Text style={styles.subtitle}>
          Ce lien de réinitialisation n'est plus valide ou a expiré. Redemande un email depuis l'écran de connexion.
        </Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.replace("/auth/login")} activeOpacity={0.85}>
          <Text style={styles.btnText}>Retour à la connexion</Text>
        </TouchableOpacity>
        <Text style={styles.debug} selectable>{debugInfo.join("\n")}</Text>
      </ScrollView>
    );
  }

  if (!ready) {
    return (
      <ScrollView contentContainerStyle={styles.centered}>
        <Text style={styles.subtitle}>Vérification du lien…</Text>
        <Text style={styles.debug} selectable>{debugInfo.join("\n")}</Text>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Nouveau mot de passe</Text>
        <Text style={styles.subtitle}>Choisis un nouveau mot de passe pour ton compte.</Text>

        <View style={styles.form}>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Nouveau mot de passe (6 caractères min.)"
              placeholderTextColor={C.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoFocus
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={C.muted} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Confirmer le mot de passe"
            placeholderTextColor={C.muted}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            style={[styles.btn, (!password || !confirm || loading) && styles.btnDisabled]}
            onPress={handleReset}
            disabled={!password || !confirm || loading}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>
              {loading ? "Enregistrement…" : "Enregistrer le mot de passe"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ConfirmModal
        visible={doneModal}
        icon="✓"
        title="Mot de passe mis à jour"
        message="Connecte-toi avec ton nouveau mot de passe."
        confirmLabel="Se connecter"
        destructive={false}
        singleButton
        onCancel={closeDoneModal}
        onConfirm={closeDoneModal}
        C={C}
      />

      <ConfirmModal
        visible={!!errorModal}
        icon="⚠️"
        title="Impossible d'enregistrer"
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
  centered: {
    flexGrow: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  debug: {
    marginTop: 32,
    fontSize: 11,
    color: C.muted,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    textAlign: "left",
  },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 28,
    color: "#fff",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "DM_Sans_400Regular",
    fontSize: 14,
    color: C.muted,
    lineHeight: 22,
    marginBottom: 32,
    textAlign: "center",
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
  passwordRow: { justifyContent: "center" },
  passwordInput: { paddingRight: 44 },
  eyeBtn: {
    position: "absolute",
    right: 14,
  },
  btn: {
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 32,
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
