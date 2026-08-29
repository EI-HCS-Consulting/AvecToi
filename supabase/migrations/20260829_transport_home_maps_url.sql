-- Lien Google Maps collé manuellement pour le domicile d'un besoin Transport
-- (tasks.category="transport") — prioritaire sur le lien de recherche généré
-- depuis l'adresse texte quand il est renseigné (voir components/Entraide.tsx,
-- renderHomeAddressFields / bloc "Voir le domicile... sur Google Maps").
alter table public.tasks add column if not exists transport_home_maps_url text;
