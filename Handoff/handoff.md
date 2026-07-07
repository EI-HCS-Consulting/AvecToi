# Handoff — AvecToi
_Généré le : 2026-07-07_

## État global du projet

**Stack :** React Native + Expo SDK 51+, Expo Router, Supabase (BDD/Auth/Storage/Realtime/Edge Functions), EAS Build, expo-notifications, expo-calendar, expo-image-picker. Stripe côté web uniquement (avectoi.care), app 100% "reader" conforme Play Store (aucun prix/achat dans l'app).

**Repo GitHub :** `https://github.com/EI-HCS-Consulting/AvecToi`, branche `main` protégée par ruleset (PR obligatoire). Tout le travail de cette session est **en cours sur `main` en local, non commité** (pas de demande de commit reçue) — à mettre sur une branche `feature/...` avant de committer, conformément à la règle du projet.

**Livré (V1, CLAUDE.md points 1-10) :** setup Expo/Supabase/Git, Auth admin, accès visiteur (lien/token ou code dossier), calendrier + créneaux + réservation + PIN, galerie Souvenirs, Nouvelles du jour, Entraide + Mur de soutien, 6 thèmes, "Prochaine disponibilité", ajout calendrier natif Android, RLS UPDATE/DELETE + cascade `group_id`, onglet Nuits scindé "programmées/effectuées" avec édition admin réutilisant `AdminEditReservation`, traçabilité "Programmé par" quand un visiteur réserve pour un tiers, identification visiteur stable à l'entrée dans l'espace.

**En cours / pas commencé :**
- Cap freemium (8 résa "Visite"/espace) toujours **en pause** (`20260705_pause_freemium_cap.sql`) — réactiver avant lancement commercial.
- Fix `pg_net` non-fatal : **confirmé appliqué en prod**.
- Migration `20260707_reservations_booked_by.sql` : **exécutée par l'utilisateur, confirmée**.
- Tout le code de cette session (voir section 3) : à committer/brancher/PR.
- Points 13-14 (EAS Build APK signé, fiche Play Store) : pas commencés.

## Historique cumulé
- Lots 1-10 (fonctionnalités de base) livrés au fil de sessions antérieures.
- 2026-07-04/05 : `dossier_code` + cap freemium (pause) + PIN visiteur sécurisé.
- 2026-07-06 : popup "Modifier la réservation" admin, refonte `MiniCalendar`, fix RLS UPDATE/DELETE + cascade `group_id`, migration du repo GitHub suite à l'exposition de `.env`/clé anon (nouveau repo sans historique compromis, ruleset + secret scanning activés, Vercel reconnecté).
- 2026-07-07 (cette session) : vérification pg_net, fix règles de visite (migration jours/dates), corrections texte/affichage, refonte de l'onglet Nuits (admin + visiteur), traçabilité "Programmé par", passage à une identification visiteur stable et non réécrite.

## 1. Objectif de la session
Reprendre le développement fonctionnel après la migration du repo : vérifier des fixes déjà en prod, corriger plusieurs bugs/textes mineurs, refondre l'onglet Nuits pour afficher toutes les réservations de tous les visiteurs avec édition admin, ajouter une traçabilité "Programmé par" quand un visiteur réserve pour quelqu'un d'autre, et enfin refondre le modèle d'identification visiteur pour qu'il soit stable dès l'entrée dans l'espace plutôt que déduit de la dernière réservation faite.
État "done" : identification visiteur stable en place et testée, traçabilité "Programmé par" fonctionnelle des deux côtés (Nuits + Créneaux), migration SQL exécutée en prod.

## 2. État actuel
**Fonctionne et vérifié :**
- Fix `pg_net` non-fatal : confirmé appliqué en prod (vérifié via `pg_get_functiondef`).
- Migration `allowed_weekdays`/`blocked_dates`/`gap_includes_duration` sur `slot_config` : exécutée, "Règles de visite" avec date bloquée s'enregistre sans erreur.
- Textes "Un créneau toutes les heures" (au lieu de "toutes les 1h") et header ville/pays sur une ligne : en place.
- Onglet Nuits (admin + visiteur) : scindé "Nuitées programmées" (à venir, tri croissant) / "Nuitées effectuées" (passées, tri décroissant, lecture seule) ; côté admin, bouton "Modifier" (remplace la croix de suppression) ouvre `AdminEditReservation` (calendrier vert/rouge, pas de créneau horaire, bouton supprimer, Annuler/Valider).
- Traçabilité "Programmé par" : migration `20260707_reservations_booked_by.sql` exécutée et confirmée. `BookingFlow.tsx` détecte si le prénom/nom saisis diffèrent de l'identité de session et alimente `booked_by_prenom`/`booked_by_nom` ; affiché sous le nom dans `(admin)/home/nights.tsx` et `(admin)/home/slots.tsx` (nuitée + créneaux).
- **Refonte identification visiteur** (dernière tâche de la session) : popup "Bienvenue !" ajoutée dans `app/(visitor)/_layout.tsx`, affichée avant même le consentement RGPD, demandant Prénom/Nom une seule fois à la première arrivée sur l'espace. Cette identité ne préremplit plus seulement — elle **n'est plus jamais réécrite** par une réservation (`BookingFlow.tsx` ne sauvegarde plus que le PIN dans la session après une résa), donc reste stable même si le visiteur réserve pour un proche (personne âgée sans téléphone, etc.).

**Dernière action avant ce handoff :** typecheck complet (`tsc --noEmit`) sans nouvelle erreur introduite ; aucune erreur pré-existante (Deno edge functions, `notifications.ts`) n'a été touchée.

**Non fait intentionnellement (hors périmètre demandé) :** les identités utilisées pour Nouvelles/Entraide/Soutien (`rememberAuthorPin`) continuent à se mettre à jour à chaque saisie, sans la même stabilité que pour les réservations — la demande portait explicitly sur les réservations.

## 3. Fichiers concernés
- `supabase/migrations/20260707_reservations_booked_by.sql` → nouvelles colonnes `booked_by_prenom`/`booked_by_nom` sur `reservations` (exécutée en prod).
- `lib/types.ts` → `Reservation` : ajout de `booked_by_prenom`/`booked_by_nom`.
- `components/BookingFlow.tsx` → détection du changement de nom à la réservation (`handleBook`) + arrêt de la réécriture du prénom/nom de session après une résa.
- `app/(visitor)/_layout.tsx` → popup d'identification "Bienvenue !" (avant le consentement RGPD), état `identityKnown`, `handleSaveIdentity`.
- `app/(admin)/home/nights.tsx`, `app/(admin)/home/slots.tsx` → affichage conditionnel "Programmé par : ..." sous le nom.
- `app/(admin)/home/nights.tsx`, `app/(visitor)/home/nights.tsx` → scission "programmées"/"effectuées", bouton "Modifier" admin.
- `components/AdminEditReservation.tsx` → titre de modale dynamique ("Modifier la nuitée" vs "Modifier la réservation").
- `app/(admin)/home/info.tsx`, `app/(visitor)/home/info.tsx` → texte "Un créneau toutes les heures".
- `lib/address.ts` → `cityCountryLine()`, ville + pays sur la même ligne.
- Tout ce qui précède est **non commité**, présent en local sur `main`.

## 4. Ce qui a échoué
- Interprétation initiale erronée de "changement de nom" pour la traçabilité "Programmé par" : j'avais d'abord compris qu'il s'agissait de l'admin renommant une réservation existante via la modale d'édition. L'utilisateur a corrigé : il s'agit du **visiteur** qui remplace son propre prénom/nom préremplis par ceux d'un tiers au moment de réserver. Piste à ne pas reprendre si le sujet revient — le bon modèle est déjà implémenté.
- Aucun autre échec technique cette session (tous les `tsc --noEmit` sont passés du premier coup sur les fichiers touchés).

## 5. Prochaine étape
1. Committer le travail de cette session sur une branche dédiée (ex. `feature/nights-refonte` ou séparé en plusieurs PR par sujet) puis ouvrir une PR — rien n'est commité à ce stade.
2. Tester en conditions réelles le nouveau parcours d'identification visiteur (popup "Bienvenue !" avant consentement RGPD) sur un appareil neuf (session vide) pour confirmer l'ordre d'affichage des deux popups.
3. Avant tout lancement commercial : réactiver le cap freemium (`enable trigger` dans `20260705_pause_freemium_cap.sql`).
4. Reprendre la roadmap points 13-14 (EAS Build → APK signé, fiche Play Store) quand prêt.
