export interface VisitorRelation {
  key: string;
  label: string;
}

// Liens visiteur → patient proposés au choix dans "Mes informations" (voir
// app/(visitor)/account.tsx) — stockés dans visitor_profiles.relation,
// affichés dans la liste des visiteurs (components/VisitorsList.tsx) et la
// fiche visiteur (components/VisitorProfileModal.tsx). Concerne uniquement
// le rôle "visiteur" : un intervenant a un métier à la place (voir
// lib/metiers.ts), pas de lien familial/social au patient à renseigner ici.
export const VISITOR_RELATIONS: VisitorRelation[] = [
  { key: "conjoint", label: "Conjoint·e" },
  { key: "pere", label: "Père" },
  { key: "mere", label: "Mère" },
  { key: "fils", label: "Fils" },
  { key: "fille", label: "Fille" },
  { key: "frere_soeur", label: "Frère / Sœur" },
  { key: "beau_pere", label: "Beau-père" },
  { key: "belle_mere", label: "Belle-mère" },
  { key: "grand_pere", label: "Grand-père" },
  { key: "grand_mere", label: "Grand-mère" },
  { key: "petit_fils_fille", label: "Petit-fils / Petite-fille" },
  { key: "beau_fils", label: "Beau-fils" },
  { key: "belle_fille", label: "Belle-fille" },
  { key: "oncle_tante", label: "Oncle / Tante" },
  { key: "cousin_cousine", label: "Cousin / Cousine" },
  { key: "neveu_niece", label: "Neveu / Nièce" },
  { key: "ami_amie", label: "Ami·e" },
  { key: "voisin_voisine", label: "Voisin·e" },
  { key: "collegue", label: "Collègue de travail" },
  { key: "autre", label: "Autre" },
];

// Un choix "Autre" précisé par saisie libre (voir RelationPickerModal.tsx)
// est stocké tel quel dans visitor_profiles.relation, sans clé de catalogue
// associée — même principe que metierLabel (lib/metiers.ts). On retombe
// donc sur la valeur brute quand elle ne correspond à aucune clé connue,
// plutôt que d'afficher une chaîne vide.
export function relationLabel(key: string | null | undefined): string {
  return VISITOR_RELATIONS.find((r) => r.key === key)?.label ?? key ?? "";
}
