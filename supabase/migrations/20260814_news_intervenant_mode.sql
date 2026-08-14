-- Remplace le toggle unique patient_spaces.intervenant_news_visible_to_visitors
-- (tout ou rien pour intervenants+admin ensemble) par un réglage géré depuis
-- Paramètres > Règles > Planning des intervenants, même principe que
-- night_intervenant_mode (components/NightIntervenantModal.tsx) : "disabled"
-- (défaut, canal intervenants+admin non visible des visiteurs — comportement
-- historique), "some" (seuls les intervenants listés dans
-- news_authorized_intervenants), "all" (tous les intervenants). Voir
-- components/NewsIntervenantModal.tsx.
--
-- news_entries.intervenant_profile_id identifie l'intervenant auteur d'une
-- nouvelle (rempli uniquement quand author_role = 'intervenant'), nécessaire
-- pour vérifier son autorisation en mode "some" — voir components/NewsFeed.tsx.
--
-- L'admin reste groupé avec les intervenants dans le canal privé : ses
-- propres publications suivent la même règle qu'eux, sans réglage séparé —
-- visibles des visiteurs seulement en mode "all" ("some" ne s'applique qu'aux
-- intervenants listés dans news_authorized_intervenants, l'admin n'y a pas sa
-- place). Voir components/NewsFeed.tsx (isNewsEntryVisibleToVisitor).

alter table public.slot_config
  add column if not exists news_intervenant_mode text not null default 'disabled'
    check (news_intervenant_mode in ('disabled', 'some', 'all'));

create table if not exists public.news_authorized_intervenants (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.patient_spaces(id) on delete cascade,
  intervenant_profile_id uuid not null references public.intervenant_profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.news_authorized_intervenants
  drop constraint if exists news_authorized_intervenants_unique;
alter table public.news_authorized_intervenants
  add constraint news_authorized_intervenants_unique unique (space_id, intervenant_profile_id);

alter table public.news_authorized_intervenants enable row level security;

drop policy if exists "public can manage news_authorized_intervenants" on public.news_authorized_intervenants;
create policy "public can manage news_authorized_intervenants"
  on public.news_authorized_intervenants
  for all
  to public
  using (true)
  with check (true);

alter table public.news_entries
  add column if not exists intervenant_profile_id uuid references public.intervenant_profiles(id) on delete set null;

-- Remplacé par news_intervenant_mode/news_authorized_intervenants ci-dessus,
-- plus lu ni écrit côté client (voir components/NewsFeed.tsx).
alter table public.patient_spaces
  drop column if exists intervenant_news_visible_to_visitors;
