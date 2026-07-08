-- La contrainte CHECK sur tasks.category ne listait pas encore 'transport'
-- ni 'administratif' (catégories ajoutées côté app sans mise à jour de la
-- contrainte en base), ce qui provoquait un rejet silencieux (23514
-- check_violation) lors de la création d'un besoin Transport/Administratif.
-- Élargit la liste des valeurs autorisées, sans impact sur les données
-- existantes (repas/affaires/courses/autre restent valides).
alter table public.tasks drop constraint if exists tasks_category_check;
alter table public.tasks add constraint tasks_category_check
  check (category = any (array['repas', 'affaires', 'courses', 'transport', 'administratif', 'autre']));
