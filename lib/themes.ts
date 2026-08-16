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

// Couleurs des bonhommes du logo — fixes, identiques dans les deux thèmes
// (contrairement à `accent`/`success`/etc. qui varient dark/light).
export const LOGO_GREEN = "#0DABB6"; // bonhomme turquoise (haut-droite)
export const LOGO_PURPLE = "#8458B5"; // bonhomme violet (bas-droite)
export const LOGO_NAVY = "#22436B"; // bonhomme bleu marine (haut-gauche)
export const LOGO_ORANGE = "#E8923C"; // bonhomme orange (bas-gauche)
export const LOGO_SKYBLUE = "#8FCBEA"; // cœur bleu ciel (centre)

// Les 5 couleurs distinctes du logo, dans l'ordre utilisé pour attribuer une
// couleur à chaque patient sur le planning global d'un intervenant (voir
// components/IntervenantGlobalCalendar.tsx, components/PatientColorLegend.tsx)
// — un patient par couleur, réutilisées dans le même ordre pour rester
// cohérentes entre le calendrier et sa légende.
export const LOGO_COLORS = [LOGO_NAVY, LOGO_GREEN, LOGO_ORANGE, LOGO_PURPLE, LOGO_SKYBLUE];

// Au-delà du 5ème patient (au-delà des couleurs du logo), palette pastel de
// secours — bouclée si un intervenant est rattaché à plus de 15 patients.
export const PASTEL_COLORS = [
  "#FFB3BA", "#FFDFBA", "#FFFFBA", "#BAFFC9", "#BAE1FF",
  "#D7BAFF", "#FFBAF0", "#C9FFE5", "#FFD1DC", "#C4C4FF",
];

// Couleur attribuée au (index+1)-ème patient d'un intervenant — les 5
// premiers reprennent les couleurs du logo, au-delà on bascule sur la
// palette pastel (voir PASTEL_COLORS).
export function getPatientColor(index: number): string {
  if (index < LOGO_COLORS.length) return LOGO_COLORS[index];
  return PASTEL_COLORS[(index - LOGO_COLORS.length) % PASTEL_COLORS.length];
}
