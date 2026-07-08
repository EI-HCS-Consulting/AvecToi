# Handoff — AvecToi
_Généré le : 2026-07-08_

## État global du projet

**Stack :** React Native + Expo SDK 51+, Expo Router, Supabase (BDD/Auth/Storage/Realtime/Edge Functions), EAS Build, expo-notifications, expo-calendar, expo-image-picker. Stripe côté web uniquement (avectoi.care), app 100% "reader" conforme Play Store (aucun prix/achat dans l'app).

**Repo GitHub :** `https://github.com/EI-HCS-Consulting/AvecToi`, branche `main` protégée par ruleset (PR obligatoire — jamais de commit direct dessus, même pour la doc). `gh` CLI installé et authentifié sur cette machine (compte `EI-HCS-Consulting`) — PR ouvrables/mergeables directement en session. `main` local à jour avec `origin/main` (`ff361de`). Branches restantes sur `origin` : `main` + `docs/spec-web-upgrade` (seule branche non mergée en attente).

**Livré (V1, CLAUDE.md points 1-10) :** setup Expo/Supabase/Git, Auth admin, accès visiteur (lien/token ou code dossier), calendrier + créneaux + réservation + PIN, galerie Souvenirs, Nouvelles du jour, Entraide + Mur de soutien, 6 thèmes, "Prochaine disponibilité", ajout calendrier natif Android, RLS UPDATE/DELETE + cascade `group_id`, onglet Nuits scindé, traçabilité "Programmé par", identification visiteur stable à l'entrée, popup "jour bloqué" thématique, permissions Entraide par PIN, catégories Transport/Administratif, bouton "Ajouter un besoin" pleine largeur, négociation d'horaire Transport (proposition de créneau + prise en charge séparée aller/retour), identification visiteur fiabilisée (prénom+nom+PIN), PIN visiteur choisi une seule fois à la connexion et réutilisé silencieusement partout, cap freemium réactivé (le dossier de dev existant est `premium = true`, donc sans impact pour lui — actif pour un futur espace non-premium).

**En cours / pas commencé :**
- Points 11-12 (notifications push rappel, RGPD purge auto J-7) : livrés lors de sessions antérieures, pas re-testés récemment.
- Points 13-14 (EAS Build APK signé, fiche Play Store) : pas commencés.
- Branche `docs/spec-web-upgrade` : existe sur `origin`, non mergée, pas touchée depuis plusieurs sessions — statut/priorité à clarifier avec l'utilisateur.

## Historique cumulé
- Lots 1-10 (fonctionnalités de base) livrés au fil de sessions antérieures.
- 2026-07-04/05 : `dossier_code` + cap freemium (mis en pause pour la phase de dev) + PIN visiteur sécurisé.
- 2026-07-06 : refonte `MiniCalendar`, fix RLS UPDATE/DELETE + cascade `group_id`, migration du repo GitHub suite à l'exposition de `.env`/clé anon.
- 2026-07-07/08 : identification visiteur fiabilisée, PIN choisi une seule fois à la connexion, négociation d'horaire Transport (PR #6, commit `627c820`).
- 2026-07-08 : vérification des migrations Transport en prod, réactivation du cap freemium (PR #7), installation/auth de `gh` CLI, nettoyage de 6 branches obsolètes/mergées.
- 2026-07-08 (cette session, courte) : clôture administrative — voir détail ci-dessous.

## 1. Objectif de la session
Committer et merger proprement le handoff généré lors de la session précédente (qui documentait la réactivation du cap freemium et le nettoyage Git), en respectant la règle du projet de ne jamais committer directement sur `main`.
État "done" : atteint — PR #8 ouverte, mergée, `main` local resynchronisé, branche supprimée.

## 2. État actuel
**Fait cette session :**
- Branche `docs/handoff-freemium-cleanup` créée à partir de `main`, commit du `Handoff/handoff.md` mis à jour (session précédente), push, PR #8 ouverte via `gh pr create`.
- PR #8 **mergée** (par l'utilisateur, via commande demandée).
- `main` local resynchronisé (fast-forward vers `ff361de`), branche `docs/handoff-freemium-cleanup` supprimée (local + `origin`).

**Dernière action avant ce handoff :** génération de ce handoff (ce fichier).

## 3. Fichiers concernés
- `Handoff/handoff.md` → ce fichier, seul fichier touché cette session.

## 4. Ce qui a échoué
- Première tentative : `git commit` + `git push` directement sur `main` en une seule commande — bloquée automatiquement (règle du projet : jamais de push direct sur `main`, PR obligatoire même pour la doc). Corrigé en repassant par une branche dédiée + PR. **Ne pas retenter de push direct sur `main`, même pour un simple fichier de doc.**

## 5. Prochaine étape
1. Revalider l'état des points 11-12 (notifications push rappel, purge RGPD J-7) — pas retestés récemment.
2. Statuer sur `docs/spec-web-upgrade` (branche non mergée existante) : reprendre, merger, ou abandonner ?
3. Tester en conditions réelles que le cap freemium (réactivé) bloque bien un espace non-premium à la 9e réservation "Visite" — aucun espace non-premium n'existe actuellement en prod pour le vérifier ; prévoir un dossier de test si besoin.
4. Reprendre la roadmap points 13-14 (EAS Build → APK signé, fiche Play Store) quand prêt.
