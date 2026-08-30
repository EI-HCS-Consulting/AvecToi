import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useWallBadge, type WallScope } from "@/lib/wallUnread";
import type { Theme } from "@/lib/themes";

// Picto de barre d'onglets Soutien/Nouvelles avec point rouge tant qu'il
// reste une publication non lue (voir lib/wallUnread.ts) — même convention
// visuelle qu'EntraideTabIcon.tsx (point unique ici, celui-ci n'ayant pas de
// second indicateur "urgent" à distinguer).
export default function UnreadDotIcon({
  scope, table, spaceId, isAdmin, iconName, color, size, theme: C,
}: {
  scope: WallScope;
  table: string;
  spaceId: string | null;
  isAdmin: boolean;
  iconName: keyof typeof Ionicons.glyphMap;
  color: string;
  size: number;
  theme: Theme;
}) {
  const hasUnread = useWallBadge(scope, table, spaceId, isAdmin);
  return (
    <View style={{ width: size, height: size }}>
      <Ionicons name={iconName} size={size} color={color} />
      {hasUnread && (
        <View
          style={{
            position: "absolute", top: 0, right: -5,
            width: 7, height: 7, borderRadius: 4, backgroundColor: C.danger,
            borderWidth: 1.5, borderColor: C.card,
          }}
        />
      )}
    </View>
  );
}
