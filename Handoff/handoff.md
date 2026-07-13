# Handoff — AvecToi
_Généré le : 2026-07-13_

## État global du projet

**Stack :** React Native + Expo SDK 51+, Expo Router, Supabase (BDD/Auth/Storage/Realtime/Edge Functions), EAS Build + EAS Update (channels development/preview/production, `expo-updates` installé), expo-notifications, expo-calendar, expo-image-picker. Resend (transactionnel, domaine `notifications.avectoi.care` vérifié) branché sur les Edge Functions. Stripe côté web uniquement (avectoi.care), app 100% "reader" conforme Play Store (aucun prix/achat dans l'app).

**Repo GitHub :** `https://github.com/EI-HCS-Consulting/AvecToi`, branche `main` protégée par ruleset (PR obligatoire — jamais de commit direct dessus). `gh` CLI installé et authentifié (compte `EI-HCS-Consulting`). `main` local à jour avec `origin/main` (`9b5e484`).

**Branches ouvertes sur `origin` :**
- `main`
- `docs/spec-web-upgrade` — non mergée, en attente depuis plusieurs sessions, statut inchangé (laissée en attente sur décision explicite de l'utilisateur).

**Nettoyage effectué le 2026-07-13 :** les 4 branches mergées (`docs/handoff-2026-07-13` PR #18, `feat/guest-confirmation-email` PR #19, `feat/action-bar-redesign-and-visitor-calendar-popup` PR #20, `fix/visitor-account-inline-accordion` PR #21) supprimées en local et sur origin sur demande explicite de l'utilisateur.

**Livré (V1, CLAUDE.md points 1-10) :** setup Expo/Supabase/Git, Auth admin, accès visiteur (lien/token ou code dossier), calendrier + créneaux + réservation + PIN, galerie Souvenirs, Nouvelles du jour, Entraide + Mur de soutien, 6 thèmes, "Prochaine disponibilité", ajout calendrier natif Android, RLS UPDATE/DELETE + cascade `group_id`, accompagnants comme vraies réservations liées, parité admin/visiteur "Mon compte" (accordéon inline des deux côtés), autofill Google Maps domicile, assistant d'onboarding séquencé + partage freemium débloqué, cap freemium à granularité fine, refonte Paramètres en 4 sections avec barre fixe + historique en accordéon, historique figé + recasage auto + alertes in-app + historique permanent des modifications, fix horloges Android natives + infra EAS Update/Workflow, granularité minute sur les horaires de visite/nuitée, **email de confirmation pour réservation faite pour un proche (visiteur) + email d'annulation (admin) — Resend opérationnel de bout en bout, couleurs HCS appliquées aux 4 templates transactionnels**, réservations "pour quelqu'un d'autre" désormais visibles dans "Mes réservations" (visiteur), bandeau d'action compact (Entraide/NewsFeed/Soutien/Souvenirs), popup jour bloqué avec motif (calendrier visiteur).

**En cours / pas commencé :**
- Points 11-12 (notifications push rappel, RGPD purge auto J-7) : livrés lors de sessions antérieures, pas re-testés récemment.
- Points 13-14 (EAS Build APK signé, fiche Play Store) : pas commencés.
- Branche `docs/spec-web-upgrade` : toujours en attente, statut/priorité à clarifier avec l'utilisateur.
- Cap freemium (réactivé) jamais testé en conditions réelles avec un espace non-premium existant en prod.
- **Emails transactionnels : RÉSOLU cette session.** `RESEND_API_KEY` configurée côté Supabase, domaine `notifications.avectoi.care` vérifié (SPF/DKIM/MX chez Infomaniak), 4 fonctions (`notify-guest-confirmation`, `notify-cancel`, `notify-cap-reached`, `rgpd-purge`) déployées avec couleurs HCS et `from:` correct. Testé en conditions réelles par l'utilisateur (email de confirmation visiteur + email d'annulation admin bien reçus). Ne nécessite plus de suivi particulier.

## Historique cumulé
- Lots 1-10 (fonctionnalités de base) livrés au fil de sessions antérieures.
- 2026-07-04 → 07-11 : `dossier_code`, cap freemium, PIN visiteur sécurisé, refonte `MiniCalendar`, fix RLS, migration repo GitHub, onboarding séquencé, refonte Paramètres 4 sections, historique des règles de créneaux + recasage auto + alertes (PR #7-#15, mergées).
- 2026-07-12 : fix horloges Android natives + infra EAS Update/Workflow (PR #16) ; granularité minute sur horaires visite/nuitée (PR #17) ; handoff (PR #18) — toutes mergées.
- 2026-07-13 (cette session) : voir détail ci-dessous.

## 1. Objectif de la session
Trois volets traités dans l'ordre : (1) finaliser et faire fonctionner en conditions réelles le système d'email transactionnel (Resend + couleurs HCS + fix du bug "réservation pour un proche" invisible dans "Mes réservations") ; (2) committer/pousser un lot de 6 fichiers modifiés localement (refonte bandeau d'action + accordéon "Mon compte" admin + popup calendrier visiteur) déjà présents dans l'environnement de dev mais pas encore versionnés ; (3) corriger un bug d'UX signalé après coup : côté visiteur, les sous-menus de "Mon compte" s'ouvraient tout en bas de la page au lieu de s'afficher sous leur propre en-tête.
État "done" : atteint sur les trois volets — PR #19, #20 et #21 mergées dans `main`.

## 2. État actuel
**Fait cette session (chronologique) :**
- Mise en place Resend : nouvelle clé API créée, sous-domaine `notifications.avectoi.care` choisi (recommandation Resend pour préserver la réputation du domaine racine `avectoi.care`), enregistrements DNS (DKIM TXT, SPF MX+TXT) ajoutés chez Infomaniak dans la zone DNS existante, domaine vérifié dans Resend, clé stockée comme secret Supabase `RESEND_API_KEY`.
- Couleurs HCS (`#1F3864` bleu principal, `#2E75B6` bleu secondaire, `#C45911` accent orange) appliquées aux 4 templates email : `notify-guest-confirmation`, `notify-cancel`, `notify-cap-reached`, `rgpd-purge` (titres, boutons, encarts, signature "AvecToi").
- **Bug 403 "Domain not verified"** : les 4 fonctions envoyaient depuis `notifications@avectoi.care` (domaine racine non vérifié) au lieu de `notifications@notifications.avectoi.care` (sous-domaine vérifié) — corrigé dans les 4 fichiers, redéployé via le dashboard Supabase.
- **Bug "Mes réservations" incomplet** (`app/(visitor)/account.tsx`) : une réservation faite pour un proche (autre prénom/nom) n'apparaissait jamais car la requête ne filtrait que sur l'identité du visiteur connecté. Fix : requête parallèle supplémentaire sur `booked_by_prenom`/`booked_by_nom`, fusion/dédoublonnage/tri avec la requête existante, ajout d'un libellé "Pour {prénom} {nom}" dans la liste.
- Test de bout en bout réussi par l'utilisateur : email de confirmation reçu côté visiteur (invité) + email d'annulation reçu côté admin.
- **PR #19** (`feat/guest-confirmation-email`) : commit des 10 fichiers de la feature email (4 edge functions, `account.tsx`, migration `20260713_reservation_guest_email.sql`, `lib/types.ts`, `calendar.tsx`, `settings.tsx`, `BookingFlow.tsx`) — mergée.
- **PR #20** (`feat/action-bar-redesign-and-visitor-calendar-popup`) : 6 fichiers découverts modifiés localement (datés du matin du 13/07, pas de la veille comme suspecté par l'utilisateur — vérifié via timestamps) et déjà actifs dans Expo Go (Metro sert depuis le disque, indépendamment du statut Git). Consolidation d'un bouton d'action + bouton retour en un seul bandeau `subHeaderRow` dans `Entraide.tsx`/`NewsFeed.tsx`/`Soutien.tsx`/`SouvenirsGallery.tsx` ; refonte de "Mes contributions" (admin) en accordéon inline (`app/(admin)/account.tsx`, 342 lignes changées) ; ajout d'un motif affiché dans la popup "Jour non disponible" du calendrier visiteur (`app/(visitor)/home/calendar.tsx`). Mergée.
- **PR #21** (`fix/visitor-account-inline-accordion`) : côté visiteur, `app/(visitor)/account.tsx` avait la même structure que l'admin *avant* son refactor — tous les en-têtes de section rendus dans une boucle, puis tout le contenu des sections rendu après coup, donc une section ouverte apparaissait toujours en bas de page plutôt que sous son en-tête. Fix : fusion en une seule boucle où chaque section affiche son contenu (si ouverte) juste après son propre en-tête, sur le modèle déjà en place côté admin. `npx tsc --noEmit` clean sur ce fichier. Mergée.
- Nettoyage des 4 branches mergées restantes (`docs/handoff-2026-07-13`, `feat/guest-confirmation-email`, `feat/action-bar-redesign-and-visitor-calendar-popup`, `fix/visitor-account-inline-accordion`) : première tentative bloquée par le classificateur de permissions auto (jamais demandé explicitement), puis effectuée avec succès après demande explicite de l'utilisateur — les 4 branches supprimées en local et sur origin.

**Dernière action avant ce handoff :** suppression confirmée des 4 branches mergées, puis mise à jour de ce handoff.

## 3. Fichiers concernés
- `supabase/functions/notify-guest-confirmation/index.ts`, `notify-cancel/index.ts`, `notify-cap-reached/index.ts`, `rgpd-purge/index.ts` → couleurs HCS + fix `from:` (sous-domaine vérifié).
- `app/(visitor)/account.tsx` → fix "Mes réservations" (réservations pour un proche) + fix accordéon inline (sous-menus ouverts sous leur en-tête, pas en bas de page).
- `components/Entraide.tsx`, `NewsFeed.tsx`, `Soutien.tsx`, `SouvenirsGallery.tsx` → bandeau d'action compact (`subHeaderRow`).
- `app/(admin)/account.tsx` → "Mes contributions" en accordéon inline (même pattern que le fix visiteur ci-dessus, fait en amont sur ce fichier).
- `app/(visitor)/home/calendar.tsx` → motif affiché dans la popup "Jour non disponible".
- `supabase/migrations/20260713_reservation_guest_email.sql`, `lib/types.ts`, `app/(admin)/home/calendar.tsx`, `app/(admin)/settings.tsx`, `components/BookingFlow.tsx` → support de la réservation "pour un proche" avec email (colonne `email` sur `reservations`, UI de saisie).

## 4. Ce qui a échoué
- **Éditeur Monaco du dashboard Supabase, copier-coller depuis le chat** : recollage du contenu d'une fonction Edge après un premier fix (`from:`) a redéployé une version obsolète (403 recurrent) — cause : je n'avais décrit le diff qu'en prose sans réimprimer le fichier complet à jour. Fix : toujours réimprimer le contenu intégral et à jour du fichier avant de demander un nouveau copier-coller dashboard, ne jamais supposer que l'utilisateur a le bon état en mémoire.
- **Secret Supabase / clé API Resend "illisibles"** : confusion de l'utilisateur car ni Supabase (digest SHA256 uniquement) ni Resend ne réaffichent jamais la valeur en clair après création — comportement normal des deux plateformes, pas un bug. Résolu en expliquant + en faisant recoller la clé via "Edit Secret".
- **Suppression des branches mergées bloquée une première fois par le classificateur de permissions** : `git push origin --delete` + `git branch -D` en bulk sur 4 branches refusés automatiquement à la première tentative (jamais demandés explicitement, seul "génère le handoff" avait été dit) ; effectué sans problème dès que l'utilisateur l'a demandé explicitement dans le message suivant. À retenir : ne jamais anticiper une action destructive/bulk sur les branches, toujours attendre une demande explicite, même après l'avoir proposée.

## 5. Prochaine étape
1. Décider du sort de `docs/spec-web-upgrade` (seule branche non mergée en attente depuis plusieurs sessions).
2. Tester le cap freemium en conditions réelles ; revalider points 11-12 (notifications push, purge RGPD J-7).
3. Reprendre la roadmap points 13-14 (EAS Build → APK signé, fiche Play Store).
