import type { PatientSpace, Reservation } from "./types";

export const FREE_VISIT_LIMIT = 8;

// Mis en pause pendant la phase d'élaboration/création (voir aussi
// supabase/migrations/20260705_pause_freemium_cap.sql côté base) — à
// réactiver avant l'ouverture au public en restaurant la ligne ci-dessous.
export function isSpaceCapped(_space: PatientSpace | null, _reservations: Reservation[]): boolean {
  return false;
  // if (!space || space.premium) return false;
  // return reservations.filter((r) => r.type === "Visite").length >= FREE_VISIT_LIMIT;
}
