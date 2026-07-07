-- Traçabilité "Programmé par" : quand un visiteur réserve pour quelqu'un
-- d'autre (il remplace le prénom/nom préremplis — les siens — par ceux de
-- la personne pour qui il réserve), on garde ici sa propre identité pour
-- l'afficher côté admin sous le nom enregistré ("Programmé par : ...").
-- Reste à null quand le visiteur réserve pour lui-même, ou pour toute
-- réservation créée directement par l'admin (AdminAddReservation.tsx).
alter table reservations
  add column if not exists booked_by_prenom text,
  add column if not exists booked_by_nom text;
