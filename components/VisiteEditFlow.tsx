import { useState, useMemo, forwardRef, useImperativeHandle } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { getSlotOccupancy, isSlotFullyPast, toFrShort } from "@/lib/slotUtils";
import MiniCalendar from "@/components/MiniCalendar";
import type { Reservation, SlotConfig, PatientSpace } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Édition d'une visite déjà réservée (jour, créneau, accompagnants) depuis
// home/calendar.tsx (mode Visites) — "Modifier ce créneau", calqué sur
// InterventionEditFlow.tsx mais sans section "Type d'intervention" (une
// visite n'en a pas) et avec en plus la gestion des accompagnants, reprise
// de BookingFlow.tsx (companions/group_id). Contrairement à
// InterventionEditFlow (cross-space, popup jour de mes-espaces-patients.tsx),
// l'espace est unique côté visiteur : slotConfig/slots/reservations sont
// déjà chargés par VisitorContext, pas besoin de les recharger à l'ouverture.

export interface VisiteEditFlowHandle {
  open: (r: Reservation) => void;
}

interface Companion {
  id: string | null; // null = nouvel accompagnant pas encore enregistré
  prenom: string;
  nom: string;
}

interface Props {
  C: Theme;
  space: PatientSpace;
  slotConfig: SlotConfig;
  slots: string[];
  reservations: Reservation[];
  startDate: Date;
  onSaved: () => void;
}

function VisiteEditFlow({ C, space, slotConfig, slots, reservations, startDate, onSaved }: Props, ref: React.Ref<VisiteEditFlowHandle>) {
  const [target, setTarget] = useState<Reservation | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editSlot, setEditSlot] = useState<string | null>(null);
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function open(r: Reservation) {
    const d = new Date(r.date + "T12:00:00");
    setTarget(r);
    setEditDate(r.date);
    // Ne pré-sélectionne pas un créneau déjà passé (obligerait sinon
    // l'utilisateur à choisir un jour/créneau valide avant de pouvoir
    // enregistrer — voir aussi le garde-fou dans handleSave et canSave).
    setEditSlot(isSlotFullyPast(r.date, r.creneau) ? null : r.creneau);
    setCalMonth({ year: d.getFullYear(), month: d.getMonth() });
    const existing = r.group_id
      ? reservations.filter((x) => x.group_id === r.group_id && x.id !== r.id)
      : [];
    setCompanions(existing.map((c) => ({ id: c.id, prenom: c.prenom, nom: c.nom })));
    setRemovedIds([]);
  }

  useImperativeHandle(ref, () => ({ open }));

  // Réservations hors le groupe de la visite en cours d'édition (elle-même +
  // ses accompagnants d'origine, qu'ils soient conservés ou retirés dans
  // cette édition — dans les deux cas ils ne resteront pas sur leur ancien
  // créneau une fois enregistrés) — sert à calculer l'occupation réelle du
  // nouveau jour/créneau choisi sans se compter soi-même.
  const reservationsExcludingGroup = useMemo(() => {
    if (!target) return reservations;
    return reservations.filter((r) => r.id !== target.id && !(target.group_id && r.group_id === target.group_id));
  }, [reservations, target]);

  const editOcc = editSlot ? getSlotOccupancy(reservationsExcludingGroup, editDate, editSlot) : [];
  const maxCompanions = Math.max(0, slotConfig.max_visitors_per_slot - 1 - editOcc.length);

  function addCompanion() {
    setCompanions((prev) => [...prev, { id: null, prenom: "", nom: "" }]);
  }
  function updateCompanion(index: number, field: "prenom" | "nom", value: string) {
    setCompanions((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  }
  function removeCompanion(index: number) {
    const item = companions[index];
    if (item.id) setRemovedIds((prev) => [...prev, item.id!]);
    setCompanions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!target || !editSlot || isSlotFullyPast(editDate, editSlot)) return;
    setSaving(true);

    const keptCompanions = companions.filter((c) => c.id);
    const newCompanions = companions
      .filter((c) => !c.id)
      .map((c) => ({ prenom: c.prenom.trim(), nom: c.nom.trim() }))
      .filter((c) => c.prenom && c.nom);
    const hasGroup = keptCompanions.length > 0 || newCompanions.length > 0;
    const groupId = target.group_id ?? (hasGroup ? target.id : null);

    const { error, count } = await supabase
      .from("reservations")
      .update({
        date: editDate,
        creneau: editSlot,
        group_id: groupId,
        alert_message: null,
        alert_type: null,
        alert_seen: true,
        previous_date: null,
        previous_creneau: null,
      }, { count: "exact" })
      .eq("id", target.id);

    if (error || count === 0) {
      setSaving(false);
      Alert.alert(
        "Erreur",
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

    if (removedIds.length > 0) {
      await supabase.from("reservations").delete().in("id", removedIds);
    }
    for (const c of keptCompanions) {
      await supabase.from("reservations").update({ date: editDate, creneau: editSlot }).eq("id", c.id!);
    }
    if (newCompanions.length > 0) {
      await supabase.from("reservations").insert(
        newCompanions.map((c) => ({
          space_id: target.space_id,
          date: editDate,
          creneau: editSlot,
          prenom: c.prenom,
          nom: c.nom,
          telephone: "",
          type: "Visite",
          pin: target.pin,
          group_id: groupId,
        })),
      );
    }

    setSaving(false);
    setTarget(null);
    onSaved();
  }

  const canSave = !!editSlot && !saving && !isSlotFullyPast(editDate, editSlot);

  return (
    <Modal visible={!!target} transparent animationType="slide" onRequestClose={() => !saving && setTarget(null)}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => !saving && setTarget(null)}>
          <ScrollView contentContainerStyle={styles.overlayScroll} keyboardShouldPersistTaps="handled">
            <TouchableOpacity activeOpacity={1}>
              <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.accent }]}>
                <Text style={[styles.sheetTitle, { color: C.text }]}>✏️ Modifier ce créneau</Text>
                <Text style={[styles.sheetSub, { color: C.muted }]}>
                  Visite d&apos;origine : {target && toFrShort(new Date(target.date + "T12:00:00"))} {target?.creneau}.
                </Text>

                <Text style={[styles.fieldLabel, { color: C.gold }]}>Nouveau jour</Text>
                <MiniCalendar
                  selDate={editDate}
                  onSelect={(iso) => { setEditDate(iso); setEditSlot(null); }}
                  calMonth={calMonth}
                  onMonthChange={setCalMonth}
                  startDate={startDate}
                  C={C}
                  size="lg"
                  slotConfig={slotConfig}
                  slots={slots}
                  reservations={reservations}
                />

                <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 0, marginBottom: 0 }]}>Nouveau créneau</Text>
                <View style={styles.slotGrid}>
                  {slots.map((slot) => {
                    const occ = getSlotOccupancy(reservationsExcludingGroup, editDate, slot);
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

                {companions.length > 0 && (
                  <View style={[styles.companionSeparator, { borderTopColor: C.border }]}>
                    <Text style={[styles.companionSeparatorText, { color: C.muted }]}>Accompagnants</Text>
                  </View>
                )}
                {companions.map((c, i) => (
                  <View key={c.id ?? `new-${i}`} style={styles.companionRow}>
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

                <View style={styles.modalButtons}>
                  <TouchableOpacity style={[styles.modalBtnSecondary, { borderColor: C.border }]} onPress={() => setTarget(null)} disabled={saving}>
                    <Text style={[styles.modalBtnSecondaryText, { color: C.muted }]}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtnPrimary, { backgroundColor: C.accent }, !canSave && { opacity: 0.5 }]}
                    onPress={handleSave}
                    disabled={!canSave}
                  >
                    {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalBtnPrimaryText}>✓ Enregistrer</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default forwardRef(VisiteEditFlow);

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
  slotOptionCount: { fontFamily: "DM_Sans_400Regular", fontSize: 11, marginTop: 2 },

  input: { borderWidth: 1, borderRadius: 10, padding: 13, fontFamily: "DM_Sans_400Regular", fontSize: 15, marginBottom: 10 },
  companionSeparator: { borderTopWidth: 1, paddingTop: 12, marginTop: 14, marginBottom: 10 },
  companionSeparatorText: { fontFamily: "DM_Sans_700Bold", fontSize: 13 },
  companionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  companionNames: { flexDirection: "column", flex: 1 },
  removeCompanionBtn: { paddingHorizontal: 6 },
  removeCompanionBtnText: { fontSize: 16 },
  addCompanionBtn: { alignSelf: "flex-start", paddingVertical: 6, marginBottom: 4 },
  addCompanionBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },

  modalButtons: { flexDirection: "row", gap: 10, width: "100%", marginTop: 18 },
  modalBtnSecondary: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  modalBtnSecondaryText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  modalBtnPrimary: { flex: 1.3, borderRadius: 10, paddingVertical: 13, alignItems: "center", justifyContent: "center" },
  modalBtnPrimaryText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
});
