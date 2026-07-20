import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { toFrLong, toISO, isSlotFullyPast } from "@/lib/slotUtils";
import { addToNativeCalendar, linkCalendarEvent } from "@/lib/calendarSync";
import MiniCalendar from "@/components/MiniCalendar";
import type { PatientSpace, SlotConfig, IntervenantProfile, InterventionType } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Modale "ajouter une intervention" côté admin — parallèle à
// AdminAddReservation.tsx (non modifié, celui-ci reste hardcodé
// "Visite"|"Nuit") : jour → horaire → intervenant → type d'intervention,
// un seul popup en 4 étapes progressives, puis même RPC book_intervention
// que côté intervenant (voir InterventionBookingFlow.tsx), avec
// p_pin='ADMIN' — ainsi les visites en conflit sont recasées exactement de
// la même façon, que la réservation vienne de l'intervenant ou de l'admin
// en son nom.

export interface AdminAddInterventionHandle {
  open: (initialIso?: string) => void;
}

interface Props {
  space: PatientSpace;
  slotConfig: SlotConfig;
  getSlotsForDate: (iso: string) => string[];
  startDate: Date;
  interventionDates: Set<string>;
  onAdded: () => void;
  C: Theme;
}

function AdminAddIntervention({ space, slotConfig, getSlotsForDate, startDate, interventionDates, onAdded, C }: Props, ref: React.Ref<AdminAddInterventionHandle>) {
  const [visible, setVisible] = useState(false);
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<IntervenantProfile[]>([]);
  const [types, setTypes] = useState<InterventionType[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [saving, setSaving] = useState(false);

  const [savedId, setSavedId] = useState<string | null>(null);
  const [rebookedCount, setRebookedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [addingToCalendar, setAddingToCalendar] = useState(false);
  const [calendarAdded, setCalendarAdded] = useState(false);

  useImperativeHandle(ref, () => ({
    open: (initialIso) => {
      const iso = initialIso ?? toISO(new Date());
      const d = new Date(iso + "T00:00:00");
      setSelectedIso(iso);
      setCalMonth({ year: d.getFullYear(), month: d.getMonth() });
      setSelectedSlot(null);
      setSelectedProfileId(null);
      setSelectedTypeId(null);
      setTypes([]);
      setSavedId(null);
      setCalendarAdded(false);
      setLoadingProfiles(true);
      supabase
        .from("intervenant_profiles")
        .select("*")
        .eq("space_id", space.id)
        .order("prenom", { ascending: true })
        .then(({ data }) => {
          setProfiles(data || []);
          setLoadingProfiles(false);
        });
      setVisible(true);
    },
  }));

  useEffect(() => {
    if (!selectedProfileId) { setTypes([]); setSelectedTypeId(null); return; }
    setLoadingTypes(true);
    supabase
      .from("intervention_types")
      .select("*")
      .eq("intervenant_profile_id", selectedProfileId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setTypes(data || []);
        setSelectedTypeId(data?.[0]?.id ?? null);
        setLoadingTypes(false);
      });
  }, [selectedProfileId]);

  const allSlotsForDay = selectedIso ? getSlotsForDate(selectedIso) : [];
  const futureSlotsForDay = selectedIso ? allSlotsForDay.filter((s) => !isSlotFullyPast(selectedIso, s)) : [];
  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) ?? null;
  const selectedType = types.find((t) => t.id === selectedTypeId) ?? null;

  function selectDay(iso: string) {
    setSelectedIso(iso);
    setSelectedSlot(null);
    setSelectedProfileId(null);
    setSelectedTypeId(null);
  }

  async function handleBook() {
    if (!selectedIso || !selectedSlot || !selectedProfile || !selectedType) return;
    setSaving(true);

    const { data, error } = await supabase.rpc("book_intervention", {
      p_space_id: space.id,
      p_intervenant_profile_id: selectedProfile.id,
      p_intervention_type_id: selectedType.id,
      p_date: selectedIso,
      p_start_slot: selectedSlot,
      p_pin: "ADMIN",
      p_slots: allSlotsForDay,
    });

    setSaving(false);

    if (error) {
      if (error.message.includes("INTERVENTION_CROSSES_MIDNIGHT")) {
        Alert.alert("Créneau impossible", "Cette intervention dépasserait minuit. Choisis un créneau plus tôt.");
      } else if (error.message.includes("INTERVENTION_OVERLAP_SELF")) {
        Alert.alert("Chevauchement", "Cet intervenant a déjà une intervention prévue sur ce créneau.");
      } else if (error.message.includes("DAY_ALREADY_BOOKED")) {
        Alert.alert(
          "Un seul créneau par jour",
          "Le mode \"1 visite par jour\" est activé : une visite ou une intervention est déjà prévue ce jour-là. Choisis un autre jour.",
        );
      } else {
        Alert.alert("Erreur lors de la réservation", error.message);
      }
      return;
    }

    onAdded();
    setRebookedCount((data?.rebooked ?? []).length);
    setFailedCount((data?.failed ?? []).length);
    setSavedId(data?.intervention_id ?? null);
  }

  async function handleAddToCalendar() {
    if (!selectedIso || !selectedSlot || !savedId || !selectedType) return;
    setAddingToCalendar(true);
    const result = await addToNativeCalendar(
      space, slotConfig, selectedIso, selectedSlot, "Intervention", null,
      undefined, selectedType.label, selectedType.duration_minutes,
    );
    setAddingToCalendar(false);
    if (!result.ok) {
      Alert.alert("Calendrier", result.reason);
      return;
    }
    await linkCalendarEvent(savedId, result.eventId);
    setCalendarAdded(true);
  }

  function close() {
    setVisible(false);
    setSavedId(null);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => !saving && close()}>
          <ScrollView contentContainerStyle={styles.overlayScroll} keyboardShouldPersistTaps="handled">
            <TouchableOpacity activeOpacity={1}>
              <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.orange }]}>
                {savedId ? (
                  <>
                    <Text style={[styles.sheetTitle, { color: C.success }]}>Intervention ajoutée ✓</Text>
                    <Text style={[styles.sheetSub, { color: C.muted }]}>
                      {selectedType?.label} · {selectedIso && toFrLong(new Date(selectedIso + "T12:00:00"))} · {selectedSlot}
                    </Text>

                    {!!rebookedCount && (
                      <Text style={[styles.rebookInfo, { color: C.text, backgroundColor: C.bg, borderColor: C.border }]}>
                        {rebookedCount} visite(s) en conflit ont été automatiquement déplacées.
                      </Text>
                    )}
                    {!!failedCount && (
                      <Text style={[styles.rebookInfo, { color: C.danger, backgroundColor: C.bg, borderColor: C.danger }]}>
                        {failedCount} visite(s) n'ont pas pu être replacées automatiquement.
                      </Text>
                    )}

                    <TouchableOpacity
                      style={[
                        styles.calendarBtn,
                        { borderColor: calendarAdded ? C.success : C.orange, backgroundColor: calendarAdded ? `${C.success}22` : `${C.orange}22` },
                        addingToCalendar && { opacity: 0.6 },
                      ]}
                      onPress={handleAddToCalendar}
                      disabled={addingToCalendar || calendarAdded}
                    >
                      {addingToCalendar ? (
                        <ActivityIndicator color={C.orange} size="small" />
                      ) : (
                        <Text style={[styles.calendarBtnText, { color: calendarAdded ? C.success : C.orange }]}>
                          {calendarAdded ? "✅ Ajouté au calendrier" : "📅 Ajouter au calendrier"}
                        </Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.btnSecondary, { borderColor: C.orange, width: "100%", marginTop: 12 }]}
                      onPress={close}
                    >
                      <Text style={[styles.btnSecondaryText, { color: C.orange }]}>Fermer</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={[styles.sheetTitle, { color: C.text }]}>🩺 Ajouter une intervention</Text>

                    <Text style={[styles.fieldLabel, { color: C.gold }]}>Jour</Text>
                    {selectedIso && (
                      <MiniCalendar
                        selDate={selectedIso}
                        onSelect={selectDay}
                        calMonth={calMonth}
                        onMonthChange={setCalMonth}
                        startDate={startDate}
                        C={C}
                        size="sm"
                        markedDates={interventionDates}
                      />
                    )}

                    {selectedIso && (
                      futureSlotsForDay.length === 0 ? (
                        <Text style={[styles.sheetSub, { color: C.muted, marginBottom: 16 }]}>
                          Aucun créneau disponible ce jour-là.
                        </Text>
                      ) : (
                        <>
                          <Text style={[styles.fieldLabel, { color: C.gold }]}>Horaire</Text>
                          <View style={styles.optionGrid}>
                            {futureSlotsForDay.map((slot) => {
                              const selected = selectedSlot === slot;
                              return (
                                <TouchableOpacity
                                  key={slot}
                                  style={[
                                    styles.option,
                                    { backgroundColor: selected ? C.orange : C.bg, borderColor: selected ? C.orange : C.border },
                                  ]}
                                  onPress={() => setSelectedSlot(slot)}
                                  activeOpacity={0.75}
                                >
                                  <Text style={[styles.optionLabel, { color: selected ? "#fff" : C.text }]}>{slot}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </>
                      )
                    )}

                    {selectedSlot && (
                      loadingProfiles ? (
                        <ActivityIndicator color={C.orange} style={{ marginVertical: 16 }} />
                      ) : profiles.length === 0 ? (
                        <Text style={[styles.sheetSub, { color: C.muted }]}>
                          Aucun intervenant n'a encore créé de fiche pour cet espace.
                        </Text>
                      ) : (
                        <>
                          <Text style={[styles.fieldLabel, { color: C.gold }]}>Intervenant</Text>
                          <View style={styles.optionGrid}>
                            {profiles.map((p) => {
                              const selected = selectedProfileId === p.id;
                              return (
                                <TouchableOpacity
                                  key={p.id}
                                  style={[
                                    styles.option,
                                    { backgroundColor: selected ? C.orange : C.bg, borderColor: selected ? C.orange : C.border },
                                  ]}
                                  onPress={() => setSelectedProfileId(p.id)}
                                  activeOpacity={0.75}
                                >
                                  <Text style={[styles.optionLabel, { color: selected ? "#fff" : C.text }]}>{p.prenom} {p.nom}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>

                          {selectedProfileId && (
                            loadingTypes ? (
                              <ActivityIndicator color={C.orange} style={{ marginVertical: 16 }} />
                            ) : types.length === 0 ? (
                              <Text style={[styles.sheetSub, { color: C.muted }]}>
                                Cet intervenant n'a pas encore renseigné de type d'intervention.
                              </Text>
                            ) : (
                              <>
                                <Text style={[styles.fieldLabel, { color: C.gold }]}>Type d'intervention</Text>
                                <View style={styles.optionGrid}>
                                  {types.map((t) => {
                                    const selected = selectedTypeId === t.id;
                                    return (
                                      <TouchableOpacity
                                        key={t.id}
                                        style={[
                                          styles.option,
                                          { backgroundColor: selected ? C.orange : C.bg, borderColor: selected ? C.orange : C.border },
                                        ]}
                                        onPress={() => setSelectedTypeId(t.id)}
                                        activeOpacity={0.75}
                                      >
                                        <Text style={[styles.optionLabel, { color: selected ? "#fff" : C.text }]}>{t.label}</Text>
                                        <Text style={[styles.optionSub, { color: selected ? "rgba(255,255,255,0.85)" : C.muted }]}>
                                          {t.duration_minutes} min
                                        </Text>
                                      </TouchableOpacity>
                                    );
                                  })}
                                </View>
                              </>
                            )
                          )}
                        </>
                      )
                    )}

                    {!!selectedType && (
                      <View style={[styles.priorityBox, { borderColor: C.orange, backgroundColor: "rgba(249,115,22,0.1)" }]}>
                        <Text style={[styles.priorityText, { color: C.text }]}>
                          ⚠️ Cette intervention est prioritaire sur les visites. Toute visite déjà prévue sur ce
                          créneau sera automatiquement déplacée au créneau valide le plus proche.
                        </Text>
                      </View>
                    )}

                    <View style={styles.sheetBtns}>
                      <TouchableOpacity style={[styles.btnSecondary, { borderColor: C.border }]} onPress={close} disabled={saving}>
                        <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Annuler</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.btnPrimary, { backgroundColor: C.orange }, (!selectedType || saving) && { opacity: 0.5 }]}
                        onPress={handleBook}
                        disabled={!selectedType || saving}
                      >
                        {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnPrimaryText}>Réserver</Text>}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </ScrollView>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default forwardRef(AdminAddIntervention);

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "flex-end" },
  overlayScroll: { flexGrow: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, padding: 24, paddingBottom: 32, marginBottom: 12 },
  sheetTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 6, textAlign: "center" },
  sheetSub: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center", marginBottom: 16 },

  fieldLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 },
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  option: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignItems: "center", minWidth: "30%" },
  optionLabel: { fontFamily: "DM_Sans_700Bold", fontSize: 14 },
  optionSub: { fontFamily: "DM_Sans_400Regular", fontSize: 11, marginTop: 2 },

  priorityBox: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 4 },
  priorityText: { fontFamily: "DM_Sans_400Regular", fontSize: 12.5, lineHeight: 18 },

  rebookInfo: { borderWidth: 1, borderRadius: 10, padding: 12, fontFamily: "DM_Sans_400Regular", fontSize: 12.5, lineHeight: 18, marginBottom: 12 },

  calendarBtn: { width: "100%", borderWidth: 1, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  calendarBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },

  sheetBtns: { flexDirection: "row", gap: 10, width: "100%", marginTop: 16 },
  btnPrimary: { flex: 1.3, borderRadius: 10, paddingVertical: 13, alignItems: "center", justifyContent: "center" },
  btnPrimaryText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
  btnSecondary: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  btnSecondaryText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});
