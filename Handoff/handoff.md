# Handoff — AvecToi
_Généré le : 2026-08-10_

## État global du projet

**Stack :** React Native + Expo SDK 51+, Expo Router, Supabase (BDD/Auth/Storage/Realtime/Edge Functions), EAS Build + EAS Update (channels development/preview/production, `expo-updates`, publication OTA automatique sur push `main` via `.github/workflows/eas-update-preview.yml`). expo-notifications, expo-calendar, expo-image-picker. Resend (transactionnel) branché sur les Edge Functions. Stripe côté web uniquement. Supabase CLI bloqué sur cette machine (App Control Policy Windows) : déploiement des migrations/Edge Functions exclusivement via le Dashboard Supabase.

**⚠️ Règle Git STRICTE (CLAUDE.md) :** chaque modification, même un correctif ponctuel, part sur une branche neuve (depuis `origin/main` à jour) et se termine par sa propre PR poussée sur GitHub — jamais de nouveau commit ajouté à une branche dont la PR est déjà mergée. **L'utilisateur merge d'abord, puis teste** (le merge déclenche la publication OTA qui charge le nouveau bundle sur son téléphone — il n'a aucun autre moyen de tester une modif avant de merger). Toujours vérifier l'état réel d'une PR via `gh pr view <n> --json state,mergedAt` plutôt que de supposer.

**Repo GitHub :** `https://github.com/EI-HCS-Consulting/AvecToi`, branche `main` protégée par ruleset (PR obligatoire).

**PR ouverte, en attente de test/merge :** aucune.

**Livré (V1 + V2 partiel) :** tout le socle (points 1-10 CLAUDE.md), refonte intervenant complète (métiers, accès, priorité créneaux configurable, canal Nouvelles séparé, verrou Premium sur l'activation du rôle), RGPD 90j + purge auto + sauvegarde schéma hebdo, checklists perso réutilisables, rattachement multi-espaces intervenant, onboarding séquencé, cap freemium (8 visites), Paramètres 4 sections + historique, emails Resend (annulation, cap atteint, confirmation invité, demande de changement de nom), Chronologie, mode "1 visite/jour" unifié, icône adaptive Android, EAS Update automatisé, liens d'invitation vers `app.avectoi.care`. Le flux "Demande de changement de nom" (popup, envoi in-app, badge de statut, bouton "Fermer" de la vue succès) est désormais **entièrement fonctionnel et confirmé par l'utilisateur**, y compris visuellement (texte du bouton visible et centré).

**Nouveau ce cycle (#118 → #128) :** résolution complète d'un bug de rendu tenace sur le bouton "Fermer" du popup de succès "changement de nom" — le texte du bouton restait invisible (fond bleu uni, aucun texte) malgré 6 correctifs/diagnostics successifs. Root cause identifiée empiriquement : `styles.btnPrimary`/`styles.btnPrimaryText` (dimensionnement `flex: 1.3` + styles partagés) ne fonctionnent de façon fiable que pour des boutons **dans une rangée `sheetBtns` bornée** (`flexDirection: row`) ; utilisés seuls, hors rangée, avec un conteneur parent à hauteur non bornée, ils peuvent produire un rendu où le bouton (fond, taille, tap) est correct mais le texte enfant reste invisible — sans qu'aucune requête de style (couleur, taille de police, remount React, fermeture/réouverture du `Modal`) sur ce texte spécifique n'ait d'effet. Résolu en reconstruisant ce bouton précis avec taille fixe (220×50) et styles 100% inline (aucune référence à `btnPrimary`/`btnPrimaryText`), pattern validé au préalable par un diagnostic isolé (voir "Ce qui a échoué"). Voir détail session ci-dessous.

**Testé et confirmé par l'utilisateur ce cycle :** bouton "Fermer" du popup de succès "changement de nom" — texte visible en blanc sur fond bleu, bouton centré. Flux "changement de nom" intégralement fonctionnel de bout en bout.

**Connu, non bloquant :** aucun — la boîte mail `support@avectoi.care` a été créée par l'utilisateur pendant ce cycle ; les emails Resend de demande de changement de nom ont désormais une destination réelle.

**En cours / pas commencé (reporté, à reprendre sur demande) :**
- `fix/souvenirs-rls-and-news-delete` : branche stale, 2 migrations RLS jamais exécutées en prod (`AUDIT_RLS_TAILLE_CODE_MORT.md`).
- Migration `20260728_intervenant_checklist_templates.sql` (PR #74) : toujours pas confirmée exécutée en prod.
- Isolation Supabase (séparer l'instance prod partagée avec le site web historique) : plan complet dans `ISOLATION_SUPABASE.md`.
- `docs/spec-web-upgrade` : en attente d'une décision utilisateur.
- Taille de l'app (180 Mo) et audit code mort : volontairement reporté.
- Points 13-14 (EAS Build APK signé, fiche Play Store) : pas commencés.
- Site marketing `avectoi-site` (dépôt séparé, poussé sur `main`) : toujours pas déployé (Infomaniak, bloqué sans les accès de l'utilisateur). Décommissionnement du site Vercel historique dépend de ce déploiement.
- `Documentation/Documentation Fonctionnalités.docx` : pas mis à jour ce cycle — pas d'outil docx disponible dans cet environnement, et le bug corrigé ce cycle est un problème de rendu (pas un changement de comportement fonctionnel) donc ne modifie pas la documentation existante. PRD (`PRD_AvecToi_v1_4.md`) : pas de mise à jour jugée nécessaire — pur correctif de rendu, aucun changement de règle métier ou de portée produit.

## Historique cumulé
- Jusqu'au 2026-07-22 : lots 1-10 (fonctionnalités de base) + refonte intervenant Phase A/B, RGPD 90j + purge auto + sauvegarde schéma auto, checklists perso réutilisables, rattachement multi-espaces intervenant, EAS Update automatisé — PR #7 à #102.
- 2026-07-22 → 08-01 : resynchronisation PRD (#103), snapshot schéma (#104), liens d'invitation → `app.avectoi.care` (#105), verrou Premium "Planning des intervenants" (#106), fix datepicker onboarding + navigation Réglages (#107), fix décalage de date/toggle intervenants/lien email confirmation (#108, remergé sous #111 sans conséquence), site marketing `avectoi-site` construit et poussé (pas déployé), règle Git "1 branche = 1 PR" documentée (#109).
- 2026-08-01 → 08-02 : diagnostic + fix définitif du lien Google Maps (double-encodage consentement RGPD + repli Nominatim pour liens Place-ID-only, #110), Site URL Supabase corrigé côté Dashboard (email confirmation), PRD v1.6→v1.7 (#112), rafraîchissement adresse + popup centré + première version du flux in-app changement de nom (#113).
- 2026-08-09 → 08-10 (matin) : le flux in-app changement de nom restait cassé après #113 (bouton bloqué sans retour, #115 ; erreurs génériques puis détaillées, #116/#117) — root cause réelle trouvée par test `curl` direct de l'endpoint public : la fonction avait été créée sous le slug auto-généré `rapid-service` au lieu de `notify-name-change`, recréée correctement, flux confirmé fonctionnel par l'utilisateur ; contraste du bouton "Fermer" corrigé en apparence (#118) mais toujours invisible en pratique une fois testé.
- 2026-08-10 (journée) : chasse au bug du bouton "Fermer" invisible — voir détail session ci-dessous (#120 à #128).

## 1. Objectif de la session
Faire enfin apparaître le texte du bouton "Fermer" dans le popup de succès "changement de nom" : après le correctif PR #118 (couleur blanche forcée), l'utilisateur a testé et confirmé que le bouton restait un rectangle bleu uni, sans aucun texte visible. Objectif : trouver la vraie cause et livrer un correctif confirmé sur téléphone. Au passage, deux demandes annexes : centrer le bouton une fois visible, et gérer l'adresse de contact de la demande.

État "done" : atteint — l'utilisateur confirme voir "Fermer" en blanc, centré, sur fond bleu (PR #128 mergée).

## 2. État actuel
**Bug du bouton "Fermer" invisible : résolu et confirmé.** Six itérations ont été nécessaires (voir "Ce qui a échoué" pour le détail de chaque piste et pourquoi elle a échoué) avant d'isoler la vraie cause via un diagnostic dédié (PR #126), puis de la corriger (PR #127) et de peaufiner l'alignement (PR #128).

**Adresse de contact des demandes de changement de nom :** reste `support@avectoi.care` (texte du popup + destinataire de l'email Resend dans l'Edge Function `notify-name-change`). Un changement temporaire vers `contact@avectoi.care` a été proposé et poussé sur la PR #128 avant merge, puis annulé sur la même branche à la demande de l'utilisateur, qui venait de créer la boîte `support@avectoi.care` entre-temps — donc **aucun changement net** sur ce point par rapport au début de la session, mais la boîte mail existe désormais réellement (elle n'existait pas avant ce cycle).

**Dernière action avant ce handoff :** génération de ce handoff, demandée explicitement par l'utilisateur juste après confirmation du merge de la PR #128.

## 3. Fichiers concernés
- `app/(admin)/settings.tsx` → popup "MODAL CHANGEMENT DE NOM", vue de succès : bouton "Fermer" reconstruit en taille fixe (220×50) et styles 100% inline (voir section 4 pour l'historique des tentatives) ; `handleSendNameChange()` — état final : ferme/rouvre le `Modal` au succès (résidu d'une tentative de correctif qui n'a pas résolu le bug mais est resté, sans impact négatif observé — voir "Ce qui a échoué").
- `supabase/functions/notify-name-change/index.ts` → destinataire de l'email Resend, resté `support@avectoi.care` après un aller-retour de changement d'adresse dans la même session (voir section 2). **Pas besoin de redéploiement** puisque la valeur finale est identique à celle déjà en prod.
- `Handoff/handoff.md` → ce fichier.

## 4. Ce qui a échoué
Chronologie complète des tentatives sur le bug du bouton "Fermer" invisible (texte du bouton non affiché, alors que le bouton lui-même — fond bleu, taille, zone cliquable — était bien présent et correctement positionné) :

1. **PR #118 — couleur blanche explicite sur le `Text`** : en réalité un no-op, `styles.btnPrimaryText` avait déjà `color: "#fff"` comme style de base depuis sa toute première version (confirmé via `git log -p`). N'a donc rien changé, ce qui n'a été compris qu'après coup.
2. **PR #120 — remount forcé du sous-arbre via `Fragment key="success"`** : hypothèse d'un bug de réconciliation React (patch positionnel au lieu d'un remount complet). Testé, toujours rien.
3. **PR #121 — reset du layout flex** (`flexGrow: 0, flexShrink: 0, flexBasis: "auto", alignSelf: "stretch"` à la place de `flex: 1.3` hérité de `btnPrimary`, pensé pour une rangée bornée) : hypothèse que `flexBasis: 0%` sur un axe indéfini effondrait la boîte de texte à hauteur zéro. Incident de process au passage : un commit avait été poussé par erreur sur la branche de la PR #120 **après son merge** — repéré grâce au retour de l'utilisateur, corrigé en cherry-pickant le commit orphelin sur une branche neuve (PR #121). Testé, toujours rien.
4. **PR #122 — diagnostic couleurs vives** (fond rouge + texte jaune 28px directement sur le `Text` du bouton) : objectif, déterminer si le texte avait une taille normale mais des glyphes invisibles, ou une taille réellement nulle. Résultat le plus surprenant de toute la séquence : **aucun changement visible à l'écran**, pas même le fond rouge — alors qu'il s'agissait d'un changement de style JS livré par la même OTA que les précédents.
5. **PR #123 — marqueur `Updates.updateId`/`createdAt`/`channel` live dans le popup** : pour vérifier que l'app tournait bien sur le dernier bundle publié plutôt que sur un cache obsolète. Résultat : bundle confirmé à jour (updateId frais, correspondant à la dernière publication), y compris après redémarrage complet du téléphone — ce qui a définitivement écarté un problème de délivrance OTA.
6. **PR #124 — fermeture puis réouverture du `Modal` au succès** (`setNameChangeModal(false)` puis `setTimeout(() => setNameChangeModal(true), 50)`) : hypothèse qu'Android peinait à peindre un contenu introduit par mutation d'état pendant qu'un `Modal` reste visible en continu. Testé, toujours rien.
7. **PR #125 (fermée sans merge)** : doublon involontaire généré lors de l'incident de commit orphelin du point 3 — une PR avait été ouverte par erreur sur l'ancienne branche déjà mergée, contenant le même correctif que la #121. Repérée par l'utilisateur, fermée et branche supprimée.
8. **PR #126 — diagnostic isolé décisif** : ajout d'un élément entièrement nouveau (`View` 220×50, fond magenta, bordure jaune, texte noir "TEST999", zéro style partagé) juste à côté du bouton "Fermer", dans le même `Fragment`. **Ce test s'est affiché correctement.** Ça a permis de trancher : le problème n'était pas structurel au `Modal`/à l'emplacement du rendu, mais spécifique au bouton "Fermer" lui-même — le seul endroit du fichier où `styles.btnPrimary`/`btnPrimaryText` sont utilisés hors d'une rangée `sheetBtns` bornée.
9. **PR #127 — correctif final** : bouton "Fermer" reconstruit sur le pattern validé par la #126 — taille fixe (220×50) et styles 100% inline, sans aucune référence à `btnPrimary`/`btnPrimaryText` ni à une propriété flex. **Testé et confirmé : le texte s'affiche enfin.**
10. **PR #128 — centrage** : `alignSelf: "center"` ajouté (la largeur fixe issue de la #127 n'était pas centrée dans le conteneur flex column `centeredSheet`, dont l'`alignItems` par défaut — `"stretch"` — ne centre pas un enfant à largeur fixe). Testé et confirmé.

**Cause racine non totalement expliquée** : on n'a pas isolé le mécanisme RN/Fabric exact qui rendait le texte invisible avec `flex: 1.3` + styles partagés hors rangée bornée (l'hypothèse la plus probable reste un problème de mesure/layout du texte spécifique à ce contexte, jamais confirmé au niveau du moteur). Le correctif est empirique mais solide (confirmé sur device, reproductible par le pattern taille-fixe + inline). **Point de vigilance pour l'avenir :** éviter de réutiliser `styles.btnPrimary`/`styles.btnPrimaryText` pour un bouton **seul, hors d'une rangée `sheetBtns`** ailleurs dans l'app sans tester sur device — préférer le pattern taille fixe + styles inline validé ici.

## 5. Prochaine étape
Aucune action immédiate requise sur ce sujet — le flux "changement de nom" est intégralement fonctionnel et confirmé de bout en bout, popup inclus.

Items reportés (ordre suggéré, sur demande uniquement) : migration `20260728_intervenant_checklist_templates.sql` à confirmer exécutée en prod, rebase de `fix/souvenirs-rls-and-news-delete`, décision `docs/spec-web-upgrade`, déploiement `avectoi-site` sur Infomaniak (bloqué sans les accès de l'utilisateur), isolation Supabase, taille de l'app.
