import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import MiniCalendar from "@/components/MiniCalendar";
import { toISO, addDays } from "@/lib/slotUtils";
import type { Theme } from "@/lib/themes";

// Modale calendrier ouverte en tapant sur la date affichée dans le pager
// jour par jour de (admin)/intervenants.tsx. Vue mois par défaut (points de
// couleur sur les jours ayant un soin planifié, via MiniCalendar en size="lg"
// + markedDates), avec un bouton pour basculer sur la semaine en cours
// (semaine réelle du jour, non navigable — juste un raccourci d'affichage).
interface Props {
  visible: boolean;
  onClose: () => void;
  selectedDay: Date;
  onSelectDay: (d: Date) => void;
  interventionDates: Set<string>;
  startDate: Date;
  C: Theme;
}

function startOfWeek(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  const dow = (r.getDay() + 6) % 7; // 0 = lundi
  r.setDate(r.getDate() - dow);
  return r;
}

export default function PlanningCalendarModal({
  visible, onClose, selectedDay, onSelectDay, interventionDates, startDate, C,
}: Props) {
  const [mode, setMode] = useState<"month" | "week">("month");
  const [calMonth, setCalMonth] = useState(() => ({ year: selectedDay.getFullYear(), month: selectedDay.getMonth() }));

  // Réinitialise sur le mois du jour sélectionné et repart en vue mois à
  // chaque ouverture, plutôt que de garder l'état de la dernière ouverture.
  useEffect(() => {
    if (visible) {
      setMode("month");
      setCalMonth({ year: selectedDay.getFullYear(), month: selectedDay.getMonth() });
    }
  }, [visible, selectedDay]);

  function selectAndClose(d: Date) {
    onSelectDay(d);
    onClose();
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const weekStart = startOfWeek(today);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1}>
          <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.orange }]}>
            <View style={styles.headerRow}>
              <Text style={[styles.title, { color: C.text }]}>
                {mode === "month" ? "Calendrier" : "Semaine en cours"}
              </Text>
              <TouchableOpacity
                style={[styles.modeBtn, { borderColor: C.orange }]}
                onPress={() => setMode((m) => (m === "month" ? "week" : "month"))}
              >
                <Text style={[styles.modeBtnText, { color: C.orange }]}>
                  {mode === "month" ? "Semaine en cours" : "Vue mois"}
                </Text>
              </TouchableOpacity>
            </View>

            {mode === "month" ? (
              <MiniCalendar
                selDate={toISO(selectedDay)}
                onSelect={(iso) => selectAndClose(new Date(iso + "T00:00:00"))}
                calMonth={calMonth}
                onMonthChange={setCalMonth}
                startDate={startDate}
                C={C}
                size="lg"
                markedDates={interventionDates}
              />
            ) : (
              <View style={styles.weekRow}>
                {weekDays.map((d) => {
                  const iso = toISO(d);
                  const isPast = d < start;
                  const isSelected = iso === toISO(selectedDay);
                  const isToday = iso === toISO(today);
                  const hasSoin = interventionDates.has(iso);
                  return (
                    <TouchableOpacity
                      key={iso}
                      style={[
                        styles.weekCell,
                        {
                          backgroundColor: isSelected ? C.accent : "transparent",
                          borderColor: isToday ? C.orange : C.border,
                          opacity: isPast ? 0.3 : 1,
                        },
                      ]}
                      disabled={isPast}
                      onPress={() => selectAndClose(d)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.weekDow, { color: isSelected ? "#fff" : C.muted }]}>
                        {d.toLocaleDateString("fr-FR", { weekday: "short" })}
                      </Text>
                      <Text style={[styles.weekNum, { color: isSelected ? "#fff" : C.text }]}>{d.getDate()}</Text>
                      {hasSoin && <View style={[styles.dot, { backgroundColor: isSelected ? "#fff" : C.orange }]} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "center", alignItems: "center", padding: 24 },
  sheet: { width: "100%", maxWidth: 380, borderRadius: 20, borderWidth: 1, padding: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 16 },
  modeBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  modeBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },

  weekRow: { flexDirection: "row", justifyContent: "space-between", gap: 4 },
  weekCell: { flex: 1, alignItems: "center", borderWidth: 1, borderRadius: 10, paddingVertical: 10, gap: 2 },
  weekDow: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, textTransform: "capitalize" },
  weekNum: { fontFamily: "DM_Sans_700Bold", fontSize: 15 },
  dot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 2 },
});
