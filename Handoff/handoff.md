# Handoff — AvecToi
_Généré le : 2026-08-13_

## État global du projet

**Stack :** React Native + Expo SDK 51+, Expo Router, Supabase (BDD/Auth/Storage/Realtime/Edge Functions), EAS Build + EAS Update (channels development/preview/production, `expo-updates`, publication OTA automatique sur push `main` via `.github/workflows/eas-update-preview.yml`). expo-notifications, expo-calendar, expo-image-picker. Resend (transactionnel) branché sur les Edge Functions. Stripe côté web uniquement. Supabase CLI bloqué sur cette machine (App Control Policy Windows) : déploiement des migrations/Edge Functions exclusivement via le Dashboard Supabase.

**⚠️ Règle Git STRICTE (CLAUDE.md) :** chaque modification, même un correctif ponctuel, part sur une branche neuve (depuis `origin/main` à jour) et se termine par sa propre PR poussée sur GitHub — jamais de nouveau commit ajouté à une branche dont la PR est déjà mergée. **L'utilisateur merge d'abord, puis teste** (le merge déclenche la publication OTA qui charge le nouveau bundle sur son téléphone — il n'a aucun autre moyen de tester une modif avant de merger). Toujours vérifier l'état réel d'une PR via `gh pr view <n> --json state,mergedAt` plutôt que de supposer.

**Repo GitHub :** `https://github.com/EI-HCS-Consulting/AvecToi`, branche `main` protégée par ruleset (PR obligatoire).

**PR ouverte, en attente de test/merge :** aucune.

**Livré (V1 + V2 partiel) :** tout le socle (points 1-10 CLAUDE.md), refonte intervenant complète (métiers, accès, priorité créneaux configurable, canal Nouvelles séparé, verrou Premium sur l'activation du rôle), RGPD 90j + purge auto + sauvegarde schéma hebdo, checklists perso réutilisables, rattachement multi-espaces intervenant, onboarding séquencé, cap freemium (8 visites), Paramètres 4 sections + historique, emails Resend (annulation, cap atteint, confirmation invité, demande de changement de nom), Chronologie, mode "1 visite/jour" unifié, icône adaptive Android, EAS Update automatisé, liens d'invitation vers `app.avectoi.care`. Flux "Demande de changement de nom" fonctionnel. Texte de partage personnalisé au prénom du patient. "Mes Checklists" restructuré avec flux d'ajout d'item intégré et répétable. Convention "popup centré + couleurs du thème" appliquée à 23+ popups. Entraide/Publier/Administratif dispose de son propre flux de création de checklist. **Calendrier principal (visiteur/admin/intervenant) refondu** : bascule unifiée Mensuel/Hebdo + Visites/Soins (switches désormais visuellement identiques — même taille de curseur, libellés alignés), vue Hebdo réservable pour tous les rôles (bande de 7 jours `WeekStrip`, tap-to-book), grisage des jours antérieurs à l'admission, marqueurs visuels d'admission/sortie sur la bande hebdo, bouton "Prochaine dispo" repositionné. **Panneau planning du rôle intervenant** scindé en "Soins planifiés" (à venir, toujours visible) et "Historique des soins" (menu dépliable, replié par défaut), bascule planifié → historique précise à la minute près.

**Nouveau ce cycle (#150 → #152) :**
- PR #150 : vue Hebdo rendue réservable pour tous les rôles (visiteur/admin/intervenant) — réservation directe depuis la bande `WeekStrip` (tap-to-book), grisage des jours antérieurs à la date d'hospitalisation du patient, marqueurs visuels d'admission (croix) et de sortie (maison) sur les cases jour, bouton "Prochaine dispo" repositionné dans le bloc de réglages du calendrier. Implémenté d'abord côté visiteur (session précédente), complété côté admin ce cycle (parité complète des deux vues).
- PR #151 : correctif visuel remonté par test téléphone — les deux switches du bloc de réglages du calendrier (Mensuel/Hebdo et Visites/Soins) n'avaient ni la même taille de curseur ni les libellés alignés à la même position ; corrigé en réutilisant le mécanisme `thumbWidth`/`onThumbWidth` déjà existant dans `SegmentedSwitch.tsx` (même pattern que `Entraide.tsx`) pour que le second switch reprenne la largeur calculée par le premier. Bande verte "mes visites" de la vue Hebdo élargie jusqu'au bas des cases jour (bug de rendu latent découvert au passage : la bande était calculée mais jamais affichée).
- PR #152 : le panneau "Historique des soins" du rôle intervenant (sous le calendrier) est scindé en deux sous-sections — "Soins planifiés" (à venir, toujours visible sans dépliage) et "Historique des soins" (effectués, dans un menu dépliable vers le bas, replié par défaut, même pattern d'accordéon que `SoinsPlanifiesBlock.tsx`). La bascule planifié → historique utilise désormais `isSlotFullyPast` (précision à la minute près) au lieu d'une comparaison de date seule (précision au jour près).

**Testé et confirmé par l'utilisateur ce cycle :** les trois PR mergées ("Mergé" pour chacune, dont deux avec confirmation explicite "ok"/"mergé, ok" avant de passer à la suite).

**Connu, non bloquant :**
- Branche distante `feat/entraide-creer-checklist` (PR #140, déjà mergée) porte toujours un commit orphelin (`e9472c9`) poussé par erreur après le merge — nettoyage (reset + force-push) proposé à l'utilisateur, jamais confirmé, sans conséquence fonctionnelle.
- **Gap de documentation** : ce handoff n'a pas été régénéré à chaque cycle entre le 2026-08-11 et le 2026-08-12 — les PR #133 à #149 (cadres de réservation et légende du calendrier, planning intervenants en vue hebdo, historique des soins, modération soins/visites, réservation de soins par l'intervenant depuis le calendrier, largeur du popup d'intervention, panneau et bascule de vue du planning intervenant) ne sont pas détaillées individuellement ici — voir `git log --merges` ou l'historique GitHub des PR pour le détail précis de chacune.

**En cours / pas commencé (reporté, à reprendre sur demande) :**
- `fix/souvenirs-rls-and-news-delete` : branche stale, 2 migrations RLS jamais exécutées en prod (`AUDIT_RLS_TAILLE_CODE_MORT.md`).
- Migration `20260728_intervenant_checklist_templates.sql` (PR #74) : toujours pas confirmée exécutée en prod.
- Isolation Supabase (séparer l'instance prod partagée avec le site web historique) : plan complet dans `ISOLATION_SUPABASE.md`.
- `docs/spec-web-upgrade` : en attente d'une décision utilisateur.
- Taille de l'app (180 Mo) et audit code mort : volontairement reporté (voir `AUDIT_RLS_TAILLE_CODE_MORT.md`).
- Points 13-14 (EAS Build APK signé, fiche Play Store) : pas commencés.
- Site marketing `avectoi-site` (dépôt séparé, poussé sur `main`) : toujours pas déployé (Infomaniak, bloqué sans les accès de l'utilisateur). Décommissionnement du site Vercel historique dépend de ce déploiement.
- Branche distante `feat/entraide-creer-checklist` : commit orphelin à nettoyer, voir "Connu, non bloquant" ci-dessus.
- `PRD_ClaudeCode_Site_avectoi_care_v3.md` et `AUDIT_RLS_TAILLE_CODE_MORT.md` : fichiers non suivis présents dans l'arbre de travail (à committer ou nettoyer selon leur statut, non touchés par ce cycle).

## Historique cumulé
- Jusqu'au 2026-07-22 : lots 1-10 (fonctionnalités de base) + refonte intervenant Phase A/B, RGPD 90j + purge auto + sauvegarde schéma auto, checklists perso réutilisables, rattachement multi-espaces intervenant, EAS Update automatisé — PR #7 à #102.
- 2026-07-22 → 08-01 : resynchronisation PRD (#103), snapshot schéma (#104), liens d'invitation → `app.avectoi.care` (#105), verrou Premium "Planning des intervenants" (#106), fix datepicker onboarding + navigation Réglages (#107), fix décalage de date/toggle intervenants/lien email confirmation (#108, remergé sous #111), site marketing `avectoi-site` construit et poussé (pas déployé), règle Git "1 branche = 1 PR" documentée (#109).
- 2026-08-01 → 08-02 : diagnostic + fix définitif du lien Google Maps (#110), Site URL Supabase corrigé, PRD v1.6→v1.7 (#112), rafraîchissement adresse + popup centré + première version du flux in-app changement de nom (#113).
- 2026-08-09 → 08-10 (matin) : Edge Function `notify-name-change` recréée sous le bon slug (#115-117), flux changement de nom confirmé fonctionnel.
- 2026-08-10 (journée) : bug tenace du bouton "Fermer" invisible résolu après 6 tentatives infructueuses — cause : styles partagés `btnPrimary`/`btnPrimaryText` réutilisés hors d'une rangée `sheetBtns` bornée ; correctif = taille fixe + styles 100% inline (PR #118-128).
- 2026-08-10 (soir) → 08-11 (matin) : texte "Partager" personnalisé, refonte UX "Mes Checklists", popups centrés étendus à toute l'app (23 popups), 8 boutons "Fermer"/"Annuler" invisibles corrigés au global — PR #130, #131.
- 2026-08-11 : nouveau flux "Créer une checklist" dans Entraide/Publier/Administratif + renommage "Checklists suggérées" dans Mon Compte (PR #140) ; correctif texte invisible sur 2 boutons du même flux + renommage du bandeau admin Entraide (PR #141).
- 2026-08-11 → 08-12 : cycle non détaillé dans ce handoff (voir "Connu, non bloquant" ci-dessus) — PR #133 à #149 : cadres de réservation et légende du calendrier, refonte du planning des intervenants en vue hebdo, historique des soins planifiés, modération soins/visites, réservation de soins par l'intervenant depuis le calendrier, largeur du popup d'intervention, panneau et bascule de vue du planning intervenant.
- 2026-08-12 → 08-13 : vue Hebdo réservable pour tous les rôles avec marqueurs hospitalisation/sortie, parité complète visiteur/admin (#150) ; alignement visuel des deux switches du calendrier + élargissement de la bande verte "mes visites" (#151) ; panneau "Historique des soins" du rôle intervenant scindé en "Soins planifiés" (toujours visible) / "Historique des soins" (menu dépliable), bascule précise à la minute (#152).

## 1. Objectif de la session
Trois volets, chacun demandé après confirmation du merge du précédent : (1) achever côté admin la refonte de la vue Hebdo réservable déjà livrée côté visiteur (parité des deux rôles) — switches unifiés Mensuel/Hebdo et Visites/Soins, tap-to-book depuis la bande hebdomadaire, grisage pré-admission, marqueurs d'admission/sortie, repositionnement du bouton "Prochaine dispo". (2) Sur retour de test téléphone : rendre les deux switches du bloc de réglages visuellement identiques (même taille de curseur, libellés alignés à la même position) et élargir la bande verte "mes visites" de la vue Hebdo jusqu'au bas des cases jour, conformément à une capture d'écran fournie par l'utilisateur. (3) Transformer le panneau "Historique des soins" du rôle intervenant en menu dépliable vers le bas, en séparant les soins à venir (toujours visibles, "Soins planifiés") des soins déjà effectués (repliés par défaut, "Historique des soins"), avec une bascule précise à la minute près entre les deux.

État "done" : atteint — PR #150, #151 et #152 mergées, chacune confirmée par l'utilisateur avant de passer à la demande suivante.

## 2. État actuel
- **Calendrier admin (`app/(admin)/home/calendar.tsx`)** : réécrit pour reprendre à l'identique le comportement déjà livré côté visiteur — switches unifiés Mensuel/Hebdo et Visites/Soins, grille mensuelle gatée par la vue sélectionnée, branche Hebdo avec `WeekStrip` + `AdminSlotsList`/`SoinsDayDetail`, bouton "Prochaine dispo" repositionné dans le bloc de réglages.
- **Switches alignés** : `SegmentedSwitch` expose déjà `thumbWidth`/`onThumbWidth` (mécanisme utilisé par `Entraide.tsx` pour "Aller simple/Aller-retour" et "Flexible/Horaire fixe") — réutilisé ici pour que le switch Visites/Soins hérite de la largeur de curseur calculée par Mensuel/Hebdo, garantissant des tailles et alignements identiques. Appliqué dans `app/(admin)/home/calendar.tsx` et `app/(visitor)/home/calendar.tsx`.
- **Bande verte `WeekStrip`** : la bande "mes visites" (`familyBooked`) était calculée mais jamais rendue (bug latent) — ajoutée, puis épaissie (hauteur 4→8) et le padding bas de la case jour augmenté (8→14) pour qu'elle atteigne visuellement le bas de la case, conforme à la capture d'écran fournie.
- **`IntervenantPlanningPanel.tsx`** : scindé en deux sous-sections. "Soins planifiés" (soins dont le créneau n'est pas encore passé, triés par proximité croissante) est toujours affiché sans interaction. "Historique des soins" (soins dont le créneau est passé, triés du plus récent au plus ancien) est dans une section repliée par défaut (`useState`), dépliable via un bouton avec chevron `▸`/`▾` — même pattern d'accordéon que la section "Autres soins réalisés" de `SoinsPlanifiesBlock.tsx`, réutilisé pour rester cohérent avec le reste de l'app plutôt que d'inventer un nouveau composant. La bascule utilise `isSlotFullyPast(r.date, r.creneau)` (déjà existant dans `lib/slotUtils.ts`, précision à la minute), remplaçant l'ancienne comparaison `r.date < todayIso` (précision au jour).

**Dernière action avant ce handoff :** génération de ce handoff, demandée par l'utilisateur juste après confirmation du merge de la PR #152.

## 3. Fichiers concernés
- `app/(admin)/home/calendar.tsx` → réécriture complète pour la parité Hebdo/switches avec la vue visiteur (PR #150), puis ajout du partage de largeur de curseur entre les deux switches (PR #151).
- `app/(visitor)/home/calendar.tsx` → nettoyage (imports/apostrophe non échappée), ajout du partage de largeur de curseur entre les deux switches (PR #151).
- `app/(visitor)/home/slots.tsx` → suppression de code mort (`allDaySlots`/`dayVisitBooking`/`daySlots`, `getSlotsForDate` devenu inutile) laissé par une extraction antérieure de `VisitorSlotsList`.
- `components/WeekStrip.tsx` → ajout du rendu manquant de la bande verte "mes visites" puis épaississement jusqu'au bas de la case (PR #151).
- `components/IntervenantPlanningPanel.tsx` → réécriture complète : split "Soins planifiés"/"Historique des soins", accordéon repliable, bascule précise à la minute via `isSlotFullyPast` (PR #152).
- `Handoff/handoff.md` → ce fichier.

## 4. Ce qui a échoué
Rien n'a échoué ce cycle. Un seul point de process à noter : lors du démarrage du volet switches/bande verte (PR #151), la branche de travail précédente (#150) avait déjà été mergée — conformément à la règle Git du projet, un `git stash` des changements en cours a été utilisé pour basculer proprement sur une branche neuve depuis `main` à jour avant de reprendre le travail, sans perte ni duplication (vérifié via `git diff` après le stash pop). Même procédure appliquée pour le volet #152.

## 5. Prochaine étape
Aucune action immédiate requise — les trois PR de ce cycle sont mergées et confirmées par l'utilisateur.

Points en suspens à reproposer sur demande : nettoyage de la branche distante `feat/entraide-creer-checklist` (commit orphelin `e9472c9`), régénération d'un handoff plus détaillé pour le cycle #133-#149 si ce niveau de détail devient utile, `PRD_ClaudeCode_Site_avectoi_care_v3.md`/`AUDIT_RLS_TAILLE_CODE_MORT.md` non suivis à committer ou nettoyer.

Items reportés (inchangés depuis les cycles précédents, ordre suggéré, sur demande uniquement) : migration `20260728_intervenant_checklist_templates.sql` à confirmer exécutée en prod, rebase de `fix/souvenirs-rls-and-news-delete`, décision `docs/spec-web-upgrade`, déploiement `avectoi-site` sur Infomaniak (bloqué sans les accès de l'utilisateur), isolation Supabase, taille de l'app.
