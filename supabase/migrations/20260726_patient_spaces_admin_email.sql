-- Email admin dénormalisé sur patient_spaces, même principe que
-- admin_firstname/admin_lastname (migration 20260709_admin_identity.sql) :
-- jusqu'ici l'email n'existait que dans auth.users, non exposé via l'API
-- publique. Ecrit desormais à la création de l'espace (voir
-- components/PatientOnboarding.tsx), backfill ici pour les espaces existants.

alter table public.patient_spaces
  add column if not exists admin_email text;

update public.patient_spaces ps
set admin_email = u.email
from auth.users u
where u.id = ps.admin_id
  and ps.admin_email is null;
