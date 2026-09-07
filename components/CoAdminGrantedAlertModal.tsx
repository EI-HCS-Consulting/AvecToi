import { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { getVisitorSession, VisitorSession } from "@/lib/visitorSession";
import { checkCoAdminStatus, requestCoAdminCode, acceptCoAdminInvite } from "@/lib/coAdmin";
import PinPad from "@/components/PinPad";

// Popup affiché côté visiteur quand l'admin d'origine l'a désigné
// co-administrateur temporaire (voir app/(admin)/coadmins.tsx côté admin).
// Même principe "plus tard" que RelaisAlertModal/PinResetAlertModal : refusé
// pour cette session d'app seulement, jamais persisté — l'invitation reste en
// attente et reviendra au prochain lancement tant qu'elle n'est ni acceptée
// ni révoquée.
//
// L'email demandé ici est vérifié par code (Edge Function
// send-coadmin-verification-code) avant de finaliser l'acceptation : c'est
// lui qui permettra ensuite au co-admin de réinitialiser lui-même son code
// (PIN) par email si besoin, sans dépendre de l'admin d'origine — voir
// "🛡️ Réinitialiser mon code par email" sur app/auth/visitor-identify.tsx.
export default function CoAdminGrantedAlertModal({ spaceId }: { spaceId: string }) {
  const { theme: C } = useDisplayMode();
  const router = useRouter();
  const [session, setSession] = useState<VisitorSession | null>(null);
  const [pending, setPending] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [step, setStep] = useState<"intro" | "email" | "code">("intro");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getVisitorSession().then(setSession);
  }, []);

  useEffect(() => {
    if (!session?.prenom || !session?.nom) return;
    checkCoAdminStatus(spaceId, session.prenom, session.nom).then((status) => {
      setPending(status === "pending");
    });
  }, [spaceId, session?.prenom, session?.nom]);

  if (!session || !pending || dismissed) return null;

  async function handleSendCode() {
    if (!email.trim() || !session) return;
    setLoading(true);
    setError("");
    const result = await requestCoAdminCode(spaceId, session.prenom, session.nom, email.trim(), "accept");
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStep("code");
  }

  async function handleConfirmCode() {
    if (code.length !== 6 || !session) return;
    setLoading(true);
    setError("");
    const result = await acceptCoAdminInvite(spaceId, session.prenom, session.nom, session.pin, email.trim(), code);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.replace("/(admin)/home/calendar" as any);
  }

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          {step === "intro" && (
            <>
              <Text style={styles.emoji}>🛡️</Text>
              <Text style={[styles.title, { color: C.text }]}>Co-administration temporaire</Text>
              <Text style={[styles.body, { color: C.muted }]}>
                L'administrateur t'a désigné co-administrateur temporaire pendant son absence. Tu
                pourras gérer le planning, les soins et les besoins de l'espace — l'administrateur
                garde un accès complet et peut reprendre la main à tout moment.
              </Text>
              <TouchableOpacity
                style={[styles.btnFull, { backgroundColor: C.accent }]}
                onPress={() => setStep("email")}
                activeOpacity={0.85}
              >
                <Text style={styles.btnPrimaryText}>Devenir co-administrateur</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary, { borderColor: C.border }]}
                onPress={() => setDismissed(true)}
                activeOpacity={0.85}
              >
                <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Plus tard</Text>
              </TouchableOpacity>
            </>
          )}

          {step === "email" && (
            <>
              <Text style={styles.emoji}>✉️</Text>
              <Text style={[styles.title, { color: C.text }]}>Confirme ton adresse email</Text>
              <Text style={[styles.body, { color: C.muted }]}>
                Elle te permettra, le cas échéant, de réinitialiser toi-même ton code d'accès sans
                déranger l'administrateur.
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                placeholder="Adresse email"
                placeholderTextColor={C.muted}
                value={email}
                onChangeText={(v) => { setEmail(v); setError(""); }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoFocus
              />
              {!!error && <Text style={[styles.errorText, { color: C.danger }]}>{error}</Text>}
              <TouchableOpacity
                style={[styles.btnFull, { backgroundColor: C.accent }, (!email.trim() || loading) && { opacity: 0.5 }]}
                onPress={handleSendCode}
                disabled={!email.trim() || loading}
                activeOpacity={0.85}
              >
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnPrimaryText}>Recevoir un code</Text>}
              </TouchableOpacity>
            </>
          )}

          {step === "code" && (
            <>
              <Text style={styles.emoji}>🔢</Text>
              <Text style={[styles.title, { color: C.text }]}>Code reçu par email</Text>
              <Text style={[styles.body, { color: C.muted }]}>
                Saisis le code à 6 chiffres envoyé à {email.trim()}.
              </Text>
              <PinPad value={code} onChange={(v) => { setCode(v); setError(""); }} maxLength={6} theme={C} hasError={!!error} />
              {!!error && <Text style={[styles.errorText, { color: C.danger }]}>{error}</Text>}
              <TouchableOpacity
                style={[styles.btnFull, { backgroundColor: C.accent }, (code.length !== 6 || loading) && { opacity: 0.5 }]}
                onPress={handleConfirmCode}
                disabled={code.length !== 6 || loading}
                activeOpacity={0.85}
              >
                {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnPrimaryText}>Confirmer</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", maxWidth: 380, borderRadius: 20, borderWidth: 1, padding: 28, alignItems: "center" },
  emoji: { fontSize: 44, marginBottom: 16 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, marginBottom: 14, textAlign: "center" },
  body: { fontFamily: "DM_Sans_400Regular", fontSize: 14, lineHeight: 22, textAlign: "center", marginBottom: 18 },
  input: { width: "100%", borderWidth: 1, borderRadius: 10, padding: 12, fontFamily: "DM_Sans_400Regular", fontSize: 15, marginBottom: 10 },
  errorText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center", marginBottom: 10 },
  btn: { width: "100%", borderRadius: 12, paddingVertical: 15, alignItems: "center" },
  btnFull: { width: "100%", borderRadius: 12, paddingVertical: 15, alignItems: "center", marginBottom: 10 },
  btnSecondary: { borderWidth: 1 },
  btnSecondaryText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14, textAlign: "center" },
  btnPrimaryText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff", textAlign: "center" },
});
