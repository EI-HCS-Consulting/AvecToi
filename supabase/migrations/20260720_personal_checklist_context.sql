-- Permet de regrouper "Ma Checklist" en sous-blocs par checklist suggérée
-- d'origine (Hospitalisation d'un proche / Enfant hospitalisé / Soin à
-- domicile), comme "Mes contributions" — voir components/MyChecklist.tsx.
-- Null pour un item purement personnel (texte libre hors import) ou un item
-- rejoint via "Je m'en occupe" dont le titre ne correspond à aucune
-- checklist suggérée connue (voir findTemplateContextForTitle).
alter table public.personal_checklist_items
  add column if not exists checklist_context text
  check (checklist_context in ('adulte', 'enfant', 'domicile'));
