# Handoff — AvecToi
_Généré le : 2026-07-20 (soir)_

## État global du projet

**Stack :** React Native + Expo SDK 51+, Expo Router, Supabase (BDD/Auth/Storage/Realtime/Edge Functions), EAS Build + EAS Update (channels development/preview/production, `expo-updates` installé). expo-notifications, expo-calendar, expo-image-picker. Resend (transactionnel) branché sur les Edge Functions. Stripe côté web uniquement (avectoi.care), app 100% "reader" conforme Play Store. Supabase CLI bloqué sur cette machine (App Control Policy Windows) : déploiement des migrations/Edge Functions exclusivement via le Dashboard Supabase (copier/coller le SQL en un seul bloc).

**EAS Update — automatisé depuis le 20/07 (PR #61) :** `.github/workflows/eas-update-preview.yml` publie automatiquement `eas update --channel preview` à chaque push sur `main` contenant du code app (paths-ignore sur `Handoff/`, `Documentation/`, `**.md`). Rien à faire manuellement après un merge de code.

**Repo GitHub :** `https://github.com/EI-HCS-Consulting/AvecToi`, branche `main` protégée par ruleset (PR obligatoire). `main` local à jour avec `origin/main` (`ddd1a82`, PR #75 mergée).

**Branches ouvertes sur `origin` (nombreuses, nettoyage jamais fait faute de demande explicite) :** `docs/spec-web-upgrade` (en attente d'une décision utilisateur depuis plusieurs sessions) + une trentaine de branches déjà mergées mais pas supprimées (`fix/*`, `feat/*`, `feature/*`, `docs/handoff-update-*`) — liste complète via `git branch -r`. Nettoyage à faire uniquement sur demande explicite, comme convenu.

**Livré (V1, CLAUDE.md points 1-10) :** setup Expo/Supabase/Git, Auth admin, accès visiteur, calendrier + créneaux + réservation + PIN, galerie Souvenirs, Nouvelles du jour, Entraide + Mur de soutien (+ checklists administratives), 6 thèmes + mode Dark/Light, "Prochaine disponibilité", ajout calendrier natif Android, RLS, accompagnants, parité admin/visiteur "Mon compte", onboarding séquencé, cap freemium, Paramètres 4 sections + historique, emails réservation/annulation (Resend), fiche patient + profils visiteurs, Chronologie, Planning des intervenants (réorganisé : calendrier mensuel inline + pager jour + bloc Soins planifiés + Fiches intervenants repliables), mode "1 visite par jour" (parité admin/visiteur/intervenant, visite et intervention comptées comme un seul évènement), téléphone/phrase totem/photo unifiés entre "Mon compte" et la fiche intervenant, rattachement multi-espaces des intervenants (par téléphone, bloc "🔗 Mes espaces"), refonte navigation + Mon compte intervenant (onglets Intervenants/Soins), checklists personnelles réutilisables entre dossiers patient (modèles cross-space). **Documentation fonctionnelle rattrapée cette session pour les PR #63-#72** (voir détail ci-dessous) — plus de retard connu.

**En cours / pas commencé :**
- Points 13-14 (EAS Build APK signé, fiche Play Store) : pas commencés.
- Bug connu, pas corrigé : les flèches de navigation jour du calendrier visiteur (`app/(visitor)/home/slots.tsx`) contournent `allowed_weekdays`.
- Isolation Supabase (séparer l'instance prod partagée avec le site web) : plan complet dans `ISOLATION_SUPABASE.md`, différée sur décision de l'utilisateur.
- `docs/spec-web-upgrade` : toujours en attente d'une décision.
- **Migration `20260728_intervenant_checklist_templates.sql` (PR #74) :** toujours pas confirmée exécutée en prod par l'utilisateur — "📥 Mes modèles" restera en échec silencieux tant que ce n'est pas fait (voir §5 du handoff précédent, PR #75).

## Historique cumulé
- Lots 1-10 (fonctionnalités de base) + sessions du 2026-07-04 au 07-17 (`dossier_code`, cap freemium, PIN visiteur sécurisé, Paramètres 4 sections, historique + recasage auto, Resend, fiche patient, Dark/Light, Chronologie, checklists administratives, Planning des intervenants) — PR #7-#41, mergées.
- 2026-07-18 : correctif alerte de recasage matchée par prénom+nom+PIN (PR #44), mode "1 visite par jour" — toggle instantané, suspension rétroactive des doublons (PR #45).
- 2026-07-19 : Refonte compte Intervenant Phase A (téléphone + phrase totem, PR #56) puis unification photo/téléphone/phrase totem entre Mon compte et la fiche intervenant (PR #57).
- 2026-07-20 (journée) : fix session photo intervenant (PR #59), masquage créneaux admin mode "1 visite/jour" (PR #60), EAS Update via GitHub Actions (PR #61), vue `visitor_profiles_by_patient` + colonnes `admin_email`/`admin_pin` sur `patient_spaces` (PR #63-65), réorganisation Planning des intervenants + calendrier mensuel dédié (PR #66-70), rattachement multi-espaces des intervenants (PR #71), fix intervention day-cap + popup (PR #72), refonte navigation + Mon compte intervenant (PR #73), popup "1 créneau/jour" harmonisé + checklists perso enrichies + modèles réutilisables (PR #74), handoff + doc §3.2/§7.3 (PR #75).
- 2026-07-20 (cette session) : voir détail ci-dessous — rattrapage documentaire PR #63-72.

## 1. Objectif de la session
Rattraper le retard de documentation fonctionnelle identifié dans le handoff précédent (PR #75) : les PR #59 à #72 n'avaient été répercutées dans `Documentation Fonctionnalités.docx` que partiellement (seules la navigation intervenant et les checklists réutilisables, liées à PR #73/#74, avaient été traitées). Session dédiée demandée par l'utilisateur ("PR 75 est mergée" → repartir de `main` à jour et traiter le rattrapage). Aucun changement de code app.
État "done" : chaque PR #59-72 passée en revue une à une (contenu du PR body), sections du docx impactées mises à jour, PR non fonctionnelles écartées explicitement (pas ignorées par oubli), handoff écrit et poussé.

## 2. État actuel

**Fait cette session — revue PR par PR :**
- PR #59 (fix persistance photo fiche intervenant) et PR #61 (EAS Update via GitHub Actions) : **pas de changement documentaire** — correctifs internes/infra sans impact visible sur le comportement déjà décrit dans le docx.
- PR #63 (vue `visitor_profiles_by_patient`), PR #64 (colonne `admin_email`), PR #65 (colonne `admin_pin`) : **pas de changement documentaire** — additions purement base de données (confort dashboard Supabase / support téléphonique futur), aucun écran ni comportement utilisateur nouveau.
- PR #60 (masquage créneaux admin en mode "1 visite/jour") + PR #72 (day-cap : visite et intervention comptent comme un seul évènement) → **§5.14 Règles**, ligne "1 visite par jour" (table) : texte réécrit pour couvrir la parité admin/visiteur/intervenant et l'unification visite+intervention. **§5.3 Créneaux (Admin)** : nouvelle ligne "1 visite par jour" ajoutée à la table.
- PR #66-70 (réorganisation Planning des intervenants + calendrier mensuel inline) → **§5.16 Planning des intervenants (écran dédié)** : table entièrement réécrite — nouvel ordre calendrier mensuel → pager jour → bouton "+ Ajouter une intervention" (popup 4 étapes) → bloc Soins planifiés → bloc Fiches intervenants (repliable, fermé par défaut, en dernière position). 2 nouvelles lignes ajoutées (Soins planifiés, Fiches intervenants), 3 lignes existantes réécrites.
- PR #71 (rattachement multi-espaces intervenants) → **§7.1 Activation et accès** : ligne "Fiche intervenant obligatoire" corrigée (le téléphone est désormais obligatoire, pas optionnel) + nouvelle ligne "Rattachement multi-espaces". **§7.3 Fonctionnalités partagées** : ligne "Mon compte" complétée avec la mention du bloc "🔗 Mes espaces".
- §8 (tableau des droits) et §10 (glossaire) : vérifiés, aucun changement de rôle ni nouveau terme métier introduit par ces PR — laissés inchangés.

**Méthode :** édition directe des runs de texte existants (`run.text = ...`) pour les cellules modifiées, préservant police/gras/taille sans toucher au XML. Pour les nouvelles lignes de tableau : `copy.deepcopy()` de la `<w:tr>` d'une ligne existante puis insertion via `addnext()`, pour hériter exactement des mêmes bordures/ombrage/police que les lignes voisines (vérifié : toutes les nouvelles lignes ont bien Arial/gras identique aux autres libellés de colonne, cf. §4).

**Dernière action avant ce handoff :** relecture complète des 5 tables modifiées (dump texte) pour vérifier cohérence avec les PR bodies.

## 3. Fichiers concernés
- `Documentation/Documentation Fonctionnalités.docx` → tables des sections §5.3, §5.14, §5.16, §7.1, §7.3 mises à jour (voir détail §2). Aucun autre fichier touché — session 100% documentaire, aucun changement de code.

## 4. Ce qui a échoué
- Rien de bloquant. Point de vigilance (déjà noté dans le handoff PR #74, confirmé à nouveau) : `document.element.body` doit être parcouru dans l'ordre réel (paragraphes + `w:tbl`) pour associer une table à la bonne section — un simple `d.tables[i]` sans ce repérage préalable risque de cibler la mauvaise table dans un document à 34 tables.
- Point de vigilance ajouté cette session : pour ajouter une ligne à un tableau Word en préservant bordures/ombrage, ne pas utiliser `table.add_row()` (ligne nue sans `tcPr`) mais dupliquer une `<w:tr>` existante (`copy.deepcopy` + `addnext`) puis ne remplacer que le texte des runs.

## 5. Prochaine étape
1. Revue utilisateur du diff `.docx` (ou export PDF si plus simple à relire) avant merge — session purement documentaire mais impact sur 5 sections du document de référence.
2. Ouvrir la PR, la faire mergée par l'utilisateur (comme d'habitude).
3. Items reportés, à reprendre sur demande de l'utilisateur : bug flèches jour `slots.tsx`, isolation Supabase dev/prod, nettoyage des branches mergées sur origin, décision sur `docs/spec-web-upgrade`, confirmation d'exécution de la migration `20260728_intervenant_checklist_templates.sql` (PR #74, bloquant pour "Mes modèles").
