# Handoff — AvecToi
_Généré le : 2026-07-12_

## État global du projet

**Stack :** React Native + Expo SDK 51+, Expo Router, Supabase (BDD/Auth/Storage/Realtime/Edge Functions), EAS Build + EAS Update (channels development/preview/production, `expo-updates` installé), expo-notifications, expo-calendar, expo-image-picker. Stripe côté web uniquement (avectoi.care), app 100% "reader" conforme Play Store (aucun prix/achat dans l'app).

**Repo GitHub :** `https://github.com/EI-HCS-Consulting/AvecToi`, branche `main` protégée par ruleset (PR obligatoire — jamais de commit direct dessus). `gh` CLI installé et authentifié (compte `EI-HCS-Consulting`), disponible sur le PATH cette session. `main` local à jour avec `origin/main` (`7728f31`).

**Branches ouvertes sur `origin` :**
- `main`
- `docs/spec-web-upgrade` — non mergée, en attente depuis plusieurs sessions, statut toujours à clarifier.
- `feat/visit-night-minutes` — **mergée cette session (PR #17), branche locale + origin pas encore supprimées** (nettoyage à faire).

**Branches locales orphelines repérées lors de sessions antérieures, toujours non nettoyées** : `docs/handoff-2026-07-10`, `docs/handoff-onboarding-wizard-2026-07-09`, `fix/freemium-cap-granular-gating` — statut inconnu, à investiguer/nettoyer.

**Livré (V1, CLAUDE.md points 1-10) :** setup Expo/Supabase/Git, Auth admin, accès visiteur (lien/token ou code dossier), calendrier + créneaux + réservation + PIN, galerie Souvenirs, Nouvelles du jour, Entraide + Mur de soutien, 6 thèmes, "Prochaine disponibilité", ajout calendrier natif Android, RLS UPDATE/DELETE + cascade `group_id`, accompagnants comme vraies réservations liées, parité admin/visiteur "Mon compte", autofill Google Maps domicile, assistant d'onboarding séquencé + partage freemium débloqué, cap freemium à granularité fine, refonte Paramètres en 4 sections avec barre fixe + historique en accordéon, historique figé + recasage auto + alertes in-app + historique permanent des modifications, fix horloges Android natives (bug enregistrement + design bleu/orange) + infra EAS Update/Workflow, **granularité minute sur les horaires de visite/nuitée (PR #17, mergée)**.

**En cours / pas commencé :**
- Points 11-12 (notifications push rappel, RGPD purge auto J-7) : livrés lors de sessions antérieures, pas re-testés récemment.
- Points 13-14 (EAS Build APK signé, fiche Play Store) : pas commencés.
- Branche `docs/spec-web-upgrade` : toujours en attente, statut/priorité à clarifier avec l'utilisateur.
- Cap freemium (réactivé) jamais testé en conditions réelles avec un espace non-premium existant en prod.
- Vérifier que le workflow `.eas/workflows/update-on-main.yml` s'est bien déclenché sur le push de la PR #16 (première exécution jamais confirmée) — et à nouveau sur celui de la PR #17.
- **Emails d'annulation (`notify-cancel`) toujours inactifs** : la fonction est déployée (avec le fix minutes de cette session) mais `RESEND_API_KEY` n'est pas configurée côté Supabase → aucun email n'est réellement envoyé pour l'instant, c'est un état connu/accepté, pas un bug.

## Historique cumulé
- Lots 1-10 (fonctionnalités de base) livrés au fil de sessions antérieures.
- 2026-07-04 → 07-08 : `dossier_code`, cap freemium, PIN visiteur sécurisé, refonte `MiniCalendar`, fix RLS UPDATE/DELETE + cascade `group_id`, migration du repo GitHub, identification visiteur fiabilisée, négociation d'horaire Transport, accompagnants comme vraies réservations, parité "Mon compte" admin/visiteur + autofill Maps + fix suppression Souvenirs (PR #7-#11, mergées).
- 2026-07-09 : assistant d'onboarding séquencé + déverrouillage du partage freemium + cap granulaire (PR #12, mergée).
- 2026-07-10 : refonte Paramètres en 4 sections + barre de navigation fixe + horaires format horloge Android (PR #13, mergée).
- 2026-07-11 : fix badge d'alerte persistant + historique permanent des modifications de réservation (`reservation_change_history`) + regroupement des alertes accompagnants par `group_id` + tri anti-chronologique historique admin (PR #14/#15, mergées après un incident de retargetage de branche corrigé en session).
- 2026-07-12 (session précédente) : fix horloges Android natives (bug enregistrement + redesign bleu/orange) + infra EAS Update/Workflow (PR #16, mergée).
- 2026-07-12 (cette session) : voir détail ci-dessous.

## 1. Objectif de la session
Corriger un bug rapporté par l'utilisateur : le réglage minutes des horaires de visite/nuitée ne fonctionnait pas (seul le changement d'heure était pris en compte dans les champs Début/Fin). Diagnostic : les colonnes DB `visit_start_hour`/`visit_end_hour`/`night_start_hour`/`night_end_hour` sont des `integer` heure-pleine uniquement — le sélecteur horloge natif (déjà corrigé en session précédente) laissait pourtant choisir une minute, silencieusement ignorée. L'utilisateur a choisi la portée "Ajouter les minutes (schéma + SQL)" plutôt qu'une simple restriction UI aux heures pleines.
État "done" : atteint — migration passée en prod, code déployé de bout en bout, `notify-cancel` redéployé, PR #17 mergée dans `main`.

## 2. État actuel
**Fait cette session :**
- `supabase/migrations/20260712_visit_night_minutes.sql` (nouveau, exécutée manuellement en prod par l'utilisateur via le SQL Editor) : 4 colonnes additives `visit_start_minute`/`visit_end_minute`/`night_start_minute`/`night_end_minute` (`integer not null default 0`, check `between 0 and 59`) sur `slot_config` + `slot_config_history` ; `apply_slot_rule_change()` réécrite (`create or replace`) pour lire/écrire ces 4 champs — minutes de visite = changement structurel (déclenche le recasage auto), minutes de nuitée = cosmétique (pas de scan/annulation), au même titre que les heures existantes.
- `lib/types.ts` : 4 champs minute ajoutés à `SlotConfig` et `SlotConfigHistoryEntry`.
- `lib/slotUtils.ts` : nouveau `formatHourMinute(hour, minute) => "HH:MM"` (helper partagé) ; `nightStartSlot`/`nightRangeLabel` et `generateSlots()` mis à jour pour tenir compte des minutes.
- `lib/calendarSync.ts` : `eventWindow()` — fin d'événement calendrier natif d'une nuitée utilise `night_end_minute`.
- `app/(visitor)/home/info.tsx` + `app/(admin)/home/info.tsx` : affichage des horaires au format `HH:MM` via `formatHourMinute`/`nightRangeLabel`.
- `app/(admin)/settings.tsx` (fichier le plus impacté) : nouveaux states minute, helpers `hmToMinutes`/`minutesToHM`, clamp en minutes-totales (au lieu d'heures pleines) pour les pickers visite Début/Fin, pickers nuitée sans clamp (comme avant), preview "Créneaux générés" reliée à un vrai appel `generateSlots()` (remplace un calcul dupliqué à la main), historique de modification formaté en `HH:MM`.
- `components/PatientOnboarding.tsx` : étape "Horaires de visite" (onboarding nouvel espace) — mêmes pickers minute-aware, validité de plage recalculée en minutes-totales.
- `supabase/functions/notify-cancel/index.ts` : lecture des 2 nouvelles colonnes minute de nuitée + `formatHourMinute` local (fonction Deno, pas d'import partagé entre edge functions) pour le libellé du créneau dans l'email d'annulation.
- `npx tsc --noEmit` : clean sur tous les fichiers modifiés (seules erreurs restantes = pré-existantes, sans rapport : types Deno non résolus par le tsconfig RN dans les 3 edge functions, et un mismatch de type `expo-notifications` dans `lib/notifications.ts`).
- Branche `feat/visit-night-minutes`, commit unique, PR #17 ouverte puis **mergée** dans `main` (`7728f31`) par l'utilisateur.
- Redéploiement de `notify-cancel` : plusieurs obstacles rencontrés et résolus (voir section 4) — déploiement final réussi via copie du fichier brut depuis GitHub (bouton "Copy raw file"), collé dans l'éditeur du dashboard Supabase.

**Dernière action avant ce handoff :** confirmation du merge de la PR #17 par l'utilisateur, puis génération de ce handoff.

## 3. Fichiers concernés
- `supabase/migrations/20260712_visit_night_minutes.sql` → 4 colonnes minute + `apply_slot_rule_change()` mise à jour.
- `lib/types.ts` → champs minute sur `SlotConfig`/`SlotConfigHistoryEntry`.
- `lib/slotUtils.ts` → `formatHourMinute()`, `nightStartSlot`/`nightRangeLabel`/`generateSlots()` minute-aware.
- `lib/calendarSync.ts` → fin d'événement calendrier nuitée avec minutes.
- `app/(visitor)/home/info.tsx`, `app/(admin)/home/info.tsx` → affichage horaires `HH:MM`.
- `app/(admin)/settings.tsx` → pickers, preview créneaux, historique — tout minute-aware.
- `components/PatientOnboarding.tsx` → étape horaires onboarding minute-aware.
- `supabase/functions/notify-cancel/index.ts` → email d'annulation, libellé nuitée en `HH:MM` (redéployé).

## 4. Ce qui a échoué
- **CLI Supabase inutilisable sur le poste de l'utilisateur** : `npx supabase <cmd>` échoue systématiquement (`spawnSync ... UNKNOWN`), y compris après purge du cache npx et réinstallation complète — cause identifiée : **politique de contrôle d'application Windows (WDAC/AppLocker ou équivalent) bloquant l'exécution de tout binaire téléchargé** (confirmé par le message explicite "Une stratégie de contrôle d'application a bloqué ce fichier" lors d'un test d'exécution directe). `winget install Supabase.CLI` ne trouve pas non plus de paquet. **Ne plus proposer la CLI Supabase sur ce poste** — toujours passer par le dashboard web pour tout déploiement d'edge function.
- **Collage dans l'éditeur Monaco du dashboard Supabase** : deux tentatives de copier-coller du bloc de code depuis la fenêtre de chat ont échoué avec la même erreur de parsing (`Expected ',', got ')'` à la ligne 12 systématiquement), alors que le fichier source local est vérifié propre (aucun caractère invisible). Cause probable : corruption introduite par le copier-coller depuis le rendu markdown du chat (bouton de copie ou presse-papier navigateur). **Fix qui a marché** : copier le fichier directement depuis GitHub via le bouton "Copy raw file" sur la page du fichier (contourne complètement le pipeline chat → presse-papier). À réutiliser directement la prochaine fois qu'un déploiement manuel via dashboard est nécessaire, plutôt que de reproposer un copier-coller depuis le chat.

## 5. Prochaine étape
1. Nettoyer la branche `feat/visit-night-minutes` (locale + `origin`), désormais mergée et inutile.
2. Vérifier manuellement en app (jamais fait cette session, l'utilisateur a préféré merger directement) : réglage d'un horaire à la minute près (ex. `09:30`) dans Paramètres → Règles de visite / Nuitées, et confirmer l'affichage correct sur les écrans Infos + l'événement calendrier natif d'une nuitée.
3. Vérifier que le workflow `.eas/workflows/update-on-main.yml` s'est déclenché sur le push de la PR #17 (channel `preview`) — jamais confirmé depuis sa mise en place (PR #16).
4. Décider du sort de `docs/spec-web-upgrade` (seule autre branche non mergée, en attente depuis plusieurs sessions).
5. Clarifier le statut des 3 branches locales orphelines (`docs/handoff-2026-07-10`, `docs/handoff-onboarding-wizard-2026-07-09`, `fix/freemium-cap-granular-gating`).
6. Tester le cap freemium en conditions réelles ; revalider points 11-12 (notifications push, purge RGPD J-7).
7. Reprendre la roadmap points 13-14 (EAS Build → APK signé, fiche Play Store).
8. Si un jour les emails d'annulation sont activés (configuration de `RESEND_API_KEY`), le fix minutes de `notify-cancel` est déjà en place et déployé — rien à refaire côté code.
