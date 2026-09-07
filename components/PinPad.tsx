import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { Theme } from "@/lib/themes";

interface Props {
  value: string;
  onChange: (val: string) => void;
  maxLength?: number;
  theme: Theme;
  hasError?: boolean;
  reveal?: boolean;
  // N'affiche que les points/chiffres, sans clavier — pour une consultation
  // passive du PIN (ex. "Mon compte" visiteur) plutôt qu'une saisie.
  readOnly?: boolean;
}

const KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"] as const;

export default function PinPad({ value, onChange, maxLength = 4, theme: C, hasError = false, reveal = false, readOnly = false }: Props) {
  // Les dimensions par défaut des cases (48px + gap 12) sont calibrées pour
  // le PIN normal de l'app (4 chiffres, 228px au total). Un code à 6 chiffres
  // (OTP email co-admin/reset PIN) dépasserait la largeur disponible des
  // popups qui l'affichent (348px vs ~260-320px de contenu) et débordait
  // visuellement de la carte (bug remonté, capture "boutons hors popup") —
  // on réduit les cases uniquement au-delà de 4 chiffres, sans toucher au
  // rendu du PIN normal partout ailleurs dans l'app.
  const compact = maxLength > 4;
  function press(k: typeof KEYS[number]) {
    if (k === "⌫") {
      onChange(value.slice(0, -1));
    } else if (k !== "" && value.length < maxLength) {
      onChange(value + String(k));
    }
  }

  return (
    <View>
      {/* PIN display dots */}
      <View style={[styles.dots, compact && styles.dotsCompact]}>
        {Array.from({ length: maxLength }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              compact && styles.dotCompact,
              {
                borderColor: hasError
                  ? C.danger
                  : value.length > i
                  ? C.accent
                  : C.border,
                backgroundColor: C.bg,
              },
            ]}
          >
            <Text style={{ color: hasError ? C.danger : C.text, fontSize: compact ? 16 : 20, fontWeight: "700" }}>
              {value[i] ? (reveal ? value[i] : "●") : ""}
            </Text>
          </View>
        ))}
      </View>

      {/* Keypad */}
      {!readOnly && (
      <View style={styles.grid}>
        {KEYS.map((k, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => press(k)}
            disabled={k === ""}
            activeOpacity={k === "" ? 1 : 0.7}
            style={[
              styles.key,
              {
                backgroundColor:
                  k === ""
                    ? "transparent"
                    : k === "⌫"
                    ? "rgba(233,69,96,0.1)"
                    : C.bg,
                borderColor:
                  k === ""
                    ? "transparent"
                    : k === "⌫"
                    ? "rgba(233,69,96,0.3)"
                    : C.border,
                borderWidth: k === "" ? 0 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.keyText,
                { color: k === "⌫" ? C.danger : C.text },
              ]}
            >
              {k}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 16,
  },
  dotsCompact: {
    gap: 6,
  },
  dot: {
    width: 48,
    height: 54,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dotCompact: {
    width: 36,
    height: 42,
    borderRadius: 6,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  key: {
    width: "30%",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: {
    fontSize: 18,
    fontWeight: "600",
  },
});
