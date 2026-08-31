# PRD — AvecToi
## Product Requirements Document v1.19
*Préparé pour Claude Code — Juin 2026, synchronisé avec l'application livrée en Juillet/Août 2026*

> **Changelog v1.18 → v1.19**
> - **Murs Entraide/Soutien/Nouvelles : cadre orange non-lu + délai de perception** *(30/08/2026, PR #344)* : corrige l'absence de point rouge (onglets Nouvelles/Soutien) et de mise en avant visuelle des publications non lues à la connexion/navigation — les murs étant triés du plus récent au plus ancien, l'élément non lu le plus probable était déjà visible sans scroll à l'ouverture, marqué « vu » dans le même cycle de rendu que son premier affichage ; un délai d'environ 1,2s est désormais laissé avant tout marquage automatique déclenché par la seule présence à l'écran (un vrai scroll utilisateur reste marqué immédiatement) ; le fond pastel orange est remplacé par un cadre orange sur chaque publication non lue, plus lisible ; sur un besoin Urgent (déjà cerné de rouge), le cadre orange se superpose à l'intérieur du cadre rouge plutôt que de le remplacer — voir §4
> - Détail exhaustif écran par écran : `Documentation/Documentation Fonctionnalités.docx` (généré depuis le code, mis à jour à chaque handoff)

> **Changelog v1.17 → v1.18**
> - **Entraide/Nouvelles : droits d'édition admin restreints + lien Maps non prématuré** *(30/08/2026, PR #334)* : l'admin ne peut plus éditer un besoin ou une nouvelle qu'il n'a pas publié lui-même (la suppression reste possible via la modération douce) ; le lien Google Maps du besoin Transport ne se génère plus tant que rue/CP/ville ne sont pas tous saisis ; Mon Compte/Entraide ne montre plus en double un besoin publié ET auto-pris-en-charge — voir §5.9, §5.7, §5.11/§6.4
> - **Mon Compte : liens profonds précis vers réservation/besoin/nouvelle/message** *(30/08/2026, PR #334-336, #339)* : correction du bug racine empêchant un 2ᵉ clic (ou le clic sur un autre élément) depuis Mon Compte de rescroller/resurligner (les écrans restent montés dans les Tabs) ; atterrissage désormais précis avec sélection automatique de la catégorie et cadre rouge qui s'estompe en 1s côté Entraide — voir §5.9, §5.7, §5.10, §5.11/§6.4
> - **Entraide : date de publication, échéance et horaire Transport détaillé** *(30/08/2026, PR #335-337)* : date de publication et échéance affichées sous chaque besoin dans Mon Compte ; horaire Transport demandé (aller-retour compris) affiché en 3 lignes distinctes Demandé/heure/Retour — voir §5.9
> - **Mes réservations (visiteur) : popup sans re-demande de PIN** *(30/08/2026, PR #336)* : le popup d'une réservation saute directement à l'écran modifier/annuler/ajouter au calendrier pour un visiteur déjà connecté, sans redemander le PIN — voir §6.4
> - **Correction — « Prochaine disponibilité »** *(30/08/2026, PR #337)* : le calcul ignorait le flag INTERVENANT_ROLE_ENABLED (rôle retiré en V1) et laissait d'anciennes réservations « Intervention » bloquer à tort des créneaux de visite réellement libres — corrigé, propose désormais toujours le tout premier créneau réellement libre — voir §4
> - **Alerte de suppression admin en douceur + filtre « Mes besoins »** *(30/08/2026, PR #337-338)* : le visiteur reçoit une alerte à la connexion et un bandeau rouge dans Mon Compte/Entraide/Mes Nouvelles/Soutien quand l'admin a supprimé en douceur une de ses publications ; nouveau filtre « 👤 Mes besoins » sur le mur d'Entraide, combinable avec catégorie et Ouvert/Fermé, opérationnel aussi côté admin (correctif #338) — voir §5.9, §5.7, §5.10, §5.11/§6.4
> - **Mon Compte : popup réservation admin direct, vues Planifié/Historique** *(30/08/2026, PR #338-339)* : taper une réservation (admin) ouvre directement la modale Modifier/Annuler ; réservations et besoins entraide affichent deux vues « Planifié »/« À venir » (toujours visible) et « Historique » (repliée par défaut, dépliable) ; une réservation passée est verrouillée pour tous, y compris l'admin — voir §5.11/§6.4
> - **Entraide : « Publié par XXX » et tri affiné** *(30/08/2026, PR #339)* : chaque besoin affiche son auteur ; tri de « Planifié » par date de transport/échéance selon la catégorie, « Historique » antichronologique avec l'échéance en critère secondaire — voir §5.9
> - **Entraide : compteurs scopés au filtre, fermeture et réouverture automatiques affinées** *(30/08/2026, PR #340)* : les badges Ouvert/Fermé reflètent le filtre « Mes besoins »/catégorie actif ; un besoin pris en charge dont l'échéance est dépassée se ferme automatiquement même sans avoir été marqué « Fait » ; « ↩ Réouvrir » disparaît une fois l'échéance définitivement dépassée — voir §5.9
> - **Réservations : cascade accompagnant à l'édition** *(30/08/2026, PR #341)* : l'édition d'une réservation groupée (« Modifier aussi le créneau de X ») met désormais aussi à jour la réservation de l'accompagnant liée par group_id, jusque-là silencieusement divergente ; tout affichage « Avec X » vérifie désormais que les deux réservations partagent bien la même date/créneau — voir §6.4
> - **Alerte accompagnant sur déplacement de créneau** *(30/08/2026, PR #342)* : l'accompagnant dont le créneau est déplacé en cascade reçoit une alerte (connexion + Mes alertes) précisant qui a fait le changement, le nouveau jour/horaire, et confirmant qu'il reste avec cette personne — voir §5.11/§6.4
> - **Fond non-lu & points rouges sur les murs Entraide/Soutien/Nouvelles** *(30/08/2026, PR #342)* : mécanisme partagé (`lib/wallUnread.ts`) — fond pastel orange sur toute publication d'un autre auteur tant qu'elle n'a pas défilé dans la zone visible (pas à la simple ouverture de l'onglet), point rouge sur le pictogramme de la barre d'onglets tant qu'il en reste au moins une, bootstrap sur la 1ère connexion pour ne jamais faire ressurgir l'historique existant ; remplace l'ancien mécanisme à horodatage unique d'Entraide, étendu à Soutien et Nouvelles — voir §4, §3.3/§3.8
> - **⚠️ Migration manuelle à confirmer** *(PR #337)* : `supabase/migrations/20260830_deleted_content_seen.sql` (colonne `deleted_seen` sur `tasks`/`news_entries`/`support_messages`) — statut d'application non confirmé par l'utilisateur.
> - Détail exhaustif écran par écran : `Documentation/Documentation Fonctionnalités.docx` (généré depuis le code, mis à jour à chaque handoff)

> **Changelog v1.16 → v1.17**
> - **Entraide : correction du claim courses + surlignage produits récurrents** *(28/08/2026, PR #320)* : le bouton « Je m'en occupe » disparaît du besoin dès qu'une personne a coché au moins un article (même liste incomplète) ; le popup « 🔁 Produits récurrents » surligne un article déjà présent dans la liste en cours au lieu d'un simple toast — voir §5.9
> - **Entraide : refonte de la création d'un besoin en assistant « Publier »** *(28/08/2026, PR #321-328)* : l'ancien formulaire unique à défilement est remplacé, pour la création (pas l'édition), par une séquence de popups centrées chaînées catégorie par catégorie — écran dédié par catégorie (Repas/Administratif/Autre, Courses avec accès direct aux Produits récurrents, Transport en 4 écrans Départ/Arrivée → type de trajet → calendrier → horaires), puis un écran commun « Autres options » (photo, échéance, urgent, prise en charge immédiate) avant Publier — voir §5.9
> - **Entraide/Transport : lien Google Maps bidirectionnel** *(29/08/2026, PR #329)* : l'étape Départ/Arrivée du besoin Transport propose un champ « 🗺️ Lien Google Maps » qui se remplit automatiquement dans les deux sens (lien collé → adresse/CP/ville/pays, adresse tapée → lien généré) — voir §5.9
> - **Entraide/Transport : propositions étendues au bénéficiaire + réponse au proposant** *(29/08/2026, PR #330)* : la personne pour qui le besoin a été publié (pas seulement l'auteur) peut consulter et valider les propositions reçues ; un appui long ouvre un menu Accepter/Répondre, avec la réponse visible sur la proposition et une alerte pour le proposant — voir §5.9
> - **Entraide/Transport : propositions visibles par tous** *(29/08/2026, PR #331)* : la liste des propositions reçues est désormais consultable par tout visiteur, les boutons de validation/réponse/« Aucune ne convient » restant réservés aux personnes habilitées — voir §5.9
> - **Entraide/Transport : droits de validation restreints** *(30/08/2026, PR #332)* : seuls l'auteur du besoin, la personne pour qui il a été publié, ou l'admin lorsqu'il en est lui-même l'auteur, peuvent valider une proposition d'horaire ou décliner l'ensemble des propositions (« Aucune ne convient ») — un admin non concerné perd ce bouton, et l'auteur ne peut plus proposer un horaire sur son propre besoin — voir §5.9
> - **Entraide/Transport : propositions déclinées conservées, avec confirmation** *(30/08/2026, PR #332)* : « Aucune ne convient » affiche désormais un popup de confirmation avant d'agir ; les propositions déclinées ne sont plus supprimées mais restent visibles avec un tag « ❌ Déclinée » — voir §5.9
> - **Entraide/Transport : lien Google Maps toujours complet** *(30/08/2026, PR #332)* : le lien Google Maps du domicile est recalculé à l'enregistrement pour inclure systématiquement le code postal et la ville, évitant les destinations ambiguës — un lien collé manuellement n'est jamais écrasé — voir §5.9
> - **Entraide/Transport : tri chronologique affiné et blocage d'un créneau passé** *(30/08/2026, PR #332)* : le classement des besoins Transport tient compte de l'horaire du premier trajet (aller) en cas d'égalité de date ; un besoin Transport ne peut plus être créé avec une date et un horaire d'aller déjà passés le jour même — voir §5.9
> - Détail exhaustif écran par écran : `Documentation/Documentation Fonctionnalités.docx` (généré depuis le code, mis à jour à chaque handoff)

> **Changelog v1.15 → v1.16**
> - **Entraide : tri des besoins ouverts et regroupement des besoins fermés** *(27/08/2026, PR #310)* : les besoins ouverts sont triés Urgent en tête puis du plus proche au plus éloigné dans le temps ; un besoin pris en charge rejoint désormais les besoins fermés, répartis en « À venir » et « Historique » ; le tag Urgent (cadre rouge) se coche automatiquement si l'échéance tombe à J+2 ou moins — voir §5.9
> - **Entraide : cycle de vie des tags contextuels, corbeille fixe, date de publication** *(28/08/2026, PR #315)* : le tag Urgent et son cadre rouge disparaissent dès que le besoin n'est plus ouvert ; le bouton « ✓ C'est fait » (transport) disparaît une fois déjà affiché comme « Fait » ; un besoin fermé et passé ne peut plus être supprimé ni désinscrit par son auteur ; l'icône de suppression est déplacée en face du titre (position fixe) ; une ligne « 🗓️ Publié le … » est ajoutée à chaque besoin — voir §5.9
> - **Accueil : tri chronologique des visites planifiées** *(28/08/2026, PR #316, corrigé #318)* : le bloc « Autres visites planifiées » (visites à venir) est trié de la plus proche à la plus éloignée dans le temps ; son pendant « Autres visites réalisées » (passées) reste trié du plus récent au plus ancien — voir §5.2
> - **Entraide : catalogue de produits récurrents pour les listes de courses** *(28/08/2026, PR #317)* : la création d'une liste de courses passe par une popup dédiée ; un catalogue « 🔁 Produits récurrents » par espace se construit automatiquement au fil des articles saisis et permet de les rajouter en un tap — voir §5.9
> - **Corrections d'irritants remontés sur device** *(28/08/2026, PR #318)* : bouton « Valider » illisible corrigé, pastilles de notification de l'onglet Entraide recentrées à côté du pictogramme, croix de suppression rapide d'un article de liste de courses restreinte à l'auteur du besoin ou à l'admin — voir §3.3, §5.9
> - Détail exhaustif écran par écran : `Documentation/Documentation Fonctionnalités.docx` (généré depuis le code, mis à jour à chaque handoff)

> **Changelog v1.14 → v1.15**
> - **Suppression multiple d'un besoin par son propre auteur (visiteur)** *(28/08/2026, PR #311)* : un appui long sur un besoin publié par le visiteur lui-même permet désormais de sélectionner plusieurs de ses propres besoins pour les supprimer en masse — même mécanique que celle déjà réservée à l'admin, mais strictement limitée aux besoins dont ce visiteur est l'auteur — voir §2, §3.8
> - **Pictogramme Entraide de la barre d'onglets : badges de notification** *(28/08/2026, PR #311, corrigé #312, affiné #313)* : le pictogramme (admin et visiteur) affiche jusqu'à 2 points rouges empilés façon « : », l'icône elle-même conservant la couleur normale du thème — le point du haut signale un besoin Urgent non pris en charge, celui du bas un nouveau besoin publié par quelqu'un d'autre depuis la dernière visite de l'écran Entraide par ce viewer — voir §3.3, §3.8
> - Détail exhaustif écran par écran : `Documentation/Documentation Fonctionnalités.docx` (généré depuis le code, mis à jour à chaque handoff)

> **Changelog v1.13 → v1.14**
> - **Navigation post-claim relais** *(27/08/2026, PR #307)* : le bouton « J'ai compris » du popup de remerciement après une prise en charge de relais ramène désormais vers l'accueil au lieu de simplement fermer le popup — voir §3.8
> - **« 🔔 Mes alertes » : besoins déjà couverts déplacés en Historique** *(27/08/2026, PR #307)* : un besoin de relais où l'identité connectée a déjà posé une couverture (partielle ou totale) sort des alertes actives et apparaît désormais dans l'Historique, au lieu de continuer à solliciter une aide déjà donnée — voir §3.8, §5.11/§6.4
> - **« 🔔 Mes alertes » : marquage « vu » corrigé** *(27/08/2026, PR #308)* : la section Historique ne marque plus une entrée comme vue à la simple fermeture du popup (perte silencieuse d'alertes si le popup était ouvert pour un autre motif, ex. relais) — un bouton « Marquer comme lu » explicite par entrée est requis — voir §5.11/§6.4
> - **Correction — Photo de profil (Mon Compte visiteur)** *(27/08/2026, PR #308)* : si la photo locale mise en cache sur l'appareil ne charge plus (ex. perdue après un rebuild natif Dev Build), l'app retombe automatiquement sur la copie hébergée côté serveur déjà utilisée ailleurs dans l'app (liste des visiteurs, fiche visiteur), au lieu d'afficher un cadre vide — voir §6.4
> - Détail exhaustif écran par écran : `Documentation/Documentation Fonctionnalités.docx` (généré depuis le code, mis à jour à chaque handoff)

> **Changelog v1.12 → v1.13**
> - **Besoin de relais : planning et alertes** *(27/08/2026, PR #303)* : nouveau bouton « 🗓️ Je regarde mon planning » dans le popup d'alerte de relais, qui le ferme sans rien décider — le besoin reste ouvert, le popup revient à la prochaine connexion, et reste consultable à tout moment dans un nouveau bouton « 🔔 Mes alertes » (Mon Compte, admin **et** visiteur) qui centralise RGPD, besoins de relais ouverts et réservations recasées/annulées ; la liste des personnes sollicitées pour un besoin est visible dans le détail du popup dès que le ciblage n'est pas « tous les proches » — voir §2, §3.8, §5.11/§6.4
> - **Besoin de relais : répartition entre plusieurs preneurs** *(27/08/2026, PR #305)* : la prise en charge d'un besoin de relais peut désormais se répartir entre plusieurs personnes, chacune sur une sous-période distincte de la période demandée (« 🙋 Je m'en charge (ce qu'il reste) » ou « 📅 Choisir une période », en deux popups centrés successifs « Du »/« Au » où seuls les jours de la période demandée sont sélectionnables) ; la carte du besoin liste chaque contributeur avec sa période et l'éventuel reste à couvrir, chacun pouvant se désinscrire individuellement de sa propre sous-période ; nouveau bloc « 🤝 Mes engagements de relais » dans Mon Compte rappelant les sous-périodes prises — voir §3.8, §5.11/§6.4
> - **« 🔔 Mes alertes » : historique filtré aux entrées non vues** *(27/08/2026, PR #305)* : la section « Historique » ne montre plus tout l'historique permanent des changements de réservation, mais seulement les entrées jamais consultées, marquées vues à la fermeture du popup — « Mes réservations » continue d'afficher tout l'historique par réservation — voir §5.11/§6.4
> - Détail exhaustif écran par écran : `Documentation/Documentation Fonctionnalités.docx` (généré depuis le code, mis à jour à chaque handoff)

> **Changelog v1.11 → v1.12**
> - **Publication d'une checklist suggérée : choix de la destination** *(21/08/2026, PR #297)* : Mur d'Entraide seul, « Mes Checklists » seul, ou les deux en même temps — dans ce dernier cas les deux copies restent liées et se synchronisent automatiquement (statut « Fait », identité de qui s'en occupe) — voir §3.8
> - **Suppression d'un besoin par son auteur** *(21/08/2026, PR #297/#299)* : un visiteur (comme l'admin) peut désormais supprimer lui-même un besoin qu'il a publié sur le Mur d'Entraide, sans passer par l'admin — voir §2, §3.8
> - **Suppression en cascade des checklists publiées** *(21/08/2026, PR #296/#297)* : supprimer un ou plusieurs items d'une checklist suggérée publiée propose désormais de supprimer aussi le reste de la liste si d'autres items restent publiés et ouverts (suppression individuelle **et** en masse, Mon Compte **et** Entraide) ; si l'item supprimé était lié à une ligne de Mes Checklists, un second popup propose de la supprimer également — voir §3.8
> - **Import privé d'une checklist (Mon Compte) indépendant du Mur** *(21/08/2026, PR #295)* : un item déjà publié publiquement sur le Mur d'Entraide n'empêche plus de l'importer en privé dans Mes Checklists — l'anti-doublon public ne s'applique qu'en cochant « Publier aussi sur le Mur d'Entraide » — voir §3.8
> - **Traçabilité « Pas cette fois » (relais ponctuel)** *(21/08/2026, PR #295)* : la carte d'un besoin de relais affiche désormais, côté admin uniquement, la liste des personnes ayant décliné l'alerte — voir §3.8
> - Détail exhaustif écran par écran : `Documentation/Documentation Fonctionnalités.docx` (généré depuis le code, mis à jour à chaque handoff)

> **Changelog v1.10 → v1.11**
> - **Rôle Intervenant masqué en V1** *(21/08/2026, PR #291)* : le rôle reste défini dans ce PRD (§2, §3.9) comme référence produit pour une réintégration V2, mais n'est plus accessible nulle part dans l'application publiée (flag `INTERVENANT_ROLE_ENABLED` à `false`) — plus d'entrée « Je suis intervenant », plus de bascule d'activation admin, plus de « Planning des intervenants », plus de créneaux signalés/bloqués par une intervention. Code intact, archivé dans `Développement V2/` — voir §8, §10bis inchangés par ailleurs
> - **Masquage des dernières traces admin** *(21/08/2026, PR #292)* : bloc « Intervenants » et sous-bloc « Soins planifiés » retirés de Paramètres → Règles/Histo côté admin ; les soins d'intervenants n'apparaissent plus dans la Chronologie
> - **Calendrier Accueil unifié admin/visiteur** *(21/08/2026, PR #292)* : l'écran Accueil → Calendrier repose désormais sur un composant strictement commun aux deux rôles (§3.2, §3.3) — l'admin y perd la vue intervenants, le switch Visites/Soins et « Afficher mes créneaux » ; nouveau bouton « 📅 Créneaux » dans le Planning du jour pour réserver sans repasser par le calendrier ; email de confirmation désormais disponible par accompagnant, pas seulement pour le bénéficiaire principal (§3.4)
> - **Sémantique de sélection du calendrier inversée** *(21/08/2026, PR #293)* : l'onglet bas « Accueil » conserve désormais le jour/mois/semaine déjà sélectionnés d'une visite à l'autre ; seul le bandeau « 📅 Calendrier » réinitialise sur la date du jour — comportement inverse du cycle précédent (§3.3)
> - Détail exhaustif écran par écran : `Documentation/Documentation Fonctionnalités.docx` (généré depuis le code, mis à jour à chaque handoff)

> **Changelog v1.9 → v1.10**
> - **Réservations récurrentes** *(NOUVEAU)* : bouton « 🔁 Réservations récurrentes » dans Mon Compte → Mes réservations (admin **et** visiteur) — choix d'un ou plusieurs jours de semaine, d'un créneau et d'une plage de dates, création en série d'une réservation par date correspondante ; dates indisponibles ignorées et rapportées sans faire échouer le reste du lot — voir §3.4
> - **Popup dédié « Hospitalisation de [prénom] »** : la date d'hospitalisation ouvre désormais systématiquement (tap et appui long, Hebdo et Mensuel, admin et visiteur) un popup dédié (picto 🏥) au lieu du popup générique « 🚫 Jour non disponible » ; picto 🎉 anniversaire harmonisé sur les deux calendriers — voir §3.4
> - **Planning du jour (visiteur) enrichi** : message « Aucune visite prévue ce jour » cliquable, bouton « Ajouter une Visite » depuis le popup d'une visite existante, réservation directe en tapant le créneau libre d'un autre visiteur, affichage des places restantes — voir §3.3, §3.4
> - **Correction — Liste de courses** : la prise en charge tardive (« Je m'en occupe ») d'une liste de courses partiellement cochée ne coche plus automatiquement les articles restants et ne clôt plus le besoin (comportement introduit par erreur en v1.9, retiré) ; le verrouillage du cochage au preneur reste inchangé — voir §3.8
> - **Compte visiteur** : bloc « Besoin de relais » retiré (fonctionnalité réservée à l'admin) ; bouton « Intervenants » remplacé par « Visiteurs » (liste des visiteurs de l'espace + fiche au clic) ; nouveau champ « lien avec le patient » (picker) dans Mes informations — voir §2, §3.3, §3.8
> - **Compte admin** : boutons « 🩺 Fiche patient » et « 👥 Visiteurs » ajoutés sous « Mes checklists » — voir §2
> - Détail exhaustif écran par écran : `Documentation/Documentation Fonctionnalités.docx` (généré depuis le code, mis à jour à chaque handoff)

> **Changelog v1.8 → v1.9**
> - **Besoin de relais ponctuel** *(NOUVEAU)* : catégorie technique dédiée, non sélectionnable dans la grille de création manuelle — publiée uniquement depuis Mon Compte (période d'indisponibilité, message pré-rempli modifiable, ciblage tous les proches ou une sélection précise) ; alerte à la connexion des personnes ciblées (« Je m'en occupe » / « Pas cette fois ») — voir §3.8
> - **Liste de courses affinée** : cochage attribué (chaque article coché porte l'identité de qui l'a coché, non réversible par une autre personne), verrouillage complet au preneur en charge une fois « Je m'en occupe » cliqué, bloc du besoin affichant tous les contributeurs cumulés (« X, Y et Z s'en occupent », suffixe « … partiellement » si la liste n'est pas terminée), et complétion automatique des articles restants + fermeture du besoin si la prise en charge intervient sur une liste déjà partiellement cochée — voir §3.8
> - Détail exhaustif écran par écran : `Documentation/Documentation Fonctionnalités.docx` (généré depuis le code, mis à jour à chaque handoff)

> **Changelog v1.7 → v1.8**
> - **Entraide enrichie** : désengagement généralisé à toutes les catégories (« Me désengager », plus seulement Transport), bibliothèque de checklists suggérées passée à **11 modèles** dont deux réservés au proche aidant (« Congé proche aidant », « Répit aidant », visibles uniquement dans Mon Compte → Checklist personnelle), import via assistant séquentiel (échéance → urgence → précision) — voir §3.8
> - **Génération de courriers administratifs** *(NOUVEAU)* : certains items de checklist (demande employeur, autorisation de soins, attestation d'autorité parentale, courrier école/crèche, déclaration mutuelle/CPAM, procuration bancaire, absence pour hospitalisation d'un proche, déclaration de sinistre) produisent un document Word prêt à l'emploi, tracé dans un nouveau bouton « 📄 Mes documents » — voir §3.8
> - **Catégorie Courses devenue liste d'articles cochables** en temps réel par tout visiteur/admin, avec fermeture/réouverture automatique du besoin selon l'état de la liste — voir §3.8
> - **« Mes Souvenirs »** *(NOUVEAU)* : page personnelle listant les photos prises/partagées par l'utilisateur à travers tous ses espaces, avec sélection multiple et partage groupé — distincte de la Galerie Souvenirs par espace — voir §3.2, §3.3
> - Détail exhaustif écran par écran : `Documentation/Documentation Fonctionnalités.docx` (généré depuis le code, mis à jour à chaque handoff)

> **Changelog v1.6 → v1.7**
> - **Activation du rôle Intervenant verrouillée derrière Premium** : un espace Freemium peut désactiver « Planning des intervenants » sans condition, mais ne peut plus l'**activer** tant que l'espace n'est pas passé en Premium (contrôle absent en v1.6, corrigé) — voir §3.9, §3.12
> - **Site marketing `avectoi.care`** construit (accueil + 3 pages persona : Hospitalisation / Enfant hospitalisé / Soin à domicile), dans un projet Next.js séparé (`avectoi-site`, hors du repo de l'app) — pas encore déployé (hébergement Infomaniak à finaliser)

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
- **Peut activer le rôle Intervenant pour son espace** et gérer les fiches des professionnels de soin (§2 Intervenant, §3.9) — ⚠️ **rôle masqué dans l'app publiée depuis le 21/08/2026 (PR #291)**, bascule d'activation et écran dédié inaccessibles ; conservé ici comme référence produit pour une réintégration V2
- Reçoit un email automatique à chaque annulation
- **Prolonge ou déclenche la purge** de l'espace (§10bis — fenêtre 30 jours, renouvelable)
- **Accède depuis Mon Compte aux boutons « 🩺 Fiche patient » et « 👥 Visiteurs »** *(NOUVEAU depuis v1.10)* : la fiche patient et la liste des visiteurs de l'espace (fiche au clic)
- **« 🔔 Mes alertes »** *(NOUVEAU depuis v1.13)* : bouton à badge centralisant alerte RGPD, besoins de relais ouverts et réservations recasées/annulées ; l'historique n'y montre que les entrées jamais vues, marquées vues uniquement via un bouton « Marquer comme lu » explicite par entrée *(corrigé v1.14, plus à la fermeture du popup)* ; un besoin de relais déjà couvert par l'identité connectée sort des alertes actives et apparaît dans l'Historique à sa place *(NOUVEAU depuis v1.14)*. **« 🤝 Mes engagements de relais »** *(NOUVEAU depuis v1.13)* : bloc récapitulant les sous-périodes de relais réclamées, sous « Mes checklists »

### Visiteur (accès gratuit via lien d'invitation)
- Accède via lien unique, QR code ou code dossier (pas de compte requis)
- **Voit le planning complet** : qui vient à quel créneau
- Réserve un créneau disponible (dans la limite du **cap freemium** de 8 réservations de type Visite tant que l'espace n'est pas premium — §3.12)
- Saisit : **Prénom (obligatoire), Nom (obligatoire)**, Téléphone (optionnel)
  - *Nom obligatoire : permet aux autres visiteurs de savoir précisément qui vient.*
- **Indique son lien avec le patient** *(NOUVEAU depuis v1.10)* : champ picker dans Mon Compte → Mes informations (Père, Mère, Fils, Fille, Frère/Sœur, Beau-père/Belle-mère, Grand-père/Grand-mère, Petit-fils/Petite-fille, Beau-fils/Belle-fille, Cousin/Cousine, Oncle/Tante, Neveu/Nièce, Ami·e, Voisin·e, Collègue de travail, Autre) — visiteur uniquement, absent côté intervenant
- Choisit un PIN 4 chiffres (modif/annulation, photos, nouvelles, entraide)
- Modifie/annule sa réservation avec son PIN
- Consulte infos patient + hôpital (ou domicile) et la **fiche médicale du patient en lecture seule** (§3.10)
- Upload/télécharge des photos souvenirs ; **supprime ses propres photos** (PIN)
- **Publie une Nouvelle du jour** (texte + photos) ; modifie/supprime les siennes (PIN)
- **S'attribue un besoin d'entraide** (« Je m'en occupe ») ; **poste un message de soutien**. Le bloc de publication « 🆘 Besoin de relais » de Mon Compte est réservé à l'admin depuis v1.10 (retiré du compte visiteur, §3.8). **Supprime lui-même un besoin qu'il a publié** *(NOUVEAU depuis v1.12)*, sans passer par l'admin — **et peut, depuis v1.15, en sélectionner plusieurs par appui long pour les supprimer en masse**, strictement limité aux besoins dont il est l'auteur
- **Ouvre « 👥 Visiteurs »** *(remplace « Intervenants » depuis v1.10)* depuis Mon Compte : liste des visiteurs de l'espace, fiche au clic (lien avec le patient, phrase totem)
- **« 🔔 Mes alertes »** *(NOUVEAU depuis v1.13)* : bouton à badge centralisant besoins de relais ouverts le sollicitant et réservations recasées/annulées ; l'historique n'y montre que les entrées jamais vues, marquées vues uniquement via un bouton « Marquer comme lu » explicite par entrée *(corrigé v1.14, plus à la fermeture du popup)* ; un besoin de relais déjà couvert par l'identité connectée sort des alertes actives et apparaît dans l'Historique à sa place *(NOUVEAU depuis v1.14)*. **« 🤝 Mes engagements de relais »** *(NOUVEAU depuis v1.13)* : bloc récapitulant les sous-périodes de relais réclamées, sous « Mes checklists »
- **"Sélectionner tout" / "Télécharger tout"** dans la galerie
- Reçoit un rappel push 1h avant sa visite (si notifications acceptées)
- **Ajoute son créneau à son calendrier** (natif Android)
- Peut recevoir une **alerte de recasage** si sa réservation a été automatiquement déplacée ou annulée suite à un changement de règles ou à une intervention prioritaire (§3.11)

### Intervenant (accès gratuit, sous-mode du Visiteur) *(NOUVEAU depuis v1.4 — ⚠️ masqué en V1 depuis le 21/08/2026, PR #291)*
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

**Vue Calendrier** : calendrier mensuel (indicateurs dispo/partiel/complet) ; **bouton "⚡ Prochaine disponibilité"** ; **clic sur un jour → vue jour** (visiteurs + accès Nouvelles du jour) ; navigation mois. **Depuis le 21/08/2026 (PR #292), écran strictement commun avec le calendrier visiteur** (§3.3) — l'admin y perd le switch Visites/Soins et « Afficher mes créneaux » (spécifiques à l'ex-rôle Intervenant, masqué) ; nouveau bouton « 📅 Créneaux » dans le Planning du jour pour réserver directement.

**Vue Jour** : créneaux du jour (heure, inscrits/max, noms) ; ajouter/modifier/supprimer une résa ; bloc nuitée si activée ; **bouton "📰 Nouvelles du jour"** pour cette date.

**Gestion des invitations** : lien unique, QR code, code dossier (lisible à voix haute), WhatsApp, SMS, copier.

**Galerie Souvenirs (admin)** : upload (galerie/caméra), compression auto, grille anté-chronologique, lightbox, **"Sélectionner tout" / "Télécharger tout"**, légende optionnelle, **suppression de n'importe quelle photo** (sans PIN). **« Mes Souvenirs »** *(NOUVEAU depuis v1.8)* : page personnelle distincte, accessible depuis Mon Compte, listant les photos de l'utilisateur regroupées par espace à travers tous ses espaces liés au même téléphone — sélection multiple et partage groupé (au lieu d'un partage photo par photo).

**Entraide & Soutien (admin)** : crée/édite/supprime des besoins ; voit qui s'est attribué quoi ; modère le mur de soutien (voir §3.8).

**Planning des intervenants (admin)** *(NOUVEAU depuis v1.4 — ⚠️ masqué en V1 depuis le 21/08/2026, PR #291)* : écran dédié, non visible dans la barre d'onglets tant que le rôle Intervenant n'est pas activé — fiches des intervenants, planning journalier des interventions, ajout d'une intervention au nom d'un intervenant (voir §3.9). Bloc « Intervenants » et sous-bloc « Soins planifiés » également retirés de Paramètres → Règles/Histo (PR #292).

**Paramètres** : config espace, mode de soin (hospitalier/domicile), suspendre/réactiver nuitées, créneaux, mode d'affichage, photo patient, fiche médicale du patient, règles & notes, activation du rôle Intervenant, **gestion de la purge** (date prévue, prolonger, fermer/purger), support.

### 3.3 Interface Visiteur (et Intervenant, sous-mode — voir §3.9)

**Accès** : lien unique, QR code ou code dossier ; pas de compte ; **au 1er accès, consentement** (prénom + nom visibles des autres visiteurs). Entrée dédiée « Je suis intervenant », distincte de « Je rends visite », si le rôle Intervenant est activé sur l'espace.

**Onglets** :
- **Calendrier** : vue partagée ; "⚡ Prochaine disponibilité" ; clic jour → créneaux + accès Nouvelles du jour ; jour d'hospitalisation signalé par un popup dédié (picto 🏥) distinct du popup générique « Jour non disponible » *(NOUVEAU depuis v1.10, §3.4)*. **Depuis le 21/08/2026 (PR #292), composant strictement commun avec le calendrier admin** (§3.2). **Sélection du jour/vue** *(PR #293)* : l'onglet bas « Accueil » conserve le jour/mois/semaine déjà sélectionnés d'une visite à l'autre ; seul le bandeau « 📅 Calendrier » (accessible depuis Créneaux/Nuits/Infos/Partager) réinitialise sur la date du jour, tout mode confondu — sémantique inverse du cycle précédent
- **Créneaux** : liste du jour ; **noms (prénom + nom) visibles** (transparence assumée) ; "+ Réserver" ; "✏️ Modifier" (PIN) ; "📰 Nouvelles du jour" ; créneaux bloqués par une intervention signalés par un bandeau dédié
- **Planning du jour** *(enrichi depuis v1.10)* : message « Aucune visite prévue ce jour » cliquable (ouvre les créneaux) ; bouton « Ajouter une Visite » depuis le popup d'une visite existante ; taper le créneau libre d'un autre visiteur réserve directement une place ; places restantes affichées
- **Nouvelles du jour** (§3.7)
- **Entraide** (§3.8, 6 catégories)
- **Souvenirs** : voir/ uploader ; "Sélectionner tout" / "Télécharger tout" ; lightbox ; **suppression de ses propres photos** (PIN ; PIN de session si pas de résa)
- **Infos** : photo patient, nom, hôpital ou domicile, Google Maps, règles + notes libres, **fiche médicale du patient en lecture seule** (§3.10)
- **Partager** : QR code, code dossier, copier le lien, WhatsApp/SMS

### 3.4 Réservation (flux visiteur)
1. Sélection créneau
2. Modal : Prénom* / **Nom*** / Téléphone (optionnel) / **PIN 4 chiffres** (clavier intégré)
3. Confirmation : récap + affichage PIN (à noter) + **"📅 Ajouter à mon calendrier"** (Intent natif Android + fallback Google Calendar) + option notifications

**Confirmation par email accompagnant** *(NOUVEAU depuis v1.11, PR #292)* : le champ email de confirmation, jusque-là réservé au bénéficiaire principal, est désormais disponible pour chaque accompagnant ajouté à la réservation.

**Réservations récurrentes** *(NOUVEAU depuis v1.10)* : bouton « 🔁 Réservations récurrentes » dans Mon Compte → Mes réservations (admin et visiteur) — choix d'un ou plusieurs jours de semaine, d'un créneau et d'une plage de dates ; création en série d'une réservation par date correspondante, en réutilisant le format et les codes d'erreur d'une réservation classique ; les dates indisponibles sont ignorées et rapportées sans faire échouer le reste du lot.

**Popup jour d'hospitalisation** *(NOUVEAU depuis v1.10)* : toucher (tap ou appui long, Hebdo ou Mensuel) la date d'hospitalisation ouvre un popup dédié (picto 🏥, titre « Hospitalisation de [prénom] »), remplaçant le popup générique « 🚫 Jour non disponible » — appliqué admin et visiteur ; les autres jours bloqués gardent le popup générique.

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
- **Désengagement généralisé** *(NOUVEAU depuis v1.8)* : un besoin pris en charge peut être libéré par la personne qui l'a pris (« Me désengager », depuis « Modifier le besoin » ou par appui long sur sa carte), quelle que soit la catégorie — auparavant réservé à Transport
- **Besoin de relais ponctuel** *(NOUVEAU depuis v1.9)* : catégorie technique dédiée (🆘), non sélectionnable dans la grille de création manuelle — publiée uniquement depuis Mon Compte, **réservé à l'admin depuis v1.10** (le bloc a été retiré du compte visiteur, voir §2), avec période d'indisponibilité, message pré-rempli modifiable et ciblage de l'audience à la publication (tous les proches ou une sélection précise) ; alerte popup à la connexion des personnes ciblées, avec « Je m'en occupe » (ouvre directement la prise en charge), « Pas cette fois » (masque l'alerte sans fermer le besoin) ou **« 🗓️ Je regarde mon planning »** *(NOUVEAU depuis v1.13)* — ferme le popup sans rien décider, le besoin reste ouvert et l'alerte revient à la prochaine connexion, consultable entre-temps dans « 🔔 Mes alertes » (§5.11/§6.4) ; la liste des personnes sollicitées est visible dans le détail du popup dès que le ciblage n'est pas « tous les proches ». L'onglet « SOS Relais » du filtre par catégorie n'apparaît que s'il existe un besoin relais visible pour la personne connectée. **Traçabilité des refus** *(NOUVEAU depuis v1.12)* : la carte du besoin affiche, côté admin uniquement, la liste des personnes ayant répondu « Pas cette fois ». **Répartition entre plusieurs preneurs** *(NOUVEAU depuis v1.13)* : la prise en charge se fait « 🙋 Je m'en charge (ce qu'il reste) » ou « 📅 Choisir une période » (deux popups centrés successifs « Du »/« Au », seuls les jours de la période demandée par l'admin sélectionnables et surlignés en orange) — plusieurs personnes peuvent ainsi couvrir chacune une sous-période distincte ; la carte liste chaque contributeur avec sa période et l'éventuel reste à couvrir, avec désinscription individuelle par sous-période ; le popup de remerciement affiche, pour cette catégorie uniquement, un message dédié informant que les autres personnes sollicitées seront prévenues, et son bouton « J'ai compris » ramène désormais vers l'accueil au lieu de simplement se fermer *(corrigé v1.14)*. Une fois qu'une identité a posé une couverture (même partielle) sur un besoin, celui-ci sort de ses alertes actives et bascule dans l'Historique de « 🔔 Mes alertes » plutôt que de continuer à la solliciter *(NOUVEAU depuis v1.14)*
- Catégorie **Courses devenue liste d'articles** *(NOUVEAU depuis v1.8, affiné en v1.9, corrigé en v1.10)* : articles ajoutés un par un à la création, cochables en temps réel par tout visiteur ou admin via « 👁️ Aperçu de la liste » tant que personne n'a pris le besoin en charge (dispatch libre). Chaque article coché porte l'identité de qui l'a coché et ne peut être décoché que par cette même personne. Le bloc du besoin cumule tous les contributeurs (« X s'en occupe » / « X, Y et Z s'en occupent », suffixe « … partiellement » tant que la liste n'est pas intégralement cochée). Cliquer « Je m'en occupe » verrouille le cochage au preneur, **sans cochage automatique** (le comportement introduit en v1.9, qui cochait les articles restants et clôturait le besoin automatiquement, a été retiré en v1.10). Cocher le dernier article (toujours à la main) ferme le besoin, décocher un article après coup le rouvre
- Catégorie **Administratif** : checklists suggérées prêtes à publier en bloc — **bibliothèque passée à 11 modèles depuis v1.8** (bibliothèque complète pour l'admin, sous-ensemble marqué partageable pour les visiteurs/intervenants), dont **deux modèles réservés au proche aidant** (« Congé proche aidant », « Répit aidant »), visibles uniquement dans Mon Compte → Checklist personnelle ; import via un **assistant séquentiel** *(NOUVEAU depuis v1.8)* demandant échéance → urgence → précision libre item par item. **Choix de la destination de publication** *(NOUVEAU depuis v1.12)* : Mur d'Entraide seul, « Mes Checklists » seul, ou les deux à la fois — les deux copies restent alors liées et se synchronisent automatiquement (statut « Fait », identité de qui s'en occupe). Import privé depuis Mon Compte indépendant du Mur *(v1.12)* : un item déjà publié publiquement ne bloque plus son import en privé, l'anti-doublon public ne s'appliquant qu'en cochant « Publier aussi sur le Mur d'Entraide »
- **Génération de courriers administratifs** *(NOUVEAU depuis v1.8)* : certains items de checklist (demande employeur, autorisation de soins pour un enfant, attestation d'autorité parentale, courrier école/crèche, déclaration mutuelle/CPAM, procuration bancaire, absence pour hospitalisation d'un proche, déclaration de sinistre) affichent un bouton « ✉️ Préparer le courrier » : popup de remplissage des champs obligatoires, aperçu fidèle à une lettre administrative réelle, export Word (.doc) ou partage par email. Chaque courrier généré est tracé dans un nouveau bouton « 📄 Mes documents » (modifiable, supprimable, retéléchargeable), qui liste aussi les listes de courses associées à un besoin Courses
- Catégorie **Transport** *(NOUVEAU depuis v1.4 — revient sur l'exclusion initiale)* : dates/heures aller-retour, adresses, proposition d'horaire par la personne qui prend en charge
- L'admin dispose d'opérations groupées (sélection multiple, suppression en masse) sur **tout** besoin ; les besoins qu'il prend en charge personnellement apparaissent dans une section dédiée de Mon Compte, distincte de ceux qu'il publie
- **Suppression par l'auteur** *(NOUVEAU depuis v1.12)* : au-delà de l'admin (tout besoin), l'auteur d'un besoin — visiteur inclus — peut désormais le supprimer lui-même. Suppression en cascade : si d'autres items de la même checklist suggérée restent publiés et ouverts, une confirmation propose de les supprimer aussi (suppression individuelle **et** en masse, Mon Compte **et** Entraide) ; si l'item supprimé était lié à une ligne de Mes Checklists, un second popup propose de la supprimer également
- **Sélection multiple visiteur, limitée à ses propres besoins** *(NOUVEAU depuis v1.15, PR #311)* : un appui long sur un besoin publié par le visiteur lui-même ouvre le même mode de sélection multiple que l'admin, mais restreint aux besoins dont ce visiteur est l'auteur — impossible de sélectionner un besoin publié par quelqu'un d'autre
- **Badges du pictogramme Entraide (barre d'onglets)** *(NOUVEAU depuis v1.15, PR #311, corrigé #312, affiné #313)* : le pictogramme (admin et visiteur) reste de la couleur normale du thème et affiche jusqu'à 2 points rouges empilés façon « : » — le point du haut apparaît s'il existe un besoin Urgent non pris en charge (statut « ouvert »), le point du bas apparaît si quelqu'un d'autre que le viewer a publié un besoin depuis la dernière visite de l'écran Entraide par ce même viewer (suivi par appareil, indépendant entre admin et chaque identité visiteur)

**Mur de soutien**
- Messages courts d'encouragement pour le patient / la famille
- Affichage anté-chronologique
- Distinct des Nouvelles du jour (qui sont des comptes-rendus de visite)

### 3.9 Rôle Intervenant *(NOUVEAU depuis v1.4)*

⚠️ **Section entière masquée dans l'app publiée depuis le 21/08/2026 (PR #291)** : rôle retiré derrière le flag `INTERVENANT_ROLE_ENABLED` (à `false`), plus aucune entrée « Je suis intervenant », bascule d'activation, écran « Planning des intervenants » ni créneau signalé/bloqué par une intervention. Section conservée telle quelle ci-dessous comme référence fonctionnelle pour une réintégration V2 (code archivé dans `Développement V2/`).

Réservé aux professionnels de soin (infirmier·ère, kiné, aide à domicile…), désactivé par défaut sur chaque espace.

- **Activation** : l'admin bascule « Planning des intervenants » dans Paramètres → Règles ; tant que non activé, aucune entrée « Je suis intervenant » n'apparaît côté visiteurs. **Réservé aux espaces Premium depuis v1.7** — un espace Freemium peut désactiver le rôle sans condition, mais pas l'activer (voir §3.12) ; les intervenants eux-mêmes ne paient jamais rien, c'est l'admin de l'espace qui doit passer en Premium
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
- Le partage de l'espace (lien d'invitation, QR code, code dossier) n'est **pas** limité par le cap — disponible dès la Freemium
- **Rôle Intervenant réservé au Premium** *(NOUVEAU depuis v1.7)* : activer « Planning des intervenants » (§3.9) exige un espace Premium ; la désactivation reste toujours possible sans condition. Message neutre affiché si l'admin d'un espace Freemium tente d'activer, sans ton commercial appuyé (cohérent avec l'absence de bouton d'achat dans l'app, §3.1)
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
seen (boolean)                ← NOUVEAU depuis v1.13, pilote le filtrage de la section "Historique" du bouton "🔔 Mes alertes" (§3.8, §5.11/§6.4) ; passé à true uniquement via le bouton "Marquer comme lu" par entrée (corrigé v1.14, plus à la fermeture du popup) ; "Mes réservations" reste indépendant, affiche toujours tout l'historique
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

### Table `task_relais_coverage` — sous-périodes de relais réclamées *(NOUVEAU depuis v1.13, §3.8)*
Une ligne par sous-période réclamée sur un besoin `category="relais"` — remplace `claimed_by_*` de `tasks` pour cette catégorie, qui peut avoir plusieurs preneurs simultanés sur des sous-périodes distinctes.
```
id (uuid, PK)
task_id (uuid, FK → tasks, on delete cascade)
prenom (text)
nom (text)
pin (text)
start_date (date)
end_date (date)
full_period (boolean)         ← vrai si "Je m'en charge (ce qu'il reste)" a été choisi (informatif)
claimed_text (text, nullable)
claimed_photo (text, nullable)
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
