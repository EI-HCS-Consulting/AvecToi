-- Cap freemium serveur : 8 réservations "Visite" par espace, blocage total
-- de la 9e jusqu'à passage en premium. Nécessaire car `reservations` n'a
-- aucune RLS aujourd'hui — le cap côté client (BookingFlow.tsx) est
-- contournable par un insert direct ; ce trigger est la seule barrière
-- fiable, appliquée à la fois au visiteur et à l'admin (AdminAddReservation.tsx).
--
-- Avant d'exécuter dans le SQL Editor Supabase, remplacer :
--   <PROJECT_REF>   → identifiant de projet Supabase (ex: flmslcdzjuifkivmzins)
--   <CRON_SECRET>   → même valeur que le secret CRON_SECRET de la Edge Function
--                      (supabase secrets set CRON_SECRET=...), voir supabase/cron.sql

alter table public.patient_spaces
  add column if not exists cap_email_sent_at timestamptz;

create or replace function public.check_visite_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

drop trigger if exists trg_check_visite_cap on public.reservations;
create trigger trg_check_visite_cap
  before insert on public.reservations
  for each row execute function public.check_visite_cap();

create or replace function public.notify_cap_reached()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_premium boolean;
  v_count integer;
  v_updated integer;
  v_url text := 'https://<PROJECT_REF>.supabase.co/functions/v1/notify-cap-reached';
  v_secret text := '<CRON_SECRET>';
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

  -- Ne déclenche qu'au moment exact où le cap est atteint (pas à chaque
  -- tentative bloquée ensuite par check_visite_cap) ; l'update conditionnel
  -- sur cap_email_sent_at is null garantit un envoi unique même en cas de
  -- courses concurrentes.
  if v_count = 8 then
    update patient_spaces
      set cap_email_sent_at = now()
      where id = new.space_id and cap_email_sent_at is null;
    get diagnostics v_updated = row_count;

    if v_updated > 0 then
      perform net.http_post(
        url := v_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_secret
        ),
        body := jsonb_build_object('space_id', new.space_id)
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_cap_reached on public.reservations;
create trigger trg_notify_cap_reached
  after insert on public.reservations
  for each row execute function public.notify_cap_reached();
