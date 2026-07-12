import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { Theme } from "@/lib/themes";
import { openAndroidTimePicker } from "@/lib/androidTimePicker";

function parseValue(value: string) {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  const d = new Date();
  d.setHours(match ? Number(match[1]) : 8, match ? Number(match[2]) : 0, 0, 0);
  return d;
}

interface Props {
  value: string; // "HH:MM" ou ""
  onChange: (v: string) => void;
  C: Theme;
}

export default function TimeClockPicker({ value, onChange, C }: Props) {
  const [open, setOpen] = useState(false);

  function applyDate(date: Date) {
    onChange(`${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`);
  }

  function handlePress() {
    if (Platform.OS === "android") {
      openAndroidTimePicker(parseValue(value), applyDate);
    } else {
      setOpen(true);
    }
  }

  return (
    <View>
      <TouchableOpacity
        style={[styles.field, { backgroundColor: C.bg, borderColor: C.border }]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Text style={{ fontFamily: "DM_Sans_600SemiBold", fontSize: 15, color: value ? C.text : C.muted }}>
          🕐 {value || "HH:MM"}
        </Text>
      </TouchableOpacity>

      {open && Platform.OS !== "android" && (
        <DateTimePicker
          value={parseValue(value)}
          mode="time"
          is24Hour
          display="spinner"
          onChange={(_, date) => {
            setOpen(false);
            if (date) applyDate(date);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10, alignItems: "center", maxWidth: 120 },
});
