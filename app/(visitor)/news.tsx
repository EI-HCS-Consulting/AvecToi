import { View, ActivityIndicator } from "react-native";
import { useVisitorSpace } from "@/lib/VisitorContext";
import { themes } from "@/lib/themes";
import { isSpaceCapped } from "@/lib/freemiumCap";
import NewsFeed from "@/components/NewsFeed";

export default function VisitorNewsScreen() {
  const { space, reservations } = useVisitorSpace();
  const C = themes[space?.theme ?? "blue"];

  if (!space) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  return <NewsFeed spaceId={space.id} C={C} isAdmin={false} capped={isSpaceCapped(space, reservations)} />;
}
