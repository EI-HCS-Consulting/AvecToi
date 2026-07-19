-- Corrige 20260717_reservations_intervention_columns.sql : contrairement à ce
-- qui était supposé, une contrainte CHECK existait bel et bien sur
-- reservations.type (reservations_type_check, limitée à 'Visite'/'Nuit'),
-- posée lors de la création initiale de la table (hors migrations suivies).
-- Sans cette correction, tout insert type='Intervention' (book_intervention,
-- AdminAddIntervention) échoue avec "violates check constraint
-- reservations_type_check".

alter table public.reservations
  drop constraint if exists reservations_type_check;

alter table public.reservations
  add constraint reservations_type_check
  check (type in ('Visite', 'Nuit', 'Intervention'));
