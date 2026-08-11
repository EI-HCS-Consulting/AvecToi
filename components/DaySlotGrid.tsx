import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { Theme } from "@/lib/themes";
import { LOGO_PURPLE } from "@/lib/themes";
import type { Reservation, SlotConfig } from "@/lib/types";
import { getSlotOccupancy, getInterventionOverlap, type DayStatus } from "@/lib/slotUtils";

// Carte d'un jour du planning des intervenants — pastille par créneau selon
// l'occupation des visites (vert/orange/rouge) + cadre violet dès qu'un soin
// (intervention) chevauche le créneau. Réutilisée telle quelle par
// WeeklyPlanningGrid (une carte par jour de la semaine) et par l'affichage
// mensuel de (admin)/intervenants.tsx (une seule carte pour le jour
// sélectionné) pour ne pas dupliquer cette logique deux fois.
interface Props {
  C: Theme;
  iso: string;
  day: Date;
  config: SlotConfig;
  daySlots: string[];
  reservations: Reservation[];
  status: DayStatus;
  // Le calendrier mensuel affiche déjà le nom/la date du jour sélectionné
  // via sa propre barre de navigation — pas besoin de le répéter ici.
  showHeader?: boolean;
  weekdayLabel?: string;
  onSlotPress: (iso: string, slot: string, occupants: Reservation[]) => void;
}

export default function DaySlotGrid({ C, iso, day, config, daySlots, reservations, status, showHeader = true, weekdayLabel, onSlotPress }: Props) {
  const unavailable = status === "past";
  const dotColor =
    status === "full" ? C.danger : status === "partial" ? C.orange : status === "empty" ? C.success : "transparent";

  return (
    <View style={[styles.daySection, { backgroundColor: C.card, borderColor: C.border }]}>
      {showHeader && (
        <View style={styles.dayHeader}>
          <Text style={[styles.dayHeaderText, { color: C.text }]}>
            {weekdayLabel} {day.getDate()}
          </Text>
          <View style={[styles.dayDot, { backgroundColor: dotColor }]} />
        </View>
      )}

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
                onPress={() => onSlotPress(iso, slot, occupants)}
                style={[
                  styles.slotChip,
                  { backgroundColor: C.bg, borderColor: intervention ? LOGO_PURPLE : C.border, borderWidth: intervention ? 2 : 1 },
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
}

const styles = StyleSheet.create({
  daySection: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  dayHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  dayHeaderText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, textTransform: "capitalize" },
  dayDot: { width: 8, height: 8, borderRadius: 4 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 12 },

  slotsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slotChip: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  slotChipText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
  slotChipDot: { width: 6, height: 6, borderRadius: 3 },
});
