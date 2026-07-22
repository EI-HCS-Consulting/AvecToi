import { useState, useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useVisitorSpace } from "@/lib/VisitorContext";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { isSpaceCapped } from "@/lib/freemiumCap";
import { getVisitorSession } from "@/lib/visitorSession";
import NewsFeed from "@/components/NewsFeed";

export default function VisitorNewsScreen() {
  const { space, reservations } = useVisitorSpace();
  const { theme: C } = useDisplayMode();
  const [role, setRole] = useState<"visiteur" | "intervenant">("visiteur");

  useEffect(() => {
    getVisitorSession().then((s) => setRole(s?.role ?? "visiteur"));
  }, []);

  if (!space) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  return (
    <NewsFeed
      spaceId={space.id}
      C={C}
      isAdmin={false}
      capped={isSpaceCapped(space, reservations)}
      viewerRole={role}
      intervenantNewsVisibleToVisitors={space.intervenant_news_visible_to_visitors}
    />
  );
}
