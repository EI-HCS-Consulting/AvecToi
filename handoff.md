# Handoff — AvecToi
_Généré le : 2026-08-15_

## 1. Objectif de la session

Chantier calendrier admin + permissions "Nouvelles du jour", branche
`feat/admin-calendrier-panel-et-news-permissions`, demandé au fil de l'eau
après retours utilisateur sur build de dev réel (pas d'émulateur disponible
dans cet environnement — tout est testé par l'utilisateur sur son
téléphone Android). Chaîne de 8 PR, toutes mergées sur `main` :

1. **PR #192** : panneau réservations calendrier admin restructuré (switch
   Visites/Soins déplacé, `IntervenantPlanningPanel` en lecture seule
   ajouté) + refonte permissions "Nouvelles du jour" (`news_intervenant_mode`
   disabled/some/all, remplace l'ancien toggle admin).
2. **PR #193** : toggle "Afficher mes créneaux" manquant côté admin + bande
   verte hebdo absente (l'admin était traité comme sans identité propre) ;
   popup "Nouvelles des intervenants" renommé et rendu lisible.
3. **PR #194** : vue Hebdo admin alignée sur le visiteur (bloc `AdminSlotsList`
   inline supprimé, navigation par tap comme le visiteur) ; bande verte
   fiabilisée une première fois.
4. **PR #195** : la bande verte / "Afficher mes créneaux" restaient cassées
   pour un admin n'ayant jamais réenregistré son profil depuis #194 — resync
   `admin_firstname`/`admin_lastname` déplacée dans `SpaceContext.fetchSpace()`
   (à chaque chargement d'espace, plus seulement à la sauvegarde manuelle).
5. **PR #196** : recasage automatique (`book_intervention`/
   `apply_slot_rule_change`) triait les créneaux candidats par distance
   absolue au lieu de "prochain créneau libre" → recasage vers un horaire
   antérieur possible, corrigé ; métier de l'intervenant ajouté aux blocs
   d'intervention ; `IntervenantPriorityModal` recoloré en orange (cohérence
   avec les 2 autres popups intervenants) + textes raccourcis.
6. **PR #197** : dans `IntervenantPriorityModal`, la checklist "Seulement
   certains intervenants" repart décochée par défaut au lieu de refléter
   `priority_slots` (qui vaut `true` par défaut en base).
7. **PR #198** : sous-menu "Mes alertes" ajouté côté admin (absent) et
   repositionné juste sous "Mes Checklists" côté visiteur/intervenant ;
   une seule bannière d'alerte par créneau au lieu d'une par visiteur
   déplacé ; popup "Changement de réservation" → "Modifier" qui s'ouvrait et
   se refermait aussitôt (conflit entre deux `<Modal>` natifs simultanés,
   corrigé) ; alertes triées par ordre chronologique.
8. **PR #199** : `apply_slot_rule_change()` ne doit jamais toucher un
   créneau déjà passé — le filtre `date >= current_date` laissait passer un
   créneau du jour même déjà passé en heure. Calcul de l'heure murale
   Europe/Paris côté serveur, exclusion des créneaux "Visite" du jour même
   déjà entamés (recasage + activation "1 visite par jour"). Nuitées
   laissées day-based uniquement (comportement existant, volontairement
   inchangé).

État "done" — tout est mergé sur `main`, confirmé par l'utilisateur au fil
des rounds ("mergé" après chaque PR, dernier "migration faite et pr
mergée. OK" reçu pour la PR #199).

## 2. État actuel

**Ce qui fonctionne / est déployé :**
- Calendrier admin (Mensuel + Hebdo) aligné sur le comportement visiteur :
  "Afficher mes créneaux", bande verte "mes réservations", panneau
  "Soins planifiés" repositionné en Hebdo.
- Permissions "Nouvelles du jour" par mode (désactivé/certains/tous les
  intervenants) via `NewsIntervenantModal`.
- Recasage automatique (changement de règles ou intervention prioritaire)
  vise toujours le prochain créneau libre à venir, jamais un horaire
  antérieur au créneau d'origine, et **jamais un créneau déjà passé**
  (nouveau garde-fou PR #199).
- Blocs d'intervention affichent le métier de l'intervenant.
- `IntervenantPriorityModal` : cohérent visuellement (orange) avec les
  autres popups intervenants, checklist "certains intervenants" démarre
  décochée.
- Sous-menu "🔔 Mes alertes" disponible pour les 3 profils (admin, visiteur,
  intervenant), juste sous "Mes Checklists" ; une seule bannière d'alerte
  par créneau côté admin (onglet Créneaux) ; popup de modification de
  réservation qui ne se referme plus tout seul ; alertes triées
  chronologiquement.

**Pas encore vérifié :**
- Rien d'actif en attente à ce stade — dernier retour utilisateur ("migration
  faite et pr mergée. OK") ne signale aucun nouveau bug. Si un nouveau
  round de retours arrive, il portera probablement sur un point non testé
  explicitement dans le détail (ex. `app/(admin)/home/nights.tsx`, qui a
  probablement le même pattern de bannière d'alerte dupliquée que
  `AdminSlotsList.tsx` avant PR #198, mais n'a jamais été signalé par
  l'utilisateur donc volontairement non touché).

**Dernière action effectuée avant ce handoff :**
Génération de ce handoff. `origin/main` à jour avec la PR #199 mergée
(migration `20260815_apply_slot_rule_change_skip_already_past_slots.sql`
confirmée appliquée manuellement par l'utilisateur). Branche locale
`feat/admin-calendrier-panel-et-news-permissions` toujours présente
(locale + `origin`), plus aucun commit dessus qui ne soit déjà sur `main`.

## 3. Fichiers concernés

**app/(admin)/home/calendar.tsx** — restructuration Mensuel/Hebdo,
`effectiveMyPin`, panneau "Soins planifiés" repositionné.

**app/(admin)/account.tsx** / **app/(visitor)/account.tsx** — resync
`admin_firstname`/`admin_lastname` déplacée dans `SpaceContext`, sous-menu
"Mes alertes" ajouté/repositionné, `myActiveAlerts` triés chronologiquement.

**lib/SpaceContext.tsx** — resync identité admin dans `fetchSpace()`,
ajout de `intervenantProfiles` (mirroir de `VisitorContext.tsx`) pour la
résolution du métier côté admin.

**components/AdminSlotsList.tsx** / **components/VisitorSlotsList.tsx** —
label métier dans les blocs d'intervention, bannière d'alerte unique par
créneau (admin uniquement, pas retouché sur `VisitorSlotsList.tsx` qui
n'affichait déjà que sa propre alerte).

**components/IntervenantPriorityModal.tsx** — recoloré orange (12
occurrences), textes raccourcis, checklist "certains intervenants" démarre
décochée.

**components/MyAlertsModal.tsx** — nouveau, rendu context-free
(`onModify`/`onMarkSeen` en props) pour être utilisable depuis
`VisitorContext` et `SpaceContext`.

**components/RebookingAlertModal.tsx** — état local `hiddenId` pour éviter
le conflit entre deux `<Modal>` natifs simultanés, tri chronologique des
alertes.

**supabase/migrations/** — 3 migrations ce chantier, toutes **appliquées
manuellement par l'utilisateur** (pas de projet Supabase lié dans cet
environnement) :
- `20260814_news_intervenant_mode.sql`
- `20260815_fix_book_intervention_same_day_rebook_order.sql` (tri par
  "prochain créneau libre" au lieu de distance absolue)
- `20260815_apply_slot_rule_change_skip_already_past_slots.sql` (jamais
  toucher un créneau déjà passé)

**Non touché (hors scope, signalé mais volontairement laissé de côté) :**
- `app/(admin)/home/nights.tsx` — logique de bannière d'alerte inline
  probablement dupliquée comme `AdminSlotsList.tsx` avant PR #198, jamais
  signalé par l'utilisateur (qui n'a mentionné que l'onglet "Créneaux").
- Pas d'équivalent `RebookingAlertModal` bloquant à l'ouverture côté admin
  pour ses propres réservations déplacées — seul le sous-menu "Mes alertes"
  a été ajouté admin-side.

## 4. Ce qui a échoué / pièges rencontrés

- **Un champ qui a l'air inutilisé ne l'est pas forcément** (PR #193) :
  `admin_firstname`/`admin_lastname`/`admin_pin` existaient déjà sur
  `PatientSpace` sans être branchés — l'admin était traité à tort comme
  "sans identité" (comme un intervenant/visiteur anonyme), cassant le
  filtrage "mes créneaux". ⚠️ Avant de conclure qu'un profil "n'a pas
  d'identité propre" dans ce repo, vérifier les champs `admin_*` sur
  `patient_spaces`.
- **Un champ resync-é seulement à la sauvegarde manuelle reste stale pour
  qui ne rouvre jamais ce formulaire** (PR #194→#195) : la resync
  `admin_firstname`/`admin_lastname` ajoutée dans `handleSaveProfile()`
  (PR #194) ne s'appliquait qu'aux admins qui rouvraient "Modifier mon
  profil" après coup — corrigé en déplaçant la resync dans
  `SpaceContext.fetchSpace()` (PR #195), qui tourne à chaque chargement
  d'espace, sans action utilisateur requise. ⚠️ Pour un self-heal fiable,
  préférer un hook de chargement à un hook de sauvegarde quand la donnée
  doit être correcte pour *tout le monde*, pas seulement ceux qui
  déclenchent l'action corrective.
- **Tri par distance absolue ≠ tri par "prochain créneau libre"** (PR #196) :
  `abs(to_minutes(s) - to_minutes(cohort_creneau))` peut choisir un horaire
  numériquement plus proche mais *antérieur* à l'original — aucun sens pour
  un recasage. Remplacé par un filtre strict `> cohort_creneau` + tri
  ascendant. Bug identique trouvé dans les deux fonctions SQL de recasage
  (`book_intervention` et `apply_slot_rule_change`) via un Plan-agent
  cross-check — sans lui, seule celle explicitement mentionnée par
  l'utilisateur aurait été corrigée.
- **Deux `<Modal>` natifs RN visibles en même temps ne coexistent pas
  proprement (surtout Android)** (PR #198) : `RebookingAlertModal` restait
  `visible` pendant l'ouverture du popup PIN de `BookingFlow.tsx` juste
  après la navigation (les données pas encore rafraîchies) → le second
  popup s'ouvrait et se refermait aussitôt. Corrigé par un état local
  (`hiddenId`) masquant l'alerte dès le clic, sans attendre le
  rafraîchissement DB. ⚠️ Réflexe pour toute future popup bloquant une
  navigation vers un autre popup natif dans ce repo.
- **`current_date` (SQL) ignore l'heure, et dépend du fuseau serveur (UTC),
  pas de l'heure murale Europe/Paris** (PR #199) : un filtre `date >=
  current_date` seul laisse passer un créneau du jour même déjà passé en
  heure. Calculer `now() at time zone 'Europe/Paris'` pour obtenir
  jour+heure murale corrects avant toute logique "ce créneau est-il encore
  à venir ?" côté SQL — la source de vérité côté client est
  `lib/slotUtils.ts` (`isSlotPast`/`isReservationDatePast`/
  `isSlotFullyPast`), à consulter avant d'écrire l'équivalent SQL. Les
  nuitées restent volontairement day-based uniquement (pas d'heure de
  "passé" pour une "Nuit", qui couvre toute la soirée).

## 5. Prochaine étape

1. Pas de tâche en attente à ce stade — attendre le prochain retour de
   test de l'utilisateur.
2. Si un nouveau round de bugs/demandes arrive sur ce chantier, la
   prochaine PR serait #200, à ouvrir sur une branche fraîche depuis
   `main` (la branche `feat/admin-calendrier-panel-et-news-permissions` a
   fait son usage — tout son contenu est mergé).
3. Points connus non couverts si l'utilisateur les remonte un jour : la
   même déduplication de bannière d'alerte que PR #198 pourrait être
   nécessaire dans `app/(admin)/home/nights.tsx` ; pas de popup bloquant
   équivalent à `RebookingAlertModal` côté admin.
4. Fichiers exclus du repo par consigne explicite de session (ne jamais
   les stager/committer) : `Documentation/Documentation Fonctionnalités.docx`,
   `AUDIT_RLS_TAILLE_CODE_MORT.md`, `PRD_ClaudeCode_Site_avectoi_care_v3.md`,
   `eslint.config.js` — pré-existants localement, sans lien avec ce
   chantier.
5. Mémoire long-terme à jour côté outil
   (`avectoi_admin_calendar_news_permissions_branch.md`) — consultable en
   reprise de session pour le détail des patterns établis (resync
   identité admin, recasage "prochain créneau libre", garde-fou
   créneau-déjà-passé, etc.) sans avoir à relire tout l'historique de PR.
