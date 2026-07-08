-- support_messages a RLS activé avec des policies SELECT/INSERT, mais
-- apparemment aucune policy UPDATE — même symptôme déjà rencontré sur
-- reservations/slot_config (cf. 20260706_reservations_update_delete_policy.sql,
-- 20260702_slot_config_update_policy.sql) : .update() s'exécute sans erreur
-- SQL mais modifie 0 ligne (silencieux), d'où le "Message modifié ✓" affiché
-- côté app alors que rien n'était réellement écrit en base.
--
-- Policy permissive (true) comme le reste de l'app : visiteurs (PIN) et
-- admin (auth) doivent tous deux pouvoir modifier/supprimer un message, et
-- le contrôle d'accès réel se fait déjà côté client, pas au niveau RLS pour
-- cette table. DELETE recréée aussi par précaution/idempotence, au cas où
-- elle n'existerait pas non plus.

drop policy if exists "public can update support messages" on public.support_messages;
create policy "public can update support messages"
  on public.support_messages
  for update
  using (true)
  with check (true);

drop policy if exists "public can delete support messages" on public.support_messages;
create policy "public can delete support messages"
  on public.support_messages
  for delete
  using (true);
