-- Le mode "1 visite / jour" ne s'appliquait qu'entre réservations "Visite" :
-- book_intervention() (soins/intervenants) ne le consultait pas du tout, et
-- check_slot_capacity() ne comptait pas les interventions existantes dans
-- son propre calcul du jour déjà pris. Résultat, mode actif ou non : on
-- pouvait quand même empiler plusieurs soins le même jour, ou un soin après
-- une visite déjà posée. Ce correctif traite Visite et Intervention comme
-- un seul et même "évènement du jour" pour le plafond, des deux côtés —
-- cohérent avec le fait qu'une intervention est déjà prioritaire sur les
-- visites (book_intervention recase automatiquement les visites en conflit
-- horaire, voir 20260717_book_intervention.sql).

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
  v_blocked boolean;
  v_one_visit_per_day boolean;
  v_day_taken boolean;
begin
  if new.type <> 'Visite' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.space_id::text || new.date::text || new.creneau, 0));

  select max_visitors_per_slot, slot_duration_minutes, one_visit_per_day
    into v_max, v_slot_duration, v_one_visit_per_day
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
    select 1 from reservations
    where space_id = new.space_id
      and date = new.date
      and type = 'Intervention'
      and to_minutes(creneau) < to_minutes(new.creneau) + coalesce(v_slot_duration, 0)
      and to_minutes(creneau) + coalesce(duration_minutes, 0) > to_minutes(new.creneau)
  ) into v_blocked;

  if v_blocked then
    raise exception 'SLOT_BLOCKED_BY_INTERVENTION';
  end if;

  if v_one_visit_per_day then
    perform pg_advisory_xact_lock(hashtextextended(new.space_id::text || new.date::text || 'one_visit_per_day', 0));

    select exists (
      select 1 from reservations
      where space_id = new.space_id
        and date = new.date
        and coalesce(alert_type, '') <> 'day_cap_suspended'
        and (
          type = 'Intervention'
          or (type = 'Visite'
            and creneau <> new.creneau
            and coalesce(group_id, id) <> coalesce(new.group_id, new.id))
        )
    ) into v_day_taken;

    if v_day_taken then
      raise exception 'DAY_ALREADY_BOOKED';
    end if;
  end if;

  return new;
end;
$$;

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
  v_intervention_id uuid;
  v_day_taken boolean;

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

  select * into v_config from slot_config where space_id = p_space_id;
  if not found then
    raise exception 'NO_SLOT_CONFIG_FOR_SPACE';
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

  -- Mode "1 visite / jour" : une intervention compte comme l'évènement du
  -- jour au même titre qu'une visite (voir check_slot_capacity() ci-dessus,
  -- même règle des deux côtés).
  if v_config.one_visit_per_day then
    perform pg_advisory_xact_lock(hashtextextended(p_space_id::text || p_date::text || 'one_visit_per_day', 0));

    select exists (
      select 1 from reservations
      where space_id = p_space_id
        and date = p_date
        and type in ('Visite', 'Intervention')
        and coalesce(alert_type, '') <> 'day_cap_suspended'
    ) into v_day_taken;

    if v_day_taken then
      raise exception 'DAY_ALREADY_BOOKED';
    end if;
  end if;

  insert into reservations (
    space_id, date, creneau, prenom, nom, telephone, type, pin,
    duration_minutes, intervention_label, intervenant_profile_id
  ) values (
    p_space_id, p_date, p_start_slot, v_prenom, v_nom, '', 'Intervention', p_pin,
    v_duration_minutes, v_label, p_intervenant_profile_id
  )
  returning id into v_intervention_id;

  -- Recasage des cohortes "Visite" dont le créneau chevauche la fenêtre de
  -- l'intervention qu'on vient d'insérer.
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

  return jsonb_build_object(
    'intervention_id', v_intervention_id,
    'rebooked', to_jsonb(v_rebooked),
    'failed', to_jsonb(v_failed)
  );
end;
$$;
