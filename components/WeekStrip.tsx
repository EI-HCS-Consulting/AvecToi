import { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { Theme } from "@/lib/themes";
import { LOGO_GREEN, LOGO_PURPLE } from "@/lib/themes";
import type { Reservation, SlotConfig } from "@/lib/types";
import { addDays, getWeekDates, toISO, getDayStatus, isMyReservation } from "@/lib/slotUtils";

// Bande de 7 jours pour la vue Hebdo du calendrier principal (visiteur/admin/
// intervenant) — même code visuel que la grille mensuelle (pastille de statut
// + cadre violet + bande verte) et que WeeklyPlanningGrid (planning des
// intervenants), mais commune aux 3 rôles et enrichie des marqueurs
// hospitalisation/sortie (F/G) et du grisage des jours antérieurs à la date
// d'hospitalisation (E). Un tap sur une case navigue vers l'écran dédié des
// créneaux (onDayPress), exactement comme la grille Mensuel — aucun détail de
// jour affiché inline ici.
const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

interface Props {
  C: Theme;
  slotConfig: SlotConfig;
  // Déjà filtrée par le parent selon "Afficher mes créneaux" (rôle
  // intervenant, home/calendar.tsx) : ne contient les réservations
  // "Intervention" d'un AUTRE intervenant que si ce mode est désactivé — la
  // bande n'a donc pas à connaître ce réglage elle-même.
  reservations: Reservation[];
  getSlotsForDate: (iso: string) => string[];
  getConfigForDate: (iso: string) => SlotConfig | null;
  startDate: Date;
  weekAnchor: Date;
  onWeekChange: (anchor: Date) => void;
  selectedIso: string;
  // Housekeeping interne uniquement (recalage du jour sélectionné après un
  // changement de semaine ‹ › via le useEffect ci-dessous) — jamais déclenché
  // par un tap utilisateur, voir onDayPress pour ça.
  onSelectDay: (iso: string) => void;
  // Tap explicite sur une case du jour — navigue vers l'écran dédié des
  // créneaux (home/slots.tsx), exactement comme la grille Mensuel.
  onDayPress: (iso: string) => void;
  soinsMode: boolean;
  // "Afficher mes créneaux" (home/calendar.tsx) — pour un intervenant,
  // filtre aussi les cadres violets de la bande elle-même (pas seulement le
  // panneau perso sous le calendrier) : voir frameVisible plus bas.
  mesCreneauxOnly: boolean;
  role: "visiteur" | "intervenant" | null;
  intervenantProfileId: string | null;
  // PIN de la session courante — restreint la bande verte (familyBooked) aux
  // seules réservations de la personne qui regarde, jamais celles d'un autre
  // membre de la famille ou prises par l'admin en son nom. Prénom/nom
  // désambiguïsent deux visiteurs ayant choisi le même PIN — voir
  // isMyReservation (lib/slotUtils.ts).
  myPin: string | null;
  myPrenom?: string | null;
  myNom?: string | null;
  // Marqueurs hospitalisation (F) / sortie (G) et seuil de grisage (E) — au
  // format "YYYY-MM-DD" comme PatientSpace.patient_admission_date, ou null si
  // non renseigné côté fiche patient.
  admissionIso: string | null;
  dischargeIso: string | null;
}

export default function WeekStrip({
  C, slotConfig, reservations, getSlotsForDate, getConfigForDate, startDate,
  weekAnchor, onWeekChange, selectedIso, onSelectDay, onDayPress, soinsMode, mesCreneauxOnly, role,
  intervenantProfileId, myPin, myPrenom, myNom, admissionIso, dischargeIso,
}: Props) {
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

  // Si le jour sélectionné n'appartient plus à la semaine affichée après un
  // changement de semaine (‹ ›), on retombe sur aujourd'hui s'il y figure,
  // sinon le lundi de la nouvelle semaine — même comportement que
  // WeeklyPlanningGrid.
  useEffect(() => {
    const isos = getWeekDates(weekAnchor).map(toISO);
    if (!isos.includes(selectedIso)) {
      onSelectDay(isos.includes(todayIso) ? todayIso : isos[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekAnchorIso]);

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
          // `status` sert au blocage/navigation via onDayPress → suit le
          // type du mode actif. La pastille, elle, ne représente plus jamais
          // que les visites — voir visiteStatus.
          const status = getDayStatus(reservations, iso, day, config, daySlots, startDate, soinsMode ? "Intervention" : "Visite");
          const visiteStatus = getDayStatus(reservations, iso, day, config, daySlots, startDate, "Visite");
          const dotColor = soinsMode ? "transparent" :
            visiteStatus === "full" ? C.danger : visiteStatus === "partial" ? C.orange : visiteStatus === "empty" ? C.success : "transparent";
          // Bande verte strictement personnelle (visite/nuitée réservée par
          // MOI, ou soin réservé par MOI si je suis intervenant) — jamais les
          // réservations d'un autre visiteur/intervenant, ni de l'admin (role
          // === null, sans PIN ni fiche : ne matche jamais isMyReservation).
          // Toujours visible, quel que soit le mode ou "Afficher mes
          // créneaux".
          const familyBooked = reservations.some((r) => r.date === iso && isMyReservation(r, myPin, intervenantProfileId, myPrenom, myNom));
          const myInterventionToday = role === "intervenant" && !!intervenantProfileId &&
            reservations.some((r) => r.date === iso && r.type === "Intervention" && r.intervenant_profile_id === intervenantProfileId);
          const interventionBooked = reservations.some((r) => r.date === iso && r.type === "Intervention");
          // Cadre violet : même règle que la grille Mensuel (home/calendar.tsx)
          // — vérité complète en mode Soins, sauf pour un intervenant avec
          // "Afficher mes créneaux" actif (filtré à ses seuls cadres, y
          // compris en mode Visites où aucun cadre n'apparaît sinon).
          const frameVisible = soinsMode
            ? (role === "intervenant" && mesCreneauxOnly ? myInterventionToday : interventionBooked)
            : (role === "intervenant" && mesCreneauxOnly && myInterventionToday);
          const fillPurple = frameVisible && myInterventionToday;
          const isSelected = iso === selectedIso;
          const isToday = iso === todayIso;
          // Grisage (E) : uniquement les jours strictement avant la date
          // d'hospitalisation — un jour passé mais postérieur à celle-ci
          // reste affiché normalement (juste non réservable, géré par le
          // parent via la prop `bookable` des listes de créneaux).
          const beforeAdmission = !!admissionIso && iso < admissionIso;

          return (
            <TouchableOpacity
              key={iso}
              onPress={() => onDayPress(iso)}
              activeOpacity={0.7}
              style={[
                styles.stripCell,
                {
                  backgroundColor: isSelected ? C.accent : fillPurple ? LOGO_PURPLE : C.card,
                  borderColor: isSelected ? C.accent : frameVisible ? LOGO_PURPLE : isToday ? C.gold : C.border,
                  borderWidth: isToday || frameVisible ? 2 : 1,
                  opacity: beforeAdmission ? 0.4 : 1,
                },
              ]}
            >
              {iso === admissionIso && (
                <View style={[styles.badge, styles.badgeLeft, { backgroundColor: C.danger }]}>
                  <Text style={styles.badgeCrossText}>✕</Text>
                </View>
              )}
              {iso === dischargeIso && (
                <View style={[styles.badge, styles.badgeRight]}>
                  <Text style={styles.badgeHouseText}>🏠</Text>
                </View>
              )}
              <Text style={[styles.stripDow, { color: isSelected || fillPurple ? "#fff" : C.muted }]}>
                {WEEKDAY_LABELS[day.getDay() === 0 ? 6 : day.getDay() - 1]}
              </Text>
              <Text style={[styles.stripDate, { color: isSelected || fillPurple ? "#fff" : isToday ? C.gold : C.text }]}>
                {day.getDate()}
              </Text>
              <View style={[styles.stripDot, { backgroundColor: dotColor }]} />
              {!!familyBooked && (
                <View pointerEvents="none" style={[styles.visitStripe, { backgroundColor: LOGO_GREEN }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.stripLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendStripeSwatch, { borderColor: C.border, backgroundColor: LOGO_GREEN }]} />
          <Text style={[styles.stripLegendLabel, { color: C.muted }]}>Mes créneaux</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.stripLegendFrame, { borderColor: LOGO_PURPLE }]} />
          <Text style={[styles.stripLegendLabel, { color: C.muted }]}>{soinsMode ? "Soin" : "Intervenant"}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weekNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  navBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 },
  navBtnText: { fontSize: 18, fontWeight: "600" },
  weekLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, textTransform: "capitalize", flex: 1, textAlign: "center" },

  strip: { flexDirection: "row", justifyContent: "space-between", gap: 4, marginBottom: 8 },
  stripCell: { flex: 1, borderRadius: 10, borderWidth: 1, paddingTop: 8, paddingBottom: 14, alignItems: "center", gap: 3, position: "relative" },
  stripDow: { fontFamily: "DM_Sans_600SemiBold", fontSize: 10, textTransform: "uppercase" },
  stripDate: { fontFamily: "DM_Sans_700Bold", fontSize: 15 },
  stripDot: { width: 5, height: 5, borderRadius: 2.5 },
  visitStripe: { position: "absolute", left: 0, right: 0, bottom: 0, height: 8, borderBottomLeftRadius: 9, borderBottomRightRadius: 9 },

  badge: { position: "absolute", top: -5, width: 15, height: 15, borderRadius: 7.5, alignItems: "center", justifyContent: "center" },
  badgeLeft: { left: -5 },
  badgeRight: { right: -5 },
  badgeCrossText: { color: "#fff", fontSize: 9, fontWeight: "700", lineHeight: 11 },
  badgeHouseText: { fontSize: 11, lineHeight: 13 },

  // Ecart plus large qu'avant pour bien séparer "Mes créneaux" de
  // "Intervenant"/"Soin" — mêmes valeurs que la légende de la vue Mensuel.
  stripLegend: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 40, marginBottom: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendStripeSwatch: { width: 12, height: 12, borderRadius: 4, borderWidth: 1 },
  stripLegendFrame: { width: 12, height: 12, borderRadius: 4, borderWidth: 2 },
  stripLegendLabel: { fontFamily: "DM_Sans_400Regular", fontSize: 11 },
});
