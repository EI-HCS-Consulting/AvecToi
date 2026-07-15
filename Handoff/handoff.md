# Handoff — AvecToi
_Généré le : 2026-07-15_

## État global du projet

**Stack :** React Native + Expo SDK 51+, Expo Router, Supabase (BDD/Auth/Storage/Realtime/Edge Functions), EAS Build + EAS Update (channels development/preview/production, `expo-updates` installé, build "development" avec client de dev connecté au Metro local — un reload suffit pour voir les changements JS sans passer par `eas update`). expo-notifications, expo-calendar, expo-image-picker. Resend (transactionnel) branché sur les Edge Functions. Stripe côté web uniquement (avectoi.care), app 100% "reader" conforme Play Store.

**Repo GitHub :** `https://github.com/EI-HCS-Consulting/AvecToi`, branche `main` protégée par ruleset (PR obligatoire). `gh` CLI authentifié (compte `EI-HCS-Consulting`). `main` local à jour avec `origin/main` (`703bb2e`).

**Branches ouvertes sur `origin` :**
- `main`
- `docs/spec-web-upgrade` — non mergée, en attente depuis plusieurs sessions, laissée en attente sur décision explicite de l'utilisateur (statut inchangé, à reclarifier un jour).
- `feat/settings-visitors-block`, `fix/visitor-profiles-photo-sync` — **déjà mergées** (PR #28, #29, cette session et la précédente) mais pas encore supprimées sur origin (attendre une demande explicite avant nettoyage, comme convenu précédemment).

**Livré (V1, CLAUDE.md points 1-10) :** setup Expo/Supabase/Git, Auth admin, accès visiteur, calendrier + créneaux + réservation + PIN, galerie Souvenirs, Nouvelles du jour, Entraide + Mur de soutien, 6 thèmes + mode Dark/Light par compte, "Prochaine disponibilité", ajout calendrier natif Android, RLS, accompagnants, parité admin/visiteur "Mon compte", autofill Google Maps, onboarding séquencé + partage freemium débloqué, cap freemium à granularité fine, Paramètres en 4 sections avec historique, granularité minute horaires, emails réservation/annulation (Resend), fiche patient + profils visiteurs, Dark/Light aligné visuellement sur "Mode de soin", Entraide filtres + fermeture auto des besoins, secteur hospitalier synchronisé/exclu de l'adresse affichée, **bloc "Visiteurs" dans Paramètres (photos + identités, y compris la photo de l'admin)**, **sync photo visiteur réparée (RLS)**, **bandeau (SpaceHeader) : logo sans photo redimensionné, adresse hôpital sur 2-3 lignes centrées**, **popups "Supprimer la photo ?" et "Suivre un autre espace ?" harmonisées au style modal de l'app**, **consignes de visite saisissables dès l'onboarding**, **phrase totem optionnelle du patient (police manuscrite, fiche patient + bandeau)**.

**En cours / pas commencé :**
- Points 11-12 (notifications push rappel, RGPD purge auto J-7) : livrés lors de sessions antérieures, pas re-testés récemment.
- Points 13-14 (EAS Build APK signé, fiche Play Store) : pas commencés.
- Branche `docs/spec-web-upgrade` : toujours en attente.
- Cap freemium (réactivé) jamais testé en conditions réelles avec un espace non-premium existant en prod.
- 2 branches mergées à nettoyer sur origin (voir ci-dessus, sur demande explicite).

## Historique cumulé
- Lots 1-10 (fonctionnalités de base) livrés au fil de sessions antérieures.
- 2026-07-04 → 07-13 : `dossier_code`, cap freemium, PIN visiteur sécurisé, refonte Paramètres 4 sections, historique + recasage auto + alertes, fix horloges Android + infra EAS Update, granularité minute horaires, Resend de bout en bout, fiche patient + profils visiteurs, mode Dark/Light + sweep exhaustif textes blancs/bordures (PR #7-#23, mergées).
- 2026-07-14 (session n-2) : fix largeur boutons Jour/Mois/Année fiche patient (PR #24), Dark/Light aligné sur "Mode de soin", filtres Entraide + fermeture auto des besoins, secteur hospitalier synchronisé/exclu de l'adresse (PR #25-#27, mergées).
- 2026-07-14 (session n-1) : bloc "Visiteurs" dans Paramètres (photos + identités), popups/barres relevés de la nav système (PR #28, mergée).
- 2026-07-15 (cette session) : voir détail ci-dessous.

## 1. Objectif de la session
Suite directe de la session précédente (bloc Visiteurs) : (1) diagnostiquer puis corriger l'échec de sauvegarde de la photo visiteur (erreur 42501) ; (2) ajouter la photo de l'admin dans le bloc Visiteurs ; (3) corriger le logo surdimensionné sur l'écran calendrier sans photo patient ; (4) reformater l'affichage hôpital/service/chambre du bandeau sur 2-3 lignes centrées ; (5) harmoniser au style modal de l'app les popups "Supprimer la photo ?" et "Suivre un autre espace ?" (auparavant des `Alert.alert` natifs) ; (6) vérifier/corriger le flux des consignes de visite (saisie à l'onboarding + édition dans Paramètres) ; (7) ajouter une "phrase totem" optionnelle pour le patient, saisie à l'étape 1 de création d'espace, affichée en police manuscrite bleu clair (couleur fixe Light/Dark) dans la fiche patient et le bandeau.
État "done" : atteint pour tout — PR #29 mergée dans `main`.

## 2. État actuel

**Fait cette session (chronologique) :**
- **Diagnostic photo visiteur manquante** : ajout de logs d'erreur (`console.error`) sur le chemin d'écriture (`syncProfilePhoto`, `app/(visitor)/account.tsx`) et de lecture (`components/VisitorsBlock.tsx`), tous deux avalaient silencieusement leurs erreurs auparavant.
- **Root cause confirmée par test utilisateur** : `visitor_profiles` avait RLS activé mais **aucune policy table** (la migration d'origine `20260713_visitor_profiles.sql` ne posait que des policies sur le bucket Storage, jamais sur la table SQL) → upsert bloqué avec `42501`.
- **Fix** : nouvelle policy `FOR ALL USING (true) WITH CHECK (true)` sur `visitor_profiles`, appliquée manuellement par l'utilisateur via le Dashboard Supabase (CLI bloquée sur cette machine) ; migration `supabase/migrations/20260714_visitor_profiles_rls_policies.sql` réécrite pour refléter exactement ce qui a été appliqué en prod. Confirmé fonctionnel par test utilisateur.
- **Photo admin dans le bloc Visiteurs** (`components/VisitorsBlock.tsx`, `app/(admin)/settings.tsx`) : l'admin est traité comme un membre de la famille visiteur à part entière — nouveaux props `adminFirstname`/`adminLastname`, photo lue depuis `user_metadata.photo_url` (système de stockage admin, distinct du système `visitor_profiles`/bucket `visitor-photos` des visiteurs).
- **Logo calendrier sans photo trop grand** (`components/SpaceHeader.tsx`) : nouveau style `logoWrapNoPhoto` (96×96 au lieu de 140×140, marge positive au lieu du chevauchement négatif pensé pour la variante avec photo) — ne recouvre plus le titre "Visites [prénom]".
- **Bandeau hôpital reformaté** (`components/SpaceHeader.tsx`) : `serviceRoom` affiche désormais "Service [X] · Chambre [Y]" (secteur retiré, déjà visible ailleurs et redondant) ; 2 lignes visées (nom hôpital + service/chambre), 3e ligne en wrap naturel si nom d'hôpital long.
- **Popups harmonisées** (`app/(admin)/account.tsx`, `app/(visitor)/account.tsx`, `app/(admin)/settings.tsx`) : les 3 confirmations natives (`Alert.alert`) — "Supprimer la photo ?" (photo admin ET photo patient, 2 emplacements distincts) et "Suivre un autre espace ?" — remplacées par les modales stylées déjà utilisées ailleurs dans l'app (state unifié type `"logout" | "removePhoto" | null"` ou équivalent selon l'écran, branchement de l'icône/titre/couleur de bouton selon le cas).
- **Consignes de visite — bug trouvé et corrigé** (`components/PatientOnboarding.tsx`) : le champ `visitRules` était déclaré et envoyé à la création d'espace, mais **aucun `TextInput` n'existait pour le saisir** (`setVisitRules` jamais appelé nulle part) → toujours vide en base à la création. Ajout d'un `TextInput` multiline dans l'étape "Capacité" du wizard (choix confirmé par l'utilisateur via question explicite). Vérifié par ailleurs que `Accueil / Infos` affichait déjà correctement "Consignes de visite" (règles générées) puis "Informations" (texte libre `visit_rules`) juste en dessous — aucun changement nécessaire côté affichage, l'architecture décrite par l'utilisateur était déjà en place.
- **Phrase totem du patient** (nouvelle feature) :
  - `@expo-google-fonts/caveat` installé, police `Caveat_600SemiBold` enregistrée dans `app/_layout.tsx`.
  - Colonne `patient_motto text` ajoutée à `patient_spaces` (migration `20260715_patient_motto.sql`, appliquée manuellement par l'utilisateur via le Dashboard).
  - `lib/types.ts` : `PatientSpace.patient_motto: string | null`.
  - `components/PatientOnboarding.tsx` : nouveau champ optionnel sur l'étape "Patient" (1/4), placeholder d'exemple "Aimer c'est Agir !", state `patientMotto` câblé jusqu'à l'insert (`patient_motto: patientMotto.trim() || null`).
  - `components/PatientProfileModal.tsx` (fiche patient partagée admin/visiteur) et `components/SpaceHeader.tsx` (sous le titre "Visites [prénom]") : affichage conditionnel de la phrase, police `Caveat_600SemiBold`, couleur fixe `#7EC8E3` (identique Light/Dark, pas de token de thème).
- `npx tsc --noEmit -p .` exécuté : aucune nouvelle erreur introduite (les erreurs préexistantes concernent uniquement les Edge Functions Deno et `lib/notifications.ts`, non liées à cette session).
- Tout le travail accumulé sur la branche `fix/visitor-profiles-photo-sync` (créée initialement pour le seul fix RLS, a fini par porter l'ensemble des demandes de la session) commité en un seul commit groupé, poussé, PR #29 ouverte puis mergée par l'utilisateur.

**Dernière action avant ce handoff :** `main` local synchronisé avec `origin/main` (`703bb2e`) après le merge de la PR #29.

## 3. Fichiers concernés
- `supabase/migrations/20260714_visitor_profiles_rls_policies.sql` (nouveau) → policy RLS `FOR ALL` manquante sur `visitor_profiles`, appliquée en prod.
- `app/(visitor)/account.tsx` → logs d'erreur sur `syncProfilePhoto` (storage + upsert), popup "Suivre un autre espace ?" harmonisée (state unifié avec "Se déconnecter ?").
- `components/VisitorsBlock.tsx` → log d'erreur sur le select, props `adminFirstname`/`adminLastname`, admin inclus comme identité + photo depuis `user_metadata.photo_url`.
- `app/(admin)/settings.tsx` → passage des props admin à `VisitorsBlock`, popup "Supprimer la photo ?" (photo patient) harmonisée en modale bottom-sheet.
- `app/(admin)/account.tsx` → popup "Supprimer la photo ?" (photo admin) et "Se déconnecter ?" harmonisées (state unifié `"logout" | "removePhoto" | null`).
- `components/SpaceHeader.tsx` → `logoWrapNoPhoto` (logo redimensionné sans photo), `serviceRoom` reformaté "Service X · Chambre Y", affichage de `patient_motto` sous le titre.
- `components/PatientOnboarding.tsx` → `TextInput` "Consignes de visite" (étape Capacité) et "Phrase totem" (étape Patient), states `visitRules`/`patientMotto` câblés jusqu'à l'insert.
- `components/PatientProfileModal.tsx` → affichage de `patient_motto` sous le nom (police `Caveat_600SemiBold`, couleur fixe).
- `lib/types.ts` → `PatientSpace.patient_motto: string | null`.
- `supabase/migrations/20260715_patient_motto.sql` (nouveau) → colonne `patient_motto text`, appliquée en prod.
- `app/_layout.tsx` → police `Caveat_600SemiBold` enregistrée via `useFonts`.
- `package.json`/`package-lock.json` → dépendance `@expo-google-fonts/caveat` ajoutée.

## 4. Ce qui a échoué
- Rien n'a été abandonné/retenté cette session. Seule confusion notable côté utilisateur (pas un échec technique) : premier test de la sync photo fait avec la photo **admin** (système différent, jamais câblé dans le bloc Visiteurs) plutôt que la photo **visiteur** — clarifié en distinguant les deux systèmes de stockage (photo admin = `user_metadata.photo_url` + bucket `admin-photos` ; photo visiteur = table `visitor_profiles` + bucket `visitor-photos`), puis résolu en ajoutant la photo admin comme feature demandée séparément.
- Rappel valable pour la suite : ne pas supposer qu'une policy RLS existe sur une table simplement parce qu'une migration a créé un bucket Storage — les deux sont des mécanismes de permission entièrement séparés dans Supabase.

## 5. Prochaine étape
1. Demander à l'utilisateur de tester en conditions réelles l'ensemble des changements de cette session sur un usage prolongé (photo visiteur, photo admin, popups, consignes de visite, phrase totem) — déjà fait ponctuellement pendant la session mais pas en usage étendu.
2. Nettoyer sur origin les 2 branches mergées (`feat/settings-visitors-block`, `fix/visitor-profiles-photo-sync`) — sur demande explicite.
3. Décider du sort de `docs/spec-web-upgrade`.
4. Tester le cap freemium en conditions réelles ; revalider points 11-12 (notifications push, purge RGPD J-7).
5. Reprendre la roadmap points 13-14 (EAS Build → APK signé, fiche Play Store).
