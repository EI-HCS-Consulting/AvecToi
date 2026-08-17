import { View, StyleSheet } from "react-native";

// Traits de bord de case jour indiquant le(s) groupe(s) distincts (patients,
// intervenants ou visiteurs selon l'écran) concernés ce jour-là — extrait de
// IntervenantGlobalCalendar.tsx pour être partagé avec WeekStrip.tsx et
// app/(visitor)/home/calendar.tsx (planning des visites par visiteur).
export const STRIPE = 4;

// Épaisseur de trait — pour les 4 premiers éléments d'une même case jour,
// chacun reçoit un trait plein sur un côté entier, dans l'ordre bas / droite
// / haut / gauche. À partir du 5ème, les traits commencent à se diviser en
// deux moitiés : le bas se divise en premier (5ème), puis la droite (6ème),
// le haut (7ème) et enfin la gauche (8ème) — 8 éléments au maximum ferment
// ainsi le tour de case ; au-delà, on n'ajoute plus rien sur la case.
export const EDGE_FULL: Array<Record<string, number | string>> = [
  { left: 0, right: 0, bottom: 0, height: STRIPE }, // bas
  { right: 0, top: 0, bottom: 0, width: STRIPE }, // droite
  { left: 0, right: 0, top: 0, height: STRIPE }, // haut
  { left: 0, top: 0, bottom: 0, width: STRIPE }, // gauche
];
export const EDGE_HALVES: Array<[Record<string, number | string>, Record<string, number | string>]> = [
  [{ left: 0, bottom: 0, width: "50%", height: STRIPE }, { right: 0, bottom: 0, width: "50%", height: STRIPE }], // bas
  [{ right: 0, bottom: 0, width: STRIPE, height: "50%" }, { right: 0, top: 0, width: STRIPE, height: "50%" }], // droite
  [{ right: 0, top: 0, width: "50%", height: STRIPE }, { left: 0, top: 0, width: "50%", height: STRIPE }], // haut
  [{ left: 0, top: 0, width: STRIPE, height: "50%" }, { left: 0, bottom: 0, width: STRIPE, height: "50%" }], // gauche
];

// Construit les traits de bord à afficher pour une case jour à partir des
// couleurs distinctes des éléments présents ce jour-là — un côté plein par
// élément pour les 4 premiers, puis des moitiés de côté à partir du 5ème
// (voir commentaire EDGE_FULL/EDGE_HALVES ci-dessus).
export function buildEdgeSegments(colors: string[]): { style: Record<string, number | string>; color: string }[] {
  const count = colors.length;
  const segments: { style: Record<string, number | string>; color: string }[] = [];
  for (let e = 0; e < 4; e++) {
    if (count <= e) break;
    const splitThreshold = 5 + e;
    if (count >= splitThreshold) {
      segments.push({ style: EDGE_HALVES[e][0], color: colors[e] });
      segments.push({ style: EDGE_HALVES[e][1], color: colors[4 + e] });
    } else {
      segments.push({ style: EDGE_FULL[e], color: colors[e] });
    }
  }
  return segments;
}

export function DayStripes({ colors }: { colors: string[] }) {
  if (colors.length === 0) return null;
  const segments = buildEdgeSegments(colors);
  return (
    <>
      {segments.map((seg, i) => (
        <View key={i} pointerEvents="none" style={[styles.stripeBase, seg.style, { backgroundColor: seg.color }]} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  stripeBase: { position: "absolute" },
});
