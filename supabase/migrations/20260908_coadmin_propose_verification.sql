-- Déplace la vérification d'email/code AVANT l'octroi de la co-administration
-- (flux simplifié demandé : "Je m'en occupe" / Du / Au / email / code / puis
-- attente de validation par l'admin — plus de popup d'acceptation séparée
-- après coup, voir suppression de components/CoAdminGrantedAlertModal.tsx).
--
-- L'email est désormais capturé et vérifié au moment même où le visiteur
-- propose une période de relais, avant qu'aucune ligne patient_space_coadmins
-- n'existe — d'où le nouveau purpose 'propose', qui ne requiert pas
-- d'invitation préalable (contrairement à 'accept').

alter table public.coadmin_verification_codes
  drop constraint coadmin_verification_codes_purpose_check;
alter table public.coadmin_verification_codes
  add constraint coadmin_verification_codes_purpose_check
  check (purpose in ('accept', 'reset', 'propose'));

-- Email vérifié au moment de la proposition — repris tel quel par
-- app/(admin)/coadmins.tsx (handleGrant) pour créer directement le
-- co-administrateur en état "accepté" (email + accepted_at renseignés dès
-- l'INSERT), sans étape d'acceptation ultérieure côté visiteur.
alter table public.task_relais_coverage add column email text;

-- Vérifie un code purpose='propose' et le marque utilisé, sans dépendre d'une
-- ligne patient_space_coadmins (il n'en existe pas encore à ce stade). Le pin
-- est revérifié contre visitor_profiles pour prouver que l'appelant est bien
-- l'identité déclarée (même garde-fou que accept_coadmin_invite pour 'accept').
create or replace function public.verify_coadmin_proposal_code(
  p_space_id uuid,
  p_prenom text,
  p_nom text,
  p_pin text,
  p_email text,
  p_code text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code record;
begin
  if not exists (
    select 1 from visitor_profiles vp
    where vp.space_id = p_space_id
      and lower(trim(vp.prenom)) = lower(trim(p_prenom))
      and lower(trim(vp.nom)) = lower(trim(p_nom))
      and vp.pin = p_pin
  ) then
    raise exception 'INVALID_PIN';
  end if;

  select * into v_code
    from coadmin_verification_codes vc
    where vc.space_id = p_space_id
      and lower(trim(vc.prenom)) = lower(trim(p_prenom))
      and lower(trim(vc.nom)) = lower(trim(p_nom))
      and vc.purpose = 'propose'
      and lower(trim(vc.email)) = lower(trim(p_email))
      and vc.code = p_code
      and vc.used_at is null
      and vc.expires_at > now()
    order by vc.created_at desc
    limit 1;

  if v_code.id is null then
    raise exception 'INVALID_OR_EXPIRED_CODE';
  end if;

  update coadmin_verification_codes set used_at = now() where id = v_code.id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.verify_coadmin_proposal_code from public;
grant execute on function public.verify_coadmin_proposal_code to anon, authenticated;
