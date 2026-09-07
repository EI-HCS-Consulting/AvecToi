-- Chemin d'écriture co-admin pour les réglages d'espace (settings.tsx). Même
-- modèle "security definer, identité vérifiée dans la fonction" que les
-- autres RPC co-admin (20260907_coadmin_rpcs.sql,
-- 20260907_apply_slot_rule_change_coadmin_auth.sql) : résout d'abord la
-- ligne patient_space_coadmins active+acceptée pour en tirer visitor_id, puis
-- vérifie TOUJOURS le pin contre ce visitor_id précis.
--
-- p_patch est un jsonb clé/valeur mais PAS interprété dynamiquement : seules
-- les colonnes explicitement listées ci-dessous sont jamais écrites, même si
-- p_patch contient d'autres clés (aucun accès à admin_id, admin_pin,
-- admin_firstname/lastname, premium, rgpd_*, intervenants_enabled — cette
-- dernière reste une bascule Premium gérée uniquement par l'admin réel via le
-- chemin .update() existant, hors périmètre co-admin).
create or replace function public.update_space_as_coadmin(
  p_space_id uuid,
  p_caller_prenom text,
  p_caller_nom text,
  p_caller_pin text,
  p_patch jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coadmin record;
begin
  select * into v_coadmin
    from patient_space_coadmins c
    where c.space_id = p_space_id
      and lower(trim(c.prenom)) = lower(trim(p_caller_prenom))
      and lower(trim(c.nom)) = lower(trim(p_caller_nom))
      and c.active
      and c.accepted_at is not null
    order by c.granted_at desc
    limit 1;

  if v_coadmin.id is null then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if not exists (
    select 1 from visitor_profiles vp
    where vp.id = v_coadmin.visitor_id and vp.pin = p_caller_pin
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  update patient_spaces set
    patient_motto = case when p_patch ? 'patient_motto' then p_patch->>'patient_motto' else patient_motto end,
    patient_admission_date = case when p_patch ? 'patient_admission_date' then (p_patch->>'patient_admission_date')::date else patient_admission_date end,
    patient_discharge_date = case when p_patch ? 'patient_discharge_date' then (p_patch->>'patient_discharge_date')::date else patient_discharge_date end,
    patient_birthdate = case when p_patch ? 'patient_birthdate' then (p_patch->>'patient_birthdate')::date else patient_birthdate end,
    patient_sex = case when p_patch ? 'patient_sex' then p_patch->>'patient_sex' else patient_sex end,
    patient_blood_type = case when p_patch ? 'patient_blood_type' then p_patch->>'patient_blood_type' else patient_blood_type end,
    patient_allergies = case when p_patch ? 'patient_allergies' then p_patch->>'patient_allergies' else patient_allergies end,
    patient_photo_url = case when p_patch ? 'patient_photo_url' then p_patch->>'patient_photo_url' else patient_photo_url end,
    hospital_room = case when p_patch ? 'hospital_room' then p_patch->>'hospital_room' else hospital_room end,
    hospital_service = case when p_patch ? 'hospital_service' then p_patch->>'hospital_service' else hospital_service end,
    hospital_sector = case when p_patch ? 'hospital_sector' then p_patch->>'hospital_sector' else hospital_sector end,
    hospital_address_line2 = case when p_patch ? 'hospital_address_line2' then p_patch->>'hospital_address_line2' else hospital_address_line2 end,
    hospital_name = case when p_patch ? 'hospital_name' then p_patch->>'hospital_name' else hospital_name end,
    hospital_address = case when p_patch ? 'hospital_address' then p_patch->>'hospital_address' else hospital_address end,
    hospital_postal_code = case when p_patch ? 'hospital_postal_code' then p_patch->>'hospital_postal_code' else hospital_postal_code end,
    hospital_city = case when p_patch ? 'hospital_city' then p_patch->>'hospital_city' else hospital_city end,
    hospital_country = case when p_patch ? 'hospital_country' then p_patch->>'hospital_country' else hospital_country end,
    hospital_maps_url = case when p_patch ? 'hospital_maps_url' then p_patch->>'hospital_maps_url' else hospital_maps_url end,
    home_care_mode = case when p_patch ? 'home_care_mode' then (p_patch->>'home_care_mode')::boolean else home_care_mode end,
    home_address = case when p_patch ? 'home_address' then p_patch->>'home_address' else home_address end,
    home_address_line2 = case when p_patch ? 'home_address_line2' then p_patch->>'home_address_line2' else home_address_line2 end,
    home_postal_code = case when p_patch ? 'home_postal_code' then p_patch->>'home_postal_code' else home_postal_code end,
    home_city = case when p_patch ? 'home_city' then p_patch->>'home_city' else home_city end,
    home_country = case when p_patch ? 'home_country' then p_patch->>'home_country' else home_country end,
    home_maps_url = case when p_patch ? 'home_maps_url' then p_patch->>'home_maps_url' else home_maps_url end,
    visit_rules = case when p_patch ? 'visit_rules' then p_patch->>'visit_rules' else visit_rules end
  where id = p_space_id;

  if not found then
    raise exception 'SPACE_NOT_FOUND';
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.update_space_as_coadmin from public;
grant execute on function public.update_space_as_coadmin to anon, authenticated;
