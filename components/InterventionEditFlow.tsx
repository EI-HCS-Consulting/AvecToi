import { useState, forwardRef, useImperativeHandle } from "react";
import {
  View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { generateSlots, isSlotPast, toFrShort } from "@/lib/slotUtils";
import { getSyncedInterventionTypes } from "@/lib/interventionTypesSync";
import MiniCalendar from "@/components/MiniCalendar";
import ConfirmModal from "@/components/ConfirmModal";
import type { Reservation, InterventionType } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Édition d'un soin déjà réservé (jour, horaire, type) depuis
// mes-espaces-patients.tsx — remplace le popup jour en lecture seule.
// Contrairement à AdminEditReservation.tsx (mise à jour directe de la
// ligne, réservé au contexte single-space de useSpace()), l'édition ici
// est cross-space : chaque soin peut appartenir à un espace différent de
// celui actif dans la session, donc slot_config/types sont rechargés à
// l'ouverture pour le space_id du soin visé. La sauvegarde supprime la
// réservation d'origine puis rappelle la RPC book_intervention (même
// validation que la création : conflits, recasage des visites, minuit),
// avec restauration de la ligne d'origine si la nouvelle réservation
// échoue — book_intervention ne sait pas exclure une réservation de son
// propre calcul de chevauchement.

export interface InterventionEditFlowHandle {
  open: (r: Reservation, pin: string, patientName?: string) => void;
}

interface Props {
  onSaved: () => void;
  C: Theme;
}

function InterventionEditFlow({ onSaved, C }: Props, ref: React.Ref<InterventionEditFlowHandle>) {
  const [target, setTarget] = useState<Reservation | null>(null);
  const [patientLabel, setPatientLabel] = useState("");
  const [pin, setPin] = useState("");
  const [loadingCtx, setLoadingCtx] = useState(false);
  const [slots, setSlots] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(new Date());
  const [types, setTypes] = useState<InterventionType[]>([]);

  const [editDate, setEditDate] = useState("");
  const [editSlot, setEditSlot] = useState<string | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [saving, setSaving] = useState(false);
  const [dayBookedAlert, setDayBookedAlert] = useState(false);
  const [overlapAlert, setOverlapAlert] = useState(false);
  const [otherSpaceOverlapAlert, setOtherSpaceOverlapAlert] = useState(false);

  async function open(r: Reservation, pinArg: string, patientName?: string) {
    const d = new Date(r.date + "T12:00:00");
    setTarget(r);
    setPatientLabel(patientName ?? "");
    setPin(pinArg);
    setEditDate(r.date);
    setEditSlot(r.creneau);
    setCalMonth({ year: d.getFullYear(), month: d.getMonth() });
    setSelectedTypeId(null);
    setLoadingCtx(true);

    const [spaceRes, slotConfigRes, typesRes] = await Promise.all([
      supabase.from("patient_spaces").select("start_date").eq("id", r.space_id).single(),
      supabase.from("slot_config").select("*").eq("space_id", r.space_id).single(),
      getSyncedInterventionTypes(r.intervenant_profile_id ?? ""),
    ]);

    setStartDate(spaceRes.data ? new Date(spaceRes.data.start_date + "T00:00:00") : new Date());
    setSlots(slotConfigRes.data ? generateSlots(slotConfigRes.data) : []);
    setTypes(typesRes);
    setSelectedTypeId(typesRes.find((t) => t.label === r.intervention_label)?.id ?? typesRes[0]?.id ?? null);
    setLoadingCtx(false);
  }

  useImperativeHandle(ref, () => ({ open }));

  const selectedType = types.find((t) => t.id === selectedTypeId) ?? null;

  async function handleSave() {
    if (!target || !selectedType || !editSlot) return;
    setSaving(true);

    const { error: delError } = await supabase.from("reservations").delete().eq("id", target.id);
    if (delError) {
      setSaving(false);
      Alert.alert("Erreur", "Impossible de modifier ce soin : " + delError.message);
      return;
    }

    const { error } = await supabase.rpc("book_intervention", {
      p_space_id: target.space_id,
      p_intervenant_profile_id: target.intervenant_profile_id,
      p_intervention_type_id: selectedType.id,
      p_date: editDate,
      p_start_slot: editSlot,
      p_pin: pin,
      p_slots: slots,
    });

    if (error) {
      // Restaure la réservation d'origine — la nouvelle n'a pas pu être créée.
      await supabase.from("reservations").insert({
        id: target.id,
        space_id: target.space_id,
        date: target.date,
        creneau: target.creneau,
        prenom: target.prenom,
        nom: target.nom,
        telephone: target.telephone,
        type: target.type,
        pin: target.pin,
        intervention_label: target.intervention_label,
        duration_minutes: target.duration_minutes,
        intervenant_profile_id: target.intervenant_profile_id,
      });
      setSaving(false);
      if (error.message.includes("INTERVENTION_CROSSES_MIDNIGHT")) {
        Alert.alert("Créneau impossible", "Cette intervention dépasserait minuit. Choisis un créneau plus tôt.");
      } else if (error.message.includes("INTERVENTION_OVERLAP_OTHER_SPACE")) {
        setOtherSpaceOverlapAlert(true);
      } else if (error.message.includes("INTERVENTION_OVERLAP_SELF")) {
        setOverlapAlert(true);
      } else if (error.message.includes("DAY_ALREADY_BOOKED")) {
        setDayBookedAlert(true);
      } else {
        Alert.alert("Erreur lors de la modification", error.message);
      }
      return;
    }

    setSaving(false);
    setTarget(null);
    onSaved();
  }

  const canSave = !!selectedType && !!editSlot && !saving;

  return (
    <>
      <Modal visible={!!target} transparent animationType="slide" onRequestClose={() => !saving && setTarget(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => !saving && setTarget(null)}>
            <ScrollView contentContainerStyle={styles.overlayScroll} keyboardShouldPersistTaps="handled">
              <TouchableOpacity activeOpacity={1}>
                <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.orange }]}>
                  <Text style={[styles.sheetTitle, { color: C.text }]}>✏️ Modifier ce soin</Text>
                  <Text style={[styles.sheetSub, { color: C.muted }]}>
                    Soin d&apos;origine : {target && toFrShort(new Date(target.date + "T12:00:00"))} {target?.creneau}
                    {patientLabel ? ` pour ${patientLabel}` : ""}.
                  </Text>

                  {loadingCtx ? (
                    <ActivityIndicator color={C.orange} style={{ marginVertical: 20 }} />
                  ) : (
                    <>
                      <Text style={[styles.fieldLabel, { color: C.gold }]}>Nouveau jour</Text>
                      <MiniCalendar
                        selDate={editDate}
                        onSelect={(iso) => { setEditDate(iso); setEditSlot(null); }}
                        calMonth={calMonth}
                        onMonthChange={setCalMonth}
                        startDate={startDate}
                        C={C}
                        size="lg"
                      />

                      <Text style={[styles.fieldLabel, { color: C.gold }]}>Nouveau créneau</Text>
                      <View style={styles.slotGrid}>
                        {slots.filter((slot) => !isSlotPast(editDate, slot)).map((slot) => {
                          const selected = editSlot === slot;
                          return (
                            <TouchableOpacity
                              key={slot}
                              style={[
                                styles.slotOption,
                                { backgroundColor: selected ? C.orange : C.bg, borderColor: selected ? C.orange : C.border },
                              ]}
                              onPress={() => setEditSlot(slot)}
                              activeOpacity={0.75}
                            >
                              <Text style={[styles.slotOptionTime, { color: selected ? "#fff" : C.text }]}>{slot}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <Text style={[styles.fieldLabel, { color: C.gold }]}>Type d&apos;intervention</Text>
                      {types.length === 0 ? (
                        <Text style={[styles.sheetSub, { color: C.muted }]}>
                          Aucun type d&apos;intervention disponible.
                        </Text>
                      ) : (
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
                      )}
                    </>
                  )}

                  <View style={styles.modalButtons}>
                    <TouchableOpacity style={[styles.modalBtnSecondary, { borderColor: C.border }]} onPress={() => setTarget(null)} disabled={saving}>
                      <Text style={[styles.modalBtnSecondaryText, { color: C.muted }]}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalBtnPrimary, { backgroundColor: C.orange }, !canSave && { opacity: 0.5 }]}
                      onPress={handleSave}
                      disabled={!canSave}
                    >
                      {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalBtnPrimaryText}>Valider</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

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

      <ConfirmModal
        visible={otherSpaceOverlapAlert}
        icon="🗂️"
        title="Créneau déjà pris ailleurs"
        message="Tu es déjà engagé(e) sur ce créneau chez un autre patient. Tu ne peux pas le réserver depuis cet espace. Si tu as vraiment besoin de ce créneau ici, modifie d'abord ta réservation chez le premier patient pour le libérer."
        singleButton
        destructive={false}
        confirmLabel="J'ai compris"
        onCancel={() => setOtherSpaceOverlapAlert(false)}
        onConfirm={() => setOtherSpaceOverlapAlert(false)}
        C={C}
      />
    </>
  );
}

export default forwardRef(InterventionEditFlow);

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "flex-end" },
  overlayScroll: { flexGrow: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, padding: 20, paddingBottom: 28, marginBottom: 12 },
  sheetTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 4 },
  sheetSub: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginBottom: 6 },
  fieldLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8, marginTop: 14 },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4, justifyContent: "center" },
  slotOption: { borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, alignItems: "center", minWidth: "28%" },
  slotOptionTime: { fontFamily: "DM_Sans_700Bold", fontSize: 15 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeOption: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignItems: "center", minWidth: "44%" },
  typeOptionLabel: { fontFamily: "DM_Sans_700Bold", fontSize: 14 },
  typeOptionDuration: { fontFamily: "DM_Sans_400Regular", fontSize: 11, marginTop: 2 },
  modalButtons: { flexDirection: "row", gap: 10, width: "100%", marginTop: 18 },
  modalBtnSecondary: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  modalBtnSecondaryText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  modalBtnPrimary: { flex: 1.3, borderRadius: 10, paddingVertical: 13, alignItems: "center", justifyContent: "center" },
  modalBtnPrimaryText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
});
