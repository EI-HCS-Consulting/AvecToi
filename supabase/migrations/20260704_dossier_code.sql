-- Code dossier : identifiant court, dictable/saisissable a la main, distinct
-- de l'invite_token (UUID, reserve aux liens/QR). Seul canal d'invitation
-- pour les espaces non-premium, ShareSpace.tsx masquant deja le lien/QR
-- derriere `premium`.
alter table public.patient_spaces
  add column if not exists dossier_code text unique;
