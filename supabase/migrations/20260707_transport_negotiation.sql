-- Négociation d'horaire pour les besoins Transport dans Entraide, + identité
-- de l'auteur d'un besoin (manquait jusqu'ici, nécessaire pour savoir qui a
-- le droit de valider une proposition d'horaire). Tout est additif/nullable
-- ou par défaut, sans impact sur les 5 autres catégories ni sur l'app web.
alter table public.tasks
  add column if not exists author_prenom text,
  add column if not exists author_nom text,
  add column if not exists author_pin text,
  add column if not exists transport_date date,
  add column if not exists transport_out_time text,
  add column if not exists transport_return_time text,
  add column if not exists transport_round_trip boolean not null default false,
  add column if not exists transport_flexible boolean not null default false,
  add column if not exists transport_from text,
  add column if not exists transport_to text,
  add column if not exists transport_confirmed_date date,
  add column if not exists transport_confirmed_out_time text,
  add column if not exists transport_confirmed_return_time text,
  add column if not exists transport_proposals jsonb not null default '[]'::jsonb;
