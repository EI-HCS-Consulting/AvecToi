import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { useWallUnreadIds, type WallRow } from "./wallUnread";

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
  // null pour purpose="reset" — l'adresse est résolue côté serveur depuis
  // visitor_profiles.email, jamais fournie par le client (voir
  // resetVisitorPinViaEmail ci-dessous).
  email: string | null,
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

// Réinitialisation du PIN par email généralisée à tout visiteur ayant un
// email vérifié sur son profil (visitor_profiles.email) — plus seulement les
// co-administrateurs actifs, voir reset_coadmin_pin_via_email ci-dessus qui
// reste en base pour compat descendante mais n'est plus appelée côté client
// (20260908_visitor_email_selfservice.sql). Remplace resetCoAdminPinViaEmail
// dans app/auth/visitor-identify.tsx.
export async function resetVisitorPinViaEmail(
  spaceId: string,
  prenom: string,
  nom: string,
  newPin: string,
  code: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.rpc("reset_visitor_pin_via_email", {
    p_space_id: spaceId,
    p_prenom: prenom,
    p_nom: nom,
    p_new_pin: newPin,
    p_code: code,
  });
  if (error) {
    console.error("resetVisitorPinViaEmail", error);
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

// Badge "New" posé sur le bouton "🛡️ Co-administrateurs" (Mon compte admin)
// quand une nouvelle proposition de relais existe sur un Besoin SOS — demande
// explicite : "le badge New doit apparaître à l'admin quand une nouvelle
// personne a fait une proposition". Même mécanisme que useEntraideBadges
// (lib/entraideBadges.ts, task_relais_coverage synthétisé en WallRow) mais
// scope dédié "coadmin" : ce bouton n'est visible que par l'admin, donc
// isAdmin toujours vrai ici. Ne flushe jamais lui-même (voir lib/wallUnread.ts)
// — le flush se produit sur app/(admin)/coadmins.tsx (useWallReadTracking),
// quand l'admin revient au premier plan après avoir consulté cet écran.
export function useCoAdminAlertBadge(spaceId: string | null): boolean {
  const [wallRows, setWallRows] = useState<WallRow[] | null>(null);

  useEffect(() => {
    if (!spaceId) return;
    setWallRows(null);
    let cancelled = false;
    async function load() {
      const { data: relaisTasks, error: taskErr } = await supabase
        .from("tasks")
        .select("id")
        .eq("space_id", spaceId)
        .eq("category", "relais");
      if (taskErr) { console.error("[useCoAdminAlertBadge] tasks query failed:", taskErr); return; }
      const taskIds = (relaisTasks ?? []).map((t) => t.id);
      if (!taskIds.length) { if (!cancelled) setWallRows([]); return; }
      const { data: coverage, error: covErr } = await supabase
        .from("task_relais_coverage")
        .select("id, prenom, nom, created_at")
        .in("task_id", taskIds);
      if (covErr) { console.error("[useCoAdminAlertBadge] coverage query failed:", covErr); return; }
      if (cancelled) return;
      setWallRows((coverage ?? []).map((c) => ({
        id: c.id,
        author_prenom: c.prenom,
        author_nom: c.nom,
        author_pin: null,
        created_at: c.created_at,
        deleted_by_admin: false,
      })));
    }
    load();
    // Suffixe aléatoire indispensable (voir même besoin dans
    // lib/entraideBadges.ts) : task_relais_coverage n'a pas de colonne
    // space_id, pas de filtre serveur possible, on reload sur tout événement.
    const ch = supabase
      .channel(`coadmin-alert-badge:${spaceId}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_relais_coverage" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `space_id=eq.${spaceId}` }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [spaceId]);

  const { unreadIds } = useWallUnreadIds("coadmin", spaceId, true, wallRows);
  return unreadIds.size > 0;
}
