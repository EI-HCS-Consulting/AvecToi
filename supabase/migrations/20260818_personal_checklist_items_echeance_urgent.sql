-- Échéance/urgence par item dans "Ma Checklist" (assistant d'import, voir
-- components/MyChecklist.tsx et components/Entraide.tsx) — jusqu'ici ces
-- deux champs n'étaient persistés que côté tasks (date_limite/urgent), donc
-- seulement pour les items publiés sur le Mur d'Entraide. Un import privé
-- (task_id null) n'avait nulle part où les stocker : cette migration les
-- ajoute directement sur personal_checklist_items, pour qu'ils survivent
-- quel que soit le mode d'import (privé ou public).
alter table public.personal_checklist_items
  add column if not exists date_limite date,
  add column if not exists urgent boolean not null default false;
