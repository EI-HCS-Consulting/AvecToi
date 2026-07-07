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
import { getSlotOccupancy, isSlotPast, isReservationDatePast, toISO, toFrLong, toFrShort, nightStartSlot, nightRangeLabel } from "@/lib/slotUtils";
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
  const [tel, setTel] = useState("");
  const [pinValue, setPinValue] = useState("");
  const [saving, setSaving] = useState(false);
  // Prénoms des personnes accompagnant le réservataire — purement informatif,
  // affiché dans le titre de l'événement calendrier natif ("Avec ..."), ne
  // compte pas dans l'occupation du créneau (cf. lib/calendarSync.ts).
  const [companions, setCompanions] = useState<string[]>([]);

  const [savedPrenom, setSavedPrenom] = useState("");
  const [savedNom, setSavedNom] = useState("");
  useEffect(() => {
    getVisitorSession().then((s) => {
      if (s) { setSavedPrenom(s.prenom); setSavedNom(s.nom); }
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
    if (type === "Visite" && isSlotPast(iso, slot)) {
      showToast("Ce créneau est déjà passé.");
      return;
    }
    if (type === "Visite" && isSpaceCapped(space, reservations)) {
      Alert.alert(
        "Limite atteinte",
        "Vous avez atteint la limite de votre espace. Consultez l'email envoyé à votre adresse pour en savoir plus.",
      );
      return;
    }
    setPrenom(prefill?.prenom ?? savedPrenom); setNom(prefill?.nom ?? savedNom); setTel(""); setPinValue("");
    setCompanions([]);
    setBookingTarget({ iso, slot });
    setConfirmed(null);
    setCalendarAdded(false);
  }

  function addCompanion() {
    setCompanions((prev) => [...prev, ""]);
  }

  function updateCompanion(index: number, value: string) {
    setCompanions((prev) => prev.map((c, i) => (i === index ? value : c)));
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
    if (pinValue.length < 4) {
      Alert.alert("Code PIN incomplet", "Choisis un code PIN à 4 chiffres sur le clavier ci-dessus.");
      return;
    }

    setSaving(true);
    const { iso, slot } = bookingTarget;
    const companionNames = companions.map((c) => c.trim()).filter(Boolean);

    // Si le visiteur a remplacé son prénom/nom préremplis (les siens) par
    // ceux d'une autre personne, on garde sa propre identité pour l'afficher
    // côté admin ("Programmé par : ...") — sans quoi l'admin ne voit que le
    // nom de la personne réservée et ne sait pas qui a fait la démarche.
    const nameChanged = !!(savedPrenom || savedNom) && (prenom.trim() !== savedPrenom || nom.trim() !== savedNom);

    const { data: newResa, error } = await supabase.from("reservations").insert({
      space_id: space.id,
      date: iso,
      creneau: type === "Nuit" ? "🌙 Nuit" : slot,
      prenom: prenom.trim(),
      nom: nom.trim(),
      telephone: tel.trim(),
      type,
      pin: pinValue,
      companion_firstnames: companionNames.length > 0 ? companionNames.join(", ") : null,
      booked_by_prenom: nameChanged ? savedPrenom : null,
      booked_by_nom: nameChanged ? savedNom : null,
    }).select().single();

    setSaving(false);

    if (error) {
      if (error.message.includes("FREEMIUM_CAP_REACHED")) {
        Alert.alert(
          "Limite atteinte",
          "Vous avez atteint la limite de votre espace. Consultez l'email envoyé à votre adresse pour en savoir plus.",
        );
      } else {
        Alert.alert("Erreur lors de la réservation", error.message);
      }
      return;
    }

    await updateLastActivity(space.id);
    await refreshReservations();
    // Ne réécrit plus le prénom/nom de la session : l'identité du visiteur
    // reste celle renseignée à son arrivée sur l'espace (cf. (visitor)/_layout.tsx),
    // même s'il vient de réserver pour quelqu'un d'autre — seul le PIN
    // (toujours ressaisi/choisi à chaque réservation) est mémorisé ici.
    await saveVisitorSession({ token, spaceId: space.id, pin: pinValue });

    setConfirmed({ id: newResa?.id ?? "", prenom: prenom.trim(), pin: pinValue, iso, slot, companions: companionNames });

    if (newResa?.id) {
      scheduleVisitReminder(newResa.id, iso, slot, prenom.trim(), `${space.patient_firstname} ${space.patient_lastname}`);
    }
  }

  async function handleCancel() {
    if (!pinModal || isReservationDatePast(pinModal.date)) return;
    setPinDeleting(true);

    const { error, count } = await supabase.from("reservations").delete({ count: "exact" }).eq("id", pinModal.id);

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
      }, { count: "exact" })
      .eq("id", editModal.id);

    setEditSaving(false);

    if (error || count === 0) {
      showToast("Erreur lors de la modification.");
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
    const pinCompanions = (pinModal.companion_firstnames ?? "").split(",").map((c) => c.trim()).filter(Boolean);
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
                  <Text style={[styles.sheetTitle, { color: "#fff" }]}>
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
                  <TextInput
                    style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                    placeholder="Téléphone (optionnel)" placeholderTextColor={C.muted}
                    value={tel} onChangeText={setTel} keyboardType="phone-pad"
                  />

                  {type === "Visite" && (
                    <>
                      {companions.map((c, i) => (
                        <View key={i} style={styles.companionRow}>
                          <TextInput
                            style={[styles.input, styles.companionInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                            placeholder="Prénom de l'accompagnant" placeholderTextColor={C.muted}
                            value={c} onChangeText={(v) => updateCompanion(i, v)} autoCapitalize="words"
                          />
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

                  <Text style={[styles.pinLabel, { color: C.gold }]}>🔐 Choisis ton code PIN (4 chiffres)</Text>
                  <Text style={[styles.pinHint, { color: C.muted }]}>
                    Garde-le précieusement — tu en auras besoin pour modifier ou annuler ta visite.
                  </Text>
                  <PinPad value={pinValue} onChange={setPinValue} theme={C} />

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
                        (!prenom.trim() || !nom.trim() || pinValue.length < 4) && { opacity: 0.5 },
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

            <View style={[styles.pinDisplay, { backgroundColor: C.bg, borderColor: "rgba(240,180,41,0.4)" }]}>
              <Text style={[styles.pinDisplayLabel, { color: C.gold }]}>🔐 Ton code PIN</Text>
              <Text style={[styles.pinDisplayValue, { color: C.gold }]}>{confirmed?.pin}</Text>
              <Text style={[styles.pinDisplayHint, { color: C.muted }]}>
                Note ce code ou enregistre-le dans ton compte utilisateur (onglet Compte) — tu en
                auras besoin pour modifier ou annuler ta réservation.
              </Text>
            </View>

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
                  <Text style={[styles.sheetTitle, { color: "#fff" }]}>Code PIN</Text>
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
                  <Text style={[styles.sheetTitle, { color: "#fff" }]}>✏️ Modifier la réservation</Text>
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
                          if (full || isSlotPast(editDate, slot)) return null;
                          const statusColor = occ.length === 0 ? C.success : C.orange;
                          return (
                            <TouchableOpacity
                              key={slot}
                              style={[
                                styles.slotOption,
                                { backgroundColor: editSlot === slot ? C.accent : statusColor, borderColor: editSlot === slot ? C.accent : statusColor },
                              ]}
                              onPress={() => setEditSlot(slot)}
                              activeOpacity={0.75}
                            >
                              <Text style={[styles.slotOptionTime, { color: "#fff" }]}>{slot}</Text>
                              <Text style={[styles.slotOptionCount, { color: "rgba(255,255,255,0.75)" }]}>
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
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, padding: 24, paddingBottom: 40 },

  sheetTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 4 },
  sheetSub: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginBottom: 20 },

  input: { borderWidth: 1, borderRadius: 10, padding: 13, fontFamily: "DM_Sans_400Regular", fontSize: 15, marginBottom: 10 },

  companionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  companionInput: { flex: 1 },
  removeCompanionBtn: { paddingHorizontal: 6, paddingBottom: 10 },
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
