-- Historique versionné de slot_config, pour que l'affichage des jours déjà
-- passés reste figé tel qu'il était au moment où ils ont eu lieu, même après
-- un changement ultérieur des règles de visite (horaires, intervalle, jours
-- autorisés, dates bloquées, nuitées...).
--
-- Une ligne fait foi de son valid_from jusqu'au valid_from suivant pour le
-- même space_id (pas de colonne valid_to, dérivée par tri) : résoudre "la
-- config au jour X" = la ligne avec le plus grand valid_from <= X.

create table if not exists public.slot_config_history (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null,
  valid_from date not null,
  visit_start_hour integer not null,
  visit_end_hour integer not null,
  slot_duration_minutes integer not null,
  min_gap_minutes integer not null,
  gap_includes_duration boolean not null default false,
  max_visitors_per_slot integer not null,
  allowed_weekdays integer[] not null default array[0,1,2,3,4,5,6],
  blocked_dates text[] not null default array[]::text[],
  blocked_date_reasons jsonb not null default '{}'::jsonb,
  night_enabled boolean not null,
  night_start_hour integer not null default 19,
  night_end_hour integer not null default 8,
  max_night_visitors integer,
  created_at timestamptz not null default now(),
  unique (space_id, valid_from)
);

create index if not exists idx_slot_config_history_space_date
  on public.slot_config_history (space_id, valid_from desc);

alter table public.slot_config_history enable row level security;

drop policy if exists "public can read slot_config_history" on public.slot_config_history;
create policy "public can read slot_config_history" on public.slot_config_history
  for select using (true);

-- Pas de policy insert/update publique : cette table n'est écrite que par
-- apply_slot_rule_change() (security definer, migration ultérieure).

-- Backfill : slot_config n'a pas de created_at, donc pas de vrai point de
-- départ connaissable pour les espaces existants. On insère une ligne
-- sentinelle par espace avec valid_from = '1970-01-01' (toujours antérieure
-- à toute vraie date), snapshot = le slot_config actuel. Approximation
-- assumée : l'exactitude rétroactive ne commence vraiment qu'au premier
-- changement posté après la mise en prod de cette fonctionnalité.
insert into slot_config_history (
  space_id, valid_from, visit_start_hour, visit_end_hour, slot_duration_minutes,
  min_gap_minutes, gap_includes_duration, max_visitors_per_slot, allowed_weekdays,
  blocked_dates, blocked_date_reasons, night_enabled, night_start_hour,
  night_end_hour, max_night_visitors
)
select
  space_id, '1970-01-01', visit_start_hour, visit_end_hour, slot_duration_minutes,
  min_gap_minutes, gap_includes_duration, max_visitors_per_slot, allowed_weekdays,
  blocked_dates, blocked_date_reasons, night_enabled, night_start_hour,
  night_end_hour, max_night_visitors
from public.slot_config
on conflict (space_id, valid_from) do nothing;
