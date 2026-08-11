import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet } from "react-native";
import type { Theme } from "@/lib/themes";
import type { Reservation, SlotConfig } from "@/lib/types";
import {
  addDays,
  getWeekDates,
  toISO,
  toFrShort,
  getDayStatus,
  getSlotOccupancy,
  getInterventionOverlap,
} from "@/lib/slotUtils";

// Vue "planning des intervenants" en semaine — réutilisée en lecture/écriture
// par l'admin (app/(admin)/intervenants.tsx) et en lecture seule par les
// visiteurs/intervenants (app/(visitor)/home/planning.tsx), pour éviter de
// dupliquer cette logique comme calendar.tsx l'a été entre admin et visiteur.
// Layout "jours empilés" plutôt qu'une vraie grille 7 colonnes : plus lisible
// sur mobile et cohérent avec le reste de l'app (listes verticales).

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

interface SelectedSlot {
  iso: string;
  slot: string;
  occupants: Reservation[];
}

interface Props {
  C: Theme;
  slotConfig: SlotConfig;
  reservations: Reservation[];
  getSlotsForDate: (iso: string) => string[];
  getConfigForDate: (iso: string) => SlotConfig | null;
  startDate: Date;
  weekAnchor: Date;
  onWeekChange: (anchor: Date) => void;
  // Lecture seule côté visiteur/intervenant — pas de boutons Modifier/✕ dans
  // le modal de détail d'un créneau occupé.
  readOnly: boolean;
  onEdit?: (r: Reservation) => void;
  onDelete?: (r: Reservation) => void;
}

export default function WeeklyPlanningGrid({
  C,
  slotConfig,
  reservations,
  getSlotsForDate,
  getConfigForDate,
  startDate,
  weekAnchor,
  onWeekChange,
  readOnly,
  onEdit,
  onDelete,
}: Props) {
  const [selected, setSelected] = useState<SelectedSlot | null>(null);

  const weekDates = getWeekDates(weekAnchor);
  const first = weekDates[0];
  const last = weekDates[6];
  const weekLabel =
    first.getMonth() === last.getMonth()
      ? `Semaine du ${first.getDate()} au ${last.getDate()} ${last.toLocaleDateString("fr-FR", { month: "long" })}`
      : `Semaine du ${first.getDate()} ${first.toLocaleDateString("fr-FR", { month: "long" })} au ${last.getDate()} ${last.toLocaleDateString("fr-FR", { month: "long" })}`;

  return (
    <View>
      <View style={[styles.weekNav, { backgroundColor: C.card, borderColor: C.border }]}>
        <TouchableOpacity onPress={() => onWeekChange(addDays(weekAnchor, -7))} style={[styles.navBtn, { borderColor: C.border }]}>
          <Text style={[styles.navBtnText, { color: C.text }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.weekLabel, { color: C.text }]}>{weekLabel}</Text>
        <TouchableOpacity onPress={() => onWeekChange(addDays(weekAnchor, 7))} style={[styles.navBtn, { borderColor: C.border }]}>
          <Text style={[styles.navBtnText, { color: C.text }]}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.legend}>
        {([[C.success, "Dispo"], [C.orange, "Partiel"], [C.danger, "Complet"]] as [string, string][]).map(([color, label]) => (
          <View key={label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={[styles.legendLabel, { color: C.muted }]}>{label}</Text>
          </View>
        ))}
        <View style={styles.legendItem}>
          <View style={[styles.legendFrame, { borderColor: C.danger }]} />
          <Text style={[styles.legendLabel, { color: C.muted }]}>Occupé</Text>
        </View>
      </View>

      {weekDates.map((day) => {
        const iso = toISO(day);
        const config = getConfigForDate(iso) ?? slotConfig;
        const daySlots = getSlotsForDate(iso);
        const status = getDayStatus(reservations, iso, day, config, daySlots, startDate);
        const unavailable = status === "past";
        const dotColor =
          status === "full" ? C.danger : status === "partial" ? C.orange : status === "empty" ? C.success : "transparent";

        return (
          <View key={iso} style={[styles.daySection, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={styles.dayHeader}>
              <Text style={[styles.dayHeaderText, { color: C.text }]}>
                {WEEKDAY_LABELS[day.getDay() === 0 ? 6 : day.getDay() - 1]} {day.getDate()}
              </Text>
              <View style={[styles.dayDot, { backgroundColor: dotColor }]} />
            </View>

            {unavailable ? (
              <Text style={[styles.emptyText, { color: C.muted }]}>Jour non disponible.</Text>
            ) : daySlots.length === 0 ? (
              <Text style={[styles.emptyText, { color: C.muted }]}>Aucun créneau configuré.</Text>
            ) : (
              <View style={styles.slotsWrap}>
                {daySlots.map((slot) => {
                  const visits = getSlotOccupancy(reservations, iso, slot);
                  const intervention = getInterventionOverlap(reservations, iso, slot, config.slot_duration_minutes);
                  const occupants = intervention ? [...visits, intervention] : visits;
                  const occupied = occupants.length > 0;
                  const full = !!intervention || visits.length >= config.max_visitors_per_slot;
                  const chipDotColor = !occupied ? C.success : full ? C.danger : C.orange;

                  return (
                    <TouchableOpacity
                      key={slot}
                      disabled={!occupied}
                      activeOpacity={0.7}
                      onPress={() => setSelected({ iso, slot, occupants })}
                      style={[
                        styles.slotChip,
                        { backgroundColor: C.bg, borderColor: occupied ? C.danger : C.border, borderWidth: occupied ? 2 : 1 },
                      ]}
                    >
                      <Text style={[styles.slotChipText, { color: C.text }]}>{slot}</Text>
                      <View style={[styles.slotChipDot, { backgroundColor: chipDotColor }]} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}

      <Modal transparent visible={!!selected} animationType="fade" onRequestClose={() => setSelected(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSelected(null)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>
              {selected ? `${toFrShort(new Date(selected.iso + "T00:00:00"))} · ${selected.slot}` : ""}
            </Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {selected?.occupants.map((r) => (
                <View key={r.id} style={[styles.occupantRow, { borderColor: C.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.occupantName, { color: C.text }]}>
                      {r.type === "Intervention" ? "🩺" : "🧑"} {r.prenom} {r.nom}
                    </Text>
                    <Text style={[styles.occupantType, { color: C.muted }]}>
                      {r.type === "Intervention" ? r.intervention_label ?? "Intervention" : "Visite"}
                    </Text>
                  </View>
                  {!readOnly && (
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TouchableOpacity
                        style={[styles.modalBtn, { borderColor: C.border }]}
                        onPress={() => { setSelected(null); onEdit?.(r); }}
                      >
                        <Text style={[styles.modalBtnText, { color: C.muted }]}>Modifier</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.deleteBtn, { borderColor: "rgba(233,69,96,0.4)" }]}
                        onPress={() => { setSelected(null); onDelete?.(r); }}
                      >
                        <Text style={{ color: "#e94560", fontSize: 13 }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.closeBtn, { borderColor: C.border }]} onPress={() => setSelected(null)}>
              <Text style={[styles.closeBtnText, { color: C.text }]}>Fermer</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  weekNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  navBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 },
  navBtnText: { fontSize: 18, fontWeight: "600" },
  weekLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, textTransform: "capitalize", flex: 1, textAlign: "center" },

  legend: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", gap: 16, marginBottom: 14 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendFrame: { width: 8, height: 8, borderRadius: 3, borderWidth: 2 },
  legendLabel: { fontFamily: "DM_Sans_400Regular", fontSize: 11 },

  daySection: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  dayHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  dayHeaderText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, textTransform: "capitalize" },
  dayDot: { width: 8, height: 8, borderRadius: 4 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 12 },

  slotsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slotChip: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  slotChipText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
  slotChipDot: { width: 6, height: 6, borderRadius: 3 },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalCard: { width: "100%", maxWidth: 400, borderWidth: 1, borderRadius: 16, padding: 18 },
  modalTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 17, marginBottom: 12, textTransform: "capitalize" },
  occupantRow: { flexDirection: "row", alignItems: "center", gap: 8, borderBottomWidth: 1, paddingVertical: 10 },
  occupantName: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  occupantType: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },
  modalBtn: { borderWidth: 1, borderRadius: 7, paddingVertical: 6, paddingHorizontal: 10 },
  modalBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
  deleteBtn: { width: 28, height: 28, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  closeBtn: { marginTop: 14, borderWidth: 1, borderRadius: 10, paddingVertical: 11, alignItems: "center" },
  closeBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
});
