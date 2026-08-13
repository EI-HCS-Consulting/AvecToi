import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  Modal, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { linkCalendarEvent, addToNativeCalendar } from "@/lib/calendarSync";
import { toFrLong, nightStartSlot, nightRangeLabel } from "@/lib/slotUtils";
import { getSyncedInterventionTypes } from "@/lib/interventionTypesSync";
import type { SlotConfig, PatientSpace, InterventionType } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Réservation d'une nuitée par un intervenant autorisé (voir
// slot_config.night_intervenant_mode, components/NightIntervenantModal.tsx)
// — équivalent de InterventionBookingFlow.tsx mais pour les nuitées : même
// choix du soin, même popup centrée, mais sans RPC book_intervention (une
// nuitée occupe toute la nuit, jamais en conflit avec des réservations
// "Visite" — pas de recasage à faire). L'identité de l'intervenant vient de
// sa fiche (prenom/nom/pin), jamais saisie ici. L'édition/annulation d'une
// nuitée déjà réservée reste gérée par BookingFlow.tsx (modale PIN, déjà
// centrée) via nightFlowRef, qu'elle ait été prise par un intervenant ou un
// visiteur.

export interface NightInterventionBookingFlowHandle {
  openBooking: (iso: string) => void;
}

interface Props {
  space: PatientSpace;
  slotConfig: SlotConfig;
  intervenantProfileId: string;
  prenom: string;
  nom: string;
  pin: string;
  refreshReservations: () => Promise<void>;
  homeCalendarPath: "/(visitor)/home/calendar";
  C: Theme;
}

interface ConfirmedBooking {
  id: string;
  iso: string;
  label: string;
}

function NightInterventionBookingFlow(
  { space, slotConfig, intervenantProfileId, prenom, nom, pin, refreshReservations, homeCalendarPath, C }: Props,
  ref: React.Ref<NightInterventionBookingFlowHandle>,
) {
  const router = useRouter();

  const [types, setTypes] = useState<InterventionType[]>([]);

  useEffect(() => {
    getSyncedInterventionTypes(intervenantProfileId).then(setTypes);
  }, [intervenantProfileId]);

  const [bookingTarget, setBookingTarget] = useState<{ iso: string } | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState<ConfirmedBooking | null>(null);
  const [calendarAdded, setCalendarAdded] = useState(false);

  const [toast, setToast] = useState("");
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
  }

  function openBooking(iso: string) {
    setSelectedTypeId(types[0]?.id ?? null);
    setBookingTarget({ iso });
    setConfirmed(null);
    setCalendarAdded(false);
  }

  useImperativeHandle(ref, () => ({ openBooking }));

  const selectedType = types.find((t) => t.id === selectedTypeId) ?? null;

  async function handleBook() {
    if (!bookingTarget || !selectedType) return;
    setSaving(true);

    const { data: rows, error } = await supabase.from("reservations").insert([{
      space_id: space.id,
      date: bookingTarget.iso,
      creneau: "🌙 Nuit",
      prenom,
      nom,
      telephone: "",
      type: "Nuit",
      pin,
      intervention_label: selectedType.label,
      intervenant_profile_id: intervenantProfileId,
    }]).select();

    setSaving(false);

    if (error) {
      Alert.alert("Erreur lors de la réservation", error.message);
      return;
    }

    await refreshReservations();

    setConfirmed({
      id: rows?.[0]?.id ?? "",
      iso: bookingTarget.iso,
      label: selectedType.label,
    });
  }

  async function handleAddToCalendar() {
    if (!confirmed) return;
    const result = await addToNativeCalendar(space, slotConfig, confirmed.iso, nightStartSlot(slotConfig), "Nuit", null);
    if (result.ok) {
      if (confirmed.id) await linkCalendarEvent(confirmed.id, result.eventId);
      setCalendarAdded(true);
      showToast("Nuitée ajoutée à ton calendrier ✓");
    } else {
      Alert.alert("Calendrier", "Impossible d'ajouter l'événement : " + result.reason);
    }
  }

  return (
    <>
      {/* ── MODAL RÉSERVATION ──────────────────────────────────────────────── */}
      <Modal visible={!!bookingTarget && !confirmed} transparent animationType="fade" onRequestClose={() => setBookingTarget(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={styles.centeredOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => !saving && setBookingTarget(null)}
            />
            <View style={[styles.centeredSheet, { backgroundColor: C.card, borderColor: C.gold }]}>
              <Text style={[styles.sheetTitle, { color: C.text }]}>🌙 Réserver une nuit</Text>
              <Text style={[styles.sheetSub, { color: C.muted }]}>
                {bookingTarget && toFrLong(new Date(bookingTarget.iso + "T12:00:00"))} · {nightRangeLabel(slotConfig)}
              </Text>

              {types.length === 0 ? (
                <Text style={[styles.sheetSub, { color: C.muted }]}>
                  Ajoute au moins un type d'intervention depuis "Mon compte → Ma fiche intervenant" avant de pouvoir réserver.
                </Text>
              ) : (
                <ScrollView style={styles.typeScroll} keyboardShouldPersistTaps="handled">
                  <Text style={[styles.fieldLabel, { color: C.gold }]}>Type d'intervention</Text>
                  <View style={styles.typeGrid}>
                    {types.map((t) => {
                      const selected = selectedTypeId === t.id;
                      return (
                        <TouchableOpacity
                          key={t.id}
                          style={[
                            styles.typeOption,
                            { backgroundColor: selected ? C.gold : C.bg, borderColor: selected ? C.gold : C.border },
                          ]}
                          onPress={() => setSelectedTypeId(t.id)}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.typeOptionLabel, { color: selected ? "#0D1B2E" : C.text }]}>{t.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
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
                  style={[styles.btnPrimary, { backgroundColor: C.gold }, (saving || !selectedType) && { opacity: 0.5 }]}
                >
                  {saving ? <ActivityIndicator color="#0D1B2E" size="small" /> : <Text style={styles.btnPrimaryText}>Confirmer</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL CONFIRMATION ────────────────────────────────────────────── */}
      <Modal visible={!!confirmed} transparent animationType="fade" onRequestClose={() => { setConfirmed(null); setBookingTarget(null); }}>
        <View style={styles.centeredOverlay}>
          <View style={[styles.centeredSheet, { backgroundColor: C.card, borderColor: C.gold }]}>
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>🌙</Text>
              <Text style={[styles.sheetTitle, { color: C.success }]}>Nuitée réservée</Text>
              <Text style={[styles.sheetSub, { color: C.muted }]}>
                {confirmed?.label} · {confirmed && toFrLong(new Date(confirmed.iso + "T12:00:00"))}
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
              onPress={() => { setConfirmed(null); setBookingTarget(null); router.navigate(homeCalendarPath); }}
              activeOpacity={0.75}
              style={{ width: "100%", height: 48, borderRadius: 10, borderWidth: 1, borderColor: C.gold, backgroundColor: `${C.gold}22`, alignItems: "center", justifyContent: "center", marginTop: 10 }}
            >
              <Text style={{ fontFamily: "DM_Sans_600SemiBold", fontSize: 14, color: C.gold }}>← Retour au calendrier</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {!!toast && (
        <View style={[styles.toast, { backgroundColor: C.success }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </>
  );
}

export default forwardRef(NightInterventionBookingFlow);

const styles = StyleSheet.create({
  centeredOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "center", alignItems: "center", padding: 24 },
  centeredSheet: { width: "88%", maxWidth: 400, maxHeight: "82%", borderRadius: 20, borderWidth: 1, padding: 24 },
  typeScroll: { maxHeight: 280 },

  sheetTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 4 },
  sheetSub: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginBottom: 20 },

  fieldLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  typeOption: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignItems: "center", minWidth: "44%" },
  typeOptionLabel: { fontFamily: "DM_Sans_700Bold", fontSize: 14 },

  sheetBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
  btnPrimary: { flex: 1.3, borderRadius: 10, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  btnPrimaryText: { fontFamily: "DM_Sans_700Bold", fontSize: 15, color: "#0D1B2E" },
  btnSecondary: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  btnSecondaryText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },

  calendarBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  calendarBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },

  toast: { position: "absolute", bottom: 24, alignSelf: "center", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  toastText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, color: "#fff" },
});
