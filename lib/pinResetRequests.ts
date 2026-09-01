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
