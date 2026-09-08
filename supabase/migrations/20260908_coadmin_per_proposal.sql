-- Octroi de co-administration par proposition (task_relais_coverage), et non
-- plus par identité globale : un même visiteur peut avoir plusieurs
-- propositions de période sur plusieurs Besoins SOS, chacune validée/révoquée
-- indépendamment par l'admin (voir app/(admin)/coadmins.tsx). coverage_id est
-- nullable pour ne pas casser les octrois déjà créés avant cette migration
-- (octroi "global", sans période associée) — ils restent affichés séparément
-- côté UI.
alter table public.patient_space_coadmins
  add column coverage_id uuid references public.task_relais_coverage(id) on delete set null;

create index patient_space_coadmins_coverage_id_idx on public.patient_space_coadmins (coverage_id);

grant select (coverage_id) on public.patient_space_coadmins to anon, authenticated;

-- Révocation automatique d'un octroi lié à une proposition que le visiteur
-- annule lui-même depuis "Mes engagements de relais" (voir
-- MyRelaisCommitments.tsx) — la ligne task_relais_coverage elle-même est
-- supprimée côté client (RLS ouverte, comme performRelaisCoverageUnclaim
-- dans Entraide.tsx), mais patient_space_coadmins.update est réservé à
-- l'admin authentifié (20260907_patient_space_coadmins.sql), donc un
-- visiteur ne peut jamais révoquer directement — cette RPC security definer
-- fait exception, strictement bornée à "désactiver l'octroi qui pointe vers
-- CETTE proposition précise", rien d'autre.
create or replace function public.revoke_coadmin_for_coverage(p_coverage_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update patient_space_coadmins
    set active = false, revoked_at = now()
    where coverage_id = p_coverage_id and active;
$$;

revoke all on function public.revoke_coadmin_for_coverage from public;
grant execute on function public.revoke_coadmin_for_coverage to anon, authenticated;
