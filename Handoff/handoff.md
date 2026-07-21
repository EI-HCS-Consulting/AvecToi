# Handoff — AvecToi
_Généré le : 2026-07-21 (soir, suite)_

## État global du projet

**Stack :** React Native + Expo SDK 51+, Expo Router, Supabase (BDD/Auth/Storage/Realtime/Edge Functions), EAS Build + EAS Update (channels development/preview/production, `expo-updates` installé). expo-notifications, expo-calendar, expo-image-picker. Resend (transactionnel) branché sur les Edge Functions. Stripe côté web uniquement (avectoi.care), app 100% "reader" conforme Play Store. Supabase CLI bloqué sur cette machine (App Control Policy Windows) : déploiement des migrations/Edge Functions exclusivement via le Dashboard Supabase (copier/coller le SQL en un seul bloc).

**EAS Update — automatisé depuis le 20/07 (PR #61), quoting corrigé le 21/07 (PR #86) :** `.github/workflows/eas-update-preview.yml` publie automatiquement `eas update --channel preview` à chaque push sur `main` contenant du code app (paths-ignore sur `Handoff/`, `Documentation/`, `**.md`). Un `workflow_dispatch` permet aussi de rejouer une publication manuellement.

**⚠️ Points d'attention OTA/EAS Update, à ne pas reproduire :**
- **Quoting bash (résolu, PR #86) :** ne jamais interpoler `${{ github.event.head_commit.message }}` directement dans un `run:` bash — un message multi-lignes avec guillemets casse le quoting et `eas update` échoue silencieusement (run rouge dans Actions, mais rien ne bloque le merge ni n'alerte dans l'app). Toujours passer par une variable d'environnement (`env: COMMIT_MESSAGE: ...` puis `"$COMMIT_MESSAGE"` entre guillemets dans le script). Réflexe après un merge important : `gh run list --workflow=eas-update-preview.yml --limit 3` pour confirmer un run vert.
- **Redémarrage complet nécessaire après publication :** `expo-updates` (config par défaut) télécharge la mise à jour en arrière-plan mais sert encore l'ancien bundle JS au lancement en cours — il faut fermer l'app depuis le multitâche (pas juste la mettre en arrière-plan) et parfois relancer deux fois juste après une publication.
- **La liste des Updates dans le dev-launcher peut afficher une mise à jour plus récente sans que l'app l'ait réellement chargée.** Il faut explicitement **taper/sélectionner** l'entrée la plus récente pour qu'elle se charge (le chargement peut prendre longtemps). Technique de diagnostic : comparer via curl le manifest `updates.url` du channel (`app.json`, headers `Accept: multipart/mixed`, `expo-platform`, `expo-protocol-version: 1`, `expo-runtime-version`, `expo-channel-name`) avec l'update connecté sur le device.
- **Nouveau (21/07, cette session) — un changement d'asset natif (icône adaptive, splash, etc.) n'est PAS livrable via EAS Update/OTA.** Seul le JS/bundle passe par OTA ; toute modification d'asset natif exige un nouveau **EAS Build** (`eas build --profile <profil>`) installé manuellement sur le device de test — pas de raccourci possible.

**Repo GitHub :** `https://github.com/EI-HCS-Consulting/AvecToi`, branche `main` protégée par ruleset (PR obligatoire). `main` local à jour avec `origin/main` (`a112cf9`, PR #92 mergée).

**Branches ouvertes sur `origin` (nombreuses, nettoyage jamais fait faute de demande explicite) :** `docs/spec-web-upgrade` (en attente d'une décision utilisateur depuis plusieurs sessions) + de nombreuses branches déjà mergées mais pas supprimées. Nettoyage à faire uniquement sur demande explicite.

**Livré (V1, CLAUDE.md points 1-10) :** setup Expo/Supabase/Git, Auth admin, accès visiteur, calendrier + créneaux + réservation + PIN, galerie Souvenirs, Nouvelles du jour, Entraide + Mur de soutien, 6 thèmes + Dark/Light, "Prochaine disponibilité", ajout calendrier natif Android, RLS, accompagnants, parité admin/visiteur "Mon compte", onboarding séquencé, cap freemium, Paramètres 4 sections + historique, emails réservation/annulation (Resend), fiche patient + profils visiteurs, Chronologie, Planning des intervenants (calendrier mensuel inline + pager jour + Soins planifiés + Fiches intervenants repliables), mode "1 visite par jour" unifié, téléphone/phrase totem/photo unifiés Mon compte ↔ fiche intervenant, checklists personnelles réutilisables cross-espace, bug flèches jour visiteur/intervenant corrigé (`allowed_weekdays`/`blocked_dates`, PR #77), sauvegarde auto hebdo du schéma Supabase (PR #79), purge RGPD automatisée via `pg_cron` (activée et corrigée le 21/07, PR #82-83) avec rétention repassée à 90 jours (PR #78), rattachement multi-espaces intervenant en sous-menu déroulant "Mes Patients" (PR #84, #88, #89), popup "Chevauchement" harmonisé + précheck immédiat "1 visite par jour" sur "+ Ajouter une intervention" (PR #91), icône adaptive Android corrigée + fix scroll "Mes modèles" (PR #92).

**Build EAS preview le plus récent (21/07) :** `52e0707b-c21e-4a12-9df2-6cbe1f13cc66` (profil `preview`, APK), installé et testé par l'utilisateur — "ça marche nickel". **Aucune soumission Play Store effectuée** (explicitement exclue par l'utilisateur pour l'instant) — points 13-14 du backlog (EAS Build signé + fiche Play Store) toujours pas commencés.

**En cours / pas commencé :**
- Points 13-14 (EAS Build APK signé, fiche Play Store) : pas commencés, décision volontairement différée par l'utilisateur.
- Isolation Supabase (séparer l'instance prod partagée avec le site web) : plan complet dans `ISOLATION_SUPABASE.md`, différée sur décision de l'utilisateur. Sauvegarde auto hebdo du **schéma** opérationnelle (PR #79) ; les données elles-mêmes restent sans backup (tier gratuit, pas de PITR).
- `docs/spec-web-upgrade` : toujours en attente d'une décision.
- **Migration `20260728_intervenant_checklist_templates.sql` (PR #74) :** toujours pas confirmée exécutée en prod par l'utilisateur — "📥 Mes modèles" restera en échec silencieux tant que ce n'est pas fait.

**3 fils ouverts identifiés le 21/07 (suite à la purge RGPD de l'espace patient historique) :**
1. ~~Alertes email RGPD jamais envoyées~~ **RÉSOLU.** `pg_cron`/`pg_net` activés, job `rgpd-purge-daily` corrigé et vérifié actif en prod (PR #82).
2. **Mélange nuitées/créneaux entre espaces sur le site Vercel historique** (`planning-visites-maman.vercel.app`) : root cause identifiée (`select("*")` sans filtre `space_id`, code MVP figé + RLS permissive). Non corrigeable sans risque. Décision : décommissionner ce site au profit du futur site Infomaniak (fil #3) — pas encore exécuté.
3. **Nouveau site web à héberger sur Infomaniak**, en remplacement du site Vercel actuel — pas encore scopé, à démarrer quand l'utilisateur sera prêt.

## Historique cumulé
- Lots 1-10 (fonctionnalités de base) + sessions du 2026-07-04 au 07-17 (`dossier_code`, cap freemium, PIN visiteur sécurisé, Paramètres 4 sections, historique + recasage auto, Resend, fiche patient, Dark/Light, Chronologie, checklists administratives, Planning des intervenants) — PR #7-#41, mergées.
- 2026-07-18 → 07-19 : correctif alerte de recasage matchée par prénom+nom+PIN (PR #44), mode "1 visite par jour" (PR #45), refonte compte Intervenant Phase A + unification photo/téléphone/phrase totem (PR #56-57).
- 2026-07-20 : fix session photo intervenant, masquage créneaux "1 visite/jour", EAS Update via GitHub Actions, vue `visitor_profiles_by_patient`, réorganisation Planning des intervenants, rattachement multi-espaces intervenants, fix intervention day-cap, refonte navigation + Mon compte intervenant, checklists perso réutilisables entre dossiers, rattrapage documentation (PR #59-76).
- 2026-07-21 (journée) : fix flèches jour visiteur/intervenant (PR #77), RGPD 90 jours + sauvegarde auto schéma Supabase (PR #78-79), purge RGPD `pg_cron` activée puis corrigée/déplacée en migration (PR #80-83), pivot d'espace intervenant via code dossier + renommage "Mes Patients" (PR #84-85), fix publication OTA cassée par les guillemets du message de commit (PR #86-87).
- 2026-07-21 (session précédente) : diagnostic bundle OTA périmé, fix staleness "Mes Patients" (PR #88), refonte en sous-menu déroulant + fix bug de clic (PR #89).
- 2026-07-21 (cette session) : popup "Chevauchement" harmonisé + précheck day-cap immédiat sur "+ Ajouter une intervention" (PR #91), icône adaptive Android corrigée + fix scroll "Mes modèles" (PR #92), build EAS preview manuel installé et validé par l'utilisateur — pas de soumission Play Store.

## 1. Objectif de la session
Deux demandes UX/design : harmoniser le popup "Chevauchement" avec le design du reste de l'app, et ouvrir immédiatement le popup "Un seul créneau par jour" au clic sur "+ Ajouter une intervention" si le jour est déjà pris (mode 1 visite/jour actif) ; corriger le bouton "Fermer" invisible dans "Mes Modèles". Puis, suite à un retour utilisateur, corriger l'icône Android trop zoomée sur l'écran d'accueil (personnages coupés, fond blanc incomplet) et re-corriger "Mes Modèles" (le premier fix était insuffisant). Ouvrir les PR, lancer un build EAS preview (l'icône est un asset natif, non livrable en OTA) sans soumission Play Store, et faire valider par l'utilisateur.
État "done" : PR #91 et #92 mergées, build EAS preview `52e0707b` installé et testé par l'utilisateur ("ça marche nickel"), documentation fonctionnelle et handoff à jour.

## 2. État actuel

**Popup Chevauchement harmonisé (PR #91) :** dans `AdminAddIntervention.tsx` et `InterventionBookingFlow.tsx`, l'`Alert.alert` natif "Chevauchement" est remplacé par le `ConfirmModal` thémé de l'app (singleButton, icône ⚠️).

**Précheck day-cap (PR #91) :** `AdminAddIntervention` reçoit désormais `reservations` en prop ; au clic sur "+ Ajouter une intervention", si `slotConfig.one_visit_per_day` et qu'une réservation Visite/Intervention (hors `alert_type: day_cap_suspended`) existe déjà ce jour-là, le popup "Un seul créneau par jour" s'ouvre immédiatement — sans faire remplir le formulaire pour rien. Ce précheck s'applique aussi bien côté admin (Planning des intervenants) que côté intervenant (onglet Soins), car les deux écrans partagent le même composant.

**Mes modèles — bouton "Fermer" invisible (PR #91 puis #92) :** premier fix (`marginBottom`) insuffisant, signalé par l'utilisateur après merge. Root cause réelle : absence de `ScrollView` autour de la liste de modèles, qui poussait le bouton hors de la zone rendue dès qu'il y avait plusieurs modèles. Fix définitif : liste enveloppée dans un `ScrollView` (pattern déjà utilisé ailleurs dans `MyChecklist.tsx`), bouton "Fermer" en pied fixe sous la liste.

**Icône adaptative Android (PR #92) :** `assets/adaptive-icon.png` était un doublon strict de `assets/icon.png` (aucune marge de sécurité) → le masque du launcher (cercle/carré arrondi) rognait directement dans les personnages sur les appareils réels. Régénéré via `sharp` (installé temporairement) : artwork redimensionné à 62% du canevas 512×512, centré sur fond transparent. Vérifié visuellement par composition sur le fond navy `#0D1B2E` de l'app avant build, puis confirmé par l'utilisateur après installation du build preview.

**Build EAS preview lancé manuellement :** profil `preview` confirmé avant lancement (APK, `distribution: internal`, channel `preview`), car un changement d'asset natif (icône) n'est pas livrable via EAS Update/OTA. Build `52e0707b-c21e-4a12-9df2-6cbe1f13cc66`, terminé avec succès, installé et testé par l'utilisateur : "ok testé, ça marche nickel". Aucune soumission Play Store (explicitement exclue par l'utilisateur — points 13-14 du backlog toujours pas commencés).

**Dernière action avant ce handoff :** mise à jour de `Documentation/Documentation Fonctionnalités.docx` (§5.16 et §7.2) pour décrire le nouveau comportement — popup day-cap immédiat et popup Chevauchement thémé — et rédaction de ce handoff. Confirmation préalable qu'aucun commit/push n'était nécessaire (tout le code de la session était déjà mergé sur `main` via PR #91/#92 ; le build EAS ne produit pas de nouveau code source).

## 3. Fichiers concernés
- `components/AdminAddIntervention.tsx` → precheck day-cap sur `open()`, popup Chevauchement remplacé par `ConfirmModal`, nouvelle prop `reservations`.
- `components/InterventionBookingFlow.tsx` → popup Chevauchement remplacé par `ConfirmModal`.
- `app/(visitor)/soins.tsx`, `app/(admin)/intervenants.tsx` → passage de la prop `reservations` à `AdminAddIntervention`.
- `components/MyChecklist.tsx` → modal "Mes modèles" : liste enveloppée dans un `ScrollView` + `marginBottom` sur le sheet.
- `assets/adaptive-icon.png` → régénéré avec marge de sécurité transparente (`icon.png` inchangé).
- `Documentation/Documentation Fonctionnalités.docx` → §5.16 (Planning des intervenants → "Ajouter une intervention") et §7.2 (Réservation d'une intervention → nouvelle ligne "Chevauchement") mis à jour.
- `Handoff/handoff.md` → ce fichier.

## 4. Ce qui a échoué
- Outil PowerShell indisponible une bonne partie de la session précédente (exit code 1 sans sortie, même sur une commande triviale) → bascule sur Bash + Node pour les opérations shell de traitement d'image. PowerShell a de nouveau fonctionné pour la suite (édition du handoff/doc).
- `which convert` pointe vers l'utilitaire Windows de conversion de disque FAT→NTFS (`system32`), pas ImageMagick — ne jamais l'invoquer pour du traitement d'image sur cette machine.
- `python3`/`python` (alias par défaut) pointent vers le stub Windows Store et échouent — l'interpréteur réel est `/c/Python314/python` (avec `python-docx` déjà installé), utilisable directement via son chemin complet pour éditer le `.docx` sans passer par `sharp`/Node.
- Aucun outil de traitement d'image dispo nativement (ni ImageMagick, ni PIL détecté au premier essai) → installation temporaire de `sharp` via `npm install --no-save`, qui a signalé "removed 191 packages" (frayeur) ; `package.json`/`package-lock.json` vérifiés intacts, puis `npm ci` a restauré `node_modules` à l'état exact du lockfile (851 packages) une fois le script terminé.
- Premier fix "Mes modèles" (`marginBottom` seul) insuffisant — le vrai bug était l'absence de scroll, pas un problème de marge/zone de sécurité.

## 5. Prochaine étape
1. Aucune action bloquante en attente côté app — build preview validé par l'utilisateur, rien à committer.
2. Items reportés, à reprendre sur demande de l'utilisateur : isolation Supabase dev/prod, nettoyage des branches mergées sur origin, décision sur `docs/spec-web-upgrade`, confirmation d'exécution de la migration `20260728_intervenant_checklist_templates.sql` (PR #74, bloquant pour "Mes modèles" — toujours pas confirmée), démarrage du nouveau site Infomaniak, points 13-14 (EAS Build APK signé + fiche Play Store) quand l'utilisateur sera prêt à soumettre.
