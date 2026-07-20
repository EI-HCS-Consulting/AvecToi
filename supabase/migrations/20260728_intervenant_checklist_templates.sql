-- "Mes modèles" (components/MyChecklist.tsx) — permet à un intervenant de
-- sauvegarder une checklist perso (créée via "+ Créer une checklist") comme
-- modèle réutilisable, puis de l'importer dans un autre dossier patient.
-- Identité cross-space par téléphone normalisé (chiffres seuls, voir
-- lib/phone.ts normalizePhone), même principe que "Mes espaces"
-- (app/(visitor)/account.tsx, linkedSpaces) — volontairement sans space_id
-- puisque l'intérêt du modèle est d'exister indépendamment d'un espace
-- patient précis. items est un tableau de titres à plat (pas de statut :
-- un modèle n'est jamais "fait", seule sa copie importée dans
-- personal_checklist_items l'est).
create table if not exists public.intervenant_checklist_templates (
  id uuid primary key default gen_random_uuid(),
  telephone text not null,
  name text not null,
  items text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (telephone, name)
);

alter table public.intervenant_checklist_templates enable row level security;

-- Même modèle que personal_checklist_items : RLS ouvert, contrôle d'accès
-- géré côté app (pas de vrais comptes intervenant, identité = téléphone
-- renseigné dans la fiche).
create policy "public read intervenant checklist templates"
  on public.intervenant_checklist_templates for select
  using (true);

create policy "public write intervenant checklist templates"
  on public.intervenant_checklist_templates for insert
  with check (true);

create policy "public update intervenant checklist templates"
  on public.intervenant_checklist_templates for update
  using (true);

create policy "public delete intervenant checklist templates"
  on public.intervenant_checklist_templates for delete
  using (true);

create index if not exists intervenant_checklist_templates_telephone_idx
  on public.intervenant_checklist_templates (telephone);
