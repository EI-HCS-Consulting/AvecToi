# Handoff — AvecToi
_Généré le : 2026-07-20 (soir)_

## État global du projet

**Stack :** React Native + Expo SDK 51+, Expo Router, Supabase (BDD/Auth/Storage/Realtime/Edge Functions), EAS Build + EAS Update (channels development/preview/production, `expo-updates` installé). expo-notifications, expo-calendar, expo-image-picker. Resend (transactionnel) branché sur les Edge Functions. Stripe côté web uniquement (avectoi.care), app 100% "reader" conforme Play Store. Supabase CLI bloqué sur cette machine (App Control Policy Windows) : déploiement des migrations/Edge Functions exclusivement via le Dashboard Supabase (copier/coller le SQL en un seul bloc).

**EAS Update — automatisé depuis le 20/07 (PR #61) :** `.github/workflows/eas-update-preview.yml` publie automatiquement `eas update --channel preview` à chaque push sur `main` contenant du code app (paths-ignore sur `Handoff/`, `Documentation/`, `**.md`). Un `workflow_dispatch` permet aussi de rejouer une publication manuellement (Actions → "EAS Update (preview)" → Run workflow, ou `gh workflow run "EAS Update (preview)" --ref main`) si un run automatique a échoué.

**⚠️ Point d'attention — panne silencieuse du 21/07 (PR #84 → #86), à ne pas reproduire :**
- **Cause :** l'étape de publication interpolait `github.event.head_commit.message` *directement dans le texte du script bash* (`--message "${{ github.event.head_commit.message }}"`). Un message de commit multi-lignes contenant des guillemets (`"..."`, `«...»` — courant dans nos messages de merge PR) casse le quoting bash : `eas update` reçoit des arguments tronqués et échoue (`Unexpected arguments: ...`). Le job a un run rouge dans l'onglet Actions, mais **rien ne bloque le merge ni n'alerte dans l'app** — le channel `preview` est resté figé sur un vieux commit pendant ~3h sans que ce soit visible ailleurs que dans Actions.
- **Écriture correcte (corrigée dans le workflow) :** passer toute donnée potentiellement multi-ligne/avec guillemets par une variable d'environnement, jamais par interpolation `${{ }}` directe dans un `run:` bash :
  ```yaml
  - name: Publish EAS Update (preview)
    env:
      COMMIT_MESSAGE: ${{ github.event.head_commit.message || 'fallback si workflow_dispatch' }}
    run: |
      FIRST_LINE="$(printf '%s' "$COMMIT_MESSAGE" | head -n1)"
      eas update --channel preview --message "$FIRST_LINE" --non-interactive
  ```
  (Ce pattern — env var + `$VAR` entre guillemets — est aussi la recommandation GitHub officielle contre l'injection de script, pas seulement contre ce bug de syntaxe.)
- **Réflexe à prendre après un merge important :** un `gh run list --workflow=eas-update-preview.yml --limit 3` (ou l'onglet Actions) pour confirmer que le run est vert, plutôt que de supposer que la publication a réussi.
- **Piège séparé, à ne pas confondre avec une régression de code :** même une fois la publication OTA réussie, `expo-updates` (config par défaut, `fallbackToCacheTimeout` non fixé) télécharge la mise à jour en arrière-plan mais **sert encore l'ancien bundle JS au lancement en cours** — la nouvelle version n'est appliquée qu'au prochain redémarrage **complet** de l'app (fermer depuis le multitâche, pas juste mettre en arrière-plan), parfois il faut fermer/rouvrir deux fois juste après une publication. Symptôme observé le 21/07 : juste après le fix + republication, un nouveau compte intervenant ne voyait ni le bloc "Mes Patients" ni le bouton "Rejoindre un nouveau patient" — fausse alerte, résolue en relançant complètement l'app. Avant de chercher un bug de code suite à un déploiement OTA récent, toujours commencer par un redémarrage complet de l'app testée.

**Repo GitHub :** `https://github.com/EI-HCS-Consulting/AvecToi`, branche `main` protégée par ruleset (PR obligatoire). `main` local à jour avec `origin/main` (`ddd1a82`, PR #75 mergée).

**Branches ouvertes sur `origin` (nombreuses, nettoyage jamais fait faute de demande explicite) :** `docs/spec-web-upgrade` (en attente d'une décision utilisateur depuis plusieurs sessions) + une trentaine de branches déjà mergées mais pas supprimées (`fix/*`, `feat/*`, `feature/*`, `docs/handoff-update-*`) — liste complète via `git branch -r`. Nettoyage à faire uniquement sur demande explicite, comme convenu.

**Livré (V1, CLAUDE.md points 1-10) :** setup Expo/Supabase/Git, Auth admin, accès visiteur, calendrier + créneaux + réservation + PIN, galerie Souvenirs, Nouvelles du jour, Entraide + Mur de soutien (+ checklists administratives), 6 thèmes + mode Dark/Light, "Prochaine disponibilité", ajout calendrier natif Android, RLS, accompagnants, parité admin/visiteur "Mon compte", onboarding séquencé, cap freemium, Paramètres 4 sections + historique, emails réservation/annulation (Resend), fiche patient + profils visiteurs, Chronologie, Planning des intervenants (réorganisé : calendrier mensuel inline + pager jour + bloc Soins planifiés + Fiches intervenants repliables), mode "1 visite par jour" (parité admin/visiteur/intervenant, visite et intervention comptées comme un seul évènement), téléphone/phrase totem/photo unifiés entre "Mon compte" et la fiche intervenant, rattachement multi-espaces des intervenants (par téléphone, bloc "🔗 Mes espaces"), refonte navigation + Mon compte intervenant (onglets Intervenants/Soins), checklists personnelles réutilisables entre dossiers patient (modèles cross-space). **Documentation fonctionnelle rattrapée cette session pour les PR #63-#72** (voir détail ci-dessous) — plus de retard connu.

**En cours / pas commencé :**
- Points 13-14 (EAS Build APK signé, fiche Play Store) : pas commencés.
- ~~Bug flèches jour calendrier visiteur~~ : **corrigé et mergé (PR #77)**, `slots.tsx` respecte maintenant `allowed_weekdays`/`blocked_dates` via `findNextAllowedDay`.
- Isolation Supabase (séparer l'instance prod partagée avec le site web) : plan complet dans `ISOLATION_SUPABASE.md`, différée sur décision de l'utilisateur. **Sauvegarde automatique hebdo du SCHÉMA (structure) opérationnelle depuis le 21/07** via `.github/workflows/schema-backup.yml` (secret `SUPABASE_DB_URL` posé, premier snapshot réel généré et mergé PR #79, permission GitHub Actions "create and approve pull requests" activée le 21/07 — le run automatique de lundi pourra créer sa PR sans intervention manuelle). Les données elles-mêmes restent sans backup tant qu'on est sur le tier gratuit (0 jour de rétention/PITR).
- `docs/spec-web-upgrade` : toujours en attente d'une décision.
- **Migration `20260728_intervenant_checklist_templates.sql` (PR #74) :** toujours pas confirmée exécutée en prod par l'utilisateur — "📥 Mes modèles" restera en échec silencieux tant que ce n'est pas fait (voir §5 du handoff précédent, PR #75).

**3 fils ouverts identifiés le 21/07 (suite à la purge RGPD de l'espace patient historique) :**
1. ~~Alertes email RGPD jamais envoyées~~ **RÉSOLU le 21/07.** Fausse piste initiale : `RESEND_API_KEY` n'était pas en cause (secret partagé au niveau du projet, pas par Edge Function). Vraie cause : `pg_cron`/`pg_net` n'avaient jamais été activés sur ce projet (le job `rgpd-purge-daily` n'existait pas du tout — la purge historique qui a supprimé l'espace patient réel devait être un déclenchement manuel/ponctuel). Activés le 21/07, puis un 2e bug découvert : le premier `cron.schedule` avait été exécuté avec les placeholders `<PROJECT_REF>`/`<CRON_SECRET>` non remplacés (job actif mais pointant vers une URL invalide, donc silencieusement en échec chaque nuit). Corrigé et vérifié via `SELECT * FROM cron.job` : le job `rgpd-purge-daily` (jobid 2) contient maintenant la vraie URL et le vrai `CRON_SECRET`, actif, planifié tous les jours à 02:00 UTC. Script versionné dans `supabase/migrations/20260721_rgpd_purge_cron.sql` (PR #82).
2. **Mélange nuitées/créneaux entre espaces sur le site Vercel historique** (`planning-visites-maman.vercel.app`) : root cause identifiée (voir `REFLEXION_SITE_VERCEL_ET_RGPD.md`) — `select("*")` sans filtre `space_id` dans `App.jsx`/`src/App.jsx` (code MVP pré-multi-tenant, figé par `HANDOFF_migration_auth.md`) combiné à une RLS volontairement permissive (`using (true)`) sur `reservations`. Non corrigeable sans risquer de casser l'app principale ou de violer l'interdiction de toucher au site figé. Décision prise : décommissionner ce site et le remplacer par le futur site Infomaniak (fil #3) — pas encore exécuté, aucune urgence.
3. **Nouveau site web à héberger sur Infomaniak**, en remplacement du site Vercel actuel (`avectoi.care`), à démarrer quand prêt selon l'utilisateur — pas encore scopé (stack, ce qui doit être porté depuis avectoi.care).

**RGPD — durée de rétention repassée à 90 jours (21/07) :** `SPACE_DURATION_DAYS` dans `PatientOnboarding.tsx` était passé à 30 jours (l'utilisateur se souvenait d'un réglage initial à 90) ; remis à 90 jours, avec le bouton/textes "Prolonger" (`app/(admin)/settings.tsx`) alignés sur la même valeur. **Important : ce changement de code ne s'applique qu'aux futurs espaces créés (et futurs clics sur "Prolonger") — il ne modifie PAS rétroactivement le `purge_scheduled_at` déjà enregistré sur les espaces existants.** Si des espaces actifs doivent être étendus, il faut soit cliquer "Prolonger" dans leurs Paramètres, soit faire une mise à jour SQL manuelle en base.

## Historique cumulé
- Lots 1-10 (fonctionnalités de base) + sessions du 2026-07-04 au 07-17 (`dossier_code`, cap freemium, PIN visiteur sécurisé, Paramètres 4 sections, historique + recasage auto, Resend, fiche patient, Dark/Light, Chronologie, checklists administratives, Planning des intervenants) — PR #7-#41, mergées.
- 2026-07-18 : correctif alerte de recasage matchée par prénom+nom+PIN (PR #44), mode "1 visite par jour" — toggle instantané, suspension rétroactive des doublons (PR #45).
- 2026-07-19 : Refonte compte Intervenant Phase A (téléphone + phrase totem, PR #56) puis unification photo/téléphone/phrase totem entre Mon compte et la fiche intervenant (PR #57).
- 2026-07-20 (journée) : fix session photo intervenant (PR #59), masquage créneaux admin mode "1 visite/jour" (PR #60), EAS Update via GitHub Actions (PR #61), vue `visitor_profiles_by_patient` + colonnes `admin_email`/`admin_pin` sur `patient_spaces` (PR #63-65), réorganisation Planning des intervenants + calendrier mensuel dédié (PR #66-70), rattachement multi-espaces des intervenants (PR #71), fix intervention day-cap + popup (PR #72), refonte navigation + Mon compte intervenant (PR #73), popup "1 créneau/jour" harmonisé + checklists perso enrichies + modèles réutilisables (PR #74), handoff + doc §3.2/§7.3 (PR #75).
- 2026-07-20 (cette session) : voir détail ci-dessous — rattrapage documentaire PR #63-72.

## 1. Objectif de la session
Rattraper le retard de documentation fonctionnelle identifié dans le handoff précédent (PR #75) : les PR #59 à #72 n'avaient été répercutées dans `Documentation Fonctionnalités.docx` que partiellement (seules la navigation intervenant et les checklists réutilisables, liées à PR #73/#74, avaient été traitées). Session dédiée demandée par l'utilisateur ("PR 75 est mergée" → repartir de `main` à jour et traiter le rattrapage). Aucun changement de code app.
État "done" : chaque PR #59-72 passée en revue une à une (contenu du PR body), sections du docx impactées mises à jour, PR non fonctionnelles écartées explicitement (pas ignorées par oubli), handoff écrit et poussé.

## 2. État actuel

**Fait cette session — revue PR par PR :**
- PR #59 (fix persistance photo fiche intervenant) et PR #61 (EAS Update via GitHub Actions) : **pas de changement documentaire** — correctifs internes/infra sans impact visible sur le comportement déjà décrit dans le docx.
- PR #63 (vue `visitor_profiles_by_patient`), PR #64 (colonne `admin_email`), PR #65 (colonne `admin_pin`) : **pas de changement documentaire** — additions purement base de données (confort dashboard Supabase / support téléphonique futur), aucun écran ni comportement utilisateur nouveau.
- PR #60 (masquage créneaux admin en mode "1 visite/jour") + PR #72 (day-cap : visite et intervention comptent comme un seul évènement) → **§5.14 Règles**, ligne "1 visite par jour" (table) : texte réécrit pour couvrir la parité admin/visiteur/intervenant et l'unification visite+intervention. **§5.3 Créneaux (Admin)** : nouvelle ligne "1 visite par jour" ajoutée à la table.
- PR #66-70 (réorganisation Planning des intervenants + calendrier mensuel inline) → **§5.16 Planning des intervenants (écran dédié)** : table entièrement réécrite — nouvel ordre calendrier mensuel → pager jour → bouton "+ Ajouter une intervention" (popup 4 étapes) → bloc Soins planifiés → bloc Fiches intervenants (repliable, fermé par défaut, en dernière position). 2 nouvelles lignes ajoutées (Soins planifiés, Fiches intervenants), 3 lignes existantes réécrites.
- PR #71 (rattachement multi-espaces intervenants) → **§7.1 Activation et accès** : ligne "Fiche intervenant obligatoire" corrigée (le téléphone est désormais obligatoire, pas optionnel) + nouvelle ligne "Rattachement multi-espaces". **§7.3 Fonctionnalités partagées** : ligne "Mon compte" complétée avec la mention du bloc "🔗 Mes espaces".
- §8 (tableau des droits) et §10 (glossaire) : vérifiés, aucun changement de rôle ni nouveau terme métier introduit par ces PR — laissés inchangés.

**Méthode :** édition directe des runs de texte existants (`run.text = ...`) pour les cellules modifiées, préservant police/gras/taille sans toucher au XML. Pour les nouvelles lignes de tableau : `copy.deepcopy()` de la `<w:tr>` d'une ligne existante puis insertion via `addnext()`, pour hériter exactement des mêmes bordures/ombrage/police que les lignes voisines (vérifié : toutes les nouvelles lignes ont bien Arial/gras identique aux autres libellés de colonne, cf. §4).

**Dernière action avant ce handoff :** relecture complète des 5 tables modifiées (dump texte) pour vérifier cohérence avec les PR bodies.

## 3. Fichiers concernés
- `Documentation/Documentation Fonctionnalités.docx` → tables des sections §5.3, §5.14, §5.16, §7.1, §7.3 mises à jour (voir détail §2). Aucun autre fichier touché — session 100% documentaire, aucun changement de code.

## 4. Ce qui a échoué
- Rien de bloquant. Point de vigilance (déjà noté dans le handoff PR #74, confirmé à nouveau) : `document.element.body` doit être parcouru dans l'ordre réel (paragraphes + `w:tbl`) pour associer une table à la bonne section — un simple `d.tables[i]` sans ce repérage préalable risque de cibler la mauvaise table dans un document à 34 tables.
- Point de vigilance ajouté cette session : pour ajouter une ligne à un tableau Word en préservant bordures/ombrage, ne pas utiliser `table.add_row()` (ligne nue sans `tcPr`) mais dupliquer une `<w:tr>` existante (`copy.deepcopy` + `addnext`) puis ne remplacer que le texte des runs.

## 5. Prochaine étape
1. Revue utilisateur du diff `.docx` (ou export PDF si plus simple à relire) avant merge — session purement documentaire mais impact sur 5 sections du document de référence.
2. Ouvrir la PR, la faire mergée par l'utilisateur (comme d'habitude).
3. Items reportés, à reprendre sur demande de l'utilisateur : bug flèches jour `slots.tsx`, isolation Supabase dev/prod, nettoyage des branches mergées sur origin, décision sur `docs/spec-web-upgrade`, confirmation d'exécution de la migration `20260728_intervenant_checklist_templates.sql` (PR #74, bloquant pour "Mes modèles").
