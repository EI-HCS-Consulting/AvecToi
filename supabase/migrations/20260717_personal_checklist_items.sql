-- "Ma Checklist" (bloc dédié dans Mon Compte, admin + visiteur) : liste
-- personnelle où chacun peut cocher "Fait" directement, ajouter ses propres
-- items ou importer les checklists suggérées d'Entraide.
--
-- task_id renseigné uniquement pour les items importés depuis une checklist
-- suggérée (toujours "publics" : ce sont aussi de vrais besoins dans le Mur
-- d'Entraide) — status y est alors synchronisé avec tasks.status à chaque
-- bascule, dans les deux sens. Un item tapé librement (texte libre) n'a
-- jamais de task_id : purement personnel, jamais visible par les autres.
--
-- owner_pin vaut "ADMIN" pour un item créé par l'admin (même convention que
-- support_messages.author_pin/news_entries.author_pin), sinon le PIN de
-- session du visiteur.
create table if not exists public.personal_checklist_items (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.patient_spaces(id) on delete cascade,
  owner_prenom text not null,
  owner_nom text not null,
  owner_pin text not null,
  title text not null,
  status text not null default 'a_faire' check (status in ('a_faire', 'fait')),
  task_id uuid references public.tasks(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.personal_checklist_items enable row level security;

-- Même modèle que tasks/reservations/etc. : RLS ouvert, contrôle d'accès
-- géré côté app (identité prénom+nom+PIN, pas de vrais comptes visiteur).
create policy "public read personal checklist items"
  on public.personal_checklist_items for select
  using (true);

create policy "public write personal checklist items"
  on public.personal_checklist_items for insert
  with check (true);

create policy "public update personal checklist items"
  on public.personal_checklist_items for update
  using (true);

create policy "public delete personal checklist items"
  on public.personal_checklist_items for delete
  using (true);
