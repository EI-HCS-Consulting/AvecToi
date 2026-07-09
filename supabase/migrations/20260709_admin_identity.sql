-- Prénom/nom de l'admin, collectés à l'inscription (signup) et reportés dans
-- l'espace patient lors de sa création — jusqu'ici seul le patient avait un
-- nom stocké ; l'admin n'était identifié que par son email Supabase Auth.
alter table public.patient_spaces
  add column if not exists admin_firstname text;
alter table public.patient_spaces
  add column if not exists admin_lastname text;
