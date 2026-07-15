-- Phrase totem / mantra optionnelle pour chaque visiteur, éditable dans
-- "Mon compte" (voir app/(visitor)/account.tsx). Même colonne texte libre que
-- patient_motto (20260715_patient_motto.sql), affichée dans le bloc
-- "Visiteurs" des Paramètres admin (components/VisitorsBlock.tsx).
alter table public.visitor_profiles
  add column if not exists motto text;
