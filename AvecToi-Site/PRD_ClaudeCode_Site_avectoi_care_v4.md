# PRD — Site web `avectoi.care` (v4)
## Document destiné à Claude Code

**Produit :** AvecToi — coordination de visites hospitalières et de soins à domicile
**Dév :** HCS — Hybrid Consulting Systems (Guillaume Frey)
**Base :** `Documentation Fonctionnalités.docx` V1.25 (02/09/2026, merges PR#7-375 intégrés) — fait foi sur l'état réel de l'app
**Hébergement retenu :** Infomaniak (Suisse) — offre Node.js, **site unique de production**
**Date :** 2 septembre 2026 — v4 (remplace la v3 de ce document)
**Mise à jour additionnelle : 4 septembre 2026** (voir changelog "Mises à jour post-v4" ci-dessous — différenciation Freemium/Premium affinée après retours utilisateur sur le site déjà en ligne)

> **Mises à jour post-v4** (4 septembre 2026, site déjà en ligne — retours utilisateur sur le premier passage de contenu)
> - **Prix Premium : 5,99 € → 7,99 €** (one-shot, sans abonnement) — répercuté partout où le prix apparaît (§2, §3, §5.11).
> - **RGPD désormais différencié par plan** (auparavant identique aux deux) : **Freemium 30 jours** de purge (sans prolongation) / **Premium 60 jours + 30 jours de prolongation, renouvelable**. §3 et §5.10 mis à jour.
> - **Vue planning différenciée** (nouvelle ligne dans la matrice §3) : **Freemium limité à la vue Mensuelle** / **Premium débloque Hebdo + Mensuel**.
> - **Trois fonctionnalités basculées en exclusivité Premium** (auparavant non tranchées ou partagées) : option besoin **SOS** (Entraide), **Chronologie + téléchargement du livret d'hospitalisation**, **Documents types** (courrier école/crèche, lettre employeur...).
> - **Grille de fonctionnalités (§5.4) enrichie** de 8 tuiles supplémentaires reflétant des fonctionnalités déjà livrées côté app mais absentes du site : Planning Hebdo/Mensuel, Tri par visiteur, Checklists perso ou partagées, Modèles de documents, Espace Visiteurs, Règles de visite sur mesure, Historique des modifications, Livret d'hospitalisation.
> - Renommages de libellés pour plus de clarté visuelle : "Calendrier & créneaux" → **"Calendrier / créneaux"** ; "Mode clair/sombre" → **"Mode Dark / Light"**.
> - Détail complet de l'implémentation (commits, fichiers touchés) : `HANDOFF_SITE.md` §6.3.

> **Changelog v3 → v4** (session de cadrage du 02/09/2026, avant scaffold)
> - **§0 tranché** : le Partage (lien/QR/code dossier) est **confirmé libre dès la Freemium** par relecture du code (`components/ShareSpace.tsx`) — l'ancien verrou Premium a été retiré intentionnellement le 09/07 (commit `3c52cb1`) car il rendait l'essai gratuit inutilisable (impossible d'inviter qui que ce soit avant paiement). Section §0 supprimée, ex-option 1 devient la règle définitive.
> - **Cap Freemium mis à jour** : "8 réservations" → **essai 7 jours glissants** depuis la 1ère Visite (PR #374, `FREE_TRIAL_DAYS=7`), cap réservations retiré du code.
> - **⚠️ Planning des intervenants et Rattachement multi-espaces Intervenant retirés de l'argumentaire V1** : le rôle Intervenant a été **entièrement masqué dans l'app publiée depuis le 21/08** (PR #291, flag `INTERVENANT_ROLE_ENABLED=false` dans `lib/featureFlags.ts`, code intact mais archivé dans `Développement V2/`). Le site ne doit **rien vendre** de cette fonctionnalité tant que le flag est à `false` — décision explicite (02/09/2026) de ne pas la mentionner en V1 du site. Argumentaire Premium repositionné sur **Continuité (>7 jours d'essai) + Souvenir (Chronologie/export PDF à venir)** uniquement. Le contexte "Soin à domicile" (§5.2) est conservé mais recentré sur la coordination familiale, sans mention de fonctionnalité pro.
> - **§4 tranché** : 3 pages SEO dédiées (`/hospitalisation`, `/enfant-hospitalise`, `/soin-a-domicile`), pas d'ancres sur une page unique.
> - **§12.5 tranché** : le site portera un **dashboard web à parité complète** avec l'app dès le lancement (décision explicite, périmètre plus large que la version allégée initialement recommandée — impact sur §8 tâche 7 et sur la recette du funnel §8 tâche 11).
> - Ancien site Vercel historique : suppression **effectuée** (PR #375, 02/09/2026) — §10/§11 mis à jour en conséquence.
> - RGPD : la fenêtre de purge par défaut est passée de 90j à **60j + prolongation 30j** (PR #232, 17/08/2026) — §5.10 mis à jour.

> Ce PRD ne redéfinit pas le modèle économique (déjà figé) ni la stack app. Il spécifie uniquement le **site marketing + vente + gestion admin** `avectoi.care`, mis à jour avec les fonctionnalités réellement livrées dans l'app (source : documentation fonctionnelle), pas celles du PRD v1.4 qui sont dépassées sur plusieurs points.

---

## 1. Contraintes reader-app (rappel, non négociables)

- Le site est le **seul** endroit qui vend : prix, CTA d'achat, Stripe Checkout.
- L'app ne doit jamais être présentée sur le site comme ayant un bouton d'achat interne — au contraire, c'est un argument de confiance à afficher ("Aucun achat déguisé, aucune commission cachée").
- Wording validé à réutiliser (`PRD_AvecToi_v1_4.md` §13) : jamais "Débloquez" / "Offre limitée" ; toujours "Valider votre compte Administrateur", ton sobre, pas de countdown artificiel.

---

## 2. Stack & hébergement

| Brique | Choix |
|---|---|
| Framework | **Next.js** (App Router) |
| Hébergement | **Infomaniak — offre Node.js** (npm/yarn/SSH natif, Next.js supporté officiellement). Pas de Vercel. |
| Auth | Supabase Auth (email + mot de passe), partagé avec l'app |
| DB / Storage | Supabase (existant, projet `flmslcdzjuifkivmzins`) |
| Paiement | Stripe Checkout (mode `payment`, 7,99 € one-shot) |
| Webhook Stripe | Route API Next.js standard (`/api/stripe/webhook`) — **pas d'Edge Runtime façon Vercel**, Infomaniak exécute en Node classique : vérifier que la route tourne bien en runtime Node (`export const runtime = 'nodejs'` si applicable) |
| Emails | Resend, domaine `avectoi.care` (DNS SPF/DKIM à vérifier chez Infomaniak) |
| PDF | Non applicable pour l'instant côté web — l'export PDF "livret" est **backlog V2 côté app**, non construit (voir §6.7) |
| QR | Lib `qrcode` (web) |
| Déploiement | Git → build Next.js → déploiement sur l'hébergement Node Infomaniak (CI à définir : GitHub Actions + SSH/rsync, ou build local + upload) |

**Point d'attention Infomaniak vs Vercel :** pas de preview deployments automatiques par PR comme sur Vercel. Si tu veux garder ce confort (mentionné dans tes rulesets GitHub), il faudra soit brancher une CI qui déploie sur un sous-domaine de staging Infomaniak, soit accepter de perdre cette étape de validation visuelle pré-merge pour le site (le repo App reste sur Vercel, seul `avectoi.care` bascule).

---

## 3. Modèle Freemium / Premium — matrice à jour

Sources : Documentation fonctionnelle §4, §5, §6, §9 (écarts PRD/app).

| Fonctionnalité | Freemium | Premium |
|---|---|---|
| Créer l'espace (patient, lieu, règles) | ✅ | ✅ |
| Mode Suivi hospitalier / Soin à domicile | ✅ | ✅ |
| Réservations Visite / Nuitées | ✅ **illimitées pendant 7 jours** depuis la 1ère Visite réservée, puis verrouillé | ✅ illimitées, sans limite de durée |
| Calendrier, Créneaux, "Prochaine dispo" | ✅ | ✅ |
| Nouvelles du jour | ✅ | ✅ |
| Souvenirs (galerie photo) | ✅ | ✅ |
| Entraide (6 catégories) | ✅ | ✅ |
| Mur de soutien | ✅ | ✅ |
| Fiche patient (groupe sanguin, allergies, etc.) | ✅ | ✅ |
| Mode Dark / Light | ✅ | ✅ |
| Partage (lien, QR, code dossier) | ✅ libre, sans verrou | ✅ |
| Vue planning | ✅ Mensuel uniquement | ✅ Hebdo + Mensuel |
| Historique / Chronologie in-app | ✅ | ✅ |
| Entraide : option besoin SOS | ❌ | ✅ |
| Chronologie et téléchargement du livret d'hospitalisation | ❌ | ✅ |
| Documents types (courrier école/crèche, lettre employeur...) | ❌ | ✅ |
| **Export PDF "livret"** | ❌ (fonctionnalité non livrée, backlog V2) | ✅ *(à annoncer comme "bientôt disponible", pas comme acquis)* |
| Purge RGPD | ✅ 30 jours | ✅ 60 jours + 30 jours de prolongation, renouvelable |

> ⚠️ **Planning des intervenants, Rattachement multi-espaces Intervenant et Checklists personnelles réutilisables intervenant** ont été retirés de ce tableau : le rôle Intervenant est masqué dans l'app publiée depuis le 21/08/2026 (flag `INTERVENANT_ROLE_ENABLED=false`, voir changelog en tête de document). Fonctionnalités réelles et déjà codées, mais **inatteignables actuellement** — ne pas les vendre sur le site tant que le flag n'est pas repassé à `true` en V2. Code de référence conservé dans `Développement V2/`.

**Ce que ça veut dire pour le pitch commercial** : l'argument Premium repose sur deux piliers, tous deux déjà livrés :
1. **Continuité** — au-delà des 7 jours d'essai, un suivi qui dure (hospitalisation prolongée, soin à domicile au long cours) reste pleinement fonctionnel
2. **Le souvenir qui reste** — la Chronologie déjà en place comme aperçu, export PDF "livret" annoncé comme bientôt disponible

> Le persona "Soin à domicile" (§5.2) reste un contexte pertinent pour le site — coordination familiale autour d'un proche soigné à domicile — mais **sans mention de fonctionnalité pro** (Planning des intervenants) tant que le rôle n'est pas réactivé.

---

## 4. Arborescence des pages

| Route | Contenu | Done quand… |
|---|---|---|
| `/` | Landing complète (voir §5) | Charge, responsive, CTA visibles, animations fluides |
| `/hospitalisation` | Page SEO dédiée contexte 1 (tranché : 3 pages distinctes, pas d'ancre unique — meilleur référencement par requête) | Contenu spécifique au contexte, indexée séparément |
| `/enfant-hospitalise` | Page SEO dédiée contexte 2 | idem |
| `/soin-a-domicile` | Page SEO dédiée contexte 3 | idem |
| `/signup` | Création compte Admin niveau 1 (Supabase Auth) | Email de bienvenue envoyé |
| `/login` | Connexion admin | Redirige `/dashboard` |
| `/onboarding` | Wizard création espace (patient/lieu/règles/dates) — aligné sur le wizard déjà spécifié dans l'app (`SPEC_flow_connexion_app.md`), pas besoin de le redupliquer différemment | `patient_spaces` créé |
| `/dashboard` | Gestion espace depuis le web (parité avec l'app) | CRUD OK, RLS scopée |
| `/upgrade` | Page paiement ("Valider votre compte Administrateur") | Redirige Stripe |
| `/upgrade/success` | Confirmation post-paiement | Affiche accès Premium |
| `/upgrade/cancel` | Annulation, wording rassurant | Pas de culpabilisation |
| `/invite` | Résolution du lien d'invitation (`?token=`) → ouverture app (deep link `avectoi://invite?token=`) ou fallback web | Redirige correctement selon device |
| `/api/stripe/webhook` | Webhook Stripe | `premium=true`, email de confirmation |
| `/mentions-legales`, `/confidentialite` | RGPD, CGU/CGV | Publiées avant tout lancement public |

---

## 5. Landing `/` — sections détaillées

### 5.1 Hero
- Logo AvecToi (cercle 4 silhouettes + cœur + calendrier) centré, animation d'entrée légère (fade + scale, pas d'effet gadget)
- Titre : promesse produit
- Baseline : *"Parce qu'être présent, ça s'organise."*
- 2 CTA : **Télécharger l'app** (ancre vers §5.9) / **Comment ça marche** (scroll)

### 5.2 Les 3 contextes (obligatoire, demandé explicitement)
Trois cartes/sections à bascule (tabs ou scroll), un scénario narratif court par contexte, avec capture d'écran différenciée si possible :

| Contexte | Angle narratif | Élément produit à mettre en avant |
|---|---|---|
| **Hospitalisation d'un proche** | Coordination familiale classique, éviter que "tout le monde vienne le lundi" | Calendrier, créneaux, nuitées |
| **Enfant hospitalisé** | Rassurer les grands-parents/proches à distance, présence continue autour de l'enfant | Nouvelles du jour, Souvenirs, Mur de soutien |
| **Soin à domicile** | Coordination familiale autour d'un proche soigné à domicile — qui passe quand, qui apporte quoi | Calendrier, créneaux, Entraide (courses, transport, administratif) |

> Décision 02/09/2026 : le contexte "Soin à domicile" est conservé (persona réel dès le lancement) mais **recentré sur la coordination familiale**, sans mention du Planning des intervenants — cette fonctionnalité existe en code mais est masquée en V1 (`INTERVENANT_ROLE_ENABLED=false`). À réintroduire ici quand le rôle repasse en V2/live.

### 5.3 Comment ça marche
3 étapes : **Créer votre espace → Inviter vos proches → Planifier**. Mentionner les 3 façons de rejoindre (lien, QR, code dossier) — argument d'accessibilité pour les proches peu technophiles.

### 5.4 Fonctionnalités (grille)
Reprendre les fonctionnalités réellement livrées (doc §4-§8), pas celles du PRD dépassé :
Calendrier / créneaux · Nuitées · Nouvelles du jour · Souvenirs (galerie) · Entraide (6 catégories : repas, affaires, courses, transport, administratif, autre) · Mur de soutien · Fiche patient (infos utiles, groupe sanguin, allergies) · Mode Dark / Light · Ajout au calendrier natif · Rappels de visite · Planning Hebdo / Mensuel · Tri par visiteur · Checklists perso ou partagées · Modèles de documents · Espace Visiteurs · Règles de visite sur mesure · Historique des modifications · Livret d'hospitalisation. *(Planning des intervenants et rattachement multi-espaces retirés de cette grille — rôle masqué en V1, voir changelog. Huit tuiles ajoutées le 4 septembre 2026, voir "Mises à jour post-v4".)*

### 5.5 Aperçu de l'app
Mockup téléphone, scroll-driven. Captures réelles en cours de prise par l'utilisateur (02/09/2026). 5-6 écrans clés retenus : Calendrier, Créneaux, Nouvelles, Souvenirs, Entraide, Mon Compte/Chronologie *(Planning des intervenants retiré de la liste — rôle masqué en V1)*.

### 5.6 Freemium vs Premium
Tableau de §3, présenté visuellement (colonnes, icônes check/croix), CTA "Passer en illimité" en bas de tableau → `/upgrade`.

### 5.7 Réglages admin
Bloc dédié montrant le sérieux du produit : Lieux (hôpital/domicile), Infos, Règles (horaires, durée, intervalle, jours autorisés, dates bloquées, 1 visite/jour, nuitées), Historique/Chronologie. Donne confiance à un admin qui hésite ("c'est un vrai outil de gestion, pas un gadget").

### 5.8 Le souvenir qui reste
Section sur la **Chronologie** (déjà en place dans l'app, base du futur export PDF). Formuler honnêtement : *"Retrouvez toute l'histoire de la période — visites, nouvelles, moments partagés — dans une frise chronologique. L'export en livret PDF arrive bientôt."* Ne pas présenter le PDF comme disponible aujourd'hui.

### 5.9 Téléchargement
Bouton Google Play + lien APK direct (si le site est mis en ligne avant la publication Play Store).

### 5.10 Sécurité & RGPD
- Hébergement UE (Supabase), site hébergé en Suisse (Infomaniak)
- Aucune donnée transmise à des tiers, aucune revente
- Purge automatique différenciée par plan : **Freemium 30 jours**, **Premium 60 jours après la dernière activité + 30 jours de prolongation, renouvelable**
- Lien vers `/confidentialite`

### 5.11 CTA final
Rappel prix (7,99 € une fois), pas d'abonnement, suppression des données à la clôture de l'espace patient ou sur demande.

---

## 6. Design & animations

- Charte : bleu `#1F3864` / `#2E75B6`, orange `#f97316`, doré `#f0b429`, Playfair Display (titres) + DM Sans (corps)
- **Le site doit lui-même proposer clair/sombre**, cohérent avec le choix produit fait dans l'app (§4 doc fonctionnelle — la roue des 6 thèmes est abandonnée, ne pas la faire réapparaître sur le site)
- Animations 2026 : micro-interactions au scroll (fade/slide progressifs), pas d'auto-play vidéo lourd, respecter `prefers-reduced-motion`
- Mobile-first impératif (le public cible n'est pas technophile)
- Utiliser la skill `frontend-design` pour la direction artistique avant de coder les composants

---

## 7. Tactiques de conversion Premium

- **Compteur honnête et visible** : "J X/7 de votre essai gratuit" dans le dashboard ET mentionné sur le site (transparence = confiance)
- **Chronologie** comme teaser de l'export PDF à venir — donne une raison d'attendre/adopter sans survendre une feature pas encore livrée
- Pas d'argument "coordination pro" tant que le Planning des intervenants reste masqué en V1 (voir changelog) — à réintroduire quand le rôle repasse live
- Témoignages courts et humains, pas de logos d'entreprise
- Aucune urgence artificielle (pas de countdown, pas de "offre limitée") — cohérent avec le wording déjà validé
- Réassurance RGPD juste à côté du bouton de paiement, pas seulement en footer

---

## 8. Ordre des tâches (Claude Code)

1. Setup Next.js + déploiement Infomaniak (test d'un "Hello World" en prod avant tout dev réel, pour valider la chaîne de déploiement Node.js)
2. Connexion Supabase (env vars) + Auth `/signup`, `/login`
3. Landing `/` — Hero + 3 contextes + Comment ça marche (contenu statique d'abord, sans captures réelles si pas encore fournies — placeholders identifiés clairement)
4. Section Fonctionnalités + Freemium/Premium (tableau de §3)
5. Onboarding `/onboarding` (wizard, réutiliser la logique déjà spécifiée côté app)
6. Stripe `/upgrade` + webhook + email confirmation (Resend)
7. Dashboard web `/dashboard` — **parité complète confirmée** avec l'app (CRUD entier de l'espace : Lieux, Règles, Historique/Chronologie, Souvenirs, Entraide, Mur de soutien, Nouvelles ; décision explicite du 02/09/2026, périmètre plus large qu'une version allégée — prévoir un lot de travail conséquent, potentiellement à découper en sous-étapes plutôt qu'une tâche unique)
8. `/invite` (résolution lien/deep link)
9. Sections Réglages admin, Sécurité/RGPD, Téléchargement, CTA final
10. Mentions légales / confidentialité
11. Recette complète du funnel : signup → email → paiement → premium → dashboard

---

## 10. Architecture d'hébergement — Infomaniak et Vercel en parallèle ?

**Recommandation : un seul site de production.** `avectoi.care` sur Infomaniak porte à la fois la vente (marketing + Stripe) **et** la visualisation web de l'app (dashboard admin, vue `/[slug]` visiteur) — exactement l'architecture déjà prévue en §4bis de `PRD_AvecToi_v1_4.md`. Pas de second site de production sur Vercel à côté.

**Pourquoi ne pas faire cohabiter deux sites prod :**
- **Session/Auth partagée compliquée pour rien** : Supabase Auth pose des cookies scopés par domaine. Deux domaines de prod (`avectoi.care` + un `.vercel.app`) obligeraient soit à dupliquer l'auth, soit à bricoler du cross-domain — friction et surface d'attaque en plus, sans bénéfice.
- **Deux codebases qui touchent les mêmes tables** = exactement le pattern qui a causé le problème du site Vercel historique (`REFLEXION_SITE_VERCEL_ET_RGPD.md` §4) : un code non synchronisé avec les évolutions de schéma/RLS finit par diverger et par introduire des failles. Un seul code de prod réduit ce risque structurellement, il ne le déplace pas.
- **Double maintenance** : deux hébergeurs, deux jeux de variables d'env, deux surfaces à sécuriser — alors qu'une partie du travail en cours (`ISOLATION_SUPABASE.md`) vise justement à réduire l'exposition.

**Ce que Vercel peut continuer à apporter, sans être un site de prod** : les **preview deployments par Pull Request**, gratuits et déjà dans tes habitudes de workflow (ruleset `main` du repo app). Rien n'empêche de connecter le repo du site `avectoi.care` à Vercel **uniquement pour les previews de branche/PR**, le domaine `avectoi.care` en production pointant lui vers Infomaniak. C'est un usage de CI, pas un second site public.

**Sort du site Vercel historique (`planning-visites-maman.vercel.app`)** : ✅ **supprimé** (PR #375, 02/09/2026), avec l'import GitHub accidentel du repo actuel (`avec-toi-chi`/`avec-toi-sandy`) au passage. Travail préservé via le tag git `archive/vercel-mvp-site`. Le ruleset GitHub `main-protection` avait un check de statut "Vercel" requis, devenu impossible à satisfaire une fois les projets Vercel supprimés — retiré manuellement des checks requis par l'utilisateur.

---

## 11. Charge Supabase (free tier) — état au 02/09/2026

Le compute Supabase gratuit reste une instance **partagée, dimensionnée pour du prototypage**, pas pour de la prod avec plusieurs familles actives.

**Cause historique identifiée et neutralisée** : le site Vercel historique faisait `supabase.from("reservations").select("*")` sans filtre `space_id` et ouvrait un canal Realtime non filtré sur toute la table — ce site est maintenant supprimé (§10).

**Vérifié le 02/09/2026** : tous les canaux `postgres_changes` de l'app React Native actuelle sont filtrés par `space_id` (`components/Entraide.tsx`, `NewsFeed.tsx`, `Soutien.tsx`, `lib/entraideBadges.ts`, `lib/SpaceContext.tsx`, `lib/VisitorContext.tsx`, `lib/wallUnread.ts`) — le pattern non filtré signalé en juillet ne s'applique plus au code actuel. Point 2 de la liste d'origine est donc traité côté app ; **à répliquer côté futur dashboard web** dès son implémentation (§8 tâche 7).

**Reste à faire avant toute vente commerciale sur le site :**
1. Vérifier dans le Dashboard Supabase (Database → Realtime / Reports) le nombre de connexions/canaux actifs réels, pour confirmer qu'aucune charge résiduelle inexpliquée ne subsiste.
2. **Passer sur l'offre Supabase Pro (~25 $/mois)** avant la mise en ligne commerciale : le tier gratuit se met en pause après une semaine d'inactivité, sans garantie de continuité — inacceptable si une famille compte dessus pendant une hospitalisation réelle. **Non fait à ce jour.**
3. Vérifier `select * from cron.job_run_details order by start_time desc limit 20;` (alertes RGPD potentiellement jamais envoyées, fil ouvert de `REFLEXION_SITE_VERCEL_ET_RGPD.md`).

**Impact sur ce PRD** : la mise en ligne commerciale (page Freemium/Premium, CTA de vente) ne devrait pas être publiée tant que le point 2 ci-dessus n'est pas traité.

---

## 12. Points ouverts restants

Tous les points de la v3 ont été tranchés le 02/09/2026 (voir changelog en tête de document), sauf :

1. Le champ `patient_spaces.theme` (ancienne roue à 6 thèmes) existe toujours en base mais n'est plus utilisé — **laissé en dette technique**, sans impact sur la mise en ligne du site (voir aussi `AUDIT_RLS_TAILLE_CODE_MORT.md`, chantiers de nettoyage volontairement reportés).
2. Captures d'écran réelles de l'app pour §5.5 — en cours de prise par l'utilisateur (02/09/2026).
3. **§11** — Passage à l'offre Supabase Pro avant lancement commercial : décision produit à confirmer, pas encore fait.
4. Accès Infomaniak (déploiement Git du site) : pas encore confirmés — bloque le démarrage du scaffold (§8 tâche 1).

---

*PRD Claude Code — Site avectoi.care v4 — 2 septembre 2026 (mise à jour du 4 septembre 2026 : voir "Mises à jour post-v4" en tête de document)*
