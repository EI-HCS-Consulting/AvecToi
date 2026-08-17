import { supabase } from "./supabase";
import type { PatientSpace } from "./types";

// Politique de conservation RGPD — durée initiale à la création d'un espace
// (components/PatientOnboarding.tsx) et incrément du bouton "Prolonger"
// (app/(admin)/settings.tsx, components/MyAlertsModal.tsx,
// components/RgpdAlertModal.tsx). Ne change rien pour les espaces déjà
// créés : purge_scheduled_at n'est recalculé qu'à la création ou à un clic
// sur "Prolonger", jamais rétroactivement.
export const RGPD_DEFAULT_RETENTION_DAYS = 60;
export const RGPD_EXTENSION_DAYS = 30;
// Fenêtre d'alerte avant suppression (popup à l'ouverture de l'app + entrée
// dans "Mes alertes") — s'aligne sur l'alerte email J-7 déjà envoyée par
// supabase/functions/rgpd-purge/index.ts.
export const RGPD_ALERT_WINDOW_DAYS = 7;

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function purgeDaysLeft(purgeScheduledAt: string): number {
  const purgeDate = new Date(purgeScheduledAt);
  const todayMs = new Date().setHours(0, 0, 0, 0);
  return Math.ceil((purgeDate.getTime() - todayMs) / (1000 * 60 * 60 * 24));
}

export function isRgpdAlertActive(space: Pick<PatientSpace, "purge_scheduled_at">): boolean {
  return purgeDaysLeft(space.purge_scheduled_at) <= RGPD_ALERT_WINDOW_DAYS;
}

export function rgpdAlertMessage(space: Pick<PatientSpace, "purge_scheduled_at">): string {
  const daysLeft = purgeDaysLeft(space.purge_scheduled_at);
  const purgeDateFr = new Date(space.purge_scheduled_at).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });
  return daysLeft > 0
    ? `Les données de cet espace seront supprimées le ${purgeDateFr} (dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}), conformément à la politique RGPD. Prolonge de ${RGPD_EXTENSION_DAYS} jours pour les conserver plus longtemps.`
    : `Les données de cet espace ont atteint leur date de conservation (${purgeDateFr}) et vont être supprimées. Prolonge de ${RGPD_EXTENSION_DAYS} jours pour les conserver.`;
}

// Met à jour purge_scheduled_at (+ end_date, gardé synchronisé depuis
// l'origine — voir PatientOnboarding.tsx) en base. Renvoie le patch appliqué
// (à répercuter sur le contexte via patchSpace si besoin d'un affichage
// immédiat) ou null en cas d'erreur.
export async function prolongSpace(
  space: Pick<PatientSpace, "id" | "purge_scheduled_at" | "end_date">,
): Promise<{ purge_scheduled_at: string; end_date: string } | null> {
  const newPurge = new Date(space.purge_scheduled_at);
  newPurge.setDate(newPurge.getDate() + RGPD_EXTENSION_DAYS);
  const newEnd = new Date(space.end_date + "T00:00:00");
  newEnd.setDate(newEnd.getDate() + RGPD_EXTENSION_DAYS);

  const patch = { purge_scheduled_at: newPurge.toISOString(), end_date: isoDate(newEnd) };
  const { error } = await supabase.from("patient_spaces").update(patch).eq("id", space.id);
  return error ? null : patch;
}
