-- Photo de profil intervenant — affichée dans la liste "Intervenants" côté
-- visiteur (components/IntervenantsListModal.tsx) et dans la fiche
-- intervenant (components/IntervenantProfileModal.tsx), au même titre que la
-- photo de profil visiteur (voir 20260713_visitor_profiles.sql, même
-- convention de bucket public). Renseignée depuis IntervenantFicheModal
-- (mode "create" à la première connexion, ou "edit" depuis Mon compte/
-- Réglages admin), fichier nommé par intervenant_profile_id (contrairement à
-- visitor_profiles qui n'a pas d'id stable côté app et utilise prénom+nom).

alter table public.intervenant_profiles
  add column if not exists photo text;

insert into storage.buckets (id, name, public)
values ('intervenant-photos', 'intervenant-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read intervenant-photos"   on storage.objects;
drop policy if exists "Public insert intervenant-photos" on storage.objects;
drop policy if exists "Public update intervenant-photos" on storage.objects;
drop policy if exists "Public delete intervenant-photos" on storage.objects;

create policy "Public read intervenant-photos"
  on storage.objects for select
  using (bucket_id = 'intervenant-photos');

create policy "Public insert intervenant-photos"
  on storage.objects for insert
  with check (bucket_id = 'intervenant-photos');

create policy "Public update intervenant-photos"
  on storage.objects for update
  using (bucket_id = 'intervenant-photos')
  with check (bucket_id = 'intervenant-photos');

create policy "Public delete intervenant-photos"
  on storage.objects for delete
  using (bucket_id = 'intervenant-photos');
