-- Co-administration temporaire : un admin délègue une partie de ses droits
-- à un visiteur qui s'est proposé pour du relais (voir Feature 3 du chantier
-- SOS relais). Une ligne = un octroi.
--   active=true  && accepted_at is null     → invitation en attente
--   active=true  && accepted_at is not null → co-admin actif
--   active=false                             → révoqué (par l'admin d'origine,
--                                              qu'il ait été en attente ou actif)
--
-- Volontairement pas de colonne "pin" ici : le co-admin reste identifié par
-- son PIN visiteur normal (visitor_profiles.pin), jamais dupliqué — voir
-- accept_coadmin_invite / reset_coadmin_pin_via_email (20260907_coadmin_rpcs.sql)
-- qui vérifient toujours contre visitor_profiles, pas contre cette table.
--
-- visitor_id référence la ligne visitor_profiles précise choisie par l'admin
-- (pas juste prenom/nom) : visitor_profiles autorise les homonymes différenciés
-- par pin (20260901_visitor_profiles_pin_auth.sql), donc prenom/nom seuls ne
-- suffiraient pas à retrouver sans ambiguïté "le" profil à réinitialiser dans
-- reset_coadmin_pin_via_email. prenom/nom sont quand même dupliqués ici en
-- lecture seule (cache d'affichage, jamais utilisés pour l'identité) pour que
-- l'UI (listes, "Qui êtes-vous ?") n'ait pas à re-joindre visitor_profiles.
create table public.patient_space_coadmins (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.patient_spaces(id) on delete cascade,
  visitor_id uuid not null references public.visitor_profiles(id) on delete cascade,
  prenom text not null,
  nom text not null,
  email text,
  active boolean not null default true,
  accepted_at timestamptz,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  granted_by_admin_id uuid references auth.users(id)
);

create index patient_space_coadmins_space_id_idx on public.patient_space_coadmins (space_id);

alter table public.patient_space_coadmins enable row level security;

-- Lecture publique nécessaire des deux côtés : l'admin doit voir la liste de
-- ses co-admins, le visiteur concerné doit détecter une invitation en
-- attente ou son propre statut actif (checkCoAdminStatus). L'email est
-- exclu du grant ci-dessous, jamais lisible via REST — même technique que
-- visitor_profiles.pin (20260901_visitor_profiles_pin_auth.sql).
create policy "read patient_space_coadmins scoped to space"
  on public.patient_space_coadmins for select
  using (true);

-- Octroi + révocation : réservés à l'admin réel authentifié de cet espace.
create policy "admin manages own coadmins"
  on public.patient_space_coadmins for insert
  to authenticated
  with check (
    exists (select 1 from public.patient_spaces s where s.id = space_id and s.admin_id = auth.uid())
  );

create policy "admin updates own coadmins"
  on public.patient_space_coadmins for update
  to authenticated
  using (
    exists (select 1 from public.patient_spaces s where s.id = space_id and s.admin_id = auth.uid())
  )
  with check (
    exists (select 1 from public.patient_spaces s where s.id = space_id and s.admin_id = auth.uid())
  );

-- Aucune policy anon en update : l'acceptation (email + accepted_at) passe
-- exclusivement par la RPC security definer accept_coadmin_invite, qui
-- vérifie le PIN visiteur avant d'écrire.

revoke select on public.patient_space_coadmins from anon, authenticated;
grant select (id, space_id, visitor_id, prenom, nom, active, accepted_at, granted_at, revoked_at, granted_by_admin_id)
  on public.patient_space_coadmins to anon, authenticated;
-- (email exclu volontairement de ce grant)

grant insert, update on public.patient_space_coadmins to authenticated;
