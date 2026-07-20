# Handoff — AvecToi
_Généré le : 2026-07-19_

## État global du projet

**Stack :** React Native + Expo SDK 51+, Expo Router, Supabase (BDD/Auth/Storage/Realtime/Edge Functions), EAS Build + EAS Update (channels development/preview/production, `expo-updates` installé). expo-notifications, expo-calendar, expo-image-picker. Resend (transactionnel) branché sur les Edge Functions. Stripe côté web uniquement (avectoi.care), app 100% "reader" conforme Play Store. Supabase CLI bloqué sur cette machine (App Control Policy Windows) : déploiement des migrations/Edge Functions exclusivement via le Dashboard Supabase (copier/coller le SQL).

**EAS Update — automatisé depuis le 20/07 (PR #61) :** `.github/workflows/eas-update-preview.yml` publie automatiquement `eas update --channel preview` à chaque push sur `main` contenant du code app (paths-ignore sur `Handoff/`, `Documentation/`, `**.md`). Ancien système `.eas/workflows/update-on-main.yml` (EAS Workflows natif) supprimé : il consommait le quota Expo "CI/CD Workflows" (60 min/mois, plan gratuit) et échouait silencieusement depuis le 19/07 (quota épuisé après PR #49) sans jamais bloquer l'app — les updates reçues venaient de pushes manuels. La GitHub Action tourne sur les runners GitHub et ne consomme pas ce quota. Premier run post-merge vérifié ✓ (run 29721458606, 2m34s).

**Repo GitHub :** `https://github.com/EI-HCS-Consulting/AvecToi`, branche `main` protégée par ruleset (PR obligatoire). `main` local à jour avec `origin/main` (`4c32ed1`).

**Branches ouvertes sur `origin` :**
- `main`
- `docs/spec-web-upgrade` — non mergée, en attente depuis plusieurs sessions sur décision explicite de l'utilisateur (statut inchangé).
- Branches **déjà mergées** mais pas encore supprimées sur origin (nettoyage sur demande explicite seulement, comme convenu) : `fix/popups-design`, `docs/handoff-update`, `docs/handoff-update-2026-07-16`, `docs/handoff-update-2026-07-17`, `docs/handoff-update-2026-07-18`, `feat/admin-chronologie`, `fix/chrono-scroll-gesture`, `fix/chrono-scroll-overlay-sibling`, `feat/entraide-checklists-administratives`, `feat/entraide-delete-checklist-batch`, `feat/intervenants-planning`, `fix/rebooking-alert-pin-collision`, `feature/one-visit-per-day`, `fix/intervention-types-error-handling`, `feature/intervenant-contact-fields`, `feature/intervenant-contact-sync`.

**Livré (V1, CLAUDE.md points 1-10) :** setup Expo/Supabase/Git, Auth admin, accès visiteur, calendrier + créneaux + réservation + PIN, galerie Souvenirs, Nouvelles du jour, Entraide + Mur de soutien (+ checklists administratives), 6 thèmes + mode Dark/Light, "Prochaine disponibilité", ajout calendrier natif Android, RLS, accompagnants, parité admin/visiteur "Mon compte", onboarding séquencé, cap freemium, Paramètres 4 sections + historique, emails réservation/annulation (Resend), fiche patient + profils visiteurs, Chronologie, Planning des intervenants, mode "1 visite par jour" (suspension rétroactive des doublons), **début de la Refonte du compte Intervenant — Phase A + unification contact/photo (nouveau, cette session)** — voir détail ci-dessous.

**Refonte du compte Intervenant — Phase A (PR #56) puis unification contact/photo (PR #57), les deux mergées et validées par l'utilisateur en conditions réelles :**
- Colonnes `telephone` et `phrase_totem` (optionnelles) ajoutées à `intervenant_profiles`, exposées dans « 🩺 Fiche intervenant » (create + edit).
- `intervenant_profiles` devient la **source unique de vérité** pour photo, téléphone et phrase totem d'un intervenant : un champ Téléphone est apparu dans « Mes informations » (Mon compte), et modifier la photo/phrase totem/téléphone depuis « Mon compte » ou depuis « Ma fiche intervenant » met à jour l'autre écran instantanément. Comportement visiteur (`visitor_profiles`) strictement inchangé.
- `Documentation/Documentation Fonctionnalités.docx` mis à jour en conséquence (sections 7.1 et 7.3).
- C'est la Phase A d'un plan en 4 phases (`C:\Users\ReMarkt\.claude\plans\warm-stargazing-penguin.md`) : B = restructuration navigation compte intervenant, C = tchat privé admin↔intervenant, D = changement de patient par code dossier — une phase à la fois, chacune sa propre branche/PR testée avant la suivante.

**En cours / pas commencé :**
- **Phase B du plan Intervenant (prochaine étape)** — cacher tabs Souvenirs/Entraide pour l'intervenant, scinder `account.tsx` en `VisitorAccountView`/`IntervenantAccountView`.
- Points 13-14 (EAS Build APK signé, fiche Play Store) : pas commencés.
- Bug connu, pas corrigé : les flèches de navigation jour du calendrier visiteur (`app/(visitor)/home/slots.tsx`) contournent `allowed_weekdays`.
- Planning des intervenants : flux simple confirmé fonctionnel, mais recasage auto détaillé / admin CRUD / synchro calendrier natif toujours pas retestés depuis leur livraison.
- Isolation Supabase (séparer l'instance prod partagée avec le site web) : plan complet dans `ISOLATION_SUPABASE.md`, différée sur décision de l'utilisateur.
- Branches mergées à nettoyer sur origin (liste ci-dessus, sur demande explicite).
- `docs/spec-web-upgrade` : toujours en attente d'une décision.

## Historique cumulé
- Lots 1-10 (fonctionnalités de base) + sessions du 2026-07-04 au 07-17 (`dossier_code`, cap freemium, PIN visiteur sécurisé, Paramètres 4 sections, historique + recasage auto, Resend, fiche patient, Dark/Light, Chronologie, checklists administratives, Planning des intervenants) — voir handoffs archivés pour le détail (PR #7-#41, mergées).
- 2026-07-18 : correctif alerte de recasage matchée par prénom+nom+PIN (PR #44), puis mode "1 visite par jour" — toggle à application instantanée, suspension rétroactive automatique des réservations en doublon sur un même jour (PR #45), migrations `20260718_one_visit_per_day.sql` + `20260719_one_visit_per_day_activation.sql`. Non testé manuellement en fin de session.
- 2026-07-19 (cette session) : démarrage de la Refonte du compte Intervenant — Phase A (téléphone + phrase totem, PR #56) puis unification photo/téléphone/phrase totem entre Mon compte et la fiche intervenant (PR #57) — voir détail ci-dessous.

## 1. Objectif de la session
Démarrer la "Refonte du compte Intervenant" (plan `warm-stargazing-penguin.md`) phase par phase, en commençant par la Phase A (téléphone + phrase totem sur `intervenant_profiles`). En cours de test réel, l'utilisateur a signalé un problème de fond : les informations de contact (téléphone, phrase totem, photo) n'étaient pas synchronisées entre "Mon compte" et "Ma fiche intervenant" — modifier l'une ne modifiait pas l'autre. Objectif étendu en cours de session pour corriger ça.
État "done" : les deux PR (#56, #57) sont mergées, testées et validées par l'utilisateur ("ok ça fonctionne"), les deux EAS Update correspondants sont poussés sur `preview`, et ce handoff + la documentation fonctionnelle sont à jour.

## 2. État actuel
**Fait cette session :**
- Migration `supabase/migrations/20260719_intervenant_profiles_contact.sql` (colonnes `telephone`/`phrase_totem` sur `intervenant_profiles`) appliquée manuellement via le Dashboard Supabase.
- `components/IntervenantFicheModal.tsx` : formulaire étendu avec téléphone + phrase totem (create + edit) ; `onSaved` renvoie désormais 7 valeurs (`profileId, prenom, nom, telephone, phraseTotem, photo, photoUpdatedAt`) au lieu de 3, pour que les appelants mettent à jour leur état local sans refetch. Vérifié compatible avec les 3 sites d'appel existants (`npx tsc --noEmit` sans nouvelle erreur).
- `lib/visitorSession.ts` : ajout du champ `telephone` à `VisitorSession`, même pattern optionnel-avec-fallback que `motto`.
- `app/(visitor)/account.tsx` : champ Téléphone ajouté dans "Mes informations" (intervenant uniquement) ; `intervenant_profiles` devient la source de lecture/écriture pour photo/téléphone/phrase totem quand `role === "intervenant"` (nouvelles fonctions `syncIntervenantPhoto`, `syncIntervenantContact`, helper `intervenantPhotoUrl`) ; `visitor_profiles` reste inchangé pour les visiteurs.
- PR #56 (Phase A) et PR #57 (unification contact/photo) mergées sur `main` ; l'utilisateur a confirmé le bon fonctionnement en conditions réelles pour les deux.
- Deux pushes `eas update --channel preview` effectués (un après chaque merge), publiés avec succès.
- `Documentation/Documentation Fonctionnalités.docx` mis à jour : section 7.1 (téléphone/phrase totem optionnels sur la fiche) et section 7.3 (champ Téléphone dans "Mes informations", synchronisation photo/téléphone/phrase totem avec la fiche intervenant) — édité via un script `python-docx` (modifié sur disque, pas encore committé).

**Dernière action avant ce handoff :** édition du `.docx` de documentation fonctionnelle via `python-docx` (disponible sur cette machine à `/c/Python314/python` — noter ce chemin exact pour les prochaines éditions ; `pandoc` n'est pas installé et l'alias `python`/`python3` seul ne fonctionne pas dans Bash sur cette machine).

## 3. Fichiers concernés
- `supabase/migrations/20260719_intervenant_profiles_contact.sql` → migration téléphone/phrase_totem sur `intervenant_profiles`.
- `lib/types.ts` → `IntervenantProfile.telephone`/`phrase_totem` ajoutés.
- `components/IntervenantFicheModal.tsx` → formulaire fiche intervenant, callback `onSaved` étendu à 7 paramètres.
- `lib/visitorSession.ts` → champ `telephone` ajouté à `VisitorSession`.
- `app/(visitor)/account.tsx` → champ Téléphone dans "Mes informations", logique de synchronisation photo/téléphone/phrase totem côté intervenant (`intervenant_profiles` comme source unique).
- `app/(admin)/intervenants.tsx`, `app/(visitor)/_layout.tsx` → sites d'appel de `IntervenantFicheModal` vérifiés compatibles (non modifiés).
- `Documentation/Documentation Fonctionnalités.docx` → sections 7.1 et 7.3 mises à jour (téléphone/phrase totem sur la fiche, synchronisation avec Mon compte).

## 4. Ce qui a échoué
- Rien n'a échoué de manière bloquante cette session. Seule difficulté mineure : le `Read` tool ne peut pas ouvrir le `.docx` binaire directement (attendu) ; `pandoc` n'est pas installé sur cette machine, mais `python-docx` l'est via `/c/Python314/python` — chemin de contournement à réutiliser directement pour les prochaines mises à jour de la documentation fonctionnelle plutôt que de re-tester `pandoc` à chaque fois.

## 5. Prochaine étape
1. Committer `Documentation/Documentation Fonctionnalités.docx` (actuellement modifié mais pas committé) avec ce handoff — branche `docs/handoff-update-2026-07-19`, PR, merge.
2. La règle EAS Update ne s'applique pas nécessairement à ce merge purement documentaire, mais reste active pour tout futur merge contenant du code app (voir "État global du projet" ci-dessus).
3. Démarrer la **Phase B** du plan `warm-stargazing-penguin.md` : restructuration de la navigation du compte intervenant (cacher tabs Souvenirs/Entraide, scinder `account.tsx` en vues Visiteur/Intervenant dédiées) — nouvelle branche dédiée, une seule phase à la fois comme convenu.
4. Items reportés, à reprendre sur demande de l'utilisateur : bug flèches jour `slots.tsx`, isolation Supabase dev/prod, nettoyage des branches mergées, décision sur `docs/spec-web-upgrade`, retest complet du Planning des intervenants (recasage auto, admin CRUD, synchro calendrier natif) et du mode "1 visite par jour" (jamais confirmé testé manuellement par l'utilisateur malgré la mention "ça fonctionne" de cette session, qui concernait le volet contact/photo, pas ce mode-là).
