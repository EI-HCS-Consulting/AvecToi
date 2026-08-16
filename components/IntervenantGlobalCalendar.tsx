import { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { getDaysInMonth, getWeekDates, toISO } from "@/lib/slotUtils";
import { LOGO_PURPLE, LOGO_PURPLE_SOFT } from "@/lib/themes";
import type { Reservation } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Calendrier "Planning" de l'onglet intervenant (app/(visitor)/soins.tsx) —
// cumule l'affichage de TOUS les soins de l'intervenant à travers TOUS ses
// espaces patients (contrairement au calendrier familial habituel,
// home/calendar.tsx, limité à un seul espace). Reprend exactement l'affichage
// des cases jour de home/calendar.tsx : cadre + fond violet (LOGO_PURPLE) plein
// dès qu'un soin existe ce jour-là (peu importe le patient — la couleur du
// patient n'intervient plus dans le cadre, seulement dans le(s) trait(s) de
// bord de case, voir dayPatientColors/STRIPE_LAYOUT), texte blanc sur fond
// violet pour rester lisible en mode sombre. Aujourd'hui garde un cadre
// doré/marron (C.gold) tant qu'aucun soin ne le recouvre. Un tap simple
// déclenche onDayPress (affiche les soins du jour, voir soins.tsx), un appui
// prolongé déclenche onDayLongPress (ouvre le popup "Réserver un créneau")
// — le détail chronologique complet reste dans les blocs
// SoinsPeriodBlock/SoinsPlanifiesBlock affichés juste en dessous.
const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];
const STRIPE = 4;

// Épaisseur de trait — pour les 4 premiers patients d'une même case jour,
// chacun reçoit un trait plein sur un côté entier, dans l'ordre bas / droite
// / haut / gauche. À partir du 5ème patient, les traits commencent à se
// diviser en deux moitiés : le bas se divise en premier (5ème patient),
// puis la droite (6ème), le haut (7ème) et enfin la gauche (8ème) — 8
// patients au maximum ferment ainsi le tour de case ; au-delà, on n'ajoute
// plus rien sur la case (le patient concerné reste malgré tout listé dans
// les blocs Planning du jour / Planning mensuel-hebdo / Autres soins
// planifiés).
const EDGE_FULL: Array<Record<string, number | string>> = [
  { left: 0, right: 0, bottom: 0, height: STRIPE }, // bas
  { right: 0, top: 0, bottom: 0, width: STRIPE }, // droite
  { left: 0, right: 0, top: 0, height: STRIPE }, // haut
  { left: 0, top: 0, bottom: 0, width: STRIPE }, // gauche
];
const EDGE_HALVES: Array<[Record<string, number | string>, Record<string, number | string>]> = [
  [{ left: 0, bottom: 0, width: "50%", height: STRIPE }, { right: 0, bottom: 0, width: "50%", height: STRIPE }], // bas
  [{ right: 0, bottom: 0, width: STRIPE, height: "50%" }, { right: 0, top: 0, width: STRIPE, height: "50%" }], // droite
  [{ right: 0, top: 0, width: "50%", height: STRIPE }, { left: 0, top: 0, width: "50%", height: STRIPE }], // haut
  [{ left: 0, top: 0, width: STRIPE, height: "50%" }, { left: 0, bottom: 0, width: STRIPE, height: "50%" }], // gauche
];

// Construit les traits de bord à afficher pour une case jour à partir des
// couleurs distinctes des patients ce jour-là (voir dayPatientColors) — un
// côté plein par patient pour les 4 premiers, puis des moitiés de côté à
// partir du 5ème (voir commentaire EDGE_FULL/EDGE_HALVES ci-dessus).
function buildEdgeSegments(colors: string[]): { style: Record<string, number | string>; color: string }[] {
  const count = colors.length;
  const segments: { style: Record<string, number | string>; color: string }[] = [];
  for (let e = 0; e < 4; e++) {
    if (count <= e) break;
    const splitThreshold = 5 + e;
    if (count >= splitThreshold) {
      segments.push({ style: EDGE_HALVES[e][0], color: colors[e] });
      segments.push({ style: EDGE_HALVES[e][1], color: colors[4 + e] });
    } else {
      segments.push({ style: EDGE_FULL[e], color: colors[e] });
    }
  }
  return segments;
}

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
  // Tap simple sur une case jour — affiche les soins de ce jour dans le bloc
  // "Planning du jour" du parent (soins.tsx), sans autre action.
  onDayPress: (iso: string) => void;
  // Appui prolongé sur une case jour — ouvre le popup "Réserver un créneau"
  // côté parent (soins.tsx). Sans effet ("Tous") tant qu'aucun patient précis
  // n'est sélectionné dans la légende : réserver depuis cette vue cumulée
  // nécessite de savoir POUR QUI (le parent applique ce garde-fou).
  onDayLongPress: (iso: string) => void;
}

// Couleurs (une par patient distinct) ayant un soin ce jour-là, dans l'ordre
// de la légende (donc de colorBySpaceId, lui-même stable — voir soins.tsx,
// profils triés par created_at). Longueur 0 = pas de soin ce jour-là.
function dayPatientColors(reservations: Reservation[], iso: string, colorBySpaceId: Record<string, string>): string[] {
  const spacesToday = new Set<string>();
  for (const r of reservations) {
    if (r.date === iso && r.type === "Intervention") spacesToday.add(r.space_id);
  }
  const colors: string[] = [];
  for (const spaceId of Object.keys(colorBySpaceId)) {
    if (spacesToday.has(spaceId)) colors.push(colorBySpaceId[spaceId]);
  }
  return colors;
}

function DayStripes({ colors }: { colors: string[] }) {
  if (colors.length === 0) return null;
  const segments = buildEdgeSegments(colors);
  return (
    <>
      {segments.map((seg, i) => (
        <View key={i} pointerEvents="none" style={[styles.stripeBase, seg.style, { backgroundColor: seg.color }]} />
      ))}
    </>
  );
}

export default function IntervenantGlobalCalendar({
  C, reservations, colorBySpaceId, view, weekAnchor, monthAnchor, onMonthChange, onWeekPrev, onWeekNext, selectedIso, onDayPress, onDayLongPress,
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
            const dayColors = dayPatientColors(reservations, iso, colorBySpaceId);
            const hasSoin = dayColors.length > 0;
            return (
              <TouchableOpacity
                key={iso}
                activeOpacity={0.7}
                onPress={() => onDayPress(iso)}
                onLongPress={() => onDayLongPress(iso)}
                style={[
                  styles.weekCell,
                  {
                    backgroundColor: isSelected ? C.accent : hasSoin ? LOGO_PURPLE_SOFT : C.card,
                    borderColor: isSelected ? C.accent : hasSoin ? LOGO_PURPLE : isToday ? C.gold : C.border,
                    borderWidth: isToday || hasSoin ? 2 : 1,
                  },
                ]}
              >
                <View style={styles.weekCellInner}>
                  <Text style={[styles.weekDayLabel, { color: isSelected || hasSoin ? "#fff" : C.muted }]}>
                    {DAY_LABELS[(day.getDay() + 6) % 7]}
                  </Text>
                  <Text style={[styles.cellDate, { color: isSelected || hasSoin ? "#fff" : isToday ? C.gold : C.text }]}>
                    {day.getDate()}
                  </Text>
                </View>
                <DayStripes colors={dayColors} />
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
          const dayColors = dayPatientColors(reservations, iso, colorBySpaceId);
          const hasSoin = dayColors.length > 0;
          return (
            <TouchableOpacity
              key={iso}
              activeOpacity={0.7}
              onPress={() => onDayPress(iso)}
              onLongPress={() => onDayLongPress(iso)}
              style={[
                styles.cell,
                {
                  backgroundColor: isSelected ? C.accent : hasSoin ? LOGO_PURPLE_SOFT : C.card,
                  borderColor: isSelected ? C.accent : hasSoin ? LOGO_PURPLE : isToday ? C.gold : C.border,
                  borderWidth: isToday || hasSoin ? 2 : 1,
                },
              ]}
            >
              <View style={styles.cellInner}>
                <Text style={[styles.cellDate, { color: isSelected || hasSoin ? "#fff" : isToday ? C.gold : C.text }]}>
                  {day.getDate()}
                </Text>
              </View>
              <DayStripes colors={dayColors} />
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
  // Trait(s) de bord de case indiquant le(s) patient(s) concerné(s) — seul
  // signal coloré par patient, le cadre/fond reste toujours violet uniforme
  // (voir home/calendar.tsx, styles.visitStripe, dont ceci reprend le principe).
  stripeBase: { position: "absolute" },

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
