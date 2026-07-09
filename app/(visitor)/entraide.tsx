import { View, ActivityIndicator } from "react-native";
import { useVisitorSpace } from "@/lib/VisitorContext";
import { themes } from "@/lib/themes";
import { isSpaceCapped } from "@/lib/freemiumCap";
import Entraide from "@/components/Entraide";

export default function VisitorEntraideScreen() {
  const { space, reservations } = useVisitorSpace();
  const C = themes[space?.theme ?? "blue"];

  if (!space) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  return <Entraide spaceId={space.id} C={C} isAdmin={false} capped={isSpaceCapped(space, reservations)} hospitalName={space.hospital_name} />;
}
