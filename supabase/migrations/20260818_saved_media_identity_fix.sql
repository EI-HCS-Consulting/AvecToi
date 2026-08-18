-- saved_media identifiait un visiteur uniquement par son PIN de session
-- (saved_by_pin), optionnel côté visiteur : un visiteur qui n'a jamais
-- publié n'a pas encore choisi de pin, donc ses téléchargements n'étaient
-- jamais tracés (bug rapporté : "les médias téléchargés ne s'ajoutent pas
-- à Mes Souvenirs"). On ajoute prénom/nom pour identifier de façon fiable
-- un visiteur même sans pin — même convention que la section "Photos
-- publiées" (voir components/MesSouvenirs.tsx / loadActivity() dans
-- app/(visitor)/account.tsx).
--
-- Ce fichier recrée aussi la table de base (CREATE TABLE IF NOT EXISTS) :
-- la migration d'origine 20260817_saved_media_personnel.sql n'a jamais été
-- appliquée en base, donc "ALTER TABLE ... ADD COLUMN" échouait avec
-- "relation does not exist". Rendu idempotent pour fonctionner que la
-- migration d'origine ait été appliquée ou non.
CREATE TABLE IF NOT EXISTS "public"."saved_media" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "space_id" uuid NOT NULL,
    "source_type" text NOT NULL CHECK (source_type IN ('news', 'support')),
    "source_id" uuid NOT NULL,
    "photo_url" text NOT NULL,
    "saved_by_pin" text NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE "public"."saved_media" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read" ON "public"."saved_media";
CREATE POLICY "public read" ON "public"."saved_media" FOR SELECT USING (true);

DROP POLICY IF EXISTS "public write" ON "public"."saved_media";
CREATE POLICY "public write" ON "public"."saved_media" FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "public can delete saved_media" ON "public"."saved_media";
CREATE POLICY "public can delete saved_media" ON "public"."saved_media" FOR DELETE USING (true);

-- NOT NULL DEFAULT '' (plutôt que nullable) : les index uniques Postgres
-- traitent deux NULL comme non-égaux, ce qui casserait la déduplication
-- ON CONFLICT pour l'admin (saved_by_prenom/nom vides).
ALTER TABLE "public"."saved_media" ADD COLUMN IF NOT EXISTS "saved_by_prenom" text NOT NULL DEFAULT '';
ALTER TABLE "public"."saved_media" ADD COLUMN IF NOT EXISTS "saved_by_nom" text NOT NULL DEFAULT '';

-- Nouvel index unique couvrant prénom/nom, utilisé comme cible ON CONFLICT
-- par lib/mediaShare.ts.
CREATE UNIQUE INDEX IF NOT EXISTS "saved_media_identity_idx"
  ON "public"."saved_media" ("space_id", "source_type", "source_id", "photo_url", "saved_by_pin", "saved_by_prenom", "saved_by_nom");
