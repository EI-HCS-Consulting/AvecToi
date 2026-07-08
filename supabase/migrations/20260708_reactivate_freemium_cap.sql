-- Réactivation du cap freemium (voir 20260705_pause_freemium_cap.sql).
-- Le seul espace patient existant est passé en premium = true, donc cette
-- réactivation n'a aucun effet sur les données actuelles (v_premium court-
-- circuite le cap et la notification pour cet espace) ; elle prépare
-- l'enforcement pour les futurs espaces non-premium.

alter table public.reservations enable trigger trg_check_visite_cap;
alter table public.reservations enable trigger trg_notify_cap_reached;
