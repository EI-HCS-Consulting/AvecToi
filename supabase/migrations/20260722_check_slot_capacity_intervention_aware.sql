-- Durcit check_slot_capacity() (20260707_slot_capacity_trigger.sql) : une
-- réservation "Visite" ne doit jamais pouvoir atterrir sur un créneau déjà
-- couvert par une intervention (prioritaire par construction — voir
-- book_intervention). Sans ce verrou serveur, un insert direct contournant
-- le bouton désactivé côté UI (slots.tsx) passerait quand même, exactement
-- le même raisonnement que le verrou de capacité déjà en place.

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
begin
  if new.type <> 'Visite' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.space_id::text || new.date::text || new.creneau, 0));

  select max_visitors_per_slot, slot_duration_minutes into v_max, v_slot_duration
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

  return new;
end;
$$;
