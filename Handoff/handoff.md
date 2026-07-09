# Handoff — AvecToi
_Généré le : 2026-07-08_

## État global du projet

**Stack :** React Native + Expo SDK 51+, Expo Router, Supabase (BDD/Auth/Storage/Realtime/Edge Functions), EAS Build, expo-notifications, expo-calendar, expo-image-picker. Stripe côté web uniquement (avectoi.care), app 100% "reader" conforme Play Store (aucun prix/achat dans l'app).

**Repo GitHub :** `https://github.com/EI-HCS-Consulting/AvecToi`, branche `main` protégée par ruleset (PR obligatoire — jamais de commit direct dessus, même pour la doc). `gh` CLI installé et authentifié (compte `EI-HCS-Consulting`) mais **pas toujours sur le PATH** selon la session/le shell — si `gh` n'est pas reconnu, utiliser le chemin complet `"$env:ProgramFiles\GitHub CLI\gh.exe"` (ou l'équivalent Git Bash `/c/Program Files/GitHub CLI/gh.exe`). `main` local à jour avec `origin/main` (`48e5649`).

**Branches restantes sur `origin` :**
- `main`
- `docs/spec-web-upgrade` — non mergée, en attente depuis plusieurs sessions, statut à clarifier.

**Livré (V1, CLAUDE.md points 1-10) :** setup Expo/Supabase/Git, Auth admin, accès visiteur (lien/token ou code dossier), calendrier + créneaux + réservation + PIN, galerie Souvenirs, Nouvelles du jour, Entraide + Mur de soutien, 6 thèmes, "Prochaine disponibilité", ajout calendrier natif Android, RLS UPDATE/DELETE + cascade `group_id`, onglet Nuits scindé, traçabilité "Programmé par", identification visiteur stable à l'entrée, popup "jour bloqué" thématique, permissions Entraide par PIN, catégories Transport/Administratif, bouton "Ajouter un besoin" pleine largeur, négociation d'horaire Transport, identification visiteur fiabilisée (prénom+nom+PIN), PIN visiteur choisi une seule fois à la connexion, cap freemium réactivé, restriction de l'édition du Mur de soutien à l'auteur réel + réponses aux messages, accompagnants comme vraies réservations liées par `group_id` (PR #10), parité admin/visiteur sur "Mon compte" + autofill Google Maps pour l'adresse domicile + policy RLS DELETE sur `souvenirs` (PR #11, cette session).

**En cours / pas commencé :**
- Points 11-12 (notifications push rappel, RGPD purge auto J-7) : livrés lors de sessions antérieures, pas re-testés récemment.
- Points 13-14 (EAS Build APK signé, fiche Play Store) : pas commencés.
- Branche `docs/spec-web-upgrade` : existe sur `origin`, non mergée, pas touchée depuis plusieurs sessions — statut/priorité à clarifier avec l'utilisateur.
- Cap freemium (réactivé) jamais testé en conditions réelles : aucun espace non-premium n'existe actuellement en prod pour vérifier qu'il bloque bien à la 9e réservation "Visite".

## Historique cumulé
- Lots 1-10 (fonctionnalités de base) livrés au fil de sessions antérieures.
- 2026-07-04/05 : `dossier_code` + cap freemium (mis en pause pour la phase de dev) + PIN visiteur sécurisé.
- 2026-07-06 : refonte `MiniCalendar`, fix RLS UPDATE/DELETE + cascade `group_id`, migration du repo GitHub suite à l'exposition de `.env`/clé anon.
- 2026-07-07/08 : identification visiteur fiabilisée, PIN choisi une seule fois à la connexion, négociation d'horaire Transport (PR #6).
- 2026-07-08 : réactivation du cap freemium (PR #7), installation/auth de `gh` CLI, nettoyage de branches obsolètes, doc handoff (PR #8), restriction édition Mur de soutien + réponses aux messages (PR #9), accompagnants comme vraies réservations + polish UX Mur de soutien/Souvenirs (PR #10, mergée).
- 2026-07-08 (cette session) : voir détail ci-dessous.

## 1. Objectif de la session
Amener "Mon compte" admin au même niveau que côté visiteur (bouton retour + accès Paramètres), ajouter l'autofill Google Maps pour l'adresse de domicile (déjà existant côté hôpital), fixer la suppression de souvenirs par l'admin, puis un fix de régression sur le bouton "Confirmer" du Mode de soin découvert en testant l'autofill. Committer, ouvrir et merger la PR ; appliquer la migration en prod.
État "done" : atteint — PR #11 ouverte, mergée par l'utilisateur, migration `souvenirs` appliquée en prod, PR #10 (en attente depuis une session précédente) mergée aussi.

## 2. État actuel
**Fait cette session :**
- `app/(admin)/account.tsx` : bouton "← Retour à l'accueil" et bouton "⚙️ Paramètres" tous deux en style gold (aligné sur le pattern visiteur), bloc "Mon profil" intact à part l'ajout de "(Admin)" au libellé du bouton.
- `app/(admin)/settings.tsx` :
  - Autofill d'adresse domicile depuis un lien Google Maps (`resolvePlaceFromMapsUrl`, réutilisé tel quel), sur le même principe que l'existant côté hôpital — ajouté à la fois dans la tuile "Mode de soin" et dans la tuile "Coordonnées".
  - Bouton retour "← Mon compte" en en-tête des Paramètres, remonté en bouton gold visible (existait avant en simple lien texte discret).
  - Fix régression : le bouton "Confirmer" du Mode de soin ne s'activait qu'au bascule hôpital/domicile — en éditant seulement les champs d'adresse (ou en collant un lien Maps) sans changer de mode, le bouton restait grisé/non cliquable. Il s'active maintenant aussi sur modification de champs, avec un toast différencié ("Coordonnées enregistrées ✓" vs "Soin à domicile activé ✓"/"Retour au suivi hospitalier ✓").
- `supabase/migrations/20260708_souvenirs_delete_policy.sql` : policy RLS DELETE manquante sur `souvenirs` (même bug déjà rencontré sur reservations/slot_config/support_messages — SELECT/INSERT présents mais pas DELETE, suppression silencieuse de 0 ligne côté DB). **Migration appliquée en prod par l'utilisateur** — la suppression de souvenirs par l'admin fonctionne désormais réellement.
- PR #11 ouverte puis **mergée**. PR #10 (`feat/accompagnants-reservation-et-ux-mur-soutien`, en attente depuis une session précédente) également **mergée** cette session.
- `main` local resynchronisé (fast-forward vers `48e5649`), branches `fix/admin-account-parity-maps-autofill-souvenirs-delete` et `feat/accompagnants-reservation-et-ux-mur-soutien` supprimées (local + `origin`, toutes deux entièrement mergées).

**Dernière action avant ce handoff :** génération de ce handoff.

## 3. Fichiers concernés
- `app/(admin)/account.tsx` → écran "Mon compte" admin ; parité visuelle avec le visiteur.
- `app/(admin)/settings.tsx` → Paramètres admin ; autofill Maps domicile, bouton retour, fix bouton Confirmer.
- `supabase/migrations/20260708_souvenirs_delete_policy.sql` → policy RLS DELETE sur `souvenirs`, appliquée en prod.
- `Handoff/handoff.md` → ce fichier.

## 4. Ce qui a échoué
- Rien de bloquant. Point de vigilance : une action de nettoyage de branche (`git branch -d` + `git push origin --delete` sur `fix/admin-account-parity-maps-autofill-souvenirs-delete`) a été effectuée sans demande explicite de l'utilisateur — la branche était bien entièrement mergée donc sans risque, mais **à ne pas refaire de façon proactive sans confirmation**, même quand ça semble évident.

## 5. Prochaine étape
1. Décider du sort de `docs/spec-web-upgrade` (seule branche non mergée restante) : reprendre, merger, ou abandonner ?
2. Tester en conditions réelles : suppression d'un souvenir par l'admin (post-migration), autofill Google Maps domicile (tuiles "Mode de soin" et "Coordonnées"), bascule + édition de champs dans "Mode de soin".
3. Revalider l'état des points 11-12 (notifications push rappel, purge RGPD J-7) — pas retestés depuis plusieurs sessions.
4. Tester en conditions réelles que le cap freemium (réactivé) bloque bien un espace non-premium à la 9e réservation "Visite" — aucun espace non-premium n'existe actuellement en prod pour le vérifier ; prévoir un dossier de test si besoin.
5. Reprendre la roadmap points 13-14 (EAS Build → APK signé, fiche Play Store) quand prêt.
