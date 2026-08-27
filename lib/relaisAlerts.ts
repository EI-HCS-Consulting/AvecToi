import { getVisitorSession } from "@/lib/visitorSession";
import { supabase } from "@/lib/supabase";
import type { Task } from "@/lib/types";

// Comparaison d'identité insensible à la casse/aux accents, utilisée partout
// où on doit reconnaître "la même personne" entre une session locale
// (visiteur) ou l'utilisateur Supabase Auth (admin) et un prénom/nom stocké
// en base (auteur, destinataire ciblé, personne ayant écarté l'alerte...).
export function relaisIdentityKey(prenom: string, nom: string) {
  return `${prenom}|${nom}`.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Résout "qui suis-je" pour les besoins de relais : côté admin, l'identité
// vient des métadonnées Supabase Auth ; côté visiteur, de la session locale
// (voir lib/visitorSession.ts, aucun compte Supabase Auth n'existe pour ce
// rôle).
export async function resolveRelaisIdentity(isAdmin: boolean): Promise<{ prenom: string; nom: string }> {
  if (isAdmin) {
    const { data } = await supabase.auth.getUser();
    return {
      prenom: (data.user?.user_metadata?.firstname ?? "").trim(),
      nom: (data.user?.user_metadata?.lastname ?? "").trim(),
    };
  }
  const session = await getVisitorSession();
  return { prenom: session?.prenom ?? "", nom: session?.nom ?? "" };
}

// Charge les besoins de relais ouverts ciblant l'identité donnée : exclut
// les tâches publiées par cette même identité, filtre par ciblage
// (relais_visible_to==="some" -> doit figurer dans relais_recipients) et
// exclut celles déjà écartées définitivement (relais_dismissed_by). Utilisé
// à la fois par le popup RelaisAlertModal et par "Mes alertes".
export async function fetchOpenRelaisAlerts(
  spaceId: string,
  isAdmin: boolean,
  identity: { prenom: string; nom: string },
): Promise<Task[]> {
  const { data } = await supabase
    .from("tasks")
    .select("*")
    .eq("space_id", spaceId)
    .eq("category", "relais")
    .eq("status", "ouvert");
  const tasks = (data as Task[] | null) ?? [];
  const myKey = relaisIdentityKey(identity.prenom, identity.nom);
  return tasks.filter((t) => {
    const isSelfAuthor = isAdmin
      ? t.author_pin === "ADMIN"
      : relaisIdentityKey(t.author_prenom ?? "", t.author_nom ?? "") === myKey;
    if (isSelfAuthor) return false;
    const targeted = t.relais_visible_to !== "some"
      || (t.relais_recipients ?? []).some((r) => relaisIdentityKey(r.prenom, r.nom) === myKey);
    if (!targeted) return false;
    const dismissed = t.relais_dismissed_by.some((d) => relaisIdentityKey(d.prenom, d.nom) === myKey);
    return !dismissed;
  });
}
