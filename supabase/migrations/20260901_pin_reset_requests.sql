-- Demande de réinitialisation de code envoyée par un visiteur bloqué sur
-- l'écran "Qui êtes-vous ?" (app/auth/visitor-identify.tsx) — l'admin est
-- alerté (popup à l'ouverture + "Mon compte > Mes alertes") et peut
-- déclencher rpc_admin_reset_visitor_pin (20260901_visitor_admin_reset_pin.sql)
-- en un clic depuis l'alerte. Table dédiée plutôt que réutilisation des
-- colonnes alert_*/alert_seen de reservations (20260711_reservation_rebooking_alerts.sql) :
-- ce visiteur peut n'avoir aucune réservation existante, et le rattachement
-- se fait par identité (visitor_id), pas par réservation.
--
-- RLS permissive (using(true)), même principe que reservations/tasks/
-- visitor_profiles dans ce projet : aucune donnée sensible ici (ni pin, ni
-- coordonnées), le contrôle d'accès réel pour l'action de reset elle-même
-- vit dans rpc_admin_reset_visitor_pin (vérification serveur auth.uid()).
create table if not exists public.pin_reset_requests (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.patient_spaces(id) on delete cascade,
  visitor_id uuid not null references public.visitor_profiles(id) on delete cascade,
  prenom text not null,
  nom text not null,
  created_at timestamptz not null default now(),
  seen boolean not null default false
);

alter table public.pin_reset_requests enable row level security;

drop policy if exists "public can insert pin_reset_requests" on public.pin_reset_requests;
create policy "public can insert pin_reset_requests"
  on public.pin_reset_requests for insert
  with check (true);

drop policy if exists "public can select pin_reset_requests" on public.pin_reset_requests;
create policy "public can select pin_reset_requests"
  on public.pin_reset_requests for select
  using (true);

drop policy if exists "public can update pin_reset_requests" on public.pin_reset_requests;
create policy "public can update pin_reset_requests"
  on public.pin_reset_requests for update
  using (true)
  with check (true);

grant select, insert, update on public.pin_reset_requests to anon, authenticated;
