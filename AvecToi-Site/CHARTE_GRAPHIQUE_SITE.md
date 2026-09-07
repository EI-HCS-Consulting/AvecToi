# Charte graphique — site avectoi.care

**Dernière mise à jour : 3 septembre 2026.** Source de vérité technique : `avectoi-site/app/globals.css`. Ce document explique et documente ces valeurs, ne les duplique pas ailleurs — en cas de divergence, le CSS fait foi.

Le site reprend la charte de l'app (logo, couleurs), avec quelques compléments propres au web (typographies, mode clair/sombre automatique).

---

## 1. Logo

**Fichier correct : `icon.png`** (dans `AvecToi/assets/`, copié dans `avectoi-site/public/icon-512.png`) — 4 personnages colorés en cercle autour d'un lit, d'un calendrier et d'un cœur.

⚠️ **Piège rencontré** : il existe une variante `icon-sans-512.png` dans `avectoi-site/public/` — celle-ci **n'a pas le lit**, juste le calendrier/l'horloge. Elle a été utilisée par erreur dans le header et le hero lors du scaffold initial (corrigé le 3/09/2026). **Ne jamais utiliser `icon-sans-512.png` pour représenter le logo AvecToi** — la garder seulement si un usage futur la nécessite explicitement (icône minimaliste dans un contexte très contraint en espace, par ex.).

Couleurs des 4 personnages du logo (approximatives, lues visuellement) :
- Haut-gauche : bleu navy
- Haut-droite : teal/turquoise
- Bas-gauche : orange/doré
- Bas-droite : violet

Ces 4 couleurs ont été formalisées en tokens CSS (§2) pour pouvoir les réutiliser dans le design du site (ex. `HowItWorks.tsx`), et ainsi "rappeler l'app" visuellement au-delà du seul logo.

---

## 2. Couleurs (tokens CSS, `app/globals.css`)

### Palette de marque (fixe, indépendante du thème clair/sombre)
| Token | Valeur | Usage |
|---|---|---|
| `--color-navy-deep` | `#0d1b2e` | Fonds dégradés sombres (hero, CTA final) |
| `--color-navy` | `#1f3864` | Couleur primaire (boutons, titres, header) |
| `--color-blue` | `#2e75b6` | Accent secondaire, hover |
| `--color-orange` | `#f97316` | CTA principaux, accent chaleureux |
| `--color-gold` | `#f0b429` | Eyebrow text, accents dorés |
| `--color-teal` | `#14919b` | **Ajouté 3/09/2026** — reprend le teal du logo, utilisé dans `HowItWorks` |
| `--color-purple` | `#7c4fa6` | **Ajouté 3/09/2026** — reprend le violet du logo, disponible pour usages futurs (pas encore utilisé dans un composant) |

### Palette adaptative (change selon le thème clair/sombre)
| Token | Clair | Sombre | Usage |
|---|---|---|---|
| `--background` | `#f7f8fa` | `#0d1b2e` | Fond de page |
| `--foreground` | `#0d1b2e` | `#f4f6f9` | Texte principal |
| `--surface` | `#ffffff` | `#16294a` | Fond des cartes |
| `--surface-muted` | `#eef1f5` | `#142440` | Fond des zones secondaires |
| `--border` | `#dde3ea` | `#263c63` | Bordures |
| `--muted` | `#5b6b80` | `#9fb0c6` | Texte secondaire |

Le tout est exposé à Tailwind via `@theme inline` (Tailwind v4) — les classes `bg-navy`, `text-orange`, `border-teal`, etc. sont directement utilisables dans le JSX sans configuration supplémentaire.

---

## 3. Mode clair/sombre

**Automatique, pas de toggle manuel** — basé sur `@media (prefers-color-scheme: dark)`, détecte le réglage OS du visiteur. C'est une différence assumée avec l'app, qui propose un switch Dark/Light manuel dans "Mon Compte" (voir capture `Mon_Compte.png` dans `Downloads/Visuels/`).

Décision utilisateur (2/09/2026, lors du verrouillage PRD v4) : conserver un mode clair/sombre sur le site, mais rien n'a tranché explicitement pour un toggle manuel comme dans l'app — l'implémentation actuelle (auto OS) a été jugée suffisante à ce stade et n'a pas été remise en question depuis. Si le besoin d'un toggle manuel se confirme plus tard, il faudra probablement du JS client (`localStorage` + attribut sur `<html>`) puisque Next.js ne fait pas ça nativement.

---

## 4. Typographies

- **Titres (`h1`-`h4`)** : Playfair Display (serif), via `next/font/google`, variable CSS `--font-playfair`
- **Corps de texte** : DM Sans (sans-serif), via `next/font/google`, variable CSS `--font-dm-sans`
- Chargées dans `app/layout.tsx`, exposées à Tailwind comme `font-serif` / `font-sans`

**Retour utilisateur (3/09/2026)** : la police jugée "pas top" avant le premier passage design (logo, grille, couleurs). Pas encore retranché — à réévaluer une fois le reste du design stabilisé et visible en ligne. Si le retour persiste après la correction du bug de mise à jour live (voir `HANDOFF_SITE.md` §6), il faudra explorer soit d'autres graisses de Playfair Display (actuellement poids par défaut, potentiellement trop lourd en `font-bold` pour les gros titres hero), soit une autre paire de polices.

---

## 5. Style des composants (conventions établies)

- **Cartes** : coins arrondis généreux (`rounded-xl` à `rounded-3xl` selon le contexte), fond `surface`, bordure `border`, ombre légère au survol
- **Boutons primaires** : fond `navy` (ou `orange` sur fond sombre type hero/CTA final), texte blanc, `rounded-full`, transition `hover:bg-blue` ou `hover:brightness-110`
- **Sections héros / CTA finale** : dégradé `linear-gradient(160deg, var(--color-navy-deep) 0%, var(--color-navy) 100%)`, texte blanc, CTA orange
- **Animation d'entrée** : classe utilitaire `.animate-fade-up` (fade + léger déplacement vers le haut), délai en cascade (`animationDelay: i * ...ms`) sur les listes/grilles pour un effet d'apparition progressif. Respecte `prefers-reduced-motion`.
- **Grilles de fonctionnalités** : depuis le 3/09/2026, tous les blocs d'une même grille doivent avoir un style visuel identique (retour utilisateur explicite — ne pas réintroduire de distinction visuelle "mis en avant vs normal" par des styles différents sans validation).

---

## 6. Assets images

- `avectoi-site/public/icon-512.png` — logo complet (bon, voir §1)
- `avectoi-site/public/icon-sans-512.png` — variante sans le lit, **à éviter** (voir §1)
- `avectoi-site/public/favicon.png`, `apple-touch-icon.png` — déclinaisons pour onglets navigateur/iOS
- `avectoi-site/public/screenshots/` — captures d'écran réelles de l'app, utilisées dans `AppShowcase.tsx` (3 utilisées sur 12 disponibles dans `C:\Users\ReMarkt\Downloads\Visuels\` — voir `HANDOFF_SITE.md` §7 pour la liste des captures non encore utilisées)
