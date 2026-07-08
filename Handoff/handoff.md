# Handoff — AvecToi
_Généré le : 2026-07-07_

## État global du projet

**Stack :** React Native + Expo SDK 51+, Expo Router, Supabase (BDD/Auth/Storage/Realtime/Edge Functions), EAS Build, expo-notifications, expo-calendar, expo-image-picker. Stripe côté web uniquement (avectoi.care), app 100% "reader" conforme Play Store (aucun prix/achat dans l'app).

**Repo GitHub :** `https://github.com/EI-HCS-Consulting/AvecToi`, branche `main` protégée par ruleset (PR obligatoire). `main` local à jour avec `origin/main` (`c6e2e5d`) — rien en attente de commit à ce stade.

**Livré (V1, CLAUDE.md points 1-10) :** setup Expo/Supabase/Git, Auth admin, accès visiteur (lien/token ou code dossier), calendrier + créneaux + réservation + PIN, galerie Souvenirs, Nouvelles du jour, Entraide + Mur de soutien, 6 thèmes, "Prochaine disponibilité", ajout calendrier natif Android, RLS UPDATE/DELETE + cascade `group_id`, onglet Nuits scindé "programmées/effectuées" avec édition admin, traçabilité "Programmé par", identification visiteur stable à l'entrée dans l'espace, popup thématique "jour bloqué" avec motif admin-saisi, permissions Entraide restreintes au preneur du besoin (PIN), 2 nouvelles catégories Entraide (Transport/Administratif) avec grille d'onglets à largeur égale, bouton "Ajouter un besoin" pleine largeur.

**En cours / pas commencé :**
- Cap freemium (8 résa "Visite"/espace) toujours **en pause** (`20260705_pause_freemium_cap.sql`) — réactiver avant lancement commercial.
- Points 11-12 (notifications push rappel, RGPD purge auto J-7) : livrés lors de sessions antérieures, pas re-testés récemment.
- Points 13-14 (EAS Build APK signé, fiche Play Store) : pas commencés.

## Historique cumulé
- Lots 1-10 (fonctionnalités de base) livrés au fil de sessions antérieures.
- 2026-07-04/05 : `dossier_code` + cap freemium (pause) + PIN visiteur sécurisé.
- 2026-07-06 : popup "Modifier la réservation" admin, refonte `MiniCalendar`, fix RLS UPDATE/DELETE + cascade `group_id`, migration du repo GitHub suite à l'exposition de `.env`/clé anon.
- 2026-07-07 (matin) : vérification pg_net, fix règles de visite, refonte onglet Nuits, traçabilité "Programmé par", identification visiteur stable, popup "jour bloqué" thématique + motif admin (migration `blocked_date_reasons` exécutée), PR #4 mergée.
- 2026-07-07 (après-midi, cette session) : permissions Entraide par PIN, refonte des onglets de catégorie (3 itérations : scroll → wrap → largeur égale), 2 nouvelles catégories, bouton "Ajouter un besoin" pleine largeur, PR #5 mergée.

## 1. Objectif de la session
Corriger une faille de permission dans Entraide (n'importe quel visiteur pouvait désinscrire ou clôturer le besoin pris en charge par quelqu'un d'autre), puis améliorer l'affichage des onglets de catégorie (débordement de texte), ajouter 2 catégories de besoins, et agrandir le bouton de création de besoin.
État "done" : tout ce qui précède mergé sur `main` via PR #5 — atteint.

## 2. État actuel
**Fonctionne et vérifié (mergé, `main` à jour) :**
- `components/Entraide.tsx` : "Se désinscrire" et "C'est fait" ne s'affichent que pour le visiteur dont le PIN de session correspond à `claimed_by_pin` de la tâche (pattern `isMine`, identique à `slots.tsx`).
- Onglets de catégorie : grille à largeur égale (31% de large, 3 par ligne) — `Repas/Affaires/Courses` puis `Transport/Administratif/Autre` puis `Tous` seul centré sur la 3e ligne. Plus de débordement de texte.
- 2 nouvelles catégories `transport` (🚗) et `administratif` (🗂️) ajoutées à `Task["category"]` (`lib/types.ts`) et répercutées dans les 4 endroits qui listent les icônes de catégorie (`components/Entraide.tsx`, `app/(admin)/account.tsx`, `app/(admin)/settings.tsx`, `app/(visitor)/account.tsx`). Aucune migration SQL nécessaire (`tasks.category` est un texte libre sans contrainte CHECK en base).
- Bouton "+ Besoin" remplacé par "+ Ajouter un besoin" pleine largeur, empilé sous le compteur de besoins ouverts.
- PR #5 (`fix/entraide-desinscription-permissions`) mergée sur `main`, `main` local mis à jour (`c6e2e5d`).

**Dernière action avant ce handoff :** `git pull` sur `main` local pour récupérer le merge de la PR #5, confirmé fast-forward propre.

**Non fait / non demandé cette session :** le formulaire "Nouveau besoin" (création) utilise la même liste de catégories via `Object.keys(CATEGORY_ICONS)` — il affichera donc automatiquement Transport/Administratif, mais sa grille (`catGrid`/`catOption`, `minWidth: "45%"`) n'a pas été retestée visuellement avec 6 catégories au lieu de 4 (probablement fine vu qu'elle wrap déjà, mais pas vérifié à l'écran).

## 3. Fichiers concernés
- `components/Entraide.tsx` → permission `isMine` (PIN), styles `catTabsBar`/`catTab` (grille 3 colonnes), `CATEGORY_ICONS`/`CATEGORY_LABELS` (+Transport/+Administratif), bouton `createBtn` pleine largeur.
- `lib/types.ts` → `Task["category"]` étendu.
- `app/(admin)/account.tsx`, `app/(admin)/settings.tsx`, `app/(visitor)/account.tsx` → `CAT_ICONS`/`TASK_CAT_ICONS` locaux mis à jour pour rester exhaustifs sur le type `Task["category"]` (erreurs TypeScript sinon).
- Tout ce qui précède est **mergé sur `main`**, rien en attente.

## 4. Ce qui a échoué
- Première tentative d'affichage des onglets de catégorie : `ScrollView horizontal` (défilement). L'utilisateur l'a explicitement rejetée ("ça ne va pas") en faveur d'un wrap 2-lignes visible en entier. **Ne pas reproposer le scroll horizontal pour des onglets de filtre/texte** — ce pattern n'est acceptable dans cette app que pour les sélecteurs photo (ex. `NewsFeed.tsx`), pas pour la navigation par onglets.
- Interprétation à vérifier (non bloquante, déjà implémentée) : la demande utilisateur mentionnait "Autre" à la fois en ligne 2 et en ligne 3 du layout souhaité ; j'ai considéré cela comme une redite et placé "Tous" seul sur la 3e ligne. L'utilisateur n'a pas corrigé depuis — a priori validé.

## 5. Prochaine étape
1. Tester visuellement en conditions réelles (device/simulateur) le nouveau rendu Entraide : grille 3 colonnes des onglets, bouton "Ajouter un besoin" pleine largeur, et la grille du formulaire de création avec 6 catégories.
2. Avant tout lancement commercial : réactiver le cap freemium (`enable trigger` dans `20260705_pause_freemium_cap.sql`).
3. Revalider l'état des points 11-12 (notifications push, purge RGPD J-7) qui n'ont pas été retouchés récemment mais méritent une vérification de bon fonctionnement en prod.
4. Reprendre la roadmap points 13-14 (EAS Build → APK signé, fiche Play Store) quand prêt.
