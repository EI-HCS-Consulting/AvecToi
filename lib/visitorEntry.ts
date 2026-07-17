import { supabase } from "@/lib/supabase";
import { saveVisitorSession } from "@/lib/visitorSession";
import { normalizeDossierCode } from "@/lib/dossierCode";

export type VisitorEntryResult =
  | { ok: true; spaceId: string; token: string; intervenantsEnabled: boolean }
  | { ok: false; reason: "not_found" | "inactive"; patientFirstname?: string };

async function lookupSpace(column: "invite_token" | "dossier_code", value: string): Promise<VisitorEntryResult> {
  const { data, error } = await supabase
    .from("patient_spaces")
    .select("id, invite_token, is_active, patient_firstname, intervenants_enabled")
    .eq(column, value)
    .single();

  if (error || !data) return { ok: false, reason: "not_found" };
  if (!data.is_active) return { ok: false, reason: "inactive", patientFirstname: data.patient_firstname };
  return { ok: true, spaceId: data.id, token: data.invite_token, intervenantsEnabled: data.intervenants_enabled };
}

export function enterByToken(token: string) {
  return lookupSpace("invite_token", token);
}

export function enterByDossierCode(code: string) {
  return lookupSpace("dossier_code", normalizeDossierCode(code));
}

// Persiste la session visiteur — toujours indexée sur invite_token en
// interne (VisitorContext ne connaît que cette colonne), même quand
// l'entrée s'est faite via le code dossier.
export async function completeVisitorEntry(result: { ok: true; spaceId: string; token: string }): Promise<void> {
  await saveVisitorSession({ token: result.token, spaceId: result.spaceId, role: "visiteur" });
}

// Même lien/code d'invitation que les visiteurs — seul le rôle stocké en
// session diffère, ce qui fait apparaître le modal de création de fiche
// intervenant dans (visitor)/_layout.tsx et bascule le flux de réservation.
export async function completeIntervenantEntry(result: { ok: true; spaceId: string; token: string }): Promise<void> {
  await saveVisitorSession({ token: result.token, spaceId: result.spaceId, role: "intervenant" });
}
