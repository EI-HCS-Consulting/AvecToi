-- Réponses aux messages du Mur de soutien — permet à n'importe quel
-- visiteur/admin de répondre à un message existant (bouton "🙏 Répondre"),
-- distinct du bouton d'édition (✏️) qui reste réservé à l'auteur réel du
-- message. Policies permissives comme public.reservations/support_messages :
-- le contrôle d'accès réel se fait côté client (PIN), pas au niveau RLS.
-- on delete cascade sur message_id/space_id : pas besoin d'ajouter cette
-- table à la purge RGPD (supabase/functions/rgpd-purge), elle suit
-- automatiquement la suppression du message ou de l'espace parent.
create table public.support_message_replies (
  id            uuid        primary key default gen_random_uuid(),
  message_id    uuid        not null references public.support_messages(id) on delete cascade,
  space_id      uuid        not null references public.patient_spaces(id) on delete cascade,
  reply_text    text        not null,
  author_prenom text        not null,
  author_nom    text        not null,
  author_pin    text,
  created_at    timestamptz not null default now()
);

alter table public.support_message_replies enable row level security;

create policy "public can read support message replies"
  on public.support_message_replies
  for select
  using (true);

create policy "public can insert support message replies"
  on public.support_message_replies
  for insert
  with check (true);

create policy "public can delete support message replies"
  on public.support_message_replies
  for delete
  using (true);
