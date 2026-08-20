-- Catégorie "relais" (besoin de relais ponctuel pour l'aidant, publié
-- uniquement depuis "Mon compte" plutôt que via "Publier → Autre", voir
-- components/Entraide.tsx). La date de fin réutilise date_limite (déjà
-- générique aux catégories hors transport) ; relais_start_date est la seule
-- nouvelle date. relais_visible_to/relais_recipients permettent de cibler
-- "tous les proches" ou une liste choisie au moment de la publication (pas
-- un réglage d'espace persistant, contrairement à night_visitor_mode).
-- relais_dismissed_by ne masque que l'alerte de connexion (RelaisAlertModal),
-- jamais la visibilité du besoin dans le mur Entraide.
alter table public.tasks drop constraint if exists tasks_category_check;
alter table public.tasks add constraint tasks_category_check
  check (category = any (array['repas', 'affaires', 'courses', 'transport', 'administratif', 'autre', 'relais']));

alter table public.tasks add column if not exists relais_start_date date;
alter table public.tasks add column if not exists relais_visible_to text
  check (relais_visible_to is null or relais_visible_to in ('all', 'some'));
alter table public.tasks add column if not exists relais_recipients jsonb;
alter table public.tasks add column if not exists relais_dismissed_by jsonb not null default '[]'::jsonb;
