-- Autorisation MULTIPLE des intervenants à réserver une nuitée : remplace le
-- single night_intervenant_profile_id (un seul intervenant désigné, mode
-- "one") par une table de liaison, même principe que night_authorized_visitors
-- (20260813_slot_config_night_visitor_mode.sql) côté visiteurs. Le mode "one"
-- devient "some" (plusieurs intervenants possibles) ; les réglages existants
-- sont migrés automatiquement vers la nouvelle table.

-- La contrainte doit être élargie à 'some' AVANT la migration des données
-- ci-dessous, sinon l'UPDATE viole l'ancienne contrainte ('disabled','one','all').
alter table public.slot_config
  drop constraint if exists slot_config_night_intervenant_mode_check;
alter table public.slot_config
  add constraint slot_config_night_intervenant_mode_check
  check (night_intervenant_mode in ('disabled', 'some', 'all'));

update public.slot_config
  set night_intervenant_mode = 'some'
  where night_intervenant_mode = 'one';

create table if not exists public.night_authorized_intervenants (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.patient_spaces(id) on delete cascade,
  intervenant_profile_id uuid not null references public.intervenant_profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.night_authorized_intervenants
  drop constraint if exists night_authorized_intervenants_unique;
alter table public.night_authorized_intervenants
  add constraint night_authorized_intervenants_unique unique (space_id, intervenant_profile_id);

-- Backfill depuis l'ancien night_intervenant_profile_id (mode "some" ex-"one")
insert into public.night_authorized_intervenants (space_id, intervenant_profile_id)
select space_id, night_intervenant_profile_id
from public.slot_config
where night_intervenant_mode = 'some' and night_intervenant_profile_id is not null
on conflict do nothing;

alter table public.night_authorized_intervenants enable row level security;

drop policy if exists "public can manage night_authorized_intervenants" on public.night_authorized_intervenants;
create policy "public can manage night_authorized_intervenants"
  on public.night_authorized_intervenants
  for all
  to public
  using (true)
  with check (true);

-- Remplacé par la table de liaison ci-dessus, plus lu ni écrit côté client.
alter table public.slot_config
  drop column if exists night_intervenant_profile_id;
