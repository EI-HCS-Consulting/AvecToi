-- Codes de vérification email à usage unique, pour deux usages liés à la
-- co-administration :
--   purpose='accept' → confirmer l'email fourni lors de l'acceptation d'une
--                       invitation de co-administration
--   purpose='reset'  → laisser un co-admin actif réinitialiser lui-même son
--                       PIN par email, sans dépendre de l'admin d'origine
--                       (qui est précisément indisponible pendant un relais)
--
-- Table volontairement sans aucune policy RLS : ni anon ni authenticated n'y
-- ont accès direct, seuls le rôle service_role (Edge Function
-- send-coadmin-verification-code) et les fonctions SECURITY DEFINER
-- (accept_coadmin_invite, reset_coadmin_pin_via_email) peuvent la lire/
-- écrire. Le code est donc stocké en clair sans risque : il est injoignable
-- en dehors de ces deux chemins, et expire vite (10 min, usage unique).
create table public.coadmin_verification_codes (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.patient_spaces(id) on delete cascade,
  prenom text not null,
  nom text not null,
  email text not null,
  purpose text not null check (purpose in ('accept', 'reset')),
  code text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index coadmin_verification_codes_lookup_idx
  on public.coadmin_verification_codes (space_id, prenom, nom, purpose);

alter table public.coadmin_verification_codes enable row level security;
-- Aucune policy créée : deny-all pour anon/authenticated par défaut avec RLS activée.
