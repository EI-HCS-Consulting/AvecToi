-- 2ᵉ spécialisation optionnelle sur la fiche intervenant — permet à un
-- intervenant d'ajouter un second métier (avec ses propres soins suggérés)
-- en plus de son métier principal (intervenant_profiles.metier), voir
-- IntervenantFicheModal.tsx.
alter table public.intervenant_profiles
  add column if not exists metier_secondaire text;
