-- "Mes souvenirs" personnel (page dédiée Mon Compte) : trace les photos que
-- chaque utilisateur a téléchargées/partagées depuis les publications des
-- AUTRES (Nouvelles/Soutien). Les photos qu'on a soi-même publiées ne sont
-- pas dupliquées ici : elles sont dérivées directement de news_entries /
-- support_messages filtrées par author_pin côté application.
CREATE TABLE IF NOT EXISTS "public"."saved_media" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "space_id" uuid NOT NULL,
    "source_type" text NOT NULL CHECK (source_type IN ('news', 'support')),
    "source_id" uuid NOT NULL,
    "photo_url" text NOT NULL,
    "saved_by_pin" text NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    UNIQUE ("space_id", "source_type", "source_id", "photo_url", "saved_by_pin")
);

ALTER TABLE "public"."saved_media" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON "public"."saved_media" FOR SELECT USING (true);
CREATE POLICY "public write" ON "public"."saved_media" FOR INSERT WITH CHECK (true);
CREATE POLICY "public can delete saved_media" ON "public"."saved_media" FOR DELETE USING (true);
