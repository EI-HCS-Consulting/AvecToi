-- La table public.visitor_profiles (migration 20260713_visitor_profiles.sql)
-- a été créée avec la RLS activée par défaut mais sans aucune policy — toute
-- écriture depuis l'app (upsert dans app/(visitor)/account.tsx) échouait
-- silencieusement avec l'erreur 42501 "new row violates row-level security
-- policy", empêchant la photo de profil visiteur de jamais être synchronisée.
-- Policy permissive comme public.reservations/support_messages : le
-- contrôle d'accès réel se fait côté client (pas de compte visiteur, PIN
-- géré côté app), pas au niveau RLS.
-- Appliquée manuellement par Guillaume via le dashboard Supabase (UI
-- "New Policy", FOR ALL plutôt que select/insert/update séparées) —
-- fichier ajusté a posteriori pour refléter ce qui tourne réellement en prod.

alter table public.visitor_profiles enable row level security;

create policy "public can manage visitor_profiles"
  on public.visitor_profiles
  for all
  to public
  using (true)
  with check (true);
