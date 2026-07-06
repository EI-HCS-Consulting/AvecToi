-- Phase actuelle : élaboration / création de l'app, pas encore de lancement
-- commercial — le cap freemium (8 réservations "Visite" max par espace) et
-- sa notification par email sont mis en pause pour ne pas gêner les tests.
-- Les fonctions restent en place (rien de supprimé), seuls les triggers sont
-- désactivés : réactivation en une ligne avant l'ouverture au public.

alter table public.reservations disable trigger trg_check_visite_cap;
alter table public.reservations disable trigger trg_notify_cap_reached;

-- Pour réactiver plus tard (avant lancement commercial) :
--   alter table public.reservations enable trigger trg_check_visite_cap;
--   alter table public.reservations enable trigger trg_notify_cap_reached;
-- Penser à appliquer aussi 20260705_cap_notify_non_fatal.sql à ce moment-là
-- (fix pg_net laissé de côté pendant la pause, voir handoff).
