import { useRef, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useVisitorSpace } from "@/lib/VisitorContext";
import { getVisitorSession } from "@/lib/visitorSession";
import SpaceHeader from "@/components/SpaceHeader";
import BookingFlow, { type BookingFlowHandle } from "@/components/BookingFlow";
import { getSlotOccupancy, getNightReservation, isReservationDatePast, isSlotFullyPast, toISO, toFrLong, toFrShort, addDays, nightStartSlot, nightRangeLabel } from "@/lib/slotUtils";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import type { Reservation } from "@/lib/types";

// Recentré sur les créneaux "Visite" uniquement depuis le Lot 3 — la nuitée
// a son propre écran (home/nights.tsx). La logique de réservation/PIN/édition
// elle-même vit dans components/BookingFlow.tsx, partagée entre les deux.
export default function SlotsScreen() {
  const { space, slotConfig, slots, reservations, selectedDay, setSelectedDay, refreshReservations, token, pendingBookingSlot, setPendingBookingSlot, pendingEditReservationId, setPendingEditReservationId, getConfigForDate, getSlotsForDate } = useVisitorSpace();
  const { theme: C } = useDisplayMode();
  const flowRef = useRef<BookingFlowHandle>(null);
  const nightFlowRef = useRef<BookingFlowHandle>(null);

  const startDate = space ? new Date(space.start_date + "T00:00:00") : new Date();

  // PIN de session de cet appareil — sert à ne montrer "Modifier" que sur
  // les réservations faites depuis ce même appareil (y compris quand elles
  // ont été faites pour quelqu'un d'autre, cf. booked_by_prenom/nom), jamais
  // sur celles des autres visiteurs.
  const [myPin, setMyPin] = useState<string | null>(null);
  useEffect(() => {
    getVisitorSession().then((s) => setMyPin(s?.pin ?? null));
  }, []);
  const isMine = (r: Reservation) => !!myPin && r.pin === myPin;

  // Arrivée via "Prochaine disponibilité → Réserver" (Calendrier) : ouvre
  // directement la modale de réservation sur le créneau ciblé.
  useEffect(() => {
    getVisitorSession().then((s) => {
      if (pendingBookingSlot) {
        flowRef.current?.openBooking(toISO(selectedDay), pendingBookingSlot, s ? { prenom: s.prenom, nom: s.nom } : undefined);
        setPendingBookingSlot(null);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Arrivée via "Mon compte" > "Mes réservations" : rouvre la modale
  // PIN/modification directement sur la réservation visée, une fois les
  // réservations chargées dans le contexte.
  useEffect(() => {
    if (!pendingEditReservationId) return;
    const r = reservations.find((x) => x.id === pendingEditReservationId);
    if (!r) return;
    if (r.type === "Nuit") nightFlowRef.current?.openPinModal(r);
    else flowRef.current?.openPinModal(r);
    setPendingEditReservationId(null);
  }, [pendingEditReservationId, reservations, setPendingEditReservationId]);

  if (!space || !slotConfig) return null;

  const iso = toISO(selectedDay);
  const dayConfig = getConfigForDate(iso) ?? slotConfig;
  const daySlots = getSlotsForDate(iso);

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <SpaceHeader space={space} active="slots" basePath="/(visitor)/home" C={C} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Day navigation */}
        <View style={[styles.dayNav, { backgroundColor: C.card, borderColor: C.border }]}>
          <TouchableOpacity
            onPress={() => { const prev = addDays(selectedDay, -1); if (prev >= startDate) setSelectedDay(prev); }}
            disabled={toISO(selectedDay) === toISO(startDate)}
            style={[styles.navBtn, { borderColor: C.border }]}
          >
            <Text style={[styles.navBtnText, { color: C.text }]}>‹</Text>
          </TouchableOpacity>
          <View style={{ alignItems: "center" }}>
            <Text style={[styles.dayTitle, { color: C.text }]}>{toFrLong(selectedDay)}</Text>
            <Text style={[styles.daySub, { color: C.muted }]}>{toFrShort(selectedDay)}</Text>
          </View>
          <TouchableOpacity onPress={() => setSelectedDay(addDays(selectedDay, 1))} style={[styles.navBtn, { borderColor: C.border }]}>
            <Text style={[styles.navBtnText, { color: C.text }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Slots */}
        {daySlots.map((slot) => {
          const occ = getSlotOccupancy(reservations, iso, slot);
          const full = occ.length >= dayConfig.max_visitors_per_slot;
          const past = isSlotFullyPast(iso, slot);
          const mine = occ.find(isMine);

          return (
            <View
              key={slot}
              style={[styles.slotCard, { backgroundColor: C.card, borderColor: full ? "rgba(233,69,96,0.3)" : C.border, opacity: past ? 0.5 : 1 }]}
            >
              <View style={styles.slotLeft}>
                <Text style={[styles.slotTime, { color: C.gold }]}>{slot}</Text>
                <Text style={[styles.slotCount, { color: C.muted }]}>{occ.length}/{dayConfig.max_visitors_per_slot} inscrits</Text>
                {occ.length === 0
                  ? <Text style={[styles.slotEmpty, { color: C.muted }]}>——</Text>
                  : occ.map((r) => (
                    <View key={r.id} style={styles.visitorRow}>
                      <Text style={[styles.visitorName, { color: C.success }]}>● {r.prenom} {r.nom}</Text>
                    </View>
                  ))
                }
                {mine?.alert_message && !mine.alert_seen && (
                  <View style={[styles.alertBanner, { backgroundColor: "rgba(233,69,96,0.12)", borderColor: "rgba(233,69,96,0.4)" }]}>
                    <Text style={[styles.alertText, { color: C.danger }]}>{mine.alert_message}</Text>
                  </View>
                )}
              </View>
              <View style={styles.slotRight}>
                {!full && !past && (
                  <TouchableOpacity
                    style={[styles.reserveBtn, { backgroundColor: C.accent }]}
                    onPress={() => flowRef.current?.openBooking(iso, slot)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.reserveBtnText}>Réserver</Text>
                  </TouchableOpacity>
                )}
                {full && !past && (
                  <View style={[styles.fullBadge, { borderColor: C.border }]}>
                    <Text style={[styles.fullBadgeText, { color: C.muted }]}>Complet</Text>
                  </View>
                )}
                {mine && !past && (
                  <TouchableOpacity onPress={() => flowRef.current?.openPinModal(mine)} style={[styles.editBtn, { borderColor: C.border }]}>
                    <Text style={[styles.editBtnText, { color: C.muted }]}>Modifier</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        {/* Nuitée du jour — ajoutée à la fin de la liste des créneaux, même
            écran et même interaction que les créneaux "Visite" (Lot demandé
            par l'utilisateur). Réservation/édition gérées par une seconde
            instance de BookingFlow en type="Nuit" (la nuitée a sa propre
            logique de créneau/horaire — voir home/nights.tsx). */}
        {dayConfig.night_enabled && (() => {
          const nightResa = getNightReservation(reservations, iso);
          const nightPast = isSlotFullyPast(iso, nightStartSlot(dayConfig));
          return (
            <View
              style={[styles.slotCard, { backgroundColor: C.card, borderColor: nightResa ? "rgba(233,69,96,0.3)" : C.border, opacity: nightPast ? 0.5 : 1 }]}
            >
              <View style={styles.slotLeft}>
                <Text style={[styles.slotTime, { color: C.gold }]}>🌙 Nuitée</Text>
                <Text style={[styles.slotCount, { color: C.muted }]}>{nightRangeLabel(dayConfig)}</Text>
                {!nightResa
                  ? <Text style={[styles.slotEmpty, { color: C.muted }]}>——</Text>
                  : (
                    <View style={styles.visitorRow}>
                      <Text style={[styles.visitorName, { color: C.success }]}>● {nightResa.prenom} {nightResa.nom}</Text>
                    </View>
                  )
                }
              </View>
              <View style={styles.slotRight}>
                {!nightResa && !nightPast && (
                  <TouchableOpacity
                    style={[styles.reserveBtn, { backgroundColor: C.accent }]}
                    onPress={() => nightFlowRef.current?.openBooking(iso, nightStartSlot(slotConfig))}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.reserveBtnText}>Réserver</Text>
                  </TouchableOpacity>
                )}
                {nightResa && (
                  <View style={[styles.fullBadge, { borderColor: C.border }]}>
                    <Text style={[styles.fullBadgeText, { color: C.muted }]}>Complet</Text>
                  </View>
                )}
                {nightResa && isMine(nightResa) && !isReservationDatePast(nightResa.date) && (
                  <TouchableOpacity onPress={() => nightFlowRef.current?.openPinModal(nightResa)} style={[styles.editBtn, { borderColor: C.border }]}>
                    <Text style={[styles.editBtnText, { color: C.muted }]}>Modifier</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })()}
      </ScrollView>

      <BookingFlow
        ref={flowRef}
        type="Visite"
        space={space}
        slotConfig={slotConfig}
        slots={slots}
        reservations={reservations}
        startDate={startDate}
        token={token}
        refreshReservations={refreshReservations}
        homeCalendarPath="/(visitor)/home/calendar"
        C={C}
      />

      <BookingFlow
        ref={nightFlowRef}
        type="Nuit"
        space={space}
        slotConfig={slotConfig}
        slots={[]}
        reservations={reservations}
        startDate={startDate}
        token={token}
        refreshReservations={refreshReservations}
        homeCalendarPath="/(visitor)/home/calendar"
        C={C}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 32 },

  dayNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  dayTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 16, textTransform: "capitalize" },
  daySub: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },
  navBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 },
  navBtnText: { fontSize: 18, fontWeight: "600" },

  slotCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  slotLeft: { flex: 1 },
  slotRight: { alignItems: "center", gap: 8 },
  slotTime: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22 },
  slotCount: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },
  slotEmpty: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginTop: 4 },
  visitorRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  visitorName: { fontFamily: "DM_Sans_400Regular", fontSize: 13, flex: 1 },
  alertBanner: { borderWidth: 1, borderRadius: 8, padding: 8, marginTop: 8 },
  alertText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, lineHeight: 16 },
  editBtn: { borderWidth: 1, borderRadius: 7, paddingVertical: 6, paddingHorizontal: 10 },
  editBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
  reserveBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9, alignSelf: "center" },
  reserveBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 13, color: "#fff" },
  fullBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 },
  fullBadgeText: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },
});
