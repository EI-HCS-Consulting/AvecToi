import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { toFrLong } from "@/lib/slotUtils";
import { addToNativeCalendar, linkCalendarEvent } from "@/lib/calendarSync";
import type { PatientSpace, SlotConfig, IntervenantProfile, InterventionType } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Modale "ajouter une intervention" côté admin — parallèle à
// AdminAddReservation.tsx (non modifié, celui-ci reste hardcodé
// "Visite"|"Nuit") : choix de l'intervenant → choix de son type
// d'intervention → confirmation → même RPC book_intervention que côté
// intervenant (voir InterventionBookingFlow.tsx), avec p_pin='ADMIN' —
// ainsi les visites en conflit sont recasées exactement de la même façon,
// que la réservation vienne de l'intervenant ou de l'admin en son nom.

export interface AdminAddInterventionHandle {
  open: (iso: string, slot: string) => void;
}

interface Props {
  space: PatientSpace;
  slotConfig: SlotConfig;
  slots: string[];
  onAdded: () => void;
  C: Theme;
}

function AdminAddIntervention({ space, slotConfig, slots, onAdded, C }: Props, ref: React.Ref<AdminAddInterventionHandle>) {
  const [target, setTarget] = useState<{ iso: string; slot: string } | null>(null);
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
    open: (iso, slot) => {
      setTarget({ iso, slot });
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

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) ?? null;
  const selectedType = types.find((t) => t.id === selectedTypeId) ?? null;

  async function handleBook() {
    if (!target || !selectedProfile || !selectedType) return;
    setSaving(true);

    const { data, error } = await supabase.rpc("book_intervention", {
      p_space_id: space.id,
      p_intervenant_profile_id: selectedProfile.id,
      p_intervention_type_id: selectedType.id,
      p_date: target.iso,
      p_start_slot: target.slot,
      p_pin: "ADMIN",
      p_slots: slots,
    });

    setSaving(false);

    if (error) {
      if (error.message.includes("INTERVENTION_CROSSES_MIDNIGHT")) {
        Alert.alert("Créneau impossible", "Cette intervention dépasserait minuit. Choisis un créneau plus tôt.");
      } else if (error.message.includes("INTERVENTION_OVERLAP_SELF")) {
        Alert.alert("Chevauchement", "Cet intervenant a déjà une intervention prévue sur ce créneau.");
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
    if (!target || !savedId || !selectedType) return;
    setAddingToCalendar(true);
    const result = await addToNativeCalendar(
      space, slotConfig, target.iso, target.slot, "Intervention", null,
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
    setTarget(null);
    setSavedId(null);
  }

  return (
    <Modal visible={!!target} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => !saving && close()}>
          <ScrollView contentContainerStyle={styles.overlayScroll} keyboardShouldPersistTaps="handled">
            <TouchableOpacity activeOpacity={1}>
              <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.orange }]}>
                {savedId ? (
                  <>
                    <Text style={[styles.sheetTitle, { color: C.success }]}>Intervention ajoutée ✓</Text>
                    <Text style={[styles.sheetSub, { color: C.muted }]}>
                      {selectedType?.label} · {target && toFrLong(new Date(target.iso + "T12:00:00"))} · {target?.slot}
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
                    <Text style={[styles.sheetSub, { color: C.muted }]}>
                      {target && toFrLong(new Date(target.iso + "T12:00:00"))} · {target?.slot}
                    </Text>

                    {loadingProfiles ? (
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

                        <View style={[styles.priorityBox, { borderColor: C.orange, backgroundColor: "rgba(249,115,22,0.1)" }]}>
                          <Text style={[styles.priorityText, { color: C.text }]}>
                            ⚠️ Cette intervention est prioritaire sur les visites. Toute visite déjà prévue sur ce
                            créneau sera automatiquement déplacée au créneau valide le plus proche.
                          </Text>
                        </View>
                      </>
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
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "center", alignItems: "center", padding: 20 },
  overlayScroll: { flexGrow: 1, justifyContent: "center", alignItems: "center" },
  sheet: { width: "100%", maxWidth: 400, borderRadius: 20, borderWidth: 1, padding: 24, paddingBottom: 32 },
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
