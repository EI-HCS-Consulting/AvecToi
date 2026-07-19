-- Téléphone et phrase totem optionnels sur la fiche intervenant — premiers
-- champs de la refonte du compte Intervenant (téléphone pour être joignable
-- par l'admin/les autres intervenants si besoin, phrase totem sur le même
-- principe que visitor_profiles.motto côté visiteur).
alter table public.intervenant_profiles
  add column if not exists telephone text,
  add column if not exists phrase_totem text;
