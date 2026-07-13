-- Permet de publier un besoin Transport pour une autre personne (ex. un
-- proche âgé) que l'auteur du besoin. author_prenom/nom (existant) reste
-- "qui a posté le besoin" ; ces 2 colonnes sont "pour qui" le transport est
-- demandé, renseignées uniquement quand l'auteur active le bouton dédié à
-- la création. Nulles = transport demandé pour l'auteur lui-même.

alter table public.tasks
  add column if not exists transport_for_prenom text,
  add column if not exists transport_for_nom text;
