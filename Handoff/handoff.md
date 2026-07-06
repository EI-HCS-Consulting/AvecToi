# Handoff — AvecToi
_Généré le : 2026-07-06 16:54_

## État global du projet

**Stack :** React Native + Expo SDK 51+, Expo Router, Supabase (BDD/Auth/Storage/Realtime/Edge Functions), EAS Build, expo-notifications, expo-calendar, expo-image-picker. Stripe côté web uniquement (avectoi.care), app 100% "reader" conforme Play Store (aucun prix/achat dans l'app).

**Livré (selon la liste des priorités V1 de CLAUDE.md), tout commité (`3dc548c`) :**
1-10 : Setup Expo/Supabase/Git, Auth admin, accès visiteur par lien/token ou code dossier, calendrier + créneaux + réservation + PIN, galerie Souvenirs, Nouvelles du jour, Entraide + Mur de soutien (avec case "je m'en occupe déjà" à la création), 6 thèmes + photo patient, "Prochaine disponibilité", ajout créneau au calendrier natif Android.

**Fonctionnalités livrées cette session :**
- **Fix critique** : l'édition d'une réservation admin pouvait sembler réussir (toast succès + Google Calendar mis à jour) sans être réellement écrite en base — cause racine : policies RLS UPDATE/DELETE manquantes sur `reservations` (seules SELECT/INSERT existaient, nécessaires à la réservation visiteur anonyme). Corrigé par migration `20260706_reservations_update_delete_policy.sql` (appliquée en prod, testé OK) + vérification `count` sur toutes les écritures admin (édition et suppression, créneaux et nuitées) pour détecter toute future écriture silencieusement bloquée.
- **Réservations admin multi-personnes liées** (`group_id`, migration `20260706_reservation_group_id.sql`, appliquée en prod, testé OK) : quand l'admin ajoute plusieurs personnes en une fois ("+ Ajouter une autre personne"), les lignes créées ensemble sont désormais liées. Modifier ou supprimer l'une propose une case à cocher par accompagnant : "Modifier aussi le créneau de X" / "Supprimer aussi pour X".
- **Nouvelle modale de suppression** (`components/DeleteReservationConfirm.tsx`) au design cohérent avec le reste de l'app, remplace l'`Alert.alert` natif basique, réutilisée dans Créneaux et Nuitées.
- Créneaux déjà passés dans la journée désormais non sélectionnables dans la modale d'édition admin (`isSlotPast`, en plus du blocage déjà existant sur les jours passés).
- Suppression d'une réservation → suppression de l'événement Google Calendar déjà en place et fonctionnelle (vérifié avec l'utilisateur ; seul un délai de synchro Google Calendar avait été observé, rien à corriger côté app).
- Nettoyage de 4 lignes de doublons de test en base (créneaux du 06/07 12h/13h), supprimées à la demande explicite après avoir confirmé qu'il s'agissait de données de test réelles et non d'un bug applicatif.
- **Commit global** (`3dc548c`) regroupant, à la demande explicite de l'utilisateur ("commit tout ça"), tout le travail ci-dessus **et** tout le chantier resté non commité depuis le 2026-07-04 (cap freemium, code dossier, refontes d'écrans — détail en Historique cumulé).

**En cours / pas commencé :**
- Cap freemium (8 réservations "Visite"/espace) toujours **en pause** (triggers désactivés via `20260705_pause_freemium_cap.sql`) — l'app est en phase de création/tests, pas de lancement commercial. Réactivation = `enable trigger` en SQL avant lancement.
- Fix `pg_net` non-fatal (`20260705_cap_notify_non_fatal.sql`) : migration écrite et désormais commitée dans le code, mais **pas confirmé appliqué en prod** — à vérifier/exécuter dans le SQL Editor Supabase avant toute réactivation du cap.
- Points 13-14 (EAS Build APK signé, fiche Play Store) : pas commencés.

**⚠️ Point de vigilance sécurité découvert cette session :** `.env` est **tracké dans git** (visible via `git ls-files`) alors que `.gitignore` et CLAUDE.md l'interdisent explicitement — la clé anon/publishable Supabase (`VITE_SUPABASE_KEY`) est donc présente dans l'historique git. Pas corrigé (décision utilisateur nécessaire : repo privé ou public ? faut-il `git rm --cached .env` + purge d'historique ?).

## Historique cumulé
- Lots 1-10 (fonctionnalités de base) livrés et commités au fil de sessions antérieures (voir `git log`).
- 2026-07-04/05 : chantier `dossier_code` + cap freemium (8 visites) + PIN visiteur sécurisé, infra Supabase déployée en prod puis cap **mis en pause** (phase de tests, pas de lancement commercial) ; fix `pg_net` non-fatal préparé. Resté **non commité** jusqu'à cette session.
- 2026-07-06 (session précédente) : popup "Modifier la réservation" admin + refonte `MiniCalendar` synoptique, commité `561870d`.
- 2026-07-06 (cette session) : fix critique RLS UPDATE/DELETE sur `reservations`, cascade modifier/supprimer accompagnants (`group_id`), modale de suppression restylée, filtrage créneaux passés, nettoyage doublons de test, puis **commit global `3dc548c`** regroupant tout le travail non commité depuis le 04/07.
- Ancienne trace `HANDOFF_migration_auth.md` (racine, committé) : chantier "migration Supabase Auth visiteur" abandonné en amont, conservé pour mémoire historique uniquement.

## 1. Objectif de la session
Corriger un bug critique de persistance des modifications de réservation admin (silencieusement bloquées en base malgré un succès apparent), traiter un signalement de doublon de réservation et bloquer la modification des créneaux déjà passés, puis ajouter une fonctionnalité de cascade modifier/supprimer pour les réservations admin multi-personnes liées, avec une modale de suppression au design amélioré. Enfin, committer l'ensemble du travail en attente sur la branche.
État "done" : bug de persistance corrigé et vérifié en prod par l'utilisateur, cascade modifier/supprimer fonctionnelle et testée, modale de suppression restylée, créneaux passés bloqués, synchro suppression↔Google Calendar confirmée fonctionnelle, tout committé (`3dc548c`).

## 2. État actuel
**Fonctionne et vérifié par l'utilisateur en prod :**
- Édition/suppression de réservation admin : persistée en base de façon fiable (policies RLS + vérification `count`).
- Cascade "Modifier aussi / Supprimer aussi pour [accompagnant]" sur les réservations admin liées par `group_id`.
- Modale de suppression restylée (`DeleteReservationConfirm.tsx`), avec cases à cocher accompagnants.
- Filtrage des créneaux déjà passés dans la modale d'édition admin.
- Suppression Google Calendar liée à la suppression d'une réservation (déjà en place, confirmé fonctionnel).

**Dernière action avant ce handoff :** commit `3dc548c` (« feat: cap freemium + code dossier, réservations groupées et fiabilisation RLS »), puis génération de ce handoff.

## 3. Fichiers concernés
- `supabase/migrations/20260706_reservations_update_delete_policy.sql` → policies RLS UPDATE/DELETE sur `reservations` (appliquée en prod).
- `supabase/migrations/20260706_reservation_group_id.sql` → colonne `group_id` (appliquée en prod).
- `components/AdminEditReservation.tsx` → vérification `count` sur l'update, cases de cascade "Modifier aussi", filtrage des créneaux passés (`isSlotPast`).
- `components/DeleteReservationConfirm.tsx` (nouveau) → modale de suppression restylée avec cascade accompagnants.
- `components/AdminAddReservation.tsx` → pose du `group_id` après insertion multi-personnes.
- `app/(admin)/home/slots.tsx`, `app/(admin)/home/nights.tsx` → suppression via la nouvelle modale (`deleteRef` + `handleConfirmDelete`), vérification `count`, blocage "Modifier" sur créneau déjà passé du jour même.
- `lib/types.ts` → champ `group_id` ajouté à `Reservation`.
- `lib/calendarSync.ts`, `lib/slotUtils.ts` → lus/consultés (isSlotPast déjà existant, réutilisé).
- Tout le reste du diff commité (`Handoff/`, `CapBlockScreen.tsx`, `lib/dossierCode.ts`, `lib/freemiumCap.ts`, `lib/visitorEntry.ts`, migrations `202607*` cap/dossier, écrans admin/visiteur) → chantier de sessions antérieures (2026-07-04/05), non retouché cette session, simplement inclus dans le commit global à la demande de l'utilisateur.

## 4. Ce qui a échoué
- Le "doublon de réservation" signalé sur les créneaux du 06/07 12h/13h n'était **pas un bug logiciel** : requête directe en base (via l'API REST Supabase avec la clé anon de l'app) a confirmé 4 lignes réellement distinctes, créées à quelques minutes d'intervalle par des tests manuels répétés de l'utilisateur — pas une race condition (le bouton "Réserver" est déjà protégé par `disabled={validPeople.length === 0 || saving}`). Supprimées directement à la demande explicite.
- Erreur d'outil mineure sans conséquence : un `Edit` sur `AdminEditReservation.tsx` a échoué une fois car le texte cherché datait d'avant une édition précédente dans la même session — corrigé en relisant le fichier avant de réappliquer l'édit.

## 5. Prochaine étape
1. Vérifier si `20260705_cap_notify_non_fatal.sql` (fix `pg_net` non-fatal) a réellement été appliqué en prod ; sinon l'exécuter dans le SQL Editor Supabase avant toute réactivation du cap freemium.
2. Décider du sort du `.env` commité dans l'historique git (`git rm --cached .env` + éventuelle purge d'historique si le repo est ou doit devenir public).
3. Avant tout lancement commercial : réactiver le cap freemium (`enable trigger` dans `20260705_pause_freemium_cap.sql`).
4. Reprendre la roadmap points 13-14 (EAS Build → APK signé, fiche Play Store) quand prêt.
