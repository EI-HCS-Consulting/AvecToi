import { useState, useMemo, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Modal, Switch,
} from "react-native";
import { useVisitorSpace } from "@/lib/VisitorContext";
import {
  getDayStatus, findNextAvailableSlot, getDaysInMonth, getMonday,
  toISO, toFrLong, isMyReservation,
} from "@/lib/slotUtils";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { getVisitorSession } from "@/lib/visitorSession";
import { LOGO_GREEN, LOGO_PURPLE } from "@/lib/themes";
import SpaceHeader from "@/components/SpaceHeader";
import SegmentedSwitch from "@/components/SegmentedSwitch";
import WeekStrip from "@/components/WeekStrip";
import IntervenantPlanningPanel from "@/components/IntervenantPlanningPanel";
import BookingFlow, { type BookingFlowHandle } from "@/components/BookingFlow";
import InterventionBookingFlow, { type InterventionBookingFlowHandle } from "@/components/InterventionBookingFlow";
import { useRouter } from "expo-router";

const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

export default function VisitorCalendarScreen() {
  const { space, slotConfig, slots, reservations, selectedDay, setSelectedDay, setPendingBookingSlot, token, refreshReservations, getConfigForDate, getSlotsForDate, mesCreneauxOnly, setMesCreneauxOnly } = useVisitorSpace();
  const router = useRouter();
  const [nextDispoModal, setNextDispoModal] = useState<{ date: Date; iso: string; slot: string } | null>(null);
  const [blockedDayModal, setBlockedDayModal] = useState<Date | null>(null);
  // false = planning global (visites/nuitées), true = ne montre que
  // l'occupation des soins (interventions) — remplace l'ancien raccourci
  // "Voir les nuitées".
  const [soinsMode, setSoinsMode] = useState(false);
  // Basculer sur "Soins" désactive "Afficher mes créneaux" : ce filtre
  // s'appliquait au mode qu'on quitte (visites/nuitées) et resterait sinon
  // actif sans que rien à l'écran n'indique pourquoi le panneau des soins
  // paraît vide au premier soin non-personnel.
  function handleSoinsModeChange(next: boolean) {
    setSoinsMode(next);
    if (next) setMesCreneauxOnly(false);
  }
  // Un intervenant voit, en plus du cadre violet visible par tous (soin ce
  // jour-là), l'intérieur de la case remplie en violet quand le soin lui est
  // assigné à LUI précisément — voir home/slots.tsx pour role/intervenantProfileId.
  const [role, setRole] = useState<"visiteur" | "intervenant" | null>(null);
  const [intervenantProfileId, setIntervenantProfileId] = useState<string | null>(null);
  const [myPin, setMyPin] = useState<string | null>(null);
  // Prénom/nom de la session — désambiguïsent deux visiteurs ayant choisi le
  // même PIN à 4 chiffres (pas garanti unique dans un espace) lors du calcul
  // de la bande verte "mes créneaux" — voir isMyReservation (lib/slotUtils.ts).
  const [myPrenom, setMyPrenom] = useState<string | null>(null);
  const [myNom, setMyNom] = useState<string | null>(null);
  // Mensuel/Hebdo — commun aux 3 rôles désormais. En Hebdo, une bande de 7
  // jours (WeekStrip) remplace la grille mensuelle et permet de réserver
  // directement un créneau du jour sélectionné (D), sans passer par l'écran
  // dédié (home/slots.tsx), qui reste accessible en Mensuel (tap sur un jour).
  const [planningView, setPlanningView] = useState<"mensuel" | "hebdo">("mensuel");
  // Bascule "Afficher mes créneaux" (mesCreneauxOnly, partagée via
  // VisitorContext — voir home/slots.tsx qui en tient compte aussi),
  // disponible pour tous les rôles. La grille (pastille, cadre violet, bande
  // verte) affiche TOUJOURS la vérité complète, quel que soit ce réglage —
  // voir familyBooked/interventionBooked plus bas. Son seul effet : filtrer
  // le panneau perso en dessous du calendrier (IntervenantPlanningPanel,
  // commun aux 3 rôles) sur les seules réservations de LA PERSONNE QUI
  // REGARDE plutôt que celles de tout le monde — voir panelReservations.
  // Les 2 switches du bloc de réglages doivent avoir des pastilles de même
  // taille et des libellés alignés à la même position — le switch Visites/
  // Soins reprend la largeur naturelle calculée par Mensuel/Hebdo au lieu
  // d'en calculer une indépendamment (même mécanisme que Entraide.tsx).
  const [viewThumbWidth, setViewThumbWidth] = useState(0);
  useEffect(() => {
    getVisitorSession().then((s) => {
      setRole(s?.role ?? "visiteur");
      setIntervenantProfileId(s?.intervenantProfileId ?? null);
      setMyPin(s?.pin ?? null);
      setMyPrenom(s?.prenom ?? null);
      setMyNom(s?.nom ?? null);
    });
  }, []);

  const { theme: C } = useDisplayMode();
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const startDate = useMemo(
    () => space ? new Date(space.start_date + "T00:00:00") : today,
    [space, today],
  );
  const initialDay = useMemo(() => (today >= startDate ? today : startDate), [today, startDate]);

  const [calMonth, setCalMonth] = useState({ year: initialDay.getFullYear(), month: initialDay.getMonth() });
  const [weekAnchor, setWeekAnchor] = useState(() => getMonday(initialDay));

  const flowRef = useRef<BookingFlowHandle>(null);
  const interventionFlowRef = useRef<InterventionBookingFlowHandle>(null);

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
    router.navigate("/(visitor)/home/slots");
  }

  function reserveNow() {
    if (!nextDispoModal) return;
    setSelectedDay(nextDispoModal.date);
    setPendingBookingSlot(nextDispoModal.slot);
    setNextDispoModal(null);
    router.navigate("/(visitor)/home/slots");
  }

  if (!space || !slotConfig) return null;

  // Marqueurs hospitalisation (F) / sortie (G) et seuil de grisage/réservation
  // (E) de la vue Hebdo — au format "YYYY-MM-DD", comparables directement aux
  // iso des jours de la bande.
  const admissionIso = space.patient_admission_date;
  const dischargeIso = space.patient_discharge_date;

  // La grille (pastille de statut, cadre violet, bande Hebdo) affiche
  // toujours la vérité complète : vue Visites = toutes les visites des
  // visiteurs, vue Soins = tous les soins de tous les intervenants —
  // "Afficher mes créneaux" ne filtre plus ces éléments, voir plus bas
  // pour son seul effet restant : le panneau perso sous le calendrier
  // (IntervenantPlanningPanel, commun aux 3 rôles), qui s'auto-filtre déjà
  // par type de réservation selon soinsMode — voir isMyReservation
  // (lib/slotUtils.ts) pour le détail : PIN + prénom/nom pour une visite/
  // nuitée, intervenant_profile_id (fiable, pas de collision possible) pour
  // un soin. Tant que l'identité de session n'est pas encore chargée, on
  // retombe sur la liste complète plutôt que sur un panneau vide le temps du
  // fetch.
  const identityReady = !!myPin || !!intervenantProfileId;
  const myReservations = identityReady
    ? reservations.filter((r) => isMyReservation(r, myPin, intervenantProfileId, myPrenom, myNom))
    : reservations;
  // "Afficher mes créneaux" ne doit pas masquer un autre visiteur partageant
  // EXACTEMENT un de mes créneaux (ex. 2 visiteurs sur le même horaire) —
  // savoir qui est présent avec soi lors d'une visite est une information
  // importante à garder visible, même filtre activé. On élargit donc aux
  // réservations dont le date+créneau correspond à l'un des miens, sans pour
  // autant réafficher tout le monde comme quand le filtre est désactivé.
  const myPanelSlotKeys = new Set(myReservations.map((r) => `${r.date}|${r.creneau}`));
  const panelReservations = mesCreneauxOnly && identityReady
    ? reservations.filter((r) => myPanelSlotKeys.has(`${r.date}|${r.creneau}`))
    : reservations;

  const selectedIso = toISO(selectedDay);

  // Tap sur une case de la bande Hebdo — même comportement que le tap sur une
  // case de la grille Mensuel (onPress ci-dessous) : jour bloqué par l'admin
  // → modal, sinon navigation vers l'écran dédié des créneaux.
  const handleWeekDayPress = (iso: string) => {
    const day = new Date(iso + "T00:00:00");
    const dayConfig = getConfigForDate(iso) ?? slotConfig;
    const daySlots = getSlotsForDate(iso);
    const status = getDayStatus(reservations, iso, day, dayConfig, daySlots, startDate, soinsMode ? "Intervention" : "Visite");
    const isPast = iso < toISO(today);
    const isBlocked = status === "past" && !isPast;
    if (isBlocked) {
      setBlockedDayModal(day);
      return;
    }
    setSelectedDay(day);
    setCalMonth({ year: day.getFullYear(), month: day.getMonth() });
    router.navigate("/(visitor)/home/slots");
  };

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <SpaceHeader space={space} active="calendar" basePath="/(visitor)/home" C={C} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Switch Mensuel/Hebdo seul — règle uniquement la forme du
            calendrier juste en dessous, placé avant lui pour ça. */}
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border, marginBottom: 14 }]}>
          <SegmentedSwitch
            value={planningView === "hebdo"}
            onChange={(v) => setPlanningView(v ? "hebdo" : "mensuel")}
            leftLabel="Mensuel"
            rightLabel="Hebdo"
            C={C}
            minWidthRatio={0.5}
            onThumbWidth={setViewThumbWidth}
          />
        </View>

        {/* "Prochaine disponibilité" reste réservé aux visiteurs (l'intervenant
            n'a pas besoin de chercher un créneau libre côté famille). */}
        {role !== "intervenant" && (
          <TouchableOpacity
            style={[styles.nextDispoBtn, { backgroundColor: C.accent }]}
            onPress={handleNextDispo}
            activeOpacity={0.85}
          >
            <Text style={styles.nextDispoText}>⚡ Prochaine disponibilité</Text>
          </TouchableOpacity>
        )}

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
          {Array(firstDow).fill(null).map((_, i) => <View key={`e${i}`} style={styles.cell} />)}
          {monthDays.map((day) => {
            const iso = toISO(day);
            const dayConfig = getConfigForDate(iso) ?? slotConfig;
            const daySlots = getSlotsForDate(iso);
            const status = getDayStatus(reservations, iso, day, dayConfig, daySlots, startDate, soinsMode ? "Intervention" : "Visite");
            const isToday = toISO(day) === toISO(today);
            const isSelected = toISO(day) === toISO(selectedDay);
            // Un jour déjà passé reste consultable (lecture seule — la
            // réservation/modification est de toute façon bloquée par
            // BookingFlow) ; seul un jour structurellement invalide (avant le
            // début de l'espace, hors jours autorisés, date bloquée par
            // l'admin) reste non cliquable.
            const isPast = iso < toISO(today);
            const isBlocked = status === "past" && !isPast;
            const dimmed = isPast || isBlocked;

            const dotColor =
              status === "full" ? C.danger :
              status === "partial" ? C.orange :
              status === "empty" ? C.success : "transparent";

            // Bande verte en bas de case = strictement personnelle (comparée
            // au PIN de la session courante) : visite/nuitée réservée par MOI
            // ou, si je suis intervenant, soin réservé par MOI — jamais les
            // réservations d'un autre visiteur/intervenant ni de l'admin.
            // Bordure violette = un soin existe ce jour-là, pour TOUT le
            // monde (remplace la bordure grise par défaut, ne déborde jamais
            // de la case) — un intervenant voit donc les deux ensemble sur
            // ses propres jours de soin : bande verte (perso) + cadre violet
            // (soin planifié, visible de tous).
            const familyBooked = reservations.some((r) => r.date === iso && isMyReservation(r, myPin, intervenantProfileId, myPrenom, myNom));
            // Case remplie en violet uniquement pour l'intervenant assigné à
            // CE soin — les autres intervenants (comme les visiteurs/admin)
            // ne voient que le cadre violet ci-dessous.
            const myInterventionToday = role === "intervenant" && !!intervenantProfileId &&
              reservations.some((r) => r.date === iso && r.type === "Intervention" && r.intervenant_profile_id === intervenantProfileId);
            // Cadre violet : tous les soins de tous les intervenants, sans
            // filtrage — la vue Soins doit rester une vérité complète pour
            // tout le monde, "Afficher mes créneaux" ne le concerne pas.
            const interventionBooked = reservations.some((r) => r.date === iso && r.type === "Intervention");

            return (
              <TouchableOpacity
                key={iso}
                style={[
                  styles.cell,
                  {
                    backgroundColor: isSelected ? C.accent : dimmed ? "transparent" : myInterventionToday ? LOGO_PURPLE : C.card,
                    borderColor: isSelected ? C.accent : interventionBooked ? LOGO_PURPLE : isToday ? C.gold : C.border,
                    borderWidth: isToday || interventionBooked ? 2 : 1,
                    opacity: dimmed ? 0.3 : 1,
                  },
                ]}
                onPress={() => {
                  if (isBlocked) {
                    setBlockedDayModal(day);
                    return;
                  }
                  setSelectedDay(day);
                  setCalMonth({ year: day.getFullYear(), month: day.getMonth() });
                  router.navigate("/(visitor)/home/slots");
                }}
                activeOpacity={0.7}
              >
                <View style={styles.cellInner}>
                  <Text style={[styles.cellDate, { color: isSelected || myInterventionToday ? "#fff" : isToday ? C.gold : C.text }]}>
                    {day.getDate()}
                  </Text>
                  <View style={[styles.dot, { backgroundColor: dotColor }]} />
                </View>
                {!!familyBooked && (
                  <View pointerEvents="none" style={[styles.visitStripe, { backgroundColor: LOGO_GREEN }]} />
                )}
              </TouchableOpacity>
            );
          })}
          {Array(trailingFillers).fill(null).map((_, i) => <View key={`t${i}`} style={styles.cell} />)}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          {([[C.success, "Dispo"], [C.orange, "Partiel"], [C.danger, "Complet"]] as [string, string][]).map(
            ([color, label]) => (
              <View key={label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={[styles.legendLabel, { color: C.muted }]}>{label}</Text>
              </View>
            ),
          )}
        </View>
        <View style={[styles.legend, styles.legendRow2]}>
          <View style={styles.legendItem}>
            <View style={[styles.legendStripeSwatch, { borderColor: C.border }]}>
              <View style={[styles.legendStripeBar, { backgroundColor: LOGO_GREEN }]} />
            </View>
            <Text style={[styles.legendLabel, { color: C.muted }]}>Mes créneaux</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendFrame, { borderColor: LOGO_PURPLE }]} />
            <Text style={[styles.legendLabel, { color: C.muted }]}>{soinsMode ? "Soin" : "Intervenant"}</Text>
          </View>
        </View>
        </>
        ) : (
        <>
        {/* Vue Hebdo (D) — bande de 7 jours commune aux 3 rôles, avec
            marqueurs hospitalisation/sortie (F/G) et grisage avant la date
            d'hospitalisation (E). Un tap sur un jour navigue vers l'écran
            dédié des créneaux, exactement comme la grille Mensuel — aucun
            détail de jour affiché ici. */}
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
          soinsMode={soinsMode}
          role={role}
          intervenantProfileId={intervenantProfileId}
          myPin={myPin}
          myPrenom={myPrenom}
          myNom={myNom}
          admissionIso={admissionIso}
          dischargeIso={dischargeIso}
        />
        </>
        )}

        {/* Switch Visites/Soins + "Afficher mes créneaux" regroupés dans un
            même bloc, placé sous le calendrier : eux seuls règlent
            l'affichage du panneau perso juste en dessous (le calendrier,
            lui, affiche toujours la vérité complète — voir
            panelReservations plus haut). Le switch Visites/Soins n'existe
            que si les intervenants sont activés dans l'espace ; le bouton
            "Afficher mes créneaux" reste utile même sans eux (filtre
            visites/nuitées), donc le bloc reste affiché dans tous les cas. */}
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border, marginTop: 16 }]}>
          {space.intervenants_enabled && (
            <SegmentedSwitch value={soinsMode} onChange={handleSoinsModeChange} leftLabel="Visites" rightLabel="Soins" C={C} thumbWidth={viewThumbWidth || undefined} />
          )}
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleLabel, { color: C.text }]}>👁️ Afficher mes créneaux</Text>
              <Text style={[styles.toggleDesc, { color: C.muted }]}>
                {mesCreneauxOnly
                  ? `Le panneau ci-dessous ne liste que t${role === "intervenant" ? "es propres soins" : "es propres visites/nuitées"}. Le calendrier, lui, affiche toujours tout le monde.`
                  : `Le panneau ci-dessous liste les ${role === "intervenant" ? "soins" : "visites/nuitées"} de tout le monde.`}
              </Text>
            </View>
            <Switch
              value={mesCreneauxOnly}
              onValueChange={setMesCreneauxOnly}
              trackColor={{ false: C.border, true: C.accent }}
              thumbColor="#fff"
            />
          </View>

          {/* Vue cross-space : liste tous les espaces patients auxquels cet
              intervenant est rattaché (même téléphone) et son planning
              d'interventions sur l'ensemble (jamais de visites) — voir
              app/(visitor)/home/mes-espaces-patients.tsx. */}
          {role === "intervenant" && (
            <TouchableOpacity
              style={[styles.toggleRow, { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border }]}
              onPress={() => router.push("/(visitor)/home/mes-espaces-patients" as any)}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.toggleLabel, { color: C.text }]}>🗂️ Mes Espaces Patients</Text>
                <Text style={[styles.toggleDesc, { color: C.muted }]}>
                  Vue d&apos;ensemble de tes interventions sur tous tes espaces patients.
                </Text>
              </View>
              <Text style={[styles.chevron, { color: C.muted }]}>›</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ marginTop: 16 }}>
          <IntervenantPlanningPanel
            C={C}
            reservations={panelReservations}
            soinsMode={soinsMode}
            myPin={myPin}
            myPrenom={myPrenom}
            myNom={myNom}
            onEdit={(r) => flowRef.current?.openPinModal(r)}
          />
        </View>
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
          homeCalendarPath="/(visitor)/home/calendar"
          C={C}
        />
      )}

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
            <Text style={styles.modalEmoji}>🚫</Text>
            <Text style={[styles.modalLabel, { color: C.gold }]}>Jour non disponible</Text>
            <Text style={[styles.modalDate, { color: C.text }]}>
              {blockedDayModal && blockedDayModal.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </Text>
            {!!blockedDayModal && slotConfig.blocked_dates?.includes(toISO(blockedDayModal)) ? (
              <Text style={[styles.modalMeta, { color: C.gold, marginTop: 8, fontStyle: "italic" }]}>
                {slotConfig.blocked_date_reasons?.[toISO(blockedDayModal)]
                  || "Cette date a été bloquée par l'administrateur du groupe."}
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
  cell: {
    width: "13.5%",
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  cellInner: { flex: 1, width: "100%", alignItems: "center", justifyContent: "center", gap: 2 },
  cellDate: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, textAlignVertical: "center", includeFontPadding: false },
  dot: { width: 4, height: 4, borderRadius: 2 },
  visitStripe: { position: "absolute", left: 0, right: 0, bottom: 0, height: 4 },
  legend: { flexDirection: "row", justifyContent: "center", gap: 20 },
  legendRow2: { marginTop: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendFrame: { width: 14, height: 14, borderRadius: 4, borderWidth: 2 },
  legendStripeSwatch: { width: 14, height: 14, borderRadius: 4, borderWidth: 1, overflow: "hidden" },
  legendStripeBar: { position: "absolute", left: 0, right: 0, bottom: 0, height: 3 },
  legendLabel: { fontFamily: "DM_Sans_400Regular", fontSize: 11 },

  card: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 6 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  toggleLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14, marginBottom: 4 },
  toggleDesc: { fontFamily: "DM_Sans_400Regular", fontSize: 12, lineHeight: 17 },
  chevron: { fontFamily: "DM_Sans_700Bold", fontSize: 16 },


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
