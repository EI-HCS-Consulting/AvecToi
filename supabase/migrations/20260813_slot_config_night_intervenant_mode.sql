-- Autorisation des intervenants à réserver des nuitées (type 'Nuit'),
-- configurable par l'admin : "disabled" (défaut — aucun intervenant ne peut
-- réserver, comportement identique à avant cette migration puisque
-- app/(visitor)/home/nights.tsx ne montrait déjà cette possibilité qu'aux
-- visiteurs), "one" (un seul intervenant désigné, night_intervenant_profile_id)
-- ou "all" (tous les intervenants). Même principe que
-- slot_config.intervenant_priority_mode (20260722) : réglage live, pas de
-- passage par apply_slot_rule_change ni de suivi dans slot_config_history —
-- voir components/NightIntervenantModal.tsx.

alter table slot_config
  add column if not exists night_intervenant_mode text not null default 'disabled'
    check (night_intervenant_mode in ('disabled', 'one', 'all'));

alter table slot_config
  add column if not exists night_intervenant_profile_id uuid references intervenant_profiles(id) on delete set null;
