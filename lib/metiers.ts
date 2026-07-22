import type { Ionicons } from "@expo/vector-icons";

// Catalogue pré-établi des métiers d'intervenants possibles en soins à
// domicile, ainsi que ceux pouvant venir en renfort de l'équipe médicale
// hospitalière — utilisé pour :
//  - la fiche intervenant (métier saisi à la création, voir
//    IntervenantFicheModal.tsx) ;
//  - l'icône de repli de l'avatar (IntervenantAvatar.tsx) quand aucune
//    photo n'est définie ;
//  - la liste de soins suggérés par métier (SoinFormModal.tsx) ;
//  - l'icône affichée sur la frise Chronologie pour les soins (settings.tsx).
//
// `key` est la valeur stockée en base (intervenant_profiles.metier) — ne
// jamais la renommer sans migration, seul `label`/`icon`/`soins` peuvent
// évoluer librement.
export interface MetierSoin {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export interface Metier {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  soins: MetierSoin[];
}

export const METIERS: Metier[] = [
  {
    key: "infirmier",
    label: "Infirmier·ère",
    icon: "medical-outline",
    soins: [
      { label: "Pansement", icon: "bandage-outline" },
      { label: "Injection / Piqûre", icon: "medical-outline" },
      { label: "Prise de sang", icon: "water-outline" },
      { label: "Perfusion", icon: "git-commit-outline" },
      { label: "Surveillance post-opératoire", icon: "pulse-outline" },
    ],
  },
  {
    key: "aide_soignant",
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
    key: "auxiliaire_vie",
    label: "Auxiliaire de vie",
    icon: "home-outline",
    soins: [
      { label: "Ménage", icon: "home-outline" },
      { label: "Courses", icon: "cart-outline" },
      { label: "Aide aux repas", icon: "restaurant-outline" },
      { label: "Compagnie / présence", icon: "people-outline" },
    ],
  },
  {
    key: "psychologue",
    label: "Psychologue / Psychiatre",
    icon: "chatbubble-ellipses-outline",
    soins: [
      { label: "Entretien de soutien", icon: "chatbubble-ellipses-outline" },
      { label: "Suivi psychologique", icon: "heart-outline" },
    ],
  },
  {
    key: "dieteticien",
    label: "Diététicien·ne",
    icon: "restaurant-outline",
    soins: [
      { label: "Bilan nutritionnel", icon: "clipboard-outline" },
      { label: "Suivi alimentaire", icon: "restaurant-outline" },
    ],
  },
  {
    key: "medecin",
    label: "Médecin",
    icon: "medkit-outline",
    soins: [
      { label: "Consultation", icon: "medkit-outline" },
      { label: "Renouvellement d'ordonnance", icon: "document-text-outline" },
      { label: "Visite de contrôle", icon: "checkmark-circle-outline" },
    ],
  },
  {
    key: "ergotherapeute",
    label: "Ergothérapeute",
    icon: "construct-outline",
    soins: [
      { label: "Adaptation du domicile", icon: "construct-outline" },
      { label: "Rééducation gestes du quotidien", icon: "hand-left-outline" },
    ],
  },
  {
    key: "orthophoniste",
    label: "Orthophoniste",
    icon: "mic-outline",
    soins: [
      { label: "Rééducation du langage", icon: "mic-outline" },
      { label: "Rééducation de la déglutition", icon: "restaurant-outline" },
    ],
  },
  {
    key: "podologue",
    label: "Podologue",
    icon: "footsteps-outline",
    soins: [
      { label: "Soin des pieds", icon: "footsteps-outline" },
      { label: "Semelles orthopédiques", icon: "footsteps-outline" },
    ],
  },
  {
    key: "coiffeur",
    label: "Coiffeur·se",
    icon: "cut-outline",
    soins: [
      { label: "Coupe", icon: "cut-outline" },
      { label: "Shampoing", icon: "water-outline" },
      { label: "Coiffage", icon: "sparkles-outline" },
    ],
  },
  {
    key: "esthetique",
    label: "Esthéticien·ne / Masseur·se bien-être",
    icon: "sparkles-outline",
    soins: [
      { label: "Manucure", icon: "hand-left-outline" },
      { label: "Massage bien-être", icon: "body-outline" },
      { label: "Soin du visage", icon: "sparkles-outline" },
    ],
  },
  {
    key: "ambulancier",
    label: "Ambulancier·ère / Brancardier·ère",
    icon: "car-outline",
    soins: [
      { label: "Transport médicalisé", icon: "car-outline" },
      { label: "Transfert brancard", icon: "car-outline" },
    ],
  },
  {
    key: "assistant_social",
    label: "Assistant·e social·e",
    icon: "people-outline",
    soins: [
      { label: "Accompagnement démarches", icon: "document-text-outline" },
      { label: "Aide administrative", icon: "folder-outline" },
    ],
  },
  {
    key: "labo",
    label: "Technicien·ne de laboratoire",
    icon: "flask-outline",
    soins: [
      { label: "Prélèvement à domicile", icon: "flask-outline" },
    ],
  },
  {
    key: "pharmacien",
    label: "Pharmacien·ne",
    icon: "bag-outline",
    soins: [
      { label: "Préparation piluliers", icon: "bag-outline" },
      { label: "Livraison de médicaments", icon: "bicycle-outline" },
    ],
  },
  {
    key: "autre",
    label: "Autre",
    icon: "briefcase-outline",
    soins: [],
  },
];

export function metierByKey(key: string | null | undefined): Metier | undefined {
  if (!key) return undefined;
  return METIERS.find((m) => m.key === key);
}

export function metierIconName(key: string | null | undefined): keyof typeof Ionicons.glyphMap {
  return metierByKey(key)?.icon ?? "briefcase-outline";
}

export function metierLabel(key: string | null | undefined): string {
  return metierByKey(key)?.label ?? "";
}
