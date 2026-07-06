-- La table reservations a RLS activé avec des policies SELECT/INSERT
-- (nécessaires pour la réservation anonyme côté visiteur, sans auth.uid()),
-- mais aucune policy UPDATE ni DELETE. Résultat : .update()/.delete()
-- s'exécutaient sans erreur SQL mais modifiaient 0 ligne (silencieux) —
-- même symptôme déjà rencontré sur slot_config (cf. 20260702_slot_config_update_policy.sql).
-- Le calendrier natif (expo-calendar) se met à jour indépendamment de la base,
-- d'où le faux "modifié ✓" côté app alors que rien n'était écrit en base.
--
-- Politique permissive (true) : la même que SELECT/INSERT déjà en place,
-- car visiteurs (PIN) et admin (auth) doivent tous deux pouvoir modifier/
-- supprimer une réservation, et le contrôle d'accès réel se fait déjà
-- côté client (PIN, session admin), pas au niveau RLS pour cette table.

drop policy if exists "public can update reservations" on public.reservations;
create policy "public can update reservations"
  on public.reservations
  for update
  using (true)
  with check (true);

drop policy if exists "public can delete reservations" on public.reservations;
create policy "public can delete reservations"
  on public.reservations
  for delete
  using (true);
