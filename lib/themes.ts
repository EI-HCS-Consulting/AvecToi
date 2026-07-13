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
