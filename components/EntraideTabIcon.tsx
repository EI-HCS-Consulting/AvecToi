import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useEntraideBadges } from "@/lib/entraideBadges";
import type { Theme } from "@/lib/themes";

// Pictogramme de l'onglet Entraide : couleur normale du thème (comme avant),
// avec jusqu'à 2 points rouges empilés façon ":" à droite — voir
// lib/entraideBadges.ts. Le point du haut signale un besoin Urgent pas
// encore pris en charge, celui du bas un nouveau besoin publié par
// quelqu'un d'autre depuis la dernière visite de cet écran par ce viewer.
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
  const dotStyle = {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.danger,
    borderWidth: 1.5,
    borderColor: C.card,
  };
  return (
    <View style={{ width: size, height: size }}>
      <Ionicons name="people-outline" size={size} color={color} />
      {(urgentUnclaimed || newFromOthers) && (
        <View style={{ position: "absolute", top: 0, bottom: 0, right: -5, justifyContent: "center", gap: 2 }}>
          {urgentUnclaimed && <View style={dotStyle} />}
          {newFromOthers && <View style={dotStyle} />}
        </View>
      )}
    </View>
  );
}
