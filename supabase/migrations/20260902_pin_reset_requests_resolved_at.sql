-- Trace la date/heure effective de la réinitialisation (distincte de
-- created_at, la demande, et de seen, qui ne veut dire que "plus dans la
-- liste active" — un "Ignorer" met seen=true sans jamais réinitialiser).
-- Sert à afficher un message d'historique symétrique côté visiteur ET admin
-- dans "Mes alertes" (voir MyAlertsModal.tsx) : demande faite le [created_at],
-- traitée par l'admin le [resolved_at].
alter table public.pin_reset_requests
  add column if not exists resolved_at timestamptz;
