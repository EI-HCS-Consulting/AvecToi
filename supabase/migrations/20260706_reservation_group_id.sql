-- Lien entre réservations créées ensemble par l'admin ("+ Ajouter une autre
-- personne" dans AdminAddReservation.tsx) : chaque personne produit
-- aujourd'hui une ligne indépendante dans reservations, sans aucune relation
-- entre elles. group_id = id de la réservation "principale" (1ère personne
-- du groupe), partagé par toutes les lignes créées dans le même geste —
-- permet de proposer "Modifier/Supprimer aussi pour [accompagnant] ?" quand
-- on édite ou supprime l'une des réservations liées.
-- Une réservation solo (pas de groupe) garde group_id à null.
alter table reservations
  add column if not exists group_id uuid;
