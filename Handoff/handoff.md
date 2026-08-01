# Handoff — AvecToi
_Généré le : 2026-07-22 (soir, suite)_

## État global du projet

**Stack :** React Native + Expo SDK 51+, Expo Router, Supabase (BDD/Auth/Storage/Realtime/Edge Functions), EAS Build + EAS Update (channels development/preview/production, `expo-updates` installé). expo-notifications, expo-calendar, expo-image-picker. Resend (transactionnel) branché sur les Edge Functions. Stripe côté web uniquement (avectoi.care), app 100% "reader" conforme Play Store. Supabase CLI bloqué sur cette machine (App Control Policy Windows) : déploiement des migrations/Edge Functions exclusivement via le Dashboard Supabase (copier/coller le SQL en un seul bloc).

**EAS Update — automatisé depuis le 20/07 (PR #61), quoting corrigé le 21/07 (PR #86) :** `.github/workflows/eas-update-preview.yml` publie automatiquement `eas update --channel preview` à chaque push sur `main` contenant du code app (paths-ignore sur `Handoff/`, `Documentation/`, `**.md`). Un `workflow_dispatch` permet aussi de rejouer une publication manuellement.

**⚠️ Points d'attention, à ne pas reproduire :**
- **Quoting bash (résolu, PR #86) :** ne jamais interpoler `${{ github.event.head_commit.message }}` directement dans un `run:` bash — passer par une variable d'environnement (`env: COMMIT_MESSAGE: ...`).
- **Redémarrage complet nécessaire après publication OTA :** fermer l'app depuis le multitâche (pas juste arrière-plan), parfois relancer deux fois juste après une publication.
- **Changement d'asset natif = pas livrable en OTA.** Icône, splash, etc. exigent un nouveau EAS Build.
- **EAS Update ne remet jamais le menu dev-client (shake) en place** (résolu PR #97) : le menu shake (`DevLauncherActivity`) est compilé dans le binaire natif une fois pour toutes au moment du `eas build` — vérifier `eas.json` si `developmentClient: true` est combiné à un `gradleCommand` custom (neutralise silencieusement le dev-launcher). Diagnostic fiable : inspection binaire de l'APK (`AndroidManifest.xml` + `classes*.dex`, recherche de `DevLauncherActivity`), pas juste lecture de la config.
- **⚠️ Nouveau (22/07, résolu PR #101 après un 1er correctif insuffisant PR #100) — `ScrollView` avec `contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}` dans une modale peut bloquer complètement le scroll sur Android dès que le contenu dépasse la hauteur de l'écran**, même après avoir changé `justifyContent` en `"flex-start"` (le 1er correctif a changé l'alignement visuellement mais n'a PAS débloqué le scroll — l'utilisateur l'a confirmé après test réel). Pattern fiable qui fonctionne, déjà utilisé dans `IntervenantProfileModal.tsx` et `MyChecklist.tsx` ("Mes modèles", PR #91-92) : ne pas mettre toute la carte dans un `ScrollView` à hauteur non bornée ; borner la carte (`maxHeight: "85-88%"`) et n'envelopper que la zone de champs dans un `ScrollView` à `maxHeight` fixe en pixels, en laissant le titre et les boutons d'action **en dehors** du `ScrollView` (toujours visibles, jamais besoin de scroller pour les atteindre). `components/SoinFormModal.tsx` utilise encore l'ancien pattern à risque (`flexGrow:1`/`justifyContent:"center"`) mais son contenu est court et ne déborde pas actuellement — à surveiller si le formulaire s'enrichit.

**Repo GitHub :** `https://github.com/EI-HCS-Consulting/AvecToi`, branche `main` protégée par ruleset (PR obligatoire). `main` local à jour avec `origin/main` (PR #101 mergée, merge commit `cb64af7`).

**Branches ouvertes sur `origin` (nombreuses, nettoyage jamais fait faute de demande explicite) :** `docs/spec-web-upgrade` (en attente d'une décision utilisateur depuis plusieurs sessions), `fix/souvenirs-rls-and-news-delete` (stale, cf. ci-dessous) + de nombreuses branches déjà mergées mais pas supprimées. Nettoyage à faire uniquement sur demande explicite.

**Livré (V1, CLAUDE.md points 1-10) :** setup Expo/Supabase/Git, Auth admin, accès visiteur, calendrier + créneaux + réservation + PIN, galerie Souvenirs, Nouvelles du jour, Entraide + Mur de soutien, 6 thèmes + Dark/Light, "Prochaine disponibilité", ajout calendrier natif Android, RLS, accompagnants, parité admin/visiteur "Mon compte", onboarding séquencé, cap freemium, Paramètres 4 sections + historique, emails réservation/annulation (Resend), fiche patient + profils visiteurs, Chronologie, Planning des intervenants, mode "1 visite par jour" unifié, téléphone/phrase totem/photo unifiés Mon compte ↔ fiche intervenant, checklists personnelles réutilisables cross-espace, sauvegarde auto hebdo du schéma Supabase, purge RGPD automatisée via `pg_cron` (rétention 90 jours), rattachement multi-espaces intervenant via "Mes Patients", popup "Chevauchement" harmonisé + précheck "1 visite par jour" immédiat, icône adaptive Android corrigée.

**Batch UX intervenant (22/07, PR #96) — métiers, accès, actualités, chronologie :** catalogue de métiers prédéfini (icône dédiée = avatar par défaut tant qu'aucune photo n'est ajoutée), sélection obligatoire à la fiche intervenant, métier affiché sous le nom sur les cartes Intervenants et attaché à chaque soin ; écran "Rejoindre l'espace" intervenant à deux modes (code dossier saisi / lien préempli) ; priorité des créneaux intervenants sur les visites rendue configurable par l'admin (popup dédiée) ; canal Nouvelles intervenants/admin séparé des visiteurs par défaut, avec bascule admin pour l'ouvrir aux visiteurs ; bloc "Soutien" remplacé par "Mes soins" ; Chronologie enrichie d'un encadré vert pour les soins intervenants. `Documentation/Documentation Fonctionnalités.docx` mise à jour en conséquence (§5.7, §5.14, §5.15, §5.16, §6.3, §7.1, §7.2, §7.3).

**Build EAS preview le plus récent (22/07) :** `5f3090c1-eeff-46e1-b7bd-6134571e2ea1` (profil `preview`, APK), terminé avec succès, menu dev-client confirmé présent par inspection binaire (fix PR #97). Depuis, seuls des fixes JS purs ont été livrés (PR #98, #100, #101) — publiés automatiquement en OTA sur le channel `preview`, aucun nouveau build natif nécessaire. **Aucune soumission Play Store effectuée** — points 13-14 du backlog toujours pas commencés.

**En cours / pas commencé :**
- **⚠️ `fix/souvenirs-rls-and-news-delete` (cf. `AUDIT_RLS_TAILLE_CODE_MORT.md`, racine) : branche stale**, prédate le batch PR #96 → nécessite un rebase avant de reprendre ses 2 migrations RLS (bucket `souvenirs` policies + DELETE sur `news_entries`), toujours pas exécutées en prod, PR pas encore ouverte.
- Taille de l'app (180 Mo) et audit code mort/redondant : volontairement reportés par l'utilisateur ("on verra plus tard"), à reprendre sur demande.
- Points 13-14 (EAS Build APK signé, fiche Play Store) : pas commencés, décision volontairement différée par l'utilisateur.
- Isolation Supabase (séparer l'instance prod partagée avec le site web) : plan complet dans `ISOLATION_SUPABASE.md`, différée sur décision de l'utilisateur.
- `docs/spec-web-upgrade` : toujours en attente d'une décision.
- **Migration `20260728_intervenant_checklist_templates.sql` (PR #74) :** toujours pas confirmée exécutée en prod par l'utilisateur — "📥 Mes modèles" restera en échec silencieux tant que ce n'est pas fait.

**Fils ouverts (site web historique) :**
1. **Mélange nuitées/créneaux entre espaces sur le site Vercel historique** (`planning-visites-maman.vercel.app`) : root cause identifiée, non corrigeable sans risque. Décision : décommissionner au profit du futur site Infomaniak — pas encore exécuté.
2. **Nouveau site web à héberger sur Infomaniak** : pas encore scopé, à démarrer quand l'utilisateur sera prêt.

## Historique cumulé
- Lots 1-10 (fonctionnalités de base) + sessions du 2026-07-04 au 07-17 (`dossier_code`, cap freemium, PIN visiteur sécurisé, Paramètres 4 sections, historique + recasage auto, Resend, fiche patient, Dark/Light, Chronologie, checklists administratives, Planning des intervenants) — PR #7-#41, mergées.
- 2026-07-18 → 07-19 : correctif alerte de recasage (PR #44), mode "1 visite par jour" (PR #45), refonte compte Intervenant Phase A + unification photo/téléphone/phrase totem (PR #56-57).
- 2026-07-20 : fix session photo intervenant, masquage créneaux "1 visite/jour", EAS Update via GitHub Actions, vue `visitor_profiles_by_patient`, réorganisation Planning des intervenants, rattachement multi-espaces intervenants, refonte navigation + Mon compte intervenant, checklists perso réutilisables (PR #59-76).
- 2026-07-21 : fix flèches jour visiteur/intervenant, RGPD 90 jours + sauvegarde auto schéma Supabase, purge RGPD `pg_cron`, pivot d'espace intervenant via code dossier → sous-menu "Mes Patients", fix publication OTA cassée par guillemets du message de commit, popup "Chevauchement" harmonisé + précheck day-cap immédiat, icône adaptive Android corrigée + fix scroll "Mes modèles" (PR #77-92), build EAS preview `52e0707b` validé par l'utilisateur.
- 2026-07-22 (journée) : batch UX intervenant a-k mergé (PR #96) ; fix dev-client cassé par override `gradleCommand`, vérifié par inspection binaire d'APK (PR #97) ; fix lint Supabase `security_definer_view` sur `visitor_profiles_by_patient` (PR #98) ; build EAS preview `5f3090c1` terminé, dev-client confirmé présent.
- 2026-07-22 (soir, cette session) : fix scroll bloqué sur la fiche intervenant (grille métiers) — 1er correctif insuffisant (PR #100), root cause réelle identifiée et corrigée (PR #101).

## 1. Objectif de la session
Corriger un bug bloquant signalé par l'utilisateur après le batch PR #96 : sur l'écran "Fiche intervenant" (création à la première connexion, ou édition depuis Mon compte), impossible de scroller depuis l'ajout de la grille de métiers — les boutons "Enregistrer"/"Annuler" devenaient inaccessibles.
État "done" : le scroll fonctionne réellement et les boutons sont atteignables, confirmé par un fix vérifié en conditions réelles par l'utilisateur (pas seulement en théorie/code review) ; handoff à jour.

## 2. État actuel

**PR #100 — 1er correctif (insuffisant) :** diagnostic initial : `ScrollView` avec `contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}` — piège React Native/Android identifié comme bloquant le scroll dès que le contenu dépasse la hauteur d'écran. Fix appliqué : `justifyContent` passé à `"flex-start"`. Mergé (merge commit `d21c5cc`). **Insuffisant** : l'utilisateur a testé après merge et confirmé que la présentation avait changé (contenu ancré en haut) mais que le scroll restait toujours bloqué.

**PR #101 — correctif réel :** changement d'approche plutôt qu'un simple ajustement de style. Plutôt que de faire défiler toute la carte dans un `ScrollView` à hauteur non bornée (dont le bon fonctionnement dépendait d'un calcul implicite de hauteur, visiblement pas fiable ici), seule la zone des champs (photo, identité, téléphone, métier, types d'intervention) est désormais enveloppée dans un `ScrollView` à `maxHeight` fixe (420px). Le titre et les boutons Enregistrer/Annuler restent **en dehors** de ce `ScrollView`, toujours visibles en haut/bas de la carte (elle-même bornée à 88% de la hauteur d'écran). Les boutons ne nécessitent donc plus de scroller pour être atteints, et la liste de champs défile dans une zone dont la hauteur est explicitement bornée en pixels — même pattern déjà éprouvé dans `IntervenantProfileModal.tsx` et `MyChecklist.tsx` (fix "Mes modèles", PR #91-92). Mergé (merge commit `cb64af7`).

**OTA :** les deux fixes sont des changements JS purs (aucun asset natif touché) → publiés automatiquement en OTA sur le channel `preview` via le workflow GitHub Actions, aucun nouveau build EAS nécessaire.

**Documentation fonctionnelle :** non modifiée cette session — ces deux PR sont des corrections de bug d'implémentation, sans changement du comportement fonctionnel déjà décrit dans `Documentation Fonctionnalités.docx` (pas de nouvel écran, bouton ou changement de règle métier).

**Dernière action avant ce handoff :** merge de PR #101 confirmé par l'utilisateur, rédaction de ce handoff.

## 3. Fichiers concernés
- `components/IntervenantFicheModal.tsx` → PR #100 : `justifyContent: "flex-start"` (insuffisant seul). PR #101 : restructuration — `ScrollView` à `maxHeight: 420` limité aux champs, boutons Enregistrer/Annuler sortis du scroll, `card` borné à `maxHeight: "88%"`.
- `Handoff/handoff.md` → ce fichier.

## 4. Ce qui a échoué
- **Le diagnostic initial (PR #100) était incomplet.** L'hypothèse "justifyContent: center bloque le scroll sur Android quand le contenu déborde" est un piège RN réel et documenté, mais corriger uniquement l'alignement (`flex-start`) n'a pas suffi à débloquer le scroll dans ce cas précis — changement visuellement confirmé par l'utilisateur (contenu réancré en haut) sans que le problème de fond (scroll non fonctionnel) soit résolu. Root cause exacte du blocage résiduel non isolée davantage (pas de reproduction possible sur cette machine, pas d'accès à un device Android pour déboguer en direct) ; plutôt que de continuer à ajuster des propriétés de style au hasard sur la même structure, la PR #101 a changé de structure pour un pattern déjà éprouvé ailleurs dans l'app plutôt que de re-tenter une variante du même schéma non bordé.
- **Leçon à retenir :** sur ce projet, ne pas se fier à un changement visuel (alignement, couleur, position) comme preuve qu'un bug de comportement (scroll, tap, gesture) est résolu — le confirmer explicitement fonctionnellement avant de considérer un fix comme terminé, particulièrement pour tout ce qui touche au geste de scroll dans une modale Android.

## 5. Prochaine étape
1. **Attendre la confirmation de l'utilisateur que le scroll fonctionne réellement** sur la fiche intervenant après ce fix (PR #101, publié en OTA) — rien à faire côté code tant que ce retour n'est pas arrivé.
2. Si le problème persiste malgré PR #101 : creuser plus profondément (le pattern `maxHeight` fixe en pixels est normalement fiable sur RN/Android, donc une persistance du bug pointerait vers autre chose — conflit de gestes avec un composant tiers, `pointerEvents` mal configuré, ou bug de rendu spécifique au device de test).
3. Envisager d'appliquer préventivement le même pattern à `components/SoinFormModal.tsx` (utilise encore l'ancien `flexGrow:1`/`justifyContent:"center"`) si son contenu venait à s'allonger.
4. Items reportés, à reprendre sur demande de l'utilisateur, par ordre suggéré : rebase + reprise de `fix/souvenirs-rls-and-news-delete` (2 migrations RLS bloquées), confirmation d'exécution de la migration `20260728_intervenant_checklist_templates.sql` (PR #74, bloquant pour "Mes modèles"), isolation Supabase dev/prod, taille de l'app (180 Mo) et code mort/redondant, nettoyage des branches mergées sur origin, décision sur `docs/spec-web-upgrade`, démarrage du nouveau site Infomaniak, points 13-14 (EAS Build APK signé + fiche Play Store) quand l'utilisateur sera prêt à soumettre.
