-- Date de sortie d'hospitalisation optionnelle du patient, éditable dans la
-- fiche patient (même bloc que patient_admission_date, voir migration
-- 20260716_patient_admission_date.sql) — affichée dans la Chronologie
-- (app/(admin)/settings.tsx) une fois renseignée.
alter table public.patient_spaces
  add column if not exists patient_discharge_date date;
