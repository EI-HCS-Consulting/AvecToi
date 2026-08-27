import { toISO, addDays } from "@/lib/slotUtils";

// Sous-ensemble structurel de TaskRelaisCoverage — accepte aussi bien des
// lignes réelles chargées depuis task_relais_coverage que des plages pas
// encore insérées (ex. relaisClaimRanges dans Entraide.tsx, avant l'insert).
export type RelaisCoverageRange = { start_date: string; end_date: string };

// Fusionne les plages de task_relais_coverage (triées par start_date,
// bornes incluses) en intervalles contigus/qui se chevauchent — vraie
// fusion d'intervalles, pas une somme de jours : deux personnes couvrant la
// même sous-période ne doivent jamais compter deux fois, et deux plages qui
// se touchent exactement (l'une finit la veille du début de l'autre)
// doivent fusionner en une seule.
function mergeIntervals(coverage: RelaisCoverageRange[]): { start: string; end: string }[] {
  const sorted = [...coverage].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const merged: { start: string; end: string }[] = [];
  for (const c of sorted) {
    const last = merged[merged.length - 1];
    if (last && c.start_date <= toISO(addDays(new Date(last.end + "T12:00:00"), 1))) {
      if (c.end_date > last.end) last.end = c.end_date;
    } else {
      merged.push({ start: c.start_date, end: c.end_date });
    }
  }
  return merged;
}

// Vrai si la période [periodStart, periodEnd] est intégralement couverte
// par au moins une plage fusionnée — sert à décider si tasks.status doit
// repasser à "pris_en_charge" (sinon reste "ouvert", même avec des
// contributeurs déjà inscrits sur une partie de la période).
export function isRelaisFullyCovered(
  coverage: RelaisCoverageRange[],
  periodStart: string,
  periodEnd: string,
): boolean {
  return mergeIntervals(coverage).some((m) => m.start <= periodStart && m.end >= periodEnd);
}

// Trous restants dans [periodStart, periodEnd] après fusion des plages déjà
// prises — utilisé par le bouton "Je m'en charge (reste)" pour ne proposer
// que ce qui n'est pas encore couvert, plutôt que toute la période d'origine.
export function computeRelaisGaps(
  coverage: RelaisCoverageRange[],
  periodStart: string,
  periodEnd: string,
): { start_date: string; end_date: string }[] {
  const merged = mergeIntervals(coverage).filter((m) => m.end >= periodStart && m.start <= periodEnd);
  const gaps: { start_date: string; end_date: string }[] = [];
  let cursor = periodStart;
  for (const m of merged) {
    if (m.start > cursor) {
      gaps.push({ start_date: cursor, end_date: toISO(addDays(new Date(m.start + "T12:00:00"), -1)) });
    }
    if (m.end >= cursor) cursor = toISO(addDays(new Date(m.end + "T12:00:00"), 1));
  }
  if (cursor <= periodEnd) {
    gaps.push({ start_date: cursor, end_date: periodEnd });
  }
  return gaps;
}
