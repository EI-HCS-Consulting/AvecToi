-- Généralise l'email vérifié : jusqu'ici seul un octroi de co-administration
-- (patient_space_coadmins.email) ou une ligne task_relais_coverage.email
-- gardait trace de l'email confirmé par un visiteur au moment d'une
-- proposition de relais (voir 20260908_coadmin_propose_verification.sql).
-- Cet email doit désormais être conservé sur le profil visiteur lui-même
-- (visitor_profiles.email), pour deux usages :
--   1. Affiché/modifiable dans Mon compte / Mes informations, et réutilisé
--      pour sauter les étapes email/code d'une prochaine prise en charge de
--      besoin SOS (voir Entraide.tsx, openClaim).
--   2. Utilisable pour l'auto-réinitialisation du code (PIN) par email, sans
--      passer par l'admin — plus seulement réservé aux co-administrateurs
--      actifs (voir app/auth/visitor-identify.tsx).

alter table public.visitor_profiles
  add column if not exists email text;

comment on column public.visitor_profiles.email is
  'Email vérifié par code (voir coadmin_verification_codes) — sert à sauter la vérification sur une prochaine proposition de relais et à l''auto-réinitialisation du PIN sans admin. NULL = aucun email vérifié pour ce profil.';

-- Backfill : les co-administrateurs déjà actifs ont un email vérifié en
-- patient_space_coadmins (copié au moment de l'octroi depuis
-- task_relais_coverage.email, voir app/(admin)/coadmins.tsx handleGrant) mais
-- jamais encore écrit sur leur profil — sans ce backfill, ils perdraient leur
-- accès à l'auto-réinitialisation le temps de reproposer un relais.
update public.visitor_profiles vp
set email = sub.email
from (
  select distinct on (space_id, lower(trim(prenom)), lower(trim(nom)))
    space_id, prenom, nom, email
  from public.patient_space_coadmins
  where email is not null and active and accepted_at is not null
  order by space_id, lower(trim(prenom)), lower(trim(nom)), granted_at desc
) sub
where vp.space_id = sub.space_id
  and lower(trim(vp.prenom)) = lower(trim(sub.prenom))
  and lower(trim(vp.nom)) = lower(trim(sub.nom))
  and vp.email is null;

-- Reprend verify_coadmin_proposal_code (20260908_coadmin_propose_verification.sql)
-- en y ajoutant la persistance de l'email vérifié sur le profil — désormais
-- CHAQUE proposition de relais vérifiée alimente visitor_profiles.email, pas
-- seulement celles qui aboutissent à un octroi de co-administration.
create or replace function public.verify_coadmin_proposal_code(
  p_space_id uuid,
  p_prenom text,
  p_nom text,
  p_pin text,
  p_email text,
  p_code text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code record;
begin
  if not exists (
    select 1 from visitor_profiles vp
    where vp.space_id = p_space_id
      and lower(trim(vp.prenom)) = lower(trim(p_prenom))
      and lower(trim(vp.nom)) = lower(trim(p_nom))
      and vp.pin = p_pin
  ) then
    raise exception 'INVALID_PIN';
  end if;

  select * into v_code
    from coadmin_verification_codes vc
    where vc.space_id = p_space_id
      and lower(trim(vc.prenom)) = lower(trim(p_prenom))
      and lower(trim(vc.nom)) = lower(trim(p_nom))
      and vc.purpose = 'propose'
      and lower(trim(vc.email)) = lower(trim(p_email))
      and vc.code = p_code
      and vc.used_at is null
      and vc.expires_at > now()
    order by vc.created_at desc
    limit 1;

  if v_code.id is null then
    raise exception 'INVALID_OR_EXPIRED_CODE';
  end if;

  update coadmin_verification_codes set used_at = now() where id = v_code.id;

  update visitor_profiles
    set email = trim(p_email), updated_at = now()
    where space_id = p_space_id
      and lower(trim(prenom)) = lower(trim(p_prenom))
      and lower(trim(nom)) = lower(trim(p_nom))
      and pin = p_pin;

  return jsonb_build_object('ok', true);
end;
$$;

-- Lecture pin-gated de l'email — utilisé par Mon compte (pré-remplir le
-- champ) et par Entraide.tsx (savoir si les étapes email/code d'une
-- proposition de relais peuvent être sautées).
create or replace function public.rpc_visitor_get_email(
  p_space_id uuid, p_prenom text, p_nom text, p_pin text
) returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_email text;
begin
  select email into v_email
    from visitor_profiles
    where space_id = p_space_id
      and lower(trim(prenom)) = lower(trim(p_prenom))
      and lower(trim(nom)) = lower(trim(p_nom))
      and pin = p_pin;
  return v_email;
end;
$$;

-- Écriture pin-gated de l'email, directement depuis Mon compte / Mes
-- informations — même garde-fou que rpc_visitor_update_photo/
-- rpc_visitor_update_motto_relation : la session visiteur (PIN déjà saisi à
-- la connexion) suffit, pas de nouvelle vérification par code ici (l'email
-- n'a besoin d'être vérifié par code que la première fois, via une
-- proposition de relais — voir verify_coadmin_proposal_code ci-dessus).
create or replace function public.rpc_visitor_update_email(
  p_space_id uuid, p_prenom text, p_nom text, p_pin text, p_email text
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  update visitor_profiles
    set email = nullif(trim(p_email), ''), updated_at = now()
    where space_id = p_space_id
      and lower(trim(prenom)) = lower(trim(p_prenom))
      and lower(trim(nom)) = lower(trim(p_nom))
      and pin = p_pin;
end;
$$;

-- Sans pin (justement destiné à un visiteur qui l'a perdu) : juste un
-- booléen, jamais l'email lui-même, pour décider d'afficher ou non le lien
-- "Réinitialiser mon code par email" sur l'écran "Qui êtes-vous ?" (voir
-- app/auth/visitor-identify.tsx) — remplace le gating précédent, réservé aux
-- seuls co-administrateurs actifs (checkCoAdminStatus==="active").
create or replace function public.rpc_visitor_has_email(
  p_space_id uuid, p_prenom text, p_nom text
) returns boolean
language plpgsql security definer set search_path = public
as $$
begin
  return exists (
    select 1 from visitor_profiles
    where space_id = p_space_id
      and lower(trim(prenom)) = lower(trim(p_prenom))
      and lower(trim(nom)) = lower(trim(p_nom))
      and email is not null
      and length(trim(email)) > 0
  );
end;
$$;

-- Réinitialisation du PIN par email, généralisée à tout visiteur ayant un
-- email vérifié sur son profil (plus seulement les co-administrateurs actifs,
-- voir reset_coadmin_pin_via_email dans 20260907_coadmin_rpcs.sql, conservée
-- telle quelle pour compat descendante mais plus appelée côté client).
-- Volontairement sans paramètre p_email : le visiteur qui a perdu son code
-- n'a rien à ressaisir, l'adresse est résolue ici depuis visitor_profiles,
-- exactement comme côté Edge Function (send-coadmin-verification-code,
-- branche "reset") qui envoie déjà le code à cette même adresse sans jamais
-- la transmettre au client.
create or replace function public.reset_visitor_pin_via_email(
  p_space_id uuid,
  p_prenom text,
  p_nom text,
  p_new_pin text,
  p_code text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
  v_code record;
begin
  select * into v_profile
    from visitor_profiles vp
    where vp.space_id = p_space_id
      and lower(trim(vp.prenom)) = lower(trim(p_prenom))
      and lower(trim(vp.nom)) = lower(trim(p_nom))
      and vp.email is not null;

  if v_profile.id is null then
    raise exception 'NO_MATCHING_PROFILE';
  end if;

  select * into v_code
    from coadmin_verification_codes vc
    where vc.space_id = p_space_id
      and lower(trim(vc.prenom)) = lower(trim(p_prenom))
      and lower(trim(vc.nom)) = lower(trim(p_nom))
      and vc.purpose = 'reset'
      and lower(trim(vc.email)) = lower(trim(v_profile.email))
      and vc.code = p_code
      and vc.used_at is null
      and vc.expires_at > now()
    order by vc.created_at desc
    limit 1;

  if v_code.id is null then
    raise exception 'INVALID_OR_EXPIRED_CODE';
  end if;

  update coadmin_verification_codes set used_at = now() where id = v_code.id;

  update visitor_profiles
    set pin = p_new_pin, updated_at = now()
    where id = v_profile.id;
end;
$$;

revoke all on function public.rpc_visitor_get_email from public;
grant execute on function public.rpc_visitor_get_email to anon, authenticated;
revoke all on function public.rpc_visitor_update_email from public;
grant execute on function public.rpc_visitor_update_email to anon, authenticated;
revoke all on function public.rpc_visitor_has_email from public;
grant execute on function public.rpc_visitor_has_email to anon, authenticated;
revoke all on function public.reset_visitor_pin_via_email from public;
grant execute on function public.reset_visitor_pin_via_email to anon, authenticated;
