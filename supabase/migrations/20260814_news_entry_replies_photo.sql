-- Ajoute la possibilité de joindre une photo à une réponse à une nouvelle
-- ("Nouvelles du jour"). Réutilise le bucket "news-photos" déjà existant
-- (voir components/NewsFeed.tsx, PHOTO_BUCKET) — pas de nouveau bucket ni de
-- nouvelles policies nécessaires, seulement la colonne.
alter table public.news_entry_replies add column if not exists photo text;
