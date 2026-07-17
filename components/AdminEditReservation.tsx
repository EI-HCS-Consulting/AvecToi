import { useState, forwardRef, useImperativeHandle } from "react";
import {
  View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { useSpace } from "@/lib/SpaceContext";
import { updateLinkedCalendarEvent } from "@/lib/calendarSync";
import { getSlotOccupancy, toFrShort, nightStartSlot, isSlotPast } from "@/lib/slotUtils";
import MiniCalendar from "@/components/MiniCalendar";
import type { Reservation } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Modale "modifier une réservation" côté admin — même sélecteur jour/créneau
// que la modale d'édition visiteur (components/BookingFlow.tsx), plus les
// champs prénom/nom et la suppression, sans PIN (l'admin n'en a pas besoin).

export interface AdminEditReservationHandle {
  open: (r: Reservation) => void;
}

interface Props {
  onSaved: () => void;
  onDelete: (r: Reservation) => void;
  C: Theme;
}

function AdminEditReservation({ onSaved, onDelete, C }: Props, ref: React.Ref<AdminEditReservationHandle>) {
  const { space, slotConfig, slots, reservations } = useSpace();
  const startDate = space ? new Date(space.start_date + "T00:00:00") : new Date();

  const [target, setTarget] = useState<Reservation | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editSlot, setEditSlot] = useState<string | null>(null);
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [saving, setSaving] = useState(false);
  const [cascade, setCascade] = useState<Record<string, boolean>>({});

  useImperativeHandle(ref, () => ({
    open: (r) => {
      const d = new Date(r.date + "T12:00:00");
      setTarget(r);
      setEditDate(r.date);
      setEditSlot(r.type === "Nuit" ? null : r.creneau);
      setCalMonth({ year: d.getFullYear(), month: d.getMonth() });
      setPrenom(r.prenom);
      setNom(r.nom);
      setCascade({});
    },
  }));

  // Autres réservations créées dans le même geste admin ("+ Ajouter une autre
  // personne", cf. AdminAddReservation.tsx) — liées par group_id. Permet de
  // proposer de déplacer aussi leur jour/créneau en même temps que celui-ci.
  const companions = target?.group_id
    ? reservations.filter((x) => x.group_id === target.group_id && x.id !== target.id)
    : [];

  function toggleCascade(id: string) {
    setCascade((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleSave() {
    if (!target || !prenom.trim() || !nom.trim() || !slotConfig) return;
    if (target.type !== "Nuit" && !editSlot) return;

    setSaving(true);
    const { error, count } = await supabase
      .from("reservations")
      .update({
        date: editDate,
        creneau: target.type === "Nuit" ? "🌙 Nuit" : editSlot,
        prenom: prenom.trim(),
        nom: nom.trim(),
        // Modifier avec succès une réservation recasée/annulée par un
        // changement de règles efface son alerte du même geste — le badge
        // "Vu, relayé" disparaît, sans étape de dismiss séparée. L'historique
        // permanent (reservation_change_history), lui, n'est pas touché.
        alert_message: null,
        alert_type: null,
        alert_seen: true,
        previous_date: null,
        previous_creneau: null,
      }, { count: "exact" })
      .eq("id", target.id);
    setSaving(false);

    if (error || count === 0) {
      // count === 0 sans erreur = écriture silencieusement bloquée (ex. policy
      // RLS manquante en UPDATE) : le calendrier natif, lui, se met à jour
      // quand même car il ne dépend pas de la base — d'où le faux "succès".
      Alert.alert(
        "Erreur",
        error?.message.includes("SLOT_FULL")
          ? "Ce créneau est déjà complet. Choisis-en un autre."
          : error?.message.includes("SLOT_BLOCKED_BY_INTERVENTION")
          ? "Ce créneau est réservé à une intervention prioritaire. Choisis-en un autre."
          : error ? "Erreur lors de la modification : " + error.message : "La modification n'a pas été enregistrée en base.",
      );
      return;
    }

    const cascadeIds = companions.filter((c) => cascade[c.id]).map((c) => c.id);
    if (cascadeIds.length > 0) {
      const { error: cascadeError } = await supabase
        .from("reservations")
        .update({
          date: editDate,
          creneau: target.type === "Nuit" ? "🌙 Nuit" : editSlot,
          alert_message: null,
          alert_type: null,
          alert_seen: true,
          previous_date: null,
          previous_creneau: null,
        })
        .in("id", cascadeIds);
      if (cascadeError) {
        Alert.alert("Attention", "Le créneau de l'accompagnant n'a pas pu être mis à jour : " + cascadeError.message);
      }
    }

    await updateLinkedCalendarEvent(
      target.id,
      editDate,
      target.type === "Nuit" ? nightStartSlot(slotConfig) : (editSlot ?? target.creneau),
      target.type,
      slotConfig,
      target.duration_minutes ?? undefined,
    );

    setTarget(null);
    onSaved();
  }

  function handleDeletePress() {
    if (!target) return;
    const r = target;
    setTarget(null);
    onDelete(r);
  }

  return (
    <Modal visible={!!target} transparent animationType="slide" onRequestClose={() => setTarget(null)}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => !saving && setTarget(null)}>
          <ScrollView contentContainerStyle={styles.overlayScroll} keyboardShouldPersistTaps="handled">
            <TouchableOpacity activeOpacity={1}>
              <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.accent }]}>
                <Text style={[styles.sheetTitle, { color: C.text }]}>
                  ✏️ {target?.type === "Nuit" ? "Modifier la nuitée" : "Modifier la réservation"}
                </Text>
                <Text style={[styles.sheetSub, { color: C.muted }]}>
                  {target?.prenom} {target?.nom} · résa originale : {target && toFrShort(new Date(target.date + "T12:00:00"))} {target?.creneau}
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
                  slotConfig={slotConfig ?? undefined}
                  slots={slots}
                  reservations={reservations}
                />

                {target && target.type !== "Nuit" && (
                  <>
                    <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 0, marginBottom: 0 }]}>Nouveau créneau</Text>
                    <View style={styles.slotGrid}>
                      {slots.map((slot) => {
                        const occ = getSlotOccupancy(reservations, editDate, slot, target.id);
                        const full = target.type === "Visite" && slotConfig ? occ.length >= slotConfig.max_visitors_per_slot : false;
                        if (full || isSlotPast(editDate, slot)) return null;
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
                            {slotConfig && (
                              <Text style={[styles.slotOptionCount, { color: selected || isPartial ? "rgba(255,255,255,0.75)" : C.muted }]}>
                                {occ.length}/{slotConfig.max_visitors_per_slot}
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}

                <Text style={[styles.fieldLabel, { color: C.gold }]}>Informations du visiteur</Text>
                <View style={styles.nameRow}>
                  <TextInput
                    style={[styles.input, styles.nameInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                    placeholder="Prénom *" placeholderTextColor={C.muted}
                    value={prenom} onChangeText={setPrenom} autoCapitalize="words"
                  />
                  <TextInput
                    style={[styles.input, styles.nameInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                    placeholder="Nom *" placeholderTextColor={C.muted}
                    value={nom} onChangeText={setNom} autoCapitalize="words"
                  />
                </View>

                {companions.length > 0 && (
                  <View style={[styles.companionBox, { borderColor: C.border }]}>
                    <Text style={[styles.companionLabel, { color: C.gold }]}>Réservation liée</Text>
                    {companions.map((c) => (
                      <TouchableOpacity key={c.id} style={styles.companionRow} onPress={() => toggleCascade(c.id)} activeOpacity={0.7}>
                        <View style={[styles.checkbox, { borderColor: C.accent }, cascade[c.id] && { backgroundColor: C.accent }]}>
                          {cascade[c.id] && <Text style={styles.checkboxMark}>✓</Text>}
                        </View>
                        <Text style={[styles.companionText, { color: C.text }]}>
                          Modifier aussi le créneau de {c.prenom} {c.nom}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <TouchableOpacity style={styles.deleteLink} onPress={handleDeletePress} disabled={saving}>
                  <Text style={[styles.deleteLinkText, { color: C.danger }]}>Supprimer cette réservation</Text>
                </TouchableOpacity>

                <View style={styles.modalButtons}>
                  <TouchableOpacity style={[styles.modalBtnSecondary, { borderColor: C.border }]} onPress={() => setTarget(null)} disabled={saving}>
                    <Text style={[styles.modalBtnSecondaryText, { color: C.muted }]}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalBtnPrimary,
                      { backgroundColor: C.accent },
                      (!prenom.trim() || !nom.trim() || (target?.type === "Visite" && !editSlot) || saving) && { opacity: 0.5 },
                    ]}
                    onPress={handleSave}
                    disabled={!prenom.trim() || !nom.trim() || (target?.type === "Visite" && !editSlot) || saving}
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
  );
}

export default forwardRef(AdminEditReservation);

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "flex-end" },
  overlayScroll: { flexGrow: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, padding: 20, paddingBottom: 28, marginBottom: 12 },
  sheetTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 4 },
  sheetSub: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginBottom: 6 },
  fieldLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8, marginTop: 10 },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4, justifyContent: "center" },
  slotOption: { borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, alignItems: "center", minWidth: "44%" },
  slotOptionTime: { fontFamily: "DM_Sans_700Bold", fontSize: 16 },
  slotOptionCount: { fontFamily: "DM_Sans_400Regular", fontSize: 11, marginTop: 2 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontFamily: "DM_Sans_400Regular", fontSize: 15, marginBottom: 8, width: "100%" },
  nameRow: { flexDirection: "row", gap: 8, width: "100%" },
  nameInput: { flex: 1, width: undefined },
  companionBox: { width: "100%", borderTopWidth: 1, marginTop: 8, paddingTop: 12 },
  companionLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 },
  companionRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  checkboxMark: { color: "#fff", fontSize: 13, fontFamily: "DM_Sans_700Bold" },
  companionText: { fontFamily: "DM_Sans_400Regular", fontSize: 14, flexShrink: 1 },
  deleteLink: { alignSelf: "center", paddingVertical: 6, marginTop: 2, marginBottom: 2 },
  deleteLinkText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  modalButtons: { flexDirection: "row", gap: 10, width: "100%", marginTop: 8 },
  modalBtnSecondary: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  modalBtnSecondaryText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  modalBtnPrimary: { flex: 1.3, borderRadius: 10, paddingVertical: 13, alignItems: "center", justifyContent: "center" },
  modalBtnPrimaryText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
});
