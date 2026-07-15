# Handoff — AvecToi
_Généré le : 2026-07-15_

## État global du projet

**Stack :** React Native + Expo SDK 51+, Expo Router, Supabase (BDD/Auth/Storage/Realtime/Edge Functions), EAS Build + EAS Update (channels development/preview/production, `expo-updates` installé, build "development" avec client de dev connecté au Metro local — un reload suffit pour voir les changements JS sans passer par `eas update`). expo-notifications, expo-calendar, expo-image-picker. Resend (transactionnel) branché sur les Edge Functions. Stripe côté web uniquement (avectoi.care), app 100% "reader" conforme Play Store.

**Repo GitHub :** `https://github.com/EI-HCS-Consulting/AvecToi`, branche `main` protégée par ruleset (PR obligatoire). `gh` CLI authentifié (compte `EI-HCS-Consulting`). `main` local à jour avec `origin/main` (`2aecdff`).

**Branches ouvertes sur `origin` :**
- `main`
- `docs/spec-web-upgrade` — non mergée, en attente depuis plusieurs sessions, laissée en attente sur décision explicite de l'utilisateur (statut inchangé, à reclarifier un jour).
- `feat/patient-admission-date` — **déjà mergée** (PR #31, cette session) mais pas encore supprimée sur origin.
- `feat/merge-companion-reservations`, `feat/settings-visitors-block`, `fix/visitor-profiles-photo-sync` — déjà mergées lors de sessions antérieures, toujours pas supprimées sur origin (nettoyage sur demande explicite seulement, comme convenu).

**Livré (V1, CLAUDE.md points 1-10) :** setup Expo/Supabase/Git, Auth admin, accès visiteur, calendrier + créneaux + réservation + PIN, galerie Souvenirs, Nouvelles du jour, Entraide + Mur de soutien, 6 thèmes + mode Dark/Light par compte, "Prochaine disponibilité", ajout calendrier natif Android, RLS, accompagnants, parité admin/visiteur "Mon compte", autofill Google Maps, onboarding séquencé + partage freemium débloqué, cap freemium à granularité fine, Paramètres en 4 sections avec historique, granularité minute horaires, emails réservation/annulation (Resend), fiche patient + profils visiteurs, Dark/Light aligné visuellement sur "Mode de soin", Entraide filtres + fermeture auto des besoins, secteur hospitalier synchronisé/exclu de l'adresse affichée, bloc "Visiteurs" dans Paramètres (photos + identités, y compris la photo de l'admin), sync photo visiteur réparée (RLS), bandeau (SpaceHeader) reformaté, popups harmonisées au style modal de l'app, consignes de visite saisissables dès l'onboarding, phrase totem étendue à patient/admin/visiteur (éditable partout, visible dans le bloc Visiteurs), réservations avec accompagnants fusionnées en une seule ligne dans "Mes contributions" (admin), libellés "Mes contributions" harmonisés entre Admin et Visiteur, **date d'hospitalisation optionnelle du patient (fiche patient + onboarding)**.

**En cours / pas commencé :**
- Points 11-12 (notifications push rappel, RGPD purge auto J-7) : livrés lors de sessions antérieures, pas re-testés récemment.
- Points 13-14 (EAS Build APK signé, fiche Play Store) : pas commencés.
- Branche `docs/spec-web-upgrade` : toujours en attente.
- Cap freemium (réactivé) jamais testé en conditions réelles avec un espace non-premium existant en prod.
- Fusion des réservations en groupe (admin) : câblée et vérifiée par `tsc`, mais pas encore testée manuellement en conditions réelles.
- Date d'hospitalisation : migration appliquée en prod et confirmée par l'utilisateur, mais champ pas encore testé manuellement dans l'app (édition fiche patient + onboarding).
- 4 branches mergées à nettoyer sur origin (voir ci-dessus, sur demande explicite).

## Historique cumulé
- Lots 1-10 (fonctionnalités de base) livrés au fil de sessions antérieures.
- 2026-07-04 → 07-13 : `dossier_code`, cap freemium, PIN visiteur sécurisé, refonte Paramètres 4 sections, historique + recasage auto + alertes, fix horloges Android + infra EAS Update, granularité minute horaires, Resend de bout en bout, fiche patient + profils visiteurs, mode Dark/Light + sweep exhaustif textes blancs/bordures (PR #7-#23, mergées).
- 2026-07-14 : fix largeur boutons fiche patient, Dark/Light aligné sur "Mode de soin", filtres Entraide + fermeture auto, secteur hospitalier synchronisé/exclu de l'adresse, bloc "Visiteurs" dans Paramètres, popups/barres relevés de la nav système (PR #24-#28, mergées).
- 2026-07-15 (session n-2) : fix RLS `visitor_profiles` (photo visiteur bloquée), photo admin dans le bloc Visiteurs, logo calendrier redimensionné, bandeau hôpital reformaté, popups harmonisées, bug consignes de visite corrigé, phrase totem du patient (PR #29, mergée).
- 2026-07-15 (session n-1) : phrase totem étendue à l'admin et au visiteur, fusion des réservations groupées + harmonisation des libellés Admin/Visiteur (PR #30, mergée).
- 2026-07-15 (cette session) : voir détail ci-dessous.

## 1. Objectif de la session
Ajouter un champ optionnel "Date d'hospitalisation" au patient : dans la fiche patient (Paramètres, juste sous la phrase totem, même bloc que la photo) et dès l'étape "Patient" de création de l'espace (onboarding).
État "done" : atteint — migration appliquée en prod, PR #31 mergée dans `main`. Reste un test manuel dans l'app (voir section 5).

## 2. État actuel

**Fait cette session :**
- Nouvelle colonne `patient_admission_date date` sur `patient_spaces` (migration `supabase/migrations/20260716_patient_admission_date.sql`), appliquée manuellement par l'utilisateur via le Dashboard Supabase (CLI toujours bloquée sur cette machine) et confirmée.
- `lib/types.ts` : `PatientSpace.patient_admission_date: string | null`.
- **Fiche patient** (`app/(admin)/settings.tsx`, modal "Profil patient") : nouveau champ juste sous la phrase totem, même bloc que la photo — bouton ouvrant un sélecteur de date natif (`DateTimePicker` mode `date`, `display="spinner"`, `maximumDate = aujourd'hui`). Sur Android, utilise le helper `openAndroidDatePicker` (déjà présent dans `lib/androidTimePicker.ts` mais jamais câblé jusqu'ici — écrit à l'origine pour contourner un bug connu du `CalendarView` natif Android qui réinitialise jour/mois quand on change l'année). Sur iOS, `DateTimePicker` inline classique.
- **Onboarding** (`components/PatientOnboarding.tsx`, étape "Patient") : même champ, même UI, ajouté sous la phrase totem, optionnel — envoyé dans l'insert `patient_spaces` à la création de l'espace.
- **Fiche patient en lecture seule** (`components/PatientProfileModal.tsx`, partagée admin/visiteur) : nouvelle ligne "🏥 Date d'hospitalisation" affichée au même niveau que naissance/sexe/groupe sanguin/allergies (avant la date de naissance dans l'ordre d'affichage).
- `npx tsc --noEmit -p .` : aucune nouvelle erreur (mêmes erreurs préexistantes Edge Functions Deno / `lib/notifications.ts`).
- Commité sur nouvelle branche `feat/patient-admission-date` (`244a20d`), poussée, PR #31 ouverte puis mergée par l'utilisateur.

**Dernière action avant ce handoff :** `main` local resynchronisé en fast-forward avec `origin/main` (`2aecdff`) après le merge de la PR #31.

## 3. Fichiers concernés
- `supabase/migrations/20260716_patient_admission_date.sql` (nouveau) → colonne `patient_admission_date date`, appliquée en prod.
- `lib/types.ts` → `PatientSpace.patient_admission_date: string | null`.
- `app/(admin)/settings.tsx` → champ "Date d'hospitalisation" dans la fiche patient (état `patientAdmissionDate`, `openAdmissionDatePicker`, helper `isoDate` local), sous la phrase totem.
- `components/PatientOnboarding.tsx` → même champ à l'étape "Patient" (état `admissionDate`), inclus dans l'insert de création d'espace.
- `components/PatientProfileModal.tsx` → ligne d'affichage "🏥 Date d'hospitalisation" dans la fiche patient en lecture seule.
- `lib/androidTimePicker.ts` → `openAndroidDatePicker` (préexistant, inutilisé jusqu'ici) maintenant câblé depuis `settings.tsx` et `PatientOnboarding.tsx`.

## 4. Ce qui a échoué
- Rien n'a été abandonné/retenté cette session.
- Point de vigilance non résolu (pas un échec, un report) : deux tentatives de `git push origin main` direct (pour un commit de handoff en attente) ont été bloquées par le classifieur auto-mode de Claude Code — la première en tout début de session précédente, la seconde après un "oui" jugé insuffisamment explicite pour ce push précis (il suivait immédiatement une nouvelle demande de feature dans le même message). Dans les deux cas, non contourné : le travail est passé par PR comme d'habitude, donc sans impact réel, mais bon rappel que le classifieur exige une confirmation de push sans ambiguïté, formulée pour cette action précise.

## 5. Prochaine étape
1. **Tester manuellement dans l'app** : (a) la date d'hospitalisation — édition dans la fiche patient et saisie à l'onboarding, vérifier l'affichage dans la fiche patient en lecture seule ; (b) la fusion des réservations groupées (créer une résa avec accompagnant côté admin, vérifier l'affichage "Prénom Nom · Avec X, Y" dans Mes contributions et que la fiche visiteur individuelle n'est pas régressée) ; (c) les 3 phrases totem en usage prolongé (patient déjà fait, admin/visiteur confirmés fonctionnels mais pas en usage prolongé).
2. Nettoyer sur origin les branches mergées (`feat/patient-admission-date`, `feat/merge-companion-reservations`, `feat/settings-visitors-block`, `fix/visitor-profiles-photo-sync`) — sur demande explicite.
3. Décider du sort de `docs/spec-web-upgrade`.
4. Tester le cap freemium en conditions réelles ; revalider points 11-12 (notifications push, purge RGPD J-7).
5. Reprendre la roadmap points 13-14 (EAS Build → APK signé, fiche Play Store).
