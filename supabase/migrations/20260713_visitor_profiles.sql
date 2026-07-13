-- Fiche visiteur : permet de cliquer sur le nom d'un autre visiteur (posts
-- Nouvelles / Souvenirs / Soutien) pour voir sa photo + prénom/nom + toutes
-- ses réservations/nouvelles/besoins, en lecture seule (pas de PIN). Comme le
-- reste de l'app, l'identité est approximée par prénom+nom (voir "Mes
-- contributions" dans app/(visitor)/account.tsx qui utilise déjà ce même
-- rapprochement ilike, sans PIN, pour la même raison : il n'existe aucun
-- identifiant de compte visiteur).
--
-- photo est la seule donnée réellement nouvelle ici : jusqu'ici la photo
-- choisie dans "Mon compte" restait locale à l'appareil (VisitorSession.
-- localPhotoUri), jamais visible par les autres. Synchronisée depuis
-- app/(visitor)/account.tsx à chaque changement de photo.

create table if not exists public.visitor_profiles (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.patient_spaces(id) on delete cascade,
  prenom text not null,
  nom text not null,
  photo text,
  updated_at timestamptz not null default now()
);

-- Contrainte simple (pas d'expression lower()) : nécessaire telle quelle pour
-- que l'upsert onConflict="space_id,prenom,nom" côté app fonctionne.
-- prenom/nom sont toujours écrits .trim()'d par l'app ; la lecture (fiche
-- visiteur) reste insensible à la casse via ilike.
alter table public.visitor_profiles
  drop constraint if exists visitor_profiles_identity_key;
alter table public.visitor_profiles
  add constraint visitor_profiles_identity_key unique (space_id, prenom, nom);

-- Bucket + policies, même convention permissive que souvenirs/news-photos/
-- support-photos/entraide-photos (pas d'auth visiteur côté Supabase, PIN
-- géré côté app — ici même pas de PIN, la photo de profil est publique par
-- construction).
insert into storage.buckets (id, name, public)
values ('visitor-photos', 'visitor-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read visitor-photos"   on storage.objects;
drop policy if exists "Public insert visitor-photos" on storage.objects;
drop policy if exists "Public update visitor-photos" on storage.objects;
drop policy if exists "Public delete visitor-photos" on storage.objects;

create policy "Public read visitor-photos"
  on storage.objects for select
  using (bucket_id = 'visitor-photos');

create policy "Public insert visitor-photos"
  on storage.objects for insert
  with check (bucket_id = 'visitor-photos');

create policy "Public update visitor-photos"
  on storage.objects for update
  using (bucket_id = 'visitor-photos')
  with check (bucket_id = 'visitor-photos');

create policy "Public delete visitor-photos"
  on storage.objects for delete
  using (bucket_id = 'visitor-photos');
