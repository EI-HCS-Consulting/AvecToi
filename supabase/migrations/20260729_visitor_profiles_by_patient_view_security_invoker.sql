-- Corrige l'alerte linter Supabase "Security Definer View" sur
-- public.visitor_profiles_by_patient (créée dans
-- 20260725_visitor_profiles_by_patient_view.sql).
--
-- Par défaut, une vue Postgres s'exécute avec les droits de son
-- propriétaire (comportement historique, pas une option choisie), donc les
-- policies RLS des tables sous-jacentes sont évaluées comme le créateur de
-- la vue, pas comme l'appelant. security_invoker = true (Postgres 15+)
-- inverse ça : la vue applique la RLS de la personne qui interroge, comme
-- une requête directe sur visitor_profiles/patient_spaces. Aucune fuite
-- actuelle (RLS déjà permissive sur ces deux tables), mais évite qu'une
-- future restriction de RLS soit silencieusement contournée par cette vue.

create or replace view public.visitor_profiles_by_patient
with (security_invoker = true) as
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

grant select on public.visitor_profiles_by_patient to anon, authenticated;
