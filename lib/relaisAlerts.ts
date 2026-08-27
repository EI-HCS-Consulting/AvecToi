import { getVisitorSession } from "@/lib/visitorSession";
import { supabase } from "@/lib/supabase";
import type { Task, TaskRelaisCoverage } from "@/lib/types";
import { isRelaisFullyCovered, type RelaisCoverageRange } from "@/lib/relaisCoverage";

// Comparaison d'identité insensible à la casse/aux accents, utilisée partout
// où on doit reconnaître "la même personne" entre une session locale
// (visiteur) ou l'utilisateur Supabase Auth (admin) et un prénom/nom stocké
// en base (auteur, destinataire ciblé, personne ayant écarté l'alerte...).
export function relaisIdentityKey(prenom: string, nom: string) {
  return `${prenom}|${nom}`.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Résout "qui suis-je" pour les besoins de relais : côté admin, l'identité
// vient des métadonnées Supabase Auth ; côté visiteur, de la session locale
// (voir lib/visitorSession.ts, aucun compte Supabase Auth n'existe pour ce
// rôle).
export async function resolveRelaisIdentity(isAdmin: boolean): Promise<{ prenom: string; nom: string }> {
  if (isAdmin) {
    const { data } = await supabase.auth.getUser();
    return {
      prenom: (data.user?.user_metadata?.firstname ?? "").trim(),
      nom: (data.user?.user_metadata?.lastname ?? "").trim(),
    };
  }
  const session = await getVisitorSession();
  return { prenom: session?.prenom ?? "", nom: session?.nom ?? "" };
}

// Regroupe les lignes task_relais_coverage appartenant à cette identité par
// task_id — utilisé à la fois pour exclure des alertes actives un besoin
// déjà partiellement/totalement pris (fetchOpenRelaisAlerts) et pour
// alimenter l'historique correspondant (fetchMyRelaisCoverageHistory).
async function fetchMyRelaisCoverageByTask(
  taskIds: string[],
  myKey: string,
): Promise<Record<string, TaskRelaisCoverage[]>> {
  if (!taskIds.length) return {};
  const { data } = await supabase.from("task_relais_coverage").select("*").in("task_id", taskIds);
  const rows = (data as TaskRelaisCoverage[] | null) ?? [];
  const byTask: Record<string, TaskRelaisCoverage[]> = {};
  rows.forEach((r) => {
    if (relaisIdentityKey(r.prenom, r.nom) !== myKey) return;
    (byTask[r.task_id] ?? (byTask[r.task_id] = [])).push(r);
  });
  return byTask;
}

// Charge les besoins de relais ouverts ciblant l'identité donnée : exclut
// les tâches publiées par cette même identité, filtre par ciblage
// (relais_visible_to==="some" -> doit figurer dans relais_recipients),
// exclut celles déjà écartées définitivement (relais_dismissed_by), et
// exclut aussi celles où l'identité a déjà posé au moins une ligne de
// couverture (certains jours ou la totalité) — inutile de la solliciter à
// nouveau, elle retrouve ce besoin dans "Historique" via
// fetchMyRelaisCoverageHistory. Utilisé à la fois par le popup
// RelaisAlertModal et par "Mes alertes".
export async function fetchOpenRelaisAlerts(
  spaceId: string,
  isAdmin: boolean,
  identity: { prenom: string; nom: string },
): Promise<Task[]> {
  const { data } = await supabase
    .from("tasks")
    .select("*")
    .eq("space_id", spaceId)
    .eq("category", "relais")
    .eq("status", "ouvert");
  const tasks = (data as Task[] | null) ?? [];
  const myKey = relaisIdentityKey(identity.prenom, identity.nom);
  const candidates = tasks.filter((t) => {
    const isSelfAuthor = isAdmin
      ? t.author_pin === "ADMIN"
      : relaisIdentityKey(t.author_prenom ?? "", t.author_nom ?? "") === myKey;
    if (isSelfAuthor) return false;
    const targeted = t.relais_visible_to !== "some"
      || (t.relais_recipients ?? []).some((r) => relaisIdentityKey(r.prenom, r.nom) === myKey);
    if (!targeted) return false;
    const dismissed = t.relais_dismissed_by.some((d) => relaisIdentityKey(d.prenom, d.nom) === myKey);
    return !dismissed;
  });
  const myCoverage = await fetchMyRelaisCoverageByTask(candidates.map((t) => t.id), myKey);
  return candidates.filter((t) => !myCoverage[t.id]?.length);
}

export interface RelaisCoverageSummary {
  task: Task;
  ranges: RelaisCoverageRange[];
  fullyCovered: boolean;
}

// Besoins de relais (n'importe quel statut) où l'identité a déjà posé au
// moins une ligne de couverture — pour "Historique" de Mes Alertes,
// symétrique de l'exclusion faite dans fetchOpenRelaisAlerts ci-dessus.
// fullyCovered indique si l'identité a couvert la période demandée à elle
// seule (pas le statut global du besoin, qui peut être partagé avec
// d'autres contributeurs — voir lib/relaisCoverage.ts).
export async function fetchMyRelaisCoverageHistory(
  spaceId: string,
  identity: { prenom: string; nom: string },
): Promise<RelaisCoverageSummary[]> {
  const { data } = await supabase
    .from("tasks")
    .select("*")
    .eq("space_id", spaceId)
    .eq("category", "relais");
  const tasks = (data as Task[] | null) ?? [];
  if (!tasks.length) return [];
  const myKey = relaisIdentityKey(identity.prenom, identity.nom);
  const myCoverage = await fetchMyRelaisCoverageByTask(tasks.map((t) => t.id), myKey);
  return tasks
    .filter((t) => myCoverage[t.id]?.length)
    .map((t) => {
      const ranges = myCoverage[t.id].map((r) => ({ start_date: r.start_date, end_date: r.end_date }));
      const fullyCovered = !!t.relais_start_date && !!t.date_limite
        && isRelaisFullyCovered(ranges, t.relais_start_date, t.date_limite);
      return { task: t, ranges, fullyCovered };
    });
}
