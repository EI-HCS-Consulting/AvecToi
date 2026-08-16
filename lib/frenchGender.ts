// Devine l'article indéfini ("un"/"une") d'un libellé de type d'intervention
// (ex. "Séance d'acupuncture" -> "une", "Travail de l'équilibre" -> "un"),
// pour l'accord de la note "Soin déjà programmé avec ... pour un/une ..."
// (VisitorSlotsList, créneaux déjà pris chez un autre patient). Les libellés
// sont saisis librement par chaque intervenant (getSyncedInterventionTypes) :
// pas de champ "genre" en base, donc heuristique par terminaison du premier
// mot du libellé plutôt qu'une analyse grammaticale complète.
const FEMININE_ENDINGS = [
  "tion", "sion", "ance", "ence", "ette", "elle", "enne", "onne", "esse",
  "euse", "rice", "ade", "ude", "ée", "ie", "ue", "ise", "ille", "ure",
];
const MASCULINE_ENDINGS = [
  "ment", "isme", "age", "eau", "ail", "oir", "al", "ing", "et", "ard",
];

function firstWord(label: string): string {
  const match = label.trim().toLowerCase().match(/[a-zàâäéèêëïîôöùûüç]+/);
  return match ? match[0] : "";
}

export function guessFrenchArticle(label: string): "un" | "une" {
  const word = firstWord(label);
  for (const ending of FEMININE_ENDINGS) {
    if (word.endsWith(ending)) return "une";
  }
  for (const ending of MASCULINE_ENDINGS) {
    if (word.endsWith(ending)) return "un";
  }
  return "un";
}
