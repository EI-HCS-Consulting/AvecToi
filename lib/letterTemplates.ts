// Modèles de courriers administratifs — rattachés à un item de checklist
// précis (voir MyChecklist.tsx, findLetterTemplateForChecklistItem) plutôt
// qu'à un écran de navigation séparé : le bouton "✉️ Préparer le courrier"
// n'apparaît que sur l'item de checklist concerné. Contenu volontairement
// prudent (pas de délai légal chiffré dans le corps du courrier, qui varie
// selon la convention collective / l'accord d'entreprise) — un modèle à
// adapter, pas un document juridique engageant.
import { rightAlignBlock } from "@/lib/mediaShare";
import type { PatientSpace } from "@/lib/types";

export interface LetterField {
  key: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  required: boolean;
}

// Contexte transmis à prefill() pour pré-remplir un champ à partir de ce que
// l'app connaît déjà — jamais depuis une saisie libre. ownerPrenom/ownerNom
// sont la personne connectée qui remplit le courrier (pas forcément le
// patient), space peut être null tant que le dossier patient n'a pas chargé.
export interface LetterPrefillContext {
  ownerPrenom: string;
  ownerNom: string;
  space: PatientSpace | null;
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
  // Valeurs initiales déduites du profil/dossier patient déjà connu de l'app
  // (voir openLetterModal, MyChecklist.tsx) — uniquement pour les champs où
  // l'app a une info fiable ; les autres restent vides comme avant. Toujours
  // modifiable ensuite par l'utilisateur, ce n'est qu'un point de départ.
  prefill?: (ctx: LetterPrefillContext) => Record<string, string>;
}

function todayFr(): string {
  return new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function frDateFromIso(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function fullName(prenom: string, nom: string): string {
  return `${prenom} ${nom}`.trim();
}

// Nom de l'établissement hospitalier + adresse, sur plusieurs lignes (les
// champs qui l'utilisent sont multiline et passés à rightAlignBlock dans
// body(), qui right-aligne chaque ligne du bloc).
function hospitalBlock(space: PatientSpace | null): string {
  if (!space || !space.hospital_name.trim()) return "";
  const lines = [
    space.hospital_address,
    space.hospital_address_line2,
    [space.hospital_postal_code, space.hospital_city].filter(Boolean).join(" "),
  ].filter((l): l is string => !!l && l.trim() !== "");
  return [space.hospital_name, ...lines].join("\n");
}

function homeAddressBlock(space: PatientSpace | null): string {
  if (!space || !space.home_address?.trim()) return "";
  const lines = [
    space.home_address,
    space.home_address_line2,
    [space.home_postal_code, space.home_city].filter(Boolean).join(" "),
  ].filter((l): l is string => !!l && l.trim() !== "");
  return lines.join("\n");
}

function patientName(space: PatientSpace | null): string {
  return space ? fullName(space.patient_firstname, space.patient_lastname) : "";
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
    prefill: ({ ownerPrenom, ownerNom }) => ({ salarie: fullName(ownerPrenom, ownerNom) }),
  },
  {
    id: "autorisation_soins_enfant",
    icon: "📝",
    label: "Autorisation de soins — Enfant hospitalisé",
    intro: "Modèle à adapter avant envoi. Ce document est signé par le(s) titulaire(s) de l'autorité parentale et remis directement au service hospitalier — vérifie s'il complète ou remplace un formulaire propre à l'établissement.",
    checklistItemTitle: "Autorisation de soins",
    objet: "Autorisation de soins",
    fields: [
      { key: "parent1", label: "Ton nom complet (parent 1)", required: true },
      { key: "lienParent1", label: "Lien avec l'enfant (ex. père, mère, tuteur légal)", required: true },
      { key: "parent2", label: "Nom complet du 2ᵉ titulaire de l'autorité parentale (si applicable)", required: false },
      { key: "adresse", label: "Adresse du foyer", required: true, multiline: true },
      { key: "enfant", label: "Nom complet de l'enfant", required: true },
      { key: "dateNaissance", label: "Date de naissance de l'enfant", required: true },
      { key: "etablissement", label: "Nom de l'hôpital / du service", required: true, multiline: true },
      { key: "ville", label: "Ville (pour la date)", required: true },
      { key: "telephone", label: "Téléphone à joindre en cas d'urgence", required: true },
    ],
    piecesJointes: [
      "Livret de famille ou acte de naissance de l'enfant",
      "Pièce(s) d'identité du/des parent(s) signataire(s)",
      "Carnet de santé de l'enfant",
    ],
    body: (v) => [
      `${v.parent1}${v.parent2 ? ` et ${v.parent2}` : ""}`,
      v.adresse,
      "",
      rightAlignBlock(v.etablissement),
      "",
      rightAlignBlock(`${v.ville}, le ${todayFr()}`),
      "",
      "Objet : Autorisation de soins",
      "",
      "Madame, Monsieur,",
      "",
      `Je soussigné(e) ${v.parent1} (${v.lienParent1})${v.parent2 ? `, et ${v.parent2}` : ""}, titulaire(s) de l'autorité parentale de l'enfant ${v.enfant}, né(e) le ${v.dateNaissance}, autorise(nt) l'équipe médicale de ${v.etablissement} à pratiquer sur cet enfant tous les soins, examens et interventions médicales ou chirurgicales que son état de santé rendrait nécessaires au cours de son séjour.`,
      "",
      "Cette autorisation vaut également pour toute intervention urgente qui serait rendue indispensable par l'état de santé de l'enfant, dans le cas où nous ne pourrions être joints au préalable.",
      "",
      `Vous pouvez me/nous joindre au ${v.telephone} à tout moment durant l'hospitalisation.`,
      "",
      "Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.",
      "",
      "",
      rightAlignBlock(`${v.parent1}${v.parent2 ? `\n${v.parent2}` : ""}`),
    ].join("\n"),
    prefill: ({ ownerPrenom, ownerNom, space }) => ({
      parent1: fullName(ownerPrenom, ownerNom),
      enfant: patientName(space),
      dateNaissance: frDateFromIso(space?.patient_birthdate),
      etablissement: hospitalBlock(space),
      adresse: homeAddressBlock(space),
    }),
  },
  {
    id: "attestation_autorite_parentale",
    icon: "📝",
    label: "Attestation sur l'honneur — Autorité parentale",
    intro: "⚠️ Ce modèle est une attestation que TU rédiges et signes toi-même — elle ne remplace jamais un jugement de divorce, une convention de garde homologuée ou tout autre document délivré par un tribunal. Si l'autorité parentale ou la garde a été fixée par une décision de justice, c'est ce document officiel qu'il faut fournir à l'établissement, pas cette attestation. N'utilise ce modèle que si aucun jugement n'existe (parents non séparés, ou séparés à l'amiable sans procédure).",
    checklistItemTitle: "Attestation d'autorité parentale / jugement de garde",
    objet: "Attestation sur l'honneur d'exercice de l'autorité parentale",
    fields: [
      { key: "parent", label: "Ton nom complet", required: true },
      { key: "lien", label: "Lien avec l'enfant (ex. père, mère)", required: true },
      { key: "enfant", label: "Nom complet de l'enfant", required: true },
      { key: "dateNaissance", label: "Date de naissance de l'enfant", required: true },
      { key: "situation", label: "Situation familiale (ex. parents non séparés / séparés à l'amiable, sans jugement)", required: true },
      { key: "etablissement", label: "Établissement destinataire (hôpital, école…)", required: true, multiline: true },
      { key: "ville", label: "Ville (pour la date)", required: true },
    ],
    piecesJointes: [
      "Pièce d'identité du parent signataire",
      "Livret de famille ou acte de naissance de l'enfant",
      "Le cas échéant, jugement ou convention de garde homologuée (à fournir en plus si l'établissement le demande)",
    ],
    body: (v) => [
      v.parent,
      "",
      rightAlignBlock(v.etablissement),
      "",
      rightAlignBlock(`${v.ville}, le ${todayFr()}`),
      "",
      "Objet : Attestation sur l'honneur d'exercice de l'autorité parentale",
      "",
      "Madame, Monsieur,",
      "",
      `Je soussigné(e) ${v.parent}, ${v.lien} de l'enfant ${v.enfant}, né(e) le ${v.dateNaissance}, atteste sur l'honneur exercer l'autorité parentale sur cet enfant (${v.situation}), et être à ce titre habilité(e) à prendre en son nom toute décision relevant de cette autorité, notamment auprès de ${v.etablissement}.`,
      "",
      "Je certifie l'exactitude des informations ci-dessus et suis conscient(e) qu'une fausse déclaration m'expose aux sanctions prévues par la loi.",
      "",
      "",
      rightAlignBlock(v.parent),
    ].join("\n"),
    prefill: ({ ownerPrenom, ownerNom, space }) => ({
      parent: fullName(ownerPrenom, ownerNom),
      enfant: patientName(space),
      dateNaissance: frDateFromIso(space?.patient_birthdate),
      etablissement: hospitalBlock(space),
    }),
  },
  {
    id: "courrier_ecole_creche",
    icon: "✉️",
    label: "Courrier à l'école / la crèche — Hospitalisation",
    intro: "Modèle à adapter avant envoi. Précise la classe/le groupe si utile, et joins un justificatif si l'établissement en demande un.",
    checklistItemTitle: "Prévenir l'école / la crèche",
    objet: "Absence pour hospitalisation",
    fields: [
      { key: "parent", label: "Ton nom complet", required: true },
      { key: "enfant", label: "Nom complet de l'enfant", required: true },
      { key: "classe", label: "Classe / groupe (optionnel)", required: false },
      { key: "etablissementScolaire", label: "Nom de l'école / de la crèche", required: true },
      { key: "adresseEtablissement", label: "Adresse de l'établissement", required: true, multiline: true },
      { key: "dateDebut", label: "Date de début de l'absence", required: true },
      { key: "dateFinPrevue", label: "Date de retour prévue (optionnel)", required: false },
      { key: "telephone", label: "Téléphone de contact (optionnel)", required: false },
      { key: "ville", label: "Ville (pour la date)", required: true },
    ],
    piecesJointes: [
      "Certificat médical ou attestation d'hospitalisation, si demandé par l'établissement",
    ],
    body: (v) => [
      v.parent,
      "",
      rightAlignBlock(v.etablissementScolaire),
      rightAlignBlock(v.adresseEtablissement),
      "",
      rightAlignBlock(`${v.ville}, le ${todayFr()}`),
      "",
      "Objet : Absence pour hospitalisation",
      "",
      "Madame, Monsieur,",
      "",
      `Je vous informe que mon enfant ${v.enfant}${v.classe ? ` (${v.classe})` : ""} est hospitalisé(e) depuis le ${v.dateDebut} et sera dans l'impossibilité de fréquenter l'établissement ${v.dateFinPrevue ? `jusqu'au ${v.dateFinPrevue}` : "jusqu'à nouvel avis"}.`,
      "",
      "Je me tiens à votre disposition pour vous transmettre un justificatif si nécessaire, et vous remercie de me tenir informé(e) des éventuels travaux scolaires à prévoir pour son retour.",
      "",
      ...(v.telephone ? [`Vous pouvez me joindre au ${v.telephone}.`, ""] : []),
      "Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.",
      "",
      "",
      rightAlignBlock(v.parent),
    ].join("\n"),
    prefill: ({ ownerPrenom, ownerNom, space }) => ({
      parent: fullName(ownerPrenom, ownerNom),
      enfant: patientName(space),
    }),
  },
  {
    id: "declaration_mutuelle_cpam",
    icon: "✉️",
    label: "Déclaration à la mutuelle / CPAM — Soins à domicile",
    intro: "Modèle à adapter avant envoi. Le formulaire propre à ta caisse (CPAM/MSA) ou à ta mutuelle peut être exigé en complément — vérifie sur leur espace en ligne.",
    checklistItemTitle: "Déclaration à la mutuelle / CPAM",
    objet: "Prise en charge de soins à domicile",
    fields: [
      { key: "assure", label: "Ton nom complet (assuré)", required: true },
      { key: "numeroSecu", label: "Numéro de sécurité sociale", required: true },
      { key: "patient", label: "Nom du bénéficiaire des soins, si différent de toi (optionnel)", required: false },
      { key: "adresse", label: "Ton adresse", required: true, multiline: true },
      { key: "organisme", label: "Nom de la mutuelle / de la caisse", required: true },
      { key: "adresseOrganisme", label: "Adresse de la mutuelle / de la caisse", required: true, multiline: true },
      { key: "motif", label: "Motif des soins (ex. soins infirmiers à domicile suite à…)", required: true, multiline: true },
      { key: "ville", label: "Ville (pour la date)", required: true },
    ],
    piecesJointes: [
      "Prescription médicale des soins à domicile",
      "Carte Vitale / attestation de droits à jour",
      "RIB, si un remboursement direct est demandé",
    ],
    body: (v) => [
      v.assure,
      `N° de sécurité sociale : ${v.numeroSecu}`,
      v.adresse,
      "",
      rightAlignBlock(v.organisme),
      rightAlignBlock(v.adresseOrganisme),
      "",
      rightAlignBlock(`${v.ville}, le ${todayFr()}`),
      "",
      "Objet : Prise en charge de soins à domicile",
      "",
      "Madame, Monsieur,",
      "",
      `Je vous informe de la mise en place de soins à domicile${v.patient ? ` pour ${v.patient}` : ""} : ${v.motif}.`,
      "",
      "Vous trouverez ci-joint la prescription médicale correspondante. Je vous remercie de bien vouloir m'indiquer les modalités de prise en charge et, le cas échéant, le formulaire complémentaire à compléter.",
      "",
      "Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.",
      "",
      "",
      rightAlignBlock(v.assure),
    ].join("\n"),
    prefill: ({ ownerPrenom, ownerNom, space }) => ({
      assure: fullName(ownerPrenom, ownerNom),
      adresse: homeAddressBlock(space),
    }),
  },
  {
    id: "procuration_bancaire",
    icon: "✉️",
    label: "Procuration bancaire",
    intro: "Modèle de courrier d'accompagnement — la banque exige presque toujours la signature du titulaire sur son propre formulaire de procuration (en agence ou depuis son espace en ligne) : ce courrier sert à initier la démarche, pas à la remplacer.",
    checklistItemTitle: "Procuration bancaire",
    objet: "Demande de mise en place d'une procuration bancaire",
    fields: [
      { key: "titulaire", label: "Nom du titulaire du compte", required: true },
      { key: "mandataire", label: "Ton nom complet (futur mandataire)", required: true },
      { key: "lienMandataire", label: "Lien avec le titulaire", required: true },
      { key: "banque", label: "Nom de la banque", required: true },
      { key: "adresseAgence", label: "Adresse de l'agence", required: true, multiline: true },
      { key: "numeroCompte", label: "Numéro de compte ou d'agence, si connu (optionnel)", required: false },
      { key: "ville", label: "Ville (pour la date)", required: true },
    ],
    piecesJointes: [
      "Pièce d'identité du titulaire du compte",
      "Pièce d'identité du mandataire",
      "Justificatif de domicile du titulaire",
      "RIB du compte concerné",
    ],
    body: (v) => [
      v.titulaire,
      "",
      rightAlignBlock(v.banque),
      rightAlignBlock(v.adresseAgence),
      "",
      rightAlignBlock(`${v.ville}, le ${todayFr()}`),
      "",
      "Objet : Demande de mise en place d'une procuration bancaire",
      "",
      "Madame, Monsieur,",
      "",
      `Je soussigné(e) ${v.titulaire}, titulaire du compte${v.numeroCompte ? ` n° ${v.numeroCompte}` : ""} dans votre établissement, souhaite donner procuration à ${v.mandataire} (${v.lienMandataire}) pour effectuer en mon nom les opérations courantes sur ce compte, ma situation actuelle ne me permettant plus de m'en charger moi-même.`,
      "",
      "Je vous remercie de bien vouloir m'indiquer les modalités et le rendez-vous nécessaires à la mise en place de cette procuration.",
      "",
      "Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.",
      "",
      "",
      rightAlignBlock(v.titulaire),
    ].join("\n"),
    prefill: ({ ownerPrenom, ownerNom, space }) => ({
      titulaire: patientName(space),
      mandataire: fullName(ownerPrenom, ownerNom),
    }),
  },
  {
    id: "courrier_employeur_absence_hospitalisation",
    icon: "✉️",
    label: "Courrier à l'employeur — Absence pour hospitalisation",
    intro: "Modèle à adapter avant envoi. Si tu écris au nom du proche hospitalisé (et non pour toi-même), renseigne ton nom dans « rédigé par » et précise ta qualité (famille, personne de confiance) — sinon laisse ce champ vide.",
    checklistItemTitle: "Prévenir l'employeur du patient",
    objet: "Absence pour hospitalisation",
    fields: [
      { key: "salarie", label: "Nom complet du salarié hospitalisé", required: true },
      { key: "redacteur", label: "Rédigé par (si ce n'est pas le salarié lui-même — optionnel)", required: false },
      { key: "adresse", label: "Adresse du salarié", required: true, multiline: true },
      { key: "employeur", label: "Nom de l'employeur / de l'entreprise", required: true },
      { key: "adresseEmployeur", label: "Adresse de l'employeur", required: true, multiline: true },
      { key: "dateDebut", label: "Date de début de l'absence", required: true },
      { key: "dateFinPrevue", label: "Date de retour prévue (optionnel)", required: false },
      { key: "ville", label: "Ville (pour la date)", required: true },
    ],
    piecesJointes: [
      "Arrêt de travail ou attestation d'hospitalisation, à transmettre dès réception",
    ],
    body: (v) => [
      v.redacteur || v.salarie,
      v.adresse,
      "",
      rightAlignBlock(v.employeur),
      rightAlignBlock(v.adresseEmployeur),
      "",
      rightAlignBlock(`${v.ville}, le ${todayFr()}`),
      "",
      "Objet : Absence pour hospitalisation",
      "",
      "Madame, Monsieur,",
      "",
      v.redacteur
        ? `Je vous informe, au nom de ${v.salarie}, de son hospitalisation depuis le ${v.dateDebut}${v.dateFinPrevue ? `, avec un retour prévu le ${v.dateFinPrevue}` : ", pour une durée qui reste à ce jour indéterminée"}.`
        : `Je vous informe de mon hospitalisation depuis le ${v.dateDebut}${v.dateFinPrevue ? `, avec un retour prévu le ${v.dateFinPrevue}` : ", pour une durée qui reste à ce jour indéterminée"}.`,
      "",
      "Un arrêt de travail ou une attestation d'hospitalisation vous sera transmis dès que possible.",
      "",
      "Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.",
      "",
      "",
      rightAlignBlock(v.redacteur ? `${v.redacteur}\n(pour le compte de ${v.salarie})` : v.salarie),
    ].join("\n"),
    prefill: ({ ownerPrenom, ownerNom }) => ({ salarie: fullName(ownerPrenom, ownerNom) }),
  },
  {
    id: "declaration_sinistre_assurance",
    icon: "✉️",
    label: "Déclaration de sinistre à l'assurance",
    intro: "Modèle à adapter avant envoi. Vérifie le délai légal de déclaration (généralement 5 jours ouvrés pour un accident) sur le lien officiel de cet item, et le mode de déclaration privilégié par ton assureur (courrier, espace en ligne, application).",
    checklistItemTitle: "Déclaration de sinistre assurance",
    objet: "Déclaration de sinistre",
    fields: [
      { key: "assure", label: "Nom de l'assuré souscripteur", required: true },
      { key: "numeroContrat", label: "Numéro de contrat / police (optionnel)", required: false },
      { key: "assureur", label: "Nom de l'assureur", required: true },
      { key: "adresseAssureur", label: "Adresse de l'assureur", required: true, multiline: true },
      { key: "victime", label: "Nom de la personne accidentée, si différent de l'assuré (optionnel)", required: false },
      { key: "dateSinistre", label: "Date de l'accident", required: true },
      { key: "lieuSinistre", label: "Lieu de l'accident", required: true },
      { key: "circonstances", label: "Circonstances de l'accident", required: true, multiline: true },
      { key: "ville", label: "Ville (pour la date)", required: true },
    ],
    piecesJointes: [
      "Certificat médical initial décrivant les blessures constatées",
      "Tout constat, rapport ou témoignage relatif aux circonstances de l'accident",
      "Justificatifs de frais déjà engagés, s'il y a lieu",
    ],
    body: (v) => [
      v.assure,
      "",
      rightAlignBlock(v.assureur),
      rightAlignBlock(v.adresseAssureur),
      "",
      rightAlignBlock(`${v.ville}, le ${todayFr()}`),
      "",
      `Objet : Déclaration de sinistre${v.numeroContrat ? ` — Contrat n° ${v.numeroContrat}` : ""}`,
      "",
      "Madame, Monsieur,",
      "",
      `Je vous déclare un accident survenu le ${v.dateSinistre} à ${v.lieuSinistre}, concernant ${v.victime || "l'assuré(e)"}.`,
      "",
      `Circonstances : ${v.circonstances}`,
      "",
      "Vous trouverez ci-joint les justificatifs disponibles à ce jour. Je vous remercie de bien vouloir m'indiquer les modalités de prise en charge et les éventuelles pièces complémentaires à fournir.",
      "",
      "Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.",
      "",
      "",
      rightAlignBlock(v.assure),
    ].join("\n"),
    prefill: ({ ownerPrenom, ownerNom }) => ({ assure: fullName(ownerPrenom, ownerNom) }),
  },
];

export function findLetterTemplateForChecklistItem(title: string): LetterTemplate | null {
  const base = title.split(" — ")[0].trim().toLowerCase();
  if (!base) return null;
  return LETTER_TEMPLATES.find((lt) => lt.checklistItemTitle.trim().toLowerCase() === base) ?? null;
}
