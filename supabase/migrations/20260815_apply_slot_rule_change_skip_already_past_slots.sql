-- apply_slot_rule_change() ne devait toucher que les réservations "à
-- venir", mais son filtre `date >= current_date` laisse passer les
-- créneaux du jour même déjà passés en heure (ex. un changement de règles
-- fait à 17h ne devrait plus pouvoir recaser/suspendre une visite de 10h
-- ce même jour — elle a déjà eu lieu). `current_date` seul ignore l'heure
-- murale ; on calcule maintenant l'heure Europe/Paris (le serveur tourne
-- en UTC) et on exclut, pour les cohortes "Visite" candidates au
-- recasage/à la suspension "1 visite par jour", tout créneau du jour même
-- dont l'heure de début est déjà dépassée. Les nuitées restent traitées
-- au jour près uniquement (comme isReservationDatePast côté client :
-- l'heure du jour n'entre pas en jeu pour une "Nuit", qui couvre toute la
-- soirée/nuit) — aucun changement sur ce point.
--
-- Signature et reste du corps inchangés par rapport à
-- supabase/migrations/20260815_fix_book_intervention_same_day_rebook_order.sql
-- (recasage vers le prochain créneau libre, pas le plus proche).

create or replace function public.apply_slot_rule_change(
  p_space_id uuid,
  p_new_config jsonb,
  p_new_slots text[]
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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

  v_today date;
  v_now_minutes integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_space_id::text));

  p_new_slots := coalesce(p_new_slots, array[]::text[]);

  -- Heure murale Europe/Paris (le serveur tourne en UTC) — sert à ne
  -- jamais recaser/suspendre une réservation "Visite" dont le créneau du
  -- jour même est déjà passé, même si son jour est bien >= aujourd'hui.
  v_today := (now() at time zone 'Europe/Paris')::date;
  v_now_minutes := extract(hour from (now() at time zone 'Europe/Paris'))::integer * 60
    + extract(minute from (now() at time zone 'Europe/Paris'))::integer;

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

  -- 2. Recasage des réservations "Visite" futures invalidées — jamais un
  -- créneau du jour même déjà passé en heure (v_today/v_now_minutes).
  if v_structural_change then
    for v_cohort in
      select
        coalesce(group_id, id) as cohort_key,
        (array_agg(date order by created_at))[1] as cohort_date,
        (array_agg(creneau order by created_at))[1] as cohort_creneau,
        array_agg(id order by created_at) as member_ids,
        count(*) as cohort_size
      from reservations
      where space_id = p_space_id and type = 'Visite'
        and (date > v_today or (date = v_today and to_minutes(creneau) > v_now_minutes))
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

      -- Créneaux du même jour STRICTEMENT postérieurs au créneau d'origine,
      -- triés par ordre chronologique croissant (le prochain créneau libre
      -- d'abord) — voir commentaire en tête de fichier. Repli jour par jour
      -- (ordre chronologique de p_new_slots) si aucun ne convient.
      select coalesce(array_agg(s order by to_minutes(s)), array[]::text[])
        into v_same_day_slots
        from unnest(p_new_slots) s
        where to_minutes(s) > to_minutes(v_cohort.cohort_creneau);

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

  -- 3. Nuitées invalidées : message seul, jamais de déplacement/suppression.
  -- Contrairement aux visites, l'heure du jour n'entre pas en jeu pour une
  -- "Nuit" (elle couvre toute la soirée) — seul le jour compte, comme
  -- isReservationDatePast côté client.
  if v_night_scan_needed then
    for v_night in
      select id, date from reservations
      where space_id = p_space_id and type = 'Nuit' and date >= v_today
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
  -- (jour révolu, ou créneau du jour même déjà passé en heure), et ne
  -- déplace ni ne supprime rien — pour chaque jour où plusieurs réservations
  -- "Visite" à venir existent déjà, la première enregistrée (created_at le
  -- plus ancien) reste active, toutes les autres sont marquées
  -- "day_cap_suspended".
  if v_one_visit_activated then
    for v_daycap_date in
      select date
      from reservations
      where space_id = p_space_id and type = 'Visite'
        and (date > v_today or (date = v_today and to_minutes(creneau) > v_now_minutes))
      group by date
      having count(distinct coalesce(group_id, id)) > 1
    loop
      select coalesce(group_id, id) into v_winning_cohort
      from reservations
      where space_id = p_space_id and type = 'Visite' and date = v_daycap_date
        and (v_daycap_date > v_today or to_minutes(creneau) > v_now_minutes)
      group by coalesce(group_id, id)
      order by min(created_at) asc
      limit 1;

      for v_loser in
        select id, prenom, nom, type, date, creneau
        from reservations
        where space_id = p_space_id and type = 'Visite' and date = v_daycap_date
          and (v_daycap_date > v_today or to_minutes(creneau) > v_now_minutes)
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
