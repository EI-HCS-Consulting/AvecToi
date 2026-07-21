# Réflexion — purge RGPD, site Vercel historique, protection du schéma Supabase

_Écrit le 21 juillet 2026, suite à la découverte que la purge RGPD avait déjà supprimé les données du patient historique. Documente le raisonnement complet pour ne pas le refaire à froid dans une future session._

## 1. Le déclencheur

En creusant l'isolation Supabase (voir `ISOLATION_SUPABASE.md`), l'utilisateur a révélé que l'espace patient historique (la seule vraie exploitation du site `planning-visites-maman.vercel.app`, hospitalisation aujourd'hui terminée) avait déjà eu ses données supprimées par la purge RGPD automatique — **sans email d'alerte reçu**. Seules les données de réservations (visites/nuitées) semblaient avoir survécu ; le reste (souvenirs, nouvelles, tâches...) avait disparu.

## 2. Ce qu'on a vérifié dans le code

- `components/PatientOnboarding.tsx` fixait la durée de rétention initiale (`SPACE_DURATION_DAYS`) à **30 jours**, alors que l'utilisateur se souvient d'un réglage initial à **90 jours**. Aucune trace dans le repo de quand/pourquoi ce changement a eu lieu.
- `supabase/functions/rgpd-purge/index.ts` est la fonction qui exécute la purge : elle supprime bien `reservations`, `souvenirs`, `news_entries`, `tasks`, `support_messages`, `slot_config`, puis la ligne `patient_spaces` elle-même, dès que `purge_scheduled_at <= now`.
- L'alerte email J-7 (`sendPurgeAlert`) existe dans le code, mais n'est envoyée que si `Deno.env.get("RESEND_API_KEY")` retourne une valeur — sinon la fonction logue juste un `console.warn` silencieux, sans jamais prévenir l'admin dans l'app.
- Aucune sauvegarde n'existe sur le tier gratuit Supabase (0 jour de rétention) : une fois la purge exécutée, il n'y a **aucun moyen de récupérer** les données supprimées.

## 3. Correctifs appliqués (PR #78, mergée)

- `SPACE_DURATION_DAYS` repassé de 30 à 90 jours, ainsi que le bouton "Prolonger" dans `app/(admin)/settings.tsx` (confirmation, toast, libellé — tous alignés sur 90 jours désormais).
  - ⚠️ Ce changement ne s'applique qu'aux **futurs** espaces créés et futurs clics sur "Prolonger" — il ne modifie pas rétroactivement le `purge_scheduled_at` des espaces déjà actifs.
- Ajout de `.github/workflows/schema-backup.yml` : snapshot hebdomadaire (+ déclenchement manuel) du **schéma** Supabase (structure — tables, RLS, triggers, buckets Storage, pas de données) via `supabase db dump`, exécuté sur un runner GitHub Actions cloud pour contourner le blocage de la CLI Supabase sur la machine locale (App Control Policy Windows). Si le schéma a changé depuis le dernier snapshot committé, le workflow ouvre une PR automatique.

### Statut réel de cette protection (vérifié le 21/07)
Le workflow est mergé sur `main` mais **n'a encore jamais tourné** (`gh run list` ne retourne aucune exécution) et le secret GitHub Actions requis, `SUPABASE_DB_URL`, **n'existe pas encore** sur le repo (vérifié via `gh secret list`). Tant que ce secret n'est pas posé et le workflow déclenché manuellement au moins une fois, **la structure Supabase n'est pas encore réellement sauvegardée** — seul le mécanisme est en place.

**Reste à faire (côté utilisateur, une seule fois) :**
1. Dashboard Supabase → Project Settings → Database → Connection string → copier la variante **Session pooler** ou **Direct connection** (pas *Transaction pooler* / port 6543).
2. GitHub → repo `AvecToi` → Settings → Secrets and variables → Actions → New repository secret → nom `SUPABASE_DB_URL`, coller la chaîne de connexion.
3. Onglet Actions → "Supabase schema backup" → Run workflow (déclenchement manuel) pour capturer immédiatement l'état actuel du schéma, sans attendre le premier lundi programmé.

## 4. Le mélange de données découvert sur le site Vercel historique

En creusant pourquoi le site `planning-visites-maman.vercel.app` affiche des nuitées/créneaux d'autres espaces patients, la cause a été trouvée dans le code source figé (`App.jsx` / `src/App.jsx`, identiques) :

```js
const { data, error } = await supabase.from("reservations").select("*");
```

**Aucun filtre `space_id` nulle part dans ce fichier.** Ce code date du tout premier MVP mono-patient, avant même l'existence de la colonne `space_id` sur `reservations` (ajoutée le 16/06 par la migration `20260616_reservations_space_id.sql`, dont le commentaire documente explicitement ce "bug de fond"). Le reste de l'app (React Native) filtre bien par `space_id` partout ; ce vieux site, lui, n'a jamais été mis à jour — décision explicite documentée dans `HANDOFF_migration_auth.md` ("ne doit JAMAIS être supprimée ni mise à jour").

Conséquence : ce site charge et affiche **toutes** les réservations de **tous** les espaces patients jamais créés (réels et tests), mélangées. Et comme la table `reservations` a du RLS permissif (`using (true)` en SELECT/INSERT/UPDATE/DELETE — le contrôle d'accès est fait côté client, par design, pas par RLS), ce vieux site a aussi un accès en **écriture** sur les réservations de n'importe quel espace, sans distinction.

### Pourquoi on ne corrige pas ce code
`HANDOFF_migration_auth.md` interdit explicitement d'y toucher. Une correction par RLS est également écartée : restreindre l'accès anonyme à un seul `space_id` casserait l'app principale, qui utilise la même clé anon pour tous les espaces légitimes (le design repose sur un filtrage côté client partout, pas sur RLS strict).

## 5. Décision prise

L'utilisateur a tranché : **le site Vercel historique sera supprimé**, puis remplacé par un nouveau site hébergé sur **Infomaniak** une fois celui-ci prêt. C'est la seule remédiation propre au mélange de données (§4) sans toucher au code figé ni casser le RLS partagé — et ça répond aussi à la question initiale de coût/résidence des données qui avait lancé cette réflexion (voir `ISOLATION_SUPABASE.md`).

Pas d'urgence financière à couper Vercel plus tôt (hébergement gratuit), donc la bascule se fera **quand le nouveau site Infomaniak sera prêt**, pas avant.

## 6. Fils encore ouverts (voir aussi `Handoff/handoff.md` et `ISOLATION_SUPABASE.md`)

1. **Activer réellement la sauvegarde de schéma** : poser le secret `SUPABASE_DB_URL` + déclenchement manuel (voir §3).
2. **Alertes email RGPD (`RESEND_API_KEY` / cron)** : en cours d'investigation (voir section suivante de la conversation) — la piste initiale ("clé non configurée pour cette fonction") est probablement fausse, puisque les secrets Supabase sont partagés au niveau du projet et que `notify-cancel` envoie déjà des emails réels avec succès. Piste plus probable : le job `pg_cron` (`supabase/cron.sql`) n'a peut-être jamais été réellement exécuté dans le SQL Editor, ou tourne de façon irrégulière — à vérifier côté Dashboard (`select * from cron.job;` et `select * from cron.job_run_details order by start_time desc limit 20;`).
3. **Nouveau site Infomaniak** : à scoper (stack, ce qui doit être porté depuis `avectoi.care`/Vercel) puis construire ; le site Vercel historique sera supprimé une fois celui-ci prêt (§5).
