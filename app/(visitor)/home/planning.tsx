import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useVisitorSpace } from "@/lib/VisitorContext";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { toISO, toFrLong, toFrShort, addDays, getMonday, getDayStatus } from "@/lib/slotUtils";
import MiniCalendar from "@/components/MiniCalendar";
import SegmentedSwitch from "@/components/SegmentedSwitch";
import WeeklyPlanningGrid from "@/components/WeeklyPlanningGrid";
import PlanningLegend from "@/components/PlanningLegend";
import DaySlotGrid from "@/components/DaySlotGrid";
import SlotOccupantsModal, { type SelectedSlot } from "@/components/SlotOccupantsModal";

// Planning des intervenants, en lecture seule — miroir de
// app/(admin)/intervenants.tsx (section "Planning" uniquement, sans les
// actions d'édition/suppression ni les fiches intervenants). Accessible
// depuis (visitor)/home/calendar.tsx dès que space.intervenants_enabled est
// actif, pour les deux rôles visiteur/intervenant.
export default function VisitorPlanningScreen() {
  const router = useRouter();
  const { theme: C } = useDisplayMode();
  const { space, slotConfig, reservations, getSlotsForDate, getConfigForDate } = useVisitorSpace();

  const startDate = space ? new Date(space.start_date + "T00:00:00") : new Date();
  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [calMonth, setCalMonth] = useState(() => ({ year: selectedDay.getFullYear(), month: selectedDay.getMonth() }));
  const [planningView, setPlanningView] = useState<"mensuel" | "hebdo">("mensuel");
  const [weekAnchor, setWeekAnchor] = useState(() => getMonday(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);

  if (!space) return null;

  const iso = toISO(selectedDay);
  const dayInterventions = reservations
    .filter((r) => r.type === "Intervention" && r.date === iso)
    .sort((a, b) => a.creneau.localeCompare(b.creneau));
  const interventionDates = new Set(reservations.filter((r) => r.type === "Intervention").map((r) => r.date));
  const dayConfig = getConfigForDate(iso) ?? slotConfig;
  const daySlots = getSlotsForDate(iso);
  const dayStatus = dayConfig ? getDayStatus(reservations, iso, selectedDay, dayConfig, daySlots, startDate, "Intervention") : "empty";

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={[styles.backText, { color: C.orange }]}>← Retour</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>🩺 Planning des intervenants</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
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

        {planningView === "hebdo" && slotConfig ? (
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
                markedDates={interventionDates}
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

            {dayConfig && (
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

            {dayInterventions.length === 0 ? (
              <Text style={[styles.emptyText, { color: C.muted }]}>Aucune intervention ce jour-là.</Text>
            ) : (
              dayInterventions.map((r) => (
                <View key={r.id} style={[styles.interventionCard, { backgroundColor: C.card, borderColor: C.orange }]}>
                  <Text style={[styles.interventionTime, { color: C.orange }]}>
                    {r.creneau} · {r.duration_minutes} min
                  </Text>
                  <Text style={[styles.interventionLabel, { color: C.text }]}>{r.intervention_label}</Text>
                  <Text style={[styles.interventionBy, { color: C.muted }]}>{r.prenom} {r.nom}</Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      <SlotOccupantsModal
        C={C}
        selected={selectedSlot}
        onClose={() => setSelectedSlot(null)}
        readOnly
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 42, paddingBottom: 16, borderBottomWidth: 1 },
  back: { alignSelf: "flex-start", marginBottom: 10 },
  backText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  headerTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 20 },

  scroll: { padding: 16, paddingBottom: 40 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginBottom: 12 },

  dayNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 14 },
  navBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 },
  navBtnText: { fontSize: 18, fontWeight: "600" },
  dayTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 16, textTransform: "capitalize" },
  daySub: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },

  interventionCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  interventionTime: { fontFamily: "DM_Sans_700Bold", fontSize: 14, marginBottom: 2 },
  interventionLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  interventionBy: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },
});
