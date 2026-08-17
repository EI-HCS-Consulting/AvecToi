import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet, Linking } from "react-native";
import { useRouter } from "expo-router";
import { useVisitorSpace } from "@/lib/VisitorContext";
import { getVisitorSession, VisitorSession } from "@/lib/visitorSession";
import { careLocationDetail, mapsUrlForSpace } from "@/lib/address";
import { toFrLong } from "@/lib/slotUtils";
import { supabase } from "@/lib/supabase";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import type { Reservation } from "@/lib/types";

// Popup affiché à un intervenant (avec compte) à chaque connexion à l'espace
// patient tant qu'il n'a pas réagi à un créneau que l'admin lui a réservé
// depuis "Ajouter une intervention" (voir AdminAddIntervention.handleSendConfirmation).
// Même mécanique qu'RebookingAlertModal (une alerte à la fois, cache locale
// hiddenId le temps de la navigation post-"Modifier"), mais filtrée sur
// intervenant_profile_id plutôt que sur pin+prénom+nom : la réservation porte
// toujours pin="ADMIN" côté book_intervention quand c'est l'admin qui réserve.
export default function BookingProposalAlertModal() {
  const { space, reservations, refreshReservations } = useVisitorSpace();
  const router = useRouter();
  const { theme: C } = useDisplayMode();
  const [mySession, setMySession] = useState<VisitorSession | null>(null);
  // Voir RebookingAlertModal : masque localement l'alerte qu'on vient
  // d'envoyer vers "Modifier"/"Voir mon planning", le temps que la
  // navigation/le rafraîchissement de `reservations` rattrape l'état réel.
  const [hiddenId, setHiddenId] = useState<string | null>(null);

  useEffect(() => {
    getVisitorSession().then(setMySession);
  }, []);

  const alerts = mySession && mySession.role === "intervenant" && mySession.intervenantProfileId
    ? reservations
        .filter((r) =>
          r.type === "Intervention"
          && r.alert_type === "booking_proposal"
          && !r.alert_seen
          && r.intervenant_profile_id === mySession.intervenantProfileId
          && r.id !== hiddenId,
        )
        .sort((a, b) => (a.date === b.date ? a.creneau.localeCompare(b.creneau) : a.date.localeCompare(b.date)))
    : [];
  const current: Reservation | undefined = alerts[0];

  const locationDetail = space ? careLocationDetail(space) : "";
  const mapsUrl = space ? mapsUrlForSpace(space) : null;

  async function handleAccept() {
    if (!current) return;
    await supabase.from("reservations").update({ alert_seen: true }).eq("id", current.id);
    await refreshReservations();
  }

  // "Voir mon planning" ne marque pas l'alerte comme vue — le popup doit
  // pouvoir réapparaître tant que l'intervenant n'a pas explicitement
  // accepté ou modifié le créneau proposé.
  function handleSeePlanning() {
    if (!current) return;
    setHiddenId(current.id);
    router.push("/(visitor)/home/calendar" as any);
  }

  async function handleModify() {
    if (!current) return;
    setHiddenId(current.id);
    await supabase.from("reservations").delete().eq("id", current.id);
    await refreshReservations();
    router.push("/(visitor)/home/calendar" as any);
  }

  if (!current) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={styles.emoji}>🩺</Text>
          <Text style={[styles.title, { color: C.text }]}>Créneau proposé</Text>
          <View style={[styles.detailBox, { borderColor: C.border }]}>
            <Text style={[styles.detailRow, { color: C.text }]}>
              📅 {toFrLong(new Date(current.date + "T12:00:00"))}
            </Text>
            <Text style={[styles.detailRow, { color: C.text }]}>
              🕐 {current.creneau}{current.duration_minutes ? ` (${current.duration_minutes} min)` : ""}
            </Text>
            {!!current.intervention_label && (
              <Text style={[styles.detailRow, { color: C.text }]}>💊 {current.intervention_label}</Text>
            )}
            {!!space && (
              <Text style={[styles.detailRow, { color: C.text }]}>
                🧑 {space.patient_firstname} {space.patient_lastname}
              </Text>
            )}
            {!!locationDetail && (
              <TouchableOpacity disabled={!mapsUrl} onPress={() => mapsUrl && Linking.openURL(mapsUrl).catch(() => {})}>
                <Text style={[styles.detailRow, { color: mapsUrl ? C.accent : C.text }]}>📍 {locationDetail}</Text>
              </TouchableOpacity>
            )}
          </View>
          {!!current.alert_message && (
            <Text style={[styles.body, { color: C.muted }]}>{current.alert_message}</Text>
          )}
          <TouchableOpacity
            style={[styles.planningBtn, { borderColor: C.border }]}
            onPress={handleSeePlanning}
            activeOpacity={0.85}
          >
            <Text style={[styles.planningBtnText, { color: C.text }]}>📆 Voir mon planning</Text>
          </TouchableOpacity>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary, { borderColor: C.border }]}
              onPress={handleModify}
              activeOpacity={0.85}
            >
              <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: C.accent }]}
              onPress={handleAccept}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryText}>Accepter</Text>
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
  detailBox: { width: "100%", borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 14, gap: 6 },
  detailRow: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  body: {
    fontFamily: "DM_Sans_400Regular",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 18,
  },
  planningBtn: { width: "100%", borderWidth: 1, borderRadius: 12, paddingVertical: 13, alignItems: "center", marginBottom: 14 },
  planningBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  row: { flexDirection: "row", gap: 10, width: "100%" },
  btn: { flex: 1, borderRadius: 12, paddingVertical: 15, alignItems: "center" },
  btnSecondary: { borderWidth: 1 },
  btnSecondaryText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  btnPrimaryText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
});
