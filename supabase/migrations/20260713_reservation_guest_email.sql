-- reservations.email : adresse mail optionnelle de la personne pour qui la
-- réservation est faite (ex. un proche âgé qui ne gère pas l'app), saisie
-- par le visiteur quand il réserve sous un nom différent du sien
-- (nameChanged, voir BookingFlow.tsx). Sert uniquement à proposer l'envoi
-- d'un email de confirmation (infos hôpital + plan + lien calendrier) via
-- la fonction Edge notify-guest-confirmation — jamais utilisée pour de
-- l'auth ni affichée ailleurs.
alter table public.reservations
  add column if not exists email text;
