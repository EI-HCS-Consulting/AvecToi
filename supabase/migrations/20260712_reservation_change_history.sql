-- reservation_change_history : trace permanente de chaque recasage/
-- annulation automatique posé par apply_slot_rule_change(). Contrairement
-- aux colonnes alert_* de reservations (qui sont effacées dès que la
-- réservation concernée est modifiée avec succès ou vue), ces lignes ne
-- sont jamais supprimées ni écrasées : c'est la source affichée dans
-- "Mes réservations" (visiteur) et le nouveau sous-menu "Modification de
-- réservations" (admin, entre "Consignes de visite" et "Publications").
create table if not exists public.reservation_change_history (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null,
  reservation_id uuid not null,
  prenom text not null,
  nom text not null,
  type text not null,
  change_type text not null check (change_type in ('rebooked','night_cancelled','rebooking_failed')),
  previous_date date,
  previous_creneau text,
  new_date date,
  new_creneau text,
  message text not null,
  changed_at timestamptz not null default now()
);

create index if not exists idx_reservation_change_history_space
  on public.reservation_change_history (space_id, changed_at desc);
create index if not exists idx_reservation_change_history_reservation
  on public.reservation_change_history (reservation_id);

alter table public.reservation_change_history enable row level security;
create policy "public can read reservation_change_history"
  on public.reservation_change_history for select using (true);
