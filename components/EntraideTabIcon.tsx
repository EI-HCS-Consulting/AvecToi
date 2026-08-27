import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useEntraideBadges } from "@/lib/entraideBadges";
import type { Theme } from "@/lib/themes";

// Pictogramme de l'onglet Entraide : rempli en rouge s'il existe un besoin
// Urgent pas encore pris en charge, + petite cloche rouge en surimpression
// si quelqu'un d'autre a publié un besoin depuis la dernière visite de cet
// écran par ce viewer (voir lib/entraideBadges.ts).
export default function EntraideTabIcon({
  spaceId, isAdmin, color, size, theme: C,
}: {
  spaceId: string | null;
  isAdmin: boolean;
  color: string;
  size: number;
  theme: Theme;
}) {
  const { urgentUnclaimed, newFromOthers } = useEntraideBadges(spaceId, isAdmin);
  return (
    <View style={{ width: size, height: size }}>
      <Ionicons
        name={urgentUnclaimed ? "people" : "people-outline"}
        size={size}
        color={urgentUnclaimed ? C.danger : color}
      />
      {newFromOthers && (
        <View
          style={{
            position: "absolute",
            top: -2,
            right: -4,
            width: 9,
            height: 9,
            borderRadius: 5,
            backgroundColor: C.danger,
            borderWidth: 1.5,
            borderColor: C.card,
          }}
        />
      )}
    </View>
  );
}
