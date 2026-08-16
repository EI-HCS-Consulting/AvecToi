import { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { getDaysInMonth, getWeekDates, toISO } from "@/lib/slotUtils";
import type { Reservation } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Calendrier "Planning" de l'onglet intervenant (app/(visitor)/soins.tsx) —
// cumule l'affichage de TOUS les soins de l'intervenant à travers TOUS ses
// espaces patients (contrairement au calendrier familial habituel,
// home/calendar.tsx, limité à un seul espace). Un jour ne porte plus une
// seule pastille de statut mais une petite pastille par patient distinct
// ayant un soin ce jour-là (voir colorBySpaceId, calculé par le parent à
// partir de lib/themes.ts getPatientColor). Un tap sur une case déclenche
// onDayPress (voir soins.tsx) — le détail chronologique complet reste dans
// les blocs SoinsPeriodBlock/SoinsPlanifiesBlock affichés juste en dessous.
const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];
const MAX_DOTS = 4;

interface Props {
  C: Theme;
  reservations: Reservation[];
  colorBySpaceId: Record<string, string>;
  view: "mensuel" | "hebdo";
  weekAnchor: Date;
  monthAnchor: { year: number; month: number };
  onMonthChange: (m: { year: number; month: number }) => void;
  onWeekPrev: () => void;
  onWeekNext: () => void;
  // Tap sur une case jour — ouvre la réservation pour le patient sélectionné
  // dans la légende (voir soins.tsx, selectedSpaceId). Sans effet ("Tous")
  // tant qu'aucun patient précis n'est sélectionné : réserver depuis cette
  // vue cumulée nécessite de savoir POUR QUI.
  onDayPress: (iso: string) => void;
}

function dotsForDay(reservations: Reservation[], iso: string, colorBySpaceId: Record<string, string>): string[] {
  const seen = new Set<string>();
  const colors: string[] = [];
  for (const r of reservations) {
    if (r.date !== iso || r.type !== "Intervention") continue;
    if (seen.has(r.space_id)) continue;
    seen.add(r.space_id);
    const color = colorBySpaceId[r.space_id];
    if (color) colors.push(color);
  }
  return colors;
}

function DayDots({ colors, mutedColor }: { colors: string[]; mutedColor: string }) {
  if (colors.length === 0) return null;
  const shown = colors.slice(0, MAX_DOTS);
  const overflow = colors.length - shown.length;
  return (
    <View style={styles.dotsRow}>
      {shown.map((c, i) => (
        <View key={i} style={[styles.dot, { backgroundColor: c }]} />
      ))}
      {overflow > 0 && (
        <Text style={[styles.overflowText, { color: mutedColor }]}>+{overflow}</Text>
      )}
    </View>
  );
}

export default function IntervenantGlobalCalendar({
  C, reservations, colorBySpaceId, view, weekAnchor, monthAnchor, onMonthChange, onWeekPrev, onWeekNext, onDayPress,
}: Props) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  if (view === "hebdo") {
    const dates = getWeekDates(weekAnchor);
    const first = dates[0];
    const last = dates[dates.length - 1];
    const weekLabel = `${first.getDate()} - ${last.getDate()} ${last.toLocaleDateString("fr-FR", { month: "long" })}`;
    return (
      <View>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={onWeekPrev} style={[styles.navBtn, { borderColor: C.border }]}>
            <Text style={[styles.navBtnText, { color: C.text }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.monthName, { color: C.text }]}>{weekLabel}</Text>
          <TouchableOpacity onPress={onWeekNext} style={[styles.navBtn, { borderColor: C.border }]}>
            <Text style={[styles.navBtnText, { color: C.text }]}>›</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.weekRow}>
          {dates.map((day) => {
            const iso = toISO(day);
            const isToday = iso === toISO(today);
            const colors = dotsForDay(reservations, iso, colorBySpaceId);
            return (
              <TouchableOpacity
                key={iso}
                activeOpacity={0.7}
                onPress={() => onDayPress(iso)}
                style={[
                  styles.weekCell,
                  { borderColor: isToday ? C.gold : C.border, backgroundColor: C.card },
                  isToday && { borderWidth: 2 },
                ]}
              >
                <Text style={[styles.weekDayLabel, { color: C.muted }]}>{DAY_LABELS[(day.getDay() + 6) % 7]}</Text>
                <Text style={[styles.cellDate, { color: isToday ? C.gold : C.text }]}>{day.getDate()}</Text>
                <DayDots colors={colors} mutedColor={C.muted} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  const monthDays = getDaysInMonth(monthAnchor.year, monthAnchor.month);
  const firstDow = (new Date(monthAnchor.year, monthAnchor.month, 1).getDay() + 6) % 7;
  const trailingFillers = (7 - ((firstDow + monthDays.length) % 7)) % 7;
  const monthName = new Date(monthAnchor.year, monthAnchor.month, 1)
    .toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <View>
      <View style={styles.monthNav}>
        <TouchableOpacity
          onPress={() => { const d = new Date(monthAnchor.year, monthAnchor.month - 1, 1); onMonthChange({ year: d.getFullYear(), month: d.getMonth() }); }}
          style={[styles.navBtn, { borderColor: C.border }]}
        >
          <Text style={[styles.navBtnText, { color: C.text }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.monthName, { color: C.text }]}>{monthName}</Text>
        <TouchableOpacity
          onPress={() => { const d = new Date(monthAnchor.year, monthAnchor.month + 1, 1); onMonthChange({ year: d.getFullYear(), month: d.getMonth() }); }}
          style={[styles.navBtn, { borderColor: C.border }]}
        >
          <Text style={[styles.navBtnText, { color: C.text }]}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dayLabels}>
        {DAY_LABELS.map((d, i) => (
          <Text key={i} style={[styles.dayLabel, { color: C.muted }]}>{d}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {Array(firstDow).fill(null).map((_, i) => <View key={`e${i}`} style={styles.cell} />)}
        {monthDays.map((day) => {
          const iso = toISO(day);
          const isToday = iso === toISO(today);
          const colors = dotsForDay(reservations, iso, colorBySpaceId);
          return (
            <TouchableOpacity
              key={iso}
              activeOpacity={0.7}
              onPress={() => onDayPress(iso)}
              style={[
                styles.cell,
                { borderColor: isToday ? C.gold : C.border, backgroundColor: C.card, borderWidth: isToday ? 2 : 1 },
              ]}
            >
              <Text style={[styles.cellDate, { color: isToday ? C.gold : C.text }]}>{day.getDate()}</Text>
              <DayDots colors={colors} mutedColor={C.muted} />
            </TouchableOpacity>
          );
        })}
        {Array(trailingFillers).fill(null).map((_, i) => <View key={`t${i}`} style={styles.cell} />)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  monthName: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 17, textTransform: "capitalize" },
  navBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 },
  navBtnText: { fontSize: 18, fontWeight: "600" },

  dayLabels: { flexDirection: "row", justifyContent: "center", gap: 3, marginBottom: 4 },
  dayLabel: { width: "13.5%", textAlign: "center", fontFamily: "DM_Sans_600SemiBold", fontSize: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 3 },
  cell: {
    width: "13.5%",
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  cellDate: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, includeFontPadding: false },

  weekRow: { flexDirection: "row", justifyContent: "center", gap: 4 },
  weekCell: {
    flex: 1,
    aspectRatio: 0.72,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 6,
  },
  weekDayLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 10 },

  dotsRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 2, maxWidth: 28 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  overflowText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 8 },
});
