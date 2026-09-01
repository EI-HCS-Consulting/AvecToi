import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator } from "react-native";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { fetchOpenPinResetRequests, markPinResetRequestSeen, resolvePinResetRequest, type PinResetRequest } from "@/lib/pinResetRequests";
import { adminResetVisitorPin } from "@/lib/visitorProfile";

// Popup affiché à la connexion admin (voir montage dans (admin)/_layout.tsx),
// même principe que RelaisAlertModal : un visiteur qui n'arrive plus à se
// connecter (écran "Qui êtes-vous ?", app/auth/visitor-identify.tsx) peut
// demander une réinitialisation de son code — l'admin la déclenche en un
// clic (rpc_admin_reset_visitor_pin), le visiteur récupère ensuite son
// profil en choisissant un nouveau code via l'écran de création existant.
export default function PinResetAlertModal({ spaceId }: { spaceId: string }) {
  const { theme: C } = useDisplayMode();
  const [requests, setRequests] = useState<PinResetRequest[]>([]);
  const [acting, setActing] = useState(false);
  // Même principe que RelaisAlertModal.sessionHiddenIds : "plus tard" ne
  // doit pas faire disparaître la demande définitivement, seulement pour
  // cette session d'app — elle reste consultable dans "Mes alertes" et
  // revient au prochain lancement.
  const [sessionHiddenIds, setSessionHiddenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchOpenPinResetRequests(spaceId).then(setRequests);
  }, [spaceId]);

  const alerts = requests.filter((r) => !sessionHiddenIds.has(r.id));
  const current = alerts[0];

  async function handleReset() {
    if (!current) return;
    setActing(true);
    const ok = await adminResetVisitorPin(spaceId, current.visitor_id);
    if (ok) await resolvePinResetRequest(current.id);
    setRequests((prev) => prev.filter((r) => r.id !== current.id));
    setActing(false);
  }

  async function handleIgnore() {
    if (!current) return;
    setActing(true);
    await markPinResetRequestSeen(current.id);
    setRequests((prev) => prev.filter((r) => r.id !== current.id));
    setActing(false);
  }

  function handleLater() {
    if (!current) return;
    setSessionHiddenIds((prev) => new Set(prev).add(current.id));
  }

  if (!current) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={styles.emoji}>🔑</Text>
          <Text style={[styles.title, { color: C.text }]}>Réinitialisation demandée</Text>
          <Text style={[styles.body, { color: C.muted }]}>
            {current.prenom} {current.nom} n'arrive plus à se connecter et demande la
            réinitialisation de son code.
          </Text>
          <TouchableOpacity
            style={[styles.btnFull, { backgroundColor: C.accent }, acting && { opacity: 0.6 }]}
            onPress={handleReset}
            disabled={acting}
            activeOpacity={0.85}
          >
            {acting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnPrimaryText}>Réinitialiser le code</Text>}
          </TouchableOpacity>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary, { borderColor: C.border }]}
              onPress={handleIgnore}
              disabled={acting}
              activeOpacity={0.85}
            >
              <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Ignorer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary, { borderColor: C.border }]}
              onPress={handleLater}
              disabled={acting}
              activeOpacity={0.85}
            >
              <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Plus tard</Text>
            </TouchableOpacity>
          </View>
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
  row: { flexDirection: "row", gap: 10, width: "100%" },
  btn: { flex: 1, borderRadius: 12, paddingVertical: 15, alignItems: "center" },
  btnFull: { width: "100%", borderRadius: 12, paddingVertical: 15, alignItems: "center", marginBottom: 10 },
  btnSecondary: { borderWidth: 1 },
  btnSecondaryText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14, textAlign: "center" },
  btnPrimaryText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff", textAlign: "center" },
});
