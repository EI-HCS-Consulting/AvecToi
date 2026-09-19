export type ThemeKey = "dark" | "light";

export interface Theme {
  bg: string;
  card: string;
  border: string;
  accent: string;
  gold: string;
  text: string;
  muted: string;
  success: string;
  danger: string;
  orange: string;
  // Fond translucide subtil pour un chip/pastille posé sur `card` ou `bg`
  // (remplace les anciens rgba(255,255,255,0.0x) qui disparaissaient en Light).
  overlay: string;
}

export const themes: Record<ThemeKey, Theme> = {
  dark: {
    bg: "#0D1B2E",
    card: "#112240",
    border: "#1E3A5F",
    accent: "#2E75B6",
    gold: "#f0b429",
    text: "#e8edf5",
    muted: "#7a8fa6",
    success: "#3ecf8e",
    danger: "#e94560",
    orange: "#f97316",
    overlay: "rgba(255,255,255,0.08)",
  },
  // Palette dérivée des couleurs des bonhommes du logo (bleu marine, turquoise, orange).
  light: {
    bg: "#F4F6F9",
    card: "#FFFFFF",
    border: "#E1E7EF",
    accent: "#2C4C7C",
    gold: "#B8860B",
    text: "#1A2B3C",
    muted: "#64748B",
    success: "#0E9488",
    danger: "#D0334C",
    orange: "#f97316",
    overlay: "rgba(15,23,42,0.05)",
  },
};

export const themeLabels: Record<ThemeKey, string> = {
  dark: "Sombre",
  light: "Clair",
};

// Couleurs des checklists (Mes Checklists, Entraide) — verrouillées sur la
// palette Light plutôt que de suivre le thème actif : en Dark, accent/gold
// sont plus clairs et perdent tout contraste une fois posés en fond
// translucide sur une carte déjà sombre (voir groupTintWrap/checklistCard).
export const CHECKLIST_COLORS: Record<"accent" | "orange" | "gold", string> = {
  accent: themes.light.accent,
  gold: themes.light.gold,
  orange: themes.light.orange,
};

// Barre d'accent + badge "New" (Nouvelles/Entraide/Soutien, voir
// components/NewIndicator.tsx et lib/wallUnread.ts) — fixe, indépendante du
// thème, comme les couleurs LOGO_* ci-dessous.
export const NEW_ACCENT = "#2E75B6";

// Couleurs des bonhommes du logo — fixes, identiques dans les deux thèmes
// (contrairement à `accent`/`success`/etc. qui varient dark/light).
export const LOGO_GREEN = "#0DABB6"; // bonhomme turquoise (haut-droite)
export const LOGO_PURPLE = "#8458B5"; // bonhomme violet (bas-droite)
export const LOGO_NAVY = "#22436B"; // bonhomme bleu marine (haut-gauche)
export const LOGO_ORANGE = "#E8923C"; // bonhomme orange (bas-gauche)
export const LOGO_SKYBLUE = "#8FCBEA"; // cœur bleu ciel (centre)

// Fond "plein" des cases jour ayant un soin, sur le planning global
// intervenant (voir IntervenantGlobalCalendar.tsx) — LOGO_PURPLE éclairci
// pour laisser plus de marge de contraste aux traits de bord par patient. Le
// cadre lui-même reste LOGO_PURPLE plein, comme sur home/calendar.tsx.
export const LOGO_PURPLE_SOFT = "#9A76C2";

// Fond pastel des cases jour "Partiel"/"Complet" du planning des visites
// (home/calendar.tsx, WeekStrip.tsx, mode Visites) — variantes adoucies de
// C.orange/C.danger, fixes (indépendantes du thème, comme LOGO_* ci-dessus).
// Mêmes teintes que les 2 premières couleurs de PASTEL_COLORS ci-dessous,
// nommées ici pour la lisibilité du code qui les utilise comme fond de case.
export const VISITES_ORANGE_FILL = "#FFDFBA";
export const VISITES_DANGER_FILL = "#FFB3BA";

// Couleurs additionnelles pour PATIENT_PALETTE ci-dessous — LOGO_PURPLE reste
// exclu (trait violet quasi invisible sur le fond violet des jours de soin,
// voir LOGO_PURPLE_SOFT ci-dessus) et le rouge pur est évité (déjà porteur de
// sens : C.danger). Ni le vert ni le bleu ciel du logo ne suffisaient à
// distinguer nettement patients/visiteurs entre eux (retour utilisateur :
// couleurs trop proches) — palette élargie à 8 teintes bien séparées en
// teinte, seules deux (turquoise et bleu ciel) restant dans la famille bleue.
const PATIENT_GREEN = "#1E9E68";
const PATIENT_MAGENTA = "#C2478D";
const PATIENT_GOLD = "#F5B90D";
const PATIENT_BROWN = "#8B5E3C";

// Palette utilisée pour attribuer une couleur à chaque patient sur le
// planning global d'un intervenant (voir components/IntervenantGlobalCalendar.tsx,
// components/PatientColorLegend.tsx) et à chaque visiteur sur le calendrier
// (voir HomeCalendarScreen.tsx) — une identité par couleur, réutilisées dans
// le même ordre pour rester cohérentes entre le calendrier et sa légende.
// Identique à lib/dashboard/colors.ts côté site avectoi-site — ne pas
// diverger sans répercuter le changement des deux côtés.
export const PATIENT_PALETTE = [
  LOGO_NAVY, LOGO_ORANGE, PATIENT_GREEN, PATIENT_MAGENTA,
  PATIENT_GOLD, LOGO_GREEN, LOGO_SKYBLUE, PATIENT_BROWN,
];

// Au-delà du 8ème patient/visiteur (au-delà de PATIENT_PALETTE), palette de
// secours — bouclée au-delà de 16. Tons plus soutenus que l'ancienne palette
// pastel (trop proches les uns des autres pour rester lisibles en légende).
export const PASTEL_COLORS = [
  "#FFB3BA", "#FFDFBA", "#4C6E91", "#B08D57",
  "#5C8A3A", "#A85C7A", "#3F8F91", "#6E7F99",
];

// Mêmes teintes que VISITES_ORANGE_FILL/VISITES_DANGER_FILL (fond des cases
// Partiel/Complet) exclues ici : un trait de cette couleur serait invisible
// posé sur un fond identique — voir WeekStrip.tsx/DayEdgeStripes.tsx où les
// traits sont dessinés par-dessus ce fond.
const STRIPE_FALLBACK_COLORS = PASTEL_COLORS.filter(
  (c) => c !== VISITES_ORANGE_FILL && c !== VISITES_DANGER_FILL,
);

// Couleur attribuée au (index+1)-ème patient d'un intervenant — les 5
// premiers reprennent PATIENT_PALETTE, au-delà on bascule sur la palette
// pastel (voir PASTEL_COLORS, filtrée en STRIPE_FALLBACK_COLORS).
export function getPatientColor(index: number): string {
  if (index < PATIENT_PALETTE.length) return PATIENT_PALETTE[index];
  return STRIPE_FALLBACK_COLORS[(index - PATIENT_PALETTE.length) % STRIPE_FALLBACK_COLORS.length];
}

// Couleur fixe de la personne qui consulte sur son propre calendrier (voir
// HomeCalendarScreen.tsx) — plus lisible qu'une couleur qui varie selon
// l'ordre des visiteurs. LOGO_ORANGE est retiré des couleurs attribuables aux
// *autres* visiteurs (getOtherVisitorColor) pour ne jamais être réattribué.
// Identique à lib/dashboard/colors.ts côté site avectoi-site — ne pas
// diverger sans répercuter le changement des deux côtés.
export const SELF_COLOR = LOGO_ORANGE;

const OTHER_VISITOR_PALETTE = PATIENT_PALETTE.filter((c) => c !== LOGO_ORANGE);

export function getOtherVisitorColor(index: number): string {
  if (index < OTHER_VISITOR_PALETTE.length) return OTHER_VISITOR_PALETTE[index];
  return STRIPE_FALLBACK_COLORS[(index - OTHER_VISITOR_PALETTE.length) % STRIPE_FALLBACK_COLORS.length];
}

// Couleur de contour par catégorie de besoin (Entraide) — fixe, indépendante
// du thème, utilisée pour regrouper visuellement "Mes besoins" (Mon compte)
// par catégorie sans dupliquer les blocs "pris en charge"/"publiés".
export const TASK_CATEGORY_COLORS: Record<
  "repas" | "affaires" | "courses" | "transport" | "administratif" | "autre" | "relais",
  string
> = {
  repas: LOGO_ORANGE,
  affaires: LOGO_PURPLE,
  courses: LOGO_GREEN,
  transport: LOGO_NAVY,
  administratif: LOGO_SKYBLUE,
  relais: PATIENT_MAGENTA,
  autre: "#8C8C8C",
};
