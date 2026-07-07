-- Composants d'adresse du domicile du demandeur (code postal / ville /
-- pays) pour un besoin Transport, + indicateur de quel côté (Départ ou
-- Arrivée) se trouve ce domicile. Le lieu de soin est figé (hospital_name
-- côté espace) et n'a pas besoin de ses propres champs d'adresse ici.
-- Additif/nullable, sans impact sur l'existant.
alter table public.tasks
  add column if not exists transport_home_postal_code text,
  add column if not exists transport_home_city text,
  add column if not exists transport_home_country text,
  add column if not exists transport_home_is_arrival boolean not null default false;
