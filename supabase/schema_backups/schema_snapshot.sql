


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "storage";


ALTER SCHEMA "storage" OWNER TO "supabase_admin";


CREATE TYPE "storage"."buckettype" AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


ALTER TYPE "storage"."buckettype" OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "public"."apply_slot_rule_change"("p_space_id" "uuid", "p_new_config" "jsonb", "p_new_slots" "text"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_old slot_config%rowtype;

  v_visit_start_hour integer;
  v_visit_end_hour integer;
  v_slot_duration_minutes integer;
  v_min_gap_minutes integer;
  v_gap_includes_duration boolean;
  v_max_visitors_per_slot integer;
  v_allowed_weekdays integer[];
  v_blocked_dates text[];
  v_blocked_date_reasons jsonb;
  v_night_enabled boolean;
  v_night_start_hour integer;
  v_night_end_hour integer;
  v_max_night_visitors integer;
  v_one_visit_per_day boolean;

  v_structural_change boolean;
  v_weekday_blocked_changed boolean;
  v_night_scan_needed boolean;
  v_night_became_disabled boolean;
  v_one_visit_activated boolean;

  v_rebooked uuid[] := array[]::uuid[];
  v_night_cancelled uuid[] := array[]::uuid[];
  v_failed uuid[] := array[]::uuid[];
  v_day_cap_suspended uuid[] := array[]::uuid[];

  v_cohort record;
  v_night record;
  v_same_day_slots text[];
  v_day_slots text[];
  v_candidate_date date;
  v_candidate_slot text;
  v_target_date date;
  v_target_creneau text;
  v_found boolean;
  v_occ_count integer;
  v_overlaps_intervention boolean;
  v_night_invalid boolean;
  v_i integer;

  v_daycap_date date;
  v_winning_cohort uuid;
  v_loser record;
begin
  perform pg_advisory_xact_lock(hashtext(p_space_id::text));

  p_new_slots := coalesce(p_new_slots, array[]::text[]);

  select * into v_old from slot_config where space_id = p_space_id;
  if not found then
    raise exception 'NO_SLOT_CONFIG_FOR_SPACE';
  end if;

  v_visit_start_hour := case when p_new_config ? 'visit_start_hour'
    then (p_new_config->>'visit_start_hour')::integer else v_old.visit_start_hour end;
  v_visit_end_hour := case when p_new_config ? 'visit_end_hour'
    then (p_new_config->>'visit_end_hour')::integer else v_old.visit_end_hour end;
  v_slot_duration_minutes := case when p_new_config ? 'slot_duration_minutes'
    then (p_new_config->>'slot_duration_minutes')::integer else v_old.slot_duration_minutes end;
  v_min_gap_minutes := case when p_new_config ? 'min_gap_minutes'
    then (p_new_config->>'min_gap_minutes')::integer else v_old.min_gap_minutes end;
  v_gap_includes_duration := case when p_new_config ? 'gap_includes_duration'
    then (p_new_config->>'gap_includes_duration')::boolean else v_old.gap_includes_duration end;
  v_max_visitors_per_slot := case when p_new_config ? 'max_visitors_per_slot'
    then (p_new_config->>'max_visitors_per_slot')::integer else v_old.max_visitors_per_slot end;
  v_allowed_weekdays := case when p_new_config ? 'allowed_weekdays'
    then (select coalesce(array_agg(x::integer), array[]::integer[]) from jsonb_array_elements_text(p_new_config->'allowed_weekdays') x)
    else v_old.allowed_weekdays end;
  v_blocked_dates := case when p_new_config ? 'blocked_dates'
    then (select coalesce(array_agg(x), array[]::text[]) from jsonb_array_elements_text(p_new_config->'blocked_dates') x)
    else v_old.blocked_dates end;
  v_blocked_date_reasons := case when p_new_config ? 'blocked_date_reasons'
    then (p_new_config->'blocked_date_reasons') else v_old.blocked_date_reasons end;
  v_night_enabled := case when p_new_config ? 'night_enabled'
    then (p_new_config->>'night_enabled')::boolean else v_old.night_enabled end;
  v_night_start_hour := case when p_new_config ? 'night_start_hour'
    then (p_new_config->>'night_start_hour')::integer else v_old.night_start_hour end;
  v_night_end_hour := case when p_new_config ? 'night_end_hour'
    then (p_new_config->>'night_end_hour')::integer else v_old.night_end_hour end;
  v_max_night_visitors := case when p_new_config ? 'max_night_visitors'
    then (p_new_config->>'max_night_visitors')::integer else v_old.max_night_visitors end;
  v_one_visit_per_day := case when p_new_config ? 'one_visit_per_day'
    then (p_new_config->>'one_visit_per_day')::boolean else v_old.one_visit_per_day end;

  -- 1. Historique + config live
  insert into slot_config_history (
    space_id, valid_from, visit_start_hour, visit_end_hour, slot_duration_minutes,
    min_gap_minutes, gap_includes_duration, max_visitors_per_slot, allowed_weekdays,
    blocked_dates, blocked_date_reasons, night_enabled, night_start_hour,
    night_end_hour, max_night_visitors, one_visit_per_day
  ) values (
    p_space_id, current_date, v_visit_start_hour, v_visit_end_hour, v_slot_duration_minutes,
    v_min_gap_minutes, v_gap_includes_duration, v_max_visitors_per_slot, v_allowed_weekdays,
    v_blocked_dates, v_blocked_date_reasons, v_night_enabled, v_night_start_hour,
    v_night_end_hour, v_max_night_visitors, v_one_visit_per_day
  )
  on conflict (space_id, valid_from) do update set
    visit_start_hour = excluded.visit_start_hour,
    visit_end_hour = excluded.visit_end_hour,
    slot_duration_minutes = excluded.slot_duration_minutes,
    min_gap_minutes = excluded.min_gap_minutes,
    gap_includes_duration = excluded.gap_includes_duration,
    max_visitors_per_slot = excluded.max_visitors_per_slot,
    allowed_weekdays = excluded.allowed_weekdays,
    blocked_dates = excluded.blocked_dates,
    blocked_date_reasons = excluded.blocked_date_reasons,
    night_enabled = excluded.night_enabled,
    night_start_hour = excluded.night_start_hour,
    night_end_hour = excluded.night_end_hour,
    max_night_visitors = excluded.max_night_visitors,
    one_visit_per_day = excluded.one_visit_per_day;

  update slot_config set
    visit_start_hour = v_visit_start_hour,
    visit_end_hour = v_visit_end_hour,
    slot_duration_minutes = v_slot_duration_minutes,
    min_gap_minutes = v_min_gap_minutes,
    gap_includes_duration = v_gap_includes_duration,
    max_visitors_per_slot = v_max_visitors_per_slot,
    allowed_weekdays = v_allowed_weekdays,
    blocked_dates = v_blocked_dates,
    blocked_date_reasons = v_blocked_date_reasons,
    night_enabled = v_night_enabled,
    night_start_hour = v_night_start_hour,
    night_end_hour = v_night_end_hour,
    max_night_visitors = v_max_night_visitors,
    one_visit_per_day = v_one_visit_per_day
  where space_id = p_space_id;

  v_weekday_blocked_changed := (v_allowed_weekdays is distinct from v_old.allowed_weekdays)
    or (v_blocked_dates is distinct from v_old.blocked_dates);

  v_structural_change := v_weekday_blocked_changed
    or (v_visit_start_hour is distinct from v_old.visit_start_hour)
    or (v_visit_end_hour is distinct from v_old.visit_end_hour)
    or (v_slot_duration_minutes is distinct from v_old.slot_duration_minutes)
    or (v_min_gap_minutes is distinct from v_old.min_gap_minutes)
    or (v_gap_includes_duration is distinct from v_old.gap_includes_duration)
    or (v_max_visitors_per_slot is distinct from v_old.max_visitors_per_slot);

  v_night_became_disabled := v_old.night_enabled and not v_night_enabled;
  v_night_scan_needed := v_night_became_disabled or v_weekday_blocked_changed;
  v_one_visit_activated := (not coalesce(v_old.one_visit_per_day, false)) and coalesce(v_one_visit_per_day, false);

  -- 2. Recasage des réservations "Visite" futures invalidées
  if v_structural_change then
    for v_cohort in
      select
        coalesce(group_id, id) as cohort_key,
        (array_agg(date order by created_at))[1] as cohort_date,
        (array_agg(creneau order by created_at))[1] as cohort_creneau,
        array_agg(id order by created_at) as member_ids,
        count(*) as cohort_size
      from reservations
      where space_id = p_space_id and type = 'Visite' and date >= current_date
      group by coalesce(group_id, id)
      order by min(created_at) asc
    loop
      v_found := (v_cohort.cohort_creneau = any(p_new_slots))
        and (extract(dow from v_cohort.cohort_date)::integer = any(v_allowed_weekdays))
        and not (to_char(v_cohort.cohort_date, 'YYYY-MM-DD') = any(v_blocked_dates));

      if v_found then
        select count(*) into v_occ_count from reservations
          where space_id = p_space_id and date = v_cohort.cohort_date and creneau = v_cohort.cohort_creneau
            and type = 'Visite' and not (id = any(v_cohort.member_ids));
        if v_occ_count + v_cohort.cohort_size > v_max_visitors_per_slot then
          v_found := false;
        end if;
      end if;

      if v_found then
        continue; -- créneau toujours valide et non-saturé, rien à faire
      end if;

      -- Recherche du créneau valide le plus proche : même jour trié par
      -- distance, sinon jour par jour (ordre chronologique de p_new_slots).
      select coalesce(array_agg(s order by abs(to_minutes(s) - to_minutes(v_cohort.cohort_creneau))), array[]::text[])
        into v_same_day_slots
        from unnest(p_new_slots) s;

      v_target_date := null;
      v_target_creneau := null;

      <<day_loop>>
      for v_i in 0..60 loop
        v_candidate_date := v_cohort.cohort_date + v_i;

        if not (extract(dow from v_candidate_date)::integer = any(v_allowed_weekdays)) then
          continue;
        end if;
        if to_char(v_candidate_date, 'YYYY-MM-DD') = any(v_blocked_dates) then
          continue;
        end if;

        v_day_slots := case when v_i = 0 then v_same_day_slots else p_new_slots end;

        foreach v_candidate_slot in array v_day_slots loop
          select count(*) into v_occ_count from reservations
            where space_id = p_space_id and date = v_candidate_date and creneau = v_candidate_slot
              and type = 'Visite' and not (id = any(v_cohort.member_ids));

          -- Ajout intervenants : un créneau déjà couvert par une intervention
          -- (prioritaire) n'est jamais un candidat valide.
          select exists (
            select 1 from reservations
            where space_id = p_space_id and date = v_candidate_date and type = 'Intervention'
              and to_minutes(creneau) < to_minutes(v_candidate_slot) + v_slot_duration_minutes
              and to_minutes(creneau) + coalesce(duration_minutes, 0) > to_minutes(v_candidate_slot)
          ) into v_overlaps_intervention;

          if v_occ_count + v_cohort.cohort_size <= v_max_visitors_per_slot and not v_overlaps_intervention then
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
          alert_message = 'Suite à une modification des règles de visite, votre réservation du '
            || to_char(v_cohort.cohort_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
            || ' a été automatiquement déplacée au ' || to_char(v_target_date, 'DD/MM/YYYY')
            || ' à ' || v_target_creneau || '.',
          alert_seen = false
        where id = any(v_cohort.member_ids);

        insert into reservation_change_history (
          space_id, reservation_id, prenom, nom, type, change_type,
          previous_date, previous_creneau, new_date, new_creneau, message
        )
        select p_space_id, id, prenom, nom, type, 'rebooked',
          v_cohort.cohort_date, v_cohort.cohort_creneau, v_target_date, v_target_creneau,
          'Suite à une modification des règles de visite, réservation du '
            || to_char(v_cohort.cohort_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
            || ' automatiquement déplacée au ' || to_char(v_target_date, 'DD/MM/YYYY')
            || ' à ' || v_target_creneau || '.'
        from reservations where id = any(v_cohort.member_ids);

        v_rebooked := v_rebooked || v_cohort.member_ids;
      else
        update reservations set
          alert_type = 'rebooking_failed',
          alert_message = 'Suite à une modification des règles de visite, votre réservation du '
            || to_char(v_cohort.cohort_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
            || ' n''a pas pu être automatiquement replacée. Merci de contacter l''organisateur '
            || 'pour choisir un nouveau créneau.',
          alert_seen = false
        where id = any(v_cohort.member_ids);

        insert into reservation_change_history (
          space_id, reservation_id, prenom, nom, type, change_type,
          previous_date, previous_creneau, new_date, new_creneau, message
        )
        select p_space_id, id, prenom, nom, type, 'rebooking_failed',
          v_cohort.cohort_date, v_cohort.cohort_creneau, null, null,
          'Suite à une modification des règles de visite, réservation du '
            || to_char(v_cohort.cohort_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
            || ' n''a pas pu être automatiquement replacée.'
        from reservations where id = any(v_cohort.member_ids);

        v_failed := v_failed || v_cohort.member_ids;
      end if;
    end loop;
  end if;

  -- 3. Nuitées invalidées : message seul, jamais de déplacement/suppression
  if v_night_scan_needed then
    for v_night in
      select id, date from reservations
      where space_id = p_space_id and type = 'Nuit' and date >= current_date
    loop
      v_night_invalid := v_night_became_disabled
        or not (extract(dow from v_night.date)::integer = any(v_allowed_weekdays))
        or (to_char(v_night.date, 'YYYY-MM-DD') = any(v_blocked_dates));

      if v_night_invalid then
        update reservations set
          alert_type = 'night_cancelled',
          alert_message = 'Nuitée annulée suite au changement de consignes.',
          alert_seen = false
        where id = v_night.id;

        insert into reservation_change_history (
          space_id, reservation_id, prenom, nom, type, change_type,
          previous_date, previous_creneau, new_date, new_creneau, message
        )
        select p_space_id, id, prenom, nom, type, 'night_cancelled',
          date, creneau, date, creneau, 'Nuitée annulée suite au changement de consignes.'
        from reservations where id = v_night.id;

        v_night_cancelled := v_night_cancelled || v_night.id;
      end if;
    end loop;
  end if;

  -- 4. Activation du mode "1 visite / jour" : ne touche jamais le passé
  -- (date >= current_date), et ne déplace ni ne supprime rien — pour chaque
  -- jour où plusieurs réservations "Visite" existent déjà, la première
  -- enregistrée (created_at le plus ancien) reste active, toutes les autres
  -- sont marquées "day_cap_suspended".
  if v_one_visit_activated then
    for v_daycap_date in
      select date
      from reservations
      where space_id = p_space_id and type = 'Visite' and date >= current_date
      group by date
      having count(distinct coalesce(group_id, id)) > 1
    loop
      select coalesce(group_id, id) into v_winning_cohort
      from reservations
      where space_id = p_space_id and type = 'Visite' and date = v_daycap_date
      group by coalesce(group_id, id)
      order by min(created_at) asc
      limit 1;

      for v_loser in
        select id, prenom, nom, type, date, creneau
        from reservations
        where space_id = p_space_id and type = 'Visite' and date = v_daycap_date
          and coalesce(group_id, id) <> v_winning_cohort
      loop
        update reservations set
          alert_type = 'day_cap_suspended',
          alert_message = 'Le mode "1 visite par jour" a été activé : votre réservation du '
            || to_char(v_loser.date, 'DD/MM/YYYY') || ' à ' || v_loser.creneau
            || ' a été suspendue car une autre réservation existait déjà ce jour-là. '
            || 'Modifiez-la pour choisir un autre jour.',
          alert_seen = false
        where id = v_loser.id;

        insert into reservation_change_history (
          space_id, reservation_id, prenom, nom, type, change_type,
          previous_date, previous_creneau, new_date, new_creneau, message
        ) values (
          p_space_id, v_loser.id, v_loser.prenom, v_loser.nom, v_loser.type, 'day_cap_suspended',
          v_loser.date, v_loser.creneau, v_loser.date, v_loser.creneau,
          'Réservation du ' || to_char(v_loser.date, 'DD/MM/YYYY') || ' à ' || v_loser.creneau
            || ' suspendue suite à l''activation du mode "1 visite par jour".'
        );

        v_day_cap_suspended := v_day_cap_suspended || v_loser.id;
      end loop;
    end loop;
  end if;

  return jsonb_build_object(
    'rebooked', to_jsonb(v_rebooked),
    'night_cancelled', to_jsonb(v_night_cancelled),
    'failed', to_jsonb(v_failed),
    'day_cap_suspended', to_jsonb(v_day_cap_suspended)
  );
end;
$$;


ALTER FUNCTION "public"."apply_slot_rule_change"("p_space_id" "uuid", "p_new_config" "jsonb", "p_new_slots" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."book_intervention"("p_space_id" "uuid", "p_intervenant_profile_id" "uuid", "p_intervention_type_id" "uuid", "p_date" "date", "p_start_slot" "text", "p_pin" "text", "p_slots" "text"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."book_intervention"("p_space_id" "uuid", "p_intervenant_profile_id" "uuid", "p_intervention_type_id" "uuid", "p_date" "date", "p_start_slot" "text", "p_pin" "text", "p_slots" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_slot_capacity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."check_slot_capacity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_visite_cap"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_premium boolean;
  v_count integer;
begin
  if new.type <> 'Visite' then
    return new;
  end if;

  select premium into v_premium from patient_spaces where id = new.space_id;
  if v_premium then
    return new;
  end if;

  select count(*) into v_count from reservations
    where space_id = new.space_id and type = 'Visite';

  if v_count >= 8 then
    raise exception 'FREEMIUM_CAP_REACHED';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."check_visite_cap"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_cap_reached"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_premium boolean;
  v_count integer;
  v_updated integer;
  v_url text := 'https://flmslcdzjuifkivmzins.supabase.co/functions/v1/notify-cap-reached';
  v_secret text := 'AvecToi2026PurgeSecret8742';
begin
  if new.type <> 'Visite' then
    return new;
  end if;

  select premium into v_premium from patient_spaces where id = new.space_id;
  if v_premium then
    return new;
  end if;

  select count(*) into v_count from reservations
    where space_id = new.space_id and type = 'Visite';

  if v_count = 8 then
    update patient_spaces
      set cap_email_sent_at = now()
      where id = new.space_id and cap_email_sent_at is null;
    get diagnostics v_updated = row_count;

    if v_updated > 0 then
      begin
        perform net.http_post(
          url := v_url,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_secret
          ),
          body := jsonb_build_object('space_id', new.space_id)
        );
      exception when others then
        raise warning 'notify_cap_reached: échec envoi notification (%): %', sqlstate, sqlerrm;
      end;
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."notify_cap_reached"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."to_minutes"("p_hhmm" "text") RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select split_part(p_hhmm, ':', 1)::integer * 60 + split_part(p_hhmm, ':', 2)::integer;
$$;


ALTER FUNCTION "public"."to_minutes"("p_hhmm" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "storage"."allow_any_operation"("expected_operations" "text"[]) RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT CASE
      WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
      ELSE raw_operation
    END AS current_operation
    FROM current_operation
  )
  SELECT EXISTS (
    SELECT 1
    FROM normalized n
    CROSS JOIN LATERAL unnest(expected_operations) AS expected_operation
    WHERE expected_operation IS NOT NULL
      AND expected_operation <> ''
      AND n.current_operation = CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END
  );
$$;


ALTER FUNCTION "storage"."allow_any_operation"("expected_operations" "text"[]) OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."allow_only_operation"("expected_operation" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT
      CASE
        WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
        ELSE raw_operation
      END AS current_operation,
      CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END AS requested_operation
    FROM current_operation
  )
  SELECT CASE
    WHEN requested_operation IS NULL OR requested_operation = '' THEN FALSE
    ELSE COALESCE(current_operation = requested_operation, FALSE)
  END
  FROM normalized;
$$;


ALTER FUNCTION "storage"."allow_only_operation"("expected_operation" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


ALTER FUNCTION "storage"."can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."enforce_bucket_name_length"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


ALTER FUNCTION "storage"."enforce_bucket_name_length"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."extension"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Get the last path segment (the actual filename)
    SELECT _parts[array_length(_parts, 1)] INTO _filename;
    -- Extract extension: reverse, split on '.', then reverse again
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


ALTER FUNCTION "storage"."extension"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."filename"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


ALTER FUNCTION "storage"."filename"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."foldername"("name" "text") RETURNS "text"[]
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


ALTER FUNCTION "storage"."foldername"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_common_prefix"("p_key" "text", "p_prefix" "text", "p_delimiter" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
SELECT CASE
    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))
    ELSE NULL
END;
$$;


ALTER FUNCTION "storage"."get_common_prefix"("p_key" "text", "p_prefix" "text", "p_delimiter" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_size_by_bucket"() RETURNS TABLE("size" bigint, "bucket_id" "text")
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint)::bigint as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


ALTER FUNCTION "storage"."get_size_by_bucket"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "next_key_token" "text" DEFAULT ''::"text", "next_upload_token" "text" DEFAULT ''::"text") RETURNS TABLE("key" "text", "id" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


ALTER FUNCTION "storage"."list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer, "next_key_token" "text", "next_upload_token" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."list_objects_with_delimiter"("_bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "start_after" "text" DEFAULT ''::"text", "next_token" "text" DEFAULT ''::"text", "sort_order" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "metadata" "jsonb", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix, 1) = delimiter_param THEN
        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'AND o.name COLLATE "C" < $3 ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'AND o.name COLLATE "C" >= $3 ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor: find the last item in range
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Cursor provided: determine if it refers to a folder or leaf
        IF EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = _bucket_id
              AND o.name COLLATE "C" LIKE v_start || delimiter_param || '%'
            LIMIT 1
        ) THEN
            -- Cursor refers to a folder
            IF v_is_asc THEN
                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_start || delimiter_param;
            END IF;
        ELSE
            -- Cursor refers to a leaf object
            IF v_is_asc THEN
                v_next_seek := v_start || delimiter_param;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := rtrim(v_common_prefix, delimiter_param);
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := v_current.name;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                RETURN NEXT;
                v_count := v_count + 1;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := v_current.name || delimiter_param;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


ALTER FUNCTION "storage"."list_objects_with_delimiter"("_bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer, "start_after" "text", "next_token" "text", "sort_order" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."operation"() RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


ALTER FUNCTION "storage"."operation"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."protect_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "storage"."protect_delete"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;
    v_skipped INT := 0;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach (unchanged)
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT path_tokens[$1] AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $2 || '%%'
                  AND bucket_id = $3
                  AND array_length(objects.path_tokens, 1) <> $1
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata FROM folders)
            UNION ALL
            (SELECT path_tokens[$1] AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata
             FROM storage.objects
             WHERE objects.name ILIKE $2 || '%%'
               AND bucket_id = $3
               AND array_length(objects.path_tokens, 1) = $1
             ORDER BY %I %s)
            LIMIT $4 OFFSET $5
            $sql$, v_sort_order, v_order_by, v_sort_order
        ) USING levels, v_prefix, bucketname, v_limit, offsets;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'AND lower(o.name) COLLATE "C" < $3 ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'AND lower(o.name) COLLATE "C" >= $3 ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC: find the last item in range first (static SQL)
        IF v_upper_bound IS NOT NULL THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower AND lower(o.name) COLLATE "C" < v_upper_bound
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSIF v_prefix_lower <> '' THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSE
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        END IF;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix_lower <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := split_part(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter), v_delimiter, levels);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := lower(v_current.name);
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := split_part(v_current.name, v_delimiter, levels);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := lower(v_current.name) || v_delimiter;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


ALTER FUNCTION "storage"."search"("prefix" "text", "bucketname" "text", "limits" integer, "levels" integer, "offsets" integer, "search" "text", "sortcolumn" "text", "sortorder" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search_by_timestamp"("p_prefix" "text", "p_bucket_id" "text", "p_limit" integer, "p_level" integer, "p_start_after" "text", "p_sort_order" "text", "p_sort_column" "text", "p_sort_column_after" "text") RETURNS TABLE("key" "text", "name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
BEGIN
    v_prefix := coalesce(p_prefix, '');

    IF p_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $1 || '%%'
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                rtrim(common_prefix, '/') AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    date_trunc('milliseconds', %I),
                    name COLLATE "C"
                ) %s ROW(
                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),
                    $5
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s
        LIMIT $4
    $sql$,
        p_sort_column,
        v_cursor_op,
        p_sort_column,
        p_sort_order,
        p_sort_order
    );

    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;
END;
$_$;


ALTER FUNCTION "storage"."search_by_timestamp"("p_prefix" "text", "p_bucket_id" "text", "p_limit" integer, "p_level" integer, "p_start_after" "text", "p_sort_order" "text", "p_sort_column" "text", "p_sort_column_after" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search_v2"("prefix" "text", "bucket_name" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "start_after" "text" DEFAULT ''::"text", "sort_order" "text" DEFAULT 'asc'::"text", "sort_column" "text" DEFAULT 'name'::"text", "sort_column_after" "text" DEFAULT ''::"text") RETURNS TABLE("key" "text", "name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            start_after,
            '',
            v_sort_ord
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after
        );
    END IF;
END;
$$;


ALTER FUNCTION "storage"."search_v2"("prefix" "text", "bucket_name" "text", "limits" integer, "levels" integer, "start_after" "text", "sort_order" "text", "sort_column" "text", "sort_column_after" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


ALTER FUNCTION "storage"."update_updated_at_column"() OWNER TO "supabase_storage_admin";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."intervenant_checklist_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "telephone" "text" NOT NULL,
    "name" "text" NOT NULL,
    "items" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."intervenant_checklist_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."intervenant_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "prenom" "text" NOT NULL,
    "nom" "text" NOT NULL,
    "pin" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "photo" "text",
    "photo_updated_at" timestamp with time zone,
    "telephone" "text",
    "phrase_totem" "text"
);


ALTER TABLE "public"."intervenant_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."intervention_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "intervenant_profile_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "duration_minutes" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "intervention_types_duration_minutes_check" CHECK (("duration_minutes" > 0))
);


ALTER TABLE "public"."intervention_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."news_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "news_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "content" "text" DEFAULT ''::"text" NOT NULL,
    "photos" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "author_prenom" "text" NOT NULL,
    "author_nom" "text" NOT NULL,
    "author_pin" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."news_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patient_spaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "patient_firstname" "text" NOT NULL,
    "patient_lastname" "text" NOT NULL,
    "patient_photo_url" "text",
    "hospital_name" "text" DEFAULT ''::"text" NOT NULL,
    "hospital_service" "text" DEFAULT ''::"text" NOT NULL,
    "hospital_room" "text" DEFAULT ''::"text" NOT NULL,
    "hospital_address" "text" DEFAULT ''::"text" NOT NULL,
    "hospital_maps_url" "text" DEFAULT ''::"text" NOT NULL,
    "visit_rules" "text" DEFAULT ''::"text" NOT NULL,
    "admin_notes" "text" DEFAULT ''::"text" NOT NULL,
    "theme" "text" DEFAULT 'ocean'::"text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "invite_token" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "stripe_payment_id" "text",
    "last_activity_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "purge_scheduled_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "premium" boolean DEFAULT false NOT NULL,
    "hospital_sector" "text",
    "home_care_mode" boolean DEFAULT false NOT NULL,
    "home_address" "text",
    "home_maps_url" "text",
    "hospital_address_line2" "text",
    "hospital_postal_code" "text",
    "hospital_city" "text",
    "home_address_line2" "text",
    "home_postal_code" "text",
    "home_city" "text",
    "hospital_country" "text",
    "home_country" "text",
    "dossier_code" "text",
    "cap_email_sent_at" timestamp with time zone,
    "admin_firstname" "text",
    "admin_lastname" "text",
    "patient_birthdate" "date",
    "patient_sex" "text",
    "patient_blood_type" "text",
    "patient_allergies" "text",
    "patient_motto" "text",
    "patient_admission_date" "date",
    "patient_discharge_date" "date",
    "intervenants_enabled" boolean DEFAULT false NOT NULL,
    "admin_email" "text",
    "admin_pin" "text",
    CONSTRAINT "patient_spaces_patient_sex_check" CHECK (("patient_sex" = ANY (ARRAY['M'::"text", 'F'::"text"])))
);


ALTER TABLE "public"."patient_spaces" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."personal_checklist_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "owner_prenom" "text" NOT NULL,
    "owner_nom" "text" NOT NULL,
    "owner_pin" "text" NOT NULL,
    "title" "text" NOT NULL,
    "status" "text" DEFAULT 'a_faire'::"text" NOT NULL,
    "task_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "checklist_context" "text",
    "custom_checklist_name" "text",
    CONSTRAINT "personal_checklist_items_checklist_context_check" CHECK (("checklist_context" = ANY (ARRAY['adulte'::"text", 'enfant'::"text", 'domicile'::"text"]))),
    CONSTRAINT "personal_checklist_items_status_check" CHECK (("status" = ANY (ARRAY['a_faire'::"text", 'fait'::"text"])))
);


ALTER TABLE "public"."personal_checklist_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reservation_change_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "reservation_id" "uuid" NOT NULL,
    "prenom" "text" NOT NULL,
    "nom" "text" NOT NULL,
    "type" "text" NOT NULL,
    "change_type" "text" NOT NULL,
    "previous_date" "date",
    "previous_creneau" "text",
    "new_date" "date",
    "new_creneau" "text",
    "message" "text" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "reservation_change_history_change_type_check" CHECK (("change_type" = ANY (ARRAY['rebooked'::"text", 'night_cancelled'::"text", 'rebooking_failed'::"text", 'day_cap_suspended'::"text"])))
);


ALTER TABLE "public"."reservation_change_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reservations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "creneau" "text" NOT NULL,
    "prenom" "text" NOT NULL,
    "nom" "text" NOT NULL,
    "type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "telephone" "text",
    "pin" "text",
    "space_id" "uuid",
    "companion_firstnames" "text",
    "group_id" "uuid",
    "booked_by_prenom" "text",
    "booked_by_nom" "text",
    "previous_date" "date",
    "previous_creneau" "text",
    "alert_message" "text",
    "alert_type" "text",
    "alert_seen" boolean DEFAULT false NOT NULL,
    "email" "text",
    "duration_minutes" integer,
    "intervention_label" "text",
    "intervenant_profile_id" "uuid",
    CONSTRAINT "reservations_alert_type_check" CHECK (("alert_type" = ANY (ARRAY['rebooked'::"text", 'night_cancelled'::"text", 'rebooking_failed'::"text", 'day_cap_suspended'::"text"]))),
    CONSTRAINT "reservations_type_check" CHECK (("type" = ANY (ARRAY['Visite'::"text", 'Nuit'::"text", 'Intervention'::"text"])))
);


ALTER TABLE "public"."reservations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."reservations"."pin" IS 'Code Pin Utilisateur';



CREATE TABLE IF NOT EXISTS "public"."slot_config" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "visit_start_hour" integer DEFAULT 9 NOT NULL,
    "visit_end_hour" integer DEFAULT 20 NOT NULL,
    "slot_duration_minutes" integer DEFAULT 60 NOT NULL,
    "min_gap_minutes" integer DEFAULT 15 NOT NULL,
    "max_visitors_per_slot" integer DEFAULT 2 NOT NULL,
    "night_enabled" boolean DEFAULT false NOT NULL,
    "max_night_visitors" integer DEFAULT 1 NOT NULL,
    "allowed_weekdays" integer[] DEFAULT ARRAY[0, 1, 2, 3, 4, 5, 6] NOT NULL,
    "blocked_dates" "text"[] DEFAULT ARRAY[]::"text"[] NOT NULL,
    "night_start_hour" integer DEFAULT 19 NOT NULL,
    "night_end_hour" integer DEFAULT 8 NOT NULL,
    "gap_includes_duration" boolean DEFAULT false NOT NULL,
    "blocked_date_reasons" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "visit_start_minute" integer DEFAULT 0 NOT NULL,
    "visit_end_minute" integer DEFAULT 0 NOT NULL,
    "night_start_minute" integer DEFAULT 0 NOT NULL,
    "night_end_minute" integer DEFAULT 0 NOT NULL,
    "one_visit_per_day" boolean DEFAULT false NOT NULL,
    CONSTRAINT "slot_config_night_end_minute_check" CHECK ((("night_end_minute" >= 0) AND ("night_end_minute" <= 59))),
    CONSTRAINT "slot_config_night_start_minute_check" CHECK ((("night_start_minute" >= 0) AND ("night_start_minute" <= 59))),
    CONSTRAINT "slot_config_visit_end_minute_check" CHECK ((("visit_end_minute" >= 0) AND ("visit_end_minute" <= 59))),
    CONSTRAINT "slot_config_visit_start_minute_check" CHECK ((("visit_start_minute" >= 0) AND ("visit_start_minute" <= 59)))
);


ALTER TABLE "public"."slot_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."slot_config_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "valid_from" "date" NOT NULL,
    "visit_start_hour" integer NOT NULL,
    "visit_end_hour" integer NOT NULL,
    "slot_duration_minutes" integer NOT NULL,
    "min_gap_minutes" integer NOT NULL,
    "gap_includes_duration" boolean DEFAULT false NOT NULL,
    "max_visitors_per_slot" integer NOT NULL,
    "allowed_weekdays" integer[] DEFAULT ARRAY[0, 1, 2, 3, 4, 5, 6] NOT NULL,
    "blocked_dates" "text"[] DEFAULT ARRAY[]::"text"[] NOT NULL,
    "blocked_date_reasons" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "night_enabled" boolean NOT NULL,
    "night_start_hour" integer DEFAULT 19 NOT NULL,
    "night_end_hour" integer DEFAULT 8 NOT NULL,
    "max_night_visitors" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "visit_start_minute" integer DEFAULT 0 NOT NULL,
    "visit_end_minute" integer DEFAULT 0 NOT NULL,
    "night_start_minute" integer DEFAULT 0 NOT NULL,
    "night_end_minute" integer DEFAULT 0 NOT NULL,
    "one_visit_per_day" boolean DEFAULT false NOT NULL,
    CONSTRAINT "slot_config_history_night_end_minute_check" CHECK ((("night_end_minute" >= 0) AND ("night_end_minute" <= 59))),
    CONSTRAINT "slot_config_history_night_start_minute_check" CHECK ((("night_start_minute" >= 0) AND ("night_start_minute" <= 59))),
    CONSTRAINT "slot_config_history_visit_end_minute_check" CHECK ((("visit_end_minute" >= 0) AND ("visit_end_minute" <= 59))),
    CONSTRAINT "slot_config_history_visit_start_minute_check" CHECK ((("visit_start_minute" >= 0) AND ("visit_start_minute" <= 59)))
);


ALTER TABLE "public"."slot_config_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."souvenirs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "filename" "text" NOT NULL,
    "caption" "text" DEFAULT ''::"text" NOT NULL,
    "uploaded_by_prenom" "text" NOT NULL,
    "uploaded_by_nom" "text" NOT NULL,
    "uploaded_by_pin" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source_type" "text",
    "source_id" "uuid",
    CONSTRAINT "souvenirs_source_type_check" CHECK (("source_type" = ANY (ARRAY['news'::"text", 'support'::"text"])))
);


ALTER TABLE "public"."souvenirs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."space_field_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "field_name" "text" NOT NULL,
    "old_value" "text",
    "new_value" "text",
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."space_field_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_message_replies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "space_id" "uuid" NOT NULL,
    "reply_text" "text" NOT NULL,
    "author_prenom" "text" NOT NULL,
    "author_nom" "text" NOT NULL,
    "author_pin" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."support_message_replies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "message" "text" NOT NULL,
    "author_prenom" "text" NOT NULL,
    "author_nom" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "photo" "text",
    "author_pin" "text"
);


ALTER TABLE "public"."support_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "category" "text" DEFAULT 'autre'::"text" NOT NULL,
    "status" "text" DEFAULT 'ouvert'::"text" NOT NULL,
    "claimed_by_prenom" "text",
    "claimed_by_nom" "text",
    "claimed_by_pin" "text",
    "created_by" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "photo" "text",
    "claimed_photo" "text",
    "claimed_text" "text",
    "done_photo" "text",
    "author_prenom" "text",
    "author_nom" "text",
    "author_pin" "text",
    "transport_date" "date",
    "transport_out_time" "text",
    "transport_return_time" "text",
    "transport_round_trip" boolean DEFAULT false NOT NULL,
    "transport_flexible" boolean DEFAULT false NOT NULL,
    "transport_from" "text",
    "transport_to" "text",
    "transport_confirmed_date" "date",
    "transport_confirmed_out_time" "text",
    "transport_confirmed_return_time" "text",
    "transport_proposals" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "transport_home_postal_code" "text",
    "transport_home_city" "text",
    "transport_home_country" "text",
    "transport_home_is_arrival" boolean DEFAULT false NOT NULL,
    "transport_return_claimed_by_prenom" "text",
    "transport_return_claimed_by_nom" "text",
    "transport_return_claimed_by_pin" "text",
    "transport_for_prenom" "text",
    "transport_for_nom" "text",
    "date_limite" "date",
    "urgent" boolean DEFAULT false NOT NULL,
    "checklist_batch_id" "text",
    "modified_at" timestamp with time zone,
    "modified_by_prenom" "text",
    "modified_by_nom" "text",
    CONSTRAINT "tasks_category_check" CHECK (("category" = ANY (ARRAY['repas'::"text", 'affaires'::"text", 'courses'::"text", 'transport'::"text", 'administratif'::"text", 'autre'::"text"]))),
    CONSTRAINT "tasks_status_check" CHECK (("status" = ANY (ARRAY['ouvert'::"text", 'pris_en_charge'::"text", 'fait'::"text", 'ferme'::"text"])))
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."visitor_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "prenom" "text" NOT NULL,
    "nom" "text" NOT NULL,
    "photo" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "motto" "text"
);


ALTER TABLE "public"."visitor_profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."visitor_profiles_by_patient" AS
 SELECT "vp"."id",
    "vp"."space_id",
    "ps"."patient_firstname",
    "ps"."patient_lastname",
    "vp"."prenom",
    "vp"."nom",
    "vp"."photo",
    "vp"."motto",
    "vp"."updated_at"
   FROM ("public"."visitor_profiles" "vp"
     JOIN "public"."patient_spaces" "ps" ON (("ps"."id" = "vp"."space_id")))
  ORDER BY "ps"."patient_lastname", "ps"."patient_firstname", "vp"."updated_at" DESC;


ALTER VIEW "public"."visitor_profiles_by_patient" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "storage"."buckets" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "public" boolean DEFAULT false,
    "avif_autodetection" boolean DEFAULT false,
    "file_size_limit" bigint,
    "allowed_mime_types" "text"[],
    "owner_id" "text",
    "type" "storage"."buckettype" DEFAULT 'STANDARD'::"storage"."buckettype" NOT NULL
);


ALTER TABLE "storage"."buckets" OWNER TO "supabase_storage_admin";


COMMENT ON COLUMN "storage"."buckets"."owner" IS 'Field is deprecated, use owner_id instead';



CREATE TABLE IF NOT EXISTS "storage"."buckets_analytics" (
    "name" "text" NOT NULL,
    "type" "storage"."buckettype" DEFAULT 'ANALYTICS'::"storage"."buckettype" NOT NULL,
    "format" "text" DEFAULT 'ICEBERG'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "storage"."buckets_analytics" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."buckets_vectors" (
    "id" "text" NOT NULL,
    "type" "storage"."buckettype" DEFAULT 'VECTOR'::"storage"."buckettype" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."buckets_vectors" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."migrations" (
    "id" integer NOT NULL,
    "name" character varying(100) NOT NULL,
    "hash" character varying(40) NOT NULL,
    "executed_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "storage"."migrations" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."objects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bucket_id" "text",
    "name" "text",
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_accessed_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb",
    "path_tokens" "text"[] GENERATED ALWAYS AS ("string_to_array"("name", '/'::"text")) STORED,
    "version" "text",
    "owner_id" "text",
    "user_metadata" "jsonb"
);


ALTER TABLE "storage"."objects" OWNER TO "supabase_storage_admin";


COMMENT ON COLUMN "storage"."objects"."owner" IS 'Field is deprecated, use owner_id instead';



CREATE TABLE IF NOT EXISTS "storage"."s3_multipart_uploads" (
    "id" "text" NOT NULL,
    "in_progress_size" bigint DEFAULT 0 NOT NULL,
    "upload_signature" "text" NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "version" "text" NOT NULL,
    "owner_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_metadata" "jsonb",
    "metadata" "jsonb"
);


ALTER TABLE "storage"."s3_multipart_uploads" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."s3_multipart_uploads_parts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "upload_id" "text" NOT NULL,
    "size" bigint DEFAULT 0 NOT NULL,
    "part_number" integer NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "etag" "text" NOT NULL,
    "owner_id" "text",
    "version" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."s3_multipart_uploads_parts" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."vector_indexes" (
    "id" "text" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL COLLATE "pg_catalog"."C",
    "bucket_id" "text" NOT NULL,
    "data_type" "text" NOT NULL,
    "dimension" integer NOT NULL,
    "distance_metric" "text" NOT NULL,
    "metadata_configuration" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."vector_indexes" OWNER TO "supabase_storage_admin";


ALTER TABLE ONLY "public"."intervenant_checklist_templates"
    ADD CONSTRAINT "intervenant_checklist_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."intervenant_checklist_templates"
    ADD CONSTRAINT "intervenant_checklist_templates_telephone_name_key" UNIQUE ("telephone", "name");



ALTER TABLE ONLY "public"."intervenant_profiles"
    ADD CONSTRAINT "intervenant_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."intervention_types"
    ADD CONSTRAINT "intervention_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."news_entries"
    ADD CONSTRAINT "news_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_spaces"
    ADD CONSTRAINT "patient_spaces_dossier_code_key" UNIQUE ("dossier_code");



ALTER TABLE ONLY "public"."patient_spaces"
    ADD CONSTRAINT "patient_spaces_invite_token_key" UNIQUE ("invite_token");



ALTER TABLE ONLY "public"."patient_spaces"
    ADD CONSTRAINT "patient_spaces_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."personal_checklist_items"
    ADD CONSTRAINT "personal_checklist_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservation_change_history"
    ADD CONSTRAINT "reservation_change_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."slot_config_history"
    ADD CONSTRAINT "slot_config_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."slot_config_history"
    ADD CONSTRAINT "slot_config_history_space_id_valid_from_key" UNIQUE ("space_id", "valid_from");



ALTER TABLE ONLY "public"."slot_config"
    ADD CONSTRAINT "slot_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."souvenirs"
    ADD CONSTRAINT "souvenirs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."space_field_history"
    ADD CONSTRAINT "space_field_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_message_replies"
    ADD CONSTRAINT "support_message_replies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_messages"
    ADD CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."visitor_profiles"
    ADD CONSTRAINT "visitor_profiles_identity_key" UNIQUE ("space_id", "prenom", "nom");



ALTER TABLE ONLY "public"."visitor_profiles"
    ADD CONSTRAINT "visitor_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."buckets_analytics"
    ADD CONSTRAINT "buckets_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."buckets"
    ADD CONSTRAINT "buckets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."buckets_vectors"
    ADD CONSTRAINT "buckets_vectors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_name_key" UNIQUE ("name");



ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."vector_indexes"
    ADD CONSTRAINT "vector_indexes_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_intervenant_profiles_space" ON "public"."intervenant_profiles" USING "btree" ("space_id");



CREATE INDEX "idx_intervenant_profiles_telephone" ON "public"."intervenant_profiles" USING "btree" ("telephone") WHERE ("telephone" IS NOT NULL);



CREATE UNIQUE INDEX "idx_intervenant_profiles_unique_identity" ON "public"."intervenant_profiles" USING "btree" ("space_id", "lower"("prenom"), "lower"("nom"));



CREATE INDEX "idx_intervention_types_profile" ON "public"."intervention_types" USING "btree" ("intervenant_profile_id");



CREATE INDEX "idx_reservation_change_history_reservation" ON "public"."reservation_change_history" USING "btree" ("reservation_id");



CREATE INDEX "idx_reservation_change_history_space" ON "public"."reservation_change_history" USING "btree" ("space_id", "changed_at" DESC);



CREATE INDEX "idx_reservations_space_type" ON "public"."reservations" USING "btree" ("space_id", "type");



CREATE INDEX "idx_slot_config_history_space_date" ON "public"."slot_config_history" USING "btree" ("space_id", "valid_from" DESC);



CREATE INDEX "intervenant_checklist_templates_telephone_idx" ON "public"."intervenant_checklist_templates" USING "btree" ("telephone");



CREATE INDEX "reservations_space_id_idx" ON "public"."reservations" USING "btree" ("space_id");



CREATE UNIQUE INDEX "bname" ON "storage"."buckets" USING "btree" ("name");



CREATE UNIQUE INDEX "bucketid_objname" ON "storage"."objects" USING "btree" ("bucket_id", "name");



CREATE UNIQUE INDEX "buckets_analytics_unique_name_idx" ON "storage"."buckets_analytics" USING "btree" ("name") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_multipart_uploads_list" ON "storage"."s3_multipart_uploads" USING "btree" ("bucket_id", "key", "created_at");



CREATE INDEX "idx_objects_bucket_id_name" ON "storage"."objects" USING "btree" ("bucket_id", "name" COLLATE "C");



CREATE INDEX "idx_objects_bucket_id_name_lower" ON "storage"."objects" USING "btree" ("bucket_id", "lower"("name") COLLATE "C");



CREATE INDEX "name_prefix_search" ON "storage"."objects" USING "btree" ("name" "text_pattern_ops");



CREATE UNIQUE INDEX "vector_indexes_name_bucket_id_idx" ON "storage"."vector_indexes" USING "btree" ("name", "bucket_id");



CREATE OR REPLACE TRIGGER "trg_check_slot_capacity" BEFORE INSERT OR UPDATE OF "date", "creneau", "type", "space_id" ON "public"."reservations" FOR EACH ROW EXECUTE FUNCTION "public"."check_slot_capacity"();



CREATE OR REPLACE TRIGGER "trg_check_visite_cap" BEFORE INSERT ON "public"."reservations" FOR EACH ROW EXECUTE FUNCTION "public"."check_visite_cap"();



CREATE OR REPLACE TRIGGER "trg_notify_cap_reached" AFTER INSERT ON "public"."reservations" FOR EACH ROW EXECUTE FUNCTION "public"."notify_cap_reached"();



CREATE OR REPLACE TRIGGER "enforce_bucket_name_length_trigger" BEFORE INSERT OR UPDATE OF "name" ON "storage"."buckets" FOR EACH ROW EXECUTE FUNCTION "storage"."enforce_bucket_name_length"();



CREATE OR REPLACE TRIGGER "protect_buckets_delete" BEFORE DELETE ON "storage"."buckets" FOR EACH STATEMENT EXECUTE FUNCTION "storage"."protect_delete"();



CREATE OR REPLACE TRIGGER "protect_objects_delete" BEFORE DELETE ON "storage"."objects" FOR EACH STATEMENT EXECUTE FUNCTION "storage"."protect_delete"();



CREATE OR REPLACE TRIGGER "update_objects_updated_at" BEFORE UPDATE ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."update_updated_at_column"();



ALTER TABLE ONLY "public"."intervenant_profiles"
    ADD CONSTRAINT "intervenant_profiles_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."patient_spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."intervention_types"
    ADD CONSTRAINT "intervention_types_intervenant_profile_id_fkey" FOREIGN KEY ("intervenant_profile_id") REFERENCES "public"."intervenant_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."news_entries"
    ADD CONSTRAINT "news_entries_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."patient_spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_spaces"
    ADD CONSTRAINT "patient_spaces_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."personal_checklist_items"
    ADD CONSTRAINT "personal_checklist_items_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."patient_spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."personal_checklist_items"
    ADD CONSTRAINT "personal_checklist_items_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_intervenant_profile_id_fkey" FOREIGN KEY ("intervenant_profile_id") REFERENCES "public"."intervenant_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."reservations"
    ADD CONSTRAINT "reservations_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."patient_spaces"("id");



ALTER TABLE ONLY "public"."slot_config"
    ADD CONSTRAINT "slot_config_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."patient_spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."souvenirs"
    ADD CONSTRAINT "souvenirs_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."patient_spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."space_field_history"
    ADD CONSTRAINT "space_field_history_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."patient_spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_message_replies"
    ADD CONSTRAINT "support_message_replies_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."support_messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_message_replies"
    ADD CONSTRAINT "support_message_replies_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."patient_spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_messages"
    ADD CONSTRAINT "support_messages_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."patient_spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."patient_spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."visitor_profiles"
    ADD CONSTRAINT "visitor_profiles_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."patient_spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "storage"."s3_multipart_uploads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "storage"."vector_indexes"
    ADD CONSTRAINT "vector_indexes_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets_vectors"("id");



CREATE POLICY "Delete" ON "public"."reservations" FOR DELETE TO "anon" USING (true);



CREATE POLICY "Public update news_entries" ON "public"."news_entries" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "Update" ON "public"."reservations" FOR UPDATE TO "anon" USING (true);



CREATE POLICY "admin owns space" ON "public"."patient_spaces" USING (("admin_id" = "auth"."uid"()));



CREATE POLICY "admin_manage_own_history" ON "public"."space_field_history" USING (("space_id" IN ( SELECT "patient_spaces"."id"
   FROM "public"."patient_spaces"
  WHERE ("patient_spaces"."admin_id" = "auth"."uid"()))));



CREATE POLICY "admins can insert own slot_config" ON "public"."slot_config" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."patient_spaces" "s"
  WHERE (("s"."id" = "slot_config"."space_id") AND ("s"."admin_id" = "auth"."uid"())))));



CREATE POLICY "admins can insert own space" ON "public"."patient_spaces" FOR INSERT TO "authenticated" WITH CHECK (("admin_id" = "auth"."uid"()));



CREATE POLICY "admins can update own slot_config" ON "public"."slot_config" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."patient_spaces" "s"
  WHERE (("s"."id" = "slot_config"."space_id") AND ("s"."admin_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."patient_spaces" "s"
  WHERE (("s"."id" = "slot_config"."space_id") AND ("s"."admin_id" = "auth"."uid"())))));



CREATE POLICY "ecriture publique" ON "public"."reservations" FOR INSERT WITH CHECK (true);



ALTER TABLE "public"."intervenant_checklist_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."intervenant_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."intervention_types" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lecture publique" ON "public"."reservations" FOR SELECT USING (true);



ALTER TABLE "public"."news_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."patient_spaces" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."personal_checklist_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public can delete intervenant_profiles" ON "public"."intervenant_profiles" FOR DELETE USING (true);



CREATE POLICY "public can delete intervention_types" ON "public"."intervention_types" FOR DELETE USING (true);



CREATE POLICY "public can delete reservations" ON "public"."reservations" FOR DELETE USING (true);



CREATE POLICY "public can delete souvenirs" ON "public"."souvenirs" FOR DELETE USING (true);



CREATE POLICY "public can delete support message replies" ON "public"."support_message_replies" FOR DELETE USING (true);



CREATE POLICY "public can delete support messages" ON "public"."support_messages" FOR DELETE USING (true);



CREATE POLICY "public can insert intervenant_profiles" ON "public"."intervenant_profiles" FOR INSERT WITH CHECK (true);



CREATE POLICY "public can insert intervention_types" ON "public"."intervention_types" FOR INSERT WITH CHECK (true);



CREATE POLICY "public can insert support message replies" ON "public"."support_message_replies" FOR INSERT WITH CHECK (true);



CREATE POLICY "public can manage visitor_profiles" ON "public"."visitor_profiles" USING (true) WITH CHECK (true);



CREATE POLICY "public can read reservation_change_history" ON "public"."reservation_change_history" FOR SELECT USING (true);



CREATE POLICY "public can read slot_config_history" ON "public"."slot_config_history" FOR SELECT USING (true);



CREATE POLICY "public can read support message replies" ON "public"."support_message_replies" FOR SELECT USING (true);



CREATE POLICY "public can select intervenant_profiles" ON "public"."intervenant_profiles" FOR SELECT USING (true);



CREATE POLICY "public can select intervention_types" ON "public"."intervention_types" FOR SELECT USING (true);



CREATE POLICY "public can update intervenant_profiles" ON "public"."intervenant_profiles" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "public can update intervention_types" ON "public"."intervention_types" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "public can update reservations" ON "public"."reservations" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "public can update support messages" ON "public"."support_messages" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "public delete intervenant checklist templates" ON "public"."intervenant_checklist_templates" FOR DELETE USING (true);



CREATE POLICY "public delete personal checklist items" ON "public"."personal_checklist_items" FOR DELETE USING (true);



CREATE POLICY "public delete reservations" ON "public"."reservations" FOR DELETE USING (true);



CREATE POLICY "public delete tasks" ON "public"."tasks" FOR DELETE USING (true);



CREATE POLICY "public read" ON "public"."news_entries" FOR SELECT USING (true);



CREATE POLICY "public read" ON "public"."reservations" FOR SELECT USING (true);



CREATE POLICY "public read" ON "public"."slot_config" FOR SELECT USING (true);



CREATE POLICY "public read" ON "public"."souvenirs" FOR SELECT USING (true);



CREATE POLICY "public read" ON "public"."support_messages" FOR SELECT USING (true);



CREATE POLICY "public read" ON "public"."tasks" FOR SELECT USING (true);



CREATE POLICY "public read by token" ON "public"."patient_spaces" FOR SELECT USING (("is_active" = true));



CREATE POLICY "public read intervenant checklist templates" ON "public"."intervenant_checklist_templates" FOR SELECT USING (true);



CREATE POLICY "public read personal checklist items" ON "public"."personal_checklist_items" FOR SELECT USING (true);



CREATE POLICY "public update intervenant checklist templates" ON "public"."intervenant_checklist_templates" FOR UPDATE USING (true);



CREATE POLICY "public update personal checklist items" ON "public"."personal_checklist_items" FOR UPDATE USING (true);



CREATE POLICY "public update tasks" ON "public"."tasks" FOR UPDATE USING (true);



CREATE POLICY "public write" ON "public"."news_entries" FOR INSERT WITH CHECK (true);



CREATE POLICY "public write" ON "public"."reservations" FOR INSERT WITH CHECK (true);



CREATE POLICY "public write" ON "public"."souvenirs" FOR INSERT WITH CHECK (true);



CREATE POLICY "public write" ON "public"."support_messages" FOR INSERT WITH CHECK (true);



CREATE POLICY "public write" ON "public"."tasks" FOR INSERT WITH CHECK (true);



CREATE POLICY "public write intervenant checklist templates" ON "public"."intervenant_checklist_templates" FOR INSERT WITH CHECK (true);



CREATE POLICY "public write personal checklist items" ON "public"."personal_checklist_items" FOR INSERT WITH CHECK (true);



ALTER TABLE "public"."reservation_change_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reservations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."slot_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."slot_config_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."souvenirs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."space_field_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_message_replies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."visitor_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Public delete admin-photos" ON "storage"."objects" FOR DELETE USING (("bucket_id" = 'admin-photos'::"text"));



CREATE POLICY "Public delete entraide-photos" ON "storage"."objects" FOR DELETE USING (("bucket_id" = 'entraide-photos'::"text"));



CREATE POLICY "Public delete intervenant-photos" ON "storage"."objects" FOR DELETE USING (("bucket_id" = 'intervenant-photos'::"text"));



CREATE POLICY "Public delete news-photos" ON "storage"."objects" FOR DELETE USING (("bucket_id" = 'news-photos'::"text"));



CREATE POLICY "Public delete patient-photos" ON "storage"."objects" FOR DELETE USING (("bucket_id" = 'patient-photos'::"text"));



CREATE POLICY "Public delete support-photos" ON "storage"."objects" FOR DELETE USING (("bucket_id" = 'support-photos'::"text"));



CREATE POLICY "Public delete visitor-photos" ON "storage"."objects" FOR DELETE USING (("bucket_id" = 'visitor-photos'::"text"));



CREATE POLICY "Public insert admin-photos" ON "storage"."objects" FOR INSERT WITH CHECK (("bucket_id" = 'admin-photos'::"text"));



CREATE POLICY "Public insert entraide-photos" ON "storage"."objects" FOR INSERT WITH CHECK (("bucket_id" = 'entraide-photos'::"text"));



CREATE POLICY "Public insert intervenant-photos" ON "storage"."objects" FOR INSERT WITH CHECK (("bucket_id" = 'intervenant-photos'::"text"));



CREATE POLICY "Public insert news-photos" ON "storage"."objects" FOR INSERT WITH CHECK (("bucket_id" = 'news-photos'::"text"));



CREATE POLICY "Public insert patient-photos" ON "storage"."objects" FOR INSERT WITH CHECK (("bucket_id" = 'patient-photos'::"text"));



CREATE POLICY "Public insert support-photos" ON "storage"."objects" FOR INSERT WITH CHECK (("bucket_id" = 'support-photos'::"text"));



CREATE POLICY "Public insert visitor-photos" ON "storage"."objects" FOR INSERT WITH CHECK (("bucket_id" = 'visitor-photos'::"text"));



CREATE POLICY "Public read admin-photos" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'admin-photos'::"text"));



CREATE POLICY "Public read entraide-photos" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'entraide-photos'::"text"));



CREATE POLICY "Public read intervenant-photos" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'intervenant-photos'::"text"));



CREATE POLICY "Public read news-photos" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'news-photos'::"text"));



CREATE POLICY "Public read patient-photos" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'patient-photos'::"text"));



CREATE POLICY "Public read support-photos" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'support-photos'::"text"));



CREATE POLICY "Public read visitor-photos" ON "storage"."objects" FOR SELECT USING (("bucket_id" = 'visitor-photos'::"text"));



CREATE POLICY "Public update admin-photos" ON "storage"."objects" FOR UPDATE USING (("bucket_id" = 'admin-photos'::"text")) WITH CHECK (("bucket_id" = 'admin-photos'::"text"));



CREATE POLICY "Public update intervenant-photos" ON "storage"."objects" FOR UPDATE USING (("bucket_id" = 'intervenant-photos'::"text")) WITH CHECK (("bucket_id" = 'intervenant-photos'::"text"));



CREATE POLICY "Public update patient-photos" ON "storage"."objects" FOR UPDATE USING (("bucket_id" = 'patient-photos'::"text")) WITH CHECK (("bucket_id" = 'patient-photos'::"text"));



CREATE POLICY "Public update visitor-photos" ON "storage"."objects" FOR UPDATE USING (("bucket_id" = 'visitor-photos'::"text")) WITH CHECK (("bucket_id" = 'visitor-photos'::"text"));



CREATE POLICY "Storage.objects 18vd9ac_0" ON "storage"."objects" FOR SELECT TO "anon" USING (("bucket_id" = 'souvenirs'::"text"));



CREATE POLICY "Storage.objects 18vd9ac_1" ON "storage"."objects" FOR INSERT TO "anon" WITH CHECK (("bucket_id" = 'souvenirs'::"text"));



ALTER TABLE "storage"."buckets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."buckets_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."buckets_vectors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."migrations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."objects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."s3_multipart_uploads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."s3_multipart_uploads_parts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "storage"."vector_indexes" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT USAGE ON SCHEMA "storage" TO "postgres" WITH GRANT OPTION;
GRANT USAGE ON SCHEMA "storage" TO "anon";
GRANT USAGE ON SCHEMA "storage" TO "authenticated";
GRANT USAGE ON SCHEMA "storage" TO "service_role";
GRANT ALL ON SCHEMA "storage" TO "supabase_storage_admin" WITH GRANT OPTION;
GRANT ALL ON SCHEMA "storage" TO "dashboard_user";



GRANT ALL ON FUNCTION "public"."apply_slot_rule_change"("p_space_id" "uuid", "p_new_config" "jsonb", "p_new_slots" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."apply_slot_rule_change"("p_space_id" "uuid", "p_new_config" "jsonb", "p_new_slots" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_slot_rule_change"("p_space_id" "uuid", "p_new_config" "jsonb", "p_new_slots" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."book_intervention"("p_space_id" "uuid", "p_intervenant_profile_id" "uuid", "p_intervention_type_id" "uuid", "p_date" "date", "p_start_slot" "text", "p_pin" "text", "p_slots" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."book_intervention"("p_space_id" "uuid", "p_intervenant_profile_id" "uuid", "p_intervention_type_id" "uuid", "p_date" "date", "p_start_slot" "text", "p_pin" "text", "p_slots" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."book_intervention"("p_space_id" "uuid", "p_intervenant_profile_id" "uuid", "p_intervention_type_id" "uuid", "p_date" "date", "p_start_slot" "text", "p_pin" "text", "p_slots" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_slot_capacity"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_slot_capacity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_slot_capacity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_visite_cap"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_visite_cap"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_visite_cap"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_cap_reached"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_cap_reached"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_cap_reached"() TO "service_role";



GRANT ALL ON FUNCTION "public"."to_minutes"("p_hhmm" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."to_minutes"("p_hhmm" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."to_minutes"("p_hhmm" "text") TO "service_role";



GRANT ALL ON TABLE "public"."intervenant_checklist_templates" TO "anon";
GRANT ALL ON TABLE "public"."intervenant_checklist_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."intervenant_checklist_templates" TO "service_role";



GRANT ALL ON TABLE "public"."intervenant_profiles" TO "anon";
GRANT ALL ON TABLE "public"."intervenant_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."intervenant_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."intervention_types" TO "anon";
GRANT ALL ON TABLE "public"."intervention_types" TO "authenticated";
GRANT ALL ON TABLE "public"."intervention_types" TO "service_role";



GRANT ALL ON TABLE "public"."news_entries" TO "anon";
GRANT ALL ON TABLE "public"."news_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."news_entries" TO "service_role";



GRANT ALL ON TABLE "public"."patient_spaces" TO "anon";
GRANT ALL ON TABLE "public"."patient_spaces" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_spaces" TO "service_role";



GRANT ALL ON TABLE "public"."personal_checklist_items" TO "anon";
GRANT ALL ON TABLE "public"."personal_checklist_items" TO "authenticated";
GRANT ALL ON TABLE "public"."personal_checklist_items" TO "service_role";



GRANT ALL ON TABLE "public"."reservation_change_history" TO "anon";
GRANT ALL ON TABLE "public"."reservation_change_history" TO "authenticated";
GRANT ALL ON TABLE "public"."reservation_change_history" TO "service_role";



GRANT ALL ON TABLE "public"."reservations" TO "anon";
GRANT ALL ON TABLE "public"."reservations" TO "authenticated";
GRANT ALL ON TABLE "public"."reservations" TO "service_role";



GRANT ALL ON TABLE "public"."slot_config" TO "anon";
GRANT ALL ON TABLE "public"."slot_config" TO "authenticated";
GRANT ALL ON TABLE "public"."slot_config" TO "service_role";



GRANT ALL ON TABLE "public"."slot_config_history" TO "anon";
GRANT ALL ON TABLE "public"."slot_config_history" TO "authenticated";
GRANT ALL ON TABLE "public"."slot_config_history" TO "service_role";



GRANT ALL ON TABLE "public"."souvenirs" TO "anon";
GRANT ALL ON TABLE "public"."souvenirs" TO "authenticated";
GRANT ALL ON TABLE "public"."souvenirs" TO "service_role";



GRANT ALL ON TABLE "public"."space_field_history" TO "anon";
GRANT ALL ON TABLE "public"."space_field_history" TO "authenticated";
GRANT ALL ON TABLE "public"."space_field_history" TO "service_role";



GRANT ALL ON TABLE "public"."support_message_replies" TO "anon";
GRANT ALL ON TABLE "public"."support_message_replies" TO "authenticated";
GRANT ALL ON TABLE "public"."support_message_replies" TO "service_role";



GRANT ALL ON TABLE "public"."support_messages" TO "anon";
GRANT ALL ON TABLE "public"."support_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."support_messages" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."visitor_profiles" TO "anon";
GRANT ALL ON TABLE "public"."visitor_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."visitor_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."visitor_profiles_by_patient" TO "anon";
GRANT ALL ON TABLE "public"."visitor_profiles_by_patient" TO "authenticated";
GRANT ALL ON TABLE "public"."visitor_profiles_by_patient" TO "service_role";



REVOKE ALL ON TABLE "storage"."buckets" FROM "supabase_storage_admin";
GRANT ALL ON TABLE "storage"."buckets" TO "supabase_storage_admin" WITH GRANT OPTION;
GRANT ALL ON TABLE "storage"."buckets" TO "service_role";
GRANT ALL ON TABLE "storage"."buckets" TO "authenticated";
GRANT ALL ON TABLE "storage"."buckets" TO "anon";
GRANT ALL ON TABLE "storage"."buckets" TO "postgres" WITH GRANT OPTION;



GRANT ALL ON TABLE "storage"."buckets_analytics" TO "service_role";
GRANT ALL ON TABLE "storage"."buckets_analytics" TO "authenticated";
GRANT ALL ON TABLE "storage"."buckets_analytics" TO "anon";



GRANT SELECT ON TABLE "storage"."buckets_vectors" TO "service_role";
GRANT SELECT ON TABLE "storage"."buckets_vectors" TO "authenticated";
GRANT SELECT ON TABLE "storage"."buckets_vectors" TO "anon";



REVOKE ALL ON TABLE "storage"."objects" FROM "supabase_storage_admin";
GRANT ALL ON TABLE "storage"."objects" TO "supabase_storage_admin" WITH GRANT OPTION;
GRANT ALL ON TABLE "storage"."objects" TO "service_role";
GRANT ALL ON TABLE "storage"."objects" TO "authenticated";
GRANT ALL ON TABLE "storage"."objects" TO "anon";
GRANT ALL ON TABLE "storage"."objects" TO "postgres" WITH GRANT OPTION;



GRANT ALL ON TABLE "storage"."s3_multipart_uploads" TO "service_role";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads" TO "authenticated";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads" TO "anon";



GRANT ALL ON TABLE "storage"."s3_multipart_uploads_parts" TO "service_role";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads_parts" TO "authenticated";
GRANT SELECT ON TABLE "storage"."s3_multipart_uploads_parts" TO "anon";



GRANT SELECT ON TABLE "storage"."vector_indexes" TO "service_role";
GRANT SELECT ON TABLE "storage"."vector_indexes" TO "authenticated";
GRANT SELECT ON TABLE "storage"."vector_indexes" TO "anon";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "storage" GRANT ALL ON TABLES TO "service_role";




