-- Liste de courses éditable en bullet points, attachée à un besoin
-- catégorie "courses" (voir components/ShoppingListModal.tsx). Une ligne par
-- article ; task_id est la seule source de vérité, partagée entre le bouton
-- "👁️ Aperçu" du Mur d'Entraide (components/Entraide.tsx) et "📄 Mes
-- documents" (components/MyChecklist.tsx) — les deux ouvrent le même
-- ShoppingListModal sur le même task_id, donc toute modification (ajout,
-- suppression, coché "acheté") est immédiatement visible des deux côtés,
-- sans copie ni synchronisation explicite.
create table if not exists public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  label text not null,
  bought boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.shopping_list_items enable row level security;

-- Même modèle que personal_documents/personal_checklist_items : RLS ouvert,
-- contrôle d'accès géré côté app. Ici, aucune restriction par identité même
-- côté app : cocher/ajouter un article est ouvert à tout visiteur ou admin
-- de l'espace, comme la modification de la description d'un besoin
-- (saveModifyDesc dans Entraide.tsx).
create policy "public read shopping list items"
  on public.shopping_list_items for select
  using (true);

create policy "public write shopping list items"
  on public.shopping_list_items for insert
  with check (true);

create policy "public update shopping list items"
  on public.shopping_list_items for update
  using (true)
  with check (true);

create policy "public delete shopping list items"
  on public.shopping_list_items for delete
  using (true);

create index if not exists shopping_list_items_task_id_idx on public.shopping_list_items(task_id);
