import { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Pressable, ScrollView,
  Modal, StyleSheet, Alert, ActivityIndicator, Image,
  KeyboardAvoidingView, Platform, Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import { supabase } from "@/lib/supabase";
import { getVisitorSession, rememberAuthorPin, sessionPinMatches } from "@/lib/visitorSession";
import { markEntraideSeen } from "@/lib/entraideBadges";
import PinPad from "@/components/PinPad";
import MiniCalendar from "@/components/MiniCalendar";
import SegmentedSwitch from "@/components/SegmentedSwitch";
import TimeClockPicker from "@/components/TimeClockPicker";
import ConfirmModal from "@/components/ConfirmModal";
import ShoppingListModal from "@/components/ShoppingListModal";
import { toFrShort } from "@/lib/slotUtils";
import { googleMapsSearchUrl, joinAddress } from "@/lib/address";
import { addGenericEventToNativeCalendar } from "@/lib/calendarSync";
import type { Task, TransportProposal, TaskRelaisCoverage } from "@/lib/types";
import { CHECKLIST_COLORS, type Theme } from "@/lib/themes";
import { CHECKLIST_TEMPLATES, addDaysIso, checklistItemDescription, findTemplateContextForTitle, findTemplateItemByTitle, type ChecklistContext, type ChecklistItem } from "@/lib/checklistTemplates";
import { isRelaisFullyCovered, computeRelaisGaps, type RelaisCoverageRange } from "@/lib/relaisCoverage";

const PHOTO_BUCKET = "entraide-photos";

// Assistant de publication de checklist (voir checklistWizardList) — un item
// gabarit (key = index dans le modèle) ou un item libre ajouté à la volée
// (key = "custom-N"), avec ses réglages saisis un par un dans le popup dédié.
type ChecklistWizardEntry = { key: string; item: ChecklistItem };
type ChecklistWizardFields = { dateLimite: string; urgent: boolean; detail: string };

function taskPhotoUrl(spaceId: string, filename: string) {
  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(`${spaceId}/${filename}`);
  return data.publicUrl;
}

// Section "Besoins" extraite de l'ancien EntraideSoutien.tsx (qui combinait
// Besoins + Mur de soutien sous un toggle interne) — voir components/Soutien.tsx
// pour l'autre moitié. Même logique, juste sans le toggle de section.

type TaskStatus = Task["status"];
type TaskCategory = Task["category"];

const CATEGORY_ICONS: Record<TaskCategory, string> = {
  repas: "🍽️",
  affaires: "👕",
  courses: "🛒",
  transport: "🚗",
  administratif: "🗂️",
  autre: "💡",
  relais: "🆘",
};

// Titre inséré automatiquement dans "Titre du besoin" quand on choisit une
// catégorie (voir selectCategory) — modifiable ensuite à la main, l'auto-
// remplissage ne réécrase jamais une saisie manuelle (voir autoTitleRef).
const CATEGORY_AUTO_TITLES: Record<TaskCategory, string> = {
  repas: "Besoin Repas",
  affaires: "Besoin Affaires",
  courses: "Besoin Courses",
  transport: "Besoin covoiturage",
  administratif: "Besoin Administratif",
  autre: "Autre besoin",
  relais: "Besoin de relais",
};

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  repas: "Repas",
  affaires: "Affaires",
  courses: "Courses",
  transport: "Transport",
  administratif: "Administratif",
  autre: "Autre",
  relais: "Relais",
};

// Identique à identityKey dans NightVisitorModal.tsx — comparaison de nom
// insensible aux accents/casse, pour matcher relais_recipients (prénom+nom
// sans PIN, choisis par catégorie visitor_profiles/reservations) sans
// dépendre du mécanisme samePerson (qui exige un PIN de session).
function relaisIdentityKey(prenom: string, nom: string) {
  const norm = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return `${norm(prenom)}|${norm(nom)}`;
}

// Comparaison insensible à la casse/accents pour éviter les doublons dans
// une liste de courses (saisie manuelle ou choix dans "Produits récurrents"),
// même principe que relaisIdentityKey ci-dessus.
function normalizeShoppingLabel(s: string) {
  return s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  ouvert: "Ouvert",
  pris_en_charge: "Pris en charge",
  fait: "Fait ✓",
  ferme: "Fermé",
};

const STATUS_COLORS = (C: Theme): Record<TaskStatus, string> => ({
  ouvert: C.success,
  pris_en_charge: C.orange,
  fait: C.muted,
  ferme: C.danger,
});

interface Props {
  spaceId: string;
  C: Theme;
  isAdmin: boolean;
  capped: boolean;
  // Préremplit "Arrivée" dans le formulaire de création d'un besoin Transport.
  hospitalName?: string;
  // Allergies du patient (saisies par l'admin dans "Profil Patient") — affichées
  // en rappel à quiconque publie ou prend en charge un besoin "Repas".
  allergies?: string | null;
  // Prénom du patient — utilisé dans le message pré-rempli d'un besoin de
  // relais ponctuel (voir openRelaisForm).
  patientFirstname?: string;
}

// "07/07 à 14h30" — combine la date (toFrShort) et une heure "HH:MM" stockée
// telle quelle en base (pas de fuseau horaire à gérer, contrairement à un
// timestamptz).
function slotLabel(dateIso: string, time: string): string {
  return `${toFrShort(new Date(dateIso + "T12:00:00"))} à ${time.replace(":", "h")}`;
}

// Rappel de la période demandée par l'admin (relais_start_date/date_limite),
// affiché sous le sous-titre à chaque étape du flux de claim relais — voir
// le popup de claim plus bas, où il reste visible du choix initial jusqu'à
// la feuille de confirmation, contrairement aux plages effectivement
// choisies par le preneur (relaisClaimRanges), propres à chaque étape.
function relaisRequestedPeriodLabel(t: Task | null): string | null {
  if (!t?.relais_start_date || !t.date_limite) return null;
  return `📅 Période demandée : du ${toFrShort(new Date(t.relais_start_date + "T12:00:00"))} au ${toFrShort(new Date(t.date_limite + "T12:00:00"))}`;
}

export default function Entraide({ spaceId, C, isAdmin, capped, hospitalName, allergies, patientFirstname }: Props) {
  const { focusTaskId, openClaim: openClaimParam, openRelais } = useLocalSearchParams<{ focusTaskId?: string; openClaim?: string; openRelais?: string }>();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const taskOffsets = useRef<Record<string, number>>({});
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const focusedRef = useRef(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const tasksRef = useRef<Task[]>([]);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  // PIN de session de cet appareil — sert à ne montrer "C'est fait" /
  // "Se désinscrire" que sur les besoins pris en charge par ce même
  // visiteur, jamais sur ceux pris en charge par quelqu'un d'autre.
  const [mySession, setMySession] = useState<{ prenom: string; nom: string; pin: string } | null>(null);
  useEffect(() => {
    if (!isAdmin) getVisitorSession().then((s) => {
      if (s) setMySession({ prenom: s.prenom, nom: s.nom, pin: s.pin });
    });
  }, [isAdmin]);
  // Un PIN seul ne suffit pas à identifier une personne de façon fiable ici :
  // ce ne sont pas des comptes, juste un code à 4 chiffres choisi librement —
  // deux identités différentes testées sur le même appareil peuvent tomber
  // sur le même PIN par coïncidence (ou par habitude en test), ce qui ferait
  // passer un besoin publié par quelqu'un d'autre pour "le mien". On exige
  // donc aussi la correspondance du prénom/nom de la session en cours.
  function samePerson(prenom: string | null, nom: string | null, pin: string | null): boolean {
    if (!mySession || !pin || !prenom || !nom) return false;
    return (
      mySession.pin === pin &&
      mySession.prenom.trim().toLowerCase() === prenom.trim().toLowerCase() &&
      mySession.nom.trim().toLowerCase() === nom.trim().toLowerCase()
    );
  }
  const isMine = (t: Task) => samePerson(t.claimed_by_prenom, t.claimed_by_nom, t.claimed_by_pin);
  // Preneur du retour, uniquement renseigné quand aller et retour ont été
  // attribués séparément à deux personnes différentes (sinon ce champ reste
  // null même si la même personne fait les deux, voir lib/types.ts).
  const isMineReturn = (t: Task) => samePerson(t.transport_return_claimed_by_prenom, t.transport_return_claimed_by_nom, t.transport_return_claimed_by_pin);
  // Le créateur d'un besoin Transport — seul lui (ou l'admin) peut valider
  // une proposition d'horaire.
  const isAuthor = (t: Task) => samePerson(t.author_prenom, t.author_nom, t.author_pin);
  const canManageTransport = (t: Task) => isAdmin || isAuthor(t);
  // Vrai dès qu'au moins une jambe (aller ou retour) a déjà un preneur —
  // sert à masquer "Je m'en occupe" (qui prendrait les deux jambes d'un
  // coup) une fois qu'une jambe a été attribuée séparément via une
  // proposition, pour ne pas écraser cette attribution.
  const transportAnyLegClaimed = (t: Task) => !!t.claimed_by_prenom || !!t.transport_return_claimed_by_prenom;
  // Jambe(s) que CE visiteur a personnellement en charge sur ce besoin — sert
  // à limiter "C'est fait"/"Se désinscrire"/"Ajouter au calendrier" à ce qui
  // le concerne. Si l'aller et le retour ont été pris par la même personne
  // (claim direct, transport_return_claimed_by_prenom resté null), les deux
  // jambes lui reviennent.
  const myTransportLegs = (t: Task): ("out" | "return")[] => {
    const legs: ("out" | "return")[] = [];
    if (isMine(t)) legs.push("out");
    if (t.transport_round_trip) {
      if (t.transport_return_claimed_by_prenom) {
        if (isMineReturn(t)) legs.push("return");
      } else if (isMine(t)) {
        legs.push("return");
      }
    }
    return legs;
  };
  // null = pas de filtre, affiche tous les besoins (existant). Cliquer à
  // nouveau sur l'onglet actif désélectionne.
  const [activeCat, setActiveCat] = useState<TaskCategory | null>(null);
  const [openOnlyFilter, setOpenOnlyFilter] = useState(false);
  const [closedOnlyFilter, setClosedOnlyFilter] = useState(false);

  const [taskForm, setTaskForm] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [fTitle, setFTitle] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fCat, setFCat] = useState<TaskCategory>("autre");
  const [fPhotoUri, setFPhotoUri] = useState<string | null>(null);
  const [fExistingPhoto, setFExistingPhoto] = useState<string | null>(null);
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const [taskSaving, setTaskSaving] = useState(false);

  // Popup "Choisis la source de la photo" (caméra / galerie), partagé entre
  // les 3 flux photo du mur d'entraide — pickerTarget route le choix vers le
  // bon état (formulaire besoin / preuve "fait" / prise en charge).
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<"task" | "claim" | "done">("task");
  // Échéance optionnelle + urgent — catégories hors Transport (qui a déjà
  // ses propres champs date/heure, voir fTDate plus bas).
  const [fDateLimite, setFDateLimite] = useState("");
  const [fDLPickerOpen, setFDLPickerOpen] = useState(false);
  const [fDLCalMonth, setFDLCalMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [fUrgent, setFUrgent] = useState(false);
  // Dernière date pour laquelle le tag Urgent a été activé automatiquement
  // (voir l'effet plus bas, "besoin créé pour J+2") — empêche de re-forcer
  // le tag après que la personne l'ait décoché à la main tant que la date
  // choisie ne change pas.
  const autoUrgentDateRef = useRef<string | null>(null);

  // Champs spécifiques catégorie "relais" (besoin de relais ponctuel, publié
  // uniquement via openRelaisForm — pas sélectionnable dans la grille de
  // catégories). La date de fin réutilise fDateLimite/fDLCalMonth ci-dessus
  // (toujours affichée pour cette catégorie, pas de bouton "Ajouter une
  // échéance"). relaisAuthorPrenom sert à générer le message pré-rempli
  // (voir l'effet d'auto-génération plus bas) et est résolu une fois à
  // l'ouverture du formulaire (openRelaisForm), avant que l'identité auteur
  // ne soit re-résolue au submit comme pour les autres catégories.
  const [fRelaisStartDate, setFRelaisStartDate] = useState("");
  const [fRelaisStartCalMonth, setFRelaisStartCalMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [fRelaisVisibleTo, setFRelaisVisibleTo] = useState<"all" | "some">("all");
  const [fRelaisCandidates, setFRelaisCandidates] = useState<{ prenom: string; nom: string }[]>([]);
  const [fRelaisCandidatesLoading, setFRelaisCandidatesLoading] = useState(false);
  const [fRelaisSelectedKeys, setFRelaisSelectedKeys] = useState<Set<string>>(new Set());
  const [relaisAuthorPrenom, setRelaisAuthorPrenom] = useState("");
  // Dernier message auto-généré (prénom auteur + dates + prénom patient) —
  // même principe que autoTitleRef : ne réécrase jamais un texte que la
  // personne a personnalisé à la main.
  const autoRelaisMsgRef = useRef("");
  const relaisOpenedRef = useRef(false);

  // Liste de courses en bullet points (catégorie "courses", création
  // uniquement — voir ShoppingListModal.tsx pour l'édition/coché "acheté"
  // une fois le besoin publié, qui repart des vraies lignes shopping_list_items
  // plutôt que de ce brouillon pour ne jamais écraser un article déjà coché).
  const [fCourseItems, setFCourseItems] = useState<string[]>([]);
  const [fCourseItemDraft, setFCourseItemDraft] = useState("");
  // Popup dédié "Créer une liste de courses" (ouvert depuis le bouton
  // Catégorie "Courses" du formulaire), et son sous-popup "Produits
  // récurrents" — même contrainte Android que checklistPicker/taskForm : un
  // seul <Modal> visible à la fois, on ferme puis rouvre via setTimeout.
  const [coursesListModal, setCoursesListModal] = useState(false);
  const [recurringItemsModal, setRecurringItemsModal] = useState(false);
  const [recurringItems, setRecurringItems] = useState<{ id: string; label: string }[]>([]);
  const [recurringLoading, setRecurringLoading] = useState(false);
  // Sélection multiple (appui long), réservée à l'admin — supprime des
  // entrées du catalogue sans toucher aux besoins déjà publiés.
  const [recurringSelectMode, setRecurringSelectMode] = useState(false);
  const [recurringSelected, setRecurringSelected] = useState<Set<string>>(new Set());
  // Besoin "courses" dont on affiche la liste (bouton "👁️ Aperçu" sur la
  // carte) — même ShoppingListModal que "📄 Mes documents" (MyChecklist.tsx),
  // donc toute modification se répercute des deux côtés sans synchronisation.
  const [shoppingListTask, setShoppingListTask] = useState<Task | null>(null);
  // Identités ayant coché au moins un article de chaque besoin "courses"
  // (shopping_list_items.bought_by_*), pour afficher "X, Y et Z s'en
  // occupent" sur la carte même avant toute prise en charge explicite —
  // rechargé à chaque (re)chargement de tasks (mount + realtime + fermeture
  // du popup liste), pas en temps réel entre deux cochages d'autres
  // personnes pendant qu'on reste sur l'écran.
  const [courseContributors, setCourseContributors] = useState<Record<string, { prenom: string; nom: string }[]>>({});
  // Liste complète = tous les articles cochés (sert à afficher "... partiellement"
  // tant qu'il reste au moins un article non coché, cf. courseContributorsLabel).
  const [courseListComplete, setCourseListComplete] = useState<Record<string, boolean>>({});
  const loadCourseContributors = useCallback(async (taskIds: string[]) => {
    if (!taskIds.length) { setCourseContributors({}); setCourseListComplete({}); return; }
    const { data } = await supabase
      .from("shopping_list_items")
      .select("task_id, bought, bought_by_prenom, bought_by_nom")
      .in("task_id", taskIds);
    const byTask: Record<string, { prenom: string; nom: string }[]> = {};
    const completeByTask: Record<string, boolean> = {};
    (data ?? []).forEach((row) => {
      if (row.task_id in completeByTask) {
        completeByTask[row.task_id] = completeByTask[row.task_id] && row.bought;
      } else {
        completeByTask[row.task_id] = row.bought;
      }
      if (!row.bought || !row.bought_by_prenom || !row.bought_by_nom) return;
      const list = byTask[row.task_id] ?? (byTask[row.task_id] = []);
      const key = relaisIdentityKey(row.bought_by_prenom, row.bought_by_nom);
      if (!list.some((p) => relaisIdentityKey(p.prenom, p.nom) === key)) {
        list.push({ prenom: row.bought_by_prenom, nom: row.bought_by_nom });
      }
    });
    setCourseContributors(byTask);
    setCourseListComplete(completeByTask);
  }, []);
  useEffect(() => {
    loadCourseContributors(tasks.filter((t) => t.category === "courses").map((t) => t.id));
  }, [tasks, loadCourseContributors]);
  // "X s'en occupe" / "X, Y et Z s'en occupent" — union des personnes ayant
  // coché un article et de la personne ayant cliqué "Je m'en occupe" (qui
  // rejoint la liste sans effacer ce que les autres ont déjà fait). Suffixe
  // "partiellement" tant qu'il reste au moins un article non coché.
  function courseContributorsLabel(t: Task): string | null {
    const list = [...(courseContributors[t.id] ?? [])];
    if (t.claimed_by_prenom && t.claimed_by_nom) {
      const key = relaisIdentityKey(t.claimed_by_prenom, t.claimed_by_nom);
      if (!list.some((p) => relaisIdentityKey(p.prenom, p.nom) === key)) {
        list.push({ prenom: t.claimed_by_prenom, nom: t.claimed_by_nom });
      }
    }
    if (list.length === 0) return null;
    const names = list.map((p) => `${p.prenom} ${p.nom}`);
    const joined = names.length > 1
      ? `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`
      : names[0];
    const partial = courseListComplete[t.id] === false ? " partiellement" : "";
    return `${joined} ${names.length > 1 ? "s'en occupent" : "s'en occupe"}${partial}`;
  }

  // Vrai pour un besoin "courses" pris en charge tant qu'il reste au moins un
  // article non coché — sert à ajouter la 2ème ligne "partiellement" sur le
  // tag de statut (voir renderTask), en plus du suffixe déjà présent sur
  // courseContributorsLabel.
  function coursePartial(t: Task): boolean {
    return t.category === "courses" && t.status === "pris_en_charge" && courseListComplete[t.id] === false;
  }

  // ── Checklists administratives suggérées (MVP) — voir CHECKLIST_TEMPLATES.
  // Popup accessible à l'admin comme aux visiteurs, depuis le bouton
  // "Créer une checklist" du formulaire Publier (catégorie Administratif) —
  // voir openChecklistFromForm.
  const [checklistPicker, setChecklistPicker] = useState(false);
  const [checklistContext, setChecklistContext] = useState<ChecklistContext | null>(null);
  const [checklistChecked, setChecklistChecked] = useState<Record<number, boolean>>({});
  const [checklistSaving, setChecklistSaving] = useState(false);
  // Items perso ajoutés au même lot qu'une checklist suggérée — liste de
  // brouillon avec suppression individuelle (✕), même pattern que
  // importCustomItems dans Ma Checklist (components/MyChecklist.tsx), plutôt
  // qu'un textarea multi-lignes.
  const [checklistCustomItems, setChecklistCustomItems] = useState<string[]>([]);
  const [checklistItemDraft, setChecklistItemDraft] = useState("");
  // Assistant séquentiel (un item à la fois) affiché après la sélection —
  // remplace l'ancien réglage "en lot" (échéance commune à tous les items,
  // urgence/précision en ligne dans la liste) jugé peu lisible et peu "App".
  // La liste est figée au moment où on quitte l'écran de sélection
  // (checklistWizardList) ; les réglages par item vivent dans
  // checklistWizardData, clé = ChecklistWizardEntry.key.
  const [checklistWizardList, setChecklistWizardList] = useState<ChecklistWizardEntry[]>([]);
  const [checklistWizardStep, setChecklistWizardStep] = useState(0);
  const [checklistWizardData, setChecklistWizardData] = useState<Record<string, ChecklistWizardFields>>({});
  const [checklistWizardDLCalMonth, setChecklistWizardDLCalMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  // Dernière date pour laquelle "Urgent" a été coché automatiquement, par
  // item (clé = ChecklistWizardEntry.key) — même garde-fou que
  // autoUrgentDateRef pour le formulaire Publier : ne réimpose pas le tag
  // si la personne le décoche à la main tant qu'elle ne rechange pas la date.
  const checklistWizardAutoUrgentRef = useRef<Record<string, string>>({});
  // Destination(s) du lot à publier — au moins une des deux doit rester
  // cochée (voir toggleChecklistPublishWall/Mine) : Mur d'Entraide (tasks),
  // Mes Checklists (personal_checklist_items), ou les deux en même temps —
  // dans ce dernier cas les lignes sont liées par task_id (voir
  // publishChecklistWizard) pour que le statut reste synchronisé (même
  // mécanisme que syncPersonalChecklistStatus, déjà utilisé ailleurs).
  const [checklistPublishToWall, setChecklistPublishToWall] = useState(true);
  const [checklistPublishToMine, setChecklistPublishToMine] = useState(false);
  // Après suppression d'un besoin lié à une checklist perso (task_id), s'il
  // reste des lignes personal_checklist_items pointant vers ce(s) besoin(s)
  // supprimé(s), propose de les supprimer aussi plutôt que de les laisser
  // orphelines (task_id repassé à null par la contrainte FK "on delete set
  // null", voir supabase/migrations/20260717_personal_checklist_items.sql).
  const [deleteLinkedPersonalTarget, setDeleteLinkedPersonalTarget] = useState<string[] | null>(null);
  const [deleteLinkedPersonalSaving, setDeleteLinkedPersonalSaving] = useState(false);

  // Popup "Créer une nouvelle checklist" (perso, hors templates) — ouvert
  // depuis le popup de choix ci-dessus (voir openCustomChecklistModal),
  // fermé puis rouvert après un court délai pour ne jamais empiler deux
  // <Modal> sur Android (même contrainte que claimDuplicate plus bas).
  const [customChecklistModal, setCustomChecklistModal] = useState(false);
  const [customChecklistName, setCustomChecklistName] = useState("");
  const [customChecklistItems, setCustomChecklistItems] = useState<string[]>([]);
  const [customChecklistItemDraft, setCustomChecklistItemDraft] = useState("");
  const [customChecklistSaving, setCustomChecklistSaving] = useState(false);

  // Annulation d'un lot ajouté d'un coup (checklist admin dédiée ou sélecteur
  // repliable ci-dessus) — capture les id insérés pour pouvoir tout supprimer
  // d'un coup en cas d'erreur, fenêtre courte façon "undo" plutôt qu'un vrai
  // historique (voir triggerBatchUndo/undoBatch).
  const [batchUndo, setBatchUndo] = useState<{ ids: string[]; count: number } | null>(null);
  const batchUndoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (batchUndoTimer.current) clearTimeout(batchUndoTimer.current); }, []);

  // Champs spécifiques catégorie "transport" dans le formulaire de création.
  const [fTDate, setFTDate] = useState("");
  const [fTCalMonth, setFTCalMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [fTOutTime, setFTOutTime] = useState("");
  const [fTReturnTime, setFTReturnTime] = useState("");
  const [fTRoundTrip, setFTRoundTrip] = useState(false);
  const [fTFlexible, setFTFlexible] = useState(true);
  // Adresse du domicile du demandeur — seul lieu éditable ici. Le lieu de
  // soin (hôpital) est figé (space.hospital_name, non modifiable dans ce
  // formulaire) : "Intervertir" ne fait que changer de quel côté (Départ ou
  // Arrivée) se trouve ce bloc domicile, pas son contenu.
  const [fTHomeAddress, setFTHomeAddress] = useState("");
  // false = domicile en Départ, hôpital (figé) en Arrivée (par défaut).
  // true = inversé (utile pour une demande de retour hôpital → domicile).
  const [fTSwapped, setFTSwapped] = useState(false);
  // Code postal / ville / pays du domicile — sert à générer un lien Google
  // Maps pour l'aidant qui prend en charge la demande, quel que soit le
  // côté (Départ ou Arrivée) où se trouve le domicile.
  const [fTHomePostalCode, setFTHomePostalCode] = useState("");
  const [fTHomeCity, setFTHomeCity] = useState("");
  const [fTHomeCountry, setFTHomeCountry] = useState("");
  // "Publier pour quelqu'un d'autre" (ex. un proche âgé) — distinct de
  // l'auteur (author_prenom/nom), qui reste toujours la personne connectée.
  const [fTForSomeoneElse, setFTForSomeoneElse] = useState(false);
  const [fTForPrenom, setFTForPrenom] = useState("");
  const [fTForNom, setFTForNom] = useState("");
  // Dernier titre généré automatiquement (catégorie/date) — permet de ne
  // jamais écraser un titre que la personne a personnalisé à la main.
  const autoTitleRef = useRef("");
  // Largeur de pastille du switch "Aller simple / Aller-retour", reprise
  // par le switch "Flexible / Horaire fixe" juste en dessous pour que les
  // deux curseurs aient la même taille.
  const [transportThumbWidth, setTransportThumbWidth] = useState(0);

  const transportFormReady = fTDate.trim() && fTOutTime.length === 5 && fTHomeAddress.trim()
    && (!fTRoundTrip || fTReturnTime.length === 5)
    && (!fTForSomeoneElse || (fTForPrenom.trim() && fTForNom.trim()));

  const relaisFormReady = !!fRelaisStartDate && !!fDateLimite
    && (fRelaisVisibleTo === "all" || fRelaisSelectedKeys.size > 0);

  function selectCategory(cat: TaskCategory) {
    setFCat(cat);
    // N'écrase le titre que s'il est vide ou encore égal au dernier titre
    // auto-inséré (personne n'a tapé sa propre saisie depuis) — sinon on
    // laisse la saisie manuelle intacte.
    if (!editTask && (!fTitle.trim() || fTitle === autoTitleRef.current)) {
      const next = CATEGORY_AUTO_TITLES[cat];
      autoTitleRef.current = next;
      setFTitle(next);
    }
    // "Quand on clique sur Courses, ça doit ouvrir un popup 'Créer une liste
    // de courses'" — ouvert directement au clic sur la catégorie, pas
    // seulement via un bouton séparé (voir openCoursesListModal).
    if (!editTask && cat === "courses") openCoursesListModal();
  }

  function handleTransportDateSelect(iso: string) {
    setFTDate(iso);
    if (!fTitle.trim() || fTitle === autoTitleRef.current) {
      const next = `Besoin covoiturage : ${toFrShort(new Date(iso + "T12:00:00"))}`;
      autoTitleRef.current = next;
      setFTitle(next);
    }
  }

  function swapTransportDirection() {
    // Le lieu de soin reste figé — seul le côté (Départ/Arrivée) qui
    // affiche le bloc domicile change, son contenu ne bouge pas.
    setFTSwapped((v) => !v);
  }

  // Bloc domicile (adresse éditable + CP/ville/pays) — affiché du côté
  // Départ ou Arrivée selon fTSwapped, jamais dupliqué ni figé (contrairement
  // au lieu de soin, affiché à part via renderFixedCareLocation()).
  function renderHomeAddressFields() {
    return (
      <>
        <TextInput
          style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
          placeholder="Ex : Domicile, 12 rue des Lilas"
          placeholderTextColor={C.muted}
          value={fTHomeAddress}
          onChangeText={setFTHomeAddress}
        />
        <Text style={[styles.transportHint, { color: C.muted }]}>
          Pour générer un lien Google Maps du domicile, à l'usage de la personne qui prend en charge le trajet :
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.fieldLabel, { color: C.gold }]}>Code postal</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
              placeholder="38000"
              placeholderTextColor={C.muted}
              value={fTHomePostalCode}
              onChangeText={setFTHomePostalCode}
              keyboardType="number-pad"
            />
          </View>
          <View style={{ flex: 2 }}>
            <Text style={[styles.fieldLabel, { color: C.gold }]}>Ville</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
              placeholder="Grenoble"
              placeholderTextColor={C.muted}
              value={fTHomeCity}
              onChangeText={setFTHomeCity}
            />
          </View>
        </View>
        <Text style={[styles.fieldLabel, { color: C.gold }]}>Pays</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
          placeholder="Laisser vide si France"
          placeholderTextColor={C.muted}
          value={fTHomeCountry}
          onChangeText={setFTHomeCountry}
        />
      </>
    );
  }

  // Lieu de soin — figé, non modifiable ici (configuré dans les réglages de
  // l'espace, hospitalName). Affiché en lecture seule du côté opposé au
  // domicile.
  function renderFixedCareLocation() {
    return (
      <View style={[styles.input, styles.fixedLocationBox, { backgroundColor: C.bg, borderColor: C.border }]}>
        <Text style={{ fontFamily: "DM_Sans_400Regular", fontSize: 15, color: C.muted }}>
          {hospitalName || "Hôpital"}
        </Text>
        <Text style={[styles.transportHint, { color: C.muted, marginTop: 4, marginBottom: 0 }]}>
          🔒 Lieu de soin
        </Text>
      </View>
    );
  }

  // ── Modale "Propositions reçues" (demandeur/admin consulte les
  // propositions d'un besoin Transport et valide aller et/ou retour,
  // éventuellement depuis deux propositions différentes) ──
  const [proposalsTarget, setProposalsTarget] = useState<Task | null>(null);

  // ── Modale "Proposition" (aidant propose un autre horaire sur un besoin
  // Transport ouvert, sans le prendre en charge directement) ──
  const [proposeTarget, setProposeTarget] = useState<Task | null>(null);
  const [pDate, setPDate] = useState("");
  const [pCalMonth, setPCalMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [pOutTime, setPOutTime] = useState("");
  const [pReturnTime, setPReturnTime] = useState("");
  // Sur un besoin aller-retour, l'aidant choisit ce qu'il propose : l'aller,
  // le retour, ou les deux — pour que le demandeur puisse ensuite valider
  // chaque jambe séparément, avec des aidants différents si besoin.
  const [pIncludeOut, setPIncludeOut] = useState(true);
  const [pIncludeReturn, setPIncludeReturn] = useState(true);
  const [pNote, setPNote] = useState("");
  const [pPrenom, setPPrenom] = useState("");
  const [pNom, setPNom] = useState("");
  const [pPin, setPPin] = useState("");
  const [proposeSaving, setProposeSaving] = useState(false);

  const proposeFormReady = pDate.trim() && pPrenom.trim() && pNom.trim()
    && (!pIncludeOut || pOutTime.length === 5)
    && (!proposeTarget?.transport_round_trip || !pIncludeReturn || pReturnTime.length === 5)
    && (!proposeTarget?.transport_round_trip || pIncludeOut || pIncludeReturn)
    && (isAdmin || pPin.length >= 4);

  // Case à cocher "je m'en occupe déjà" dans le formulaire de création (pas
  // en édition) — le besoin est alors créé directement en "pris_en_charge"
  // au lieu de "ouvert", avec l'identité de son créateur. Réutilise les
  // mêmes states que le claim d'un besoin déjà publié (claimPrenom/Nom/Pin
  // ci-dessous) : les deux formulaires ne sont jamais ouverts en même temps.
  const [claimOnCreate, setClaimOnCreate] = useState(false);

  const [claimTarget, setClaimTarget] = useState<Task | null>(null);
  const [claimPrenom, setClaimPrenom] = useState("");
  const [claimNom, setClaimNom] = useState("");
  const [claimPin, setClaimPin] = useState("");
  const [claimPhotoUri, setClaimPhotoUri] = useState<string | null>(null);
  const [claimPickingPhoto, setClaimPickingPhoto] = useState(false);
  const [claimText, setClaimText] = useState("");
  const [claimSaving, setClaimSaving] = useState(false);

  // Étape intermédiaire propre à un besoin "relais" (plusieurs preneurs
  // possibles sur des sous-périodes distinctes, voir task_relais_coverage) —
  // s'intercale entre l'ouverture du claim et la feuille commune photo/texte.
  // null = pas un besoin relais (ou pas encore choisi) ; "choice" = les deux
  // gros boutons ; "period_start"/"period_end" = les deux popups "Du"/"Au"
  // enchaînés (un MiniCalendar chacun) ; "ready" = la feuille commune
  // s'affiche, relaisClaimRanges contient déjà les plages à insérer.
  const [relaisClaimStep, setRelaisClaimStep] = useState<"choice" | "period_start" | "period_end" | "ready" | null>(null);
  const [relaisClaimRanges, setRelaisClaimRanges] = useState<RelaisCoverageRange[]>([]);
  const [relaisClaimFullPeriod, setRelaisClaimFullPeriod] = useState(false);
  const [relaisClaimPeriodStart, setRelaisClaimPeriodStart] = useState("");
  const [relaisClaimPeriodEnd, setRelaisClaimPeriodEnd] = useState("");
  const [relaisClaimStartCalMonth, setRelaisClaimStartCalMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [relaisClaimEndCalMonth, setRelaisClaimEndCalMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const relaisClaimPeriodValid = !!relaisClaimPeriodStart && !!relaisClaimPeriodEnd
    && relaisClaimPeriodStart <= relaisClaimPeriodEnd
    && (!claimTarget?.relais_start_date || relaisClaimPeriodStart >= claimTarget.relais_start_date)
    && (!claimTarget?.date_limite || relaisClaimPeriodEnd <= claimTarget.date_limite);
  // "Du"/"Au" s'affichent en popups centrés (comme thanksModal) plutôt qu'en
  // feuille coulissante depuis le bas — voir la <Modal> commune plus bas.
  const relaisClaimStepCentered = relaisClaimStep === "period_start" || relaisClaimStep === "period_end";

  // Toutes les lignes task_relais_coverage des besoins relais actuellement
  // affichés — même pattern que courseContributors/loadCourseContributors
  // ci-dessus, mais gardant chaque ligne (identité + dates), pas juste un nom.
  const [relaisCoverage, setRelaisCoverage] = useState<Record<string, TaskRelaisCoverage[]>>({});
  const loadRelaisCoverage = useCallback(async (taskIds: string[]) => {
    if (!taskIds.length) { setRelaisCoverage({}); return; }
    const { data } = await supabase
      .from("task_relais_coverage")
      .select("*")
      .in("task_id", taskIds)
      .order("start_date", { ascending: true });
    const byTask: Record<string, TaskRelaisCoverage[]> = {};
    (data ?? []).forEach((row) => {
      (byTask[row.task_id] ?? (byTask[row.task_id] = [])).push(row as TaskRelaisCoverage);
    });
    setRelaisCoverage(byTask);
  }, []);
  useEffect(() => {
    loadRelaisCoverage(tasks.filter((t) => t.category === "relais").map((t) => t.id));
  }, [tasks, loadRelaisCoverage]);

  function closeClaim() {
    setClaimTarget(null);
    setRelaisClaimStep(null);
  }

  // Doublon détecté à la publication d'un besoin administratif (voir
  // findDuplicateAdminTask) : propose de rejoindre ("Je m'en occupe", flux
  // claim ci-dessus) ou de modifier le besoin déjà existant plutôt que d'en
  // recréer un second.
  const [duplicateTarget, setDuplicateTarget] = useState<Task | null>(null);
  const [modifyTarget, setModifyTarget] = useState<Task | null>(null);
  const [modifyDesc, setModifyDesc] = useState("");
  const [modifySaving, setModifySaving] = useState(false);

  const [pinModal, setPinModal] = useState<
    | { task: Task; action: "unclaim"; leg: "out" | "return" }
    | { task: Task; action: "unclaim_relais"; coverage: TaskRelaisCoverage }
    | null
  >(null);
  const [pinEntry, setPinEntry] = useState("");
  const [pinError, setPinError] = useState(false);

  const [doneTarget, setDoneTarget] = useState<Task | null>(null);
  const [donePhotoUri, setDonePhotoUri] = useState<string | null>(null);
  const [donePickingPhoto, setDonePickingPhoto] = useState(false);
  const [donePin, setDonePin] = useState("");
  const [donePinError, setDonePinError] = useState(false);
  const [donePinVerified, setDonePinVerified] = useState(false);
  const [doneSaving, setDoneSaving] = useState(false);

  // Confirmation affichée juste après une prise en charge — remplace un
  // ancien Alert.alert() natif, incohérent avec le reste de l'app (même
  // constat que pour le picker photo de SouvenirsGallery.tsx).
  const [thanksModal, setThanksModal] = useState(false);
  // Capturé juste avant que claimTarget soit remis à null (voir handleClaim)
  // — le popup "Merci" affiche un texte différent pour les besoins relais,
  // mais claimTarget n'existe déjà plus une fois ce popup affiché.
  const [thanksModalCategory, setThanksModalCategory] = useState<Task["category"] | null>(null);

  // Confirmations de suppression/désinscription — remplacent d'anciens
  // Alert.alert() natifs par ConfirmModal, cohérent avec le reste de l'app.
  const [deleteTaskTarget, setDeleteTaskTarget] = useState<Task | null>(null);
  const [deleteTaskSaving, setDeleteTaskSaving] = useState(false);
  const [unclaimConfirm, setUnclaimConfirm] = useState<
    | { task: Task; leg: "out" | "return" }
    | { task: Task; coverage: TaskRelaisCoverage }
    | null
  >(null);
  const [desengageEditTarget, setDesengageEditTarget] = useState<Task | null>(null);
  // Popup proposée après suppression d'un besoin issu d'une checklist
  // groupée, tant que d'autres items de la même liste sont encore ouverts —
  // complète le bandeau "Annuler" (8s seulement) pour un ménage fait plus tard.
  const [deleteBatchTarget, setDeleteBatchTarget] = useState<{ batchId: string; siblings: Task[] } | null>(null);
  const [deleteBatchSaving, setDeleteBatchSaving] = useState(false);

  // Suppression définitive par l'auteur d'un besoin déjà supprimé par
  // l'admin (bandeau rouge, voir renderTask) — toujours un vrai hard delete.
  const [selfDeleteTaskTarget, setSelfDeleteTaskTarget] = useState<Task | null>(null);
  const [selfDeleteTaskSaving, setSelfDeleteTaskSaving] = useState(false);

  // Sélection multiple (admin) : rester appuyé sur un bloc besoin l'entre en
  // mode sélection, un tap simple sur un autre bloc l'ajoute/l'enlève —
  // permet une suppression groupée sans repasser par le picker checklist.
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const selectionMode = selectedTaskIds.size > 0;
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkDeleteSaving, setBulkDeleteSaving] = useState(false);

  const [toast, setToast] = useState("");
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  const loadTasks = useCallback(async () => {
    setTasksLoading(true);
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("space_id", spaceId)
      .order("created_at", { ascending: false });
    setTasks(data || []);
    setTasksLoading(false);
  }, [spaceId]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  // Marque "vu" à chaque affichage de la liste (y compris rechargements
  // realtime pendant que l'écran est déjà ouvert) — référence utilisée par
  // la cloche rouge de la barre d'onglets, voir lib/entraideBadges.ts.
  useEffect(() => {
    if (tasksLoading) return;
    markEntraideSeen(spaceId, isAdmin);
  }, [tasksLoading, tasks, spaceId, isAdmin]);

  // Arrivée depuis "Mon compte" via un lien profond (?focusTaskId=...) :
  // on retire un éventuel filtre de catégorie qui cacherait le besoin, on
  // scrolle jusqu'à sa carte et on la surligne brièvement. focusedRef évite
  // de re-déclencher le scroll à chaque rechargement realtime de tasks.
  useEffect(() => {
    if (!focusTaskId || focusedRef.current || tasksLoading) return;
    const target = tasks.find((t) => t.id === focusTaskId);
    if (!target) return;
    focusedRef.current = true;
    if (activeCat && activeCat !== target.category) setActiveCat(null);
    if (openOnlyFilter && target.status !== "ouvert") setOpenOnlyFilter(false);
    if (closedOnlyFilter && target.status === "ouvert") setClosedOnlyFilter(false);
    setHighlightId(focusTaskId);
    setTimeout(() => {
      const y = taskOffsets.current[focusTaskId];
      if (y != null) scrollRef.current?.scrollTo({ y: Math.max(y - 12, 0), animated: true });
    }, 300);
    setTimeout(() => setHighlightId(null), 2500);
    // Depuis RelaisAlertModal ("🙋 Je m'en occupe") : ouvre directement la
    // sheet de prise en charge sur ce besoin plutôt que de dupliquer la
    // logique de claim (PIN, etc.).
    if (openClaimParam === "1" && target.status === "ouvert") openClaim(target);
  }, [focusTaskId, openClaimParam, tasks, tasksLoading, activeCat, openOnlyFilter, closedOnlyFilter]);

  // Arrivée depuis "Mon compte" (?openRelais=1) : ouvre le formulaire Publier
  // pré-rempli sur la catégorie "relais". Attend que l'identité (admin ou
  // session visiteur) soit disponible avant de résoudre le prénom auteur du
  // message pré-rempli — voir openRelaisForm.
  useEffect(() => {
    if (openRelais !== "1" || relaisOpenedRef.current) return;
    if (!isAdmin && !mySession) return;
    relaisOpenedRef.current = true;
    openRelaisForm();
  }, [openRelais, isAdmin, mySession]);

  // Régénère le message pré-rempli quand les dates de début/fin changent,
  // sans jamais écraser un texte personnalisé (même principe que
  // autoTitleRef/selectCategory).
  useEffect(() => {
    if (fCat !== "relais" || editTask) return;
    if (fDesc.trim() && fDesc !== autoRelaisMsgRef.current) return;
    const startLabel = fRelaisStartDate ? toFrShort(new Date(fRelaisStartDate + "T12:00:00")) : null;
    const endLabel = fDateLimite ? toFrShort(new Date(fDateLimite + "T12:00:00")) : null;
    const period = startLabel && endLabel ? ` du ${startLabel} au ${endLabel}` : "";
    const msg = `${relaisAuthorPrenom || "Un proche"} a besoin de souffler et sera indisponible${period} pour s'occuper de ${patientFirstname || "la personne accompagnée"}. Peux-tu prendre le relais sur cette période ?`;
    autoRelaisMsgRef.current = msg;
    setFDesc(msg);
  }, [fRelaisStartDate, fDateLimite, fCat, editTask, relaisAuthorPrenom, patientFirstname]);

  // Coche automatiquement "Urgent" quand la date du besoin (échéance, date
  // de transport, ou début de relais selon la catégorie) tombe à J+2 ou
  // moins — uniquement à la création (pas en édition, où la personne garde
  // la main). Ne re-force le tag qu'une fois par date choisie : si la
  // personne le décoche ensuite à la main, on ne le lui réimpose pas tant
  // qu'elle ne change pas à nouveau la date (voir autoUrgentDateRef).
  useEffect(() => {
    if (editTask) return;
    const dateIso = fCat === "transport" ? fTDate : fCat === "relais" ? fRelaisStartDate : fDateLimite;
    if (!dateIso) return;
    if (autoUrgentDateRef.current === dateIso) return;
    autoUrgentDateRef.current = dateIso;
    if (isUrgentWindow(dateIso)) setFUrgent(true);
  }, [fCat, fTDate, fRelaisStartDate, fDateLimite, editTask]);

  useEffect(() => {
    const ch = supabase
      .channel(`tasks:${spaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `space_id=eq.${spaceId}` }, loadTasks)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [spaceId, loadTasks]);

  // Un besoin jamais pris en charge ("ouvert") dont la date est dépassée
  // passe automatiquement en "fermé" — évite qu'il traîne indéfiniment en
  // attente de réponse. En revanche un besoin "pris en charge" reste tel
  // quel tant que "Fait" n'a pas été cliqué (voir openClaim : un rappel est
  // affiché à la prise en charge pour limiter l'oubli). Seule la catégorie
  // Transport porte aujourd'hui une date structurée (taskOverdueUnclaimed) ;
  // la vérification reste générique pour couvrir les autres catégories le
  // jour où elles en auront une. Vérifié au montage puis toutes les 60s via
  // tasksRef (évite de dépendre de `tasks` pour ne pas réinitialiser
  // l'intervalle à chaque rechargement).
  useEffect(() => {
    async function closeOverdueUnclaimed() {
      const overdue = tasksRef.current.filter(taskOverdueUnclaimed);
      if (overdue.length === 0) return;
      await Promise.all(overdue.map((t) => supabase.from("tasks").update({ status: "ferme" }).eq("id", t.id)));
    }
    closeOverdueUnclaimed();
    const interval = setInterval(closeOverdueUnclaimed, 60000);
    return () => clearInterval(interval);
  }, [spaceId]);

  function openCreateTask() {
    if (capped) {
      Alert.alert(
        "Limite atteinte",
        "Vous avez atteint la limite de votre espace. Consultez l'email envoyé à votre adresse pour en savoir plus.",
      );
      return;
    }
    setEditTask(null);
    autoTitleRef.current = CATEGORY_AUTO_TITLES.autre;
    setFTitle(autoTitleRef.current); setFDesc(""); setFCat("autre");
    setFPhotoUri(null); setFExistingPhoto(null);
    setClaimOnCreate(false);
    setClaimPrenom(""); setClaimNom(""); setClaimPin("");
    setFTDate(""); setFTOutTime(""); setFTReturnTime("");
    setFTRoundTrip(false); setFTFlexible(true);
    setFTHomeAddress("");
    setFTSwapped(false);
    setFTHomePostalCode(""); setFTHomeCity(""); setFTHomeCountry("");
    setFTForSomeoneElse(false); setFTForPrenom(""); setFTForNom("");
    setFTCalMonth(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
    setFDateLimite(""); setFDLPickerOpen(false); setFUrgent(false); autoUrgentDateRef.current = null;
    setFDLCalMonth(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
    setFCourseItems([]); setFCourseItemDraft("");
    setFRelaisStartDate(""); setFRelaisVisibleTo("all"); setFRelaisSelectedKeys(new Set());
    autoRelaisMsgRef.current = "";
    setTaskForm(true);
  }

  // Candidats pour le ciblage "Certains proches seulement" d'un besoin de
  // relais — même requête que NightVisitorModal.load() (reservations +
  // visitor_profiles, intervenants exclus), mais sans table "autorized"
  // dédiée : la sélection va directement dans relais_recipients au submit,
  // le ciblage se choisit à chaque besoin plutôt que comme réglage d'espace.
  async function loadRelaisCandidates() {
    setFRelaisCandidatesLoading(true);
    const [resv, profiles, intervenants] = await Promise.all([
      supabase.from("reservations").select("prenom,nom").eq("space_id", spaceId),
      supabase.from("visitor_profiles").select("prenom,nom").eq("space_id", spaceId),
      supabase.from("intervenant_profiles").select("prenom,nom").eq("space_id", spaceId),
    ]);
    const intervenantKeys = new Set((intervenants.data || []).map((i) => relaisIdentityKey(i.prenom, i.nom)));
    const byKey = new Map<string, { prenom: string; nom: string }>();
    function add(prenom?: string | null, nom?: string | null) {
      if (!prenom?.trim() || !nom?.trim()) return;
      const key = relaisIdentityKey(prenom, nom);
      if (intervenantKeys.has(key)) return;
      if (!byKey.has(key)) byKey.set(key, { prenom: prenom.trim(), nom: nom.trim() });
    }
    (resv.data || []).forEach((r) => add(r.prenom, r.nom));
    (profiles.data || []).forEach((p) => add(p.prenom, p.nom));
    setFRelaisCandidates(
      Array.from(byKey.values()).sort((a, b) => a.nom.localeCompare(b.nom, "fr") || a.prenom.localeCompare(b.prenom, "fr")),
    );
    setFRelaisCandidatesLoading(false);
  }

  // Point d'entrée "Mon compte" (?openRelais=1, voir l'effet plus bas) :
  // ouvre directement le formulaire Publier sur la catégorie "relais" (non
  // sélectionnable à la main), avec le message pré-rempli et la liste de
  // destinataires potentiels chargée.
  async function openRelaisForm() {
    if (capped) {
      Alert.alert(
        "Limite atteinte",
        "Vous avez atteint la limite de votre espace. Consultez l'email envoyé à votre adresse pour en savoir plus.",
      );
      return;
    }
    let prenom = "";
    if (isAdmin) {
      const { data } = await supabase.auth.getUser();
      prenom = (data.user?.user_metadata?.firstname ?? "").trim();
    } else if (mySession) {
      prenom = mySession.prenom;
    }
    setRelaisAuthorPrenom(prenom);
    setEditTask(null);
    autoTitleRef.current = CATEGORY_AUTO_TITLES.relais;
    setFTitle(autoTitleRef.current);
    setFCat("relais");
    setFPhotoUri(null); setFExistingPhoto(null);
    setClaimOnCreate(false);
    setClaimPrenom(""); setClaimNom(""); setClaimPin("");
    setFDateLimite(""); setFDLPickerOpen(true); setFUrgent(false); autoUrgentDateRef.current = null;
    setFDLCalMonth(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
    setFRelaisStartDate("");
    setFRelaisStartCalMonth(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
    setFRelaisVisibleTo("all"); setFRelaisSelectedKeys(new Set());
    const msg = `${prenom || "Un proche"} a besoin de souffler et sera indisponible pour s'occuper de ${patientFirstname || "la personne accompagnée"}. Peux-tu prendre le relais sur cette période ?`;
    autoRelaisMsgRef.current = msg;
    setFDesc(msg);
    loadRelaisCandidates();
    setTaskForm(true);
  }

  function openChecklistPicker() {
    if (capped) {
      Alert.alert(
        "Limite atteinte",
        "Vous avez atteint la limite de votre espace. Consultez l'email envoyé à votre adresse pour en savoir plus.",
      );
      return;
    }
    setChecklistPicker(true);
  }

  function openChecklistContext(ctx: ChecklistContext) {
    // Le picker, l'écran de sélection d'items et le wizard séquentiel
    // partagent désormais un seul <Modal> (voir plus bas) : passer de l'un à
    // l'autre n'est qu'un changement de state JS, sans dismiss/reopen d'un
    // Dialog natif Android — donc pas de setTimeout ici, contrairement à
    // openChecklistFromForm/openCustomChecklistModal qui basculent vers un
    // <Modal> réellement distinct.
    setChecklistPicker(false);
    const items = CHECKLIST_TEMPLATES[ctx].groups.flatMap((g) => g.items);
    const initial: Record<number, boolean> = {};
    items.forEach((_, i) => { initial[i] = true; });
    setChecklistChecked(initial);
    setChecklistCustomItems([]);
    setChecklistItemDraft("");
    setChecklistPublishToWall(true);
    setChecklistPublishToMine(false);
    setChecklistWizardList([]);
    setChecklistWizardStep(0);
    setChecklistWizardData({});
    setChecklistContext(ctx);
  }

  // Retour direct à la liste des checklists suggérées depuis n'importe quel
  // écran du flux (sélection d'items ou wizard séquentiel) — même Modal
  // unique que ci-dessus, changement de state JS pur.
  function returnToChecklistPicker() {
    setChecklistContext(null);
    setChecklistWizardList([]);
    setChecklistPicker(true);
  }

  function toggleChecklistItem(i: number) {
    setChecklistChecked((prev) => ({ ...prev, [i]: !prev[i] }));
  }

  function toggleAllChecklist(on: boolean) {
    if (!checklistContext) return;
    const items = CHECKLIST_TEMPLATES[checklistContext].groups.flatMap((g) => g.items);
    const next: Record<number, boolean> = {};
    items.forEach((_, i) => { next[i] = on; });
    setChecklistChecked(next);
  }

  function addChecklistCustomItem() {
    const title = checklistItemDraft.trim();
    if (!title) return;
    setChecklistCustomItems((prev) => [...prev, title]);
    setChecklistItemDraft("");
  }

  function removeChecklistCustomItem(i: number) {
    setChecklistCustomItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  // Auteur du lot à publier — admin (profil connecté) ou visiteur (session
  // PIN), même branchement que le reste d'Entraide (voir toggleClaimOnCreate).
  async function currentAuthor(): Promise<{ prenom: string; nom: string; pin: string }> {
    if (isAdmin) {
      const { data } = await supabase.auth.getUser();
      return {
        prenom: (data.user?.user_metadata?.firstname ?? "").trim(),
        nom: (data.user?.user_metadata?.lastname ?? "").trim(),
        pin: "ADMIN",
      };
    }
    if (mySession) return { prenom: mySession.prenom, nom: mySession.nom, pin: mySession.pin };
    return { prenom: "", nom: "", pin: "" };
  }

  // Cocher "Mur d'Entraide" ne bloque le titre déjà publié que si cette
  // destination est effectivement choisie — un import réservé à "Mes
  // Checklists" n'a pas à se soucier des doublons publics (même logique que
  // isDuplicateImportTitle dans MyChecklist.tsx).
  function findDuplicateAdminTaskIfWall(title: string): Task | undefined {
    return checklistPublishToWall ? findDuplicateAdminTask(title) : undefined;
  }

  // Au moins une destination doit rester cochée.
  function toggleChecklistPublishWall() {
    setChecklistPublishToWall((prev) => (prev && !checklistPublishToMine ? prev : !prev));
  }
  function toggleChecklistPublishMine() {
    setChecklistPublishToMine((prev) => (prev && !checklistPublishToWall ? prev : !prev));
  }

  // Fige la sélection en cours en liste d'assistant séquentiel et fait
  // passer le popup en mode "un item à la fois" (précision → échéance →
  // urgent) — voir ChecklistWizardEntry.
  function startChecklistWizard() {
    if (!checklistContext) return;
    const items = CHECKLIST_TEMPLATES[checklistContext].groups.flatMap((g) => g.items);
    const list: ChecklistWizardEntry[] = [
      ...items
        .map((item, i) => ({ key: String(i), item }))
        .filter(({ key, item }) => checklistChecked[Number(key)] && !findDuplicateAdminTaskIfWall(item.title)),
      ...checklistCustomItems
        .filter((title) => !findDuplicateAdminTaskIfWall(title))
        .map((title, idx) => ({ key: `custom-${idx}`, item: { title, description: "", sharedWithVisitors: true } as ChecklistItem })),
    ];
    if (!list.length) return;
    const data: Record<string, ChecklistWizardFields> = {};
    checklistWizardAutoUrgentRef.current = {};
    list.forEach(({ key, item }) => {
      const dateLimite = item.dateOffsetDays ? addDaysIso(item.dateOffsetDays) : "";
      // Les items publiés depuis ce wizard rejoignent le mur d'Entraide au
      // même titre qu'un besoin créé via "Publier" — même règle J+2 (voir
      // isUrgentWindow) que le formulaire de création classique.
      if (dateLimite && isUrgentWindow(dateLimite)) checklistWizardAutoUrgentRef.current[key] = dateLimite;
      data[key] = {
        dateLimite,
        urgent: !!item.urgent || (dateLimite ? isUrgentWindow(dateLimite) : false),
        detail: "",
      };
    });
    setChecklistWizardList(list);
    setChecklistWizardData(data);
    setChecklistWizardStep(0);
  }

  function updateChecklistWizardField(step: number, patch: Partial<ChecklistWizardFields>) {
    const key = checklistWizardList[step]?.key;
    if (!key) return;
    if (patch.dateLimite && checklistWizardAutoUrgentRef.current[key] !== patch.dateLimite) {
      checklistWizardAutoUrgentRef.current[key] = patch.dateLimite;
      if (isUrgentWindow(patch.dateLimite)) patch = { ...patch, urgent: true };
    }
    setChecklistWizardData((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? { dateLimite: "", urgent: false, detail: "" }), ...patch },
    }));
  }

  function checklistWizardNext() {
    if (checklistWizardStep < checklistWizardList.length - 1) {
      setChecklistWizardStep((s) => s + 1);
      return;
    }
    publishChecklistWizard();
  }

  function checklistWizardBack() {
    if (checklistWizardStep === 0) {
      // "Retour" au premier item renvoie directement à la liste des
      // checklists suggérées (checklistPicker), pas à l'écran de sélection
      // des items d'un contexte — cet écran intermédiaire est déjà validé en
      // passant "Suivant" pour arriver ici.
      returnToChecklistPicker();
      return;
    }
    setChecklistWizardStep((s) => s - 1);
  }

  async function publishChecklistWizard(data: Record<string, ChecklistWizardFields> = checklistWizardData) {
    if (!checklistWizardList.length || !checklistContext) return;
    if (!checklistPublishToWall && !checklistPublishToMine) return;
    setChecklistSaving(true);
    const author = await currentAuthor();

    // task_id par item — reste à null pour tous si le lot n'est pas publié
    // sur le Mur d'Entraide (checklistPublishToWall === false) : aucune
    // ligne tasks n'est créée, l'item n'existe alors que dans Mes Checklists.
    let taskIds: (string | null)[] = checklistWizardList.map(() => null);
    if (checklistPublishToWall) {
      const batchId = Crypto.randomUUID();
      const rows = checklistWizardList.map(({ key, item }) => {
        const fields = data[key] ?? { dateLimite: "", urgent: !!item.urgent, detail: "" };
        const detail = fields.detail.trim();
        const description = [detail ? `Précision : ${detail}` : "", checklistItemDescription(item)]
          .filter(Boolean)
          .join("\n\n");
        return {
          space_id: spaceId,
          title: item.title,
          description,
          category: item.category ?? "administratif",
          status: "ouvert" as const,
          created_by: isAdmin ? "admin" : "visiteur",
          author_prenom: author.prenom || null,
          author_nom: author.nom || null,
          author_pin: author.pin || null,
          date_limite: fields.dateLimite || null,
          urgent: fields.urgent,
          checklist_batch_id: batchId,
        };
      });
      const { data: inserted, error } = await supabase.from("tasks").insert(rows).select("id");
      if (error || !inserted) {
        setChecklistSaving(false);
        Alert.alert("Erreur", "Impossible d'ajouter la checklist : " + (error?.message ?? ""));
        return;
      }
      taskIds = inserted.map((row: { id: string }) => row.id);
    }

    if (checklistPublishToMine) {
      const personalRows = checklistWizardList.map(({ key, item }, idx) => {
        // personal_checklist_items n'a pas de colonne description : la
        // précision saisie va dans le titre si le lot n'est pas aussi publié
        // sur le Mur (sinon elle vit déjà dans tasks.description).
        const fields = data[key] ?? { dateLimite: "", urgent: !!item.urgent, detail: "" };
        const detail = !checklistPublishToWall ? fields.detail.trim() : "";
        return {
          space_id: spaceId,
          owner_prenom: author.prenom,
          owner_nom: author.nom,
          owner_pin: author.pin,
          title: detail ? `${item.title} — ${detail}` : item.title,
          status: "a_faire" as const,
          task_id: taskIds[idx],
          checklist_context: checklistContext,
          custom_checklist_name: null,
          date_limite: fields.dateLimite || null,
          urgent: fields.urgent,
        };
      });
      const pieceRows = checklistWizardList.flatMap(({ item }) =>
        (item.piecesRequises ?? []).map((piece) => ({
          space_id: spaceId,
          owner_prenom: author.prenom,
          owner_nom: author.nom,
          owner_pin: author.pin,
          title: piece,
          status: "a_faire" as const,
          task_id: null,
          checklist_context: checklistContext,
          custom_checklist_name: item.title,
          date_limite: null,
          urgent: false,
        })),
      );
      const { error: personalError } = await supabase
        .from("personal_checklist_items")
        .insert([...personalRows, ...pieceRows]);
      if (personalError) {
        setChecklistSaving(false);
        Alert.alert("Erreur", "Impossible d'ajouter à Mes Checklists : " + personalError.message);
        return;
      }
    }

    setChecklistSaving(false);
    setChecklistContext(null);
    setChecklistPicker(false);
    setChecklistCustomItems([]);
    setChecklistItemDraft("");
    setChecklistWizardList([]);
    setChecklistWizardStep(0);
    setChecklistWizardData({});
    // Un lot de checklist peut désormais couvrir plusieurs catégories — on ne
    // bascule l'onglet actif que si tous les items publiés partagent la même,
    // sinon on retombe sur "Tous" pour que le lot entier reste visible.
    const batchCategories = new Set(checklistWizardList.map(({ item }) => item.category ?? "administratif"));
    setActiveCat(batchCategories.size === 1 ? [...batchCategories][0] : null);
    if (checklistPublishToWall) {
      triggerBatchUndo(taskIds.filter((id): id is string => !!id), checklistWizardList.length);
    }
    loadTasks();
  }

  // Affiche un bandeau "Annuler" temporaire portant sur exactement les id
  // insérés d'un coup — partagé par la checklist admin dédiée (banner) et le
  // sélecteur repliable dans "Nouveau besoin" (publishInlineChecklist), pour
  // que l'admin comme le visiteur puissent rattraper une erreur de sélection.
  function triggerBatchUndo(ids: string[], count: number) {
    if (!ids.length) return;
    if (batchUndoTimer.current) clearTimeout(batchUndoTimer.current);
    setBatchUndo({ ids, count });
    batchUndoTimer.current = setTimeout(() => setBatchUndo(null), 8000);
  }

  async function undoBatch() {
    if (!batchUndo) return;
    const ids = batchUndo.ids;
    setBatchUndo(null);
    if (batchUndoTimer.current) clearTimeout(batchUndoTimer.current);
    const { error } = await supabase.from("tasks").delete().in("id", ids);
    if (error) {
      Alert.alert("Erreur", "Impossible d'annuler l'ajout : " + error.message);
      return;
    }
    showToast("Ajout annulé");
    loadTasks();
  }

  // Ouvre le popup de choix de checklist (checklistPicker) depuis le
  // formulaire "Nouveau besoin" (catégorie Administratif) — ferme d'abord
  // taskForm, comme claimDuplicate plus bas, pour ne jamais empiler deux
  // <Modal> sur Android.
  function openChecklistFromForm() {
    setTaskForm(false);
    setTimeout(() => openChecklistPicker(), 300);
  }

  // Ouvre le popup "Créer une nouvelle checklist" depuis le popup de choix —
  // même contrainte Android que ci-dessus : on ferme checklistPicker avant
  // de rouvrir customChecklistModal.
  function openCustomChecklistModal() {
    setChecklistPicker(false);
    setCustomChecklistName("");
    setCustomChecklistItems([]);
    setCustomChecklistItemDraft("");
    setTimeout(() => setCustomChecklistModal(true), 300);
  }

  function addCustomChecklistItem() {
    const title = customChecklistItemDraft.trim();
    if (!title) return;
    setCustomChecklistItems((prev) => [...prev, title]);
    setCustomChecklistItemDraft("");
  }

  // Alimente le catalogue "Produits récurrents" — insert en conflit (même
  // libellé déjà présent pour l'espace, voir l'index unique de la migration)
  // ignoré silencieusement : c'est un enrichissement, pas une opération
  // critique pour l'utilisateur.
  async function addToRecurringCatalog(label: string) {
    const clean = label.trim();
    if (!clean) return;
    await supabase.from("recurring_shopping_items").insert({ space_id: spaceId, label: clean });
  }

  function addFCourseItem() {
    const label = fCourseItemDraft.trim();
    if (!label) return;
    if (fCourseItems.some((it) => normalizeShoppingLabel(it) === normalizeShoppingLabel(label))) {
      showToast("Déjà dans la liste");
      setFCourseItemDraft("");
      return;
    }
    setFCourseItems((prev) => [...prev, label]);
    setFCourseItemDraft("");
    addToRecurringCatalog(label);
  }

  function removeFCourseItem(i: number) {
    setFCourseItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  // Ouvre le popup dédié "Créer une liste de courses" depuis le formulaire
  // "Nouveau besoin" (catégorie Courses) — même contrainte Android que
  // openChecklistFromForm : on ferme taskForm avant de rouvrir.
  function openCoursesListModal() {
    setTaskForm(false);
    setTimeout(() => setCoursesListModal(true), 300);
  }

  function closeCoursesListModal() {
    setCoursesListModal(false);
    setTimeout(() => setTaskForm(true), 300);
  }

  async function openRecurringItemsModal() {
    setCoursesListModal(false);
    setRecurringSelectMode(false);
    setRecurringSelected(new Set());
    setTimeout(() => {
      setRecurringItemsModal(true);
      setRecurringLoading(true);
      supabase
        .from("recurring_shopping_items")
        .select("id,label")
        .eq("space_id", spaceId)
        .order("label", { ascending: true })
        .then(({ data }) => {
          setRecurringItems((data ?? []) as { id: string; label: string }[]);
          setRecurringLoading(false);
        });
    }, 300);
  }

  function closeRecurringItemsModal() {
    setRecurringItemsModal(false);
    setTimeout(() => setCoursesListModal(true), 300);
  }

  function pickRecurringItem(label: string) {
    if (fCourseItems.some((it) => normalizeShoppingLabel(it) === normalizeShoppingLabel(label))) {
      showToast("Déjà dans la liste");
      return;
    }
    setFCourseItems((prev) => [...prev, label]);
  }

  function toggleRecurringSelected(id: string) {
    setRecurringSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // Réservé admin : "L'admin peut en supprimer 1 ou plusieurs en faisant un
  // clic prolongé sur un article de la liste des produits récurrents."
  function startRecurringSelect(id: string) {
    if (!isAdmin) return;
    setRecurringSelectMode(true);
    setRecurringSelected(new Set([id]));
  }

  async function deleteSelectedRecurringItems() {
    const ids = Array.from(recurringSelected);
    if (!ids.length) return;
    setRecurringItems((prev) => prev.filter((it) => !ids.includes(it.id)));
    setRecurringSelected(new Set());
    setRecurringSelectMode(false);
    await supabase.from("recurring_shopping_items").delete().in("id", ids);
  }

  function removeCustomChecklistItem(i: number) {
    setCustomChecklistItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  // Publie la checklist perso créée comme autant de besoins "administratif"
  // distincts du même lot (checklist_batch_id) — même logique d'auteur et de
  // dédoublonnage que publishChecklistWizard ; le nom donné à la checklist ne sert
  // qu'à la saisie, il n'existe pas de colonne dédiée sur "tasks" (regroupées
  // uniquement par checklist_batch_id, comme les checklists suggérées).
  async function confirmCreateCustomChecklist() {
    const items = customChecklistItems.filter((title) => !findDuplicateAdminTask(title));
    if (!customChecklistName.trim() || !items.length) return;
    setCustomChecklistSaving(true);
    const author = await currentAuthor();
    const batchId = Crypto.randomUUID();
    const rows = items.map((title) => ({
      space_id: spaceId,
      title,
      description: "",
      category: "administratif" as const,
      status: "ouvert" as const,
      created_by: isAdmin ? "admin" : "visiteur",
      author_prenom: author.prenom || null,
      author_nom: author.nom || null,
      author_pin: author.pin || null,
      date_limite: null,
      urgent: false,
      checklist_batch_id: batchId,
    }));
    const { data: inserted, error } = await supabase.from("tasks").insert(rows).select("id");
    setCustomChecklistSaving(false);
    if (error) {
      Alert.alert("Erreur", "Impossible de créer la checklist : " + error.message);
      return;
    }
    setCustomChecklistModal(false);
    setActiveCat("administratif");
    triggerBatchUndo(inserted?.map((r) => r.id) ?? [], items.length);
    loadTasks();
  }

  // Bascule "je m'en occupe déjà" à la création — reprend l'identité déjà
  // connue (profil admin ou session visiteur), même logique que NewsFeed et
  // Soutien : on ne redemande prénom/nom que si elle est vraiment inconnue.
  async function toggleClaimOnCreate() {
    const next = !claimOnCreate;
    setClaimOnCreate(next);
    if (!next) return;
    if (isAdmin) {
      const { data } = await supabase.auth.getUser();
      setClaimPrenom((data.user?.user_metadata?.firstname ?? "").trim());
      setClaimNom((data.user?.user_metadata?.lastname ?? "").trim());
      setClaimPin("ADMIN");
    } else {
      const s = await getVisitorSession();
      setClaimPrenom(s?.prenom ?? "");
      setClaimNom(s?.nom ?? "");
      setClaimPin(s?.pin ?? "");
    }
  }

  function openEditTask(t: Task) {
    setEditTask(t);
    setFTitle(t.title); setFDesc(t.description); setFCat(t.category);
    setFPhotoUri(null); setFExistingPhoto(t.photo);
    setFDateLimite(t.date_limite ?? ""); setFDLPickerOpen(!!t.date_limite); setFUrgent(t.urgent);
    if (t.date_limite) {
      const d = new Date(t.date_limite + "T12:00:00");
      setFDLCalMonth({ year: d.getFullYear(), month: d.getMonth() });
    }
    setTaskForm(true);
  }

  function applyPickedPhoto(uri: string) {
    if (pickerTarget === "task") { setFPhotoUri(uri); setFExistingPhoto(null); }
    else if (pickerTarget === "claim") setClaimPhotoUri(uri);
    else setDonePhotoUri(uri);
  }

  function setPickerPickingState(v: boolean) {
    if (pickerTarget === "task") setPickingPhoto(v);
    else if (pickerTarget === "claim") setClaimPickingPhoto(v);
    else setDonePickingPhoto(v);
  }

  async function pickPhotoFromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission refusée", "Autorise l'accès à la galerie dans les paramètres.");
      return;
    }
    setPickerPickingState(true);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    setPickerPickingState(false);
    if (!result.canceled && result.assets[0]) applyPickedPhoto(result.assets[0].uri);
  }

  async function pickPhotoFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission refusée", "Autorise l'accès à la caméra dans les paramètres.");
      return;
    }
    setPickerPickingState(true);
    const result = await ImagePicker.launchCameraAsync({ quality: 1 });
    setPickerPickingState(false);
    if (!result.canceled && result.assets[0]) applyPickedPhoto(result.assets[0].uri);
  }

  function choosePickerSource(fn: () => void) {
    setPickerVisible(false);
    fn();
  }

  function openTaskPhotoPicker() { setPickerTarget("task"); setPickerVisible(true); }
  function openClaimPhotoPicker() { setPickerTarget("claim"); setPickerVisible(true); }
  function openDonePhotoPicker() { setPickerTarget("done"); setPickerVisible(true); }

  function removeTaskPhoto() {
    setFPhotoUri(null);
    setFExistingPhoto(null);
  }

  const claimOnCreateReady = !claimOnCreate
    || (claimPrenom.trim() && claimNom.trim() && (isAdmin || claimPin.length >= 4));

  // Un besoin ne doit jamais être publié en double (titre identique, encore
  // ouvert) — que ce soit via le formulaire classique ou une checklist
  // suggérée. Les checklists suggérées couvrant désormais plusieurs
  // catégories (courses, repas, transport…), le dédoublonnage porte sur
  // toutes les catégories et non plus seulement "administratif". "fait" est
  // exclu du champ, même règle que la suppression (voir deleteTask).
  function findDuplicateAdminTask(title: string, excludeId?: string): Task | undefined {
    const norm = title.trim().toLowerCase();
    if (!norm) return undefined;
    // deleted_by_admin exclu : un besoin supprimé "en douceur" (voir
    // deleteOrSoftDeleteTasks) reste en base avec status inchangé pour que
    // son auteur garde le bandeau rouge — sans ce filtre, son titre restait
    // marqué "déjà ajouté" à vie dans les checklists suggérées.
    return tasks.find(
      (t) => t.status !== "fait" && !t.deleted_by_admin && t.id !== excludeId
        && t.title.trim().toLowerCase() === norm,
    );
  }

  // Garde "Ma Checklist" (components/MyChecklist.tsx) synchronisée quand le
  // statut d'un besoin lié change ailleurs que depuis Ma Checklist elle-même
  // (prise en charge, marquage "fait", réouverture admin) — tasks.status fait
  // foi, personal_checklist_items n'en est qu'un miroir pour les items
  // importés. No-op si personne n'a ce besoin dans sa checklist.
  async function syncPersonalChecklistStatus(taskId: string, status: "a_faire" | "fait") {
    await supabase.from("personal_checklist_items").update({ status }).eq("task_id", taskId);
  }

  // Actions proposées dans la popup de doublon (voir duplicateTarget) : soit
  // rejoindre le besoin existant (même flux que le bouton "Je m'en occupe"
  // habituel), soit en modifier la description plutôt que d'en recréer un
  // second — dans les deux cas on referme le formulaire de création en cours.
  // Le délai laisse le temps à la popup doublon (et au formulaire de
  // création) de se refermer avant d'en ouvrir une autre — les enchaîner dans
  // le même batch fait se chevaucher deux <Modal> natives sur Android, ce qui
  // rend tout illisible (même cause que le délai dans handleClaim).
  function claimDuplicate() {
    if (!duplicateTarget) return;
    const t = duplicateTarget;
    setDuplicateTarget(null);
    setTaskForm(false);
    setTimeout(() => openClaim(t), 300);
  }

  function openDuplicateModify() {
    if (!duplicateTarget) return;
    const t = duplicateTarget;
    setDuplicateTarget(null);
    setTaskForm(false);
    setTimeout(() => {
      setModifyTarget(t);
      setModifyDesc(t.description ?? "");
    }, 300);
  }

  // Modification de description ouverte à n'importe qui (visiteur ou admin),
  // contrairement à l'édition classique (openEditTask, admin uniquement) —
  // pose modified_at/modified_by_* pour l'affichage "Modifié le... par...,
  // visible par tous" sur le bloc du besoin (voir renderTask).
  async function saveModifyDesc() {
    if (!modifyTarget) return;
    setModifySaving(true);
    let editorPrenom = "", editorNom = "";
    if (isAdmin) {
      const { data } = await supabase.auth.getUser();
      editorPrenom = (data.user?.user_metadata?.firstname ?? "").trim();
      editorNom = (data.user?.user_metadata?.lastname ?? "").trim();
    } else if (mySession) {
      editorPrenom = mySession.prenom;
      editorNom = mySession.nom;
    }
    const { error } = await supabase.from("tasks").update({
      description: modifyDesc.trim(),
      modified_at: new Date().toISOString(),
      modified_by_prenom: editorPrenom || null,
      modified_by_nom: editorNom || null,
    }).eq("id", modifyTarget.id);
    setModifySaving(false);
    if (error) {
      Alert.alert("Erreur", "Impossible de modifier ce besoin : " + error.message);
      return;
    }
    setModifyTarget(null);
    showToast("Besoin modifié ✓");
    loadTasks();
  }

  async function saveTask() {
    if (!fTitle.trim() || (!editTask && !claimOnCreateReady)) return;
    if (!editTask && fCat === "transport" && !transportFormReady) return;
    if (!editTask && fCat === "relais" && !relaisFormReady) return;
    if (!editTask && fCat === "administratif") {
      const dup = findDuplicateAdminTask(fTitle);
      if (dup) { setDuplicateTarget(dup); return; }
    }
    setTaskSaving(true);

    let photoFilename = fExistingPhoto;
    if (fPhotoUri) {
      try {
        const compressed = await ImageManipulator.manipulateAsync(
          fPhotoUri,
          [{ resize: { width: 1080 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
        );
        const fileData = await new File(compressed.uri).arrayBuffer();
        const fname = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`;
        const { error } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(`${spaceId}/${fname}`, fileData, { contentType: "image/jpeg", cacheControl: "3600" });
        if (!error) photoFilename = fname;
        else Alert.alert("Photo non envoyée", "Le besoin sera enregistré sans la photo.");
      } catch {
        Alert.alert("Photo non envoyée", "Le besoin sera enregistré sans la photo.");
      }
    }

    if (editTask) {
      const removedFilename = editTask.photo && editTask.photo !== photoFilename ? editTask.photo : null;
      await supabase.from("tasks").update({
        title: fTitle.trim(), description: fDesc.trim(), category: fCat, photo: photoFilename,
        date_limite: fCat !== "transport" && fDateLimite ? fDateLimite : null,
        urgent: fUrgent,
      }).eq("id", editTask.id);
      if (removedFilename) {
        await supabase.storage.from(PHOTO_BUCKET).remove([`${spaceId}/${removedFilename}`]);
      }
      showToast("Besoin modifié ✓");
    } else {
      // Identité de l'auteur — utile pour toutes les catégories (section
      // "Mes besoins publiés" de Mon compte), pas seulement Transport où
      // elle servait jusqu'ici à autoriser la validation d'une proposition.
      let authorPrenom = "", authorNom = "", authorPin = "";
      if (isAdmin) {
        const { data } = await supabase.auth.getUser();
        authorPrenom = (data.user?.user_metadata?.firstname ?? "").trim();
        authorNom = (data.user?.user_metadata?.lastname ?? "").trim();
        authorPin = "ADMIN";
      } else if (mySession) {
        authorPrenom = mySession.prenom;
        authorNom = mySession.nom;
        authorPin = mySession.pin;
      }
      let transportFields: Record<string, unknown> = {};
      if (fCat === "transport") {
        const homeAddr = fTHomeAddress.trim();
        const careAddr = hospitalName ?? "";
        transportFields = {
          transport_date: fTDate,
          transport_out_time: fTOutTime,
          transport_return_time: fTRoundTrip ? fTReturnTime : null,
          transport_round_trip: fTRoundTrip,
          transport_flexible: fTFlexible,
          transport_from: fTSwapped ? careAddr : homeAddr,
          transport_to: fTSwapped ? homeAddr : careAddr,
          transport_home_postal_code: fTHomePostalCode.trim() || null,
          transport_home_city: fTHomeCity.trim() || null,
          transport_home_country: fTHomeCountry.trim() || null,
          transport_home_is_arrival: fTSwapped,
          transport_for_prenom: fTForSomeoneElse ? fTForPrenom.trim() : null,
          transport_for_nom: fTForSomeoneElse ? fTForNom.trim() : null,
        };
      }
      let relaisFields: Record<string, unknown> = {};
      if (fCat === "relais") {
        relaisFields = {
          relais_start_date: fRelaisStartDate,
          relais_visible_to: fRelaisVisibleTo,
          relais_recipients: fRelaisVisibleTo === "some"
            ? fRelaisCandidates.filter((c) => fRelaisSelectedKeys.has(relaisIdentityKey(c.prenom, c.nom)))
            : null,
        };
      }
      const { data: insertedTask, error: insertError } = await supabase.from("tasks").insert({
        space_id: spaceId,
        title: fTitle.trim(),
        description: fDesc.trim(),
        category: fCat,
        status: claimOnCreate ? "pris_en_charge" : "ouvert",
        created_by: isAdmin ? "admin" : "visiteur",
        photo: photoFilename,
        author_prenom: authorPrenom || null,
        author_nom: authorNom || null,
        author_pin: authorPin || null,
        date_limite: fCat !== "transport" && fDateLimite ? fDateLimite : null,
        urgent: fUrgent,
        ...transportFields,
        ...relaisFields,
        ...(claimOnCreate ? {
          claimed_by_prenom: claimPrenom.trim(),
          claimed_by_nom: claimNom.trim(),
          claimed_by_pin: claimPin,
          ...(fCat === "transport" ? {
            transport_confirmed_date: fTDate,
            transport_confirmed_out_time: fTOutTime,
            transport_confirmed_return_time: fTRoundTrip ? fTReturnTime : null,
          } : {}),
        } : {}),
      }).select("id").single();
      if (insertError) {
        Alert.alert("Erreur", "Impossible de créer le besoin : " + insertError.message);
        setTaskSaving(false);
        return;
      }
      if (fCat === "courses" && fCourseItems.length && insertedTask) {
        await supabase.from("shopping_list_items").insert(
          fCourseItems.map((label, position) => ({ task_id: insertedTask.id, label, position })),
        );
      }
      if (claimOnCreate && !isAdmin) await rememberAuthorPin(claimPrenom.trim(), claimNom.trim(), claimPin);
      showToast(claimOnCreate ? "Besoin créé — tu t'en occupes déjà ✓" : "Besoin créé ✓");
    }
    setTaskSaving(false);
    setTaskForm(false);
    loadTasks();
  }

  function deleteTask(t: Task) {
    if (t.status === "fait") return;
    setDeleteTaskTarget(t);
  }

  // Supprime réellement les besoins publiés par l'admin lui-même
  // (author_pin === "ADMIN"), et marque juste deleted_by_admin sur les
  // autres — ils restent visibles pour leur auteur avec un bandeau rouge.
  // Utilisé par les 3 flux de suppression (unitaire, lot checklist, sélection
  // multiple), qui peuvent chacun mélanger les deux cas.
  // "mine" = l'auteur du besoin est la session courante (admin qui a publié
  // lui-même, ou visiteur qui supprime son propre besoin) → suppression
  // définitive immédiate. "others" = l'admin supprime le besoin de
  // quelqu'un d'autre → suppression "en douceur" (deleted_by_admin) pour que
  // son auteur garde le bandeau rouge et puisse finaliser lui-même (voir
  // confirmSelfDeleteTask). Retourne les personal_checklist_items encore
  // liées aux besoins supprimés en dur : cette recherche doit impérativement
  // se faire AVANT le .delete() sur tasks, car la contrainte FK "on delete
  // set null" (voir supabase/migrations/20260717_personal_checklist_items.sql)
  // remettrait sinon task_id à null avant qu'on ait pu la lire.
  async function deleteOrSoftDeleteTasks(list: Task[]): Promise<{ error?: string; linkedPersonalItemIds: string[] }> {
    const isMine = (t: Task) => (isAdmin ? t.author_pin === "ADMIN" : isAuthor(t));
    const mine = list.filter(isMine);
    const others = list.filter((t) => !isMine(t));

    let linkedPersonalItemIds: string[] = [];
    if (mine.length) {
      const mineIds = mine.map((t) => t.id);
      const { data: linked } = await supabase.from("personal_checklist_items").select("id").in("task_id", mineIds);
      if (linked && linked.length) linkedPersonalItemIds = linked.map((r) => r.id);
      const toRemove = mine.flatMap((t) => [t.photo, t.claimed_photo].filter((f): f is string => !!f));
      if (toRemove.length) await supabase.storage.from(PHOTO_BUCKET).remove(toRemove.map((f) => `${spaceId}/${f}`));
      const { error } = await supabase.from("tasks").delete().in("id", mineIds);
      if (error) return { error: error.message, linkedPersonalItemIds: [] };
    }
    if (others.length) {
      const { error } = await supabase.from("tasks").update({ deleted_by_admin: true }).in("id", others.map((t) => t.id));
      if (error) return { error: error.message, linkedPersonalItemIds: [] };
    }
    return { linkedPersonalItemIds };
  }

  async function confirmDeleteLinkedPersonal() {
    if (!deleteLinkedPersonalTarget) return;
    setDeleteLinkedPersonalSaving(true);
    await supabase.from("personal_checklist_items").delete().in("id", deleteLinkedPersonalTarget);
    setDeleteLinkedPersonalSaving(false);
    setDeleteLinkedPersonalTarget(null);
  }

  // Un besoin supprimé peut déclencher DEUX popups de suivi (reste de la
  // checklist groupée + item lié dans Mes Checklists) : chacun est un
  // <ConfirmModal> = un <Modal> RN distinct, donc les ouvrir tous les deux
  // dans le même rendu (même juste après avoir fermé le popup de
  // suppression) reproduit la même course Android qu'entre checklistPicker/
  // Context/Wizard — celui ouvert "en même temps" que l'autre devient
  // injoignable. On les enchaîne : le popup "reste de la liste" passe
  // d'abord (délai après la fermeture du popup de suppression), celui des
  // items liés attend sa fermeture (voir closeDeleteBatch) avant de
  // s'ouvrir à son tour, toujours avec un délai.
  const pendingLinkedAfterBatch = useRef<string[] | null>(null);

  function queueDeleteFollowups(batch: { batchId: string; siblings: Task[] } | null, linkedIds: string[]) {
    if (batch) {
      pendingLinkedAfterBatch.current = linkedIds.length ? linkedIds : null;
      setTimeout(() => setDeleteBatchTarget(batch), 300);
    } else if (linkedIds.length) {
      setTimeout(() => setDeleteLinkedPersonalTarget(linkedIds), 300);
    }
  }

  function closeDeleteBatch() {
    setDeleteBatchTarget(null);
    const pending = pendingLinkedAfterBatch.current;
    pendingLinkedAfterBatch.current = null;
    if (pending) setTimeout(() => setDeleteLinkedPersonalTarget(pending), 300);
  }

  async function confirmDeleteTask() {
    if (!deleteTaskTarget) return;
    const t = deleteTaskTarget;
    setDeleteTaskSaving(true);
    const { error, linkedPersonalItemIds } = await deleteOrSoftDeleteTasks([t]);
    setDeleteTaskSaving(false);
    setDeleteTaskTarget(null);
    if (error) {
      Alert.alert("Erreur", "Impossible de supprimer ce besoin : " + error);
      return;
    }
    showToast("Besoin supprimé");
    // S'il reste d'autres items ouverts de la même checklist groupée,
    // proposer de les supprimer aussi (voir triggerBatchUndo : le bandeau
    // "Annuler" ne dure que 8s, insuffisant pour un ménage fait plus tard).
    const siblings = t.checklist_batch_id
      ? tasks.filter((x) => x.checklist_batch_id === t.checklist_batch_id && x.id !== t.id && x.status !== "fait")
      : [];
    queueDeleteFollowups(siblings.length ? { batchId: t.checklist_batch_id!, siblings } : null, linkedPersonalItemIds);
    loadTasks();
  }

  async function confirmDeleteBatch() {
    if (!deleteBatchTarget) return;
    const siblings = deleteBatchTarget.siblings;
    setDeleteBatchSaving(true);
    const { error, linkedPersonalItemIds } = await deleteOrSoftDeleteTasks(siblings);
    setDeleteBatchSaving(false);
    setDeleteBatchTarget(null);
    if (error) {
      Alert.alert("Erreur", "Impossible de supprimer la liste : " + error);
      return;
    }
    showToast("Liste supprimée");
    const pending = pendingLinkedAfterBatch.current;
    pendingLinkedAfterBatch.current = null;
    const allLinked = [...(pending ?? []), ...linkedPersonalItemIds];
    if (allLinked.length) setTimeout(() => setDeleteLinkedPersonalTarget(allLinked), 300);
    loadTasks();
  }

  async function confirmSelfDeleteTask() {
    if (!selfDeleteTaskTarget) return;
    const t = selfDeleteTaskTarget;
    setSelfDeleteTaskSaving(true);
    // Même contrainte que dans deleteOrSoftDeleteTasks : lire les
    // personal_checklist_items liées AVANT le .delete(), car la FK "on
    // delete set null" viderait sinon task_id avant qu'on ait pu le lire.
    const { data: linked } = await supabase.from("personal_checklist_items").select("id").eq("task_id", t.id);
    const toRemove = [t.photo, t.claimed_photo].filter((f): f is string => !!f);
    if (toRemove.length) await supabase.storage.from(PHOTO_BUCKET).remove(toRemove.map((f) => `${spaceId}/${f}`));
    const { error } = await supabase.from("tasks").delete().eq("id", t.id);
    setSelfDeleteTaskSaving(false);
    setSelfDeleteTaskTarget(null);
    if (error) {
      Alert.alert("Erreur", "Impossible de supprimer ce besoin : " + error.message);
      return;
    }
    showToast("Besoin supprimé définitivement");
    if (linked && linked.length) {
      const ids = linked.map((r) => r.id);
      setTimeout(() => setDeleteLinkedPersonalTarget(ids), 300);
    }
    loadTasks();
  }

  function enterSelection(id: string) {
    setSelectedTaskIds(new Set([id]));
  }

  function toggleTaskSelected(id: string) {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function exitSelection() {
    setSelectedTaskIds(new Set());
  }

  async function confirmBulkDelete() {
    const selected = tasks.filter((t) => selectedTaskIds.has(t.id));
    if (!selected.length) return;
    setBulkDeleteSaving(true);
    const { error, linkedPersonalItemIds } = await deleteOrSoftDeleteTasks(selected);
    setBulkDeleteSaving(false);
    setBulkDeleteConfirm(false);
    if (error) {
      Alert.alert("Erreur", "Impossible de supprimer la sélection : " + error);
      return;
    }
    showToast(`${selected.length} besoin${selected.length > 1 ? "s" : ""} supprimé${selected.length > 1 ? "s" : ""}`);
    exitSelection();
    // Même logique que confirmDeleteTask : s'il reste d'autres items ouverts
    // des checklists groupées touchées par la sélection, proposer de les
    // supprimer aussi (un seul popup pour toutes les checklists concernées).
    const batchIds = new Set(selected.map((t) => t.checklist_batch_id).filter((id): id is string => !!id));
    const selectedIds = new Set(selected.map((t) => t.id));
    const siblings = batchIds.size
      ? tasks.filter(
          (x) => x.checklist_batch_id && batchIds.has(x.checklist_batch_id) && !selectedIds.has(x.id) && x.status !== "fait",
        )
      : [];
    queueDeleteFollowups(siblings.length ? { batchId: [...batchIds][0], siblings } : null, linkedPersonalItemIds);
    loadTasks();
  }

  async function adminSetStatus(t: Task, status: TaskStatus) {
    if (status === "ouvert" && t.done_photo) {
      await supabase.storage.from(PHOTO_BUCKET).remove([`${spaceId}/${t.done_photo}`]);
    }
    await supabase.from("tasks").update({
      status,
      ...(status === "ouvert" ? { done_photo: null } : {}),
    }).eq("id", t.id);
    if (status === "ouvert") await syncPersonalChecklistStatus(t.id, "a_faire");
    loadTasks();
  }

  // Marquer un besoin "Fait", avec une photo optionnelle (ex: preuve du
  // repas livré). Accessible à l'admin directement, et au preneur via PIN.
  async function openDone(task: Task) {
    setDoneTarget(task);
    setDonePhotoUri(null);
    setDonePin("");
    setDonePinError(false);
    setDonePinVerified(
      !isAdmin && ((await sessionPinMatches(task.claimed_by_pin, { prenom: task.claimed_by_prenom, nom: task.claimed_by_nom }))
        || (await sessionPinMatches(task.transport_return_claimed_by_pin, { prenom: task.transport_return_claimed_by_prenom, nom: task.transport_return_claimed_by_nom }))),
    );
  }

  function removeDonePhoto() {
    setDonePhotoUri(null);
  }

  async function confirmDone() {
    if (!doneTarget) return;
    if (!isAdmin && !donePinVerified && donePin !== doneTarget.claimed_by_pin && donePin !== doneTarget.transport_return_claimed_by_pin) {
      setDonePinError(true);
      setDonePin("");
      return;
    }
    setDoneSaving(true);

    let doneFilename: string | null = null;
    if (donePhotoUri) {
      try {
        const compressed = await ImageManipulator.manipulateAsync(
          donePhotoUri,
          [{ resize: { width: 1080 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
        );
        const fileData = await new File(compressed.uri).arrayBuffer();
        const fname = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`;
        const { error } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(`${spaceId}/${fname}`, fileData, { contentType: "image/jpeg", cacheControl: "3600" });
        if (!error) doneFilename = fname;
        else Alert.alert("Photo non envoyée", "Le besoin sera marqué fait sans la photo.");
      } catch {
        Alert.alert("Photo non envoyée", "Le besoin sera marqué fait sans la photo.");
      }
    }

    const { error: updateError } = await supabase.from("tasks").update({ status: "fait", done_photo: doneFilename }).eq("id", doneTarget.id);
    if (updateError) {
      Alert.alert("Erreur", "Impossible de marquer ce besoin comme fait : " + updateError.message);
      setDoneSaving(false);
      return;
    }
    await syncPersonalChecklistStatus(doneTarget.id, "fait");
    setDoneSaving(false);
    setDoneTarget(null);
    showToast("Marqué comme fait ✓");
    loadTasks();
  }

  async function openClaim(t: Task) {
    setClaimTarget(t);
    setClaimPrenom(""); setClaimNom(""); setClaimPin(""); setClaimPhotoUri(null); setClaimText("");
    // Prénom/nom/PIN ne sont plus jamais ressaisis ici : repris de la session
    // visiteur (PIN choisi dès la connexion) ou du profil admin — le champ
    // PIN n'est donc plus affiché dans ce formulaire.
    if (isAdmin) {
      const { data } = await supabase.auth.getUser();
      setClaimPrenom((data.user?.user_metadata?.firstname ?? "").trim());
      setClaimNom((data.user?.user_metadata?.lastname ?? "").trim());
      setClaimPin("ADMIN");
    } else {
      const s = await getVisitorSession();
      if (s) { setClaimPrenom(s.prenom); setClaimNom(s.nom); setClaimPin(s.pin ?? ""); }
    }
    if (t.category === "relais") {
      setRelaisClaimStep("choice");
      setRelaisClaimRanges([]);
      setRelaisClaimFullPeriod(false);
      setRelaisClaimPeriodStart(""); setRelaisClaimPeriodEnd("");
      const d = new Date();
      setRelaisClaimStartCalMonth({ year: d.getFullYear(), month: d.getMonth() });
      setRelaisClaimEndCalMonth({ year: d.getFullYear(), month: d.getMonth() });
    } else {
      setRelaisClaimStep(null);
    }
  }

  // "Je m'en charge (le reste)" — pré-remplit les trous restants plutôt que
  // toute la période d'origine, pour ne jamais chevaucher un contributeur déjà
  // inscrit (voir lib/relaisCoverage.ts, computeRelaisGaps).
  function chooseRelaisFull() {
    if (!claimTarget?.relais_start_date || !claimTarget.date_limite) return;
    setRelaisClaimRanges(computeRelaisGaps(relaisCoverage[claimTarget.id] ?? [], claimTarget.relais_start_date, claimTarget.date_limite));
    setRelaisClaimFullPeriod(true);
    setRelaisClaimStep("ready");
  }

  // Ouvre le popup "Du" directement sur le mois de la période demandée par
  // l'admin (relais_start_date), pas sur le mois courant — sinon l'utilisateur
  // doit naviguer à l'aveugle jusqu'au bon mois avant de pouvoir sélectionner
  // quoi que ce soit (tout le reste du calendrier est grisé/non cliquable,
  // voir allowedRange sur MiniCalendar).
  function chooseRelaisPeriod() {
    if (claimTarget?.relais_start_date) {
      const d = new Date(claimTarget.relais_start_date + "T12:00:00");
      setRelaisClaimStartCalMonth({ year: d.getFullYear(), month: d.getMonth() });
    }
    setRelaisClaimPeriodStart("");
    setRelaisClaimPeriodEnd("");
    setRelaisClaimStep("period_start");
  }

  // Enchaîne sur le popup "Au", ouvert sur le mois de la date "Du" qui vient
  // d'être choisie (plutôt que le mois courant).
  function confirmRelaisPeriodStart() {
    if (!relaisClaimPeriodStart) return;
    const d = new Date(relaisClaimPeriodStart + "T12:00:00");
    setRelaisClaimEndCalMonth({ year: d.getFullYear(), month: d.getMonth() });
    setRelaisClaimStep("period_end");
  }

  function confirmRelaisPeriod() {
    if (!relaisClaimPeriodValid) return;
    setRelaisClaimRanges([{ start_date: relaisClaimPeriodStart, end_date: relaisClaimPeriodEnd }]);
    setRelaisClaimFullPeriod(false);
    setRelaisClaimStep("ready");
  }

  function removeClaimPhoto() {
    setClaimPhotoUri(null);
  }

  async function handleClaim() {
    if (!claimTarget || !claimPrenom.trim() || !claimNom.trim() || claimPin.length < 4) return;
    setClaimSaving(true);

    let claimedPhotoFilename: string | null = null;
    if (claimPhotoUri) {
      try {
        const compressed = await ImageManipulator.manipulateAsync(
          claimPhotoUri,
          [{ resize: { width: 1080 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
        );
        const fileData = await new File(compressed.uri).arrayBuffer();
        const fname = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`;
        const { error } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(`${spaceId}/${fname}`, fileData, { contentType: "image/jpeg", cacheControl: "3600" });
        if (!error) claimedPhotoFilename = fname;
        else Alert.alert("Photo non envoyée", "Tu peux quand même confirmer sans la photo.");
      } catch {
        Alert.alert("Photo non envoyée", "Tu peux quand même confirmer sans la photo.");
      }
    }

    if (claimTarget.category === "relais") {
      // task_relais_coverage est la seule source de vérité des preneurs d'un
      // besoin relais — tasks.claimed_by_* n'est jamais écrit ici, plusieurs
      // personnes pouvant chacune couvrir une sous-période distincte.
      const rows = relaisClaimRanges.map((r) => ({
        task_id: claimTarget.id,
        prenom: claimPrenom.trim(),
        nom: claimNom.trim(),
        pin: claimPin,
        start_date: r.start_date,
        end_date: r.end_date,
        full_period: relaisClaimFullPeriod,
        claimed_text: claimText.trim() || null,
        claimed_photo: claimedPhotoFilename,
      }));
      if (rows.length) {
        await supabase.from("task_relais_coverage").insert(rows);
      }
      const newCoverage = [...(relaisCoverage[claimTarget.id] ?? []), ...rows];
      if (
        claimTarget.relais_start_date && claimTarget.date_limite
        && isRelaisFullyCovered(newCoverage, claimTarget.relais_start_date, claimTarget.date_limite)
      ) {
        await supabase.from("tasks").update({ status: "pris_en_charge" }).eq("id", claimTarget.id);
      }
    } else {
      await supabase.from("tasks").update({
        status: "pris_en_charge",
        claimed_by_prenom: claimPrenom.trim(),
        claimed_by_nom: claimNom.trim(),
        claimed_by_pin: claimPin,
        claimed_photo: claimedPhotoFilename,
        claimed_text: claimText.trim() || null,
        ...(claimTarget.category === "transport" ? {
          transport_confirmed_date: claimTarget.transport_date,
          transport_confirmed_out_time: claimTarget.transport_out_time,
          transport_confirmed_return_time: claimTarget.transport_return_time,
        } : {}),
      }).eq("id", claimTarget.id);
    }
    // "Je m'en occupe" sur un besoin issu d'une checklist l'ajoute aussi à
    // "Ma Checklist" du preneur — même objet, visible des deux côtés. Basé
    // sur checklist_batch_id (posé sur tout item publié via une checklist,
    // suggérée ou perso) plutôt que sur category, qui ne vaut plus toujours
    // "administratif" depuis que les checklists suggérées couvrent aussi
    // courses/repas/transport/affaires/autre.
    if (claimTarget.checklist_batch_id) {
      // Un item importé depuis "Ma Checklist" (checklist privée publiée sur
      // le Mur) crée déjà sa propre ligne personal_checklist_items côté
      // importateur — si c'est aussi lui qui prend en charge ici (même PIN),
      // éviter un doublon visuel dans sa checklist personnelle.
      const { data: existing } = await supabase.from("personal_checklist_items")
        .select("id")
        .eq("task_id", claimTarget.id)
        .eq("owner_pin", claimPin)
        .maybeSingle();
      if (!existing) {
        await supabase.from("personal_checklist_items").insert({
          space_id: spaceId,
          owner_prenom: claimPrenom.trim(),
          owner_nom: claimNom.trim(),
          owner_pin: claimPin,
          title: claimTarget.title,
          status: "a_faire",
          task_id: claimTarget.id,
          checklist_context: findTemplateContextForTitle(claimTarget.title),
        });
      }
    }
    setClaimSaving(false);
    if (!isAdmin) {
      await rememberAuthorPin(claimPrenom.trim(), claimNom.trim(), claimPin);
      // mySession n'est lu qu'au montage — sans ça, isMine() resterait faux
      // juste après cette prise en charge (PIN inédit sur ce téléphone) et
      // masquerait "C'est fait"/"Ajouter au calendrier".
      setMySession({ prenom: claimPrenom.trim(), nom: claimNom.trim(), pin: claimPin });
    }
    // claimTarget et thanksModal pilotent la même <Modal> fusionnée (voir plus
    // bas) : passer de l'un à l'autre dans le même batch ne rouvre jamais de
    // fenêtre native, donc pas de setTimeout nécessaire ici.
    setThanksModalCategory(claimTarget.category);
    setClaimTarget(null);
    setRelaisClaimStep(null);
    setThanksModal(true);
    loadTasks();
  }

  // Se désinscrire d'un besoin Transport aller-retour ne libère que la
  // jambe de la personne qui se désinscrit quand aller et retour ont été
  // attribués séparément — l'autre jambe (et son preneur) reste intacte.
  // Sinon (besoin simple, ou même personne sur les deux jambes), tout est
  // libéré d'un coup comme avant.
  async function performUnclaim(task: Task, leg: "out" | "return" = "out") {
    const splitLegs = task.transport_round_trip && !!task.transport_return_claimed_by_prenom;
    if (splitLegs && leg === "return") {
      await supabase.from("tasks").update({
        status: "ouvert",
        transport_return_claimed_by_prenom: null,
        transport_return_claimed_by_nom: null,
        transport_return_claimed_by_pin: null,
        transport_confirmed_return_time: null,
      }).eq("id", task.id);
    } else if (splitLegs && leg === "out") {
      if (task.claimed_photo) {
        await supabase.storage.from(PHOTO_BUCKET).remove([`${spaceId}/${task.claimed_photo}`]);
      }
      await supabase.from("tasks").update({
        status: "ouvert",
        claimed_by_prenom: null,
        claimed_by_nom: null,
        claimed_by_pin: null,
        claimed_photo: null,
        claimed_text: null,
        transport_confirmed_out_time: null,
      }).eq("id", task.id);
    } else {
      if (task.claimed_photo) {
        await supabase.storage.from(PHOTO_BUCKET).remove([`${spaceId}/${task.claimed_photo}`]);
      }
      await supabase.from("tasks").update({
        status: "ouvert",
        claimed_by_prenom: null,
        claimed_by_nom: null,
        claimed_by_pin: null,
        claimed_photo: null,
        claimed_text: null,
        ...(task.category === "transport" ? {
          transport_confirmed_date: null,
          transport_confirmed_out_time: null,
          transport_confirmed_return_time: null,
        } : {}),
      }).eq("id", task.id);
      // Se désinscrire retire aussi le besoin de "Ma Checklist" du preneur —
      // il n'est plus le sien, un autre item (créé par un autre propriétaire)
      // reste intact si jamais il en existe un pour ce même task_id. Même
      // signal checklist_batch_id qu'à la prise en charge (voir performClaim).
      if (task.checklist_batch_id && task.claimed_by_pin) {
        await supabase.from("personal_checklist_items").delete()
          .eq("task_id", task.id)
          .eq("owner_pin", task.claimed_by_pin)
          .eq("owner_prenom", task.claimed_by_prenom ?? "")
          .eq("owner_nom", task.claimed_by_nom ?? "");
      }
    }
    showToast("Tu t'es désinscrit ✓");
    loadTasks();
  }

  // Désinscription d'UN contributeur d'un besoin relais — supprime uniquement
  // sa ligne task_relais_coverage (les autres restent intactes) et rouvre le
  // besoin si la période n'est plus intégralement couverte sans lui.
  async function performRelaisCoverageUnclaim(task: Task, coverage: TaskRelaisCoverage) {
    await supabase.from("task_relais_coverage").delete().eq("id", coverage.id);
    if (task.status === "pris_en_charge" && task.relais_start_date && task.date_limite) {
      const remaining = (relaisCoverage[task.id] ?? []).filter((c) => c.id !== coverage.id);
      if (!isRelaisFullyCovered(remaining, task.relais_start_date, task.date_limite)) {
        await supabase.from("tasks").update({ status: "ouvert" }).eq("id", task.id);
      }
    }
    showToast("Tu t'es désinscrit ✓");
    loadTasks();
  }

  async function openPinModal(task: Task, action: "unclaim", leg: "out" | "return" = "out") {
    const legPin = leg === "return" ? task.transport_return_claimed_by_pin : task.claimed_by_pin;
    const legAuthor = leg === "return"
      ? { prenom: task.transport_return_claimed_by_prenom, nom: task.transport_return_claimed_by_nom }
      : { prenom: task.claimed_by_prenom, nom: task.claimed_by_nom };
    if (!isAdmin && (await sessionPinMatches(legPin, legAuthor))) {
      setUnclaimConfirm({ task, leg });
      return;
    }
    setPinModal({ task, action, leg });
    setPinEntry(""); setPinError(false);
  }

  async function openRelaisCoverageUnclaim(task: Task, coverage: TaskRelaisCoverage) {
    if (!isAdmin && (await sessionPinMatches(coverage.pin, { prenom: coverage.prenom, nom: coverage.nom }))) {
      setUnclaimConfirm({ task, coverage });
      return;
    }
    setPinModal({ task, action: "unclaim_relais", coverage });
    setPinEntry(""); setPinError(false);
  }

  async function confirmUnclaimSelf() {
    if (!unclaimConfirm) return;
    const { task } = unclaimConfirm;
    if ("coverage" in unclaimConfirm) {
      setUnclaimConfirm(null);
      await performRelaisCoverageUnclaim(task, unclaimConfirm.coverage);
      return;
    }
    const { leg } = unclaimConfirm;
    setUnclaimConfirm(null);
    await performUnclaim(task, leg);
  }

  async function confirmDesengageEdit() {
    if (!desengageEditTarget) return;
    const target = desengageEditTarget;
    setDesengageEditTarget(null);
    await performUnclaim(target);
    setTaskForm(false);
  }

  async function checkPin() {
    if (!pinModal) return;
    if (pinModal.action === "unclaim_relais") {
      if (pinEntry === pinModal.coverage.pin) {
        const { task, coverage } = pinModal;
        setPinModal(null);
        await performRelaisCoverageUnclaim(task, coverage);
      } else {
        setPinError(true);
        setPinEntry("");
      }
      return;
    }
    const legPin = pinModal.leg === "return" ? pinModal.task.transport_return_claimed_by_pin : pinModal.task.claimed_by_pin;
    if (pinEntry === legPin) {
      const { task, leg } = pinModal;
      setPinModal(null);
      await performUnclaim(task, leg);
    } else {
      setPinError(true);
      setPinEntry("");
    }
  }

  // ── Négociation d'horaire Transport ──────────────────────────────────
  // Un besoin "pris en charge" dont l'horaire confirmé (aller, ou retour
  // s'il y en a un) est déjà passé bascule visuellement en "Fait" — sans
  // toucher au statut réel en base, pour que "C'est fait"/"Marquer fait"
  // reste possible ensuite si personne ne l'a cliqué.
  function transportOverdue(t: Task): boolean {
    if (t.category !== "transport" || t.status !== "pris_en_charge" || !t.transport_confirmed_date) return false;
    const time = t.transport_confirmed_return_time || t.transport_confirmed_out_time || "23:59";
    return new Date(`${t.transport_confirmed_date}T${time}:00`) < new Date();
  }

  // Besoin jamais pris en charge (status toujours "ouvert") et dont la date
  // demandée est déjà passée — fermé automatiquement (voir l'effet plus
  // haut) pour ne pas rester affiché indéfiniment comme "en attente de
  // réponse". Transport a sa propre date/heure structurée ; les autres
  // catégories utilisent l'échéance générique optionnelle (date_limite) —
  // absente = jamais fermé automatiquement pour ce besoin.
  function taskOverdueUnclaimed(t: Task): boolean {
    if (t.status !== "ouvert") return false;
    if (t.category === "transport") {
      const date = t.transport_confirmed_date || t.transport_date;
      if (!date) return false;
      const time = t.transport_confirmed_return_time || t.transport_return_time
        || t.transport_confirmed_out_time || t.transport_out_time || "23:59";
      return new Date(`${date}T${time}:00`) < new Date();
    }
    if (!t.date_limite) return false;
    return new Date(`${t.date_limite}T23:59:59`) < new Date();
  }

  // Date "utile" d'un besoin pour le tri temporel du mur — Transport a sa
  // propre date structurée (confirmée si elle existe, sinon la date
  // demandée), un relais se rattache à son début de période, les autres
  // catégories à l'échéance générique optionnelle. null = aucune date
  // connue (besoin sans échéance), traité comme "le plus loin dans le
  // temps" plutôt que comme "le plus proche" (voir compareSoonestFirst).
  function taskEffectiveDate(t: Task): string | null {
    if (t.category === "transport") return t.transport_confirmed_date || t.transport_date;
    if (t.category === "relais") return t.relais_start_date || t.date_limite;
    return t.date_limite;
  }

  // Plus proche → plus éloigné dans le temps ; un besoin sans date connue
  // passe toujours après ceux qui en ont une (on ne peut pas juger de sa
  // proximité), les besoins sans date entre eux gardent l'ordre de création
  // le plus récent en premier (comportement historique du mur).
  function compareSoonestFirst(a: Task, b: Task): number {
    const da = taskEffectiveDate(a);
    const db = taskEffectiveDate(b);
    if (da && db) return da < db ? -1 : da > db ? 1 : 0;
    if (da) return -1;
    if (db) return 1;
    return b.created_at.localeCompare(a.created_at);
  }

  // Section "Ouverts" : les besoins tagués Urgent passent avant les autres,
  // chaque groupe restant trié du plus proche au plus éloigné.
  function compareOpenSection(a: Task, b: Task): number {
    if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
    return compareSoonestFirst(a, b);
  }

  // Sous-bloc "Historique" (besoins fermés déjà passés, ou sans date) : du
  // plus récent au plus ancien — clé = date effective si connue, sinon date
  // de création, pour que les besoins sans échéance restent triés entre eux.
  function compareMostRecentFirst(a: Task, b: Task): number {
    const ka = taskEffectiveDate(a) ?? a.created_at.slice(0, 10);
    const kb = taskEffectiveDate(b) ?? b.created_at.slice(0, 10);
    return ka < kb ? 1 : ka > kb ? -1 : 0;
  }

  // Aujourd'hui en ISO (YYYY-MM-DD), pour séparer les besoins fermés entre
  // "À venir" (date effective non passée) et "Historique" (passée ou
  // inconnue) — voir visibleClosedUpcoming/visibleClosedHistory plus bas.
  function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  // Vrai pour un besoin "fermé" (statut différent de "ouvert" — pris en
  // charge, fait ou fermé) dont la date effective est déjà passée (ou
  // inconnue) — même critère que le sous-bloc "Historique" du mur (voir
  // visibleClosedHistory). Sert à retirer la corbeille et les boutons "Se
  // désinscrire" une fois qu'il n'y a plus d'action utile à mener dessus.
  function isTaskClosedPast(t: Task): boolean {
    if (t.status === "ouvert") return false;
    const d = taskEffectiveDate(t);
    return !d || d < todayIso();
  }

  // Vrai si dateIso tombe aujourd'hui, demain ou après-demain (J+2) — sert à
  // cocher automatiquement "Urgent" à la création d'un besoin, que ce soit
  // via le formulaire Publier (voir l'effet fUrgent plus haut) ou un item du
  // wizard checklist (voir startChecklistWizard/updateChecklistWizardField),
  // ces deux chemins produisant les tasks affichées sur le mur d'Entraide.
  function isUrgentWindow(dateIso: string): boolean {
    const target = new Date(dateIso + "T00:00:00");
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
    return diffDays >= 0 && diffDays <= 2;
  }

  async function openTransportPropose(t: Task) {
    setProposeTarget(t);
    setPDate(t.transport_date ?? "");
    if (t.transport_date) {
      const d = new Date(t.transport_date + "T12:00:00");
      setPCalMonth({ year: d.getFullYear(), month: d.getMonth() });
    }
    setPOutTime(t.transport_out_time ?? "");
    setPReturnTime(t.transport_return_time ?? "");
    setPIncludeOut(true);
    setPIncludeReturn(true);
    setPNote("");
    if (isAdmin) {
      const { data } = await supabase.auth.getUser();
      setPPrenom((data.user?.user_metadata?.firstname ?? "").trim());
      setPNom((data.user?.user_metadata?.lastname ?? "").trim());
    } else {
      setPPrenom(mySession?.prenom ?? "");
      setPNom(mySession?.nom ?? "");
    }
    // Pré-rempli depuis la session — le PIN choisi à la connexion, modifiable.
    setPPin(!isAdmin ? (mySession?.pin ?? "") : "");
  }

  async function submitTransportProposal() {
    if (!proposeTarget || !proposeFormReady) return;
    setProposeSaving(true);
    const includeReturn = !!proposeTarget.transport_round_trip && pIncludeReturn;
    const proposal: TransportProposal = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      prenom: pPrenom.trim(),
      nom: pNom.trim(),
      pin: isAdmin ? "ADMIN" : pPin,
      date: pDate,
      out_time: pIncludeOut ? pOutTime : null,
      return_time: includeReturn ? pReturnTime : null,
      offers_out: pIncludeOut,
      offers_return: includeReturn,
      note: pNote.trim() || null,
      created_at: new Date().toISOString(),
    };
    // Relit transport_proposals juste avant d'écrire pour limiter le risque
    // d'écraser une proposition envoyée entre-temps par quelqu'un d'autre
    // (pas de RPC dédiée pour un append atomique, l'app n'en a jamais eu besoin
    // jusqu'ici et le volume ici reste très faible).
    const { data, error: selectError } = await supabase
      .from("tasks").select("transport_proposals").eq("id", proposeTarget.id).single();
    if (selectError) {
      setProposeSaving(false);
      Alert.alert("Erreur", "Impossible de charger le besoin : " + selectError.message);
      return;
    }
    const current: TransportProposal[] = data?.transport_proposals ?? proposeTarget.transport_proposals ?? [];
    const { error: updateError } = await supabase
      .from("tasks").update({ transport_proposals: [...current, proposal] }).eq("id", proposeTarget.id);
    if (updateError) {
      setProposeSaving(false);
      Alert.alert("Erreur", "La proposition n'a pas pu être envoyée : " + updateError.message);
      return;
    }
    if (!isAdmin) {
      await rememberAuthorPin(pPrenom.trim(), pNom.trim(), pPin);
      setMySession({ prenom: pPrenom.trim(), nom: pNom.trim(), pin: pPin });
    }
    setProposeSaving(false);
    setProposeTarget(null);
    showToast("Proposition envoyée ✓");
    loadTasks();
  }

  // Valide une seule jambe (aller ou retour) d'une proposition — l'autre
  // jambe, si elle n'est pas déjà attribuée, reste ouverte aux autres
  // propositions. Le statut ne passe à "pris_en_charge" (et la liste de
  // propositions n'est vidée) qu'une fois les deux jambes attribuées (ou la
  // seule jambe, pour un besoin simple aller uniquement).
  async function validateTransportLeg(t: Task, p: TransportProposal, leg: "out" | "return") {
    const otherLegDone = leg === "out"
      ? (!t.transport_round_trip || !!t.transport_return_claimed_by_prenom)
      : !!t.claimed_by_prenom;
    const patch: Record<string, unknown> = { transport_confirmed_date: p.date };
    if (leg === "out") {
      patch.claimed_by_prenom = p.prenom;
      patch.claimed_by_nom = p.nom;
      patch.claimed_by_pin = p.pin;
      patch.transport_confirmed_out_time = p.out_time;
    } else {
      patch.transport_return_claimed_by_prenom = p.prenom;
      patch.transport_return_claimed_by_nom = p.nom;
      patch.transport_return_claimed_by_pin = p.pin;
      patch.transport_confirmed_return_time = p.return_time;
    }
    if (otherLegDone) {
      patch.status = "pris_en_charge";
      patch.transport_proposals = [];
    }
    await supabase.from("tasks").update(patch).eq("id", t.id);
    showToast(otherLegDone ? "Horaire validé ✓" : leg === "out" ? "Aller validé — en attente du retour" : "Retour validé — en attente de l'aller");
    if (otherLegDone) setProposalsTarget(null);
    loadTasks();
  }

  async function rejectTransportProposals(t: Task) {
    await supabase.from("tasks").update({ transport_proposals: [] }).eq("id", t.id);
    setProposalsTarget(null);
    showToast("Propositions écartées");
    loadTasks();
  }

  // Ajoute au calendrier natif la (ou les) jambe(s) que ce visiteur a lui-même
  // en charge — l'aller, le retour, ou les deux s'il a pris le besoin
  // directement via "Je m'en occupe". Pas de suivi de l'event créé (pas de
  // update/annulation prévue côté transport, contrairement aux réservations).
  async function handleAddTransportToCalendar(t: Task) {
    const legs = myTransportLegs(t);
    if (legs.length === 0) return;
    const session = !isAdmin ? await getVisitorSession() : null;
    let addedAny = false;
    for (const leg of legs) {
      const time = leg === "out" ? t.transport_confirmed_out_time : t.transport_confirmed_return_time;
      if (!t.transport_confirmed_date || !time) continue;
      const start = new Date(`${t.transport_confirmed_date}T${time}:00`);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const from = leg === "out" ? t.transport_from : t.transport_to;
      const to = leg === "out" ? t.transport_to : t.transport_from;
      const title = `Transport ${leg === "out" ? "aller" : "retour"} — ${t.title}`;
      const location = [from, to].filter(Boolean).join(" → ");
      const result = await addGenericEventToNativeCalendar(title, start, end, location, t.description || undefined, session?.email || null);
      if (result.ok) addedAny = true;
      else {
        Alert.alert("Calendrier", "Impossible d'ajouter l'événement : " + result.reason);
        return;
      }
    }
    if (addedAny) showToast("Ajouté à ton calendrier ✓");
  }

  function renderTask(t: Task) {
    const statusColors = STATUS_COLORS(C);
    const highlighted = highlightId === t.id;
    // Sélection multiple : admin sur tout besoin, visiteur seulement sur ceux
    // qu'il a lui-même publiés (voir isAuthor) et pas encore fermés depuis
    // trop longtemps (voir isTaskClosedPast) — même périmètre que la
    // suppression unitaire (icône 🗑️ juste au-dessus). Les besoins "fait"
    // restent hors du champ (même règle que la suppression simple, voir
    // deleteTask), ainsi que ceux déjà "supprimés en douceur" par l'admin
    // (deleted_by_admin, géré par un autre bouton — voir setSelfDeleteTaskTarget).
    const selectable = t.status !== "fait" && !t.deleted_by_admin
      && (isAdmin || (isAuthor(t) && !isTaskClosedPast(t)));
    const selected = selectedTaskIds.has(t.id);
    const modifiedByLabel = [t.modified_by_prenom, t.modified_by_nom].filter(Boolean).join(" ");
    return (
      <Pressable
        key={t.id}
        onLayout={(e) => { taskOffsets.current[t.id] = e.nativeEvent.layout.y; }}
        onLongPress={() => {
          if (selectable && !selectionMode) enterSelection(t.id);
          // Sur un besoin "fait", la sélection multiple est désactivée (voir
          // `selectable`) — ce clic prolongé libéré ouvre directement
          // "Modifier le besoin" pour l'admin (accès au bouton "Je m'en
          // occupe", voir plus bas).
          else if (isAdmin && !selectable) openEditTask(t);
        }}
        onPress={() => { if (selectable && selectionMode) toggleTaskSelected(t.id); }}
        pointerEvents={selectable && selectionMode ? "box-only" : "auto"}
        style={[
          styles.taskCard,
          { backgroundColor: C.card, borderColor: highlighted ? C.gold : (t.status === "fait" ? "rgba(122,143,166,0.2)" : C.border) },
          // Cadre rouge autour du bloc tant que le tag Urgent est actif — ne
          // s'affiche que si le besoin est encore "ouvert" (voir le tag
          // Urgent plus bas), sauf priorité visuelle du surlignage (deep-link)
          // ou de la sélection multiple ci-dessous.
          t.urgent && t.status === "ouvert" && { borderColor: C.danger, borderWidth: 2 },
          highlighted && { borderWidth: 2 },
          selected && { borderColor: C.accent, borderWidth: 2, backgroundColor: `${C.accent}11` },
        ]}
      >
        <View style={styles.taskHeader}>
          {selectable && selectionMode && (
            <View style={[styles.selectDot, { borderColor: C.accent, backgroundColor: selected ? C.accent : "transparent" }]}>
              {selected && <Text style={styles.selectDotCheck}>✓</Text>}
            </View>
          )}
          <View style={[styles.catBadge, { backgroundColor: `${C.accent}22` }]}>
            <Text style={styles.catIcon}>{CATEGORY_ICONS[t.category]}</Text>
            <Text style={[styles.catLabel, { color: C.accent }]}>{CATEGORY_LABELS[t.category]}</Text>
          </View>
          {/* Urgent ne s'affiche (tag + cadre rouge, voir plus haut) que tant
              que le besoin reste "ouvert" — une fois pris en charge / fait /
              fermé, l'urgence n'a plus de sens à signaler. */}
          {t.urgent && t.status === "ouvert" && (
            <View style={[styles.catBadge, { backgroundColor: `${C.danger}22` }]}>
              <Text style={[styles.catLabel, { color: C.danger }]}>🔴 Urgent</Text>
            </View>
          )}
          <View style={[
            styles.statusBadge,
            { borderColor: transportOverdue(t) ? statusColors.fait : statusColors[t.status] },
            coursePartial(t) && { alignItems: "center" },
          ]}>
            <Text style={[styles.statusLabel, { color: transportOverdue(t) ? statusColors.fait : statusColors[t.status] }]}>
              {transportOverdue(t) ? STATUS_LABELS.fait : STATUS_LABELS[t.status]}
            </Text>
            {/* Besoin "courses" pris en charge par certains articles seulement
                (voir courseListComplete) — même tag que "Pris en charge",
                juste complété d'une 2ème ligne plutôt qu'un tag distinct. */}
            {coursePartial(t) && (
              <Text style={[styles.statusLabel, { color: statusColors[t.status] }]}>partiellement</Text>
            )}
          </View>
          {isAdmin && (
            <TouchableOpacity onPress={() => openEditTask(t)} style={[styles.iconBtn, { borderColor: C.border }]}>
              <Text style={{ fontSize: 13 }}>✏️</Text>
            </TouchableOpacity>
          )}
        </View>

        {t.deleted_by_admin && (
          <Text style={[styles.taskDeletedBanner, { color: C.danger }]}>
            Votre publication a été supprimée par l'administrateur du compte. Elle n'est ainsi plus visible par les autres utilisateurs.
          </Text>
        )}

        {/* Titre + corbeille sur la même ligne, la corbeille toujours à droite
            du titre — position fixe quel que soit le nombre de badges
            affichés au-dessus (Urgent, statut...), contrairement à avant où
            elle vivait dans la ligne des badges et se déplaçait avec eux. */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <Text style={[styles.taskTitle, { color: t.status === "fait" ? C.muted : C.text, flex: 1 }]}>{t.title}</Text>
          {isAdmin && t.status !== "fait" && (
            <TouchableOpacity onPress={() => deleteTask(t)} style={[styles.iconBtn, { borderColor: "rgba(233,69,96,0.3)" }]}>
              <Text style={{ fontSize: 13, color: C.danger }}>🗑️</Text>
            </TouchableOpacity>
          )}
          {!isAdmin && t.deleted_by_admin && isAuthor(t) && !isTaskClosedPast(t) && (
            <TouchableOpacity onPress={() => setSelfDeleteTaskTarget(t)} style={[styles.iconBtn, { borderColor: "rgba(233,69,96,0.3)" }]}>
              <Text style={{ fontSize: 13, color: C.danger }}>🗑️</Text>
            </TouchableOpacity>
          )}
          {!isAdmin && !t.deleted_by_admin && isAuthor(t) && t.status !== "fait" && !isTaskClosedPast(t) && (
            <TouchableOpacity onPress={() => deleteTask(t)} style={[styles.iconBtn, { borderColor: "rgba(233,69,96,0.3)" }]}>
              <Text style={{ fontSize: 13, color: C.danger }}>🗑️</Text>
            </TouchableOpacity>
          )}
        </View>
        {t.description ? (
          <Text style={[styles.taskDesc, { color: C.muted }]}>{t.description}</Text>
        ) : null}
        <Text style={[styles.taskDesc, { color: C.muted }]}>
          🗓️ Publié le {toFrShort(new Date(t.created_at))}
        </Text>
        {(() => {
          // Lien officiel re-dérivé du template d'origine (tasks n'a pas de
          // colonne dédiée) — reste affiché après publication, pas seulement
          // pendant la sélection de la checklist. Voir findTemplateItemByTitle.
          const tplLink = findTemplateItemByTitle(t.title)?.lienExterne;
          return tplLink ? (
            <TouchableOpacity
              onPress={() => Linking.openURL(tplLink.url).catch(() => {})}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Text style={[styles.checklistItemLink, { color: C.accent }]}>🔗 {tplLink.label}</Text>
            </TouchableOpacity>
          ) : null;
        })()}
        {t.category === "relais" && t.relais_start_date && t.date_limite && (
          <Text style={[styles.taskDesc, { color: C.muted }]}>
            📅 Période : du {toFrShort(new Date(t.relais_start_date + "T12:00:00"))} au {toFrShort(new Date(t.date_limite + "T12:00:00"))}
          </Text>
        )}
        {t.category === "relais" && (
          <Text style={[styles.taskDesc, { color: C.muted }]}>
            👁️ Visible par {t.relais_visible_to === "some" ? "certains proches" : "tous les proches"}
          </Text>
        )}
        {/* Réservé à l'admin : qui a déjà répondu "Pas cette fois" au popup
            RelaisAlertModal, pour ne pas relancer inutilement quelqu'un qui a
            déjà décliné ce besoin précis. */}
        {isAdmin && t.category === "relais" && t.relais_dismissed_by.length > 0 && (
          <Text style={[styles.taskDesc, { color: C.muted }]}>
            🙅 A répondu « Pas cette fois » : {t.relais_dismissed_by.map((d) => `${d.prenom} ${d.nom}`.trim()).join(", ")}
          </Text>
        )}
        {t.category !== "transport" && t.category !== "relais" && t.date_limite && (
          <Text style={[styles.taskDesc, { color: C.muted }]}>
            📅 Échéance : {toFrShort(new Date(t.date_limite + "T12:00:00"))}
          </Text>
        )}
        {!!t.modified_at && (
          <Text style={[styles.taskModified, { color: C.muted }]}>
            ✏️ Modifié le {toFrShort(new Date(t.modified_at))}{modifiedByLabel ? ` par ${modifiedByLabel}` : ""}
          </Text>
        )}
        {t.photo && (
          <Image source={{ uri: taskPhotoUrl(spaceId, t.photo) }} style={styles.taskPhoto} resizeMode="cover" />
        )}

        {t.category === "courses" && (
          <TouchableOpacity
            style={[styles.claimBtn, { backgroundColor: C.accent, marginTop: 8 }]}
            onPress={() => setShoppingListTask(t)}
            activeOpacity={0.85}
          >
            <Text style={styles.claimBtnText}>👁️ Aperçu de la liste</Text>
          </TouchableOpacity>
        )}

        {t.category === "transport" && (
          <View style={[styles.transportInfo, { borderColor: C.border, backgroundColor: `${C.gold}11` }]}>
            {(t.author_prenom || t.author_nom) && (
              <Text style={[styles.transportInfoText, { color: C.muted }]}>
                👤 Demandé par {t.author_prenom} {t.author_nom}
              </Text>
            )}
            {(t.transport_for_prenom || t.transport_for_nom) && (
              <Text style={[styles.transportInfoText, { color: C.muted }]}>
                Pour {t.transport_for_prenom} {t.transport_for_nom}
              </Text>
            )}
            <Text style={[styles.transportInfoText, { color: C.text }]}>
              📍 {t.transport_home_is_arrival ? t.transport_from : `${t.transport_from}${t.transport_home_city ? `, ${t.transport_home_city}` : ""}`}
              {" → "}
              {t.transport_home_is_arrival ? `${t.transport_to}${t.transport_home_city ? `, ${t.transport_home_city}` : ""}` : t.transport_to}
            </Text>
            {(t.transport_home_is_arrival ? t.transport_to : t.transport_from) ? (
              <TouchableOpacity
                onPress={() => {
                  const url = googleMapsSearchUrl(joinAddress({
                    street: t.transport_home_is_arrival ? t.transport_to : t.transport_from, line2: null,
                    postalCode: t.transport_home_postal_code, city: t.transport_home_city, country: t.transport_home_country,
                  }));
                  Linking.openURL(url).catch(() => {});
                }}
              >
                <Text style={[styles.transportInfoText, { color: C.gold, textDecorationLine: "underline" }]}>
                  🗺️ Voir le domicile ({t.transport_home_is_arrival ? "arrivée" : "départ"}) sur Google Maps
                </Text>
              </TouchableOpacity>
            ) : null}
            {t.transport_round_trip ? (
              <>
                <Text style={[styles.transportInfoText, { color: C.text }]}>
                  🕐 Aller : {t.transport_confirmed_out_time
                    ? `${slotLabel(t.transport_confirmed_date ?? t.transport_date ?? "", t.transport_confirmed_out_time)}${t.claimed_by_prenom ? ` — ${t.claimed_by_prenom} ${t.claimed_by_nom}` : ""}`
                    : `demandé ${t.transport_date && t.transport_out_time ? slotLabel(t.transport_date, t.transport_out_time) : "—"}`}
                </Text>
                <Text style={[styles.transportInfoText, { color: C.text }]}>
                  🕐 Retour : {t.transport_confirmed_return_time
                    ? `${t.transport_confirmed_return_time.replace(":", "h")}${
                        t.transport_return_claimed_by_prenom
                          ? ` — ${t.transport_return_claimed_by_prenom} ${t.transport_return_claimed_by_nom}`
                          : (t.status === "pris_en_charge" && t.claimed_by_prenom ? ` — ${t.claimed_by_prenom} ${t.claimed_by_nom}` : "")
                      }`
                    : `demandé ${t.transport_return_time ? t.transport_return_time.replace(":", "h") : "—"}`}
                </Text>
              </>
            ) : t.status === "ouvert" ? (
              <Text style={[styles.transportInfoText, { color: C.text }]}>
                🕐 Demandé : {t.transport_date && t.transport_out_time ? slotLabel(t.transport_date, t.transport_out_time) : "—"}
              </Text>
            ) : (
              <Text style={[styles.transportInfoText, { color: C.text }]}>
                🕐 Confirmé : {t.transport_confirmed_date && t.transport_confirmed_out_time ? slotLabel(t.transport_confirmed_date, t.transport_confirmed_out_time) : "—"}
              </Text>
            )}
            {t.transport_flexible && t.status === "ouvert" && (
              <Text style={[styles.transportFlexible, { color: C.gold }]}>🕊️ Horaires flexibles — d'autres créneaux peuvent convenir</Text>
            )}
          </View>
        )}

        {t.category !== "relais" && (t.category === "courses"
          ? !!courseContributorsLabel(t)
          : t.status !== "ouvert" && t.claimed_by_prenom) && (!t.transport_round_trip || !t.transport_return_claimed_by_prenom) && (
          <View style={[styles.claimerRow, { borderColor: C.border, backgroundColor: `${C.accent}11` }]}>
            <Text style={[styles.claimerText, { color: C.text }]}>
              👤 {t.category === "courses" ? courseContributorsLabel(t) : `${t.claimed_by_prenom} ${t.claimed_by_nom} s'en occupe`}
            </Text>
            {t.claimed_photo && (
              <Image source={{ uri: taskPhotoUrl(spaceId, t.claimed_photo) }} style={styles.claimedPhoto} resizeMode="cover" />
            )}
            {t.claimed_text && (
              <Text style={[styles.claimerText, { color: C.muted, marginTop: 4 }]}>{t.claimed_text}</Text>
            )}
          </View>
        )}

        {/* Un besoin relais peut avoir plusieurs preneurs, chacun sur sa
            propre sous-période — une ligne par contributeur plutôt que le
            "X s'en occupe" générique ci-dessus, plus les trous restants tant
            que la période n'est pas intégralement couverte. */}
        {t.category === "relais" && (relaisCoverage[t.id]?.length ?? 0) > 0 && (
          <View style={[styles.claimerRow, { borderColor: C.border, backgroundColor: `${C.accent}11` }]}>
            {(relaisCoverage[t.id] ?? []).map((cov) => (
              <View key={cov.id} style={{ marginBottom: 6 }}>
                <Text style={[styles.claimerText, { color: C.text }]}>
                  👤 {cov.prenom} {cov.nom} — du {toFrShort(new Date(cov.start_date + "T12:00:00"))} au {toFrShort(new Date(cov.end_date + "T12:00:00"))}
                </Text>
                {cov.claimed_text && (
                  <Text style={[styles.claimerText, { color: C.muted, marginTop: 2 }]}>{cov.claimed_text}</Text>
                )}
                {cov.claimed_photo && (
                  <Image source={{ uri: taskPhotoUrl(spaceId, cov.claimed_photo) }} style={styles.claimedPhoto} resizeMode="cover" />
                )}
                {!isAdmin && samePerson(cov.prenom, cov.nom, cov.pin) && !isTaskClosedPast(t) && (
                  <TouchableOpacity
                    style={[styles.actionSmall, { borderColor: C.border, marginTop: 4, alignSelf: "flex-start" }]}
                    onPress={() => openRelaisCoverageUnclaim(t, cov)}
                  >
                    <Text style={[styles.actionSmallText, { color: C.muted }]}>Se désinscrire</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {t.status === "ouvert" && t.relais_start_date && t.date_limite && (() => {
              const gaps = computeRelaisGaps(relaisCoverage[t.id] ?? [], t.relais_start_date, t.date_limite);
              return gaps.length > 0 ? (
                <Text style={[styles.claimerText, { color: C.danger, marginTop: 4 }]}>
                  🕳️ Reste à couvrir : {gaps.map((g) => `du ${toFrShort(new Date(g.start_date + "T12:00:00"))} au ${toFrShort(new Date(g.end_date + "T12:00:00"))}`).join(", ")}
                </Text>
              ) : null;
            })()}
          </View>
        )}

        {t.status === "ouvert" && !t.deleted_by_admin && t.category !== "transport" && (
          <TouchableOpacity
            style={[styles.claimBtn, { backgroundColor: C.accent }]}
            onPress={() => openClaim(t)}
            activeOpacity={0.85}
          >
            <Text style={styles.claimBtnText}>🙋 Je m'en occupe</Text>
          </TouchableOpacity>
        )}

        {t.status === "ouvert" && !t.deleted_by_admin && t.category === "transport" && (
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            {!transportAnyLegClaimed(t) && (
              <TouchableOpacity
                style={[styles.claimBtn, { backgroundColor: C.accent, flex: 1, marginTop: 0 }]}
                onPress={() => openClaim(t)}
                activeOpacity={0.85}
              >
                <Text style={styles.claimBtnText}>🙋 Je m'en occupe</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.claimBtn,
                canManageTransport(t)
                  ? { backgroundColor: C.accent }
                  : { backgroundColor: C.card, borderWidth: 1, borderColor: C.accent },
                { flex: 1, marginTop: 0 },
              ]}
              onPress={() => canManageTransport(t) ? setProposalsTarget(t) : openTransportPropose(t)}
              activeOpacity={0.85}
            >
              <Text style={[styles.claimBtnText, canManageTransport(t) ? null : { color: C.accent }]}>
                {canManageTransport(t)
                  ? `🕐 Propositions${t.transport_proposals.length ? ` (${t.transport_proposals.length})` : ""}`
                  : "🕐 Proposition"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {t.status === "pris_en_charge" && !isAdmin && myTransportLegs(t).length > 0 && (
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {/* "C'est fait" n'a plus lieu d'être une fois que la carte affiche
                déjà "Fait" (voir transportOverdue) — évite le doublon visuel
                d'un bouton d'action à côté d'un tag qui dit déjà que c'est fait. */}
            {!transportOverdue(t) && (
              <TouchableOpacity
                style={[styles.actionSmall, { borderColor: C.success, backgroundColor: `${C.success}18` }]}
                onPress={() => openDone(t)}
              >
                <Text style={[styles.actionSmallText, { color: C.success }]}>✓ C'est fait</Text>
              </TouchableOpacity>
            )}
            {!isTaskClosedPast(t) && (myTransportLegs(t).length > 1 ? (
              <>
                <TouchableOpacity
                  style={[styles.actionSmall, { borderColor: C.border }]}
                  onPress={() => openPinModal(t, "unclaim", "out")}
                >
                  <Text style={[styles.actionSmallText, { color: C.muted }]}>Se désinscrire (aller)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionSmall, { borderColor: C.border }]}
                  onPress={() => openPinModal(t, "unclaim", "return")}
                >
                  <Text style={[styles.actionSmallText, { color: C.muted }]}>Se désinscrire (retour)</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.actionSmall, { borderColor: C.border }]}
                onPress={() => openPinModal(t, "unclaim", myTransportLegs(t)[0])}
              >
                <Text style={[styles.actionSmallText, { color: C.muted }]}>Se désinscrire</Text>
              </TouchableOpacity>
            ))}
            {t.category === "transport" && (
              <TouchableOpacity
                style={[styles.actionSmall, { borderColor: C.gold, backgroundColor: `${C.gold}18` }]}
                onPress={() => handleAddTransportToCalendar(t)}
              >
                <Text style={[styles.actionSmallText, { color: C.gold }]}>📅 Ajouter au calendrier</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {t.status === "pris_en_charge" && isAdmin && (
          <TouchableOpacity
            style={[styles.actionSmall, { borderColor: C.success, backgroundColor: `${C.success}18`, marginTop: 10, alignSelf: "flex-start" }]}
            onPress={() => openDone(t)}
          >
            <Text style={[styles.actionSmallText, { color: C.success }]}>✓ Marquer fait</Text>
          </TouchableOpacity>
        )}

        {t.status === "fait" && t.done_photo && (
          <Image source={{ uri: taskPhotoUrl(spaceId, t.done_photo) }} style={styles.claimedPhoto} resizeMode="cover" />
        )}

        {(t.status === "fait" || t.status === "ferme") && isAdmin && (
          <TouchableOpacity
            style={[styles.actionSmall, { borderColor: C.border, marginTop: 10, alignSelf: "flex-start" }]}
            onPress={() => adminSetStatus(t, "ouvert")}
          >
            <Text style={[styles.actionSmallText, { color: C.muted }]}>↩ Réouvrir</Text>
          </TouchableOpacity>
        )}
      </Pressable>
    );
  }

  // Un besoin "relais" ciblé sur "certains proches" reste invisible aux
  // autres visiteurs (admin et auteur voient toujours tout) — le ciblage
  // ne concerne que la visibilité dans le mur, pas juste l'alerte de
  // connexion (RelaisAlertModal filtre séparément relais_dismissed_by).
  const relaisVisible = (t: Task) => {
    if (t.category !== "relais" || t.relais_visible_to !== "some") return true;
    if (isAdmin || isAuthor(t)) return true;
    if (!mySession) return false;
    const myKey = relaisIdentityKey(mySession.prenom, mySession.nom);
    return (t.relais_recipients ?? []).some((r) => relaisIdentityKey(r.prenom, r.nom) === myKey);
  };
  const undeletedTasks = tasks
    .filter((t) => !t.deleted_by_admin || (!isAdmin && isAuthor(t)))
    .filter(relaisVisible);
  // "Ouvert" = jamais pris en charge. Dès qu'un besoin est pris en charge il
  // rejoint les besoins fermés (voir répartition À venir/Historique
  // ci-dessous) — un besoin "ouvert" au statut réel n'est donc plus jamais
  // mélangé avec "pris_en_charge" comme c'était le cas auparavant.
  const isOpenStatus = (t: Task) => t.status === "ouvert";
  const isClosedStatus = (t: Task) => t.status !== "ouvert";
  const catFiltered = undeletedTasks.filter((t) => !activeCat || t.category === activeCat);
  const today = todayIso();
  const visibleOpen = catFiltered
    .filter((t) => !closedOnlyFilter && isOpenStatus(t))
    .sort(compareOpenSection);
  const closedFiltered = catFiltered.filter((t) => !openOnlyFilter && isClosedStatus(t));
  // À venir : besoin fermé (pris en charge / fait / fermé) dont la date
  // effective n'est pas encore passée — trié du plus proche au plus
  // éloigné. Historique : date passée ou inconnue — du plus récent au plus
  // ancien (voir compareMostRecentFirst).
  const visibleClosedUpcoming = closedFiltered
    .filter((t) => { const d = taskEffectiveDate(t); return !!d && d >= today; })
    .sort(compareSoonestFirst);
  const visibleClosedHistory = closedFiltered
    .filter((t) => { const d = taskEffectiveDate(t); return !d || d < today; })
    .sort(compareMostRecentFirst);
  const visibleTasksCount = visibleOpen.length + visibleClosedUpcoming.length + visibleClosedHistory.length;
  const openCount = undeletedTasks.filter(isOpenStatus).length;
  const closedCount = undeletedTasks.filter(isClosedStatus).length;

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <Text style={[styles.headerTitle, { color: C.text }]}>🤝 Entraide</Text>
      </View>

      <View style={[styles.subHeader, styles.subHeaderRow, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: C.accent }]}
          onPress={openCreateTask}
          activeOpacity={0.85}
        >
          <Text style={[styles.addBtnText, { color: "#fff" }]}>Publier</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.catTabsBar, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        {(Object.keys(CATEGORY_ICONS) as TaskCategory[])
          .filter((cat) => cat !== "relais" || undeletedTasks.some((t) => t.category === "relais"))
          .map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.catTab,
              { backgroundColor: activeCat === cat ? C.accent : "transparent", borderColor: activeCat === cat ? C.accent : C.border },
            ]}
            onPress={() => setActiveCat((prev) => (prev === cat ? null : cat))}
            activeOpacity={0.75}
          >
            <Text style={styles.catTabIcon}>{CATEGORY_ICONS[cat]}</Text>
            <Text style={[styles.catTabLabel, { color: activeCat === cat ? "#fff" : C.text }]}>{CATEGORY_LABELS[cat]}</Text>
          </TouchableOpacity>
        ))}
        {/* "Tous" en dernier — seul sur sa ligne, centré (6 catégories sur 2
            lignes de 3 juste au-dessus). */}
        <TouchableOpacity
          style={[
            styles.catTab,
            { backgroundColor: activeCat === null ? C.accent : "transparent", borderColor: activeCat === null ? C.accent : C.border },
          ]}
          onPress={() => setActiveCat(null)}
          activeOpacity={0.75}
        >
          <Text style={styles.catTabIcon}>📋</Text>
          <Text style={[styles.catTabLabel, { color: activeCat === null ? "#fff" : C.text }]}>Tous</Text>
        </TouchableOpacity>
      </View>

      {isAdmin && activeCat === "administratif" && (
        <TouchableOpacity
          style={[styles.checklistBanner, { backgroundColor: C.gold + "1c", borderColor: C.gold }]}
          onPress={openChecklistPicker}
          activeOpacity={0.8}
        >
          <Text style={styles.checklistBannerIcon}>✨</Text>
          <Text style={[styles.checklistBannerText, { color: C.text }]}>Ajoute une checklist publique</Text>
          <Text style={[styles.checklistBannerArrow, { color: C.gold }]}>→</Text>
        </TouchableOpacity>
      )}

      <View style={[styles.sectionBar, { borderBottomColor: C.border, flexDirection: "row", flexWrap: "wrap", gap: 8 }]}>
        <TouchableOpacity
          style={[
            styles.openFilterChip,
            {
              backgroundColor: openOnlyFilter ? C.accent : C.overlay,
              borderColor: openOnlyFilter ? C.accent : C.border,
            },
          ]}
          onPress={() => { setOpenOnlyFilter((prev) => !prev); setClosedOnlyFilter(false); }}
          activeOpacity={0.75}
        >
          <View style={[styles.openFilterDot, { backgroundColor: openOnlyFilter ? "#fff" : C.success }]} />
          <Text style={[styles.sectionCount, { color: openOnlyFilter ? "#fff" : C.muted }]}>
            {openCount} besoin{openCount !== 1 ? "s" : ""} ouvert{openCount !== 1 ? "s" : ""}
          </Text>
          <Text style={[styles.openFilterIcon, { color: openOnlyFilter ? "#fff" : C.muted }]}>
            {openOnlyFilter ? "✕" : "▾"}
          </Text>
        </TouchableOpacity>

        {closedCount > 0 && (
          <TouchableOpacity
            style={[
              styles.openFilterChip,
              {
                backgroundColor: closedOnlyFilter ? C.danger : C.overlay,
                borderColor: closedOnlyFilter ? C.danger : C.border,
              },
            ]}
            onPress={() => { setClosedOnlyFilter((prev) => !prev); setOpenOnlyFilter(false); }}
            activeOpacity={0.75}
          >
            <View style={[styles.openFilterDot, { backgroundColor: closedOnlyFilter ? "#fff" : C.danger }]} />
            <Text style={[styles.sectionCount, { color: closedOnlyFilter ? "#fff" : C.muted }]}>
              {closedCount} besoin{closedCount !== 1 ? "s" : ""} fermé{closedCount !== 1 ? "s" : ""}
            </Text>
            <Text style={[styles.openFilterIcon, { color: closedOnlyFilter ? "#fff" : C.muted }]}>
              {closedOnlyFilter ? "✕" : "▾"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {tasksLoading ? (
        <View style={styles.centered}><ActivityIndicator color={C.accent} size="large" /></View>
      ) : visibleTasksCount === 0 ? (
        <View style={styles.centered}>
          <Text style={{ fontSize: 36, marginBottom: 12 }}>🤝</Text>
          <Text style={[styles.emptyText, { color: C.muted }]}>
            {openOnlyFilter
              ? "Aucun besoin ouvert pour l'instant."
              : closedOnlyFilter
              ? "Aucun besoin fermé pour l'instant."
              : activeCat
              ? `Aucun besoin dans ${CATEGORY_LABELS[activeCat]} pour l'instant.`
              : "Aucun besoin pour l'instant."}
          </Text>
          <Text style={[styles.emptyHint, { color: C.muted }]}>
            {isAdmin && activeCat === "administratif"
              ? "Ajoute une checklist publique juste au-dessus, ou crée un besoin."
              : "Crée un besoin si tu as besoin d'aide."}
          </Text>
        </View>
      ) : (
        <ScrollView ref={scrollRef} contentContainerStyle={styles.listPad}>
          {visibleOpen.map(renderTask)}
          {(visibleClosedUpcoming.length > 0 || visibleClosedHistory.length > 0) && visibleOpen.length > 0 && (
            <Text style={[styles.listSectionHeader, { color: C.gold }]}>🔒 Fermés</Text>
          )}
          {visibleClosedUpcoming.length > 0 && (
            <>
              <Text style={[styles.listSubsectionHeader, { color: C.muted }]}>À venir</Text>
              {visibleClosedUpcoming.map(renderTask)}
            </>
          )}
          {visibleClosedHistory.length > 0 && (
            <>
              <Text style={[styles.listSubsectionHeader, { color: C.muted }]}>Historique</Text>
              {visibleClosedHistory.map(renderTask)}
            </>
          )}
        </ScrollView>
      )}

      {/* ── MODAL CRÉER / ÉDITER BESOIN ───────────────────────────────────── */}
      <Modal visible={taskForm} transparent animationType="slide" onRequestClose={() => setTaskForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => !taskSaving && setTaskForm(false)}>
            <ScrollView contentContainerStyle={styles.overlayScroll} keyboardShouldPersistTaps="handled">
              <TouchableOpacity activeOpacity={1}>
                <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.accent }]}>
                  <Text style={[styles.sheetTitle, { color: C.text }]}>
                    {editTask ? "✏️ Modifier le besoin" : "➕ Nouveau besoin"}
                  </Text>

                  <TextInput
                    style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                    placeholder="Titre du besoin *"
                    placeholderTextColor={C.muted}
                    value={fTitle}
                    onChangeText={setFTitle}
                    autoFocus
                  />
                  <TextInput
                    style={[styles.input, styles.descArea, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                    placeholder="Description (optionnelle)"
                    placeholderTextColor={C.muted}
                    value={fDesc}
                    onChangeText={setFDesc}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />

                  {!editTask && (
                    <TouchableOpacity
                      onPress={openChecklistFromForm}
                      activeOpacity={0.8}
                      style={{ width: "100%", height: 48, borderRadius: 10, borderWidth: 1, borderColor: C.gold, alignItems: "center", justifyContent: "center", marginBottom: 14 }}
                    >
                      <Text style={{ fontFamily: "DM_Sans_600SemiBold", fontSize: 14, color: C.gold }}>🗂️ Créer une checklist</Text>
                    </TouchableOpacity>
                  )}

                  {fCat !== "relais" && (
                  <>
                  <Text style={[styles.fieldLabel, { color: C.gold }]}>Catégorie</Text>
                  <View style={styles.catGrid}>
                    {(Object.keys(CATEGORY_ICONS) as TaskCategory[]).filter((cat) => cat !== "relais").map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.catOption,
                          {
                            backgroundColor: fCat === cat ? C.accent : C.bg,
                            borderColor: fCat === cat ? C.accent : C.border,
                          },
                        ]}
                        onPress={() => selectCategory(cat)}
                        activeOpacity={0.75}
                      >
                        <Text style={styles.catOptionIcon}>{CATEGORY_ICONS[cat]}</Text>
                        <Text style={[styles.catOptionLabel, { color: fCat === cat ? "#fff" : C.text }]}>
                          {CATEGORY_LABELS[cat]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  </>
                  )}

                  {fCat === "relais" && (
                    <Text style={[styles.fieldLabel, { color: C.gold }]}>🆘 Besoin de relais</Text>
                  )}

                  {fCat === "repas" && !!allergies && (
                    <View style={[styles.allergyBanner, { backgroundColor: "rgba(233,69,96,0.1)", borderColor: "rgba(233,69,96,0.35)" }]}>
                      <Text style={[styles.allergyBannerText, { color: C.danger }]}>
                        ⚠️ Allergies du patient : {allergies}
                      </Text>
                    </View>
                  )}

                  {!editTask && fCat === "courses" && (
                    <View style={[styles.transportForm, { borderColor: C.border, marginTop: 10 }]}>
                      <Text style={[styles.fieldLabel, { color: C.gold }]}>🛒 Liste de courses (optionnelle)</Text>
                      <Text style={{ fontFamily: "DM_Sans_400Regular", fontSize: 13, color: C.muted, marginBottom: 10 }}>
                        {fCourseItems.length ? `${fCourseItems.length} article${fCourseItems.length > 1 ? "s" : ""} ajouté${fCourseItems.length > 1 ? "s" : ""}` : "Aucun article pour le moment."}
                      </Text>
                      <TouchableOpacity
                        onPress={openCoursesListModal}
                        activeOpacity={0.8}
                        style={{ width: "100%", height: 48, borderRadius: 10, borderWidth: 1, borderColor: C.gold, alignItems: "center", justifyContent: "center" }}
                      >
                        <Text style={{ fontFamily: "DM_Sans_600SemiBold", fontSize: 14, color: C.gold }}>
                          {fCourseItems.length ? "✏️ Modifier la liste de courses" : "🛒 Créer une liste de courses"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {!editTask && fCat === "transport" && (
                    <View style={[styles.transportForm, { borderColor: C.border }]}>
                      <Text style={[styles.fieldLabel, { color: C.gold }]}>Départ *</Text>
                      {fTSwapped ? renderFixedCareLocation() : renderHomeAddressFields()}
                      <Text style={[styles.fieldLabel, { color: C.gold }]}>Arrivée *</Text>
                      {fTSwapped ? renderHomeAddressFields() : renderFixedCareLocation()}
                      <View style={styles.swapBtnRow}>
                        <TouchableOpacity
                          style={[styles.swapBtn, { backgroundColor: C.gold }]}
                          onPress={swapTransportDirection}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.swapBtnText}>⇄ Intervertir départ / arrivée</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={{ marginTop: 4 }}>
                        <SegmentedSwitch
                          value={fTRoundTrip}
                          onChange={setFTRoundTrip}
                          leftLabel="➡️ Aller simple"
                          rightLabel="🔁 Aller-retour"
                          C={C}
                          onThumbWidth={setTransportThumbWidth}
                        />
                      </View>

                      <View style={{ marginTop: 10 }}>
                        <SegmentedSwitch
                          value={!fTFlexible}
                          onChange={(v) => setFTFlexible(!v)}
                          leftLabel="🕊️ Flexible"
                          rightLabel="Horaire fixe"
                          C={C}
                          thumbWidth={transportThumbWidth || undefined}
                        />
                      </View>

                      <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 12 }]}>Date souhaitée *</Text>
                      <MiniCalendar
                        selDate={fTDate}
                        onSelect={handleTransportDateSelect}
                        calMonth={fTCalMonth}
                        onMonthChange={setFTCalMonth}
                        startDate={new Date()}
                        C={C}
                        size="lg"
                      />

                      <Text style={[styles.fieldLabel, { color: C.gold }]}>Heure aller *</Text>
                      <TimeClockPicker value={fTOutTime} onChange={setFTOutTime} C={C} />

                      {fTRoundTrip && (
                        <>
                          <Text style={[styles.fieldLabel, { color: C.gold }]}>Heure retour *</Text>
                          <TimeClockPicker value={fTReturnTime} onChange={setFTReturnTime} C={C} />
                        </>
                      )}

                      <TouchableOpacity
                        style={[
                          styles.claimOnCreateBtn,
                          {
                            backgroundColor: fTForSomeoneElse ? `${C.accent}22` : C.bg,
                            borderColor: fTForSomeoneElse ? C.accent : C.border,
                          },
                        ]}
                        onPress={() => setFTForSomeoneElse((v) => !v)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.claimOnCreateText, { color: fTForSomeoneElse ? C.accent : C.text }]}>
                          {fTForSomeoneElse ? "👤 Pour une autre personne" : "👤 Publier pour quelqu'un d'autre"}
                        </Text>
                      </TouchableOpacity>

                      {fTForSomeoneElse && (
                        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                          <TextInput
                            style={[styles.input, { flex: 1, backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                            placeholder="Son prénom *"
                            placeholderTextColor={C.muted}
                            value={fTForPrenom}
                            onChangeText={setFTForPrenom}
                            autoCapitalize="words"
                          />
                          <TextInput
                            style={[styles.input, { flex: 1, backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                            placeholder="Son nom *"
                            placeholderTextColor={C.muted}
                            value={fTForNom}
                            onChangeText={setFTForNom}
                            autoCapitalize="words"
                          />
                        </View>
                      )}
                    </View>
                  )}

                  {!editTask && fCat === "relais" && (
                    <View style={[styles.transportForm, { borderColor: C.border }]}>
                      <Text style={[styles.fieldLabel, { color: C.gold }]}>Date de début d'indisponibilité *</Text>
                      <MiniCalendar
                        selDate={fRelaisStartDate}
                        onSelect={setFRelaisStartDate}
                        calMonth={fRelaisStartCalMonth}
                        onMonthChange={setFRelaisStartCalMonth}
                        startDate={new Date()}
                        C={C}
                        size="lg"
                      />

                      <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 12 }]}>Date de fin *</Text>
                      <MiniCalendar
                        selDate={fDateLimite}
                        onSelect={setFDateLimite}
                        calMonth={fDLCalMonth}
                        onMonthChange={setFDLCalMonth}
                        startDate={fRelaisStartDate ? new Date(fRelaisStartDate + "T12:00:00") : new Date()}
                        C={C}
                        size="lg"
                      />

                      <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 12 }]}>Qui peut voir ce besoin ?</Text>
                      <View style={{ marginTop: 4 }}>
                        <SegmentedSwitch
                          value={fRelaisVisibleTo === "some"}
                          onChange={(v) => setFRelaisVisibleTo(v ? "some" : "all")}
                          leftLabel="👨‍👩‍👧 Tous les proches"
                          rightLabel="☑️ Certains"
                          C={C}
                        />
                      </View>

                      {fRelaisVisibleTo === "some" && (
                        fRelaisCandidatesLoading ? (
                          <ActivityIndicator color={C.accent} style={{ marginVertical: 16 }} />
                        ) : fRelaisCandidates.length === 0 ? (
                          <Text style={[styles.transportHint, { color: C.muted }]}>Aucun proche enregistré pour l'instant.</Text>
                        ) : (
                          <View style={{ marginTop: 10 }}>
                            {fRelaisCandidates.map((cand) => {
                              const key = relaisIdentityKey(cand.prenom, cand.nom);
                              const selected = fRelaisSelectedKeys.has(key);
                              return (
                                <TouchableOpacity
                                  key={key}
                                  style={[
                                    styles.claimOnCreateBtn,
                                    { backgroundColor: selected ? `${C.accent}22` : C.bg, borderColor: selected ? C.accent : C.border, marginTop: 8 },
                                  ]}
                                  onPress={() => {
                                    setFRelaisSelectedKeys((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(key)) next.delete(key); else next.add(key);
                                      return next;
                                    });
                                  }}
                                  activeOpacity={0.8}
                                >
                                  <Text style={[styles.claimOnCreateText, { color: selected ? C.accent : C.text }]}>
                                    {selected ? "✓ " : ""}{cand.prenom} {cand.nom}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )
                      )}
                    </View>
                  )}

                  {fCat !== "transport" && fCat !== "relais" && (
                    <>
                      <Text style={[styles.fieldLabel, { color: C.gold }]}>Photo (optionnelle)</Text>
                      {(fPhotoUri || fExistingPhoto) ? (
                        <View style={styles.photoPreviewRow}>
                          <Image
                            source={{ uri: fPhotoUri ?? taskPhotoUrl(spaceId, fExistingPhoto!) }}
                            style={styles.photoPreviewImg}
                            resizeMode="cover"
                          />
                          <TouchableOpacity
                            style={[styles.photoPickRemove, { backgroundColor: C.danger }]}
                            onPress={removeTaskPhoto}
                          >
                            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.photoPickAdd, { backgroundColor: C.bg, borderColor: C.border }]}
                          onPress={openTaskPhotoPicker}
                          disabled={pickingPhoto}
                        >
                          {pickingPhoto
                            ? <ActivityIndicator color={C.accent} size="small" />
                            : <Text style={[styles.photoPickAddText, { color: C.muted }]}>📷 Ajouter une photo</Text>
                          }
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={[
                          styles.claimOnCreateBtn,
                          { backgroundColor: fDLPickerOpen ? `${C.accent}22` : C.bg, borderColor: fDLPickerOpen ? C.accent : C.border, marginTop: 10 },
                        ]}
                        onPress={() => {
                          if (fDLPickerOpen) setFDateLimite("");
                          setFDLPickerOpen((v) => !v);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.claimOnCreateText, { color: fDLPickerOpen ? C.accent : C.text }]}>
                          {fDLPickerOpen ? "📅 Retirer la date" : "📅 Ajouter une échéance (optionnel)"}
                        </Text>
                      </TouchableOpacity>

                      {fDLPickerOpen && (
                        <>
                          <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 12 }]}>
                            Le besoin se fermera automatiquement passé cette date s'il n'est pas pris en charge
                          </Text>
                          <MiniCalendar
                            selDate={fDateLimite}
                            onSelect={setFDateLimite}
                            calMonth={fDLCalMonth}
                            onMonthChange={setFDLCalMonth}
                            startDate={new Date()}
                            C={C}
                            size="lg"
                          />
                        </>
                      )}
                    </>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.claimOnCreateBtn,
                      { backgroundColor: fUrgent ? C.danger : C.bg, borderColor: fUrgent ? C.danger : C.border, marginTop: 14 },
                    ]}
                    onPress={() => setFUrgent((v) => !v)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.claimOnCreateText, { color: fUrgent ? "#fff" : C.text }]}>
                      {fUrgent ? "🔴 Besoin urgent" : "⚪ Marquer comme urgent"}
                    </Text>
                  </TouchableOpacity>

                  {!!editTask?.claimed_by_prenom && (
                    <TouchableOpacity
                      style={[styles.claimOnCreateBtn, { backgroundColor: C.bg, borderColor: C.border, marginTop: 10 }]}
                      onPress={() => setDesengageEditTarget(editTask)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.claimOnCreateText, { color: C.text }]}>↩️ Me désengager</Text>
                    </TouchableOpacity>
                  )}

                  {!editTask && fCat !== "relais" && (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.claimOnCreateBtn,
                          {
                            backgroundColor: claimOnCreate ? `${C.accent}22` : C.bg,
                            borderColor: claimOnCreate ? C.accent : C.border,
                          },
                        ]}
                        onPress={toggleClaimOnCreate}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.claimOnCreateText, { color: claimOnCreate ? C.accent : C.text }]}>
                          {claimOnCreate ? "🙋 Tu t'en occupes déjà" : "🙋 Je vais me débrouiller"}
                        </Text>
                      </TouchableOpacity>

                      {claimOnCreate && (
                        <>
                          <Text style={[styles.claimOnCreateHint, { color: C.muted }]}>
                            Le besoin apparaîtra directement comme "Pris en charge" par toi.
                          </Text>

                          {!(claimPrenom.trim() && claimNom.trim()) && (
                            <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
                              <TextInput
                                style={[styles.input, { flex: 1, backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                                placeholder="Prénom *"
                                placeholderTextColor={C.muted}
                                value={claimPrenom}
                                onChangeText={setClaimPrenom}
                                autoCapitalize="words"
                              />
                              <TextInput
                                style={[styles.input, { flex: 1, backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                                placeholder="Nom *"
                                placeholderTextColor={C.muted}
                                value={claimNom}
                                onChangeText={setClaimNom}
                                autoCapitalize="words"
                              />
                            </View>
                          )}

                          {!isAdmin && (
                            <>
                              <Text style={[styles.fieldLabel, { color: C.gold }]}>
                                🔐 Code PIN (pour te désinscrire si besoin)
                              </Text>
                              <PinPad value={claimPin} onChange={setClaimPin} theme={C} />
                            </>
                          )}
                        </>
                      )}
                    </>
                  )}

                  <View style={styles.sheetBtns}>
                    <TouchableOpacity
                      onPress={() => setTaskForm(false)}
                      disabled={taskSaving}
                      style={[styles.btnSecondary, { borderColor: C.border }]}
                    >
                      <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={saveTask}
                      disabled={!fTitle.trim() || taskSaving || (!editTask && !claimOnCreateReady) || (!editTask && fCat === "transport" && !transportFormReady) || (!editTask && fCat === "relais" && !relaisFormReady)}
                      style={[
                        styles.btnPrimary,
                        { backgroundColor: C.accent },
                        (!fTitle.trim() || taskSaving || (!editTask && !claimOnCreateReady) || (!editTask && fCat === "transport" && !transportFormReady) || (!editTask && fCat === "relais" && !relaisFormReady)) && { opacity: 0.5 },
                      ]}
                    >
                      {taskSaving
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={styles.btnPrimaryText}>{editTask ? "Enregistrer" : "Créer"}</Text>
                      }
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL CHOIX SOURCE (caméra / galerie) ────────────────────────────── */}
      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <TouchableOpacity style={styles.centeredOverlay} activeOpacity={1} onPress={() => setPickerVisible(false)}>
          <TouchableOpacity activeOpacity={1}>
            <View style={[styles.centeredSheet, styles.pickerSheet, { backgroundColor: C.card, borderColor: C.accent }]}>
              <Text style={[styles.sheetTitle, { color: C.text, textAlign: "center" }]}>📷 Ajouter une photo</Text>
              <Text style={[styles.sheetSub, { color: C.muted }]}>Choisis la source de la photo</Text>

              <TouchableOpacity
                style={[styles.pickerOption, { borderColor: C.border }]}
                onPress={() => choosePickerSource(pickPhotoFromCamera)}
                activeOpacity={0.7}
              >
                <Text style={styles.pickerOptionIcon}>📷</Text>
                <Text style={[styles.pickerOptionText, { color: C.text }]}>Prendre une photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pickerOption, { borderColor: C.border }]}
                onPress={() => choosePickerSource(pickPhotoFromGallery)}
                activeOpacity={0.7}
              >
                <Text style={styles.pickerOptionIcon}>🖼️</Text>
                <Text style={[styles.pickerOptionText, { color: C.text }]}>Choisir dans la galerie</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setPickerVisible(false)}
                style={{ width: "100%", height: 48, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", marginTop: 12 }}
              >
                <Text style={{ fontFamily: "DM_Sans_600SemiBold", fontSize: 14, color: C.muted }}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── MODAL CHECKLIST : choix du contexte ─────────────────────────────
          Overlay en frère du sheet (jamais en ancêtre d'une ScrollView), même
          pattern que app/(admin)/settings.tsx MODAL CHRONOLOGIE : un
          TouchableOpacity ancêtre casse le geste de scroll sur Android. */}
      {/* ── MODAL CHECKLIST : flux unifié (choix du modèle → sélection des
          besoins → assistant séquentiel) dans un seul <Modal> plutôt que 3
          empilés — sur Android, fermer un <Modal> puis en rouvrir un autre
          juste après (même via setTimeout, cf. openChecklistFromForm) ne
          garantit pas que le nouveau Dialog natif s'affiche/réponde aux
          touches si le précédent n'a pas fini sa propre animation de
          fermeture. "Retour" ne rouvrait pas fiablement le picker malgré ce
          dance close→setTimeout→open ; regrouper les 3 écrans dans un seul
          Modal et ne faire varier que le contenu JS élimine cette course
          pour de bon, sans dépendre d'un timing natif non garanti. */}
      <Modal
        visible={checklistPicker || !!checklistContext || checklistWizardList.length > 0}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (checklistSaving) return;
          if (checklistWizardList.length > 0) { checklistWizardBack(); return; }
          if (checklistContext) { returnToChecklistPicker(); return; }
          setChecklistPicker(false);
        }}
      >
        <View style={styles.centeredOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              if (checklistSaving) return;
              if (checklistWizardList.length > 0) { checklistWizardBack(); return; }
              if (checklistContext) { returnToChecklistPicker(); return; }
              setChecklistPicker(false);
            }}
          />
          {checklistContext && checklistWizardList.length === 0 && (
          <View style={[styles.centeredSheet, { backgroundColor: C.card, borderColor: checklistContext ? CHECKLIST_COLORS[CHECKLIST_TEMPLATES[checklistContext].colorKey] : C.accent, maxHeight: "82%" }]}>
            {checklistContext && (() => {
              const tpl = CHECKLIST_TEMPLATES[checklistContext];
              const color = CHECKLIST_COLORS[tpl.colorKey];
              const items = tpl.groups.flatMap((g) => g.items);
              // "Tout cocher/décocher" ne porte que sur les items du modèle
              // encore sélectionnables (déjà-publiés exclus, ils sont non
              // interactifs — voir dup ci-dessous) : comparer à items.length
              // (qui inclut les déjà-publiés) empêchait le compte de jamais
              // atteindre le total dès qu'un item était déjà publié, figeant
              // le bouton sur "Tout cocher" sans effet visible.
              const selectableCount = items.filter((item) => !findDuplicateAdminTaskIfWall(item.title)).length;
              const customCount = checklistCustomItems.filter((title) => !findDuplicateAdminTaskIfWall(title)).length;
              const checkedCount = items.filter((item, i) => checklistChecked[i] && !findDuplicateAdminTaskIfWall(item.title)).length + customCount;
              const checkedTemplateCount = checkedCount - customCount;
              let runningIndex = -1;
              return (
                <>
                  <Text style={[styles.sheetTitle, { color: C.text }]}>{tpl.icon} {tpl.label}</Text>
                  <TouchableOpacity onPress={() => toggleAllChecklist(checkedTemplateCount < selectableCount)} activeOpacity={0.7}>
                    <Text style={[styles.checklistToggleAll, { color }]}>
                      {checkedTemplateCount === selectableCount ? "Tout décocher" : "Tout cocher"}
                    </Text>
                  </TouchableOpacity>

                  <ScrollView style={styles.checklistScroll} showsVerticalScrollIndicator nestedScrollEnabled>
                    {tpl.groups.map((group) => (
                      <View key={group.phase} style={{ marginBottom: 4 }}>
                        <Text style={[styles.checklistPhase, { color: C.muted }]}>{group.phase}</Text>
                        {group.items.map((item) => {
                          runningIndex += 1;
                          const i = runningIndex;
                          const checked = !!checklistChecked[i];
                          const dup = findDuplicateAdminTaskIfWall(item.title);
                          return (
                            <View key={i} style={[!!dup && { opacity: 0.55 }]}>
                              <TouchableOpacity
                                style={styles.checklistItemRow}
                                onPress={() => { if (dup) { setDuplicateTarget(dup); return; } toggleChecklistItem(i); }}
                                activeOpacity={0.7}
                              >
                                <View
                                  style={[
                                    styles.checklistBox,
                                    { borderColor: checked && !dup ? color : C.border, backgroundColor: checked && !dup ? color : "transparent" },
                                  ]}
                                >
                                  {checked && !dup && <Text style={styles.checklistBoxMark}>✓</Text>}
                                </View>
                                <View style={{ flex: 1 }}>
                                  <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
                                    <Text style={[styles.checklistItemTitle, { color: checked && !dup ? C.text : C.muted }]}>{item.title}</Text>
                                    {!!dup && (
                                      <View style={[styles.checklistUrgentChip, { backgroundColor: C.muted + "22" }]}>
                                        <Text style={[styles.checklistUrgentChipText, { color: C.muted }]}>déjà ajouté</Text>
                                      </View>
                                    )}
                                  </View>
                                  {!!item.description && (
                                    <Text style={[styles.checklistItemDesc, { color: C.muted }]}>{item.description}</Text>
                                  )}
                                  {!!item.piecesRequises?.length && (
                                    <Text style={[styles.checklistItemDesc, { color: C.muted }]}>
                                      📎 Pièces à réunir : {item.piecesRequises.join(", ")}
                                    </Text>
                                  )}
                                  {!!item.lienExterne && (
                                    <TouchableOpacity
                                      onPress={() => Linking.openURL(item.lienExterne!.url).catch(() => {})}
                                      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                                    >
                                      <Text style={[styles.checklistItemLink, { color }]}>🔗 {item.lienExterne.label}</Text>
                                    </TouchableOpacity>
                                  )}
                                  {item.recurrent === "mensuel" && (
                                    <Text style={[styles.checklistItemDesc, { color: C.muted }]}>🔁 Rappel à renouveler chaque mois</Text>
                                  )}
                                </View>
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                      </View>
                    ))}
                    {checklistCustomItems.map((title, i) => (
                      <View key={`custom-${i}`} style={styles.checklistItemRow}>
                        <View style={[styles.checklistBox, { borderColor: color, backgroundColor: color }]}>
                          <Text style={styles.checklistBoxMark}>✓</Text>
                        </View>
                        <Text style={[styles.checklistItemTitle, { color: C.text, flex: 1 }]}>{title}</Text>
                        <TouchableOpacity onPress={() => removeChecklistCustomItem(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Text style={{ color: C.muted, fontSize: 16 }}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>

                  <View style={[styles.divider, { backgroundColor: color }]} />

                  <View style={styles.groupAddRow}>
                    <TextInput
                      style={[styles.groupAddInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text, marginTop: 0 }]}
                      placeholder="Nom de l'item"
                      placeholderTextColor={C.muted}
                      value={checklistItemDraft}
                      onChangeText={setChecklistItemDraft}
                      onSubmitEditing={addChecklistCustomItem}
                    />
                    <TouchableOpacity
                      style={[styles.groupAddBtn, { borderColor: color, opacity: checklistItemDraft.trim() ? 1 : 0.5 }]}
                      onPress={addChecklistCustomItem}
                      disabled={!checklistItemDraft.trim()}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.groupAddBtnText, { color }]}>+ Ajouter un item</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.fieldLabel, { color: C.gold }]}>Où publier cette checklist ?</Text>
                  <TouchableOpacity style={styles.checklistItemRow} onPress={toggleChecklistPublishWall} activeOpacity={0.7}>
                    <View
                      style={[
                        styles.checklistBox,
                        { borderColor: checklistPublishToWall ? color : C.border, backgroundColor: checklistPublishToWall ? color : "transparent" },
                      ]}
                    >
                      {checklistPublishToWall && <Text style={styles.checklistBoxMark}>✓</Text>}
                    </View>
                    <Text style={[styles.checklistItemTitle, { color: C.text }]}>📢 Sur le Mur d'Entraide (visible par les proches)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.checklistItemRow} onPress={toggleChecklistPublishMine} activeOpacity={0.7}>
                    <View
                      style={[
                        styles.checklistBox,
                        { borderColor: checklistPublishToMine ? color : C.border, backgroundColor: checklistPublishToMine ? color : "transparent" },
                      ]}
                    >
                      {checklistPublishToMine && <Text style={styles.checklistBoxMark}>✓</Text>}
                    </View>
                    <Text style={[styles.checklistItemTitle, { color: C.text }]}>🔒 Dans « Mes Checklists » (privé, personnel)</Text>
                  </TouchableOpacity>

                  <Text style={[styles.publicNoticeText, { color: C.muted }]}>
                    ℹ️ {checklistPublishToWall && checklistPublishToMine
                      ? "Publiée sur le Mur d'Entraide et ajoutée à Mes Checklists, en restant liée : le statut se synchronise des deux côtés."
                      : checklistPublishToWall
                      ? "Publiée dans le Mur d'Entraide et visible par tous les visiteurs de l'espace."
                      : "Ajoutée uniquement dans « Mes Checklists » (Mon Compte), privée."}
                    {" "}L'échéance et l'urgence se règlent item par item à l'étape suivante.
                  </Text>

                  <View style={styles.sheetBtns}>
                    <TouchableOpacity
                      style={[styles.btnSecondary, { borderColor: C.border }]}
                      onPress={returnToChecklistPicker}
                    >
                      <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Retour</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btnPrimary, { backgroundColor: color, opacity: checkedCount === 0 ? 0.5 : 1 }]}
                      onPress={startChecklistWizard}
                      disabled={checkedCount === 0}
                    >
                      <Text style={styles.btnPrimaryText}>Suivant {checkedCount > 0 ? `(${checkedCount})` : ""} →</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
          )}

          {checklistWizardList.length > 0 && checklistContext && (() => {
            const color = CHECKLIST_COLORS[CHECKLIST_TEMPLATES[checklistContext].colorKey];
            const entry = checklistWizardList[checklistWizardStep];
            const fields = checklistWizardData[entry.key] ?? { dateLimite: "", urgent: !!entry.item.urgent, detail: "" };
            const isLast = checklistWizardStep === checklistWizardList.length - 1;
            return (
              <View style={[styles.centeredSheet, { backgroundColor: C.card, borderColor: color, maxHeight: "82%" }]}>
                <Text style={[styles.checklistWizardProgress, { color: C.muted }]}>
                  Item {checklistWizardStep + 1} / {checklistWizardList.length}
                </Text>
                <ScrollView style={styles.checklistScroll} showsVerticalScrollIndicator keyboardShouldPersistTaps="handled">
                  <Text style={[styles.sheetTitle, { color: C.text }]}>{entry.item.title}</Text>
                  {!!entry.item.description && (
                    <Text style={[styles.checklistItemDesc, { color: C.muted, marginBottom: 10 }]}>{entry.item.description}</Text>
                  )}

                  {entry.item.needsDetail && (
                    <>
                      <Text style={[styles.fieldLabel, { color: C.gold }]}>Précision (optionnel)</Text>
                      <TextInput
                        style={[styles.input, styles.checklistWizardDetailInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                        placeholder="Ex. chez qui, laquelle, pour qui, avec qui…"
                        placeholderTextColor={C.muted}
                        value={fields.detail}
                        onChangeText={(t) => updateChecklistWizardField(checklistWizardStep, { detail: t })}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                      />
                    </>
                  )}

                  {!fields.dateLimite ? (
                    <>
                      <Text style={[styles.fieldLabel, { color: C.gold }]}>Échéance (optionnel)</Text>
                      <MiniCalendar
                        selDate={fields.dateLimite}
                        onSelect={(d) => updateChecklistWizardField(checklistWizardStep, { dateLimite: d })}
                        calMonth={checklistWizardDLCalMonth}
                        onMonthChange={setChecklistWizardDLCalMonth}
                        startDate={new Date()}
                        C={C}
                        size="lg"
                      />
                    </>
                  ) : (
                    <>
                      <Text style={[styles.fieldLabel, { color: C.gold }]}>Échéance</Text>
                      <View
                        style={[
                          styles.claimOnCreateBtn,
                          { backgroundColor: C.bg, borderColor: C.border, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14 },
                        ]}
                      >
                        <Text style={[styles.claimOnCreateText, { color: C.text }]}>📅 {fields.dateLimite}</Text>
                        <TouchableOpacity
                          onPress={() => updateChecklistWizardField(checklistWizardStep, { dateLimite: "" })}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text style={[styles.claimOnCreateText, { color, marginTop: 0 }]}>✎ Modifier la date</Text>
                        </TouchableOpacity>
                      </View>

                      <Text style={[styles.fieldLabel, { color: C.gold }]}>Marquer Urgent</Text>
                      <TouchableOpacity
                        onPress={() => updateChecklistWizardField(checklistWizardStep, { urgent: !fields.urgent })}
                        activeOpacity={0.8}
                        style={[
                          styles.claimOnCreateBtn,
                          { backgroundColor: fields.urgent ? C.danger + "22" : C.bg, borderColor: fields.urgent ? C.danger : C.border },
                        ]}
                      >
                        <Text style={[styles.claimOnCreateText, { color: fields.urgent ? C.danger : C.text }]}>
                          {fields.urgent ? "🔴 Urgent" : "⚪ Marquer urgent"}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </ScrollView>

                <View style={styles.sheetBtns}>
                  <TouchableOpacity
                    style={[styles.btnSecondary, { borderColor: C.border }]}
                    onPress={checklistWizardBack}
                    disabled={checklistSaving}
                  >
                    <Text style={[styles.btnSecondaryText, { color: C.muted }]}>
                      {checklistWizardStep === 0 ? "Retour" : "Précédent"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btnPrimary, { backgroundColor: color, opacity: checklistSaving ? 0.5 : 1 }]}
                    onPress={checklistWizardNext}
                    disabled={checklistSaving}
                  >
                    {checklistSaving
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.btnPrimaryText}>{isLast ? "✅ Publier" : "Suivant →"}</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })()}

          {!checklistContext && checklistWizardList.length === 0 && checklistPicker && (
          <View style={[styles.centeredSheet, { backgroundColor: C.card, borderColor: C.gold, maxHeight: "82%" }]}>
            <Text style={[styles.sheetTitle, { color: C.text }]}>✨ Checklists suggérées</Text>
            <Text style={[styles.checklistIntro, { color: C.muted }]}>
              Choisis la situation qui correspond — tu pourras décocher ce qui ne s'applique pas avant d'ajouter.
            </Text>
            <TouchableOpacity
              onPress={openCustomChecklistModal}
              activeOpacity={0.8}
              style={{ width: "100%", height: 48, borderRadius: 10, borderWidth: 1, borderColor: C.gold, alignItems: "center", justifyContent: "center", marginBottom: 14 }}
            >
              <Text style={{ fontFamily: "DM_Sans_600SemiBold", fontSize: 14, color: C.gold }}>+ Créer une nouvelle checklist</Text>
            </TouchableOpacity>
            <ScrollView style={styles.checklistPickerScroll} showsVerticalScrollIndicator nestedScrollEnabled>
              {(Object.keys(CHECKLIST_TEMPLATES) as ChecklistContext[])
                .filter((ctx) => !CHECKLIST_TEMPLATES[ctx].personalOnly)
                .map((ctx) => {
                const tpl = CHECKLIST_TEMPLATES[ctx];
                const count = tpl.groups.reduce((n, g) => n + g.items.length, 0);
                const color = CHECKLIST_COLORS[tpl.colorKey];
                return (
                  <TouchableOpacity
                    key={ctx}
                    style={[styles.checklistCard, { borderColor: color, backgroundColor: color + "14" }]}
                    onPress={() => openChecklistContext(ctx)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.checklistCardIcon}>{tpl.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.checklistCardTitle, { color: C.text }]}>{tpl.label}</Text>
                      <Text style={[styles.checklistCardCount, { color: C.muted }]}>{count} besoins suggérés</Text>
                    </View>
                    <Text style={[styles.checklistCardArrow, { color }]}>→</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setChecklistPicker(false)}
              style={{ width: "100%", height: 48, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", marginTop: 10 }}
            >
              <Text style={{ fontFamily: "DM_Sans_600SemiBold", fontSize: 14, color: C.muted }}>Annuler</Text>
            </TouchableOpacity>
          </View>
          )}
        </View>
      </Modal>

      {/* ── MODAL CHECKLIST : créer une checklist perso ─────────────────────
          Ouvert depuis le popup de choix (bouton "+ Créer une nouvelle
          checklist") — même pattern de saisie que le popup de sélection des
          besoins d'un contexte suggéré ci-dessus. */}
      <Modal visible={customChecklistModal} transparent animationType="fade" onRequestClose={() => !customChecklistSaving && setCustomChecklistModal(false)}>
        <View style={styles.centeredOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => !customChecklistSaving && setCustomChecklistModal(false)} />
          <View style={[styles.centeredSheet, { backgroundColor: C.card, borderColor: C.gold, maxHeight: "82%" }]}>
            <Text style={[styles.sheetTitle, { color: C.text }]}>📋 Créer une checklist</Text>
            <Text style={[styles.checklistIntro, { color: C.muted }]}>
              Donne-lui un nom, puis ajoute ses premiers besoins.
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
              placeholder="Nom de la checklist"
              placeholderTextColor={C.muted}
              value={customChecklistName}
              onChangeText={setCustomChecklistName}
            />

            <ScrollView style={styles.checklistScroll} showsVerticalScrollIndicator nestedScrollEnabled>
              {customChecklistItems.length === 0 ? (
                <Text style={[styles.checklistItemDesc, { color: C.muted }]}>Aucun item pour le moment.</Text>
              ) : customChecklistItems.map((title, i) => {
                const dup = findDuplicateAdminTask(title);
                return (
                  <View key={i} style={styles.checklistItemRow}>
                    <View style={[styles.checklistBox, { borderColor: dup ? C.border : C.gold, backgroundColor: dup ? "transparent" : C.gold }]}>
                      {!dup && <Text style={styles.checklistBoxMark}>✓</Text>}
                    </View>
                    <Text style={[styles.checklistItemTitle, { color: dup ? C.muted : C.text, flex: 1 }]}>{title}</Text>
                    {!!dup && (
                      <View style={[styles.checklistUrgentChip, { backgroundColor: C.muted + "22" }]}>
                        <Text style={[styles.checklistUrgentChipText, { color: C.muted }]}>déjà ajouté</Text>
                      </View>
                    )}
                    <TouchableOpacity onPress={() => removeCustomChecklistItem(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={{ color: C.muted, fontSize: 16, marginLeft: 8 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>

            <View style={[styles.divider, { backgroundColor: C.gold }]} />

            <View style={styles.groupAddRow}>
              <TextInput
                style={[styles.groupAddInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text, marginTop: 0 }]}
                placeholder="Nom de l'item"
                placeholderTextColor={C.muted}
                value={customChecklistItemDraft}
                onChangeText={setCustomChecklistItemDraft}
                onSubmitEditing={addCustomChecklistItem}
              />
              <TouchableOpacity
                style={[styles.groupAddBtn, { borderColor: C.gold, opacity: customChecklistItemDraft.trim() ? 1 : 0.5 }]}
                onPress={addCustomChecklistItem}
                disabled={!customChecklistItemDraft.trim()}
                activeOpacity={0.8}
              >
                <Text style={[styles.groupAddBtnText, { color: C.gold }]}>+ Ajouter un item</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.publicNoticeText, { color: C.muted }]}>
              ℹ️ Cette checklist sera publiée dans le Mur d'Entraide et visible par tous les visiteurs de l'espace.
            </Text>

            <View style={styles.sheetBtns}>
              <TouchableOpacity
                style={[styles.btnSecondary, { borderColor: C.border }]}
                onPress={() => setCustomChecklistModal(false)}
                disabled={customChecklistSaving}
              >
                <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.btnPrimary,
                  { backgroundColor: C.gold, opacity: !customChecklistName.trim() || !customChecklistItems.length || customChecklistSaving ? 0.5 : 1 },
                ]}
                onPress={confirmCreateCustomChecklist}
                disabled={!customChecklistName.trim() || !customChecklistItems.length || customChecklistSaving}
              >
                {customChecklistSaving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnPrimaryText}>Créer et publier</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL "CRÉER UNE LISTE DE COURSES" ────────────────────────────────
          Ouvert au clic sur la catégorie "Courses" (selectCategory) ou via
          le bouton "Modifier la liste" — édite fCourseItems, qui n'est
          soumis à shopping_list_items qu'à la publication du besoin (voir
          confirmCreateTask). "Valider" referme ce popup et rouvre taskForm,
          jamais les deux <Modal> en même temps (contrainte Android). */}
      <Modal visible={coursesListModal} transparent animationType="fade" onRequestClose={closeCoursesListModal}>
        <View style={styles.centeredOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeCoursesListModal} />
          <View style={[styles.centeredSheet, { backgroundColor: C.card, borderColor: C.gold, maxHeight: "82%" }]}>
            <Text style={[styles.sheetTitle, { color: C.text }]}>🛒 Créer une liste de courses</Text>

            <ScrollView style={styles.checklistScroll} showsVerticalScrollIndicator nestedScrollEnabled>
              {fCourseItems.length === 0 ? (
                <Text style={[styles.checklistItemDesc, { color: C.muted }]}>Aucun article pour le moment.</Text>
              ) : fCourseItems.map((label, i) => (
                <View key={i} style={styles.checklistItemRow}>
                  <View style={[styles.checklistBox, { borderColor: C.gold, backgroundColor: C.gold }]}>
                    <Text style={styles.checklistBoxMark}>✓</Text>
                  </View>
                  <Text style={[styles.checklistItemTitle, { color: C.text, flex: 1 }]}>{label}</Text>
                  <TouchableOpacity onPress={() => removeFCourseItem(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={{ color: C.muted, fontSize: 16, marginLeft: 8 }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <View style={styles.groupAddRow}>
              <TextInput
                style={[styles.groupAddInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text, marginTop: 0 }]}
                placeholder="Nom de l'article"
                placeholderTextColor={C.muted}
                value={fCourseItemDraft}
                onChangeText={setFCourseItemDraft}
                onSubmitEditing={addFCourseItem}
              />
              <TouchableOpacity
                style={[styles.groupAddBtn, { borderColor: C.gold, opacity: fCourseItemDraft.trim() ? 1 : 0.5 }]}
                onPress={addFCourseItem}
                disabled={!fCourseItemDraft.trim()}
                activeOpacity={0.8}
              >
                <Text style={[styles.groupAddBtnText, { color: C.gold }]}>+ Ajouter</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={openRecurringItemsModal}
              activeOpacity={0.8}
              style={{ width: "100%", height: 44, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", marginTop: 12 }}
            >
              <Text style={{ fontFamily: "DM_Sans_600SemiBold", fontSize: 13.5, color: C.text }}>🔁 Produits récurrents</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={closeCoursesListModal}
              activeOpacity={0.85}
              style={[styles.btnPrimary, { backgroundColor: C.gold, marginTop: 14 }]}
            >
              <Text style={styles.btnPrimaryText}>Valider</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL "PRODUITS RÉCURRENTS" ───────────────────────────────────────
          Sous-popup de la liste de courses : tapoter un article l'ajoute à
          fCourseItems (dédoublonné) ; appui long réservé à l'admin ouvre une
          sélection multiple pour en supprimer du catalogue (n'affecte aucun
          besoin déjà publié — table recurring_shopping_items séparée). */}
      <Modal visible={recurringItemsModal} transparent animationType="fade" onRequestClose={closeRecurringItemsModal}>
        <View style={styles.centeredOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeRecurringItemsModal} />
          <View style={[styles.centeredSheet, { backgroundColor: C.card, borderColor: C.gold, maxHeight: "82%" }]}>
            <Text style={[styles.sheetTitle, { color: C.text }]}>🔁 Produits récurrents</Text>
            <Text style={[styles.checklistIntro, { color: C.muted }]}>
              {isAdmin ? "Touche un article pour l'ajouter à la liste, appui long pour sélectionner et supprimer." : "Touche un article pour l'ajouter à la liste."}
            </Text>

            {recurringSelectMode && (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <Text style={{ fontFamily: "DM_Sans_600SemiBold", fontSize: 13, color: C.text }}>{recurringSelected.size} sélectionné(s)</Text>
                <View style={{ flexDirection: "row", gap: 16 }}>
                  <TouchableOpacity onPress={() => { setRecurringSelectMode(false); setRecurringSelected(new Set()); }}>
                    <Text style={{ color: C.muted, fontFamily: "DM_Sans_600SemiBold", fontSize: 13 }}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={deleteSelectedRecurringItems} disabled={!recurringSelected.size}>
                    <Text style={{ color: C.danger, fontFamily: "DM_Sans_600SemiBold", fontSize: 13, opacity: recurringSelected.size ? 1 : 0.4 }}>🗑️ Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <ScrollView style={styles.checklistScroll} showsVerticalScrollIndicator nestedScrollEnabled>
              {recurringLoading ? (
                <ActivityIndicator color={C.accent} style={{ marginVertical: 16 }} />
              ) : recurringItems.length === 0 ? (
                <Text style={[styles.checklistItemDesc, { color: C.muted }]}>
                  Aucun produit récurrent pour le moment — la liste se construit au fur et à mesure des courses.
                </Text>
              ) : recurringItems.map((it) => {
                const selected = recurringSelected.has(it.id);
                return (
                  <Pressable
                    key={it.id}
                    onPress={() => (recurringSelectMode ? toggleRecurringSelected(it.id) : pickRecurringItem(it.label))}
                    onLongPress={() => startRecurringSelect(it.id)}
                    style={[styles.checklistItemRow, selected && { backgroundColor: "rgba(233,69,96,0.12)", borderRadius: 8 }]}
                  >
                    {recurringSelectMode && (
                      <View style={[styles.checklistBox, { borderColor: selected ? C.danger : C.border, backgroundColor: selected ? C.danger : "transparent" }]}>
                        {selected && <Text style={styles.checklistBoxMark}>✓</Text>}
                      </View>
                    )}
                    <Text style={[styles.checklistItemTitle, { color: C.text, flex: 1 }]}>{it.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              onPress={closeRecurringItemsModal}
              style={{ width: "100%", height: 48, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", marginTop: 12 }}
            >
              <Text style={{ fontFamily: "DM_Sans_600SemiBold", fontSize: 14, color: C.muted }}>Retour</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL CLAIM ───────────────────────────────────────────────────── */}
      {/* Le "Merci, tu t'en occupes" est fusionné dans cette même <Modal>
          (bascule interne via thanksModal) plutôt que d'être une seconde
          <Modal> ouverte juste après avoir fermé celle-ci : sur Android,
          fermer une Modal native et en ouvrir une autre dans la foulée fait
          se chevaucher les deux fenêtres et rend tout illisible par-dessus —
          un simple délai (setTimeout) ne suffisait pas à l'éviter de façon
          fiable, d'où la fusion en un seul <Modal> qui ne se ferme jamais
          entre les deux étapes. */}
      <Modal
        visible={!!claimTarget || thanksModal}
        transparent
        animationType={thanksModal || relaisClaimStepCentered ? "fade" : "slide"}
        onRequestClose={() => (thanksModal ? setThanksModal(false) : closeClaim())}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <TouchableOpacity
            style={thanksModal || relaisClaimStepCentered ? styles.centeredOverlay : styles.overlay}
            activeOpacity={1}
            onPress={() => { if (thanksModal) setThanksModal(false); else if (!claimSaving) closeClaim(); }}
          >
            <ScrollView
              contentContainerStyle={thanksModal || relaisClaimStepCentered ? styles.centeredOverlayScroll : styles.overlayScroll}
              keyboardShouldPersistTaps="handled"
            >
              <TouchableOpacity activeOpacity={1}>
                <View style={[thanksModal || relaisClaimStepCentered ? styles.centeredSheet : styles.sheet, { backgroundColor: C.card, borderColor: thanksModal ? C.gold : C.accent }]}>
                  {thanksModal ? (
                    <>
                      <View style={{ alignItems: "center", marginBottom: 16 }}>
                        <Text style={{ fontSize: 32, marginBottom: 6 }}>💛</Text>
                        <Text style={[styles.sheetTitle, { color: C.text }]}>Merci, tu t'en occupes</Text>
                        <Text style={[styles.sheetSub, { color: C.muted }]}>
                          {thanksModalCategory === "relais"
                            ? "Les autres personnes sollicitées pour ce besoin de relais seront informées que tu as pris le relais sur cette période."
                            : "Pense bien à revenir sur cette page et à cliquer sur \"Fait\" une fois que ce sera fait, pour que les autres le sachent."}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          setThanksModal(false);
                          router.navigate(isAdmin ? "/(admin)/home/calendar" : "/(visitor)/home/calendar");
                        }}
                        style={[styles.btnPrimary, { backgroundColor: C.gold, alignSelf: "stretch", paddingVertical: 18 }]}
                      >
                        <Text style={[styles.btnPrimaryText, { color: "#0D1B2E" }]}>J'ai compris</Text>
                      </TouchableOpacity>
                    </>
                  ) : claimTarget?.category === "relais" && relaisClaimStep === "choice" ? (
                    <>
                      <View style={{ alignItems: "center", marginBottom: 14 }}>
                        <Text style={{ fontSize: 32, marginBottom: 6 }}>🙋</Text>
                        <Text style={[styles.sheetTitle, { color: C.text }]}>Comment veux-tu aider ?</Text>
                        <Text style={[styles.sheetSub, { color: C.muted }]}>
                          {CATEGORY_ICONS[claimTarget.category]} {claimTarget.title}
                        </Text>
                        {relaisRequestedPeriodLabel(claimTarget) && (
                          <Text style={[styles.sheetSub, { color: C.gold, marginTop: 2 }]}>{relaisRequestedPeriodLabel(claimTarget)}</Text>
                        )}
                      </View>

                      <TouchableOpacity
                        style={[styles.claimOnCreateBtn, { backgroundColor: `${C.accent}22`, borderColor: C.accent, marginTop: 4 }]}
                        onPress={chooseRelaisFull}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.claimOnCreateText, { color: C.accent }]}>
                          🙋 Je m'en charge{(relaisCoverage[claimTarget.id]?.length ?? 0) > 0 ? " (le reste)" : ""}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.claimOnCreateBtn, { backgroundColor: C.bg, borderColor: C.border, marginTop: 8 }]}
                        onPress={chooseRelaisPeriod}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.claimOnCreateText, { color: C.text }]}>📅 Choisir une période</Text>
                      </TouchableOpacity>

                      <View style={styles.sheetBtns}>
                        <TouchableOpacity
                          onPress={closeClaim}
                          style={[styles.btnSecondary, { borderColor: C.border, alignSelf: "stretch", flex: 1 }]}
                        >
                          <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Annuler</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : claimTarget?.category === "relais" && relaisClaimStep === "period_start" ? (
                    <>
                      <View style={{ alignItems: "center", marginBottom: 14 }}>
                        <Text style={{ fontSize: 32, marginBottom: 6 }}>📅</Text>
                        <Text style={[styles.sheetTitle, { color: C.text }]}>Choisis ta période — Du</Text>
                        <Text style={[styles.sheetSub, { color: C.muted }]}>
                          {CATEGORY_ICONS[claimTarget.category]} {claimTarget.title}
                        </Text>
                        {relaisRequestedPeriodLabel(claimTarget) && (
                          <Text style={[styles.sheetSub, { color: C.gold, marginTop: 2 }]}>{relaisRequestedPeriodLabel(claimTarget)}</Text>
                        )}
                      </View>

                      <MiniCalendar
                        selDate={relaisClaimPeriodStart}
                        onSelect={setRelaisClaimPeriodStart}
                        calMonth={relaisClaimStartCalMonth}
                        onMonthChange={setRelaisClaimStartCalMonth}
                        startDate={claimTarget.relais_start_date ? new Date(claimTarget.relais_start_date + "T12:00:00") : new Date()}
                        allowedRange={claimTarget.relais_start_date && claimTarget.date_limite ? {
                          start: new Date(claimTarget.relais_start_date + "T12:00:00"),
                          end: new Date(claimTarget.date_limite + "T12:00:00"),
                        } : undefined}
                        C={C}
                        size="lg"
                      />

                      <View style={styles.sheetBtns}>
                        <TouchableOpacity
                          onPress={() => setRelaisClaimStep("choice")}
                          style={[styles.btnSecondary, { borderColor: C.border }]}
                        >
                          <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Retour</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={confirmRelaisPeriodStart}
                          disabled={!relaisClaimPeriodStart}
                          style={[
                            styles.btnPrimary,
                            { backgroundColor: C.accent },
                            !relaisClaimPeriodStart && { opacity: 0.5 },
                          ]}
                        >
                          <Text style={styles.btnPrimaryText}>Continuer</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : claimTarget?.category === "relais" && relaisClaimStep === "period_end" ? (
                    <>
                      <View style={{ alignItems: "center", marginBottom: 14 }}>
                        <Text style={{ fontSize: 32, marginBottom: 6 }}>📅</Text>
                        <Text style={[styles.sheetTitle, { color: C.text }]}>Choisis ta période — Au</Text>
                        <Text style={[styles.sheetSub, { color: C.muted }]}>
                          {CATEGORY_ICONS[claimTarget.category]} {claimTarget.title}
                        </Text>
                        {relaisRequestedPeriodLabel(claimTarget) && (
                          <Text style={[styles.sheetSub, { color: C.gold, marginTop: 2 }]}>{relaisRequestedPeriodLabel(claimTarget)}</Text>
                        )}
                      </View>

                      <MiniCalendar
                        selDate={relaisClaimPeriodEnd}
                        onSelect={setRelaisClaimPeriodEnd}
                        calMonth={relaisClaimEndCalMonth}
                        onMonthChange={setRelaisClaimEndCalMonth}
                        startDate={relaisClaimPeriodStart
                          ? new Date(relaisClaimPeriodStart + "T12:00:00")
                          : (claimTarget.relais_start_date ? new Date(claimTarget.relais_start_date + "T12:00:00") : new Date())}
                        allowedRange={claimTarget.relais_start_date && claimTarget.date_limite ? {
                          start: new Date(claimTarget.relais_start_date + "T12:00:00"),
                          end: new Date(claimTarget.date_limite + "T12:00:00"),
                        } : undefined}
                        C={C}
                        size="lg"
                      />

                      <View style={styles.sheetBtns}>
                        <TouchableOpacity
                          onPress={() => setRelaisClaimStep("period_start")}
                          style={[styles.btnSecondary, { borderColor: C.border }]}
                        >
                          <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Retour</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={confirmRelaisPeriod}
                          disabled={!relaisClaimPeriodValid}
                          style={[
                            styles.btnPrimary,
                            { backgroundColor: C.accent },
                            !relaisClaimPeriodValid && { opacity: 0.5 },
                          ]}
                        >
                          <Text style={styles.btnPrimaryText}>Continuer</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={{ alignItems: "center", marginBottom: 14 }}>
                        <Text style={{ fontSize: 32, marginBottom: 6 }}>🙋</Text>
                        <Text style={[styles.sheetTitle, { color: C.text }]}>Je m'en occupe</Text>
                        {claimTarget && (
                          <Text style={[styles.sheetSub, { color: C.muted }]}>
                            {CATEGORY_ICONS[claimTarget.category]} {claimTarget.title}
                          </Text>
                        )}
                        {claimTarget?.category === "relais" && relaisRequestedPeriodLabel(claimTarget) && (
                          <Text style={[styles.sheetSub, { color: C.gold, marginTop: 2 }]}>{relaisRequestedPeriodLabel(claimTarget)}</Text>
                        )}
                      </View>

                      {claimTarget?.category === "relais" && relaisClaimRanges.length > 0 && (
                        <View style={[styles.pinContext, { backgroundColor: C.bg, borderColor: C.border, marginBottom: 8 }]}>
                          <Text style={[styles.pinContextText, { color: C.text }]}>
                            📅 {relaisClaimRanges.map((r) => `du ${toFrShort(new Date(r.start_date + "T12:00:00"))} au ${toFrShort(new Date(r.end_date + "T12:00:00"))}`).join(", ")}
                          </Text>
                        </View>
                      )}

                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <TextInput
                          style={[styles.input, { flex: 1, backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                          placeholder="Prénom *"
                          placeholderTextColor={C.muted}
                          value={claimPrenom}
                          onChangeText={setClaimPrenom}
                          autoCapitalize="words"
                          autoFocus
                        />
                        <TextInput
                          style={[styles.input, { flex: 1, backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                          placeholder="Nom *"
                          placeholderTextColor={C.muted}
                          value={claimNom}
                          onChangeText={setClaimNom}
                          autoCapitalize="words"
                        />
                      </View>

                      {claimTarget?.category === "repas" && !!allergies && (
                        <View style={[styles.allergyBanner, { backgroundColor: "rgba(233,69,96,0.1)", borderColor: "rgba(233,69,96,0.35)" }]}>
                          <Text style={[styles.allergyBannerText, { color: C.danger }]}>
                            ⚠️ Allergies du patient : {allergies}
                          </Text>
                        </View>
                      )}

                      {claimTarget?.category !== "transport" && (
                        <>
                          <Text style={[styles.fieldLabel, { color: C.gold }]}>Photo (optionnelle)</Text>
                          {claimPhotoUri ? (
                            <View style={styles.photoPreviewRow}>
                              <Image source={{ uri: claimPhotoUri }} style={styles.photoPreviewImg} resizeMode="cover" />
                              <TouchableOpacity
                                style={[styles.photoPickRemove, { backgroundColor: C.danger }]}
                                onPress={removeClaimPhoto}
                              >
                                <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>✕</Text>
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={[styles.photoPickAdd, { backgroundColor: C.bg, borderColor: C.border }]}
                              onPress={openClaimPhotoPicker}
                              disabled={claimPickingPhoto}
                            >
                              {claimPickingPhoto
                                ? <ActivityIndicator color={C.accent} size="small" />
                                : <Text style={[styles.photoPickAddText, { color: C.muted }]}>📷 Ajouter une photo (ex : le plat préparé)</Text>
                              }
                            </TouchableOpacity>
                          )}
                        </>
                      )}

                      <TextInput
                        style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text, marginTop: 8 }]}
                        placeholder="Une précision (ou non)..."
                        placeholderTextColor={C.muted}
                        value={claimText}
                        onChangeText={setClaimText}
                        multiline
                      />

                      <View style={styles.sheetBtns}>
                        <TouchableOpacity
                          onPress={claimTarget?.category === "relais" ? () => setRelaisClaimStep(relaisClaimFullPeriod ? "choice" : "period_end") : closeClaim}
                          disabled={claimSaving}
                          style={[styles.btnSecondary, { borderColor: C.border }]}
                        >
                          <Text style={[styles.btnSecondaryText, { color: C.muted }]}>
                            {claimTarget?.category === "relais" ? "Retour" : "Annuler"}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={handleClaim}
                          disabled={!claimPrenom.trim() || !claimNom.trim() || claimPin.length < 4 || claimSaving
                            || (claimTarget?.category === "relais" && relaisClaimRanges.length === 0)}
                          style={[
                            styles.btnPrimary,
                            { backgroundColor: C.accent },
                            (!claimPrenom.trim() || !claimNom.trim() || claimPin.length < 4 || claimSaving
                              || (claimTarget?.category === "relais" && relaisClaimRanges.length === 0)) && { opacity: 0.5 },
                          ]}
                        >
                          {claimSaving
                            ? <ActivityIndicator color="#fff" size="small" />
                            : <Text style={styles.btnPrimaryText}>Confirmer</Text>
                          }
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL PROPOSITION (transport, autre horaire) ────────────────────── */}
      <Modal visible={!!proposeTarget} transparent animationType="slide" onRequestClose={() => setProposeTarget(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => !proposeSaving && setProposeTarget(null)}>
            <ScrollView contentContainerStyle={styles.overlayScroll} keyboardShouldPersistTaps="handled">
              <TouchableOpacity activeOpacity={1}>
                <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.accent }]}>
                  <View style={{ alignItems: "center", marginBottom: 14 }}>
                    <Text style={{ fontSize: 32, marginBottom: 6 }}>🕐</Text>
                    <Text style={[styles.sheetTitle, { color: C.text }]}>Proposer un horaire</Text>
                    {proposeTarget && (
                      <Text style={[styles.sheetSub, { color: C.muted }]}>
                        Demandé : {proposeTarget.transport_date && proposeTarget.transport_out_time
                          ? slotLabel(proposeTarget.transport_date, proposeTarget.transport_out_time) : "—"}
                        {proposeTarget.transport_round_trip && proposeTarget.transport_return_time
                          ? ` · retour ${proposeTarget.transport_return_time.replace(":", "h")}` : ""}
                      </Text>
                    )}
                  </View>

                  <Text style={[styles.fieldLabel, { color: C.gold }]}>Date proposée</Text>
                  <MiniCalendar
                    selDate={pDate}
                    onSelect={setPDate}
                    calMonth={pCalMonth}
                    onMonthChange={setPCalMonth}
                    startDate={new Date()}
                    C={C}
                    size="lg"
                  />

                  {proposeTarget?.transport_round_trip && (
                    <View style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
                      <TouchableOpacity
                        onPress={() => setPIncludeOut((v) => !v)}
                        style={[styles.legToggle, { borderColor: pIncludeOut ? C.accent : C.border, backgroundColor: pIncludeOut ? `${C.accent}22` : "transparent" }]}
                      >
                        <Text style={{ color: pIncludeOut ? C.accent : C.muted, fontFamily: "DM_Sans_600SemiBold", fontSize: 13 }}>
                          {pIncludeOut ? "☑" : "☐"} Aller
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setPIncludeReturn((v) => !v)}
                        style={[styles.legToggle, { borderColor: pIncludeReturn ? C.accent : C.border, backgroundColor: pIncludeReturn ? `${C.accent}22` : "transparent" }]}
                      >
                        <Text style={{ color: pIncludeReturn ? C.accent : C.muted, fontFamily: "DM_Sans_600SemiBold", fontSize: 13 }}>
                          {pIncludeReturn ? "☑" : "☐"} Retour
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {pIncludeOut && (
                    <>
                      <Text style={[styles.fieldLabel, { color: C.gold }]}>Heure aller</Text>
                      <TimeClockPicker value={pOutTime} onChange={setPOutTime} C={C} />
                    </>
                  )}

                  {proposeTarget?.transport_round_trip && pIncludeReturn && (
                    <>
                      <Text style={[styles.fieldLabel, { color: C.gold }]}>Heure retour</Text>
                      <TimeClockPicker value={pReturnTime} onChange={setPReturnTime} C={C} />
                    </>
                  )}

                  <TextInput
                    style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text, marginTop: 8 }]}
                    placeholder="Un mot pour expliquer (optionnel)"
                    placeholderTextColor={C.muted}
                    value={pNote}
                    onChangeText={setPNote}
                    multiline
                  />

                  {!(pPrenom.trim() && pNom.trim()) && (
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                      <TextInput
                        style={[styles.input, { flex: 1, backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                        placeholder="Prénom *"
                        placeholderTextColor={C.muted}
                        value={pPrenom}
                        onChangeText={setPPrenom}
                        autoCapitalize="words"
                      />
                      <TextInput
                        style={[styles.input, { flex: 1, backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                        placeholder="Nom *"
                        placeholderTextColor={C.muted}
                        value={pNom}
                        onChangeText={setPNom}
                        autoCapitalize="words"
                      />
                    </View>
                  )}

                  <View style={styles.sheetBtns}>
                    <TouchableOpacity
                      onPress={() => setProposeTarget(null)}
                      disabled={proposeSaving}
                      style={[styles.btnSecondary, { borderColor: C.border }]}
                    >
                      <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={submitTransportProposal}
                      disabled={!proposeFormReady || proposeSaving}
                      style={[
                        styles.btnPrimary,
                        { backgroundColor: C.accent },
                        (!proposeFormReady || proposeSaving) && { opacity: 0.5 },
                      ]}
                    >
                      {proposeSaving
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={styles.btnPrimaryText}>Proposer</Text>
                      }
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL PROPOSITIONS REÇUES (demandeur/admin consulte et valide) ──── */}
      <Modal visible={!!proposalsTarget} transparent animationType="fade" onRequestClose={() => setProposalsTarget(null)}>
        <View style={styles.centeredOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setProposalsTarget(null)} />
          <View style={[styles.centeredSheet, { backgroundColor: C.card, borderColor: C.accent, maxHeight: "82%" }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ alignItems: "center", marginBottom: 14 }}>
                    <Text style={{ fontSize: 32, marginBottom: 6 }}>🕐</Text>
                    <Text style={[styles.sheetTitle, { color: C.text }]}>Propositions reçues</Text>
                  </View>

                  {proposalsTarget && proposalsTarget.transport_proposals.length === 0 && (
                    <Text style={[styles.sheetSub, { color: C.muted, textAlign: "center" }]}>
                      Aucune proposition pour l'instant.
                    </Text>
                  )}

                  {proposalsTarget?.transport_proposals.map((p) => {
                    const offersOut = p.offers_out ?? true;
                    const offersReturn = p.offers_return ?? !!p.return_time;
                    const outDone = !!proposalsTarget.claimed_by_prenom;
                    const returnDone = !!proposalsTarget.transport_return_claimed_by_prenom;
                    return (
                      <View key={p.id} style={[styles.proposalRow, { borderColor: C.border }]}>
                        <Text style={[styles.proposalText, { color: C.text }]}>👤 {p.prenom} {p.nom}</Text>
                        {offersOut && (
                          <Text style={[styles.proposalText, { color: C.text }]}>
                            Aller : {p.out_time ? slotLabel(p.date, p.out_time) : "—"}
                          </Text>
                        )}
                        {offersReturn && (
                          <Text style={[styles.proposalText, { color: C.text }]}>
                            Retour : {p.return_time ? p.return_time.replace(":", "h") : "—"}
                          </Text>
                        )}
                        {p.note && <Text style={[styles.proposalNote, { color: C.muted }]}>{p.note}</Text>}
                        <View style={{ flexDirection: "row", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                          {offersOut && !outDone && (
                            <TouchableOpacity
                              style={[styles.actionSmall, { borderColor: C.success, backgroundColor: `${C.success}18` }]}
                              onPress={() => validateTransportLeg(proposalsTarget, p, "out")}
                            >
                              <Text style={[styles.actionSmallText, { color: C.success }]}>✓ Valider l'aller</Text>
                            </TouchableOpacity>
                          )}
                          {proposalsTarget.transport_round_trip && offersReturn && !returnDone && (
                            <TouchableOpacity
                              style={[styles.actionSmall, { borderColor: C.success, backgroundColor: `${C.success}18` }]}
                              onPress={() => validateTransportLeg(proposalsTarget, p, "return")}
                            >
                              <Text style={[styles.actionSmallText, { color: C.success }]}>✓ Valider le retour</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}

                  {proposalsTarget && proposalsTarget.transport_proposals.length > 0 && (
                    <TouchableOpacity
                      style={[styles.actionSmall, { borderColor: C.border, marginTop: 10, alignSelf: "flex-start" }]}
                      onPress={() => rejectTransportProposals(proposalsTarget)}
                    >
                      <Text style={[styles.actionSmallText, { color: C.muted }]}>Aucune ne convient</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={() => setProposalsTarget(null)}
                    style={{ width: "100%", height: 48, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", marginTop: 14 }}
                  >
                    <Text style={{ fontFamily: "DM_Sans_600SemiBold", fontSize: 14, color: C.muted }}>Fermer</Text>
                  </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── MODAL PIN (désinscrire) ────────────────────────── */}
      <Modal visible={!!pinModal} transparent animationType="fade" onRequestClose={() => setPinModal(null)}>
        <TouchableOpacity style={styles.centeredOverlay} activeOpacity={1} onPress={() => setPinModal(null)}>
          <TouchableOpacity activeOpacity={1}>
            <View style={[styles.centeredSheet, { backgroundColor: C.card, borderColor: C.accent }]}>
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 32, marginBottom: 6 }}>🔐</Text>
              <Text style={[styles.sheetTitle, { color: C.text }]}>Confirmer avec ton PIN</Text>
              <Text style={[styles.sheetSub, { color: C.muted }]}>
                Saisis ton PIN pour te désinscrire de ce besoin.
              </Text>
            </View>

            {pinModal && (
              <View style={[styles.pinContext, { backgroundColor: C.bg, borderColor: C.border }]}>
                <Text style={[styles.pinContextText, { color: C.text }]}>
                  {CATEGORY_ICONS[pinModal.task.category]} {pinModal.task.title}
                </Text>
                <Text style={[styles.pinContextSub, { color: C.muted }]}>
                  Pris en charge par {pinModal.action === "unclaim_relais"
                    ? `${pinModal.coverage.prenom} ${pinModal.coverage.nom}`
                    : pinModal.leg === "return"
                      ? `${pinModal.task.transport_return_claimed_by_prenom} ${pinModal.task.transport_return_claimed_by_nom}`
                      : `${pinModal.task.claimed_by_prenom} ${pinModal.task.claimed_by_nom}`}
                </Text>
              </View>
            )}

            <PinPad value={pinEntry} onChange={setPinEntry} theme={C} hasError={pinError} />

            {pinError && (
              <Text style={[styles.pinErrorText, { color: C.danger }]}>PIN incorrect.</Text>
            )}

            <View style={[styles.sheetBtns, { marginTop: 16 }]}>
              <TouchableOpacity
                onPress={() => setPinModal(null)}
                style={[styles.btnSecondary, { borderColor: C.border }]}
              >
                <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={checkPin}
                disabled={pinEntry.length < 4}
                style={[
                  styles.btnPrimary,
                  { backgroundColor: C.accent },
                  pinEntry.length < 4 && { opacity: 0.5 },
                ]}
              >
                <Text style={styles.btnPrimaryText}>Me désinscrire</Text>
              </TouchableOpacity>
            </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── MODAL "Fait" (photo optionnelle + PIN si visiteur) ─────────────── */}
      <Modal visible={!!doneTarget} transparent animationType="fade" onRequestClose={() => setDoneTarget(null)}>
        <TouchableOpacity style={styles.centeredOverlay} activeOpacity={1} onPress={() => !doneSaving && setDoneTarget(null)}>
          <TouchableOpacity activeOpacity={1}>
            <View style={[styles.centeredSheet, { backgroundColor: C.card, borderColor: C.success }]}>
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 32, marginBottom: 6 }}>✓</Text>
              <Text style={[styles.sheetTitle, { color: C.text }]}>Marquer comme fait</Text>
              <Text style={[styles.sheetSub, { color: C.muted }]}>
                Tu peux ajouter une photo (optionnel).
              </Text>
            </View>

            {donePhotoUri ? (
              <View style={styles.photoPreviewRow}>
                <Image source={{ uri: donePhotoUri }} style={styles.photoPreviewImg} resizeMode="cover" />
                <TouchableOpacity onPress={removeDonePhoto} style={[styles.photoPickRemove, { backgroundColor: C.danger }]}>
                  <Text style={{ color: "#fff", fontSize: 12 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={openDonePhotoPicker}
                disabled={donePickingPhoto}
                style={[styles.photoPickAdd, { backgroundColor: C.bg, borderColor: C.border }]}
              >
                {donePickingPhoto
                  ? <ActivityIndicator color={C.accent} size="small" />
                  : <Text style={[styles.photoPickAddText, { color: C.muted }]}>📷 Ajouter une photo</Text>
                }
              </TouchableOpacity>
            )}

            {!isAdmin && !donePinVerified && (
              <>
                <Text style={[styles.sheetSub, { color: C.muted, marginTop: 16 }]}>
                  Saisis ton PIN pour confirmer.
                </Text>
                <PinPad value={donePin} onChange={setDonePin} theme={C} hasError={donePinError} />
                {donePinError && (
                  <Text style={[styles.pinErrorText, { color: C.danger }]}>PIN incorrect.</Text>
                )}
              </>
            )}

            <View style={[styles.sheetBtns, { marginTop: 16 }]}>
              <TouchableOpacity
                onPress={() => setDoneTarget(null)}
                disabled={doneSaving}
                style={[styles.btnSecondary, { borderColor: C.border }]}
              >
                <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmDone}
                disabled={doneSaving || (!isAdmin && !donePinVerified && donePin.length < 4)}
                style={[
                  styles.btnPrimary,
                  { backgroundColor: C.success },
                  (doneSaving || (!isAdmin && !donePinVerified && donePin.length < 4)) && { opacity: 0.5 },
                ]}
              >
                {doneSaving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.btnPrimaryText}>✓ Fait !</Text>
                }
              </TouchableOpacity>
            </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <ConfirmModal
        visible={!!deleteTaskTarget}
        title="Supprimer ce besoin ?"
        message={
          deleteTaskTarget && deleteTaskTarget.author_pin !== "ADMIN" && deleteTaskTarget.author_prenom && !isAuthor(deleteTaskTarget)
            ? `${deleteTaskTarget.title}\n\n${deleteTaskTarget.author_prenom} recevra un message l'informant que sa publication a été supprimée.`
            : deleteTaskTarget?.title
        }
        confirmLabel="Supprimer"
        saving={deleteTaskSaving}
        onCancel={() => setDeleteTaskTarget(null)}
        onConfirm={confirmDeleteTask}
        C={C}
      />

      <ConfirmModal
        visible={!!selfDeleteTaskTarget}
        title="Supprimer définitivement ce besoin ?"
        message={selfDeleteTaskTarget?.title}
        confirmLabel="Supprimer définitivement"
        saving={selfDeleteTaskSaving}
        onCancel={() => setSelfDeleteTaskTarget(null)}
        onConfirm={confirmSelfDeleteTask}
        C={C}
      />

      <ConfirmModal
        visible={!!deleteBatchTarget}
        icon="🗂️"
        title="Supprimer aussi le reste de la liste ?"
        message={`Ce besoin faisait partie d'une checklist. ${deleteBatchTarget?.siblings.length} autre${deleteBatchTarget && deleteBatchTarget.siblings.length > 1 ? "s" : ""} item${deleteBatchTarget && deleteBatchTarget.siblings.length > 1 ? "s" : ""} de cette liste ${deleteBatchTarget && deleteBatchTarget.siblings.length > 1 ? "sont encore ouverts" : "est encore ouvert"} : les supprimer aussi ?${deleteBatchTarget?.siblings.some((s) => s.author_pin !== "ADMIN" && s.author_prenom) ? "\n\nLeurs auteurs recevront un message les informant de cette suppression." : ""}`}
        cancelLabel="Non, garder"
        confirmLabel={deleteBatchTarget ? `Supprimer les ${deleteBatchTarget.siblings.length}` : "Supprimer"}
        saving={deleteBatchSaving}
        onCancel={closeDeleteBatch}
        onConfirm={confirmDeleteBatch}
        C={C}
      />

      <ConfirmModal
        visible={!!deleteLinkedPersonalTarget}
        icon="📋"
        title="Supprimer aussi de Mes Checklists ?"
        message="Ce besoin était aussi lié à un item personnel dans Mes Checklists. Le supprimer aussi, ou le garder en privé ?"
        cancelLabel="Non, garder"
        confirmLabel="Supprimer aussi"
        saving={deleteLinkedPersonalSaving}
        onCancel={() => setDeleteLinkedPersonalTarget(null)}
        onConfirm={confirmDeleteLinkedPersonal}
        C={C}
      />

      <ConfirmModal
        visible={!!unclaimConfirm}
        icon="🙋"
        title="Te désinscrire de cette tâche ?"
        message={unclaimConfirm?.task.title}
        confirmLabel="Me désinscrire"
        onCancel={() => setUnclaimConfirm(null)}
        onConfirm={confirmUnclaimSelf}
        C={C}
      />

      <ConfirmModal
        visible={!!desengageEditTarget}
        icon="↩️"
        title="Te désengager de ce besoin ?"
        message={
          desengageEditTarget
            ? `${desengageEditTarget.claimed_by_prenom} ${desengageEditTarget.claimed_by_nom} sera retiré et le besoin rouvert pour tout le monde.`
            : undefined
        }
        confirmLabel="Me désengager"
        onCancel={() => setDesengageEditTarget(null)}
        onConfirm={confirmDesengageEdit}
        C={C}
      />

      <ConfirmModal
        visible={bulkDeleteConfirm}
        title={`Supprimer ${selectedTaskIds.size} besoin${selectedTaskIds.size > 1 ? "s" : ""} ?`}
        message={
          tasks.some((t) => {
            if (!selectedTaskIds.has(t.id) || !t.author_prenom) return false;
            return isAdmin ? t.author_pin !== "ADMIN" : !isAuthor(t);
          })
            ? "Les auteurs concernés recevront un message les informant de cette suppression."
            : undefined
        }
        confirmLabel="Supprimer"
        saving={bulkDeleteSaving}
        onCancel={() => setBulkDeleteConfirm(false)}
        onConfirm={confirmBulkDelete}
        C={C}
      />

      <ShoppingListModal
        visible={!!shoppingListTask}
        onClose={() => {
          setShoppingListTask(null);
          loadCourseContributors(tasks.filter((t) => t.category === "courses").map((t) => t.id));
        }}
        C={C}
        task={shoppingListTask}
        isAdmin={isAdmin}
        spaceId={spaceId}
        isAuthor={!!shoppingListTask && isAuthor(shoppingListTask)}
      />

      {/* ── MODAL DOUBLON (besoin administratif déjà publié) ─────────────── */}
      <Modal visible={!!duplicateTarget} transparent animationType="fade" onRequestClose={() => setDuplicateTarget(null)}>
        <TouchableOpacity style={styles.centeredOverlay} activeOpacity={1} onPress={() => setDuplicateTarget(null)}>
          <TouchableOpacity activeOpacity={1}>
            <View style={[styles.centeredSheet, { backgroundColor: C.card, borderColor: C.gold }]}>
            {duplicateTarget && (
              <>
                <Text style={{ fontSize: 32, textAlign: "center", marginBottom: 8 }}>⚠️</Text>
                <Text style={[styles.sheetTitle, { color: C.text, textAlign: "center" }]}>Ce besoin existe déjà</Text>
                <Text style={[styles.sheetSub, { color: C.muted, textAlign: "center", marginTop: 4 }]}>
                  Créé le {toFrShort(new Date(duplicateTarget.created_at))}
                  {[duplicateTarget.author_prenom, duplicateTarget.author_nom].filter(Boolean).length
                    ? ` par ${[duplicateTarget.author_prenom, duplicateTarget.author_nom].filter(Boolean).join(" ")}`
                    : ""}
                </Text>

                <View style={[styles.taskCard, { backgroundColor: C.bg, borderColor: C.border, marginTop: 14, marginBottom: 4 }]}>
                  <View style={styles.taskHeader}>
                    <View style={[styles.catBadge, { backgroundColor: `${C.accent}22` }]}>
                      <Text style={styles.catIcon}>{CATEGORY_ICONS[duplicateTarget.category]}</Text>
                      <Text style={[styles.catLabel, { color: C.accent }]}>{CATEGORY_LABELS[duplicateTarget.category]}</Text>
                    </View>
                  </View>
                  <Text style={[styles.taskTitle, { color: C.text }]}>{duplicateTarget.title}</Text>
                  {!!duplicateTarget.description && (
                    <Text style={[styles.taskDesc, { color: C.muted }]}>{duplicateTarget.description}</Text>
                  )}
                </View>

                <View style={{ gap: 8, marginTop: 12, width: "100%" }}>
                  <TouchableOpacity
                    onPress={claimDuplicate}
                    activeOpacity={0.85}
                    style={{ width: "100%", height: 48, borderRadius: 10, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" }}
                  >
                    <Text style={{ fontFamily: "DM_Sans_700Bold", fontSize: 15, color: "#fff" }}>🙋 Je m'en occupe</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={openDuplicateModify}
                    activeOpacity={0.85}
                    style={{ width: "100%", height: 48, borderRadius: 10, backgroundColor: C.gold, alignItems: "center", justifyContent: "center" }}
                  >
                    <Text style={{ fontFamily: "DM_Sans_700Bold", fontSize: 15, color: "#0D1B2E" }}>✏️ Modifier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setDuplicateTarget(null)}
                    activeOpacity={0.75}
                    style={{ width: "100%", height: 48, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center" }}
                  >
                    <Text style={{ fontFamily: "DM_Sans_600SemiBold", fontSize: 14, color: C.muted }}>Annuler</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── MODAL MODIFIER LA DESCRIPTION (depuis le doublon) ─────────────── */}
      <Modal visible={!!modifyTarget} transparent animationType="fade" onRequestClose={() => setModifyTarget(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.centeredOverlay} activeOpacity={1} onPress={() => !modifySaving && setModifyTarget(null)}>
            <TouchableOpacity activeOpacity={1}>
                <View style={[styles.centeredSheet, { backgroundColor: C.card, borderColor: C.accent }]}>
                  <View style={{ alignItems: "center", marginBottom: 14 }}>
                    <Text style={{ fontSize: 32, marginBottom: 6 }}>✏️</Text>
                    <Text style={[styles.sheetTitle, { color: C.text }]}>Modifier la description</Text>
                    {modifyTarget && (
                      <Text style={[styles.sheetSub, { color: C.muted }]}>
                        {CATEGORY_ICONS[modifyTarget.category]} {modifyTarget.title}
                      </Text>
                    )}
                  </View>
                  <TextInput
                    style={[styles.input, styles.descArea, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                    value={modifyDesc}
                    onChangeText={setModifyDesc}
                    placeholder="Description du besoin"
                    placeholderTextColor={C.muted}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  <View style={styles.sheetBtns}>
                    <TouchableOpacity
                      style={[styles.btnSecondary, { borderColor: C.border }]}
                      onPress={() => setModifyTarget(null)}
                      disabled={modifySaving}
                    >
                      <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btnPrimary, { backgroundColor: C.accent, opacity: modifySaving ? 0.6 : 1 }]}
                      onPress={saveModifyDesc}
                      disabled={modifySaving}
                    >
                      {modifySaving
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.btnPrimaryText}>Enregistrer</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {selectionMode ? (
        <View style={[styles.selectionBar, { backgroundColor: C.card, borderColor: C.border }]}>
          <TouchableOpacity onPress={exitSelection} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.undoBtn, { color: C.muted }]}>Annuler</Text>
          </TouchableOpacity>
          <Text style={[styles.undoText, { color: C.text }]}>
            {selectedTaskIds.size} sélectionné{selectedTaskIds.size > 1 ? "s" : ""}
          </Text>
          <TouchableOpacity onPress={() => setBulkDeleteConfirm(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.undoBtn, { color: C.danger }]}>🗑️ Supprimer</Text>
          </TouchableOpacity>
        </View>
      ) : !!batchUndo ? (
        <View style={[styles.undoBar, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.undoText, { color: C.text }]}>
            {batchUndo.count} besoin{batchUndo.count > 1 ? "s" : ""} ajouté{batchUndo.count > 1 ? "s" : ""} ✓
          </Text>
          <TouchableOpacity onPress={undoBatch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.undoBtn, { color: C.danger }]}>Annuler</Text>
          </TouchableOpacity>
        </View>
      ) : !!toast && (
        <View style={[styles.toast, { backgroundColor: C.success }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 15, textAlign: "center", marginBottom: 6 },
  emptyHint: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center" },

  header: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18 },
  subHeader: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  subHeaderRow: { flexDirection: "row", gap: 10 },
  addBtn: { flex: 1, minWidth: 0, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  addBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#0D1B2E" },

  catTabsBar: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", paddingHorizontal: 10, paddingVertical: 10, gap: 8, borderBottomWidth: 1 },
  catTab: { width: "31%", borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 4, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  catTabIcon: { fontSize: 13 },
  catTabLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, textAlign: "center" },

  sectionBar: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  sectionCount: { fontFamily: "DM_Sans_400Regular", fontSize: 12 },

  openFilterChip: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  openFilterDot: { width: 7, height: 7, borderRadius: 4 },
  openFilterIcon: { fontSize: 11 },

  listPad: { padding: 14, paddingBottom: 40 },
  listSectionHeader: { fontFamily: "DM_Sans_700Bold", fontSize: 14, marginTop: 16, marginBottom: 8 },
  listSubsectionHeader: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginTop: 10, marginBottom: 6 },

  taskCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  taskHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" },
  selectDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  selectDotCheck: { color: "#fff", fontSize: 13, fontFamily: "DM_Sans_700Bold" },
  catBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  catIcon: { fontSize: 14 },
  catLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11 },
  statusBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11 },
  iconBtn: { width: 30, height: 30, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  taskDeletedBanner: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, lineHeight: 17, marginBottom: 6 },
  taskTitle: { fontFamily: "DM_Sans_700Bold", fontSize: 15, marginBottom: 4 },
  taskDesc: { fontFamily: "DM_Sans_400Regular", fontSize: 13, lineHeight: 20, marginBottom: 6 },
  taskModified: { fontFamily: "DM_Sans_400Regular", fontSize: 11.5, fontStyle: "italic", marginBottom: 6 },
  taskPhoto: { width: "100%", height: 140, borderRadius: 10, marginBottom: 6 },
  claimerRow: { borderWidth: 1, borderRadius: 8, padding: 8, marginVertical: 8 },
  claimerText: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },
  claimedPhoto: { width: "100%", height: 120, borderRadius: 8, marginTop: 8 },
  claimBtn: { borderRadius: 10, paddingVertical: 10, alignItems: "center", marginTop: 8 },
  claimBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 13, color: "#fff" },
  actionSmall: { borderWidth: 1, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 14 },
  actionSmallText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
  legToggle: { borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },

  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontFamily: "DM_Sans_400Regular", fontSize: 15, marginBottom: 10 },
  descArea: { height: 80, textAlignVertical: "top" },
  fieldLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 },
  transportHint: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginBottom: 8, marginTop: -4 },
  fixedLocationBox: { justifyContent: "center" },
  catGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginBottom: 4 },
  catOption: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 6, minWidth: "45%" },
  catOptionIcon: { fontSize: 16 },
  catOptionLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },

  allergyBanner: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 4, marginBottom: 10 },
  allergyBannerText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, lineHeight: 19 },

  transportForm: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 },
  transportInfo: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 8, gap: 4 },
  transportInfoText: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },
  swapBtnRow: { alignItems: "center", marginBottom: 10 },
  swapBtn: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16 },
  swapBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 13, color: "#0D1B2E", textAlign: "center" },
  transportFlexible: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, marginTop: 2 },
  proposalRow: { borderTopWidth: 1, paddingTop: 8, marginTop: 2 },
  proposalText: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },
  proposalNote: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2, fontStyle: "italic" },

  photoPreviewRow: { position: "relative", marginBottom: 4 },
  photoPreviewImg: { width: "100%", height: 140, borderRadius: 10 },
  photoPickRemove: { position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  photoPickAdd: { borderWidth: 1, borderStyle: "dashed", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginBottom: 4 },
  photoPickAddText: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },

  claimOnCreateBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 10 },
  claimOnCreateText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  claimOnCreateHint: { fontFamily: "DM_Sans_400Regular", fontSize: 12, lineHeight: 17, marginTop: 8, marginBottom: 10, textAlign: "center" },


  pinContext: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 16 },
  pinContextText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  pinContextSub: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 4 },
  pinErrorText: { fontFamily: "DM_Sans_400Regular", fontSize: 12, textAlign: "center", marginTop: 8 },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "flex-end" },
  overlayScroll: { flexGrow: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, padding: 20, paddingBottom: 40, marginBottom: 12 },

  // Centered overlay / sheet (for small popups, distinct from the bottom-sheet pair above)
  centeredOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "center", alignItems: "center" },
  centeredOverlayScroll: { flexGrow: 1, justifyContent: "center", alignItems: "center" },
  centeredSheet: { width: "88%", borderRadius: 20, borderWidth: 1, padding: 24 },
  pickerSheet: { alignItems: "stretch" },
  pickerOption: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, marginTop: 12 },
  pickerOptionIcon: { fontSize: 20 },
  pickerOptionText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 15 },

  sheetTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 4 },
  sheetSub: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginBottom: 4, textAlign: "center" },
  sheetBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
  btnPrimary: { flex: 1.3, borderRadius: 10, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  btnPrimaryText: { fontFamily: "DM_Sans_700Bold", fontSize: 15, color: "#fff" },
  btnSecondary: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  btnSecondaryText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },

  toast: { position: "absolute", bottom: 24, alignSelf: "center", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  toastText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, color: "#fff" },

  // Checklists administratives suggérées (MVP)
  checklistBanner: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 14, marginTop: 10, borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 },
  checklistBannerIcon: { fontSize: 18 },
  checklistBannerText: { flex: 1, fontFamily: "DM_Sans_600SemiBold", fontSize: 13.5, textAlign: "center" },
  checklistBannerArrow: { fontFamily: "DM_Sans_700Bold", fontSize: 16 },
  checklistIntro: { fontFamily: "DM_Sans_400Regular", fontSize: 13, lineHeight: 18, marginBottom: 14 },
  checklistCard: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1.5, borderRadius: 14, padding: 14, marginBottom: 10 },
  checklistCardIcon: { fontSize: 26 },
  checklistCardTitle: { fontFamily: "DM_Sans_700Bold", fontSize: 15 },
  checklistCardCount: { fontFamily: "DM_Sans_400Regular", fontSize: 12.5, marginTop: 2 },
  checklistCardArrow: { fontFamily: "DM_Sans_700Bold", fontSize: 18 },
  checklistToggleAll: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12.5, marginBottom: 10 },
  checklistScroll: { height: 340 },
  checklistPickerScroll: { maxHeight: 340 },
  checklistItemLink: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12.5, lineHeight: 17, marginTop: 2, textDecorationLine: "underline" },
  checklistPhase: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginTop: 10, marginBottom: 6 },
  checklistItemRow: { flexDirection: "row", gap: 10, paddingVertical: 8, alignItems: "flex-start" },
  checklistBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginTop: 1 },
  checklistBoxMark: { color: "#fff", fontSize: 13, fontFamily: "DM_Sans_700Bold" },
  checklistItemTitle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14, flexShrink: 1 },
  checklistItemDesc: { fontFamily: "DM_Sans_400Regular", fontSize: 12.5, lineHeight: 17, marginTop: 2 },
  checklistUrgentChip: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 1, marginLeft: 8 },
  checklistUrgentChipText: { fontFamily: "DM_Sans_700Bold", fontSize: 9.5, letterSpacing: 0.4, textTransform: "uppercase" },
  // Assistant séquentiel (un item à la fois) : progression + champ de
  // précision et photo en taille normale (styles.input), contrairement à
  // l'ancien champ inline serré sous chaque case à cocher — trop petit et
  // au texte gris rogné (retour visiteur).
  checklistWizardProgress: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", textAlign: "center", marginBottom: 6 },
  checklistWizardDetailInput: { minHeight: 70 },

  // Ligne d'ajout d'item perso "brouillon" (checklist suggérée ou perso) —
  // même gabarit que components/MyChecklist.tsx (groupAddRow et alentours),
  // pour une fonction identique entre Mon Compte et Entraide.
  divider: { height: 2, borderRadius: 1, marginVertical: 14, opacity: 0.6 },
  groupAddRow: { padding: 6, paddingTop: 2 },
  groupAddInput: { borderWidth: 1, borderRadius: 10, padding: 10, fontFamily: "DM_Sans_400Regular", fontSize: 13, marginTop: 6 },
  groupAddBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center", marginTop: 6 },
  groupAddBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  publicNoticeText: { fontFamily: "DM_Sans_400Regular", fontSize: 12, lineHeight: 16, marginTop: 12, marginBottom: 4 },

  // Bandeau "Annuler" temporaire après un ajout groupé — remplace le toast
  // le temps où l'annulation reste possible (voir triggerBatchUndo).
  undoBar: {
    position: "absolute", bottom: 24, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 14,
    borderWidth: 1, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10,
  },
  undoText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  undoBtn: { fontFamily: "DM_Sans_700Bold", fontSize: 13 },

  // Barre de sélection multiple (admin) — même gabarit que undoBar mais
  // étalée sur la largeur (3 éléments : Annuler / compteur / Supprimer).
  selectionBar: {
    position: "absolute", bottom: 24, left: 16, right: 16, flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", borderWidth: 1, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10,
  },
});
