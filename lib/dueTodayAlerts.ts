import { supabase } from "@/lib/supabase";
import { toISO } from "@/lib/slotUtils";
import type { Task } from "@/lib/types";

// Catégories couvertes par le rappel d'échéance "classique" (popup à
// l'ouverture de l'app, voir TaskDueTodayAlertModal.tsx) : transport a son
// propre statut de complétion dédié ("C'est fait" + transportOverdue, voir
// Entraide.tsx) et relais se ferme par l'admin (closeRelais, pas de preneur
// unique) — ni l'un ni l'autre n'a besoin d'un rappel personnel "C'est fait"
// pour le preneur. Courses est traité séparément ci-dessous : contrairement
// aux autres catégories, une liste peut être "ouverte" (dispatch libre, pas
// de claimed_by_*) tout en ayant des articles cochés par plusieurs
// personnes — le rappel doit alors partir vers CHAQUE personne ayant coché
// au moins un article, avec la liste de ses articles.
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
  return [...alerts, ...coursesAlerts];
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

  const { data: itemRows, error: itemErr } = await supabase
    .from("shopping_list_items")
    .select("task_id, label, bought_by_prenom, bought_by_nom")
    .in("task_id", tasks.map((t) => t.id))
    .eq("bought", true);
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
