import { View, Text, StyleSheet } from "react-native";
import { NEW_ACCENT } from "@/lib/themes";

// Barre d'accent + badge "New" (Nouvelles/Entraide/Soutien, voir
// lib/wallUnread.ts:useWallNewIds). Le badge flotte légèrement au-dessus du
// coin haut-droit (top négatif) plutôt qu'à l'intérieur de la carte : les 3
// murs ont tous des boutons modifier/supprimer et/ou d'autres badges proches
// de ce coin, avec lesquels un badge posé à top:8/right:8 entrerait en
// collision visuelle.
//
// `urgent`: en Entraide, un besoin Urgent+New affiche le badge seul, sans
// barre latérale (le cadre rouge Urgent reste le seul indicateur de bord,
// géré par l'appelant) — voir le tableau de priorité dans wallUnread.ts.
export function NewIndicator({ urgent = false }: { urgent?: boolean }) {
  return (
    <>
      {!urgent && <View pointerEvents="none" style={styles.bar} />}
      <View pointerEvents="none" style={styles.badge}>
        <Text style={styles.badgeText}>New</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 4,
    backgroundColor: NEW_ACCENT,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  badge: {
    position: "absolute",
    top: -9,
    right: 10,
    backgroundColor: NEW_ACCENT,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: "#fff",
    fontFamily: "DM_Sans_700Bold",
    fontSize: 10,
  },
});
