import { getVisitorSession } from "@/lib/visitorSession";
import { supabase } from "@/lib/supabase";
import type { Task, TransportProposal } from "@/lib/types";
import { relaisIdentityKey } from "@/lib/relaisAlerts";

export interface TransportIdentity {
  prenom: string;
  nom: string;
  pin: string;
}

// Résout "qui suis-je" pour les besoins de transport — même principe que
// resolveRelaisIdentity (lib/relaisAlerts.ts), avec le pin en plus (nécessaire
// ici pour distinguer l'auteur réel d'un simple homonyme, voir isEligible
// ci-dessous). Côté admin, "ADMIN" est le sentinel déjà utilisé partout
// ailleurs pour author_pin/claimed_by_pin (voir submitTransportProposal dans
// Entraide.tsx), pas le pin personnel de l'admin.
export async function resolveTransportIdentity(isAdmin: boolean): Promise<TransportIdentity> {
  if (isAdmin) {
    const { data } = await supabase.auth.getUser();
    return {
      prenom: (data.user?.user_metadata?.firstname ?? "").trim(),
      nom: (data.user?.user_metadata?.lastname ?? "").trim(),
      pin: "ADMIN",
    };
  }
  const session = await getVisitorSession();
  return { prenom: session?.prenom ?? "", nom: session?.nom ?? "", pin: session?.pin ?? "" };
}

// Mêmes ayants droit que canValidateTransport dans Entraide.tsx (auteur du
// besoin, ou bénéficiaire ciblé via transport_for_prenom/nom) : ce sont eux
// qui doivent être alertés d'une nouvelle proposition, et personne d'autre.
function isEligible(t: Task, identity: TransportIdentity): boolean {
  const isAuthor = !!identity.pin && t.author_pin === identity.pin
    && relaisIdentityKey(t.author_prenom ?? "", t.author_nom ?? "") === relaisIdentityKey(identity.prenom, identity.nom);
  const isForPerson = !!t.transport_for_prenom && !!t.transport_for_nom
    && relaisIdentityKey(t.transport_for_prenom, t.transport_for_nom) === relaisIdentityKey(identity.prenom, identity.nom);
  return isAuthor || isForPerson;
}

// Propositions pas encore vues par l'ayant droit (voir seen_by_author dans
// lib/types.ts) et pas déclinées — une proposition déclinée reste dans le
// tableau (voir rejectTransportProposals) mais ne doit plus jamais redéclencher
// le popup.
export function unseenProposalsFor(t: Task, identity: TransportIdentity): TransportProposal[] {
  if (!isEligible(t, identity)) return [];
  return (t.transport_proposals ?? []).filter((p) => !p.declined && !p.seen_by_author);
}

export interface TransportProposalAlert {
  task: Task;
  proposals: TransportProposal[];
}

// Besoins de transport de cet espace comportant au moins une proposition non
// vue par l'identité donnée — utilisé par TransportProposalAlertModal (popup
// à la connexion). Pas de filtre sur le statut : une fois validé,
// transport_proposals est vidé (voir validateTransportLeg), donc un besoin
// "pris_en_charge" ne peut plus remonter ici de lui-même.
export async function fetchOpenTransportProposalAlerts(
  spaceId: string,
  identity: TransportIdentity,
): Promise<TransportProposalAlert[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("space_id", spaceId)
    .eq("category", "transport");
  if (error) { console.error("[fetchOpenTransportProposalAlerts] query failed:", error); return []; }
  const tasks = (data as Task[] | null) ?? [];
  return tasks
    .map((task) => ({ task, proposals: unseenProposalsFor(task, identity) }))
    .filter((alert) => alert.proposals.length > 0);
}

// Marque ces propositions précises comme vues — relit transport_proposals
// juste avant d'écrire, même précaution anti-écrasement que
// submitTransportProposal/rejectTransportProposals dans Entraide.tsx.
export async function markTransportProposalsSeen(taskId: string, proposalIds: string[]): Promise<void> {
  const { data, error: selectError } = await supabase
    .from("tasks").select("transport_proposals").eq("id", taskId).single();
  if (selectError) { console.error("[markTransportProposalsSeen] select failed:", selectError); return; }
  const current: TransportProposal[] = data?.transport_proposals ?? [];
  const updated = current.map((p) => (proposalIds.includes(p.id) ? { ...p, seen_by_author: true } : p));
  const { error: updateError } = await supabase.from("tasks").update({ transport_proposals: updated }).eq("id", taskId);
  if (updateError) console.error("[markTransportProposalsSeen] update failed:", updateError);
}
