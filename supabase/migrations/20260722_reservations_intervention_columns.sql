-- Colonnes portant les réservations de type 'Intervention' (voir
-- 20260722_intervenant_tables.sql). Aucune contrainte CHECK n'existe sur
-- reservations.type — 'Intervention' est une simple nouvelle valeur
-- acceptée sans migration de contrainte.
--
-- duration_minutes/intervention_label sont copiés au moment de la
-- réservation (pas de FK vers intervention_types) : l'historique d'une
-- intervention ne doit jamais changer si l'intervenant modifie ou
-- supprime ce type plus tard. intervenant_profile_id reste une vraie FK
-- (on delete set null) pour permettre de retrouver le profil tant qu'il
-- existe, sans casser l'historique si le profil est supprimé.
alter table public.reservations
  add column if not exists duration_minutes integer,
  add column if not exists intervention_label text,
  add column if not exists intervenant_profile_id uuid references public.intervenant_profiles(id) on delete set null;

create index if not exists idx_reservations_space_type
  on public.reservations (space_id, type);
