-- Phrase totem / mantra du patient (optionnel, saisi à l'onboarding, étape 1
-- "Patient" — voir components/PatientOnboarding.tsx). Affichée sous le
-- prénom/nom dans la fiche patient et dans le bandeau (SpaceHeader), sous le
-- titre "Visites [prénom]".
alter table public.patient_spaces
  add column if not exists patient_motto text;
