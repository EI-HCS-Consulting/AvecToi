# Handoff — AvecToi
_Généré le : 2026-07-12_

## État global du projet

**Stack :** React Native + Expo SDK 51+, Expo Router, Supabase (BDD/Auth/Storage/Realtime/Edge Functions), EAS Build + EAS Update (channels development/preview/production, `expo-updates` installé), expo-notifications, expo-calendar, expo-image-picker. Stripe côté web uniquement (avectoi.care), app 100% "reader" conforme Play Store (aucun prix/achat dans l'app).

**Repo GitHub :** `https://github.com/EI-HCS-Consulting/AvecToi`, branche `main` protégée par ruleset (PR obligatoire — jamais de commit direct dessus). `gh` CLI installé et authentifié (compte `EI-HCS-Consulting`), disponible sur le PATH cette session. `main` local à jour avec `origin/main` (`610d221`).

**Branches ouvertes sur `origin` :**
- `main`
- `docs/spec-web-upgrade` — non mergée, en attente depuis plusieurs sessions, statut toujours à clarifier.
- `fix/android-clock-picker-colors` — **PR #16 ouverte cette session, pas encore mergée** (voir détail session ci-dessous).

**Branches locales orphelines repérées lors d'une session antérieure, toujours non nettoyées** : `docs/handoff-2026-07-10`, `docs/handoff-onboarding-wizard-2026-07-09`, `fix/freemium-cap-granular-gating` — statut inconnu, à investiguer/nettoyer.

**Livré (V1, CLAUDE.md points 1-10) :** setup Expo/Supabase/Git, Auth admin, accès visiteur (lien/token ou code dossier), calendrier + créneaux + réservation + PIN, galerie Souvenirs, Nouvelles du jour, Entraide + Mur de soutien, 6 thèmes, "Prochaine disponibilité", ajout calendrier natif Android, RLS UPDATE/DELETE + cascade `group_id`, accompagnants comme vraies réservations liées, parité admin/visiteur "Mon compte", autofill Google Maps domicile, assistant d'onboarding séquencé + partage freemium débloqué, cap freemium à granularité fine, refonte Paramètres en 4 sections avec barre fixe + historique en accordéon, historique figé + recasage auto + alertes in-app + historique permanent des modifications (PR #14 + #15, mergées dans `main`).

**En cours / pas commencé :**
- **PR #16 (cette session)** : fix horloges Android natives (bug enregistrement) + redesign bleu/orange + infra EAS Update/Workflow — testée en conditions réelles sur build `development`, prête à merger.
- Points 11-12 (notifications push rappel, RGPD purge auto J-7) : livrés lors de sessions antérieures, pas re-testés récemment.
- Points 13-14 (EAS Build APK signé, fiche Play Store) : pas commencés.
- Branche `docs/spec-web-upgrade` : toujours en attente, statut/priorité à clarifier avec l'utilisateur.
- Cap freemium (réactivé) jamais testé en conditions réelles avec un espace non-premium existant en prod.
- Les migrations SQL de la fonctionnalité recasage/alertes (PR #14/#15) n'ont toujours pas été vérifiées directement en base (pas de `psql`/clé service role disponible dans cet environnement) — les tests manuels utilisateur les confirment fonctionnelles, à reconfirmer si comportement anormal.

## Historique cumulé
- Lots 1-10 (fonctionnalités de base) livrés au fil de sessions antérieures.
- 2026-07-04 → 07-08 : `dossier_code`, cap freemium, PIN visiteur sécurisé, refonte `MiniCalendar`, fix RLS UPDATE/DELETE + cascade `group_id`, migration du repo GitHub (exposition `.env` corrigée), identification visiteur fiabilisée, négociation d'horaire Transport, accompagnants comme vraies réservations, parité "Mon compte" admin/visiteur + autofill Maps + fix suppression Souvenirs (PR #7-#11, toutes mergées).
- 2026-07-09 : assistant d'onboarding séquencé + déverrouillage du partage freemium + cap granulaire (PR #12, mergée).
- 2026-07-10 : refonte Paramètres en 4 sections + barre de navigation fixe + horaires format horloge Android (PR #13, mergée).
- 2026-07-11 : fix badge d'alerte persistant après correction admin + historique permanent des modifications de réservation (nouvelle table `reservation_change_history`) + regroupement des alertes accompagnants par `group_id` + tri anti-chronologique historique admin. Incident repéré et corrigé en fin de session : PR #15 avait été mergée sur une branche intermédiaire (`feat/slot-config-history`) jamais elle-même mergée dans `main` — retargetée et mergée (PR #14 → `610d221`). Nettoyage de 6 branches entièrement mergées (local + origin).
- 2026-07-12 (cette session) : voir détail ci-dessous.

## 1. Objectif de la session
Corriger un bug rapporté par l'utilisateur : les nouveaux sélecteurs d'heure "horloge" sur Android n'enregistraient pas l'heure choisie. Puis redesigner ces popups (couleurs orange/bleu), en itérant à plusieurs reprises sur retours visuels précis de l'utilisateur (captures d'écran à l'appui) jusqu'à correspondance exacte avec l'attendu, y compris le mode "saisie clavier" du sélecteur. En parallèle, mise en place d'une chaîne EAS Update/Workflow pour les futures mises à jour OTA.
État "done" : atteint — bug corrigé, design validé par l'utilisateur sur build réel ("c'est parfait, merci"), PR #16 ouverte et prête à merger.

## 2. État actuel
**Fait cette session :**
- `lib/androidTimePicker.ts` (nouveau) : helper `openAndroidTimePicker()` utilisant l'API impérative `DateTimePickerAndroid.open()` — corrige le bug d'enregistrement (le composant déclaratif `<DateTimePicker>` rouvrait le dialogue natif à chaque re-render du parent sur Android, à cause de son `useEffect` dépendant d'un `onChange` inline recréé à chaque render).
- `components/TimeClockPicker.tsx`, `app/(admin)/settings.tsx`, `components/PatientOnboarding.tsx` : branchement conditionnel `Platform.OS === "android"` → API impérative ; iOS conserve l'ancien composant déclaratif (`display="spinner"`).
- `app.json` : configuration du plugin `@react-native-community/datetimepicker` avec 5 couleurs Android explicitement fixées (`background`, `headerBackground`, `numbersBackgroundColor`, `numbersTextColor`, `numbersSelectorColor`) — bandeau bleu `#2E75B6` autour de l'heure, reste du dialogue en bleu clair `#DCEEFB`, chiffres du cadran en bleu `#2E75B6`, aiguille orange `#f97316`.
  - **Point technique important** : laisser une propriété de couleur non définie ne restaure PAS l'apparence native "par défaut" antérieure au plugin — dès qu'une seule couleur est fixée, Android bascule le dialogue entier sur un thème Material 3 à couleur dynamique ("Material You", calculée depuis le fond d'écran de l'utilisateur) pour tout le reste. D'où plusieurs allers-retours de build avant d'obtenir un rendu stable : il faut fixer explicitement TOUTES les couleurs concernées, sinon certaines reviennent aléatoirement (turquoise, cercle gris, etc. observés en cours de session).
- `plugins/withTimePickerDialogTheme.js` (nouveau, custom Expo config plugin) : le plugin officiel du package datetimepicker ne couvre que le cadran/aiguille — le mode "saisie clavier" du sélecteur (titre "Indiquer l'heure", champs HH:MM, icône clavier) est stylé par un thème Android natif distinct (`android:timePickerDialogTheme`) qu'aucune option publique n'expose. Ce plugin crée un thème dédié (`colorAccent`, `colorControlNormal`, `colorControlActivated`, `android:textColorPrimary` → bleu `#2E75B6`) appliqué uniquement à ce dialogue, sans toucher au thème global de l'app.
- `expo-dev-client` + `expo-updates` installés (`npx expo install`) ; `eas update:configure` exécuté → `eas.json` : chaque profil de build a maintenant un `channel` (development/preview/production) ; `app.json` : `runtimeVersion.policy: "appVersion"` + `updates.url`.
- `.eas/workflows/update-on-main.yml` (nouveau) : publie une update OTA sur le channel `preview` à chaque push sur `main` — nécessite que le repo GitHub reste connecté au projet EAS via le dashboard Expo (déjà fait cette session, "Base directory" laissé vide car le projet Expo est à la racine du repo).
- `.gitignore` : `.eas/` ignorait aussi `.eas/workflows/`, empêchant le workflow d'être versionné et donc vu par EAS/GitHub — corrigé (`.eas/*` + `!.eas/workflows/`).
- 4 cycles de build EAS (`development`, un `preview`) pour valider les changements natifs (non visibles via Metro/OTA seul) — guidage pas-à-pas utilisateur : install lien EAS, résolution d'un échec de build (dépendance `expo-dev-client` manquante), résolution d'une erreur de connexion Metro ("Invalid URL host") en fournissant l'URL manuelle `exp://<IP-LAN>:8081`.
- Diagnostic d'un écart de couleurs signalé par l'utilisateur après un build : comparaison de deux captures d'écran (avant/après) qui a confirmé l'hypothèse "Material You" ci-dessus plutôt qu'un problème de build périmé.
- Commit `41c5b3d` sur branche `fix/android-clock-picker-colors`, pushé, **PR #16 ouverte** (pas encore mergée par l'utilisateur).
- Effet de bord repéré et corrigé avant commit : une validation locale (`npx expo prebuild`) avait modifié à tort les scripts `android`/`ios` de `package.json` (`expo run:android` au lieu de `expo start --android`) — revert avant staging, dossier `android/` généré supprimé (le projet reste 100% managed, pas de dossier natif commité).

**Dernière action avant ce handoff :** génération de ce handoff (le commit du handoff suit dans la foulée).

## 3. Fichiers concernés
- `lib/androidTimePicker.ts` → helper API impérative Android (fix bug + couleurs boutons).
- `components/TimeClockPicker.tsx` → sélecteur transport (Entraide), branchement Android/iOS.
- `app/(admin)/settings.tsx` → 4 sélecteurs horaires visite/nuit, branchement Android/iOS.
- `components/PatientOnboarding.tsx` → 2 sélecteurs horaires onboarding, branchement Android/iOS.
- `app.json` → config couleurs plugin datetimepicker + nouveau plugin custom + `runtimeVersion`/`updates`.
- `plugins/withTimePickerDialogTheme.js` → thème natif dédié au mode "saisie clavier" du sélecteur.
- `eas.json` → `channel` par profil de build.
- `.eas/workflows/update-on-main.yml` → publication OTA automatique sur `main`.
- `.gitignore` → ne plus ignorer `.eas/workflows/`.
- `package.json` / `package-lock.json` → ajout `expo-dev-client`, `expo-updates`.

## 4. Ce qui a échoué
- Rien de bloquant au final, mais deux fausses pistes notables à ne pas répéter :
  - Retirer une propriété de couleur du plugin datetimepicker pour "revenir à avant" ne marche pas — Android retombe sur une couleur dynamique Material You, pas sur un défaut fixe. Il faut toujours fixer explicitement toutes les couleurs voulues.
  - Le mode "saisie clavier" du sélecteur d'heure n'est pas configurable via les options publiques du package `@react-native-community/datetimepicker` — a nécessité d'écrire un config plugin maison ciblant `android:timePickerDialogTheme` directement.

## 5. Prochaine étape
1. Merger la PR #16 (https://github.com/EI-HCS-Consulting/AvecToi/pull/16) une fois relue.
2. Après merge, vérifier que le workflow `.eas/workflows/update-on-main.yml` se déclenche bien sur le push (première exécution réelle, jamais encore observée) — publie sur le channel `preview`.
3. Lancer un build `production` (jamais fait) quand prêt pour la soumission Play Store — les changements de cette session sont uniquement validés sur builds `development`/`preview`.
4. Décider du sort de `docs/spec-web-upgrade` (seule autre branche non mergée, en attente depuis plusieurs sessions).
5. Clarifier le statut des 3 branches locales orphelines (`docs/handoff-2026-07-10`, `docs/handoff-onboarding-wizard-2026-07-09`, `fix/freemium-cap-granular-gating`).
6. Tester le cap freemium en conditions réelles ; revalider points 11-12 (notifications push, purge RGPD J-7).
7. Reprendre la roadmap points 13-14 (EAS Build → APK signé, fiche Play Store).
