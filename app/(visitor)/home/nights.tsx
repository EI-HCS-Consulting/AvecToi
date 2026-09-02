import { useRef, useMemo, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useVisitorSpace } from "@/lib/VisitorContext";
import { getVisitorSession } from "@/lib/visitorSession";
import SpaceHeader from "@/components/SpaceHeader";
import BookingFlow, { type BookingFlowHandle } from "@/components/BookingFlow";
import NightInterventionBookingFlow, { type NightInterventionBookingFlowHandle } from "@/components/NightInterventionBookingFlow";
import { findNextAvailableNight, isReservationDatePast, toISO, toFrLong, nightStartSlot } from "@/lib/slotUtils";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { isVisitorAuthorizedForNight } from "@/lib/nightVisitorAuth";
import { isIntervenantAuthorizedForNight } from "@/lib/nightIntervenantAuth";
import type { Reservation } from "@/lib/types";

export default function VisitorNightsScreen() {
  const { space, slotConfig, reservations, token, refreshReservations, pendingEditReservationId, setPendingEditReservationId } = useVisitorSpace();
  // Arrivée depuis la fiche visiteur (VisitorProfileModal, réservation d'un
  // autre visiteur) : entoure la nuitée ciblée, même pattern que
  // app/(admin)/home/nights.tsx.
  const { focusDate } = useLocalSearchParams<{ focusDate?: string }>();
  const { theme: C } = useDisplayMode();
  const flowRef = useRef<BookingFlowHandle>(null);
  const intervenantFlowRef = useRef<NightInterventionBookingFlowHandle>(null);

  // PIN de session de cet appareil — sert à ne montrer "Modifier" que sur
  // les nuitées faites depuis ce même appareil (y compris quand elles ont
  // été faites pour quelqu'un d'autre, cf. booked_by_prenom/nom), jamais
  // sur celles des autres visiteurs.
  const [myPin, setMyPin] = useState<string | null>(null);
  // Rôle + fiche de la session — un intervenant ne peut réserver une nuitée
  // que si l'admin l'a explicitement autorisé (voir slot_config.night_intervenant_mode,
  // components/NightIntervenantModal.tsx). Les visiteurs "famille" ne sont pas
  // concernés par cette restriction, seul night_enabled les gouverne.
  const [role, setRole] = useState<"visiteur" | "intervenant">("visiteur");
  const [intervenantProfileId, setIntervenantProfileId] = useState<string | null>(null);
  const [myPrenom, setMyPrenom] = useState("");
  const [myNom, setMyNom] = useState("");
  // Tant que la session n'a pas été lue (voir effet ci-dessous), `role`/
  // `myPrenom`/`myNom` restent à leurs valeurs par défaut ("visiteur"/"") —
  // sessionReady évite de calculer canReserveNight sur cet état transitoire
  // (c'est ce décalage qui faisait apparaître puis disparaître le bouton
  // "Prochaine disponibilité" chez un intervenant/visiteur restreint : un
  // premier rendu permissif avant que le vrai rôle/la vraie autorisation ne
  // soit connue).
  const [sessionReady, setSessionReady] = useState(false);
  // Dépend de `token` — voir home/slots.tsx pour le détail (changement
  // d'espace patient sans démontage de l'écran).
  useEffect(() => {
    setSessionReady(false);
    getVisitorSession().then((s) => {
      setMyPin(s?.pin ?? null);
      setRole(s?.role ?? "visiteur");
      setIntervenantProfileId(s?.intervenantProfileId ?? null);
      setMyPrenom(s?.prenom ?? "");
      setMyNom(s?.nom ?? "");
      setSessionReady(true);
    });
  }, [token]);
  const isMine = (r: Reservation) => !!myPin && r.pin === myPin;

  // Autorisation des visiteurs "famille" (voir slot_config.night_visitor_mode,
  // components/NightVisitorModal.tsx) — n'a d'effet que si l'admin a
  // restreint aux "certains visiteurs seulement" (mode "some"), sinon (mode
  // "all", défaut) tout le monde peut réserver, comportement historique.
  // `null` = pas encore déterminé (session pas encore lue, ou vérification
  // serveur en cours) : canReserveNight le traite comme "pas encore".
  const [nightVisitorAuthorized, setNightVisitorAuthorized] = useState<boolean | null>(null);
  useEffect(() => {
    if (!sessionReady) return;
    if (role !== "visiteur" || !space || slotConfig?.night_visitor_mode !== "some" || !myPrenom || !myNom) {
      setNightVisitorAuthorized(true);
      return;
    }
    setNightVisitorAuthorized(null);
    isVisitorAuthorizedForNight(space.id, myPrenom, myNom).then(setNightVisitorAuthorized);
  }, [sessionReady, role, space, slotConfig?.night_visitor_mode, myPrenom, myNom]);

  // Autorisation des intervenants (voir slot_config.night_intervenant_mode,
  // components/NightIntervenantModal.tsx) — même principe que les visiteurs
  // ci-dessus, mais matché par intervenant_profiles.id (compte stable) via
  // night_authorized_intervenants plutôt que par prénom/nom.
  const [nightIntervenantAuthorized, setNightIntervenantAuthorized] = useState<boolean | null>(null);
  useEffect(() => {
    if (!sessionReady) return;
    if (role !== "intervenant" || !space || slotConfig?.night_intervenant_mode !== "some" || !intervenantProfileId) {
      setNightIntervenantAuthorized(false);
      return;
    }
    setNightIntervenantAuthorized(null);
    isIntervenantAuthorizedForNight(space.id, intervenantProfileId).then(setNightIntervenantAuthorized);
  }, [sessionReady, role, space, slotConfig?.night_intervenant_mode, intervenantProfileId]);

  const canReserveNight =
    sessionReady
    && (role !== "intervenant"
      || slotConfig?.night_intervenant_mode === "all"
      || (slotConfig?.night_intervenant_mode === "some" && nightIntervenantAuthorized === true))
    && (role !== "visiteur" || nightVisitorAuthorized === true);

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const startDate = space ? new Date(space.start_date + "T00:00:00") : today;

  // Arrivée via RebookingAlertModal (recasage/annulation suite à un
  // changement de règles admin) ou via "Mon compte" > "Mes réservations" :
  // rouvre la modale PIN/modification directement sur la nuitée visée.
  useEffect(() => {
    if (!pendingEditReservationId) return;
    const r = reservations.find((x) => x.id === pendingEditReservationId && x.type === "Nuit");
    if (!r) return;
    // Filet de sécurité : une nuitée passée n'est plus modifiable, même via
    // ce mécanisme de lien profond — on reste juste sur l'écran.
    if (!isReservationDatePast(r.date)) flowRef.current?.openPinModal(r, true);
    setPendingEditReservationId(null);
  }, [pendingEditReservationId, reservations, setPendingEditReservationId]);

  if (!space || !slotConfig) return null;

  const allNightReservations = reservations.filter((r): r is Reservation => r.type === "Nuit");
  const upcomingNights = allNightReservations
    .filter((r) => r.date >= toISO(today))
    .sort((a, b) => a.date.localeCompare(b.date));
  const pastNights = allNightReservations
    .filter((r) => r.date < toISO(today))
    .sort((a, b) => b.date.localeCompare(a.date));

  function handleReserveNext() {
    if (!slotConfig) return;
    const next = findNextAvailableNight(reservations, slotConfig, startDate);
    if (!next) {
      Alert.alert("Aucune disponibilité", "Aucune nuitée libre dans les 90 prochains jours.");
      return;
    }
    if (role === "intervenant") {
      intervenantFlowRef.current?.openBooking(next.iso);
    } else {
      flowRef.current?.openBooking(next.iso, nightStartSlot(slotConfig));
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <SpaceHeader space={space} active="nights" basePath="/(visitor)/home" C={C} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {!slotConfig.night_enabled && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>🌙</Text>
            <Text style={[styles.emptyText, { color: C.muted }]}>
              Les nuitées sont actuellement suspendues par l'organisateur.
            </Text>
          </View>
        )}

        {slotConfig.night_enabled && canReserveNight && (
          <TouchableOpacity
            style={[styles.reserveNextBtn, { backgroundColor: C.accent }]}
            onPress={handleReserveNext}
            activeOpacity={0.85}
          >
            <Text style={styles.reserveNextBtnText}>⚡ Prochaine disponibilité</Text>
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
                <Text style={[styles.nightDate, { color: C.text }]}>{toFrLong(new Date(r.date + "T12:00:00"))}</Text>
                <Text style={[styles.nightVisitor, { color: C.success }]}>● {r.prenom} {r.nom}</Text>
                {r.alert_message ? (
                  <View style={[styles.alertBanner, { backgroundColor: "rgba(233,69,96,0.12)", borderColor: "rgba(233,69,96,0.4)" }]}>
                    <Text style={[styles.alertText, { color: C.danger }]}>{r.alert_message}</Text>
                  </View>
                ) : null}
              </View>
              {isMine(r) && (
                <TouchableOpacity onPress={() => flowRef.current?.openPinModal(r)} style={[styles.editBtn, { borderColor: C.border }]}>
                  <Text style={[styles.editBtnText, { color: C.muted }]}>Modifier</Text>
                </TouchableOpacity>
              )}
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
                <Text style={[styles.nightDate, { color: C.text }]}>{toFrLong(new Date(r.date + "T12:00:00"))}</Text>
                <Text style={[styles.nightVisitor, { color: C.success }]}>● {r.prenom} {r.nom}</Text>
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

      <BookingFlow
        ref={flowRef}
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
        <NightInterventionBookingFlow
          ref={intervenantFlowRef}
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

  reserveNextBtn: { borderRadius: 12, paddingVertical: 11, alignItems: "center", marginBottom: 12 },
  reserveNextBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 15, color: "#fff", textAlign: "center" },

  sectionTitle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 },

  nightCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  nightDate: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 15, textTransform: "capitalize", marginBottom: 4 },
  nightVisitor: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },
  editBtn: { borderWidth: 1, borderRadius: 7, paddingVertical: 6, paddingHorizontal: 10 },
  editBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },

  alertBanner: { borderWidth: 1, borderRadius: 8, padding: 8, marginTop: 8 },
  alertText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, lineHeight: 16 },

  empty: { alignItems: "center", paddingVertical: 32 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 14, textAlign: "center", lineHeight: 21 },
});
