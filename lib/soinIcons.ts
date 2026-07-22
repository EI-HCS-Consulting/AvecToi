import type { Ionicons } from "@expo/vector-icons";

// Icône affichée à la place de l'avatar dans "Mes soins" (voir
// components/MesSoinsList.tsx) — devinée depuis le libellé du soin (texte
// libre saisi par l'intervenant, ex. "Kiné", "Pansement"). Liste volontairement
// courte (métiers/actes les plus courants) ; tout le reste retombe sur l'icône
// générique 🩺.
const KEYWORD_ICONS: [RegExp, keyof typeof Ionicons.glyphMap][] = [
  [/kin[ée]/i, "body-outline"],
  [/infirm|piq[ûu]re|pansement|perfusion/i, "medical-outline"],
  [/aide.?soignant/i, "hand-left-outline"],
  [/domicile|m[ée]nage|auxiliaire de vie/i, "home-outline"],
  [/psy/i, "chatbubble-ellipses-outline"],
  [/repas|nutrition|di[ée]t[ée]tic/i, "restaurant-outline"],
  [/toilette|hygi[èe]ne|douche|bain/i, "water-outline"],
  [/kn[eé]e|ortho|r[ée][ée]duc/i, "walk-outline"],
  [/m[ée]decin|docteur/i, "medkit-outline"],
];

export function soinIconName(label: string): keyof typeof Ionicons.glyphMap {
  for (const [pattern, icon] of KEYWORD_ICONS) {
    if (pattern.test(label)) return icon;
  }
  return "medkit-outline";
}
