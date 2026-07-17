-- Trace de modification visible par tous, utilisée notamment quand un
-- utilisateur choisit "Modifier" au lieu de republier un besoin
-- administratif en doublon (voir findDuplicateAdminTask côté app).
alter table public.tasks add column if not exists modified_at timestamptz;
alter table public.tasks add column if not exists modified_by_prenom text;
alter table public.tasks add column if not exists modified_by_nom text;
