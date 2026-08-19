// Modèles de courriers administratifs — rattachés à un item de checklist
// précis (voir MyChecklist.tsx, findLetterTemplateForChecklistItem) plutôt
// qu'à un écran de navigation séparé : le bouton "✉️ Préparer le courrier"
// n'apparaît que sur l'item de checklist concerné. Contenu volontairement
// prudent (pas de délai légal chiffré dans le corps du courrier, qui varie
// selon la convention collective / l'accord d'entreprise) — un modèle à
// adapter, pas un document juridique engageant.
import { rightAlignBlock } from "@/lib/mediaShare";

export interface LetterField {
  key: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  required: boolean;
}

export interface LetterTemplate {
  id: string;
  icon: string;
  label: string;
  intro: string;
  // Titre de l'item de checklist (lib/checklistTemplates.ts) auquel ce
  // courrier est rattaché — comparé sans la précision éventuelle (" — …",
  // voir findTemplateItemByTitle) pour matcher un item importé.
  checklistItemTitle: string;
  // Objet du courrier — réutilisé tel quel comme ligne "Objet :" dans body()
  // ET comme sujet de l'email quand le .doc est envoyé en pièce jointe (voir
  // downloadLetter/redownloadDocument dans MyChecklist.tsx, saveAndShareDoc).
  objet: string;
  fields: LetterField[];
  // Rappel des pièces à joindre à l'ENVOI du courrier (pas les pièces de
  // l'item de checklist lui-même, qui peuvent différer).
  piecesJointes: string[];
  body: (values: Record<string, string>) => string;
}

function todayFr(): string {
  return new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

const CONGE_PROCHE_AIDANT_OBJET = "Demande de congé de proche aidant";

export const LETTER_TEMPLATES: LetterTemplate[] = [
  {
    id: "lettre_employeur_conge_proche_aidant",
    icon: "✉️",
    label: "Lettre à l'employeur — Congé de proche aidant",
    intro: "Modèle à adapter avant envoi. Vérifie le délai de prévenance à respecter (convention collective ou accord d'entreprise) sur le lien officiel de cet item.",
    checklistItemTitle: "Préparer ma demande à l'employeur",
    objet: CONGE_PROCHE_AIDANT_OBJET,
    fields: [
      { key: "salarie", label: "Ton nom complet", required: true },
      { key: "adresse", label: "Ton adresse", required: true, multiline: true },
      { key: "employeur", label: "Nom de l'employeur / de l'entreprise", required: true },
      { key: "adresseEmployeur", label: "Adresse de l'employeur", required: true, multiline: true },
      { key: "ville", label: "Ville (pour la date)", required: true },
      { key: "proche", label: "Nom du proche aidé", required: true },
      { key: "lien", label: "Lien avec le proche aidé (ex. mère, conjoint…)", required: true },
      { key: "dateDebut", label: "Date de début souhaitée du congé", required: true },
      { key: "duree", label: "Durée souhaitée (ex. 3 mois, temps partiel…)", required: true },
      { key: "forme", label: "Forme du congé (continu / fractionné / temps partiel)", required: false },
    ],
    piecesJointes: [
      "Justificatif du lien avec la personne aidée (livret de famille, etc.)",
      "Justificatif de la situation de perte d'autonomie ou de handicap du proche, si ton employeur ou ta convention collective le demande",
    ],
    body: (v) => [
      v.salarie,
      v.adresse,
      "",
      rightAlignBlock(v.employeur),
      rightAlignBlock(v.adresseEmployeur),
      "",
      rightAlignBlock(`${v.ville}, le ${todayFr()}`),
      "",
      `Objet : ${CONGE_PROCHE_AIDANT_OBJET}`,
      "",
      "Madame, Monsieur,",
      "",
      `Je vous informe par la présente de mon souhait de bénéficier d'un congé de proche aidant, tel que prévu par les articles L.3142-16 et suivants du Code du travail, afin d'accompagner ${v.proche} (${v.lien}), dont la perte d'autonomie ou le handicap nécessite ma présence.`,
      "",
      `Je souhaite que ce congé débute le ${v.dateDebut}, pour une durée de ${v.duree}${v.forme ? `, sous la forme suivante : ${v.forme}` : ""}.`,
      "",
      "Vous trouverez ci-joint les justificatifs nécessaires à l'appui de cette demande.",
      "",
      "Je reste à votre disposition pour tout échange complémentaire sur les modalités de ce congé.",
      "",
      "Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.",
      "",
      "",
      rightAlignBlock(v.salarie),
    ].join("\n"),
  },
];

export function findLetterTemplateForChecklistItem(title: string): LetterTemplate | null {
  const base = title.split(" — ")[0].trim().toLowerCase();
  if (!base) return null;
  return LETTER_TEMPLATES.find((lt) => lt.checklistItemTitle.trim().toLowerCase() === base) ?? null;
}
