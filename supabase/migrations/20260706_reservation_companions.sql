-- Prénoms des personnes accompagnant le réservataire (visite en groupe),
-- affichés dans le titre de l'événement calendrier natif ("Avec ...").
-- Ne compte pas dans l'occupation du créneau (max_visitors_per_slot) —
-- purement informatif côté calendrier.
alter table reservations
  add column if not exists companion_firstnames text;
