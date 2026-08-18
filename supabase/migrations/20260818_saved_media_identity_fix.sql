-- saved_media identifiait un visiteur uniquement par son PIN de session
-- (saved_by_pin), optionnel côté visiteur : un visiteur qui n'a jamais
-- publié n'a pas encore choisi de pin, donc ses téléchargements n'étaient
-- jamais tracés (bug rapporté : "les médias téléchargés ne s'ajoutent pas
-- à Mes Souvenirs"). On ajoute prénom/nom pour identifier de façon fiable
-- un visiteur même sans pin — même convention que la section "Photos
-- publiées" (voir components/MesSouvenirs.tsx / loadActivity() dans
-- app/(visitor)/account.tsx).
--
-- NOT NULL DEFAULT '' (plutôt que nullable) : les index uniques Postgres
-- traitent deux NULL comme non-égaux, ce qui casserait la déduplication
-- ON CONFLICT pour l'admin (saved_by_prenom/nom vides).
ALTER TABLE "public"."saved_media" ADD COLUMN IF NOT EXISTS "saved_by_prenom" text NOT NULL DEFAULT '';
ALTER TABLE "public"."saved_media" ADD COLUMN IF NOT EXISTS "saved_by_nom" text NOT NULL DEFAULT '';

-- Nouvel index unique couvrant prénom/nom, utilisé comme cible ON CONFLICT
-- par lib/mediaShare.ts. L'ancienne contrainte UNIQUE (sur saved_by_pin
-- seul) reste en place, elle est simplement devenue redondante.
CREATE UNIQUE INDEX IF NOT EXISTS "saved_media_identity_idx"
  ON "public"."saved_media" ("space_id", "source_type", "source_id", "photo_url", "saved_by_pin", "saved_by_prenom", "saved_by_nom");
