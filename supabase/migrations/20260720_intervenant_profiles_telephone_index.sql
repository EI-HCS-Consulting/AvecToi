-- Index pour le matching par téléphone (rattachement multi-espaces d'un
-- même intervenant, voir lib/phone.ts + IntervenantFicheModal.tsx +
-- app/(visitor)/account.tsx "Mes espaces") — le téléphone existe déjà
-- (20260719_intervenant_profiles_contact.sql), aucune autre colonne
-- nécessaire.
create index if not exists idx_intervenant_profiles_telephone
  on public.intervenant_profiles (telephone)
  where telephone is not null;
