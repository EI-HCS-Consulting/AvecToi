# Handoff — AvecToi
_Généré le : 2026-08-10_

## État global du projet

**Stack :** React Native + Expo SDK 51+, Expo Router, Supabase (BDD/Auth/Storage/Realtime/Edge Functions), EAS Build + EAS Update (channels development/preview/production, `expo-updates`, publication OTA automatique sur push `main` via `.github/workflows/eas-update-preview.yml`). expo-notifications, expo-calendar, expo-image-picker. Resend (transactionnel) branché sur les Edge Functions. Stripe côté web uniquement. Supabase CLI bloqué sur cette machine (App Control Policy Windows) : déploiement des migrations/Edge Functions exclusivement via le Dashboard Supabase.

**⚠️ Règle Git STRICTE (CLAUDE.md) :** chaque modification, même un correctif ponctuel, part sur une branche neuve (depuis `origin/main` à jour) et se termine par sa propre PR poussée sur GitHub — jamais de nouveau commit ajouté à une branche dont la PR est déjà mergée. L'utilisateur teste sur son téléphone (development build) avant de merger lui-même ; ne jamais merger sans confirmation explicite du test téléphone.

**Repo GitHub :** `https://github.com/EI-HCS-Consulting/AvecToi`, branche `main` protégée par ruleset (PR obligatoire).

**PR ouverte, en attente de test/merge :**
- **#118** — `fix/name-change-close-button-contrast` : texte du bouton "Fermer" (popup de confirmation changement de nom) forcé en blanc, illisible sur fond bleu. **Pas encore testé sur téléphone.**

**Livré (V1 + V2 partiel) :** tout le socle (points 1-10 CLAUDE.md), refonte intervenant complète (métiers, accès, priorité créneaux configurable, canal Nouvelles séparé, verrou Premium sur l'activation du rôle), RGPD 90j + purge auto + sauvegarde schéma hebdo, checklists perso réutilisables, rattachement multi-espaces intervenant, onboarding séquencé, cap freemium (8 visites), Paramètres 4 sections + historique, emails Resend (annulation, cap atteint, confirmation invité, **et désormais demande de changement de nom**), Chronologie, mode "1 visite/jour" unifié, icône adaptive Android, EAS Update automatisé, liens d'invitation vers `app.avectoi.care`.

**Nouveau ce cycle (#113 → #118) :** rafraîchissement immédiat des adresses hôpital/domicile sans reload d'app (`patchSpace()` dans `handleSaveHospitalInfos`/`handleConfirmHomeCare`) ; popup "Demande de changement de nom" recentré ; remplacement du flux `mailto:` par une demande in-app (nouvelle Edge Function `notify-name-change` + colonne `patient_spaces.name_change_requested_at` + badge "⏳ Demande en cours de traitement"). **Confirmé fonctionnel de bout en bout par l'utilisateur**, après un faux départ de déploiement (voir "Ce qui a échoué").

**Testé et confirmé par l'utilisateur ce cycle :** rafraîchissement adresse sans reload, popup centré, envoi de la demande de changement de nom (confirmation in-app + badge de statut). Seul le contraste du bouton "Fermer" restait à corriger (PR #118, pas encore testé).

**Connu, non bloquant :** `support@avectoi.care` n'existe pas encore comme boîte mail réelle — la demande est bien enregistrée en base et le flux in-app fonctionne, mais l'email envoyé par Resend n'a nulle part où arriver tant que cette adresse n'est pas créée. À faire par l'utilisateur en dehors du code.

**En cours / pas commencé (reporté, à reprendre sur demande) :**
- `fix/souvenirs-rls-and-news-delete` : branche stale, 2 migrations RLS jamais exécutées en prod (`AUDIT_RLS_TAILLE_CODE_MORT.md`).
- Migration `20260728_intervenant_checklist_templates.sql` (PR #74) : toujours pas confirmée exécutée en prod.
- Isolation Supabase (séparer l'instance prod partagée avec le site web historique) : plan complet dans `ISOLATION_SUPABASE.md`.
- `docs/spec-web-upgrade` : en attente d'une décision utilisateur.
- Taille de l'app (180 Mo) et audit code mort : volontairement reporté.
- Points 13-14 (EAS Build APK signé, fiche Play Store) : pas commencés.
- Site marketing `avectoi-site` (dépôt séparé, poussé sur `main`) : toujours pas déployé (Infomaniak, bloqué sans les accès de l'utilisateur). Décommissionnement du site Vercel historique dépend de ce déploiement.
- `Documentation/Documentation Fonctionnalités.docx` : **pas mis à jour ce cycle non plus** — pas d'outil docx disponible dans cet environnement. Le flux "changement de nom" (nouveau bouton, popup, badge de statut) reste à documenter manuellement. PRD (`PRD_AvecToi_v1_4.md`) : pas de mise à jour jugée nécessaire ce cycle — ajustements d'implémentation d'une fonctionnalité déjà existante (délivrance mailto → in-app), pas de changement de règle métier ou de portée produit.

## Historique cumulé
- Jusqu'au 2026-07-22 : lots 1-10 (fonctionnalités de base) + refonte intervenant Phase A/B, RGPD 90j + purge auto + sauvegarde schéma auto, checklists perso réutilisables, rattachement multi-espaces intervenant, EAS Update automatisé — PR #7 à #102.
- 2026-07-22 → 08-01 : resynchronisation PRD (#103), snapshot schéma (#104), liens d'invitation → `app.avectoi.care` (#105), verrou Premium "Planning des intervenants" (#106), fix datepicker onboarding + navigation Réglages (#107), fix décalage de date/toggle intervenants/lien email confirmation (#108, remergé sous #111 sans conséquence), site marketing `avectoi-site` construit et poussé (pas déployé), règle Git "1 branche = 1 PR" documentée (#109).
- 2026-08-01 → 08-02 : diagnostic + fix définitif du lien Google Maps (double-encodage consentement RGPD + repli Nominatim pour liens Place-ID-only, #110), Site URL Supabase corrigé côté Dashboard (email confirmation), PRD v1.6→v1.7 (#112), rafraîchissement adresse + popup centré + première version du flux in-app changement de nom (#113).
- 2026-08-09 → 08-10 : le flux in-app changement de nom restait cassé après #113 (bouton bloqué sans retour, #115 ; erreurs génériques puis détaillées, #116/#117) — root cause réelle trouvée par test `curl` direct de l'endpoint public : la fonction avait été créée sous le slug auto-généré `rapid-service` au lieu de `notify-name-change`, recréée correctement, flux confirmé fonctionnel par l'utilisateur ; reste PR #118 (contraste bouton "Fermer") à tester.

## 1. Objectif de la session
Faire fonctionner de bout en bout, sur retour de test téléphone de l'utilisateur, trois points remontés après PR #113 : rafraîchissement d'adresse sans reload (déjà bon), popup de changement de nom mal centré (déjà bon), et surtout l'envoi de la demande de changement de nom qui ne faisait rien de visible en cliquant "Envoyer".
État "done" : l'utilisateur confirme avoir reçu la confirmation in-app et vu le badge de statut après un envoi réel — atteint. Reste juste le contraste du bouton "Fermer" du popup de confirmation, corrigé dans PR #118, à tester.

## 2. État actuel
**Rafraîchissement adresse + popup centré :** confirmés fonctionnels par l'utilisateur (PR #113), rien à refaire.

**Flux "Demande de changement de nom" in-app :** confirmé fonctionnel de bout en bout par l'utilisateur ("ça fonctionne !") après plusieurs itérations :
- PR #115 : le bouton "Envoyer" pouvait rester bloqué indéfiniment en chargement sans aucun signal si l'appel réseau échouait par exception plutôt que par une erreur "propre" (pas de `try/catch`) ; de plus le toast d'erreur global se rendait **derrière** le popup natif (`Modal` React Native s'affiche dans une couche séparée), donc invisible même quand il se déclenchait. Fix : `try/catch/finally` + erreur affichée **dans** le popup.
- PR #116/#117 : affinage de l'extraction du détail d'erreur renvoyé par l'Edge Function (lecture du corps en texte brut + code HTTP, plus robuste qu'un `.json()` direct qui échouait silencieusement).
- **Root cause réelle, trouvée hors du code :** l'Edge Function `notify-name-change` avait été créée dans le Dashboard Supabase sous le nom auto-suggéré `rapid-service` (nom placeholder généré par défaut à la création), jamais réellement renommé au niveau du routage public — seul le titre affiché dans la liste du Dashboard disait "notify-name-change". Résultat : le testeur interne du Dashboard fonctionnait (il cible la fonction indépendamment de son slug), mais toute requête publique réelle (app **et** `curl` direct) recevait un 404 `"Requested function was not found"` de la passerelle Supabase — confirmé par comparaison avec `notify-cancel` (répond normalement) sur le même projet. Diagnostiqué en testant l'endpoint public directement en `curl` depuis cet environnement (`https://flmslcdzjuifkivmzins.supabase.co/functions/v1/notify-name-change`), plutôt qu'en se fiant au testeur Dashboard. Résolu en supprimant la fonction et en la recréant en saisissant le nom exact `notify-name-change` dès le champ de création (pas de renommage après coup).

**Dernier point signalé par l'utilisateur, corrigé :** texte du bouton "Fermer" du popup de confirmation illisible (blanc forcé explicitement, PR #118, **pas encore testé sur téléphone**).

**Dernière action avant ce handoff :** génération de ce handoff, demandée explicitement par l'utilisateur juste après avoir signalé le bug de contraste du bouton.

## 3. Fichiers concernés
- `app/(admin)/settings.tsx` → `handleSaveHospitalInfos()`/`handleConfirmHomeCare()` (`patchSpace()` ajouté), popup "MODAL CHANGEMENT DE NOM" (recentré, vue de succès, gestion d'erreur inline, contraste du bouton "Fermer"), `handleSendNameChange()` (try/catch/finally + extraction détaillée de l'erreur).
- `lib/types.ts` → `hospital_room`/`hospital_service` retypés `string | null` (reflète la vraie nullabilité en base, nécessaire pour que `patchSpace()` type-check).
- `supabase/functions/notify-name-change/index.ts` → nouvelle Edge Function (enregistre la demande + email Resend vers support@avectoi.care). **Déployée et fonctionnelle** (après recréation sous le bon nom).
- `supabase/migrations/20260802_patient_spaces_name_change_request.sql` → colonne `name_change_requested_at`. **Exécutée en prod.**
- `Handoff/handoff.md` → ce fichier.

## 4. Ce qui a échoué
- **Diagnostic par les logs Supabase seul ne suffisait pas** : les logs de la fonction restaient vides même après plusieurs tentatives réelles depuis l'app, ce qui semblait indiquer qu'aucune requête n'arrivait — vrai, mais la cause exacte (mauvais slug de fonction) n'a été confirmée qu'en testant l'endpoint public directement en `curl` avec les vraies clés du projet (trouvées dans `.env` local, projet `flmslcdzjuifkivmzins`), en comparant la réponse à une fonction connue pour fonctionner (`notify-cancel`). Le testeur "Invoke" intégré au Dashboard Supabase est **trompeur** dans ce genre de cas : il fonctionne même quand la route publique est cassée, car il ne passe pas par la même passerelle.
- **Un premier redéploiement (sans recréation) n'a pas suffi** : redéployer le code de la fonction existante (toujours sous le mauvais slug `rapid-service`) a fait disparaître le 404 "Requested function was not found" côté testeur Dashboard, mais le `curl` direct montrait toujours le même 404 sur `/notify-name-change`. Seule la suppression + recréation complète avec le bon nom saisi dès la création a résolu le problème.
- **Le message d'erreur générique (PR #115) puis le premier essai de détail (PR #116) n'ont montré aucune information exploitable** — la cause : un 404 de passerelle Supabase renvoie un corps qui n'est pas dans le format JSON attendu par le premier parsing (`.json()` direct), d'où le fallback en texte brut + code HTTP ajouté en PR #117, qui a fini par exposer le vrai message (`{"code":"NOT_FOUND","message":"Requested function was not found"}`) permettant de comprendre le problème.

## 5. Prochaine étape
1. **Demander à l'utilisateur de tester PR #118 sur téléphone** : envoyer une demande de changement de nom, vérifier que le texte "Fermer" est lisible en blanc sur le popup de confirmation. Une fois confirmé → merger.
2. Si l'utilisateur veut que les emails de demande de changement de nom soient réellement reçus, il doit créer la boîte `support@avectoi.care` (hors code, action côté hébergeur mail) — non bloquant pour le reste du flux.
3. Items reportés (ordre suggéré, sur demande uniquement) : migration `20260728_intervenant_checklist_templates.sql` à confirmer exécutée en prod, rebase de `fix/souvenirs-rls-and-news-delete`, décision `docs/spec-web-upgrade`, déploiement `avectoi-site` sur Infomaniak (bloqué sans les accès de l'utilisateur), isolation Supabase, taille de l'app, mise à jour manuelle de `Documentation Fonctionnalités.docx` (flux changement de nom).
