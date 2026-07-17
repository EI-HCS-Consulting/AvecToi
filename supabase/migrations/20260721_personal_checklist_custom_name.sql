-- Permet de créer une checklist personnelle nommée (bouton "+ Créer une
-- checklist" dans Ma Checklist) — un groupe d'items personnels qui apparaît
-- comme un sous-bloc à part, en plus des 3 checklists suggérées et de "Mes
-- items personnels" (items sans nom). Null pour tout le reste.
alter table public.personal_checklist_items
  add column if not exists custom_checklist_name text;
