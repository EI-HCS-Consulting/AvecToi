import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

// Plomberie de la co-administration temporaire (Feature 3 du chantier SOS
// relais). Voir les migrations 20260907_patient_space_coadmins.sql /
// 20260907_coadmin_verification_codes.sql / 20260907_coadmin_rpcs.sql.

export type CoAdminStatus = "none" | "pending" | "active";

// Statut vu par le visiteur lui-même — ne lit jamais l'email (exclu du grant
// column-level côté DB), juste active/accepted_at pour savoir quel popup
// afficher (invitation en attente vs déjà actif vs rien).
export async function checkCoAdminStatus(
  spaceId: string,
  prenom: string,
  nom: string,
): Promise<CoAdminStatus> {
  const { data, error } = await supabase
    .from("patient_space_coadmins")
    .select("accepted_at")
    .eq("space_id", spaceId)
    .ilike("prenom", prenom.trim())
    .ilike("nom", nom.trim())
    .eq("active", true)
    .order("granted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("checkCoAdminStatus", error);
    return "none";
  }
  if (!data) return "none";
  return data.accepted_at ? "active" : "pending";
}

function edgeFunctionErrorMessage(error: unknown): string {
  const anyErr = error as any;
  return anyErr?.context?.error || anyErr?.message || "Erreur réseau — vérifie ta connexion et réessaie.";
}

export async function requestCoAdminCode(
  spaceId: string,
  prenom: string,
  nom: string,
  email: string,
  purpose: "accept" | "reset" | "propose",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase.functions.invoke("send-coadmin-verification-code", {
    body: { space_id: spaceId, prenom, nom, email, purpose },
  });
  if (error) {
    console.error("requestCoAdminCode", error);
    return { ok: false, error: edgeFunctionErrorMessage(error) };
  }
  if (data?.error) {
    console.error("requestCoAdminCode returned error:", data.error);
    return { ok: false, error: data.error };
  }
  return { ok: true };
}

// Vérifie le code purpose="propose" reçu au moment où un visiteur propose une
// période de relais (voir Entraide.tsx, relaisClaimStep "email"/"code") —
// AVANT qu'aucune ligne patient_space_coadmins n'existe : la vérification se
// fait au moment de la proposition, pas d'une acceptation séparée après coup
// (l'admin valide directement la période, voir app/(admin)/coadmins.tsx).
// Ne fait qu'authentifier l'email pour cette proposition (marque le code
// utilisé) ; l'email vérifié est ensuite écrit directement sur la ligne
// task_relais_coverage par l'appelant.
export async function verifyCoAdminProposalCode(
  spaceId: string,
  prenom: string,
  nom: string,
  pin: string,
  email: string,
  code: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.rpc("verify_coadmin_proposal_code", {
    p_space_id: spaceId,
    p_prenom: prenom,
    p_nom: nom,
    p_pin: pin,
    p_email: email,
    p_code: code,
  });
  if (error) {
    console.error("verifyCoAdminProposalCode", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

// Révoque, si elle existe, l'octroi de co-administration rattaché à cette
// proposition précise (patient_space_coadmins.coverage_id) — appelée quand
// le visiteur annule sa proposition depuis "Mes engagements de relais"
// (MyRelaisCommitments.tsx). SECURITY DEFINER car patient_space_coadmins.
// update est normalement réservé à l'admin authentifié (voir
// 20260908_coadmin_per_proposal.sql) ; ne fait rien si aucun octroi n'existe
// encore pour cette proposition (cas le plus courant : la plupart des
// annulations portent sur une proposition jamais validée).
export async function revokeCoAdminForCoverage(coverageId: string): Promise<void> {
  const { error } = await supabase.rpc("revoke_coadmin_for_coverage", { p_coverage_id: coverageId });
  if (error) console.error("revokeCoAdminForCoverage", error);
}

export async function resetCoAdminPinViaEmail(
  spaceId: string,
  prenom: string,
  nom: string,
  email: string,
  newPin: string,
  code: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.rpc("reset_coadmin_pin_via_email", {
    p_space_id: spaceId,
    p_prenom: prenom,
    p_nom: nom,
    p_email: email,
    p_new_pin: newPin,
    p_code: code,
  });
  if (error) {
    console.error("resetCoAdminPinViaEmail", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

// Flag local — accélère l'affichage de app/(admin)/_layout.tsx (évite un
// aller-retour réseau à chaque lancement) mais n'est JAMAIS la source de
// vérité : ce fichier revérifie toujours checkCoAdminStatus en base au
// montage, pour qu'une révocation par l'admin d'origine soit effective dès
// le prochain lancement de l'app du co-admin.
function cacheKey(spaceId: string) {
  return `coadmin_active_${spaceId}`;
}

export async function getCachedCoAdminActive(spaceId: string): Promise<boolean> {
  return (await AsyncStorage.getItem(cacheKey(spaceId))) === "true";
}

export async function setCachedCoAdminActive(spaceId: string, active: boolean): Promise<void> {
  if (active) await AsyncStorage.setItem(cacheKey(spaceId), "true");
  else await AsyncStorage.removeItem(cacheKey(spaceId));
}
