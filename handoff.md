# Handoff — AvecToi
_Généré le : 2026-08-14_

## 1. Objectif de la session

Suite d'itérations sur l'écran calendrier visiteur (`app/(visitor)/home/calendar.tsx`),
demandées au fil de l'eau après retours utilisateur sur build de dev :

1. **Round A (PR #174)** : la bande verte "mes créneaux" d'un intervenant pouvait
   s'afficher sur le soin d'un **autre** intervenant partageant le même PIN à 4
   chiffres (PIN choisi librement, pas garanti unique dans un espace) → identifier
   un soin via `intervenant_profile_id` (fiable, unique par fiche) plutôt que le
   PIN seul. Au passage : calendrier repositionné avant les blocs de réglages,
   tri anté-chronologique des listes "à venir" du panneau perso, panneau
   intervenant qui bascule Soins/Visites avec le switch du calendrier.
2. **Round B (PR #175)** : repasser le switch Mensuel/Hebdo seul avant le
   calendrier, ajouter le bouton "Afficher mes créneaux" sous le switch
   Visites/Soins (puisqu'eux seuls règlent l'affichage qui suit), masquer le
   détail du jour sélectionné sous la bande Hebdo (même comportement qu'en
   Mensuel : un tap navigue vers l'écran dédié des créneaux au lieu d'afficher
   inline).
3. **Round C (PR #176)** : dissocier le bloc à 2 switchs — Mensuel/Hebdo seul
   avant le calendrier, Visites/Soins regroupé avec "Afficher mes créneaux"
   dans un même bloc (bouton sous le switch). Corriger le fait que le
   panneau perso visiteur (`MesVisitesPanel`, titres figés) ne suivait pas le
   switch Visites/Soins → remplacé par `IntervenantPlanningPanel` (déjà
   piloté par `soinsMode`) pour tous les rôles, ce qui fait aussi basculer les
   titres "Visites planifiées"/"Soins planifiés" et "Historique des
   visites"/"Historique des soins". Renommage "Visites à venir" →
   "Visites planifiées". Correction d'un 2ᵉ cas de bande verte erronée : cette
   fois sur une visite/nuitée d'un **visiteur** partageant le même PIN qu'un
   autre visiteur (le PIN n'a pas d'équivalent `intervenant_profile_id` côté
   visiteur) → `isMyReservation` exige désormais aussi la correspondance
   prénom+nom de la session quand elle est disponible.

État "done" — tout est mergé sur `main`, vérifié par l'utilisateur au fil des
rounds ("mergé" confirmé après chaque PR) :
- PR #174, #175, #176 : les 3 rounds ci-dessus, mergés sur `main`.

## 2. État actuel

**Ce qui fonctionne / est déployé :**
- Ordre des blocs : bloc "Mensuel/Hebdo" seul, puis bloc "Visites/Soins +
  Afficher mes créneaux" (switch au-dessus du bouton), puis (visiteurs
  uniquement) "Prochaine disponibilité", puis le calendrier (Mensuel ou
  Hebdo selon le switch).
- Vue Hebdo (`WeekStrip`) : un tap sur un jour navigue vers l'écran dédié des
  créneaux, exactement comme la grille Mensuel — plus aucun détail inline.
- Panneau sous le calendrier unifié (`IntervenantPlanningPanel`) pour les 3
  rôles : titres et filtre basculent avec `soinsMode` ("Visites
  planifiées"/"Soins planifiés", "Historique des visites"/"Historique des
  soins"). `MesVisitesPanel.tsx` supprimé (devenu redondant).
- Bande verte "mes créneaux" fiable dans les deux cas de collision de PIN
  identifiés : soins (via `intervenant_profile_id`) et visites/nuitées (via
  PIN + prénom+nom de la session, `isMyReservation` dans `lib/slotUtils.ts`).

**Pas encore vérifié :**
- Rien en attente de vérification côté utilisateur à ce stade — le dernier
  "mergé" (PR #176) a été confirmé sans réserve.

**Dernière action effectuée avant ce handoff :**
Génération de ce handoff, `main` local synchronisé avec `origin/main`
(fast-forward, PR #176 inclus, commit `73a7b25`).

## 3. Fichiers concernés

**Modifiés (PR #174, mergé) :**
- `app/(visitor)/home/calendar.tsx`, `components/IntervenantPlanningPanel.tsx`,
  `components/MesVisitesPanel.tsx`, `components/WeekStrip.tsx`,
  `lib/slotUtils.ts` — bande verte via `intervenant_profile_id`, réordonnancement,
  tri anté-chronologique.

**Modifiés (PR #175, mergé) :**
- `app/(visitor)/home/calendar.tsx`, `components/WeekStrip.tsx` (nouvelle prop
  `onDayPress`, distincte de `onSelectDay` qui reste un housekeeping interne),
  `app/(admin)/home/calendar.tsx` (ajustement minimal pour rester compatible
  avec la nouvelle prop `onDayPress` requise sur `WeekStrip`, comportement
  admin inchangé).

**Modifiés (PR #176, mergé) :**
- `app/(visitor)/home/calendar.tsx` → split des 2 cartes de réglages,
  `panelReservations`/`familyBooked` passent `myPrenom`/`myNom`, panneau
  unifié sur `IntervenantPlanningPanel`.
- `components/IntervenantPlanningPanel.tsx` → commentaire d'en-tête corrigé
  (composant commun aux 3 rôles, plus seulement "pour le rôle intervenant").
- `components/MesVisitesPanel.tsx` → **supprimé** (dernier usage retiré,
  aucune autre référence dans le repo).
- `components/WeekStrip.tsx` → props optionnelles `myPrenom`/`myNom`
  transmises à `isMyReservation`.
- `lib/slotUtils.ts` → `isMyReservation(r, myPin, intervenantProfileId, myPrenom?, myNom?)` :
  pour les types `Visite`/`Nuit`, exige en plus prénom+nom quand disponibles.

**Non touché (hors scope, vérifié) :**
- `app/(admin)/home/calendar.tsx` — écran calendrier admin, architecturalement
  séparé ; sa logique `familyBooked` (occupation du jour, pas d'identité
  filtrée) n'appelle pas `isMyReservation` et n'a pas eu besoin d'évoluer au-delà
  du point PR #175 ci-dessus.

## 4. Ce qui a échoué / pièges rencontrés

- **PIN à 4 chiffres non garanti unique dans un espace** : racine commune des
  deux bugs de bande verte (PR #174 pour les soins, PR #176 pour les
  visites/nuitées). Le PIN est choisi librement par chaque utilisateur et
  n'est vérifié en unicité que ponctuellement (ré-appairage d'un intervenant
  existant via prénom+nom). ⚠️ Réflexe à garder pour tout futur filtrage
  "par identité" dans ce repo : ne jamais se fier au seul PIN, préférer un
  identifiant de fiche stable (`intervenant_profile_id`) quand il existe, ou
  ajouter prénom+nom en filtre secondaire quand ce n'est pas le cas (visiteurs,
  qui n'ont pas de compte/fiche).
- **Narrowing TypeScript et `function` déclarée vs `const` fléchée** : une
  garde de nullabilité en début de composant (`if (!space || !slotConfig)
  return null;`) ne narrowe pas le type à l'intérieur d'une `function`
  déclarée plus bas (hoisting), mais narrowe correctement dans une expression
  `const maFonction = (iso: string) => { ... }` définie positionnellement
  après la garde. ⚠️ Toujours préférer les `const` fléchées pour les helpers
  internes d'un composant qui dépendent d'un early-return de nullabilité.
- **Piège d'accolade lors d'un split de bloc JSX** : en séparant le bloc à 2
  switchs en 2 cartes distinctes (PR #176), une première tentative a englobé
  par erreur "Afficher mes créneaux", "Prochaine disponibilité" et tout le
  calendrier à l'intérieur du `{space.intervenants_enabled && (...)}` du 2ᵉ
  bloc — repéré et corrigé avant commit en relisant le fichier complet après
  l'édition, pas seulement le diff local de l'edit. ⚠️ Après toute
  restructuration de JSX imbriqué (ajout/déplacement de `&&` conditionnels),
  relire la zone entière (pas juste la portion éditée) pour vérifier que les
  parenthèses/accolades ferment bien là où c'était prévu.

## 5. Prochaine étape

1. Pas de tâche en attente à ce stade — attendre la prochaine demande de
   l'utilisateur.
2. Fichiers exclus du repo par consigne explicite de session (ne jamais les
   stager/committer) : `Documentation/Documentation Fonctionnalités.docx`,
   `AUDIT_RLS_TAILLE_CODE_MORT.md`, `PRD_ClaudeCode_Site_avectoi_care_v3.md`,
   `eslint.config.js` — pré-existants localement, sans lien avec ce chantier.
3. Un plan existant (non démarré) attend une éventuelle reprise : refonte de
   la fiche intervenant en popups enchaînées + gestion des soins en 2 popups
   (pick → durée), 2ᵉ spécialisation métier — plan détaillé sauvegardé côté
   outil (`joyful-swimming-snowglobe.md`), à relancer explicitement par
   l'utilisateur si souhaité (implique une migration SQL à faire exécuter
   manuellement dans le SQL Editor Supabase).
