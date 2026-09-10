import { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { themes } from "@/lib/themes";
import PinPad from "@/components/PinPad";
import { loginVisitorProfile, claimResetVisitorPin, hasVisitorEmailOnFile } from "@/lib/visitorProfile";
import { requestPinReset } from "@/lib/pinResetRequests";
import { saveVisitorSession } from "@/lib/visitorSession";
import { requestCoAdminCode, resetVisitorPinViaEmail } from "@/lib/coAdmin";

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
  // Demande de réinitialisation envoyée à l'admin (voir
  // supabase/migrations/20260901_pin_reset_requests.sql + PinResetAlertModal
  // / MyAlertsModal côté admin) pour un visiteur qui a oublié son code.
  const [pinRequestStatus, setPinRequestStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [pinRequestMsg, setPinRequestMsg] = useState("");

  // Email vérifié déjà en base pour ce prénom/nom (voir
  // lib/visitorProfile.ts, visitor_profiles.email) — seul cas où un reset de
  // code peut se faire sans passer par l'admin (email confirmé une première
  // fois via une proposition de relais, voir Entraide.tsx).
  const [hasEmailOnFile, setHasEmailOnFile] = useState(false);
  // Plus d'étape "email" : l'adresse est déjà en base, jamais ressaisie ni
  // révélée au client — on passe directement de "hidden" à "code" dès le
  // clic (voir handleResetSendCode).
  const [resetStep, setResetStep] = useState<"hidden" | "code" | "newpin">("hidden");
  const [resetCode, setResetCode] = useState("");
  const [resetNewPin, setResetNewPin] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");

  useEffect(() => {
    if (!prenom.trim() || !nom.trim()) {
      setHasEmailOnFile(false);
      return;
    }
    let cancelled = false;
    hasVisitorEmailOnFile(spaceId, prenom.trim(), nom.trim()).then((has) => {
      if (!cancelled) setHasEmailOnFile(has);
    });
    return () => { cancelled = true; };
  }, [spaceId, prenom, nom]);

  async function handleResetSendCode() {
    setResetStep("code");
    setResetLoading(true);
    setResetError("");
    const result = await requestCoAdminCode(spaceId, prenom.trim(), nom.trim(), null, "reset");
    setResetLoading(false);
    if (!result.ok) {
      setResetError(result.error);
      setResetStep("hidden");
    }
  }

  async function handleResetConfirm() {
    if (resetNewPin.length !== 4) return;
    setResetLoading(true);
    setResetError("");
    const result = await resetVisitorPinViaEmail(spaceId, prenom.trim(), nom.trim(), resetNewPin, resetCode);
    if (!result.ok) {
      setResetLoading(false);
      setResetError(result.error);
      return;
    }
    const row = await loginVisitorProfile(spaceId, prenom.trim(), nom.trim(), resetNewPin);
    setResetLoading(false);
    if (!row) {
      setResetError("Code réinitialisé, mais la connexion a échoué. Réessaie avec ton nouveau code ci-dessus.");
      return;
    }
    await saveVisitorSession({
      token, spaceId, prenom: row.prenom, nom: row.nom, pin: resetNewPin,
      motto: row.motto ?? "", relation: row.relation ?? "",
    });
    router.replace({ pathname: "/(visitor)/home/ma-semaine", params: { spaceId, token } });
  }

  const canSubmit = prenom.trim() && nom.trim() && pin.length === 4 && !loading;

  async function handleRequestPinReset() {
    if (!prenom.trim() || !nom.trim()) {
      setPinRequestMsg("Renseigne ton prénom et ton nom avant d'envoyer la demande.");
      return;
    }
    setPinRequestStatus("sending");
    setPinRequestMsg("");
    const result = await requestPinReset(spaceId, prenom.trim(), nom.trim());
    if (!result.ok) {
      setPinRequestStatus("error");
      setPinRequestMsg(
        result.reason === "not_found"
          ? "Aucun profil ne correspond à ce prénom/nom. Si c'est ta première visite, utilise \"Créer mon profil\" ci-dessus."
          : "Une erreur est survenue. Réessaie.",
      );
      return;
    }
    setPinRequestStatus("sent");
    setPinRequestMsg("Demande envoyée à l'administrateur. Reviens un peu plus tard pour recréer ton code.");
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setErrorMsg("");
    let row = await loginVisitorProfile(spaceId, prenom.trim(), nom.trim(), pin);
    // Si le login échoue et que le profil est en attente de réinitialisation
    // (pin remis à NULL par l'admin, voir handleRequestPinReset/PinResetAlertModal),
    // le code saisi ici devient directement le nouveau PIN — plus besoin de
    // repasser par l'écran "Créer mon profil" pour ça.
    if (!row) row = await claimResetVisitorPin(spaceId, prenom.trim(), nom.trim(), pin);
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
    router.replace({ pathname: "/(visitor)/home/ma-semaine", params: { spaceId, token } });
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

        <Text style={[styles.subtitle, styles.subtitleNoTitle]}>
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
          autoFocus
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

        {pinRequestStatus !== "sent" && (
          <TouchableOpacity
            style={styles.linkBtn}
            onPress={handleRequestPinReset}
            disabled={pinRequestStatus === "sending"}
            activeOpacity={0.7}
          >
            <Text style={styles.linkText}>
              {pinRequestStatus === "sending" ? "Envoi…" : "Code oublié ? Prévenir l'administrateur"}
            </Text>
          </TouchableOpacity>
        )}
        {!!pinRequestMsg && (
          <Text style={[styles.pinRequestMsg, pinRequestStatus === "error" && { color: C.danger }]}>
            {pinRequestMsg}
          </Text>
        )}

        {hasEmailOnFile && resetStep === "hidden" && (
          <>
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={handleResetSendCode}
              activeOpacity={0.7}
            >
              <Text style={styles.linkText}>🛡️ Réinitialiser mon code par email</Text>
            </TouchableOpacity>
            {!!resetError && <Text style={styles.errorText}>{resetError}</Text>}
          </>
        )}

        {resetStep === "code" && (
          <View style={styles.resetBox}>
            <Text style={styles.resetLabel}>
              {resetLoading ? "Envoi du code à ton adresse enregistrée…" : "Code reçu par email"}
            </Text>
            <PinPad value={resetCode} onChange={(v) => { setResetCode(v); setResetError(""); }} maxLength={6} theme={C} />
            {!!resetError && <Text style={styles.errorText}>{resetError}</Text>}
            <TouchableOpacity
              style={[styles.btn, (resetCode.length !== 6 || resetLoading) && styles.btnDisabled]}
              onPress={() => setResetStep("newpin")}
              disabled={resetCode.length !== 6 || resetLoading}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>Continuer</Text>
            </TouchableOpacity>
          </View>
        )}

        {resetStep === "newpin" && (
          <View style={styles.resetBox}>
            <Text style={styles.resetLabel}>Choisis ton nouveau code à 4 chiffres</Text>
            <PinPad value={resetNewPin} onChange={(v) => { setResetNewPin(v); setResetError(""); }} theme={C} />
            {!!resetError && <Text style={styles.errorText}>{resetError}</Text>}
            <TouchableOpacity
              style={[styles.btn, (resetNewPin.length !== 4 || resetLoading) && styles.btnDisabled]}
              onPress={handleResetConfirm}
              disabled={resetNewPin.length !== 4 || resetLoading}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>{resetLoading ? "Vérification…" : "Valider et se connecter"}</Text>
            </TouchableOpacity>
          </View>
        )}
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
  subtitle: {
    fontFamily: "DM_Sans_400Regular",
    fontSize: 14,
    color: C.muted,
    lineHeight: 20,
    marginBottom: 16,
  },
  subtitleNoTitle: {
    marginTop: 4,
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
  linkBtn: {
    alignItems: "center",
    marginTop: 16,
  },
  linkText: {
    fontFamily: "DM_Sans_400Regular",
    fontSize: 13,
    color: C.muted,
    textDecorationLine: "underline",
  },
  pinRequestMsg: {
    fontFamily: "DM_Sans_400Regular",
    fontSize: 13,
    color: C.text,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 18,
  },
  resetBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  resetLabel: {
    fontFamily: "DM_Sans_600SemiBold",
    fontSize: 13,
    color: C.text,
    marginBottom: 8,
    textAlign: "center",
  },
});
