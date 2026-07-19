# Handoff — AvecToi
_Généré le : 2026-07-18_

## État global du projet

**Stack :** React Native + Expo SDK 51+, Expo Router, Supabase (BDD/Auth/Storage/Realtime/Edge Functions), EAS Build + EAS Update (channels development/preview/production, `expo-updates` installé, build "development" avec client de dev connecté au Metro local — un reload suffit pour voir les changements JS sans passer par `eas update`). expo-notifications, expo-calendar, expo-image-picker. Resend (transactionnel) branché sur les Edge Functions. Stripe côté web uniquement (avectoi.care), app 100% "reader" conforme Play Store. Supabase CLI bloqué sur cette machine (App Control Policy Windows) : déploiement des migrations/Edge Functions exclusivement via le Dashboard Supabase (copier/coller le SQL).

**Repo GitHub :** `https://github.com/EI-HCS-Consulting/AvecToi`, branche `main` protégée par ruleset (PR obligatoire). `main` local à jour avec `origin/main` (`a9432b4`).

**Branches ouvertes sur `origin` :**
- `main`
- `docs/spec-web-upgrade` — non mergée, en attente depuis plusieurs sessions sur décision explicite de l'utilisateur (statut inchangé).
- `docs/handoff-update-2026-07-18` — cette mise à jour du handoff, en attente de PR/merge.
- 10 branches **déjà mergées** mais pas encore supprimées sur origin (nettoyage sur demande explicite seulement, comme convenu) : `fix/popups-design`, `docs/handoff-update`, `docs/handoff-update-2026-07-16`, `docs/handoff-update-2026-07-17`, `feat/admin-chronologie`, `fix/chrono-scroll-gesture`, `fix/chrono-scroll-overlay-sibling`, `feat/entraide-checklists-administratives`, `feat/entraide-delete-checklist-batch`, `feat/intervenants-planning`, `fix/rebooking-alert-pin-collision`, `feature/one-visit-per-day`.

**Livré (V1, CLAUDE.md points 1-10) :** setup Expo/Supabase/Git, Auth admin, accès visiteur, calendrier + créneaux + réservation + PIN, galerie Souvenirs, Nouvelles du jour, Entraide + Mur de soutien (+ checklists administratives suggérées par contexte), 6 thèmes + mode Dark/Light par compte, "Prochaine disponibilité", ajout calendrier natif Android, RLS, accompagnants, parité admin/visiteur "Mon compte", autofill Google Maps, onboarding séquencé + partage freemium débloqué, cap freemium à granularité fine, Paramètres en 4 sections avec historique, granularité minute horaires, emails réservation/annulation (Resend), fiche patient + profils visiteurs, Dark/Light aligné visuellement, Entraide filtres + fermeture auto des besoins, secteur hospitalier synchronisé/exclu de l'adresse, bloc "Visiteurs" dans Paramètres (photos + identités), Chronologie (frise historique en popup, Paramètres > Historique), Planning des intervenants, **mode "1 visite par jour" (nouveau, cette session)** — voir détail ci-dessous.

**Mode "1 visite par jour" — livré, PR #45 mergée (pas encore testé manuellement par l'utilisateur) :**
- Nouveau bloc admin dans Règles de visite, entre "Intervalle entre deux créneaux" et "Visiteurs max par créneau" : un interrupteur unique, **application instantanée** (comme Nuitées/Intervenants — corrigé en cours de session, voir section 4).
- Une fois activé : dès qu'un créneau "Visite" est réservé un jour donné, les autres créneaux de ce jour disparaissent de l'onglet Créneaux pour tout le monde (visiteur ET intervenant). L'auteur de la réservation garde la main : le sélecteur interne à "Modifier" (`BookingFlow`) reste inchangé, tous les créneaux du jour restent choisissables pour déplacer sa propre réservation.
- N'affecte ni les Nuitées ni les Interventions (jamais soumises à `check_slot_capacity`).
- Enforcement serveur (pas seulement client) : nouvelle exception `DAY_ALREADY_BOOKED` dans `check_slot_capacity()`, cohort (`group_id`) exclu du contrôle pour ne jamais bloquer sa propre modification ni les accompagnants d'une même réservation.
- **Activation rétroactive non destructive** : à l'activation (`false→true`), `apply_slot_rule_change()` balaie les réservations "Visite" futures et, pour chaque jour ayant déjà plusieurs réservations, garde active la première enregistrée (`created_at` le plus ancien) et **suspend** les autres (`alert_type = 'day_cap_suspended'`, nouveau — sans jamais déplacer ni supprimer). Le visiteur concerné voit le popup d'alerte habituel (`RebookingAlertModal`) et choisit un autre jour via "Modifier".
- 2 migrations appliquées manuellement via le Dashboard : `20260718_one_visit_per_day.sql` (colonne + trigger + toggle) puis `20260719_one_visit_per_day_activation.sql` (correctif : toggle instantané, contrainte `alert_type`/`change_type` élargie à `day_cap_suspended`, suspension rétroactive).

**En cours / pas commencé :**
- Points 11-12 (notifications push rappel, RGPD purge auto J-7) : livrés lors de sessions antérieures, pas re-testés récemment.
- Points 13-14 (EAS Build APK signé, fiche Play Store) : pas commencés.
- Branche `docs/spec-web-upgrade` : toujours en attente.
- Checklists administratives (Entraide) : toujours pas testées manuellement dans l'app.
- Bug connu, pas corrigé : les flèches de navigation jour du calendrier visiteur (`app/(visitor)/home/slots.tsx`) contournent la vérification `allowed_weekdays`.
- Planning des intervenants : flux de réservation simple confirmé fonctionnel. **Toujours pas testés manuellement** : recasage automatique des visiteurs chevauchants, ajout/édition/suppression admin, synchro calendrier natif pour une intervention, lien intervention → créneau.
- **Mode "1 visite par jour" (nouveau) : pas encore testé manuellement** — voir plan de test ci-dessous (section 5).
- Isolation Supabase (séparer l'instance prod partagée avec le site web) : plan complet dans `ISOLATION_SUPABASE.md`, mise en œuvre différée sur décision de l'utilisateur.
- 10 branches mergées à nettoyer sur origin (voir ci-dessus, sur demande explicite).

## Historique cumulé
- Lots 1-10 (fonctionnalités de base) + sessions du 2026-07-04 au 07-16 (`dossier_code`, cap freemium, PIN visiteur sécurisé, refonte Paramètres 4 sections, historique + recasage auto + alertes, Resend de bout en bout, fiche patient + profils visiteurs, Dark/Light, fusion réservations groupées, popups harmonisées, Chronologie, checklists administratives Entraide) — voir handoffs archivés pour le détail (PR #7-#40, mergées).
- 2026-07-17 : Planning des intervenants — rôle intervenant complet (fiches, types d'intervention, réservation prioritaire sur les visites avec recasage auto), écran admin dédié, bloc résumé dans Historique, lien direct vers le calendrier des créneaux (PR #41, mergée). Correctif en test réel d'une contrainte CHECK préexistante bloquant les inserts `'Intervention'`.
- 2026-07-18 (cette session) : correctif alerte de recasage matchée par prénom+nom+PIN (PR #44), puis mode "1 visite par jour" — voir détail ci-dessous.

## 1. Objectif de la session
Ajouter dans Règles de visite un mode "1 visite par jour" : une fois activé, un seul créneau "Visite" réservé par jour ; les autres créneaux du jour disparaissent de l'onglet Créneaux pour tout le monde sauf pour l'auteur de la réservation (qui garde la main pour la déplacer). Puis, suite à retour utilisateur après premier test : corriger l'activation qui ne bloquait pas réellement les autres créneaux, préciser que l'activation prend effet à partir du jour de l'activation sans écraser l'existant, et suspendre automatiquement (sans supprimer) les réservations en doublon sur un même jour déjà pris avant l'activation, en ne gardant active que la première enregistrée.
État "done" : atteint côté implémentation — PR #45 mergée dans `main`, migrations SQL appliquées par l'utilisateur via le Dashboard. **Pas encore validé en test réel** par l'utilisateur (prochaine étape).

## 2. État actuel

**Fait cette session :**
- Fix `RebookingAlertModal` : matching par prénom+nom+PIN (au lieu du seul PIN) pour éviter qu'une alerte d'un ancien test resurgisse sous une identité différente partageant le même PIN dans le même espace. Fix connexe : champs prénom/nom manquants dans `IntervenantFicheModal`. PR #44 mergée.
- Implémentation initiale du mode "1 visite par jour" : migration `20260718_one_visit_per_day.sql` (colonne `slot_config.one_visit_per_day`, exception `DAY_ALREADY_BOOKED` dans `check_slot_capacity()`), toggle admin dans Règles de visite, filtrage des créneaux visiteur (`app/(visitor)/home/slots.tsx`), messages d'erreur dans `BookingFlow`/`AdminAddReservation`/`AdminEditReservation`. PR #45 ouverte.
- **Retour utilisateur après application de la migration** : le mode ne bloquait pas réellement les autres créneaux du jour. Cause identifiée : le toggle était rattaché au bouton "Enregistrer" global du bloc Règles de visite (`handleSaveSlotRules`) plutôt qu'appliqué immédiatement — contrairement aux toggles Nuitées/Intervenants juste en dessous, qui s'appliquent au clic.
- Correctif complet, migration `20260719_one_visit_per_day_activation.sql` :
  - Toggle converti en application instantanée (`handleToggleOneVisitPerDay`, même pattern que `handleToggleNight`/`handleToggleIntervenants`), retiré de `handleSaveSlotRules`.
  - Description du bouton mise à jour pour préciser que l'activation prend effet immédiatement à partir d'aujourd'hui, sans effacer les réservations déjà passées.
  - Nouveau `alert_type`/`change_type` `'day_cap_suspended'` (contraintes CHECK élargies sur `reservations` et `reservation_change_history`).
  - `apply_slot_rule_change()` : à l'activation (`false→true`), suspend automatiquement (sans déplacer/supprimer) toutes les réservations "Visite" futures en doublon sur un même jour sauf la première enregistrée (`created_at` le plus ancien par cohort `group_id`) ; nouveau champ `day_cap_suspended` dans le JSON de retour, surfacé dans `rebookingSummary()`.
  - `check_slot_capacity()` : exclut les réservations déjà `day_cap_suspended` du contrôle `DAY_ALREADY_BOOKED` (sinon elles resteraient bloquantes indéfiniment).
  - `app/(visitor)/home/slots.tsx` : `dayVisitBooking` exclut désormais les réservations `day_cap_suspended`.
  - `lib/types.ts` : `Reservation.alert_type` inclut `"day_cap_suspended"`.
- `npx tsc --noEmit` : aucune nouvelle erreur après chaque étape (erreurs restantes pré-existantes, Edge Functions Deno et `lib/notifications.ts`, sans rapport).
- Commit + push sur `feature/one-visit-per-day`, PR #45 mergée par l'utilisateur dans `main`. Les deux migrations (`20260718`, `20260719`) ont été appliquées manuellement par l'utilisateur via le Dashboard Supabase.

**Dernière action avant ce handoff :** `main` local resynchronisé avec `origin/main` (`a9432b4`) après le merge de la PR #45 ; branche `docs/handoff-update-2026-07-18` créée pour ce handoff.

## 3. Fichiers concernés
- `app/(admin)/settings.tsx` → bloc "Choisir 1 visite par jour" (Règles de visite) : toggle instantané `handleToggleOneVisitPerDay`, `RuleChangeResult.day_cap_suspended`, `rebookingSummary()`.
- `app/(visitor)/home/slots.tsx` → filtrage des créneaux affichés selon `dayVisitBooking` (exclut les réservations suspendues).
- `components/BookingFlow.tsx`, `components/AdminAddReservation.tsx`, `components/AdminEditReservation.tsx` → message d'erreur `DAY_ALREADY_BOOKED`.
- `lib/types.ts` → `SlotConfig.one_visit_per_day`, `SlotConfigHistoryEntry.one_visit_per_day`, `Reservation.alert_type` (+`day_cap_suspended`).
- `supabase/migrations/20260718_one_visit_per_day.sql` → colonne + trigger + RPC (version initiale).
- `supabase/migrations/20260719_one_visit_per_day_activation.sql` → correctif : contraintes CHECK élargies, exclusion des lignes suspendues dans `check_slot_capacity()`, suspension rétroactive dans `apply_slot_rule_change()`.
- `components/RebookingAlertModal.tsx`, `components/IntervenantFicheModal.tsx`, `app/(visitor)/_layout.tsx`, `app/(visitor)/account.tsx` → PR #44 (matching prénom+nom+PIN, champs manquants).

## 4. Ce qui a échoué
- Premier design du toggle "1 visite par jour" : intégré au bouton "Enregistrer" global de Règles de visite (comme les horaires/jours/dates bloquées), au lieu d'une application instantanée. Résultat en test réel : l'admin pouvait activer visuellement le mode sans qu'il soit réellement persisté en base tant que "Enregistrer" n'était pas cliqué séparément — l'utilisateur a signalé que d'autres créneaux restaient réservables malgré l'activation apparente. **Leçon pour la suite** : tout toggle binaire à effet serveur immédiat attendu par l'utilisateur (comme Nuitées/Intervenants) doit s'appliquer au clic, pas être bundlé dans un formulaire à sauvegarde différée — même si ça duplique légèrement le pattern `applyRuleChange`.
- Décision initiale (documentée dans le commentaire de `20260718_one_visit_per_day.sql`) de ne pas faire de recasage rétroactif à l'activation : explicitement annulée par l'utilisateur, qui voulait au contraire une suspension automatique des doublons existants. Ne pas supposer qu'un changement de règle n'affecte que le futur sans le confirmer avec l'utilisateur.

## 5. Prochaine étape
1. **Tester manuellement le mode "1 visite par jour"** (rien testé en conditions réelles depuis le correctif) :
   - Activer le mode : vérifier que le toggle s'applique immédiatement (pas besoin de cliquer "Enregistrer"), et que le message de suspension rétroactive s'affiche si des doublons existaient déjà ce jour-là.
   - Réserver un créneau côté visiteur : vérifier que les autres créneaux du même jour disparaissent (pour un autre appareil/visiteur aussi).
   - "Modifier" la réservation : vérifier que tous les créneaux du jour redeviennent choisissables dans la modale.
   - Réserver avec un accompagnant (même créneau) : vérifier que ça passe sans `DAY_ALREADY_BOOKED`.
   - Vérifier qu'une Nuitée ou une Intervention le même jour n'est pas bloquée.
   - Cas suspension rétroactive : créer artificiellement 2 réservations "Visite" le même jour (mode désactivé), puis activer le mode — vérifier que la première reste active, que la seconde est suspendue avec le popup d'alerte, et que son auteur peut la déplacer vers un autre jour.
   - Désactiver le mode : vérifier que tous les créneaux redeviennent visibles.
2. Tester manuellement le reste du Planning des intervenants (recasage auto, admin CRUD, synchro calendrier, lien intervention → créneau) — reporté depuis la session précédente.
3. Tester manuellement les checklists administratives (Entraide) — reporté depuis plusieurs sessions.
4. Nettoyer sur origin les 10 branches déjà mergées listées plus haut — sur demande explicite seulement.
5. Décider du sort de `docs/spec-web-upgrade`.
6. Corriger le bug connu des flèches de navigation jour dans le calendrier visiteur (`slots.tsx`, contournement de `allowed_weekdays`).
7. Revalider les points 11-12 (notifications push, purge RGPD) ; reprendre la roadmap points 13-14 (EAS Build → APK signé, fiche Play Store).
