-- La 8e réservation "Visite" atteint le cap et notify_cap_reached() tente
-- d'appeler net.http_post pour prévenir l'admin par email — mais si
-- l'extension pg_net n'est pas activée sur ce projet (schéma "net" absent),
-- l'exception remonte et fait échouer l'INSERT de la réservation elle-même
-- (trigger AFTER INSERT = même transaction). La notification par email est
-- secondaire : elle ne doit jamais empêcher une réservation d'être créée.

create or replace function public.notify_cap_reached()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_premium boolean;
  v_count integer;
  v_updated integer;
  v_url text := 'https://<PROJECT_REF>.supabase.co/functions/v1/notify-cap-reached';
  v_secret text := '<CRON_SECRET>';
begin
  if new.type <> 'Visite' then
    return new;
  end if;

  select premium into v_premium from patient_spaces where id = new.space_id;
  if v_premium then
    return new;
  end if;

  select count(*) into v_count from reservations
    where space_id = new.space_id and type = 'Visite';

  if v_count = 8 then
    update patient_spaces
      set cap_email_sent_at = now()
      where id = new.space_id and cap_email_sent_at is null;
    get diagnostics v_updated = row_count;

    if v_updated > 0 then
      begin
        perform net.http_post(
          url := v_url,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_secret
          ),
          body := jsonb_build_object('space_id', new.space_id)
        );
      exception when others then
        raise warning 'notify_cap_reached: échec envoi notification (%): %', sqlstate, sqlerrm;
      end;
    end if;
  end if;

  return new;
end;
$$;
