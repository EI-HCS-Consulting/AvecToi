import { supabase } from "./supabase";
import type { PatientSpace } from "./types";

// Politique de conservation RGPD — durée initiale à la création d'un espace
// (components/PatientOnboarding.tsx) et incrément du bouton "Prolonger"
// (app/(admin)/settings.tsx, components/MyAlertsModal.tsx,
// components/RgpdAlertModal.tsx). Ne change rien pour les espaces déjà
// créés : purge_scheduled_at n'est recalculé qu'à la création, au clic sur
// "Prolonger" (Premium uniquement) ou au passage Freemium → Premium, jamais
// rétroactivement en dehors de ces trois points.
//
// Différenciée par plan depuis le 04/09/2026 (aligné sur avectoi.care v4,
// PRD_AvecToi_v1_4.md §3.12/§10bis) : Freemium n'a pas de prolongation.
export const RGPD_RETENTION_DAYS_FREEMIUM = 30;
export const RGPD_RETENTION_DAYS_PREMIUM = 60;
export const RGPD_EXTENSION_DAYS = 30; // Premium uniquement, renouvelable
// Fenêtre d'alerte avant suppression (popup à l'ouverture de l'app + entrée
// dans "Mes alertes") — s'aligne sur l'alerte email J-7 déjà envoyée par
// supabase/functions/rgpd-purge/index.ts.
export const RGPD_ALERT_WINDOW_DAYS = 7;

export function retentionDaysForSpace(space: Pick<PatientSpace, "premium">): number {
  return space.premium ? RGPD_RETENTION_DAYS_PREMIUM : RGPD_RETENTION_DAYS_FREEMIUM;
}

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

export function rgpdAlertMessage(space: Pick<PatientSpace, "purge_scheduled_at" | "premium">): string {
  const daysLeft = purgeDaysLeft(space.purge_scheduled_at);
  const purgeDateFr = new Date(space.purge_scheduled_at).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });
  const invite = space.premium
    ? `Prolonge de ${RGPD_EXTENSION_DAYS} jours pour les conserver plus longtemps.`
    : `Passe en Premium pour pouvoir les conserver plus longtemps.`;
  return daysLeft > 0
    ? `Les données de cet espace seront supprimées le ${purgeDateFr} (dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}), conformément à la politique RGPD. ${invite}`
    : `Les données de cet espace ont atteint leur date de conservation (${purgeDateFr}) et vont être supprimées. ${invite}`;
}

// Message affiché quand on clique "Prolonger" hors fenêtre d'alerte (plus de
// RGPD_ALERT_WINDOW_DAYS jours avant l'échéance) — voir handleProlong,
// app/(admin)/settings.tsx. Le bouton reste visible et cliquable en tout
// temps, mais ne prolonge réellement qu'à partir de J-7 (isRgpdAlertActive) :
// empêche de cliquer 10 fois d'avance pour repousser indéfiniment la date
// avant même d'être dans la fenêtre. Une fois la prolongation effective
// appliquée, la nouvelle échéance retombe hors fenêtre (+30 jours), donc un
// nouveau clic immédiat retombe automatiquement sur ce message — pas besoin
// d'un flag "déjà utilisé" séparé en base.
export function rgpdEarlyProlongMessage(space: Pick<PatientSpace, "purge_scheduled_at">): string {
  const daysLeft = purgeDaysLeft(space.purge_scheduled_at);
  return `Il reste encore ${daysLeft} jour${daysLeft > 1 ? "s" : ""} avant l'échéance de conservation des données. Un rappel te sera envoyé ${RGPD_ALERT_WINDOW_DAYS} jours avant : tu pourras alors prolonger gratuitement de ${RGPD_EXTENSION_DAYS} jours.`;
}

// Prolongation réservée aux espaces Premium depuis le 04/09/2026 (§3.12) —
// un espace Freemium n'a pas de bouton "Prolonger" actif ; voir
// canProlongSpace dans lib/freemiumCap.ts pour le garde-fou UI.

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
