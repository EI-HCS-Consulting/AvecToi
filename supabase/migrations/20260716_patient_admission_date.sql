-- Date d'hospitalisation optionnelle du patient, éditable dans la fiche
-- patient (voir app/(admin)/settings.tsx, même bloc que la photo et la
-- phrase totem) et saisissable dès la création de l'espace
-- (components/PatientOnboarding.tsx).
alter table public.patient_spaces
  add column if not exists patient_admission_date date;
