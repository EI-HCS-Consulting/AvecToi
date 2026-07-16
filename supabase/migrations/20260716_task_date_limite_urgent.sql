-- Besoins hors Transport (repas, affaires, courses, administratif, autre) :
-- date optionnelle pour permettre la même fermeture auto que Transport
-- (voir 20260714_tasks_status_ferme.sql et taskOverdueUnclaimed côté app),
-- + marqueur "urgent" pour toutes les catégories.
alter table public.tasks add column if not exists date_limite date;
alter table public.tasks add column if not exists urgent boolean not null default false;
