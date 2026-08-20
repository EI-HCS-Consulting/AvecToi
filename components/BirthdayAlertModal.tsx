import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { toISO } from "@/lib/slotUtils";

// Popup "Joyeux anniversaire" affiché une fois par jour à tous les profils de
// l'espace patient (visiteur/intervenant/admin, voir montage dans
// (visitor)/_layout.tsx et (admin)/_layout.tsx), le jour de l'anniversaire du
// patient — ne compare que jour+mois (patient_birthdate garde l'année de
// naissance, pas l'année en cours). Dédoublonné localement via AsyncStorage
// (clé datée) plutôt que côté serveur : purement informatif, pas de ciblage
// par destinataire comme RelaisAlertModal.
export default function BirthdayAlertModal({ spaceId, birthdate, patientFirstname }: { spaceId: string; birthdate: string | null; patientFirstname: string }) {
  const { theme: C } = useDisplayMode();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!birthdate) return;
    const todayIso = toISO(new Date());
    const [, bm, bd] = birthdate.split("-");
    const [, tm, td] = todayIso.split("-");
    if (bm !== tm || bd !== td) return;
    const seenKey = `birthday_seen_${spaceId}_${todayIso}`;
    AsyncStorage.getItem(seenKey).then((seen) => {
      if (!seen) setVisible(true);
    });
  }, [spaceId, birthdate]);

  function handleClose() {
    setVisible(false);
    AsyncStorage.setItem(`birthday_seen_${spaceId}_${toISO(new Date())}`, "true");
  }

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={styles.emoji}>🎂</Text>
          <Text style={[styles.title, { color: C.text }]}>Joyeux anniversaire{patientFirstname ? ` ${patientFirstname}` : ""} !</Text>
          <Text style={[styles.body, { color: C.muted }]}>
            C'est aujourd'hui l'anniversaire de {patientFirstname || "votre proche"}. Un petit mot ou une pensée lui feront toujours plaisir 💛
          </Text>
          <TouchableOpacity style={[styles.btn, { backgroundColor: C.accent }]} onPress={handleClose} activeOpacity={0.85}>
            <Text style={styles.btnText}>Fermer</Text>
          </TouchableOpacity>
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
    maxWidth: 380,
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
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 22,
  },
  btn: { borderRadius: 12, paddingVertical: 15, width: "100%", alignItems: "center" },
  btnText: { fontFamily: "DM_Sans_700Bold", fontSize: 15, color: "#fff" },
});
