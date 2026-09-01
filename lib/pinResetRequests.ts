import { supabase } from "@/lib/supabase";

// Voir supabase/migrations/20260901_pin_reset_requests.sql — demande envoyée
// par un visiteur bloqué (écran "Qui êtes-vous ?"), traitée côté admin via
// PinResetAlertModal (popup) et MyAlertsModal ("Mes alertes").
export type PinResetRequest = {
  id: string;
  space_id: string;
  visitor_id: string;
  prenom: string;
  nom: string;
  created_at: string;
  seen: boolean;
  resolved_at: string | null;
};

// Le rattachement se fait par identité (pas de compte visiteur) : si aucun
// profil ne correspond, c'est probablement une première visite (le visiteur
// doit passer par "Créer mon profil", pas par une demande de réinitialisation).
export async function requestPinReset(
  spaceId: string,
  prenom: string,
  nom: string,
): Promise<{ ok: true } | { ok: false; reason: "not_found" | "error" }> {
  const { data: visitor, error: lookupError } = await supabase
    .from("visitor_profiles")
    .select("id")
    .eq("space_id", spaceId)
    .ilike("prenom", prenom)
    .ilike("nom", nom)
    .maybeSingle();

  if (lookupError) {
    console.error("requestPinReset lookup", lookupError);
    return { ok: false, reason: "error" };
  }
  if (!visitor) return { ok: false, reason: "not_found" };

  const { error } = await supabase.from("pin_reset_requests").insert({
    space_id: spaceId,
    visitor_id: visitor.id,
    prenom,
    nom,
  });
  if (error) {
    console.error("requestPinReset insert", error);
    return { ok: false, reason: "error" };
  }
  return { ok: true };
}

export async function fetchOpenPinResetRequests(spaceId: string): Promise<PinResetRequest[]> {
  const { data, error } = await supabase
    .from("pin_reset_requests")
    .select("*")
    .eq("space_id", spaceId)
    .eq("seen", false)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("fetchOpenPinResetRequests", error);
    return [];
  }
  return data || [];
}

export async function markPinResetRequestSeen(id: string): Promise<void> {
  const { error } = await supabase.from("pin_reset_requests").update({ seen: true }).eq("id", id);
  if (error) console.error("markPinResetRequestSeen", error);
}

// À la différence de markPinResetRequestSeen ("Ignorer", aucune action), pose
// aussi resolved_at : c'est ce qui fait apparaître le message d'historique
// symétrique visiteur/admin dans "Mes alertes" (voir fetchPinResetHistory).
export async function resolvePinResetRequest(id: string): Promise<void> {
  const { error } = await supabase
    .from("pin_reset_requests")
    .update({ seen: true, resolved_at: new Date().toISOString() })
    .eq("id", id);
  if (error) console.error("resolvePinResetRequest", error);
}

// Historique des réinitialisations effectivement traitées — sans filtre
// prenom/nom pour l'admin (toutes celles de son espace), filtré par identité
// pour le visiteur (voir requestPinReset : même principe de rattachement par
// nom, pas de compte visiteur).
export async function fetchPinResetHistory(
  spaceId: string,
  identity?: { prenom: string; nom: string },
): Promise<PinResetRequest[]> {
  let query = supabase
    .from("pin_reset_requests")
    .select("*")
    .eq("space_id", spaceId)
    .not("resolved_at", "is", null)
    .order("resolved_at", { ascending: false });
  if (identity) {
    query = query.ilike("prenom", identity.prenom).ilike("nom", identity.nom);
  }
  const { data, error } = await query;
  if (error) {
    console.error("fetchPinResetHistory", error);
    return [];
  }
  return data || [];
}
