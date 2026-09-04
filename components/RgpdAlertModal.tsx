import { useState } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet, Linking } from "react-native";
import { useSpace } from "@/lib/SpaceContext";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { isRgpdAlertActive, rgpdAlertMessage, prolongSpace, RGPD_EXTENSION_DAYS } from "@/lib/rgpd";
import { canProlongSpace } from "@/lib/freemiumCap";

// Popup affiché à l'ouverture de l'app admin quand la date de conservation
// RGPD de l'espace (purge_scheduled_at) tombe dans les 7 prochains jours —
// complète l'alerte email J-7 (supabase/functions/rgpd-purge/index.ts) qui
// ne part que si RESEND_API_KEY est configurée côté Edge Function (voir
// REFLEXION_SITE_VERCEL_ET_RGPD.md : un espace patient a déjà été purgé sans
// que l'admin soit prévenu). Pas de champ "vu" en base : réapparaît à chaque
// ouverture d'app tant que la fenêtre de 7 jours n'est pas passée — se
// résout naturellement en prolongeant (repasse hors fenêtre) ou en fermant
// pour cette session (state local, pas persistant).
export default function RgpdAlertModal() {
  const { space, patchSpace } = useSpace();
  const { theme: C } = useDisplayMode();
  const [dismissed, setDismissed] = useState(false);
  const [prolonging, setProlonging] = useState(false);

  if (!space || dismissed || !isRgpdAlertActive(space)) return null;

  async function handleProlong() {
    if (!space) return;
    if (!canProlongSpace(space)) {
      Linking.openURL("https://avectoi.care");
      return;
    }
    setProlonging(true);
    const patch = await prolongSpace(space);
    setProlonging(false);
    if (patch) {
      patchSpace(patch);
      setDismissed(true);
    }
  }

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={styles.emoji}>🗄️</Text>
          <Text style={[styles.title, { color: C.text }]}>Conservation des données</Text>
          <Text style={[styles.body, { color: C.muted }]}>{rgpdAlertMessage(space)}</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary, { borderColor: C.border }]}
              onPress={() => setDismissed(true)}
              activeOpacity={0.85}
            >
              <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Plus tard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: C.accent }, prolonging && { opacity: 0.6 }]}
              onPress={handleProlong}
              disabled={prolonging}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryText}>
                {canProlongSpace(space) ? `Prolonger de ${RGPD_EXTENSION_DAYS} jours` : "Passer en Premium"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
  },
  emoji: { fontSize: 44, marginBottom: 16 },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 20,
    marginBottom: 14,
    textAlign: "center",
  },
  body: {
    fontFamily: "DM_Sans_400Regular",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 28,
  },
  row: { flexDirection: "row", gap: 10, width: "100%" },
  btn: { flex: 1, borderRadius: 12, paddingVertical: 15, alignItems: "center" },
  btnSecondary: { borderWidth: 1 },
  btnSecondaryText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  btnPrimaryText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff", textAlign: "center" },
});
