import { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, LayoutChangeEvent } from "react-native";
import { getDaysInMonth, getDayStatus, toISO } from "@/lib/slotUtils";
import type { SlotConfig, Reservation } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Petit calendrier "choisir un nouveau jour", utilisé par les modales
// d'édition de réservation côté visiteur (components/BookingFlow.tsx) et
// côté admin (components/AdminEditReservation.tsx) — même sélecteur des
// deux côtés, seule la logique d'enregistrement change ensuite.

interface Props {
  selDate: string;
  onSelect: (iso: string) => void;
  calMonth: { year: number; month: number };
  onMonthChange: (m: { year: number; month: number }) => void;
  startDate: Date;
  C: Theme;
  // "lg" = calendrier agrandi (modale d'édition admin) — "sm" (défaut) garde
  // la taille d'origine côté visiteur (components/BookingFlow.tsx).
  size?: "sm" | "lg";
  // Fournis uniquement côté admin (useSpace() les a déjà) — colore le fond
  // de chaque jour selon son occupation (vert = dispo, orange = partiel,
  // rouge = complet), même logique que app/(admin)/home/calendar.tsx. Omis
  // côté visiteur.
  slotConfig?: SlotConfig;
  slots?: string[];
  reservations?: Reservation[];
  // Jours à signaler d'un point de couleur, indépendamment de showDots/
  // getDayStatus (qui ne couvre que l'occupation des visites) — utilisé côté
  // admin pour repérer les jours avec un soin planifié.
  markedDates?: Set<string>;
}

// Toujours 6 lignes (42 cases) quel que soit le mois affiché, pour que ce
// qui suit le calendrier (ex. la grille de créneaux) reste au même niveau
// vertical en changeant de mois — un mois à 4 ou 5 lignes serait sinon plus
// court qu'un mois à 6.
const FIXED_ROWS = 6;
const FIXED_CELLS = FIXED_ROWS * 7;
// gap fixe entre les cases (version "lg") — utilisé aussi pour calculer la
// taille de case ci-dessous, doit rester identique à miniGridLg.gap.
const GRID_GAP_LG = 3;

// Lundi en premier, cohérent avec firstDow ci-dessous (getDay() converti en
// index 0=lundi). Sans cet en-tête, la position d'un jour dans la grille est
// facile à mal lire (colonnes non identifiées).
const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

export default function MiniCalendar({
  selDate, onSelect, calMonth, onMonthChange, startDate, C, size = "sm", slotConfig, slots, reservations, markedDates,
}: Props) {
  const large = size === "lg";
  const showDots = !!(slotConfig && slots && reservations);
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const monthDays = getDaysInMonth(calMonth.year, calMonth.month);
  const firstDow = (new Date(calMonth.year, calMonth.month, 1).getDay() + 6) % 7;
  const trailingCount = large ? Math.max(0, FIXED_CELLS - firstDow - monthDays.length) : 0;
  const monthName = new Date(calMonth.year, calMonth.month, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  // aspectRatio ne donnait pas des cases réellement carrées dans certains
  // rendus — on mesure la largeur réelle de la grille et on fixe une taille
  // de case en pixels (largeur = hauteur), garanti carré quel que soit le
  // moteur de layout.
  const [gridWidth, setGridWidth] = useState(0);
  const cellSize = large && gridWidth > 0 ? (gridWidth - GRID_GAP_LG * 6) / 7 : null;
  const onGridLayout = (e: LayoutChangeEvent) => setGridWidth(e.nativeEvent.layout.width);

  return (
    <View style={{ marginBottom: large ? 0 : 16 }}>
      <View style={styles.miniMonthNav}>
        <TouchableOpacity
          onPress={() => { const d = new Date(calMonth.year, calMonth.month - 1, 1); onMonthChange({ year: d.getFullYear(), month: d.getMonth() }); }}
          style={[styles.miniNavBtn, large && styles.miniNavBtnLg, { borderColor: C.border }]}
        >
          <Text style={[styles.navBtnText, large && styles.navBtnTextLg, { color: C.text }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.miniMonthName, large && styles.miniMonthNameLg, { color: C.text }]}>{monthName}</Text>
        <TouchableOpacity
          onPress={() => { const d = new Date(calMonth.year, calMonth.month + 1, 1); onMonthChange({ year: d.getFullYear(), month: d.getMonth() }); }}
          style={[styles.miniNavBtn, large && styles.miniNavBtnLg, { borderColor: C.border }]}
        >
          <Text style={[styles.navBtnText, large && styles.navBtnTextLg, { color: C.text }]}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.weekdayRow, large && styles.weekdayRowLg]}>
        {WEEKDAY_LABELS.map((label, i) => (
          <Text key={i} style={[styles.weekdayLabel, large && styles.weekdayLabelLg, { color: C.muted }]}>{label}</Text>
        ))}
      </View>

      <View style={[styles.miniGrid, large && styles.miniGridLg]} onLayout={large ? onGridLayout : undefined}>
        {Array(firstDow).fill(null).map((_, i) => (
          <View key={`e${i}`} style={[styles.miniCell, large && styles.miniCellLg, cellSize ? { width: cellSize, height: cellSize } : null]} />
        ))}
        {monthDays.map((day) => {
          const iso = toISO(day);
          const d = new Date(day); d.setHours(0, 0, 0, 0);
          const start = new Date(startDate); start.setHours(0, 0, 0, 0);
          const isPast = d < start || d < today;
          const isSelected = iso === selDate;
          const status = showDots ? getDayStatus(reservations!, iso, day, slotConfig!, slots!, startDate) : null;
          // Un jour "empty" garde l'apparence neutre de la cellule — seul un
          // jour partiellement (orange) ou complètement (rouge) réservé se
          // distingue, pour limiter le nombre de couleurs affichées.
          const statusBg = status === "full" ? C.danger : status === "partial" ? C.orange : C.bg;
          const useStatusBg = showDots && !isSelected && !isPast && (status === "full" || status === "partial");

          return (
            <TouchableOpacity
              key={iso}
              style={[
                styles.miniCell,
                large && styles.miniCellLg,
                cellSize ? { width: cellSize, height: cellSize } : null,
                { opacity: isPast ? 0.3 : 1 },
              ]}
              onPress={() => !isPast && onSelect(iso)}
              disabled={isPast}
              activeOpacity={0.7}
            >
              {/* Bordure sur un calque séparé (pas sur la case dimensionnée) : un
                  borderWidth direct agrandit la case de 2px en RN, ce qui décalait
                  la grille d'une colonne à chaque ligne (7e case renvoyée à la ligne). */}
              <View
                style={[
                  StyleSheet.absoluteFillObject,
                  large ? styles.miniCellBgLg : styles.miniCellBg,
                  {
                    backgroundColor: isSelected ? C.accent : isPast ? "transparent" : useStatusBg ? statusBg : C.bg,
                    borderColor: isSelected ? C.accent : C.border,
                  },
                ]}
              />
              <View style={styles.miniCellInner}>
                <Text style={[styles.miniCellText, large && styles.miniCellTextLg, { color: isSelected || useStatusBg ? "#fff" : C.text }]}>{day.getDate()}</Text>
                {markedDates?.has(iso) && !isPast && (
                  <View style={[styles.miniDot, large && styles.miniDotLg, { backgroundColor: isSelected || useStatusBg ? "#fff" : C.orange }]} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
        {Array(trailingCount).fill(null).map((_, i) => (
          <View key={`t${i}`} style={[styles.miniCell, large && styles.miniCellLg, cellSize ? { width: cellSize, height: cellSize } : null]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navBtnText: { fontSize: 18, fontWeight: "600" },
  navBtnTextLg: { fontSize: 24 },
  miniMonthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  miniNavBtn: { borderWidth: 1, borderRadius: 6, paddingVertical: 4, paddingHorizontal: 10 },
  miniNavBtnLg: { paddingVertical: 8, paddingHorizontal: 16 },
  miniMonthName: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, textTransform: "capitalize" },
  miniMonthNameLg: { fontSize: 17 },
  miniGrid: { flexDirection: "row", flexWrap: "wrap", gap: 2 },
  // justifyContent "center" est sans risque ici : chaque ligne comporte
  // toujours exactement 7 cases (réelles ou de remplissage), donc les
  // colonnes restent alignées d'une ligne à l'autre.
  // gap volontairement petit : largeur*7 + gap*6 doit rester sous 100% du
  // conteneur (sinon la 7e case passe à la ligne suivante et casse la
  // grille 7 colonnes / 6 lignes — c'était la cause du bug précédent).
  miniGridLg: { gap: GRID_GAP_LG, justifyContent: "center" },
  weekdayRow: { flexDirection: "row", gap: 2, marginBottom: 4 },
  weekdayRowLg: { gap: GRID_GAP_LG, justifyContent: "center" },
  weekdayLabel: { width: "13.28%", textAlign: "center", fontFamily: "DM_Sans_600SemiBold", fontSize: 10 },
  weekdayLabelLg: { width: "13%", fontSize: 12 },
  // alignItems/justifyContent "center" centrent le contenu de la cellule ;
  // le centrage du chiffre lui-même est repris par miniCellInner ci-dessous
  // (View de centrage dédiée, indépendante du rendu interne du Touchable).
  miniCell: { width: "13.28%", aspectRatio: 1, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  miniCellLg: { width: "13%", aspectRatio: 1, borderRadius: 10 },
  miniCellInner: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  miniCellBg: { borderRadius: 6, borderWidth: 1 },
  miniCellBgLg: { borderRadius: 10, borderWidth: 1 },
  // includeFontPadding false : Android ajoute par défaut un espace vertical
  // asymétrique autour du glyphe (ascent/descent) qui décale le chiffre.
  miniCellText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, includeFontPadding: false },
  miniCellTextLg: { fontSize: 17 },
  miniDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  miniDotLg: { width: 5, height: 5, borderRadius: 2.5, marginTop: 3 },
});
