import { View, Text, StyleSheet } from "react-native";
import { NEW_ACCENT } from "@/lib/themes";

// Barre d'accent + badge "New" (Nouvelles/Entraide/Soutien), deux signaux
// dissociés :
// - `mine` : liseret bleu latéral, affiché tant que la publication existe et
//   m'appartient (voir isAuthor/isOwnMessage/isOwnEntry selon le mur) —
//   indépendant du statut vu/pas-vu, pour repérer d'un coup d'œil ce qu'on a
//   soi-même publié.
// - `isNew` : badge flottant, affiché tant que la publication n'a pas été vue
//   (voir lib/wallUnread.ts:useWallReadTracking) ; disparaît dès que
//   l'utilisateur a scrollé dessus lors d'une session ultérieure.
// Le badge flotte légèrement au-dessus du coin haut-droit (top négatif)
// plutôt qu'à l'intérieur de la carte : les 3 murs ont tous des boutons
// modifier/supprimer et/ou d'autres badges proches de ce coin, avec lesquels
// un badge posé à top:8/right:8 entrerait en collision visuelle.
//
// Le cadre rouge éventuel (Urgent en Entraide, New en Nouvelles/Soutien)
// reste géré par l'appelant via la couleur de bordure de la carte, pas ici.
export function NewIndicator({ isNew = false, mine = false }: { isNew?: boolean; mine?: boolean }) {
  if (!isNew && !mine) return null;
  return (
    <>
      {mine && (
        <View pointerEvents="none" style={styles.barClip}>
          <View style={styles.bar} />
        </View>
      )}
      {isNew && (
        <View pointerEvents="none" style={styles.badge}>
          <Text style={styles.badgeText}>New</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  // Cale de clip aux dimensions du coin arrondi de la carte parente (rayon
  // 14, partagé par les cartes Nouvelles/Entraide/Soutien) : overflow
  // "hidden" ici découpe le liseret droit selon la vraie courbe du cadre.
  // Donner ce même rayon directement à la barre de 4px (comme avant) produit
  // un bout en demi-pilule qui ne suit pas du tout l'arrondi du cadre —
  // un rayon n'a de sens que rapporté à la taille de la boîte qui le porte.
  barClip: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 14,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    overflow: "hidden",
  },
  bar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 4,
    backgroundColor: NEW_ACCENT,
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
