# PRD — AvecToi
## Product Requirements Document v1.6
*Préparé pour Claude Code — Juin 2026, synchronisé avec l'application livrée en Juillet 2026*

> **Changelog v1.5 → v1.6**
> - **Catalogue de métiers pour les intervenants** (choix obligatoire à la fiche intervenant, icône dédiée par métier utilisée comme avatar par défaut sans photo, types d'intervention filtrés par métier) — voir §2, §3.9
> - **Canal Nouvelles distinct intervenants/admin**, non visible des visiteurs par défaut (bascule admin pour l'ouvrir) — voir §3.7, §2
> - **Priorité des créneaux intervenants sur les visites devenue configurable** par l'admin (par défaut totale, restreignable à une sélection de créneaux via une popup dédiée) — le PRD v1.5 la décrivait comme toujours totale, voir §3.9, §3.11
> - **Bloc "Soutien" du Mon compte intervenant remplacé par "Mes soins"** (liste des interventions effectuées/planifiées) ; **Chronologie enrichie d'un encadré dédié** aux soins des intervenants — voir §2, §8

> **Changelog v1.4 → v1.5**
> - **Synchronisation avec l'application effectivement livrée** (juillet 2026). Ajouts/changements majeurs non anticipés en v1.4 :
>   - Nouveau **rôle Intervenant** (professionnel de soin, sous-mode du Visiteur, réservations prioritaires avec recasage automatique) — voir §2 et §3.9
>   - **Mode de soin** par espace : Suivi hospitalier **ou** Soin à domicile (le PRD ne prévoyait que l'hospitalier) — voir §3.1
>   - **Mode d'affichage Clair/Sombre** (préférence locale par appareil) en remplacement du système de 6 thèmes de couleur par espace prévu en §6 — voir §6
>   - **Fiche médicale patient** (date de naissance, sexe, groupe sanguin, allergies), en lecture seule pour les visiteurs — voir §3.10 ; ⚠️ impact RGPD/HDS, voir §10bis
>   - Entraide étendue à **6 catégories** (dont Transport) au lieu de 4 — voir §3.8
>   - Fenêtre de **purge RGPD ramenée à 30 jours** (renouvelable gratuitement) au lieu de 90 — voir §10bis
>   - **Recasage automatique** des réservations en conflit (changement de règles ou réservation d'intervention prioritaire) — voir §3.11
>   - Ce qui **n'a pas changé** et reste non construit reste listé tel quel en §8 (Hors scope) — non retiré de ce document.
>   - Détail exhaustif écran par écran : `Documentation/Documentation Fonctionnalités.docx` (généré depuis le code, mis à jour à chaque handoff)

> **Changelog v1.3 → v1.4**
> - **Nom définitif : AvecToi** (remplace le nom de travail « Relais Visites »). Domaine principal **`avectoi.care`**. Voir §0 Identité de marque.

> **Changelog v1.2 → v1.3 (rappel)**
> - **Tout en V1** : Entraide + Mur de soutien intégrés au périmètre V1
> - **Paiement** : app gratuite « consumption-only » (reader app), paiement 5,99 € hors app via Stripe web. Voir §3.1 et §4bis

---

## 0. Identité de marque

- **Nom** : **AvecToi**
- **Domaine principal** : **`avectoi.care`** (neutre géographiquement — France, Belgique, Suisse — et sémantiquement fort dans la santé ; `.fr` et `.com` indisponibles à prix raisonnable)
- **Baseline principale** : *« Parce qu'être présent, ça s'organise »* (variantes : *« Organisez vos visites, gardez le lien »*, *« Votre proche n'est jamais seul »*)
- **Réf. complète** : voir `AvecToi_Identité_Marque.md` (baselines, pitchs, stratégie domaines)

> **INPI** — « AvecToi » est un nom **distinctif** (expression appropriée, bien plus protégeable que « Relais »). Dépôt prévu en **classes 42 (logiciels/SaaS)** et **44 (services de santé)** ; envisager d'ajouter **9 (applications téléchargeables)** et **45 (services aux personnes)** pour couvrir l'usage. ⚠️ *Disponibilité de la marque « AvecToi » non encore vérifiée dans l'export INPI — faire une extraction sur ce nom (classes 9/42/44/45) avant dépôt, idéalement validée par un CPI.*

> **⚠️ Cohérence à harmoniser dans `AvecToi_Identité_Marque.md`** : le document de marque décrit encore le modèle initial (« PWA sans installation, sans compte », « freemium B2C »). Le modèle **décidé et figé dans ce PRD** est : **app native Android gratuite (reader app) + paiement unique 5,99 € sur le web** ; compte requis pour l'**admin** uniquement (les visiteurs restent sans compte). À aligner dans le doc marketing.

---

## 1. Contexte & Vision

### Origine
Application née d'un besoin réel : coordonner les visites à un proche hospitalisé (Rose-Marie, Hôpital Michallon, CHU Grenoble Alpes) sans conflits de créneaux, sans surcharger le patient ni l'équipe soignante.

Un MVP fonctionnel existe déjà : une PWA React déployée sur Vercel, connectée à Supabase, accessible sur https://planning-visites-maman.vercel.app

### Vision produit
Transformer ce MVP en application Android native (puis iOS), **gratuite au téléchargement pour tous**, l'organisateur payant **une fois** la création de son espace patient via le web. Permettre à n'importe quelle famille de coordonner sereinement la présence autour d'un proche — planning des visites, entraide, et nouvelles partagées.

Le nom **AvecToi** porte la promesse : la **présence auprès d'un proche** — coordination collective + dimension affective.

### Utilisateurs cibles
- Familles de patients hospitalisés
- Contextes : hospitalisation courte ou longue durée, soins palliatifs, rééducation, maternité, **EHPAD, maison de repos, convalescence post-opératoire à domicile**
- Profil : adultes 35-70 ans, pas nécessairement technophiles

### Modèle économique
- **Paiement unique** par l'admin (le proche organisateur), pas d'abonnement : **5,99 €** par espace patient
- **Paiement réalisé sur le web (Stripe), hors de l'app** → l'app reste gratuite et sans achat in-app (modèle reader app, voir §3.1 et §4bis)
- Visiteurs : accès 100 % gratuit via lien d'invitation
- **Prescripteurs (acquisition, pas de revenu direct)** : établissements de santé (autocollant QR code en salon des familles, pointant vers le **web**), puis — phase 2 — mutuelles et assureurs

---

## 2. Rôles & Permissions

### Super-admin (développeur = Guillaume Frey)
- Accès direct Supabase (dashboard technique)
- Voit tous les espaces patients
- Gère incidents, remboursements, support technique
- N'apparaît pas dans l'interface utilisateur

### Admin (client payant)
- **Crée son compte et son espace patient sur le web, et paie 5,99 € via Stripe** (le paiement ne se fait jamais dans l'app — voir §3.1)
- Se connecte ensuite indifféremment sur le web (responsive) ou dans l'app mobile pour gérer, via Supabase Auth (email + mot de passe) **plus un PIN secondaire de reconfirmation** pour les actions sensibles côté app
- **Choisit un mode de soin à la création de l'espace : Suivi hospitalier ou Soin à domicile** — conditionne les champs d'adresse demandés ensuite (§3.1)
- Renseigne : nom du patient, hôpital, service, numéro de chambre, adresse, lien Google Maps (mode hospitalier) ou adresse domicile (mode Soin à domicile)
- Renseigne son email (obligatoire) pour notifications d'annulation + alertes de purge
- **Configure les créneaux** : heures début/fin, durée, temps min entre visites, nb max de visiteurs/créneau
- Configure les règles de visite (texte libre)
- **Rédige des notes libres / infos visiteurs** (texte libre affiché aux visiteurs). ⚠️ *Garde-fou données sensibles, §10bis*
- **Choisit son mode d'affichage Clair/Sombre** (préférence locale par appareil — remplace le système de 6 thèmes de couleur par espace initialement prévu, voir §6)
- **Upload une photo du patient** (optionnel — logo générique par défaut)
- **Renseigne la fiche médicale du patient** (optionnelle) : date de naissance, sexe, groupe sanguin, allergies — consultée en lecture seule par les visiteurs (§3.10). ⚠️ *Donnée de santé structurée, impact RGPD/HDS — voir §10bis*
- Invite des visiteurs (et, si activé, des intervenants) via lien unique, QR code, code dossier, SMS, WhatsApp
- Voit le planning complet avec noms et coordonnées
- Ajoute/modifie/supprime n'importe quelle réservation (visite, nuitée, intervention)
- Suspend les nuitées, modifie les règles en cours (déclenche un **recasage automatique** des réservations en conflit, §3.11)
- Accède à l'historique complet
- Télécharge/upload des photos souvenirs ; **supprime n'importe quelle photo** (droits étendus)
- **Publie et modère les Nouvelles du jour** (peut supprimer toute nouvelle)
- **Crée des besoins d'entraide et modère le mur de soutien**
- **Peut activer le rôle Intervenant pour son espace** et gérer les fiches des professionnels de soin (§2 Intervenant, §3.9)
- Reçoit un email automatique à chaque annulation
- **Prolonge ou déclenche la purge** de l'espace (§10bis — fenêtre 30 jours, renouvelable)

### Visiteur (accès gratuit via lien d'invitation)
- Accède via lien unique, QR code ou code dossier (pas de compte requis)
- **Voit le planning complet** : qui vient à quel créneau
- Réserve un créneau disponible (dans la limite du **cap freemium** de 8 réservations de type Visite tant que l'espace n'est pas premium — §3.12)
- Saisit : **Prénom (obligatoire), Nom (obligatoire)**, Téléphone (optionnel)
  - *Nom obligatoire : permet aux autres visiteurs de savoir précisément qui vient.*
- Choisit un PIN 4 chiffres (modif/annulation, photos, nouvelles, entraide)
- Modifie/annule sa réservation avec son PIN
- Consulte infos patient + hôpital (ou domicile) et la **fiche médicale du patient en lecture seule** (§3.10)
- Upload/télécharge des photos souvenirs ; **supprime ses propres photos** (PIN)
- **Publie une Nouvelle du jour** (texte + photos) ; modifie/supprime les siennes (PIN)
- **S'attribue un besoin d'entraide** (« Je m'en occupe ») ; **poste un message de soutien**
- **"Sélectionner tout" / "Télécharger tout"** dans la galerie
- Reçoit un rappel push 1h avant sa visite (si notifications acceptées)
- **Ajoute son créneau à son calendrier** (natif Android)
- Peut recevoir une **alerte de recasage** si sa réservation a été automatiquement déplacée ou annulée suite à un changement de règles ou à une intervention prioritaire (§3.11)

### Intervenant (accès gratuit, sous-mode du Visiteur) *(NOUVEAU depuis v1.4)*
- Professionnel de soin (infirmier·ère, kiné, aide à domicile…) — distinct d'un visiteur qui rend une visite personnelle
- Fonctionnalité **désactivée par défaut** ; l'admin l'active pour son espace (§2 Admin, §3.9)
- Rejoint l'espace via le **même lien/QR/code dossier** que les visiteurs, par une entrée dédiée « Je suis intervenant » (écran à deux modes : code dossier saisi ou lien préempli)
- Même identité locale que le visiteur (prénom, nom, PIN 4 chiffres), sans création de compte
- À sa première connexion, doit renseigner une **fiche intervenant** (bloquante) : **choix d'un métier** dans un catalogue prédéfini *(NOUVEAU depuis v1.6 — icône dédiée par métier, utilisée comme avatar par défaut tant qu'aucune photo n'est ajoutée)*, au moins un type d'intervention (filtré par métier) + durée habituelle, avant de pouvoir continuer
- Réserve des **interventions**, un 3ᵉ type de réservation aux côtés de Visite et Nuit, **prioritaires par défaut** : une intervention réservée sur un créneau déjà occupé par une visite prioritaire déclenche le **recasage automatique** de cette visite (§3.11) — *depuis v1.6*, l'admin peut restreindre cette priorité à une sélection de créneaux plutôt qu'à la totalité (§3.9)
- Accède à Souvenirs et Entraide/Soutien comme un visiteur, sans restriction supplémentaire ; **Nouvelles** : canal séparé des visiteurs par défaut *(NOUVEAU depuis v1.6, voir §3.7)*, sauf ouverture explicite par l'admin
- Dans Mon compte : bloc **« Mes soins »** *(NOUVEAU depuis v1.6, remplace le bloc Soutien)* listant ses interventions effectuées et planifiées ; peut modifier sa propre fiche intervenant (métier compris) à tout moment

---

## 3. Fonctionnalités — V1 Android

### 3.1 Onboarding & Paiement *(modèle reader app — CRITIQUE)*

**Principe de conformité Google Play**
L'app est **"consumption-only" (reader app)** : elle ne vend **aucun** bien ou service en son sein. Aucun écran de prix, aucun bouton d'achat, aucun lien de paiement sortant *depuis l'app*. La création payante d'un espace se fait **exclusivement sur le web**. Ce modèle est explicitement autorisé par la politique Paiements de Google Play et n'entraîne **aucune commission de plateforme**.

> ❌ **Interdits dans l'app** (sous peine de rejet Play Store ou de frais Google) :
> - tout affichage de prix / offre d'achat
> - tout bouton "Acheter / Créer un espace payant"
> - tout lien sortant vers une page de paiement (les "external payment links" déclenchent des frais Google ~20 % + intégration d'API dédiée)

**Parcours Admin (sur le web)**
1. L'admin arrive sur le site web (`avectoi.care` ou domaine retenu) via SEO / QR code prescripteur / bouche-à-oreille
2. Crée un compte (Supabase Auth : email + mot de passe, vérification email)
3. Renseigne l'espace patient (formulaire en étapes, voir ci-dessous)
4. **Paie 5,99 € via Stripe Checkout** (sur le web)
5. À paiement confirmé (webhook Stripe → Supabase) : l'espace est activé, l'admin reçoit son accès + le **lien d'invitation visiteurs** (et le QR code)
6. L'admin peut dès lors gérer depuis le web **ou** se connecter dans l'app mobile

**Parcours dans l'app mobile**
- Écran d'accueil : « J'ai un lien d'invitation » (visiteur) / « Je gère un espace » (admin → écran de connexion)
- **Admin sans espace** : message neutre « Connectez-vous à votre espace. » — *aucune incitation à acheter, aucun lien d'achat*. (La création/achat se découvre via le web.)
- **Visiteur** : ouvre directement l'espace via le lien d'invitation, sans compte

**Formulaire de création d'espace (web)**

Étape 0 — Mode de soin : **Suivi hospitalier** ou **Soin à domicile** *(NOUVEAU depuis v1.4)* — conditionne les champs de l'étape 2
Étape 1 — Patient : Prénom, Nom ; upload photo (optionnel, compression auto ; sinon logo générique)
Étape 2 — Lieu : établissement, service/pavillon, chambre, adresse, lien Google Maps auto (mode hospitalier) **ou** adresse domicile sans nom d'établissement (mode Soin à domicile)
Étape 3 — Créneaux : heure début, heure fin, durée (min), écart min entre visites, max visiteurs/créneau ; nuitées on/off + max/nuit
Étape 4 — Règles & notes :
- Règles de visite (texte libre, exemples pré-remplis optionnels)
- **Notes libres / infos visiteurs** (2ᵉ champ libre) — avec avertissement *« N'indiquez pas d'informations médicales sensibles »* (§10bis)
Étape 5 — Mode d'affichage : implémenté en Clair/Sombre (préférence par appareil, pas par espace — voir §6 pour le système de thèmes initialement prévu à cette étape)
Étape 6 — Dates : début, fin estimée (modifiable ; alimente le calcul de purge §10bis)

> Le rôle **Intervenant** (§2, §3.9) et la **fiche médicale du patient** (§3.10) ne font pas partie de cet assistant de création : ils se configurent ensuite depuis Paramètres.

### 3.2 Interface Admin — Dashboard

**Vue Calendrier** : calendrier mensuel (indicateurs dispo/partiel/complet) ; **bouton "⚡ Prochaine disponibilité"** ; **clic sur un jour → vue jour** (visiteurs + accès Nouvelles du jour) ; navigation mois.

**Vue Jour** : créneaux du jour (heure, inscrits/max, noms) ; ajouter/modifier/supprimer une résa ; bloc nuitée si activée ; **bouton "📰 Nouvelles du jour"** pour cette date.

**Gestion des invitations** : lien unique, QR code, code dossier (lisible à voix haute), WhatsApp, SMS, copier.

**Galerie Souvenirs (admin)** : upload (galerie/caméra), compression auto, grille anté-chronologique, lightbox, **"Sélectionner tout" / "Télécharger tout"**, légende optionnelle, **suppression de n'importe quelle photo** (sans PIN).

**Entraide & Soutien (admin)** : crée/édite/supprime des besoins ; voit qui s'est attribué quoi ; modère le mur de soutien (voir §3.8).

**Planning des intervenants (admin)** *(NOUVEAU depuis v1.4)* : écran dédié, non visible dans la barre d'onglets tant que le rôle Intervenant n'est pas activé — fiches des intervenants, planning journalier des interventions, ajout d'une intervention au nom d'un intervenant (voir §3.9).

**Paramètres** : config espace, mode de soin (hospitalier/domicile), suspendre/réactiver nuitées, créneaux, mode d'affichage, photo patient, fiche médicale du patient, règles & notes, activation du rôle Intervenant, **gestion de la purge** (date prévue, prolonger, fermer/purger), support.

### 3.3 Interface Visiteur (et Intervenant, sous-mode — voir §3.9)

**Accès** : lien unique, QR code ou code dossier ; pas de compte ; **au 1er accès, consentement** (prénom + nom visibles des autres visiteurs). Entrée dédiée « Je suis intervenant », distincte de « Je rends visite », si le rôle Intervenant est activé sur l'espace.

**Onglets** :
- **Calendrier** : vue partagée ; "⚡ Prochaine disponibilité" ; clic jour → créneaux + accès Nouvelles du jour
- **Créneaux** : liste du jour ; **noms (prénom + nom) visibles** (transparence assumée) ; "+ Réserver" ; "✏️ Modifier" (PIN) ; "📰 Nouvelles du jour" ; créneaux bloqués par une intervention signalés par un bandeau dédié
- **Nouvelles du jour** (§3.7)
- **Entraide** (§3.8, 6 catégories)
- **Souvenirs** : voir/ uploader ; "Sélectionner tout" / "Télécharger tout" ; lightbox ; **suppression de ses propres photos** (PIN ; PIN de session si pas de résa)
- **Infos** : photo patient, nom, hôpital ou domicile, Google Maps, règles + notes libres, **fiche médicale du patient en lecture seule** (§3.10)
- **Partager** : QR code, code dossier, copier le lien, WhatsApp/SMS

### 3.4 Réservation (flux visiteur)
1. Sélection créneau
2. Modal : Prénom* / **Nom*** / Téléphone (optionnel) / **PIN 4 chiffres** (clavier intégré)
3. Confirmation : récap + affichage PIN (à noter) + **"📅 Ajouter à mon calendrier"** (Intent natif Android + fallback Google Calendar) + option notifications

### 3.5 Modification / Annulation
- "✏️ Modifier" sur créneau occupé → PIN → modifier (jour/créneau/infos) ou annuler
- À l'annulation → **email automatique à l'admin** (nom, créneau, date, lien)

### 3.6 Notifications
- **Push** (expo-notifications + Edge Function planifiée horaire) : rappel visiteur 1h avant
- **Email admin** (Resend/SendGrid) : annulation visiteur ; **alerte purge J-7** (lien pour prolonger)

### 3.7 Nouvelles du jour

Compte-rendu court après le passage d'un visiteur, pour rassurer les proches absents.

**Publication** : bouton **"📰 Nouvelles du jour"** depuis l'onglet dédié **et** la vue jour ; formulaire texte + **une ou plusieurs photos** (compression) ; auteur prénom + nom (repris de la résa si existante) ; rattachée à une **date** (par défaut le jour consulté / le jour même).

**Affichage** : **flux anté-chronologique** (plus récent → plus ancien) ; chaque entrée = auteur, date/heure, texte, photos (tap → lightbox) ; **accès par jour** depuis le calendrier (clic jour → qui est venu + bouton Nouvelles du jour → entrées de cette date).

**Droits** : visiteur édite/supprime **ses** nouvelles (PIN) ; admin supprime **n'importe quelle** nouvelle.

**Visibilité intervenants** *(NOUVEAU depuis v1.6)* : si le rôle Intervenant est activé (§3.9), les nouvelles publiées par un intervenant ou par l'admin sont réservées par défaut au canal intervenants/admin — invisibles des visiteurs — sauf si l'admin bascule explicitement leur visibilité (bouton dans l'en-tête de l'onglet). Les nouvelles publiées par un visiteur restent, elles, toujours visibles par tous.

### 3.8 Entraide & Mur de soutien

**Entraide — besoins & coups de main (care calendar)**
- L'admin (ou un visiteur) crée un **besoin** : ex. apporter un repas maison, du linge propre, des affaires de toilette, un livre, faire une course, un trajet
- Chaque besoin : **catégorie** — **6 catégories depuis v1.5** : 🍽️ Repas / 👕 Affaires / 🛒 Courses / 🚗 Transport / 🗂️ Administratif / 💡 Autre (le PRD v1.4 n'en prévoyait que 4, sans Transport ni Administratif) — + **statut** (ouvert → pris en charge → fait, avec fermeture automatique si non pris en charge après sa date)
- Un visiteur clique **« Je m'en occupe »** (identifié prénom + nom, PIN pour se désinscrire)
- Catégorie **Administratif** : checklists suggérées prêtes à publier en bloc (bibliothèque complète pour l'admin, sous-ensemble partageable pour les visiteurs/intervenants)
- Catégorie **Transport** *(NOUVEAU depuis v1.4 — revient sur l'exclusion initiale)* : dates/heures aller-retour, adresses, proposition d'horaire par la personne qui prend en charge
- L'admin dispose d'opérations groupées (sélection multiple, suppression en masse) réservées à son rôle

**Mur de soutien**
- Messages courts d'encouragement pour le patient / la famille
- Affichage anté-chronologique
- Distinct des Nouvelles du jour (qui sont des comptes-rendus de visite)

### 3.9 Rôle Intervenant *(NOUVEAU depuis v1.4)*

Réservé aux professionnels de soin (infirmier·ère, kiné, aide à domicile…), désactivé par défaut sur chaque espace.

- **Activation** : l'admin bascule « Planning des intervenants » dans Paramètres → Règles ; tant que non activé, aucune entrée « Je suis intervenant » n'apparaît côté visiteurs
- **Accès** : même lien d'invitation, QR code ou code dossier que les visiteurs — pas d'invitation nominative distincte
- **Métier** *(NOUVEAU depuis v1.6)* : catalogue prédéfini de métiers, sélection obligatoire à la fiche intervenant ; icône de métier utilisée comme avatar par défaut sans photo ; affiché sous le nom sur les cartes Intervenants et attaché à chaque soin réservé
- **Fiche intervenant obligatoire** à la première connexion : métier + au moins un type d'intervention (libellé + durée habituelle, filtrés par métier) avant de pouvoir continuer ; modifiable ensuite depuis Mon compte
- **Réservation d'intervention** : 3ᵉ type de réservation (aux côtés de Visite et Nuit) ; priorité sur les visites **configurable par l'admin depuis v1.6** — par défaut totale sur tous les créneaux, restreignable à une sélection via une popup dédiée (Planning des intervenants → Réglages) — une intervention réservée sur un créneau prioritaire déjà occupé déclenche le recasage automatique de la/les visite(s) en conflit (§3.11), au créneau valide le plus proche ou annulation avec message explicatif si aucun recasage n'est possible
- **Écran dédié admin « Planning des intervenants »** : fiches des intervenants ayant rejoint l'espace (métier affiché sous le nom), planning journalier des interventions, ajout d'une intervention au nom d'un intervenant ; pas de fonction de suppression de fiche exposée dans l'UI
- Accès identique au visiteur pour Souvenirs, Entraide, Soutien ; **Nouvelles** sur un canal séparé par défaut *(NOUVEAU depuis v1.6, §3.7)*

### 3.10 Fiche médicale du patient *(NOUVEAU depuis v1.4)*

- Renseignée par l'admin dans Paramètres → Profil Patient : date de naissance (âge calculé), sexe, groupe sanguin, allergies
- Consultée par les visiteurs et intervenants en **lecture seule**, via Mon compte ou en touchant la photo du patient dans l'en-tête
- ⚠️ **Donnée de santé structurée non prévue par le PRD v1.4**, qui reposait sur l'absence de données de santé pour écarter l'obligation d'hébergement HDS (§10bis) — à réévaluer

### 3.11 Recasage automatique des réservations *(NOUVEAU depuis v1.4)*

- Déclenché par un changement des règles de visite (horaires, jours autorisés, dates bloquées…) ou par une réservation d'intervention prioritaire (la priorité elle-même étant configurable par l'admin depuis v1.6, §3.9)
- Recalcul automatique des réservations en conflit : recasage au créneau valide le plus proche (le même jour si possible, sinon jusqu'à 60 jours plus tard pour une intervention), ou annulation avec message explicatif si aucun recasage n'est possible
- L'admin voit un résumé du nombre de réservations recasées/annulées ; le visiteur ou l'intervenant concerné reçoit une alerte dédiée à sa prochaine connexion, avec accusé de lecture
- Tracé dans l'historique (Paramètres → Histo, §3.2)

### 3.12 Cap freemium *(NOUVEAU depuis v1.4 — mécanisme de conversion non détaillé au niveau produit dans le PRD initial)*

- Un espace non payant est limité à **8 réservations de type Visite**
- Au-delà, toute nouvelle réservation ou tout nouvel ajout de photo est bloqué avec un message d'information — jamais de bouton d'achat affiché dans l'app (conformité reader app, §3.1)
- Le passage en espace premium reste un flux **web** (avectoi.care), hors du périmètre de l'app mobile

---

## 4. Stack Technique

### Mobile (app gratuite, Play Store)
- **Framework** : React Native + Expo (SDK 51+)
- **Navigation** : Expo Router
- **Styles** : StyleSheet
- **Icônes** : @expo/vector-icons
- **Calendrier natif** : expo-calendar
- **Notifications** : expo-notifications (rappel local 1h avant visite)
- **Galerie / Caméra** : expo-image-picker
- **Compression** : expo-image-manipulator
- **QR Code** : react-native-qrcode-svg
- **Partage** : expo-sharing
- ❌ **Pas de librairie de paiement in-app** (ni Play Billing, ni Stripe SDK in-app) — l'app ne vend rien

### Web (site de vente + gestion — basé sur la PWA Vercel existante)
- **React + Vite** (réutilise l'`App.jsx` actuel comme base)
- **Stripe Checkout** (paiement 5,99 € hébergé par Stripe) + **webhook** vers Supabase pour activer l'espace
- Responsive : permet à l'admin de tout gérer depuis le navigateur sans l'app

### Backend (existant, à étendre) — partagé web + app
- **Base de données** : Supabase (PostgreSQL), **région UE** (RGPD §10bis)
- **Auth** : Supabase Auth (admin)
- **Storage** : Supabase Storage (souvenirs, photo patient, photos Nouvelles du jour)
- **Realtime** : planning + nouvelles en direct
- **Edge Functions** : webhook Stripe (activation espace), emails, rappels push, **job de purge quotidien**

### Build & Publication
- **EAS Build** (Android), **EAS Submit** (Play Store)

---

## 4bis. Architecture — séparation web / app *(NOUVEAU, critique pour la conformité)*

```
   ┌─────────────────────────────┐         ┌──────────────────────────────┐
   │   WEB  (avectoi.care)   │         │   APP ANDROID (gratuite)     │
   │   = la "caisse" + gestion   │         │   = usage, "reader app"      │
   ├─────────────────────────────┤         ├──────────────────────────────┤
   │ • Landing / SEO             │         │ • Visiteur : réserver, voir  │
   │ • Création compte admin     │         │   nouvelles, souvenirs,      │
   │ • Création espace patient   │         │   entraide                   │
   │ • PAIEMENT 5,99 € (Stripe)  │         │ • Admin : gérer en mobilité  │
   │ • Gestion (responsive)      │         │   + push                     │
   └──────────────┬──────────────┘         │ • AUCUN prix / achat in-app  │
                  │                         └───────────────┬──────────────┘
                  │      ┌──────────────────────────┐       │
                  └─────▶│   SUPABASE (UE)          │◀──────┘
                         │  Auth · DB · Storage ·   │
                         │  Realtime · Edge Funcs   │
                         └──────────────────────────┘
```

- **Le web vend, l'app sert.** L'achat se fait à 100 % sur le web → app gratuite légitime, 0 % commission.
- **Acquisition** : QR codes prescripteurs et liens pointent vers le **web** (découverte + achat).
- **Lien d'invitation visiteur** : ouvre l'app si installée (deep link), sinon la version web (PWA) — le visiteur n'a jamais à payer ni à installer.
- **Frais réels** : Stripe EU ≈ 1,5 % + 0,25 € → ~0,34 € sur 5,99 € (net ~5,65 €).

---

## 5. Schéma base de données (Supabase)

### Table `admin_accounts`
```
id (uuid, PK)
email (text)                  ← notifications + alertes purge
created_at (timestamp)
stripe_customer_id (text)     ← client Stripe (paiement web)
```

### Table `patient_spaces`
```
id (uuid, PK)
admin_id (uuid, FK → admin_accounts)
patient_firstname (text)
patient_lastname (text)
patient_photo_url (text)      ← nullable
home_care_mode (boolean)       ← NOUVEAU depuis v1.4, true = mode Soin à domicile (§3.1)
hospital_name (text)
hospital_service (text)
hospital_room (text)
hospital_address (text)
hospital_maps_url (text)
visit_rules (text)
admin_notes (text)            ← notes libres (⚠️ pas d'info médicale sensible)
theme (text)                  ← "blue"|"red"|"pink"|"green"|"yellow"|"orange" — colonne conservée pour compatibilité, plus lue par l'UI actuelle (voir §6)
patient_birthdate (date)       ← NOUVEAU depuis v1.4, fiche médicale (§3.10)
patient_sex (text)             ← NOUVEAU depuis v1.4, "M" | "F"
patient_blood_type (text)      ← NOUVEAU depuis v1.4
patient_allergies (text)       ← NOUVEAU depuis v1.4
intervenants_enabled (boolean) ← NOUVEAU depuis v1.4, active le rôle Intervenant (§3.9)
intervenant_news_visible_to_visitors (boolean) ← NOUVEAU depuis v1.6, défaut false, ouvre aux visiteurs le canal Nouvelles intervenants/admin (§3.7)
premium (boolean)              ← NOUVEAU depuis v1.4, désactive le cap freemium de 8 réservations Visite (§3.12)
start_date (date)
end_date (date)
is_active (boolean)           ← activé après paiement Stripe confirmé
invite_token (text, unique)
dossier_code (text, unique)    ← NOUVEAU depuis v1.4, code alternatif lisible à voix haute
stripe_payment_id (text)      ← référence du paiement (webhook)
last_activity_at (timestamp)  ← rafraîchi à chaque résa/nouvelle/upload
purge_scheduled_at (date)     ← date de purge auto calculée (fenêtre 30 jours depuis v1.4, voir §10bis)
created_at (timestamp)
```

### Table `slot_config`
```
id (uuid, PK)
space_id (uuid, FK → patient_spaces)
visit_start_hour (integer)
visit_end_hour (integer)
slot_duration_minutes (integer)
min_gap_minutes (integer)
max_visitors_per_slot (integer)
night_enabled (boolean)
max_night_visitors (integer)
intervenant_priority_mode (text)  ← NOUVEAU depuis v1.6, "all" (défaut, tous les intervenants prioritaires) | "selected" (seuls ceux avec priority_slots=true, §3.9)
```

### Table `reservations`
```
id (uuid, PK)
space_id (uuid, FK → patient_spaces)
date (date)
creneau (text)
prenom (text)
nom (text)                    ← obligatoire
telephone (text)
type (text)                   ← "Visite" | "Nuit" | "Intervention" — 3ᵉ valeur ajoutée depuis v1.4 (§3.9)
pin (text)                    ← valeur sentinelle "ADMIN" pour les réservations créées par l'admin
group_id (uuid, nullable)      ← NOUVEAU depuis v1.4, regroupe une réservation et ses accompagnants
duration_minutes (integer, nullable)   ← NOUVEAU depuis v1.4, copié depuis intervention_types au moment de la résa (type="Intervention")
intervention_label (text, nullable)    ← NOUVEAU depuis v1.4, idem — copié pour ne jamais changer si le type est modifié/supprimé ensuite
intervenant_profile_id (uuid, FK → intervenant_profiles, nullable, on delete set null) ← NOUVEAU depuis v1.4, référence la fiche intervenant pour type="Intervention"
previous_date (date, nullable)         ← NOUVEAU depuis v1.4, alerte de recasage (§3.11) : date avant déplacement
previous_creneau (text, nullable)      ← NOUVEAU depuis v1.4, idem : créneau avant déplacement
alert_message (text, nullable)         ← NOUVEAU depuis v1.4, message affiché au visiteur/intervenant concerné
alert_type (text, nullable)            ← NOUVEAU depuis v1.4, "rebooked" | "night_cancelled" | "rebooking_failed"
alert_seen (boolean)                   ← NOUVEAU depuis v1.4, accusé de lecture ; colonnes alert_* effacées une fois vues/résolues
push_token (text)
timestamp (timestamp)
```

### Table `intervenant_profiles` — fiches des professionnels de soin *(NOUVEAU depuis v1.4, §3.9)*
```
id (uuid, PK)
space_id (uuid, FK → patient_spaces)
prenom (text)
nom (text)
pin (text)
metier (text)                 ← NOUVEAU depuis v1.6, catalogue prédéfini de métiers (§3.9)
priority_slots (boolean)      ← NOUVEAU depuis v1.6, défaut true, utilisé si slot_config.intervenant_priority_mode = "selected" (§3.9)
created_at (timestamp)
```

### Table `intervention_types` — types d'intervention par fiche *(NOUVEAU depuis v1.4, §3.9)*
```
id (uuid, PK)
intervenant_profile_id (uuid, FK → intervenant_profiles, on delete cascade)
label (text)
duration_minutes (integer)
created_at (timestamp)
```

### Table `reservation_change_history` — trace permanente des recasages/annulations auto *(NOUVEAU depuis v1.4, §3.11)*
Contrairement aux colonnes `alert_*` de `reservations` (effacées une fois la réservation vue/modifiée), ces lignes ne sont jamais supprimées : c'est la source affichée dans "Mes réservations" (visiteur) et le sous-menu admin "Modification de réservations".
```
id (uuid, PK)
space_id (uuid)
reservation_id (uuid)
prenom (text)
nom (text)
type (text)
change_type (text)            ← "rebooked" | "night_cancelled" | "rebooking_failed"
previous_date (date, nullable)
previous_creneau (text, nullable)
new_date (date, nullable)
new_creneau (text, nullable)
message (text)
changed_at (timestamp)
```

### Table `souvenirs`
```
id (uuid, PK)
space_id (uuid, FK)
filename (text)
caption (text)
uploaded_by_prenom (text)
uploaded_by_nom (text)
uploaded_by_pin (text)
created_at (timestamp)
```

### Table `news_entries` — Nouvelles du jour *(nom corrigé, table déjà nommée ainsi en base — anciennement documentée ici sous `news`)*
```
id (uuid, PK)
space_id (uuid, FK)
news_date (date)
content (text)
photos (jsonb)                ← liste d'URLs Storage
author_prenom (text)
author_nom (text)
author_pin (text)
author_role (text)            ← NOUVEAU depuis v1.6, "visiteur" (défaut) | "intervenant" | "admin" — pilote la visibilité du canal (§3.7)
created_at (timestamp)
```

### Table `tasks` — Entraide
```
id (uuid, PK)
space_id (uuid, FK)
title (text)
description (text)
category (text)               ← "repas" | "affaires" | "courses" | "transport" | "administratif" | "autre" — 6 valeurs depuis v1.4 (transport et administratif ajoutés, §3.8)
status (text)                 ← "ouvert" | "pris_en_charge" | "fait" | "fermé" — "fermé" ajouté depuis v1.4 (fermeture auto si non pris en charge après la date, §3.8)
claimed_by_prenom (text, nullable)
claimed_by_nom (text, nullable)
claimed_by_pin (text, nullable)
created_by (text)
created_at (timestamp)
```

### Table `support_messages` — Mur de soutien
```
id (uuid, PK)
space_id (uuid, FK)
message (text)
author_prenom (text)
author_nom (text)
created_at (timestamp)
```

> **RLS** : toutes les tables filtrées par `space_id`. Politiques `anon` explicites (SELECT/INSERT/UPDATE/DELETE `USING (true)`). Rappel MVP : les policies par défaut ciblant `authenticated` bloquent silencieusement l'`anon`.

---

## 6. Charte graphique & Thèmes

### Principe (implémenté, depuis v1.4)
L'application utilise un **mode d'affichage Clair / Sombre**, choisi individuellement par chaque utilisateur (préférence locale par appareil, bascule dans Compte → Mon affichage). Ce mécanisme **remplace** le système de 6 thèmes de couleur par espace décrit ci-dessous, qui n'a pas été retenu tel quel : la colonne `patient_spaces.theme` existe toujours en base pour compatibilité mais n'est plus lue par l'interface actuelle.

### Système de thèmes initialement prévu *(non retenu en l'état — conservé ici à titre de référence historique)*
> ⚠️ Codes couleurs exacts à définir. Noms = identifiants logiques.

| Identifiant | Nom affiché | Ambiance |
|---|---|---|
| `blue` | Bleu nuit | Sérénité — défaut (charte MVP) |
| `red` | Rouge grenat | Force, combativité |
| `pink` | Rose doux | Tendresse |
| `green` | Vert nature | Espoir, apaisement |
| `yellow` | Jaune soleil | Optimisme, chaleur |
| `orange` | Orange vif | Énergie, bienveillance |

### Structure d'un thème
```javascript
const themes = {
  blue: {
    bg: "#0D1B2E", card: "#112240", border: "#1E3A5F",
    accent: "#2E75B6", gold: "#f0b429", text: "#e8edf5",
    muted: "#7a8fa6", success: "#3ecf8e", danger: "#e94560",
    orange: "#f97316",
  },
  red: {/* à définir */}, pink: {/* à définir */}, green: {/* à définir */},
  yellow: {/* à définir */}, orange: {/* à définir */},
};
```

### Logo / En-tête
- Logo circulaire (silhouettes + calendrier, SVG fourni)
- Photo patient (si uploadée) ronde au centre, par-dessus les silhouettes ; sinon logo générique
- Teinte du logo adaptée au thème

### Typographie
- Titres : Playfair Display ; Corps : DM Sans (expo-google-fonts)

---

## 7. Ce qui existe déjà (MVP Vercel)

Code de référence : `App.jsx` (fichier unique React) — composants UI complets, connexion Supabase (`supabase.js`), logique métier (créneaux, PIN, compression, QR). **La base web du modèle §4bis réutilise directement ce code.**

**À porter en React Native (app mobile) :**
| Web (actuel) | React Native (cible) |
|---|---|
| `<div>` | `<View>` |
| `<p>`, `<span>` | `<Text>` |
| Styles inline CSS | `StyleSheet.create()` |
| `navigator.share` | `expo-sharing` |
| `<input type="file">` | `expo-image-picker` |
| Canvas API (compression) | `expo-image-manipulator` |
| QR code web | `react-native-qrcode-svg` |
| Lien Google Calendar | `expo-calendar` |
| `window.innerWidth` | `Dimensions.get('window')` |

Logique Supabase (requêtes, realtime, storage) : 100 % réutilisable.

---

## 8. Hors scope V1

- Application iOS (V2 selon traction Android)
- Mode multi-patients simultanés pour un même admin (V2)
- Intégration calendrier hôpital
- ~~Covoiturage / coordination de trajets (exclu du produit)~~ — **obsolète depuis v1.5** : couvert par la catégorie Entraide **Transport** (§3.8)
- Messagerie interne bidirectionnelle (le mur de soutien n'en est pas une)
- Traduction multilingue
- Paiement in-app (par conception : modèle reader app, §3.1)
- Prescription mutuelles / assureurs (phase 2 commerciale)
- ~~Codes couleurs définitifs des thèmes autres que `blue`~~ — **obsolète depuis v1.5** : le système de 6 thèmes par espace a été remplacé par un mode d'affichage Clair/Sombre par appareil (§6)
- **Export PDF "livret"** (V2) : bouton "Chronologie" côté admin (Paramètres →
  Historique) déjà livré en V1 — ouvre une frise chronologique (popup, zone de
  scroll bornée) combinant Infos hospitalières + Consignes de visite + Règles
  de visite + Visites (créneaux/nuitées réservés), triée du plus récent (haut)
  à la date d'hospitalisation (bas) ; **depuis v1.6, les soins des intervenants
  y apparaissent dans un encadré dédié**, distinct des visites. Reste à construire : export de cette même
  matière en **livret PDF** regroupant l'ensemble des infos remplies par les
  visiteurs et l'admin, comme trace du passage à l'hôpital (ou des soins à
  domicile). Dans le PDF, la frise s'affiche verticale, en partant de la date
  d'hospitalisation (ordre chronologique croissant, inverse du popup),
  affichant dates + infos importantes. Modèle de mise en page non défini.

---

## 9. Critères de succès V1

- App Android publiée sur Play Store, **gratuite, sans achat in-app** (conforme reader app)
- Site web opérationnel : création compte + espace + **paiement Stripe 5,99 €** + activation par webhook
- Flux complet : admin crée espace + paie (web) → invite → visiteur réserve (app/web)
- Connexion admin dans l'app à un espace créé sur le web
- Mode d'affichage Clair/Sombre (switch temps réel, préférence par appareil) ; photo patient au centre du logo
- "Prochaine disponibilité" (admin + visiteur) ; ajout calendrier natif Android
- Galerie : upload, download groupé, "Sélectionner tout", suppression par PIN
- **Nouvelles du jour** : publication (texte + photos), flux anté-chronologique, accès par jour, droits PIN/admin
- **Entraide** (6 catégories, dont Transport) : création de besoins, statut, « Je m'en occupe » (PIN) ; **Mur de soutien** : post + affichage anté-chronologique
- Notes libres admin affichées (avec avertissement données sensibles)
- Email admin à chaque annulation ; **purge auto (30 jours, renouvelable) + alerte J-7 + prolongation**
- Push rappel 1h avant visite ; planning + nouvelles en temps réel (Realtime)
- **Rôle Intervenant** : fiche, réservation prioritaire d'intervention, recasage automatique des visites en conflit *(depuis v1.5)*
- **Fiche médicale du patient** (lecture seule visiteurs/intervenants) *(depuis v1.5)*
- Mode de soin Suivi hospitalier / Soin à domicile, au choix de l'admin *(depuis v1.5)*

---

## 10. Contacts & Ressources

- **Développeur** : HCS — Hybrid Consulting Systems (Guillaume Frey)
- **App existante (référence / base web)** : https://planning-visites-maman.vercel.app
- **GitHub** : https://github.com/EI-HCS-Consulting/Planning-Visites-Maman
- **Vercel** : https://vercel.com/ei-hcs-consultings-projects/planning-visites-maman
- **Supabase dashboard** : https://supabase.com/dashboard/project/flmslcdzjuifkivmzins
- **Supabase URL** : https://flmslcdzjuifkivmzins.supabase.co
- **Supabase anon key** : `.env` → `EXPO_PUBLIC_SUPABASE_ANON_KEY` (ne jamais committer)
- **Stripe** : clés `.env` (web uniquement) ; webhook → Edge Function d'activation
- **Code de référence** : `App.jsx`
- **Assets logo** : SVG du logo circulaire à fournir à Claude Code

---

## 10bis. RGPD & Cycle de vie des données

### Données collectées
- Visiteurs/Intervenants : prénom, nom, téléphone (optionnel), email (optionnel, depuis v1.4), PIN, photos volontaires, textes (nouvelles, soutien), et pour les intervenants leurs types d'intervention (§3.9)
- Admin : email, notes libres, PIN secondaire de reconfirmation
- ⚠️ **Donnée de santé structurée depuis v1.4** : la **fiche médicale du patient** (date de naissance, sexe, groupe sanguin, allergies — §3.10), renseignée par l'admin et consultable en lecture seule par les visiteurs/intervenants. Le PRD v1.4 partait du principe d'une absence de donnée de santé structurée pour écarter l'hébergement HDS (voir Hébergement ci-dessous) — **ce principe ne tient plus en l'état et doit être réévalué**.
- Seul autre vecteur potentiel de données sensibles : le champ libre `admin_notes` → avertissement UI explicite *« N'indiquez pas d'informations médicales sensibles. »*

### Hébergement
- Supabase **région UE**. Le PRD v1.4 excluait l'obligation d'hébergement HDS tant qu'aucune donnée de santé n'était traitée à titre médical ; **la fiche médicale patient (§3.10) introduit une donnée de santé structurée** — à faire trancher par un conseil juridique/CPI avant toute communication commerciale sur ce point, indépendamment d'une évolution B2B hospitalière.

### Purge automatique
- **Règle actuelle : `purge_scheduled_at = max(end_date, last_activity_at) + 30 jours`** (ramenée de 90 à 30 jours depuis v1.4)
- `last_activity_at` rafraîchi à chaque réservation/nouvelle/upload/modification
- **Job quotidien** (Edge Function) : si `purge_scheduled_at` dépassée → suppression en cascade (`reservations`, `souvenirs` + fichiers Storage, `news` + photos, `tasks`, `support_messages`, fiches `intervenants`, photo patient et fiche médicale, puis l'espace)
- **Alerte email J-7** à l'admin avec lien pour **prolonger de 30 jours (renouvelable gratuitement)** ou **purger immédiatement**
- L'admin peut **fermer/purger manuellement** depuis les paramètres

### Bénéfices
- Maîtrise du coût serveur (un paiement unique ne finance pas un stockage à vie)
- Conformité RGPD (minimisation + effacement automatisé)
- Réassurance : *« vos données sont supprimées après le séjour »* — argument de confiance

### Droits des personnes
- Consentement à l'inscription (prénom + nom visibles des autres visiteurs)
- Suppression sur demande (visiteur via PIN ; admin pour l'espace)
- Mentions légales + politique de confidentialité à publier avant mise en ligne Play Store
