import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { Theme } from "@/lib/themes";
import { LOGO_PURPLE } from "@/lib/themes";
import type { Reservation, SlotConfig } from "@/lib/types";
import { addDays, getWeekDates, toISO, toFrLong, getDayStatus } from "@/lib/slotUtils";
import PlanningLegend from "@/components/PlanningLegend";
import DaySlotGrid from "@/components/DaySlotGrid";
import SlotOccupantsModal, { type SelectedSlot } from "@/components/SlotOccupantsModal";

// Vue "planning des intervenants" en semaine — réutilisée en lecture/écriture
// par l'admin (app/(admin)/intervenants.tsx) et en lecture seule par les
// visiteurs/intervenants (app/(visitor)/home/planning.tsx et
// IntervenantPlanningPanel), pour éviter de dupliquer cette logique.
// Bande de 7 jours compacts sur la largeur de l'écran (même code visuel que
// le calendrier mensuel : pastille de statut + cadre violet si au moins un
// soin ce jour-là), synoptique de la semaine sans avoir à scroller. Un tap
// sur un jour affiche son détail (créneaux) juste en dessous — un seul jour
// de détail à la fois plutôt que les 7 grilles de créneaux empilées
// verticalement (ancien comportement, qui obligeait à scroller loin pour
// repérer les soins programmés).

const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = toISO(today);
  const weekAnchorIso = toISO(weekAnchor);

  const [selectedIso, setSelectedIso] = useState(() => {
    const isos = weekDates.map(toISO);
    return isos.includes(todayIso) ? todayIso : isos[0];
  });

  // Changement de semaine (‹ ›) : si le jour sélectionné n'appartient plus à
  // la semaine affichée, on retombe sur aujourd'hui s'il y est, sinon le
  // lundi de la nouvelle semaine.
  useEffect(() => {
    const isos = getWeekDates(weekAnchor).map(toISO);
    setSelectedIso((prev) => (isos.includes(prev) ? prev : isos.includes(todayIso) ? todayIso : isos[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekAnchorIso]);

  const selectedDay = new Date(selectedIso + "T00:00:00");
  const selectedConfig = getConfigForDate(selectedIso) ?? slotConfig;
  const selectedSlots = getSlotsForDate(selectedIso);
  const selectedStatus = getDayStatus(reservations, selectedIso, selectedDay, selectedConfig, selectedSlots, startDate, "Intervention");

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

      <View style={styles.strip}>
        {weekDates.map((day) => {
          const iso = toISO(day);
          const config = getConfigForDate(iso) ?? slotConfig;
          const daySlots = getSlotsForDate(iso);
          const status = getDayStatus(reservations, iso, day, config, daySlots, startDate, "Intervention");
          const dotColor =
            status === "full" ? C.danger : status === "partial" ? C.orange : status === "empty" ? C.success : "transparent";
          const hasIntervention = reservations.some((r) => r.type === "Intervention" && r.date === iso);
          const isSelected = iso === selectedIso;
          const isToday = iso === todayIso;

          return (
            <TouchableOpacity
              key={iso}
              onPress={() => setSelectedIso(iso)}
              activeOpacity={0.7}
              style={[
                styles.stripCell,
                {
                  backgroundColor: isSelected ? C.accent : C.card,
                  borderColor: isSelected ? C.accent : hasIntervention ? LOGO_PURPLE : isToday ? C.gold : C.border,
                  borderWidth: isToday || hasIntervention ? 2 : 1,
                },
              ]}
            >
              <Text style={[styles.stripDow, { color: isSelected ? "#fff" : C.muted }]}>
                {WEEKDAY_LABELS[day.getDay() === 0 ? 6 : day.getDay() - 1]}
              </Text>
              <Text style={[styles.stripDate, { color: isSelected ? "#fff" : isToday ? C.gold : C.text }]}>{day.getDate()}</Text>
              <View style={[styles.stripDot, { backgroundColor: dotColor }]} />
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.stripLegend}>
        <View style={[styles.stripLegendFrame, { borderColor: LOGO_PURPLE }]} />
        <Text style={[styles.stripLegendLabel, { color: C.muted }]}>Soin programmé ce jour-là</Text>
      </View>

      <Text style={[styles.dayTitle, { color: C.text }]}>{toFrLong(selectedDay)}</Text>
      <PlanningLegend C={C} />
      <DaySlotGrid
        C={C}
        iso={selectedIso}
        day={selectedDay}
        config={selectedConfig}
        daySlots={selectedSlots}
        reservations={reservations}
        status={selectedStatus}
        showHeader={false}
        onSlotPress={(slotIso, slot, occupants) => setSelected({ iso: slotIso, slot, occupants })}
      />

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

  strip: { flexDirection: "row", justifyContent: "space-between", gap: 4, marginBottom: 8 },
  stripCell: { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 8, alignItems: "center", gap: 3 },
  stripDow: { fontFamily: "DM_Sans_600SemiBold", fontSize: 10, textTransform: "uppercase" },
  stripDate: { fontFamily: "DM_Sans_700Bold", fontSize: 15 },
  stripDot: { width: 5, height: 5, borderRadius: 2.5 },

  stripLegend: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginBottom: 14 },
  stripLegendFrame: { width: 12, height: 12, borderRadius: 4, borderWidth: 2 },
  stripLegendLabel: { fontFamily: "DM_Sans_400Regular", fontSize: 11 },

  dayTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 16, textTransform: "capitalize", textAlign: "center", marginBottom: 10 },
});
