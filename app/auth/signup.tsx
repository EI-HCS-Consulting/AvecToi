import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { themes } from "@/lib/themes";
import { FREE_TRIAL_DAYS } from "@/lib/freemiumCap";
import ConfirmModal from "@/components/ConfirmModal";

const C = themes.dark;

export default function SignupScreen() {
  const router = useRouter();
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showCreatedModal, setShowCreatedModal] = useState(false);
  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null);
  const [existingAccountModal, setExistingAccountModal] = useState(false);

  const canSubmit =
    firstname.trim() && lastname.trim() && email.trim() && password && confirm && !loading;

  async function handleSignup() {
    if (!canSubmit) return;

    if (password.length < 6) {
      setErrorModal({ title: "Mot de passe trop court", message: "Utilise au moins 6 caractères." });
      return;
    }
    if (password !== confirm) {
      setErrorModal({ title: "Les mots de passe ne correspondent pas", message: "Vérifie la confirmation." });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { firstname: firstname.trim(), lastname: lastname.trim() },
        // Sans ça, le lien de confirmation dans l'email renvoie vers le Site URL
        // par défaut du projet Supabase (souvent pas configuré) → page inaccessible.
        // Il faut aussi autoriser "avectoi://*" dans Supabase > Auth > URL Configuration.
        emailRedirectTo: Linking.createURL("auth/confirmed"),
      },
    });
    setLoading(false);

    if (error) {
      setErrorModal({ title: "Inscription impossible", message: error.message });
      return;
    }

    if (data.session) {
      // Email confirmation disabled on this project — straight into onboarding.
      router.replace("/(admin)/home/calendar");
      return;
    }

    // Anti-énumération : Supabase ne renvoie jamais d'erreur pour une adresse
    // déjà enregistrée, qu'elle soit confirmée ou non. Le seul signal est un
    // user renvoyé sans identité liée — voir doc Supabase auth.signUp().
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setExistingAccountModal(true);
      return;
    }

    // Email confirmation required — the admin tabs will pick up onboarding
    // automatically once they log back in with a confirmed account.
    setShowCreatedModal(true);
  }

  function closeCreatedModal() {
    setShowCreatedModal(false);
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

        <Text style={styles.title}>Créer un compte</Text>
        <Text style={styles.subtitle}>
          Gratuit, sans carte bancaire.{"\n"}
          Visites illimitées pendant {FREE_TRIAL_DAYS} jours à partir de ta première réservation.
        </Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Prénom"
            placeholderTextColor={C.muted}
            value={firstname}
            onChangeText={setFirstname}
            autoCapitalize="words"
            autoFocus
          />
          <TextInput
            style={styles.input}
            placeholder="Nom"
            placeholderTextColor={C.muted}
            value={lastname}
            onChangeText={setLastname}
            autoCapitalize="words"
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={C.muted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Mot de passe (6 caractères min.)"
              placeholderTextColor={C.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={showPassword ? "eye-off" : "eye"}
                size={20}
                color={C.muted}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Confirmer le mot de passe"
              placeholderTextColor={C.muted}
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={showPassword ? "eye-off" : "eye"}
                size={20}
                color={C.muted}
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.btn, !canSubmit && styles.btnDisabled]}
            onPress={handleSignup}
            disabled={!canSubmit}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>
              {loading ? "Création…" : "Créer mon compte"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>
          Déjà un compte ?{" "}
          <Text style={{ color: C.accent }} onPress={() => router.replace("/auth/login")}>
            Se connecter
          </Text>
        </Text>
      </ScrollView>

      <ConfirmModal
        visible={showCreatedModal}
        icon="✓"
        title="Compte créé"
        message="Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi."
        confirmLabel="OK"
        destructive={false}
        singleButton
        onCancel={closeCreatedModal}
        onConfirm={closeCreatedModal}
        C={C}
      />

      <ConfirmModal
        visible={!!errorModal}
        icon="⚠️"
        title={errorModal?.title ?? ""}
        message={errorModal?.message}
        confirmLabel="OK"
        singleButton
        onCancel={() => setErrorModal(null)}
        onConfirm={() => setErrorModal(null)}
        C={C}
      />

      <ConfirmModal
        visible={existingAccountModal}
        icon="✉️"
        title="Adresse déjà utilisée"
        message="Un compte existe déjà avec cette adresse email. Connecte-toi, ou réinitialise ton mot de passe si tu l'as oublié."
        cancelLabel="Mot de passe oublié"
        confirmLabel="Se connecter"
        destructive={false}
        onCancel={() => {
          setExistingAccountModal(false);
          router.push({ pathname: "/auth/forgot-password", params: { email: email.trim() } });
        }}
        onConfirm={() => { setExistingAccountModal(false); router.replace("/auth/login"); }}
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
    alignItems: "center",
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    fontFamily: "DM_Sans_700Bold",
    fontSize: 16,
    color: "#fff",
  },
  hint: {
    fontFamily: "DM_Sans_400Regular",
    fontSize: 13,
    color: C.muted,
    textAlign: "center",
    marginTop: 32,
    lineHeight: 20,
  },
});
