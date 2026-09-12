import { supabase } from "@/lib/supabase";
import { toISO } from "@/lib/slotUtils";
import type { Task } from "@/lib/types";

// Catégories couvertes par le rappel d'échéance (popup à l'ouverture de
// l'app, voir TaskDueTodayAlertModal.tsx) : transport a son propre statut de
// complétion dédié ("C'est fait" + transportOverdue, voir Entraide.tsx),
// relais se ferme par l'admin (closeRelais, pas de preneur unique) et
// courses se termine automatiquement dès que tous les articles sont cochés
// (voir avectoi_courses_cochage_branch) — aucun des trois n'a besoin d'un
// rappel personnel "C'est fait" pour le preneur.
const REMINDED_CATEGORIES: Task["category"][] = ["repas", "affaires", "administratif", "autre"];

export interface DueTodayIdentity {
  isAdmin: boolean;
  prenom: string;
  nom: string;
  pin: string;
}

// Besoins pris en charge par cette identité (claimed_by_*) dont l'échéance
// (date_limite) tombe aujourd'hui — popup de rappel à l'ouverture de l'app,
// même principe "une alerte à la fois" que RelaisAlertModal/
// DeletedContentAlertModal. Comparaison pin+prénom+nom (pas le PIN seul, qui
// peut collider entre 2 visiteurs — voir avectoi_pin_only_identity_check_bug_class),
// sauf côté admin où seul le sentinel claimed_by_pin==="ADMIN" identifie "moi"
// (même contournement que isMyBesoin dans Entraide.tsx).
export async function fetchDueTodayCommitments(spaceId: string, identity: DueTodayIdentity): Promise<Task[]> {
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
  return (data as Task[] | null) ?? [];
}
