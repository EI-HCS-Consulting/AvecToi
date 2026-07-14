-- Nouveau statut "ferme" (affiché "Fermé" côté app) : un besoin resté
-- "ouvert" (jamais pris en charge) dont la date est passée bascule
-- automatiquement en "ferme" côté client, pour qu'il arrête d'apparaître
-- comme en attente de réponse. Élargit la contrainte CHECK sur tasks.status,
-- même principe que 20260707_tasks_category_check.sql (contrainte posée
-- au tout début du projet, jamais suivie en migration jusqu'ici).
alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks add constraint tasks_status_check
  check (status = any (array['ouvert', 'pris_en_charge', 'fait', 'ferme']));
