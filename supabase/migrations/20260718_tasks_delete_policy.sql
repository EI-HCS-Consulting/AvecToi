-- La table tasks a du RLS actif avec des policies SELECT/INSERT/UPDATE
-- ("public read"/"public write"/"public update tasks") mais aucune pour
-- DELETE : sans policy, Postgres bloque silencieusement (0 ligne supprimée,
-- pas d'erreur renvoyée) — c'est ce qui empêchait toute suppression de
-- besoin dans Entraide. Contrôle d'accès déjà géré côté app (PIN), même
-- modèle que les policies existantes.
create policy "public delete tasks"
  on public.tasks for delete
  using (true);
