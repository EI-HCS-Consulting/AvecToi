-- Ajoute la possibilité de joindre une photo à une réponse sur le mur de
-- soutien. Réutilise le bucket "support-photos" déjà existant (voir
-- components/Soutien.tsx, PHOTO_BUCKET) — pas de nouveau bucket ni de
-- nouvelles policies nécessaires, seulement la colonne.
alter table public.support_message_replies add column if not exists photo text;
