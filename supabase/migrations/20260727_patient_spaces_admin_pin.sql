-- Code PIN admin dénormalisé sur patient_spaces, même principe que
-- admin_email (migration 20260726_patient_spaces_admin_email.sql) : le PIN
-- existe déjà côté app (user_metadata.pin, éditable depuis "Mon profil
-- (Admin)" dans app/(admin)/account.tsx, PinPad avec reveal/hide) mais
-- n'était visible nulle part hors de auth.users, non exposé via l'API
-- publique. Objectif : identifier un admin par téléphone (support) sans lui
-- demander son mot de passe. Recopié désormais à chaque sauvegarde du profil
-- admin (voir handleSaveProfile), backfill ici pour les PIN déjà définis.

alter table public.patient_spaces
  add column if not exists admin_pin text;

update public.patient_spaces ps
set admin_pin = u.raw_user_meta_data->>'pin'
from auth.users u
where u.id = ps.admin_id
  and ps.admin_pin is null
  and u.raw_user_meta_data->>'pin' is not null;
