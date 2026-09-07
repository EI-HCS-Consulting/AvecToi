-- RPC de co-administration temporaire, sur le modèle "security definer,
-- identité vérifiée dans la fonction" déjà utilisé par book_intervention()
-- et les rpc_visitor_* (visitor_profiles est verrouillée derrière des RPC
-- depuis 20260901_visitor_profiles_pin_auth.sql).
--
-- Les deux fonctions résolvent d'abord la ligne patient_space_coadmins
-- correspondante (par space_id/prenom/nom, cache d'affichage) pour en tirer
-- visitor_id, puis vérifient TOUJOURS le pin contre ce visitor_id précis —
-- jamais contre "un visitor_profiles au hasard qui matche le nom" — pour
-- rester correct même si un homonyme existe dans le même espace.

-- 1. Acceptation d'une invitation de co-administration.
--    Prouve deux choses avant d'écrire quoi que ce soit : (a) l'appelant est
--    bien le visiteur visé (p_pin correspond à son visitor_profiles), (b) il
--    contrôle bien l'email fourni (code reçu par email, voir Edge Function
--    send-coadmin-verification-code, purpose="accept").
create or replace function public.accept_coadmin_invite(
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
  v_invite record;
  v_code record;
begin
  select * into v_invite
    from patient_space_coadmins c
    where c.space_id = p_space_id
      and lower(trim(c.prenom)) = lower(trim(p_prenom))
      and lower(trim(c.nom)) = lower(trim(p_nom))
      and c.active
      and c.accepted_at is null
    order by c.granted_at desc
    limit 1;

  if v_invite.id is null then
    raise exception 'NO_PENDING_INVITE';
  end if;

  if not exists (
    select 1 from visitor_profiles vp
    where vp.id = v_invite.visitor_id and vp.pin = p_pin
  ) then
    raise exception 'INVALID_PIN';
  end if;

  select * into v_code
    from coadmin_verification_codes vc
    where vc.space_id = p_space_id
      and lower(trim(vc.prenom)) = lower(trim(p_prenom))
      and lower(trim(vc.nom)) = lower(trim(p_nom))
      and vc.purpose = 'accept'
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

  update patient_space_coadmins
    set email = p_email, accepted_at = now()
    where id = v_invite.id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.accept_coadmin_invite from public;
grant execute on function public.accept_coadmin_invite to anon, authenticated;

-- 2. Reset self-service du PIN d'un co-admin actif, par email — sans passer
--    par l'admin d'origine (contrairement à rpc_admin_reset_visitor_pin,
--    qui exige une action authentifiée de l'admin réel). Volontairement
--    réservé aux lignes actives+acceptées : un visiteur normal garde le
--    flux existant pin_reset_requests → admin.
create or replace function public.reset_coadmin_pin_via_email(
  p_space_id uuid,
  p_prenom text,
  p_nom text,
  p_email text,
  p_new_pin text,
  p_code text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coadmin record;
  v_code record;
begin
  select * into v_coadmin
    from patient_space_coadmins c
    where c.space_id = p_space_id
      and lower(trim(c.prenom)) = lower(trim(p_prenom))
      and lower(trim(c.nom)) = lower(trim(p_nom))
      and c.active
      and c.accepted_at is not null
      and lower(trim(c.email)) = lower(trim(p_email))
    order by c.granted_at desc
    limit 1;

  if v_coadmin.id is null then
    raise exception 'NOT_AN_ACTIVE_COADMIN';
  end if;

  select * into v_code
    from coadmin_verification_codes vc
    where vc.space_id = p_space_id
      and lower(trim(vc.prenom)) = lower(trim(p_prenom))
      and lower(trim(vc.nom)) = lower(trim(p_nom))
      and vc.purpose = 'reset'
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
    set pin = p_new_pin, updated_at = now()
    where id = v_coadmin.visitor_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.reset_coadmin_pin_via_email from public;
grant execute on function public.reset_coadmin_pin_via_email to anon, authenticated;
