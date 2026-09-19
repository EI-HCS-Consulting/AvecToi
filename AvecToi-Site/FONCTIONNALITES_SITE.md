# Fonctionnalités du site avectoi.care

**Dernière mise à jour : 19 septembre 2026** — reflète l'état réel du code dans `avectoi-site` (commit `adb1ae4`, PR #1 mergée), pas les intentions futures (celles-ci sont dans le PRD).

⚠️ Ce document n'a pas suivi en détail toutes les évolutions du dashboard `/espace` (Nouvelles, réservation, Entraide) livrées entre le 5 et le 19 septembre — seules les lignes ci-dessous ont été corrigées à cette date. Pour le détail complet et à jour de `/espace`, voir `HANDOFF_SITE.md` §6.18 à §6.32.

---

## 1. Pages

| Route | Fichier | Rôle | Statut |
|---|---|---|---|
| `/` | `app/page.tsx` | Accueil : bandeau photo + hero + choix de persona + carrousel de captures d'écran | ✅ Fonctionnel |
| `/hospitalisation` | `app/hospitalisation/page.tsx` | Page SEO persona "Hospitalisation" | ✅ Fonctionnel |
| `/enfant-hospitalise` | `app/enfant-hospitalise/page.tsx` | Page SEO persona "Enfant hospitalisé" | ✅ Fonctionnel |
| `/soin-a-domicile` | `app/soin-a-domicile/page.tsx` | Page SEO persona "Soin à domicile" | ✅ Fonctionnel |
| `/confidentialite` | `app/confidentialite/page.tsx` | Politique de confidentialité | 🟡 Existe, contenu à relire |
| `/mentions-legales` | `app/mentions-legales/page.tsx` | Mentions légales | 🟡 Existe, contenu à relire |
| `/invite` | `app/invite/page.tsx` | Résolution de lien d'invitation profond : garde la redirection app-store par défaut, ajoute un lien "Continuer sur le web" vers `/entraide/[token]` | ✅ Fonctionnel |
| `/connexion` | `app/connexion/page.tsx` | Connexion admin (Supabase Auth) | ✅ Fonctionnel |
| `/espace` | `app/espace/page.tsx` | Dashboard admin connecté : header/photo patient, calendrier (lecture + réservation + modification/annulation + `.ics`), Nouvelles | ✅ Fonctionnel — voir HANDOFF_SITE.md §6.18-6.26/§6.30-6.31 |
| `/espace/[token]` | `app/espace/[token]/page.tsx` (via `SpaceEntryGate.tsx`) | Même dashboard que `/espace`, accessible sans compte via token (visiteur ou admin) ; identification directe, sans étape de choix redondante | ✅ Fonctionnel — voir HANDOFF_SITE.md §6.31 |
| `/entraide/[token]` | `app/entraide/[token]/page.tsx` | Mur d'entraide (besoins, courses, checklists, transport, relais) accessible sans compte via token, admin + visiteurs PIN | ✅ Fonctionnel — voir HANDOFF_SITE.md §6.29 |
| `/signup`, `/login` | — | Auth Supabase visiteur/inscription | ❌ Pas encore créées |
| `/onboarding` | — | Création d'espace après inscription | ❌ Pas encore créée |
| `/upgrade` | — | Paiement Stripe Freemium → Premium | ❌ Pas encore créée |

Les 3 pages persona partagent la même composition de sections (voir §2), seul le contenu (`lib/personas.ts`) change.

---

## 2. Composants (`components/`)

| Composant | Rôle | Utilisé sur |
|---|---|---|
| `SiteHeader.tsx` | Header sticky : logo + nav personas + CTA connexion/inscription | Toutes les pages (via `layout.tsx`) |
| `SiteFooter.tsx` | Footer | Toutes les pages |
| `HeroPersona.tsx` | Bandeau hero dégradé navy, titre/sous-titre + CTA, pour les pages persona | `/hospitalisation`, `/enfant-hospitalise`, `/soin-a-domicile` |
| `PersonaCard.tsx` | Carte cliquable vers une page persona | `/` (accueil) |
| `HowItWorks.tsx` | 3 étapes "Comment ça marche" avec icônes/couleurs de marque | Pages persona |
| `FeatureGrid.tsx` | Grille des fonctionnalités de l'app, avec mise en avant des features clés de la persona en premier | Pages persona |
| `FreemiumPremiumTable.tsx` | Tableau comparatif Freemium vs Premium | Pages persona |
| `ContextSwitchCallout.tsx` | Encart expliquant le changement de mode de suivi (hôpital ↔ domicile) sans perte de données | Pages persona |
| `SecurityRgpd.tsx` | Section sécurité/RGPD (purge automatique, chiffrement, etc.) | Pages persona |
| `FinalCta.tsx` | Bandeau final d'appel à l'action (dégradé navy + CTA orange) | Pages persona |
| `AppShowcase.tsx` | Carrousel de 15 captures d'écran réelles de l'app, affichage 3-par-3, glissement par page (flèches/swipe/autoplay), clic sur une capture → lightbox plein écran | `/` (accueil) |

---

## 3. Logique métier partagée (`lib/`)

### `lib/site.ts`
- `FREE_TRIAL_DAYS = 7` — durée de l'essai gratuit Freemium (remplace l'ancien cap de 8 réservations)
- `APP_BASE_URL` — URL de base de l'app pour les liens `login`/`signup`/`upgrade`
- `links` — objet centralisant les URLs vers `${APP_BASE_URL}/auth/...`

### `lib/personas.ts`
Définit les 3 personas (`hospitalisation`, `enfant-hospitalise`, `soin-a-domicile`), chacun avec :
- `label`, `shortPitch`, `heroTitle`, `heroSubtitle`
- `featuredFeatures` — sous-ensemble de `FeatureGrid` mis en avant pour cette persona
- `contextSwitch` — texte expliquant la bascule de mode de suivi

`getPersona(slug)` — lookup par slug, utilisé dans chaque page persona.

---

## 4. Contenu produit reflété sur le site (doit rester synchronisé avec l'app)

Ces chiffres/règles viennent de l'app et **doivent être mis à jour ici si l'app change** (sinon le site ment sur ce qu'il vend) :

- **Essai Freemium : 7 jours roulants** depuis la première réservation "Visite" (`FREE_TRIAL_DAYS`)
- **Partage (invite lien/QR/code dossier) : gratuit**, disponible dès le Freemium
- **RGPD : purge automatique à 60 jours d'inactivité**, avec prolongation gratuite de 30 jours
- **Mode Intervenant : absent du site** (masqué dans l'app depuis PR #291, `INTERVENANT_ROLE_ENABLED=false`) — ne pas le réintroduire dans le contenu marketing sans vérifier que le flag est réactivé côté app
- **Mode clair/sombre** : présent sur le site (automatique via `prefers-color-scheme`, pas de toggle manuel comme dans l'app)
- Prix Premium affiché dans `FinalCta.tsx` : "5,99 € une seule fois, sans abonnement" — **non revérifié cette session**, à confirmer avant tout lancement commercial réel

---

## 5. Ce qui manque pour un funnel de vente complet

Dans l'ordre logique de dépendance :
1. Auth Supabase (`/signup`, `/login`) — bloque tout le reste
2. `/onboarding` — création d'espace après inscription
3. Intégration Stripe Checkout + webhook — bloque la conversion Freemium → Premium réelle
4. `/dashboard` en parité complète — gros chantier, permet de gérer l'espace depuis le web sans l'app
5. Résolution complète de `/invite` — permet à un lien d'invitation envoyé par un admin de rediriger correctement vers l'app ou le web selon le contexte
6. Recette de bout en bout une fois 1-5 posés

Voir `HANDOFF_SITE.md` §7 pour le suivi détaillé tâche par tâche.
