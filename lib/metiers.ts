import type { Ionicons } from "@expo/vector-icons";

// Catalogue pré-établi des métiers d'intervenants possibles en soins à
// domicile, ainsi que ceux pouvant venir en renfort de l'équipe médicale
// hospitalière — utilisé pour :
//  - la fiche intervenant (famille puis métier saisis à la création, voir
//    IntervenantFicheModal.tsx) ;
//  - l'icône de repli de l'avatar (PatientAvatar.tsx) quand aucune photo
//    n'est définie ;
//  - la liste de soins suggérés par métier/famille (SoinFormModal.tsx) ;
//  - la reconnaissance d'icône par libellé exact pour "Mes soins"
//    (lib/soinIcons.ts, SoinAvatar.tsx).
//
// `key` (Metier et Famille) est la valeur stockée en base
// (intervenant_profiles.metier pour Metier.key) — ne jamais la renommer sans
// migration, seuls label/icon/soins/familleKey peuvent évoluer librement.
export interface MetierSoin {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export interface Famille {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export interface Metier {
  key: string;
  familleKey: string | null;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  soins: MetierSoin[];
}

export const FAMILLES: Famille[] = [
  { key: "medical", label: "Médical / paramédical", icon: "medkit-outline" },
  { key: "bien_etre", label: "Bien-être / soins corporels", icon: "sparkles-outline" },
  { key: "psy", label: "Accompagnement psychologique", icon: "chatbubble-ellipses-outline" },
  { key: "aide_domicile", label: "Aide à domicile / vie quotidienne", icon: "home-outline" },
  { key: "social_admin", label: "Accompagnement social / administratif", icon: "people-outline" },
  { key: "transport", label: "Transport", icon: "car-outline" },
  { key: "vie_sociale", label: "Vie sociale / loisirs / spirituel", icon: "sunny-outline" },
];

export const METIERS: Metier[] = [
  // ─── A. Médical / paramédical ─────────────────────────────────────────
  {
    key: "medecin",
    familleKey: "medical",
    label: "Médecin",
    icon: "medkit-outline",
    soins: [
      { label: "Consultation", icon: "medkit-outline" },
      { label: "Téléconsultation", icon: "videocam-outline" },
      { label: "Coordination du parcours", icon: "git-network-outline" },
      { label: "Éducation thérapeutique du patient", icon: "school-outline" },
      { label: "Renouvellement d'ordonnance", icon: "document-text-outline" },
      { label: "Visite de contrôle", icon: "checkmark-circle-outline" },
    ],
  },
  {
    key: "infirmier",
    familleKey: "medical",
    label: "Infirmier·ère",
    icon: "medical-outline",
    soins: [
      { label: "Pansement", icon: "bandage-outline" },
      { label: "Injection / Piqûre", icon: "medical-outline" },
      { label: "Prise de sang", icon: "water-outline" },
      { label: "Perfusion", icon: "git-commit-outline" },
      { label: "Surveillance post-opératoire", icon: "pulse-outline" },
      { label: "Éducation thérapeutique du patient", icon: "school-outline" },
    ],
  },
  {
    key: "aide_soignant",
    familleKey: "medical",
    label: "Aide-soignant·e",
    icon: "hand-left-outline",
    soins: [
      { label: "Toilette", icon: "water-outline" },
      { label: "Aide au lever / coucher", icon: "bed-outline" },
      { label: "Aide aux repas", icon: "restaurant-outline" },
      { label: "Change", icon: "refresh-outline" },
    ],
  },
  {
    key: "kine",
    familleKey: "medical",
    label: "Kinésithérapeute",
    icon: "body-outline",
    soins: [
      { label: "Rééducation motrice", icon: "walk-outline" },
      { label: "Massage thérapeutique", icon: "body-outline" },
      { label: "Drainage lymphatique", icon: "water-outline" },
      { label: "Kiné respiratoire", icon: "fitness-outline" },
    ],
  },
  {
    key: "ergotherapeute",
    familleKey: "medical",
    label: "Ergothérapeute",
    icon: "construct-outline",
    soins: [
      { label: "Adaptation du domicile", icon: "construct-outline" },
      { label: "Rééducation gestes du quotidien", icon: "hand-left-outline" },
    ],
  },
  {
    key: "orthophoniste",
    familleKey: "medical",
    label: "Orthophoniste",
    icon: "mic-outline",
    soins: [
      { label: "Rééducation du langage", icon: "mic-outline" },
      { label: "Rééducation de la déglutition", icon: "restaurant-outline" },
    ],
  },
  {
    key: "orthoptiste",
    familleKey: "medical",
    label: "Orthoptiste",
    icon: "eye-outline",
    soins: [
      { label: "Rééducation visuelle", icon: "eye-outline" },
    ],
  },
  {
    key: "psychomotricien",
    familleKey: "medical",
    label: "Psychomotricien·ne",
    icon: "walk-outline",
    soins: [
      { label: "Gym douce", icon: "walk-outline" },
      { label: "Travail de l'équilibre", icon: "walk-outline" },
      { label: "Relaxation corporelle", icon: "leaf-outline" },
    ],
  },
  {
    key: "dieteticien",
    familleKey: "medical",
    label: "Diététicien·ne",
    icon: "restaurant-outline",
    soins: [
      { label: "Bilan nutritionnel", icon: "clipboard-outline" },
      { label: "Suivi alimentaire", icon: "restaurant-outline" },
    ],
  },
  {
    key: "podologue",
    familleKey: "medical",
    label: "Pédicure-podologue",
    icon: "footsteps-outline",
    soins: [
      { label: "Soin des pieds (pédicure)", icon: "footsteps-outline" },
      { label: "Podologie (soin médical du pied)", icon: "footsteps-outline" },
      { label: "Semelles orthopédiques", icon: "footsteps-outline" },
    ],
  },
  {
    key: "sage_femme",
    familleKey: "medical",
    label: "Sage-femme",
    icon: "heart-outline",
    soins: [
      { label: "Suivi post-partum", icon: "heart-outline" },
      { label: "Accompagnement allaitement", icon: "heart-outline" },
    ],
  },
  {
    key: "pharmacien",
    familleKey: "medical",
    label: "Pharmacien·ne",
    icon: "bag-outline",
    soins: [
      { label: "Préparation piluliers", icon: "bag-outline" },
      { label: "Livraison de médicaments", icon: "bicycle-outline" },
    ],
  },
  {
    key: "labo",
    familleKey: "medical",
    label: "Technicien·ne de laboratoire",
    icon: "flask-outline",
    soins: [
      { label: "Prélèvement à domicile", icon: "flask-outline" },
    ],
  },

  // ─── B. Bien-être / soins corporels ───────────────────────────────────
  {
    key: "socio_esthetique",
    familleKey: "bien_etre",
    label: "Socio-esthéticien·ne",
    icon: "sparkles-outline",
    soins: [
      { label: "Socio-esthétique", icon: "sparkles-outline" },
      { label: "Soin de la peau", icon: "sparkles-outline" },
      { label: "Maquillage", icon: "sparkles-outline" },
    ],
  },
  {
    key: "esthetique",
    familleKey: "bien_etre",
    label: "Esthéticien·ne",
    icon: "sparkles-outline",
    soins: [
      { label: "Manucure", icon: "hand-left-outline" },
      { label: "Soin du visage", icon: "sparkles-outline" },
      { label: "Maquillage", icon: "sparkles-outline" },
    ],
  },
  {
    key: "coiffeur",
    familleKey: "bien_etre",
    label: "Coiffeur·se",
    icon: "cut-outline",
    soins: [
      { label: "Coupe", icon: "cut-outline" },
      { label: "Shampoing", icon: "water-outline" },
      { label: "Coiffage", icon: "sparkles-outline" },
      { label: "Rasage / entretien barbe", icon: "cut-outline" },
    ],
  },
  {
    key: "masseur_bien_etre",
    familleKey: "bien_etre",
    label: "Masseur·se bien-être",
    icon: "hand-right-outline",
    soins: [
      { label: "Massage relaxant", icon: "hand-right-outline" },
    ],
  },
  {
    key: "reflexologue",
    familleKey: "bien_etre",
    label: "Réflexologue",
    icon: "footsteps-outline",
    soins: [
      { label: "Réflexologie plantaire", icon: "footsteps-outline" },
      { label: "Réflexologie palmaire", icon: "hand-left-outline" },
    ],
  },
  {
    key: "aromatherapie",
    familleKey: "bien_etre",
    label: "Praticien·ne aromathérapie",
    icon: "leaf-outline",
    soins: [
      { label: "Séance d'aromathérapie", icon: "leaf-outline" },
      { label: "Relaxation", icon: "leaf-outline" },
    ],
  },
  {
    key: "sophrologue",
    familleKey: "bien_etre",
    label: "Sophrologue",
    icon: "cloud-outline",
    soins: [
      { label: "Séance de sophrologie", icon: "cloud-outline" },
      { label: "Gestion du stress", icon: "cloud-outline" },
      { label: "Respiration guidée", icon: "cloud-outline" },
      { label: "Luminothérapie", icon: "sunny-outline" },
    ],
  },
  {
    key: "hypnose",
    familleKey: "bien_etre",
    label: "Praticien·ne hypnose",
    icon: "moon-outline",
    soins: [
      { label: "Séance d'hypnose", icon: "moon-outline" },
      { label: "Aide au sommeil", icon: "moon-outline" },
    ],
  },
  {
    key: "osteopathe",
    familleKey: "bien_etre",
    label: "Ostéopathe",
    icon: "accessibility-outline",
    soins: [
      { label: "Séance d'ostéopathie", icon: "accessibility-outline" },
    ],
  },
  {
    key: "acupuncteur",
    familleKey: "bien_etre",
    label: "Acupuncteur·rice",
    icon: "body-outline",
    soins: [
      { label: "Séance d'acupuncture", icon: "body-outline" },
    ],
  },
  {
    key: "naturopathe",
    familleKey: "bien_etre",
    label: "Naturopathe",
    icon: "leaf-outline",
    soins: [
      { label: "Consultation naturopathie", icon: "leaf-outline" },
      { label: "Conseils nutrition", icon: "restaurant-outline" },
    ],
  },
  {
    key: "yoga_gym_douce",
    familleKey: "bien_etre",
    label: "Professeur·e de yoga / gym douce",
    icon: "fitness-outline",
    soins: [
      { label: "Yoga doux", icon: "fitness-outline" },
      { label: "Gym douce", icon: "walk-outline" },
      { label: "Relaxation corporelle", icon: "leaf-outline" },
    ],
  },

  // ─── C. Accompagnement psychologique ──────────────────────────────────
  {
    key: "psychologue",
    familleKey: "psy",
    label: "Psychologue",
    icon: "chatbubble-ellipses-outline",
    soins: [
      { label: "Entretien de soutien", icon: "chatbubble-ellipses-outline" },
      { label: "Suivi psychologique", icon: "heart-outline" },
    ],
  },
  {
    key: "psychiatre",
    familleKey: "psy",
    label: "Psychiatre",
    icon: "pulse-outline",
    soins: [
      { label: "Consultation psychiatrique", icon: "pulse-outline" },
      { label: "Suivi médicamenteux", icon: "medkit-outline" },
      { label: "Renouvellement d'ordonnance", icon: "document-text-outline" },
    ],
  },
  {
    key: "art_therapeute",
    familleKey: "psy",
    label: "Art-thérapeute",
    icon: "color-palette-outline",
    soins: [
      { label: "Art-thérapie", icon: "color-palette-outline" },
      { label: "Activité créative", icon: "color-palette-outline" },
    ],
  },
  {
    key: "musicotherapeute",
    familleKey: "psy",
    label: "Musicothérapeute",
    icon: "musical-notes-outline",
    soins: [
      { label: "Musicothérapie", icon: "musical-notes-outline" },
    ],
  },
  {
    key: "chant_therapie",
    familleKey: "psy",
    label: "Praticien·ne chant-thérapie",
    icon: "musical-notes-outline",
    soins: [
      { label: "Chant-thérapie", icon: "musical-notes-outline" },
    ],
  },
  {
    key: "animateur_groupe_parole",
    familleKey: "psy",
    label: "Animateur·rice groupe de parole",
    icon: "people-circle-outline",
    soins: [
      { label: "Groupe de parole", icon: "people-circle-outline" },
      { label: "Soutien aux proches / aidants", icon: "people-circle-outline" },
    ],
  },
  {
    key: "accompagnant_fin_de_vie",
    familleKey: "psy",
    label: "Accompagnant·e fin de vie",
    icon: "heart-outline",
    soins: [
      { label: "Présence", icon: "heart-outline" },
      { label: "Accompagnement de fin de vie", icon: "heart-outline" },
      { label: "Écoute", icon: "chatbubble-ellipses-outline" },
    ],
  },

  // ─── D. Aide à domicile / vie quotidienne ─────────────────────────────
  {
    key: "auxiliaire_vie",
    familleKey: "aide_domicile",
    label: "Auxiliaire de vie",
    icon: "home-outline",
    soins: [
      { label: "Toilette", icon: "water-outline" },
      { label: "Aide aux repas", icon: "restaurant-outline" },
      { label: "Aide à l'habillage", icon: "shirt-outline" },
      { label: "Courses", icon: "cart-outline" },
      { label: "Ménage léger", icon: "home-outline" },
      { label: "Compagnie / présence", icon: "people-outline" },
    ],
  },
  {
    key: "amp_aes",
    familleKey: "aide_domicile",
    label: "AMP / AES",
    icon: "hand-left-outline",
    soins: [
      { label: "Aide à l'autonomie", icon: "hand-left-outline" },
      { label: "Accompagnement quotidien", icon: "home-outline" },
      { label: "Activités", icon: "color-palette-outline" },
    ],
  },
  {
    key: "tisf",
    familleKey: "aide_domicile",
    label: "TISF (technicien·ne intervention sociale et familiale)",
    icon: "home-outline",
    soins: [
      { label: "Soutien familial", icon: "people-outline" },
      { label: "Organisation du domicile", icon: "home-outline" },
      { label: "Aide aux démarches", icon: "document-text-outline" },
    ],
  },
  {
    key: "aide_menagere",
    familleKey: "aide_domicile",
    label: "Aide ménagère",
    icon: "home-outline",
    soins: [
      { label: "Ménage", icon: "home-outline" },
      { label: "Linge / lessive", icon: "shirt-outline" },
      { label: "Repassage", icon: "shirt-outline" },
      { label: "Entretien du logement", icon: "home-outline" },
    ],
  },
  {
    key: "employe_service_domicile",
    familleKey: "aide_domicile",
    label: "Employé·e de service à domicile",
    icon: "basket-outline",
    soins: [
      { label: "Courses", icon: "cart-outline" },
      { label: "Préparation repas", icon: "restaurant-outline" },
      { label: "Jardinage", icon: "leaf-outline" },
      { label: "Petit bricolage", icon: "construct-outline" },
    ],
  },

  // ─── E. Accompagnement social / administratif ─────────────────────────
  {
    key: "assistant_social",
    familleKey: "social_admin",
    label: "Assistant·e social·e",
    icon: "people-outline",
    soins: [
      { label: "Aide aux démarches", icon: "document-text-outline" },
      { label: "Démarches CPAM / mutuelle", icon: "document-text-outline" },
      { label: "Orientation", icon: "folder-outline" },
    ],
  },
  {
    key: "conseiller_esf",
    familleKey: "social_admin",
    label: "Conseiller·ère en économie sociale et familiale",
    icon: "document-text-outline",
    soins: [
      { label: "Aide à l'organisation du domicile", icon: "home-outline" },
      { label: "Budget", icon: "document-text-outline" },
      { label: "Démarches", icon: "document-text-outline" },
    ],
  },
  {
    key: "coordinateur_parcours",
    familleKey: "social_admin",
    label: "Coordinateur·rice de parcours",
    icon: "git-network-outline",
    soins: [
      { label: "Coordination du parcours", icon: "git-network-outline" },
      { label: "Lien entre intervenants", icon: "people-outline" },
    ],
  },
  {
    key: "benevole_association",
    familleKey: "social_admin",
    label: "Bénévole d'association",
    icon: "people-outline",
    soins: [
      { label: "Visite / compagnie", icon: "people-outline" },
      { label: "Transport", icon: "car-outline" },
      { label: "Démarches", icon: "document-text-outline" },
      { label: "Lecture", icon: "book-outline" },
    ],
  },

  // ─── F. Transport ──────────────────────────────────────────────────────
  {
    key: "chauffeur_taxi",
    familleKey: "transport",
    label: "Chauffeur·se taxi conventionné",
    icon: "car-outline",
    soins: [
      { label: "Transport accompagné", icon: "car-outline" },
      { label: "Accompagnement RDV médical", icon: "medkit-outline" },
    ],
  },
  {
    key: "ambulancier",
    familleKey: "transport",
    label: "Ambulancier·ère / Brancardier·ère",
    icon: "car-outline",
    soins: [
      { label: "Transport médicalisé", icon: "car-outline" },
      { label: "Transfert brancard", icon: "car-outline" },
      { label: "Transport PMR", icon: "car-outline" },
    ],
  },
  {
    key: "transport_pmr",
    familleKey: "transport",
    label: "Transport PMR / accompagné",
    icon: "car-outline",
    soins: [
      { label: "Transport adapté", icon: "car-outline" },
      { label: "Accompagnement courses", icon: "cart-outline" },
    ],
  },

  // ─── G. Vie sociale / loisirs / spirituel ─────────────────────────────
  {
    key: "animateur_socioculturel",
    familleKey: "vie_sociale",
    label: "Animateur·rice socioculturel·le",
    icon: "game-controller-outline",
    soins: [
      { label: "Activité créative", icon: "color-palette-outline" },
      { label: "Jeux", icon: "game-controller-outline" },
      { label: "Sortie", icon: "walk-outline" },
      { label: "Moment convivial", icon: "people-outline" },
    ],
  },
  {
    key: "benevole_lecture",
    familleKey: "vie_sociale",
    label: "Bénévole lecture / bibliothèque",
    icon: "book-outline",
    soins: [
      { label: "Lecture", icon: "book-outline" },
      { label: "Accompagnement culturel", icon: "book-outline" },
    ],
  },
  {
    key: "musicien_intervenant",
    familleKey: "vie_sociale",
    label: "Musicien·ne intervenant·e",
    icon: "musical-notes-outline",
    soins: [
      { label: "Musique", icon: "musical-notes-outline" },
      { label: "Chant", icon: "musical-notes-outline" },
    ],
  },
  {
    key: "photographe",
    familleKey: "vie_sociale",
    label: "Photographe",
    icon: "camera-outline",
    soins: [
      { label: "Photographie / souvenir", icon: "camera-outline" },
    ],
  },
  {
    key: "mediation_animale",
    familleKey: "vie_sociale",
    label: "Intervenant·e médiation animale",
    icon: "paw-outline",
    soins: [
      { label: "Médiation animale / zoothérapie", icon: "paw-outline" },
    ],
  },
  {
    key: "accompagnant_spirituel",
    familleKey: "vie_sociale",
    label: "Accompagnant·e spirituel·le",
    icon: "sunny-outline",
    soins: [
      { label: "Accompagnement spirituel / religieux", icon: "sunny-outline" },
    ],
  },

  // ─── Repli ─────────────────────────────────────────────────────────────
  {
    key: "autre",
    familleKey: null,
    label: "Autre",
    icon: "briefcase-outline",
    soins: [],
  },
];

export function metierByKey(key: string | null | undefined): Metier | undefined {
  if (!key) return undefined;
  return METIERS.find((m) => m.key === key);
}

export function familleByKey(key: string | null | undefined): Famille | undefined {
  if (!key) return undefined;
  return FAMILLES.find((f) => f.key === key);
}

export function metiersByFamille(familleKey: string): Metier[] {
  return METIERS.filter((m) => m.familleKey === familleKey);
}

export function metierIconName(key: string | null | undefined): keyof typeof Ionicons.glyphMap {
  return metierByKey(key)?.icon ?? "briefcase-outline";
}

export function metierLabel(key: string | null | undefined): string {
  return metierByKey(key)?.label ?? "";
}

// Soins propres au métier — ordre du catalogue (voir SoinFormModal.tsx,
// section "Soins de {métier}").
export function soinsForMetier(key: string | null | undefined): MetierSoin[] {
  return metierByKey(key)?.soins ?? [];
}

// Reste des soins de la même famille (autres métiers), dédupliqués par
// libellé et sans redite des soins déjà propres au métier — permet à un
// intervenant d'ajouter un soin réalisé par un collègue de sa famille
// (ex. un·e aide-soignant·e proposant "Ménage léger" vu chez l'auxiliaire de
// vie) sans devoir taper un libellé libre. Voir SoinFormModal.tsx, section
// "Autres soins de {famille}".
export function otherFamilleSoinsForMetier(key: string | null | undefined): MetierSoin[] {
  const metier = metierByKey(key);
  if (!metier || !metier.familleKey) return [];
  const ownLabels = new Set(metier.soins.map((s) => s.label.toLowerCase()));
  const seen = new Set<string>();
  const result: MetierSoin[] = [];
  for (const m of metiersByFamille(metier.familleKey)) {
    if (m.key === metier.key) continue;
    for (const s of m.soins) {
      const lower = s.label.toLowerCase();
      if (ownLabels.has(lower) || seen.has(lower)) continue;
      seen.add(lower);
      result.push(s);
    }
  }
  return result;
}

// Index plat libellé → icône (première correspondance dans l'ordre du
// catalogue) — utilisé par lib/soinIcons.ts pour retrouver l'icône exacte
// d'un soin choisi dans la liste, avant repli sur la reconnaissance par
// mot-clé (soins tapés librement, voir option "Autre" de SoinFormModal.tsx).
export function soinIconByExactLabel(label: string): keyof typeof Ionicons.glyphMap | undefined {
  const lower = label.trim().toLowerCase();
  for (const m of METIERS) {
    for (const s of m.soins) {
      if (s.label.toLowerCase() === lower) return s.icon;
    }
  }
  return undefined;
}
