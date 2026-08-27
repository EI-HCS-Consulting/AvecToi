-- Répartition d'un besoin de relais (tasks.category="relais") entre
-- plusieurs preneurs, chacun couvrant une sous-période distincte — "je peux
-- entre le ... et le ..." plutôt qu'un seul preneur pour toute la période
-- (voir components/Entraide.tsx, flux de claim). Devient la seule source de
-- vérité pour les preneurs d'un besoin relais : tasks.claimed_by_* n'est
-- plus renseigné pour cette catégorie une fois ce volet en place.
create table if not exists public.task_relais_coverage (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  prenom text not null,
  nom text not null,
  pin text not null,
  start_date date not null,
  end_date date not null,
  -- Vrai seulement si la personne a choisi "Je m'en charge" (tout ce qu'il
  -- restait à couvrir) plutôt qu'une période choisie à la main — purement
  -- informatif pour l'affichage, ne rentre pas dans le calcul de couverture
  -- (qui se fait uniquement sur start_date/end_date, voir lib/relaisCoverage.ts).
  full_period boolean not null default false,
  claimed_text text,
  claimed_photo text,
  created_at timestamptz not null default now()
);

alter table public.task_relais_coverage enable row level security;

-- Même modèle que shopping_list_items (20260819_shopping_list_items.sql) :
-- RLS ouvert, contrôle d'accès (identité + PIN) géré côté app.
create policy "public read task relais coverage"
  on public.task_relais_coverage for select
  using (true);

create policy "public write task relais coverage"
  on public.task_relais_coverage for insert
  with check (true);

create policy "public update task relais coverage"
  on public.task_relais_coverage for update
  using (true)
  with check (true);

create policy "public delete task relais coverage"
  on public.task_relais_coverage for delete
  using (true);

create index if not exists task_relais_coverage_task_id_idx on public.task_relais_coverage(task_id);
