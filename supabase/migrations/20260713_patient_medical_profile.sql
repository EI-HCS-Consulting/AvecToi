-- Fiche patient : ajoute date de naissance (âge + anniversaire, visible de
-- tous), sexe (symbole ♂/♀), groupe sanguin (pour un don ponctuel si besoin
-- de transfusion) et allergies (affichées en rappel à quiconque publie ou
-- prend en charge un besoin "repas"). Tous nullable : champs facultatifs,
-- remplis par l'admin depuis "Profil Patient" (app/(admin)/settings.tsx).

alter table public.patient_spaces
  add column if not exists patient_birthdate date,
  add column if not exists patient_sex text check (patient_sex in ('M', 'F')),
  add column if not exists patient_blood_type text,
  add column if not exists patient_allergies text;
