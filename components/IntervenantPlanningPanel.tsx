import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { Theme } from "@/lib/themes";
import type { Reservation, SlotConfig } from "@/lib/types";
import { toISO, toFrLong, toFrShort, addDays, getMonday, getDayStatus } from "@/lib/slotUtils";
import MiniCalendar from "@/components/MiniCalendar";
import SegmentedSwitch from "@/components/SegmentedSwitch";
import WeeklyPlanningGrid from "@/components/WeeklyPlanningGrid";
import PlanningLegend from "@/components/PlanningLegend";
import DaySlotGrid from "@/components/DaySlotGrid";
import SlotOccupantsModal, { type SelectedSlot } from "@/components/SlotOccupantsModal";

// Panneau planning intégré au calendrier visiteur pour le rôle intervenant —
// remplace le bouton "Voir le planning des intervenants" (qui reste affiché
// aux visiteurs simples, voir home/calendar.tsx) par une vue Mensuel/Hebdo
// embarquée (même schéma que home/planning.tsx), avec la liste du jour
// filtrée aux seuls soins de CET intervenant, plus un historique global
// anté-chronologique (tous intervenants, planifiés et effectués).
interface Props {
  C: Theme;
  slotConfig: SlotConfig;
  reservations: Reservation[];
  getSlotsForDate: (iso: string) => string[];
  getConfigForDate: (iso: string) => SlotConfig | null;
  startDate: Date;
  intervenantProfileId: string;
}

export default function IntervenantPlanningPanel({
  C, slotConfig, reservations, getSlotsForDate, getConfigForDate, startDate, intervenantProfileId,
}: Props) {
  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [calMonth, setCalMonth] = useState(() => ({ year: selectedDay.getFullYear(), month: selectedDay.getMonth() }));
  const [planningView, setPlanningView] = useState<"mensuel" | "hebdo">("mensuel");
  const [weekAnchor, setWeekAnchor] = useState(() => getMonday(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = toISO(today);

  const iso = toISO(selectedDay);
  const dayConfig = getConfigForDate(iso) ?? slotConfig;
  const daySlots = getSlotsForDate(iso);
  const dayStatus = dayConfig ? getDayStatus(reservations, iso, selectedDay, dayConfig, daySlots, startDate, "Intervention") : "empty";
  const myDayInterventions = reservations
    .filter((r) => r.type === "Intervention" && r.date === iso && r.intervenant_profile_id === intervenantProfileId)
    .sort((a, b) => a.creneau.localeCompare(b.creneau));
  const myInterventionDates = new Set(
    reservations.filter((r) => r.type === "Intervention" && r.intervenant_profile_id === intervenantProfileId).map((r) => r.date),
  );

  const allInterventions = [...reservations]
    .filter((r) => r.type === "Intervention")
    .sort((a, b) => (b.date + b.creneau).localeCompare(a.date + a.creneau));

  return (
    <View>
      <Text style={[styles.sectionTitle, { color: C.gold }]}>Mon planning</Text>
      <View style={{ marginBottom: 14 }}>
        <SegmentedSwitch
          value={planningView === "hebdo"}
          onChange={(v) => setPlanningView(v ? "hebdo" : "mensuel")}
          leftLabel="Mensuel"
          rightLabel="Hebdo"
          C={C}
          minWidthRatio={0.5}
        />
      </View>

      {planningView === "hebdo" ? (
        <WeeklyPlanningGrid
          C={C}
          slotConfig={slotConfig}
          reservations={reservations}
          getSlotsForDate={getSlotsForDate}
          getConfigForDate={getConfigForDate}
          startDate={startDate}
          weekAnchor={weekAnchor}
          onWeekChange={setWeekAnchor}
          readOnly
        />
      ) : (
        <>
          <View style={{ marginBottom: 14 }}>
            <MiniCalendar
              selDate={iso}
              onSelect={(newIso) => setSelectedDay(new Date(newIso + "T00:00:00"))}
              calMonth={calMonth}
              onMonthChange={setCalMonth}
              startDate={startDate}
              C={C}
              size="lg"
              markedDates={myInterventionDates}
            />
          </View>

          <View style={[styles.dayNav, { backgroundColor: C.card, borderColor: C.border }]}>
            <TouchableOpacity
              onPress={() => {
                const prev = addDays(selectedDay, -1);
                if (prev >= startDate) setSelectedDay(prev);
              }}
              disabled={toISO(selectedDay) === toISO(startDate)}
              style={[styles.navBtn, { borderColor: C.border }]}
            >
              <Text style={[styles.navBtnText, { color: C.text }]}>‹</Text>
            </TouchableOpacity>
            <View style={{ alignItems: "center" }}>
              <Text style={[styles.dayTitle, { color: C.text }]}>{toFrLong(selectedDay)}</Text>
              <Text style={[styles.daySub, { color: C.muted }]}>{toFrShort(selectedDay)}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedDay(addDays(selectedDay, 1))}
              style={[styles.navBtn, { borderColor: C.border }]}
            >
              <Text style={[styles.navBtnText, { color: C.text }]}>›</Text>
            </TouchableOpacity>
          </View>

          {!!dayConfig && (
            <>
              <PlanningLegend C={C} />
              <DaySlotGrid
                C={C}
                iso={iso}
                day={selectedDay}
                config={dayConfig}
                daySlots={daySlots}
                reservations={reservations}
                status={dayStatus}
                showHeader={false}
                onSlotPress={(slotIso, slot, occupants) => setSelectedSlot({ iso: slotIso, slot, occupants })}
              />
            </>
          )}

          <Text style={[styles.subTitle, { color: C.muted }]}>Mes soins ce jour</Text>
          {myDayInterventions.length === 0 ? (
            <Text style={[styles.emptyText, { color: C.muted }]}>Aucun soin planifié pour toi ce jour-là.</Text>
          ) : (
            myDayInterventions.map((r) => (
              <View key={r.id} style={[styles.interventionCard, { backgroundColor: C.card, borderColor: C.orange }]}>
                <Text style={[styles.interventionTime, { color: C.orange }]}>
                  {r.creneau} · {r.duration_minutes} min
                </Text>
                <Text style={[styles.interventionLabel, { color: C.text }]}>{r.intervention_label}</Text>
              </View>
            ))
          )}
        </>
      )}

      <SlotOccupantsModal
        C={C}
        selected={selectedSlot}
        onClose={() => setSelectedSlot(null)}
        readOnly
      />

      <Text style={[styles.sectionTitle, { color: C.gold, marginTop: 20 }]}>Historique des soins</Text>
      {allInterventions.length === 0 ? (
        <Text style={[styles.emptyText, { color: C.muted }]}>Aucun soin planifié pour l'instant.</Text>
      ) : (
        allInterventions.map((r) => {
          const done = r.date < todayIso;
          return (
            <View key={r.id} style={[styles.historyCard, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={styles.historyHeader}>
                <Text style={[styles.historyDate, { color: C.text }]}>
                  {toFrShort(new Date(r.date + "T12:00:00"))} · {r.creneau}
                </Text>
                <Text style={[styles.historyStatus, { color: done ? C.success : C.orange }]}>
                  {done ? "Effectué" : "Planifié"}
                </Text>
              </View>
              <Text style={[styles.historyLabel, { color: C.text }]}>{r.intervention_label}</Text>
              <Text style={[styles.historyBy, { color: C.muted }]}>{r.prenom} {r.nom}</Text>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 },
  subTitle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, marginTop: 4, marginBottom: 8 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginBottom: 12 },

  dayNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 14 },
  navBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 },
  navBtnText: { fontSize: 18, fontWeight: "600" },
  dayTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 16, textTransform: "capitalize" },
  daySub: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },

  interventionCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  interventionTime: { fontFamily: "DM_Sans_700Bold", fontSize: 14, marginBottom: 2 },
  interventionLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },

  historyCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  historyDate: { fontFamily: "DM_Sans_700Bold", fontSize: 13, textTransform: "capitalize" },
  historyStatus: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, textTransform: "uppercase" },
  historyLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, marginTop: 2 },
  historyBy: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },
});
