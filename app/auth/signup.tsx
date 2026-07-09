import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { themes } from "@/lib/themes";

const C = themes.blue;

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
      options: { data: { firstname: firstname.trim(), lastname: lastname.trim() } },
    });
    setLoading(false);

    if (error) {
      setErrorModal({ title: "Inscription impossible", message: error.message });
      return;
    }

    if (data.session) {
      // Email confirmation disabled on this project — straight into onboarding.
      router.replace("/(admin)/home/calendar");
    } else {
      // Email confirmation required — the admin tabs will pick up onboarding
      // automatically once they log back in with a confirmed account.
      setShowCreatedModal(true);
    }
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
          Tu pourras planifier jusqu'à 8 visites avant de passer en illimité.
        </Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Prénom"
            placeholderTextColor={C.muted}
            value={firstname}
            onChangeText={setFirstname}
            autoCapitalize="words"
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

      <Modal visible={showCreatedModal} transparent animationType="fade" onRequestClose={closeCreatedModal}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.accent }]}>
            <Text style={styles.sheetIcon}>✓</Text>
            <Text style={[styles.sheetTitle, { color: C.success }]}>Compte créé</Text>
            <Text style={[styles.sheetSub, { color: C.muted }]}>
              Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi.
            </Text>
            <TouchableOpacity style={[styles.sheetBtn, { backgroundColor: C.accent }]} onPress={closeCreatedModal} activeOpacity={0.85}>
              <Text style={styles.sheetBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!errorModal} transparent animationType="fade" onRequestClose={() => setErrorModal(null)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.danger }]}>
            <Text style={styles.sheetIcon}>⚠️</Text>
            <Text style={[styles.sheetTitle, { color: "#fff" }]}>{errorModal?.title}</Text>
            <Text style={[styles.sheetSub, { color: C.muted }]}>{errorModal?.message}</Text>
            <TouchableOpacity style={[styles.sheetBtn, { backgroundColor: C.danger }]} onPress={() => setErrorModal(null)} activeOpacity={0.85}>
              <Text style={styles.sheetBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "center", alignItems: "center", padding: 24 },
  sheet: { width: "100%", maxWidth: 380, borderRadius: 20, borderWidth: 1, padding: 24, alignItems: "center" },
  sheetIcon: { fontSize: 32, marginBottom: 8 },
  sheetTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, textAlign: "center", marginBottom: 6 },
  sheetSub: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center", lineHeight: 20 },
  sheetBtn: { borderRadius: 10, paddingVertical: 13, paddingHorizontal: 32, alignItems: "center", marginTop: 20 },
  sheetBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 15, color: "#fff" },
});
