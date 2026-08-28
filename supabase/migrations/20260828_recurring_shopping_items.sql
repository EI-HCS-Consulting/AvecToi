-- Catalogue des articles de courses déjà saisis au moins une fois dans
-- l'espace ("Produits récurrents", voir components/Entraide.tsx) : proposé
-- au moment de créer une nouvelle liste de courses pour éviter de retaper
-- les mêmes articles à chaque fois. S'enrichit tout seul dès qu'un visiteur
-- ou l'admin tape un nouvel article (création de besoin ou ajout dans une
-- liste déjà publiée, voir components/ShoppingListModal.tsx) — table
-- indépendante de shopping_list_items : supprimer une entrée récurrente ne
-- touche jamais un besoin déjà publié.
create table if not exists public.recurring_shopping_items (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.patient_spaces(id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now()
);

alter table public.recurring_shopping_items enable row level security;

-- Même modèle que shopping_list_items : RLS ouvert, contrôle d'accès
-- (admin peut supprimer, tout le monde peut ajouter/consulter) géré côté app.
create policy "public read recurring shopping items"
  on public.recurring_shopping_items for select
  using (true);

create policy "public write recurring shopping items"
  on public.recurring_shopping_items for insert
  with check (true);

create policy "public delete recurring shopping items"
  on public.recurring_shopping_items for delete
  using (true);

-- Dédoublonnage insensible à la casse par espace : un insert en conflit
-- (même libellé déjà présent) échoue silencieusement côté app (voir
-- addToRecurringCatalog dans Entraide.tsx), qui ignore l'erreur 23505.
create unique index if not exists recurring_shopping_items_space_label_key
  on public.recurring_shopping_items (space_id, lower(label));

create index if not exists recurring_shopping_items_space_id_idx
  on public.recurring_shopping_items (space_id);
