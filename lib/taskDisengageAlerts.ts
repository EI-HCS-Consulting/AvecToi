import { supabase } from "@/lib/supabase";
import type { Task } from "@/lib/types";

// Voir supabase/migrations/20260913_task_disengage_alerts.sql — posé par
// performUnclaim/performRelaisCoverageUnclaim (Entraide.tsx) quand quelqu'un
// se désengage d'un besoin proche de son échéance (J-2 ou moins), pour
// prévenir à la fois l'admin et l'auteur du besoin.
export type TaskDisengageAlert = {
  id: string;
  space_id: string;
  task_id: string | null;
  task_title: string;
  disengaged_prenom: string;
  disengaged_nom: string;
  author_prenom: string | null;
  author_nom: string | null;
  date_limite: string | null;
  created_at: string;
  seen_by_admin: boolean;
  seen_by_author: boolean;
};

// Échéance effective d'un besoin, même calcul que taskPastDeadline dans
// Entraide.tsx (transport a sa propre date/heure structurée, les autres
// catégories utilisent date_limite) — dupliqué ici faute de pouvoir importer
// un helper interne au composant.
function effectiveDeadline(task: Task): Date | null {
  if (task.category === "transport") {
    const date = task.transport_confirmed_date || task.transport_date;
    if (!date) return null;
    const time = task.transport_confirmed_return_time || task.transport_return_time
      || task.transport_confirmed_out_time || task.transport_out_time || "23:59";
    return new Date(`${date}T${time}:00`);
  }
  if (!task.date_limite) return null;
  return new Date(`${task.date_limite}T23:59:59`);
}

// Insère une alerte seulement si l'échéance du besoin tombe dans 2 jours ou
// moins (J-2 ou moins) — même fenêtre "ou moins" que taskDueSoon (J+3), pas
// une correspondance exacte au jour J-2. Ne fait rien si le besoin n'a pas
// d'échéance connue (jamais "proche" dans ce cas). Le désengagement lui-même
// reste toujours possible tant que l'échéance n'est pas passée (voir
// taskPastDeadline) : cette fonction ne fait qu'informer, jamais bloquer.
export async function maybeRecordDisengageAlert(
  spaceId: string,
  task: Task,
  disengagedPrenom: string,
  disengagedNom: string,
): Promise<void> {
  const deadline = effectiveDeadline(task);
  if (!deadline) return;
  const threshold = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  if (deadline.getTime() > threshold.getTime()) return;
  if (!disengagedPrenom.trim() || !disengagedNom.trim()) return;
  const { error } = await supabase.from("task_disengage_alerts").insert({
    space_id: spaceId,
    task_id: task.id,
    task_title: task.title,
    disengaged_prenom: disengagedPrenom.trim(),
    disengaged_nom: disengagedNom.trim(),
    author_prenom: task.author_prenom ?? null,
    author_nom: task.author_nom ?? null,
    date_limite: task.date_limite ?? null,
  });
  if (error) console.error("maybeRecordDisengageAlert", error);
}

export async function fetchOpenDisengageAlertsForAdmin(spaceId: string): Promise<TaskDisengageAlert[]> {
  const { data, error } = await supabase
    .from("task_disengage_alerts")
    .select("*")
    .eq("space_id", spaceId)
    .eq("seen_by_admin", false)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("fetchOpenDisengageAlertsForAdmin", error);
    return [];
  }
  return data || [];
}

// Filtré par identité (prenom/nom de l'auteur) — pas de compte, donc pas
// d'id stable à filtrer, même principe que fetchPinResetHistory.
export async function fetchOpenDisengageAlertsForAuthor(
  spaceId: string,
  identity: { prenom: string; nom: string },
): Promise<TaskDisengageAlert[]> {
  if (!identity.prenom.trim() || !identity.nom.trim()) return [];
  const { data, error } = await supabase
    .from("task_disengage_alerts")
    .select("*")
    .eq("space_id", spaceId)
    .eq("seen_by_author", false)
    .ilike("author_prenom", identity.prenom)
    .ilike("author_nom", identity.nom)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("fetchOpenDisengageAlertsForAuthor", error);
    return [];
  }
  return data || [];
}

export async function markDisengageAlertSeenByAdmin(id: string): Promise<void> {
  const { error } = await supabase.from("task_disengage_alerts").update({ seen_by_admin: true }).eq("id", id);
  if (error) console.error("markDisengageAlertSeenByAdmin", error);
}

export async function markDisengageAlertSeenByAuthor(id: string): Promise<void> {
  const { error } = await supabase.from("task_disengage_alerts").update({ seen_by_author: true }).eq("id", id);
  if (error) console.error("markDisengageAlertSeenByAuthor", error);
}
