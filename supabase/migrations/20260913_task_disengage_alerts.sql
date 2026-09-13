-- Alerte de désengagement : quand quelqu'un se désinscrit (performUnclaim /
-- performRelaisCoverageUnclaim dans Entraide.tsx) d'un besoin dont l'échéance
-- tombe dans 2 jours ou moins (J-2 ou moins), un message doit parvenir à la
-- fois à l'admin ET à la personne qui a publié le besoin — deux destinataires
-- distincts, chacun avec son propre statut "vu" (seen_by_admin/seen_by_author),
-- d'où une ligne unique partagée plutôt que deux lignes dupliquées.
--
-- Table dédiée plutôt que réutilisation des colonnes alert_*/alert_seen de
-- reservations (20260711_reservation_rebooking_alerts.sql) : ce mécanisme
-- concerne les besoins (tasks), pas les réservations, et a besoin de deux
-- destinataires distincts alors que reservations n'en a qu'un (le visiteur de
-- la ligne). task_title/date_limite sont dénormalisés (copiés au moment de
-- l'insertion) pour que le message reste lisible même si le besoin est
-- ensuite supprimé ou modifié — task_id reste une référence best-effort.
--
-- RLS permissive (using(true)), même principe que pin_reset_requests/
-- reservations/tasks dans ce projet : aucune donnée sensible ici, l'app ne
-- fait qu'informer.
create table if not exists public.task_disengage_alerts (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.patient_spaces(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  task_title text not null,
  disengaged_prenom text not null,
  disengaged_nom text not null,
  author_prenom text,
  author_nom text,
  date_limite date,
  created_at timestamptz not null default now(),
  seen_by_admin boolean not null default false,
  seen_by_author boolean not null default false
);

alter table public.task_disengage_alerts enable row level security;

drop policy if exists "public can insert task_disengage_alerts" on public.task_disengage_alerts;
create policy "public can insert task_disengage_alerts"
  on public.task_disengage_alerts for insert
  with check (true);

drop policy if exists "public can select task_disengage_alerts" on public.task_disengage_alerts;
create policy "public can select task_disengage_alerts"
  on public.task_disengage_alerts for select
  using (true);

drop policy if exists "public can update task_disengage_alerts" on public.task_disengage_alerts;
create policy "public can update task_disengage_alerts"
  on public.task_disengage_alerts for update
  using (true)
  with check (true);

grant select, insert, update on public.task_disengage_alerts to anon, authenticated;
