-- Ajoute un statut "vu" à reservation_change_history — jusqu'ici la section
-- "Historique" de MyAlertsModal.tsx affichait systématiquement tout
-- l'historique permanent de la personne, y compris de vieilles entrées déjà
-- consultées lors d'une connexion précédente. Le "🔔 Mes alertes" ne doit
-- plus montrer que les entrées jamais vues (voir app/(admin)/account.tsx et
-- app/(visitor)/account.tsx, myChangeHistory/changeHistory filtré côté
-- appelant, marqué vu à la fermeture du popup) — la vue "Mes réservations"
-- (par réservation) continue elle d'afficher tout l'historique, seen ou pas.
alter table public.reservation_change_history
  add column if not exists seen boolean not null default false;

create policy "public can update reservation_change_history"
  on public.reservation_change_history for update using (true) with check (true);
