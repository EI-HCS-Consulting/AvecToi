import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { soinIconName } from "@/lib/soinIcons";
import type { Theme } from "@/lib/themes";

// Même gabarit que PatientAvatar.tsx (cercle, anneau doré) mais avec une
// icône devinée depuis le libellé du soin à la place d'une photo/des
// initiales — utilisé par MesSoinsList.tsx en lieu et place de l'avatar
// des intervenants.
interface Props {
  label: string;
  size?: number;
  C: Theme;
}

export default function SoinAvatar({ label, size = 42, C }: Props) {
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `${C.accent}33`,
          borderColor: C.gold,
        },
      ]}
    >
      <Ionicons name={soinIconName(label)} size={size * 0.5} color={C.gold} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { borderWidth: 2, alignItems: "center", justifyContent: "center" },
});
