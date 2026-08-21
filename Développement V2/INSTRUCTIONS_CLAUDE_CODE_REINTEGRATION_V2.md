# Instructions Claude Code — Réintégration du rôle Intervenant en V2

> À donner telle quelle à Claude Code au moment où le rôle Intervenant doit revenir dans l'app (V2). Lire d'abord les deux documents voisins dans `Développement V2/` :
> - `REFLEXION_FONCTIONNALITES_DESIGN_INTERVENANT.md` — le "pourquoi" : fonctionnalités, décisions d'architecture, leçons UX. **À lire en entier avant de commencer.**
> - `CODE_INTERVENANT_V1_COMPLET.md` — le code source complet tel qu'il existait au retrait (V1, `main` @ `4b1b8c7`), en deux sections : fichiers dédiés (contenu intégral) et fichiers partagés (extraits, contexte grep).

## 0. Avant de commencer

Le code de l'app aura évolué entre le retrait (2026-08-21) et cette réintégration. **Ne pas coller le code archivé tel quel sans vérifier** :
- Les fichiers **dédiés** (Section A de l'archive) peuvent généralement être recréés tels quels — ils ne dépendaient que d'infrastructure générique (composants de modale, `useSpace`/`useVisitorContext`, `lib/types.ts`, etc.) qui a probablement peu bougé. Vérifier quand même que les imports qu'ils font existent toujours sous les mêmes noms/signatures.
- Les extraits de fichiers **partagés** (Section B) ne sont **jamais** du copier-coller direct : ce sont des extraits du fichier tel qu'il était à l'époque, à re-tisser dans la version *actuelle* du fichier. Utiliser ces extraits pour comprendre *quoi* réintégrer et *comment* c'était branché (le pattern `role === "intervenant"`, les props ajoutées, etc.), puis réécrire l'intégration contre le fichier courant.
- Confirmer d'abord l'état de la base de données (voir §2) avant de toucher au code — ça détermine si des migrations sont nécessaires ou si le schéma est déjà en place.

## 1. Checklist de réintégration, dans l'ordre

### Étape 1 — Base de données
1. Vérifier si les tables `intervenant_profiles`, `intervention_types`, `intervenant_checklist_templates`, `night_authorized_intervenants`, `news_authorized_intervenants` existent encore en base (elles ont peut-être été laissées intactes lors du retrait V1, ou supprimées — voir la note de décision dans le handoff du retrait, ou demander à l'utilisateur).
2. Si absentes : rejouer dans l'ordre chronologique les migrations de la Section C de `CODE_INTERVENANT_V1_COMPLET.md` (elles sont nommées par date, `20260717_...` → `20260817_...`) — vérifier qu'aucune ne rentre en conflit avec des migrations plus récentes touchant les mêmes tables partagées (`reservations`, `patient_spaces`, `slot_config`, `news_entries`).
3. Si présentes mais que des colonnes ont été retirées entre-temps (ex. `reservations.intervenant_profile_id`, `patient_spaces.intervenants_enabled`, `slot_config.intervenant_priority_mode`/`night_intervenant_mode`/`news_intervenant_mode`, `reservations.alert_type` sans `'booking_proposal'` dans le CHECK) : les rajouter via une nouvelle migration plutôt que de forcer les anciennes.
4. Vérifier les fonctions RPC/triggers partagés qui avaient été rendus "intervention-aware" (`book_intervention()`, `apply_slot_rule_change()`, `check_slot_capacity()`) — s'assurer que leur version actuelle gère toujours (ou de nouveau) `type = 'Intervention'`.

### Étape 2 — Types
- Restaurer dans `lib/types.ts` : interfaces `IntervenantProfile`, `InterventionType`, `IntervenantChecklistTemplate` (Section D de l'archive), et les champs intervenant sur les interfaces partagées (`PatientSpace.intervenants_enabled`, `SlotConfig.intervenant_priority_mode`/`night_intervenant_mode`/`news_intervenant_mode`, `Reservation.type` incluant `"Intervention"` + `.duration_minutes`/`.intervention_label`/`.intervenant_profile_id`, `Reservation.alert_type` incluant `"booking_proposal"`, `NewsEntry.author_role` incluant `"intervenant"` + `.intervenant_profile_id`).

### Étape 3 — Fichiers dédiés (restauration directe)
- Recréer tous les fichiers de la Section A de l'archive (composants `Intervenant*`, `Soin*`, `Intervention*`, `DaySoinsModal`, `WeeklyPlanningGrid`, `DaySlotGrid`, `PatientColorLegend`, `PlanningLegend`, `PatientsList`, les fichiers `lib/` dédiés, les écrans `app/auth/intervenant-entry.tsx`, `app/(admin)/intervenants.tsx`, `app/(visitor)/intervenants.tsx`, `app/(visitor)/patients.tsx`, l'écran planning intervenant, et l'edge function `notify-intervention-confirmation`).
- Après restauration, lancer `npx tsc --noEmit` pour repérer les imports cassés (API de composants partagés qui a changé depuis) avant d'aller plus loin.

### Étape 4 — Fichiers partagés (re-tissage manuel)
Pour chaque fichier ci-dessous, ouvrir sa version **actuelle**, ouvrir l'extrait correspondant dans la Section B de l'archive, et réintégrer la logique intervenant à la structure actuelle du fichier (pas un copier-coller — la version actuelle a probablement changé depuis) :

- `app/index.tsx` — bouton d'entrée « Je suis intervenant ».
- `lib/visitorEntry.ts`, `lib/visitorSession.ts` — `completeIntervenantEntry()`, champs `role`/`metier`/`telephone`/`intervenantProfileId` de la session.
- `lib/freemiumCap.ts` — `canEnableIntervenants(space)`, gate Premium.
- `app/(admin)/settings.tsx` — toggle d'activation, section "🩺 Planning des intervenants", modales de config (`IntervenantPriorityModal`/`NightIntervenantModal`/`NewsIntervenantModal`), coloration chronologie. Trois emplacements supplémentaires masqués le même jour (voir doc réflexion §9), tous derrière `INTERVENANT_ROLE_ENABLED` — repasser le flag à `true` suffit à les reconnecter sans rien réécrire : le rendu de `IntervenantsBlock` (section Historique), le sous-bloc "🩺 Soins planifiés" (header + contenu + son appel `loadSoinsPlanifies()` dans `openSection`), et le filtre qui exclut les entrées "soin"/"resa_intervenant" de `chronoEvents` (à retirer pour que la frise Chronologie remontre les soins).
- `app/(admin)/home/calendar.tsx`, `app/(admin)/news.tsx`, `app/(admin)/_layout.tsx` — panneau soins admin, mode nouvelles, route d'onglet.
- `app/(visitor)/_layout.tsx` — **le fichier le plus sensible** : état `role`/`intervenantProfileId`, rattachement de fiche par appareil, onboarding bloquant, visibilité des onglets par rôle (`news`, `intervenants`, `entraide`, `soins`, `soutien`, `patients`).
- `app/(visitor)/account.tsx` — sync photo/contact intervenant, "Ma fiche intervenant", pivot cross-space, exclusion du champ "lien avec le patient".
- `app/(visitor)/home/calendar.tsx`, `home/nights.tsx`, `home/slots.tsx`, `news.tsx` — panneau planning, autorisation nuit, flux de réservation par rôle.
- `components/NewsFeed.tsx` — canal séparé, `news_authorized_intervenants`, coloration des posts.
- `components/MyChecklist.tsx` — "Mes modèles" cross-space.
- `components/VisitorSlotsList.tsx`, `PlanningDuJourBlock.tsx`, `AdminSlotsList.tsx` — affichage des interventions dans les listes de créneaux partagées.
- `components/VisitorsList.tsx`, `VisitorsBlock.tsx`, `components/Entraide.tsx` — exclusion des intervenants du décompte "Visiteurs".
- `components/WeekStrip.tsx` — pastilles "mes créneaux" / libellé "Intervenant"/"Soin".
- `lib/SpaceContext.tsx`, `lib/VisitorContext.tsx` — chargement + souscription temps réel de `intervenantProfiles`, champs `slot_config` associés.

### Étape 5 — Navigation & activation
- Vérifier que l'onglet "Planning des intervenants" admin reste **masqué** tant que `intervenants_enabled` est faux sur l'espace (comportement voulu depuis le début, pas une régression).
- Vérifier que l'entrée « Je suis intervenant » sur l'écran d'accueil ne s'affiche que si le rôle est activé sur l'espace ciblé par le lien/code dossier en cours (cf. `intervenant-entry.tsx` original).

### Étape 6 — Tests
Aucun test on-device n'avait pu être fait avant le retrait (voir §7 du doc réflexion). Prévoir en priorité, sur appareil réel :
- Swipe semaine/mois dans le planning intervenant, aux bornes d'année.
- Modales empilées (`DaySoinsModal` + modale par-dessus).
- `InterventionEditFlow` : changement de jour/horaire/type sur un soin existant, et son chemin de rollback si le RPC échoue.
- "Mes Espaces Patients" : bascule d'espace au tap d'une ligne, non-doublon avec "Autres soins planifiés".
- Fiche intervenant : scroll complet jusqu'aux boutons Enregistrer/Annuler (piège de ScrollView imbriquée déjà résolu une fois, à ne pas réintroduire — voir §6 du doc réflexion).

## 2. Pièges à ne pas refaire (résumé — détail complet dans le doc réflexion §5-6)

1. `intervenant_profiles.pin` peut être `NULL` (fiche créée par l'admin sans login) — ne jamais supposer qu'un PIN existe toujours pour un intervenant.
2. Jamais de `ScrollView` imbriquée dans une autre `ScrollView` pour une liste qui grandit (soins) — borner la carte, une seule zone scrollable entre header et footer fixes.
3. Un champ = un seul éditeur. Ne pas redupliquer prénom/nom/téléphone/phrase totem entre "Mes informations" et la fiche intervenant.
4. En cross-space, une date seule ne suffit pas à identifier un soin — toujours passer l'objet réservation complet aux callbacks de sélection.
5. Pas de nouveau RPC pour l'édition d'un soin déjà réservé — réutiliser `book_intervention` avec delete-then-rebook-and-rollback-on-failure.
6. Le rôle Intervenant est un sous-mode du Visiteur (même session locale, même infrastructure d'accès) — ne pas le reconstruire comme un rôle entièrement séparé, ce serait dupliquer beaucoup d'infrastructure existante pour rien.
