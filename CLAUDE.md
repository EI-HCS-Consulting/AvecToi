# Projet AvecToi — HCS Hybrid Consulting Systems

## Contexte
Application Android native de coordination de visites hospitalières.
Nom : AvecToi | Baseline : "Parce qu'être présent, ça s'organise"
Développeur : HCS — Hybrid Consulting Systems (Guillaume Frey)
Repo GitHub : https://github.com/EI-HCS-Consulting/AvecToi

## POINT CRITIQUE — Modèle reader app (conformité Play Store)
L'app est "consumption-only" : elle NE VEND RIEN en son sein.
- Aucun écran de prix
- Aucun bouton d'achat ou "Créer un espace"
- Aucun lien vers une page de paiement
Le paiement (5,99€ Stripe) se fait EXCLUSIVEMENT sur le site web avectoi.care
Ce modèle est explicitement autorisé par Google Play et évite toute commission.

## Stack technique obligatoire
- React Native + Expo SDK 51+
- Expo Router (navigation file-based)
- Supabase (BDD + Auth + Storage + Realtime + Edge Functions)
- EAS Build / EAS Submit (build cloud + publication Play Store)
- expo-notifications (push rappels)
- expo-image-picker + expo-image-manipulator (galerie + compression)
- expo-calendar (ajout créneau au calendrier natif Android)
- expo-sharing (partage)
- react-native-qrcode-svg (QR code)
- Stripe : côté WEB uniquement (jamais dans l'app)

## Règles Git — STRICTES
- .env jamais committé — vérifier .gitignore avant chaque commit
- Ne jamais travailler directement sur main
- Toujours créer une branche : feature/nom-feature ou fix/nom-fix
- Format commit : "feat: description" / "fix: description" / "chore: description"
- Pull Request sur GitHub avant tout merge sur main

## Structure de dossiers cible
```
/app
  /(admin)         → écrans admin (dashboard, paramètres)
  /(visitor)       → écrans visiteur (calendrier, créneaux, souvenirs)
  /auth            → connexion admin
/components        → composants réutilisables
/lib
  supabase.ts      → client Supabase
  themes.ts        → 6 thèmes de couleur
/constants         → constantes métier
/assets            → logo SVG, images
.env               → credentials (JAMAIS committé)
.gitignore         → doit contenir .env
CLAUDE.md          → ce fichier
PRD_AvecToi_v1_4.md → PRD complet (référence)
App.jsx            → MVP web de référence (logique à porter en RN)
```

## Priorité des tâches V1 (ordre strict)
1.  Setup Expo + structure + connexion Supabase + Git configuré
2.  Auth admin (Supabase Auth — web + app)
3.  Écran visiteur : accès via lien d'invitation (token)
4.  Migration MVP : calendrier + créneaux + réservation + PIN
5.  Galerie Souvenirs (upload, download groupé, sélectionner tout, suppression PIN)
6.  Nouvelles du jour (publication texte + photos, flux anté-chronologique, droits PIN/admin)
7.  Entraide (besoins + statut + "Je m'en occupe") + Mur de soutien
8.  Thèmes couleur (6 thèmes, switch temps réel) + photo patient dans le logo
9.  Bouton "Prochaine disponibilité" (admin + visiteur)
10. Ajout créneau au calendrier natif Android
11. Notifications push (rappel 1h avant) + emails annulation admin
12. RGPD : purge auto (Edge Function quotidienne) + alerte J-7 + prolongation
13. EAS Build → APK signé
14. Fiche Play Store + soumission

## Backlog V2 (post-V1, scope capté mais pas encore construit)
15. **Export PDF "livret"** — Admin / Paramètres / Historique propose déjà un bouton
    "Chronologie" (bleu, comme "Profil Patient") qui ouvre une frise chronologique
    (popup, scroll borné) combinant Infos hospitalières + Consignes de visite +
    Règles de visite + Visites (créneaux/nuitées réservés), triée du plus récent
    (haut) à la date d'hospitalisation (bas). Prochaine étape : permettre à l'admin
    d'exporter cette même matière sous forme de **livret PDF** regroupant l'ensemble
    des infos remplies par les visiteurs et l'admin (trace du passage à l'hôpital ou
    des soins à domicile). Dans le PDF, la frise s'affiche **verticale, en partant de
    l'hospitalisation** (ordre chronologique croissant — inverse du popup in-app),
    avec dates + infos importantes. Modèle de mise en page du livret à définir
    ultérieurement (pas encore commencé).

## Commande handoff
Fichier unique : `Handoff/handoff.md`.

Quand je dis "génère un handoff" :
1. Vérifier si `Handoff/handoff.md` existe.
   - S'il n'existe pas : créer le dossier `Handoff/` et le fichier avec les 3 sections ci-dessous vides/initiales.
   - S'il existe : le lire.
2. Mettre à jour "## État global du projet" : snapshot factuel de l'app à date (fonctionnalités livrées, en cours, restantes ; stack ; ce qui est en prod vs pas). Section remplacée, pas accumulée.
3. Compresser l'ancien contenu en "## Historique cumulé" (5-8 lignes max). Si première génération, cette section reste vide ou minimale.
4. Rédiger l'état détaillé de la session en cours (template habituel).
5. Écrire/écraser `Handoff/handoff.md` avec les 3 sections.
5bis. Mettre à jour `Documentation/Documentation Fonctionnalités.docx` : ajouter/ajuster les sections concernées si des fonctionnalités ont été livrées, modifiées ou supprimées depuis la dernière génération de handoff (nouveaux écrans, nouveaux boutons/menus, changements de comportement par rôle). Ne pas régénérer tout le document — éditer uniquement les sections impactées.
5ter. Évaluer si `PRD_AvecToi_v1_4.md` doit être mis à jour : uniquement si un changement de **portée produit** a eu lieu depuis la dernière génération de handoff (nouveau rôle, nouvelle fonctionnalité majeure, changement de règle métier structurant, changement de schéma de données significatif) — pas pour un simple fix ou un ajustement d'implémentation. Si oui, ajouter un bloc changelog en tête (vX.Y → vX.Y+1, même format que les changelogs existants) et éditer uniquement les sections concernées (rôles §2, fonctionnalités §3.x, schéma §5, hors scope §8 si pertinent) — ne pas régénérer tout le document.
6. Confirmer que les fichiers modifiés (handoff, et le cas échéant le docx et/ou le PRD) sont écrits et prêts.

### Template handoff
```markdown
# Handoff — AvecToi
_Généré le : {date et heure}_

## 1. Objectif de la session
Ce qu'on cherchait à accomplir.
État "done" : comment on saurait que c'est terminé.

## 2. État actuel
Ce qui fonctionne déjà.
Ce qui est en cours (non terminé).
Dernière action effectuée avant le handoff.

## 3. Fichiers concernés
Chemins exacts des fichiers touchés + rôle de chacun.
Ex : src/components/Calendar.tsx → composant calendrier visiteur

## 4. Ce qui a échoué
Pistes déjà tentées qui n'ont PAS marché, et pourquoi.
⚠️ Section critique : évite de re-tenter les impasses.

## 5. Prochaine étape
La toute prochaine action concrète à effectuer.
Être directif : commande, fichier, ou tâche précise en premier.
Hypothèses à tester, par ordre de priorité.
```

## Références
- Documentation fonctionnelle complète : Documentation/Documentation Fonctionnalités.docx
- PRD complet : PRD_AvecToi_v1_4.md (dans ce dossier)
- Code source MVP : App.jsx (dans ce dossier)
- App web de référence : https://planning-visites-maman.vercel.app
- Supabase dashboard : https://supabase.com/dashboard/project/flmslcdzjuifkivmzins
- Vercel : https://vercel.com/ei-hcs-consultings-projects/planning-visites-maman
- GitHub : https://github.com/EI-HCS-Consulting/AvecToi
