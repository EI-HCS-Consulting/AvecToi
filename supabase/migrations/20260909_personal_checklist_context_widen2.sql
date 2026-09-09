-- Le sous-menu "Soin à domicile" (voir lib/checklistTemplates.ts,
-- CHECKLIST_SUB_MENUS) a ajouté 4 nouveaux ChecklistContext
-- (telesurveillance, materiel_medical, aide_domicile_menage, portage_repas)
-- sans élargir la contrainte côté base (déjà élargie une première fois par
-- 20260818_personal_checklist_context_widen.sql pour les 8 checklists
-- proche-aidant) : la publication en privé déclenchait
-- "violates check constraint personal_checklist_items_checklist_context_check".
alter table public.personal_checklist_items
  drop constraint if exists personal_checklist_items_checklist_context_check;

alter table public.personal_checklist_items
  add constraint personal_checklist_items_checklist_context_check
  check (checklist_context in (
    'adulte', 'enfant', 'domicile',
    'situations_besoins', 'retour_domicile', 'relais_familial',
    'repit_aidant', 'conge_proche_aidant', 'maintien_domicile',
    'handicap', 'fin_de_vie',
    'telesurveillance', 'materiel_medical', 'aide_domicile_menage', 'portage_repas'
  ));
