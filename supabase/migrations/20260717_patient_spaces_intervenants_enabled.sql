-- Interrupteur admin pour le Planning des intervenants. Désactivé par
-- défaut (false) : tant que l'admin ne l'a pas activé dans les réglages
-- ("regles", à côté de night_enabled), l'entrée "Je suis intervenant" à
-- l'accueil est refusée pour cet espace (voir lib/visitorEntry.ts) et le
-- bloc "Planning des intervenants" reste masqué côté admin.
alter table public.patient_spaces
  add column if not exists intervenants_enabled boolean not null default false;
