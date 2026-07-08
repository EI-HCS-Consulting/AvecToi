-- La table souvenirs a RLS activé avec des policies SELECT/INSERT (nécessaires
-- pour l'upload anonyme côté visiteur, sans auth.uid()), mais aucune policy
-- DELETE — même symptôme déjà rencontré sur reservations/slot_config/
-- support_messages (cf. 20260706_reservations_update_delete_policy.sql,
-- 20260702_slot_config_update_policy.sql, 20260708_support_messages_update_delete_policy.sql) :
-- .delete() s'exécute sans erreur SQL mais supprime 0 ligne (silencieux) —
-- la photo disparaît de l'écran (retirée du state local) puis réapparaît au
-- prochain chargement, alors que rien n'a été supprimé en base (le fichier
-- Storage, lui, est bien supprimé par la policy Storage déjà en place).
--
-- Policy permissive (true) comme le reste de l'app : visiteurs (PIN) et
-- admin (auth) doivent tous deux pouvoir supprimer un souvenir, et le
-- contrôle d'accès réel se fait déjà côté client (PIN, session admin), pas
-- au niveau RLS pour cette table.

drop policy if exists "public can delete souvenirs" on public.souvenirs;
create policy "public can delete souvenirs"
  on public.souvenirs
  for delete
  using (true);
