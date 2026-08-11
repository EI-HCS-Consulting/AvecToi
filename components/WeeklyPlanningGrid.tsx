import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { Theme } from "@/lib/themes";
import type { Reservation, SlotConfig } from "@/lib/types";
import { addDays, getWeekDates, toISO, getDayStatus } from "@/lib/slotUtils";
import PlanningLegend from "@/components/PlanningLegend";
import DaySlotGrid from "@/components/DaySlotGrid";
import SlotOccupantsModal, { type SelectedSlot } from "@/components/SlotOccupantsModal";

// Vue "planning des intervenants" en semaine — réutilisée en lecture/écriture
// par l'admin (app/(admin)/intervenants.tsx) et en lecture seule par les
// visiteurs/intervenants (app/(visitor)/home/planning.tsx), pour éviter de
// dupliquer cette logique comme calendar.tsx l'a été entre admin et visiteur.
// Layout "jours empilés" plutôt qu'une vraie grille 7 colonnes : plus lisible
// sur mobile et cohérent avec le reste de l'app (listes verticales).

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

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

      <PlanningLegend C={C} />

      {weekDates.map((day) => {
        const iso = toISO(day);
        const config = getConfigForDate(iso) ?? slotConfig;
        const daySlots = getSlotsForDate(iso);
        const status = getDayStatus(reservations, iso, day, config, daySlots, startDate);

        return (
          <DaySlotGrid
            key={iso}
            C={C}
            iso={iso}
            day={day}
            config={config}
            daySlots={daySlots}
            reservations={reservations}
            status={status}
            weekdayLabel={WEEKDAY_LABELS[day.getDay() === 0 ? 6 : day.getDay() - 1]}
            onSlotPress={(slotIso, slot, occupants) => setSelected({ iso: slotIso, slot, occupants })}
          />
        );
      })}

      <SlotOccupantsModal
        C={C}
        selected={selected}
        onClose={() => setSelected(null)}
        readOnly={readOnly}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  weekNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  navBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 },
  navBtnText: { fontSize: 18, fontWeight: "600" },
  weekLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, textTransform: "capitalize", flex: 1, textAlign: "center" },
});
