import { useRef, useState } from "react";
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView,
  NativeSyntheticEvent, NativeScrollEvent,
} from "react-native";
import type { Theme } from "@/lib/themes";

// Sélecteur d'heure à molette (deux colonnes Heures/Minutes qui défilent),
// façon horloge Android — remplace la saisie clavier "HH:MM" sans dépendre
// d'un date/time picker natif (risque connu d'incompatibilité Expo Go avec
// la new architecture activée sur ce projet, cf. issues du package
// @react-native-community/datetimepicker sur Expo SDK 54).

const ITEM_HEIGHT = 44;
const VISIBLE_ROWS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const PAD = ITEM_HEIGHT * Math.floor(VISIBLE_ROWS / 2);
// Nombre de rangées dupliquées en haut/bas de la liste — comble exactement
// l'espace du padding avec les valeurs de bouclage (ex. "59" juste avant
// "00") au lieu d'un padding vide.
const WRAP = Math.floor(VISIBLE_ROWS / 2);

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function Wheel({ values, initial, onSettle, C }: {
  values: number[];
  initial: number;
  onSettle: (v: number) => void;
  C: Theme;
}) {
  const scrollRef = useRef<ScrollView>(null);
  // Rangées de bouclage : les WRAP dernières valeurs avant, les WRAP
  // premières après — ex. minutes → [58, 59, 00, 01, ..., 58, 59, 00, 01].
  const rendered = [...values.slice(-WRAP), ...values, ...values.slice(0, WRAP)];
  const [focusedIndex, setFocusedIndex] = useState(WRAP + initial);

  function renderIndexFromY(y: number) {
    const k = Math.round(y / ITEM_HEIGHT) + WRAP;
    return Math.max(0, Math.min(rendered.length - 1, k));
  }

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setFocusedIndex(renderIndexFromY(e.nativeEvent.contentOffset.y));
  }

  function handleSettle(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const k = renderIndexFromY(e.nativeEvent.contentOffset.y);
    scrollRef.current?.scrollTo({ y: (k - WRAP) * ITEM_HEIGHT, animated: true });
    setFocusedIndex(k);
    onSettle(rendered[k]);
  }

  return (
    <View style={{ height: WHEEL_HEIGHT, width: 80 }}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="normal"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleSettle}
        contentOffset={{ x: 0, y: initial * ITEM_HEIGHT }}
      >
        {rendered.map((v, i) => {
          const isFocused = i === focusedIndex;
          return (
            <View key={i} style={styles.wheelItem}>
              <Text
                style={{
                  fontFamily: isFocused ? "DM_Sans_700Bold" : "DM_Sans_400Regular",
                  fontSize: isFocused ? 26 : 18,
                  color: isFocused ? C.gold : C.muted,
                }}
              >
                {String(v).padStart(2, "0")}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

interface Props {
  value: string; // "HH:MM" ou ""
  onChange: (v: string) => void;
  C: Theme;
}

export default function TimeWheelPicker({ value, onChange, C }: Props) {
  const [open, setOpen] = useState(false);
  const [draftHour, setDraftHour] = useState(8);
  const [draftMinute, setDraftMinute] = useState(0);

  function openPicker() {
    const match = value.match(/^(\d{2}):(\d{2})$/);
    setDraftHour(match ? Number(match[1]) : 8);
    setDraftMinute(match ? Number(match[2]) : 0);
    setOpen(true);
  }

  function confirm() {
    onChange(`${String(draftHour).padStart(2, "0")}:${String(draftMinute).padStart(2, "0")}`);
    setOpen(false);
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.field, { backgroundColor: C.bg, borderColor: C.border }]}
        onPress={openPicker}
        activeOpacity={0.7}
      >
        <Text style={{ fontFamily: "DM_Sans_400Regular", fontSize: 15, color: value ? C.text : C.muted }}>
          {value || "HH:MM"}
        </Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text style={[styles.headerBtn, { color: C.muted }]}>Annuler</Text>
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: "#fff" }]}>Choisir l'heure</Text>
              <TouchableOpacity onPress={confirm}>
                <Text style={[styles.headerBtn, { color: C.gold }]}>Enregistrer</Text>
              </TouchableOpacity>
            </View>

            {open && (
              <View style={styles.wheelsRow}>
                <View pointerEvents="none" style={[styles.centerHighlight, { borderColor: C.border, top: PAD }]} />
                <Wheel values={HOURS} initial={draftHour} onSettle={setDraftHour} C={C} />
                <Text style={[styles.colon, { color: C.text }]}>:</Text>
                <Wheel values={MINUTES} initial={draftMinute} onSettle={setDraftMinute} C={C} />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10, alignItems: "center", maxWidth: 120 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, padding: 20, paddingBottom: 32 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  headerBtn: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  headerTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 17 },
  wheelsRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 4, position: "relative" },
  centerHighlight: { position: "absolute", left: 40, right: 40, height: ITEM_HEIGHT, borderTopWidth: 1, borderBottomWidth: 1 },
  colon: { fontFamily: "DM_Sans_700Bold", fontSize: 22, marginHorizontal: 2 },
  wheelItem: { height: ITEM_HEIGHT, alignItems: "center", justifyContent: "center" },
});
