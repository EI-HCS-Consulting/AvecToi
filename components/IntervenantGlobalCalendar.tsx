import { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { getDaysInMonth, getWeekDates, toISO } from "@/lib/slotUtils";
import { LOGO_PURPLE } from "@/lib/themes";
import type { Reservation } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Calendrier "Planning" de l'onglet intervenant (app/(visitor)/soins.tsx) —
// cumule l'affichage de TOUS les soins de l'intervenant à travers TOUS ses
// espaces patients (contrairement au calendrier familial habituel,
// home/calendar.tsx, limité à un seul espace). Reprend exactement l'affichage
// des cases jour de home/calendar.tsx : cadre + fond violet (LOGO_PURPLE) plein
// dès qu'un soin existe ce jour-là (peu importe le patient — la couleur du
// patient n'intervient plus dans le cadre, seulement dans le trait de bas de
// case, voir stripeColorForDay), texte blanc sur fond violet pour rester
// lisible en mode sombre. Aujourd'hui garde un cadre doré/marron (C.gold) tant
// qu'aucun soin ne le recouvre. Un tap sur une case déclenche onDayPress (voir
// soins.tsx) — le détail chronologique complet reste dans les blocs
// SoinsPeriodBlock/SoinsPlanifiesBlock affichés juste en dessous.
const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

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
  // Jour actuellement retenu (ISO) — pilote à la fois le fond plein (accent)
  // ci-dessous et le bloc "Planning du jour" affiché par le parent
  // (soins.tsx). Contrôlé par le parent plutôt qu'en état local : les deux
  // doivent rester synchronisés avec le même jour.
  selectedIso: string;
  // Tap sur une case jour — ouvre la réservation pour le patient sélectionné
  // dans la légende (voir soins.tsx, selectedSpaceId). Sans effet ("Tous")
  // tant qu'aucun patient précis n'est sélectionné : réserver depuis cette
  // vue cumulée nécessite de savoir POUR QUI. Dans tous les cas, met à jour
  // selectedIso côté parent.
  onDayPress: (iso: string) => void;
}

// Couleur du trait de bas de case pour un jour — celle du premier patient
// (dans l'ordre de la légende, donc de colorBySpaceId) ayant un soin ce
// jour-là. Un seul trait par case ne peut représenter qu'une couleur ;
// l'ordre est déterministe (ordre d'insertion de colorBySpaceId = ordre des
// profils chargés). Sert aussi à détecter si un soin existe ce jour-là (cadre
// + fond violet), indépendamment de la couleur retenue pour le trait.
function stripeColorForDay(reservations: Reservation[], iso: string, colorBySpaceId: Record<string, string>): string | null {
  const spacesToday = new Set<string>();
  for (const r of reservations) {
    if (r.date === iso && r.type === "Intervention") spacesToday.add(r.space_id);
  }
  for (const spaceId of Object.keys(colorBySpaceId)) {
    if (spacesToday.has(spaceId)) return colorBySpaceId[spaceId];
  }
  return null;
}

export default function IntervenantGlobalCalendar({
  C, reservations, colorBySpaceId, view, weekAnchor, monthAnchor, onMonthChange, onWeekPrev, onWeekNext, selectedIso, onDayPress,
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
            const isSelected = iso === selectedIso;
            const patientColor = stripeColorForDay(reservations, iso, colorBySpaceId);
            return (
              <TouchableOpacity
                key={iso}
                activeOpacity={0.7}
                onPress={() => onDayPress(iso)}
                style={[
                  styles.weekCell,
                  {
                    backgroundColor: isSelected ? C.accent : patientColor ? LOGO_PURPLE : C.card,
                    borderColor: isSelected ? C.accent : patientColor ? LOGO_PURPLE : isToday ? C.gold : C.border,
                    borderWidth: isToday || patientColor ? 2 : 1,
                  },
                ]}
              >
                <View style={styles.weekCellInner}>
                  <Text style={[styles.weekDayLabel, { color: isSelected || patientColor ? "#fff" : C.muted }]}>
                    {DAY_LABELS[(day.getDay() + 6) % 7]}
                  </Text>
                  <Text style={[styles.cellDate, { color: isSelected || patientColor ? "#fff" : isToday ? C.gold : C.text }]}>
                    {day.getDate()}
                  </Text>
                </View>
                {!!patientColor && (
                  <View pointerEvents="none" style={[styles.visitStripe, { backgroundColor: patientColor }]} />
                )}
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
        {Array(firstDow).fill(null).map((_, i) => (
          <View key={`e${i}`} style={[styles.cell, styles.fillerCell]} />
        ))}
        {monthDays.map((day) => {
          const iso = toISO(day);
          const isToday = iso === toISO(today);
          const isSelected = iso === selectedIso;
          const patientColor = stripeColorForDay(reservations, iso, colorBySpaceId);
          return (
            <TouchableOpacity
              key={iso}
              activeOpacity={0.7}
              onPress={() => onDayPress(iso)}
              style={[
                styles.cell,
                {
                  backgroundColor: isSelected ? C.accent : patientColor ? LOGO_PURPLE : C.card,
                  borderColor: isSelected ? C.accent : patientColor ? LOGO_PURPLE : isToday ? C.gold : C.border,
                  borderWidth: isToday || patientColor ? 2 : 1,
                },
              ]}
            >
              <View style={styles.cellInner}>
                <Text style={[styles.cellDate, { color: isSelected || patientColor ? "#fff" : isToday ? C.gold : C.text }]}>
                  {day.getDate()}
                </Text>
              </View>
              {!!patientColor && (
                <View pointerEvents="none" style={[styles.visitStripe, { backgroundColor: patientColor }]} />
              )}
            </TouchableOpacity>
          );
        })}
        {Array(trailingFillers).fill(null).map((_, i) => (
          <View key={`t${i}`} style={[styles.cell, styles.fillerCell]} />
        ))}
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
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 3, marginBottom: 10 },
  cell: {
    width: "13.5%",
    aspectRatio: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cellInner: { flex: 1, width: "100%", alignItems: "center", justifyContent: "center" },
  // Cases de remplissage (avant le 1er / après le dernier jour du mois) —
  // bord transparent pour éviter le défaut React Native (noir) d'un
  // borderWidth sans borderColor explicite.
  fillerCell: { borderColor: "transparent", borderWidth: 1 },
  cellDate: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, includeFontPadding: false },
  // Trait de bas de case indiquant le patient concerné (seul signal coloré
  // par patient — le cadre/fond reste toujours violet uniforme, voir
  // home/calendar.tsx, styles.visitStripe).
  visitStripe: { position: "absolute", left: 0, right: 0, bottom: 0, height: 4 },

  weekRow: { flexDirection: "row", justifyContent: "center", gap: 4, marginBottom: 10 },
  weekCell: {
    flex: 1,
    aspectRatio: 0.72,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    overflow: "hidden",
  },
  weekCellInner: { alignItems: "center", justifyContent: "center", gap: 3 },
  weekDayLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 10 },
});
