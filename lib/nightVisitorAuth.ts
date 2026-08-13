import { supabase } from "./supabase";

// Même normalisation que identityKey() dans components/VisitorsBlock.tsx —
// insensible à la casse et aux accents, pour la même raison (un même
// visiteur peut être saisi "François"/"Francois" selon l'écran).
function normalize(s: string) {
  return s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// N'a d'effet que lorsque slot_config.night_visitor_mode = "some" — sinon
// (mode "all", défaut) tous les visiteurs peuvent réserver une nuitée, voir
// (visitor)/home/nights.tsx et (visitor)/home/slots.tsx.
export async function isVisitorAuthorizedForNight(spaceId: string, prenom: string, nom: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("night_authorized_visitors")
    .select("prenom, nom")
    .eq("space_id", spaceId);
  if (error) {
    console.error("[nightVisitorAuth] select failed:", error);
    return false;
  }
  const key = `${normalize(prenom)}|${normalize(nom)}`;
  return (data || []).some((r) => `${normalize(r.prenom)}|${normalize(r.nom)}` === key);
}
