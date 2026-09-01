import { supabase } from "@/lib/supabase";

// Wrappers autour des RPC serveur de reconnaissance visiteur (voir
// supabase/migrations/20260901_visitor_profiles_pin_auth.sql). visitor_profiles
// est verrouillée derrière ces fonctions SECURITY DEFINER depuis cette
// migration : plus aucun insert/update/delete direct n'est autorisé pour
// anon/authenticated.
export type VisitorProfileRow = {
  id: string;
  prenom: string;
  nom: string;
  photo: string | null;
  motto: string | null;
  relation: string | null;
};

export async function loginVisitorProfile(
  spaceId: string,
  prenom: string,
  nom: string,
  pin: string,
): Promise<VisitorProfileRow | null> {
  const { data, error } = await supabase.rpc("rpc_visitor_login", {
    p_space_id: spaceId,
    p_prenom: prenom,
    p_nom: nom,
    p_pin: pin,
  });
  if (error || !data || data.length === 0) return null;
  return data[0] as VisitorProfileRow;
}

export async function claimOrCreateVisitorProfile(
  spaceId: string,
  prenom: string,
  nom: string,
  pin: string,
  relation?: string | null,
): Promise<{ ok: true; row: VisitorProfileRow } | { ok: false; reason: "duplicate" | "error" }> {
  const { data, error } = await supabase.rpc("rpc_visitor_claim_or_create", {
    p_space_id: spaceId,
    p_prenom: prenom,
    p_nom: nom,
    p_pin: pin,
    p_relation: relation ?? null,
  });
  if (error) {
    return { ok: false, reason: error.code === "23505" ? "duplicate" : "error" };
  }
  if (!data || data.length === 0) return { ok: false, reason: "error" };
  return { ok: true, row: data[0] as VisitorProfileRow };
}

// Best-effort, sur le même principe que les anciens upserts directs qu'elles
// remplacent dans app/(visitor)/account.tsx : si le pin local ne matche plus
// rien côté serveur (session corrompue/désynchro), l'UPDATE touche 0 ligne
// sans erreur, on se contente de logguer.
export async function updateVisitorPhoto(
  spaceId: string,
  prenom: string,
  nom: string,
  pin: string,
  photo: string,
): Promise<void> {
  const { error } = await supabase.rpc("rpc_visitor_update_photo", {
    p_space_id: spaceId,
    p_prenom: prenom,
    p_nom: nom,
    p_pin: pin,
    p_photo: photo,
  });
  if (error) console.error("updateVisitorPhoto", error);
}

export async function updateVisitorMottoRelation(
  spaceId: string,
  prenom: string,
  nom: string,
  pin: string,
  motto: string | null,
  relation: string | null,
): Promise<void> {
  const { error } = await supabase.rpc("rpc_visitor_update_motto_relation", {
    p_space_id: spaceId,
    p_prenom: prenom,
    p_nom: nom,
    p_pin: pin,
    p_motto: motto,
    p_relation: relation,
  });
  if (error) console.error("updateVisitorMottoRelation", error);
}
