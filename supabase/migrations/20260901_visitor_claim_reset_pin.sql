-- Récupération de code directement depuis "Qui êtes-vous ?" (visitor-identify.tsx)
-- après une réinitialisation admin (rpc_admin_reset_visitor_pin, pin remis à NULL).
-- Auparavant le visiteur devait repasser par l'écran de création
-- (visitor-create-profile.tsx) pour choisir un nouveau code ; désormais
-- l'écran de connexion lui-même accepte n'importe quel code saisi comme
-- nouveau PIN, à condition qu'un profil "non réclamé" (pin is null)
-- corresponde exactement au prénom/nom saisis.
--
-- Volontairement distincte de rpc_visitor_claim_or_create : celle-ci ne crée
-- JAMAIS de nouvelle ligne si aucun profil non réclamé ne correspond (renvoie
-- 0 ligne, comme rpc_visitor_login) — sinon une simple faute de frappe sur
-- l'écran de connexion créerait un profil fantôme à chaque essai raté.
create or replace function public.rpc_visitor_claim_reset(
  p_space_id uuid,
  p_prenom text,
  p_nom text,
  p_pin text
) returns table (id uuid, prenom text, nom text, photo text, motto text, relation text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unclaimed record;
begin
  select * into v_unclaimed from visitor_profiles vp
    where vp.space_id = p_space_id
      and lower(trim(vp.prenom)) = lower(trim(p_prenom))
      and lower(trim(vp.nom)) = lower(trim(p_nom))
      and vp.pin is null
    limit 1;

  if v_unclaimed.id is null then
    return;
  end if;

  update visitor_profiles
    set pin = p_pin, updated_at = now()
    where visitor_profiles.id = v_unclaimed.id;

  return query select vp.id, vp.prenom, vp.nom, vp.photo, vp.motto, vp.relation
    from visitor_profiles vp where vp.id = v_unclaimed.id;
end;
$$;

revoke all on function public.rpc_visitor_claim_reset from public;
grant execute on function public.rpc_visitor_claim_reset to anon, authenticated;
