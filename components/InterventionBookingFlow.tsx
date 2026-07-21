import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  Modal, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { linkCalendarEvent, addToNativeCalendar, deleteLinkedCalendarEvent } from "@/lib/calendarSync";
import { isReservationDatePast, isSlotFullyPast, toFrLong, toFrShort } from "@/lib/slotUtils";
import ConfirmModal from "@/components/ConfirmModal";
import type { Reservation, SlotConfig, PatientSpace, InterventionType } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Réservation par l'intervenant lui-même — équivalent de BookingFlow.tsx
// mais sans compagnons/email invité/capture d'identité (déjà gérés par la
// fiche intervenant, voir IntervenantFicheModal.tsx). Chaque réservation
// bloque directement la durée du type d'intervention choisi et recase les
// visites en conflit via la RPC book_intervention — voir
// supabase/migrations/20260722_book_intervention.sql pour l'algorithme
// exact (identique à apply_slot_rule_change, réutilise les mêmes
// alert_type 'rebooked'/'rebooking_failed' donc RebookingAlertModal.tsx
// n'a besoin d'aucun changement).

export interface InterventionBookingFlowHandle {
  openBooking: (iso: string, slot: string) => void;
  openCancel: (r: Reservation) => void;
}

interface Props {
  space: PatientSpace;
  slotConfig: SlotConfig;
  slots: string[];
  reservations: Reservation[];
  intervenantProfileId: string;
  pin: string;
  refreshReservations: () => Promise<void>;
  homeCalendarPath: "/(visitor)/home/calendar";
  C: Theme;
}

interface ConfirmedBooking {
  iso: string;
  slot: string;
  label: string;
  rebookedCount: number;
  failedCount: number;
  durationMinutes: number;
  reservationId: string;
}

function InterventionBookingFlow(
  { space, slotConfig, slots, reservations, intervenantProfileId, pin, refreshReservations, homeCalendarPath, C }: Props,
  ref: React.Ref<InterventionBookingFlowHandle>,
) {
  const router = useRouter();

  const [types, setTypes] = useState<InterventionType[]>([]);

  useEffect(() => {
    supabase
      .from("intervention_types")
      .select("*")
      .eq("intervenant_profile_id", intervenantProfileId)
      .order("created_at", { ascending: true })
      .then(({ data }) => setTypes(data || []));
  }, [intervenantProfileId]);

  const [bookingTarget, setBookingTarget] = useState<{ iso: string; slot: string } | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dayBookedAlert, setDayBookedAlert] = useState(false);
  const [overlapAlert, setOverlapAlert] = useState(false);
  const [confirmed, setConfirmed] = useState<ConfirmedBooking | null>(null);
  const [calendarAdded, setCalendarAdded] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const [toast, setToast] = useState("");
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
  }

  function openBooking(iso: string, slot: string) {
    if (isSlotFullyPast(iso, slot)) {
      showToast("Ce créneau est déjà passé.");
      return;
    }
    setSelectedTypeId(types[0]?.id ?? null);
    setBookingTarget({ iso, slot });
    setConfirmed(null);
    setCalendarAdded(false);
  }

  function openCancel(r: Reservation) {
    setCancelTarget(r);
  }

  useImperativeHandle(ref, () => ({ openBooking, openCancel }));

  const selectedType = types.find((t) => t.id === selectedTypeId) ?? null;

  async function handleBook() {
    if (!bookingTarget || !selectedType) return;
    setSaving(true);

    const { data, error } = await supabase.rpc("book_intervention", {
      p_space_id: space.id,
      p_intervenant_profile_id: intervenantProfileId,
      p_intervention_type_id: selectedType.id,
      p_date: bookingTarget.iso,
      p_start_slot: bookingTarget.slot,
      p_pin: pin,
      p_slots: slots,
    });

    setSaving(false);

    if (error) {
      if (error.message.includes("INTERVENTION_CROSSES_MIDNIGHT")) {
        Alert.alert("Créneau impossible", "Cette intervention dépasserait minuit. Choisis un créneau plus tôt.");
      } else if (error.message.includes("INTERVENTION_OVERLAP_SELF")) {
        setOverlapAlert(true);
      } else if (error.message.includes("DAY_ALREADY_BOOKED")) {
        setDayBookedAlert(true);
      } else {
        Alert.alert("Erreur lors de la réservation", error.message);
      }
      return;
    }

    await refreshReservations();

    setConfirmed({
      iso: bookingTarget.iso,
      slot: bookingTarget.slot,
      label: selectedType.label,
      rebookedCount: (data?.rebooked ?? []).length,
      failedCount: (data?.failed ?? []).length,
      durationMinutes: selectedType.duration_minutes,
      reservationId: data?.intervention_id ?? "",
    });
  }

  async function handleAddToCalendar() {
    if (!confirmed) return;
    const result = await addToNativeCalendar(
      space, slotConfig, confirmed.iso, confirmed.slot, "Intervention", null,
      undefined, confirmed.label, confirmed.durationMinutes,
    );
    if (result.ok) {
      if (confirmed.reservationId) await linkCalendarEvent(confirmed.reservationId, result.eventId);
      setCalendarAdded(true);
      showToast("Intervention ajoutée à ton calendrier ✓");
    } else {
      Alert.alert("Calendrier", "Impossible d'ajouter l'événement : " + result.reason);
    }
  }

  async function handleCancel() {
    if (!cancelTarget || isReservationDatePast(cancelTarget.date)) return;
    setCancelling(true);

    const { error, count } = await supabase.from("reservations").delete({ count: "exact" }).eq("id", cancelTarget.id);

    setCancelling(false);

    if (error || count === 0) {
      showToast("Erreur lors de l'annulation.");
      return;
    }

    deleteLinkedCalendarEvent(cancelTarget.id);
    await refreshReservations();
    showToast("Intervention annulée ✓");
    setCancelTarget(null);
  }

  return (
    <>
      {/* ── MODAL RÉSERVATION ──────────────────────────────────────────────── */}
      <Modal visible={!!bookingTarget && !confirmed} transparent animationType="slide" onRequestClose={() => setBookingTarget(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => !saving && setBookingTarget(null)}>
            <ScrollView contentContainerStyle={styles.overlayScroll} keyboardShouldPersistTaps="handled">
              <TouchableOpacity activeOpacity={1}>
                <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.orange }]}>
                  <Text style={[styles.sheetTitle, { color: C.text }]}>🩺 Intervention {bookingTarget?.slot}</Text>
                  <Text style={[styles.sheetSub, { color: C.muted }]}>
                    {bookingTarget && toFrLong(new Date(bookingTarget.iso + "T12:00:00"))}
                  </Text>

                  {types.length === 0 ? (
                    <Text style={[styles.sheetSub, { color: C.muted }]}>
                      Ajoute au moins un type d'intervention depuis "Mon compte → Ma fiche intervenant" avant de pouvoir réserver.
                    </Text>
                  ) : (
                    <>
                      <Text style={[styles.fieldLabel, { color: C.gold }]}>Type d'intervention</Text>
                      <View style={styles.typeGrid}>
                        {types.map((t) => {
                          const selected = selectedTypeId === t.id;
                          return (
                            <TouchableOpacity
                              key={t.id}
                              style={[
                                styles.typeOption,
                                { backgroundColor: selected ? C.orange : C.bg, borderColor: selected ? C.orange : C.border },
                              ]}
                              onPress={() => setSelectedTypeId(t.id)}
                              activeOpacity={0.75}
                            >
                              <Text style={[styles.typeOptionLabel, { color: selected ? "#fff" : C.text }]}>{t.label}</Text>
                              <Text style={[styles.typeOptionDuration, { color: selected ? "rgba(255,255,255,0.85)" : C.muted }]}>
                                {t.duration_minutes} min
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <View style={[styles.priorityBox, { borderColor: C.orange, backgroundColor: "rgba(249,115,22,0.1)" }]}>
                        <Text style={[styles.priorityText, { color: C.text }]}>
                          ⚠️ Ton intervention est prioritaire sur les visites. Si une visite est déjà prévue sur ce créneau,
                          elle sera automatiquement déplacée au créneau valide le plus proche.
                        </Text>
                      </View>
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
                      disabled={saving || !selectedType}
                      style={[styles.btnPrimary, { backgroundColor: C.orange }, (saving || !selectedType) && { opacity: 0.5 }]}
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
          <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.orange }]}>
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>🩺</Text>
              <Text style={[styles.sheetTitle, { color: C.success }]}>Intervention réservée</Text>
              <Text style={[styles.sheetSub, { color: C.muted }]}>
                {confirmed?.label} · {confirmed && toFrShort(new Date(confirmed.iso + "T12:00:00"))} {confirmed?.slot}
              </Text>
            </View>

            {!!confirmed?.rebookedCount && (
              <Text style={[styles.rebookInfo, { color: C.text, backgroundColor: C.bg, borderColor: C.border }]}>
                {confirmed.rebookedCount} visite(s) en conflit ont été automatiquement déplacées.
              </Text>
            )}
            {!!confirmed?.failedCount && (
              <Text style={[styles.rebookInfo, { color: C.danger, backgroundColor: C.bg, borderColor: C.danger }]}>
                {confirmed.failedCount} visite(s) n'ont pas pu être replacées automatiquement — l'organisateur a été alerté.
              </Text>
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
              style={[styles.backToCalendarBtn, { borderColor: C.orange, backgroundColor: `${C.orange}22`, marginTop: 10 }]}
              onPress={() => { setConfirmed(null); setBookingTarget(null); router.navigate(homeCalendarPath); }}
              activeOpacity={0.75}
            >
              <Text style={[styles.btnSecondaryText, { color: C.orange }]}>← Retour au calendrier</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL ANNULATION ──────────────────────────────────────────────── */}
      <Modal visible={!!cancelTarget} transparent animationType="fade" onRequestClose={() => setCancelTarget(null)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.orange }]}>
            <Text style={[styles.sheetTitle, { color: C.text }]}>Annuler cette intervention ?</Text>
            <Text style={[styles.sheetSub, { color: C.muted }]}>
              {cancelTarget?.intervention_label} · {cancelTarget && toFrShort(new Date(cancelTarget.date + "T12:00:00"))} {cancelTarget?.creneau}
            </Text>
            <View style={styles.sheetBtns}>
              <TouchableOpacity onPress={() => setCancelTarget(null)} disabled={cancelling} style={[styles.btnSecondary, { borderColor: C.border }]}>
                <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Retour</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCancel}
                disabled={cancelling}
                style={[styles.btnPrimary, { backgroundColor: C.danger }, cancelling && { opacity: 0.5 }]}
              >
                {cancelling ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnPrimaryText}>🗑️ Annuler</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {!!toast && (
        <View style={[styles.toast, { backgroundColor: C.success }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <ConfirmModal
        visible={dayBookedAlert}
        icon="📅"
        title="Un seul créneau par jour"
        message={"Le mode \"1 visite par jour\" est activé : une visite ou une intervention est déjà prévue ce jour-là. Choisis un autre jour."}
        singleButton
        destructive={false}
        confirmLabel="J'ai compris"
        onCancel={() => setDayBookedAlert(false)}
        onConfirm={() => setDayBookedAlert(false)}
        C={C}
      />

      <ConfirmModal
        visible={overlapAlert}
        icon="⚠️"
        title="Chevauchement"
        message="Tu as déjà une intervention prévue sur ce créneau."
        singleButton
        destructive={false}
        confirmLabel="J'ai compris"
        onCancel={() => setOverlapAlert(false)}
        onConfirm={() => setOverlapAlert(false)}
        C={C}
      />
    </>
  );
}

export default forwardRef(InterventionBookingFlow);

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "flex-end" },
  overlayScroll: { flexGrow: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, padding: 24, paddingBottom: 40, marginBottom: 12 },

  sheetTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 4 },
  sheetSub: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginBottom: 20 },

  fieldLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  typeOption: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignItems: "center", minWidth: "44%" },
  typeOptionLabel: { fontFamily: "DM_Sans_700Bold", fontSize: 14 },
  typeOptionDuration: { fontFamily: "DM_Sans_400Regular", fontSize: 11, marginTop: 2 },

  priorityBox: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 4 },
  priorityText: { fontFamily: "DM_Sans_400Regular", fontSize: 12.5, lineHeight: 18 },

  sheetBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
  btnPrimary: { flex: 1.3, borderRadius: 10, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  btnPrimaryText: { fontFamily: "DM_Sans_700Bold", fontSize: 15, color: "#fff" },
  btnSecondary: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  btnSecondaryText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  backToCalendarBtn: { width: "100%", borderWidth: 1, borderRadius: 10, paddingVertical: 14, alignItems: "center" },

  rebookInfo: { borderWidth: 1, borderRadius: 10, padding: 12, fontFamily: "DM_Sans_400Regular", fontSize: 12.5, lineHeight: 18, marginBottom: 12 },

  calendarBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  calendarBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },

  toast: { position: "absolute", bottom: 24, alignSelf: "center", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  toastText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, color: "#fff" },
});
