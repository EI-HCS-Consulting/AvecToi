-- Identifie les besoins créés ensemble via "Besoin récurrent" (assistant
-- Publier du mur d'Entraide, popup "Autres options" → 🔁 Besoin récurrent).
-- Toutes les occurrences d'une même série (Hebdomadaire / Quinzaine / Tous
-- les X jours) partagent le même id, généré client-side via
-- Crypto.randomUUID() — même pattern que checklist_batch_id (voir
-- 20260717_task_checklist_batch_id.sql). Aucune tâche/cron : la série entière
-- est générée en un seul insert à la validation, chaque ligne est ensuite un
-- besoin indépendant comme les autres.
alter table public.tasks add column if not exists recurrence_group_id text;
