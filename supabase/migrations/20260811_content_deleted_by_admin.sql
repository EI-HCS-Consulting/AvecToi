-- Modération admin : suppression "douce" du contenu publié par un utilisateur.
-- Au lieu d'un DELETE définitif, l'admin passe deleted_by_admin à true : le
-- contenu disparaît des flux pour tout le monde SAUF pour son auteur, qui le
-- voit toujours avec un bandeau rouge et peut le supprimer définitivement
-- lui-même. Ne s'applique pas quand l'auteur est l'admin lui-même (author_pin
-- / uploaded_by_pin = 'ADMIN') : dans ce cas le DELETE reste immédiat, sans
-- bandeau ni popup, car la modération ne concerne que le contenu des autres
-- utilisateurs.
alter table public.news_entries add column if not exists deleted_by_admin boolean not null default false;
alter table public.tasks add column if not exists deleted_by_admin boolean not null default false;
alter table public.support_messages add column if not exists deleted_by_admin boolean not null default false;
alter table public.support_message_replies add column if not exists deleted_by_admin boolean not null default false;
alter table public.souvenirs add column if not exists deleted_by_admin boolean not null default false;

-- souvenirs et support_message_replies n'avaient jusqu'ici aucune policy
-- UPDATE : sans elle, un .update() ne lève pas d'erreur mais modifie 0 ligne
-- (même symptôme silencieux documenté dans les migrations précédentes de ce
-- projet, cf. 20260708_souvenirs_delete_policy.sql).
drop policy if exists "public can update souvenirs" on public.souvenirs;
create policy "public can update souvenirs"
  on public.souvenirs for update
  using (true) with check (true);

drop policy if exists "public can update support message replies" on public.support_message_replies;
create policy "public can update support message replies"
  on public.support_message_replies for update
  using (true) with check (true);

-- news_entries n'avait aucune policy DELETE (nécessaire pour le hard-delete
-- final via "Supprimer définitivement", et pour le cas où l'admin supprime
-- son propre contenu).
drop policy if exists "public can delete news_entries" on public.news_entries;
create policy "public can delete news_entries"
  on public.news_entries for delete
  using (true);
