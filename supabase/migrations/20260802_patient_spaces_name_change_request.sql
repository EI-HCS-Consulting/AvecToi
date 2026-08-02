-- Suivi de la demande de changement de nom patient (Réglages → Profil
-- patient → "Demander un changement de nom"). Le nom/prénom du patient
-- reste non modifiable directement depuis l'app (traitement manuel côté
-- support) — cette colonne sert uniquement à afficher un statut "Demande en
-- cours de traitement" côté admin tant que la demande n'a pas été traitée.
-- Remise à NULL manuellement par le support (Dashboard) une fois le nom
-- effectivement mis à jour.

alter table public.patient_spaces
  add column if not exists name_change_requested_at timestamptz;
