import { supabase } from "./supabase";

// N'a d'effet que lorsque slot_config.night_intervenant_mode = "some" —
// sinon ("disabled"/"all") aucun lookup n'est nécessaire, voir
// (visitor)/home/nights.tsx et (visitor)/home/slots.tsx. Contrairement aux
// visiteurs (lib/nightVisitorAuth.ts), l'intervenant a un identifiant de
// compte stable (intervenant_profiles.id) — pas besoin de matcher par
// prénom/nom.
export async function isIntervenantAuthorizedForNight(spaceId: string, intervenantProfileId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("night_authorized_intervenants")
    .select("intervenant_profile_id")
    .eq("space_id", spaceId)
    .eq("intervenant_profile_id", intervenantProfileId)
    .maybeSingle();
  if (error) {
    console.error("[nightIntervenantAuth] select failed:", error);
    return false;
  }
  return !!data;
}
