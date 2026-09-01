-- Réinitialisation du PIN d'un visiteur par l'admin ("mot de passe oublié").
-- Pas d'email/téléphone vérifié sur visitor_profiles, donc pas de reset
-- self-service possible : l'admin remet le pin à NULL, et le visiteur
-- récupère son profil (photo/motto/relation préservés) en repassant par
-- l'écran de création existant (app/auth/visitor-create-profile.tsx),
-- qui retombe sur la branche "profil non réclamé" déjà présente dans
-- rpc_visitor_claim_or_create (20260901_visitor_profiles_pin_auth.sql).
--
-- Contrairement aux RPC visiteur (identité vérifiée par le pin lui-même),
-- celle-ci est admin-only : elle vérifie que l'appelant est bien
-- l'administrateur authentifié de cet espace (auth.uid() = admin_id),
-- et n'est accordée qu'au rôle "authenticated" (pas "anon").
create or replace function public.rpc_admin_reset_visitor_pin(
  p_space_id uuid,
  p_visitor_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from patient_spaces
    where id = p_space_id and admin_id = auth.uid()
  ) then
    raise exception 'not authorized';
  end if;

  update visitor_profiles
    set pin = null, updated_at = now()
    where id = p_visitor_id and space_id = p_space_id;
end;
$$;

revoke all on function public.rpc_admin_reset_visitor_pin from public;
grant execute on function public.rpc_admin_reset_visitor_pin to authenticated;
