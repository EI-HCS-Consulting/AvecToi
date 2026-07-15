# Handoff — AvecToi
_Généré le : 2026-07-15_

## État global du projet

**Stack :** React Native + Expo SDK 51+, Expo Router, Supabase (BDD/Auth/Storage/Realtime/Edge Functions), EAS Build + EAS Update (channels development/preview/production, `expo-updates` installé, build "development" avec client de dev connecté au Metro local — un reload suffit pour voir les changements JS sans passer par `eas update`). expo-notifications, expo-calendar, expo-image-picker. Resend (transactionnel) branché sur les Edge Functions. Stripe côté web uniquement (avectoi.care), app 100% "reader" conforme Play Store.

**Repo GitHub :** `https://github.com/EI-HCS-Consulting/AvecToi`, branche `main` protégée par ruleset (PR obligatoire). `gh` CLI authentifié (compte `EI-HCS-Consulting`). `main` local à jour avec `origin/main` (`d87e6ad`).

**Branches ouvertes sur `origin` :**
- `main`
- `docs/spec-web-upgrade` — non mergée, en attente depuis plusieurs sessions, laissée en attente sur décision explicite de l'utilisateur (statut inchangé, à reclarifier un jour).
- `feat/merge-companion-reservations` — **déjà mergée** (PR #30, cette session) mais pas encore supprimée sur origin (attendre une demande explicite avant nettoyage, comme convenu précédemment).
- `feat/settings-visitors-block`, `fix/visitor-profiles-photo-sync` — déjà mergées lors de sessions antérieures, toujours pas supprimées sur origin (même règle : nettoyage sur demande explicite seulement).

**Livré (V1, CLAUDE.md points 1-10) :** setup Expo/Supabase/Git, Auth admin, accès visiteur, calendrier + créneaux + réservation + PIN, galerie Souvenirs, Nouvelles du jour, Entraide + Mur de soutien, 6 thèmes + mode Dark/Light par compte, "Prochaine disponibilité", ajout calendrier natif Android, RLS, accompagnants, parité admin/visiteur "Mon compte", autofill Google Maps, onboarding séquencé + partage freemium débloqué, cap freemium à granularité fine, Paramètres en 4 sections avec historique, granularité minute horaires, emails réservation/annulation (Resend), fiche patient + profils visiteurs, Dark/Light aligné visuellement sur "Mode de soin", Entraide filtres + fermeture auto des besoins, secteur hospitalier synchronisé/exclu de l'adresse affichée, bloc "Visiteurs" dans Paramètres (photos + identités, y compris la photo de l'admin), sync photo visiteur réparée (RLS), bandeau (SpaceHeader) reformaté, popups harmonisées au style modal de l'app, consignes de visite saisissables dès l'onboarding, phrase totem du patient, **phrase totem étendue à l'admin et au visiteur (éditable dans "Mon compte", visible dans le bloc Visiteurs)**, **réservations avec accompagnants fusionnées en une seule ligne dans "Mes contributions" (admin)**, **libellés "Mes contributions" harmonisés entre Admin et Visiteur**.

**En cours / pas commencé :**
- Points 11-12 (notifications push rappel, RGPD purge auto J-7) : livrés lors de sessions antérieures, pas re-testés récemment.
- Points 13-14 (EAS Build APK signé, fiche Play Store) : pas commencés.
- Branche `docs/spec-web-upgrade` : toujours en attente.
- Cap freemium (réactivé) jamais testé en conditions réelles avec un espace non-premium existant en prod.
- Fusion des réservations en groupe (admin) : câblée et vérifiée par `tsc`, mais pas encore testée manuellement en conditions réelles (créer une résa avec accompagnant en admin, vérifier l'affichage groupé).
- 3 branches mergées à nettoyer sur origin (voir ci-dessus, sur demande explicite).

## Historique cumulé
- Lots 1-10 (fonctionnalités de base) livrés au fil de sessions antérieures.
- 2026-07-04 → 07-13 : `dossier_code`, cap freemium, PIN visiteur sécurisé, refonte Paramètres 4 sections, historique + recasage auto + alertes, fix horloges Android + infra EAS Update, granularité minute horaires, Resend de bout en bout, fiche patient + profils visiteurs, mode Dark/Light + sweep exhaustif textes blancs/bordures (PR #7-#23, mergées).
- 2026-07-14 : fix largeur boutons fiche patient, Dark/Light aligné sur "Mode de soin", filtres Entraide + fermeture auto, secteur hospitalier synchronisé/exclu de l'adresse, bloc "Visiteurs" dans Paramètres, popups/barres relevés de la nav système (PR #24-#28, mergées).
- 2026-07-15 (session n-1) : diagnostic + fix RLS `visitor_profiles` (photo visiteur bloquée), photo admin dans le bloc Visiteurs, logo calendrier redimensionné, bandeau hôpital reformaté, popups "Supprimer la photo ?"/"Suivre un autre espace ?" harmonisées, bug consignes de visite (champ manquant) corrigé, phrase totem du patient (PR #29, mergée).
- 2026-07-15 (cette session) : voir détail ci-dessous.

## 1. Objectif de la session
Deux demandes utilisateur enchaînées : (1) étendre la "phrase totem", jusque-là réservée au patient, à l'admin et au visiteur (éditable dans "Mon compte" pour chacun, visible aussi dans le bloc Visiteurs des Paramètres) ; (2) quand une réservation est prise avec un ou plusieurs accompagnants, les regrouper en une seule entrée dans "Mes contributions" côté admin (au lieu d'une ligne par personne), sans toucher à l'affichage individuel dans la fiche visiteur de chacun — et harmoniser au passage les libellés des onglets "Mes contributions" entre Admin et Visiteur.
État "done" : atteint pour les deux — PR #30 mergée dans `main`. Reste un test manuel en conditions réelles à faire pour la fusion des réservations groupées (voir section 5).

## 2. État actuel

**Fait cette session (chronologique) :**

**A. Phrase totem pour admin et visiteur**
- Confirmé avec l'utilisateur (`AskUserQuestion`) que les phrases totem admin/visiteur devaient aussi être visibles dans le bloc Visiteurs des Paramètres, pas seulement privées à "Mon compte".
- **Patient** (déjà existant, inchangé) : `patient_motto` sur `patient_spaces`. Ajout cette session d'un champ éditable dans la fiche patient (Paramètres, modal "Profil patient"), dans le même bloc que la photo — jusqu'ici la phrase n'était saisissable qu'à l'onboarding.
- **Admin** : nouveau champ `motto` dans `auth.users.user_metadata` (pas de table dédiée). Édité via le modal "Mon profil (Admin)" (`app/(admin)/account.tsx`), affiché sous le nom sur la carte de profil.
- **Visiteur** : nouvelle colonne `motto` sur `visitor_profiles` (migration `20260715_visitor_profiles_motto.sql`, appliquée manuellement par l'utilisateur via le Dashboard Supabase — CLI toujours bloquée sur cette machine). Édité dans "Mon compte" (`app/(visitor)/account.tsx`), persisté en session locale (`lib/visitorSession.ts`) et synchronisé best-effort vers `visitor_profiles` (upsert `onConflict: "space_id,prenom,nom"`, fonction dédiée `syncProfileMotto` pour ne pas écraser la photo lors de l'upsert).
- `components/VisitorsBlock.tsx` : la requête `visitor_profiles` inclut désormais `motto` en plus de `photo` ; l'admin (dont la phrase vit dans `user_metadata`, pas dans `visitor_profiles`) est traité au même titre que les visiteurs dans la boucle d'agrégation.
- `components/VisitorProfileModal.tsx` (fiche visiteur individuelle) volontairement **non modifiée** — la question de l'utilisateur portait sur le bloc Visiteurs, pas sur cette fiche.
- Style repris à l'identique du patient : police `Caveat_600SemiBold`, couleur fixe `#7EC8E3` (ni token de thème, ni variante Dark/Light).
- Testé par l'utilisateur ("c'est ok !"), commité sur `feat/phrase-totem-tous-profils` (`8afb7d8`).

**B. Fusion des réservations groupées + harmonisation des libellés**
- Confirmé la structure des données : une réservation avec accompagnant(s) insère une ligne par personne (`components/BookingFlow.tsx` côté visiteur, `components/AdminAddReservation.tsx` côté admin), reliées après coup par `group_id = id de la première ligne insérée` (`.update({ group_id: ids[0] }).in("id", ids)`). La ligne "cheffe de file" est donc identifiable de façon fiable via `r.id === r.group_id`.
- Côté visiteur (`app/(visitor)/account.tsx`), le problème ne se posait pas : chaque visiteur ne voit que ses propres réservations (filtrées par identité), donc une seule ligne par personne de toute façon — les accompagnants y sont déjà listés en sous-texte ("Avec X, Y") via `companionsByGroup`. Aucun changement nécessaire ici.
- Côté admin (`app/(admin)/account.tsx`), "Mes contributions → Réservations" liste **toutes** les réservations de l'espace sans filtre d'identité : un groupe de 3 personnes y apparaissait donc en 3 lignes distinctes. Fix : nouveau `useMemo` `reservationGroups` qui regroupe le tableau `reservations` par `group_id` (repli sur `r.id` pour les réservations sans accompagnant), calcule la ligne "cheffe de file" et la liste des accompagnants, et le rendu affiche désormais une seule ligne par groupe ("Prénom Nom · Avec X, Y"). Le compteur de l'onglet reflète maintenant le nombre de réservations (groupes), plus le nombre de personnes.
- Harmonisation des libellés `CONTRIB_META` (admin) sur `SECTION_META` (visiteur) : Réservations → **Mes réservations**, Nouvelles → **Mes nouvelles**, Besoins → **Entraide** ; Soutien inchangé des deux côtés.
- `npx tsc --noEmit -p .` : aucune nouvelle erreur (mêmes erreurs préexistantes Edge Functions Deno / `lib/notifications.ts` que d'habitude).
- Commité sur nouvelle branche `feat/merge-companion-reservations` (`8f7be37`, au-dessus de `8afb7d8`), poussée, PR #30 ouverte puis mergée par l'utilisateur.

**Dernière action avant ce handoff :** `main` local resynchronisé en fast-forward avec `origin/main` (`d87e6ad`) après le merge de la PR #30.

## 3. Fichiers concernés
- `supabase/migrations/20260715_visitor_profiles_motto.sql` (nouveau) → colonne `motto text` sur `visitor_profiles`, appliquée en prod.
- `lib/types.ts` → `VisitorProfile.motto: string | null`.
- `lib/visitorSession.ts` → `motto` ajouté à `VisitorSession` et à `saveVisitorSession`.
- `app/(visitor)/account.tsx` → champ "Ma phrase totem" dans "Mon compte", fonction `syncProfileMotto`, affichage sous le nom d'identité.
- `app/(admin)/account.tsx` → champ "Phrase totem" dans le modal "Mon profil (Admin)" (`user_metadata.motto`), affichage sur la carte de profil ; **et** cette session : `reservationGroups` (regroupement par `group_id`), rendu fusionné de l'onglet Réservations, libellés `CONTRIB_META` harmonisés.
- `app/(admin)/settings.tsx` → champ "Phrase totem" dans la fiche patient (modal Profil patient), même bloc que la photo.
- `components/VisitorsBlock.tsx` → `motto` ajouté à `VisitorRow`, requête et affichage (visiteurs + admin).
- `components/PatientOnboarding.tsx` → grep uniquement (référence de style), non modifié.
- `components/VisitorProfileModal.tsx` → volontairement non modifié (hors scope, cf. section 2A).

## 4. Ce qui a échoué
- Rien n'a été abandonné/retenté cette session.
- Erreur auto-corrigée (pas remontée par l'utilisateur) : premier essai du champ "Phrase totem" patient dans `app/(admin)/settings.tsx` avec le mauvais style (`styles.notesInput`, multiline `minHeight:100`, pensé pour les allergies) ; corrigé en `styles.sectorInput` (style single-line déjà utilisé pour Service/Secteur/Chambre) après vérification.
- Rappel opérationnel confirmé une fois de plus : Supabase CLI bloquée sur cette machine (Windows App Control Policy) — toute migration SQL doit être appliquée manuellement par l'utilisateur via le Dashboard Supabase.
- Point de vigilance non résolu (pas un échec, un report) : un `git push origin main` direct a été tenté en tout début de session pour pousser un commit de handoff en attente ; bloqué par le classifieur auto-mode de Claude Code (poussée directe sur la branche par défaut sans autorisation explicite pour ce push précis). Non retenté — le travail de cette session est passé par PR (#30) comme d'habitude, donc sans impact, mais le commit `617ddb9` était resté local jusqu'au merge de cette session (main est maintenant à jour de toute façon via le fast-forward).

## 5. Prochaine étape
1. **Tester manuellement en conditions réelles la fusion des réservations groupées** : créer une réservation avec 1-2 accompagnants côté admin (`AdminAddReservation`), vérifier que "Mes contributions → Mes réservations" affiche bien une seule ligne "Prénom Nom · Avec X, Y", et que la fiche visiteur de chaque accompagnant continue d'afficher sa propre réservation individuellement (non régressée).
2. Tester en conditions réelles les 3 phrases totem (patient déjà fait, admin/visiteur confirmés fonctionnels par l'utilisateur mais pas en usage prolongé).
3. Nettoyer sur origin les branches mergées (`feat/merge-companion-reservations`, `feat/settings-visitors-block`, `fix/visitor-profiles-photo-sync`) — sur demande explicite.
4. Décider du sort de `docs/spec-web-upgrade`.
5. Tester le cap freemium en conditions réelles ; revalider points 11-12 (notifications push, purge RGPD J-7).
6. Reprendre la roadmap points 13-14 (EAS Build → APK signé, fiche Play Store).
