-- La contrainte d'origine (20260720_personal_checklist_context.sql) ne
-- listait que les 3 checklists historiques (adulte/enfant/domicile).
-- L'ajout des 8 checklists proche-aidant (voir lib/checklistTemplates.ts)
-- n'avait jamais élargi cette contrainte côté base : tout import déclenchait
-- "violates check constraint personal_checklist_items_checklist_context_check".
alter table public.personal_checklist_items
  drop constraint if exists personal_checklist_items_checklist_context_check;

alter table public.personal_checklist_items
  add constraint personal_checklist_items_checklist_context_check
  check (checklist_context in (
    'adulte', 'enfant', 'domicile',
    'situations_besoins', 'retour_domicile', 'relais_familial',
    'repit_aidant', 'conge_proche_aidant', 'maintien_domicile',
    'handicap', 'fin_de_vie'
  ));
