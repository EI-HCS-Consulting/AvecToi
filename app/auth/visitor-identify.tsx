import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { themes } from "@/lib/themes";
import PinPad from "@/components/PinPad";
import { loginVisitorProfile, claimResetVisitorPin } from "@/lib/visitorProfile";
import { requestPinReset } from "@/lib/pinResetRequests";
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
  // Demande de réinitialisation envoyée à l'admin (voir
  // supabase/migrations/20260901_pin_reset_requests.sql + PinResetAlertModal
  // / MyAlertsModal côté admin) pour un visiteur qui a oublié son code.
  const [pinRequestStatus, setPinRequestStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [pinRequestMsg, setPinRequestMsg] = useState("");

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
});
