import type { PatientSpace, Reservation } from "./types";

export const FREE_VISIT_LIMIT = 8;

export function isSpaceCapped(space: PatientSpace | null, reservations: Reservation[]): boolean {
  if (!space || space.premium) return false;
  return reservations.filter((r) => r.type === "Visite").length >= FREE_VISIT_LIMIT;
}
