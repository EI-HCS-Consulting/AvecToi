import { useRef, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSpace } from "@/lib/SpaceContext";
import { supabase } from "@/lib/supabase";
import { findNextAvailableNight, isReservationDatePast, toFrLong, nightStartSlot } from "@/lib/slotUtils";
import { deleteLinkedCalendarEvent } from "@/lib/calendarSync";
import { themes } from "@/lib/themes";
import SpaceHeader from "@/components/SpaceHeader";
import AdminAddReservation, { type AdminAddReservationHandle } from "@/components/AdminAddReservation";
import AdminEditReservation, { type AdminEditReservationHandle } from "@/components/AdminEditReservation";
import DeleteReservationConfirm, { type DeleteReservationConfirmHandle } from "@/components/DeleteReservationConfirm";
import type { Reservation } from "@/lib/types";

export default function AdminNightsScreen() {
  const { space, slotConfig, reservations, hasSpace, refreshReservations } = useSpace();
  const { focusDate } = useLocalSearchParams<{ focusDate?: string }>();
  const C = themes[space?.theme ?? "blue"];
  const addRef = useRef<AdminAddReservationHandle>(null);
  const editRef = useRef<AdminEditReservationHandle>(null);
  const deleteRef = useRef<DeleteReservationConfirmHandle>(null);

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const startDate = space ? new Date(space.start_date + "T00:00:00") : today;

  const [toast, setToast] = useState("");
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  if (!hasSpace || !space || !slotConfig) return null;

  const allNightReservations = reservations.filter((r): r is Reservation => r.type === "Nuit");
  // Programmées : à venir, la plus proche en premier.
  const upcomingNights = allNightReservations
    .filter((r) => !isReservationDatePast(r.date))
    .sort((a, b) => a.date.localeCompare(b.date));
  // Effectuées : passées, la plus récente en premier.
  const pastNights = allNightReservations
    .filter((r) => isReservationDatePast(r.date))
    .sort((a, b) => b.date.localeCompare(a.date));

  function handleReserveNext() {
    const next = findNextAvailableNight(reservations, slotConfig!, startDate);
    if (!next) {
      Alert.alert("Aucune disponibilité", "Aucune nuitée libre dans les 90 prochains jours.");
      return;
    }
    addRef.current?.open(next.iso, nightStartSlot(slotConfig!), "Nuit", 1);
  }

  function handleEdit(r: Reservation) {
    editRef.current?.open(r);
  }

  function handleDelete(r: Reservation) {
    deleteRef.current?.open(r);
  }

  async function handleAckAlert(r: Reservation) {
    await supabase.from("reservations").update({ alert_seen: true }).eq("id", r.id);
    await refreshReservations();
  }

  async function handleConfirmDelete(ids: string[]) {
    const { error, count } = await supabase.from("reservations").delete({ count: "exact" }).in("id", ids);
    if (error || count !== ids.length) {
      showToast("Erreur : suppression non enregistrée en base.");
      return;
    }
    await deleteLinkedCalendarEvent(ids[0]);
    await refreshReservations();
    showToast(ids.length > 1 ? "Nuitées supprimées ✓" : "Nuitée supprimée ✓");
  }

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <SpaceHeader space={space} active="nights" basePath="/(admin)/home" C={C} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {!slotConfig.night_enabled && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>🌙</Text>
            <Text style={[styles.emptyText, { color: C.muted }]}>
              Les nuitées sont suspendues. Réactive-les depuis Compte → Paramètres.
            </Text>
          </View>
        )}

        {slotConfig.night_enabled && (
          <TouchableOpacity style={[styles.reserveNextBtn, { backgroundColor: C.gold }]} onPress={handleReserveNext} activeOpacity={0.85}>
            <Text style={styles.reserveNextBtnText}>Prochaine nuitée disponible</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.sectionTitle, { color: C.gold }]}>Nuitées programmées</Text>

        {upcomingNights.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 32, marginBottom: 10 }}>🌙</Text>
            <Text style={[styles.emptyText, { color: C.muted }]}>Aucune nuitée programmée pour l'instant.</Text>
          </View>
        ) : (
          upcomingNights.map((r) => (
            <View key={r.id} style={[styles.nightCard, { backgroundColor: C.card, borderColor: r.date === focusDate ? C.accent : C.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.nightDate, { color: "#fff" }]}>{toFrLong(new Date(r.date + "T12:00:00"))}</Text>
                <Text style={[styles.nightVisitor, { color: C.success }]}>● {r.prenom} {r.nom}</Text>
                {(r.booked_by_prenom || r.booked_by_nom) ? (
                  <Text style={[styles.bookedBy, { color: C.muted }]}>Programmé par : {r.booked_by_prenom} {r.booked_by_nom}</Text>
                ) : null}
                {r.telephone ? <Text style={[styles.nightTel, { color: C.muted }]}>{r.telephone}</Text> : null}
                {r.alert_message ? (
                  <View style={[styles.alertBanner, { backgroundColor: "rgba(233,69,96,0.12)", borderColor: "rgba(233,69,96,0.4)" }]}>
                    <Text style={[styles.alertText, { color: C.danger }]}>{r.alert_message}</Text>
                    {r.pin === "ADMIN" && !r.alert_seen && (
                      <TouchableOpacity style={[styles.ackBtn, { borderColor: C.danger }]} onPress={() => handleAckAlert(r)}>
                        <Text style={[styles.ackBtnText, { color: C.danger }]}>Vu, relayé ✓</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : null}
              </View>
              <TouchableOpacity style={[styles.editBtn, { borderColor: C.border }]} onPress={() => handleEdit(r)}>
                <Text style={[styles.editBtnText, { color: C.muted }]}>Modifier</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <Text style={[styles.sectionTitle, { color: C.gold, marginTop: 24 }]}>Nuitées effectuées</Text>

        {pastNights.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 32, marginBottom: 10 }}>🌙</Text>
            <Text style={[styles.emptyText, { color: C.muted }]}>Aucune nuitée effectuée pour l'instant.</Text>
          </View>
        ) : (
          pastNights.map((r) => (
            <View key={r.id} style={[styles.nightCard, { backgroundColor: C.card, borderColor: r.date === focusDate ? C.accent : C.border, opacity: 0.7 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.nightDate, { color: "#fff" }]}>{toFrLong(new Date(r.date + "T12:00:00"))}</Text>
                <Text style={[styles.nightVisitor, { color: C.success }]}>● {r.prenom} {r.nom}</Text>
                {(r.booked_by_prenom || r.booked_by_nom) ? (
                  <Text style={[styles.bookedBy, { color: C.muted }]}>Programmé par : {r.booked_by_prenom} {r.booked_by_nom}</Text>
                ) : null}
                {r.telephone ? <Text style={[styles.nightTel, { color: C.muted }]}>{r.telephone}</Text> : null}
                {r.alert_message ? (
                  <View style={[styles.alertBanner, { backgroundColor: "rgba(233,69,96,0.12)", borderColor: "rgba(233,69,96,0.4)" }]}>
                    <Text style={[styles.alertText, { color: C.danger }]}>{r.alert_message}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <AdminAddReservation
        ref={addRef}
        spaceId={space.id}
        space={space}
        slotConfig={slotConfig}
        reservations={reservations}
        onAdded={async () => { await refreshReservations(); showToast("Nuitée ajoutée ✓"); }}
        C={C}
      />

      <AdminEditReservation
        ref={editRef}
        onSaved={async () => { await refreshReservations(); showToast("Nuitée modifiée ✓"); }}
        onDelete={handleDelete}
        C={C}
      />

      <DeleteReservationConfirm
        ref={deleteRef}
        reservations={reservations}
        onConfirm={handleConfirmDelete}
        C={C}
      />

      {!!toast && (
        <View style={[styles.toast, { backgroundColor: C.success }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32 },

  reserveNextBtn: { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, alignItems: "center", marginBottom: 24 },
  reserveNextBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#0D1B2E", textAlign: "center" },

  sectionTitle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 },

  nightCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  nightDate: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 15, textTransform: "capitalize", marginBottom: 4 },
  nightVisitor: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },
  bookedBy: { fontFamily: "DM_Sans_400Regular", fontSize: 11, fontStyle: "italic", marginTop: 2 },
  nightTel: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },
  editBtn: { borderWidth: 1, borderRadius: 7, paddingVertical: 6, paddingHorizontal: 10 },
  editBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },

  alertBanner: { borderWidth: 1, borderRadius: 8, padding: 8, marginTop: 8 },
  alertText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, lineHeight: 16 },
  ackBtn: { borderWidth: 1, borderRadius: 7, paddingVertical: 5, paddingHorizontal: 10, alignSelf: "flex-start", marginTop: 6 },
  ackBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 11 },

  empty: { alignItems: "center", paddingVertical: 32 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 14, textAlign: "center", lineHeight: 21 },

  toast: { position: "absolute", bottom: 24, alignSelf: "center", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  toastText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, color: "#fff" },
});
