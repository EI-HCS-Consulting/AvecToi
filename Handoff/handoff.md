# Handoff — AvecToi
_Généré le : 2026-07-16_

## État global du projet

**Stack :** React Native + Expo SDK 51+, Expo Router, Supabase (BDD/Auth/Storage/Realtime/Edge Functions), EAS Build + EAS Update (channels development/preview/production, `expo-updates` installé, build "development" avec client de dev connecté au Metro local — un reload suffit pour voir les changements JS sans passer par `eas update`). expo-notifications, expo-calendar, expo-image-picker. Resend (transactionnel) branché sur les Edge Functions. Stripe côté web uniquement (avectoi.care), app 100% "reader" conforme Play Store. Supabase CLI bloqué sur cette machine (App Control Policy Windows) : déploiement des Edge Functions exclusivement via le Dashboard Supabase.

**Repo GitHub :** `https://github.com/EI-HCS-Consulting/AvecToi`, branche `main` protégée par ruleset (PR obligatoire). `gh` CLI authentifié (compte `EI-HCS-Consulting`). `main` local à jour avec `origin/main` (`702c56a`).

**Branches ouvertes sur `origin` :**
- `main`
- `docs/spec-web-upgrade` — non mergée, en attente depuis plusieurs sessions, laissée en attente sur décision explicite de l'utilisateur (statut inchangé, à reclarifier un jour).
- 6 branches **déjà mergées** mais pas encore supprimées sur origin (nettoyage sur demande explicite seulement, comme convenu) : `fix/popups-design`, `docs/handoff-update`, `feat/admin-chronologie`, `fix/chrono-scroll-gesture`, `fix/chrono-scroll-overlay-sibling`, `feat/entraide-checklists-administratives`.

**Livré (V1, CLAUDE.md points 1-10) :** setup Expo/Supabase/Git, Auth admin, accès visiteur, calendrier + créneaux + réservation + PIN, galerie Souvenirs, Nouvelles du jour, Entraide + Mur de soutien, 6 thèmes + mode Dark/Light par compte, "Prochaine disponibilité", ajout calendrier natif Android, RLS, accompagnants, parité admin/visiteur "Mon compte", autofill Google Maps, onboarding séquencé + partage freemium débloqué, cap freemium à granularité fine, Paramètres en 4 sections avec historique, granularité minute horaires, emails réservation/annulation (Resend), fiche patient + profils visiteurs, Dark/Light aligné visuellement sur "Mode de soin", Entraide filtres + fermeture auto des besoins, secteur hospitalier synchronisé/exclu de l'adresse affichée, bloc "Visiteurs" dans Paramètres (photos + identités, y compris la photo de l'admin), sync photo visiteur réparée (RLS), bandeau (SpaceHeader) reformaté, consignes de visite saisissables dès l'onboarding, phrase totem étendue à patient/admin/visiteur (éditable partout, visible dans le bloc Visiteurs), réservations avec accompagnants fusionnées en une seule ligne dans "Mes contributions" (admin), libellés "Mes contributions" harmonisés entre Admin et Visiteur, date d'hospitalisation optionnelle du patient (fiche patient + onboarding), "Mes réservations" (visiteur) ne redemande plus le PIN au clic, popups visiteur + admin harmonisées au design de l'app (composant `ConfirmModal` générique), **Chronologie** (frise historique combinant infos hospitalières/consignes de visite/règles/visites réservées, popup scroll borné, accessible depuis Paramètres > Historique — confirmée fonctionnelle en usage réel par l'utilisateur), **checklists administratives suggérées dans Entraide** (outil admin dédié : bannière Administratif → choix du contexte → sélection multi-items → insert groupé ; sélecteur repliable équivalent directement dans "Nouveau besoin", accessible aussi aux visiteurs avec une liste d'items restreinte ; bouton "Annuler" pour supprimer d'un coup un lot ajouté par erreur — zéro migration, réutilise `tasks` tel quel).

**En cours / pas commencé :**
- Points 11-12 (notifications push rappel, RGPD purge auto J-7) : livrés lors de sessions antérieures, pas re-testés récemment.
- Points 13-14 (EAS Build APK signé, fiche Play Store) : pas commencés.
- Branche `docs/spec-web-upgrade` : toujours en attente.
- **Checklists administratives (cette session)** : mergées, pas encore testées manuellement dans l'app (voir section 5).
- Bug connu, pas corrigé : les flèches de navigation jour du calendrier visiteur (`app/(visitor)/home/slots.tsx`) contournent la vérification `allowed_weekdays`.
- Fusion des réservations en groupe (admin), date d'hospitalisation, popups harmonisées : câblées et vérifiées par `tsc` mais toujours pas testées manuellement en conditions réelles prolongées.
- Isolation Supabase (séparer l'instance prod partagée avec le site web déjà en prod) : plan complet écrit dans `ISOLATION_SUPABASE.md`, mise en œuvre différée sur décision de l'utilisateur.
- 6 branches mergées à nettoyer sur origin (voir ci-dessus, sur demande explicite).

## Historique cumulé
- Lots 1-10 (fonctionnalités de base) livrés au fil de sessions antérieures.
- 2026-07-04 → 07-13 : `dossier_code`, cap freemium, PIN visiteur sécurisé, refonte Paramètres 4 sections, historique + recasage auto + alertes, fix horloges Android + infra EAS Update, granularité minute horaires, Resend de bout en bout, fiche patient + profils visiteurs, mode Dark/Light + sweep exhaustif textes blancs/bordures (PR #7-#23, mergées).
- 2026-07-14 : fix largeur boutons fiche patient, Dark/Light aligné sur "Mode de soin", filtres Entraide + fermeture auto, secteur hospitalier synchronisé/exclu de l'adresse, bloc "Visiteurs" dans Paramètres, popups/barres relevés de la nav système (PR #24-#28, mergées).
- 2026-07-15 : fix RLS `visitor_profiles`, photo admin dans le bloc Visiteurs, phrase totem étendue admin/visiteur/patient, fusion des réservations groupées, libellés Admin/Visiteur harmonisés, date d'hospitalisation optionnelle, fix PIN "Mes réservations" (navigation simple au lieu d'une popup PIN), popups visiteur + admin harmonisées (nouveau `ConfirmModal`, remplace les `Alert.alert` natifs restants) (PR #29-#33, mergées).
- 2026-07-15/16 : Chronologie (frise historique en popup, scroll borné) ajoutée puis bug de scroll saccadé/bloqué corrigé en deux passes — cause racine : un `TouchableOpacity` ancêtre du `ScrollView` cassait la négociation du geste sur Android ; pattern "overlay en frère du sheet, jamais ancêtre" désormais la norme pour toute modale scrollable de l'app (PR #35, #36, #37, mergées).
- 2026-07-16 (cette session) : voir détail ci-dessous.

## 1. Objectif de la session
Améliorer Entraide / Administratif avec des checklists de documents/démarches pré-remplies selon le contexte (hospitalisation d'un proche adulte, enfant hospitalisé, soin à domicile) : MVP admin, puis ajout d'un bouton "Annuler" pour rattraper une erreur d'ajout groupé, et d'un accès direct pour les visiteurs depuis "Nouveau besoin".
État "done" : atteint — PR #38 mergée dans `main`. Reste les tests manuels (voir section 5).

## 2. État actuel

**Fait cette session :**
- Recherche en amont (paysage des apps américaines comparables, listes de documents français pour hospitalisation adulte/enfant, avertissement de conformité HDS) livrée via un Artifact puis une checklist en chat.
- MVP "Checklists suggérées" : outil admin dédié (bannière dans l'onglet Administratif → écran de choix du contexte → écran de sélection multi-items → insert groupé), zéro migration (réutilise `tasks` tel quel, chaque item devient un besoin `category="administratif"` ordinaire).
- **Bouton "Annuler"** : l'insert capture désormais les id créés (`.insert(rows).select("id")`) ; un bandeau "N besoins ajoutés ✓ / Annuler" reste affiché 8 secondes après un ajout groupé et supprime exactement ce lot si tapé — partagé entre l'outil admin et le nouveau sélecteur visiteur ci-dessous (`triggerBatchUndo`/`undoBatch`).
- **Sélecteur repliable dans "Nouveau besoin"** : dès que la catégorie Administratif est choisie, 3 accordéons apparaissent (🏥 Hospitalisation d'un proche / 🧸 Enfant hospitalisé / 🏠 Soin à domicile), items pré-cochés, avec un bouton "Publier (N)" propre à chaque section — accessible aux visiteurs, pas seulement à l'admin. Le champ titre/description classique reste disponible pour un besoin hors liste.
- Nouveau champ `sharedWithVisitors` par item de `CHECKLIST_TEMPLATES` : réserve les démarches légales/financières/employeur (procuration bancaire, MDPH, déclaration de sinistre, autorité parentale, congé proche aidant...) à l'admin ; le reste (documents pratiques, logistique, organisation famille — dont Directives anticipées et Personne de confiance, confirmées partagées) est visible et actionnable par les visiteurs aussi. Classification affinée en aller-retour avec l'utilisateur : 6 items rebasculés vers "partagé" après relecture de son tableau (attestation d'hospitalisation employeur, prévenir l'employeur, compte-rendu d'hospitalisation, PAI, assurance scolaire, commande de matériel médical). L'outil admin dédié, lui, n'est jamais filtré : l'admin y voit toujours la liste complète.
- `npx tsc --noEmit` : aucune nouvelle erreur après chaque étape.
- Commité en 2 temps sur `feat/entraide-checklists-administratives` (`05c4b64` puis `b14392c`), poussée, PR #38 ouverte puis mergée par l'utilisateur.

**Dernière action avant ce handoff :** `main` local resynchronisé avec `origin/main` (`702c56a`) après le merge de la PR #38.

## 3. Fichiers concernés
- `components/Entraide.tsx` → toute la fonctionnalité : `CHECKLIST_TEMPLATES` (+ champ `sharedWithVisitors` par item), outil admin dédié (bannière + 2 modales de sélection), sélecteur repliable inséré dans le formulaire "Nouveau besoin" (catégorie Administratif), bandeau "Annuler" (`triggerBatchUndo`/`undoBatch`), styles associés (`inlineAccordion*`, `undoBar`, `undoText`, `undoBtn`).

## 4. Ce qui a échoué
Rien n'a été abandonné/retenté cette session.

## 5. Prochaine étape
1. **Tester manuellement dans l'app** (rien de la fonctionnalité checklist n'a encore été vérifié en conditions réelles) :
   - Outil admin (bannière Administratif) : ajouter une checklist, décocher des items, vérifier l'insert groupé puis "Annuler" dans les 8 secondes.
   - Sélecteur repliable dans "Nouveau besoin" (catégorie Administratif), côté visiteur ET admin : vérifier que la liste visiteur est bien restreinte aux items `sharedWithVisitors: true`, que "Publier (N)" fonctionne indépendamment par accordéon, et que "Annuler" marche aussi depuis ce chemin.
   - Vérifier visuellement les accordéons + le bandeau "Annuler" en thème clair et sombre.
2. Nettoyer sur origin les 6 branches déjà mergées listées plus haut — sur demande explicite seulement.
3. Décider du sort de `docs/spec-web-upgrade`.
4. Corriger le bug connu des flèches de navigation jour dans le calendrier visiteur (`slots.tsx`, contournement de `allowed_weekdays`) — déjà identifié, pas encore traité.
5. Reprendre les tests reportés des sessions précédentes (popups harmonisées, fusion des réservations groupées, date d'hospitalisation) ; revalider les points 11-12 (notifications push, purge RGPD) ; reprendre la roadmap points 13-14 (EAS Build → APK signé, fiche Play Store).
