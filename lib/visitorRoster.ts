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

// Photo (URL publique ou null) par identité "prenom|nom", visiteurs +
// admin — même construction que MyWeekScreen.tsx (photoByKey), extraite ici
// pour être réutilisée par Entraide.tsx sans dupliquer la requête
// visitor_profiles + la dénormalisation admin_photo_url (voir account.tsx /
// SpaceContext.tsx pour pourquoi la photo admin vit sur patient_spaces et pas
// dans visitor_profiles).
export async function loadPhotoRoster(spaceId: string): Promise<Record<string, string | null>> {
  const [profilesRes, spaceRes] = await Promise.all([
    supabase.from("visitor_profiles").select("prenom,nom,photo").eq("space_id", spaceId),
    supabase.from("patient_spaces").select("admin_firstname,admin_lastname,admin_photo_url").eq("id", spaceId).single(),
  ]);
  const photos: Record<string, string | null> = {};
  (profilesRes.data || []).forEach((p: { prenom: string; nom: string; photo: string | null }) => {
    photos[visitorIdentityKey(p.prenom, p.nom)] = p.photo ? visitorPhotoUrl(spaceId, p.photo) : null;
  });
  const admin = spaceRes.data;
  if (admin?.admin_firstname && admin?.admin_lastname) {
    photos[visitorIdentityKey(admin.admin_firstname, admin.admin_lastname)] = admin.admin_photo_url ?? null;
  }
  return photos;
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

// Périmètre du sélecteur de co-admin (app/(admin)/coadmins.tsx) : uniquement
// les visiteurs qui ont proposé une période de relais via "Je m'en occupe"
// (task_relais_coverage) sur un Besoin SOS de l'espace — et, quand ce besoin
// ciblait des destinataires précis (relais_visible_to==="some"), uniquement
// ceux effectivement désignés dans tasks.relais_recipients à ce moment-là.
// Quand le besoin était ouvert à tous (relais_visible_to "all"/null), tout
// contributeur compte : l'admin a choisi d'ouvrir le besoin à tous, donc tout
// le monde qui a répondu fait partie des personnes qu'il a "laissé" pouvoir
// le remplacer.
export interface SosRelaisPeriod {
  coverageId: string;
  taskId: string;
  startDate: string;
  endDate: string;
  fullPeriod: boolean;
}

export interface SosRelaisCandidate {
  prenom: string;
  nom: string;
  photoUrl: string | null;
  periods: SosRelaisPeriod[];
  // Email vérifié par code lors de la proposition (voir Entraide.tsx,
  // relaisClaimStep "email"/"code") — repris par app/(admin)/coadmins.tsx
  // pour créer directement le co-administrateur en état "accepté". Le
  // premier email non nul rencontré parmi les propositions de la personne
  // (elles portent normalement toutes le même, vérifié à chaque fois).
  email: string | null;
}

export async function loadSosRelaisCandidates(spaceId: string): Promise<SosRelaisCandidate[]> {
  const { data: relaisTasks } = await supabase
    .from("tasks")
    .select("id, relais_visible_to, relais_recipients")
    .eq("space_id", spaceId)
    .eq("category", "relais");

  const tasks = relaisTasks || [];
  if (tasks.length === 0) return [];

  const eligibleKeysByTask = new Map<string, Set<string> | null>();
  for (const t of tasks) {
    if (t.relais_visible_to === "some" && Array.isArray(t.relais_recipients)) {
      eligibleKeysByTask.set(
        t.id,
        new Set(
          (t.relais_recipients as { prenom: string; nom: string }[]).map((r) => visitorIdentityKey(r.prenom, r.nom)),
        ),
      );
    } else {
      eligibleKeysByTask.set(t.id, null);
    }
  }

  const [coverageRes, profilesRes] = await Promise.all([
    supabase
      .from("task_relais_coverage")
      .select("id, task_id, prenom, nom, start_date, end_date, full_period, email")
      .in("task_id", tasks.map((t) => t.id))
      .order("start_date", { ascending: true }),
    supabase.from("visitor_profiles").select("prenom,nom,photo").eq("space_id", spaceId),
  ]);

  const photoByKey = new Map<string, string | null>();
  for (const p of profilesRes.data || []) {
    photoByKey.set(visitorIdentityKey(p.prenom, p.nom), p.photo ? visitorPhotoUrl(spaceId, p.photo) : null);
  }

  const byKey = new Map<string, SosRelaisCandidate>();
  for (const cov of coverageRes.data || []) {
    if (!cov.prenom?.trim() || !cov.nom?.trim()) continue;
    const key = visitorIdentityKey(cov.prenom, cov.nom);
    const eligible = eligibleKeysByTask.get(cov.task_id);
    if (eligible && !eligible.has(key)) continue;

    if (!byKey.has(key)) {
      byKey.set(key, {
        prenom: cov.prenom.trim(),
        nom: cov.nom.trim(),
        photoUrl: photoByKey.get(key) ?? null,
        periods: [],
        email: null,
      });
    }
    const entry = byKey.get(key)!;
    if (!entry.email && cov.email) entry.email = cov.email;
    entry.periods.push({
      coverageId: cov.id,
      taskId: cov.task_id,
      startDate: cov.start_date,
      endDate: cov.end_date,
      fullPeriod: cov.full_period,
    });
  }

  return Array.from(byKey.values()).sort(
    (a, b) => a.nom.localeCompare(b.nom, "fr") || a.prenom.localeCompare(b.prenom, "fr"),
  );
}
