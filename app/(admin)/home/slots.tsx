import { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSpace } from "@/lib/SpaceContext";
import { supabase } from "@/lib/supabase";
import { getSlotOccupancy, getNightReservation, isReservationDatePast, toISO, toFrLong, toFrShort, addDays, nightStartSlot, nightRangeLabel } from "@/lib/slotUtils";
import { deleteLinkedCalendarEvent } from "@/lib/calendarSync";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import SpaceHeader from "@/components/SpaceHeader";
import AdminAddReservation, { type AdminAddReservationHandle } from "@/components/AdminAddReservation";
import AdminEditReservation, { type AdminEditReservationHandle } from "@/components/AdminEditReservation";
import AdminReservationDetail, { type AdminReservationDetailHandle } from "@/components/AdminReservationDetail";
import DeleteReservationConfirm, { type DeleteReservationConfirmHandle } from "@/components/DeleteReservationConfirm";
import AdminSlotsList from "@/components/AdminSlotsList";
import { isSpaceCapped } from "@/lib/freemiumCap";
import type { Reservation } from "@/lib/types";

// Recentré sur les créneaux "Visite" uniquement depuis le Lot 3 — la nuitée
// a son propre écran (home/nights.tsx).
export default function AdminSlotsScreen() {
  const {
    space, slotConfig, reservations, selectedDay, setSelectedDay, refreshReservations,
    pendingBookingSlot, setPendingBookingSlot, getConfigForDate,
    pendingEditReservationId, setPendingEditReservationId,
  } = useSpace();
  const { focusDate } = useLocalSearchParams<{ focusDate?: string }>();
  const { theme: C } = useDisplayMode();
  const addRef = useRef<AdminAddReservationHandle>(null);
  const editRef = useRef<AdminEditReservationHandle>(null);
  const detailRef = useRef<AdminReservationDetailHandle>(null);
  const deleteRef = useRef<DeleteReservationConfirmHandle>(null);

  const startDate = space ? new Date(space.start_date + "T00:00:00") : new Date();

  const [toast, setToast] = useState("");
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  // Arrivée via "Prochaine disponibilité → Ajouter" (Calendrier) : ouvre
  // directement la modale d'ajout sur le créneau ciblé.
  useEffect(() => {
    if (pendingBookingSlot && slotConfig) {
      const occ = getSlotOccupancy(reservations, toISO(selectedDay), pendingBookingSlot);
      addRef.current?.open(toISO(selectedDay), pendingBookingSlot, "Visite", slotConfig.max_visitors_per_slot - occ.length);
      setPendingBookingSlot(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Arrivée via "Mon compte → Mes réservations" : ouvre le jour de la
  // réservation ciblée, même si sa date est passée.
  useEffect(() => {
    if (focusDate) setSelectedDay(new Date(focusDate + "T00:00:00"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusDate]);

  // Rouvre l'étape "détail" (même enchaînement que côté visiteur) sur la
  // réservation ciblée depuis "Mon compte → Mes réservations" — même
  // mécanisme que côté visiteur (VisitorContext.pendingEditReservationId).
  useEffect(() => {
    if (!pendingEditReservationId) return;
    const r = reservations.find((x) => x.id === pendingEditReservationId);
    if (!r) return;
    // Filet de sécurité : une réservation passée n'est plus modifiable, même
    // via ce mécanisme de lien profond — on reste juste sur le jour.
    if (!isReservationDatePast(r.date)) detailRef.current?.open(r);
    setPendingEditReservationId(null);
  }, [pendingEditReservationId, reservations, setPendingEditReservationId]);

  function handleDeleteResa(r: Reservation) {
    deleteRef.current?.open(r);
  }

  async function handleConfirmDelete(ids: string[]) {
    const { error, count } = await supabase.from("reservations").delete({ count: "exact" }).in("id", ids);
    if (error || count !== ids.length) {
      showToast("Erreur : suppression non enregistrée en base.");
      return;
    }
    await deleteLinkedCalendarEvent(ids[0]);
    await refreshReservations();
    showToast(ids.length > 1 ? "Réservations supprimées ✓" : "Réservation supprimée ✓");
  }

  if (!space || !slotConfig) return null;

  const capped = isSpaceCapped(space, reservations);
  const iso = toISO(selectedDay);
  const dayIsPast = iso < toISO(new Date());
  const dayConfig = getConfigForDate(iso) ?? slotConfig;

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <SpaceHeader space={space} active="slots" basePath="/(admin)/home" C={C} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.dayNav, { backgroundColor: C.card, borderColor: C.border }]}>
          <TouchableOpacity
            onPress={() => {
              const prev = addDays(selectedDay, -1);
              if (prev >= startDate) setSelectedDay(prev);
            }}
            disabled={toISO(selectedDay) === toISO(startDate)}
            style={[styles.navBtn, { borderColor: C.border }]}
          >
            <Text style={[styles.navBtnText, { color: C.text }]}>‹</Text>
          </TouchableOpacity>
          <View style={{ alignItems: "center" }}>
            <Text style={[styles.dayTitle, { color: C.text }]}>{toFrLong(selectedDay)}</Text>
            <Text style={[styles.daySub, { color: C.muted }]}>{toFrShort(selectedDay)}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setSelectedDay(addDays(selectedDay, 1))}
            style={[styles.navBtn, { borderColor: C.border }]}
          >
            <Text style={[styles.navBtnText, { color: C.text }]}>›</Text>
          </TouchableOpacity>
        </View>

        <AdminSlotsList
          iso={iso}
          reservations={reservations}
          C={C}
          dayIsPast={dayIsPast}
          capped={capped}
          onAdd={(slot, maxAdditional) => addRef.current?.open(iso, slot, "Visite", maxAdditional)}
          onEdit={(r) => editRef.current?.open(r)}
          onAckAlert={async (rs) => { await supabase.from("reservations").update({ alert_seen: true }).in("id", rs.map((r) => r.id)); await refreshReservations(); }}
        />

        {dayConfig?.night_enabled && (() => {
          const nightResa = getNightReservation(reservations, iso);
          return (
            <View style={[styles.slotCard, { backgroundColor: C.card, borderColor: nightResa ? "rgba(233,69,96,0.3)" : C.border }]}>
              <View style={styles.slotHeader}>
                <Text style={[styles.slotTime, { color: C.gold }]}>🌙 Nuitée</Text>
                {!nightResa && !dayIsPast && (
                  <TouchableOpacity
                    style={[styles.addResaBtn, { backgroundColor: C.accent }]}
                    onPress={() => addRef.current?.open(iso, nightStartSlot(dayConfig), "Nuit", 1)}
                  >
                    <Text style={styles.addResaBtnText}>Réserver</Text>
                  </TouchableOpacity>
                )}
                {nightResa && <Text style={[styles.fullTag, { color: C.danger }]}>Occupée</Text>}
              </View>
              <Text style={[styles.slotCount, { color: C.muted, marginBottom: 8 }]}>{nightRangeLabel(dayConfig)}</Text>
              {!nightResa ? (
                <Text style={[styles.slotEmpty, { color: C.muted }]}>Aucun visiteur inscrit</Text>
              ) : (
                <View style={[styles.resaRow, { borderColor: C.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.resaName, { color: C.success }]}>● {nightResa.prenom} {nightResa.nom}</Text>
                    {(nightResa.booked_by_prenom || nightResa.booked_by_nom) ? (
                      <Text style={[styles.bookedBy, { color: C.muted }]}>Programmé par : {nightResa.booked_by_prenom} {nightResa.booked_by_nom}</Text>
                    ) : null}
                    {nightResa.telephone ? <Text style={[styles.resaTel, { color: C.muted }]}>{nightResa.telephone}</Text> : null}
                  </View>
                  {!dayIsPast && (
                    <TouchableOpacity
                      style={[styles.deleteResaBtn, { borderColor: "rgba(233,69,96,0.4)" }]}
                      onPress={() => handleDeleteResa(nightResa)}
                    >
                      <Text style={{ color: "#e94560", fontSize: 13 }}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })()}
      </ScrollView>

      <AdminAddReservation
        ref={addRef}
        spaceId={space.id}
        space={space}
        slotConfig={slotConfig}
        reservations={reservations}
        onAdded={async () => { await refreshReservations(); showToast("Réservation ajoutée ✓"); }}
        C={C}
      />

      <AdminEditReservation
        ref={editRef}
        onSaved={async () => { await refreshReservations(); showToast("Réservation modifiée ✓"); }}
        onDelete={handleDeleteResa}
        C={C}
      />

      <AdminReservationDetail
        ref={detailRef}
        space={space}
        slotConfig={slotConfig}
        onEdit={(r) => editRef.current?.open(r)}
        onDelete={handleDeleteResa}
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
  dayNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  navBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 },
  navBtnText: { fontSize: 18, fontWeight: "600" },
  dayTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 16, textTransform: "capitalize" },
  daySub: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },

  slotCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  slotHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  slotTime: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, flex: 1 },
  slotCount: { fontFamily: "DM_Sans_400Regular", fontSize: 12 },
  slotEmpty: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },
  fullTag: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
  addResaBtn: { borderRadius: 7, paddingVertical: 6, paddingHorizontal: 10 },
  addResaBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 12, color: "#fff" },
  resaRow: { flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, paddingTop: 8, marginTop: 6 },
  resaName: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  bookedBy: { fontFamily: "DM_Sans_400Regular", fontSize: 11, fontStyle: "italic", marginTop: 2 },
  resaTel: { fontFamily: "DM_Sans_400Regular", fontSize: 11, marginTop: 2 },
  deleteResaBtn: { width: 28, height: 28, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center" },

  toast: { position: "absolute", bottom: 24, alignSelf: "center", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  toastText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, color: "#fff" },
});
