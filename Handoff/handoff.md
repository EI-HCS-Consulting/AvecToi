# Handoff — AvecToi
_Généré le : 2026-07-14_

## État global du projet

**Stack :** React Native + Expo SDK 51+, Expo Router, Supabase (BDD/Auth/Storage/Realtime/Edge Functions), EAS Build + EAS Update (channels development/preview/production, `expo-updates` installé, build "development" avec client de dev connecté au Metro local — un reload suffit pour voir les changements JS sans passer par `eas update`). expo-notifications, expo-calendar, expo-image-picker. Resend (transactionnel) branché sur les Edge Functions. Stripe côté web uniquement (avectoi.care), app 100% "reader" conforme Play Store.

**Repo GitHub :** `https://github.com/EI-HCS-Consulting/AvecToi`, branche `main` protégée par ruleset (PR obligatoire). `gh` CLI authentifié (compte `EI-HCS-Consulting`). `main` local à jour avec `origin/main` (`67db597`).

**Branches ouvertes sur `origin` :**
- `main`
- `docs/spec-web-upgrade` — non mergée, en attente depuis plusieurs sessions, laissée en attente sur décision explicite de l'utilisateur (statut inchangé, à reclarifier un jour).
- `feat/entraide-filters-and-display-toggle`, `fix/entraide-chips-equal-width`, `fix/spaceheader-hide-sector-from-address` — **déjà mergées** (PR #25, #26, #27, cette session) mais pas encore supprimées sur origin (attendre une demande explicite avant nettoyage, comme convenu précédemment).

**Livré (V1, CLAUDE.md points 1-10) :** setup Expo/Supabase/Git, Auth admin, accès visiteur, calendrier + créneaux + réservation + PIN, galerie Souvenirs, Nouvelles du jour, Entraide + Mur de soutien, 6 thèmes + mode Dark/Light par compte, "Prochaine disponibilité", ajout calendrier natif Android, RLS, accompagnants, parité admin/visiteur "Mon compte", autofill Google Maps, onboarding séquencé + partage freemium débloqué, cap freemium à granularité fine, Paramètres en 4 sections avec historique, granularité minute horaires, emails réservation/annulation (Resend), fiche patient + profils visiteurs, **Dark/Light aligné visuellement sur "Mode de soin"**, **Entraide : filtres cliquables "besoins ouverts"/"besoins fermés" (chips 50/50)**, **nouveau statut de tâche "ferme" avec fermeture automatique des besoins jamais pris en charge dont la date est dépassée**, **rappel popup à la prise en charge d'un besoin ("Je m'en occupe")**, **secteur hospitalier synchronisé entre "Infos hospitalières" et "Coordonnées", exclu de l'adresse affichée/du lien Maps du Header**.

**En cours / pas commencé :**
- Points 11-12 (notifications push rappel, RGPD purge auto J-7) : livrés lors de sessions antérieures, pas re-testés récemment.
- Points 13-14 (EAS Build APK signé, fiche Play Store) : pas commencés.
- Branche `docs/spec-web-upgrade` : toujours en attente.
- Cap freemium (réactivé) jamais testé en conditions réelles avec un espace non-premium existant en prod.
- **Migration SQL `supabase/migrations/20260714_tasks_status_ferme.sql` (élargit le CHECK sur `tasks.status` pour autoriser `"ferme"`) — donnée à l'utilisateur pour exécution manuelle sur le dashboard Supabase (CLI bloquée sur cette machine), jamais confirmée comme exécutée. À vérifier avant de faire confiance à la fermeture automatique en conditions réelles : sans elle, tout `update` vers `status: "ferme"` échoue silencieusement.**
- 3 branches mergées cette session à nettoyer sur origin (voir ci-dessus, sur demande explicite).

## Historique cumulé
- Lots 1-10 (fonctionnalités de base) livrés au fil de sessions antérieures.
- 2026-07-04 → 07-13 : `dossier_code`, cap freemium, PIN visiteur sécurisé, refonte Paramètres 4 sections, historique + recasage auto + alertes, fix horloges Android + infra EAS Update, granularité minute horaires, Resend de bout en bout, fiche patient + profils visiteurs, mode Dark/Light + sweep exhaustif textes blancs/bordures (PR #7-#23, mergées).
- 2026-07-14 (session précédente) : fix largeur boutons Jour/Mois/Année fiche patient (PR #24), nettoyage de 3 branches mergées.
- 2026-07-14 (cette session) : voir détail ci-dessous.

## 1. Objectif de la session
Plusieurs demandes ponctuelles enchaînées : (1) aligner visuellement le switch Dark/Light sur le switch "Mode de soin" ; (2) ajouter des filtres cliquables dans Entraide pour les besoins ouverts/fermés ; (3) automatiser la fermeture des besoins Transport (puis, après clarification, de toutes catégories) restés sans preneur après leur date, sans jamais auto-compléter un besoin "pris en charge" ; (4) ajouter un rappel à la prise en charge d'un besoin ; (5) résoudre un conflit d'affichage entre le champ "Secteur" (Infos hospitalières) et le "Complément d'adresse" (Coordonnées) en mode hôpital, visible dans l'adresse du Header page d'accueil.
État "done" : atteint pour tout — PR #25, #26, #27 mergées dans `main`.

## 2. État actuel

**Fait cette session (chronologique) :**
- **Switch Dark/Light** (`app/(admin)/account.tsx`, `app/(visitor)/account.tsx`) : remplacé par le `SegmentedSwitch` déjà utilisé pour "Mode de soin", texte "Propre à ton compte, sur cet appareil" supprimé, libellés "Dark"/"Light", curseur élargi via un nouveau prop `minWidthRatio` sur `SegmentedSwitch` (largeur mini en fraction de la piste, pour que les libellés courts gardent un poids visuel cohérent avec les switches à libellés longs) et texte recentré dans l'espace occupé par le curseur.
- **Entraide — filtres cliquables** (`components/Entraide.tsx`) : le compteur "X besoins ouverts" devient une chip cliquable (filtre toggle) ; nouvelle chip "X besoins fermés" à côté (n'apparaît que si au moins un besoin est fermé), filtres mutuellement exclusifs. Chips redimensionnées à largeur égale (50/50 de la ligne, `flex: 1` + `justifyContent: center`).
- **Nouveau statut `"ferme"`** (`lib/types.ts`, migration `20260714_tasks_status_ferme.sql`) : après une clarification de l'utilisateur en cours de session (l'implémentation manuelle initiale — bouton admin "Fermer X sans réponse" + auto-complétion des transports "pris en charge" en "fait" — ne correspondait pas au besoin réel), le comportement final retenu est :
  - un besoin **"ouvert"** (jamais pris en charge) dont la date est dépassée passe **automatiquement** en `"ferme"` (effet `closeOverdueUnclaimed`, vérifié au montage + toutes les 60s) — écrit de façon générique (pas de `category === "transport"` en dur) même si seule la catégorie Transport porte aujourd'hui un champ date structuré ;
  - un besoin **"pris en charge"** reste inchangé indéfiniment tant que "Fait" n'est pas cliqué manuellement (le bouton "Marquer fait"/"C'est fait" reste toujours disponible, y compris pour Transport — l'auto-complétion initiale a été retirée) ;
  - un **rappel popup** (`Alert.alert`) s'affiche désormais juste après avoir cliqué "Je m'en occupe" (`handleClaim`), invitant à revenir cliquer "Fait" une fois le besoin traité.
- **Conflit Secteur / Complément d'adresse (mode hôpital)** — remonté par l'utilisateur après un premier correctif insuffisant :
  - Premier essai (PR #26) : synchronisation en temps réel des champs "Secteur" (Infos hospitalières) et "Complément d'adresse" (Coordonnées, mode hôpital uniquement) via un setter partagé `setHospitalSectorSynced` (`app/(admin)/settings.tsx`), persistée dans les deux colonnes DB (`hospital_sector`, `hospital_address_line2`) par les deux handlers de sauvegarde (`handleSaveHospitalInfos`, `handleConfirmHomeCare`) — ne corrige pas rétroactivement les valeurs déjà divergentes en base (nécessite une réédition + sauvegarde d'un des deux champs).
  - Ce premier essai excluait aussi le complément d'adresse du lien Maps généré automatiquement (`lib/address.ts`/`components/SpaceHeader.tsx`), mais l'utilisateur utilisait un lien Google Maps **collé manuellement** (`hospital_maps_url`, toujours prioritaire) — ce correctif n'avait donc aucun effet visible.
  - **Correctif réel (PR #27)** : le complément d'adresse était en fait visible dans le **texte d'adresse affiché** sous le titre du Header (bandeau cliquable "📍 ..."), pas seulement dans une URL de repli. `components/SpaceHeader.tsx` exclut maintenant `line2` à la fois du texte affiché (`addressLine`) et du lien Maps de repli, en mode hôpital uniquement (aucun impact en mode domicile).
- 3 PR ouvertes, poussées et mergées par l'utilisateur : #25 (`feat/entraide-filters-and-display-toggle`), #26 (`fix/entraide-chips-equal-width`), #27 (`fix/spaceheader-hide-sector-from-address`).

**Dernière action avant ce handoff :** `main` local synchronisé avec `origin/main` (`67db597`) après le merge de la PR #27, puis mise à jour de ce handoff.

## 3. Fichiers concernés
- `components/SegmentedSwitch.tsx` → nouveau prop `minWidthRatio`, largeur de pastille et des libellés désormais alignées (`effectiveThumbWidth`).
- `app/(admin)/account.tsx`, `app/(visitor)/account.tsx` → switch Dark/Light remplacé, texte de sous-titre supprimé, badges de statut "Mes contributions"/"myPublishedTasks" étendus au statut `"ferme"`.
- `components/Entraide.tsx` → filtres "besoins ouverts"/"besoins fermés" (chips 50/50), statut `"ferme"`, effet `closeOverdueUnclaimed` (fermeture auto), fonction `taskOverdueUnclaimed`, retrait de l'auto-complétion Transport, popup de rappel dans `handleClaim`.
- `lib/types.ts` → `Task.status` élargi à `"ouvert" | "pris_en_charge" | "fait" | "ferme"`.
- `supabase/migrations/20260714_tasks_status_ferme.sql` (nouveau) → élargit la contrainte CHECK `tasks_status_check`. **À confirmer comme exécutée sur le dashboard Supabase.**
- `app/(admin)/settings.tsx` → `setHospitalSectorSynced` (sync temps réel Secteur ↔ Complément d'adresse hôpital), `handleSaveHospitalInfos` et `handleConfirmHomeCare` persistent désormais les deux colonnes.
- `components/SpaceHeader.tsx` → `displayParts` exclut `line2` du texte d'adresse affiché et du lien Maps de repli, en mode hôpital uniquement.
- `lib/address.ts` → inchangé (la logique d'exclusion vit dans `SpaceHeader.tsx`, pas dans les helpers partagés, pour ne pas affecter d'autres usages de `joinAddress`/`addressLines`).

## 4. Ce qui a échoué
- **Auto-complétion des besoins Transport "pris en charge" en "fait"** (implémentée puis retirée en cours de session) : l'utilisateur a clarifié après coup qu'un besoin pris en charge doit rester "Pris en charge" indéfiniment avec le bouton "Marquer fait" disponible, jamais auto-complété — l'idée de base (éviter que les gens oublient de confirmer) est plutôt couverte par le nouveau rappel popup à la prise en charge. Ne pas réintroduire cette auto-complétion.
- **Bouton manuel admin "Fermer X sans réponse"** (implémenté puis remplacé) : l'utilisateur voulait un comportement entièrement automatique (pas de clic admin requis), et généralisé à toutes les catégories, pas seulement Transport.
- **Premier correctif Secteur/Maps (PR #26)** : n'excluait le complément d'adresse que du lien Maps de repli (jamais utilisé ici car un lien manuel était collé) — aucun effet visible côté utilisateur. Le vrai problème (texte d'adresse affiché dans le Header) a nécessité un second correctif (PR #27). Leçon : bien vérifier où une donnée est réellement affichée avant de corriger seulement la logique de génération d'URL.
- Fausse piste de ma part : suggestion de passer par `eas update` (OTA) pour voir les changements — l'utilisateur utilise un client de dev connecté au Metro local, un simple reload suffit, pas besoin d'OTA. Ne pas reproposer EAS Update sauf si l'utilisateur teste explicitement depuis une build installée sans dev client.

## 5. Prochaine étape
1. **Confirmer que la migration `20260714_tasks_status_ferme.sql` a bien été exécutée sur le dashboard Supabase** avant de considérer la fermeture automatique des besoins comme fiable en prod.
2. Nettoyer sur origin les 3 branches mergées cette session (`feat/entraide-filters-and-display-toggle`, `fix/entraide-chips-equal-width`, `fix/spaceheader-hide-sector-from-address`) — sur demande explicite.
3. Vérifier en conditions réelles : la fermeture automatique des besoins ouverts expirés (attendre qu'un besoin Transport dépasse sa date sans preneur, ou en créer un de test), et la synchronisation Secteur/Complément d'adresse (rééditer un des deux champs existants pour forcer l'alignement des valeurs déjà divergentes en base).
4. Décider du sort de `docs/spec-web-upgrade`.
5. Tester le cap freemium en conditions réelles ; revalider points 11-12 (notifications push, purge RGPD J-7).
6. Reprendre la roadmap points 13-14 (EAS Build → APK signé, fiche Play Store).
