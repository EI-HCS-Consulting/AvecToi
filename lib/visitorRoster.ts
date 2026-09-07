import { supabase } from "./supabase";

// Extrait de components/VisitorsBlock.tsx (load()) pour être réutilisé par le
// sélecteur de co-admin (voir app/(admin)/coadmins.tsx) sans dupliquer la
// logique d'exclusion intervenants/admin ni les 10 sources de "trace" qui
// définissent un visiteur connu dans l'app.
export interface KnownVisitor {
  prenom: string;
  nom: string;
  photoUrl: string | null;
  motto: string | null;
}

function visitorPhotoUrl(spaceId: string, filename: string) {
  const { data } = supabase.storage.from("visitor-photos").getPublicUrl(`${spaceId}/${filename}`);
  return data.publicUrl;
}

// Insensible aux accents en plus de la casse — même principe que
// identityKey() dans VisitorsBlock.tsx/app/(visitor)/account.tsx.
export function visitorIdentityKey(prenom: string, nom: string) {
  const norm = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return `${norm(prenom)}|${norm(nom)}`;
}

export async function loadKnownVisitors(
  spaceId: string,
  adminFirstname?: string | null,
  adminLastname?: string | null,
): Promise<KnownVisitor[]> {
  const [resv, resvGuestOf, news, tasksAuthor, tasksClaimed, tasksReturnClaimed, souv, msgs, profiles, intervenants] = await Promise.all([
    supabase.from("reservations").select("prenom,nom").eq("space_id", spaceId),
    supabase.from("reservations").select("booked_by_prenom,booked_by_nom").eq("space_id", spaceId),
    supabase.from("news_entries").select("author_prenom,author_nom").eq("space_id", spaceId),
    supabase.from("tasks").select("author_prenom,author_nom").eq("space_id", spaceId),
    supabase.from("tasks").select("claimed_by_prenom,claimed_by_nom").eq("space_id", spaceId),
    supabase.from("tasks").select("transport_return_claimed_by_prenom,transport_return_claimed_by_nom").eq("space_id", spaceId),
    supabase.from("souvenirs").select("uploaded_by_prenom,uploaded_by_nom").eq("space_id", spaceId),
    supabase.from("support_messages").select("author_prenom,author_nom").eq("space_id", spaceId),
    supabase.from("visitor_profiles").select("prenom,nom,photo,motto").eq("space_id", spaceId),
    supabase.from("intervenant_profiles").select("prenom,nom").eq("space_id", spaceId),
  ]);

  const excludedKeys = new Set((intervenants.data || []).map((i) => visitorIdentityKey(i.prenom, i.nom)));
  if (adminFirstname && adminLastname) excludedKeys.add(visitorIdentityKey(adminFirstname, adminLastname));

  const byKey = new Map<string, KnownVisitor>();
  function add(prenom?: string | null, nom?: string | null) {
    if (!prenom?.trim() || !nom?.trim()) return;
    const key = visitorIdentityKey(prenom, nom);
    if (excludedKeys.has(key)) return;
    if (!byKey.has(key)) byKey.set(key, { prenom: prenom.trim(), nom: nom.trim(), photoUrl: null, motto: null });
  }
  (resv.data || []).forEach((r) => add(r.prenom, r.nom));
  (resvGuestOf.data || []).forEach((r) => add(r.booked_by_prenom, r.booked_by_nom));
  (news.data || []).forEach((n) => add(n.author_prenom, n.author_nom));
  (tasksAuthor.data || []).forEach((t) => add(t.author_prenom, t.author_nom));
  (tasksClaimed.data || []).forEach((t) => add(t.claimed_by_prenom, t.claimed_by_nom));
  (tasksReturnClaimed.data || []).forEach((t) => add(t.transport_return_claimed_by_prenom, t.transport_return_claimed_by_nom));
  (souv.data || []).forEach((s) => add(s.uploaded_by_prenom, s.uploaded_by_nom));
  (msgs.data || []).forEach((m) => add(m.author_prenom, m.author_nom));
  (profiles.data || []).forEach((p) => add(p.prenom, p.nom));

  for (const p of profiles.data || []) {
    const row = byKey.get(visitorIdentityKey(p.prenom, p.nom));
    if (!row) continue;
    if (p.photo) row.photoUrl = visitorPhotoUrl(spaceId, p.photo);
    if (p.motto) row.motto = p.motto;
  }

  return Array.from(byKey.values()).sort(
    (a, b) => a.nom.localeCompare(b.nom, "fr") || a.prenom.localeCompare(b.prenom, "fr"),
  );
}
