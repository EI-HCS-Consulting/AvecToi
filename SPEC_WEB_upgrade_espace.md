# Spec — Endpoint web "upgrade espace existant" (avectoi.care)

> Écrit le 2026-07-07, dans le cadre du flow décrit dans `SPEC_flow_connexion_app.md` (compte gratuit + wizard créés dans l'app mobile, upgrade payant en différé). Destiné à devenir un item du cahier des charges du site web `avectoi.care` (repo séparé de celui-ci — voir `ISOLATION_SUPABASE.md` pour le contexte de séparation des deux apps).

## Pourquoi ce besoin existe
`SPEC_flow_connexion_app.md` introduit un compte admin gratuit (niveau 1) créé **dans l'app mobile**, sans passer par le web ni par un paiement. L'espace patient associé est utilisable tout de suite (gratuit, cap 8 réservations). Le bouton **"Passer en illimité"** (Paramètres) déclenche l'envoi d'un email contenant un lien vers le web — c'est ce lien qui n'a pas encore d'endpoint pour le recevoir.

Le flow existant décrit dans `PRD_AvecToi_v1_4.md` (§"Parcours admin") suppose l'inverse : création de compte + espace + paiement Stripe **en une seule fois sur le web**, avec le webhook qui active un espace *nouvellement créé*. Ce flow web-only reste valable et inchangé pour l'acquisition classique (QR code prescripteurs, etc.) — le nouveau besoin s'ajoute à côté, il ne le remplace pas.

## Ce qu'il faut construire côté web

### 1. Route `/upgrade?space_id=<uuid>`
- Authentifier l'admin (Supabase Auth, même compte que celui créé dans l'app mobile — session partagée via le même projet Supabase).
- Vérifier que `space_id` appartient bien à l'admin connecté (`admin_id` sur `patient_spaces`) avant de proposer le paiement — éviter qu'un lien intercepté permette de payer pour l'espace de quelqu'un d'autre sans vérif d'appartenance (le paiement en lui-même ne pose pas de risque si mal targeté, mais l'activation d'un espace qui n'est pas le sien, si.)
- Créer une session Stripe Checkout avec `metadata: { space_id, mode: "upgrade" }` (à distinguer du mode "création" existant côté webhook).

### 2. Webhook Stripe — cas "upgrade"
- Le webhook existant (`PRD_AvecToi_v1_4.md` §"Edge Functions") gère aujourd'hui la création + activation d'un nouvel espace après paiement.
- Ajouter une branche : si `metadata.mode === "upgrade"`, ne pas créer de nouvelle ligne `patient_spaces` — faire `update patient_spaces set premium = true, stripe_payment_id = <id> where id = metadata.space_id`.
- Le cap freemium (`trg_check_visite_cap`) lit déjà la colonne `premium` (`supabase/migrations/20260704_freemium_cap_trigger.sql`) — dès que `premium = true`, le cap ne s'applique plus, aucun autre changement nécessaire côté app mobile.

### 3. Email déclenché depuis l'app mobile
- Contenu et logique d'envoi : côté app mobile / Edge Function Supabase (`supabase/functions/`), pas côté web — juste besoin que le lien `https://avectoi.care/upgrade?space_id=<space.id>` soit fonctionnel une fois cliqué.
- Cooldown 60s entre deux envois déjà spécifié dans `SPEC_flow_connexion_app.md` (Edge Function dédiée, à créer côté mobile/Supabase — hors périmètre de ce doc web).

## Ce qui ne change pas
- Paiement 100% Stripe Checkout (pas de nouvelle méthode de paiement).
- Le funnel web existant "créer compte + espace + payer d'un coup" reste utilisé pour l'acquisition via QR code prescripteurs — cette spec ajoute un second chemin d'activation, elle n'y touche pas.
- Aucun prix ni bouton d'achat n'apparaît dans l'app mobile — le paiement reste exclusivement sur `/upgrade` côté web (conformité reader-app, voir `CLAUDE.md`).

## Ouvert / à trancher au moment de cadrer le cahier des charges web
- Wording exact de la page `/upgrade` (reprendre le ton du reste du site).
- Gestion du cas où l'admin clique le lien sans être connecté (redirection login → retour sur `/upgrade?space_id=...` après auth).
- Faut-il un email de confirmation post-upgrade (distinct de la confirmation Stripe standard) ?
