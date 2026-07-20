-- Vue de confort pour le dashboard Supabase : affiche chaque visiteur avec le
-- nom du patient de son espace, pour naviguer par patient plutôt que par
-- space_id (UUID) dans le Table Editor / SQL Editor. Aucune logique app ne
-- dépend de cette vue — visitor_profiles reste la source de vérité, déjà
-- scindée par space_id (voir migration 20260713_visitor_profiles.sql).

create or replace view public.visitor_profiles_by_patient as
select
  vp.id,
  vp.space_id,
  ps.patient_firstname,
  ps.patient_lastname,
  vp.prenom,
  vp.nom,
  vp.photo,
  vp.motto,
  vp.updated_at
from public.visitor_profiles vp
join public.patient_spaces ps on ps.id = vp.space_id
order by ps.patient_lastname, ps.patient_firstname, vp.updated_at desc;

-- Vue en lecture seule (pas d'insert/update/delete dessus) : mêmes policies
-- RLS que les tables sous-jacentes s'appliquent automatiquement.
grant select on public.visitor_profiles_by_patient to anon, authenticated;
