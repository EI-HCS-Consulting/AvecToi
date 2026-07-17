# Handoff — AvecToi
_Généré le : 2026-07-17_

## État global du projet

**Stack :** React Native + Expo SDK 51+, Expo Router, Supabase (BDD/Auth/Storage/Realtime/Edge Functions), EAS Build + EAS Update (channels development/preview/production, `expo-updates` installé, build "development" avec client de dev connecté au Metro local — un reload suffit pour voir les changements JS sans passer par `eas update`). expo-notifications, expo-calendar, expo-image-picker. Resend (transactionnel) branché sur les Edge Functions. Stripe côté web uniquement (avectoi.care), app 100% "reader" conforme Play Store. Supabase CLI bloqué sur cette machine (App Control Policy Windows) : déploiement des migrations/Edge Functions exclusivement via le Dashboard Supabase (copier/coller le SQL).

**Repo GitHub :** `https://github.com/EI-HCS-Consulting/AvecToi`, branche `main` protégée par ruleset (PR obligatoire). `main` local à jour avec `origin/main` (`1fe7c13`).

**Branches ouvertes sur `origin` :**
- `main`
- `docs/spec-web-upgrade` — non mergée, en attente depuis plusieurs sessions sur décision explicite de l'utilisateur (statut inchangé).
- 9 branches **déjà mergées** mais pas encore supprimées sur origin (nettoyage sur demande explicite seulement, comme convenu) : `fix/popups-design`, `docs/handoff-update`, `docs/handoff-update-2026-07-16`, `feat/admin-chronologie`, `fix/chrono-scroll-gesture`, `fix/chrono-scroll-overlay-sibling`, `feat/entraide-checklists-administratives`, `feat/entraide-delete-checklist-batch`, `feat/intervenants-planning`.

**Livré (V1, CLAUDE.md points 1-10) :** setup Expo/Supabase/Git, Auth admin, accès visiteur, calendrier + créneaux + réservation + PIN, galerie Souvenirs, Nouvelles du jour, Entraide + Mur de soutien (+ checklists administratives suggérées par contexte), 6 thèmes + mode Dark/Light par compte, "Prochaine disponibilité", ajout calendrier natif Android, RLS, accompagnants, parité admin/visiteur "Mon compte", autofill Google Maps, onboarding séquencé + partage freemium débloqué, cap freemium à granularité fine, Paramètres en 4 sections avec historique, granularité minute horaires, emails réservation/annulation (Resend), fiche patient + profils visiteurs, Dark/Light aligné visuellement, Entraide filtres + fermeture auto des besoins, secteur hospitalier synchronisé/exclu de l'adresse, bloc "Visiteurs" dans Paramètres (photos + identités), Chronologie (frise historique en popup, Paramètres > Historique), **Planning des intervenants (nouveau, cette session)** — voir détail ci-dessous.

**Planning des intervenants — livré et fonctionnel en prod (PR #41 mergée, testée en conditions réelles par l'utilisateur) :**
- Nouveau rôle "intervenant" (infirmier·ère, kiné, aide à domicile…) : même mécanique d'identité que les visiteurs (fiche prénom/nom/PIN, session locale device), avec un ou plusieurs types d'intervention personnalisés (libellé + durée), créés via l'entrée "🩺 Je suis intervenant" à l'accueil.
- Interrupteur admin `intervenants_enabled` par espace (Paramètres > Règles), désactivé par défaut.
- Réservation d'un créneau d'intervention (RPC `book_intervention`) **prioritaire sur les visites** : recasage automatique de toute cohorte "Visite" chevauchante vers le créneau valide le plus proche (même algorithme que `apply_slot_rule_change`), avec alertes `rebooked`/`rebooking_failed` réutilisant le mécanisme existant (`RebookingAlertModal`). Verrou dupliqué côté serveur (`check_slot_capacity`, `apply_slot_rule_change`) pour empêcher toute réservation visiteur directe sur un créneau déjà couvert par une intervention.
- Écran admin dédié `app/(admin)/intervenants.tsx` (fiches + planning jour par jour, ajout/édition/suppression manuelle par l'admin).
- Bloc "Intervenants" ajouté dans Paramètres > Historique (juste après le bloc Visiteurs) : résumé en lecture seule, repliable, de toutes les interventions programmées.
- Lien direct : depuis le bloc Historique **et** depuis l'écran Planning, un tap sur une intervention ouvre le calendrier des créneaux (`home/slots`) au jour concerné (même pattern `focusDate` que "Mon compte → Mes réservations").
- 7 migrations SQL appliquées manuellement via le Dashboard (voir section 3), y compris un correctif découvert en test réel : la contrainte `reservations_type_check` préexistante (hors migrations suivies) n'autorisait que `'Visite'/'Nuit'` et bloquait tout insert `'Intervention'` — corrigée.

**En cours / pas commencé :**
- Points 11-12 (notifications push rappel, RGPD purge auto J-7) : livrés lors de sessions antérieures, pas re-testés récemment.
- Points 13-14 (EAS Build APK signé, fiche Play Store) : pas commencés.
- Branche `docs/spec-web-upgrade` : toujours en attente.
- Checklists administratives (Entraide) : mergées depuis la session précédente, toujours pas testées manuellement dans l'app.
- Bug connu, pas corrigé : les flèches de navigation jour du calendrier visiteur (`app/(visitor)/home/slots.tsx`) contournent la vérification `allowed_weekdays`.
- Planning des intervenants : le flux de réservation de bout en bout est confirmé fonctionnel par l'utilisateur (création de fiche + 3 types d'intervention + réservation d'un créneau, après correction de la contrainte CHECK). **Pas encore testés manuellement** : le recasage automatique des visiteurs chevauchants (`book_intervention`/`apply_slot_rule_change`), l'ajout/édition/suppression côté admin (`AdminAddIntervention`, `IntervenantFicheModal` en mode edit), la synchro calendrier natif pour une intervention, le nouveau lien intervention → créneau (bloc Historique + écran Planning).
- Isolation Supabase (séparer l'instance prod partagée avec le site web) : plan complet dans `ISOLATION_SUPABASE.md`, mise en œuvre différée sur décision de l'utilisateur.
- 9 branches mergées à nettoyer sur origin (voir ci-dessus, sur demande explicite).

## Historique cumulé
- Lots 1-10 (fonctionnalités de base) + sessions du 2026-07-04 au 07-15 (`dossier_code`, cap freemium, PIN visiteur sécurisé, refonte Paramètres 4 sections, historique + recasage auto + alertes, Resend de bout en bout, fiche patient + profils visiteurs, Dark/Light, fusion réservations groupées, popups harmonisées) — voir handoffs archivés pour le détail (PR #7-#33, mergées).
- 2026-07-15/16 : Chronologie (frise historique en popup) ajoutée puis bug de scroll Android corrigé — pattern "overlay en frère du sheet, jamais ancêtre" désormais la norme pour toute modale scrollable de l'app (PR #35-#37, mergées).
- 2026-07-16 : checklists administratives suggérées dans Entraide (outil admin dédié + sélecteur repliable visiteur + bouton "Annuler") (PR #38, #40, mergées).
- 2026-07-17 (cette session) : Planning des intervenants — voir détail ci-dessous.

## 1. Objectif de la session
Ajouter un nouveau rôle "intervenant" (infirmier·ère, kiné, aide à domicile…) capable de gérer son propre planning d'interventions, prioritaire sur les visites classiques, avec recasage automatique des visiteurs en cas de chevauchement. Puis exposer ce planning côté admin (résumé dans Historique + lien direct vers le calendrier des créneaux).
État "done" : atteint — PR #41 mergée dans `main`, flux de réservation testé et confirmé fonctionnel par l'utilisateur en conditions réelles.

## 2. État actuel

**Fait cette session :**
- Conception + implémentation complète du rôle intervenant : tables `intervenant_profiles`/`intervention_types`, colonnes `reservations.duration_minutes/intervention_label/intervenant_profile_id`, colonne `patient_spaces.intervenants_enabled`.
- RPC `book_intervention` (réservation + recasage auto des visites chevauchantes) et durcissement de `check_slot_capacity`/`apply_slot_rule_change` pour rendre les créneaux d'intervention réellement bloquants côté serveur (pas seulement côté UI).
- Écrans/composants : `app/(admin)/intervenants.tsx` (planning admin), `app/auth/intervenant-entry.tsx` (entrée dédiée), `components/AdminAddIntervention.tsx`, `components/IntervenantFicheModal.tsx`, `components/InterventionBookingFlow.tsx`. Extension de `lib/calendarSync.ts`, `lib/slotUtils.ts` (`getInterventionOverlap`), `lib/types.ts`, `lib/visitorEntry.ts`, `lib/visitorSession.ts` (rôle `visiteur`/`intervenant`).
- Commit + push sur `feat/intervenants-planning`, 6 migrations SQL fournies à l'utilisateur pour application manuelle via le Dashboard.
- **Bug remonté en test réel** : réservation d'un créneau d'intervention échouait avec `violates check constraint "reservations_type_check"` — une contrainte CHECK préexistante sur `reservations.type` (posée hors migrations suivies) n'autorisait que `'Visite'/'Nuit'`. Corrigé par une 7ᵉ migration (`20260722_reservations_type_check_intervention.sql`) qui recrée la contrainte avec `'Intervention'` inclus. Appliquée par l'utilisateur via le Dashboard, confirmée fonctionnelle.
- Bloc "Intervenants" ajouté dans Paramètres > Historique, juste après le bloc Visiteurs (`components/IntervenantsBlock.tsx`) : carte repliable listant chaque intervention programmée (libellé, intervenant, date/heure, durée).
- Lien direct intervention → créneau : depuis ce bloc et depuis l'écran Planning (`app/(admin)/intervenants.tsx`), un tap sur une intervention ouvre `home/slots` au jour concerné (réutilise le paramètre `focusDate` déjà en place pour "Mon compte → Mes réservations").
- `npx tsc --noEmit` : aucune nouvelle erreur après chaque étape (les seules erreurs restantes sont pré-existantes, dans les Edge Functions Deno et `lib/notifications.ts`, sans rapport avec cette session).
- 4 commits sur `feat/intervenants-planning`, PR #41 ouverte puis mergée par l'utilisateur dans `main`.

**Dernière action avant ce handoff :** `main` local resynchronisé avec `origin/main` (`1fe7c13`) après le merge de la PR #41.

## 3. Fichiers concernés
- `app/(admin)/intervenants.tsx` → écran admin planning des intervenants (fiches + jour par jour, ajout/édition/suppression).
- `app/auth/intervenant-entry.tsx` → entrée dédiée intervenant (token/code dossier).
- `components/AdminAddIntervention.tsx` → ajout manuel d'une intervention par l'admin.
- `components/IntervenantFicheModal.tsx` → création/édition de la fiche intervenant + ses types d'intervention.
- `components/InterventionBookingFlow.tsx` → flux de réservation côté intervenant.
- `components/IntervenantsBlock.tsx` (nouveau) → résumé repliable dans Paramètres > Historique, avec lien vers `home/slots`.
- `lib/calendarSync.ts`, `lib/slotUtils.ts` (`getInterventionOverlap`), `lib/types.ts`, `lib/visitorEntry.ts`, `lib/visitorSession.ts` → support intervention/rôle intervenant.
- `app/(admin)/settings.tsx` → toggle `intervenants_enabled` + lien vers l'écran Planning (section Règles), montage du bloc `IntervenantsBlock` (section Historique).
- `app/(admin)/home/slots.tsx` → bandeau "🩺 … prioritaire sur les visites" sur un créneau couvert par une intervention.
- 7 migrations dans `supabase/migrations/` (préfixe `20260722_`) : `intervenant_tables`, `patient_spaces_intervenants_enabled`, `reservations_intervention_columns`, `book_intervention`, `check_slot_capacity_intervention_aware`, `apply_slot_rule_change_intervention_aware`, `reservations_type_check_intervention` (correctif) — toutes appliquées manuellement via le Dashboard Supabase, confirmées en place.

## 4. Ce qui a échoué
- Hypothèse erronée dans `20260722_reservations_intervention_columns.sql` : son commentaire affirmait qu'aucune contrainte CHECK n'existait sur `reservations.type`. Une contrainte `reservations_type_check` existait bel et bien (posée à la création initiale de la table, hors migrations suivies dans ce repo), limitée à `'Visite'/'Nuit'`. Découvert seulement au test réel (première tentative de réservation d'intervention en échec). Corrigé par une migration dédiée. **Leçon pour la suite** : avant d'ajouter une nouvelle valeur à une colonne `text` existante, vérifier les contraintes CHECK réellement en place en base (Dashboard > Database > Tables > reservations > Constraints) plutôt que de se fier à l'historique des migrations suivies, qui ne couvre pas le schéma initial.

## 5. Prochaine étape
1. **Tester manuellement le reste du Planning des intervenants** (seul le flux de réservation simple a été vérifié) :
   - Recasage automatique : réserver une intervention qui chevauche une visite déjà prise, vérifier le déplacement automatique + l'alerte `rebooked`/`rebooking_failed`.
   - Ajout/édition/suppression d'une intervention côté admin (`AdminAddIntervention`, `IntervenantFicheModal` en mode edit) depuis `app/(admin)/intervenants.tsx`.
   - Synchro calendrier natif Android pour une intervention (bouton "Ajouter au calendrier").
   - Nouveau lien intervention → créneau : depuis le bloc Historique et depuis l'écran Planning, vérifier que le tap ouvre bien le bon jour dans `home/slots`.
   - Bloc "Intervenants" dans Historique : vérifier l'affichage en thème clair et sombre, le repli/dépli, et le cas "aucune intervention".
2. Tester manuellement les checklists administratives (Entraide) — reporté depuis la session précédente (voir handoffs archivés pour le détail du plan de test).
3. Nettoyer sur origin les 9 branches déjà mergées listées plus haut — sur demande explicite seulement.
4. Décider du sort de `docs/spec-web-upgrade`.
5. Corriger le bug connu des flèches de navigation jour dans le calendrier visiteur (`slots.tsx`, contournement de `allowed_weekdays`).
6. Revalider les points 11-12 (notifications push, purge RGPD) ; reprendre la roadmap points 13-14 (EAS Build → APK signé, fiche Play Store).
