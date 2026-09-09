# Arborescence complète des Checklists suggérées

Ce document recense l'intégralité du contenu des checklists administratives suggérées de l'app AvecToi : les 11 checklists, leurs phases, leurs items, et les modèles de courrier associés.

**Sources code** (à tenir à jour si le contenu évolue) :
- `lib/checklistTemplates.ts` — définition des 11 checklists (items, liens, pièces, récurrence)
- `lib/letterTemplates.ts` — modèles de courriers/documents rattachés à certains items
- Utilisées dans `components/Entraide.tsx` (outil admin + sélecteur repliable dans "Nouveau besoin") et `components/MyChecklist.tsx` ("Ma Checklist" / Mon Compte, import personnel)

## Comment lire ce document

Pour chaque item de checklist :
- **Visible visiteur** ✅ : l'item est visible et ajoutable par un visiteur (non-admin). ❌ = réservé à l'admin (démarches légales/financières/employeur).
- **🔴 Urgent** : l'item est marqué urgent par défaut à la publication.
- **⏱ Délai** : une date limite est préremplie automatiquement (nombre de jours après aujourd'hui).
- **📎 Pièces à réunir** : documents à rassembler avant d'entamer la démarche (informatif, pas de stockage dans l'app).
- **🔗 Lien officiel** : lien vers un site officiel (jamais commercial).
- **🔁 Récurrent** : le rappel peut être proposé en version mensuelle récurrente.
- **✉️ Courrier disponible** : un modèle de courrier/document préremplissable existe dans l'app pour cet item (voir section [Modèles de courriers et documents](#modèles-de-courriers-et-documents-à-remplir) en bas de page).
- **(Ma Checklist uniquement)** : checklist tournée vers les démarches personnelles de l'aidant, non proposée dans le sélecteur "Nouveau besoin" d'Entraide (mais disponible en import dans "Ma Checklist").

---

## 1. 🏥 Hospitalisation d'un proche

### À l'arrivée
- **Directives anticipées** ✅ — Vérifier si le patient en a rédigé, et où elles se trouvent.
- **Personne de confiance** ✅ — Faire signer le formulaire si pas déjà fait (2 témoins conseillés).
- **Carte Vitale + attestation mutuelle** ✅ — À apporter dès que possible si admission en urgence.
- **Liste des traitements en cours** ✅ — Ordonnances actives, à donner au service.

### Pendant le séjour
- **Attestation d'hospitalisation (employeur)** ✅ — À demander au service pour justifier une absence.
- **Congé proche aidant / AJPA** ❌ 🔴 Urgent — Démarche CAF ou MSA — délai à anticiper.
- **Procuration bancaire** ❌ — Si le patient ne peut plus gérer ses comptes (factures, loyer). ✉️ Courrier disponible.
- **Déclaration de sinistre assurance** ❌ 🔴 Urgent — ⏱ Délai préempli : +5 jours (délai généralement de 5 jours ouvrés). ✉️ Courrier disponible.
- **Prévenir l'employeur du patient** ✅ — Si en poste. ✉️ Courrier disponible.

### Sortie
- **Compte-rendu d'hospitalisation** ✅ — À transmettre au médecin traitant.
- **Dossier MDPH** ❌ — Si perte d'autonomie durable.
- **Déclaration d'impôts** ❌ — Vérifier un report de délai si la période chevauche la campagne déclarative.
- **Organiser le retour à domicile** ✅ — Aide à la personne, matériel médical, RDV de suivi.

---

## 2. 🧸 Enfant hospitalisé

### Documents
- **Carnet de santé + carte Vitale de l'enfant** ✅
- **Autorisation de soins** ❌ — Signée par le(s) titulaire(s) de l'autorité parentale. ✉️ Courrier disponible.
- **Attestation d'autorité parentale / jugement de garde** ❌ — Si parents séparés et service non informé. ✉️ Courrier disponible.
- **Certificat médical pour l'école** ✅ — Justificatif d'absence.
- **PAI (Projet d'Accueil Individualisé)** ✅ — À établir ou réactiver avec l'école si suivi au long cours.
- **Assurance scolaire / extra-scolaire** ✅ — Vérifier la couverture si accident.

### Organisation famille
- **Garde de la fratrie** ✅ — Qui s'en occupe pendant les visites.
- **Doudou / objet familier** ✅ — Le premier réflexe anti-angoisse.
- **Préparer l'enfant à l'avance** ✅ — Si l'admission n'est pas une urgence, en parler quelques jours avant.
- **Prévenir l'école / la crèche** ✅ ✉️ Courrier disponible.

---

## 3. 🏠 Soin à domicile

### Mise en place
- **Déclaration à la mutuelle / CPAM** ❌ — Prise en charge des soins à domicile. ✉️ Courrier disponible.
- **Commande de matériel médical** ✅ — Lit, fauteuil, oxygène selon prescription.
- **Aménagement du logement** ✅ — Barres d'appui, rampe, douche adaptée si besoin.
- **Planning des intervenants** ✅ — Infirmier·ère, kiné, aide à domicile.
- **Congé proche aidant / AJPA** ❌ 🔴 Urgent — Même démarche qu'en hospitalisation si tu es l'aidant principal.
- **Procuration bancaire** ❌ — Si la personne ne peut plus gérer ses comptes. ✉️ Courrier disponible.

---

## 4. 🔎 Faire le point sur les besoins actuels

### À la maison
- **Faire les courses** ✅ *(catégorie : courses)*
- **Préparer des repas pour plusieurs jours** ✅ *(catégorie : repas)*
- **Aider pour le ménage** ✅ *(catégorie : affaires)*
- **Faire le linge** ✅ *(catégorie : affaires)*

### Organisation
- **Prendre ou confirmer un rendez-vous** ✅ *(catégorie : administratif)* — 📝 popup de précision demandé à l'ajout.
- **Accompagner à un rendez-vous** ✅ *(catégorie : transport)* — 📝 popup de précision demandé à l'ajout.
- **Faire une démarche administrative** ✅ *(catégorie : administratif)* — 📝 popup de précision demandé à l'ajout.
- **Passer un appel pour le compte du proche** ✅ *(catégorie : administratif)* — 📝 popup de précision demandé à l'ajout.
- **Organiser une présence pendant une période d'indisponibilité** ✅ *(catégorie : autre)* — Quand l'aidant habituel ne peut pas être là.

### Pour l'aidant
- **Permettre à l'aidant de souffler quelques heures** ✅ *(catégorie : autre)*
- **Prendre le relais sur une journée complète** ✅ *(catégorie : autre)*
- **Rechercher une solution de répit** ✅ *(catégorie : autre)* — Accueil de jour, hébergement temporaire, relais à domicile.

---

## 5. 🏥 Préparer un retour à domicile

### Avant le retour
- **Vérifier que le transport retour est organisé** ✅ *(catégorie : transport)*
- **Faire les courses avant l'arrivée** ✅ *(catégorie : courses)*
- **Vérifier que le logement est prêt** ✅ *(catégorie : affaires)*
- **Prévoir une présence le jour du retour** ✅ *(catégorie : autre)*

### Les premiers jours
- **Prévoir une présence les premiers jours** ✅ *(catégorie : autre)*
- **Identifier les prochains rendez-vous de suivi** ✅ *(catégorie : administratif)*
- **Vérifier qui peut accompagner à ces rendez-vous** ✅ *(catégorie : transport)*
- **Vérifier si une aide extérieure est nécessaire** ❌ *(catégorie : administratif)* — Aide à domicile, portage de repas, téléassistance.
  🔗 [Service-Public — Aides à domicile](https://www.service-public.gouv.fr/particuliers/vosdroits/F245)
- **Vérifier les aides mobilisables pour le retour à domicile** ❌ *(catégorie : administratif)* — Selon la situation, plusieurs dispositifs peuvent s'appliquer.
  🔗 [Service-Public — Aides aux personnes âgées](https://www.service-public.gouv.fr/particuliers/vosdroits/N392)

---

## 6. 🤝 Organiser les relais familiaux

### Comprendre le besoin
- **Identifier ce que l'aidant principal assure au quotidien** ✅ *(catégorie : autre)*
- **Identifier les moments où un relais est nécessaire** ✅ *(catégorie : autre)*

### Organiser
- **Prévoir une présence ponctuelle (quelques heures)** ✅ *(catégorie : autre)*
- **Prévoir un relais sur une journée complète** ✅ *(catégorie : autre)*
- **Vérifier qui peut remplacer l'aidant en cas d'imprévu** ✅ *(catégorie : autre)*
- **Définir un contact à joindre en cas d'urgence** ✅ *(catégorie : administratif)*

---

## 7. 😮‍💨 Organiser du répit pour l'aidant *(Ma Checklist uniquement)*

### Identifier le besoin
- **Identifier les moments où l'aidant a besoin d'être remplacé** ✅ *(catégorie : autre)*
- **Publier un besoin de relais ponctuel (Mon compte)** ✅ *(catégorie : autre)*

### Chercher une solution
- **Repérer une solution d'accueil de jour ou temporaire** ❌ *(catégorie : administratif)*
  🔗 [CNSA — Solutions d'accueil de jour et hébergement temporaire](https://www.pour-les-personnes-agees.gouv.fr/vivre-a-domicile/solutions-d-accueil-temporaire)
- **Vérifier si mon proche bénéficie de l'APA** ❌ *(catégorie : administratif)* — L'APA peut, selon la situation, comporter une part dédiée au répit de l'aidant.
  🔗 [Service-Public — APA](https://www.service-public.gouv.fr/particuliers/vosdroits/F10009)
- **Vérifier si le droit au répit peut être mobilisé** ❌ *(catégorie : administratif)*
  🔗 [CNSA — Aide au répit dans le cadre de l'APA](https://www.pour-les-personnes-agees.gouv.fr/solutions-pour-les-aidants/soutien-financier/l-aide-au-repit-dans-le-cadre-de-l-apa)
- **Noter la démarche à effectuer et me fixer un rappel** ❌ *(catégorie : administratif)*

---

## 8. 💼 Activer mon congé proche aidant + AJPA *(Ma Checklist uniquement)*

### Vérifier mon éligibilité
- **Vérifier que je remplis les conditions d'éligibilité** ❌ 🔴 Urgent *(catégorie : administratif)*
  🔗 [Service-Public — Congé de proche aidant](https://www.service-public.gouv.fr/particuliers/vosdroits/F16920)
- **Vérifier mon ancienneté si je suis salarié** ❌ *(catégorie : administratif)*

### Préparer ma demande
- **Identifier le justificatif de la situation de mon proche** ❌ *(catégorie : administratif)* — Perte d'autonomie ou handicap.
  📎 Pièces à réunir : Justificatif de perte d'autonomie ou de handicap du proche aidé
- **Choisir la forme du congé : continu, fractionné ou à temps partiel** ❌ *(catégorie : administratif)*
- **Définir la date de début souhaitée** ❌ *(catégorie : administratif)*
- **Préparer ma demande à l'employeur** ❌ *(catégorie : administratif)*
  📎 Pièces à réunir : Lettre ou formulaire de demande de congé
  ✉️ **Courrier disponible : « Lettre à l'employeur — Congé de proche aidant »**
- **Envoyer la demande à l'employeur et conserver la preuve d'envoi** ❌ *(catégorie : administratif)*

### Faire la démarche AJPA
- **Rassembler le justificatif du lien avec mon proche** ❌ *(catégorie : administratif)*
  📎 Pièces à réunir : Justificatif du lien familial ou de la vie commune
- **Faire la demande AJPA auprès de la CAF ou de la MSA** ❌ 🔴 Urgent *(catégorie : administratif)* — Selon votre régime.
  📎 Pièces à réunir : Justificatif de perte d'autonomie du proche, Attestation de l'employeur si salarié, RIB
  🔗 [Service-Public — Demande AJPA](https://www.service-public.gouv.fr/particuliers/vosdroits/R57305)

### Suivi
- **Déclarer chaque mois les jours effectivement consacrés à l'aide** ❌ 🔁 Récurrent mensuel *(catégorie : administratif)*
  🔗 [CAF — Espace personnel](https://www.caf.fr/allocataires/mon-compte)
- **Suivre le nombre de jours AJPA déjà utilisés** ❌ *(catégorie : administratif)*
- **Préparer mon retour à l'emploi** ❌ *(catégorie : administratif)*

---

## 9. 🏠 Faire le point sur le maintien à domicile

### Organisation pratique
- **Planifier les intervenants à domicile** ✅ *(catégorie : administratif)* — Infirmier·ère, kiné, aide à domicile.
- **Vérifier si le logement nécessite des aménagements** ✅ *(catégorie : affaires)*
- **Organiser les courses et repas récurrents** ✅ *(catégorie : courses)*
- **Organiser l'entretien régulier du logement** ✅ *(catégorie : affaires)*

### Aides à vérifier
- **Vérifier si mon proche bénéficie de l'APA** ❌ *(catégorie : administratif)*
  🔗 [Service-Public — APA](https://www.service-public.gouv.fr/particuliers/vosdroits/F10009)
- **Vérifier les aides à l'adaptation du logement** ❌ *(catégorie : administratif)*
  🔗 [France Rénov' — MaPrimeAdapt'](https://france-renov.gouv.fr/aides/maprimeadapt)
- **Vérifier le crédit d'impôt pour les services à la personne** ❌ *(catégorie : administratif)*
  🔗 [impots.gouv.fr — Emploi à domicile](https://www.impots.gouv.fr/particulier/emploi-domicile)
- **Vérifier les aides de la caisse de retraite du proche** ❌ *(catégorie : administratif)*

---

## 10. ♿ Faire le point sur les démarches liées au handicap

### Constituer le dossier
- **Identifier les besoins actuels liés à la situation** ✅ *(catégorie : autre)*
- **Vérifier si une reconnaissance MDPH est déjà engagée** ❌ *(catégorie : administratif)*
  🔗 [Mon Parcours Handicap — Dépôt du dossier MDPH](https://www.monparcourshandicap.gouv.fr/aides/le-depot-du-dossier-et-le-traitement-de-la-demande-par-la-maison-departementale-des-personnes)
- **Rassembler les justificatifs pour le dossier MDPH** ❌ *(catégorie : administratif)*
  📎 Pièces à réunir : Certificat médical récent, Justificatif d'identité, Justificatif de domicile

### Aides à vérifier
- **Vérifier l'éligibilité à la PCH** ❌ *(catégorie : administratif)*
  🔗 [Service-Public — PCH](https://www.service-public.gouv.fr/particuliers/vosdroits/F14202)
- **Vérifier l'éligibilité à l'AAH si majeur** ❌ *(catégorie : administratif)*
  🔗 [Service-Public — AAH](https://www.service-public.gouv.fr/particuliers/vosdroits/F12242)
- **Vérifier les aides à l'adaptation du logement ou du véhicule** ❌ *(catégorie : administratif)*
  🔗 [France Rénov' — MaPrimeAdapt'](https://france-renov.gouv.fr/aides/maprimeadapt)
- **Identifier les associations locales spécialisées** ❌ *(catégorie : administratif)*

---

## 11. 🕊️ Organiser l'accompagnement de fin de vie

### Organisation familiale
- **Organiser une présence régulière auprès du proche** ✅ *(catégorie : autre)*
- **Coordonner les visites de la famille et des proches** ✅ *(catégorie : autre)*

### Démarches à anticiper
- **Vérifier si mon proche a rédigé des directives anticipées** ❌ *(catégorie : administratif)*
- **Identifier la personne de confiance désignée, si elle existe** ❌ *(catégorie : administratif)*
- **Se renseigner sur les dispositifs de soins palliatifs disponibles** ❌ *(catégorie : administratif)*
  🔗 [sante.fr — Vos droits en soins palliatifs](https://www.sante.fr/vos-droits-en-sante-les-soins-palliatifs)
- **Vérifier le congé de solidarité familiale si je suis salarié** ❌ 🔴 Urgent *(catégorie : administratif)*
  🔗 [code.travail.gouv.fr — Congé de solidarité familiale](https://code.travail.gouv.fr/fiche-service-public/conge-de-solidarite-familiale-dun-salarie)
- **Identifier un contact pour un accompagnement psychologique de la famille** ❌ *(catégorie : administratif)*

---

## Modèles de courriers et documents à remplir

Ces modèles apparaissent via le bouton **« ✉️ Préparer le courrier »** directement sur l'item de checklist concerné (dans "Ma Checklist"), jamais sur un écran séparé. Ce sont des modèles à adapter, pas des documents juridiques engageants — le contenu évite volontairement tout délai légal chiffré dans le corps du texte quand celui-ci varie selon la convention collective ou l'accord d'entreprise.

### 1. Lettre à l'employeur — Congé de proche aidant
- **Rattaché à l'item** : *Préparer ma demande à l'employeur* (checklist n°8, Activer mon congé proche aidant + AJPA)
- **Objet du courrier** : Demande de congé de proche aidant
- Champs à remplir : nom complet du salarié, adresse, nom/adresse de l'employeur, ville, nom du proche aidé, lien avec le proche, date de début souhaitée, durée souhaitée, forme du congé (optionnel)
- **Pièces à joindre à l'envoi** : Justificatif du lien avec la personne aidée (livret de famille…), justificatif de la situation de perte d'autonomie ou de handicap du proche (si demandé par l'employeur ou la convention collective)
- ⚠️ Vérifier le délai de prévenance à respecter (convention collective / accord d'entreprise) via le lien officiel de l'item.

### 2. Autorisation de soins — Enfant hospitalisé
- **Rattaché à l'item** : *Autorisation de soins* (checklist n°2, Enfant hospitalisé)
- **Objet du courrier** : Autorisation de soins
- Champs à remplir : nom du parent 1, lien avec l'enfant, nom du 2ᵉ titulaire de l'autorité parentale (optionnel), adresse du foyer, nom de l'enfant, date de naissance de l'enfant, établissement (hôpital/service), ville, téléphone d'urgence
- **Pièces à joindre** : Livret de famille ou acte de naissance de l'enfant, pièce(s) d'identité du/des parent(s) signataire(s), carnet de santé de l'enfant

### 3. Attestation sur l'honneur — Autorité parentale
- **Rattaché à l'item** : *Attestation d'autorité parentale / jugement de garde* (checklist n°2, Enfant hospitalisé)
- **Objet du courrier** : Attestation sur l'honneur d'exercice de l'autorité parentale
- Champs à remplir : nom du parent, lien avec l'enfant, nom de l'enfant, date de naissance, situation familiale, établissement destinataire, ville
- **Pièces à joindre** : Pièce d'identité du parent signataire, livret de famille ou acte de naissance de l'enfant, le cas échéant jugement ou convention de garde homologuée
- ⚠️ Ne remplace jamais un jugement de divorce ou une convention de garde homologuée — à utiliser uniquement si aucun jugement n'existe (parents non séparés ou séparés à l'amiable sans procédure).

### 4. Courrier à l'école / la crèche — Hospitalisation
- **Rattaché à l'item** : *Prévenir l'école / la crèche* (checklist n°2, Enfant hospitalisé)
- **Objet du courrier** : Absence pour hospitalisation
- Champs à remplir : nom du parent, nom de l'enfant, classe/groupe (optionnel), nom et adresse de l'établissement scolaire, date de début d'absence, date de retour prévue (optionnel), téléphone (optionnel), ville
- **Pièces à joindre** : Certificat médical ou attestation d'hospitalisation, si demandé par l'établissement

### 5. Déclaration à la mutuelle / CPAM — Soins à domicile
- **Rattaché à l'item** : *Déclaration à la mutuelle / CPAM* (checklist n°3, Soin à domicile)
- **Objet du courrier** : Prise en charge de soins à domicile
- Champs à remplir : nom de l'assuré, numéro de sécurité sociale, nom du bénéficiaire des soins si différent (optionnel), adresse, nom/adresse de la mutuelle ou caisse, motif des soins, ville
- **Pièces à joindre** : Prescription médicale des soins à domicile, carte Vitale / attestation de droits à jour, RIB (si remboursement direct demandé)

### 6. Procuration bancaire
- **Rattaché à l'item** : *Procuration bancaire* (checklists n°1 Hospitalisation d'un proche, et n°3 Soin à domicile)
- **Objet du courrier** : Demande de mise en place d'une procuration bancaire
- Champs à remplir : nom du titulaire du compte, nom du mandataire (futur signataire), lien avec le titulaire, nom/adresse de la banque, numéro de compte (optionnel), ville
- **Pièces à joindre** : Pièce d'identité du titulaire, pièce d'identité du mandataire, justificatif de domicile du titulaire, RIB du compte concerné
- ⚠️ Ce courrier sert à initier la démarche — la banque exige presque toujours la signature du titulaire sur son propre formulaire de procuration (en agence ou en ligne).

### 7. Courrier à l'employeur — Absence pour hospitalisation
- **Rattaché à l'item** : *Prévenir l'employeur du patient* (checklist n°1, Hospitalisation d'un proche)
- **Objet du courrier** : Absence pour hospitalisation
- Champs à remplir : nom complet du salarié hospitalisé, rédigé par (si différent du salarié — optionnel), adresse, nom/adresse de l'employeur, date de début d'absence, date de retour prévue (optionnel), ville
- **Pièces à joindre** : Arrêt de travail ou attestation d'hospitalisation, à transmettre dès réception

### 8. Déclaration de sinistre à l'assurance
- **Rattaché à l'item** : *Déclaration de sinistre assurance* (checklist n°1, Hospitalisation d'un proche)
- **Objet du courrier** : Déclaration de sinistre
- Champs à remplir : nom de l'assuré souscripteur, numéro de contrat (optionnel), nom/adresse de l'assureur, nom de la victime si différent de l'assuré (optionnel), date et lieu de l'accident, circonstances, ville
- **Pièces à joindre** : Certificat médical initial décrivant les blessures constatées, tout constat/rapport/témoignage relatif aux circonstances, justificatifs de frais déjà engagés le cas échéant
- ⚠️ Vérifier le délai légal de déclaration (généralement 5 jours ouvrés pour un accident) via le lien officiel de l'item, ainsi que le mode de déclaration privilégié par l'assureur (courrier, espace en ligne, application).

---

## Récapitulatif des liens officiels utilisés

| Site | Usage |
|---|---|
| [service-public.gouv.fr/particuliers/vosdroits/F245](https://www.service-public.gouv.fr/particuliers/vosdroits/F245) | Aides à domicile |
| [service-public.gouv.fr/particuliers/vosdroits/N392](https://www.service-public.gouv.fr/particuliers/vosdroits/N392) | Aides aux personnes âgées |
| [pour-les-personnes-agees.gouv.fr — accueil temporaire](https://www.pour-les-personnes-agees.gouv.fr/vivre-a-domicile/solutions-d-accueil-temporaire) | Solutions d'accueil de jour et hébergement temporaire (CNSA) |
| [service-public.gouv.fr/particuliers/vosdroits/F10009](https://www.service-public.gouv.fr/particuliers/vosdroits/F10009) | APA |
| [pour-les-personnes-agees.gouv.fr — aide au répit](https://www.pour-les-personnes-agees.gouv.fr/solutions-pour-les-aidants/soutien-financier/l-aide-au-repit-dans-le-cadre-de-l-apa) | Aide au répit dans le cadre de l'APA (CNSA) |
| [service-public.gouv.fr/particuliers/vosdroits/F16920](https://www.service-public.gouv.fr/particuliers/vosdroits/F16920) | Congé de proche aidant |
| [service-public.gouv.fr/particuliers/vosdroits/R57305](https://www.service-public.gouv.fr/particuliers/vosdroits/R57305) | Demande AJPA |
| [caf.fr/allocataires/mon-compte](https://www.caf.fr/allocataires/mon-compte) | Espace personnel CAF (déclaration mensuelle AJPA) |
| [france-renov.gouv.fr/aides/maprimeadapt](https://france-renov.gouv.fr/aides/maprimeadapt) | MaPrimeAdapt' — adaptation du logement |
| [impots.gouv.fr/particulier/emploi-domicile](https://www.impots.gouv.fr/particulier/emploi-domicile) | Crédit d'impôt emploi à domicile |
| [monparcourshandicap.gouv.fr — dossier MDPH](https://www.monparcourshandicap.gouv.fr/aides/le-depot-du-dossier-et-le-traitement-de-la-demande-par-la-maison-departementale-des-personnes) | Dépôt du dossier MDPH |
| [service-public.gouv.fr/particuliers/vosdroits/F14202](https://www.service-public.gouv.fr/particuliers/vosdroits/F14202) | PCH |
| [service-public.gouv.fr/particuliers/vosdroits/F12242](https://www.service-public.gouv.fr/particuliers/vosdroits/F12242) | AAH |
| [sante.fr — soins palliatifs](https://www.sante.fr/vos-droits-en-sante-les-soins-palliatifs) | Droits en soins palliatifs |
| [code.travail.gouv.fr — congé de solidarité familiale](https://code.travail.gouv.fr/fiche-service-public/conge-de-solidarite-familiale-dun-salarie) | Congé de solidarité familiale |

---

*Document généré le 2026-09-09 à partir de `lib/checklistTemplates.ts` et `lib/letterTemplates.ts`. À régénérer si le contenu des checklists ou des courriers évolue.*
