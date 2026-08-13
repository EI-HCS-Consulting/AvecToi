import type { Ionicons } from "@expo/vector-icons";
import { soinIconByExactLabel } from "@/lib/metiers";

// Icône affichée à la place de l'avatar dans "Mes soins" (voir
// components/MesSoinsList.tsx). Priorité à l'icône exacte du catalogue
// (lib/metiers.ts) quand le libellé correspond à un soin choisi dans la
// liste ; sinon repli sur cette reconnaissance par mot-clé pour les soins
// tapés librement (option "Autre", ou fiches créées avant ce catalogue).
// Liste volontairement courte ; tout le reste retombe sur l'icône générique.
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
  const exact = soinIconByExactLabel(label);
  if (exact) return exact;
  for (const [pattern, icon] of KEYWORD_ICONS) {
    if (pattern.test(label)) return icon;
  }
  return "medkit-outline";
}
