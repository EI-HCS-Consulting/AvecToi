import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import MiniCalendar from "@/components/MiniCalendar";
import { toISO } from "@/lib/slotUtils";
import type { Theme } from "@/lib/themes";

// Modale calendrier ouverte en tapant sur la date affichée dans le pager
// jour par jour de (admin)/intervenants.tsx. Vue mois (points de couleur sur
// les jours ayant un soin planifié, via MiniCalendar en size="lg" +
// markedDates).
interface Props {
  visible: boolean;
  onClose: () => void;
  selectedDay: Date;
  onSelectDay: (d: Date) => void;
  interventionDates: Set<string>;
  startDate: Date;
  C: Theme;
}

export default function PlanningCalendarModal({
  visible, onClose, selectedDay, onSelectDay, interventionDates, startDate, C,
}: Props) {
  const [calMonth, setCalMonth] = useState(() => ({ year: selectedDay.getFullYear(), month: selectedDay.getMonth() }));

  // Repart sur le mois du jour sélectionné à chaque ouverture, plutôt que de
  // garder l'état de la dernière ouverture.
  useEffect(() => {
    if (visible) {
      setCalMonth({ year: selectedDay.getFullYear(), month: selectedDay.getMonth() });
    }
  }, [visible, selectedDay]);

  function selectAndClose(d: Date) {
    onSelectDay(d);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1}>
          <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.orange }]}>
            <Text style={[styles.title, { color: C.text }]}>Calendrier</Text>

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
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "center", alignItems: "center", padding: 24 },
  sheet: { width: "100%", maxWidth: 380, borderRadius: 20, borderWidth: 1, padding: 20 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 16, marginBottom: 16 },
});
