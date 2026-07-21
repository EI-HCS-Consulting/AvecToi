-- RGPD Purge — Configuration pg_cron
-- Exécuter dans le SQL Editor du dashboard Supabase (en un seul bloc).
-- Prérequis : activer les extensions pg_cron et pg_net dans
-- Dashboard → Database → Extensions.
--
-- Déjà appliqué en prod le 21/07 : pg_cron/pg_net n'avaient jamais été
-- activés sur ce projet (le job rgpd-purge-daily n'existait pas du tout —
-- voir REFLEXION_SITE_VERCEL_ET_RGPD.md). Conservé ici comme les autres
-- fichiers de ce dossier, pour rejouer la même config sur un futur projet
-- Supabase isolé (cf. ISOLATION_SUPABASE.md).

-- Remplacer les valeurs suivantes :
--   <PROJECT_REF>  → l'identifiant de projet Supabase (ex: flmslcdzjuifkivmzins)
--   <CRON_SECRET>  → même valeur que le secret CRON_SECRET déployé sur la Edge Function

DO $$
DECLARE
  v_url     TEXT := 'https://<PROJECT_REF>.supabase.co/functions/v1/rgpd-purge';
  v_secret  TEXT := '<CRON_SECRET>';
BEGIN

  -- Supprimer un éventuel job existant (cron.unschedule lève une erreur si
  -- le job n'existe pas encore, contrairement à un DROP ... IF EXISTS)
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'rgpd-purge-daily') THEN
    PERFORM cron.unschedule('rgpd-purge-daily');
  END IF;

  -- Planifier l'exécution quotidienne à 02:00 UTC
  PERFORM cron.schedule(
    'rgpd-purge-daily',
    '0 2 * * *',
    format(
      $cron$
      SELECT net.http_post(
        url     := %L,
        headers := '{"Content-Type":"application/json","Authorization":"Bearer %s"}'::jsonb,
        body    := '{}'::jsonb
      );
      $cron$,
      v_url, v_secret
    )
  );

END $$;

-- Vérifier que le job est bien planifié :
-- SELECT * FROM cron.job WHERE jobname = 'rgpd-purge-daily';

-- Secrets à déployer via CLI avant le cron :
--   supabase secrets set RESEND_API_KEY=re_xxx
--   supabase secrets set CRON_SECRET=<random-string>
--   supabase functions deploy rgpd-purge
--   supabase functions deploy notify-cancel
