-- Colonnes d'alerte pour les réservations automatiquement déplacées ou
-- annulées suite à un changement de règles de visite (voir
-- apply_slot_rule_change, migration ultérieure). alert_type distingue
-- proprement les cas côté UI plutôt que de "sniffer" le texte du message.
--
-- La policy UPDATE existante sur reservations (20260706_reservations_
-- update_delete_policy.sql, USING(true) WITH CHECK(true)) couvre déjà
-- l'écriture de ces nouvelles colonnes, aucune policy supplémentaire requise.

alter table public.reservations
  add column if not exists previous_date date,
  add column if not exists previous_creneau text,
  add column if not exists alert_message text,
  add column if not exists alert_type text,
  add column if not exists alert_seen boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reservations_alert_type_check'
  ) then
    alter table public.reservations
      add constraint reservations_alert_type_check
      check (alert_type in ('rebooked', 'night_cancelled', 'rebooking_failed'));
  end if;
end $$;
