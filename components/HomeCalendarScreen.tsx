import { useState, useMemo, useCallback, useRef } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Modal, Linking,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import {
  getDayStatus, findNextAvailableSlot, getDaysInMonth, getMonday, addDays,
  toISO, toFrLong, isMyReservation, visiteurIdentityKey, isSlotFullyPast,
  getSlotOccupancy,
} from "@/lib/slotUtils";
import { isSpaceCapped } from "@/lib/freemiumCap";
import { LOGO_NAVY, VISITES_ORANGE_FILL, VISITES_DANGER_FILL, getPatientColor } from "@/lib/themes";
import { careLocationDetail, mapsUrlForSpace } from "@/lib/address";
import SpaceHeader from "@/components/SpaceHeader";
import SegmentedSwitch from "@/components/SegmentedSwitch";
import WeekStrip from "@/components/WeekStrip";
import { DayStripes } from "@/components/DayEdgeStripes";
import PatientColorLegend from "@/components/PatientColorLegend";
import PlanningDuJourBlock from "@/components/PlanningDuJourBlock";
import SoinsPeriodBlock from "@/components/SoinsPeriodBlock";
import SoinsPlanifiesBlock from "@/components/SoinsPlanifiesBlock";
import SoinActionModal from "@/components/SoinActionModal";
import VisiteEditFlow, { type VisiteEditFlowHandle } from "@/components/VisiteEditFlow";
import BookingFlow, { type BookingFlowHandle } from "@/components/BookingFlow";
import type { Reservation, SlotConfig, PatientSpace } from "@/lib/types";
import type { Theme } from "@/lib/themes";

const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

// Calendrier de l'onglet Accueil, commun à l'admin et au visiteur (les deux
// écrans (admin)/home/calendar.tsx et (visitor)/home/calendar.tsx sont de
// simples enveloppes qui alimentent ce composant depuis leur propre contexte
// — voir ces fichiers pour le détail des props). Le rôle Intervenant n'étant
// plus accessible en V1 (lib/featureFlags.ts, INTERVENANT_ROLE_ENABLED), tout
// ce composant ne connaît plus que le planning des visites : pas de bascule
// Visites/Soins, pas de panneau Soins, pas de réservation de soin inline —
// voir Développement V2/ pour retrouver cette logique si le rôle revient.
interface Props {
  space: PatientSpace;
  slotConfig: SlotConfig;
  slots: string[];
  reservations: Reservation[];
  selectedDay: Date;
  setSelectedDay: (day: Date) => void;
  setPendingBookingSlot: (slot: string | null) => void;
  refreshReservations: () => Promise<void>;
  getConfigForDate: (iso: string) => SlotConfig | null;
  getSlotsForDate: (iso: string) => string[];
  basePath: "/(admin)/home" | "/(visitor)/home";
  // Identité personnelle de qui regarde, déjà résolue par l'enveloppe selon
  // son propre modèle (session visiteur chargée en async, ou space.admin_*
  // côté admin — voir la garde identityReady spécifique à l'admin dans
  // (admin)/home/calendar.tsx) : ce composant fait confiance telle quelle,
  // sans re-vérification.
  myPin: string | null;
  myPrenom: string | null;
  myNom: string | null;
  // Présent uniquement côté visiteur (session PIN, voir VisitorContext) :
  // active la réservation rapide inline (BookingFlow) sur le créneau d'un
  // autre visiteur tant qu'il reste de la place. Absent côté admin (pas de
  // session PIN) — la réservation rapide navigue alors toujours vers l'écran
  // des créneaux, comme le reste de ses actions de réservation.
  token: string | null;
  C: Theme;
}

export default function HomeCalendarScreen({
  space, slotConfig, slots, reservations, selectedDay, setSelectedDay, setPendingBookingSlot,
  refreshReservations, getConfigForDate, getSlotsForDate, basePath, myPin, myPrenom, myNom, token, C,
}: Props) {
  const router = useRouter();
  const { resetToday } = useLocalSearchParams<{ resetToday?: string }>();
  const [nextDispoModal, setNextDispoModal] = useState<{ date: Date; iso: string; slot: string } | null>(null);
  const [blockedDayModal, setBlockedDayModal] = useState<Date | null>(null);
  // Regroupement par date : évite de refiltrer le tableau `reservations`
  // complet à chaque case de la grille Mensuelle (jusqu'à 42 cases).
  const reservationsByDate = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    for (const r of reservations) {
      const list = map.get(r.date);
      if (list) list.push(r); else map.set(r.date, [r]);
    }
    return map;
  }, [reservations]);
  // Mensuel/Hebdo — en Hebdo, une bande de 7 jours (WeekStrip) remplace la
  // grille mensuelle et permet de réserver directement un créneau du jour
  // sélectionné, sans passer par l'écran dédié (home/slots.tsx), qui reste
  // accessible en Mensuel (appui prolongé sur un jour).
  const [planningView, setPlanningView] = useState<"mensuel" | "hebdo">("mensuel");
  const [viewThumbWidth, setViewThumbWidth] = useState(0);
  // Filtre légende visiteurs — 1 visiteur (visiteurIdentityKey) ou "Tous"
  // (null). Filtre les traits de bord (DayStripes) et les panneaux sous le
  // calendrier ; jamais le fond Partiel/Complet (vérité globale de capacité).
  const [selectedVisiteurKey, setSelectedVisiteurKey] = useState<string | null>(null);
  // Visite tapée dans un des blocs sous le calendrier — non-null tant que le
  // popup d'action (Modifier / Y Aller / Fermer, SoinActionModal) est ouvert.
  const [pendingVisite, setPendingVisite] = useState<Reservation | null>(null);

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const startDate = useMemo(
    () => space ? new Date(space.start_date + "T00:00:00") : today,
    [space, today],
  );
  const initialDay = useMemo(() => (today >= startDate ? today : startDate), [today, startDate]);

  const [calMonth, setCalMonth] = useState({ year: initialDay.getFullYear(), month: initialDay.getMonth() });
  const [weekAnchor, setWeekAnchor] = useState(() => getMonday(initialDay));

  // Conserve le jour/vue déjà sélectionnés à chaque retour via l'onglet bas
  // "Accueil" (tabPress, sans param) — le curseur bleu (selectedDay, partagé
  // via le contexte donc pas remis à zéro par un simple remount) doit
  // retrouver le dernier jour tapé plutôt que systématiquement aujourd'hui.
  // Seul un passage explicite par l'onglet "📅 Calendrier" du bandeau
  // SpaceHeader (resetToday) revient sur la date du jour, tout mode confondu
  // (Mensuel/Hebdo) — voir SpaceHeader.tsx.
  useFocusEffect(
    useCallback(() => {
      if (!resetToday) return;
      setSelectedDay(initialDay);
      setCalMonth({ year: initialDay.getFullYear(), month: initialDay.getMonth() });
      setWeekAnchor(getMonday(initialDay));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [resetToday, initialDay]),
  );

  const flowRef = useRef<BookingFlowHandle>(null);
  const visiteEditFlowRef = useRef<VisiteEditFlowHandle>(null);

  const monthDays = getDaysInMonth(calMonth.year, calMonth.month);
  const firstDow = (new Date(calMonth.year, calMonth.month, 1).getDay() + 6) % 7;
  const trailingFillers = (7 - ((firstDow + monthDays.length) % 7)) % 7;
  const monthName = new Date(calMonth.year, calMonth.month, 1)
    .toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  function handleNextDispo() {
    if (!slotConfig) return;
    const result = findNextAvailableSlot(reservations, slotConfig, slots, startDate);
    if (result) {
      setNextDispoModal(result);
    } else {
      Alert.alert("Aucune disponibilité", "Aucun créneau libre dans les 90 prochains jours.");
    }
  }

  function goToDay() {
    if (!nextDispoModal) return;
    setSelectedDay(nextDispoModal.date);
    setCalMonth({ year: nextDispoModal.date.getFullYear(), month: nextDispoModal.date.getMonth() });
    setNextDispoModal(null);
    router.navigate(`${basePath}/slots` as any);
  }

  function reserveNow() {
    if (!nextDispoModal) return;
    if (isSpaceCapped(space, reservations)) {
      setNextDispoModal(null);
      Alert.alert(
        "Limite atteinte",
        "Vous avez atteint la limite de votre espace. Consultez l'email envoyé à votre adresse pour en savoir plus.",
      );
      return;
    }
    setSelectedDay(nextDispoModal.date);
    setPendingBookingSlot(nextDispoModal.slot);
    setNextDispoModal(null);
    router.navigate(`${basePath}/slots` as any);
  }

  if (!space || !slotConfig) return null;

  // Marqueurs hospitalisation (F) / sortie (G) et seuil de grisage/réservation
  // (E) de la vue Hebdo — au format "YYYY-MM-DD", comparables directement aux
  // iso des jours de la bande.
  const admissionIso = space.patient_admission_date;
  const dischargeIso = space.patient_discharge_date;
  // Anniversaire du patient : ne compare que mois+jour ("MM-DD"), l'année de
  // patient_birthdate étant celle de naissance — se répète donc chaque année
  // dans la grille mensuelle (voir aussi BirthdayAlertModal, même logique).
  const birthdateMonthDay = space.patient_birthdate ? space.patient_birthdate.slice(5) : null;

  const identityReady = !!myPin;
  const myReservations = identityReady
    ? reservations.filter((r) => isMyReservation(r, myPin, null, myPrenom, myNom))
    : reservations;

  const selectedIso = toISO(selectedDay);

  // Période affichée par les panneaux sous le calendrier — suit le switch
  // Mensuel/Hebdo (planningView) et le mois/la semaine actuellement
  // parcouru(e), pas juste "aujourd'hui" : naviguer avec ‹ › doit aussi
  // déplacer la période des panneaux, exactement comme elle déplace déjà
  // celle du calendrier/de la bande au-dessus.
  const periodEndIso = planningView === "hebdo"
    ? toISO(addDays(weekAnchor, 6))
    : toISO(new Date(calMonth.year, calMonth.month + 1, 0));

  // Légende visiteurs — regroupe les réservations Visite par identité
  // approximée (visiteurIdentityKey), la personne qui regarde toujours en
  // premier, le reste trié alphabétiquement (nom puis prénom, comme
  // VisitorsBlock.tsx). Couleur = getPatientColor(index) sur cet ordre.
  const visiteurGroups: Record<string, { prenom: string; nom: string }> = {};
  for (const r of reservations) {
    if (r.type !== "Visite") continue;
    const key = visiteurIdentityKey(r.prenom, r.nom);
    if (!visiteurGroups[key]) visiteurGroups[key] = { prenom: r.prenom, nom: r.nom };
  }
  const myVisiteurKey = myPrenom && myNom ? visiteurIdentityKey(myPrenom, myNom) : null;
  const otherVisiteurKeys = Object.keys(visiteurGroups)
    .filter((k) => k !== myVisiteurKey)
    .sort((a, b) => {
      const ga = visiteurGroups[a], gb = visiteurGroups[b];
      return `${ga.nom} ${ga.prenom}`.localeCompare(`${gb.nom} ${gb.prenom}`, "fr");
    });
  const orderedVisiteurKeys = [
    ...(myVisiteurKey && visiteurGroups[myVisiteurKey] ? [myVisiteurKey] : []),
    ...otherVisiteurKeys,
  ];
  const visiteurColorByKey: Record<string, string> = {};
  orderedVisiteurKeys.forEach((key, i) => { visiteurColorByKey[key] = getPatientColor(i); });
  const visiteurLegendItems = orderedVisiteurKeys.map((key) => ({
    id: key,
    name: `${visiteurGroups[key].prenom} ${visiteurGroups[key].nom}`,
    color: visiteurColorByKey[key],
  }));

  // Accompagnants d'une visite (même group_id que la ligne principale,
  // group_id === id de la ligne principale, convention VisiteEditFlow/
  // BookingFlow) — calculé sur la liste complète pour qu'un accompagnant
  // reste rattaché à sa visite même si son propre prénom/nom ne correspond
  // pas au visiteur sélectionné dans la légende. Sert à fusionner leur
  // affichage dans le bloc de la ligne principale (Planning du jour +
  // Planning Mensuel/Hebdo) plutôt que de les lister comme des lignes
  // séparées et déconnectées.
  const visitesAll = reservations.filter((r) => r.type === "Visite");
  const companionsByMainId: Record<string, Reservation[]> = {};
  for (const r of visitesAll) {
    if (r.group_id && r.group_id !== r.id) {
      (companionsByMainId[r.group_id] ??= []).push(r);
    }
  }

  // Réservations Visite pour les panneaux sous le calendrier — ajoute le
  // filtre légende visiteur à la liste complète. Utilisé tel quel par
  // SoinsPlanifiesBlock (Autres visites planifiées, comportement historique,
  // chaque accompagnant garde sa propre ligne) ; visitesMainRows ci-dessous
  // (lignes principales seulement + companionsByMainId) est utilisé par
  // PlanningDuJourBlock et SoinsPeriodBlock.
  const visitesPanelReservations = visitesAll
    .filter((r) => !selectedVisiteurKey || visiteurIdentityKey(r.prenom, r.nom) === selectedVisiteurKey);
  // Une ligne principale reste affichée si le visiteur sélectionné dans la
  // légende est soit le réservataire principal, soit l'un de ses
  // accompagnants — sans ce deuxième cas, sélectionner le nom d'un
  // accompagnant ferait disparaître son créneau du Planning du jour/mensuel/
  // hebdo puisque son nom n'apparaît que noyé dans companionsById d'une
  // ligne autrement filtrée. SoinsPlanifiesBlock garde son propre calcul
  // (visitesPanelReservations ci-dessus, chaque accompagnant sur sa propre
  // ligne) et n'a pas ce problème.
  const visitesMainRows = visitesAll
    .filter((r) => !r.group_id || r.group_id === r.id)
    .filter((r) => {
      if (!selectedVisiteurKey) return true;
      if (visiteurIdentityKey(r.prenom, r.nom) === selectedVisiteurKey) return true;
      return (companionsByMainId[r.id] ?? []).some((c) => visiteurIdentityKey(c.prenom, c.nom) === selectedVisiteurKey);
    });

  // Places prises/max du créneau de chaque ligne principale, affichées sous
  // le nom du réservataire dans PlanningDuJourBlock — occupancy compte toute
  // réservation Visite du créneau (accompagnants compris, voir
  // getSlotOccupancy), cohérent avec la capacité utilisée pour la
  // réservation rapide dans openVisiteActions ci-dessous.
  const remainingByMainId: Record<string, { taken: number; max: number }> = {};
  for (const r of visitesMainRows) {
    const dayConfig = getConfigForDate(r.date) ?? slotConfig;
    remainingByMainId[r.id] = {
      taken: getSlotOccupancy(reservations, r.date, r.creneau).length,
      max: dayConfig.max_visitors_per_slot,
    };
  }
  // Même calcul pour la visite actuellement ouverte dans le popup Modifier/Y
  // Aller (SoinActionModal) — null tant qu'aucun popup n'est ouvert.
  const pendingVisiteCapacity = pendingVisite
    ? {
        taken: getSlotOccupancy(reservations, pendingVisite.date, pendingVisite.creneau).length,
        max: (getConfigForDate(pendingVisite.date) ?? slotConfig).max_visitors_per_slot,
      }
    : null;

  // Tap sur une visite : si elle m'appartient (isMyReservation compare PIN +
  // prénom/nom, et gère le cas d'une réservation "ADMIN" arrangée pour un
  // visiteur précis — voir lib/slotUtils.ts), ouvre le popup Modifier/Y
  // Aller habituel. Sinon (visite d'un autre visiteur, ex. sélectionné dans
  // la légende) : réservation rapide sur ce même créneau s'il reste une
  // place ET qu'une session visiteur (token) est disponible pour la porter,
  // sinon ouverture de l'écran des créneaux de ce jour-là (toujours le cas
  // côté admin, qui n'a pas de session PIN à rattacher à une réservation
  // inline). Une visite déjà passée n'ouvre plus rien.
  function openVisiteActions(r: Reservation) {
    if (isSlotFullyPast(r.date, r.creneau)) return;
    if (isMyReservation(r, myPin, null, myPrenom, myNom)) {
      setPendingVisite(r);
      return;
    }
    if (token) {
      const dayConfig = getConfigForDate(r.date) ?? slotConfig!;
      const occupancy = getSlotOccupancy(reservations, r.date, r.creneau);
      if (occupancy.length < dayConfig.max_visitors_per_slot) {
        flowRef.current?.openBooking(r.date, r.creneau);
        return;
      }
    }
    setSelectedDay(new Date(r.date + "T00:00:00"));
    router.navigate(`${basePath}/slots` as any);
  }
  function handleModifierVisitePress() {
    const r = pendingVisite;
    setPendingVisite(null);
    if (!r) return;
    visiteEditFlowRef.current?.open(r);
  }
  function handleYAllerVisitePress() {
    setPendingVisite(null);
    if (!space) return;
    const url = mapsUrlForSpace(space);
    if (url) Linking.openURL(url).catch(() => {});
  }
  // "Ajouter une Visite" du popup Modifier/Y Aller : réserve un créneau
  // supplémentaire le même jour, plus rapide que fermer le popup puis
  // rouvrir l'écran des créneaux depuis le calendrier.
  function handleAjouterVisitePress() {
    const r = pendingVisite;
    setPendingVisite(null);
    if (!r) return;
    setSelectedDay(new Date(r.date + "T00:00:00"));
    setCalMonth({ year: new Date(r.date + "T00:00:00").getFullYear(), month: new Date(r.date + "T00:00:00").getMonth() });
    router.navigate(`${basePath}/slots` as any);
  }
  // Fixe explicitement le jour ciblé (au lieu de compter sur selectedDay déjà
  // à jour) avant de naviguer — même prudence que handleAjouterVisitePress
  // ci-dessus, pour garantir que l'écran des créneaux ouvre bien le jour du
  // bloc "Planning du jour" tapé (ou de son bouton "Créneaux"), y compris sur
  // un jour déjà passé.
  function handleCreneauxPress() {
    const day = new Date(selectedIso + "T00:00:00");
    setSelectedDay(day);
    setCalMonth({ year: day.getFullYear(), month: day.getMonth() });
    router.navigate(`${basePath}/slots` as any);
  }

  // Tap sur une case de la bande Hebdo : sélectionne seulement le jour, sans
  // naviguer — voir handleWeekDayLongPress pour la navigation.
  const handleWeekDayPress = (iso: string) => {
    const day = new Date(iso + "T00:00:00");
    const dayConfig = getConfigForDate(iso) ?? slotConfig;
    const daySlots = getSlotsForDate(iso);
    const status = getDayStatus(reservations, iso, day, dayConfig, daySlots, startDate, "Visite");
    const isPast = iso < toISO(today);
    const isBlocked = (status === "past" && !isPast) || iso === admissionIso;
    if (isBlocked) {
      setBlockedDayModal(day);
      return;
    }
    setSelectedDay(day);
    setCalMonth({ year: day.getFullYear(), month: day.getMonth() });
  };

  // Appui prolongé sur une case de la bande Hebdo — navigue vers l'écran des
  // créneaux pour ce jour.
  const handleWeekDayLongPress = (iso: string) => {
    const day = new Date(iso + "T00:00:00");
    const dayConfig = getConfigForDate(iso) ?? slotConfig;
    const daySlots = getSlotsForDate(iso);
    const status = getDayStatus(reservations, iso, day, dayConfig, daySlots, startDate, "Visite");
    const isPast = iso < toISO(today);
    const isBlocked = (status === "past" && !isPast) || iso === admissionIso;
    if (isBlocked) {
      setBlockedDayModal(day);
      return;
    }
    setSelectedDay(day);
    setCalMonth({ year: day.getFullYear(), month: day.getMonth() });
    router.navigate(`${basePath}/slots` as any);
  };

  // Jour bloqué correspondant précisément à la date d'hospitalisation —
  // seul cas où la modale "jour non disponible" prend un habillage dédié
  // (picto hôpital, titre "Hospitalisation de X"), voir Modal plus bas.
  const isAdmissionBlockedDay = !!blockedDayModal && toISO(blockedDayModal) === admissionIso;

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <SpaceHeader space={space} active="calendar" basePath={basePath} C={C} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Switch Mensuel/Hebdo seul — règle uniquement la forme du
            calendrier juste en dessous, placé avant lui pour ça. */}
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border, marginBottom: 14 }]}>
          <SegmentedSwitch
            value={planningView === "hebdo"}
            onChange={(v) => {
              setPlanningView(v ? "hebdo" : "mensuel");
              if (v) setWeekAnchor(getMonday(selectedDay));
            }}
            leftLabel="Mensuel"
            rightLabel="Hebdo"
            C={C}
            minWidthRatio={0.5}
            onThumbWidth={setViewThumbWidth}
          />
        </View>

        <TouchableOpacity
          style={[styles.nextDispoBtn, { backgroundColor: C.accent }]}
          onPress={handleNextDispo}
          activeOpacity={0.85}
        >
          <Text style={styles.nextDispoText}>⚡ Prochaine disponibilité</Text>
        </TouchableOpacity>

        {planningView === "mensuel" ? (
        <>
        <View style={styles.monthNav}>
          <TouchableOpacity
            onPress={() => setCalMonth((m) => {
              const d = new Date(m.year, m.month - 1, 1);
              return { year: d.getFullYear(), month: d.getMonth() };
            })}
            style={[styles.navBtn, { borderColor: C.border }]}
          >
            <Text style={[styles.navBtnText, { color: C.text }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.monthName, { color: C.text }]}>{monthName}</Text>
          <TouchableOpacity
            onPress={() => setCalMonth((m) => {
              const d = new Date(m.year, m.month + 1, 1);
              return { year: d.getFullYear(), month: d.getMonth() };
            })}
            style={[styles.navBtn, { borderColor: C.border }]}
          >
            <Text style={[styles.navBtnText, { color: C.text }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Day labels */}
        <View style={styles.dayLabels}>
          {DAY_LABELS.map((d, i) => (
            <Text key={i} style={[styles.dayLabel, { color: C.muted }]}>{d}</Text>
          ))}
        </View>

        {/* Grid */}
        <View style={styles.grid}>
          {Array(firstDow).fill(null).map((_, i) => <View key={`e${i}`} style={[styles.cellOuter, styles.cell]} />)}
          {monthDays.map((day) => {
            const iso = toISO(day);
            const dayReservations = reservationsByDate.get(iso) ?? [];
            const dayConfig = getConfigForDate(iso) ?? slotConfig;
            const daySlots = getSlotsForDate(iso);
            const status = getDayStatus(dayReservations, iso, day, dayConfig, daySlots, startDate, "Visite");
            const isToday = toISO(day) === toISO(today);
            const isSelected = toISO(day) === toISO(selectedDay);
            // Un jour déjà passé reste consultable (lecture seule — la
            // réservation/modification est de toute façon bloquée par
            // BookingFlow) ; seul un jour structurellement invalide (avant le
            // début de l'espace, hors jours autorisés, date bloquée par
            // l'admin) reste non cliquable.
            const isPast = iso < toISO(today);
            const isBlocked = (status === "past" && !isPast) || iso === admissionIso;
            const dimmed = isPast || isBlocked;

            // Fond pastel Orange/Rouge (Partiel/Complet) — vérité globale
            // d'occupation de l'espace, non filtrée par selectedVisiteurKey.
            const visitesFill = status === "full" ? VISITES_DANGER_FILL : status === "partial" ? VISITES_ORANGE_FILL : null;
            // Point vert "Dispo" — uniquement les jours sans aucune visite/
            // nuitée réservée ce jour-là ; Partiel/Complet restent
            // représentés par visitesFill ci-dessus, sans point.
            const visitesDispoDot = status === "empty";
            // Fond pastel clair : texte foncé plutôt que blanc pour rester
            // lisible (contrairement à l'ancien fond saturé C.orange/C.danger).
            const pastelText = !!visitesFill;
            // Traits de bord par visiteur, filtrés par la légende
            // (selectedVisiteurKey).
            const dayVisiteurColors: string[] = [];
            const keysToday = new Set<string>();
            for (const r of dayReservations) {
              if (r.type !== "Visite") continue;
              const key = visiteurIdentityKey(r.prenom, r.nom);
              if (selectedVisiteurKey && key !== selectedVisiteurKey) continue;
              keysToday.add(key);
            }
            for (const key of Object.keys(visiteurColorByKey)) {
              if (keysToday.has(key)) dayVisiteurColors.push(visiteurColorByKey[key]);
            }

            // Jour hospitalisation/sortie/anniversaire : remplace tout le
            // contenu de la case (numéro du jour compris) par un pictogramme
            // plein cadre, jamais grisé même passé — voir styles.cellSpecialIcon.
            const specialIcon = iso === admissionIso ? "🏥" : iso === dischargeIso ? "🏠" : birthdateMonthDay === iso.slice(5) ? "🎉" : null;

            return (
              <View key={iso} style={styles.cellOuter}>
                <TouchableOpacity
                  style={[
                    styles.cell,
                    {
                      backgroundColor: isSelected ? C.accent : specialIcon ? C.card : dimmed ? "transparent" : (visitesFill ?? C.card),
                      borderColor: isSelected ? C.accent : isToday ? C.gold : C.border,
                      borderWidth: isToday ? 2 : 1,
                      opacity: specialIcon ? 1 : dimmed ? 0.3 : 1,
                    },
                  ]}
                  onPress={() => {
                    if (isBlocked) {
                      setBlockedDayModal(day);
                      return;
                    }
                    setSelectedDay(day);
                    setCalMonth({ year: day.getFullYear(), month: day.getMonth() });
                  }}
                  onLongPress={() => {
                    if (isBlocked) {
                      setBlockedDayModal(day);
                      return;
                    }
                    setSelectedDay(day);
                    setCalMonth({ year: day.getFullYear(), month: day.getMonth() });
                    router.navigate(`${basePath}/slots` as any);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.cellInner}>
                    {specialIcon ? (
                      <Text style={styles.cellSpecialIcon}>{specialIcon}</Text>
                    ) : (
                      <>
                        <Text style={[styles.cellDate, { color: isSelected ? "#fff" : isToday ? C.gold : pastelText ? LOGO_NAVY : C.text }]}>
                          {day.getDate()}
                        </Text>
                        {visitesDispoDot && <View style={[styles.dot, { backgroundColor: C.success }]} />}
                      </>
                    )}
                  </View>
                  <DayStripes colors={dayVisiteurColors} />
                </TouchableOpacity>
              </View>
            );
          })}
          {Array(trailingFillers).fill(null).map((_, i) => <View key={`t${i}`} style={[styles.cellOuter, styles.cell]} />)}
        </View>

        <View style={styles.legend}>
          {([[C.success, "Dispo"], [VISITES_ORANGE_FILL, "Partiel"], [VISITES_DANGER_FILL, "Complet"]] as [string, string][]).map(
            ([color, label]) => (
              <View key={label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={[styles.legendLabel, { color: C.muted }]}>{label}</Text>
              </View>
            ),
          )}
        </View>
        </>
        ) : (
        <>
        {/* Vue Hebdo (D) — bande de 7 jours avec marqueurs hospitalisation/
            sortie (F/G) et grisage avant la date d'hospitalisation (E). Un
            appui prolongé navigue vers l'écran dédié des créneaux, exactement
            comme la grille Mensuel — aucun détail de jour affiché ici. */}
        <WeekStrip
          C={C}
          slotConfig={slotConfig}
          reservations={reservations}
          getSlotsForDate={getSlotsForDate}
          getConfigForDate={getConfigForDate}
          startDate={startDate}
          weekAnchor={weekAnchor}
          onWeekChange={setWeekAnchor}
          selectedIso={selectedIso}
          onSelectDay={(iso) => setSelectedDay(new Date(iso + "T00:00:00"))}
          onDayPress={handleWeekDayPress}
          onDayLongPress={handleWeekDayLongPress}
          soinsMode={false}
          mesCreneauxOnly={false}
          role="visiteur"
          intervenantProfileId={null}
          myPin={myPin}
          myPrenom={myPrenom}
          myNom={myNom}
          admissionIso={admissionIso}
          dischargeIso={dischargeIso}
          richVisitesMode
          visiteurColorByKey={visiteurColorByKey}
          selectedVisiteurKey={selectedVisiteurKey}
        />
        </>
        )}

        <View style={{ marginTop: 16 }}>
          <PatientColorLegend
            C={C}
            items={visiteurLegendItems}
            selectedId={selectedVisiteurKey}
            onSelect={setSelectedVisiteurKey}
            maxVisible={4}
          />
        </View>

        <View style={{ marginTop: 16 }}>
          <PlanningDuJourBlock
            C={C}
            iso={selectedIso}
            reservations={visitesMainRows.filter((r) => r.date === selectedIso)}
            patientNameBySpaceId={{}}
            locationBySpaceId={{}}
            onSoinPress={openVisiteActions}
            reservationType="Visite"
            companionsById={companionsByMainId}
            onEmptyPress={handleCreneauxPress}
            onCreneauxPress={handleCreneauxPress}
            remainingBySlotId={remainingByMainId}
            patientBirthdate={space.patient_birthdate}
            patientFirstname={space.patient_firstname}
            patientAdmissionDate={admissionIso}
          />

          <Text style={[styles.sectionTitle, { color: C.gold }]}>
            {planningView === "hebdo" ? "Planning hebdo" : "Planning mensuel"}
          </Text>
          <SoinsPeriodBlock
            C={C}
            reservations={visitesMainRows.filter((r) => r.date !== selectedIso)}
            view={planningView}
            weekAnchor={weekAnchor}
            onWeekChange={setWeekAnchor}
            monthAnchor={calMonth}
            onMonthChange={setCalMonth}
            onDayPress={() => {}}
            onSoinPress={openVisiteActions}
            reservationType="Visite"
            companionsById={companionsByMainId}
          />

          <SoinsPlanifiesBlock
            C={C}
            reservations={visitesPanelReservations}
            reservationLabel="visite"
            title="Autres visites planifiées"
            includePast
            excludeUpToDate={periodEndIso}
            onPressRow={(_date, r) => openVisiteActions(r)}
          />
        </View>
      </ScrollView>

      {!!token && (
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
      )}

      <SoinActionModal
        C={C}
        visible={!!pendingVisite}
        reservation={pendingVisite}
        patientNameBySpaceId={{ [space.id]: "Visite auprès de " + space.patient_firstname }}
        locationBySpaceId={{ [space.id]: careLocationDetail(space) }}
        onModifier={handleModifierVisitePress}
        onYAller={handleYAllerVisitePress}
        onAjouterVisite={handleAjouterVisitePress}
        onClose={() => setPendingVisite(null)}
        remaining={pendingVisiteCapacity}
      />
      <VisiteEditFlow
        ref={visiteEditFlowRef}
        C={C}
        space={space}
        slotConfig={slotConfig}
        slots={slots}
        reservations={reservations}
        startDate={startDate}
        onSaved={refreshReservations}
      />

      {/* ── MODAL PROCHAINE DISPONIBILITÉ ──────────────────────────────────── */}
      <Modal transparent visible={!!nextDispoModal} animationType="fade" onRequestClose={() => setNextDispoModal(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setNextDispoModal(null)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modal, { backgroundColor: C.card, borderColor: C.accent }]}>
            <Text style={styles.modalEmoji}>⚡</Text>
            <Text style={[styles.modalLabel, { color: C.gold }]}>Prochaine disponibilité</Text>
            <Text style={[styles.modalDate, { color: C.text }]}>
              {nextDispoModal && toFrLong(nextDispoModal.date)}
            </Text>
            <Text style={[styles.modalSlot, { color: C.gold }]}>{nextDispoModal?.slot}</Text>
            {!!slotConfig && (
              <Text style={[styles.modalMeta, { color: C.muted }]}>
                Visite de {slotConfig.slot_duration_minutes} min max · {slotConfig.max_visitors_per_slot} personne{slotConfig.max_visitors_per_slot > 1 ? "s" : ""} max
              </Text>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtnSecondary, { borderColor: C.border }]} onPress={goToDay}>
                <Text style={[styles.modalBtnSecondaryText, { color: C.muted }]}>Voir le jour</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtnPrimary, { backgroundColor: C.accent }]} onPress={reserveNow}>
                <Text style={styles.modalBtnPrimaryText}>✓ Réserver</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── MODAL JOUR NON DISPONIBLE ───────────────────────────────────────── */}
      <Modal transparent visible={!!blockedDayModal} animationType="fade" onRequestClose={() => setBlockedDayModal(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setBlockedDayModal(null)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modal, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={styles.modalEmoji}>{isAdmissionBlockedDay ? "🏥" : "🚫"}</Text>
            <Text style={[styles.modalLabel, { color: C.gold }]}>
              {isAdmissionBlockedDay ? `Hospitalisation de ${space.patient_firstname}` : "Jour non disponible"}
            </Text>
            <Text style={[styles.modalDate, { color: C.text }]}>
              {blockedDayModal && blockedDayModal.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </Text>
            {isAdmissionBlockedDay ? null : !!blockedDayModal && slotConfig.blocked_dates?.includes(toISO(blockedDayModal)) ? (
              <Text style={[styles.modalMeta, { color: C.gold, marginTop: 8, fontStyle: "italic" }]}>
                {slotConfig.blocked_date_reasons?.[toISO(blockedDayModal)]
                  || "Cette date a été bloquée."}
              </Text>
            ) : (
              <Text style={[styles.modalMeta, { color: C.muted, marginTop: 4 }]}>
                Aucune visite n&apos;est possible ce jour-là.
              </Text>
            )}
            <TouchableOpacity
              style={[styles.modalBtnSecondary, { flex: 0, borderColor: C.border, width: "100%", marginTop: 16 }]}
              onPress={() => setBlockedDayModal(null)}
            >
              <Text style={[styles.modalBtnSecondaryText, { color: C.muted }]}>Fermer</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 20 },
  nextDispoBtn: { borderRadius: 12, paddingVertical: 11, alignItems: "center", marginBottom: 12 },
  nextDispoText: { fontFamily: "DM_Sans_700Bold", fontSize: 15, color: "#fff" },
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  monthName: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 17, textTransform: "capitalize" },
  navBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 },
  navBtnText: { fontSize: 18, fontWeight: "600" },
  dayLabels: { flexDirection: "row", justifyContent: "center", gap: 3, marginBottom: 4 },
  dayLabel: { width: "13.5%", textAlign: "center", fontFamily: "DM_Sans_600SemiBold", fontSize: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 3, marginBottom: 10 },
  cellOuter: { width: "13.5%", position: "relative" },
  cell: {
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  cellInner: { flex: 1, width: "100%", alignItems: "center", justifyContent: "center", gap: 2 },
  cellDate: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, textAlignVertical: "center", includeFontPadding: false },
  // Jour hospitalisation/sortie/anniversaire : pictogramme plein cadre à la
  // place du numéro du jour, centré horizontalement et verticalement.
  cellSpecialIcon: { fontSize: 20, lineHeight: 24 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  legend: { flexDirection: "row", justifyContent: "center", gap: 20 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontFamily: "DM_Sans_400Regular", fontSize: 11 },

  sectionTitle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10, marginTop: 20 },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 6 },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "center", alignItems: "center", padding: 20 },
  modal: { width: "100%", maxWidth: 340, borderRadius: 16, borderWidth: 1, padding: 24, alignItems: "center" },
  modalEmoji: { fontSize: 32, marginBottom: 8 },
  modalLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 },
  modalDate: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, textTransform: "capitalize", textAlign: "center", marginBottom: 6 },
  modalSlot: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 36, marginBottom: 8 },
  modalMeta: { fontFamily: "DM_Sans_400Regular", fontSize: 12, textAlign: "center", marginBottom: 12 },
  modalButtons: { flexDirection: "row", gap: 10, width: "100%", marginTop: 8 },
  modalBtnSecondary: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  modalBtnSecondaryText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  modalBtnPrimary: { flex: 1.3, borderRadius: 10, paddingVertical: 13, alignItems: "center", justifyContent: "center" },
  modalBtnPrimaryText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
});
