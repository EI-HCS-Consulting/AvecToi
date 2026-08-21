# Rôle Intervenant — Réflexion, fonctionnalités & design (retiré de la V1, à réintégrer en V2)

> Ce document conserve toute la réflexion produit et les décisions de design derrière le rôle **Intervenant**, retiré de l'app V1 le 2026-08-21 (décision : la V1 ne comprendra pas ce profil). Il complète deux autres documents dans ce même dossier `Développement V2` :
> - `CODE_INTERVENANT_V1_COMPLET.md` — tout le code source concerné, tel qu'il existait sur `main` au commit `4b1b8c7` (juste après la PR #290).
> - `INSTRUCTIONS_CLAUDE_CODE_REINTEGRATION_V2.md` — le mode d'emploi à donner à Claude Code pour reconnecter le profil en V2.

---

## 1. Ce qu'est le rôle Intervenant, en une phrase

Un **mode d'accès parallèle au Visiteur**, pour les professionnels de soin (infirmier·ère, kiné, aide à domicile…) qui interviennent auprès du patient dans un cadre **professionnel** et non personnel — avec sa propre fiche (métier, types d'intervention), ses propres créneaux (« interventions », prioritaires sur les visites), et un canal Nouvelles séparé par défaut, tout en restant **gratuit** et sans création de compte, exactement comme un visiteur.

## 2. Pourquoi ce rôle a été construit (contexte produit)

- Constat initial (v1.4) : les familles qui utilisent AvecToi pour un proche hospitalisé ou en soin à domicile coordonnent aussi le passage de professionnels de santé, qui n'ont pas leur place dans le flux "visite personnelle" (pas de lien affectif à afficher, pas de "phrase totem", besoin d'un planning propre à eux).
- Le rôle a été pensé comme un **sous-mode du Visiteur** plutôt qu'un rôle totalement séparé, pour ne pas dupliquer toute l'infrastructure (accès par lien/QR/code dossier, PIN, Souvenirs, Entraide/Soutien) — décision structurante qui explique pourquoi tant de fichiers "visiteur" sont *mixtes* plutôt que d'avoir un pendant intervenant dédié.
- Le rôle est resté un centre de coûts pur pour l'admin (les intervenants ne paient jamais rien), ce qui a motivé sa réservation aux espaces **Premium** à partir de la v1.7 (`canEnableIntervenants()` dans `lib/freemiumCap.ts`) — seul un espace payant peut *activer* le rôle ; le désactiver reste toujours libre.
- Fonctionnalité **désactivée par défaut** sur chaque espace : elle n'apparaît nulle part (ni entrée de connexion, ni onglet admin) tant que l'admin ne l'a pas explicitement activée dans Paramètres → Règles.

## 3. Chronologie de la réflexion (v1.4 → v1.11)

| Version | Ce qui a été ajouté/affiné |
|---|---|
| **v1.4** | Introduction du rôle : fiche minimale (prénom/nom/PIN), 3ᵉ type de réservation "Intervention" prioritaire par défaut sur les visites, recasage automatique en cas de conflit. |
| **v1.6** | Catalogue de **métiers** prédéfinis (icône dédiée = avatar par défaut), types d'intervention filtrés par métier + durée habituelle, fiche bloquante à la 1ère connexion, priorité **configurable** (totale ou restreinte à une sélection de créneaux via `IntervenantPriorityModal`), canal **Nouvelles séparé** par défaut (visible admin + intervenants, invisible visiteurs sauf ouverture explicite), bloc "Mes soins" dans Mon Compte. |
| **v1.7** | Rôle réservé aux espaces **Premium** à l'activation (`canEnableIntervenants`). |
| **v1.8–v1.9** | Refonte du Planning des intervenants admin (`SoinsPeriodBlock` + `DaySoinsModal`, swipe semaine/mois), affichage `phrase_totem`, checklists personnelles "Mes modèles" partagées avec les visiteurs. |
| **v1.10 (branche `feat/fiche-intervenant-express-confirmation-creneau`, PR #235)** | L'admin peut créer une **fiche intervenant express sans connexion** (pour un professionnel qui n'aura jamais l'app) : `pin` devient nullable, `pin IS NULL` = sentinelle "fiche créée par l'admin, sans login". Ajout d'un email de confirmation de créneau (`alert_type = 'booking_proposal'`, edge function `notify-intervention-confirmation`). |
| **v1.10–v1.11 (PR #201-#207)** | Refonte complète du Planning des intervenants + nouveau concept **"Mes Espaces Patients"** : un intervenant qui suit plusieurs patients (donc plusieurs espaces) peut voir tous ses soins **cross-space** en un seul planning (regroupement par numéro de téléphone normalisé, comme `PatientsList.tsx`), et **modifier** un soin déjà réservé (`InterventionEditFlow`, capacité qui n'existait pour aucun autre type de réservation avant). |

## 4. Fonctionnalités détaillées

### 4.1 Entrée & identité
- Rejoint l'espace via le **même lien/QR/code dossier** que les visiteurs — pas d'invitation nominative distincte. Entrée dédiée « Je suis intervenant » (`app/auth/intervenant-entry.tsx`), écran à deux modes (code dossier saisi / lien préempli), quasi-identique à `visitor-entry.tsx` par choix délibéré (mêmes composants de saisie, juste un `role` différent en sortie).
- Identité locale : prénom, nom, PIN 4 chiffres (ou **pas de PIN** si fiche créée par l'admin, v1.10) — jamais de compte Supabase Auth.
- Session locale (`lib/visitorSession.ts`) porte `role: "visiteur" | "intervenant"`, `intervenantProfileId`, `metier`, `telephone`.

### 4.2 Fiche intervenant obligatoire (onboarding bloquant)
- À la 1ère connexion : `IntervenantOnboardingFlow.tsx` bloque l'accès tant que le métier + au moins un type d'intervention (libellé + durée) ne sont pas renseignés.
- Catalogue de métiers dans `lib/metiers.ts` — icône dédiée par métier, utilisée comme avatar par défaut tant qu'aucune photo n'est ajoutée.
- Modifiable ensuite via `IntervenantFicheModal.tsx` ("Ma fiche intervenant", éditable par l'intervenant lui-même) — après plusieurs itérations (PR #203-#205), la fiche a fini par **séparer strictement** : identité (prénom/nom/téléphone/phrase totem) éditée uniquement dans "Mes informations" (source unique de vérité), et métier + soins + photo édités uniquement ici. Cf. leçon UX en §6.
- `IntervenantProfileModal.tsx` est la version **lecture seule**, affichée côté admin/collègues quand on clique sur une fiche.

### 4.3 Fiche express sans connexion (admin, v1.10)
- Depuis "Ajouter une intervention" côté admin, création à la volée d'une fiche minimale (`AdminNewIntervenantFlow.tsx` : prénom/nom → métier → soins → email optionnel, **pas** de PIN/téléphone/phrase totem) pour un professionnel qui ne se connectera jamais à l'app.
- Après réservation d'un créneau pour cette personne, l'admin peut lui envoyer une **confirmation** (email, via l'edge function `notify-intervention-confirmation`) avec les détails pratiques + lien Maps. Si l'intervenant a un compte, la même info arrive aussi comme alerte in-app (`BookingProposalAlertModal.tsx`, `alert_type = 'booking_proposal'`).

### 4.4 Réservation d'intervention
- 3ᵉ type de réservation (`type: "Intervention"`), aux côtés de Visite et Nuit — `InterventionBookingFlow.tsx` (jour) et `NightInterventionBookingFlow.tsx` (nuit, si autorisé — `night_intervenant_mode` + `night_authorized_intervenants`).
- **Prioritaire par défaut** sur les visites : réserver une intervention sur un créneau déjà occupé par une visite déclenche le **recasage automatique** de cette visite (mécanisme générique de recasage, réutilisé, pas dupliqué). Depuis v1.6, la priorité est **configurable** : totale, ou restreinte à une sélection de créneaux via `IntervenantPriorityModal.tsx` (`intervenant_priority_mode` sur `slot_config`, `priority_slots` par fiche).
- `InterventionEditFlow.tsx` (v1.11) permet de modifier jour/horaire/type d'un soin **déjà réservé** — capacité inédite dans l'app (ni les visites ni les nuitées n'ont d'édition, seulement annulation+recréation). Implémenté en **delete-then-rebook-with-rollback** : supprime l'ancienne ligne, appelle le même RPC `book_intervention` que pour une nouvelle réservation (réutilise toute sa validation), et **réinsère l'ancienne ligne inchangée si le RPC échoue** — évite un soin "perdu" en cas d'échec, sans avoir à écrire un nouveau RPC dédié à l'édition.

### 4.5 Planning & vues
- **Planning des intervenants (admin)** : écran dédié `app/(admin)/intervenants.tsx`, non visible dans la barre d'onglets tant que le rôle n'est pas activé. `SoinsPeriodBlock.tsx` (grille swipeable semaine/mois) + `DaySoinsModal.tsx` (détail d'un jour, ajout d'intervention pré-remplie).
- **Planning personnel intervenant** : `IntervenantPlanningPanel.tsx`, affiché sous le calendrier visiteur/intervenant quand `role === "intervenant"`.
- **Mes Espaces Patients** (v1.11, `app/(visitor)/home/mes-espaces-patients.tsx`) : planning **cross-space** — un même intervenant, identifié par son numéro de téléphone normalisé à travers plusieurs `patient_spaces` (même pattern que `PatientsList.tsx`), voit tous ses soins réservés dans un seul calendrier, tous patients/espaces confondus, jamais de visites. Taper une ligne pivote la session vers l'espace concerné (`lib/intervenantSpaceSwitch.ts`).
- `IntervenantGlobalCalendar.tsx` : vue calendrier colorée par patient (utilisé dans ce contexte cross-space).
- `WeeklyPlanningGrid.tsx`, `DaySlotGrid.tsx` : grilles de créneaux réutilisées par plusieurs écrans intervenant.

### 4.6 Nouvelles du jour — canal séparé
- Depuis v1.6, si le rôle est activé, les nouvelles publiées par un intervenant ou par l'admin sont **réservées par défaut** au canal intervenants/admin — invisibles des visiteurs — sauf bascule explicite de l'admin (bouton dans l'en-tête `NewsFeed.tsx`, `news_intervenant_mode` sur `slot_config`, table `news_authorized_intervenants` pour un contrôle fin). Les nouvelles publiées par un visiteur restent toujours visibles par tous.
- `NewsIntervenantModal.tsx` : configuration admin de ce mode.

### 4.7 Accès identique au visiteur (sans restriction)
- Souvenirs, Entraide, Mur de soutien, checklists personnelles (dont "Mes modèles" partagés) : accès identique, pas de mode dégradé.
- Exclu en revanche : le champ "lien avec le patient" (Père/Mère/Fils/…), qui n'a de sens que pour un visiteur.

### 4.8 Nuitées
- Accès aux interventions de nuit conditionné par `night_intervenant_mode` (`slot_config`) + liste blanche `night_authorized_intervenants` — pas un accès automatique, contrairement aux visites/interventions de jour.

## 5. Décisions d'architecture à retenir (pour ne pas les redécouvrir en V2)

1. **`intervenant_profiles.pin` nullable = sentinelle** "fiche créée par l'admin, sans login" — pas de colonne booléenne dédiée. Simple, mais à bien vérifier partout où `pin` est lu comme s'il était toujours présent.
2. **`intervention_types` dénormalise prénom/nom/métier** de `intervenant_profiles`, tenu à jour par triggers bidirectionnels (pas un snapshot figé) — différent du pattern "copie figée au moment de la réservation" utilisé sur `reservations`, car `intervention_types` représente toujours l'offre *actuelle* d'un intervenant.
3. **`alert_type = 'booking_proposal'` réutilise le mécanisme `alert_*` existant** sur `reservations` (pas de nouvelle table/mécanisme). Ça marche automatiquement car `book_intervention()` résout toujours prénom/nom côté serveur depuis `intervenant_profiles`, donc l'appariement par prénom+nom déjà en place dans `account.tsx` capte ces alertes sans logique nouvelle.
4. **Cross-space, l'identité pivot est le numéro de téléphone normalisé** (même pattern que `PatientsList.tsx`) — pas d'ID intervenant global inter-espaces, chaque espace a sa propre ligne `intervenant_profiles`.
5. **`InterventionEditFlow`** charge la config de créneaux et les types d'intervention **de l'espace du soin édité**, pas de l'espace de session actif (`useSpace()`/`useVisitorContext()` inutilisables ici) — requêtes directes, car l'intervenant peut éditer un soin d'un espace différent de celui affiché à l'écran.
6. **Priorité configurable** : `slot_config.intervenant_priority_mode` (total/selected) + `intervenant_profiles.priority_slots` (bool, défaut `true`) — appliqué uniquement si le mode est `"selected"`.
7. Le rôle est un **sous-mode du Visiteur**, pas un rôle indépendant — d'où le grand nombre de fichiers "visiteur" partagés avec des branches `role === "intervenant"` plutôt qu'un arbre de fichiers parallèle complet (voir `CODE_INTERVENANT_V1_COMPLET.md`, Section B).

## 6. Leçons UX apprises (à ne pas refaire en V2)

- **`IntervenantFicheModal.tsx` a connu 3 itérations (PR #203→#205)** avant de trouver la bonne structure : une liste de soins qui peut grandir sans borne ne doit **jamais** être mise dans une `ScrollView` imbriquée dans une autre `ScrollView` — les gestes de scroll se font capter par la ScrollView interne et l'utilisateur reste bloqué, incapable d'atteindre les boutons Enregistrer/Annuler. La bonne solution : borner toute la carte (`maxHeight: "85%"`), header et footer fixes, **une seule** zone scrollable au milieu (déjà la convention `DaySoinsModal`/`IntervenantProfileModal`).
- **Une fiche ne doit avoir qu'un seul éditeur par champ.** La fiche intervenant a fini par ne plus éditer prénom/nom/téléphone/phrase totem (déjà édités dans "Mes informations") — la double-édition du même champ à deux endroits a créé de la confusion et des bugs de synchronisation avant d'être corrigée.
- **Cross-space + date seule = ambigu.** Dans "Mes Espaces Patients", plusieurs soins peuvent partager la même date dans des espaces différents — les callbacks de sélection de ligne doivent recevoir l'objet réservation complet, pas juste une date, pour savoir vers quel espace pivoter.
- **Édition sans RPC dédié = delete + rebook + rollback.** Plutôt que d'écrire un nouveau RPC juste pour exclure une réservation de son propre contrôle de chevauchement, réutiliser le RPC de création existant avec suppression préalable + réinsertion en cas d'échec est plus simple et évite de dupliquer toute la logique de validation.

## 7. Limites connues / jamais vérifiées sur device

Aucun test sur appareil physique n'a jamais été possible pendant le développement (contrainte permanente de l'environnement de travail). Les points suivants sont **restés non vérifiés en conditions réelles** au moment du retrait :
- Le ressenti du swipe horizontal semaine/mois dans `SoinsPeriodBlock.tsx`.
- Le comportement des modales empilées (`DaySoinsModal` + `SlotOccupantsModal`/`AdminAddIntervention` par-dessus).
- La navigation mois/année aux bornes (fin décembre → janvier) dans le planning intervenant.
- L'interaction complète du picker date/créneau/type dans `InterventionEditFlow`, et son chemin de rollback en cas d'échec RPC.
- La frontière d'affichage entre "Mes Espaces Patients" et "Autres soins planifiés" (`excludeUpToDate`) dans les cas limites de changement de semaine/mois.
- Aucune fonction de suppression de fiche intervenant n'a jamais été exposée dans l'UI (choix assumé, pas un oubli — mais à redécider en V2).

## 8. Pour la suite

Voir `INSTRUCTIONS_CLAUDE_CODE_REINTEGRATION_V2.md` pour la marche à suivre technique, et `CODE_INTERVENANT_V1_COMPLET.md` pour le code source complet archivé.

## 9. Deuxième vague de masquage (2026-08-21, suite à PR #291)

Après la PR #291 (3 points d'entrée coupés), trois traces indirectes du rôle restaient visibles côté admin même sans accès possible au rôle lui-même — masquées dans la foulée, toujours dans `app/(admin)/settings.tsx` :
- Le **bloc "Intervenants"** de la section Historique (rendu de `IntervenantsBlock`).
- Le sous-bloc **"🩺 Soins planifiés"** de la section Historique (données de `loadSoinsPlanifies`).
- Les entrées **"soin"** et **"resa_intervenant"** de la **frise Chronologie** (`chronoEvents`) — filtrées à la source (`chronoReservations.filter(r => r.type !== "Intervention" && !r.intervenant_profile_id)`) plutôt que masquées à l'affichage, pour ne pas non plus charger cette donnée inutilement.

Même méthode que la PR #291 : gardé derrière `INTERVENANT_ROLE_ENABLED` (`lib/featureFlags.ts`), code intact, juste inatteignable. Voir `INSTRUCTIONS_CLAUDE_CODE_REINTEGRATION_V2.md` §1 Étape 4 pour le détail des 3 emplacements à réactiver en V2.
