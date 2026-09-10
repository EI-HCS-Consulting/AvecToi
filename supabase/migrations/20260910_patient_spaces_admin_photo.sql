-- Photo de profil de l'admin, dénormalisée depuis user_metadata.photo_url
-- (auth.users n'est pas exposé via l'API publique) — même principe que
-- admin_pin/admin_firstname/admin_lastname (voir account.tsx) et admin_email
-- (migration 20260726_patient_spaces_admin_email.sql). Sans cette colonne,
-- la photo de l'admin ne peut pas être affichée aux visiteurs (ex. tuile
-- "Mes engagements" de l'onglet "Ma semaine").
alter table patient_spaces add column if not exists admin_photo_url text;
