import type { Task } from "@/lib/types";

// Checklists administratives suggérées — utilisées dans Entraide (outil admin
// dédié + sélecteur repliable dans "Nouveau besoin") ET dans "Ma Checklist"
// (import personnel, voir components/MyChecklist.tsx). Extrait de
// components/Entraide.tsx pour être partagé sans dupliquer ~150 lignes de
// contenu entre les deux.
export type ChecklistContext =
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
  | "fin_de_vie";

type TaskCategory = Task["category"];

export interface ChecklistItem {
  title: string;
  description: string;
  urgent?: boolean;
  // Nombre de jours ajoutés à aujourd'hui pour préremplir date_limite —
  // seulement sur les démarches à délai légal connu (ex. déclaration de
  // sinistre : 5 jours ouvrés).
  dateOffsetDays?: number;
  // Un visiteur (non-admin) ne voit et ne peut ajouter que les items marqués
  // true — les démarches légales/financières/employeur restent réservées à
  // l'admin (généralement la personne qui centralise ces sujets). L'admin
  // voit toujours la liste complète, partout.
  sharedWithVisitors: boolean;
  // Catégorie Entraide réelle de l'item une fois publié comme besoin (mur
  // d'Entraide / "Ma Checklist"). Si absent, fallback "administratif" —
  // comportement d'origine des 3 checklists historiques, non modifiées.
  category?: TaskCategory;
  // Pièces à réunir avant d'entamer la démarche — jamais de stockage de
  // document ici, uniquement des libellés texte informatifs.
  piecesRequises?: string[];
  // Lien vers un site officiel uniquement (jamais commercial).
  lienExterne?: { label: string; url: string };
  // Marque un item dont le rappel peut être proposé en version récurrente
  // mensuelle au moment du "Je m'en occupe" (ex. déclaration AJPA).
  recurrent?: "mensuel";
  // Item volontairement générique ("Accompagner à un rendez-vous", "Faire
  // une démarche administrative"…) dont le titre seul ne dit pas grand
  // chose une fois publié — propose un popup dédié de précision au moment
  // de l'ajout. Absent/false pour les items déjà assez explicites par
  // eux-mêmes (ex. "Faire le linge") : leur imposer un champ de précision
  // n'apporterait rien et alourdirait inutilement le parcours.
  needsDetail?: boolean;
}

export interface ChecklistTemplate {
  icon: string;
  label: string;
  colorKey: "accent" | "orange" | "gold";
  groups: { phase: string; items: ChecklistItem[] }[];
  // Checklist tournée vers les démarches personnelles de l'aidant (congé,
  // répit…) plutôt que vers des besoins concrets du patient — n'a pas sa
  // place dans le sélecteur Entraide (qui publie des besoins pour le
  // patient) et reste uniquement proposée dans "Ma Checklist" / Mon Compte.
  personalOnly?: boolean;
}

export const CHECKLIST_TEMPLATES: Record<ChecklistContext, ChecklistTemplate> = {
  adulte: {
    icon: "🏥",
    label: "Hospitalisation d'un proche",
    colorKey: "accent",
    groups: [
      {
        phase: "À l'arrivée",
        items: [
          { title: "Directives anticipées", description: "Vérifier si le patient en a rédigé, et où elles se trouvent.", sharedWithVisitors: true },
          { title: "Personne de confiance", description: "Faire signer le formulaire si pas déjà fait (2 témoins conseillés).", sharedWithVisitors: true },
          { title: "Carte Vitale + attestation mutuelle", description: "À apporter dès que possible si admission en urgence.", sharedWithVisitors: true },
          { title: "Liste des traitements en cours", description: "Ordonnances actives, à donner au service.", sharedWithVisitors: true },
        ],
      },
      {
        phase: "Pendant le séjour",
        items: [
          { title: "Attestation d'hospitalisation (employeur)", description: "À demander au service pour justifier une absence.", sharedWithVisitors: true },
          { title: "Congé proche aidant / AJPA", description: "Démarche CAF ou MSA — délai à anticiper.", urgent: true, sharedWithVisitors: false },
          { title: "Procuration bancaire", description: "Si le patient ne peut plus gérer ses comptes (factures, loyer).", sharedWithVisitors: false },
          { title: "Déclaration de sinistre assurance", description: "Si accident — délai généralement de 5 jours ouvrés.", urgent: true, dateOffsetDays: 5, sharedWithVisitors: false },
          { title: "Prévenir l'employeur du patient", description: "Si en poste.", sharedWithVisitors: true },
        ],
      },
      {
        phase: "Sortie",
        items: [
          { title: "Compte-rendu d'hospitalisation", description: "À transmettre au médecin traitant.", sharedWithVisitors: true },
          { title: "Dossier MDPH", description: "Si perte d'autonomie durable.", sharedWithVisitors: false },
          { title: "Déclaration d'impôts", description: "Vérifier un report de délai si la période chevauche la campagne déclarative.", sharedWithVisitors: false },
          { title: "Organiser le retour à domicile", description: "Aide à la personne, matériel médical, RDV de suivi.", sharedWithVisitors: true },
        ],
      },
    ],
  },
  enfant: {
    icon: "🧸",
    label: "Enfant hospitalisé",
    colorKey: "orange",
    groups: [
      {
        phase: "Documents",
        items: [
          { title: "Carnet de santé + carte Vitale de l'enfant", description: "", sharedWithVisitors: true },
          { title: "Autorisation de soins", description: "Signée par le(s) titulaire(s) de l'autorité parentale.", sharedWithVisitors: false },
          { title: "Attestation d'autorité parentale / jugement de garde", description: "Si parents séparés et service non informé.", sharedWithVisitors: false },
          { title: "Certificat médical pour l'école", description: "Justificatif d'absence.", sharedWithVisitors: true },
          { title: "PAI (Projet d'Accueil Individualisé)", description: "À établir ou réactiver avec l'école si suivi au long cours.", sharedWithVisitors: true },
          { title: "Assurance scolaire / extra-scolaire", description: "Vérifier la couverture si accident.", sharedWithVisitors: true },
        ],
      },
      {
        phase: "Organisation famille",
        items: [
          { title: "Garde de la fratrie", description: "Qui s'en occupe pendant les visites.", sharedWithVisitors: true },
          { title: "Doudou / objet familier", description: "Le premier réflexe anti-angoisse.", sharedWithVisitors: true },
          { title: "Préparer l'enfant à l'avance", description: "Si l'admission n'est pas une urgence, en parler quelques jours avant.", sharedWithVisitors: true },
          { title: "Prévenir l'école / la crèche", description: "", sharedWithVisitors: true },
        ],
      },
    ],
  },
  domicile: {
    icon: "🏠",
    label: "Soin à domicile",
    colorKey: "gold",
    groups: [
      {
        phase: "Mise en place",
        items: [
          { title: "Déclaration à la mutuelle / CPAM", description: "Prise en charge des soins à domicile.", sharedWithVisitors: false },
          { title: "Commande de matériel médical", description: "Lit, fauteuil, oxygène selon prescription.", sharedWithVisitors: true },
          { title: "Aménagement du logement", description: "Barres d'appui, rampe, douche adaptée si besoin.", sharedWithVisitors: true },
          { title: "Planning des intervenants", description: "Infirmier·ère, kiné, aide à domicile.", sharedWithVisitors: true },
          { title: "Congé proche aidant / AJPA", description: "Même démarche qu'en hospitalisation si tu es l'aidant principal.", urgent: true, sharedWithVisitors: false },
          { title: "Procuration bancaire", description: "Si la personne ne peut plus gérer ses comptes.", sharedWithVisitors: false },
        ],
      },
    ],
  },

  situations_besoins: {
    icon: "🔎",
    label: "Faire le point sur les besoins actuels",
    colorKey: "accent",
    groups: [
      {
        phase: "À la maison",
        items: [
          { title: "Faire les courses", description: "", category: "courses", sharedWithVisitors: true },
          { title: "Préparer des repas pour plusieurs jours", description: "", category: "repas", sharedWithVisitors: true },
          { title: "Aider pour le ménage", description: "", category: "affaires", sharedWithVisitors: true },
          { title: "Faire le linge", description: "", category: "affaires", sharedWithVisitors: true },
        ],
      },
      {
        phase: "Organisation",
        items: [
          { title: "Prendre ou confirmer un rendez-vous", description: "", category: "administratif", sharedWithVisitors: true, needsDetail: true },
          { title: "Accompagner à un rendez-vous", description: "", category: "transport", sharedWithVisitors: true, needsDetail: true },
          { title: "Faire une démarche administrative", description: "", category: "administratif", sharedWithVisitors: true, needsDetail: true },
          { title: "Passer un appel pour le compte du proche", description: "", category: "administratif", sharedWithVisitors: true, needsDetail: true },
          { title: "Organiser une présence pendant une période d'indisponibilité", description: "Quand l'aidant habituel ne peut pas être là.", category: "autre", sharedWithVisitors: true },
        ],
      },
      {
        phase: "Pour l'aidant",
        items: [
          { title: "Permettre à l'aidant de souffler quelques heures", description: "", category: "autre", sharedWithVisitors: true },
          { title: "Prendre le relais sur une journée complète", description: "", category: "autre", sharedWithVisitors: true },
          { title: "Rechercher une solution de répit", description: "Accueil de jour, hébergement temporaire, relais à domicile.", category: "autre", sharedWithVisitors: true },
        ],
      },
    ],
  },

  retour_domicile: {
    icon: "🏥",
    label: "Préparer un retour à domicile",
    colorKey: "orange",
    groups: [
      {
        phase: "Avant le retour",
        items: [
          { title: "Vérifier que le transport retour est organisé", description: "", category: "transport", sharedWithVisitors: true },
          { title: "Faire les courses avant l'arrivée", description: "", category: "courses", sharedWithVisitors: true },
          { title: "Vérifier que le logement est prêt", description: "", category: "affaires", sharedWithVisitors: true },
          { title: "Prévoir une présence le jour du retour", description: "", category: "autre", sharedWithVisitors: true },
        ],
      },
      {
        phase: "Les premiers jours",
        items: [
          { title: "Prévoir une présence les premiers jours", description: "", category: "autre", sharedWithVisitors: true },
          { title: "Identifier les prochains rendez-vous de suivi", description: "", category: "administratif", sharedWithVisitors: true },
          { title: "Vérifier qui peut accompagner à ces rendez-vous", description: "", category: "transport", sharedWithVisitors: true },
          {
            title: "Vérifier si une aide extérieure est nécessaire",
            description: "Aide à domicile, portage de repas, téléassistance.",
            category: "administratif",
            sharedWithVisitors: false,
            lienExterne: { label: "Service-Public — Aides à domicile", url: "https://www.service-public.fr/particuliers/vosdroits/F759" },
          },
          {
            title: "Vérifier les aides mobilisables pour le retour à domicile",
            description: "Selon la situation, plusieurs dispositifs peuvent s'appliquer — à vérifier au cas par cas.",
            category: "administratif",
            sharedWithVisitors: false,
            lienExterne: { label: "Service-Public — Aides aux personnes âgées", url: "https://www.service-public.fr/particuliers/vosdroits/N360" },
          },
        ],
      },
    ],
  },

  relais_familial: {
    icon: "🤝",
    label: "Organiser les relais familiaux",
    colorKey: "gold",
    groups: [
      {
        phase: "Comprendre le besoin",
        items: [
          { title: "Identifier ce que l'aidant principal assure au quotidien", description: "", category: "autre", sharedWithVisitors: true },
          { title: "Identifier les moments où un relais est nécessaire", description: "", category: "autre", sharedWithVisitors: true },
        ],
      },
      {
        phase: "Organiser",
        items: [
          { title: "Prévoir une présence ponctuelle (quelques heures)", description: "", category: "autre", sharedWithVisitors: true },
          { title: "Prévoir un relais sur une journée complète", description: "", category: "autre", sharedWithVisitors: true },
          { title: "Vérifier qui peut remplacer l'aidant en cas d'imprévu", description: "", category: "autre", sharedWithVisitors: true },
          { title: "Définir un contact à joindre en cas d'urgence", description: "", category: "administratif", sharedWithVisitors: true },
        ],
      },
    ],
  },

  repit_aidant: {
    icon: "😮‍💨",
    label: "Organiser du répit pour l'aidant",
    colorKey: "accent",
    personalOnly: true,
    groups: [
      {
        phase: "Identifier le besoin",
        items: [
          { title: "Identifier les moments où l'aidant a besoin d'être remplacé", description: "", category: "autre", sharedWithVisitors: true },
          { title: "Publier un besoin de relais ponctuel dans Entraide", description: "", category: "autre", sharedWithVisitors: true },
        ],
      },
      {
        phase: "Chercher une solution",
        items: [
          {
            title: "Repérer une solution d'accueil de jour ou temporaire",
            description: "",
            category: "administratif",
            sharedWithVisitors: false,
            lienExterne: { label: "Service-Public — Accueil de jour et hébergement temporaire", url: "https://www.service-public.fr/particuliers/vosdroits/F33220" },
          },
          {
            title: "Vérifier si mon proche bénéficie de l'APA",
            description: "L'APA peut, selon la situation, comporter une part dédiée au répit de l'aidant.",
            category: "administratif",
            sharedWithVisitors: false,
            lienExterne: { label: "Service-Public — APA", url: "https://www.service-public.fr/particuliers/vosdroits/F10009" },
          },
          {
            title: "Vérifier si le droit au répit peut être mobilisé",
            description: "",
            category: "administratif",
            sharedWithVisitors: false,
            lienExterne: { label: "CNSA — Droit au répit", url: "https://www.pour-les-personnes-agees.gouv.fr" },
          },
          { title: "Noter la démarche à effectuer et me fixer un rappel", description: "", category: "administratif", sharedWithVisitors: false },
        ],
      },
    ],
  },

  conge_proche_aidant: {
    icon: "💼",
    label: "Activer mon congé proche aidant + AJPA",
    colorKey: "orange",
    personalOnly: true,
    groups: [
      {
        phase: "Vérifier mon éligibilité",
        items: [
          {
            title: "Vérifier que je remplis les conditions d'éligibilité",
            description: "",
            urgent: true,
            category: "administratif",
            sharedWithVisitors: false,
            lienExterne: { label: "Service-Public — Congé de proche aidant", url: "https://www.service-public.fr/particuliers/vosdroits/F15060" },
          },
          {
            title: "Vérifier mon ancienneté si je suis salarié",
            description: "",
            category: "administratif",
            sharedWithVisitors: false,
          },
        ],
      },
      {
        phase: "Préparer ma demande",
        items: [
          {
            title: "Identifier le justificatif de la situation de mon proche",
            description: "Perte d'autonomie ou handicap.",
            category: "administratif",
            sharedWithVisitors: false,
            piecesRequises: ["Justificatif de perte d'autonomie ou de handicap du proche aidé"],
          },
          { title: "Choisir la forme du congé : continu, fractionné ou à temps partiel", description: "", category: "administratif", sharedWithVisitors: false },
          { title: "Définir la date de début souhaitée", description: "", category: "administratif", sharedWithVisitors: false },
          {
            title: "Préparer ma demande à l'employeur",
            description: "",
            category: "administratif",
            sharedWithVisitors: false,
            piecesRequises: ["Lettre ou formulaire de demande de congé"],
          },
          { title: "Envoyer la demande à l'employeur et conserver la preuve d'envoi", description: "", category: "administratif", sharedWithVisitors: false },
        ],
      },
      {
        phase: "Faire la démarche AJPA",
        items: [
          {
            title: "Rassembler le justificatif du lien avec mon proche",
            description: "",
            category: "administratif",
            sharedWithVisitors: false,
            piecesRequises: ["Justificatif du lien familial ou de la vie commune"],
          },
          {
            title: "Faire la demande AJPA auprès de la CAF ou de la MSA",
            description: "Selon votre régime.",
            urgent: true,
            category: "administratif",
            sharedWithVisitors: false,
            piecesRequises: ["Justificatif de perte d'autonomie du proche", "Attestation de l'employeur si salarié", "RIB"],
            lienExterne: { label: "Service-Public — Demande AJPA", url: "https://www.service-public.fr/particuliers/vosdroits/F34848" },
          },
        ],
      },
      {
        phase: "Suivi",
        items: [
          {
            title: "Déclarer chaque mois les jours effectivement consacrés à l'aide",
            description: "Déclaration à renouveler mensuellement.",
            category: "administratif",
            sharedWithVisitors: false,
            recurrent: "mensuel",
            lienExterne: { label: "CAF — Espace personnel", url: "https://www.caf.fr" },
          },
          { title: "Suivre le nombre de jours AJPA déjà utilisés", description: "", category: "administratif", sharedWithVisitors: false },
          { title: "Préparer mon retour à l'emploi", description: "", category: "administratif", sharedWithVisitors: false },
        ],
      },
    ],
  },

  maintien_domicile: {
    icon: "🏠",
    label: "Faire le point sur le maintien à domicile",
    colorKey: "gold",
    groups: [
      {
        phase: "Organisation pratique",
        items: [
          { title: "Planifier les intervenants à domicile", description: "Infirmier·ère, kiné, aide à domicile.", category: "administratif", sharedWithVisitors: true },
          { title: "Vérifier si le logement nécessite des aménagements", description: "", category: "affaires", sharedWithVisitors: true },
          { title: "Organiser les courses et repas récurrents", description: "", category: "courses", sharedWithVisitors: true },
          { title: "Organiser l'entretien régulier du logement", description: "", category: "affaires", sharedWithVisitors: true },
        ],
      },
      {
        phase: "Aides à vérifier",
        items: [
          {
            title: "Vérifier si mon proche bénéficie de l'APA",
            description: "",
            category: "administratif",
            sharedWithVisitors: false,
            lienExterne: { label: "Service-Public — APA", url: "https://www.service-public.fr/particuliers/vosdroits/F10009" },
          },
          {
            title: "Vérifier les aides à l'adaptation du logement",
            description: "",
            category: "administratif",
            sharedWithVisitors: false,
            lienExterne: { label: "ANAH — MaPrimeAdapt'", url: "https://www.anah.fr" },
          },
          {
            title: "Vérifier le crédit d'impôt pour les services à la personne",
            description: "",
            category: "administratif",
            sharedWithVisitors: false,
            lienExterne: { label: "impots.gouv.fr — Services à la personne", url: "https://www.impots.gouv.fr" },
          },
          { title: "Vérifier les aides de la caisse de retraite du proche", description: "", category: "administratif", sharedWithVisitors: false },
        ],
      },
    ],
  },

  handicap: {
    icon: "♿",
    label: "Faire le point sur les démarches liées au handicap",
    colorKey: "accent",
    groups: [
      {
        phase: "Constituer le dossier",
        items: [
          { title: "Identifier les besoins actuels liés à la situation", description: "", category: "autre", sharedWithVisitors: true },
          {
            title: "Vérifier si une reconnaissance MDPH est déjà engagée",
            description: "",
            category: "administratif",
            sharedWithVisitors: false,
            lienExterne: { label: "Service-Public — Demande MDPH", url: "https://www.service-public.fr/particuliers/vosdroits/F14953" },
          },
          {
            title: "Rassembler les justificatifs pour le dossier MDPH",
            description: "",
            category: "administratif",
            sharedWithVisitors: false,
            piecesRequises: ["Certificat médical récent", "Justificatif d'identité", "Justificatif de domicile"],
          },
        ],
      },
      {
        phase: "Aides à vérifier",
        items: [
          {
            title: "Vérifier l'éligibilité à la PCH",
            description: "",
            category: "administratif",
            sharedWithVisitors: false,
            lienExterne: { label: "Service-Public — PCH", url: "https://www.service-public.fr/particuliers/vosdroits/F14202" },
          },
          {
            title: "Vérifier l'éligibilité à l'AAH si majeur",
            description: "",
            category: "administratif",
            sharedWithVisitors: false,
            lienExterne: { label: "Service-Public — AAH", url: "https://www.service-public.fr/particuliers/vosdroits/F12242" },
          },
          {
            title: "Vérifier les aides à l'adaptation du logement ou du véhicule",
            description: "",
            category: "administratif",
            sharedWithVisitors: false,
            lienExterne: { label: "ANAH — MaPrimeAdapt'", url: "https://www.anah.fr" },
          },
          { title: "Identifier les associations locales spécialisées", description: "", category: "administratif", sharedWithVisitors: false },
        ],
      },
    ],
  },

  fin_de_vie: {
    icon: "🕊️",
    label: "Organiser l'accompagnement de fin de vie",
    colorKey: "orange",
    groups: [
      {
        phase: "Organisation familiale",
        items: [
          { title: "Organiser une présence régulière auprès du proche", description: "", category: "autre", sharedWithVisitors: true },
          { title: "Coordonner les visites de la famille et des proches", description: "", category: "autre", sharedWithVisitors: true },
        ],
      },
      {
        phase: "Démarches à anticiper",
        items: [
          { title: "Vérifier si mon proche a rédigé des directives anticipées", description: "", category: "administratif", sharedWithVisitors: false },
          { title: "Identifier la personne de confiance désignée, si elle existe", description: "", category: "administratif", sharedWithVisitors: false },
          {
            title: "Se renseigner sur les dispositifs de soins palliatifs disponibles",
            description: "",
            category: "administratif",
            sharedWithVisitors: false,
            lienExterne: { label: "Service-Public — Soins palliatifs", url: "https://www.service-public.fr/particuliers/vosdroits/F32471" },
          },
          {
            title: "Vérifier le congé de solidarité familiale si je suis salarié",
            description: "",
            urgent: true,
            category: "administratif",
            sharedWithVisitors: false,
            lienExterne: { label: "Service-Public — Congé de solidarité familiale", url: "https://www.service-public.fr/particuliers/vosdroits/F15170" },
          },
          { title: "Identifier un contact pour un accompagnement psychologique de la famille", description: "", category: "administratif", sharedWithVisitors: false },
        ],
      },
    ],
  },
};

export function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Description publiée sur le besoin `tasks` créé à partir d'un item de
// checklist : la description saisie dans le template, complétée par les
// informations pratiques (pièces à réunir, lien officiel, rappel récurrent)
// qui n'ont pas de colonne dédiée sur `tasks` — pour ne pas les perdre une
// fois l'item publié sur le Mur d'Entraide / dans "Ma Checklist".
export function checklistItemDescription(item: ChecklistItem): string {
  const parts = [item.description];
  if (item.piecesRequises?.length) parts.push(`Pièces à réunir : ${item.piecesRequises.join(", ")}`);
  if (item.lienExterne) parts.push(`Info : ${item.lienExterne.label} — ${item.lienExterne.url}`);
  if (item.recurrent === "mensuel") parts.push("🔁 À renouveler chaque mois.");
  return parts.filter(Boolean).join("\n\n");
}

// Retrouve la checklist suggérée d'origine d'un titre (ex: pour ranger un
// item rejoint via "Je m'en occupe" dans le bon sous-bloc de "Ma Checklist")
// — null si le titre ne correspond à aucun item connu (besoin créé hors
// checklist suggérée).
export function findTemplateContextForTitle(title: string): ChecklistContext | null {
  const norm = title.trim().toLowerCase();
  if (!norm) return null;
  for (const ctx of Object.keys(CHECKLIST_TEMPLATES) as ChecklistContext[]) {
    if (CHECKLIST_TEMPLATES[ctx].groups.some((g) => g.items.some((it) => it.title.trim().toLowerCase() === norm))) {
      return ctx;
    }
  }
  return null;
}
