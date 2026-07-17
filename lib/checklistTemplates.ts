// Checklists administratives suggérées — utilisées dans Entraide (outil admin
// dédié + sélecteur repliable dans "Nouveau besoin") ET dans "Ma Checklist"
// (import personnel, voir components/MyChecklist.tsx). Extrait de
// components/Entraide.tsx pour être partagé sans dupliquer ~150 lignes de
// contenu entre les deux.
export type ChecklistContext = "adulte" | "enfant" | "domicile";

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
}

export interface ChecklistTemplate {
  icon: string;
  label: string;
  colorKey: "accent" | "orange" | "gold";
  groups: { phase: string; items: ChecklistItem[] }[];
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
};

export function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
