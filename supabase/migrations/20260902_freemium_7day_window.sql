-- Remplace le cap Freemium "8 réservations" par une fenêtre de 7 jours
-- glissants à partir de la toute première "Visite" de l'espace : au-delà,
-- l'espace est verrouillé (nouvelles réservations bloquées) jusqu'au
-- passage en Premium. Voir lib/freemiumCap.ts pour la même logique côté
-- client (double vérification, cf. 20260704_freemium_cap_trigger.sql).
--
-- Exécuter dans le SQL Editor du dashboard Supabase (en un seul bloc).

-- 1) BEFORE INSERT : bloque toute nouvelle "Visite" une fois la fenêtre de
--    7 jours dépassée, au lieu de bloquer au-delà de 8 réservations.
create or replace function public.check_visite_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_premium boolean;
  v_first_timestamp timestamptz;
begin
  if new.type <> 'Visite' then
    return new;
  end if;

  select premium into v_premium from patient_spaces where id = new.space_id;
  if v_premium then
    return new;
  end if;

  select min(created_at) into v_first_timestamp from reservations
    where space_id = new.space_id and type = 'Visite';

  -- v_first_timestamp est null pour la toute première "Visite" de l'espace :
  -- elle démarre la fenêtre, elle est donc toujours autorisée.
  if v_first_timestamp is not null and v_first_timestamp + interval '7 days' <= now() then
    raise exception 'FREEMIUM_CAP_REACHED';
  end if;

  return new;
end;
$$;

-- Trigger déjà existant (20260704_freemium_cap_trigger.sql), on ne fait que
-- remplacer la fonction qu'il exécute — pas besoin de le recréer.

-- 2) L'ancien trigger AFTER INSERT notify_cap_reached() se basait sur
--    "la réservation qui vient d'être insérée est la 8e" : un événement qui
--    n'existe plus avec une fenêtre temporelle (le cap peut être franchi
--    sans aucun nouvel insert). Remplacé par un scan pg_cron quotidien
--    (check-freemium-expiry, voir plus bas), qui réutilise le même mécanisme
--    de garde patient_spaces.cap_email_sent_at.
drop trigger if exists trg_notify_cap_reached on public.reservations;
drop function if exists public.notify_cap_reached();

-- 3) Planification pg_cron de check-freemium-expiry.
-- Remplacer les valeurs suivantes avant exécution :
--   <PROJECT_REF>  → l'identifiant de projet Supabase (ex: flmslcdzjuifkivmzins)
--   <CRON_SECRET>  → même valeur que le secret CRON_SECRET déployé sur la Edge Function
DO $$
DECLARE
  v_url     TEXT := 'https://<PROJECT_REF>.supabase.co/functions/v1/check-freemium-expiry';
  v_secret  TEXT := '<CRON_SECRET>';
BEGIN

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-freemium-expiry-daily') THEN
    PERFORM cron.unschedule('check-freemium-expiry-daily');
  END IF;

  -- 03:00 UTC — décalé d'une heure par rapport à rgpd-purge-daily (02:00 UTC).
  PERFORM cron.schedule(
    'check-freemium-expiry-daily',
    '0 3 * * *',
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
-- SELECT * FROM cron.job WHERE jobname = 'check-freemium-expiry-daily';

-- Secrets à déployer via CLI avant le cron :
--   supabase functions deploy check-freemium-expiry
--   supabase functions deploy notify-cap-reached
