# Handoff — AvecToi
_Généré le : 2026-08-11_

## État global du projet

**Stack :** React Native + Expo SDK 51+, Expo Router, Supabase (BDD/Auth/Storage/Realtime/Edge Functions), EAS Build + EAS Update (channels development/preview/production, `expo-updates`, publication OTA automatique sur push `main` via `.github/workflows/eas-update-preview.yml`). expo-notifications, expo-calendar, expo-image-picker. Resend (transactionnel) branché sur les Edge Functions. Stripe côté web uniquement. Supabase CLI bloqué sur cette machine (App Control Policy Windows) : déploiement des migrations/Edge Functions exclusivement via le Dashboard Supabase.

**⚠️ Règle Git STRICTE (CLAUDE.md) :** chaque modification, même un correctif ponctuel, part sur une branche neuve (depuis `origin/main` à jour) et se termine par sa propre PR poussée sur GitHub — jamais de nouveau commit ajouté à une branche dont la PR est déjà mergée. **L'utilisateur merge d'abord, puis teste** (le merge déclenche la publication OTA qui charge le nouveau bundle sur son téléphone — il n'a aucun autre moyen de tester une modif avant de merger). Toujours vérifier l'état réel d'une PR via `gh pr view <n> --json state,mergedAt` plutôt que de supposer.

**Repo GitHub :** `https://github.com/EI-HCS-Consulting/AvecToi`, branche `main` protégée par ruleset (PR obligatoire).

**PR ouverte, en attente de test/merge :** aucune.

**Livré (V1 + V2 partiel) :** tout le socle (points 1-10 CLAUDE.md), refonte intervenant complète (métiers, accès, priorité créneaux configurable, canal Nouvelles séparé, verrou Premium sur l'activation du rôle), RGPD 90j + purge auto + sauvegarde schéma hebdo, checklists perso réutilisables, rattachement multi-espaces intervenant, onboarding séquencé, cap freemium (8 visites), Paramètres 4 sections + historique, emails Resend (annulation, cap atteint, confirmation invité, demande de changement de nom), Chronologie, mode "1 visite/jour" unifié, icône adaptive Android, EAS Update automatisé, liens d'invitation vers `app.avectoi.care`. Le flux "Demande de changement de nom" est entièrement fonctionnel (popup, envoi in-app, badge de statut, bouton "Fermer" visible). Texte de partage personnalisé au prénom du patient. "Mes Checklists" restructuré : l'ajout d'item se fait désormais dans chaque checklist (perso ou toute prête) via un flux répétable "Ajouter un item", plus via des boutons génériques externes. **Convention "popup centré + couleurs du thème" désormais appliquée à 23 popups dans toute l'app** (au-delà des dialogues déjà conformes comme ConfirmModal), les gros formulaires/flux multi-étapes restant volontairement en tiroir bas.

**Nouveau ce cycle (#130 → #131) :**
- PR #130 : texte "Partager" personnalisé au prénom patient ; "Mes Checklists" simplifié (suppression des boutons génériques "ajouter un item perso"/"ajouter à ma checklist", ajout d'item intégré à chaque checklist via champ + bouton "Ajouter un item" répétable, séparateur coloré au thème) ; 4 popups de `MyChecklist.tsx` (dont "Checklists suggérées") passés en dialogue centré ; 2 boutons "Fermer"/"Annuler" au texte invisible corrigés.
- PR #131 : audit élargi à toute l'app sur demande explicite de l'utilisateur ("élargis la vérification aux autres popups") — 19 popups supplémentaires convertis en dialogue centré dans `account.tsx`, `settings.tsx`, `BookingFlow.tsx`, `InterventionBookingFlow.tsx`, `Entraide.tsx`, `NewsFeed.tsx`, `Soutien.tsx`, `SouvenirsGallery.tsx` ; 6 boutons "Fermer"/"Annuler"/"Retour" invisibles corrigés en plus ; les gros formulaires/flux (édition de profil, calendriers de réservation, formulaire de besoin Entraide, ajout d'intervention, fiche profil visiteur) laissés volontairement en tiroir bas, décision validée par l'utilisateur avant implémentation.

**Testé et confirmé par l'utilisateur ce cycle :** les deux PR — "c'est ok" pour la #130, "mergé et ok" pour la #131.

**Connu, non bloquant :** aucun.

**En cours / pas commencé (reporté, à reprendre sur demande) :**
- `fix/souvenirs-rls-and-news-delete` : branche stale, 2 migrations RLS jamais exécutées en prod (`AUDIT_RLS_TAILLE_CODE_MORT.md`).
- Migration `20260728_intervenant_checklist_templates.sql` (PR #74) : toujours pas confirmée exécutée en prod.
- Isolation Supabase (séparer l'instance prod partagée avec le site web historique) : plan complet dans `ISOLATION_SUPABASE.md`.
- `docs/spec-web-upgrade` : en attente d'une décision utilisateur.
- Taille de l'app (180 Mo) et audit code mort : volontairement reporté.
- Points 13-14 (EAS Build APK signé, fiche Play Store) : pas commencés.
- Site marketing `avectoi-site` (dépôt séparé, poussé sur `main`) : toujours pas déployé (Infomaniak, bloqué sans les accès de l'utilisateur). Décommissionnement du site Vercel historique dépend de ce déploiement.
- `Documentation/Documentation Fonctionnalités.docx` : pas mis à jour ce cycle — pas d'outil docx disponible dans cet environnement. La section "Mes Checklists" y décrit encore l'ancien flux (boutons génériques d'ajout d'item) : à corriger manuellement pour refléter le nouveau flux répétable intégré à chaque checklist. PRD (`PRD_AvecToi_v1_4.md`) : pas de mise à jour jugée nécessaire — ajustements UX/copy, aucun changement de règle métier ou de portée produit.

## Historique cumulé
- Jusqu'au 2026-07-22 : lots 1-10 (fonctionnalités de base) + refonte intervenant Phase A/B, RGPD 90j + purge auto + sauvegarde schéma auto, checklists perso réutilisables, rattachement multi-espaces intervenant, EAS Update automatisé — PR #7 à #102.
- 2026-07-22 → 08-01 : resynchronisation PRD (#103), snapshot schéma (#104), liens d'invitation → `app.avectoi.care` (#105), verrou Premium "Planning des intervenants" (#106), fix datepicker onboarding + navigation Réglages (#107), fix décalage de date/toggle intervenants/lien email confirmation (#108, remergé sous #111 sans conséquence), site marketing `avectoi-site` construit et poussé (pas déployé), règle Git "1 branche = 1 PR" documentée (#109).
- 2026-08-01 → 08-02 : diagnostic + fix définitif du lien Google Maps (double-encodage consentement RGPD + repli Nominatim, #110), Site URL Supabase corrigé côté Dashboard, PRD v1.6→v1.7 (#112), rafraîchissement adresse + popup centré + première version du flux in-app changement de nom (#113).
- 2026-08-09 → 08-10 (matin) : Edge Function `notify-name-change` recréée sous le bon slug (root cause d'un flux cassé, #115-117), flux changement de nom confirmé fonctionnel.
- 2026-08-10 (journée) : bug tenace du bouton "Fermer" invisible résolu après 6 tentatives infructueuses — cause : styles partagés `btnPrimary`/`btnPrimaryText` réutilisés hors d'une rangée `sheetBtns` bornée ; correctif = taille fixe + styles 100% inline (PR #118-128).
- 2026-08-10 (soir) → 08-11 : texte "Partager" personnalisé, refonte UX "Mes Checklists" (ajout d'item déplacé dans chaque checklist, bouton répétable), popups centrés + couleurs harmonisées étendus à toute l'app (23 popups au total), 8 boutons "Fermer"/"Annuler" invisibles corrigés au global — PR #130, #131.

## 1. Objectif de la session
Trois volets demandés par l'utilisateur : (1) personnaliser le texte de partage avec le prénom du patient, (2) simplifier "Mes Checklists" en déplaçant l'ajout d'item dans chaque checklist plutôt que via des boutons génériques externes, avec un flux "Ajouter un item" répétable (remplaçant l'ancien textarea "un par ligne"), (3) auditer et harmoniser tous les popups de l'app (ouverture centrée + couleurs du thème), en commençant par `MyChecklist.tsx` puis, sur demande explicite de l'utilisateur après un premier "c'est ok", en élargissant la vérification à l'ensemble de l'app. Corriger au passage tout bouton "Fermer"/"Annuler" au texte invisible rencontré (même bug que le cycle précédent).

État "done" : atteint — PR #130 (volets 1, 2 et audit `MyChecklist.tsx`) et PR #131 (audit élargi, 19 popups supplémentaires) mergées et confirmées par l'utilisateur ("c'est ok" puis "mergé et ok").

## 2. État actuel
- **Partager** : texte personnalisé (`ShareSpace.tsx`) livré et confirmé.
- **Mes Checklists** : boutons génériques "ajouter un item perso"/"ajouter à ma checklist" supprimés ; ajout d'item désormais intégré dans chaque checklist (perso ou toute prête) via un champ + bouton "Ajouter un item" répétable, séparé de la liste par un trait coloré au thème. Même flux répétable appliqué à "Créer une checklist" et à l'import de checklist toute prête (suppression du "(un par ligne)").
- **Popups** : convention "dialogue centré + fade" désormais appliquée à 23 popups au total (4 dans `MyChecklist.tsx` via PR #130, 19 de plus via PR #131 dans `account.tsx`, `settings.tsx`, `BookingFlow.tsx`, `InterventionBookingFlow.tsx`, `Entraide.tsx`, `NewsFeed.tsx`, `Soutien.tsx`, `SouvenirsGallery.tsx`). Les gros formulaires/flux (édition de profil, calendriers de réservation, formulaire de besoin Entraide, ajout d'intervention, fiche profil visiteur) restent volontairement en tiroir bas — jugés plus confortables ainsi pour du contenu long/scrollable, décision validée par l'utilisateur via une question explicite avant implémentation.
- 8 boutons "Fermer"/"Annuler"/"Retour" au texte invisible corrigés au global (même pattern que le cycle précédent : bouton autonome hors rangée `sheetBtns`, corrigé en taille fixe + styles 100% inline).

**Dernière action avant ce handoff :** génération de ce handoff, demandée par l'utilisateur juste après confirmation "mergé et ok" de la PR #131.

## 3. Fichiers concernés
- `components/ShareSpace.tsx` → texte d'invitation personnalisé au prénom du patient.
- `components/MyChecklist.tsx` → suppression des boutons génériques d'ajout d'item, ajout répétable intégré à chaque checklist (perso ou toute prête), 4 popups centrés + couleurs thème, 2 boutons Fermer/Annuler invisibles corrigés.
- `app/(admin)/account.tsx`, `app/(admin)/settings.tsx`, `components/BookingFlow.tsx`, `components/InterventionBookingFlow.tsx`, `components/Entraide.tsx`, `components/NewsFeed.tsx`, `components/Soutien.tsx`, `components/SouvenirsGallery.tsx` → 19 popups convertis en dialogue centré, 6 boutons Fermer/Annuler/Retour invisibles corrigés, nettoyage de styles `overlay`/`sheet` devenus orphelins dans 3 fichiers (`InterventionBookingFlow.tsx`, `Soutien.tsx`, `SouvenirsGallery.tsx`) et de la constante `SHEET_MAX_HEIGHT` orpheline (`Entraide.tsx`).
- `Handoff/handoff.md` → ce fichier.

## 4. Ce qui a échoué
Rien n'a échoué ce cycle — contrairement au cycle précédent (bouton "Fermer"), aucune itération de correctif n'a été nécessaire : le pattern taille-fixe + styles inline, déjà validé et documenté au cycle précédent, a été appliqué directement partout où le bug apparaissait, sans nouvelle tentative infructueuse.

Point de process à noter : avant d'élargir le périmètre à toute l'app (19 popups supplémentaires dans 8 fichiers, dont plusieurs flux métier centraux comme les réservations), une question explicite a été posée à l'utilisateur pour trancher entre "tout centrer" et "centrer les petits popups seulement, garder les gros formulaires en tiroir bas" — l'utilisateur a choisi la seconde option (recommandée). **Décision à respecter si de nouveaux popups sont ajoutés à l'avenir :** les gros formulaires/flux multi-étapes restent en tiroir bas par convention, les petits popups (confirmations, pickers, formulaires courts) sont centrés.

## 5. Prochaine étape
Aucune action immédiate requise sur ce sujet — les deux PR sont mergées et confirmées par l'utilisateur.

Items reportés (inchangés depuis le cycle précédent, ordre suggéré, sur demande uniquement) : migration `20260728_intervenant_checklist_templates.sql` à confirmer exécutée en prod, rebase de `fix/souvenirs-rls-and-news-delete`, décision `docs/spec-web-upgrade`, déploiement `avectoi-site` sur Infomaniak (bloqué sans les accès de l'utilisateur), isolation Supabase, taille de l'app, mise à jour manuelle de `Documentation Fonctionnalités.docx` (section "Mes Checklists").
