-- La photo d'un intervenant est uploadée sous un nom de fichier fixe
-- (intervenant_profile_id + ".jpg", upsert:true, cache-control 1h côté
-- storage) — donc un ré-upload gardait la même URL publique, et le CDN
-- comme <Image> (cache par URI) continuaient de servir l'ancienne image.
-- Cette colonne sert uniquement de "cache buster" (?v=timestamp) sur les
-- URLs publiques lues côté app (voir intervenantPhotoUrl dans
-- IntervenantFicheModal/IntervenantProfileModal/IntervenantsListModal/
-- IntervenantsBlock) — pas d'usage métier.
alter table public.intervenant_profiles
  add column if not exists photo_updated_at timestamptz;
