# Handoff — AvecToi
_Généré le : 2026-07-08_

## État global du projet

**Stack :** React Native + Expo SDK 51+, Expo Router, Supabase (BDD/Auth/Storage/Realtime/Edge Functions), EAS Build, expo-notifications, expo-calendar, expo-image-picker. Stripe côté web uniquement (avectoi.care), app 100% "reader" conforme Play Store (aucun prix/achat dans l'app).

**Repo GitHub :** `https://github.com/EI-HCS-Consulting/AvecToi`, branche `main` protégée par ruleset (PR obligatoire). `gh` CLI installé et authentifié sur cette machine (compte `EI-HCS-Consulting`) — les PR peuvent désormais être ouvertes/gérées directement en session. `main` local à jour avec `origin/main` (`b9995c9`). Branches restantes : `main` + `docs/spec-web-upgrade` (non mergée, en attente) — toutes les autres branches mergées ont été nettoyées cette session.

**Livré (V1, CLAUDE.md points 1-10) :** setup Expo/Supabase/Git, Auth admin, accès visiteur (lien/token ou code dossier), calendrier + créneaux + réservation + PIN, galerie Souvenirs, Nouvelles du jour, Entraide + Mur de soutien, 6 thèmes, "Prochaine disponibilité", ajout calendrier natif Android, RLS UPDATE/DELETE + cascade `group_id`, onglet Nuits scindé, traçabilité "Programmé par", identification visiteur stable à l'entrée, popup "jour bloqué" thématique, permissions Entraide par PIN, catégories Transport/Administratif, bouton "Ajouter un besoin" pleine largeur, négociation d'horaire Transport (proposition de créneau + prise en charge séparée aller/retour), identification visiteur fiabilisée (prénom+nom+PIN), PIN visiteur choisi une seule fois à la connexion et réutilisé silencieusement partout.

**Cap freemium : réactivé cette session.** Le seul espace patient existant en prod a `premium = true` (confirmé), donc l'enforcement est actif dans le code/trigger mais sans impact sur ce dossier. Prêt pour un futur espace non-premium.

**En cours / pas commencé :**
- Points 11-12 (notifications push rappel, RGPD purge auto J-7) : livrés lors de sessions antérieures, pas re-testés récemment.
- Points 13-14 (EAS Build APK signé, fiche Play Store) : pas commencés.
- Branche `docs/spec-web-upgrade` : existe sur `origin`, non mergée, pas touchée cette session — statut/priorité à clarifier avec l'utilisateur.

## Historique cumulé
- Lots 1-10 (fonctionnalités de base) livrés au fil de sessions antérieures.
- 2026-07-04/05 : `dossier_code` + cap freemium (mis en pause pour la phase de dev) + PIN visiteur sécurisé.
- 2026-07-06 : refonte `MiniCalendar`, fix RLS UPDATE/DELETE + cascade `group_id`, migration du repo GitHub suite à l'exposition de `.env`/clé anon.
- 2026-07-07/08 : identification visiteur fiabilisée, PIN choisi une seule fois à la connexion, négociation d'horaire Transport, PR #6 mergée (commit `627c820`).
- 2026-07-08 (cette session) : voir détail ci-dessous.

## 1. Objectif de la session
Session opérationnelle (pas de code applicatif) : vérifier que les migrations SQL de la session précédente étaient bien passées en prod, confirmer que le dossier de dev est en `premium = true`, réactiver le cap freemium en conséquence, installer et authentifier `gh` CLI (bloquant depuis plusieurs sessions), et nettoyer les branches Git mergées/obsolètes.
État "done" : tout atteint — cap réactivé et mergé (PR #7), `gh` opérationnel, dépôt nettoyé.

## 2. État actuel
**Vérifié et confirmé (via API REST Supabase, sans écrire de données de test) :**
- Les 2 migrations `20260707_transport_split_legs.sql` et `20260707_tasks_category_check.sql` sont bien appliquées en prod (colonnes `transport_return_claimed_by_*` interrogeables, tâches `category='transport'` existantes en base).
- L'unique espace patient en prod (`id 779f5e5c-...`) a bien `premium = true`.

**Fait cette session :**
- Installation de `gh` CLI (v2.96.0, via `winget`) et authentification réussie (compte `EI-HCS-Consulting`).
- Nouvelle migration `supabase/migrations/20260708_reactivate_freemium_cap.sql` (réactive `trg_check_visite_cap` et `trg_notify_cap_reached` sur `public.reservations`), commitée sur branche `chore/reactivate-freemium-cap`, PR #7 ouverte via `gh pr create` puis **mergée par l'utilisateur**, qui a aussi exécuté manuellement les 2 lignes `enable trigger` dans le SQL editor Supabase (pas d'accès service-role/DB direct depuis cette session pour le faire moi-même).
- Nettoyage Git : branche obsolète `fix/reactivate-freemium-cap` (ancienne tentative de réactivation, divergée de `main` bien avant les PR #5/#6) supprimée en local et sur `origin`, avec confirmation explicite de l'utilisateur avant suppression. 5 branches mergées supplémentaires supprimées (local + `origin`) : `feat/entraide-transport-negotiation`, `fix/entraide-desinscription-permissions`, `chore/reactivate-freemium-cap`, `feature/nights-refonte`, `fix/slots-modifier-sous-reserver`.
- `docs/spec-web-upgrade` vérifiée non-mergée (`git merge-base --is-ancestor` → false) → volontairement conservée intacte.

**Dernière action avant ce handoff :** génération de ce handoff (remplace un handoff intermédiaire du 2026-07-08 qui avait été écrit sur disque mais jamais commité lors de la session précédente — son contenu est entièrement repris/résumé ci-dessus et dans l'historique cumulé).

## 3. Fichiers concernés
- `supabase/migrations/20260708_reactivate_freemium_cap.sql` → nouvelle migration, mergée sur `main` (PR #7) et appliquée manuellement en prod par l'utilisateur.
- `Handoff/handoff.md` → ce fichier.
- Aucun fichier applicatif (React/TS) modifié cette session — session 100% Git/DB/tooling.

## 4. Ce qui a échoué
- Pas d'accès service-role/DB direct depuis cette session (seule la clé `anon`/publishable est présente dans `.env`) → impossible d'exécuter du DDL (`ALTER TABLE ... ENABLE TRIGGER`) directement via l'API REST. L'utilisateur a dû lancer les 2 lignes SQL manuellement dans le SQL editor Supabase. **À garder en tête pour toute future migration nécessitant du DDL en prod** — soit obtenir un accès DB/service-role, soit prévoir que l'utilisateur exécute lui-même la migration.
- La branche `fix/reactivate-freemium-cap` (distincte de la nouvelle `chore/reactivate-freemium-cap`) contenait un travail de réactivation du cap fait à partir d'un `main` très ancien (avant PR #5/#6) — son diff aurait supprimé une grande partie du code livré depuis (`Entraide.tsx`, `BookingFlow.tsx`, migrations récentes). Non mergée, abandonnée au profit d'une migration fraîche et minimale. Si un besoin similaire se présente, repartir d'un `main` à jour plutôt que de réanimer une vieille branche.

## 5. Prochaine étape
1. Revalider l'état des points 11-12 (notifications push rappel, purge RGPD J-7) — pas retestés récemment.
2. Statuer sur `docs/spec-web-upgrade` (branche non mergée existante) : reprendre, merger, ou abandonner ?
3. Tester en conditions réelles que le cap freemium (réactivé) bloque bien un espace non-premium à la 9e réservation "Visite" — aucun espace non-premium n'existe actuellement en prod pour le vérifier ; prévoir un dossier de test si besoin.
4. Reprendre la roadmap points 13-14 (EAS Build → APK signé, fiche Play Store) quand prêt.
