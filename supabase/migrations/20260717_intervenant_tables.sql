-- Fiche intervenant (infirmier·ère, kiné, aide à domicile…) : nouveau rôle
-- léger, même mécanique d'identité que les visiteurs (session locale +
-- PIN, pas de compte Supabase Auth) — voir lib/visitorSession.ts. Chaque
-- intervenant définit à sa première connexion un ou plusieurs types
-- d'intervention avec leur durée (ex. "Toilette" 30min, "Kiné" 45min),
-- utilisés ensuite pour réserver un créneau qui bloque la durée exacte
-- (voir book_intervention, migration ultérieure).
--
-- RLS permissive comme reservations/visitor_profiles : aucune session
-- Supabase Auth côté intervenant, le contrôle d'accès réel se fait côté
-- client via comparaison de PIN en clair (même convention que le reste
-- de l'app).

create table if not exists public.intervenant_profiles (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.patient_spaces(id) on delete cascade,
  prenom text not null,
  nom text not null,
  pin text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_intervenant_profiles_space
  on public.intervenant_profiles (space_id);

alter table public.intervenant_profiles enable row level security;

drop policy if exists "public can select intervenant_profiles" on public.intervenant_profiles;
create policy "public can select intervenant_profiles"
  on public.intervenant_profiles for select using (true);

drop policy if exists "public can insert intervenant_profiles" on public.intervenant_profiles;
create policy "public can insert intervenant_profiles"
  on public.intervenant_profiles for insert with check (true);

drop policy if exists "public can update intervenant_profiles" on public.intervenant_profiles;
create policy "public can update intervenant_profiles"
  on public.intervenant_profiles for update using (true) with check (true);

drop policy if exists "public can delete intervenant_profiles" on public.intervenant_profiles;
create policy "public can delete intervenant_profiles"
  on public.intervenant_profiles for delete using (true);

create table if not exists public.intervention_types (
  id uuid primary key default gen_random_uuid(),
  intervenant_profile_id uuid not null references public.intervenant_profiles(id) on delete cascade,
  label text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_intervention_types_profile
  on public.intervention_types (intervenant_profile_id);

alter table public.intervention_types enable row level security;

drop policy if exists "public can select intervention_types" on public.intervention_types;
create policy "public can select intervention_types"
  on public.intervention_types for select using (true);

drop policy if exists "public can insert intervention_types" on public.intervention_types;
create policy "public can insert intervention_types"
  on public.intervention_types for insert with check (true);

drop policy if exists "public can update intervention_types" on public.intervention_types;
create policy "public can update intervention_types"
  on public.intervention_types for update using (true) with check (true);

drop policy if exists "public can delete intervention_types" on public.intervention_types;
create policy "public can delete intervention_types"
  on public.intervention_types for delete using (true);
