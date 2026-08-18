-- "Mes documents" (Mon Compte, sous "✨ Checklists suggérées") : trace des
-- courriers générés via "✉️ Préparer le courrier" (voir MyChecklist.tsx,
-- downloadLetter) — le fichier .doc lui-même n'est jamais stocké côté
-- serveur (généré à la volée en RTF, voir lib/mediaShare.ts,
-- saveAndShareDoc), seules les valeurs de champs (values) sont conservées
-- pour permettre de régénérer/re-télécharger le même courrier plus tard
-- sans ressaisir le formulaire.
--
-- owner_pin vaut "ADMIN" pour un courrier généré par l'admin (même
-- convention que personal_checklist_items.owner_pin).
create table if not exists public.personal_documents (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.patient_spaces(id) on delete cascade,
  owner_prenom text not null,
  owner_nom text not null,
  owner_pin text not null,
  letter_id text not null,
  label text not null,
  values jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.personal_documents enable row level security;

-- Même modèle que personal_checklist_items : RLS ouvert, contrôle d'accès
-- géré côté app (identité prénom+nom+PIN, pas de vrais comptes visiteur).
create policy "public read personal documents"
  on public.personal_documents for select
  using (true);

create policy "public write personal documents"
  on public.personal_documents for insert
  with check (true);

create policy "public delete personal documents"
  on public.personal_documents for delete
  using (true);
