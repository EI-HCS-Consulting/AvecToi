import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { supabase } from "@/lib/supabase";
import MiniCalendar from "@/components/MiniCalendar";
import { isSpaceCapped } from "@/lib/freemiumCap";
import { toISO, addDays, isSlotFullyPast, getSlotOccupancy } from "@/lib/slotUtils";
import type { Reservation, SlotConfig, PatientSpace } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// "Réservations récurrentes" — depuis "Mon compte" > "Mes réservations",
// crée en une fois une série de visites sur un même créneau (ex. tous les
// lundis midi entre deux dates), plutôt que de les poser une par une depuis
// l'écran Créneaux. Chaque date candidate est insérée individuellement (même
// requête que BookingFlow.handleBook, sans accompagnants ni email invité —
// hors scope ici) : les jours indisponibles (créneau complet, jour non
// autorisé, déjà passé, limite freemium…) sont simplement ignorés et listés
// dans le récap final plutôt que de bloquer toute la série.
const WEEKDAYS: { dow: number; label: string; full: string }[] = [
  { dow: 1, label: "L", full: "lundi" },
  { dow: 2, label: "M", full: "mardi" },
  { dow: 3, label: "M", full: "mercredi" },
  { dow: 4, label: "J", full: "jeudi" },
  { dow: 5, label: "V", full: "vendredi" },
  { dow: 6, label: "S", full: "samedi" },
  { dow: 0, label: "D", full: "dimanche" },
];

// Garde-fou : au-delà, la série est probablement une erreur de saisie (dates
// inversées, période bien trop longue) plutôt qu'un vrai besoin récurrent.
const MAX_CANDIDATES = 60;

interface Props {
  visible: boolean;
  onClose: () => void;
  C: Theme;
  space: PatientSpace;
  slotConfig: SlotConfig;
  slots: string[];
  reservations: Reservation[];
  getConfigForDate: (iso: string) => SlotConfig | null;
  prenom: string;
  nom: string;
  pin: string;
  refreshReservations: () => Promise<void>;
}

interface SkippedRow {
  dateLabel: string;
  reason: string;
}

function dayLabel(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long" });
}

export default function RecurringBookingModal({
  visible, onClose, C, space, slotConfig, slots, reservations, getConfigForDate, prenom, nom, pin, refreshReservations,
}: Props) {
  const startDate = new Date(space.start_date + "T00:00:00");

  const [weekdays, setWeekdays] = useState<Set<number>>(new Set());
  const [slot, setSlot] = useState<string | null>(null);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [datePicker, setDatePicker] = useState<"start" | "end" | null>(null);
  const [calMonth, setCalMonth] = useState({ year: 2026, month: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: SkippedRow[] } | null>(null);

  useEffect(() => {
    if (!visible) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const from = today < startDate ? startDate : today;
    setWeekdays(new Set());
    setSlot(null);
    setRangeStart(toISO(from));
    setRangeEnd(toISO(addDays(from, 27)));
    setDatePicker(null);
    setCalMonth({ year: from.getFullYear(), month: from.getMonth() });
    setSubmitting(false);
    setResult(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function toggleWeekday(dow: number) {
    setWeekdays((prev) => {
      const next = new Set(prev);
      if (next.has(dow)) next.delete(dow); else next.add(dow);
      return next;
    });
  }

  function candidateDates(): string[] {
    if (!rangeStart || !rangeEnd || rangeEnd < rangeStart || weekdays.size === 0) return [];
    const out: string[] = [];
    let d = new Date(rangeStart + "T12:00:00");
    const end = new Date(rangeEnd + "T12:00:00");
    let guard = 0;
    while (d <= end && guard < 366) {
      if (weekdays.has(d.getDay())) out.push(toISO(d));
      d = addDays(d, 1);
      guard++;
    }
    return out;
  }

  const candidates = candidateDates();
  const canSubmit = !!slot && candidates.length > 0 && !submitting;

  async function handleCreate() {
    if (!slot || candidates.length === 0) return;
    if (isSpaceCapped(space, reservations)) {
      Alert.alert("Limite atteinte", "Vous avez atteint la limite de votre espace. Consultez l'email envoyé à votre adresse pour en savoir plus.");
      return;
    }
    if (candidates.length > MAX_CANDIDATES) {
      Alert.alert("Période trop longue", `Cela ferait ${candidates.length} réservations en une fois. Choisis une période plus courte (${MAX_CANDIDATES} maximum).`);
      return;
    }

    setSubmitting(true);
    let created = 0;
    const skipped: SkippedRow[] = [];
    let capReached = false;

    for (const iso of candidates) {
      if (capReached) { skipped.push({ dateLabel: dayLabel(iso), reason: "non tentée (limite atteinte)" }); continue; }

      if (isSlotFullyPast(iso, slot)) { skipped.push({ dateLabel: dayLabel(iso), reason: "déjà passée" }); continue; }

      const config = getConfigForDate(iso) ?? slotConfig;
      if (!config.allowed_weekdays.includes(new Date(iso + "T12:00:00").getDay())) {
        skipped.push({ dateLabel: dayLabel(iso), reason: "jour non ouvert aux visites" });
        continue;
      }
      if (getSlotOccupancy(reservations, iso, slot).length >= config.max_visitors_per_slot) {
        skipped.push({ dateLabel: dayLabel(iso), reason: "créneau déjà complet" });
        continue;
      }

      const { error } = await supabase.from("reservations").insert([{
        space_id: space.id,
        date: iso,
        creneau: slot,
        prenom: prenom.trim(),
        nom: nom.trim(),
        telephone: "",
        type: "Visite",
        pin,
      }]);

      if (error) {
        if (error.message.includes("FREEMIUM_CAP_REACHED")) {
          skipped.push({ dateLabel: dayLabel(iso), reason: "limite de l'espace atteinte" });
          capReached = true;
        } else if (error.message.includes("SLOT_FULL")) {
          skipped.push({ dateLabel: dayLabel(iso), reason: "créneau complet" });
        } else if (error.message.includes("SLOT_BLOCKED_BY_INTERVENTION")) {
          skipped.push({ dateLabel: dayLabel(iso), reason: "réservé à une intervention" });
        } else if (error.message.includes("DAY_ALREADY_BOOKED")) {
          skipped.push({ dateLabel: dayLabel(iso), reason: "une visite est déjà prévue ce jour-là" });
        } else {
          skipped.push({ dateLabel: dayLabel(iso), reason: "erreur lors de la réservation" });
        }
      } else {
        created++;
      }
    }

    await refreshReservations();
    setSubmitting(false);
    setResult({ created, skipped });
  }

  function handleClose() {
    if (submitting) return;
    onClose();
  }

  const weekdaysLabel = WEEKDAYS.filter((w) => weekdays.has(w.dow)).map((w) => w.full).join(", ");

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.accent }]}>
          {result ? (
            <>
              <Text style={{ fontSize: 34, textAlign: "center", marginBottom: 8 }}>{result.created > 0 ? "🎉" : "😕"}</Text>
              <Text style={[styles.title, { color: C.text }]}>
                {result.created} réservation{result.created > 1 ? "s" : ""} créée{result.created > 1 ? "s" : ""}
              </Text>
              {result.skipped.length > 0 && (
                <>
                  <Text style={[styles.subLabel, { color: C.muted, marginTop: 14 }]}>
                    {result.skipped.length} date{result.skipped.length > 1 ? "s" : ""} ignorée{result.skipped.length > 1 ? "s" : ""}
                  </Text>
                  <ScrollView style={{ maxHeight: 180, marginTop: 6 }}>
                    {result.skipped.map((s, i) => (
                      <Text key={i} style={[styles.skippedRow, { color: C.muted, borderColor: C.border }]}>
                        {s.dateLabel} — {s.reason}
                      </Text>
                    ))}
                  </ScrollView>
                </>
              )}
              <TouchableOpacity onPress={onClose} style={[styles.btnPrimary, { flex: 0, backgroundColor: C.accent, marginTop: 18 }]}>
                <Text style={styles.btnPrimaryText}>Terminé</Text>
              </TouchableOpacity>
            </>
          ) : datePicker ? (
            <>
              <Text style={[styles.title, { color: C.text }]}>
                {datePicker === "start" ? "À partir du" : "Jusqu'au"}
              </Text>
              <MiniCalendar
                selDate={datePicker === "start" ? rangeStart : rangeEnd}
                onSelect={(iso) => {
                  if (datePicker === "start") {
                    setRangeStart(iso);
                    if (rangeEnd < iso) setRangeEnd(iso);
                  } else {
                    setRangeEnd(iso);
                  }
                  setDatePicker(null);
                }}
                calMonth={calMonth}
                onMonthChange={setCalMonth}
                startDate={datePicker === "end" ? new Date(rangeStart + "T00:00:00") : startDate}
                C={C}
                size="lg"
              />
              <TouchableOpacity onPress={() => setDatePicker(null)} style={styles.closeBtn}>
                <Text style={[styles.closeBtnText, { color: C.muted }]}>‹ Retour</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: C.text }]}>🔁 Réservations récurrentes</Text>
              <Text style={[styles.intro, { color: C.muted }]}>
                Réserve plusieurs semaines d'un coup sur le même jour et le même créneau.
              </Text>

              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={[styles.subLabel, { color: C.gold }]}>Jour(s) de la semaine</Text>
                <View style={styles.weekdayRow}>
                  {WEEKDAYS.map((w) => {
                    const selected = weekdays.has(w.dow);
                    return (
                      <TouchableOpacity
                        key={w.dow}
                        onPress={() => toggleWeekday(w.dow)}
                        activeOpacity={0.75}
                        style={[
                          styles.weekdayChip,
                          { borderColor: selected ? C.accent : C.border, backgroundColor: selected ? C.accent : "transparent" },
                        ]}
                      >
                        <Text style={[styles.weekdayChipText, { color: selected ? "#fff" : C.text }]}>{w.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.subLabel, { color: C.gold, marginTop: 16 }]}>Créneau</Text>
                <View style={styles.slotWrap}>
                  {slots.map((s) => {
                    const selected = slot === s;
                    return (
                      <TouchableOpacity
                        key={s}
                        onPress={() => setSlot(s)}
                        activeOpacity={0.75}
                        style={[
                          styles.slotChip,
                          { borderColor: selected ? C.accent : C.border, backgroundColor: selected ? C.accent : "transparent" },
                        ]}
                      >
                        <Text style={[styles.slotChipText, { color: selected ? "#fff" : C.text }]}>{s}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.subLabel, { color: C.gold, marginTop: 16 }]}>Période</Text>
                <View style={styles.periodRow}>
                  <TouchableOpacity
                    onPress={() => { setCalMonth({ year: new Date(rangeStart).getFullYear(), month: new Date(rangeStart).getMonth() }); setDatePicker("start"); }}
                    style={[styles.dateField, { borderColor: C.border, backgroundColor: C.bg }]}
                  >
                    <Text style={[styles.dateFieldLabel, { color: C.muted }]}>Du</Text>
                    <Text style={[styles.dateFieldValue, { color: C.text }]}>{dayLabel(rangeStart)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { setCalMonth({ year: new Date(rangeEnd).getFullYear(), month: new Date(rangeEnd).getMonth() }); setDatePicker("end"); }}
                    style={[styles.dateField, { borderColor: C.border, backgroundColor: C.bg }]}
                  >
                    <Text style={[styles.dateFieldLabel, { color: C.muted }]}>Au</Text>
                    <Text style={[styles.dateFieldValue, { color: C.text }]}>{dayLabel(rangeEnd)}</Text>
                  </TouchableOpacity>
                </View>

                {!!slot && weekdays.size > 0 && (
                  <Text style={[styles.recap, { color: C.muted }]}>
                    {candidates.length === 0
                      ? "Aucune date ne correspond à cette période."
                      : `${candidates.length} visite${candidates.length > 1 ? "s" : ""} seront proposées, chaque ${weekdaysLabel} de ${dayLabel(rangeStart)} à ${dayLabel(rangeEnd)}.`}
                  </Text>
                )}
              </ScrollView>

              <View style={styles.sheetBtns}>
                <TouchableOpacity onPress={handleClose} disabled={submitting} style={[styles.btnSecondary, { borderColor: C.border }]}>
                  <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCreate}
                  disabled={!canSubmit}
                  style={[styles.btnPrimary, { backgroundColor: C.accent }, !canSubmit && { opacity: 0.5 }]}
                >
                  {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnPrimaryText}>Créer mes réservations</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "center", alignItems: "center", padding: 24 },
  sheet: { width: "100%", maxWidth: 400, maxHeight: "86%", borderRadius: 20, borderWidth: 1, padding: 24 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 4, textAlign: "center" },
  intro: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center", marginBottom: 18, lineHeight: 18 },

  subLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 8 },

  weekdayRow: { flexDirection: "row", gap: 6, justifyContent: "space-between" },
  weekdayChip: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  weekdayChipText: { fontFamily: "DM_Sans_700Bold", fontSize: 13 },

  slotWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slotChip: { borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  slotChipText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },

  periodRow: { flexDirection: "row", gap: 10 },
  dateField: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 12, alignItems: "center" },
  dateFieldLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 10, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 4, textAlign: "center" },
  dateFieldValue: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, textTransform: "capitalize", textAlign: "center" },

  recap: { fontFamily: "DM_Sans_400Regular", fontSize: 12.5, lineHeight: 18, marginTop: 14, textAlign: "center" },

  skippedRow: { fontFamily: "DM_Sans_400Regular", fontSize: 12, paddingVertical: 6, borderBottomWidth: 1 },

  sheetBtns: { flexDirection: "row", gap: 10, marginTop: 18 },
  btnPrimary: { flex: 1.3, borderRadius: 10, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  btnPrimaryText: { fontFamily: "DM_Sans_700Bold", fontSize: 15, color: "#fff", includeFontPadding: false, textAlign: "center" },
  btnSecondary: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  btnSecondaryText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14, includeFontPadding: false, textAlign: "center" },

  closeBtn: { alignItems: "center", marginTop: 14 },
  closeBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});
