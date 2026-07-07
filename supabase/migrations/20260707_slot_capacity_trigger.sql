-- Cap serveur sur l'occupation des créneaux "Visite" (max_visitors_per_slot,
-- réglé par espace dans slot_config). Jusqu'ici cette limite n'était
-- vérifiée que côté client (slots.tsx cache le bouton "Réserver" une fois
-- le créneau complet) — sans verrou serveur, deux réservations lancées au
-- même moment sur le dernier créneau libre passent toutes les deux le
-- contrôle client et créent une sur-réservation (ex. 3 inscrits pour un
-- max de 2, cas rapporté le mardi 07/07/2026 midi).
--
-- pg_advisory_xact_lock sérialise les tentatives concurrentes visant le
-- même créneau (espace + date + créneau) le temps de la transaction, pour
-- que le comptage qui suit soit fiable même en cas de double-tap ou de
-- deux visiteurs simultanés.

create or replace function public.check_slot_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max integer;
  v_count integer;
begin
  if new.type <> 'Visite' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.space_id::text || new.date::text || new.creneau, 0));

  select max_visitors_per_slot into v_max from slot_config where space_id = new.space_id;
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

  return new;
end;
$$;

drop trigger if exists trg_check_slot_capacity on public.reservations;
create trigger trg_check_slot_capacity
  before insert or update of date, creneau, type, space_id on public.reservations
  for each row execute function public.check_slot_capacity();
