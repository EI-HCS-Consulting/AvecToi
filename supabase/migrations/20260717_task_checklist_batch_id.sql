-- Identifie les besoins "administratif" créés en groupe via une checklist
-- suggérée (outil admin dédié ou sélecteur repliable dans "Nouveau besoin").
-- Sert à proposer, au moment où on supprime UN besoin de la liste, de
-- supprimer aussi les autres — l'ancien bandeau "Annuler" (voir
-- triggerBatchUndo côté app) ne dure que 8s, ce qui ne suffit pas si le
-- ménage se fait plus tard. Toutes les lignes d'un même ajout groupé
-- partagent le même id (généré client-side via Crypto.randomUUID()).
alter table public.tasks add column if not exists checklist_batch_id text;
