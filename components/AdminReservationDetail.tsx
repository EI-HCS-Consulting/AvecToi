import { useState, forwardRef, useImperativeHandle } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { toFrShort, isReservationDatePast, nightStartSlot } from "@/lib/slotUtils";
import { addToNativeCalendar, linkCalendarEvent, getLinkedCalendarEvent } from "@/lib/calendarSync";
import type { PatientSpace, Reservation, SlotConfig } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Étape "détail" ouverte depuis Mon compte → Mes réservations — même
// enchaînement que côté visiteur (BookingFlow.tsx, étape pinStep "actions") :
// infos + calendrier + Modifier/Annuler, avant d'aller au formulaire dédié
// (AdminEditReservation). Uniquement utilisée sur ce chemin d'entrée : le
// bouton "Modifier" du jour (AdminSlotsList/nights.tsx) continue d'ouvrir
// directement le formulaire, sans passer par cette étape.
// "Fermer" ramène à Mon Compte (router.back()) plutôt que de laisser l'admin
// sur l'écran Créneaux/Nuitées où handleOpenReservation a navigué en arrivant.

export interface AdminReservationDetailHandle {
  open: (r: Reservation) => void;
}

interface Props {
  space: PatientSpace;
  slotConfig: SlotConfig;
  onEdit: (r: Reservation) => void;
  onDelete: (r: Reservation) => void;
  C: Theme;
}

function AdminReservationDetail({ space, slotConfig, onEdit, onDelete, C }: Props, ref: React.Ref<AdminReservationDetailHandle>) {
  const [target, setTarget] = useState<Reservation | null>(null);
  const [calendarAdded, setCalendarAdded] = useState(false);
  const [addingToCalendar, setAddingToCalendar] = useState(false);

  useImperativeHandle(ref, () => ({
    open: (r) => {
      setTarget(r);
      setCalendarAdded(false);
      getLinkedCalendarEvent(r.id).then((eventId) => setCalendarAdded(!!eventId));
    },
  }));

  function close() {
    setTarget(null);
  }

  async function handleAddToCalendar() {
    if (!target) return;
    setAddingToCalendar(true);
    const { data } = await supabase.auth.getUser();
    const slot = target.type === "Nuit" ? nightStartSlot(slotConfig) : target.creneau;
    const result = await addToNativeCalendar(space, slotConfig, target.date, slot, target.type, data.user?.email ?? null);
    setAddingToCalendar(false);
    if (!result.ok) return;
    await linkCalendarEvent(target.id, result.eventId);
    setCalendarAdded(true);
  }

  const past = !!target && isReservationDatePast(target.date);

  return (
    <Modal visible={!!target} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.accent }]}>
          {target && (
            <View style={[styles.resaInfo, { backgroundColor: C.bg, borderColor: C.border }]}>
              <Text style={[styles.resaName, { color: C.text }]}>{target.prenom} {target.nom}</Text>
              <Text style={[styles.resaDetail, { color: C.muted }]}>
                {target.type === "Nuit" ? "🌙 Nuit" : `🕐 ${target.creneau}`}
                {" · "}
                {toFrShort(new Date(target.date + "T12:00:00"))}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.calendarBtn,
              { borderColor: calendarAdded ? C.success : "rgba(52,168,83,0.4)", backgroundColor: "rgba(52,168,83,0.1)" },
              addingToCalendar && { opacity: 0.6 },
            ]}
            onPress={handleAddToCalendar}
            disabled={addingToCalendar || calendarAdded}
          >
            <Text style={[styles.calendarBtnText, { color: calendarAdded ? C.success : "#3da85e" }]}>
              {calendarAdded ? "✅ Ajouté au calendrier" : "📅 Ajouter à mon calendrier"}
            </Text>
          </TouchableOpacity>

          {past ? (
            <Text style={[styles.pastText, { color: C.muted }]}>
              {target?.type === "Nuit" ? "Cette nuitée" : "Cette visite"} est passée, elle ne peut plus être modifiée ni annulée.
            </Text>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: C.accent }]}
                onPress={() => { if (target) { close(); onEdit(target); } }}
              >
                <Text style={styles.actionBtnText}>✏️ Modifier cette réservation</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtnDanger, { borderColor: "rgba(233,69,96,0.35)", backgroundColor: "rgba(233,69,96,0.1)" }]}
                onPress={() => { if (target) { close(); onDelete(target); } }}
              >
                <Text style={[styles.actionBtnText, { color: C.danger }]}>🗑️ Annuler cette réservation</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            onPress={() => { close(); router.back(); }}
            style={[styles.closeBtn, { borderColor: C.border }]}
          >
            <Text style={[styles.closeBtnText, { color: C.muted }]}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default forwardRef(AdminReservationDetail);

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "center", alignItems: "center", padding: 20 },
  sheet: { width: "100%", maxWidth: 380, borderRadius: 20, borderWidth: 1, padding: 24 },
  resaInfo: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 16, alignItems: "center" },
  resaName: { fontFamily: "DM_Sans_700Bold", fontSize: 16, marginBottom: 4 },
  resaDetail: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },
  calendarBtn: { width: "100%", borderWidth: 1, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginBottom: 10 },
  calendarBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  pastText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center", marginTop: 4, marginBottom: 4 },
  actionBtn: { width: "100%", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginBottom: 10 },
  actionBtnDanger: { width: "100%", borderWidth: 1, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginBottom: 10 },
  actionBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
  closeBtn: { width: "100%", height: 48, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", marginTop: 4 },
  closeBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});
