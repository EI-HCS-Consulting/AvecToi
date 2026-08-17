import { useState, useMemo, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Modal, Switch } from "react-native";
import { useRouter } from "expo-router";
import { useSpace } from "@/lib/SpaceContext";
import { supabase } from "@/lib/supabase";
import {
  getDayStatus, findNextAvailableSlot, getDaysInMonth, getMonday, addDays, toISO, toFrLong, isMyReservation,
} from "@/lib/slotUtils";
import { deleteLinkedCalendarEvent } from "@/lib/calendarSync";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { LOGO_GREEN, LOGO_PURPLE } from "@/lib/themes";
import SpaceHeader from "@/components/SpaceHeader";
import SegmentedSwitch from "@/components/SegmentedSwitch";
import WeekStrip from "@/components/WeekStrip";
import IntervenantPlanningPanel from "@/components/IntervenantPlanningPanel";
import SoinsDayDetail from "@/components/SoinsDayDetail";
import AdminAddReservation, { type AdminAddReservationHandle } from "@/components/AdminAddReservation";
import AdminEditReservation, { type AdminEditReservationHandle } from "@/components/AdminEditReservation";
import DeleteReservationConfirm, { type DeleteReservationConfirmHandle } from "@/components/DeleteReservationConfirm";
import { isSpaceCapped } from "@/lib/freemiumCap";
import type { Reservation } from "@/lib/types";

const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

export default function AdminCalendarScreen() {
  const { space, slotConfig, slots, reservations, loading, hasSpace, selectedDay, setSelectedDay, setPendingBookingSlot, refreshReservations, getConfigForDate, getSlotsForDate } = useSpace();
  const router = useRouter();
  const { theme: C } = useDisplayMode();
  const [nextDispoModal, setNextDispoModal] = useState<{ date: Date; iso: string; slot: string } | null>(null);
  const [blockedDayModal, setBlockedDayModal] = useState<Date | null>(null);
  // false = planning global (visites/nuitées), true = ne montre que
  // l'occupation des soins (interventions) — remplace l'ancien raccourci
  // "Voir les nuitées" (toujours accessible depuis Mes réservations / le
  // détail d'un jour).
  const [soinsMode, setSoinsMode] = useState(false);
  // Bascule "Afficher mes créneaux" — l'admin a lui aussi une identité
  // personnelle (admin_firstname/admin_lastname/admin_pin sur PatientSpace) :
  // ses propres réservations (ajoutées via AdminAddReservation, toujours au
  // PIN sentinelle "ADMIN") sont reconnues comme "siennes" au même titre
  // qu'un visiteur ordinaire — voir isMyReservation (lib/slotUtils.ts).
  const [mesCreneauxOnly, setMesCreneauxOnly] = useState(true);
  // Mensuel/Hebdo — la vue Hebdo permet de réserver directement un créneau
  // du jour sélectionné (D) sans passer par l'écran dédié (home/slots.tsx),
  // qui reste accessible en Mensuel (tap sur un jour).
  const [planningView, setPlanningView] = useState<"mensuel" | "hebdo">("mensuel");
  // Les 2 switches du bloc de réglages doivent avoir des pastilles de même
  // taille et des libellés alignés à la même position — le switch Visites/
  // Soins reprend la largeur naturelle calculée par Mensuel/Hebdo au lieu
  // d'en calculer une indépendamment (même mécanisme que Entraide.tsx).
  const [viewThumbWidth, setViewThumbWidth] = useState(0);
  const [toast, setToast] = useState("");
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const startDate = useMemo(
    () => space ? new Date(space.start_date + "T00:00:00") : today,
    [space, today],
  );
  const initialDay = useMemo(() => (today >= startDate ? today : startDate), [today, startDate]);

  const [calMonth, setCalMonth] = useState({ year: initialDay.getFullYear(), month: initialDay.getMonth() });
  const [weekAnchor, setWeekAnchor] = useState(() => getMonday(initialDay));

  const addRef = useRef<AdminAddReservationHandle>(null);
  const editRef = useRef<AdminEditReservationHandle>(null);
  const deleteRef = useRef<DeleteReservationConfirmHandle>(null);

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
    router.navigate("/(admin)/home/slots");
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
    router.navigate("/(admin)/home/slots");
  }

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

  if (loading) return null;

  if (!hasSpace || !space || !slotConfig) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <Text style={[styles.emptyText, { color: C.muted }]}>Aucun espace patient actif.</Text>
      </View>
    );
  }

  // Identité personnelle de l'admin (voir mesCreneauxOnly ci-dessus) —
  // toujours issue du space, jamais d'une session à charger comme côté
  // visiteur/intervenant.
  const myPin = space.admin_pin ?? null;
  const myPrenom = space.admin_firstname ?? null;
  const myNom = space.admin_lastname ?? null;
  const identityReady = !!myPrenom && !!myNom;
  // isMyReservation() retombe sur un simple match de PIN (sans vérifier le
  // nom) quand myPrenom/myNom sont vides — sûr côté visiteur (nom chargé de
  // façon asynchrone, au pire brièvement absent) mais pas pour l'admin : son
  // PIN peut être défini (recopié depuis son profil, voir account.tsx) sans
  // que admin_firstname/admin_lastname le soient (colonnes renseignées une
  // fois à la création de l'espace seulement). Sans cette garde, un visiteur
  // ayant choisi le même PIN à 4 chiffres que l'admin (pas garanti unique
  // dans l'espace) serait à tort reconnu comme "mien". On ignore donc le PIN
  // tant que le nom n'est pas fiable.
  const effectiveMyPin = identityReady ? myPin : null;

  const monthDays = getDaysInMonth(calMonth.year, calMonth.month);
  const firstDow = (new Date(calMonth.year, calMonth.month, 1).getDay() + 6) % 7;
  const trailingFillers = (7 - ((firstDow + monthDays.length) % 7)) % 7;
  const monthName = new Date(calMonth.year, calMonth.month, 1)
    .toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  // Marqueurs hospitalisation (F) / sortie (G) et seuil de grisage/réservation
  // (E) de la vue Hebdo — au format "YYYY-MM-DD", comparables directement aux
  // iso des jours de la bande.
  const admissionIso = space.patient_admission_date;
  const dischargeIso = space.patient_discharge_date;

  const selectedIso = toISO(selectedDay);
  const selectedDayConfig = getConfigForDate(selectedIso) ?? slotConfig;
  const selectedDaySlots = getSlotsForDate(selectedIso);

  // Période affichée par le panneau perso (IntervenantPlanningPanel) — suit
  // le switch Mensuel/Hebdo et le mois/la semaine parcouru(e), même logique
  // que (visitor)/home/calendar.tsx.
  const periodStartIso = planningView === "hebdo"
    ? toISO(weekAnchor)
    : toISO(new Date(calMonth.year, calMonth.month, 1));
  const periodEndIso = planningView === "hebdo"
    ? toISO(addDays(weekAnchor, 6))
    : toISO(new Date(calMonth.year, calMonth.month + 1, 0));

  // Panneau perso sous le calendrier (IntervenantPlanningPanel) — même
  // logique que le visiteur (élargi aux réservations partageant EXACTEMENT
  // un de mes créneaux, ex. un autre visiteur au même horaire) ; la grille,
  // elle, affiche toujours la vérité complète, voir familyBooked plus bas.
  const myReservations = identityReady
    ? reservations.filter((r) => isMyReservation(r, effectiveMyPin, null, myPrenom, myNom))
    : reservations;
  const myPanelSlotKeys = new Set(myReservations.map((r) => `${r.date}|${r.creneau}`));
  const panelReservations = mesCreneauxOnly && identityReady
    ? reservations.filter((r) => myPanelSlotKeys.has(`${r.date}|${r.creneau}`))
    : reservations;

  // Tap sur une case de la bande Hebdo — en mode Visites, même comportement
  // que le visiteur : navigue vers l'écran dédié des créneaux, aucun détail
  // affiché inline. En mode Soins, l'admin n'a pas d'écran dédié aux soins
  // (home/slots.tsx est réservé aux visites) — on se contente de sélectionner
  // le jour, affiché par le bloc lecture-seule sous le switch Visites/Soins.
  const handleWeekDayPress = (iso: string) => {
    const day = new Date(iso + "T00:00:00");
    if (soinsMode) {
      setSelectedDay(day);
      return;
    }
    const dayConfig = getConfigForDate(iso) ?? slotConfig;
    const daySlots = getSlotsForDate(iso);
    const status = getDayStatus(reservations, iso, day, dayConfig, daySlots, startDate, "Visite");
    const isPast = iso < toISO(today);
    const isBlocked = status === "past" && !isPast;
    if (isBlocked) {
      setBlockedDayModal(day);
      return;
    }
    setSelectedDay(day);
    router.navigate("/(admin)/home/slots");
  };

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <SpaceHeader space={space} active="calendar" basePath="/(admin)/home" C={C} />

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

        <View style={styles.dayLabels}>
          {DAY_LABELS.map((d, i) => (
            <Text key={i} style={[styles.dayLabel, { color: C.muted }]}>{d}</Text>
          ))}
        </View>

        <View style={styles.grid}>
          {Array(firstDow).fill(null).map((_, i) => <View key={`e${i}`} style={styles.cell} />)}
          {monthDays.map((day) => {
            const iso = toISO(day);
            const dayConfig = getConfigForDate(iso) ?? slotConfig;
            const daySlots = getSlotsForDate(iso);
            // `status` sert au blocage/navigation (tap sur la case) et suit
            // le type du mode actif. La pastille, elle, ne représente plus
            // jamais que les visites — voir visiteStatus.
            const status = getDayStatus(reservations, iso, day, dayConfig, daySlots, startDate, soinsMode ? "Intervention" : "Visite");
            const isToday = toISO(day) === toISO(today);
            const isSelected = toISO(day) === toISO(selectedDay);
            const isPast = iso < toISO(today) || status === "past";
            // Un jour non réservable (avant le début du suivi, jour de
            // semaine exclu, date bloquée) reste non cliquable — mais un
            // jour simplement passé s'ouvre, en lecture, pour voir qui est
            // venu ce jour-là.
            const isDisabled = status === "past";
            // Pastille Dispo/Partiel/Complet : ne représente plus que les
            // visites, et ne s'affiche qu'en mode Visites — en mode Soins,
            // seul le cadre violet reste visible.
            const visiteStatus = getDayStatus(reservations, iso, day, dayConfig, daySlots, startDate, "Visite");
            const dotColor = soinsMode ? "transparent" :
              visiteStatus === "full" ? C.danger :
              visiteStatus === "partial" ? C.orange :
              visiteStatus === "empty" ? C.success : "transparent";

            // Bande verte en bas de case = strictement personnelle (mes
            // propres visites/nuitées, voir isMyReservation/identityReady
            // plus haut) — jamais celles d'un autre visiteur. Toujours
            // visible, quel que soit le mode ou "Afficher mes créneaux".
            const familyBooked = reservations.some((r) => r.date === iso && isMyReservation(r, effectiveMyPin, null, myPrenom, myNom));
            // Cadre violet : uniquement en mode Soins (l'admin n'a jamais de
            // fiche intervenant, donc pas de filtrage "mes cadres" possible
            // ici — toujours la vérité complète des soins de tous les
            // intervenants).
            const interventionBooked = reservations.some((r) => r.date === iso && r.type === "Intervention");
            const frameVisible = soinsMode && interventionBooked;

            return (
              <TouchableOpacity
                key={iso}
                style={[
                  styles.cell,
                  {
                    backgroundColor: isSelected ? C.accent : isPast ? "transparent" : C.card,
                    borderColor: isSelected ? C.accent : frameVisible ? LOGO_PURPLE : isToday ? C.gold : C.border,
                    borderWidth: isToday || frameVisible ? 2 : 1,
                    opacity: isPast ? 0.3 : 1,
                  },
                ]}
                onPress={() => {
                  if (!isDisabled) {
                    setSelectedDay(day);
                    router.navigate("/(admin)/home/slots");
                  } else {
                    setBlockedDayModal(day);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.cellInner}>
                  <Text style={[styles.cellDate, { color: isSelected ? "#fff" : isToday ? C.gold : C.text }]}>
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

        <View style={styles.legend}>
          <Text style={[styles.legendPrefix, { color: C.muted }]}>Visiteurs :</Text>
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
        {/* Vue Hebdo (D) — bande de 7 jours avec marqueurs hospitalisation/
            sortie (F/G) et grisage avant la date d'hospitalisation (E). Aucun
            détail de jour affiché inline ici, exactement comme le visiteur :
            un tap navigue vers l'écran dédié des créneaux (en mode Visites).
            En mode Soins, l'admin n'a pas d'écran dédié — le détail
            (lecture seule) est affiché plus bas, sous le switch. */}
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
          mesCreneauxOnly={mesCreneauxOnly}
          role="visiteur"
          intervenantProfileId={null}
          myPin={effectiveMyPin}
          myPrenom={myPrenom}
          myNom={myNom}
          admissionIso={admissionIso}
          dischargeIso={dischargeIso}
        />
        </>
        )}

        {/* Switch Visites/Soins + "Afficher mes créneaux" regroupés dans un
            même bloc, placé sous le calendrier — mêmes réglages que le
            visiteur : eux seuls règlent l'affichage du panneau perso juste
            en dessous, le calendrier affichant toujours la vérité complète
            (voir familyBooked plus haut). Le bloc reste affiché même sans
            intervenants activés, "Afficher mes créneaux" restant utile pour
            filtrer les visites/nuitées. */}
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border, marginTop: 16 }]}>
          {space.intervenants_enabled && (
            <SegmentedSwitch value={soinsMode} onChange={setSoinsMode} leftLabel="Visites" rightLabel="Soins" C={C} thumbWidth={viewThumbWidth || undefined} />
          )}
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleLabel, { color: C.text }]}>👁️ Afficher mes créneaux</Text>
              <Text style={[styles.toggleDesc, { color: C.muted }]}>
                {mesCreneauxOnly
                  ? "Le panneau ci-dessous ne liste que vos propres visites/nuitées. Le calendrier, lui, affiche toujours tout le monde."
                  : soinsMode
                    ? "Le panneau ci-dessous liste les soins de tous les intervenants de l'espace patient."
                    : "Le panneau ci-dessous liste les visites/nuitées de tout le monde."}
              </Text>
            </View>
            <Switch
              value={mesCreneauxOnly}
              onValueChange={setMesCreneauxOnly}
              trackColor={{ false: C.border, true: C.accent }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Détail Soins de la semaine (Hebdo + mode Soins uniquement) — pas
            d'écran dédié équivalent à home/slots.tsx pour les soins côté
            admin, donc affiché ici en lecture seule, juste avant "SOINS
            PLANIFIÉS". */}
        {planningView === "hebdo" && soinsMode && (
          <>
            <Text style={[styles.weekDayTitle, { color: C.text, marginTop: 16 }]}>{toFrLong(selectedDay)}</Text>
            <SoinsDayDetail
              C={C}
              iso={selectedIso}
              day={selectedDay}
              config={selectedDayConfig}
              daySlots={selectedDaySlots}
              reservations={reservations}
              status={getDayStatus(reservations, selectedIso, selectedDay, selectedDayConfig, selectedDaySlots, startDate, "Intervention")}
            />
          </>
        )}

        <View style={{ marginTop: 16 }}>
          <IntervenantPlanningPanel
            C={C}
            reservations={panelReservations}
            soinsMode={soinsMode}
            myPin={effectiveMyPin}
            myPrenom={myPrenom}
            myNom={myNom}
            periodStartIso={periodStartIso}
            periodEndIso={periodEndIso}
            periodLabel={planningView === "hebdo" ? "cette semaine" : "ce mois-ci"}
          />
        </View>
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
                <Text style={styles.modalBtnPrimaryText}>Réserver</Text>
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
              {blockedDayModal && toFrLong(blockedDayModal)}
            </Text>
            {!!blockedDayModal && slotConfig.blocked_dates?.includes(toISO(blockedDayModal)) ? (
              <Text style={[styles.modalMeta, { color: C.gold, marginTop: 8, fontStyle: "italic" }]}>
                {slotConfig.blocked_date_reasons?.[toISO(blockedDayModal)]
                  || "Vous avez bloqué cette date."}
              </Text>
            ) : (
              <Text style={[styles.modalMeta, { color: C.muted, marginTop: 4 }]}>
                Aucune visite n&apos;est possible ce jour-là.
              </Text>
            )}
            <TouchableOpacity style={[styles.modalBtnSecondary, { flex: 0, borderColor: C.border, width: "100%", marginTop: 16 }]} onPress={() => setBlockedDayModal(null)}>
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
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 14, textAlign: "center", lineHeight: 22 },
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
  cell: { width: "13.5%", aspectRatio: 1, borderRadius: 8, borderWidth: 1, overflow: "hidden" },
  cellInner: { flex: 1, width: "100%", alignItems: "center", justifyContent: "center", gap: 2 },
  cellDate: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, textAlignVertical: "center", includeFontPadding: false },
  dot: { width: 4, height: 4, borderRadius: 2 },
  visitStripe: { position: "absolute", left: 0, right: 0, bottom: 0, height: 4 },
  legend: { flexDirection: "row", justifyContent: "center", gap: 20 },
  legendPrefix: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11 },
  // Ecart plus large que la ligne du dessus pour bien séparer "Mes créneaux"
  // de "Intervenant"/"Soin".
  legendRow2: { marginTop: 8, gap: 40 },
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

  weekDayTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 16, textTransform: "capitalize", textAlign: "center", marginBottom: 10 },

  toast: { position: "absolute", bottom: 24, alignSelf: "center", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  toastText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, color: "#fff" },

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
