import { View, ActivityIndicator } from "react-native";
import { useVisitorSpace } from "@/lib/VisitorContext";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { isSpaceCapped } from "@/lib/freemiumCap";
import Soutien from "@/components/Soutien";

export default function VisitorSoutienScreen() {
  const { space, reservations } = useVisitorSpace();
  const { theme: C } = useDisplayMode();

  if (!space) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  return <Soutien spaceId={space.id} C={C} isAdmin={false} capped={isSpaceCapped(space, reservations)} />;
}
