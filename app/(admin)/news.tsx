import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useSpace } from "@/lib/SpaceContext";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { isSpaceCapped } from "@/lib/freemiumCap";
import NewsFeed from "@/components/NewsFeed";

export default function AdminNewsScreen() {
  const { space, loading, hasSpace, reservations } = useSpace();
  const { theme: C } = useDisplayMode();

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  if (!hasSpace || !space) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <Text style={[styles.msg, { color: C.muted }]}>Aucun espace patient actif.</Text>
      </View>
    );
  }

  return (
    <NewsFeed
      spaceId={space.id}
      C={C}
      isAdmin={true}
      capped={isSpaceCapped(space, reservations)}
      intervenantNewsVisibleToVisitors={space.intervenant_news_visible_to_visitors}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  msg: { fontFamily: "DM_Sans_400Regular", fontSize: 15, textAlign: "center" },
});
