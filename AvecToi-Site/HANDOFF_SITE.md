# Handoff — Site avectoi.care

**Dernière mise à jour : 6 septembre 2026**
**Statut global : hébergement en ligne (Infomaniak), scaffold + premier passage design + carrousel photo + bandeau d'accueil + refonte grille de fonctionnalités + refonte hero/carrousel + différenciation Freemium/Premium + fix carrousel mobile + téléphones bord-à-bord + anti-rebond swipe + état d'échec récupérable + simplification tableau Freemium/Premium + photo "Créer votre espace" remplacée + badge icône/numéro repositionné + photo "Créer votre espace" affichée en entier (non recadrée) + accents visuels widgets (Dark/Light, Google Calendar, Hebdo/Mensuel, Prochaine disponibilité) + toggle Soin Hospitalier/Domicile sous les 3 blocs de bascule de contexte + grille de fonctionnalités identique sur les 3 pages persona + fond photo sur la tuile Calendrier/créneaux + page `/telecharger` (QR code) + tableau de bord web Phase 1 livré et en ligne : connexion Supabase Auth (`/connexion`), header dynamique avec photo patient, calendrier lecture seule aligné visuellement sur l'app (thème clair conservé) — voir §6.18-6.20 — + **photo de fond sur la tuile Nuitées (2 lits visibles, texte blanc lisible), dézoom desktop de cette même tuile, icône lune recolorée en orange, et tuile Souvenirs avec photo incrustée en dégradé côté droit (fond retiré par traitement d'image)** — voir §6.21. Le problème de mise à jour live (§6) est résolu — cause identifiée et corrigée. Le sujet §6.11 (photo mobile non à jour chez l'utilisateur) reste ouvert, sans lien avec les changements ci-dessus.**

Ce document couvre uniquement le site marketing/vente `avectoi.care` (repo séparé `avectoi-site`), pas l'app React Native (voir `Handoff/handoff.md` à la racine du repo AvecToi pour ça).

---

## 1. Où est quoi

| Élément | Emplacement |
|---|---|
| Code du site | Repo séparé : `C:\Users\ReMarkt\Documents\Projets\avectoi-site` |
| Remote GitHub | `https://github.com/EI-HCS-Consulting/avectoi-site.git` (**privé**) |
| Branche | `main` (pas de convention de branches établie pour l'instant, tout part direct sur main — repo encore au stade early) |
| PRD (spec produit du site) | `AvecToi-Site/PRD_ClaudeCode_Site_avectoi_care_v4.md` (ce dossier) |
| Ce handoff | `AvecToi-Site/HANDOFF_SITE.md` (ce dossier) |
| Liste des fonctionnalités du site | `AvecToi-Site/FONCTIONNALITES_SITE.md` |
| Charte graphique / design system | `AvecToi-Site/CHARTE_GRAPHIQUE_SITE.md` |
| Hébergement | Infomaniak, Node.js hosting managé, rattaché au nom de domaine `avectoi.care` |
| Backend | Supabase, projet `flmslcdzjuifkivmzins` (partagé avec l'app) |

**Important : ce dossier `AvecToi-Site/` est un dossier de documentation/sauvegarde, pas le code.** Il vit dans le repo `AvecToi` (l'app) pour rester à côté du reste de la documentation projet, mais le code du site est ailleurs (`avectoi-site`, repo Git distinct). Ne pas confondre les deux lors des futurs handoffs.

---

## 2. Contexte — pourquoi ce site existe

Modèle de conformité "app lecteur" : l'app Android AvecToi est strictement en consultation, toute la vente (Freemium → Premium) se fait exclusivement sur le site web `avectoi.care`. Le site sert donc de vitrine marketing (3 pages persona SEO) + de canal de vente (Stripe Checkout, pas encore branché) + de dashboard web optionnel.

---

## 3. Décisions PRD verrouillées (v4, 2 septembre 2026)

Le détail complet est dans le PRD (`PRD_ClaudeCode_Site_avectoi_care_v4.md`), mais les décisions clés à ne pas re-questionner :

- **Partage (invite lien/QR/code dossier) gratuit en Freemium** — vérifié dans le code app (`components/ShareSpace.tsx`), le verrou Premium a été retiré volontairement (commit `3c52cb1`) car il rendait l'essai gratuit inutilisable.
- **Aucune mention du mode Intervenant sur le site pour la V1** — le rôle Intervenant est masqué dans l'app publiée depuis la PR #291 (`INTERVENANT_ROLE_ENABLED=false`). Le composant `IntervenantManagementCallout.tsx` qui le vendait comme feature Premium a été supprimé du scaffold.
- **3 pages SEO dédiées** : `/hospitalisation`, `/enfant-hospitalise`, `/soin-a-domicile` (pas une seule page à ancres).
- **Dashboard web en parité complète avec l'app dès le lancement** (choix explicite de l'utilisateur, plus large que la version allégée que j'avais recommandée par défaut) — pas encore commencé, gros chantier à venir, prévoir de le découper en sous-étapes.
- **Freemium : essai roulant de 7 jours** depuis la première réservation "Visite" (`FREE_TRIAL_DAYS = 7`), pas l'ancien cap de 8 réservations.
- **RGPD : purge différenciée par plan** — Freemium 30 jours (sans prolongation) / Premium 60 jours d'inactivité + prolongation gratuite de 30 jours, renouvelable (affiné le 4 septembre 2026, voir §6.3.d, commit `dd1494d` ; PRD v4 mis à jour en conséquence, voir sa section "Mises à jour post-v4").
- **Mode clair/sombre à conserver sur le site** — déjà implémenté en automatique via `prefers-color-scheme` (pas un toggle manuel, contrairement à l'app qui a un switch dans Mon Compte). Voir `CHARTE_GRAPHIQUE_SITE.md`.
- Colonne DB `patient_spaces.theme` : morte, laissée en dette technique, sans lien avec la question du mode clair/sombre du site.

---

## 4. Ce qui a été fait cette session (3 septembre 2026)

### 4.1 Découverte du scaffold existant
Un handoff précédent affirmait le site "toujours pas scaffoldé" — c'était faux. Le repo `avectoi-site` existait déjà, poussé sur GitHub, avec une home + 3 pages persona + tous les composants de base (Freemium/Premium, sécurité RGPD, grille de fonctionnalités, mode clair/sombre auto, charte graphique Playfair Display + DM Sans). Il avait été construit sur la base de la PRD v3 (obsolète).

### 4.2 Correction du scaffold vers PRD v4 (commit `246da37`)
- `lib/site.ts` : `FREE_VISIT_LIMIT=8` → `FREE_TRIAL_DAYS=7`
- `lib/personas.ts` : suppression du champ `intervenantEmphasis`, persona "Soin à domicile" recentrée famille
- Suppression de `components/IntervenantManagementCallout.tsx`
- `FreemiumPremiumTable.tsx`, `SecurityRgpd.tsx`, `FeatureGrid.tsx` : chiffres et mentions Intervenant corrigés
- 3 pages persona : nettoyage des références au callout supprimé

### 4.3 Mise en ligne sur Infomaniak
Hébergement Node.js managé, connecté au repo GitHub via déploiement Git. Détails complets en §5.

### 4.4 Premier passage design (commit `1258102`)
Suite à un retour utilisateur après la première mise en ligne ("pas très design, manque de photos, logo pas le bon, blocs pas uniformes, HowItWorks trop plat") :
- **Logo** : remplacement de `/icon-sans-512.png` (variante sans le lit, juste calendrier) par `/icon-512.png` (la bonne version : lit + calendrier + cœur au centre des 4 personnages), agrandi dans le header (32px→44px) et le hero (72px→96px)
- **`FeatureGrid.tsx`** : tous les blocs harmonisés au style du premier (bordure bleue, fond teinté, coche orange) — avant, seuls les features "highlighted" de la persona avaient ce style, le reste était en gris plat
- **`HowItWorks.tsx`** : refonte avec icônes emoji + badges colorés reprenant la palette du logo (navy/teal/orange), au lieu de simples numéros sur fond navy uniforme
- **Nouvelle section `AppShowcase.tsx`** sur la home : 3 vraies captures d'écran de l'app (planning du jour, nouvelles du jour, entraide) en style mockup téléphone, remplace l'absence totale de photos
- Ajout des tokens CSS `--color-teal` (#14919b) et `--color-purple` (#7c4fa6) dans `globals.css` pour compléter la palette (le logo a 4 couleurs : navy, teal, orange, purple — seules navy/blue/orange/gold existaient avant)
- Captures utilisées copiées dans `avectoi-site/public/screenshots/` depuis `C:\Users\ReMarkt\Downloads\Visuels\` (dossier fourni par l'utilisateur, contient 12 captures de l'app au total — seules 3 utilisées jusqu'ici, les 9 autres sont disponibles pour d'autres sections si besoin)

**Retour utilisateur en attente** : la police (Playfair Display + DM Sans) a été jugée "pas top" avant ce passage design — à réévaluer une fois le reste en ligne et visible, pas encore retranché.

### 4.5 Diagnostic et résolution du bug de mise à jour live (voir §6 pour le détail)
Après le passage design du commit `1258102`, le site en ligne ne reflétait aucun changement malgré un Build+Redémarrage sur Infomaniak. Diagnostic mené par accès SSH direct au serveur (voir §5.3) : le bouton **Build** d'Infomaniak ne fait **pas** de `git pull`/`fetch` avant de rebuilder — il recompile ce qui est déjà checkouté en local, resté au commit `246da37`. Correction : `git pull origin main` + `npm install && npm run build` faits manuellement en SSH, puis redémarrage via le panneau Infomaniak. Confirmé en ligne (nouvel ETag, logo `icon-512` présent, captures d'écran présentes, `icon-sans` absent).

---

## 5. Configuration Infomaniak (déploiement)

Processus suivi pour la mise en ligne initiale — utile si un jour il faut recréer l'hébergement ou en comprendre la mécanique :

1. **Hébergement** > `avectoi.care` > **Ajouter un site** > **Configurer Node.js**
2. Type d'installation : **"Importer un projet existant"** (pas "Créer un projet vide")
3. Méthode d'installation : **Git**
4. Adresse du dépôt : le repo `avectoi-site` étant **privé**, un simple `https://github.com/...` échoue (erreur générique "Une erreur s'est produite"). Deux options envisagées :
   - Rendre le repo public → **refusé** par l'utilisateur (code visible, forks possibles, rulesets désactivés)
   - **Solution retenue** : token GitHub *fine-grained*, scopé uniquement au repo `avectoi-site`, permission `Contents: Read-only` (+ `Metadata: Read-only` ajoutée automatiquement par GitHub). Nom du token : `infomaniak-deploy-avectoi-site`. Expiration ~1 an — **à renouveler avant expiration, sinon le déploiement Git cassera silencieusement** (penser à revérifier courant 2027).
   - URL utilisée dans le champ Infomaniak : `https://<TOKEN>@github.com/EI-HCS-Consulting/avectoi-site.git`
5. **Construction de l'application** :
   - Commande de build : `npm install && npm run build` (le champ ne fait **pas** d'install automatique tout seul malgré l'option "réinstaller les dépendances" du dialogue de build — piège rencontré : la première tentative avec juste `npm run build` échouait avec `sh: 1: next: not found` car `node_modules` n'était jamais peuplé)
   - Commande d'exécution : `npm run start`
   - Port d'écoute : `3000`
6. Vérification que ça tourne : dans **Consoles > Exécution**, chercher `✓ Ready in ...ms` et `Local: http://localhost:3000`.

### Rebuild / redeploy après un `git push`
Le déploiement n'est **pas automatique** sur push (pas de webhook configuré). **Important (découvert le 3/09/2026) : le bouton "Build" du panneau Infomaniak ne va PAS chercher le dernier commit tout seul** — il rebuild ce qui est déjà checkouté sur le serveur, qui ne bouge que si quelque chose fait explicitement un `git pull`. Procédure fiable après chaque push sur `main` :
1. Se connecter en SSH (voir §5.3) et faire `cd /srv/customer/sites/avectoi.care && git pull origin main`
2. `npm install && npm run build` (toujours via SSH, ou déclencher "Build" dans le panneau *après* le pull manuel — le pull ne se fait pas tout seul dans les deux cas)
3. **Redémarrer** l'exécution dans l'onglet **Exécution** du panneau Infomaniak

### 5.3 Accès SSH (mis en place le 3 septembre 2026)
Un utilisateur SSH dédié `Claude-Code` a été créé sur l'hébergement (panneau Infomaniak → `avectoi.care` → **FTP/SSH** → Node.js → nouvel utilisateur), pour permettre un diagnostic et des corrections directes sans dépendre uniquement de la console web.

- **Hôte** : `57-116207.ssh.hosting-ik.com`, **port** : `22`
- **Utilisateur** : `iWLFHQ32vwj_Claude-Code` (préfixe unique ajouté automatiquement par Infomaniak)
- **Authentification** : par mot de passe pour l'instant — l'authentification par clé SSH n'est **pas encore disponible** côté Infomaniak pour ce type d'hébergement ("arrivera bientôt" selon le message du panneau). Une paire de clés a quand même été générée localement (`~/.ssh/avectoi_infomaniak`) en prévision, mais n'est pas utilisée actuellement.
- Le mot de passe n'est volontairement **pas stocké dans ce document** — il est uniquement dans le panneau Infomaniak (modifiable via "Modifier l'utilisateur") et n'a été utilisé qu'en variable d'environnement transitoire pendant la session, jamais écrit sur disque.
- Répertoire du site sur le serveur : `/srv/customer/sites/avectoi.care` (checkout Git direct, `.next/` généré par `npm run build` à côté).
- **À refaire dès que l'auth par clé sera disponible côté Infomaniak** : basculer sur la clé publique déjà générée plutôt que le mot de passe, pour éviter de repartager un secret à chaque session.

---

## 6. Incident résolu — le site ne reflétait pas le dernier déploiement

**Symptôme** : après le commit `1258102` (passage design), rebuild + redémarrage effectués sur Infomaniak, mais le site en ligne ne montrait aucun changement (toujours l'ancien logo `icon-sans-512`, pas de captures d'écran).

**Diagnostic** (fait par accès SSH direct, voir §5.3) :
- `curl -I https://avectoi.care/` montrait `x-nextjs-cache: HIT` — pas un souci de cache navigateur (hard refresh et navigation privée ne changeaient rien).
- Le HTML servi contenait encore `icon-sans-512.png` (10 occurrences) et zéro trace de `screenshots/` → build antérieur au commit `1258102`, confirmé côté serveur.
- En SSH, `cd /srv/customer/sites/avectoi.care && git log --oneline` montrait le checkout bloqué sur `246da37` (le commit *précédent*), alors que `git fetch origin main` voyait bien `1258102` disponible sans erreur (donc le PAT et la connectivité Git étaient corrects).

**Cause racine** : le bouton **"Build"** du panneau Infomaniak ne déclenche pas de `git pull`/`fetch` avant de rebuilder — il recompile le code déjà présent sur le disque, qui n'avance que si quelque chose fait un pull explicite. Aucun webhook ni synchronisation automatique n'existe entre GitHub et le checkout serveur au-delà du clonage initial.

**Correction appliquée (3 septembre 2026)** :
1. Création d'un utilisateur SSH `Claude-Code` sur l'hébergement (voir §5.3)
2. `git pull origin main` en SSH dans `/srv/customer/sites/avectoi.care` → fast-forward `246da37..1258102` propre
3. `npm install && npm run build` en SSH → build réussi (9 routes, exit code 0), vérifié sur disque (`icon-512` présent, `icon-sans` absent, `screenshots/*.png` présents dans `.next/server/app/index.html`)
4. Redémarrage via le panneau Infomaniak (bouton **Exécution > Redémarrer**)
5. Vérifié en ligne : nouvel ETag HTTP, contenu à jour confirmé par `curl`

**Procédure à suivre pour tout futur déploiement** : ne plus se fier au seul bouton Build — toujours faire un `git pull` en SSH avant (voir §5.2 mis à jour), ou demander explicitement à Claude de le faire via l'accès SSH désormais en place.

---

## 6.1 Carrousel de captures, lightbox et bandeau d'accueil (3 septembre 2026, suite de session)

Trois lots livrés à la suite du passage design initial, tous déployés via la procédure SSH du §5.2 (`deploy_ssh.py`, script Python maison utilisant `paramiko` — aucun `sshpass`/`plink` disponible sur l'environnement Windows/Git Bash de Claude, donc SSH scripté en Python plutôt qu'en shell interactif).

**a) Carrousel réel (commit `a00a0ff`)** — `AppShowcase.tsx` réécrit de zéro : passage de 3 captures fixes en mockup téléphone à un vrai carrousel de 14 écrans (puis 15), navigation flèches + swipe tactile + autoplay (pause au survol/focus), respect de `prefers-reduced-motion`. Ordre logique demandé par l'utilisateur : Calendrier → Accueil/Planning du jour → Nouvelles du jour → Entraide → Produits récurrents → Créneaux → Nuitées → Entraide/Transport → Infos → Mode de soin → Règles de visite (x2) → Checklists.

**b) Refonte en carrousel paginé 3-par-3 (commit `ed1738e`)** — sur retour utilisateur : affichage de 3 captures simultanées, glissement par page de 3 (flèches, swipe, dots de pagination par page et non plus par écran individuel). Réorganisation thématique complète en 5 groupes de 3 (vue d'ensemble/réservation, infos pratiques, communication/entraide, compte/partage, vue hebdo/checklists) ; la capture "Réserver une nuitée sur place" retirée du carrousel (jugée trop redondante visuellement avec "Réserver un créneau de visite en deux clics").

**c) Lightbox (commit `658f1a6`)** — clic sur une des 3 captures visibles → overlay plein écran avec l'image agrandie, fermeture par `Échap`, clic sur le fond, ou bouton croix ; carrousel/autoplay mis en pause tant que la lightbox est ouverte ; verrouillage du scroll de la page en arrière-plan.

**d) Bandeau photo d'accueil (commit `7d18519`)** — ajout d'une section bandeau en haut de `app/page.tsx`, au-dessus du titre/CTA existant : image pleine largeur (16:9 mobile, 21:9 desktop), coins arrondis, `priority` (au-dessus de la ligne de flottaison). Photo fournie directement par l'utilisateur (`public/hero-visite.png`, ~1731×909px) — scène de famille multigénérationnelle souriante au chevet d'une aînée hospitalisée. **Recherche de photo libre de droits infructueuse en amont** : Pexels/Unsplash/Pixabay n'ont pas de bonne photo gratuite correspondant exactement à "grand-mère hospitalisée entourée de plusieurs proches" — les seules correspondances exactes trouvées étaient en Unsplash+/Getty Images (payant par abonnement). Deux photos candidates écartées du bandeau mais conservées pour un usage ailleurs sur le site : une photo de mains jointes en gros plan (Pexels, Muskan Anand, `hero-candidates/candidate1-pexels-oldcouple.jpg`) et une photo "toute la famille tête contre tête" au lit à la maison (Pexels, Mikhail Nilov) — toutes deux dans le dossier scratchpad de la session, pas encore copiées dans `avectoi-site/public/`.

**Piège rencontré** : le script de déploiement SSH (`deploy_ssh.py`) plantait avec une `UnicodeEncodeError` sur le caractère `▲` du bandeau Next.js lors du streaming de la sortie de build sur la console Windows (encodage `cp1252` par défaut). Corrigé avec `sys.stdout.reconfigure(encoding="utf-8", errors="replace")` en tête de script + un `try/except` autour de chaque `print()` de ligne, pour garantir que `recv_exit_status()` et la fermeture de la connexion s'exécutent toujours même si l'affichage échoue.

---

## 6.2 Incident résolu — CSS globale en 404 après déploiement (commit `d760d11`, 4 septembre 2026)

**Symptôme** : après un déploiement standard (SSH `git pull && npm install && npm run build` + **Redémarrer** dans le panneau), le site entier a perdu toute présentation — photos affichées en taille native énorme, carrousel disparu, aucune mise en page (signalé par l'utilisateur sur `https://avectoi.care/`, page d'accueil, alors que le commit déployé ne touchait que `HowItWorks.tsx`, utilisé uniquement sur les 3 pages persona — la panne était donc globale, pas liée au code du commit).

**Diagnostic** (SSH direct) :
- Le HTML servi en direct référençait le bon fichier CSS global (hash cohérent avec le build fraîchement compilé, `git log`/`BUILD_ID` confirmés à jour).
- Mais une requête directe sur ce fichier CSS (`/_next/static/chunks/<hash>.css`) renvoyait **404**, de façon stable et reproductible sur plusieurs minutes (pas une histoire de cache : `cache-control: no-store` sur la réponse 404 elle-même) — alors que le fichier existait bel et bien sur le disque serveur avec les bonnes permissions (vérifié en SSH, `ls -la .next/static/chunks/`).
- Conclusion : le process Node qui sert réellement le trafic n'avait pas correctement pris en compte le nouveau build malgré le clic sur **Redémarrer** — la page HTML (rendue à la demande) reflétait bien le nouveau code, mais le service des fichiers statiques restait bloqué sur un état antérieur.

**Correction** : un **second clic sur Redémarrer** a suffi à résoudre le problème (revérifié en direct : le fichier CSS renvoie 200 juste après). Cause exacte du premier redémarrage inefficace non confirmée côté Infomaniak (hypothèse : redémarrage déclenché avant la fin d'écriture complète du build sur disque, ou couche de service des fichiers statiques distincte du process applicatif qui n'a pas suivi).

**Procédure à suivre pour tout futur déploiement (mise à jour de la check-list §5.2)** :
1. `git pull origin main` + `npm install && npm run build` en SSH (inchangé)
2. **Redémarrer** dans le panneau Infomaniak
3. **Nouvelle étape obligatoire** : revérifier par `curl` que la page ET son CSS renvoient bien 200 —
   ```
   curl -sI https://avectoi.care/                                    # doit renvoyer 200
   # extraire le lien CSS du HTML, puis :
   curl -sI https://avectoi.care/_next/static/chunks/<hash>.css      # doit renvoyer 200, PAS 404
   ```
   Ne jamais se contenter de vérifier le contenu du HTML seul — un HTML à jour peut très bien référencer un asset qui 404 côté serveur, ce qui casse toute la présentation du site sans que le contenu HTML lui-même ne le révèle.
4. Si le CSS 404 malgré un build confirmé correct sur disque : **recliquer sur Redémarrer une seconde fois** avant d'aller chercher plus loin — ça a suffi dans ce cas précis.

---

## 6.3 Refonte grille de fonctionnalités, hero/carrousel d'accueil, et différenciation Freemium/Premium (4 septembre 2026)

Quatre lots livrés à la suite du §6.2, tous déployés via la procédure SSH standard (`deploy_ssh.py`) puis vérifiés en ligne selon la check-list du §6.2 (HTML **et** CSS en 200, contenu texte confirmé par `curl` + `grep` sur la page concernée).

**a) Refonte de `FeatureGrid.tsx` (commit `5058b13`)**
- Neuf nouvelles icônes ajoutées à `components/icons.tsx` (`StarIcon`, `LayersIcon`, `FilterIcon`, `ChecklistIcon`, `DocumentIcon`, `UsersIcon`, `SlidersIcon`, `HistoryIcon`, `BookIcon`), suivant le même helper `base()` que les icônes existantes.
- Renommages : "Calendrier & créneaux" → "Calendrier / créneaux" (répercuté aussi dans `lib/personas.ts` et le fallback de `buildLayout()`, pour éviter une tuile "highlighted" orpheline sur une persona) ; "Mode clair / sombre" → "Mode Dark / Light".
- Le badge "Le plus utilisé" sur la tuile héro (auparavant un dessin jugé "brouillon") remplacé par un badge pilule discret (icône étoile + texte, fond orange/10).
- Huit nouvelles tuiles ajoutées : Planning Hebdo / Mensuel, Tri par visiteur, Checklists perso ou partagées, Modèles de documents, Espace Visiteurs, Règles de visite sur mesure, Historique des modifications, Livret d'hospitalisation.

**b) Refonte hero + bandeau carrousel de la home (commit `c4e90a4`)**
- `app/page.tsx` : bandeau photo remonté sous la barre de menu, logo agrandi (96px→112px) et remonté, titre `h1` repassé en `clamp()` pour tenir sur une seule ligne à toutes les largeurs ("Parce qu'être présent, ça s'organise !"), sous-titre changé, nouvelle phrase de réassurance ajoutée sous les CTA.
- `AppShowcase.tsx` : hauteur du bandeau réduite (padding fixe `pt-14`/`pb-14` ≈ 1,5 cm en haut et en bas du titre/bas de carrousel, sans toucher à la taille du carrousel lui-même) ; phrase "Pas de maquette..." forcée sur une ligne via un fallback `overflow-x-auto` (compromis assumé et signalé à l'utilisateur : au-delà d'une certaine étroitesse d'écran, la phrase défile horizontalement plutôt que de devenir illisible) ; nouvelle phrase en police scripturale (`font-hand`, Caveat) ajoutée en dessous.

**c) Différenciation Freemium/Premium, ronde 1 (commit `ae2e2fb`)**
- `FreemiumPremiumTable.tsx` : prix "7,99€, une fois. C'est tout." + "Pas d'abonnement, pas de surprise le mois suivant." (remplace l'ancien "Un prix symbolique...", dans les deux blocs Freemium et Premium) ; ligne RGPD reformulée "(et renouvelable !)".
- `SecurityRgpd.tsx` : "Sécurité &amp; RGPD" → "Sécurité / RGPD" ; texte purge RGPD complété "...et renouvelable".
- `FinalCta.tsx` : prix "5,99 €" → "7,99 €", et la clause de suppression de données précisée ("à la clôture de l'espace patient ou sur demande" au lieu de "suppression garantie").
- Espacements réduits avant "Sécurité / RGPD", "Freemium ou Premium", "Ce que AvecToi propose..." (renommé depuis "Ce que l'app propose...") et avant le bloc `ContextSwitchCallout` ("Et si le retour à la maison approche ?"), pour resserrer la fin de la série de blocs fonctionnalités.
- `public/how-it-works/creer-un-compte.png` remplacée par une version recadrée serrée ("Créer-un-compte-zoom", 95488 → 71374 octets), utilisée dans `HowItWorks.tsx` sans changement de code (même chemin de fichier).

**d) Différenciation Freemium/Premium, ronde 2 (commit `dd1494d`)** — sur retour utilisateur après la ronde 1, deux nouvelles lignes ajoutées dans `FreemiumPremiumTable.tsx` (réutilisant le pattern `string` de la colonne `Cell`, déjà utilisé pour "Réservations Visite & Nuitées", qui affiche un badge texte doré au lieu d'une simple coche) :
- **Purge RGPD** différenciée par palier : Freemium 30 jours / Premium 60 jours + 30 jours renouvelable (auparavant la même valeur pour les deux plans).
- **Vue planning** différenciée : Freemium limité au mensuel, Premium débloque Hebdo + Mensuel.
- Trois fonctionnalités basculées en exclusivité Premium (`free: false`, auparavant partagées ou pas encore présentes dans le tableau) : option besoin SOS (Entraide), chronologie + téléchargement du livret d'hospitalisation, documents types (courrier, lettre employeur...).

**Vérification post-déploiement (`dd1494d`)** : HTML et CSS chunk (`/_next/static/chunks/0r4jl8u5nrbm4.css`) confirmés 200 ; contenu de `https://avectoi.care/hospitalisation` vérifié par `curl` + `grep`, présence confirmée de "60 j + 30 j renouvelable", "Hebdo + Mensuel" et "7,99" — aucune répétition de l'incident CSS 404 du §6.2.

---

## 6.4 Fix carrousel mobile + fond unifié (commit `29c6a41`, 5 septembre 2026)

Retour utilisateur (screenshot fourni) : sur mobile, le carrousel `AppShowcase.tsx` débordait de la largeur d'écran (5 téléphones en éventail, obligeant à faire défiler la page horizontalement pour voir les écrans coupés à gauche/droite), le bloc avait un fond gris/noir (`bg-sand dark:bg-sand-dark`) au lieu du bleu utilisé ailleurs sur le site, et un trait (scrollbar du `overflow-x-auto`) apparaissait sous le texte d'intro.

**Corrections dans `components/AppShowcase.tsx` :**
- Éventail réduit à 3 téléphones visibles sur mobile (les 2 spots extrêmes passent en `hidden sm:block`, toujours 5 en desktop `sm:`), largeurs mobiles resserrées (`w-20`/`w-32` au lieu de `w-24`/`w-32`/`w-44`) pour tenir dans la largeur d'écran sans débordement horizontal — vérifié par script Playwright (`document.documentElement.scrollWidth === clientWidth` à 390px et 1440px de large).
- Flèches précédent/suivant passées en `hidden sm:flex` : masquées sur mobile (swipe uniquement, testé par dispatch d'un `TouchEvent` synthétique), toujours visibles sur desktop.
- Fond de la section : `bg-sand dark:bg-sand-dark` → `bg-navy-deep` (même bleu foncé fixe que la bande Freemium/Premium de `FreemiumPremiumTable.tsx`), appliqué identiquement mobile et desktop. Tous les textes de la section passés en blanc/blanc-opacité fixe (`text-white`, `text-white/60`, `text-white/80`, `text-white/85`) puisque le fond ne bascule plus avec le thème clair/sombre du visiteur.
- Suppression du wrapper `overflow-x-auto`/`whitespace-nowrap` autour du texte d'intro (c'était la barre de défilement visible sous le texte) — remplacé par un paragraphe centré qui wrap normalement.
- Texte d'intro changé : "Pas de maquette, pas de promesse abstraite : voici ce que votre famille utilisera concrètement." → "L'interface que votre famille et vos proches auront entre les mains, sans surprise."

**Vérification avant déploiement** : app buildée et testée en local via un dev server Next.js + script Playwright (`playwright-core` + Chrome système, pas de navigateur Chromium téléchargé) pilotant le navigateur à 390px (mobile) et 1440px (desktop) — captures d'écran comparées, `scrollWidth`/`clientWidth` égaux sur les deux, flèches confirmées `display:none` sur mobile, swipe confirmé fonctionnel (changement de slide après un `TouchEvent` synthétique start→end).

**Déploiement** : commit `29c6a41` poussé sur `main`, puis SSH (`git pull origin main` → fast-forward `dd1494d..29c6a41` propre, `npm install && npm run build` → build réussi, exit 0, 9 routes). Reste l'étape manuelle : clic sur **Redémarrer** dans le panneau Infomaniak (jamais automatisée, voir §5.2/§8) — à faire par l'utilisateur, puis revérifier HTML+CSS en 200 par `curl` selon la check-list du §6.2 avant de considérer le déploiement terminé.

---

## 6.5 Téléphones du carrousel bord-à-bord + fix image cassée (commits `10e7041` et `d1514d0`, 5 septembre 2026)

Deux retours utilisateur après test live du §6.4 :

**1. Téléphones mobiles trop petits.** Les 3 téléphones visibles sur mobile (§6.4) n'occupaient pas toute la largeur de l'écran. Fix dans `components/AppShowcase.tsx` :
- Largeurs des spots mobiles passées en pourcentages (`w-[30%]`/`w-[46%]`/`w-[30%]` au lieu de largeurs fixes en px), marges ajustées en conséquence.
- Le wrapper du carrousel passe de `mx-auto` à `-mx-4 sm:mx-auto` sur mobile pour annuler le padding horizontal de la page et laisser les téléphones toucher les bords de l'écran (desktop inchangé).
- Régression détectée puis corrigée : le halo décoratif au survol (`-inset-1`) débordait de 4px hors viewport une fois les téléphones collés au bord ; passé en `inset-0` sur mobile (`sm:-inset-1.5` conservé en desktop).
- Vérifié par script Playwright : `document.documentElement.scrollWidth === clientWidth` à 390px, aucun débordement horizontal.

**2. Capture d'écran "besoin de transport" affichée cassée** (icône image + texte alt sur fond noir), reproduite deux fois par l'utilisateur sur téléphone avec une connexion très faible visible dans la barre de statut (0,22 K/s puis 0,04 K/s). Vérification côté serveur : fichier source intact, `curl` sur le fichier brut et sur l'endpoint d'optimisation d'image Next.js (`/_next/image?...`) renvoient 200 avec la bonne taille à toutes les largeurs pertinentes — aucune cause serveur trouvée.

Premier correctif (commit `10e7041`) : ajout d'une logique de retry (`onError` + remount via `key`) mais **seulement sur l'image de la lightbox**, pas sur les vignettes du carrousel — insuffisant, le bug reproduit ensuite (commit suivant) montrait l'image cassée directement dans le carrousel principal (pas la lightbox), sur la vignette **centrale** (le spot le plus grand).

**Cause précise** : chaque slide passe par des largeurs de spot différentes selon sa position dans l'éventail (`sizes="(min-width: 640px) 320px, 55vw"`) ; Next.js `<Image>` demande une variante de largeur différente selon la position. Quand un slide arrive au centre (plus grand), une nouvelle variante doit être chargée même si l'image a déjà été vue à une autre position — sur une connexion quasi nulle, cette requête peut échouer sans qu'aucun retry ne soit déclenché puisque seule la lightbox en avait un.

**Correctif définitif (commit `d1514d0`)** : extraction d'un composant partagé `RetryImage` (retry `onError` jusqu'à 3 fois, remount via `key={src}-{retry}`, reset automatique du compteur au changement de `src`), utilisé à la fois pour les vignettes du carrousel et pour la lightbox — élimine la duplication de logique et couvre désormais toutes les images affichées, pas seulement celle de la lightbox.

**Vérification avant déploiement** : dev server local + script Playwright simulant 16 swipes successifs (`TouchEvent` synthétiques) pour faire défiler toutes les positions de chaque slide (y compris le passage par le spot central), puis scan de `document.querySelectorAll("img")` pour détecter toute image avec `naturalWidth === 0` — aucune trouvée, aucune erreur console, `scrollWidth === clientWidth` à 390px confirmé.

**Déploiement** : commit `10e7041` puis `d1514d0` poussés sur `main`, chacun déployé via la procédure SSH standard (`git pull origin main` fast-forward propre, `npm install && npm run build`, exit 0, 9 routes à chaque fois). Reste l'étape manuelle : clic sur **Redémarrer** dans le panneau Infomaniak pour le commit `d1514d0` (le clic pour `10e7041` a déjà été fait par l'utilisateur) — à revérifier en ligne (HTML+CSS 200) selon la check-list du §6.2, et confirmer visuellement que l'image "besoin de transport" s'affiche correctement dans le carrousel après ce redémarrage.

**Retour utilisateur après redémarrage du commit `d1514d0` : le bug persistait.** Vérification côté serveur refaite (curl répété sur l'endpoint d'optimisation d'image Next.js pour `entraide-transport.png` à toutes les largeurs plausibles — `w=384/640/750/828/1080` — 3 requêtes chacune) : 200 systématique, temps de réponse <1s, taille de fichier stable. **Aucune anomalie serveur détectée** ; la théorie initiale du §6.5 (variante de largeur différente selon la position dans l'éventail) était en fait incorrecte — l'attribut `sizes` passé à `RetryImage` est identique quelle que soit la position (`(min-width: 640px) 320px, 55vw`), donc une seule variante est demandée quelle que soit la place du slide dans l'éventail. Conclusion : il s'agit très probablement d'une vraie coupure de connexion côté téléphone de l'utilisateur (les deux captures d'écran montrent un débit quasi nul, "0,22 K/s" puis "0,04 K/s", dans la barre de statut Android) — aucun correctif client ne peut faire charger une image avec un débit réellement nul. Voir §6.6 pour l'amélioration apportée malgré tout (état d'échec récupérable au lieu d'une icône cassée figée).

---

## 6.6 Anti-rebond navigation tactile + état d'échec récupérable (commit `3f7f4d0`, 5 septembre 2026)

Deux retours utilisateur après test live du §6.5 :

**1. La page se décale horizontalement pendant le swipe du carrousel** (vers la gauche en swipant vers la gauche, vers la droite en swipant vers la droite). Cause : le geste de swipe horizontal sur la zone du carrousel était aussi interprété par le navigateur mobile comme son propre geste de navigation (retour/avancer par swipe de bord), ce qui décale visuellement toute la page pendant le drag — un comportement natif du navigateur, pas un bug de mise en page. **Correctif** :
- `touch-action: pan-y` ajouté en style inline sur la zone tactile du carrousel principal et sur la zone tactile de la lightbox — indique au navigateur de ne traiter que le geste vertical nativement et de laisser tout geste horizontal exclusivement à notre gestionnaire JS (`onTouchStart`/`onTouchEnd`).
- `overscroll-behavior-x: none` ajouté globalement sur `html, body` dans `globals.css` — désactive l'effet de rebond/geste de navigation par swipe de bord sur toute la page, pas seulement dans le carrousel.
- **Non vérifiable par script Playwright** : ce geste de navigation est un comportement natif du navigateur mobile déclenché par de vrais événements tactiles, pas reproductible par des `TouchEvent` synthétiques en Chrome headless. Seules les propriétés CSS elles-mêmes ont été vérifiées comme bien appliquées (`getComputedStyle` confirmant `touch-action: pan-y` et `overscroll-behavior-x: none`) ; la disparition effective du décalage visuel reste à confirmer par l'utilisateur sur son téléphone.

**2. Image cassée persistante (voir fin §6.5) — amélioration de l'état d'échec.** Puisque le diagnostic serveur écarte toute cause côté code/déploiement, impossible de garantir le chargement sous connexion réellement nulle. À la place, remplacement de l'icône "image cassée" + texte alt (état terminal, sans recours) par un état récupérable :
- `RetryImage` réécrit : après un échec, un retry automatique avec backoff exponentiel (2s, 4s, 8s, 16s, plafonné à 20s, jusqu'à 5 tentatives) au lieu des 3 tentatives fixes à 1s précédentes (trop rapides pour laisser une vraie coupure réseau se rétablir).
- Pendant l'attente d'un retry, affichage d'un encart tactile "Connexion faible / Toucher pour réessayer" (mêmes proportions que la capture via `aspect-[720/1612]`) à la place de l'icône cassée — l'utilisateur peut retenter manuellement dès que sa connexion revient, sans attendre le prochain palier de backoff.
- Vérifié par script Playwright : requêtes réseau de `entraide-transport.png` bloquées via `page.route(...).abort()` → l'encart "Connexion faible" apparaît bien après échec ; débloqué (`route.continue()`) → l'encart disparaît automatiquement après le retry suivant, sans image cassée résiduelle (`naturalWidth === 0` : aucune trouvée).

**Déploiement** : commit `3f7f4d0` poussé sur `main`, SSH (`git pull origin main` fast-forward `d1514d0..3f7f4d0` propre, `npm install && npm run build` → exit 0, 9 routes). Reste l'étape manuelle : clic sur **Redémarrer** dans le panneau Infomaniak — à faire par l'utilisateur, puis confirmer sur téléphone que (a) le swipe ne décale plus la page, et (b) si l'image "besoin de transport" échoue encore à charger, l'encart "Connexion faible / Toucher pour réessayer" apparaît au lieu de l'icône cassée.

---

## 6.7 Simplification du tableau Freemium/Premium (commit `b52249c`, 5 septembre 2026)

Demande utilisateur : la colonne Freemium affichait des lignes barrées "non inclus" (bruit visuel inutile), et deux lignes ("Vue planning", "Purge RGPD") affichaient un badge texte séparé au lieu du même style coche+libellé que les autres lignes incluses. `components/FreemiumPremiumTable.tsx` réécrit :

- **Freemium** : la colonne ne liste plus que les fonctionnalités réellement incluses (`rows.filter(row => row.free !== false)`) — passe de 14 lignes affichées (dont 3 barrées) à 11 lignes, toutes avec coche verte.
- **"Vue planning" et "Purge RGPD"** : remplacés par une coche + libellé unifié par colonne (`freeLabel`/`premiumLabel` optionnels sur chaque `Row`), avec la portion variable en orange (`Gold`) : Freemium → "Vue planning **Mensuel**" / "Purge RGPD **30 jours**" ; Premium → "Vue planning **Hebdo / Mensuel**" / "Purge RGPD **60 j + 30 j renouvelable**" (le "!" de fin retiré).
- **Renommages** : "Entraide : option besoin SOS" → "Option : changement temporaire d'admin" ; "Chronologie et téléchargement du livret d'hospitalisation" → "... (livret souvenirs)." ; "Documents types (courrier, lettre employeur...)" → "Documents types (courrier école / crèche, lettre employeur, etc.)".
- La branche "Non inclus" (icône croix) de `Cell` est devenue inatteignable côté Freemium suite au filtre, mais reste utilisée telle quelle côté Premium (aucune ligne Premium n'est actuellement `false`).

**Vérifié** par script Playwright contre `/hospitalisation` (page persona réelle — `FreemiumPremiumTable` n'est PAS rendu sur la page d'accueil `/`, seulement sur les 3 pages persona `/hospitalisation`, `/enfant-hospitalise`, `/soin-a-domicile`, piège à ne pas refaire) : 11 items Freemium tous cochés, 14 items Premium avec les libellés unifiés et renommages attendus.

**Déploiement** : commit `b52249c` poussé sur `main`, SSH (`git pull origin main` déjà à jour au moment du déploiement — le premier essai avait déjà tiré et buildé avec succès malgré une erreur d'affichage locale sans rapport avec le serveur ; `npm install && npm run build` → exit 0, 9 routes, confirmé par `git log -1` sur le serveur = `b52249c`). Reste l'étape manuelle : clic sur **Redémarrer** dans le panneau Infomaniak, à faire par l'utilisateur.

---

## 6.8 Photo "Créer votre espace" remplacée dans "Comment ça marche" (commit `99d0d33`, 5 septembre 2026)

Demande utilisateur : remplacer la photo de l'étape 1 ("Créer votre espace") dans `HowItWorks.tsx` par `Créer-un-compte-AvecToi.png` (photo main tenant un téléphone affichant l'écran "Créer un compte", fond flouté du même écran en arrière-plan) — copiée par-dessus `public/how-it-works/creer-un-compte.png` (ancienne image : un simple screenshot plat zoomé sur fond navy).

- Cette nouvelle image est une photo pleine page (comme les 2 autres étapes), pas un screenshot plat sur fond uni — le traitement `imageFit: "contain"` (fond navy + `object-contain p-4`, prévu pour un screenshot flottant sur fond uni) aurait produit un lettrboxing incohérent. Changé en `imageFit: "cover"`, identique aux 2 autres étapes.
- Comme les 3 étapes utilisent désormais `"cover"`, le champ `imageFit` et la branche `"contain"` sont devenus du code mort — supprimés (`imageFit` retiré du type `steps`, `Cell`/style conditionnel simplifiés en un seul rendu `object-cover` sans fond conditionnel).
- **Piège de vérification identique à §6.7** : `HowItWorks` n'est PAS rendu sur la page d'accueil `/`, seulement sur les 3 pages persona. Vérifié via Playwright contre `/hospitalisation`, capture de la carte isolée (`element.screenshot()` en `deviceScaleFactor: 2` plutôt qu'une capture pleine page trop petite pour juger le cadrage) : le crop `object-cover` (image source 1214×1296, quasi carrée, carte cible 4:3) montre bien l'écran du téléphone "Créer un compte" net et la main au premier plan, avec le fond flouté visible en bordure gauche pour la profondeur — cadrage jugé satisfaisant.

**Déploiement** : commit `99d0d33` poussé sur `main`, SSH (`git pull origin main` fast-forward `b52249c..99d0d33`, `npm install && npm run build` → exit 0, 9 routes). Reste l'étape manuelle : clic sur **Redémarrer** dans le panneau Infomaniak.

---

## 6.9 Faux positif "photo cassée" en prod + repositionnement icône/numéro (commit `ccd5f5a`, 5 septembre 2026)

L'utilisateur a re-signalé la même photo que §6.8 comme "toujours pas" corrigée, avec une capture d'écran montrant la carte 1 ("Créer votre espace") affichant uniquement les champs de formulaire flous en arrière-plan, sans le téléphone visible.

**Investigation approfondie — conclusion : c'était un faux positif, pas un bug réel.** Vérifications directes effectuées :
- `curl` sur le HTML brut de `/hospitalisation` en prod : la classe `object-cover` est bien présente, `object-contain` absent — le HTML servi correspond au dernier déploiement.
- `curl` direct sur l'URL `/_next/image?...&w=828` en prod : réponse `x-nextjs-cache: MISS` (génération fraîche, pas de cache périmé), dimensions correctement 828×884 — cohérent avec le fichier source 1214×1296 mis à l'échelle, donc l'image réellement servie est la bonne.
- Capture Playwright isolée (`element.screenshot()`) de la carte, contre l'URL de prod réelle, à deux reprises : montre bien le téléphone avec l'écran "Créer un compte" net et la main au premier plan — un rendu correct, reproductible.
- Conclusion : le déploiement et le crop `object-cover` sont corrects côté serveur. Le rendu vu par l'utilisateur était très probablement une page mise en cache par son propre navigateur (aucune preuve de bug serveur trouvée après vérification exhaustive HTML + image brute + rendu navigateur frais).

**Deuxième demande dans le même message, traitée en parallèle** : rapprocher l'icône (maison/lien/calendrier) et le numéro (1/2/3) de chaque étape — actuellement empilés verticalement sur deux lignes centrées séparées. Remplacé par un badge combiné : le cercle numéroté chevauche maintenant le coin inférieur droit du carré d'icône (`position: absolute`, `-bottom-1 -right-1`, `ring-2 ring-surface` pour détacher visuellement du fond de l'icône), au lieu d'être sur sa propre ligne `mb-3` séparée.

**Déploiement** : commit `ccd5f5a` poussé sur `main`, SSH (`git pull origin main` fast-forward `99d0d33..ccd5f5a`, `npm install && npm run build` → exit 0, 9 routes). Reste l'étape manuelle : clic sur **Redémarrer** dans le panneau Infomaniak — et si le problème de photo persiste malgré tout après un vrai rafraîchissement forcé (Ctrl+F5) du navigateur de l'utilisateur, il faudra creuser plus loin (CDN devant Infomaniak ? autre cause non encore identifiée).

---

## 6.10 Photo "Créer votre espace" affichée en entier, non recadrée (commit `6f4c05d`, 5 septembre 2026)

L'utilisateur a maintenu son signalement après §6.9 et a redonné la même photo en précisant explicitement l'intention : **"On doit voir la photo entière (non zoomée)"**. Vérification faite : le fichier `public/how-it-works/creer-un-compte.png` déployé et le fichier source fourni par l'utilisateur sont bit-identiques (même taille 1 433 862 octets, mêmes dimensions 1214×1296) — donc pas un problème de mauvais fichier ni de cache. Le vrai problème, non identifié dans les rounds précédents, était le choix de crop `object-cover` : la photo (portrait, ratio ≈0,94) recadrée dans une carte au format paysage `aspect-[4/3]` perd une partie significative de sa hauteur, ce qui pouvait couper la partie utile (téléphone/main) selon la largeur d'écran réelle de l'utilisateur.

**Fix** : ajout d'un champ `imageContain: true` sur l'étape "Créer votre espace" uniquement (les 2 autres étapes restent en `object-cover`, ce sont des photos plein cadre déjà bien cadrées). Quand `imageContain` est vrai, l'`<Image>` passe en `object-contain` (photo entière visible, mise à l'échelle sans recadrage) et le conteneur reçoit un fond `var(--color-navy-deep)` pour combler l'espace résiduel (letterbox) sur les côtés — la teinte se fond bien avec l'arrière-plan sombre déjà présent dans la photo elle-même. Vérifié via Playwright (`element.screenshot()`) : le téléphone et la main sont maintenant visibles en entier, sans coupe.

**Déploiement** : commit `6f4c05d` poussé sur `main`, SSH (`git pull origin main` fast-forward `ccd5f5a..6f4c05d`, `npm install && npm run build` → exit 0). Reste l'étape manuelle : clic sur **Redémarrer** dans le panneau Infomaniak.

---

## 6.11 🟡 OUVERT — photo toujours incorrecte sur mobile de l'utilisateur malgré déploiement confirmé correct (5 septembre 2026)

Après le déploiement de `6f4c05d` et redémarrage, l'utilisateur rapporte **toujours** l'ancienne photo sur son mobile (Chrome ET Brave, y compris en navigation privée avec cache vidé). Investigation exhaustive côté serveur, toutes concluantes "correct" :
- Fichier brut `public/how-it-works/creer-un-compte.png` récupéré en direct depuis la prod : bytes identiques au fichier source (1 433 862 octets, 1214×1296), `last-modified` cohérent avec le déploiement.
- HTML de `/hospitalisation` récupéré en direct : contient bien la classe `object-contain` (pas `object-cover`) pour cette étape.
- Variantes de l'optimiseur d'image Next.js (`/_next/image?...&w=...`) testées à plusieurs largeurs mobiles courantes (256/384/640/750/828/1080) : toutes renvoient la photo correcte (vérifié visuellement sur la variante w=828, `x-nextjs-cache: HIT` présent mais contenu correct — pas un cache périmé, juste le cache statique normal de Next).
- DNS de `avectoi.care` interrogé sur 3 résolveurs indépendants (local, Cloudflare 1.1.1.1, Google 8.8.8.8) : tous cohérents, pointent vers le même serveur Infomaniak. `www.avectoi.care` ne résout même pas (NXDOMAIN) — donc pas de piste "vieux sous-domaine".
- Test demandé à l'utilisateur : ouvrir le lien direct de la photo depuis son mobile → **affiche la bonne photo**. Donc son téléphone atteint bien le bon serveur pour cette ressource précise ; seule la page complète semble à la traîne.

**Conclusion à ce stade (non confirmée) : probable proxy de compression réseau (opérateur mobile / ancien "Data Saver" Chrome) qui cache la page HTML indépendamment du cache navigateur** — ce type de couche n'est pas affecté par un vidage de cache ni par la navigation privée, seulement par le réseau utilisé. Complication : le bouton Chrome "Économiseur de données"/"Lite mode" a été retiré par Google d'la plupart des versions récentes de Chrome (~2022), donc l'utilisateur ne l'a pas trouvé dans les réglages — piste non testable telle quelle.

**Test proposé, pas encore fait** (l'utilisateur a repoussé : "on verra plus tard") : comparer le rendu en Wi-Fi vs données mobiles sur le même téléphone. Si la photo diffère entre les deux réseaux, ça confirme une couche réseau externe (opérateur) plutôt qu'un problème site/navigateur. **À reprendre à la prochaine session si le sujet revient** — ne pas re-déboguer le fichier/code/déploiement, qui ont déjà été vérifiés à l'exhaustion et sont confirmés corrects à ce stade ; creuser directement côté réseau mobile de l'utilisateur.

---

## 6.12 Accents visuels sur 3 widgets de la grille de fonctionnalités (commit `473bf00`, 5 septembre 2026)

Demande utilisateur : rendre trois tuiles de `FeatureGrid.tsx` plus concrètes en y intégrant un mini-aperçu de la fonctionnalité, directement dans la ligne icône/titre de la tuile (pas une image de fond).

- Nouveau type `Widget` (`"dark-light" | "google-calendar" | "hebdo-mensuel"`) sur `Feature`, et un composant `FeatureWidget` qui rend, selon le widget : un `SegmentedToggle` générique (pilule à deux segments, un texte neutre + un texte plein navy — réutilisé ensuite pour Prochaine disponibilité et pour le toggle Soin Hospitalier/Domicile de §6.14) pour Dark/Light et Hebdo/Mensuel, ou une vignette carrée recadrée (`object-cover`) de l'icône Google Agenda pour "Ajout au calendrier natif".
- Un `Set` `ICON_ROW_WIDGETS` détermine quels widgets s'affichent dans la ligne icône (par opposition à un futur widget qui serait affiché ailleurs dans la tuile) — à ce stade les 3 nouveaux widgets y sont tous.
- Déployé (SSH, build OK) ; redémarrage fait par l'utilisateur, confirmé en ligne.

---

## 6.13 Trois widgets supplémentaires basés sur une image de référence, rejetés (commits `3197c25` puis `f8f6467`)

Demande utilisateur : sur la base d'une seconde image de référence (`plusieures tuiles-2.png`), ajouter 3 widgets supplémentaires : un mini-calendrier en fond de la tuile héro "Calendrier / créneaux", une carte de statut pour "Nuitées", et un bouton "Prochaine disponibilité" — les 3 réalisés comme des **recadrages d'images fournies** plutôt que du code, conformément au principe déjà établi dans la session (préférer une vraie capture d'app recadrée à une recréation approximative quand l'image de référence montre un détail réaliste précis).

**Retour utilisateur après mise en ligne** : "ça ne va pas ; bien trop gros !" (capture d'écran fournie). Correctif immédiat (`f8f6467`) : plafonds `max-w` ajoutés sur les 3 widgets — déployé et confirmé correct par l'utilisateur sur le moment.

**Rejet complet au tour suivant** (voir §6.14) : malgré le correctif de taille, l'utilisateur a demandé le retrait total des 3 widgets. Les 3 fichiers image (`calendrier-mini-widget.png`, `nuitees-widget.png`, `prochaine-dispo-button.png`) ont été supprimés du repo dans le commit `0b1a07c`.

---

## 6.14 Retrait des 3 widgets image, bouton "Prochaine disponibilité" recodé, toggle Soin Hospitalier/Domicile (commit `0b1a07c`, 5 septembre 2026)

Suite au rejet du §6.13, demande explicite : retirer les 3 widgets image, et les remplacer par un élément codé (pas une image) pour "Prochaine disponibilité", dans le même style visuel que le toggle Dark/Light déjà en place (§6.12). Demande additionnelle dans le même message : ajouter un toggle "Soin Hospitalier / Soin à Domicile" (reprenant ce même style de pilule) sous le texte de chacun des 3 blocs de bascule de contexte persona ("Et si le retour à la maison...", "Après l'hôpital, la présence...", "Un retour à l'hôpital...").

- `FeatureGrid.tsx` : widget `"prochaine-dispo"` ajouté, rendu comme une pilule pleine navy avec icône éclair + texte "Prochaine disponibilité" (pas d'image).
- `components/ContextSwitchCallout.tsx` (un seul composant partagé, rendu identique sur les 3 pages persona — donc une seule modification suffit pour les 3 blocs demandés) : ajout d'un composant interne `ModeToggle`, pilule à deux segments "Soin Hospitalier" / "Soin à Domicile", le segment actif (fond navy, texte blanc) déterminé par une nouvelle prop `targetMode: "domicile" | "hospitalier"`.
- `lib/personas.ts` : nouveau champ `contextSwitch.targetMode` par persona (hospitalisation → "domicile", enfant-hospitalisé → "domicile", soin-a-domicile → "hospitalier"), correspondant à la direction de bascule racontée par le texte de chaque persona.
- Déployé (SSH, build OK) ; redémarrage fait par l'utilisateur, confirmé en ligne.

---

## 6.15 Éclair en orange, bouton au niveau du picto, titres des grandes tuiles à côté du picto (commit `a1b7ead`, 5 septembre 2026)

Retour utilisateur (capture annotée de flèches à la main) après mise en ligne du §6.14 : l'icône éclair du bouton "Prochaine disponibilité" doit être orange (comme dans l'app et sur la page Hospitalisation) plutôt que blanche ; ce bouton doit être au même niveau que le picto de la tuile (pas en dessous) ; et les titres des grandes tuiles (héro + tuiles "wide") doivent être à côté de leur picto plutôt qu'en dessous. Demande complémentaire : appliquer la même organisation aux pages "Enfant hospitalisé" et "Soin à domicile".

- `icons.tsx` : nouvelle `BoltIcon` (path plein, comme `StarIcon`) ; `FeatureWidget` du widget `"prochaine-dispo"` passe l'icône en `text-orange`.
- `FeatureGrid.tsx` : règle de layout généralisée par taille de tuile plutôt que codée en dur par titre — `isBig = feature.size !== "sm"` ; pour toute tuile `lg`/`wide`, icône et titre sont rendus côte à côte sur une seule ligne (`flex items-center gap-3`), un éventuel widget de la ligne icône poussé à droite via `justify-between` ; pour les tuiles `sm`, le comportement précédent (titre sous l'icône) est conservé.
- **Point d'interprétation à l'époque** (résolu depuis, voir §6.16) : la demande "organise les tuiles des pages Enfant hospitalisé et Soin à domicile dans le même ordre que sur la page Hospitalisation" a été comprise à ce stade comme une règle de **style** uniquement (la règle `isBig` ci-dessus s'applique de la même façon, quelle que soit la tuile qui se trouve en position héro/wide sur chaque page), sans toucher aux `featuredFeatures` propres à chaque persona dans `lib/personas.ts` — donc à ce stade les 3 pages avaient toujours des tuiles héro/wide différentes (ex. "Nouvelles du jour" en héro sur Enfant hospitalisé, "Calendrier / créneaux" en héro sur Hospitalisation).
- Déployé (SSH, build OK) ; redémarrage fait par l'utilisateur, confirmé en ligne.

---

## 6.16 Cadre sur le toggle, grille de tuiles strictement identique sur les 3 pages, fond photo sur la tuile Calendrier/créneaux (commit `d09795c`, 5 septembre 2026)

Trois demandes dans le même message :

**a) Cadre sur le toggle Soin Hospitalier/Domicile.** Le toggle ajouté en §6.14 se fondait dans le fond bleu clair du bloc (`bg-blue/5`), peu visible. `ContextSwitchCallout.tsx` : ajout de `border border-border` + `shadow-sm` sur le conteneur du `ModeToggle`.

**b) Grille de tuiles rendue *strictement* identique sur les 3 pages persona.** L'utilisateur a reformulé la demande du §6.15 de façon plus insistante et plus littérale ("je veux les tuiles organisées de la même façon : **identique** à la page Hospitalisation") — signe que l'interprétation "règle de style seulement" du §6.15 ne suffisait pas et qu'il fallait en réalité une identité de **contenu**, pas seulement de mise en forme. `lib/personas.ts` : `featuredFeatures` de `enfant-hospitalise` et `soin-a-domicile` remplacés par le même jeu que `hospitalisation` (`["Calendrier / créneaux", "Nuitées", "Prochaine disponibilité", "Ajout au calendrier natif"]`), au lieu des jeux propres à chaque persona utilisés jusque-là (ex. Enfant hospitalisé mettait en avant "Nouvelles du jour", "Souvenirs", "Mur de soutien" — cette mise en avant spécifique à la persona est donc perdue, arbitrage fait sciemment au vu de l'insistance de la demande, à resignaler à l'utilisateur si jamais ce n'était pas l'intention). Résultat : les 3 pages persona affichent désormais très exactement la même grille, dans le même ordre.

**c) Fond photo sur la tuile héro "Calendrier / créneaux".** Photo fournie par l'utilisateur (tablette sur table en bois, appli calendrier "Septembre 2026" à l'écran) copiée dans `public/screenshots/calendrier-hero-bg.png` (1535×1024). Contrainte explicite de l'utilisateur : **"le texte de la tuile doit être parfaitement lisible."** Traitement retenu dans `FeatureGrid.tsx`, réservé à cette tuile précise via un nouveau flag `hasHeroPhoto` (titre === "Calendrier / créneaux" **et** taille `lg`) :
  - Image en fond (`fill`, `object-cover`) dans un calque `absolute inset-0 z-0`, positionné en premier enfant de la carte.
  - Par-dessus, un voile `bg-[radial-gradient(circle_at_bottom_right,transparent_0%,var(--surface)_55%)]` : opaque (couleur de fond de carte, claire ou sombre selon le thème via la variable CSS `--surface` déjà theme-aware) sur la quasi-totalité de la tuile — donc sous tout le texte, qui reste sur fond plein — et transparent uniquement dans un quart de cercle ancré au coin inférieur droit, là où ni le titre ni le corps de texte ne débordent, pour laisser deviner la photo sans jamais passer derrière une lettre.
  - Choisi plutôt qu'un fond photo pleine tuile ou qu'un dégradé latéral, par prudence : deux tentatives antérieures de refonte visuelle plus poussée de cette grille (style Trello, tuiles-photo) avaient déjà été rejetées par l'utilisateur en amont de session pour être allées trop loin visuellement ; ce traitement en coin, réversible et localisé à une seule tuile, minimise le risque de retour "on ne lit plus le texte".
  - **Vérifié** avant déploiement par capture d'écran zoomée (recadrage + upscale nearest-neighbor via PowerShell/`System.Drawing`) de la tuile sur les 3 pages : titre et corps de texte parfaitement nets sur fond quasi blanc/quasi surface, photo visible uniquement dans le coin bas-droit sans chevaucher aucun caractère.

**Vérification globale avant déploiement** : `tsc --noEmit` + `npm run build` OK, puis serveur de prod local (`next start -p 3005`) + captures Chrome headless des 3 pages persona en entier — grille de tuiles confirmée visuellement identique sur les 3, toggle avec cadre visible, tuile Calendrier/créneaux avec photo lisible.

**Déploiement** : commit `d09795c` poussé sur `main`, SSH (`git pull origin main` fast-forward `a1b7ead..d09795c` propre, `npm install && npm run build` → exit 0, 9 routes). Reste l'étape manuelle habituelle : clic sur **Redémarrer** dans le panneau Infomaniak, à faire par l'utilisateur, puis revérifier HTML+CSS en 200 selon la check-list du §6.2 avant de considérer le déploiement terminé.

---

## 6.17 Rattrapage — hero personas + bouton Télécharger l'app + page /telecharger + CTA Freemium (commits `9b44fd1`, `8ca005c`, 5 septembre 2026)

Deux commits d'une session antérieure jamais couverts par ce handoff (même écueil que d'autres oublis de rattrapage documentés côté app, voir `Handoff/handoff.md`) :

- **`9b44fd1`** : sauts de ligne manuels sur `heroTitle`/`heroSubtitle` des 3 pages persona (`HeroPersona.tsx`, `lib/personas.ts`) pour contrôler le point de wrap plutôt que de laisser le navigateur couper n'importe où.
- **`8ca005c`** : retire le saut de ligne forcé sur le hero "Soin à domicile" (wrap naturel regroupe mieux "proche," et "à la maison") ; ajoute un bouton "Télécharger l'app" dans les 3 hero persona et dans le bloc final `FinalCta.tsx` ; nouvelle page `app/telecharger/page.tsx` (QR code généré via le package `qrcode` à scanner sur desktop, message "bientôt disponible sur le Play Store" sur mobile — lien Play Store réel pas encore prêt) ; bouton "Démarrer gratuitement" ajouté dans le bloc Freemium de `FreemiumPremiumTable.tsx`.

Les deux étaient déjà déployés et redémarrés avant le début de la session couverte par §6.18-6.20 — pas de nouvelle action requise, rattrapage documentaire seulement.

---

## 6.18 Tableau de bord web Phase 1 — connexion, header, calendrier lecture seule (commit `8a53c1c`, 5 septembre 2026)

Demande utilisateur : "il faut mettre à jour le site Infomaniak pour que je puisse avoir accès à la page d'authentification" — le bouton "Se connecter" du site pointait jusque-là vers `https://app.avectoi.care/auth/login`, un domaine qui ne sert en réalité qu'à rediriger vers l'app Android (App Links), sans aucun vrai site derrière. Il n'existait donc aucun moyen de consulter son espace patient depuis un navigateur.

**Livré (Phase 1 du chantier "dashboard web en parité complète avec l'app", voir §7 tâche 7)** :
- `@supabase/ssr` + `@supabase/supabase-js` installés (absents jusque-là du repo `avectoi-site`).
- `proxy.ts` (renommage Next.js 16 de `middleware.ts`) : rafraîchit la session Supabase à chaque requête, redirige `/espace` → `/connexion` si pas de session, et `/connexion` → `/espace` si déjà connecté.
- `lib/supabase/client.ts`/`server.ts` : `flowType: "pkce"`, même pattern que le reset mot de passe de l'app (voir `Handoff/handoff.md` PR #381-384).
- `lib/dashboard/` : `types.ts`, `slotUtils.ts` (copie verbatim depuis `AvecToi/lib/slotUtils.ts`), `featureFlags.ts` — copiés/adaptés depuis l'app mobile, même base Supabase.
- `app/connexion/page.tsx` (`LoginForm.tsx`) : email + mot de passe, `supabase.auth.signInWithPassword`.
- `app/espace/page.tsx` (Server Component) : revérifie la session côté serveur (ne fait jamais confiance au seul `proxy.ts`), fetch `patient_spaces`/`slot_config`/`reservations` (fenêtre ±90 jours), affiche "Aucun espace trouvé" si l'admin n'a pas encore créé d'espace depuis l'app plutôt que de planter.
- `DashboardHeader.tsx` : "Bonjour {admin}", "Bienvenue dans l'espace patient de {patient}", dates de naissance/hospitalisation formatées `toFrShort`.
- `DashboardTabBar.tsx` : 2ème barre d'onglets sous celle du site (Accueil / Nouvelles / Entraide / Soutien / Compte), seul "Accueil" actif, les 4 autres visibles mais grisés "Bientôt disponible" pour ne pas promettre un lien mort.
- `DashboardCalendar.tsx` + sous-composants (`SegmentedSwitch`, `WeekStrip`, `MonthGrid`, `NextAvailability`, `TodaysPlanning`) : bascule Hebdo/Mensuel, **strictement lecture seule** — aucun clic ne déclenche de réservation/modification (prévu pour la Phase 3).
- Déconnexion via Server Action (`app/espace/actions.ts`).

**Recherche préalable — Infomaniak propose-t-il un panneau natif de variables d'environnement ?** Question posée explicitement par l'utilisateur avant de choisir l'approche `.env.local`. Vérifié par inspection SSH directe du serveur (pas de suppositions) :
- `cat /proc/1/environ` du process Node en cours ne contient que la plomberie infra Kubernetes/Infomaniak (`IK_*`, `KUBERNETES_*`, `NODE_VERSION`, `PATH`, `TERM`, `YARN_VERSION`) — rien de spécifique à l'application.
- Aucun fichier `.env*` préexistant nulle part sur le serveur avant cette session, aucune config pm2/superviseur trouvée.
- **Conclusion communiquée à l'utilisateur** : un `.env.local` créé directement sur le serveur via SSH est la solution correcte et pérenne — pas un contournement temporaire — suffisante jusqu'à la mise en service réelle auprès des familles.
- **Réserve à garder en tête** : `.env.local` vit hors Git par design (`.gitignore` l'exclut déjà) — si le répertoire du site Infomaniak est un jour recréé (migration d'hébergement, réinstallation), ce fichier devra être recréé manuellement ; ce n'est pas automatique comme le reste du déploiement Git.
- Variables déployées dans `/srv/customer/sites/avectoi.care/.env.local` (permissions `600`) : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clé publishable, valeur sûre côté client, même projet Supabase que l'app).

**Déploiement** : commit `8a53c1c` poussé sur `main`, SSH (`git pull`, `npm install && npm run build`, exit 0, nouvelles routes `/connexion` (statique) et `ƒ /espace` (dynamique) confirmées dans la sortie de build). Redémarrage Infomaniak fait par l'utilisateur, confirmé en ligne.

---

## 6.19 Photo du patient dans le header du tableau de bord (commit `48a9e90`, 5 septembre 2026)

Retour utilisateur après premier test live du §6.18, avec une capture de l'ancien site Vercel en référence : "ça fonctionne mais ça ne ressemble pas à l'app [...] ajoute la photo du patient au meilleur endroit".

- `lib/dashboard/types.ts` : ajout de `patient_photo_url: string | null` sur `PatientSpace` (champ déjà présent côté app, `AvecToi/lib/types.ts`, simple URL publique Supabase Storage — pas besoin de signature).
- `app/espace/page.tsx` : ajout de `patient_photo_url` au `.select(...)` Supabase.
- `DashboardHeader.tsx` : avatar circulaire (photo si présente, sinon initiale du prénom sur fond navy) placé à gauche du bloc de bienvenue — adapté du placement de l'app (`AvecToi/components/SpaceHeader.tsx`, photo + anneau décoratif au-dessus du titre en vertical mobile) à la disposition horizontale du header web (carte, desktop).
- Choix technique : balise `<img>` brute plutôt que `next/image`, `next.config.ts` n'ayant pas de `images.remotePatterns` configuré pour le domaine Supabase Storage — éviter de reconfigurer l'optimiseur d'image pour un changement mineur.

**Déploiement** : commit `48a9e90` poussé sur `main`, SSH (`git pull` fast-forward `8a53c1c..48a9e90`, build exit 0). Redémarrage Infomaniak fait par l'utilisateur, confirmé en ligne.

---

## 6.20 Calendrier du tableau de bord aligné visuellement sur l'app, thème clair conservé (commit `63bc1af`, 5 septembre 2026)

Retour utilisateur, avec deux captures en comparaison directe (web actuel vs app réelle) : "garde le thème light mais la page doit ressembler à l'app. Le calendrier ne ressemble pas du tout." Le calendrier web (Phase 1, §6.18) n'affichait que de simples pastilles de statut sur fond neutre, quand l'app affiche des tuiles pleines colorées, un bouton bascule plein et une navigation mois resserrée.

**Travail préalable** : lecture directe du code source de l'app (`AvecToi/components/HomeCalendarScreen.tsx`, `AvecToi/lib/themes.ts`, `AvecToi/components/WeekStrip.tsx`, en lecture seule — ce repo n'est jamais modifié) pour extraire les **vraies** valeurs de couleur et la vraie logique de statut, plutôt que d'approximer depuis la capture d'écran seule.

**Bug de logique découvert au passage** : `DashboardCalendar.tsx` passait `TODAY` comme paramètre `startDate` de `getDayStatus()` — cette fonction traite `startDate` comme une borne **structurelle** (début d'espace, jour de semaine autorisé, date bloquée), pas comme "aujourd'hui". En lui passant `TODAY`, tout jour passé retombait systématiquement en statut générique `"past"`, perdant l'occupation réelle (plein/partiel/vide) que l'app continue d'afficher (grisée, mais informative) pour les jours passés. Corrigé : `startDate` passé aux enfants est désormais le début de la fenêtre de fetch (±90 jours), et un `isPast` séparé (`iso < todayIso`) ne sert plus qu'au grisage visuel (`opacity-30`), exactement comme `HomeCalendarScreen.tsx` sépare les deux notions.

**Légende corrigée** : l'hypothèse initiale de la Phase 1 ("teal = libre / gold = partiel / orange = complet", en pastilles) ne correspondait pas à l'app. Vraie légende reprise telle quelle : **Dispo** (pastille verte, uniquement sur les jours `"empty"`) / **Partiel** (tuile entière en orange pastel) / **Complet** (tuile entière en rose-rouge pastel).

**Fichiers modifiés** :
- `app/globals.css` : nouveaux tokens `--color-cal-accent` (#2c4c7c), `--color-cal-gold` (#b8860b), `--color-cal-success` (#0e9488), `--color-cal-orange-fill` (#ffdfba), `--color-cal-danger-fill` (#ffb3ba), `--color-cal-navy-text` (#22436b) — valeurs reprises telles quelles du thème clair de l'app plutôt que les tokens marketing existants, pour une vraie parité sémantique (pas seulement visuelle).
- `SegmentedSwitch.tsx` : pilule pleine largeur (`flex-1` par segment) avec fond navy (`bg-cal-accent`) sur le segment actif, au lieu d'un toggle compact à fond orange.
- `NextAvailability.tsx` : transformé en bouton cliquable pleine largeur, fond navy, "⚡ Prochaine disponibilité" + date — nouvelle prop `onJump?: (date: Date) => void` qui fait sauter le calendrier à cette date au clic (navigation en lecture seule uniquement, toujours aucune réservation possible depuis le web).
- `MonthGrid.tsx` / `WeekStrip.tsx` : réécrits en tuiles (au lieu de simples pastilles) reproduisant la logique exacte de l'app — fond `--color-cal-orange-fill`/`--color-cal-danger-fill` selon le statut, texte en `--color-cal-navy-text` sur fond teinté, contour doré (`--color-cal-gold`) épaissi sur "aujourd'hui", pastille verte uniquement sur les jours `"empty"`, opacité 30% sur les jours grisés (passés ou bloqués) ; libellés de jour sur une seule lettre (`L M M J V S D`, comme `AvecToi/lib/themes.ts`/`WeekStrip.tsx`) au lieu des noms complets ; flèches `‹`/`›` resserrées en boutons carrés centrés autour du libellé du mois/semaine, au lieu d'être plaquées aux bords de la carte.
- `DashboardCalendar.tsx` : bascule Hebdo/Mensuel déplacée sur sa propre ligne pleine largeur sous le titre (au lieu d'être en ligne avec lui), ordre aligné sur l'app (bascule → bouton Prochaine disponibilité → grille → légende), état `anchor` maintenant piloté aussi par le clic sur "Prochaine disponibilité".

**Vérification avant déploiement** : `npm run build` local (exit 0, TypeScript OK, mêmes 12 routes qu'avant). Pas de vérification Playwright en session connectée cette fois — `/espace` nécessite une session Supabase Auth réelle (identifiants admin), non disponibles dans l'environnement d'exécution de Claude ; vérification visuelle en conditions réelles laissée à l'utilisateur après déploiement, comme pour les écrans de l'app mobile (pas d'accès device/session de test, voir aussi le principe équivalent côté app dans `Handoff/handoff.md`).

**Déploiement** : commit `63bc1af` poussé sur `main`, SSH (`git pull` fast-forward `48a9e90..63bc1af`, `npm install && npm run build` → exit 0). Redémarrage Infomaniak fait par l'utilisateur, puis revérifié par `curl` : HTML de `/connexion` et ses chunks CSS/JS (`_next/static/chunks/...`) tous confirmés 200 — aucune répétition de l'incident §6.2.

---

## 6.21 Photo de fond tuile Nuitées, dézoom desktop, icône lune orange, photo incrustée tuile Souvenirs (commits `cb7d445` et `36f4c22`, 6 septembre 2026)

**a) Photo de fond sur la tuile "Nuitées" (commit `cb7d445`).** Demande utilisateur : ajouter une photo (chambre d'hôpital, lit accompagnant + lit patient, fenêtre avec ciel nocturne) en fond de la tuile "Nuitées", "même type de rendu que le bloc Calendrier/créneaux" (§6.16.c), avec deux contraintes explicites : **"les 2 lits doivent être visibles"** et **"le texte du bloc doit être parfaitement lisible"**.

- Photo fournie copiée telle quelle dans `public/screenshots/nuitees-hero-bg.png`, aucun traitement nécessaire (cadrage géré uniquement via `object-fit`/`object-position` CSS).
- **Le voile en dégradé radial du bloc héro (§6.16.c) a été essayé puis abandonné** : ce voile est pensé pour un texte confiné à une moitié de la tuile (le coin opposé reste dégagé) — sur la tuile "Nuitées" (`wide`, texte pleine largeur), un dégradé diagonal plus fort côté texte effaçait visuellement le lit côté gauche de la photo, violant la contrainte "les 2 lits visibles". Remplacé par un voile uniforme plein-cadre `linear-gradient(to_bottom, rgba(6,14,28,0.5), rgba(6,14,28,0.62))` + texte et icône forcés en blanc (`hasNuiteesPhoto` dans `FeatureGrid.tsx`) — les deux lits restent visibles à travers le voile sombre uniforme, sur les deux thèmes clair/sombre du visiteur (le voile est un rgba fixe, pas theme-aware comme le `--surface` du bloc héro, choix délibéré pour garantir un contraste texte/fond constant quel que soit le thème).
- Flag dédié `hasNuiteesPhoto` (titre === "Nuitées"), séparé du flag `hasHeroPhoto` du bloc héro — les deux tuiles ont un traitement visuellement différent malgré la consigne initiale "même rendu", écart assumé et justifié par la contrainte de lisibilité ci-dessus.

**Déploiement** : commit `cb7d445` poussé sur `main`, SSH (build OK). Voir §6.22 pour un incident de déploiement rencontré à ce moment (tâches SSH tuées sans sortie), résolu depuis.

**b) Trois retouches sur retour utilisateur (commit `36f4c22`), après confirmation "la version mobile est parfaite" :**
- **Dézoom desktop uniquement**, pour laisser deviner un bout de la fenêtre au-dessus des lits sur grand écran (la version mobile, déjà jugée correcte par l'utilisateur, n'est pas touchée) : `lg:min-h-[200px]` ajouté sur le conteneur de la tuile (augmente la hauteur de la carte uniquement à partir du breakpoint `lg`, donc uniquement desktop) + `objectPosition: "50% 62%"` sur l'image. Raisonnement : avec `object-fit: cover`, agrandir la hauteur de la boîte tout en gardant la même largeur réduit le facteur d'échelle de l'image, ce qui révèle proportionnellement une tranche verticale plus haute de la photo source — pas besoin de `transform`/`scale`, la géométrie de `cover` fait le travail seule.
- **Icône lune recolorée en orange** (même orange que le badge "Le plus utilisé") : `MoonIcon` (`components/icons.tsx`) est une icône en contour (`stroke="currentColor" fill="none"`, pas de remplissage) — recolorer "juste les contours" demandé par l'utilisateur revient donc simplement à passer la classe `text-orange` sur le conteneur de l'icône, déjà le mécanisme standard de couleur des icônes du projet.
- **Tuile "Souvenirs" : photo incrustée en dégradé sur la partie droite du bloc**, "exactement comme la tuile Calendrier/créneaux". Nouvelle photo fournie (3 photos souvenirs — papillon, plat de satay, dessert — sur fond plat clair uniforme) traitée en deux temps :
  1. **Suppression du fond plat** (demande explicite : "pour qu'il n'y ait pas de trait de contour d'image qui parasite le rendu") via un script Python maison (`remove_bg.py`, Pillow + numpy) : flood-fill à 4-connexité partant des pixels de bordure proches de la couleur de fond (`~(240,246,251)`, tolérance euclidienne 18), restreint à la composante connexe touchant les bords — évite d'effacer par erreur des zones claires *à l'intérieur* des photos elles-mêmes. Alpha lissé par un flou de boîte maison (cumsum numpy) pour un contour anti-crénelé, image recadrée à la boîte englobante du contenu opaque +12px de marge. **`scipy.ndimage` bloqué par une stratégie de contrôle d'application Windows** (`DLL load failed... Une stratégie de contrôle d'application a bloqué ce fichier`) — aucune tentative de contournement de cette politique de sécurité, tout réécrit en numpy pur (dilatation 4-connexe par décalages de tableau, flou de boîte par cumsum) à la place. Résultat : `public/screenshots/souvenirs-carousel.png`, RGBA, transparence vérifiée programmatiquement (valeurs alpha lues pixel par pixel), pas seulement à l'œil (un rendu PNG transparent sur fond blanc peut tromper une simple relecture visuelle).
  2. **Incrustation** dans `FeatureGrid.tsx` via un nouveau flag `hasSouvenirsPhoto` (titre === "Souvenirs (galerie photo)" et taille `sm`), même formule de voile que le bloc héro (`bg-[radial-gradient(circle_at_bottom_right,transparent_0%,var(--surface)_55%)]`) — cette fois réutilisable telle quelle sans l'adaptation faite pour Nuitées, car le texte de cette tuile `sm` est bien confiné à la partie gauche, exactement le cas d'usage pour lequel ce voile avait été conçu (§6.16.c). Titre et paragraphe contraints en largeur (`max-w-[70%]`/`max-w-[65%]`) pour ne jamais chevaucher la photo révélée en bas-droite — piège rencontré une fois en cours de route (titre "photo)" débordant sur l'image sur un premier essai sans cette contrainte), corrigé avant déploiement.

**Vérification avant déploiement** : dev server local + Playwright (captures isolées de chaque tuile en desktop 1440px et mobile 390px, puis capture de la grille complète en contexte avec les tuiles voisines) — fenêtre visible en haut de la tuile Nuitées sur desktop, 2 lits toujours visibles, icône lune orange, texte blanc net ; version mobile inchangée par rapport à avant (fenêtre déjà visible, 2 lits visibles) ; tuile Souvenirs : titre sur 2 lignes entièrement à gauche, photo révélée en bas-droite sans trait de contour rectangulaire visible, grille complète sans régression de mise en page sur les tuiles voisines ("Prochaine disponibilité" sous Nuitées, etc.).

**Déploiement** : commit `36f4c22` poussé sur `main`, SSH (`git pull` fast-forward `cb7d445..36f4c22`, `npm install && npm run build` → build réussi, 11 routes compilées, `git log -1` confirmé sur le serveur = `36f4c22`). Reste l'étape manuelle habituelle : clic sur **Redémarrer** dans le panneau Infomaniak, à faire par l'utilisateur.

---

## 6.22 Incident résolu — tâches de déploiement SSH tuées sans sortie capturée (6 septembre 2026)

Pendant le déploiement du §6.21, plusieurs lancements successifs de `deploy_ssh.py` en arrière-plan (dans l'environnement d'exécution de Claude, pas côté Infomaniak) se sont terminés en statut **"killed"** côté outillage Claude Code, avec un fichier de sortie **totalement vide** à chaque fois — y compris pour une tentative ayant tourné plus de 10 minutes, largement assez pour qu'un `npm run build` réel se termine.

**Cause** : sortie standard de Python **totalement bufferisée** (pas ligne-par-ligne) quand `stdout` n'est pas un vrai terminal — ce qui est le cas dès que le process tourne en arrière-plan/redirigé dans cet outillage. Les `print()` du script s'accumulaient dans un tampon interne jamais vidé sur le disque avant que le process ne soit interrompu par l'environnement, donnant l'illusion trompeuse que le script "ne faisait rien" ou avait échoué immédiatement, alors qu'il progressait réellement côté serveur (confirmé après coup : un `git pull` d'un essai antérieur était bien passé, un `npm install` avait bien tourné).

**Correctif** : `python -u` (mode non-bufferisé) + `flush=True` explicite sur chaque `print()` du script `deploy_ssh.py` (repris dans le scratchpad de session, pas encore reversé dans un emplacement permanent du repo — le script vit dans le dossier scratchpad temporaire de Claude, recréé à chaque session si besoin). Avec ce correctif, la sortie apparaît progressivement dans le fichier log même si le process est interrompu en cours de route, ce qui a permis de confirmer qu'un essai avait bien été tué pendant le build lui-même (`next build` / Turbopack en cours), et que l'essai suivant (reprenant avec `npm install` déjà en cache côté serveur) est allé jusqu'au bout avec succès.

**Aucune donnée serveur perdue ni corrompue** — chaque tentative interrompue relance simplement `git pull && npm install && npm run build` depuis le début ; `git pull` sur un dépôt déjà à jour ne fait rien, `npm install` est quasi instantané si `node_modules` est déjà à jour, donc relancer plusieurs fois est sans risque, juste redondant en temps.

**À reprendre en cas de nouvel épisode "killed" + sortie vide** : ne pas conclure trop vite à un échec réel du déploiement — toujours relancer `deploy_ssh.py` (avec `-u` + `flush=True`, déjà en place) et lire le fichier de log au fur et à mesure, plutôt que d'attendre la fin du process pour juger.

---

## 7. Suite du plan (PRD v4 §8, ordre des tâches)

| # | Tâche | Statut |
|---|---|---|
| 1 | Déploiement Infomaniak (Hello World en prod) | ✅ Fait, y compris le bug de mise à jour live résolu (§6) |
| 2 | Connexion Supabase Auth (`/connexion`) | ✅ Fait le 5/09 (voir §6.18) — admin uniquement, visiteurs PIN hors scope |
| 3 | — | — |
| 4 | Freemium/Premium + grille de fonctionnalités | ✅ Fait, corrigé PRD v4, passage design fait, différenciation des plans affinée le 4/09 (voir §6.3) — PRD v4 mis à jour en conséquence ; widgets de tuile + grille identique sur les 3 pages persona + fond photo tuile héro affinés le 5/09 (voir §6.12-6.16) ; photo tuile Nuitées + dézoom desktop + icône lune orange + photo tuile Souvenirs affinés le 6/09 (voir §6.21) |
| 5 | `/onboarding` | ⏳ Pas commencé |
| 6 | Stripe `/upgrade` + webhook | ⏳ Pas commencé |
| 7 | `/espace` — parité complète avec l'app | 🟡 Phase 1 livrée le 5/09 (voir §6.18-6.20) : connexion, header + photo patient, calendrier lecture seule aligné visuellement sur l'app. Restent : Phase 2 (contenu réel des 4 onglets grisés Nouvelles/Entraide/Soutien/Compte), Phase 3 (réservation/modification depuis le web), Phase 4 (édition des paramètres), Phase 5 (Souvenirs/intervenants/alertes) |
| 8 | `/invite` — résolution du lien profond | 🟡 Squelette de route existant, logique non implémentée |
| 9 | Sections restantes de la landing | 🟡 Home/persona pages posées, contenu à enrichir au fil de l'eau |
| 10 | Mentions légales / confidentialité | 🟡 Pages créées (`app/mentions-legales`, `app/confidentialite`), contenu à relire/valider juridiquement |
| 11 | Recette complète du funnel | ⏳ Pas commencé (dépend de 2, 5, 6) |

Autres tâches en suspens :
- `README.md` du repo `avectoi-site` : encore le boilerplate générique `create-next-app`, jamais personnalisé
- Upgrade Supabase Pro (~25$/mois) : pas fait, bloque le lancement commercial (le tier gratuit se met en pause après une semaine d'inactivité — inacceptable en pleine hospitalisation)
- Toutes les captures utiles du dossier `Visuels/` sont maintenant utilisées dans `AppShowcase.tsx` (15 écrans) — plus de captures orphelines à ce jour
- Deux photos candidates au bandeau (mains jointes ; famille tête contre tête au lit) restent dans le dossier scratchpad de session, pas encore intégrées au repo — à placer dans `public/` le jour où un usage précis est décidé ailleurs sur le site
- Photo du bandeau d'accueil (`public/hero-visite.png`) fournie directement par l'utilisateur, origine/licence non documentée par Claude (pas une recherche libre de droits aboutie) — à vérifier par l'utilisateur si besoin d'une preuve de droits d'usage commercial
- **`/srv/customer/sites/avectoi.care/.env.local`** (variables Supabase du dashboard, voir §6.18) vit hors Git par design — si le répertoire du site est un jour recréé sur Infomaniak (migration, réinstallation), ce fichier ne reviendra pas tout seul avec un `git pull` et devra être recréé manuellement en SSH avant que `/connexion`/`/espace` ne refonctionnent

---

## 8. Pièges déjà rencontrés (pour ne pas les refaire)

- **Repo Git privé + déploiement Infomaniak** : ne jamais proposer de rendre le repo public comme solution par défaut — toujours vérifier d'abord qu'aucun secret n'est committé (`git grep` sur les patterns de clés/tokens), puis privilégier un token fine-grained en lecture seule.
- **Commande de build Infomaniak** : toujours inclure `npm install &&` explicitement dans la commande de build — l'option "réinstaller les dépendances" du dialogue de build ne s'est pas comportée comme un `npm install` fiable à chaque build.
- **Ne pas confondre la console "Exécution" et la console "Build"** sur Infomaniak — ce sont deux flux de logs séparés, l'erreur `next: not found` apparaissait dans les deux mais la cause était uniquement visible côté Build.
- **Le bouton "Build" d'Infomaniak ne fait pas de `git pull`** — il rebuild le checkout local tel quel. Sans pull explicite (SSH ou autre), Build+Redémarrer peut donner l'impression que "rien ne se passe" alors que le build a bien tourné, juste sur du code périmé. Toujours vérifier le commit réellement checkouté (`git log --oneline` en SSH) avant de chercher un problème de cache.
- **`x-nextjs-cache: HIT` dans les headers HTTP n'est pas un signal fiable de "vieux contenu"** — c'est le cache normal de Next.js pour du contenu statique/ISR, présent même juste après un déploiement à jour. Le vrai test est de comparer le contenu du HTML servi (`curl` + `grep` sur un marqueur connu du changement) avec ce qui est attendu, pas le header de cache seul.
- **Un HTML à jour ne garantit pas que ses assets (CSS/JS) sont servis correctement** — après un déploiement (build + Redémarrer), le HTML peut référencer le bon fichier CSS (hash à jour) alors que ce fichier renvoie 404 en réalité, cassant toute la présentation du site (voir incident §6.2). Toujours vérifier par `curl -I` que le CSS lié dans le HTML renvoie bien 200, pas seulement que le HTML contient le bon contenu. Si 404 persistant malgré un build confirmé correct sur disque, recliquer sur **Redémarrer** une seconde fois avant de creuser plus loin.
- **Un utilisateur qui signale "toujours le même bug" après une vérification serveur exhaustive (curl HTML, curl fichier brut, DNS multi-résolveurs) n'a pas forcément tort** — voir §6.11 : tout était confirmé correct côté serveur, y compris testé par l'utilisateur lui-même sur son propre réseau (lien direct de l'image = correct), et pourtant la page complète restait fausse sur son mobile en Chrome ET Brave, même en navigation privée. Ce pattern précis (ressource brute correcte, page complète non-fiable, insensible au vidage de cache/navigation privée) pointe vers une couche réseau externe au navigateur (proxy de compression opérateur mobile) plutôt qu'un vrai bug côté site — mais ne pas conclure ça sans avoir d'abord vérifié aussi rigoureusement que dans ce cas précis.
- **`getDayStatus()` (copié verbatim depuis `AvecToi/lib/slotUtils.ts`) traite `startDate` comme une borne structurelle (début d'espace/jour de semaine autorisé/date bloquée), pas comme "aujourd'hui"** — lui passer `TODAY` comme le faisait la Phase 1 initiale du dashboard (§6.18) collapse tout jour passé en statut générique `"past"` et fait perdre l'occupation réelle (plein/partiel/vide) que l'app continue d'afficher, grisée, pour les jours passés (voir §6.20 pour le correctif : passer la borne du fetch ±90 jours à `getDayStatus`, et calculer `isPast`/le grisage séparément contre `TODAY`, exactement comme `HomeCalendarScreen.tsx` le fait côté app).
- **Un statut "killed" + sortie vide sur une tâche de déploiement SSH en arrière-plan n'est pas forcément un échec réel du déploiement** (voir §6.22) — cause identifiée : `stdout` Python totalement bufferisé quand la sortie n'est pas un vrai terminal, donnant l'illusion que rien ne s'est passé alors que le `git pull`/`npm install`/`npm run build` progressait réellement côté serveur. Toujours lancer `deploy_ssh.py` avec `python -u` et des `print(..., flush=True)` (déjà en place dans le script du scratchpad) pour voir la progression réelle en cas de coupure, et ne relancer que si le log confirme une interruption avant la fin — relancer plusieurs fois est de toute façon sans risque (`git pull`/`npm install` idempotents).
- **Aucun accès à une session Supabase Auth admin réelle depuis l'environnement d'exécution de Claude** — impossible de vérifier `/espace` par Playwright en conditions connectées (contrairement aux pages publiques du site). Toute modification visuelle de `/espace`/`DashboardCalendar` doit être vérifiée par lecture de code + `npm run build` + comparaison avec le code source de l'app, puis confirmée par l'utilisateur après déploiement — même principe que l'absence d'accès device pour l'app mobile.
