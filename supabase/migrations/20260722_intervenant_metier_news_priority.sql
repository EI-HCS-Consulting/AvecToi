-- Bundle de 3 additions schema (session du 22/07) :
-- 1. Métier/spécialisation de l'intervenant, saisi à la création de sa fiche
--    (voir components/IntervenantFicheModal.tsx).
-- 2. Visibilité "Nouvelles du jour" aux visiteurs pour les messages postés par
--    des intervenants — masqués par défaut (canal dédié intervenants+admin),
--    activable par espace via un bouton admin (voir components/NewsFeed.tsx).
-- 3. Priorité des créneaux intervenants configurable : "all" (comportement
--    actuel, tous les intervenants sont prioritaires sur les visites) ou
--    "selected" (seuls les intervenants avec priority_slots=true le sont).
--    Défaut 'all' + priority_slots=true partout : aucun changement de
--    comportement tant que l'admin n'ouvre pas le nouveau popup dédié.

alter table intervenant_profiles
  add column if not exists metier text;

alter table patient_spaces
  add column if not exists intervenant_news_visible_to_visitors boolean not null default false;

alter table news_entries
  add column if not exists author_role text not null default 'visiteur'
    check (author_role in ('visiteur', 'intervenant', 'admin'));

update news_entries set author_role = 'admin' where author_pin = 'ADMIN' and author_role <> 'admin';

alter table slot_config
  add column if not exists intervenant_priority_mode text not null default 'all'
    check (intervenant_priority_mode in ('all', 'selected'));

alter table intervenant_profiles
  add column if not exists priority_slots boolean not null default true;

-- ─── check_slot_capacity() : la réservation 'Visite' n'est bloquée par une
-- intervention que si celle-ci est prioritaire (mode 'all', ou intervenant
-- avec priority_slots=true en mode 'selected'). Ne change rien tant que
-- intervenant_priority_mode reste à 'all' (défaut).
create or replace function public.check_slot_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max integer;
  v_count integer;
  v_slot_duration integer;
  v_priority_mode text;
  v_blocked boolean;
begin
  if new.type <> 'Visite' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.space_id::text || new.date::text || new.creneau, 0));

  select max_visitors_per_slot, slot_duration_minutes, intervenant_priority_mode
    into v_max, v_slot_duration, v_priority_mode
    from slot_config where space_id = new.space_id;
  if v_max is null then
    return new;
  end if;

  select count(*) into v_count from reservations
    where space_id = new.space_id
      and date = new.date
      and creneau = new.creneau
      and type = 'Visite'
      and id <> new.id;

  if v_count >= v_max then
    raise exception 'SLOT_FULL';
  end if;

  select exists (
    select 1 from reservations r
    left join intervenant_profiles ip on ip.id = r.intervenant_profile_id
    where r.space_id = new.space_id
      and r.date = new.date
      and r.type = 'Intervention'
      and to_minutes(r.creneau) < to_minutes(new.creneau) + coalesce(v_slot_duration, 0)
      and to_minutes(r.creneau) + coalesce(r.duration_minutes, 0) > to_minutes(new.creneau)
      and (coalesce(v_priority_mode, 'all') = 'all' or coalesce(ip.priority_slots, true))
  ) into v_blocked;

  if v_blocked then
    raise exception 'SLOT_BLOCKED_BY_INTERVENTION';
  end if;

  return new;
end;
$$;

-- ─── book_intervention() : le recasage automatique des visites chevauchant
-- l'intervention n'a lieu que si l'intervention est prioritaire (v_priority).
-- Sinon l'intervention est insérée telle quelle (coexiste avec les visites
-- déjà en place, comme n'importe quelle réservation non bloquante).
create or replace function public.book_intervention(
  p_space_id uuid,
  p_intervenant_profile_id uuid,
  p_intervention_type_id uuid,
  p_date date,
  p_start_slot text,
  p_pin text,
  p_slots text[]
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prenom text;
  v_nom text;
  v_duration_minutes integer;
  v_label text;
  v_start_min integer;
  v_end_min integer;
  v_config slot_config%rowtype;
  v_priority boolean;
  v_intervention_id uuid;

  v_rebooked uuid[] := array[]::uuid[];
  v_failed uuid[] := array[]::uuid[];

  v_cohort record;
  v_same_day_slots text[];
  v_day_slots text[];
  v_candidate_date date;
  v_candidate_slot text;
  v_target_date date;
  v_target_creneau text;
  v_found boolean;
  v_occ_count integer;
  v_overlaps_intervention boolean;
  v_i integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_space_id::text));

  p_slots := coalesce(p_slots, array[]::text[]);

  select prenom, nom into v_prenom, v_nom
    from intervenant_profiles
    where id = p_intervenant_profile_id and space_id = p_space_id;
  if not found then
    raise exception 'INTERVENANT_NOT_FOUND';
  end if;

  select label, duration_minutes into v_label, v_duration_minutes
    from intervention_types
    where id = p_intervention_type_id and intervenant_profile_id = p_intervenant_profile_id;
  if not found then
    raise exception 'INTERVENTION_TYPE_NOT_FOUND';
  end if;

  v_start_min := to_minutes(p_start_slot);
  v_end_min := v_start_min + v_duration_minutes;
  if v_end_min > 1440 then
    raise exception 'INTERVENTION_CROSSES_MIDNIGHT';
  end if;

  -- Un même intervenant ne peut pas chevaucher deux de ses propres
  -- interventions ce jour-là (des intervenants différents peuvent en
  -- revanche intervenir en même temps — ex. infirmière + kiné).
  if exists (
    select 1 from reservations
    where space_id = p_space_id
      and type = 'Intervention'
      and date = p_date
      and intervenant_profile_id = p_intervenant_profile_id
      and to_minutes(creneau) < v_end_min
      and to_minutes(creneau) + coalesce(duration_minutes, 0) > v_start_min
  ) then
    raise exception 'INTERVENTION_OVERLAP_SELF';
  end if;

  select * into v_config from slot_config where space_id = p_space_id;
  if not found then
    raise exception 'NO_SLOT_CONFIG_FOR_SPACE';
  end if;

  select (coalesce(v_config.intervenant_priority_mode, 'all') = 'all' or coalesce(priority_slots, true))
    into v_priority
    from intervenant_profiles where id = p_intervenant_profile_id;

  insert into reservations (
    space_id, date, creneau, prenom, nom, telephone, type, pin,
    duration_minutes, intervention_label, intervenant_profile_id
  ) values (
    p_space_id, p_date, p_start_slot, v_prenom, v_nom, '', 'Intervention', p_pin,
    v_duration_minutes, v_label, p_intervenant_profile_id
  )
  returning id into v_intervention_id;

  -- Recasage des cohortes "Visite" dont le créneau chevauche la fenêtre de
  -- l'intervention qu'on vient d'insérer — uniquement si elle est prioritaire.
  if v_priority then
  for v_cohort in
    select
      coalesce(group_id, id) as cohort_key,
      (array_agg(creneau order by created_at))[1] as cohort_creneau,
      array_agg(id order by created_at) as member_ids,
      count(*) as cohort_size
    from reservations
    where space_id = p_space_id and type = 'Visite' and date = p_date
    group by coalesce(group_id, id)
    having to_minutes((array_agg(creneau order by created_at))[1]) < v_end_min
       and to_minutes((array_agg(creneau order by created_at))[1]) + v_config.slot_duration_minutes > v_start_min
  loop
    select coalesce(array_agg(s order by abs(to_minutes(s) - to_minutes(v_cohort.cohort_creneau))), array[]::text[])
      into v_same_day_slots
      from unnest(p_slots) s;

    v_target_date := null;
    v_target_creneau := null;

    <<day_loop>>
    for v_i in 0..60 loop
      v_candidate_date := p_date + v_i;

      if not (extract(dow from v_candidate_date)::integer = any(v_config.allowed_weekdays)) then
        continue;
      end if;
      if to_char(v_candidate_date, 'YYYY-MM-DD') = any(v_config.blocked_dates) then
        continue;
      end if;

      v_day_slots := case when v_i = 0 then v_same_day_slots else p_slots end;

      foreach v_candidate_slot in array v_day_slots loop
        select count(*) into v_occ_count from reservations
          where space_id = p_space_id and date = v_candidate_date and creneau = v_candidate_slot
            and type = 'Visite' and not (id = any(v_cohort.member_ids));

        select exists (
          select 1 from reservations
          where space_id = p_space_id and date = v_candidate_date and type = 'Intervention'
            and to_minutes(creneau) < to_minutes(v_candidate_slot) + v_config.slot_duration_minutes
            and to_minutes(creneau) + coalesce(duration_minutes, 0) > to_minutes(v_candidate_slot)
        ) into v_overlaps_intervention;

        if v_occ_count + v_cohort.cohort_size <= v_config.max_visitors_per_slot and not v_overlaps_intervention then
          v_target_date := v_candidate_date;
          v_target_creneau := v_candidate_slot;
          exit day_loop;
        end if;
      end loop;
    end loop day_loop;

    if v_target_date is not null then
      update reservations set
        date = v_target_date,
        creneau = v_target_creneau,
        previous_date = date,
        previous_creneau = creneau,
        alert_type = 'rebooked',
        alert_message = 'Une intervention (' || v_label || ') est prioritaire sur votre créneau du '
          || to_char(p_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
          || '. Votre réservation a été automatiquement déplacée au '
          || to_char(v_target_date, 'DD/MM/YYYY') || ' à ' || v_target_creneau || '.',
        alert_seen = false
      where id = any(v_cohort.member_ids);

      insert into reservation_change_history (
        space_id, reservation_id, prenom, nom, type, change_type,
        previous_date, previous_creneau, new_date, new_creneau, message
      )
      select p_space_id, id, prenom, nom, type, 'rebooked',
        p_date, v_cohort.cohort_creneau, v_target_date, v_target_creneau,
        'Créneau prioritaire attribué à une intervention (' || v_label || '), réservation du '
          || to_char(p_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
          || ' automatiquement déplacée au ' || to_char(v_target_date, 'DD/MM/YYYY')
          || ' à ' || v_target_creneau || '.'
      from reservations where id = any(v_cohort.member_ids);

      v_rebooked := v_rebooked || v_cohort.member_ids;
    else
      update reservations set
        alert_type = 'rebooking_failed',
        alert_message = 'Une intervention (' || v_label || ') est prioritaire sur votre créneau du '
          || to_char(p_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
          || '. Nous n''avons pas pu automatiquement replacer votre réservation. '
          || 'Merci de contacter l''organisateur pour choisir un nouveau créneau.',
        alert_seen = false
      where id = any(v_cohort.member_ids);

      insert into reservation_change_history (
        space_id, reservation_id, prenom, nom, type, change_type,
        previous_date, previous_creneau, new_date, new_creneau, message
      )
      select p_space_id, id, prenom, nom, type, 'rebooking_failed',
        p_date, v_cohort.cohort_creneau, null, null,
        'Créneau prioritaire attribué à une intervention (' || v_label || '), réservation du '
          || to_char(p_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
          || ' n''a pas pu être automatiquement replacée.'
      from reservations where id = any(v_cohort.member_ids);

      v_failed := v_failed || v_cohort.member_ids;
    end if;
  end loop;
  end if;

  return jsonb_build_object(
    'intervention_id', v_intervention_id,
    'rebooked', to_jsonb(v_rebooked),
    'failed', to_jsonb(v_failed)
  );
end;
$$;

grant execute on function public.book_intervention(uuid, uuid, uuid, date, text, text, text[])
  to anon, authenticated;
