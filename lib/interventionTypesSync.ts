import { supabase } from "@/lib/supabase";
import type { InterventionType } from "@/lib/types";

// Un même intervenant a une fiche (intervenant_profiles) indépendante par
// espace patient auquel il est rattaché (voir IntervenantFicheModal.tsx) —
// "Mes espaces" (lib/intervenantSpaceSwitch.ts) les relie entre elles via le
// téléphone normalisé. Les soins (intervention_types) suivent chaque fiche
// individuellement ; les fonctions ci-dessous les gardent synchronisés
// partout où l'intervenant intervient, pour qu'un soin créé sur un espace
// soit immédiatement disponible sur les autres (Fiche intervenant / Soins /
// Réservation de créneau).
async function getSiblingProfileIds(intervenantProfileId: string): Promise<string[]> {
  const { data: self } = await supabase
    .from("intervenant_profiles")
    .select("telephone")
    .eq("id", intervenantProfileId)
    .maybeSingle();
  if (!self?.telephone) return [];
  const { data: siblings } = await supabase
    .from("intervenant_profiles")
    .select("id")
    .eq("telephone", self.telephone)
    .neq("id", intervenantProfileId);
  return (siblings ?? []).map((s) => s.id);
}

// Soins de cette fiche, complétés automatiquement avec ceux créés sur une
// fiche jumelle (autre espace, même téléphone) mais absents ici — plutôt que
// de simplement fusionner l'affichage, on crée la ligne manquante côté
// serveur pour que ce soin reste sélectionnable par la RPC book_intervention
// (qui exige un intervention_type_id appartenant à CE profil).
export async function getSyncedInterventionTypes(intervenantProfileId: string): Promise<InterventionType[]> {
  const siblingIds = await getSiblingProfileIds(intervenantProfileId);
  const allIds = [intervenantProfileId, ...siblingIds];
  const { data } = await supabase
    .from("intervention_types")
    .select("*")
    .in("intervenant_profile_id", allIds)
    .order("created_at", { ascending: true });
  const rows = data ?? [];
  const mine = rows.filter((t) => t.intervenant_profile_id === intervenantProfileId);
  if (siblingIds.length === 0) return mine;

  const mineLabels = new Set(mine.map((t) => t.label));
  const missing = new Map<string, { label: string; duration_minutes: number }>();
  for (const t of rows) {
    if (!mineLabels.has(t.label) && !missing.has(t.label)) {
      missing.set(t.label, { label: t.label, duration_minutes: t.duration_minutes });
    }
  }
  if (missing.size === 0) return mine;

  const { data: created } = await supabase
    .from("intervention_types")
    .insert(Array.from(missing.values()).map((m) => ({ intervenant_profile_id: intervenantProfileId, ...m })))
    .select("*");
  return [...mine, ...(created ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

// À appeler juste après la création/modification/suppression d'un soin
// (SoinFormModal.tsx, IntervenantFicheModal.tsx) pour répercuter le même
// changement sur les fiches jumelles — matching par ancien libellé
// (oldLabel côté update), avec création si aucune ligne ne correspond
// plutôt que de laisser une fiche jumelle désynchronisée. Best-effort : un
// échec ici ne doit jamais faire échouer l'action principale de l'appelant.
export async function propagateSoinChange(
  intervenantProfileId: string,
  change:
    | { type: "create"; label: string; duration_minutes: number }
    | { type: "update"; oldLabel: string; label: string; duration_minutes: number }
    | { type: "delete"; label: string },
): Promise<void> {
  try {
    const siblingIds = await getSiblingProfileIds(intervenantProfileId);
    if (siblingIds.length === 0) return;

    if (change.type === "delete") {
      await supabase.from("intervention_types").delete().in("intervenant_profile_id", siblingIds).eq("label", change.label);
      return;
    }

    const matchLabel = change.type === "update" ? change.oldLabel : change.label;
    const { data: matches } = await supabase
      .from("intervention_types")
      .select("id, intervenant_profile_id")
      .in("intervenant_profile_id", siblingIds)
      .eq("label", matchLabel);
    const matchedIds = (matches ?? []).map((m) => m.id);
    const matchedProfileIds = new Set((matches ?? []).map((m) => m.intervenant_profile_id));

    if (matchedIds.length > 0) {
      await supabase.from("intervention_types").update({ label: change.label, duration_minutes: change.duration_minutes }).in("id", matchedIds);
    }
    const missingProfileIds = siblingIds.filter((id) => !matchedProfileIds.has(id));
    if (missingProfileIds.length > 0) {
      await supabase.from("intervention_types").insert(
        missingProfileIds.map((id) => ({ intervenant_profile_id: id, label: change.label, duration_minutes: change.duration_minutes })),
      );
    }
  } catch (e) {
    console.error("[interventionTypesSync] propagateSoinChange failed:", e);
  }
}
