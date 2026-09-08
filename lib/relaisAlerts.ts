import { getVisitorSession } from "@/lib/visitorSession";
import { supabase } from "@/lib/supabase";
import type { Task, TaskRelaisCoverage } from "@/lib/types";
import type { Theme } from "@/lib/themes";
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
  const { data, error } = await supabase.from("task_relais_coverage").select("*").in("task_id", taskIds);
  if (error) console.error("[fetchMyRelaisCoverageByTask] query failed:", error);
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
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("space_id", spaceId)
    .eq("category", "relais")
    .eq("status", "ouvert");
  if (error) console.error("[fetchOpenRelaisAlerts] query failed:", error);
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

// "none" = personne n'a encore statué sur cette proposition (voir
// app/(admin)/coadmins.tsx) ; "active"/"revoked" reflètent
// patient_space_coadmins.active pour l'octroi rattaché à cette proposition
// précise (coverage_id, voir 20260908_coadmin_per_proposal.sql) — chaque
// proposition a son propre statut, indépendant des autres du même visiteur.
export type CoAdminProposalStatus = "none" | "pending" | "active" | "revoked";

// Formulation volontairement impersonnelle (pas "Tu es...") : utilisée à la
// fois pour la propre proposition du viewer (Mes Alertes > Historique) et
// pour celle des AUTRES personnes affichée à côté de leur nom (voir
// RelaisAlertModal.tsx et MyAlertsModal.tsx > "Besoins de relais", demande
// explicite : "le popup doit mentionner les autres propositions déjà faites,
// et si elles ont été validées par l'admin").
export function coAdminStatusLabel(status: CoAdminProposalStatus): string {
  switch (status) {
    case "active": return "✅ Validé par l'admin (co-administrateur·rice)";
    case "pending": return "⏳ En attente de validation par l'admin";
    case "revoked": return "🔒 Révoqué par l'admin";
    default: return "";
  }
}

export function coAdminStatusColor(status: CoAdminProposalStatus, C: Theme): string {
  if (status === "active") return C.success;
  if (status === "revoked") return C.danger;
  return C.gold;
}

export interface RelaisCoverageRangeWithStatus extends RelaisCoverageRange {
  id: string;
  coadminStatus: CoAdminProposalStatus;
}

export interface RelaisCoverageSummary {
  task: Task;
  ranges: RelaisCoverageRangeWithStatus[];
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
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("space_id", spaceId)
    .eq("category", "relais");
  if (error) console.error("[fetchMyRelaisCoverageHistory] query failed:", error);
  const tasks = (data as Task[] | null) ?? [];
  if (!tasks.length) return [];
  const myKey = relaisIdentityKey(identity.prenom, identity.nom);
  const myCoverage = await fetchMyRelaisCoverageByTask(tasks.map((t) => t.id), myKey);
  const myRows = tasks.filter((t) => myCoverage[t.id]?.length).flatMap((t) => myCoverage[t.id]);
  const coverageIds = myRows.map((r) => r.id);

  // Statut d'octroi par proposition — une seule requête pour tout
  // l'historique plutôt qu'une par ligne (voir ask "je dois voir ma
  // proposition dans le message d'alerte", Mes Alertes).
  const statusByCoverageId = new Map<string, CoAdminProposalStatus>();
  if (coverageIds.length) {
    const { data: grants, error: grantsError } = await supabase
      .from("patient_space_coadmins")
      .select("coverage_id, active, accepted_at")
      .in("coverage_id", coverageIds);
    if (grantsError) console.error("[fetchMyRelaisCoverageHistory] grants query failed:", grantsError);
    (grants ?? []).forEach((g: any) => {
      if (!g.coverage_id) return;
      const status: CoAdminProposalStatus = !g.active ? "revoked" : (g.accepted_at ? "active" : "pending");
      statusByCoverageId.set(g.coverage_id, status);
    });
  }

  return tasks
    .filter((t) => myCoverage[t.id]?.length)
    .map((t) => {
      const ranges = myCoverage[t.id].map((r) => ({
        id: r.id,
        start_date: r.start_date,
        end_date: r.end_date,
        coadminStatus: statusByCoverageId.get(r.id) ?? "none",
      }));
      const fullyCovered = !!t.relais_start_date && !!t.date_limite
        && isRelaisFullyCovered(ranges, t.relais_start_date, t.date_limite);
      return { task: t, ranges, fullyCovered };
    });
}

export interface RelaisTaskProposal {
  id: string;
  prenom: string;
  nom: string;
  startDate: string;
  endDate: string;
  fullPeriod: boolean;
  coadminStatus: CoAdminProposalStatus;
}

// Toutes les propositions (task_relais_coverage, toutes identités confondues)
// posées sur ces besoins, groupées par task_id et triées chronologiquement
// par date de prise en charge — utilisé par RelaisAlertModal (popup) et
// MyAlertsModal ("Besoins de relais") pour répondre à la demande explicite :
// "le popup d'alerte doit mentionner les autres propositions déjà faites (et
// par qui), et si elles ont été validées par l'admin". Les deux appelants ne
// listent que des besoins pas encore couverts par le viewer lui-même (voir
// fetchOpenRelaisAlerts ci-dessus), donc chaque proposition retournée ici est
// nécessairement celle de quelqu'un d'autre — pas besoin d'exclure l'identité
// du viewer.
export async function fetchRelaisTaskProposals(taskIds: string[]): Promise<Record<string, RelaisTaskProposal[]>> {
  if (!taskIds.length) return {};
  const { data, error } = await supabase
    .from("task_relais_coverage")
    .select("id, task_id, prenom, nom, start_date, end_date, full_period")
    .in("task_id", taskIds)
    .order("start_date", { ascending: true });
  if (error) { console.error("[fetchRelaisTaskProposals] query failed:", error); return {}; }
  const rows = data ?? [];
  const coverageIds = rows.map((r) => r.id);

  const statusByCoverageId = new Map<string, CoAdminProposalStatus>();
  if (coverageIds.length) {
    const { data: grants, error: grantsError } = await supabase
      .from("patient_space_coadmins")
      .select("coverage_id, active, accepted_at")
      .in("coverage_id", coverageIds);
    if (grantsError) console.error("[fetchRelaisTaskProposals] grants query failed:", grantsError);
    (grants ?? []).forEach((g: any) => {
      if (!g.coverage_id) return;
      statusByCoverageId.set(g.coverage_id, !g.active ? "revoked" : (g.accepted_at ? "active" : "pending"));
    });
  }

  const byTask: Record<string, RelaisTaskProposal[]> = {};
  rows.forEach((r) => {
    (byTask[r.task_id] ?? (byTask[r.task_id] = [])).push({
      id: r.id,
      prenom: r.prenom,
      nom: r.nom,
      startDate: r.start_date,
      endDate: r.end_date,
      fullPeriod: r.full_period,
      coadminStatus: statusByCoverageId.get(r.id) ?? "none",
    });
  });
  return byTask;
}
