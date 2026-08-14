-- Réponses aux nouvelles ("Nouvelles du jour") — permet à n'importe quel
-- visiteur/intervenant/admin de répondre à une nouvelle déjà publiée (bouton
-- "🙏 Répondre"), même logique que support_message_replies (Mur de soutien),
-- distinct du bouton d'édition (✏️) qui reste réservé à l'auteur réel de la
-- nouvelle. Policies permissives comme public.news_entries : le contrôle
-- d'accès réel se fait côté client (PIN), pas au niveau RLS. deleted_by_admin
-- inclus directement (contrairement à support_message_replies qui l'a reçu
-- via une migration ultérieure, cf. 20260811_content_deleted_by_admin.sql) —
-- même modération "douce" que le reste du contenu. on delete cascade sur
-- entry_id/space_id : pas besoin d'ajouter cette table à la purge RGPD
-- (supabase/functions/rgpd-purge), elle suit automatiquement la suppression
-- de la nouvelle ou de l'espace parent.
create table public.news_entry_replies (
  id               uuid        primary key default gen_random_uuid(),
  entry_id         uuid        not null references public.news_entries(id) on delete cascade,
  space_id         uuid        not null references public.patient_spaces(id) on delete cascade,
  reply_text       text        not null,
  author_prenom    text        not null,
  author_nom       text        not null,
  author_pin       text,
  deleted_by_admin boolean     not null default false,
  created_at       timestamptz not null default now()
);

alter table public.news_entry_replies enable row level security;

create policy "public can read news entry replies"
  on public.news_entry_replies
  for select
  using (true);

create policy "public can insert news entry replies"
  on public.news_entry_replies
  for insert
  with check (true);

create policy "public can update news entry replies"
  on public.news_entry_replies
  for update
  using (true) with check (true);

create policy "public can delete news entry replies"
  on public.news_entry_replies
  for delete
  using (true);
