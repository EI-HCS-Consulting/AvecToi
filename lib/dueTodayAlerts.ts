import { supabase } from "@/lib/supabase";
import { toISO } from "@/lib/slotUtils";
import type { Task } from "@/lib/types";

// Catégories couvertes par le rappel d'échéance "classique" (popup à
// l'ouverture de l'app, voir TaskDueTodayAlertModal.tsx) : relais se ferme
// par l'admin (closeRelais, pas de preneur unique), il n'a donc pas besoin
// d'un rappel personnel "C'est fait" pour un preneur. Courses et transport
// sont traités séparément ci-dessous, chacun avec sa propre notion
// d'échéance/de preneur — transport n'a pas de date_limite (l'échéance est
// transport_confirmed_date, fixée par validateTransportLeg dans Entraide.tsx)
// et son preneur est soit claimed_by_* (aller) soit
// transport_return_claimed_by_* (retour), potentiellement 2 personnes
// différentes.
const REMINDED_CATEGORIES: Task["category"][] = ["repas", "affaires", "administratif", "autre"];

export interface DueTodayIdentity {
  isAdmin: boolean;
  prenom: string;
  nom: string;
  pin: string;
}

// Une alerte à afficher : le besoin concerné, et pour les courses la liste
// des articles précisément attribués à cette identité (absent/undefined pour
// les autres catégories, où l'attribution porte sur le besoin entier).
export interface DueTodayAlert {
  task: Task;
  items?: string[];
  transport?: DueTodayTransportDetail;
}

// Détail transport précalculé pour l'affichage (voir fetchDueTodayTransport) :
// "driver" = c'est moi qui conduis (aller et/ou retour) ; "author" = j'ai
// publié ce besoin (ou j'en suis le bénéficiaire nommé via transport_for_*)
// et je veux savoir qui s'en occupe. doingOut/doingReturn ne sont
// significatifs que pour le rôle "driver" (quelle(s) jambe(s) je fais moi-même) ;
// outDriver/returnDriver sont utiles surtout pour "author" mais toujours
// renseignés.
export interface DueTodayTransportDetail {
  role: "driver" | "author";
  beneficiary: string | null;
  outTime: string | null;
  returnTime: string | null;
  roundTrip: boolean;
  doingOut: boolean;
  doingReturn: boolean;
  outDriver: string | null;
  returnDriver: string | null;
}

function fullName(prenom: string | null, nom: string | null): string | null {
  const n = [prenom, nom].filter((s) => !!s && s.trim()).join(" ").trim();
  return n || null;
}

// Lignes de détail transport prêtes à afficher (partagées app/web dans leur
// esprit, dupliquées ici comme le reste du fichier — voir port côté
// avectoi-site/lib/dashboard/dueTodayAlerts.ts).
export function transportDetailLines(t: DueTodayTransportDetail): string[] {
  const lines: string[] = [];
  if (t.role === "driver") {
    if (t.beneficiary) lines.push(`Pour : ${t.beneficiary}`);
    if (t.doingOut && t.outTime) lines.push(`Aller aujourd'hui à ${t.outTime}`);
    if (t.doingReturn && t.returnTime) lines.push(`Retour aujourd'hui à ${t.returnTime}`);
    if (t.roundTrip && !t.doingReturn && t.returnTime) lines.push(`Un retour est aussi prévu à ${t.returnTime}.`);
    if (t.roundTrip && !t.doingOut && t.outTime) lines.push(`Un aller est aussi prévu à ${t.outTime}.`);
  } else {
    lines.push(t.outDriver ? `Aller : ${t.outDriver}${t.outTime ? ` à ${t.outTime}` : ""}` : "Aller : pas encore pris en charge");
    if (t.roundTrip) {
      lines.push(t.returnDriver ? `Retour : ${t.returnDriver}${t.returnTime ? ` à ${t.returnTime}` : ""}` : "Retour : pas encore pris en charge");
    }
  }
  return lines;
}

// Besoins pris en charge par cette identité (claimed_by_*) dont l'échéance
// (date_limite) tombe aujourd'hui — popup de rappel à l'ouverture de l'app,
// même principe "une alerte à la fois" que RelaisAlertModal/
// DeletedContentAlertModal. Comparaison pin+prénom+nom (pas le PIN seul, qui
// peut collider entre 2 visiteurs — voir avectoi_pin_only_identity_check_bug_class),
// sauf côté admin où seul le sentinel claimed_by_pin==="ADMIN" identifie "moi"
// (même contournement que isMyBesoin dans Entraide.tsx).
export async function fetchDueTodayCommitments(spaceId: string, identity: DueTodayIdentity): Promise<DueTodayAlert[]> {
  if (!identity.isAdmin && (!identity.prenom.trim() || !identity.nom.trim() || !identity.pin)) return [];
  const today = toISO(new Date());

  let query = supabase
    .from("tasks")
    .select("*")
    .eq("space_id", spaceId)
    .eq("status", "pris_en_charge")
    .eq("date_limite", today)
    .in("category", REMINDED_CATEGORIES);
  query = identity.isAdmin
    ? query.eq("claimed_by_pin", "ADMIN")
    : query
        .eq("claimed_by_pin", identity.pin)
        .ilike("claimed_by_prenom", identity.prenom.trim())
        .ilike("claimed_by_nom", identity.nom.trim());
  const { data, error } = await query;
  if (error) {
    console.error("[fetchDueTodayCommitments] query failed:", error);
    return [];
  }
  const alerts: DueTodayAlert[] = ((data as Task[] | null) ?? []).map((task) => ({ task }));

  const coursesAlerts = await fetchDueTodayCourses(spaceId, today, identity);
  const transportAlerts = await fetchDueTodayTransport(spaceId, today, identity);
  return [...alerts, ...coursesAlerts, ...transportAlerts];
}

// Courses : pas de claimed_by_* unique — une liste peut rester "ouverte"
// (dispatch libre) ou "pris_en_charge" (claim formel) tant qu'elle n'est pas
// intégralement cochée. Le rappel part vers chaque personne ayant coché au
// moins un article de la liste, échéance aujourd'hui, quel que soit le
// statut du besoin (sauf "fait"/"ferme", déjà clos).
async function fetchDueTodayCourses(spaceId: string, today: string, identity: DueTodayIdentity): Promise<DueTodayAlert[]> {
  const myPrenom = identity.prenom.trim().toLowerCase();
  const myNom = identity.nom.trim().toLowerCase();
  if (!myPrenom || !myNom) return [];

  const { data: taskRows, error: taskErr } = await supabase
    .from("tasks")
    .select("*")
    .eq("space_id", spaceId)
    .eq("category", "courses")
    .eq("date_limite", today)
    .in("status", ["ouvert", "pris_en_charge"]);
  if (taskErr || !taskRows?.length) {
    if (taskErr) console.error("[fetchDueTodayCourses] tasks query failed:", taskErr);
    return [];
  }
  const tasks = taskRows as Task[];

  // "bought" = acheté (bouton "Fait"), pas "coché" (attribution) — le rappel
  // porte sur ce qu'il reste à acheter, donc les articles déjà attribués à
  // cette identité mais pas encore marqués achetés.
  const { data: itemRows, error: itemErr } = await supabase
    .from("shopping_list_items")
    .select("task_id, label, bought_by_prenom, bought_by_nom")
    .in("task_id", tasks.map((t) => t.id))
    .eq("bought", false);
  if (itemErr) {
    console.error("[fetchDueTodayCourses] items query failed:", itemErr);
    return [];
  }

  const alerts: DueTodayAlert[] = [];
  for (const task of tasks) {
    const mine = (itemRows ?? []).filter(
      (i) =>
        i.task_id === task.id
        && (i.bought_by_prenom ?? "").trim().toLowerCase() === myPrenom
        && (i.bought_by_nom ?? "").trim().toLowerCase() === myNom
    );
    if (mine.length) alerts.push({ task, items: mine.map((i) => i.label) });
  }
  return alerts;
}

// Transport : pas de date_limite ni de claimed_by_* unique — l'échéance est
// transport_confirmed_date et le preneur peut être l'aller (claimed_by_*) et/
// ou le retour (transport_return_claimed_by_*), potentiellement 2 personnes
// différentes pour un même besoin. On alerte dès que l'une des 2 jambes
// confirmées pour aujourd'hui est prise en charge par cette identité — un
// seul besoin ne produit jamais 2 alertes même si les 2 jambes tombent le
// même jour pour la même personne. Rôle "driver". Par ailleurs, l'auteur du
// besoin (ou son bénéficiaire nommé via transport_for_*, sans PIN dédié —
// voir isForPerson dans Entraide.tsx) reçoit lui aussi un rappel le jour J,
// rôle "author" — pour savoir qui vient le/la chercher et à quelle heure. Un
// même besoin ne produit jamais les 2 rôles pour la même identité (dédupliqué
// via driverIds) : peu probable en pratique, mais évite un doublon si la
// personne s'est arrangée elle-même son propre transport.
async function fetchDueTodayTransport(spaceId: string, today: string, identity: DueTodayIdentity): Promise<DueTodayAlert[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("space_id", spaceId)
    .eq("category", "transport")
    .eq("status", "pris_en_charge")
    .eq("transport_confirmed_date", today);
  if (error) {
    console.error("[fetchDueTodayTransport] query failed:", error);
    return [];
  }
  const tasks = (data as Task[] | null) ?? [];

  function legIsMine(pin: string | null, prenom: string | null, nom: string | null): boolean {
    if (identity.isAdmin) return pin === "ADMIN";
    if (!identity.prenom.trim() || !identity.nom.trim() || !identity.pin) return false;
    return (
      pin === identity.pin
      && (prenom ?? "").trim().toLowerCase() === identity.prenom.trim().toLowerCase()
      && (nom ?? "").trim().toLowerCase() === identity.nom.trim().toLowerCase()
    );
  }

  function authorIsMine(t: Task): boolean {
    if (identity.isAdmin) return t.author_pin === "ADMIN";
    if (!identity.prenom.trim() || !identity.nom.trim()) return false;
    const matches = (p: string | null, n: string | null) =>
      (p ?? "").trim().toLowerCase() === identity.prenom.trim().toLowerCase()
      && (n ?? "").trim().toLowerCase() === identity.nom.trim().toLowerCase();
    return matches(t.author_prenom, t.author_nom) || matches(t.transport_for_prenom, t.transport_for_nom);
  }

  function buildDetail(t: Task, role: "driver" | "author"): DueTodayTransportDetail {
    const outDriver = fullName(t.claimed_by_prenom, t.claimed_by_nom);
    const returnDriver = t.transport_round_trip
      ? fullName(t.transport_return_claimed_by_prenom, t.transport_return_claimed_by_nom) ?? outDriver
      : null;
    return {
      role,
      beneficiary: fullName(t.transport_for_prenom, t.transport_for_nom) ?? fullName(t.author_prenom, t.author_nom),
      outTime: t.transport_confirmed_out_time,
      returnTime: t.transport_confirmed_return_time,
      roundTrip: t.transport_round_trip,
      doingOut: legIsMine(t.claimed_by_pin, t.claimed_by_prenom, t.claimed_by_nom),
      doingReturn: legIsMine(t.transport_return_claimed_by_pin, t.transport_return_claimed_by_prenom, t.transport_return_claimed_by_nom),
      outDriver,
      returnDriver,
    };
  }

  const driverAlerts = tasks
    .filter(
      (t) =>
        legIsMine(t.claimed_by_pin, t.claimed_by_prenom, t.claimed_by_nom)
        || legIsMine(t.transport_return_claimed_by_pin, t.transport_return_claimed_by_prenom, t.transport_return_claimed_by_nom)
    )
    .map((task) => ({ task, transport: buildDetail(task, "driver") }));

  const driverIds = new Set(driverAlerts.map((a) => a.task.id));
  const authorAlerts = tasks
    .filter((t) => !driverIds.has(t.id) && authorIsMine(t))
    .map((task) => ({ task, transport: buildDetail(task, "author") }));

  return [...driverAlerts, ...authorAlerts];
}
