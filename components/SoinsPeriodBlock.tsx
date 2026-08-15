import { useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, PanResponder } from "react-native";
import type { Theme } from "@/lib/themes";
import type { Reservation } from "@/lib/types";
import { toISO, addDays, getWeekDates, getDaysInMonth } from "@/lib/slotUtils";

// Bloc "Soins" du planning des intervenants — remplace l'ancien calendrier
// (MiniCalendar+DaySlotGrid en mensuel, WeeklyPlanningGrid en hebdo) par un
// regroupement des soins (réservations type='Intervention', planifiés ET
// passés) sur la semaine ou le mois affiché. Navigable par flèches ‹ › ou en
// balayant le bloc horizontalement — ligne de temps : balayer vers la
// gauche avance vers le futur (à droite de l'écran), vers la droite recule
// vers le passé, comme un pager. Un tap sur un soin ouvre le détail de sa
// journée (voir DaySoinsModal, orchestré depuis (admin)/intervenants.tsx).

const MONTH_LABELS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

interface Props {
  C: Theme;
  reservations: Reservation[];
  view: "mensuel" | "hebdo";
  weekAnchor: Date;
  onWeekChange: (d: Date) => void;
  monthAnchor: { year: number; month: number };
  onMonthChange: (m: { year: number; month: number }) => void;
  onDayPress: (iso: string) => void;
  // Nom du patient / lieu du soin par space_id (voir lib/address.ts,
  // careLocationDetail) — fournis uniquement en vue cross-space
  // (mes-espaces-patients.tsx), où chaque ligne peut appartenir à un
  // patient/espace différent. Quand présent, la ligne affiche patient +
  // type (durée) + lieu + intervenant au lieu du type + intervenant
  // habituel (vue admin single-space, sans ces props).
  patientNameBySpaceId?: Record<string, string>;
  locationBySpaceId?: Record<string, string>;
  // Tap sur un soin précis plutôt que sur le jour entier — utilisé par
  // mes-espaces-patients.tsx pour ouvrir l'édition de ce soin (jour,
  // horaire, type). Remplace onDayPress quand fourni ; l'admin (un seul
  // espace, popup jour) continue d'utiliser onDayPress seul.
  onSoinPress?: (r: Reservation) => void;
}

export default function SoinsPeriodBlock({
  C, reservations, view, weekAnchor, onWeekChange, monthAnchor, onMonthChange, onDayPress,
  patientNameBySpaceId, locationBySpaceId, onSoinPress,
}: Props) {
  const dates = view === "hebdo" ? getWeekDates(weekAnchor) : getDaysInMonth(monthAnchor.year, monthAnchor.month);
  const isoSet = new Set(dates.map(toISO));

  const byDay: Record<string, Reservation[]> = {};
  for (const r of reservations) {
    if (r.type !== "Intervention" || !isoSet.has(r.date)) continue;
    (byDay[r.date] ??= []).push(r);
  }
  for (const list of Object.values(byDay)) list.sort((a, b) => a.creneau.localeCompare(b.creneau));
  const dayIsos = Object.keys(byDay).sort();

  function goPrev() {
    if (view === "hebdo") {
      onWeekChange(addDays(weekAnchor, -7));
    } else {
      const m = monthAnchor.month === 0 ? 11 : monthAnchor.month - 1;
      const y = monthAnchor.month === 0 ? monthAnchor.year - 1 : monthAnchor.year;
      onMonthChange({ year: y, month: m });
    }
  }
  function goNext() {
    if (view === "hebdo") {
      onWeekChange(addDays(weekAnchor, 7));
    } else {
      const m = monthAnchor.month === 11 ? 0 : monthAnchor.month + 1;
      const y = monthAnchor.month === 11 ? monthAnchor.year + 1 : monthAnchor.year;
      onMonthChange({ year: y, month: m });
    }
  }

  // Seuil de 40px avant de considérer le geste comme un balayage horizontal
  // plutôt qu'un scroll vertical de la page — évite de changer de période
  // par erreur en scrollant simplement la ScrollView parente.
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 16 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        if (g.dx <= -40) goNext();
        else if (g.dx >= 40) goPrev();
      },
    }),
  ).current;

  const first = dates[0];
  const last = dates[dates.length - 1];
  const periodLabel =
    view === "hebdo"
      ? first.getMonth() === last.getMonth()
        ? `Semaine du ${first.getDate()} au ${last.getDate()} ${MONTH_LABELS[last.getMonth()]}`
        : `Semaine du ${first.getDate()} ${MONTH_LABELS[first.getMonth()]} au ${last.getDate()} ${MONTH_LABELS[last.getMonth()]}`
      : `${MONTH_LABELS[monthAnchor.month].charAt(0).toUpperCase()}${MONTH_LABELS[monthAnchor.month].slice(1)} ${monthAnchor.year}`;

  const todayIso = toISO(new Date());

  return (
    <View>
      <View style={[styles.nav, { backgroundColor: C.card, borderColor: C.border }]}>
        <TouchableOpacity onPress={goPrev} style={[styles.navBtn, { borderColor: C.border }]}>
          <Text style={[styles.navBtnText, { color: C.text }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.navLabel, { color: C.text }]}>{periodLabel}</Text>
        <TouchableOpacity onPress={goNext} style={[styles.navBtn, { borderColor: C.border }]}>
          <Text style={[styles.navBtnText, { color: C.text }]}>›</Text>
        </TouchableOpacity>
      </View>

      <View {...panResponder.panHandlers}>
        {dayIsos.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.emptyText, { color: C.muted }]}>
              {view === "hebdo" ? "Aucun soin prévu cette semaine." : "Aucun soin prévu ce mois-ci."}
            </Text>
          </View>
        ) : (
          dayIsos.map((iso) => {
            const dayDate = new Date(iso + "T00:00:00");
            const isToday = iso === todayIso;
            return (
              <View key={iso} style={[styles.dayGroup, { backgroundColor: C.card, borderColor: C.border }]}>
                <Text style={[styles.dayGroupTitle, { color: isToday ? C.gold : C.text }]}>
                  {dayDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                  {isToday ? " · Aujourd'hui" : ""}
                </Text>
                {byDay[iso].map((r) => {
                  const patientName = patientNameBySpaceId?.[r.space_id];
                  const location = locationBySpaceId?.[r.space_id];
                  return (
                    <TouchableOpacity
                      key={r.id}
                      style={styles.soinRow}
                      activeOpacity={0.7}
                      onPress={() => (onSoinPress ? onSoinPress(r) : onDayPress(iso))}
                    >
                      <Text style={[styles.soinTime, { color: C.orange }]}>{r.creneau}</Text>
                      <View style={{ flex: 1 }}>
                        {patientName ? (
                          <>
                            <Text style={[styles.soinLabel, { color: C.text }]} numberOfLines={1}>{patientName}</Text>
                            <Text style={[styles.soinBy, { color: C.muted }]} numberOfLines={1}>
                              {r.intervention_label ?? "Intervention"}{r.duration_minutes ? ` (${r.duration_minutes} min)` : ""}
                            </Text>
                            {!!location && (
                              <Text style={[styles.soinBy, { color: C.muted }]} numberOfLines={1}>📍 {location}</Text>
                            )}
                            <Text style={[styles.soinBy, { color: C.muted }]} numberOfLines={1}>{r.prenom} {r.nom}</Text>
                          </>
                        ) : (
                          <>
                            <Text style={[styles.soinLabel, { color: C.text }]} numberOfLines={1}>{r.intervention_label ?? "Intervention"}</Text>
                            <Text style={[styles.soinBy, { color: C.muted }]} numberOfLines={1}>{r.prenom} {r.nom}</Text>
                          </>
                        )}
                      </View>
                      <Text style={[styles.chevron, { color: C.muted }]}>›</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  navBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 },
  navBtnText: { fontSize: 18, fontWeight: "600" },
  navLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, textTransform: "capitalize", flex: 1, textAlign: "center" },

  emptyCard: { borderWidth: 1, borderRadius: 12, padding: 16, alignItems: "center" },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },

  dayGroup: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  dayGroupTitle: { fontFamily: "DM_Sans_700Bold", fontSize: 13, textTransform: "capitalize", marginBottom: 8 },
  soinRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  soinTime: { fontFamily: "DM_Sans_700Bold", fontSize: 13, minWidth: 42 },
  soinLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  soinBy: { fontFamily: "DM_Sans_400Regular", fontSize: 11.5, marginTop: 1 },
  chevron: { fontFamily: "DM_Sans_700Bold", fontSize: 16 },
});
