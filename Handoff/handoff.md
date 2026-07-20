# Handoff — AvecToi
_Généré le : 2026-07-20_

## État global du projet

**Stack :** React Native + Expo SDK 51+, Expo Router, Supabase (BDD/Auth/Storage/Realtime/Edge Functions), EAS Build + EAS Update (channels development/preview/production, `expo-updates` installé). expo-notifications, expo-calendar, expo-image-picker. Resend (transactionnel) branché sur les Edge Functions. Stripe côté web uniquement (avectoi.care), app 100% "reader" conforme Play Store. Supabase CLI bloqué sur cette machine (App Control Policy Windows) : déploiement des migrations/Edge Functions exclusivement via le Dashboard Supabase (copier/coller le SQL en un seul bloc).

**EAS Update — automatisé depuis le 20/07 (PR #61) :** `.github/workflows/eas-update-preview.yml` publie automatiquement `eas update --channel preview` à chaque push sur `main` contenant du code app (paths-ignore sur `Handoff/`, `Documentation/`, `**.md`). Rien à faire manuellement après un merge de code.

**Repo GitHub :** `https://github.com/EI-HCS-Consulting/AvecToi`, branche `main` protégée par ruleset (PR obligatoire). `main` local à jour avec `origin/main` (`c37ee85`).

**Branches ouvertes sur `origin` (nombreuses, nettoyage jamais fait faute de demande explicite) :** `docs/spec-web-upgrade` (en attente d'une décision utilisateur depuis plusieurs sessions) + une trentaine de branches déjà mergées mais pas supprimées (`fix/*`, `feat/*`, `feature/*`, `docs/handoff-update-*`) — liste complète via `git branch -r`. Nettoyage à faire uniquement sur demande explicite, comme convenu.

**Livré (V1, CLAUDE.md points 1-10) :** setup Expo/Supabase/Git, Auth admin, accès visiteur, calendrier + créneaux + réservation + PIN, galerie Souvenirs, Nouvelles du jour, Entraide + Mur de soutien (+ checklists administratives), 6 thèmes + mode Dark/Light, "Prochaine disponibilité", ajout calendrier natif Android, RLS, accompagnants, parité admin/visiteur "Mon compte", onboarding séquencé, cap freemium, Paramètres 4 sections + historique, emails réservation/annulation (Resend), fiche patient + profils visiteurs, Chronologie, Planning des intervenants (réorganisé + calendrier mensuel dédié), mode "1 visite par jour" (suspension rétroactive + blocage réservation intervention), téléphone/phrase totem/photo unifiés entre "Mon compte" et la fiche intervenant, rattachement multi-espaces des intervenants (par téléphone), **Refonte navigation + Mon compte intervenant (nouveau, PR #73)** et **checklists personnelles enrichies + popup harmonisé (nouveau, cette session, PR #74)** — détail ci-dessous.

**Refonte navigation intervenant (PR #73) — livrée et mergée :**
- L'intervenant a désormais sa propre barre d'onglets : Nouvelles · 🩺 Intervenants · Soins · Soutien · Compte (au lieu de Souvenirs/Entraide, réservés au visiteur classique).
- Nouvel onglet **Intervenants** (`app/(visitor)/intervenants.tsx` + `components/IntervenantsList.tsx`) : liste avatar+nom des autres intervenants de l'espace, tap sur la photo → plein écran, tap sur la ligne → fiche en lecture seule.
- Nouvel onglet **Soins** (`app/(visitor)/soins.tsx`) : planning mensuel + bloc jour, bascule "Mes interventions / Tous", bouton "+ Ajouter une intervention" (même popup que côté admin, restreint à soi-même, PIN réel au lieu de "ADMIN").
- "Mon compte" intervenant nettoyé : tuiles Souvenirs/Entraide/Mes réservations retirées (couvertes par les nouveaux onglets), bouton "🩺 Intervenants" et bandeau "Importer une checklist toute prête" masqués (redondants). Aucun changement côté visiteur classique ni admin.

**En cours / pas commencé :**
- Points 13-14 (EAS Build APK signé, fiche Play Store) : pas commencés.
- Bug connu, pas corrigé : les flèches de navigation jour du calendrier visiteur (`app/(visitor)/home/slots.tsx`) contournent `allowed_weekdays`.
- Isolation Supabase (séparer l'instance prod partagée avec le site web) : plan complet dans `ISOLATION_SUPABASE.md`, différée sur décision de l'utilisateur.
- `docs/spec-web-upgrade` : toujours en attente d'une décision.
- **Documentation fonctionnelle en retard sur plusieurs sessions** : entre le handoff du 19/07 et celui-ci, une dizaine de PR ont été livrées (#59 à #72 : fix session photo intervenant, masquage créneaux admin en mode "1 visite/jour", EAS Update via GitHub Actions, vue `visitor_profiles_by_patient`, colonnes `admin_email`/`admin_pin` sur `patient_spaces`, réorganisation complète du Planning des intervenants + calendrier mensuel dédié, rattachement multi-espaces des intervenants, popup ajout-intervention). Seule la partie directement liée à cette session (navigation intervenant §3.2/§7.3, checklists réutilisables) a été répercutée dans `Documentation Fonctionnalités.docx` cette fois-ci ; le reste (Planning des intervenants réorganisé, colonnes admin email/PIN, vue Supabase dédiée) n'est **pas encore documenté** — à traiter dans une session dédiée plutôt qu'en rattrapage partiel risqué.

## Historique cumulé
- Lots 1-10 (fonctionnalités de base) + sessions du 2026-07-04 au 07-17 (`dossier_code`, cap freemium, PIN visiteur sécurisé, Paramètres 4 sections, historique + recasage auto, Resend, fiche patient, Dark/Light, Chronologie, checklists administratives, Planning des intervenants) — PR #7-#41, mergées.
- 2026-07-18 : correctif alerte de recasage matchée par prénom+nom+PIN (PR #44), mode "1 visite par jour" — toggle instantané, suspension rétroactive des doublons (PR #45).
- 2026-07-19 : Refonte compte Intervenant Phase A (téléphone + phrase totem, PR #56) puis unification photo/téléphone/phrase totem entre Mon compte et la fiche intervenant (PR #57).
- 2026-07-20 (avant cette session) : fix session photo intervenant (PR #59), masquage créneaux admin mode "1 visite/jour" (PR #60), EAS Update via GitHub Actions (PR #61), vue `visitor_profiles_by_patient` + colonnes `admin_email`/`admin_pin` sur `patient_spaces` (PR #63-65), réorganisation Planning des intervenants + calendrier mensuel dédié (PR #66-70), rattachement multi-espaces des intervenants (PR #71), fix intervention day-cap + popup (PR #72), **refonte navigation + Mon compte intervenant : onglets Intervenants/Soins (PR #73)**.
- 2026-07-20 (cette session) : voir détail ci-dessous (PR #74).

## 1. Objectif de la session
Trois demandes utilisateur en une seule requête : (a) harmoniser le popup natif "Un seul créneau par jour" avec le design de l'app, (b) corriger l'impossibilité d'ajouter des items à une checklist personnelle déjà créée, (c) permettre à un intervenant de sauvegarder une checklist comme modèle réutilisable et de l'importer dans un autre dossier patient.
État "done" : les trois points implémentés, `tsc --noEmit` propre, PR #74 mergée par l'utilisateur, documentation fonctionnelle mise à jour pour la partie navigation/checklist, ce handoff écrit et poussé.

## 2. État actuel

**Fait cette session :**
- `components/ConfirmModal.tsx` : nouvelle prop `singleButton?: boolean` (masque le bouton Annuler, un seul bouton pleine largeur) pour porter des alertes purement informatives sans dupliquer de composant.
- Popup "Un seul créneau par jour" remplacé (`Alert.alert` natif → `ConfirmModal`) dans les 5 endroits qui déclenchent la condition `DAY_ALREADY_BOOKED` : `BookingFlow.tsx`, `AdminAddReservation.tsx`, `AdminAddIntervention.tsx`, `InterventionBookingFlow.tsx`, `AdminEditReservation.tsx`. Texte de chaque popup conservé à l'identique, seul le mécanisme d'affichage change.
- `components/MyChecklist.tsx` : ajout d'items possible sur une checklist personnalisée déjà créée (champ + bouton "+ Ajouter" par checklist, absent auparavant en dehors de la création initiale).
- Nouvelle fonctionnalité "Mes modèles" : un intervenant peut sauvegarder une checklist perso comme modèle (bouton 💾 dans l'en-tête de la checklist) et l'importer dans un autre dossier patient (bouton "📥 Mes modèles"), via une nouvelle table `intervenant_checklist_templates` (téléphone normalisé comme clé d'identité cross-space, même principe que "Mes espaces").
- Nouveau fichier `supabase/migrations/20260728_intervenant_checklist_templates.sql` — **exécution manuelle via le Dashboard Supabase pas encore confirmée par l'utilisateur** (voir §5).
- `lib/types.ts` : nouvelle interface `IntervenantChecklistTemplate`.
- `app/(visitor)/account.tsx` : prop `intervenantTelephone` passée à `MyChecklist` pour les comptes intervenant uniquement.
- PR #74 ouverte, mergée par l'utilisateur ("mergé").
- `Documentation Fonctionnalités.docx` mis à jour : tables §3.2 (barre d'onglets visiteur vs intervenant) et §7.3 (Intervenants/Soins remplacent Souvenirs/Entraide, nouvelle ligne "Checklists personnelles réutilisables").

**Dernière action avant ce handoff :** mise à jour ciblée du `.docx` via `python-docx` (`/c/Python314/python`, `PYTHONIOENCODING=utf-8` nécessaire pour l'affichage des accents/emoji dans le terminal) — édition directe des runs de texte dans les tables concernées pour préserver la mise en forme (gras/police/taille) plutôt que de réécrire les cellules.

## 3. Fichiers concernés
- `components/ConfirmModal.tsx` → prop `singleButton`.
- `components/BookingFlow.tsx`, `AdminAddReservation.tsx`, `AdminAddIntervention.tsx`, `InterventionBookingFlow.tsx`, `AdminEditReservation.tsx` → popup "1 créneau/jour" harmonisé.
- `components/MyChecklist.tsx` → ajout d'items post-création, sauvegarde/import de modèles cross-space.
- `lib/types.ts` → `IntervenantChecklistTemplate`.
- `supabase/migrations/20260728_intervenant_checklist_templates.sql` → nouvelle table, RLS ouverte (même pattern que `personal_checklist_items`), **à exécuter en prod**.
- `app/(visitor)/account.tsx` → passe `intervenantTelephone` à `MyChecklist`.
- `Documentation/Documentation Fonctionnalités.docx` → tables §3.2 et §7.3 mises à jour (navigation intervenant, checklists réutilisables).

## 4. Ce qui a échoué
- Rien de bloquant. Un piège auto-corrigé avant tout build : première rédaction du message du popup avec une entité HTML `&quot;` dans un attribut JSX (ne se décode pas dans un attribut, contrairement au texte JSX) → corrigé en expression JS avec guillemets échappés (`message={"Le mode \"1 visite par jour\"..."}`).
- Édition du `.docx` : `print()` direct dans le terminal Bash plante sur les accents/emoji (`UnicodeEncodeError` avec l'encodage `cp1252` par défaut de Windows) — nécessite `PYTHONIOENCODING=utf-8` en préfixe de toute commande Python qui affiche du texte accentué. Pas un problème du script lui-même, juste de l'affichage terminal.
- `d.paragraphs` (python-docx) ne suffit pas pour localiser du contenu placé dans des tables (34 tables dans ce document) : les paragraphes "vides" entre deux titres cachent en réalité des tables. Il faut itérer `document.element.body` dans l'ordre réel (paragraphes + `w:tbl`) pour retrouver quelle table appartient à quelle section — sinon on croit une section vide alors que son contenu est ailleurs dans le flux.

## 5. Prochaine étape
1. **Action requise côté utilisateur (bloquant pour "Mes modèles") :** exécuter `supabase/migrations/20260728_intervenant_checklist_templates.sql` dans le Supabase Dashboard (SQL Editor, en un seul bloc complet). Sans ça, "📥 Mes modèles" échouera silencieusement (table inexistante) même si le code est déjà en prod via EAS Update.
2. Une fois la migration confirmée exécutée : test manuel rapide (créer une checklist perso, 💾 pour la sauvegarder comme modèle, changer de dossier patient avec le même intervenant, 📥 Mes modèles → import).
3. **Rattraper la documentation fonctionnelle** pour les PR #59-#72 non couvertes cette session (Planning des intervenants réorganisé + calendrier mensuel dédié, colonnes `admin_email`/`admin_pin`, vue `visitor_profiles_by_patient`, rattachement multi-espaces) — session dédiée recommandée plutôt qu'un rattrapage partiel.
4. Items reportés, à reprendre sur demande de l'utilisateur : bug flèches jour `slots.tsx`, isolation Supabase dev/prod, nettoyage des branches mergées sur origin, décision sur `docs/spec-web-upgrade`.
