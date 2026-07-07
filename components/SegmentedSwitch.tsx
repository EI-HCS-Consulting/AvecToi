import { useRef, useState, useEffect } from "react";
import { View, Text, Animated, PanResponder, StyleSheet, LayoutChangeEvent } from "react-native";
import type { Theme } from "@/lib/themes";

// Interrupteur à 2 options avec pastille qui glisse (glisser ou taper un
// côté) — même comportement que le switch "Mode de soin" de
// app/(admin)/settings.tsx (Suivi hospitalier / Soin à domicile), extrait
// ici pour être réutilisé ailleurs (ex. Entraide Transport) sans dupliquer
// tout l'appareillage PanResponder/Animated.

interface Props {
  value: boolean; // false = leftLabel, true = rightLabel
  onChange: (v: boolean) => void;
  leftLabel: string;
  rightLabel: string;
  C: Theme;
  // Force la largeur de la pastille au lieu de la calculer depuis les
  // libellés — pour aligner plusieurs switches entre eux (ex. sur la même
  // largeur que le switch du dessus).
  thumbWidth?: number;
  // Remonte la largeur de pastille calculée naturellement à partir des
  // libellés, pour qu'un autre switch puisse s'y aligner via `thumbWidth`.
  onThumbWidth?: (w: number) => void;
}

export default function SegmentedSwitch({ value, onChange, leftLabel, rightLabel, C, thumbWidth, onThumbWidth }: Props) {
  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthRef = useRef(0);
  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);
  const [leftLabelWidth, setLeftLabelWidth] = useState(0);
  const [rightLabelWidth, setRightLabelWidth] = useState(0);
  const naturalThumbWidth = leftLabelWidth > 0 && rightLabelWidth > 0 ? Math.max(leftLabelWidth, rightLabelWidth) + 24 : 0;
  useEffect(() => { if (naturalThumbWidth > 0) onThumbWidth?.(naturalThumbWidth); }, [naturalThumbWidth]);
  const thumbX = useRef(new Animated.Value(value ? 1 : 0)).current;
  const dragStart = useRef(0);

  useEffect(() => {
    Animated.spring(thumbX, { toValue: value ? 1 : 0, useNativeDriver: true, friction: 8 }).start();
  }, [value]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const w = trackWidthRef.current;
        if (w <= 0) return;
        const frac = Math.min(1, Math.max(0, evt.nativeEvent.locationX / w));
        dragStart.current = frac;
        thumbX.setValue(frac);
      },
      onPanResponderMove: (_, g) => {
        const w = trackWidthRef.current;
        if (w <= 0) return;
        const frac = Math.min(1, Math.max(0, dragStart.current + g.dx / w));
        thumbX.setValue(frac);
      },
      onPanResponderRelease: (_, g) => {
        const w = trackWidthRef.current;
        if (w <= 0) return;
        const frac = Math.min(1, Math.max(0, dragStart.current + g.dx / w));
        const next = frac >= 0.5;
        Animated.spring(thumbX, { toValue: next ? 1 : 0, useNativeDriver: true, friction: 8 }).start();
        onChange(next);
      },
      onPanResponderTerminate: () => {
        Animated.spring(thumbX, { toValue: valueRef.current ? 1 : 0, useNativeDriver: true, friction: 8 }).start();
      },
    })
  ).current;

  function onTrackLayout(e: LayoutChangeEvent) {
    const w = e.nativeEvent.layout.width;
    trackWidthRef.current = w;
    setTrackWidth(w);
  }

  return (
    <View
      style={[styles.track, { borderColor: C.border, backgroundColor: C.bg }]}
      onLayout={onTrackLayout}
      {...panResponder.panHandlers}
    >
      {trackWidth > 0 && (thumbWidth ?? naturalThumbWidth) > 0 && (() => {
        const w = thumbWidth ?? naturalThumbWidth;
        const leftPos = 0;
        const rightPos = trackWidth - w;
        return (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.thumb,
              {
                backgroundColor: C.accent,
                width: w,
                transform: [{
                  translateX: thumbX.interpolate({ inputRange: [0, 1], outputRange: [leftPos, rightPos] }),
                }],
              },
            ]}
          />
        );
      })()}
      <View style={[styles.option, { left: 0 }]} pointerEvents="none">
        <Text
          onLayout={(e) => setLeftLabelWidth(e.nativeEvent.layout.width)}
          style={[styles.optionText, { color: !value ? "#fff" : C.muted }]}
        >
          {leftLabel}
        </Text>
      </View>
      <View style={[styles.option, { right: 0 }]} pointerEvents="none">
        <Text
          onLayout={(e) => setRightLabelWidth(e.nativeEvent.layout.width)}
          style={[styles.optionText, { color: value ? "#fff" : C.muted }]}
        >
          {rightLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: "100%", height: 48, borderWidth: 1, borderRadius: 24, overflow: "hidden", position: "relative" },
  thumb: { position: "absolute", top: 0, bottom: 0, left: 0, borderRadius: 24 },
  option: { position: "absolute", top: 0, bottom: 0, justifyContent: "center", paddingHorizontal: 12 },
  optionText: { fontFamily: "DM_Sans_700Bold", fontSize: 13 },
});
