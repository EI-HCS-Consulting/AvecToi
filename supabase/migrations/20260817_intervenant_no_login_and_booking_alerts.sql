-- Fiches intervenant "sans connexion" créées par l'admin (pin NULL) + email
-- optionnel sur toutes les fiches + nouveau type d'alerte réservation pour
-- proposer un créneau à un intervenant.

alter table public.intervenant_profiles
  alter column pin drop not null,
  add column if not exists email text;

-- pin IS NULL == fiche créée par l'admin, sans connexion possible.

do $$ begin
  alter table public.reservations drop constraint reservations_alert_type_check;
exception when undefined_object then null; end $$;
alter table public.reservations
  add constraint reservations_alert_type_check
  check (alert_type in ('rebooked', 'night_cancelled', 'rebooking_failed', 'day_cap_suspended', 'booking_proposal'));
