-- Alerte à la connexion quand l'admin a supprimé "en douceur" (deleted_by_admin,
-- voir 20260811_content_deleted_by_admin.sql) une publication d'un visiteur :
-- jusqu'ici seul un bandeau rouge sur le mur (Entraide/Mes Nouvelles/Soutien)
-- le signalait, invisible si le visiteur ne repasse pas dessus. deleted_seen
-- suit le même principe que reservation_change_history.seen (voir
-- 20260827_reservation_change_history_seen.sql) : passe à true une fois le
-- popup d'alerte traité par son auteur (voir components/DeletedContentAlertModal.tsx).
alter table public.tasks add column if not exists deleted_seen boolean not null default false;
alter table public.news_entries add column if not exists deleted_seen boolean not null default false;
alter table public.support_messages add column if not exists deleted_seen boolean not null default false;
