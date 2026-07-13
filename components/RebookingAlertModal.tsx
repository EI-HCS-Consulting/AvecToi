import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useVisitorSpace } from "@/lib/VisitorContext";
import { getVisitorSession } from "@/lib/visitorSession";
import { updateLinkedCalendarEvent } from "@/lib/calendarSync";
import { supabase } from "@/lib/supabase";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import type { Reservation } from "@/lib/types";

// Popup affiché à l'ouverture de l'app quand une ou plusieurs réservations
// de ce visiteur (identifié par son PIN d'appareil, même mécanisme que la
// modale de consentement dans _layout.tsx) ont été recasées ou annulées par
// un changement de règles de visite admin (voir apply_slot_rule_change).
// Une alerte à la fois — la suivante apparaît une fois celle-ci traitée.
export default function RebookingAlertModal() {
  const { space, slotConfig, reservations, setSelectedDay, setPendingEditReservationId, refreshReservations } = useVisitorSpace();
  const router = useRouter();
  const { theme: C } = useDisplayMode();
  const [myPin, setMyPin] = useState<string | null>(null);

  useEffect(() => {
    getVisitorSession().then((s) => setMyPin(s?.pin ?? null));
  }, []);

  const alerts = myPin
    ? reservations.filter((r) => r.pin === myPin && r.alert_message && !r.alert_seen)
    : [];
  const current: Reservation | undefined = alerts[0];

  async function markSeen(r: Reservation) {
    await supabase.from("reservations").update({ alert_seen: true }).eq("id", r.id);
    // Nuitée annulée : affichage et créneau inchangés, aucune synchro à faire.
    if (r.alert_type === "rebooked" && slotConfig) {
      await updateLinkedCalendarEvent(r.id, r.date, r.creneau, r.type, slotConfig);
    }
    await refreshReservations();
  }

  function handleModify() {
    if (!current) return;
    setPendingEditReservationId(current.id);
    if (current.type === "Nuit") {
      router.push("/(visitor)/home/nights" as any);
    } else {
      setSelectedDay(new Date(current.date + "T12:00:00"));
      router.push("/(visitor)/home/slots" as any);
    }
  }

  if (!current) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={styles.emoji}>📅</Text>
          <Text style={[styles.title, { color: C.text }]}>Changement de réservation</Text>
          <Text style={[styles.body, { color: C.muted }]}>{current.alert_message}</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary, { borderColor: C.border }]}
              onPress={() => markSeen(current)}
              activeOpacity={0.85}
            >
              <Text style={[styles.btnSecondaryText, { color: C.muted }]}>OK, j'ai compris</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: C.accent }]}
              onPress={handleModify}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryText}>Modifier</Text>
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
  btnPrimaryText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
});
