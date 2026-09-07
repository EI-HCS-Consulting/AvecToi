# Changelog — site avectoi.care

Liste chronologique et sommaire des changements apportés au site. Pas de détail technique ici (voir `HANDOFF_SITE.md` pour le contexte complet et les décisions).

---

## 3 septembre 2026

- Mise en ligne initiale sur Infomaniak (hébergement Node.js, déploiement via Git)
- Correction du scaffold existant pour coller à la PRD v4 : essai gratuit 7 jours (au lieu d'un cap de 8 réservations), RGPD 60j+30j (au lieu de 90j), retrait complet du mode Intervenant du contenu du site
- Premier passage design suite au retour utilisateur sur le site en ligne :
  - Correction du logo (mauvaise variante utilisée, sans le lit)
  - Uniformisation visuelle de la grille "Ce que l'app propose"
  - Refonte colorée de la section "Comment ça marche"
  - Ajout de vraies captures d'écran de l'app sur la page d'accueil
- **Bug résolu** : le site en ligne ne reflétait pas les derniers changements poussés — cause identifiée (bouton "Build" d'Infomaniak ne fait pas de `git pull`), corrigé par un pull manuel en SSH avant chaque build
- Carrousel de captures réécrit en vrai carrousel (14 puis 15 écrans), réorganisé thématiquement, puis passé en affichage 3-par-3 avec glissement par page (flèches + swipe tactile + autoplay)
- Ajout d'une lightbox : clic sur une capture du carrousel → agrandissement en plein écran
- Ajout d'un bandeau photo en haut de la page d'accueil (famille au chevet d'une aînée hospitalisée, photo fournie par l'utilisateur)

---

## 2 septembre 2026

- Verrouillage des décisions PRD (v3 → v4) : partage gratuit confirmé, mode Intervenant exclu du site en V1, 3 pages SEO dédiées par persona, dashboard web en parité complète avec l'app dès le lancement, chiffres Freemium/RGPD mis à jour
