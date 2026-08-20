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
  { key: "petit_fils_fille", label: "Petit-fils / Petite-fille" },
  { key: "cousin_cousine", label: "Cousin / Cousine" },
  { key: "oncle_tante", label: "Oncle / Tante" },
  { key: "neveu_niece", label: "Neveu / Nièce" },
  { key: "ami_amie", label: "Ami·e" },
  { key: "voisin_voisine", label: "Voisin·e" },
  { key: "collegue", label: "Collègue de travail" },
  { key: "autre", label: "Autre" },
];

export function relationLabel(key: string | null | undefined): string {
  return VISITOR_RELATIONS.find((r) => r.key === key)?.label ?? "";
}
