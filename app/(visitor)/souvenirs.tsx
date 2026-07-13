import { useVisitorSpace } from "@/lib/VisitorContext";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { isSpaceCapped } from "@/lib/freemiumCap";
import SouvenirsGallery from "@/components/SouvenirsGallery";
import { View, ActivityIndicator } from "react-native";

export default function VisitorSouvenirsScreen() {
  const { space, reservations } = useVisitorSpace();
  const { theme: C } = useDisplayMode();

  if (!space) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  return <SouvenirsGallery spaceId={space.id} C={C} isAdmin={false} capped={isSpaceCapped(space, reservations)} />;
}
