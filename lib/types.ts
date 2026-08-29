import type { ThemeKey } from "./themes";

export interface PatientSpace {
  id: string;
  admin_id: string;
  admin_firstname: string | null;
  admin_lastname: string | null;
  admin_email: string | null;
  admin_pin: string | null;
  patient_firstname: string;
  patient_lastname: string;
  patient_photo_url: string | null;
  patient_birthdate: string | null;
  patient_sex: "M" | "F" | null;
  patient_blood_type: string | null;
  patient_allergies: string | null;
  patient_motto: string | null;
  patient_admission_date: string | null;
  patient_discharge_date: string | null;
  name_change_requested_at: string | null;
  hospital_name: string;
  hospital_service: string | null;
  hospital_sector: string | null;
  hospital_room: string | null;
  hospital_address: string;
  hospital_address_line2: string | null;
  hospital_postal_code: string | null;
  hospital_city: string | null;
  hospital_country: string | null;
  hospital_maps_url: string;
  home_care_mode: boolean;
  home_address: string | null;
  home_address_line2: string | null;
  home_postal_code: string | null;
  home_city: string | null;
  home_country: string | null;
  home_maps_url: string | null;
  visit_rules: string;
  admin_notes: string;
  theme: ThemeKey;
  start_date: string;
  end_date: string;
  is_active: boolean;
  premium: boolean;
  invite_token: string;
  dossier_code: string | null;
  cap_email_sent_at: string | null;
  stripe_payment_id: string | null;
  last_activity_at: string;
  purge_scheduled_at: string;
  created_at: string;
  // Active le Planning des intervenants (infirmier·ère, kiné, aide à
  // domicile…) pour cet espace — voir components/IntervenantFicheModal.tsx
  // et app/(admin)/intervenants.tsx. Désactivé par défaut.
  intervenants_enabled: boolean;
}

export interface SlotConfig {
  id: string;
  space_id: string;
  visit_start_hour: number;
  visit_start_minute: number;
  visit_end_hour: number;
  visit_end_minute: number;
  slot_duration_minutes: number;
  min_gap_minutes: number;
  gap_includes_duration: boolean;
  max_visitors_per_slot: number;
  night_enabled: boolean;
  max_night_visitors: number;
  night_start_hour: number;
  night_start_minute: number;
  night_end_hour: number;
  night_end_minute: number;
  allowed_weekdays: number[];
  blocked_dates: string[];
  blocked_date_reasons: Record<string, string>;
  // Mode "1 visite / jour" (Règles de visite) : une fois un créneau "Visite"
  // pris un jour donné, les autres créneaux de ce jour deviennent
  // indisponibles pour tout le monde sauf pour l'auteur de la réservation
  // (voir check_slot_capacity() côté serveur et (visitor)/home/slots.tsx).
  one_visit_per_day: boolean;
  // "all" = tous les créneaux intervenants sont prioritaires sur les visites
  // (comportement historique). "selected" = seuls les intervenants avec
  // intervenant_profiles.priority_slots=true le sont — voir
  // check_slot_capacity()/book_intervention() côté serveur et
  // components/IntervenantPriorityModal.tsx.
  intervenant_priority_mode: "all" | "selected";
  // Autorisation des intervenants à réserver des nuitées : "disabled" (aucun,
  // défaut), "some" (seuls ceux listés dans night_authorized_intervenants),
  // "all" (tous) — voir components/NightIntervenantModal.tsx et
  // (visitor)/home/nights.tsx.
  night_intervenant_mode: "disabled" | "some" | "all";
  // Autorisation des visiteurs à réserver des nuitées : "all" (tous, défaut
  // — comportement historique) ou "some" (seuls ceux listés dans
  // night_authorized_visitors) — voir components/NightVisitorModal.tsx.
  night_visitor_mode: "all" | "some";
  // Autorisation des intervenants à publier sur "Nouvelles du jour" des
  // messages visibles aussi par les visiteurs : "disabled" (défaut, canal
  // intervenants+admin non visible des visiteurs), "some" (seuls ceux listés
  // dans news_authorized_intervenants), "all" (tous) — voir
  // components/NewsIntervenantModal.tsx et components/NewsFeed.tsx. L'admin
  // suit la même règle pour ses propres publications (pas de réglage séparé,
  // visibles seulement en "all" — "some" ne concerne que les intervenants
  // listés).
  news_intervenant_mode: "disabled" | "some" | "all";
}

// Snapshot versionné de SlotConfig — une ligne fait foi de son valid_from
// jusqu'au valid_from suivant pour le même space_id, voir
// resolveConfigForDate() dans lib/slotUtils.ts.
export interface SlotConfigHistoryEntry {
  id: string;
  space_id: string;
  valid_from: string;
  visit_start_hour: number;
  visit_start_minute: number;
  visit_end_hour: number;
  visit_end_minute: number;
  slot_duration_minutes: number;
  min_gap_minutes: number;
  gap_includes_duration: boolean;
  max_visitors_per_slot: number;
  night_enabled: boolean;
  max_night_visitors: number;
  night_start_hour: number;
  night_start_minute: number;
  night_end_hour: number;
  night_end_minute: number;
  allowed_weekdays: number[];
  blocked_dates: string[];
  blocked_date_reasons: Record<string, string>;
  one_visit_per_day: boolean;
}

export interface Reservation {
  id: string;
  space_id: string;
  date: string;
  creneau: string;
  prenom: string;
  nom: string;
  telephone: string;
  type: "Visite" | "Nuit" | "Intervention";
  pin: string;
  push_token: string | null;
  timestamp: string;
  // Posés par apply_slot_rule_change() quand un changement de règles de
  // visite invalide cette réservation : previous_date/previous_creneau
  // gardent l'horaire d'origine pour le message affiché au visiteur,
  // alert_message est le texte à afficher, alert_seen passe à true une
  // fois le popup vu/la réservation modifiée (voir RebookingAlertModal).
  previous_date: string | null;
  previous_creneau: string | null;
  alert_message: string | null;
  alert_type: "rebooked" | "night_cancelled" | "rebooking_failed" | "day_cap_suspended" | "booking_proposal" | null;
  alert_seen: boolean;
  // Prénoms des personnes accompagnant le réservataire, séparés par des
  // virgules — affiché dans l'événement calendrier natif ("Avec ..."),
  // ne compte pas dans l'occupation du créneau (max_visitors_per_slot).
  companion_firstnames: string | null;
  // Id de la réservation "principale" partagé par toutes les lignes créées
  // ensemble via "+ Ajouter une autre personne" (admin) — null si solo.
  group_id: string | null;
  // Identité du visiteur connecté qui a réservé, uniquement renseignée quand
  // il a remplacé le prénom/nom préremplis (les siens) par ceux d'une autre
  // personne — affiché côté admin sous le nom enregistré ("Programmé par").
  // Null quand le visiteur a réservé pour lui-même.
  booked_by_prenom: string | null;
  booked_by_nom: string | null;
  // Email optionnel de la personne pour qui la réservation est faite (ex. un
  // proche âgé) — saisi uniquement quand le visiteur réserve sous un nom
  // différent du sien, sert à proposer l'envoi d'un email de confirmation
  // (voir notify-guest-confirmation). Null si non renseigné ou réservation
  // pour soi-même.
  email: string | null;
  // Renseignés uniquement pour type="Intervention" (voir book_intervention
  // RPC) — duration_minutes/intervention_label sont copiés depuis
  // intervention_types au moment de la réservation (pas de FK, l'historique
  // ne doit jamais bouger si le type est modifié/supprimé ensuite).
  duration_minutes: number | null;
  intervention_label: string | null;
  intervenant_profile_id: string | null;
}

// Fiche d'un intervenant (infirmier·ère, kiné, aide à domicile…) — même
// mécanique d'identité device-local + PIN que les visiteurs, voir
// lib/visitorSession.ts. Créée à la première connexion via
// components/IntervenantFicheModal.tsx.
export interface IntervenantProfile {
  id: string;
  space_id: string;
  prenom: string;
  nom: string;
  // Null pour une fiche créée par l'admin sans connexion possible (voir
  // components/AdminNewIntervenantFlow.tsx) — sinon le PIN choisi par
  // l'intervenant à sa propre création de fiche.
  pin: string | null;
  photo: string | null;
  photo_updated_at: string | null;
  telephone: string | null;
  phrase_totem: string | null;
  // Optionnel — sert à envoyer une confirmation de créneau réservé (voir
  // notify-intervention-confirmation) et, pour une fiche avec compte, un
  // email de secours en plus du message in-app.
  email: string | null;
  // Clé du métier (voir lib/metiers.ts, ex. "infirmier", "kine") — saisi à la
  // création de la fiche, sert à afficher la spécialisation et à choisir
  // l'icône de repli de l'avatar (IntervenantAvatar.tsx) sans photo.
  metier: string | null;
  // 2ᵉ spécialisation optionnelle (même format de clé que metier) — voir
  // IntervenantFicheModal.tsx, section "2ᵉ spécialisation".
  metier_secondaire: string | null;
  // Créneaux d'intervention prioritaires sur les visites — n'a d'effet que
  // si slot_config.intervenant_priority_mode = "selected" (sinon tous les
  // intervenants sont prioritaires, voir IntervenantPriorityModal.tsx).
  priority_slots: boolean;
  created_at: string;
}

// Type d'intervention défini par l'intervenant (ex. "Toilette" 30min,
// "Kiné" 45min) — un intervenant peut en avoir plusieurs, de durées
// différentes. Choisi au moment de réserver un créneau (voir
// components/InterventionBookingFlow.tsx).
export interface InterventionType {
  id: string;
  intervenant_profile_id: string;
  label: string;
  duration_minutes: number;
  created_at: string;
  // Dénormalisé depuis intervenant_profiles, synchronisé en continu par
  // trigger (voir migration 20260815_intervention_types_intervenant_identity.sql)
  // — pas utilisé côté app pour l'instant (toujours accessible via
  // intervenant_profile_id), juste pour parcourir la table côté Supabase.
  prenom?: string | null;
  nom?: string | null;
  metier?: string | null;
}

// Trace permanente d'un recasage/annulation automatique posé par
// apply_slot_rule_change() — contrairement aux champs alert_* de Reservation
// (qui s'effacent dès que la réservation est modifiée/vue), cette ligne
// reste en base pour toujours : c'est l'historique affiché dans "Mes
// réservations" (visiteur) et "Modification de réservations" (admin).
export interface ReservationChangeHistoryEntry {
  id: string;
  space_id: string;
  reservation_id: string;
  prenom: string;
  nom: string;
  type: "Visite" | "Nuit";
  change_type: "rebooked" | "night_cancelled" | "rebooking_failed";
  previous_date: string | null;
  previous_creneau: string | null;
  new_date: string | null;
  new_creneau: string | null;
  message: string;
  changed_at: string;
  // Vu dans "🔔 Mes alertes" (voir MyAlertsModal.tsx) — ne filtre que cet
  // affichage-là, "Mes réservations" continue de montrer tout l'historique.
  seen: boolean;
}

export interface SouvenirPhoto {
  id: string;
  space_id: string;
  filename: string;
  caption: string;
  uploaded_by_prenom: string;
  uploaded_by_nom: string;
  uploaded_by_pin: string;
  source_type: "news" | "support" | null;
  source_id: string | null;
  created_at: string;
  url?: string;
  // Suppression "douce" par l'admin (photo d'un autre utilisateur que lui) :
  // reste visible avec un bandeau rouge pour l'auteur uniquement, masqué pour
  // tous les autres. Voir supabase/migrations/20260811_content_deleted_by_admin.sql.
  deleted_by_admin: boolean;
}

export interface NewsEntry {
  id: string;
  space_id: string;
  news_date: string;
  content: string;
  photos: string[];
  author_prenom: string;
  author_nom: string;
  author_pin: string;
  // Rôle de l'auteur au moment de la publication — détermine la portée du
  // message : "intervenant"/"admin" restent réservés au canal
  // intervenants+admin, sauf si l'espace autorise leur visibilité aux
  // visiteurs (voir slot_config.news_intervenant_mode et
  // components/NewsFeed.tsx). Les messages "visiteur" restent toujours
  // visibles de tous, comme avant cette fonctionnalité.
  author_role: "visiteur" | "intervenant" | "admin";
  // Intervenant auteur (rempli uniquement si author_role = 'intervenant') —
  // sert à vérifier son autorisation dans news_authorized_intervenants quand
  // slot_config.news_intervenant_mode = 'some'.
  intervenant_profile_id: string | null;
  created_at: string;
  // Suppression "douce" par l'admin (contenu d'un autre utilisateur que lui) :
  // reste visible avec un bandeau rouge pour l'auteur uniquement, masqué pour
  // tous les autres. Voir supabase/migrations/20260811_content_deleted_by_admin.sql.
  deleted_by_admin: boolean;
}

// Réponse à une nouvelle ("Nouvelles du jour") — même principe que
// SupportMessageReply (Mur de soutien), voir
// supabase/migrations/20260814_news_entry_replies.sql.
export interface NewsEntryReply {
  id: string;
  entry_id: string;
  space_id: string;
  reply_text: string;
  author_prenom: string;
  author_nom: string;
  author_pin: string | null;
  photo: string | null;
  created_at: string;
  deleted_by_admin: boolean;
}

// Un aidant qui ne peut pas honorer l'horaire demandé pour un besoin
// Transport peut proposer un autre créneau (aller et/ou retour, voire un
// autre jour) au lieu de prendre en charge directement — voir
// components/Entraide.tsx. `out_time`/`return_time` reprennent toujours la
// valeur demandée par défaut dans le formulaire de proposition, donc pas
// besoin de champs nullables ici : l'aidant n'édite que ce qui ne lui
// convient pas.
export interface TransportProposal {
  id: string;
  prenom: string;
  nom: string;
  pin: string;
  date: string;
  // Nullable : un aidant peut ne proposer que l'aller, que le retour, ou les
  // deux — offers_out/offers_return indiquent explicitement lequel, plutôt
  // que de déduire ça de la présence de out_time/return_time (nécessaire car
  // le formulaire pré-remplit ces champs même quand une case est décochée).
  out_time: string | null;
  return_time: string | null;
  offers_out: boolean;
  offers_return: boolean;
  note: string | null;
  created_at: string;
  // Réponse de l'auteur/bénéficiaire à cette proposition précise (distincte
  // de note, qui vient du proposant) — visible sur le besoin, et déclenche
  // une alerte au proposant tant que response_seen est faux.
  response: string | null;
  response_seen: boolean;
  // Vrai quand l'auteur/bénéficiaire a cliqué "Aucune ne convient" — la
  // proposition reste visible (jamais supprimée du tableau) mais affichée
  // avec un tag "Déclinée" et sans bouton de validation.
  declined: boolean;
}

export interface Task {
  id: string;
  space_id: string;
  title: string;
  description: string;
  category: "repas" | "affaires" | "courses" | "transport" | "administratif" | "autre" | "relais";
  status: "ouvert" | "pris_en_charge" | "fait" | "ferme";
  claimed_by_prenom: string | null;
  claimed_by_nom: string | null;
  claimed_by_pin: string | null;
  // Pour un besoin Transport aller-retour, l'aller et le retour peuvent être
  // pris en charge par deux personnes différentes suite à des propositions
  // distinctes — claimed_by_prenom/nom/pin ci-dessus désignent alors l'aller,
  // et ces champs le retour. Restent null quand la même personne fait les
  // deux (claim direct ou proposition validée pour les deux à la fois).
  transport_return_claimed_by_prenom: string | null;
  transport_return_claimed_by_nom: string | null;
  transport_return_claimed_by_pin: string | null;
  claimed_photo: string | null;
  claimed_text: string | null;
  done_photo: string | null;
  created_by: string;
  photo: string | null;
  created_at: string;
  // Échéance optionnelle (hors Transport, qui a ses propres champs date/heure
  // plus bas) — permet la même fermeture auto que Transport une fois la date
  // dépassée sans prise en charge. Urgent : toutes catégories.
  date_limite: string | null;
  urgent: boolean;
  // Rempli uniquement pour les besoins créés en groupe via une checklist
  // suggérée (voir CHECKLIST_TEMPLATES dans Entraide.tsx) — permet de
  // retrouver et proposer la suppression des autres items de la même liste.
  checklist_batch_id: string | null;
  // Trace de modification visible par tous (ex : quelqu'un choisit
  // "Modifier" plutôt que republier un doublon détecté par
  // findDuplicateAdminTask).
  modified_at: string | null;
  modified_by_prenom: string | null;
  modified_by_nom: string | null;
  // Identité de qui a créé le besoin — manquait jusqu'ici (contrairement à
  // NewsEntry/SupportMessage) ; nécessaire pour savoir qui a le droit de
  // valider une proposition d'horaire Transport (même mécanisme que
  // isMine() sur claimed_by_pin). Rempli uniquement pour category="transport".
  author_prenom: string | null;
  author_nom: string | null;
  author_pin: string | null;
  // Demande initiale (catégorie "transport" uniquement)
  transport_date: string | null;
  transport_out_time: string | null;
  transport_return_time: string | null;
  transport_round_trip: boolean;
  transport_flexible: boolean;
  transport_from: string | null;
  transport_to: string | null;
  // Renseigné uniquement quand l'auteur publie le besoin pour une autre
  // personne (ex. un proche âgé) — distinct de author_prenom/nom, qui reste
  // toujours "qui a posté le besoin". Null = transport pour l'auteur lui-même.
  transport_for_prenom: string | null;
  transport_for_nom: string | null;
  // Composants d'adresse du domicile du demandeur (le lieu de soin est figé
  // — hospital_name côté espace, jamais saisi ici) — servent à générer un
  // lien Google Maps pour l'aidant qui prend en charge. transport_home_is_arrival
  // indique de quel côté (transport_from ou transport_to) se trouve le
  // domicile, puisque "Intervertir" change ce côté sans jamais toucher au
  // contenu du bloc domicile.
  transport_home_postal_code: string | null;
  transport_home_city: string | null;
  transport_home_country: string | null;
  transport_home_maps_url: string | null;
  transport_home_is_arrival: boolean;
  // Horaire retenu, une fois pris en charge directement ou une proposition validée
  transport_confirmed_date: string | null;
  transport_confirmed_out_time: string | null;
  transport_confirmed_return_time: string | null;
  transport_proposals: TransportProposal[];
  // Suppression "douce" par l'admin (besoin d'un autre utilisateur que lui) :
  // reste visible avec un bandeau rouge pour l'auteur uniquement, masqué pour
  // tous les autres. Voir supabase/migrations/20260811_content_deleted_by_admin.sql.
  deleted_by_admin: boolean;
  // Catégorie "relais" uniquement (besoin de relais ponctuel, publié depuis
  // Mon compte — voir components/Entraide.tsx et RelaisAlertModal.tsx). La
  // date de fin réutilise date_limite ci-dessus, seule la date de début est
  // nouvelle. relais_visible_to/relais_recipients ciblent qui reçoit l'alerte
  // de connexion ET voit le besoin dans le mur Entraide ("some" = seuls les
  // prénom/nom listés) ; relais_dismissed_by ne masque que l'alerte, jamais
  // le besoin lui-même.
  relais_start_date: string | null;
  relais_visible_to: "all" | "some" | null;
  relais_recipients: { prenom: string; nom: string }[] | null;
  relais_dismissed_by: { prenom: string; nom: string }[];
}

// Article d'une liste de courses (voir components/ShoppingListModal.tsx),
// rattaché à un besoin category="courses" via task_id — seule source de
// vérité, ouverte à la fois depuis le Mur d'Entraide ("👁️ Aperçu") et
// "📄 Mes documents" (MyChecklist.tsx), donc jamais dupliquée.
export interface ShoppingListItem {
  id: string;
  task_id: string;
  label: string;
  bought: boolean;
  bought_by_prenom: string | null;
  bought_by_nom: string | null;
  position: number;
  created_at: string;
}

// Catalogue des articles de courses déjà saisis au moins une fois dans
// l'espace ("Produits récurrents", voir components/Entraide.tsx) — table
// indépendante de ShoppingListItem, jamais rattachée à un besoin précis.
export interface RecurringShoppingItem {
  id: string;
  space_id: string;
  label: string;
  created_at: string;
}

// Sous-période prise en charge par une personne sur un besoin de relais
// (category="relais") — voir lib/relaisCoverage.ts pour le calcul de
// couverture/trous, et components/Entraide.tsx pour le flux de claim.
// Plusieurs lignes peuvent coexister pour un même task_id, une par
// contributeur·rice ; devient la seule source de vérité pour les preneurs
// d'un besoin relais (tasks.claimed_by_* n'est plus renseigné pour cette
// catégorie).
export interface TaskRelaisCoverage {
  id: string;
  task_id: string;
  prenom: string;
  nom: string;
  pin: string;
  start_date: string;
  end_date: string;
  // Vrai seulement si "Je m'en charge" (tout ce qu'il restait à couvrir) a
  // été choisi plutôt qu'une période saisie à la main — informatif, ne
  // rentre pas dans le calcul de couverture.
  full_period: boolean;
  claimed_text: string | null;
  claimed_photo: string | null;
  created_at: string;
}

// Item de "Ma Checklist" (bloc dédié dans Mon Compte, admin + visiteur) —
// voir components/MyChecklist.tsx. task_id renseigné uniquement pour les
// items importés depuis une checklist suggérée (voir lib/checklistTemplates.ts) :
// ce sont alors aussi de vrais besoins dans le Mur d'Entraide, et status doit
// rester synchronisé avec tasks.status dans les deux sens. Un item tapé
// librement (texte libre) n'a jamais de task_id : purement personnel.
export interface PersonalChecklistItem {
  id: string;
  space_id: string;
  owner_prenom: string;
  owner_nom: string;
  owner_pin: string;
  title: string;
  status: "a_faire" | "fait";
  task_id: string | null;
  // Checklist suggérée d'origine (voir lib/checklistTemplates.ts), pour
  // regrouper l'affichage en sous-blocs comme "Mes contributions" — null pour
  // un item purement personnel ou un item rejoint dont le titre ne
  // correspond à aucune checklist suggérée connue.
  // Doit rester synchronisé avec ChecklistContext dans lib/checklistTemplates.ts
  // (dupliqué ici plutôt qu'importé pour éviter un cycle d'imports avec Task).
  checklist_context:
    | "adulte"
    | "enfant"
    | "domicile"
    | "situations_besoins"
    | "retour_domicile"
    | "relais_familial"
    | "repit_aidant"
    | "conge_proche_aidant"
    | "maintien_domicile"
    | "handicap"
    | "fin_de_vie"
    | null;
  // Nom d'une checklist personnelle créée via "+ Créer une checklist" (voir
  // components/MyChecklist.tsx) — regroupe ces items sous ce nom, en plus des
  // 3 checklists suggérées et de "Mes items personnels" (items sans nom).
  custom_checklist_name: string | null;
  // Échéance/urgence par item (assistant d'import, voir MyChecklist.tsx et
  // Entraide.tsx) — persistées ici même pour un import privé (task_id null),
  // à la différence de tasks.date_limite/urgent qui ne portent que les items
  // publiés sur le Mur d'Entraide.
  date_limite: string | null;
  urgent: boolean;
  created_at: string;
}

// Trace d'un courrier généré via "✉️ Préparer le courrier" (voir
// components/MyChecklist.tsx, downloadLetter, et "Mes documents"). Le
// fichier .doc n'est jamais stocké côté serveur (généré à la volée en RTF,
// voir lib/mediaShare.ts) — values permet de reconstituer le même contenu
// pour un re-téléchargement ultérieur, sans ressaisir le formulaire.
export interface PersonalDocument {
  id: string;
  space_id: string;
  owner_prenom: string;
  owner_nom: string;
  owner_pin: string;
  // LetterTemplate.id (voir lib/letterTemplates.ts).
  letter_id: string;
  label: string;
  values: Record<string, string>;
  created_at: string;
}

// Modèle de checklist réutilisable par un intervenant, indépendant d'un
// space_id précis — voir components/MyChecklist.tsx (💾 Enregistrer comme
// modèle / 📥 Mes modèles) et supabase/migrations/20260728_intervenant_checklist_templates.sql.
// Identité cross-space par téléphone normalisé, même mécanisme que "Mes
// espaces" (app/(visitor)/account.tsx, linkedSpaces).
export interface IntervenantChecklistTemplate {
  id: string;
  telephone: string;
  name: string;
  items: string[];
  created_at: string;
}

// Photo qu'un utilisateur a téléchargée/partagée depuis la publication d'un
// AUTRE (Nouvelles/Soutien) — alimente la section "Photos téléchargées" de
// la page Mes Souvenirs (components/MesSouvenirs.tsx), voir lib/mediaShare.ts.
export interface SavedMedia {
  id: string;
  space_id: string;
  source_type: "news" | "support";
  source_id: string;
  photo_url: string;
  saved_by_pin: string;
  saved_by_prenom: string;
  saved_by_nom: string;
  created_at: string;
}

export interface SupportMessage {
  id: string;
  space_id: string;
  message: string;
  author_prenom: string;
  author_nom: string;
  author_pin: string | null;
  photo: string | null;
  created_at: string;
  // Suppression "douce" par l'admin (message d'un autre utilisateur que lui) :
  // reste visible avec un bandeau rouge pour l'auteur uniquement, masqué pour
  // tous les autres. Voir supabase/migrations/20260811_content_deleted_by_admin.sql.
  deleted_by_admin: boolean;
}

// Photo de profil visiteur, synchronisée depuis "Mon compte" (voir
// app/(visitor)/account.tsx) — affichée dans la fiche visiteur en lecture
// seule ouverte en cliquant le nom d'un autre visiteur (voir
// components/VisitorProfileModal.tsx). Identité approximée par prénom+nom,
// comme "Mes contributions" dans le même écran.
export interface VisitorProfile {
  id: string;
  space_id: string;
  prenom: string;
  nom: string;
  photo: string | null;
  motto: string | null;
  updated_at: string;
}

export interface SupportMessageReply {
  id: string;
  message_id: string;
  space_id: string;
  reply_text: string;
  author_prenom: string;
  author_nom: string;
  author_pin: string | null;
  photo: string | null;
  created_at: string;
  // Suppression "douce" par l'admin (réponse d'un autre utilisateur que lui) :
  // reste visible avec un bandeau rouge pour l'auteur uniquement, masqué pour
  // tous les autres. Voir supabase/migrations/20260811_content_deleted_by_admin.sql.
  deleted_by_admin: boolean;
}
