import type { PatientSpace, Reservation } from "./types";

// Remplace l'ancien cap à 8 réservations (voir git history) : au-delà de
// FREE_TRIAL_DAYS jours après la toute première "Visite" de l'espace, les
// visites illimitées gratuites s'arrêtent — même logique côté serveur dans
// check_visite_cap() (supabase/migrations/20260902_freemium_7day_window.sql).
export const FREE_TRIAL_DAYS = 7;

export function isSpaceCapped(space: PatientSpace | null, reservations: Reservation[]): boolean {
  if (!space || space.premium) return false;
  const visites = reservations.filter((r) => r.type === "Visite");
  if (visites.length === 0) return false;
  const firstTimestamp = visites.reduce(
    (min, r) => (r.timestamp < min ? r.timestamp : min),
    visites[0].timestamp,
  );
  const deadline = new Date(firstTimestamp);
  deadline.setDate(deadline.getDate() + FREE_TRIAL_DAYS);
  return new Date() >= deadline;
}

export function canEnableIntervenants(space: PatientSpace | null): boolean {
  if (!space) return false;
  return space.premium;
}
