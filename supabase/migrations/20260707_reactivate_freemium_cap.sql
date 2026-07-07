-- Réactivation du cap freemium (8 réservations "Visite" max par espace) et
-- de sa notification par email, mis en pause dans 20260705_pause_freemium_cap.sql
-- le temps du développement. Le fix pg_net non-fatal (20260705_cap_notify_non_fatal.sql)
-- est déjà confirmé appliqué en prod, condition posée avant cette réactivation.

alter table public.reservations enable trigger trg_check_visite_cap;
alter table public.reservations enable trigger trg_notify_cap_reached;
