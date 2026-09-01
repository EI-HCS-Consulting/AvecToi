-- 1. Ajout du PIN (nullable pendant la transition)
alter table public.visitor_profiles
  add column if not exists pin text;

comment on column public.visitor_profiles.pin is
  'PIN 4 chiffres — identifiant de reconnexion cross-device. NULL = profil pas encore migré/sécurisé.';

-- 2. Autoriser les homonymes, différenciés par PIN : la contrainte ne bloque
--    plus que le doublon strict (même nom + même PIN).
alter table public.visitor_profiles
  drop constraint if exists visitor_profiles_identity_key;
alter table public.visitor_profiles
  add constraint visitor_profiles_identity_key unique (space_id, prenom, nom, pin);

-- 3. Verrouiller la table : plus d'accès direct en lecture/écriture pour anon.
--    Toute interaction passe désormais par les fonctions RPC ci-dessous.
drop policy if exists "public can manage visitor_profiles" on public.visitor_profiles;

-- Lecture directe encore nécessaire pour les usages existants en lecture seule
-- (fiches publiques, listes de visiteurs) : autorisée, mais la colonne pin est
-- exclue au niveau des grants (voir plus bas).
create policy "read visitor_profiles scoped to space"
  on public.visitor_profiles for select
  using (true); -- la lecture publique du profil (hors pin) reste un besoin produit existant

-- Plus aucune politique INSERT/UPDATE/DELETE directe pour anon : tout passe par les RPC.

-- 4. Empêcher la lecture du PIN via REST, même si la ligne est lisible.
revoke select on public.visitor_profiles from anon, authenticated;
grant select (id, space_id, prenom, nom, photo, motto, relation, updated_at)
  on public.visitor_profiles to anon, authenticated;
-- (pin exclu volontairement de ce grant)

revoke insert, update, delete on public.visitor_profiles from anon, authenticated;
-- (plus aucune écriture directe ; uniquement via les fonctions SECURITY DEFINER ci-dessous)

-- 5. Fonction de connexion — ne révèle jamais si c'est le nom ou le PIN qui est faux.
--    Le filtre sur pin fait déjà tout le travail de désambiguïsation homonyme :
--    si deux "Jean Dupont" existent, seul celui dont le PIN correspond est renvoyé.
create or replace function public.rpc_visitor_login(
  p_space_id uuid,
  p_prenom text,
  p_nom text,
  p_pin text
) returns table (id uuid, prenom text, nom text, photo text, motto text, relation text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select vp.id, vp.prenom, vp.nom, vp.photo, vp.motto, vp.relation
    from visitor_profiles vp
    where vp.space_id = p_space_id
      and vp.pin is not null
      and lower(trim(vp.prenom)) = lower(trim(p_prenom))
      and lower(trim(vp.nom)) = lower(trim(p_nom))
      and vp.pin = p_pin;
end;
$$;

revoke all on function public.rpc_visitor_login from public;
grant execute on function public.rpc_visitor_login to anon, authenticated;

-- 6. Fonction de création / claim d'un profil existant sans PIN (migration douce).
--    Le nom seul ne suffit plus à identifier "le" profil (homonymes possibles) :
--    - Ligne (space_id, prenom, nom, pin) déjà exacte → c'est la même personne qui
--      reconfirme son profil (idempotent), simple mise à jour.
--    - Ligne (space_id, prenom, nom) avec pin NULL (profil hérité, pas encore migré,
--      il ne peut y en avoir qu'une seule par nom vu l'ancienne contrainte) → cette
--      première personne à se manifester la récupère, PIN attribué.
--    - Sinon (aucune correspondance) → nouvelle ligne : soit un nouveau visiteur,
--      soit un homonyme d'un profil déjà revendiqué sous un autre PIN.
create or replace function public.rpc_visitor_claim_or_create(
  p_space_id uuid,
  p_prenom text,
  p_nom text,
  p_pin text,
  p_relation text default null
) returns table (id uuid, prenom text, nom text, photo text, motto text, relation text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exact record;
  v_unclaimed record;
begin
  select * into v_exact from visitor_profiles vp
    where vp.space_id = p_space_id
      and lower(trim(vp.prenom)) = lower(trim(p_prenom))
      and lower(trim(vp.nom)) = lower(trim(p_nom))
      and vp.pin = p_pin;

  if v_exact.id is not null then
    update visitor_profiles
      set relation = coalesce(p_relation, relation), updated_at = now()
      where visitor_profiles.id = v_exact.id;
    return query select vp.id, vp.prenom, vp.nom, vp.photo, vp.motto, vp.relation
      from visitor_profiles vp where vp.id = v_exact.id;
    return;
  end if;

  select * into v_unclaimed from visitor_profiles vp
    where vp.space_id = p_space_id
      and lower(trim(vp.prenom)) = lower(trim(p_prenom))
      and lower(trim(vp.nom)) = lower(trim(p_nom))
      and vp.pin is null
    limit 1;

  if v_unclaimed.id is not null then
    update visitor_profiles
      set pin = p_pin, relation = coalesce(p_relation, relation), updated_at = now()
      where visitor_profiles.id = v_unclaimed.id;
    return query select vp.id, vp.prenom, vp.nom, vp.photo, vp.motto, vp.relation
      from visitor_profiles vp where vp.id = v_unclaimed.id;
    return;
  end if;

  return query
    insert into visitor_profiles (space_id, prenom, nom, pin, relation)
    values (p_space_id, trim(p_prenom), trim(p_nom), p_pin, p_relation)
    returning visitor_profiles.id, visitor_profiles.prenom, visitor_profiles.nom,
              visitor_profiles.photo, visitor_profiles.motto, visitor_profiles.relation;
end;
$$;

revoke all on function public.rpc_visitor_claim_or_create from public;
grant execute on function public.rpc_visitor_claim_or_create to anon, authenticated;

-- 7. Deux RPC dédiées pour les écritures existantes de app/(visitor)/account.tsx
--    (photo, motto/relation), cassées par le revoke update ci-dessus.

-- Met à jour uniquement la photo — appelé par account.tsx après upload storage.
create or replace function public.rpc_visitor_update_photo(
  p_space_id uuid, p_prenom text, p_nom text, p_pin text, p_photo text
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  update visitor_profiles
    set photo = p_photo, updated_at = now()
    where space_id = p_space_id
      and lower(trim(prenom)) = lower(trim(p_prenom))
      and lower(trim(nom)) = lower(trim(p_nom))
      and pin = p_pin;
end;
$$;

-- Met à jour uniquement motto/relation — appelé par account.tsx.
create or replace function public.rpc_visitor_update_motto_relation(
  p_space_id uuid, p_prenom text, p_nom text, p_pin text,
  p_motto text, p_relation text
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  update visitor_profiles
    set motto = p_motto, relation = p_relation, updated_at = now()
    where space_id = p_space_id
      and lower(trim(prenom)) = lower(trim(p_prenom))
      and lower(trim(nom)) = lower(trim(p_nom))
      and pin = p_pin;
end;
$$;

revoke all on function public.rpc_visitor_update_photo from public;
grant execute on function public.rpc_visitor_update_photo to anon, authenticated;
revoke all on function public.rpc_visitor_update_motto_relation from public;
grant execute on function public.rpc_visitor_update_motto_relation to anon, authenticated;

-- 8. Backfill : rattacher un PIN existant (dernière réservation avec pin non nul)
--    aux profils déjà en base qui n'en ont pas encore.
update visitor_profiles vp
set pin = sub.pin
from (
  select distinct on (space_id, lower(trim(prenom)), lower(trim(nom)))
    space_id, prenom, nom, pin
  from reservations
  where pin is not null and pin <> 'ADMIN'
  order by space_id, lower(trim(prenom)), lower(trim(nom)), created_at desc
) sub
where vp.space_id = sub.space_id
  and lower(trim(vp.prenom)) = lower(trim(sub.prenom))
  and lower(trim(vp.nom)) = lower(trim(sub.nom))
  and vp.pin is null;
