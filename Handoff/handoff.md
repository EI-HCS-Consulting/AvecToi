# Handoff — AvecToi
_Généré le : 2026-08-02_

## État global du projet

**Stack :** React Native + Expo SDK 51+, Expo Router, Supabase (BDD/Auth/Storage/Realtime/Edge Functions), EAS Build + EAS Update (channels development/preview/production, `expo-updates`, publication OTA automatique sur push `main` via `.github/workflows/eas-update-preview.yml`). expo-notifications, expo-calendar, expo-image-picker. Resend (transactionnel) branché sur les Edge Functions. Stripe côté web uniquement. Supabase CLI bloqué sur cette machine (App Control Policy Windows) : déploiement des migrations/Edge Functions exclusivement via le Dashboard Supabase.

**⚠️ Règle Git désormais STRICTE (ajoutée cette session, PR #109) :** chaque modification, même un correctif ponctuel, part sur une branche neuve et se termine par sa propre PR poussée sur GitHub — jamais de nouveau commit ajouté à une branche dont la PR est déjà mergée. L'utilisateur teste sur son téléphone (development build) avant de merger lui-même ; sans PR ouverte il ne peut pas récupérer le changement dans ses updates. Ne jamais merger sans confirmation explicite du test téléphone.

**Repo GitHub :** `https://github.com/EI-HCS-Consulting/AvecToi`, branche `main` protégée par ruleset (PR obligatoire). `main` à jour, dernier merge `a0cd6f7` (PR #111).

**PR ouvertes, en attente :**
- **#109** — `chore/document-pr-workflow` : documentation de la règle Git ci-dessus dans `CLAUDE.md`. Pas de test fonctionnel nécessaire, juste à relire/merger.
- **#110** — `fix/maps-consent-encoding-and-name-fallback` : correctif du lien Google Maps (voir session du jour ci-dessous). **Pas encore testé sur téléphone.**

**Nouveau projet sibling : `avectoi-site`** (`C:\Users\ReMarkt\Documents\Projets\avectoi-site`, dépôt séparé `https://github.com/EI-HCS-Consulting/avectoi-site`, poussé sur `main`) — site marketing Next.js pour `avectoi.care` : accueil + 3 pages persona (Hospitalisation / Enfant hospitalisé / Soin à domicile), composants partagés (tableau Freemium/Premium, argument Premium intervenants reformulé — jamais présenté comme payé par l'intervenant), redirection `/invite` legacy, pages légales en placeholder. Construit selon le plan `C:\Users\ReMarkt\.claude\plans\spicy-exploring-scott.md`. **Pas encore déployé** (Infomaniak — nécessite les accès du compte de l'utilisateur, hors de portée sans eux). Deux correctifs compagnons déjà mergés dans le repo app : PR #105 (liens d'invitation pointent vers `app.avectoi.care`) et PR #106 (verrou Premium sur l'activation du rôle Intervenant — voir PRD mis à jour ci-dessous).

**Livré (V1 + V2 partiel) :** tout le socle listé aux points 1-10 du CLAUDE.md, plus refonte intervenant complète (métiers, accès, priorité créneaux configurable, canal Nouvelles séparé), RGPD 90j + purge auto + sauvegarde schéma hebdo, checklists perso réutilisables, rattachement multi-espaces intervenant, onboarding séquencé, cap freemium (8 visites), Paramètres 4 sections + historique, emails Resend, Chronologie, mode "1 visite/jour" unifié, icône adaptive Android, EAS Update automatisé.

**Testé et confirmé par l'utilisateur cette session :** fix décalage de date onboarding (choix répété de date sans dérive), fix toggle "Planning des intervenants" qui revenait en arrière tout seul dans Réglages.

**Pas encore testé / en cours de diagnostic :**
- **Email de confirmation signup → toujours renvoyé vers `http://localhost:3000` au lieu d'ouvrir l'app.** Diagnostiqué comme un problème de configuration Supabase Dashboard (Site URL resté sur la valeur de dev par défaut), pas de code. L'utilisateur vient de changer le Site URL vers `avectoi://` — **reste à retester avec un compte flambant neuf** (voir Prochaine étape).
- **Lien Google Maps collé par l'admin → nom garbled ("+" littéraux) et champs adresse vides.** Root-causé précisément et corrigé dans PR #110 (voir détail session du jour) — **reste à tester sur téléphone**.

**En cours / pas commencé (reporté, à reprendre sur demande) :**
- `fix/souvenirs-rls-and-news-delete` : branche stale (prédate le batch PR #96), 2 migrations RLS jamais exécutées en prod (`AUDIT_RLS_TAILLE_CODE_MORT.md`).
- Migration `20260728_intervenant_checklist_templates.sql` (PR #74) : toujours pas confirmée exécutée en prod — "📥 Mes modèles" reste en échec silencieux tant que ce n'est pas fait.
- Isolation Supabase (séparer l'instance prod partagée avec le site web historique) : plan complet dans `ISOLATION_SUPABASE.md`.
- `docs/spec-web-upgrade` : en attente d'une décision utilisateur.
- Taille de l'app (180 Mo) et audit code mort : volontairement reporté.
- Points 13-14 (EAS Build APK signé, fiche Play Store) : pas commencés.
- Décommissionnement du site Vercel historique (`planning-visites-maman.vercel.app`) au profit d'`avectoi.care` : pas encore exécuté, dépend du déploiement d'`avectoi-site`.
- `Documentation/Documentation Fonctionnalités.docx` : **pas mis à jour cette session** — pas d'outil docx disponible dans cet environnement pour éditer ce fichier binaire. Le PRD (`PRD_AvecToi_v1_4.md`) a bien été mis à jour (v1.6 → v1.7, verrou Premium sur le rôle Intervenant + mention du site marketing) ; le docx reste à ajuster manuellement ou via un outil dédié.

## Historique cumulé
- Jusqu'au 2026-07-22 : lots 1-10 (fonctionnalités de base) + refonte intervenant Phase A/B (métiers, accès, priorité créneaux, canal Nouvelles séparé), RGPD 90j + purge auto + sauvegarde schéma auto, checklists perso réutilisables, rattachement multi-espaces intervenant, EAS Update automatisé, fix scroll fiche intervenant (PR #100-101) — PR #7 à #102.
- 2026-07-22 → 07-31 : resynchronisation PRD (PR #103), snapshot schéma Supabase auto (PR #104).
- 2026-08-01 : liens d'invitation → `app.avectoi.care` (PR #105), verrou Premium sur "Planning des intervenants" (PR #106), fix datepicker onboarding + navigation Réglages (PR #107), fix décalage de date / toggle intervenants / lien email confirmation (PR #108, remergé sous #111 par duplication de branche sans conséquence), site marketing `avectoi-site` construit et poussé (dépôt séparé, pas encore déployé), documentation de la règle Git "1 branche = 1 PR" (PR #109, ouverte).

## 1. Objectif de la session
Traiter le retour de test téléphone de l'utilisateur sur PR #107/#108 : confirmer/corriger 4 points (décalage de date, toggle intervenants, email de confirmation, lien Google Maps), en respectant strictement la nouvelle règle "1 modification = 1 branche = 1 PR" explicitement demandée par l'utilisateur en tout début de session.
État "done" : chaque point a soit une confirmation de fix réel par l'utilisateur, soit une PR ouverte prête à tester, soit un diagnostic actionnable quand le problème est hors du code (config Supabase Dashboard).

## 2. État actuel

**Décalage de date (onboarding) et toggle "Planning des intervenants" (Réglages) :** confirmés résolus par l'utilisateur après test réel — rien à faire de plus.

**Email de confirmation signup → `localhost:3000` :** le code (`emailRedirectTo: Linking.createURL("auth/confirmed")` dans `app/auth/signup.tsx`) était déjà correct depuis PR #108. Diagnostiqué comme un repli Supabase vers son champ **Site URL** (Dashboard → Authentication → URL Configuration), resté sur `http://localhost:3000` (valeur de dev jamais changée), pendant que `avectoi://*` était lui bien ajouté à la liste **Redirect URLs**. L'utilisateur vient de changer le Site URL vers `avectoi://`. **Non encore revérifié** — il faut un compte créé après ce changement pour être sûr que le lien de l'email a été généré avec la nouvelle configuration.

**Lien Google Maps garbled + champs adresse vides :** root-causé précisément par test réel (`curl -sL` sur le lien réel fourni par l'utilisateur, `maps.app.goo.gl/92GXdSuSzdEBPCZ47`), deux bugs distincts dans `lib/address.ts` :
1. La redirection passe par l'écran de consentement RGPD de Google (zone UE, `consent.google.com/m?continue=...`), qui **double-encode** le lien final — un "+" d'origine y devient "%2B". `extractPlaceSegments()` remplaçait les "+" par des espaces **avant** de décoder, laissant passer des "+" littéraux dans le nom capturé côté client. **Fix :** décoder (jusqu'à 2 passes) puis remplacer ensuite.
2. Même corrigé, le lien réel testé (un gros établissement, "Hôpital Pellegrin") est un lien **Place ID/CID opaque** (`data=!4m2!3m1!1s0x...`) sans adresse texte ni coordonnées `@lat,lon` — les deux chemins d'extraction existants ne pouvaient rien en tirer. **Fix :** nouveau repli `forwardGeocode()` — recherche Nominatim par nom, avec un second essai sur une version simplifiée (avant le premier " - ") si le nom complet ne matche rien ; confirmé fonctionnel en test réel contre l'API Nominatim (le nom complet "Hôpital Pellegrin - CHU de Bordeaux" ne matche rien, la version simplifiée "Hôpital Pellegrin Bordeaux" retourne le bon CP/ville).
Les deux fixes sont dans **PR #110**, poussée, **pas encore testée sur téléphone**.

**PRD mis à jour (v1.6 → v1.7) :** ajout du verrou Premium sur l'activation du rôle Intervenant (§3.9, §3.12 — déjà en code depuis PR #106 mais jamais documenté au niveau produit) et mention du site marketing `avectoi-site`. `Documentation Fonctionnalités.docx` **pas** mis à jour (pas d'outil docx disponible ici) — reste à faire.

**Dernière action avant ce handoff :** l'utilisateur a changé le Site URL Supabase vers `avectoi://` et a demandé la génération de ce handoff.

## 3. Fichiers concernés
- `lib/address.ts` → `extractPlaceSegments()` (ordre décodage/remplacement corrigé) + nouvelle fonction `forwardGeocode()` (repli Nominatim par nom), branchée dans `resolvePlaceFromMapsUrl()`. PR #110, non mergée.
- `CLAUDE.md` → section "Règles Git — STRICTES" complétée avec la règle 1-branche-1-PR. PR #109, non mergée.
- `PRD_AvecToi_v1_4.md` → changelog v1.7, §3.9 (activation Intervenant), §3.12 (cap freemium — ajout du verrou Premium + précision "partage libre"). Modifié cette session, **pas encore commité/poussé** (pas de branche/PR ouverte pour ce changement — voir Prochaine étape).
- `app/auth/signup.tsx` → `emailRedirectTo` (déjà correct depuis PR #108, aucun changement cette session, mentionné pour mémoire du diagnostic).
- `Handoff/handoff.md` → ce fichier.
- `avectoi-site/` (dépôt séparé) → site marketing construit intégralement cette session/session précédente, poussé sur `main`, pas encore déployé.

## 4. Ce qui a échoué
- **Erreur de mécanique Git rencontrée et corrigée en cours de session :** en creusant le bug Maps, une édition à `lib/address.ts` a été faite par erreur alors que la branche courante (`chore/document-pr-workflow`) était périmée (antérieure au merge de PR #108) — un `git checkout -b` vers une branche neuve a été bloqué par Git ("local changes would be overwritten"). Résolu proprement par `git stash` → `checkout -b ... origin/main` → `git stash pop`, sans perte de travail ni mélange de ce correctif avec la branche de doc PR #109 (qui aurait violé la règle 1-branche-1-PR qu'on venait d'ajouter).
- **Le premier correctif Maps (HEAD→GET + User-Agent, PR #108) n'a pas suffi** — il a permis de récupérer le bon lien final après redirection, mais n'a pas résolu le garbling ni les champs vides. Nécessaire mais pas suffisant ; la vraie root cause (double encodage du consentement RGPD + liens Place-ID-only) n'a été trouvée qu'en testant le lien réel de l'utilisateur en direct (`curl -sL`), pas en théorisant sur le code seul.

## 5. Prochaine étape
1. **Commiter et pousser le changement du PRD** (`PRD_AvecToi_v1_4.md`, actuellement modifié en local sans branche dédiée) — créer une branche `docs/prd-premium-intervenants-gate` (ou similaire) et une PR, conformément à la règle 1-branche-1-PR (c'est un fichier de doc, un simple push direct sur `main` serait plus rapide mais casserait la règle qu'on vient d'ajouter à la demande explicite de l'utilisateur).
2. **Demander à l'utilisateur de retester le lien de confirmation email** avec un **nouveau** compte admin (créé après le changement de Site URL) — c'est le test qui confirmera ou non que le repli localhost:3000 est réglé.
3. **Demander à l'utilisateur de merger PR #109** (doc) si la lecture lui convient — pas de test fonctionnel nécessaire.
4. **Demander à l'utilisateur de tester PR #110 sur téléphone** (development build) : recoller le lien Google Maps réel de l'hôpital Pellegrin dans l'onboarding, vérifier que le nom s'affiche sans "+" et que rue/CP/ville se remplissent ; tester aussi un lien court classique et un lien de pin sans adresse pour vérifier l'absence de régression sur les chemins déjà fonctionnels.
5. Une fois #109 et #110 confirmées testées → merger, puis mettre à jour `Documentation Fonctionnalités.docx` (manuellement, pas d'outil docx ici) pour le verrou Premium intervenants si ce n'est pas déjà fait.
6. Items reportés (ordre suggéré, sur demande uniquement) : migration `20260728_intervenant_checklist_templates.sql` à confirmer exécutée en prod, rebase de `fix/souvenirs-rls-and-news-delete`, décision `docs/spec-web-upgrade`, déploiement `avectoi-site` sur Infomaniak (bloqué sans les accès de l'utilisateur), isolation Supabase, taille de l'app.
