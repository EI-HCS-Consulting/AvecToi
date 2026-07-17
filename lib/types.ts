import type { ThemeKey } from "./themes";

export interface PatientSpace {
  id: string;
  admin_id: string;
  admin_firstname: string | null;
  admin_lastname: string | null;
  patient_firstname: string;
  patient_lastname: string;
  patient_photo_url: string | null;
  patient_birthdate: string | null;
  patient_sex: "M" | "F" | null;
  patient_blood_type: string | null;
  patient_allergies: string | null;
  patient_motto: string | null;
  patient_admission_date: string | null;
  hospital_name: string;
  hospital_service: string;
  hospital_sector: string | null;
  hospital_room: string;
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
}

export interface Reservation {
  id: string;
  space_id: string;
  date: string;
  creneau: string;
  prenom: string;
  nom: string;
  telephone: string;
  type: "Visite" | "Nuit";
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
  alert_type: "rebooked" | "night_cancelled" | "rebooking_failed" | null;
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
  created_at: string;
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
}

export interface Task {
  id: string;
  space_id: string;
  title: string;
  description: string;
  category: "repas" | "affaires" | "courses" | "transport" | "administratif" | "autre";
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
  transport_home_is_arrival: boolean;
  // Horaire retenu, une fois pris en charge directement ou une proposition validée
  transport_confirmed_date: string | null;
  transport_confirmed_out_time: string | null;
  transport_confirmed_return_time: string | null;
  transport_proposals: TransportProposal[];
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
  created_at: string;
}
