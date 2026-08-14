# Handoff — AvecToi
_Généré le : 2026-08-14_

## 1. Objectif de la session

Chantier itératif sur les popups centrées ("Nouvelle du jour" dans
NewsFeed.tsx, "Laisser un message"/"Répondre" dans Soutien.tsx, plus
Entraide.tsx pour la partie caméra/galerie), branche
`fix/nuitees-popups-checklist-titre-besoin`, demandé au fil de l'eau après
retours utilisateur sur build de dev réel (pas d'émulateur disponible dans
cet environnement — tout est testé par l'utilisateur sur son téléphone
Android). Chaîne de 10 PR, toutes mergées sur `main` :

1. **PR #181** : nuitées admin visibles, popups centrées, toggle checklist, titre besoin auto.
2. **PR #182** : toggle Soins + bouton d'envoi invisible dans "Nouvelle du jour"/"Laisser un message".
3. **PR #183** : largeur des popups centrées instable pendant la frappe → stabilisée.
4. **PR #184** : popups de réponse mieux cadrés (contexte "en réponse à…" toujours visible, popup agrandi).
5. **PR #185** : popups de message/réponse agrandis, tout visible sans scroll à l'ouverture.
6. **PR #186** : popups ancrées en bas (`flex-end`, proche du clavier) au lieu du haut ; choix caméra/galerie généralisé à toutes les photos (Soutien + Entraide) ; photo attachable sur une réponse à une "Nouvelle du jour".
7. **PR #187** : sur Android, `KeyboardAvoidingView behavior={... : undefined}` ne redimensionnait jamais le conteneur → passé à `"height"` pour que l'ancrage bas fonctionne réellement.
8. **PR #188** : boutons photo encore rognés/tap absorbé par le clavier → sortis du `ScrollView` vers une zone fixe juste au-dessus des boutons Annuler/Envoyer ; ajout du support photo sur les réponses du mur de soutien (nouvelle colonne `photo` sur `support_message_replies`, migration appliquée).
9. **PR #189** : boutons photo restylés en "vrai bouton" doré (même design que "✨ Checklists suggérées") ; lightbox photo ajoutée au mur de soutien (tap pour agrandir, appui long pour télécharger via le partage natif) ; hauteur des zones de texte réduite (170→140) sur "Laisser un message"/"Répondre".
10. **PR #190** : titres de "Laisser un message" et "Nouvelle du jour" rognés/invisibles au clavier ouvert → sortis eux aussi du `ScrollView` (même cause racine que le fix des boutons en PR #188, mais côté haut de la modale cette fois) ; bouton photo de "Nouvelle du jour" unifié en bouton pleine largeur "📷 Ajouter une photo (optionnel)".

État "done" — tout est mergé sur `main`, confirmé par l'utilisateur au fil
des rounds ("mergé" après chaque PR, dernier "mergé / ok" reçu pour la PR #190).

## 2. État actuel

**Ce qui fonctionne / est déployé :**
- Toutes les popups centrées (`centeredOverlay`/`centeredSheet`) de
  NewsFeed.tsx et Soutien.tsx sont ancrées en bas, se redimensionnent
  correctement sous Android avec le clavier ouvert, et gardent titre +
  bouton photo/preview toujours visibles (les deux hors du `ScrollView`
  désormais, voir section 4).
- Boutons "Ajouter une photo" au design doré unifié partout
  (NewsFeed, Soutien) ; choix caméra/galerie généralisé (NewsFeed, Soutien,
  Entraide).
- Mur de soutien (Soutien.tsx) : lightbox plein écran sur tap d'une photo
  (message ou réponse), téléchargement par appui long via le partage natif
  (`expo-file-system` + `expo-sharing`, pattern réutilisé de
  `SouvenirsGallery.tsx`, aucune nouvelle dépendance native).
- Réponses du mur de soutien et réponses à une "Nouvelle du jour" peuvent
  toutes deux avoir une photo attachée.

**Pas encore vérifié :**
- PR #190 vient d'être confirmée mergée par l'utilisateur ("mergé / ok")
  sans détail supplémentaire — pas de nouveau bug remonté à ce stade, mais
  pas de confirmation explicite point par point du test plan (titres
  visibles clavier ouvert dans les 3 modales concernées, look du nouveau
  bouton photo "Nouvelle du jour"). Rien d'actif en attente, mais si un
  nouveau round de retours arrive, il concernera vraisemblablement ce
  point ou un détail visuel fin.

**Dernière action effectuée avant ce handoff :**
Génération de ce handoff. `origin/main` à jour avec la PR #190 mergée
(commit `2f78f4a`). Branche locale `fix/nuitees-popups-checklist-titre-besoin`
toujours présente (locale + `origin`), plus aucun commit dessus qui ne soit
déjà sur `main`.

## 3. Fichiers concernés

**components/NewsFeed.tsx** — modale "Nouvelle du jour" (création/édition) et
sa modale "Répondre" : ancrage bas, redimensionnement Android, titre et
bouton photo sortis du `ScrollView`, bouton photo unifié en bandeau pleine
largeur (styles `photoAddBanner`/`photoAddBannerText`, anciens
`photoPickAdd`/`photoPickAddText` supprimés), support photo sur les
réponses.

**components/Soutien.tsx** — modales "Laisser un message", "Modifier le
message", "Répondre" : mêmes fixes (ancrage, titre et bouton photo hors
`ScrollView`, bouton doré), lightbox photo (état `lightbox`/
`downloadingLightbox`, fonction `downloadLightboxPhoto()`, styles
`lightboxBg`/`lightboxImg`/`lightboxHint`/`lightboxClose*`), textareas
réduites (140 sur ajout/réponse, 170 inchangé sur édition), support photo
sur les réponses (upload + colonne `photo`).

**components/Entraide.tsx** — 3 flux photo (création/édition de tâche,
photo de preuve à la clôture, photo lors d'une prise en charge) passés au
popup de choix caméra/galerie partagé (PR #186 uniquement, pas retouché
depuis).

**components/MyChecklist.tsx**, **components/SouvenirsGallery.tsx** — non
modifiés, consultés comme référence de design (`importBanner` pour le
bouton doré) et de pattern (`sharePhoto()` pour le téléchargement natif).

**Migrations Supabase appliquées** (par l'utilisateur, confirmées) :
- `20260814_news_entry_replies_photo.sql` — colonne `photo` sur
  `news_entry_replies`, réutilise le bucket `news-photos`.
- `20260814_support_message_replies_photo.sql` — colonne `photo` sur
  `support_message_replies`, réutilise le bucket `support-photos`.

**Non touché (hors scope) :**
- `app/(admin)/home/calendar.tsx` et le reste du calendrier — chantier
  précédent (PR #170-180), sans lien avec celui-ci.

## 4. Ce qui a échoué / pièges rencontrés

- **`KeyboardAvoidingView behavior={... : undefined}` sur Android est un
  no-op** (PR #187) : l'ancrage bas seul ne suffit pas dans une `Modal` RN
  sur Android tant que le conteneur ne se redimensionne pas réellement au
  clavier. ⚠️ Réflexe pour toute future popup centrée dans ce repo :
  `behavior={Platform.OS === "ios" ? "padding" : "height"}`, jamais
  `undefined` côté Android.
- **Contenu piégé dans un `ScrollView` = contenu qui peut disparaître au
  clavier, dans les deux sens** (PR #188 puis #190) : le scroll-to-focus
  automatique de RN pousse hors champ tout ce qui n'est pas le champ
  focalisé lui-même. Repéré d'abord côté bas (bouton photo, PR #188), puis
  côté haut (titre, PR #190) — même cause racine, deux symptômes qui
  peuvent sembler différents dans le retour utilisateur ("bouton rogné" vs
  "titre pas visible, faut scroller"). ⚠️ Tout élément qui doit rester
  visible en permanence (titre, contexte "en réponse à…", bouton
  photo/action) doit être sorti du `ScrollView`, placé dans une zone fixe
  de `centeredSheet` (avant le `ScrollView` pour le haut, entre
  `</ScrollView>` et `sheetBtns` pour le bas) — jamais résolu par du
  padding/taille seuls.
- **`ScrollView` imbriqué n'hérite pas de `keyboardShouldPersistTaps` du
  parent** (PR #188) : chaque `ScrollView` (y compris une rangée
  horizontale de vignettes) a besoin de son propre
  `keyboardShouldPersistTaps="handled"`, sinon un tap dessus alors qu'un
  champ a le focus se contente de fermer le clavier au lieu de déclencher
  l'action.
- **Ancrage top (`flex-start`/`paddingTop`) rejeté explicitement par
  l'utilisateur** (PR #185→#186) : "trop haut, pas assez grand" même une
  fois la popup agrandie — l'ancrage bas (`flex-end`, `paddingBottom`)
  colle le bas de la popup près du clavier et donne l'effet recherché de
  "grandit vers le haut depuis le champ de saisie". Convention à conserver
  pour toute nouvelle popup centrée de ce type.

## 5. Prochaine étape

1. Pas de tâche en attente à ce stade — attendre le prochain retour de
   test de l'utilisateur sur PR #190 (titres visibles clavier ouvert,
   look du bouton photo unifié dans "Nouvelle du jour").
2. Si un nouveau round de bugs/demandes arrive sur ce chantier, la
   prochaine PR serait #191, à ouvrir sur une branche fraîche depuis
   `main` (la branche `fix/nuitees-popups-checklist-titre-besoin` a fait
   son usage — tout son contenu est mergé).
3. Fichiers exclus du repo par consigne explicite de session (ne jamais
   les stager/committer) : `Documentation/Documentation Fonctionnalités.docx`,
   `AUDIT_RLS_TAILLE_CODE_MORT.md`, `PRD_ClaudeCode_Site_avectoi_care_v3.md`,
   `eslint.config.js` — pré-existants localement, sans lien avec ce
   chantier.
4. Mémoire long-terme à jour côté outil (`avectoi_popup_photo_pr_chain.md`,
   `avectoi_popup_anchor_lesson.md`, `avectoi_no_device_testing.md`,
   `avectoi_git_workflow.md`) — consultable en reprise de session pour le
   détail des patterns établis (ancrage bas, contenu hors ScrollView,
   téléchargement photo natif, etc.) sans avoir à relire tout l'historique
   de PR.
