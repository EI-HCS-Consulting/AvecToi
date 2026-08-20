-- Lien du visiteur avec le patient (Père / Mère / Ami·e / ...), choisi dans
-- "Mes informations" (voir app/(visitor)/account.tsx, lib/relations.ts pour
-- le catalogue de valeurs). Affiché dans la liste des visiteurs
-- (components/VisitorsList.tsx) et la fiche visiteur
-- (components/VisitorProfileModal.tsx). Même colonne texte libre que motto
-- (20260715_visitor_profiles_motto.sql) ; stocke la clé du catalogue (pas le
-- libellé) pour rester traduisible/renommable côté app sans migration.
alter table public.visitor_profiles
  add column if not exists relation text;
