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

// Récupération de code depuis l'écran de connexion ("Qui êtes-vous ?") après
// une réinitialisation admin : n'importe quel code saisi devient le nouveau
// PIN, mais seulement s'il existe bien un profil non réclamé (pin NULL)
// correspondant exactement au prénom/nom — sinon renvoie null (voir
// rpc_visitor_claim_reset, 20260901_visitor_claim_reset_pin.sql).
export async function claimResetVisitorPin(
  spaceId: string,
  prenom: string,
  nom: string,
  pin: string,
): Promise<VisitorProfileRow | null> {
  const { data, error } = await supabase.rpc("rpc_visitor_claim_reset", {
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

// Email vérifié par code (voir lib/coAdmin.ts verifyCoAdminProposalCode,
// écrit côté serveur par verify_coadmin_proposal_code) — lu pour pré-remplir
// Mon compte / Mes informations et pour sauter les étapes email/code d'une
// prochaine proposition de relais (voir Entraide.tsx, openClaim).
export async function getVisitorEmail(
  spaceId: string,
  prenom: string,
  nom: string,
  pin: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("rpc_visitor_get_email", {
    p_space_id: spaceId,
    p_prenom: prenom,
    p_nom: nom,
    p_pin: pin,
  });
  if (error) {
    console.error("getVisitorEmail", error);
    return null;
  }
  return (data as string | null) ?? null;
}

// Écriture directe depuis Mon compte / Mes informations — pas de
// vérification par code ici, la session visiteur (PIN déjà saisi à la
// connexion) suffit, même garde-fou que updateVisitorPhoto/
// updateVisitorMottoRelation ci-dessus.
export async function updateVisitorEmail(
  spaceId: string,
  prenom: string,
  nom: string,
  pin: string,
  email: string,
): Promise<void> {
  const { error } = await supabase.rpc("rpc_visitor_update_email", {
    p_space_id: spaceId,
    p_prenom: prenom,
    p_nom: nom,
    p_pin: pin,
    p_email: email,
  });
  if (error) console.error("updateVisitorEmail", error);
}

// Sans pin (le visiteur qui arrive ici l'a justement perdu) — juste un
// booléen pour savoir si "Réinitialiser mon code par email" doit être
// affiché sur l'écran "Qui êtes-vous ?" (voir app/auth/visitor-identify.tsx).
export async function hasVisitorEmailOnFile(
  spaceId: string,
  prenom: string,
  nom: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("rpc_visitor_has_email", {
    p_space_id: spaceId,
    p_prenom: prenom,
    p_nom: nom,
  });
  if (error) {
    console.error("hasVisitorEmailOnFile", error);
    return false;
  }
  return !!data;
}

// Admin-only (voir 20260901_visitor_admin_reset_pin.sql) : remet le pin à
// NULL pour que le visiteur puisse récupérer son profil via l'écran de
// création existant, avec un nouveau code de son choix.
export async function adminResetVisitorPin(
  spaceId: string,
  visitorId: string,
): Promise<boolean> {
  const { error } = await supabase.rpc("rpc_admin_reset_visitor_pin", {
    p_space_id: spaceId,
    p_visitor_id: visitorId,
  });
  if (error) {
    console.error("adminResetVisitorPin", error);
    return false;
  }
  return true;
}
