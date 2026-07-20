import { useState, useMemo, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Modal, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { scheduleVisitReminder, cancelVisitReminder } from "@/lib/notifications";
import {
  linkCalendarEvent, getLinkedCalendarEvent, unlinkCalendarEvent,
  addToNativeCalendar, updateLinkedCalendarEvent, deleteLinkedCalendarEvent,
} from "@/lib/calendarSync";
import { supabase } from "@/lib/supabase";
import { getVisitorSession, saveVisitorSession, sessionPinMatches } from "@/lib/visitorSession";
import PinPad from "@/components/PinPad";
import MiniCalendar from "@/components/MiniCalendar";
import { getSlotOccupancy, isReservationDatePast, isSlotFullyPast, toISO, toFrLong, toFrShort, nightStartSlot, nightRangeLabel } from "@/lib/slotUtils";
import { isSpaceCapped } from "@/lib/freemiumCap";
import type { Reservation, SlotConfig, PatientSpace } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Réservation + PIN (modifier/annuler) + ajout au calendrier natif, factorisé
// pour être utilisé à la fois par (visitor)/home/slots.tsx (Créneaux,
// type="Visite") et (visitor)/home/nights.tsx (Nuits, type="Nuit") — c'est
// exactement la même logique des deux côtés, seul le créneau ciblé change.
// L'admin a son propre flux (sans PIN) dans (admin)/home/slots.tsx.

export interface BookingFlowHandle {
  openBooking: (iso: string, slot: string, prefill?: { prenom: string; nom: string }) => void;
  openPinModal: (r: Reservation) => void;
}

interface Props {
  type: "Visite" | "Nuit";
  space: PatientSpace;
  slotConfig: SlotConfig;
  slots: string[]; // utilisé pour le sélecteur de créneau lors d'une édition "Visite" — inutile pour "Nuit"
  reservations: Reservation[];
  startDate: Date;
  token: string;
  refreshReservations: () => Promise<void>;
  homeCalendarPath: "/(visitor)/home/calendar";
  C: Theme;
}

interface ConfirmedBooking {
  id: string;
  prenom: string;
  pin: string;
  iso: string;
  slot: string;
  companions: string[];
  // Le PIN de session existait-il déjà avant cette réservation, ou vient-il
  // d'être choisi à l'instant (premier passage sur cet appareil) ? Sert à
  // n'afficher le récap "note ce code" que quand il y a vraiment un nouveau
  // code à retenir.
  isNewPin: boolean;
}

async function updateLastActivity(spaceId: string) {
  await supabase.from("patient_spaces").update({ last_activity_at: new Date().toISOString() }).eq("id", spaceId);
}

function BookingFlow(
  { type, space, slotConfig, slots, reservations, startDate, token, refreshReservations, homeCalendarPath, C }: Props,
  ref: React.Ref<BookingFlowHandle>,
) {
  const router = useRouter();
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [pinValue, setPinValue] = useState("");
  const [saving, setSaving] = useState(false);
  // Email optionnel de la personne réservée, proposé uniquement quand le
  // visiteur réserve sous un nom différent du sien (ex. un proche âgé) —
  // permet d'envoyer un email de confirmation avec les infos pratiques
  // (hôpital, plan, lien calendrier), voir handleBook / notify-guest-confirmation.
  const [guestEmail, setGuestEmail] = useState("");
  const [sendGuestEmail, setSendGuestEmail] = useState(true);
  // Accompagnants — chacun devient sa propre réservation (prenom/nom), liée
  // au réservataire principal via group_id : ils comptent donc dans
  // l'occupation du créneau et apparaissent partout comme des réservations
  // à part entière (créneau, Mes réservations), au même titre que les
  // ajouts multi-personnes côté admin (cf. AdminAddReservation.tsx).
  const [companions, setCompanions] = useState<{ prenom: string; nom: string }[]>([]);

  const [savedPrenom, setSavedPrenom] = useState("");
  const [savedNom, setSavedNom] = useState("");
  // PIN déjà enregistré sur cet appareil (visiteur "identifié") — dès qu'il
  // existe, on ne redemande plus de choisir un code à chaque réservation, on
  // le réutilise silencieusement. Absent seulement au tout premier passage
  // sur cet appareil, où choisir un PIN revient à créer son identité ici.
  const [sessionPin, setSessionPin] = useState("");
  useEffect(() => {
    getVisitorSession().then((s) => {
      if (s) { setSavedPrenom(s.prenom); setSavedNom(s.nom); setSessionPin(s.pin || ""); }
    });
  }, []);

  const [bookingTarget, setBookingTarget] = useState<{ iso: string; slot: string } | null>(null);
  const [confirmed, setConfirmed] = useState<ConfirmedBooking | null>(null);
  const [calendarAdded, setCalendarAdded] = useState(false);

  const [pinModal, setPinModal] = useState<Reservation | null>(null);
  const [pinEntry, setPinEntry] = useState("");
  const [pinError, setPinError] = useState(false);
  const [pinStep, setPinStep] = useState<"enter" | "actions">("enter");
  const [pinDeleting, setPinDeleting] = useState(false);
  // Reflète si la réservation ouverte via PIN a déjà un événement calendrier
  // lié (storage local) — distinct de calendarAdded, qui ne suit que le flux
  // juste après une nouvelle réservation.
  const [pinCalendarAdded, setPinCalendarAdded] = useState(false);

  const [editModal, setEditModal] = useState<Reservation | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editSlot, setEditSlot] = useState<string | null>(null);
  const [editPrenom, setEditPrenom] = useState("");
  const [editNom, setEditNom] = useState("");
  const [editTel, setEditTel] = useState("");
  const [editCalMonth, setEditCalMonth] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [editSaving, setEditSaving] = useState(false);

  const [toast, setToast] = useState("");
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
  }

  function openBooking(iso: string, slot: string, prefill?: { prenom: string; nom: string }) {
    if (isSlotFullyPast(iso, slot)) {
      showToast(type === "Nuit" ? "Cette nuitée est déjà passée." : "Ce créneau est déjà passé.");
      return;
    }
    if (type === "Visite" && isSpaceCapped(space, reservations)) {
      Alert.alert(
        "Limite atteinte",
        "Vous avez atteint la limite de votre espace. Consultez l'email envoyé à votre adresse pour en savoir plus.",
      );
      return;
    }
    setPrenom(prefill?.prenom ?? savedPrenom); setNom(prefill?.nom ?? savedNom); setPinValue("");
    setCompanions([]);
    setGuestEmail(""); setSendGuestEmail(true);
    setBookingTarget({ iso, slot });
    setConfirmed(null);
    setCalendarAdded(false);
  }

  // Recalculé à chaque frappe (pas seulement à la soumission, cf. handleBook)
  // pour afficher/masquer le champ email au bon moment pendant la saisie.
  const bookingForSomeoneElse = !!(savedPrenom || savedNom) && (prenom.trim() !== savedPrenom || nom.trim() !== savedNom);

  function addCompanion() {
    setCompanions((prev) => [...prev, { prenom: "", nom: "" }]);
  }

  function updateCompanion(index: number, field: "prenom" | "nom", value: string) {
    setCompanions((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  }

  function removeCompanion(index: number) {
    setCompanions((prev) => prev.filter((_, i) => i !== index));
  }

  async function openPinModal(r: Reservation) {
    setPinModal(r);
    setPinCalendarAdded(false);
    getLinkedCalendarEvent(r.id).then((eventId) => setPinCalendarAdded(!!eventId));

    if (await sessionPinMatches(r.pin)) {
      setPinEntry(r.pin); setPinError(false); setPinStep("actions");
    } else {
      setPinEntry(""); setPinError(false); setPinStep("enter");
    }
  }

  useImperativeHandle(ref, () => ({ openBooking, openPinModal }));

  function checkPin() {
    if (pinEntry === String(pinModal!.pin)) {
      setPinError(false);
      setPinStep("actions");
    } else {
      setPinError(true);
      setPinEntry("");
    }
  }

  // NB: the booking modal is a native <Modal>, rendered above the rest of the
  // screen — the toast banner lives below it and would be invisible while
  // this modal is open. Use Alert (also native, always on top) for feedback
  // here instead of showToast.
  async function handleBook() {
    if (!bookingTarget) return;
    if (!prenom.trim() || !nom.trim()) {
      Alert.alert("Champs manquants", "Indique ton prénom et ton nom.");
      return;
    }
    if (!sessionPin && pinValue.length < 4) {
      Alert.alert("Code PIN incomplet", "Choisis un code PIN à 4 chiffres sur le clavier ci-dessus.");
      return;
    }

    setSaving(true);
    const { iso, slot } = bookingTarget;
    const validCompanions = companions
      .map((c) => ({ prenom: c.prenom.trim(), nom: c.nom.trim() }))
      .filter((c) => c.prenom && c.nom);
    // Réutilise silencieusement le PIN déjà enregistré sur cet appareil s'il
    // existe — seul un visiteur pas encore identifié en choisit un nouveau.
    const effectivePin = sessionPin || pinValue;

    // Si le visiteur a remplacé son prénom/nom préremplis (les siens) par
    // ceux d'une autre personne, on garde sa propre identité pour l'afficher
    // côté admin ("Programmé par : ...") — sans quoi l'admin ne voit que le
    // nom de la personne réservée et ne sait pas qui a fait la démarche.
    const nameChanged = !!(savedPrenom || savedNom) && (prenom.trim() !== savedPrenom || nom.trim() !== savedNom);

    const creneau = type === "Nuit" ? "🌙 Nuit" : slot;
    // Le réservataire principal + un accompagnant = plusieurs lignes de
    // réservation insérées ensemble (même logique que "+ Ajouter une autre
    // personne" côté admin, cf. AdminAddReservation.tsx) — elles comptent
    // donc dans l'occupation du créneau et le cap freemium.
    const { data: rows, error } = await supabase.from("reservations").insert([
      {
        space_id: space.id,
        date: iso,
        creneau,
        prenom: prenom.trim(),
        nom: nom.trim(),
        telephone: "",
        type,
        pin: effectivePin,
        booked_by_prenom: nameChanged ? savedPrenom : null,
        booked_by_nom: nameChanged ? savedNom : null,
        email: nameChanged && guestEmail.trim() ? guestEmail.trim() : null,
      },
      ...validCompanions.map((c) => ({
        space_id: space.id,
        date: iso,
        creneau,
        prenom: c.prenom,
        nom: c.nom,
        telephone: "",
        type,
        pin: effectivePin,
      })),
    ]).select();

    setSaving(false);

    if (error) {
      if (error.message.includes("FREEMIUM_CAP_REACHED")) {
        Alert.alert(
          "Limite atteinte",
          "Vous avez atteint la limite de votre espace. Consultez l'email envoyé à votre adresse pour en savoir plus.",
        );
      } else if (error.message.includes("SLOT_FULL")) {
        Alert.alert(
          "Créneau complet",
          "Ce créneau vient d'être complété par quelqu'un d'autre. Choisis-en un autre.",
        );
      } else if (error.message.includes("SLOT_BLOCKED_BY_INTERVENTION")) {
        Alert.alert(
          "Créneau indisponible",
          "Ce créneau est réservé à une intervention (infirmier·ère, kiné…) prioritaire. Choisis-en un autre.",
        );
      } else if (error.message.includes("DAY_ALREADY_BOOKED")) {
        // Même titre/message que components/AdminAddReservation.tsx — texte
        // harmonisé entre visiteur et admin pour ce même cas d'erreur.
        Alert.alert(
          "Un seul créneau par jour",
          "Le mode \"1 visite par jour\" est activé : une visite est déjà prévue ce jour-là. Choisis un autre jour, ou modifie la réservation existante.",
        );
      } else {
        Alert.alert("Erreur lors de la réservation", error.message);
      }
      return;
    }

    const newResa = rows?.[0];

    // Relie le réservataire principal et ses accompagnants par group_id —
    // permet de les gérer ensemble (annulation groupée, affichage "Avec ...").
    if (rows && rows.length > 1) {
      const ids = rows.map((r) => r.id);
      await supabase.from("reservations").update({ group_id: ids[0] }).in("id", ids);
    }

    await updateLastActivity(space.id);
    await refreshReservations();
    // Ne réécrit plus le prénom/nom de la session : l'identité du visiteur
    // reste celle renseignée à son arrivée sur l'espace (cf. (visitor)/_layout.tsx),
    // même s'il vient de réserver pour quelqu'un d'autre. Le PIN, lui, reste
    // désormais stable une fois choisi — on ne fait que confirmer la même
    // valeur en session, sauf lors du tout premier choix.
    await saveVisitorSession({ token, spaceId: space.id, pin: effectivePin });
    setSessionPin(effectivePin);

    setConfirmed({
      id: newResa?.id ?? "",
      prenom: prenom.trim(),
      pin: effectivePin,
      iso,
      slot,
      companions: validCompanions.map((c) => c.prenom),
      isNewPin: !sessionPin,
    });

    if (newResa?.id) {
      scheduleVisitReminder(newResa.id, iso, slot, prenom.trim(), `${space.patient_firstname} ${space.patient_lastname}`);
    }

    if (nameChanged && sendGuestEmail && guestEmail.trim()) {
      supabase.functions.invoke("notify-guest-confirmation", {
        body: {
          space_id: space.id,
          guest_email: guestEmail.trim(),
          guest_prenom: prenom.trim(),
          date: iso,
          creneau,
          type,
        },
      }).catch(() => {});
    }
  }

  async function handleCancel() {
    if (!pinModal || isReservationDatePast(pinModal.date)) return;
    setPinDeleting(true);

    // Annule aussi les accompagnants liés (même group_id) : le visiteur les
    // a ajoutés ensemble, ils doivent repartir ensemble.
    const idsToDelete = pinModal.group_id
      ? reservations.filter((r) => r.group_id === pinModal.group_id).map((r) => r.id)
      : [pinModal.id];

    const { error, count } = await supabase.from("reservations").delete({ count: "exact" }).in("id", idsToDelete);

    setPinDeleting(false);

    if (error || count === 0) {
      showToast("Erreur lors de l'annulation.");
      return;
    }

    supabase.functions.invoke("notify-cancel", {
      body: {
        space_id: space.id,
        visitor_prenom: pinModal.prenom,
        visitor_nom: pinModal.nom,
        date: pinModal.date,
        creneau: pinModal.creneau,
        type: pinModal.type,
      },
    }).catch(() => {});

    cancelVisitReminder(pinModal.id);
    deleteLinkedCalendarEvent(pinModal.id);

    await updateLastActivity(space.id);
    await refreshReservations();
    showToast("Réservation annulée ✓");
    setPinModal(null);
  }

  function openEdit(r: Reservation) {
    if (isReservationDatePast(r.date)) return;
    const d = new Date(r.date + "T12:00:00");
    setEditDate(r.date);
    setEditSlot(r.type === "Nuit" ? null : r.creneau);
    setEditPrenom(r.prenom || "");
    setEditNom(r.nom || "");
    setEditTel(r.telephone || "");
    setEditCalMonth({ year: d.getFullYear(), month: d.getMonth() });
    setPinModal(null);
    setEditModal(r);
  }

  async function handleSaveEdit() {
    if (!editModal) return;
    if (!editPrenom.trim() || !editNom.trim()) return;
    if (editModal.type === "Visite" && !editSlot) return;

    setEditSaving(true);

    const { error, count } = await supabase
      .from("reservations")
      .update({
        date: editDate,
        creneau: editModal.type === "Nuit" ? "🌙 Nuit" : editSlot,
        prenom: editPrenom.trim(),
        nom: editNom.trim(),
        telephone: editTel.trim(),
        // Modifier avec succès une réservation recasée/annulée par un
        // changement de règles efface son alerte du même geste — pas besoin
        // d'un "dismiss" séparé (voir apply_slot_rule_change).
        alert_message: null,
        alert_type: null,
        alert_seen: true,
        previous_date: null,
        previous_creneau: null,
      }, { count: "exact" })
      .eq("id", editModal.id);

    setEditSaving(false);

    if (error || count === 0) {
      showToast(
        error?.message.includes("SLOT_FULL")
          ? "Ce créneau vient d'être complété par quelqu'un d'autre — choisis-en un autre."
          : error?.message.includes("SLOT_BLOCKED_BY_INTERVENTION")
          ? "Ce créneau est réservé à une intervention prioritaire — choisis-en un autre."
          : error?.message.includes("DAY_ALREADY_BOOKED")
          ? "Une visite est déjà prévue ce jour-là — choisis un autre jour."
          : "Erreur lors de la modification.",
      );
      return;
    }

    updateLinkedCalendarEvent(
      editModal.id,
      editDate,
      editModal.type === "Nuit" ? nightStartSlot(slotConfig) : (editSlot ?? editModal.creneau),
      editModal.type,
      slotConfig,
    );

    await updateLastActivity(space.id);
    await refreshReservations();
    showToast("Réservation modifiée ✓");
    setEditModal(null);
  }

  async function handleAddToCalendar() {
    if (!confirmed) return;
    const session = await getVisitorSession();
    const result = await addToNativeCalendar(space, slotConfig, confirmed.iso, confirmed.slot, type, session?.email || null, confirmed.companions);
    if (result.ok) {
      if (confirmed.id) await linkCalendarEvent(confirmed.id, result.eventId);
      setCalendarAdded(true);
      showToast("Créneau ajouté à votre calendrier ✓");
    } else {
      Alert.alert("Calendrier", "Impossible d'ajouter l'événement : " + result.reason);
    }
  }

  // Même logique que handleAddToCalendar, mais pour une réservation déjà
  // existante ouverte via le PIN (ex. nuitée passée par "Mon compte" qui
  // n'est jamais passée par l'écran de confirmation de réservation).
  async function handleAddToCalendarFromPin() {
    if (!pinModal) return;
    const session = await getVisitorSession();
    const slotForEvent = pinModal.type === "Nuit" ? nightStartSlot(slotConfig) : pinModal.creneau;
    // Accompagnants : réservations liées par group_id (nouveau modèle) —
    // repli sur companion_firstnames pour les réservations créées avant ce
    // changement (texte libre, pas de lignes séparées).
    const pinCompanions = pinModal.group_id
      ? reservations.filter((r) => r.group_id === pinModal.group_id && r.id !== pinModal.id).map((r) => r.prenom)
      : (pinModal.companion_firstnames ?? "").split(",").map((c) => c.trim()).filter(Boolean);
    const result = await addToNativeCalendar(space, slotConfig, pinModal.date, slotForEvent, pinModal.type, session?.email || null, pinCompanions);
    if (result.ok) {
      await linkCalendarEvent(pinModal.id, result.eventId);
      setPinCalendarAdded(true);
      showToast(pinModal.type === "Nuit" ? "Nuitée ajoutée à votre calendrier ✓" : "Créneau ajouté à votre calendrier ✓");
    } else {
      Alert.alert("Calendrier", "Impossible d'ajouter l'événement : " + result.reason);
    }
  }

  // Places restantes sur le créneau (occupation actuelle non comprise) moins
  // le réservataire lui-même — borne le nombre de champs "accompagnant"
  // proposés. Sans objet pour les nuitées (une seule réservation par nuit).
  const bookingOcc = bookingTarget && type === "Visite" ? getSlotOccupancy(reservations, bookingTarget.iso, bookingTarget.slot) : [];
  const maxCompanions = Math.max(0, slotConfig.max_visitors_per_slot - 1 - bookingOcc.length);

  return (
    <>
      {/* ── MODAL RÉSERVATION ──────────────────────────────────────────────── */}
      <Modal visible={!!bookingTarget && !confirmed} transparent animationType="slide" onRequestClose={() => setBookingTarget(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => !saving && setBookingTarget(null)}>
            <ScrollView contentContainerStyle={styles.overlayScroll} keyboardShouldPersistTaps="handled">
              <TouchableOpacity activeOpacity={1}>
                <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.accent }]}>
                  <Text style={[styles.sheetTitle, { color: C.text }]}>
                    {type === "Nuit" ? "🌙 Réserver une nuit" : `🕐 Visite ${bookingTarget?.slot}`}
                  </Text>
                  <Text style={[styles.sheetSub, { color: C.muted }]}>
                    {bookingTarget && toFrLong(new Date(bookingTarget.iso + "T12:00:00"))} ·{" "}
                    {type === "Nuit" ? nightRangeLabel(slotConfig) : `${slotConfig.slot_duration_minutes} min max`}
                  </Text>

                  <TextInput
                    style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                    placeholder="Prénom *" placeholderTextColor={C.muted}
                    value={prenom} onChangeText={setPrenom} autoCapitalize="words"
                  />
                  <TextInput
                    style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                    placeholder="Nom *" placeholderTextColor={C.muted}
                    value={nom} onChangeText={setNom} autoCapitalize="words"
                  />

                  {bookingForSomeoneElse && (
                    <View style={[styles.guestEmailBox, { borderColor: C.border, backgroundColor: C.bg }]}>
                      <Text style={[styles.guestEmailLabel, { color: C.gold }]}>
                        ✉️ Email de {prenom.trim() || "cette personne"} (optionnel)
                      </Text>
                      <Text style={[styles.guestEmailHint, { color: C.muted }]}>
                        Pour lui envoyer un email avec les infos pratiques (hôpital, plan, calendrier).
                      </Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: C.card, borderColor: C.border, color: C.text, marginBottom: 8 }]}
                        placeholder="email@exemple.fr" placeholderTextColor={C.muted}
                        value={guestEmail} onChangeText={setGuestEmail}
                        keyboardType="email-address" autoCapitalize="none"
                      />
                      {!!guestEmail.trim() && (
                        <TouchableOpacity
                          style={styles.guestEmailToggle}
                          onPress={() => setSendGuestEmail((v) => !v)}
                          activeOpacity={0.75}
                        >
                          <View style={[
                            styles.checkbox,
                            { borderColor: C.accent, backgroundColor: sendGuestEmail ? C.accent : "transparent" },
                          ]}>
                            {sendGuestEmail && <Text style={styles.checkboxMark}>✓</Text>}
                          </View>
                          <Text style={[styles.guestEmailToggleText, { color: C.text }]}>
                            Envoyer un email de confirmation
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {type === "Visite" && (
                    <>
                      {companions.length > 0 && (
                        <View style={[styles.companionSeparator, { borderTopColor: C.border }]}>
                          <Text style={[styles.companionSeparatorText, { color: C.muted }]}>Ajouter un accompagnant</Text>
                        </View>
                      )}
                      {companions.map((c, i) => (
                        <View key={i} style={styles.companionRow}>
                          <View style={styles.companionNames}>
                            <TextInput
                              style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                              placeholder="Prénom accompagnant *" placeholderTextColor={C.muted}
                              value={c.prenom} onChangeText={(v) => updateCompanion(i, "prenom", v)} autoCapitalize="words"
                            />
                            <TextInput
                              style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                              placeholder="Nom accompagnant *" placeholderTextColor={C.muted}
                              value={c.nom} onChangeText={(v) => updateCompanion(i, "nom", v)} autoCapitalize="words"
                            />
                          </View>
                          <TouchableOpacity onPress={() => removeCompanion(i)} style={styles.removeCompanionBtn}>
                            <Text style={[styles.removeCompanionBtnText, { color: C.muted }]}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                      {companions.length < maxCompanions && (
                        <TouchableOpacity style={styles.addCompanionBtn} onPress={addCompanion}>
                          <Text style={[styles.addCompanionBtnText, { color: C.accent }]}>+ Ajouter un accompagnant</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}

                  {!sessionPin && (
                    <>
                      <Text style={[styles.pinLabel, { color: C.gold }]}>🔐 Choisis ton code PIN (4 chiffres)</Text>
                      <Text style={[styles.pinHint, { color: C.muted }]}>
                        Garde-le précieusement — tu en auras besoin pour modifier ou annuler ta visite.
                      </Text>
                      <PinPad value={pinValue} onChange={setPinValue} theme={C} />
                    </>
                  )}

                  <View style={styles.sheetBtns}>
                    <TouchableOpacity
                      onPress={() => setBookingTarget(null)}
                      disabled={saving}
                      style={[styles.btnSecondary, { borderColor: C.border }]}
                    >
                      <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleBook}
                      disabled={saving}
                      style={[
                        styles.btnPrimary,
                        { backgroundColor: C.accent },
                        (!prenom.trim() || !nom.trim() || (!sessionPin && pinValue.length < 4)) && { opacity: 0.5 },
                      ]}
                    >
                      {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnPrimaryText}>Confirmer</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL CONFIRMATION ────────────────────────────────────────────── */}
      <Modal visible={!!confirmed} transparent animationType="fade" onRequestClose={() => { setConfirmed(null); setBookingTarget(null); }}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.accent }]}>
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>🎉</Text>
              <Text style={[styles.sheetTitle, { color: C.success }]}>Merci {confirmed?.prenom} !</Text>
              <Text style={[styles.sheetSub, { color: C.muted }]}>Ta visite est enregistrée.</Text>
            </View>

            {confirmed?.isNewPin && (
              <View style={[styles.pinDisplay, { backgroundColor: C.bg, borderColor: "rgba(240,180,41,0.4)" }]}>
                <Text style={[styles.pinDisplayLabel, { color: C.gold }]}>🔐 Ton code PIN</Text>
                <Text style={[styles.pinDisplayValue, { color: C.gold }]}>{confirmed?.pin}</Text>
                <Text style={[styles.pinDisplayHint, { color: C.muted }]}>
                  Note ce code — il t'identifie désormais sur cet appareil, tu n'auras plus à le
                  ressaisir pour tes prochaines réservations, modifications ou annulations.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.calendarBtn,
                { borderColor: calendarAdded ? C.success : "rgba(52,168,83,0.4)", backgroundColor: "rgba(52,168,83,0.1)" },
              ]}
              onPress={handleAddToCalendar}
              disabled={calendarAdded}
            >
              <Text style={[styles.calendarBtnText, { color: calendarAdded ? C.success : "#3da85e" }]}>
                {calendarAdded ? "✅ Ajouté au calendrier" : "📅 Ajouter à mon calendrier"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.backToCalendarBtn, { borderColor: C.accent, backgroundColor: `${C.accent}22`, marginTop: 10 }]}
              onPress={() => { setConfirmed(null); setBookingTarget(null); router.navigate(homeCalendarPath); }}
              activeOpacity={0.75}
            >
              <Text style={[styles.btnSecondaryText, { color: C.accent }]}>← Retour au calendrier</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL PIN ─────────────────────────────────────────────────────── */}
      <Modal visible={!!pinModal} transparent animationType="fade" onRequestClose={() => setPinModal(null)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.accent }]}>
            {pinStep === "enter" ? (
              <>
                <View style={{ alignItems: "center", marginBottom: 16 }}>
                  <Text style={{ fontSize: 32, marginBottom: 6 }}>🔐</Text>
                  <Text style={[styles.sheetTitle, { color: C.text }]}>Code PIN</Text>
                  <Text style={[styles.sheetSub, { color: C.muted }]}>Saisis le code PIN reçu lors de ta réservation.</Text>
                </View>

                <View style={[styles.resaInfo, { backgroundColor: C.bg, borderColor: C.border }]}>
                  <Text style={[styles.resaName, { color: C.text }]}>{pinModal?.prenom} {pinModal?.nom}</Text>
                  <Text style={[styles.resaDetail, { color: C.muted }]}>
                    {pinModal?.type === "Nuit" ? "🌙 Nuit" : `🕐 ${pinModal?.creneau}`}
                    {" · "}
                    {pinModal && toFrShort(new Date(pinModal.date + "T12:00:00"))}
                  </Text>
                </View>

                <PinPad value={pinEntry} onChange={setPinEntry} theme={C} hasError={pinError} />

                {pinError && (
                  <Text style={[styles.pinErrorText, { color: C.danger }]}>
                    PIN incorrect. Vérifie ta confirmation de réservation.
                  </Text>
                )}

                <View style={[styles.sheetBtns, { marginTop: 16 }]}>
                  <TouchableOpacity onPress={() => setPinModal(null)} style={[styles.btnSecondary, { borderColor: C.border }]}>
                    <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={checkPin}
                    disabled={pinEntry.length < 4}
                    style={[styles.btnPrimary, { backgroundColor: C.accent }, pinEntry.length < 4 && { opacity: 0.5 }]}
                  >
                    <Text style={styles.btnPrimaryText}>Valider</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={[styles.resaInfo, { backgroundColor: C.bg, borderColor: C.border, marginTop: 4 }]}>
                  <Text style={[styles.resaName, { color: C.text }]}>{pinModal?.prenom} {pinModal?.nom}</Text>
                  <Text style={[styles.resaDetail, { color: C.muted }]}>
                    {pinModal?.type === "Nuit" ? "🌙 Nuit" : `🕐 ${pinModal?.creneau}`}
                    {" · "}
                    {pinModal && toFrShort(new Date(pinModal.date + "T12:00:00"))}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.calendarBtn,
                    { borderColor: pinCalendarAdded ? C.success : "rgba(52,168,83,0.4)", backgroundColor: "rgba(52,168,83,0.1)" },
                  ]}
                  onPress={handleAddToCalendarFromPin}
                  disabled={pinCalendarAdded}
                >
                  <Text style={[styles.calendarBtnText, { color: pinCalendarAdded ? C.success : "#3da85e" }]}>
                    {pinCalendarAdded ? "✅ Ajouté au calendrier" : "📅 Ajouter à mon calendrier"}
                  </Text>
                </TouchableOpacity>

                {pinModal && isReservationDatePast(pinModal.date) ? (
                  <Text style={[styles.sheetSub, { color: C.muted, marginTop: 12, textAlign: "center" }]}>
                    {pinModal.type === "Nuit" ? "Cette nuitée" : "Cette visite"} est passée, elle ne peut plus être modifiée ni annulée.
                  </Text>
                ) : (
                  <>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.accent, marginTop: 10 }]} onPress={() => pinModal && openEdit(pinModal)}>
                      <Text style={styles.actionBtnText}>✏️ Modifier ma réservation</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtnDanger, { borderColor: "rgba(233,69,96,0.35)", backgroundColor: "rgba(233,69,96,0.1)" }]}
                      onPress={handleCancel}
                      disabled={pinDeleting}
                    >
                      {pinDeleting
                        ? <ActivityIndicator color={C.danger} size="small" />
                        : <Text style={[styles.actionBtnText, { color: C.danger }]}>🗑️ Annuler ma visite</Text>
                      }
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity onPress={() => setPinModal(null)} style={[styles.btnSecondary, { borderColor: C.border, marginTop: 8, flex: 0 }]}>
                  <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Fermer</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── MODAL ÉDITION COMPLÈTE ─────────────────────────────────────────── */}
      <Modal visible={!!editModal} transparent animationType="slide" onRequestClose={() => setEditModal(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => !editSaving && setEditModal(null)}>
            <ScrollView contentContainerStyle={styles.overlayScroll} keyboardShouldPersistTaps="handled">
              <TouchableOpacity activeOpacity={1}>
                <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.accent }]}>
                  <Text style={[styles.sheetTitle, { color: C.text }]}>✏️ Modifier la réservation</Text>
                  <Text style={[styles.sheetSub, { color: C.muted }]}>
                    {editModal?.prenom} {editModal?.nom} ·{" "}
                    {editModal && toFrShort(new Date(editModal.date + "T12:00:00"))} {editModal?.creneau}
                  </Text>

                  <Text style={[styles.fieldLabel, { color: C.gold }]}>Nouveau jour</Text>
                  <MiniCalendar
                    selDate={editDate}
                    onSelect={(iso) => { setEditDate(iso); setEditSlot(null); }}
                    calMonth={editCalMonth}
                    onMonthChange={setEditCalMonth}
                    startDate={startDate}
                    C={C}
                    size="lg"
                    slotConfig={slotConfig}
                    slots={slots}
                    reservations={reservations}
                  />

                  {editModal?.type === "Visite" && (
                    <>
                      <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 0, marginBottom: 0 }]}>Nouveau créneau</Text>
                      <View style={styles.slotGrid}>
                        {slots.map((slot) => {
                          const occ = getSlotOccupancy(reservations, editDate, slot, editModal?.id);
                          const full = occ.length >= slotConfig.max_visitors_per_slot;
                          if (full || isSlotFullyPast(editDate, slot)) return null;
                          const isPartial = occ.length > 0;
                          const selected = editSlot === slot;
                          return (
                            <TouchableOpacity
                              key={slot}
                              style={[
                                styles.slotOption,
                                {
                                  backgroundColor: selected ? C.accent : isPartial ? C.orange : C.bg,
                                  borderColor: selected ? C.accent : isPartial ? C.orange : C.border,
                                },
                              ]}
                              onPress={() => setEditSlot(slot)}
                              activeOpacity={0.75}
                            >
                              <Text style={[styles.slotOptionTime, { color: selected || isPartial ? "#fff" : C.text }]}>{slot}</Text>
                              <Text style={[styles.slotOptionCount, { color: selected || isPartial ? "rgba(255,255,255,0.75)" : C.muted }]}>
                                {occ.length}/{slotConfig.max_visitors_per_slot}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  )}

                  <Text style={[styles.fieldLabel, { color: C.gold }]}>Tes informations</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                    placeholder="Prénom *" placeholderTextColor={C.muted}
                    value={editPrenom} onChangeText={setEditPrenom} autoCapitalize="words"
                  />
                  <TextInput
                    style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                    placeholder="Nom *" placeholderTextColor={C.muted}
                    value={editNom} onChangeText={setEditNom} autoCapitalize="words"
                  />
                  <TextInput
                    style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                    placeholder="Téléphone" placeholderTextColor={C.muted}
                    value={editTel} onChangeText={setEditTel} keyboardType="phone-pad"
                  />

                  <View style={styles.sheetBtns}>
                    <TouchableOpacity onPress={() => setEditModal(null)} disabled={editSaving} style={[styles.btnSecondary, { borderColor: C.border }]}>
                      <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSaveEdit}
                      disabled={!editPrenom.trim() || !editNom.trim() || (editModal?.type === "Visite" && !editSlot) || editSaving}
                      style={[
                        styles.btnPrimary,
                        { backgroundColor: C.accent },
                        (!editPrenom.trim() || !editNom.trim() || (editModal?.type === "Visite" && !editSlot) || editSaving) && { opacity: 0.5 },
                      ]}
                    >
                      {editSaving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnPrimaryText}>✓ Enregistrer</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {!!toast && (
        <View style={[styles.toast, { backgroundColor: C.success }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </>
  );
}

export default forwardRef(BookingFlow);

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "flex-end" },
  overlayScroll: { flexGrow: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, padding: 24, paddingBottom: 40, marginBottom: 12 },

  sheetTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 4 },
  sheetSub: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginBottom: 20 },

  input: { borderWidth: 1, borderRadius: 10, padding: 13, fontFamily: "DM_Sans_400Regular", fontSize: 15, marginBottom: 10 },

  guestEmailBox: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 },
  guestEmailLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, marginBottom: 4 },
  guestEmailHint: { fontFamily: "DM_Sans_400Regular", fontSize: 11, lineHeight: 15, marginBottom: 10 },
  guestEmailToggle: { flexDirection: "row", alignItems: "center", gap: 8 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  checkboxMark: { color: "#fff", fontSize: 12, fontFamily: "DM_Sans_700Bold" },
  guestEmailToggleText: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },

  companionSeparator: { borderTopWidth: 1, paddingTop: 12, marginTop: 4, marginBottom: 10 },
  companionSeparatorText: { fontFamily: "DM_Sans_700Bold", fontSize: 13 },
  companionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  companionNames: { flexDirection: "column", flex: 1 },
  removeCompanionBtn: { paddingHorizontal: 6 },
  removeCompanionBtnText: { fontSize: 16 },
  addCompanionBtn: { alignSelf: "flex-start", paddingVertical: 6, marginBottom: 10 },
  addCompanionBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },

  pinLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6, marginTop: 4 },
  pinHint: { fontFamily: "DM_Sans_400Regular", fontSize: 12, lineHeight: 18, marginBottom: 12 },

  sheetBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
  btnPrimary: { flex: 1.3, borderRadius: 10, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  btnPrimaryText: { fontFamily: "DM_Sans_700Bold", fontSize: 15, color: "#fff" },
  btnSecondary: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  btnSecondaryText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  backToCalendarBtn: { width: "100%", borderWidth: 1, borderRadius: 10, paddingVertical: 14, alignItems: "center" },

  pinDisplay: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 14, alignItems: "center" },
  pinDisplayLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 },
  pinDisplayValue: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 40, letterSpacing: 10 },
  pinDisplayHint: { fontFamily: "DM_Sans_400Regular", fontSize: 12, textAlign: "center", marginTop: 8, lineHeight: 18 },

  calendarBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  calendarBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },

  resaInfo: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 16 },
  resaName: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  resaDetail: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginTop: 2 },
  pinErrorText: { fontFamily: "DM_Sans_400Regular", fontSize: 12, textAlign: "center", marginTop: 8 },

  actionBtn: { borderRadius: 10, paddingVertical: 14, alignItems: "center", marginBottom: 8 },
  actionBtnDanger: { borderWidth: 1, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginBottom: 4, justifyContent: "center" },
  actionBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },

  fieldLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10, marginTop: 14 },

  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4, justifyContent: "center" },
  slotOption: { borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, alignItems: "center", minWidth: "44%" },
  slotOptionTime: { fontFamily: "DM_Sans_700Bold", fontSize: 16 },
  slotOptionCount: { fontFamily: "DM_Sans_400Regular", fontSize: 11, marginTop: 2 },


  toast: { position: "absolute", bottom: 24, alignSelf: "center", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  toastText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, color: "#fff" },
});
