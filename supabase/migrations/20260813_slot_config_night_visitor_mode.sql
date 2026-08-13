-- Autorisation des visiteurs (famille/proches) à réserver des nuitées :
-- "all" (tous, défaut — comportement historique inchangé) ou "some" (seuls
-- les prénom/nom listés dans night_authorized_visitors le peuvent). Même
-- principe que slot_config.night_intervenant_mode
-- (20260813_slot_config_night_intervenant_mode.sql), mais sans identifiant
-- de compte stable côté visiteur (il n'existe aucune table de connexion,
-- voir visitor_profiles/components/VisitorsBlock.tsx) : l'autorisation est
-- donc gérée par une table à part, matchée par prénom+nom comme partout
-- ailleurs dans l'app — voir components/NightVisitorModal.tsx et
-- (visitor)/home/nights.tsx / (visitor)/home/slots.tsx.

alter table public.slot_config
  add column if not exists night_visitor_mode text not null default 'all';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'slot_config_night_visitor_mode_check'
  ) then
    alter table public.slot_config
      add constraint slot_config_night_visitor_mode_check
      check (night_visitor_mode in ('all', 'some'));
  end if;
end $$;

create table if not exists public.night_authorized_visitors (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.patient_spaces(id) on delete cascade,
  prenom text not null,
  nom text not null,
  created_at timestamptz not null default now()
);

alter table public.night_authorized_visitors
  drop constraint if exists night_authorized_visitors_identity_key;
alter table public.night_authorized_visitors
  add constraint night_authorized_visitors_identity_key unique (space_id, prenom, nom);

-- Policy permissive comme visitor_profiles/reservations : pas de compte
-- visiteur côté Supabase, le contrôle d'accès réel se fait côté client.
alter table public.night_authorized_visitors enable row level security;

drop policy if exists "public can manage night_authorized_visitors" on public.night_authorized_visitors;
create policy "public can manage night_authorized_visitors"
  on public.night_authorized_visitors
  for all
  to public
  using (true)
  with check (true);
