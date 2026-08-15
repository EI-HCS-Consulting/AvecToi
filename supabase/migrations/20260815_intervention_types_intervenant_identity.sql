-- Ajoute prenom/nom/metier de l'intervenant directement sur intervention_types
-- (dénormalisé depuis intervenant_profiles) — pratique pour parcourir la
-- table dans l'éditeur Supabase sans jointure. Contrairement au libellé/durée
-- copiés une fois pour toutes sur reservations au moment de la réservation
-- (voir migration 20260717_reservations_intervention_columns.sql),
-- intervention_types représente toujours l'offre *actuelle* d'un intervenant :
-- ces colonnes restent donc synchronisées en continu via triggers plutôt que
-- figées à la création.

alter table public.intervention_types
  add column if not exists prenom text,
  add column if not exists nom text,
  add column if not exists metier text;

update public.intervention_types it
set prenom = ip.prenom, nom = ip.nom, metier = ip.metier
from public.intervenant_profiles ip
where it.intervenant_profile_id = ip.id;

-- Remplit/actualise prenom/nom/metier à chaque insert, et si
-- intervenant_profile_id change (cas normalement rare).
create or replace function public.sync_intervention_type_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select prenom, nom, metier into new.prenom, new.nom, new.metier
  from intervenant_profiles
  where id = new.intervenant_profile_id;
  return new;
end;
$$;

drop trigger if exists trg_sync_intervention_type_identity on public.intervention_types;
create trigger trg_sync_intervention_type_identity
  before insert or update of intervenant_profile_id on public.intervention_types
  for each row execute function public.sync_intervention_type_identity();

-- Répercute un changement de prenom/nom/metier sur intervenant_profiles vers
-- tous les intervention_types de ce profil (sinon les colonnes ci-dessus
-- deviennent obsolètes dès la première modification de la fiche intervenant,
-- voir components/IntervenantFicheModal.tsx).
create or replace function public.sync_intervention_types_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.prenom is distinct from old.prenom
     or new.nom is distinct from old.nom
     or new.metier is distinct from old.metier then
    update intervention_types
    set prenom = new.prenom, nom = new.nom, metier = new.metier
    where intervenant_profile_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_intervention_types_from_profile on public.intervenant_profiles;
create trigger trg_sync_intervention_types_from_profile
  after update of prenom, nom, metier on public.intervenant_profiles
  for each row execute function public.sync_intervention_types_from_profile();
