import { useRef, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useVisitorSpace } from "@/lib/VisitorContext";
import { getVisitorSession } from "@/lib/visitorSession";
import SpaceHeader from "@/components/SpaceHeader";
import BookingFlow, { type BookingFlowHandle } from "@/components/BookingFlow";
import InterventionBookingFlow, { type InterventionBookingFlowHandle } from "@/components/InterventionBookingFlow";
import NightInterventionBookingFlow, { type NightInterventionBookingFlowHandle } from "@/components/NightInterventionBookingFlow";
import VisitorSlotsList from "@/components/VisitorSlotsList";
import { getNightReservation, isReservationDatePast, isSlotFullyPast, toISO, toFrLong, toFrShort, addDays, nightStartSlot, nightRangeLabel } from "@/lib/slotUtils";
import { useOtherSpaceInterventions } from "@/lib/useOtherSpaceInterventions";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { isVisitorAuthorizedForNight } from "@/lib/nightVisitorAuth";
import { isIntervenantAuthorizedForNight } from "@/lib/nightIntervenantAuth";
import type { Reservation, SlotConfig } from "@/lib/types";

// Recentré sur les créneaux "Visite" uniquement depuis le Lot 3 — la nuitée
// a son propre écran (home/nights.tsx). La logique de réservation/PIN/édition
// elle-même vit dans components/BookingFlow.tsx, partagée entre les deux.
export default function SlotsScreen() {
  const { space, slotConfig, slots, reservations, selectedDay, setSelectedDay, refreshReservations, token, pendingBookingSlot, setPendingBookingSlot, pendingEditReservationId, setPendingEditReservationId, getConfigForDate } = useVisitorSpace();
  const { theme: C } = useDisplayMode();
  // Arrivée depuis le popup "Réserver un créneau" du Planning intervenant
  // (app/(visitor)/soins.tsx, via home/calendar.tsx qui fait suivre ces
  // params) — une fois la réservation confirmée, InterventionBookingFlow
  // doit ramener sur l'onglet Planning avec ce patient présélectionné
  // plutôt que sur le calendrier de l'espace (comportement par défaut).
  const { returnTo, returnSpaceId } = useLocalSearchParams<{ returnTo?: string; returnSpaceId?: string }>();
  const returnToPlanning = returnTo === "planning";
  const interventionHomeCalendarPath = returnToPlanning
    ? { pathname: "/(visitor)/soins", params: { focusSpaceId: returnSpaceId ?? "" } }
    : ("/(visitor)/home/calendar" as const);
  const interventionHomeCalendarLabel = returnToPlanning ? "← Retour au planning" : undefined;
  const flowRef = useRef<BookingFlowHandle>(null);
  const nightFlowRef = useRef<BookingFlowHandle>(null);
  const interventionFlowRef = useRef<InterventionBookingFlowHandle>(null);
  const nightInterventionFlowRef = useRef<NightInterventionBookingFlowHandle>(null);

  const startDate = space ? new Date(space.start_date + "T00:00:00") : new Date();

  // PIN de session de cet appareil — sert à ne montrer "Modifier" que sur
  // les réservations faites depuis ce même appareil (y compris quand elles
  // ont été faites pour quelqu'un d'autre, cf. booked_by_prenom/nom), jamais
  // sur celles des autres visiteurs.
  const [myPin, setMyPin] = useState<string | null>(null);
  // Un intervenant réutilise cet écran (même vue que le visiteur), mais son
  // bouton "Réserver" ouvre InterventionBookingFlow au lieu de BookingFlow —
  // voir lib/visitorSession.ts pour role/intervenantProfileId.
  const [role, setRole] = useState<"visiteur" | "intervenant" | null>(null);
  const [intervenantProfileId, setIntervenantProfileId] = useState<string | null>(null);
  const [myPrenom, setMyPrenom] = useState("");
  const [myNom, setMyNom] = useState("");
  useEffect(() => {
    getVisitorSession().then((s) => {
      setMyPin(s?.pin ?? null);
      setRole(s?.role ?? "visiteur");
      setIntervenantProfileId(s?.intervenantProfileId ?? null);
      setMyPrenom(s?.prenom ?? "");
      setMyNom(s?.nom ?? "");
    });
  }, []);
  const isMine = (r: Reservation) => !!myPin && r.pin === myPin;

  const { otherSpaceInterventions } = useOtherSpaceInterventions(intervenantProfileId, space?.id ?? null);

  // Un intervenant ne peut réserver une nuitée que si l'admin l'a
  // explicitement autorisé (même règle que home/nights.tsx — voir
  // slot_config.night_intervenant_mode, components/NightIntervenantModal.tsx).
  // Un visiteur "famille" ne peut être restreint que si l'admin a limité aux
  // "certains visiteurs seulement" (slot_config.night_visitor_mode = "some",
  // components/NightVisitorModal.tsx) — sinon (mode "all", défaut) aucune
  // restriction, comportement historique.
  const [nightVisitorAuthorized, setNightVisitorAuthorized] = useState(true);
  useEffect(() => {
    if (role !== "visiteur" || !space || slotConfig?.night_visitor_mode !== "some" || !myPrenom || !myNom) {
      setNightVisitorAuthorized(true);
      return;
    }
    isVisitorAuthorizedForNight(space.id, myPrenom, myNom).then(setNightVisitorAuthorized);
  }, [role, space, slotConfig?.night_visitor_mode, myPrenom, myNom]);

  // Même principe que nightVisitorAuthorized ci-dessus, mais matché par
  // intervenant_profiles.id (compte stable) via night_authorized_intervenants
  // plutôt que par prénom/nom — voir lib/nightIntervenantAuth.ts.
  const [nightIntervenantAuthorized, setNightIntervenantAuthorized] = useState(true);
  useEffect(() => {
    if (role !== "intervenant" || !space || slotConfig?.night_intervenant_mode !== "some" || !intervenantProfileId) {
      setNightIntervenantAuthorized(false);
      return;
    }
    isIntervenantAuthorizedForNight(space.id, intervenantProfileId).then(setNightIntervenantAuthorized);
  }, [role, space, slotConfig?.night_intervenant_mode, intervenantProfileId]);

  const canReserveNight =
    (role !== "intervenant"
      || slotConfig?.night_intervenant_mode === "all"
      || (slotConfig?.night_intervenant_mode === "some" && nightIntervenantAuthorized))
    && (role !== "visiteur" || nightVisitorAuthorized);

  // Arrivée via "Prochaine disponibilité → Réserver" (Calendrier) : ouvre
  // directement la modale de réservation sur le créneau ciblé — celle de
  // l'intervenant (InterventionBookingFlow) ou celle du visiteur/famille
  // (BookingFlow) selon le rôle, une fois celui-ci chargé (voir role ci-
  // dessus, initialisé à null pour distinguer "pas encore chargé" de
  // "visiteur"). Un ref pour ne déclencher qu'une seule fois.
  const pendingBookingHandled = useRef(false);
  useEffect(() => {
    if (pendingBookingHandled.current || role === null || !pendingBookingSlot) return;
    pendingBookingHandled.current = true;
    const slot = pendingBookingSlot;
    setPendingBookingSlot(null);
    if (role === "intervenant") {
      interventionFlowRef.current?.openBooking(toISO(selectedDay), slot);
    } else {
      getVisitorSession().then((s) => {
        flowRef.current?.openBooking(toISO(selectedDay), slot, s ? { prenom: s.prenom, nom: s.nom } : undefined);
      });
    }
  }, [role, pendingBookingSlot, selectedDay, setPendingBookingSlot]);

  // Arrivée via RebookingAlertModal (recasage/annulation suite à un
  // changement de règles admin) : rouvre la modale PIN/modification
  // directement sur la réservation visée, une fois les réservations
  // chargées dans le contexte. Ne concerne pas "Mon compte" > "Mes
  // réservations", qui ne fait qu'une navigation simple (pas de pendingEditReservationId).
  useEffect(() => {
    if (!pendingEditReservationId) return;
    const r = reservations.find((x) => x.id === pendingEditReservationId);
    if (!r) return;
    if (r.type === "Nuit") nightFlowRef.current?.openPinModal(r);
    else flowRef.current?.openPinModal(r);
    setPendingEditReservationId(null);
  }, [pendingEditReservationId, reservations, setPendingEditReservationId]);

  if (!space || !slotConfig) return null;

  // Même vérification que getDayStatus (calendrier mensuel) : un jour dont
  // le jour de semaine est exclu de allowed_weekdays, ou qui figure dans
  // blocked_dates, n'est pas navigable — les flèches ‹ › doivent sauter
  // par-dessus au lieu de s'y arrêter (sinon on peut réserver une visite un
  // jour que l'admin a explicitement rendu indisponible).
  const isDayAllowed = (d: Date, config: SlotConfig): boolean => {
    const day = new Date(d); day.setHours(0, 0, 0, 0);
    const start = new Date(startDate); start.setHours(0, 0, 0, 0);
    if (day < start) return false;
    if (config.allowed_weekdays && !config.allowed_weekdays.includes(day.getDay())) return false;
    if (config.blocked_dates && config.blocked_dates.includes(toISO(day))) return false;
    return true;
  };

  // Cap de sécurité (2 ans) pour ne jamais boucler indéfiniment si une
  // config admin exclut tous les jours de semaine.
  const findNextAllowedDay = (from: Date, direction: 1 | -1): Date | null => {
    let candidate = addDays(from, direction);
    for (let i = 0; i < 730; i++) {
      if (direction === -1 && candidate < startDate) return null;
      const candidateConfig = getConfigForDate(toISO(candidate)) ?? slotConfig;
      if (isDayAllowed(candidate, candidateConfig)) return candidate;
      candidate = addDays(candidate, direction);
    }
    return null;
  };

  const iso = toISO(selectedDay);
  const dayConfig = getConfigForDate(iso) ?? slotConfig;

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <SpaceHeader space={space} active="slots" basePath="/(visitor)/home" C={C} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Day navigation */}
        <View style={[styles.dayNav, { backgroundColor: C.card, borderColor: C.border }]}>
          <TouchableOpacity
            onPress={() => { const prev = findNextAllowedDay(selectedDay, -1); if (prev) setSelectedDay(prev); }}
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
            onPress={() => { const next = findNextAllowedDay(selectedDay, 1); if (next) setSelectedDay(next); }}
            style={[styles.navBtn, { borderColor: C.border }]}
          >
            <Text style={[styles.navBtnText, { color: C.text }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Slots */}
        <VisitorSlotsList
          iso={iso}
          C={C}
          role={role}
          intervenantProfileId={intervenantProfileId}
          myPin={myPin}
          otherSpaceInterventions={otherSpaceInterventions}
          onReserveVisit={(slotIso, slot) => flowRef.current?.openBooking(slotIso, slot)}
          onEditVisit={(r) => flowRef.current?.openPinModal(r)}
          onReserveIntervention={(slotIso, slot) => interventionFlowRef.current?.openBooking(slotIso, slot)}
          onCancelIntervention={(r) => interventionFlowRef.current?.openCancel(r)}
        />

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
                {!nightResa && !nightPast && canReserveNight && (
                  <TouchableOpacity
                    style={[styles.reserveBtn, { backgroundColor: C.accent }]}
                    onPress={() => {
                      if (role === "intervenant") {
                        nightInterventionFlowRef.current?.openBooking(iso);
                      } else {
                        nightFlowRef.current?.openBooking(iso, nightStartSlot(slotConfig));
                      }
                    }}
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

      {role === "intervenant" && intervenantProfileId && myPin && (
        <InterventionBookingFlow
          ref={interventionFlowRef}
          space={space}
          slotConfig={slotConfig}
          slots={slots}
          reservations={reservations}
          intervenantProfileId={intervenantProfileId}
          pin={myPin}
          refreshReservations={refreshReservations}
          otherSpaceInterventions={otherSpaceInterventions}
          homeCalendarPath={interventionHomeCalendarPath}
          homeCalendarLabel={interventionHomeCalendarLabel}
          C={C}
        />
      )}

      {role === "intervenant" && intervenantProfileId && myPin && (
        <NightInterventionBookingFlow
          ref={nightInterventionFlowRef}
          space={space}
          slotConfig={slotConfig}
          intervenantProfileId={intervenantProfileId}
          prenom={myPrenom}
          nom={myNom}
          pin={myPin}
          refreshReservations={refreshReservations}
          homeCalendarPath="/(visitor)/home/calendar"
          C={C}
        />
      )}
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
  editBtn: { borderWidth: 1, borderRadius: 7, paddingVertical: 6, paddingHorizontal: 10 },
  editBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
  reserveBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9, alignSelf: "center" },
  reserveBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 13, color: "#fff" },
  fullBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 },
  fullBadgeText: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },
});
