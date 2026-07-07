-- Motif associé à une date bloquée (ex. "Jour férié", "Indisponibilité
-- équipe"), saisi par l'admin dans Paramètres > Règles de visite, et
-- affiché au visiteur qui clique sur ce jour dans le calendrier.
-- Stocké en jsonb { "2026-07-14": "Jour férié", ... } plutôt qu'une colonne
-- par date puisque blocked_dates est déjà un tableau à taille variable.

alter table public.slot_config
  add column if not exists blocked_date_reasons jsonb not null default '{}'::jsonb;
