-- Permet de prendre en charge l'aller et le retour d'un besoin Transport par
-- deux personnes différentes (validation séparée d'une proposition par
-- jambe). claimed_by_prenom/nom/pin (déjà existants) désignent toujours
-- l'aller ; ces colonnes désignent le retour quand il diffère de l'aller.
-- Additif/nullable, sans impact sur l'existant.
alter table public.tasks
  add column if not exists transport_return_claimed_by_prenom text,
  add column if not exists transport_return_claimed_by_nom text,
  add column if not exists transport_return_claimed_by_pin text;
