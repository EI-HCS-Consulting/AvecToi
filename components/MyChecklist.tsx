import { useCallback, useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Modal, Switch, Linking,
} from "react-native";
import * as Crypto from "expo-crypto";
import { supabase } from "@/lib/supabase";
import ConfirmModal from "@/components/ConfirmModal";
import MiniCalendar from "@/components/MiniCalendar";
import { normalizePhone } from "@/lib/phone";
import { CHECKLIST_TEMPLATES, addDaysIso, checklistItemDescription, findTemplateItemByTitle, type ChecklistContext, type ChecklistItem } from "@/lib/checklistTemplates";
import { findLetterTemplateForChecklistItem, LETTER_TEMPLATES, type LetterTemplate } from "@/lib/letterTemplates";
import { saveAndShareDoc, splitAlignedLines } from "@/lib/mediaShare";
import MesDocumentsModal from "@/components/MesDocumentsModal";
import ShoppingListModal from "@/components/ShoppingListModal";
import type { PersonalChecklistItem, IntervenantChecklistTemplate, PersonalDocument, PatientSpace, Task } from "@/lib/types";
import { CHECKLIST_COLORS, type Theme } from "@/lib/themes";

interface Props {
  spaceId: string;
  isAdmin: boolean;
  ownerPrenom: string;
  ownerNom: string;
  // "ADMIN" côté admin (même convention que author_pin sur tasks/news_entries),
  // sinon le PIN de session du visiteur.
  ownerPin: string;
  // Dossier patient de cet espace — sert uniquement à pré-remplir les
  // courriers (voir openLetterModal/lib/letterTemplates.ts, prefill) avec
  // les infos déjà connues de l'app (nom du patient, établissement
  // hospitalier, adresse du domicile...).
  space: PatientSpace;
  C: Theme;
  // Masque "✨ Importer une checklist toute prête" — les checklists
  // suggérées (Entraide) ne concernent pas les intervenants, voir
  // app/(visitor)/account.tsx.
  hideImportBanner?: boolean;
  // Téléphone brut de la fiche intervenant (role === "intervenant"
  // uniquement) — active "💾 Enregistrer comme modèle" / "📥 Mes modèles"
  // pour réutiliser une checklist perso dans un autre dossier patient.
  // Normalisé en interne (voir normalizePhone), même mécanisme que "Mes
  // espaces" (app/(visitor)/account.tsx, linkedSpaces).
  intervenantTelephone?: string;
}

function linesToTitles(text: string): string[] {
  return text.split("\n").map((l) => l.trim()).filter(Boolean);
}

// Assistant de publication de checklist (voir startImportWizard) — un item
// à la fois (échéance → urgent → précision), pas de photo ici (aucune
// infra ImagePicker dans ce fichier, et non demandé pour ce flux).
type ImportWizardEntry = { key: string; item: ChecklistItem };
type ImportWizardFields = { dateLimite: string; urgent: boolean; detail: string };

// Bloc "Ma Checklist" (Mon Compte, admin + visiteur) : liste personnelle où
// chacun peut cocher "Fait" directement, ajouter ses propres items en texte
// libre, ou importer une des checklists suggérées d'Entraide. Par défaut un
// import reste privé (aucune ligne tasks créée) — bascule "Publier aussi sur
// le Mur d'Entraide" dans confirmImport pour lier l'item à un vrai besoin
// `tasks` public ; dans ce cas, basculer son statut ici met aussi à jour
// tasks.status, qui se propage partout via l'abonnement realtime déjà en
// place dans Entraide.tsx.
export default function MyChecklist({ spaceId, isAdmin, ownerPrenom, ownerNom, ownerPin, space, C, hideImportBanner, intervenantTelephone }: Props) {
  const normalizedTelephone = intervenantTelephone ? normalizePhone(intervenantTelephone) : "";
  const canUseTemplates = normalizedTelephone.length >= 6;
  const [items, setItems] = useState<PersonalChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Un seul sous-bloc ouvert à la fois, comme "Mes contributions" — clé de
  // groupe (ChecklistContext, "perso", ou nom de checklist perso créée).
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const [createModal, setCreateModal] = useState(false);
  const [newChecklistName, setNewChecklistName] = useState("");
  const [newChecklistItems, setNewChecklistItems] = useState<string[]>([]);
  const [newChecklistItemDraft, setNewChecklistItemDraft] = useState("");
  const [creatingChecklist, setCreatingChecklist] = useState(false);

  // Ajout d'items dans une checklist perso déjà créée — un seul champ car un
  // seul groupe est ouvert à la fois (openGroup), remis à zéro à chaque
  // changement de groupe ouvert (voir useEffect plus bas).
  const [groupAddText, setGroupAddText] = useState("");
  const [groupAddSaving, setGroupAddSaving] = useState(false);

  // "Mes modèles" (intervenant uniquement) — sauvegarder une checklist perso
  // comme modèle réutilisable, puis l'importer dans un autre dossier patient.
  const [savingTemplateName, setSavingTemplateName] = useState<string | null>(null);
  const [templatesPicker, setTemplatesPicker] = useState(false);
  const [templates, setTemplates] = useState<IntervenantChecklistTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [importingTemplateId, setImportingTemplateId] = useState<string | null>(null);
  // Popup de sélection avant import d'un modèle — tous les items du modèle
  // (y compris ceux déjà cochés "fait" dans l'espace patient d'origine, un
  // modèle n'a pas de statut, voir saveGroupAsTemplate) apparaissent
  // pré-cochés, sauf ceux déjà présents dans ce dossier patient (n'importe
  // quelle checklist, pas seulement une réimportation du même modèle — voir
  // findExistingChecklistItem) qui sont grisés pour éviter les doublons.
  const [importTpl, setImportTpl] = useState<IntervenantChecklistTemplate | null>(null);
  const [tplChecked, setTplChecked] = useState<Record<number, boolean>>({});
  // Quand tous les items d'un modèle sont déjà présents dans ce dossier
  // patient — popup purement informatif (ConfirmModal singleButton) plutôt
  // que la sélection, qui n'aurait plus rien d'importable.
  const [fullyImportedTplName, setFullyImportedTplName] = useState<string | null>(null);

  // Sélection multiple (restant appuyé sur un item, comme dans le Mur
  // d'Entraide) — pour supprimer plusieurs items de sa checklist en une fois.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectionMode = selectedIds.size > 0;
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkDeleteSaving, setBulkDeleteSaving] = useState(false);

  // Suppression d'une checklist perso nommée en entier (clic prolongé sur son
  // en-tête) — utile notamment pour retirer une checklist importée depuis un
  // modèle (📥 Mes modèles) qui ne conviendrait pas telle quelle.
  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState<string | null>(null);
  const [deleteGroupSaving, setDeleteGroupSaving] = useState(false);

  const [picker, setPicker] = useState(false);
  const [importCtx, setImportCtx] = useState<ChecklistContext | null>(null);
  const [importChecked, setImportChecked] = useState<Record<number, boolean>>({});
  const [importCustomItems, setImportCustomItems] = useState<string[]>([]);
  const [importItemDraft, setImportItemDraft] = useState("");
  const [importSaving, setImportSaving] = useState(false);
  // Par défaut, un import reste privé (checklist perso, task_id null) —
  // conforme au texte affiché sur le picker ("visible de toi seul"). Bascule
  // explicite pour publier aussi sur le Mur d'Entraide (crée en plus une
  // ligne tasks liée). Avant ce correctif, confirmImport publiait toujours
  // les deux à la fois, d'où l'item visible à double (Mon Compte + Entraide)
  // signalé par un visiteur.
  const [importPublic, setImportPublic] = useState(false);
  // Assistant séquentiel (voir startImportWizard) : un écran par item
  // sélectionné (échéance → urgent → précision si item.needsDetail),
  // échéance/urgent étant désormais persistés même pour un import privé
  // (voir personal_checklist_items.date_limite/urgent) — plus besoin de
  // filtrer les items "sans rien à configurer".
  const [importSelected, setImportSelected] = useState<ImportWizardEntry[]>([]);
  const [importWizardList, setImportWizardList] = useState<ImportWizardEntry[]>([]);
  const [importWizardStep, setImportWizardStep] = useState(0);
  const [importWizardData, setImportWizardData] = useState<Record<string, ImportWizardFields>>({});
  const [importWizardDLCalMonth, setImportWizardDLCalMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  // Requêté à l'ouverture du picker plutôt que tenu en permanence — MyChecklist
  // n'a pas besoin de la liste complète des besoins hors de ce flux d'import.
  const [existingTasks, setExistingTasks] = useState<Task[]>([]);

  // Modèle de courrier (voir lib/letterTemplates.ts) — popup de remplissage
  // puis aperçu, ouvert depuis le bouton "✉️" d'un item de checklist précis.
  const [letterModal, setLetterModal] = useState<LetterTemplate | null>(null);
  const [letterValues, setLetterValues] = useState<Record<string, string>>({});
  const [letterPreview, setLetterPreview] = useState(false);
  const [letterSaving, setLetterSaving] = useState(false);

  // "Mes documents" (voir MesDocumentsModal) — trace des courriers déjà
  // générés (downloadLetter), pour les re-télécharger sans ressaisir le
  // formulaire. Requêté à l'ouverture du modal plutôt que tenu en
  // permanence, comme existingTasks.
  const [documentsModal, setDocumentsModal] = useState(false);
  const [documents, setDocuments] = useState<PersonalDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [redownloadingDocId, setRedownloadingDocId] = useState<string | null>(null);
  // Non-null pendant l'édition d'un document déjà généré (clic prolongé →
  // Modifier dans MesDocumentsModal) : downloadLetter met alors à jour la
  // ligne personal_documents existante au lieu d'en créer une nouvelle.
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [deleteDocumentConfirm, setDeleteDocumentConfirm] = useState<PersonalDocument | null>(null);
  const [deleteDocumentSaving, setDeleteDocumentSaving] = useState(false);
  // Besoins "courses" avec liste de courses, affichés dans le même modal
  // "Mes documents" que les courriers ci-dessus — chargés en même temps
  // (voir openDocumentsModal). shoppingListTask ouvre le ShoppingListModal
  // partagé avec Entraide.tsx (même task, mêmes lignes shopping_list_items :
  // toute modification ici se voit aussi sur le Mur d'Entraide).
  const [shoppingLists, setShoppingLists] = useState<Task[]>([]);
  const [shoppingListTask, setShoppingListTask] = useState<Task | null>(null);

  const canLoad = !!(spaceId && ownerPrenom.trim() && ownerNom.trim() && ownerPin.trim());

  const loadItems = useCallback(async () => {
    if (!canLoad) return;
    setLoading(true);
    const { data } = await supabase
      .from("personal_checklist_items")
      .select("*")
      .eq("space_id", spaceId)
      .eq("owner_pin", ownerPin)
      .order("created_at", { ascending: true });
    const mine = ((data ?? []) as PersonalChecklistItem[]).filter(
      (it) => it.owner_prenom.trim().toLowerCase() === ownerPrenom.trim().toLowerCase()
        && it.owner_nom.trim().toLowerCase() === ownerNom.trim().toLowerCase(),
    );
    setItems(mine);
    setLoading(false);
  }, [spaceId, ownerPin, ownerPrenom, ownerNom, canLoad]);

  useEffect(() => { loadItems(); }, [loadItems]);
  useEffect(() => { setGroupAddText(""); }, [openGroup]);

  function findDuplicateTask(title: string): Task | undefined {
    const norm = title.trim().toLowerCase();
    if (!norm) return undefined;
    return existingTasks.find((t) => t.title.trim().toLowerCase() === norm);
  }

  // Anti-doublon à l'import d'un modèle — cherche dans toutes les checklists
  // de ce dossier patient (pas seulement une réimportation du même modèle),
  // puisqu'un item peut déjà exister ailleurs (ajouté à la main, ou importé
  // depuis un autre modèle).
  function findExistingChecklistItem(title: string): PersonalChecklistItem | undefined {
    const norm = title.trim().toLowerCase();
    if (!norm) return undefined;
    return items.find((it) => it.title.trim().toLowerCase() === norm);
  }

  // Anti-doublon pour les checklists suggérées (Entraide) : un item peut
  // déjà exister soit comme besoin public (findDuplicateTask), soit déjà
  // importé dans "Ma Checklist" sans avoir été publié (findExistingChecklistItem,
  // jusqu'ici seulement branché sur le flux "Mes modèles" — un item importé
  // en privé pouvait donc être réimporté indéfiniment et s'empiler).
  function isDuplicateImportTitle(title: string): boolean {
    return !!findDuplicateTask(title) || !!findExistingChecklistItem(title);
  }

  async function toggleItem(item: PersonalChecklistItem) {
    const nextStatus: PersonalChecklistItem["status"] = item.status === "fait" ? "a_faire" : "fait";
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, status: nextStatus } : it)));
    await supabase.from("personal_checklist_items").update({ status: nextStatus }).eq("id", item.id);
    if (item.task_id) {
      await supabase.from("tasks").update({ status: nextStatus === "fait" ? "fait" : "ouvert" }).eq("id", item.task_id);
    }
  }

  function openLetterModal(tpl: LetterTemplate) {
    setLetterModal(tpl);
    const prefilled = tpl.prefill?.({ ownerPrenom, ownerNom, space }) ?? {};
    const initial: Record<string, string> = {};
    tpl.fields.forEach((f) => { initial[f.key] = prefilled[f.key] ?? ""; });
    setLetterValues(initial);
    setLetterPreview(false);
  }

  function closeLetterModal() {
    setLetterModal(null);
    setLetterValues({});
    setLetterPreview(false);
    setEditingDocumentId(null);
  }

  function updateLetterField(key: string, value: string) {
    setLetterValues((prev) => ({ ...prev, [key]: value }));
  }

  // Rouvre le formulaire pré-rempli sur un document déjà généré (clic
  // prolongé → Modifier dans MesDocumentsModal), plutôt que de repartir d'un
  // formulaire vide comme openLetterModal — downloadLetter détecte
  // editingDocumentId et met à jour la ligne existante au lieu d'en créer une.
  function openLetterModalForEdit(doc: PersonalDocument) {
    const tpl = LETTER_TEMPLATES.find((lt) => lt.id === doc.letter_id);
    if (!tpl) {
      Alert.alert("Modèle indisponible", "Ce type de courrier n'existe plus.");
      return;
    }
    setDocumentsModal(false);
    setLetterModal(tpl);
    setLetterValues({ ...doc.values });
    setLetterPreview(false);
    setEditingDocumentId(doc.id);
  }

  async function downloadLetter() {
    if (!letterModal) return;
    setLetterSaving(true);
    const content = letterModal.body(letterValues);
    const ok = await saveAndShareDoc(content, `${letterModal.id}.doc`, letterModal.label, letterModal.objet);
    if (ok) {
      if (editingDocumentId) {
        const { error } = await supabase
          .from("personal_documents")
          .update({ values: letterValues })
          .eq("id", editingDocumentId);
        if (error) {
          Alert.alert("Erreur", "Le document téléchargé est à jour, mais l'enregistrement dans « Mes documents » a échoué : " + error.message);
        }
      } else {
        await supabase.from("personal_documents").insert({
          space_id: spaceId,
          owner_prenom: ownerPrenom,
          owner_nom: ownerNom,
          owner_pin: ownerPin,
          letter_id: letterModal.id,
          label: letterModal.label,
          values: letterValues,
        });
      }
    }
    setLetterSaving(false);
  }

  async function openDocumentsModal() {
    setDocumentsModal(true);
    setLoadingDocuments(true);
    const [{ data }, { data: courseTasks }] = await Promise.all([
      supabase
        .from("personal_documents")
        .select("*")
        .eq("space_id", spaceId)
        .eq("owner_pin", ownerPin)
        .order("created_at", { ascending: false }),
      supabase
        .from("tasks")
        .select("*")
        .eq("space_id", spaceId)
        .eq("category", "courses")
        .eq("author_pin", ownerPin)
        .order("created_at", { ascending: false }),
    ]);
    const mine = ((data ?? []) as PersonalDocument[]).filter(
      (d) => d.owner_prenom.trim().toLowerCase() === ownerPrenom.trim().toLowerCase()
        && d.owner_nom.trim().toLowerCase() === ownerNom.trim().toLowerCase(),
    );
    const mineLists = ((courseTasks ?? []) as Task[]).filter(
      (t) => (t.author_prenom ?? "").trim().toLowerCase() === ownerPrenom.trim().toLowerCase()
        && (t.author_nom ?? "").trim().toLowerCase() === ownerNom.trim().toLowerCase(),
    );
    setDocuments(mine);
    setShoppingLists(mineLists);
    setLoadingDocuments(false);
  }

  function openShoppingListFromDocuments(t: Task) {
    setDocumentsModal(false);
    setShoppingListTask(t);
  }

  async function redownloadDocument(doc: PersonalDocument) {
    const tpl = LETTER_TEMPLATES.find((lt) => lt.id === doc.letter_id);
    if (!tpl) {
      Alert.alert("Modèle indisponible", "Ce type de courrier n'existe plus.");
      return;
    }
    setRedownloadingDocId(doc.id);
    await saveAndShareDoc(tpl.body(doc.values), `${doc.letter_id}.doc`, doc.label, tpl.objet);
    setRedownloadingDocId(null);
  }

  async function confirmDeleteDocument() {
    if (!deleteDocumentConfirm) return;
    setDeleteDocumentSaving(true);
    await supabase.from("personal_documents").delete().eq("id", deleteDocumentConfirm.id);
    setDocuments((prev) => prev.filter((d) => d.id !== deleteDocumentConfirm.id));
    setDeleteDocumentSaving(false);
    setDeleteDocumentConfirm(null);
  }

  function addDraftToNewChecklist() {
    const title = newChecklistItemDraft.trim();
    if (!title) return;
    setNewChecklistItems((prev) => [...prev, title]);
    setNewChecklistItemDraft("");
  }

  function removeNewChecklistItem(index: number) {
    setNewChecklistItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function confirmCreateChecklist() {
    const name = newChecklistName.trim();
    const titles = newChecklistItems;
    if (!name || !titles.length) return;
    setCreatingChecklist(true);
    const rows = titles.map((title) => ({
      space_id: spaceId,
      owner_prenom: ownerPrenom,
      owner_nom: ownerNom,
      owner_pin: ownerPin,
      title,
      status: "a_faire" as const,
      task_id: null,
      checklist_context: null,
      custom_checklist_name: name,
    }));
    const { error } = await supabase.from("personal_checklist_items").insert(rows);
    setCreatingChecklist(false);
    if (error) {
      Alert.alert("Erreur", "Impossible de créer la checklist : " + error.message);
      return;
    }
    setCreateModal(false);
    setNewChecklistName("");
    setNewChecklistItems([]);
    setNewChecklistItemDraft("");
    setOpenGroup(name);
    loadItems();
  }

  // target identifie le groupe dans lequel ajouter — soit une checklist perso
  // nommée (custom_checklist_name), soit une checklist toute prête importée
  // (checklist_context) : les deux se rouvrent ensuite via groupItems(key).
  async function addItemToGroup(target: { key: string; isCustom: boolean }) {
    const titles = linesToTitles(groupAddText);
    if (!titles.length) return;
    setGroupAddSaving(true);
    const rows = titles.map((title) => ({
      space_id: spaceId,
      owner_prenom: ownerPrenom,
      owner_nom: ownerNom,
      owner_pin: ownerPin,
      title,
      status: "a_faire" as const,
      task_id: null,
      checklist_context: target.isCustom ? null : (target.key as ChecklistContext),
      custom_checklist_name: target.isCustom ? target.key : null,
    }));
    const { error } = await supabase.from("personal_checklist_items").insert(rows);
    setGroupAddSaving(false);
    if (error) {
      Alert.alert("Erreur", "Impossible d'ajouter : " + error.message);
      return;
    }
    setGroupAddText("");
    loadItems();
  }

  async function saveGroupAsTemplate(name: string) {
    if (!canUseTemplates) return;
    const titles = groupItems(name).map((it) => it.title);
    if (!titles.length) return;
    setSavingTemplateName(name);
    const { error } = await supabase
      .from("intervenant_checklist_templates")
      .upsert({ telephone: normalizedTelephone, name, items: titles }, { onConflict: "telephone,name" });
    setSavingTemplateName(null);
    if (error) {
      Alert.alert("Erreur", "Impossible d'enregistrer le modèle : " + error.message);
      return;
    }
    Alert.alert("Modèle enregistré", `"${name}" est maintenant disponible dans "📥 Mes modèles", dans tous tes dossiers patient.`);
  }

  async function openTemplatesPicker() {
    if (!canUseTemplates) return;
    setTemplatesPicker(true);
    setLoadingTemplates(true);
    const { data } = await supabase
      .from("intervenant_checklist_templates")
      .select("*")
      .eq("telephone", normalizedTelephone)
      .order("name", { ascending: true });
    setTemplates((data ?? []) as IntervenantChecklistTemplate[]);
    setLoadingTemplates(false);
  }

  function openTemplateImport(tpl: IntervenantChecklistTemplate) {
    if (!tpl.items.length) return;
    if (tpl.items.every((title) => !!findExistingChecklistItem(title))) {
      setTemplatesPicker(false);
      setFullyImportedTplName(tpl.name);
      return;
    }
    const checked: Record<number, boolean> = {};
    tpl.items.forEach((title, i) => { if (!findExistingChecklistItem(title)) checked[i] = true; });
    setTplChecked(checked);
    setImportTpl(tpl);
    setTemplatesPicker(false);
  }

  function toggleTplItem(i: number) {
    setTplChecked((prev) => ({ ...prev, [i]: !prev[i] }));
  }

  function toggleAllTplItems(tpl: IntervenantChecklistTemplate, on: boolean) {
    const next: Record<number, boolean> = {};
    tpl.items.forEach((title, i) => { if (!findExistingChecklistItem(title)) next[i] = on; });
    setTplChecked(next);
  }

  async function confirmImportTemplate() {
    if (!importTpl) return;
    const selected = importTpl.items.filter((title, i) => tplChecked[i] && !findExistingChecklistItem(title));
    if (!selected.length) return;
    setImportingTemplateId(importTpl.id);
    const rows = selected.map((title) => ({
      space_id: spaceId,
      owner_prenom: ownerPrenom,
      owner_nom: ownerNom,
      owner_pin: ownerPin,
      title,
      status: "a_faire" as const,
      task_id: null,
      checklist_context: null,
      custom_checklist_name: importTpl.name,
    }));
    const { error } = await supabase.from("personal_checklist_items").insert(rows);
    setImportingTemplateId(null);
    if (error) {
      Alert.alert("Erreur", "Impossible d'importer le modèle : " + error.message);
      return;
    }
    const importedName = importTpl.name;
    setImportTpl(null);
    setOpenGroup(importedName);
    loadItems();
  }

  function enterSelection(id: string) {
    setSelectedIds(new Set([id]));
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function exitSelection() {
    setSelectedIds(new Set());
  }

  async function confirmBulkDelete() {
    const targets = items.filter((it) => selectedIds.has(it.id));
    if (!targets.length) return;
    setBulkDeleteSaving(true);
    const taskIds = targets.map((it) => it.task_id).filter((id): id is string => !!id);
    if (taskIds.length) await supabase.from("tasks").delete().in("id", taskIds);
    await supabase.from("personal_checklist_items").delete().in("id", targets.map((it) => it.id));
    setBulkDeleteSaving(false);
    setBulkDeleteConfirm(false);
    exitSelection();
    loadItems();
  }

  async function confirmDeleteGroup() {
    if (!deleteGroupConfirm) return;
    const targets = groupItems(deleteGroupConfirm);
    setDeleteGroupSaving(true);
    const taskIds = targets.map((it) => it.task_id).filter((id): id is string => !!id);
    if (taskIds.length) await supabase.from("tasks").delete().in("id", taskIds);
    await supabase.from("personal_checklist_items").delete().in("id", targets.map((it) => it.id));
    setDeleteGroupSaving(false);
    if (openGroup === deleteGroupConfirm) setOpenGroup(null);
    setDeleteGroupConfirm(null);
    loadItems();
  }

  async function openImportPicker() {
    setPicker(true);
    // Toutes catégories confondues (pas seulement "administratif") : les
    // checklists suggérées couvrent désormais courses, repas, transport…, et
    // le dédoublonnage (findDuplicateTask) doit les repérer partout.
    // deleted_by_admin exclu : un besoin supprimé "en douceur" reste en base
    // (son auteur garde le bandeau rouge) et ne doit plus bloquer le
    // ré-import du même item.
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("space_id", spaceId)
      .eq("deleted_by_admin", false)
      .neq("status", "fait");
    setExistingTasks((data ?? []) as Task[]);
  }

  function openImportContext(ctx: ChecklistContext) {
    setImportCtx(ctx);
    setImportChecked({});
    setImportCustomItems([]);
    setImportItemDraft("");
    setImportPublic(false);
    setImportSelected([]);
    setImportWizardList([]);
    setImportWizardStep(0);
    setImportWizardData({});
    setPicker(false);
  }

  function toggleImportItem(i: number) {
    setImportChecked((prev) => ({ ...prev, [i]: !prev[i] }));
  }

  function toggleAllImport(tplItems: ChecklistItem[], on: boolean) {
    const next: Record<number, boolean> = {};
    tplItems.forEach((_, i) => { next[i] = on; });
    setImportChecked(next);
  }

  function addImportCustomItem() {
    const title = importItemDraft.trim();
    if (!title) return;
    setImportCustomItems((prev) => [...prev, title]);
    setImportItemDraft("");
  }

  function removeImportCustomItem(index: number) {
    setImportCustomItems((prev) => prev.filter((_, i) => i !== index));
  }

  // Fige la sélection en cours et bascule le popup en mode assistant "un
  // item à la fois" — voir ImportWizardEntry. Chaque item sélectionné a
  // désormais un écran (échéance/urgent persistés même en privé, voir
  // personal_checklist_items.date_limite/urgent).
  function startImportWizard() {
    if (!importCtx) return;
    const tpl = CHECKLIST_TEMPLATES[importCtx];
    const templateItems = tpl.groups.flatMap((g) => g.items).filter((it) => isAdmin || it.sharedWithVisitors);
    const all: ImportWizardEntry[] = [
      ...templateItems
        .map((item, i) => ({ key: String(i), item }))
        .filter(({ key, item }) => importChecked[Number(key)] && !isDuplicateImportTitle(item.title)),
      ...importCustomItems
        .filter((title) => !isDuplicateImportTitle(title))
        .map((title, idx) => ({ key: `custom-${idx}`, item: { title, description: "", sharedWithVisitors: true } as ChecklistItem })),
    ];
    if (!all.length) return;
    const data: Record<string, ImportWizardFields> = {};
    all.forEach(({ key, item }) => {
      data[key] = {
        dateLimite: item.dateOffsetDays ? addDaysIso(item.dateOffsetDays) : "",
        urgent: !!item.urgent,
        detail: "",
      };
    });
    setImportSelected(all);
    setImportWizardList(all);
    setImportWizardData(data);
    setImportWizardStep(0);
  }

  function updateImportWizardField(step: number, patch: Partial<ImportWizardFields>) {
    const key = importWizardList[step]?.key;
    if (!key) return;
    setImportWizardData((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? { dateLimite: "", urgent: false, detail: "" }), ...patch },
    }));
  }

  function importWizardNext() {
    if (importWizardStep < importWizardList.length - 1) {
      setImportWizardStep((s) => s + 1);
      return;
    }
    publishImportWizard(importSelected, importWizardData);
  }

  function importWizardBack() {
    if (importWizardStep === 0) {
      setImportWizardList([]);
      setImportSelected([]);
      return;
    }
    setImportWizardStep((s) => s - 1);
  }

  async function publishImportWizard(selected: ImportWizardEntry[], data: Record<string, ImportWizardFields>) {
    if (!importCtx || !selected.length) return;
    setImportSaving(true);

    // task_id par item importé — reste à null pour tous si l'import est
    // privé (importPublic === false, réglage par défaut) : aucune ligne
    // tasks n'est créée, donc rien ne remonte sur le Mur d'Entraide.
    let taskIds: (string | null)[] = selected.map(() => null);
    if (importPublic) {
      const batchId = Crypto.randomUUID();
      const taskRows = selected.map(({ key, item }) => {
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
          author_prenom: ownerPrenom || null,
          author_nom: ownerNom || null,
          author_pin: ownerPin || null,
          date_limite: fields.dateLimite || (item.dateOffsetDays ? addDaysIso(item.dateOffsetDays) : null),
          urgent: fields.urgent,
          checklist_batch_id: batchId,
        };
      });
      const { data: insertedTasks, error } = await supabase.from("tasks").insert(taskRows).select("id");
      if (error || !insertedTasks) {
        setImportSaving(false);
        Alert.alert("Erreur", "Impossible d'importer la checklist : " + (error?.message ?? ""));
        return;
      }
      taskIds = insertedTasks.map((row: { id: string }) => row.id);
    }

    const personalRows = selected.map(({ key, item }, idx) => {
      // personal_checklist_items n'a pas de colonne description : pour un
      // import privé, la précision saisie n'aurait nulle part où vivre si on
      // ne l'ajoutait pas au titre — côté public, elle va dans la
      // description de tasks.
      const detail = !importPublic ? data[key]?.detail.trim() : "";
      const fields = data[key] ?? { dateLimite: "", urgent: !!item.urgent, detail: "" };
      return {
        space_id: spaceId,
        owner_prenom: ownerPrenom,
        owner_nom: ownerNom,
        owner_pin: ownerPin,
        title: detail ? `${item.title} — ${detail}` : item.title,
        status: "a_faire" as const,
        task_id: taskIds[idx],
        checklist_context: importCtx,
        custom_checklist_name: null,
        date_limite: fields.dateLimite || null,
        urgent: fields.urgent,
      };
    });
    // Pièces à réunir → sous-items cochables : pas de vraie hiérarchie en
    // base, mais checklist_context = importCtx (même checklist que leur
    // parent) + custom_checklist_name = titre du parent permet à groupItems
    // de les rattacher et de les afficher nichées sous leur item, chacune
    // cochable indépendamment (voir renderGroupCard, nestPieces).
    const pieceRows = selected.flatMap(({ item }) =>
      (item.piecesRequises ?? []).map((piece) => ({
        space_id: spaceId,
        owner_prenom: ownerPrenom,
        owner_nom: ownerNom,
        owner_pin: ownerPin,
        title: piece,
        status: "a_faire" as const,
        task_id: null,
        checklist_context: importCtx,
        custom_checklist_name: item.title,
        date_limite: null,
        urgent: false,
      })),
    );
    const { error: personalError } = await supabase.from("personal_checklist_items").insert([...personalRows, ...pieceRows]);
    setImportSaving(false);
    if (personalError) {
      Alert.alert("Erreur", "Impossible d'importer la checklist : " + personalError.message);
      return;
    }
    setImportCtx(null);
    setImportSelected([]);
    setImportWizardList([]);
    setImportWizardStep(0);
    setImportWizardData({});
    loadItems();
  }

  if (!canLoad) return null;

  // checklist_context prime sur custom_checklist_name : une pièce à réunir
  // (voir publishImportWizard, pieceRows) porte les deux à la fois pour
  // rester rattachée à sa checklist toute prête d'origine plutôt que de
  // retomber dans le seau générique des checklists perso nommées.
  const groupItems = (key: string) =>
    items.filter((it) => {
      if (key === "perso") return !it.checklist_context && !it.custom_checklist_name;
      if (it.checklist_context) return it.checklist_context === key;
      return it.custom_checklist_name === key;
    });

  // Une checklist perso créée via "+ Créer une checklist" (ou importée comme
  // modèle intervenant) n'existe que si elle a au moins un item — et exclut
  // les pièces à réunir des checklists toute prêtes, qui portent aussi
  // custom_checklist_name mais ont un checklist_context (voir groupItems).
  const customNames = Array.from(
    new Set(
      items
        .filter((it) => !it.checklist_context && it.custom_checklist_name)
        .map((it) => it.custom_checklist_name as string),
    ),
  );

  // Ordre d'apparition des checklists toute prêtes importées — items déjà
  // triés par created_at ascendant (voir loadItems), donc Array.from(new
  // Set(...)) conserve l'ordre chronologique du premier import de chaque
  // contexte plutôt que l'ordre fixe de CHECKLIST_TEMPLATES.
  const importedCtxOrder = Array.from(
    new Set(
      items
        .filter((it) => it.checklist_context)
        .map((it) => it.checklist_context as ChecklistContext),
    ),
  );

  // Une ligne d'item cochable — extrait de renderGroupCard pour être réutilisé
  // à la fois pour un item de premier niveau et pour une pièce à réunir
  // nichée dessous (indent). Le lien officiel est retrouvé à la volée dans
  // le template d'origine (findTemplateItemByTitle) : ni tasks ni
  // personal_checklist_items n'ont de colonne dédiée pour le conserver après
  // l'import, donc on le re-dérive du titre à chaque affichage plutôt que de
  // le perdre une fois l'écran de sélection refermé.
  function renderItemRow(item: PersonalChecklistItem, opts?: { indent?: boolean }) {
    const isSel = selectedIds.has(item.id);
    const tplItem = findTemplateItemByTitle(item.title);
    const letterTpl = findLetterTemplateForChecklistItem(item.title);
    return (
      <View style={opts?.indent && styles.pieceWrap}>
        <TouchableOpacity
          style={[styles.row, isSel && { backgroundColor: `${C.accent}18` }]}
          onPress={() => { if (selectionMode) toggleSelected(item.id); }}
          onLongPress={() => { if (!selectionMode) enterSelection(item.id); }}
          activeOpacity={selectionMode ? 0.6 : 1}
        >
          {selectionMode && (
            <View style={[styles.selectDot, { borderColor: C.accent, backgroundColor: isSel ? C.accent : "transparent" }]}>
              {isSel && <Text style={styles.selectDotCheck}>✓</Text>}
            </View>
          )}
          <Text
            style={[
              styles.rowText,
              { flex: 1, color: item.status === "fait" ? C.muted : C.text },
              item.status === "fait" && styles.rowTextDone,
            ]}
          >
            {opts?.indent ? "· " : ""}{item.title}
          </Text>
          {!!item.urgent && (
            <View style={[styles.urgentChip, { backgroundColor: `${C.danger}22` }]}>
              <Text style={[styles.urgentChipText, { color: C.danger }]}>Urgent</Text>
            </View>
          )}
          {!selectionMode && (
            <Switch
              value={item.status === "fait"}
              onValueChange={() => toggleItem(item)}
              trackColor={{ false: C.border, true: C.accent }}
              thumbColor="#fff"
            />
          )}
        </TouchableOpacity>
        {!!item.date_limite && (
          <View style={styles.itemLinkWrap}>
            <Text style={[styles.itemDesc, { color: C.muted, marginTop: 0 }]}>📅 Échéance : {item.date_limite}</Text>
          </View>
        )}
        {!!tplItem?.lienExterne && (
          <TouchableOpacity
            style={styles.itemLinkWrap}
            onPress={() => Linking.openURL(tplItem.lienExterne!.url).catch(() => {})}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Text style={[styles.itemLink, { color: C.gold }]}>🔗 {tplItem.lienExterne.label}</Text>
          </TouchableOpacity>
        )}
        {!!letterTpl && (
          <TouchableOpacity
            style={styles.itemLinkWrap}
            onPress={() => openLetterModal(letterTpl)}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Text style={[styles.itemLink, { color: C.accent }]}>✉️ Préparer le courrier</Text>
          </TouchableOpacity>
        )}
        <View style={[styles.rowDivider, { backgroundColor: C.border }]} />
      </View>
    );
  }

  // addTarget : identifie le groupe (checklist perso nommée ou checklist
  // toute prête importée) pour y ajouter de nouveaux items directement (voir
  // groupAddText). Absent pour "Mes items personnels" (legacy, sans
  // checklist parente). nestPieces : les pièces à réunir (custom_checklist_name
  // = titre d'un item du même groupe, voir publishImportWizard) s'affichent
  // nichées sous leur item plutôt qu'à plat — seul le cas des checklists
  // toute prêtes en a besoin, les checklists perso/legacy n'ont pas de pièces.
  // cardBg : fourni pour les checklists toute prêtes, dont le fond pastel
  // est porté par le wrapper englobant (voir groupTintWrap) — la carte reste
  // transparente et sans bordure pour ne pas dupliquer le cadre.
  function renderGroupCard(groupItemsList: PersonalChecklistItem[], addTarget?: { key: string; isCustom: boolean }, nestPieces?: boolean, cardBg?: string) {
    const topLevel = nestPieces ? groupItemsList.filter((it) => !it.custom_checklist_name) : groupItemsList;
    const piecesOf = (title: string) => groupItemsList.filter((it) => it.custom_checklist_name === title);
    return (
      <View style={[styles.card, styles.groupCard, cardBg ? { backgroundColor: "transparent", borderWidth: 0 } : { backgroundColor: C.card, borderColor: C.border }]}>
        {topLevel.length === 0 ? (
          <Text style={[styles.empty, { color: C.muted }]}>Aucun item pour le moment.</Text>
        ) : topLevel.map((item) => (
          <View key={item.id}>
            {renderItemRow(item)}
            {nestPieces && piecesOf(item.title).map((piece) => (
              <View key={piece.id}>{renderItemRow(piece, { indent: true })}</View>
            ))}
          </View>
        ))}
        {addTarget && (
          <View style={styles.groupAddRow}>
            <TextInput
              style={[styles.groupAddInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
              placeholder="+ Ajouter un item (un par ligne)"
              placeholderTextColor={C.muted}
              value={groupAddText}
              onChangeText={setGroupAddText}
              multiline
            />
            <TouchableOpacity
              style={[styles.groupAddBtn, { borderColor: C.gold, opacity: groupAddText.trim() ? 1 : 0.5 }]}
              onPress={() => addItemToGroup(addTarget)}
              disabled={!groupAddText.trim() || groupAddSaving}
              activeOpacity={0.8}
            >
              {groupAddSaving
                ? <ActivityIndicator color={C.gold} />
                : <Text style={[styles.groupAddBtnText, { color: C.gold }]}>+ Ajouter</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <View>
      <Text style={[styles.sectionTitle, { color: C.gold }]}>Mes Checklists</Text>

      <View style={[styles.wrapperCard, { backgroundColor: C.card, borderColor: C.border }]}>
        {loading ? (
          <ActivityIndicator color={C.accent} style={{ marginVertical: 16 }} />
        ) : (
          <>
            {selectionMode && (
              <View style={[styles.selectBar, { borderColor: C.border }]}>
                <Text style={[styles.selectCount, { color: C.text }]}>
                  {selectedIds.size} sélectionné{selectedIds.size > 1 ? "s" : ""}
                </Text>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <TouchableOpacity
                    onPress={() => setSelectedIds(new Set((openGroup ? groupItems(openGroup) : []).map((it) => it.id)))}
                    style={[styles.selectBarBtn, { borderColor: C.border }]}
                  >
                    <Text style={[styles.selectBarBtnText, { color: C.text }]}>Tout sélect.</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setBulkDeleteConfirm(true)} style={[styles.selectBarBtn, { borderColor: C.danger }]}>
                    <Text style={[styles.selectBarBtnText, { color: C.danger }]}>🗑️ Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {importedCtxOrder.map((ctx) => {
              const tpl = CHECKLIST_TEMPLATES[ctx];
              const groupList = groupItems(ctx);
              if (groupList.length === 0) return null;
              const isOpen = openGroup === ctx;
              const tint = `${CHECKLIST_COLORS[tpl.colorKey]}14`;
              return (
                <View key={ctx} style={[styles.groupTintWrap, { backgroundColor: tint }]}>
                  <TouchableOpacity
                    style={[styles.groupHeader, { borderBottomColor: C.border }]}
                    onPress={() => { exitSelection(); setOpenGroup(isOpen ? null : ctx); }}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.groupHeaderText, { color: C.text }]}>
                      {tpl.icon} {tpl.label} ({groupList.length})
                    </Text>
                    <Text style={[styles.groupChevron, { color: C.muted }]}>{isOpen ? "▲" : "▼"}</Text>
                  </TouchableOpacity>
                  {isOpen && renderGroupCard(groupList, { key: ctx, isCustom: false }, true, tint)}
                </View>
              );
            })}

            {customNames.map((name) => {
              const groupList = groupItems(name);
              const isOpen = openGroup === name;
              return (
                <View key={name}>
                  <TouchableOpacity
                    style={[styles.groupHeader, { borderBottomColor: C.border }]}
                    onPress={() => { exitSelection(); setOpenGroup(isOpen ? null : name); }}
                    onLongPress={() => setDeleteGroupConfirm(name)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.groupHeaderText, { color: C.text }]}>
                      📋 {name} ({groupList.length})
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      {canUseTemplates && (
                        <TouchableOpacity
                          onPress={() => saveGroupAsTemplate(name)}
                          disabled={savingTemplateName === name}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          {savingTemplateName === name
                            ? <ActivityIndicator color={C.gold} size="small" />
                            : <Text style={{ fontSize: 16 }}>💾</Text>
                          }
                        </TouchableOpacity>
                      )}
                      <Text style={[styles.groupChevron, { color: C.muted }]}>{isOpen ? "▲" : "▼"}</Text>
                    </View>
                  </TouchableOpacity>
                  {isOpen && renderGroupCard(groupList, { key: name, isCustom: true })}
                </View>
              );
            })}

            {(() => {
              const persoList = groupItems("perso");
              if (persoList.length === 0) return null;
              const isOpen = openGroup === "perso";
              return (
                <View>
                  <TouchableOpacity
                    style={[styles.groupHeader, { borderBottomColor: C.border }]}
                    onPress={() => { exitSelection(); setOpenGroup(isOpen ? null : "perso"); }}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.groupHeaderText, { color: C.text }]}>
                      📝 Mes items personnels ({persoList.length})
                    </Text>
                    <Text style={[styles.groupChevron, { color: C.muted }]}>{isOpen ? "▲" : "▼"}</Text>
                  </TouchableOpacity>
                  {isOpen && renderGroupCard(persoList)}
                </View>
              );
            })()}
          </>
        )}

        <TouchableOpacity
          style={[styles.btnSecondary, { borderColor: C.gold }]}
          onPress={() => setCreateModal(true)}
          activeOpacity={0.8}
        >
          <Text style={[styles.btnSecondaryText, { color: C.gold }]}>+ Créer une checklist privée</Text>
        </TouchableOpacity>

        {canUseTemplates && (
          <TouchableOpacity
            style={[styles.btnSecondary, { borderColor: C.gold, marginTop: 8 }]}
            onPress={openTemplatesPicker}
            activeOpacity={0.8}
          >
            <Text style={[styles.btnSecondaryText, { color: C.gold }]}>📥 Mes modèles</Text>
          </TouchableOpacity>
        )}

        {!hideImportBanner && (
          <TouchableOpacity
            style={[styles.importBanner, { backgroundColor: C.gold + "1c", borderColor: C.gold }]}
            onPress={openImportPicker}
            activeOpacity={0.8}
          >
            <Text style={[styles.importBannerText, { color: C.gold }]}>✨ Checklists suggérées</Text>
          </TouchableOpacity>
        )}

        {!hideImportBanner && (
          <TouchableOpacity
            style={[styles.documentsBtn, { backgroundColor: C.orange }]}
            onPress={openDocumentsModal}
            activeOpacity={0.85}
          >
            <Text style={styles.documentsBtnText}>📄 Mes documents</Text>
          </TouchableOpacity>
        )}
      </View>

      <MesDocumentsModal
        visible={documentsModal}
        onClose={() => setDocumentsModal(false)}
        C={C}
        documents={documents}
        loading={loadingDocuments}
        onDownload={redownloadDocument}
        downloadingId={redownloadingDocId}
        onEdit={openLetterModalForEdit}
        onDelete={setDeleteDocumentConfirm}
        shoppingLists={shoppingLists}
        onOpenShoppingList={openShoppingListFromDocuments}
      />

      <ShoppingListModal
        visible={!!shoppingListTask}
        onClose={() => setShoppingListTask(null)}
        C={C}
        task={shoppingListTask}
        isAdmin={isAdmin}
      />

      <ConfirmModal
        visible={!!deleteDocumentConfirm}
        icon="🗑️"
        title={`Supprimer "${deleteDocumentConfirm?.label ?? ""}" ?`}
        message="Ce document ne sera plus disponible dans « Mes documents »."
        confirmLabel="Supprimer"
        saving={deleteDocumentSaving}
        onCancel={() => setDeleteDocumentConfirm(null)}
        onConfirm={confirmDeleteDocument}
        C={C}
      />

      <ConfirmModal
        visible={bulkDeleteConfirm}
        icon="🗑️"
        title={`Supprimer ${selectedIds.size} item${selectedIds.size > 1 ? "s" : ""} ?`}
        message={
          items.some((it) => selectedIds.has(it.id) && it.task_id)
            ? "Les items liés seront aussi retirés du Mur d'Entraide."
            : undefined
        }
        confirmLabel="Supprimer"
        saving={bulkDeleteSaving}
        onCancel={() => setBulkDeleteConfirm(false)}
        onConfirm={confirmBulkDelete}
        C={C}
      />

      <ConfirmModal
        visible={!!deleteGroupConfirm}
        icon="🗑️"
        title={`Supprimer la checklist "${deleteGroupConfirm ?? ""}" ?`}
        message={
          deleteGroupConfirm && groupItems(deleteGroupConfirm).some((it) => it.task_id)
            ? "Tous ses items seront supprimés, y compris ceux retirés du Mur d'Entraide."
            : "Tous ses items seront supprimés."
        }
        confirmLabel="Supprimer"
        saving={deleteGroupSaving}
        onCancel={() => setDeleteGroupConfirm(null)}
        onConfirm={confirmDeleteGroup}
        C={C}
      />

      {/* ── MODAL : créer sa propre checklist nommée ────────────────────── */}
      <Modal visible={createModal} transparent animationType="fade" onRequestClose={() => !creatingChecklist && setCreateModal(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => !creatingChecklist && setCreateModal(false)} />
          <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.gold }]}>
            <Text style={[styles.sheetTitle, { color: C.text }]}>📋 Créer une checklist privée</Text>
            <Text style={[styles.intro, { color: C.muted }]}>
              Cette checklist est privée : elle n'est visible que par toi. Donne-lui un nom, puis ajoute ses premiers items.
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text, marginTop: 0 }]}
              placeholder="Nom de la checklist"
              placeholderTextColor={C.muted}
              value={newChecklistName}
              onChangeText={setNewChecklistName}
            />

            <View style={[styles.card, styles.groupCard, { backgroundColor: C.bg, borderColor: C.border, marginTop: 12 }]}>
              {newChecklistItems.length === 0 ? (
                <Text style={[styles.empty, { color: C.muted }]}>Aucun item pour le moment.</Text>
              ) : newChecklistItems.map((title, i) => (
                <View key={i} style={[styles.row, { borderBottomColor: C.border }]}>
                  <Text style={[styles.rowText, { flex: 1, color: C.text }]}>{title}</Text>
                  <TouchableOpacity onPress={() => removeNewChecklistItem(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={{ color: C.muted, fontSize: 16 }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={[styles.divider, { backgroundColor: C.gold }]} />

            <View style={styles.groupAddRow}>
              <TextInput
                style={[styles.groupAddInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text, marginTop: 0 }]}
                placeholder="Nom de l'item"
                placeholderTextColor={C.muted}
                value={newChecklistItemDraft}
                onChangeText={setNewChecklistItemDraft}
                onSubmitEditing={addDraftToNewChecklist}
              />
              <TouchableOpacity
                style={[styles.groupAddBtn, { borderColor: C.gold, opacity: newChecklistItemDraft.trim() ? 1 : 0.5 }]}
                onPress={addDraftToNewChecklist}
                disabled={!newChecklistItemDraft.trim()}
                activeOpacity={0.8}
              >
                <Text style={[styles.groupAddBtnText, { color: C.gold }]}>+ Ajouter un item</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sheetBtns}>
              <TouchableOpacity
                style={[styles.btnSecondary, { borderColor: C.border }]}
                onPress={() => setCreateModal(false)}
                disabled={creatingChecklist}
              >
                <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.btnPrimary,
                  { backgroundColor: C.gold, opacity: !newChecklistName.trim() || !newChecklistItems.length || creatingChecklist ? 0.5 : 1 },
                ]}
                onPress={confirmCreateChecklist}
                disabled={!newChecklistName.trim() || !newChecklistItems.length || creatingChecklist}
              >
                {creatingChecklist
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.btnPrimaryText}>Créer</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL : mes modèles de checklist (intervenant, cross-space) ─── */}
      <Modal visible={templatesPicker} transparent animationType="fade" onRequestClose={() => setTemplatesPicker(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setTemplatesPicker(false)} />
          <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.gold }]}>
            <Text style={[styles.sheetTitle, { color: C.text }]}>📥 Mes modèles</Text>
            <Text style={[styles.intro, { color: C.muted }]}>
              Retrouve ici les checklists que tu as enregistrées comme modèle (💾, depuis un autre dossier patient). Choisis-en une pour sélectionner les items à importer dans ce dossier-ci.
            </Text>
            {loadingTemplates ? (
              <ActivityIndicator color={C.gold} style={{ marginVertical: 16 }} />
            ) : templates.length === 0 ? (
              <Text style={[styles.empty, { color: C.muted }]}>
                Aucun modèle pour le moment. Enregistre une checklist comme modèle avec 💾, depuis son en-tête.
              </Text>
            ) : (
              <ScrollView style={styles.scroll} showsVerticalScrollIndicator nestedScrollEnabled>
                {templates.map((tpl) => {
                  const fully = tpl.items.length > 0 && tpl.items.every((title) => !!findExistingChecklistItem(title));
                  return (
                    <TouchableOpacity
                      key={tpl.id}
                      style={[
                        styles.checklistCard,
                        fully ? { borderColor: C.border, backgroundColor: C.border + "14" } : { borderColor: C.gold, backgroundColor: C.gold + "14" },
                      ]}
                      onPress={() => openTemplateImport(tpl)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.checklistCardIcon, fully && { opacity: 0.5 }]}>📋</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.checklistCardTitle, { color: fully ? C.muted : C.text }]}>{tpl.name}</Text>
                        <Text style={[styles.checklistCardCount, { color: C.muted }]}>
                          {fully ? "Déjà entièrement importée dans cet espace patient" : `${tpl.items.length} items`}
                        </Text>
                      </View>
                      <Text style={[styles.checklistCardArrow, { color: fully ? C.muted : C.gold }]}>→</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
            <TouchableOpacity
              onPress={() => setTemplatesPicker(false)}
              style={{
                width: "100%",
                height: 48,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: C.border,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 10,
              }}
            >
              <Text style={{ fontFamily: "DM_Sans_600SemiBold", fontSize: 14, color: C.muted }}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL : sélection des items d'un modèle à importer ───────────── */}
      <Modal visible={!!importTpl} transparent animationType="fade" onRequestClose={() => !importingTemplateId && setImportTpl(null)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => !importingTemplateId && setImportTpl(null)} />
          <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.gold }]}>
            {importTpl && (() => {
              const selectableCount = importTpl.items.filter((title) => !findExistingChecklistItem(title)).length;
              const checkedCount = importTpl.items.filter((title, i) => tplChecked[i] && !findExistingChecklistItem(title)).length;
              const importing = importingTemplateId === importTpl.id;
              return (
                <>
                  <Text style={[styles.sheetTitle, { color: C.text }]}>📋 {importTpl.name}</Text>
                  <Text style={[styles.intro, { color: C.muted }]}>
                    Choisis les items qui sont adaptés à ce patient.
                  </Text>
                  <TouchableOpacity onPress={() => toggleAllTplItems(importTpl, checkedCount < selectableCount)} activeOpacity={0.7}>
                    <Text style={[styles.toggleAll, { color: C.gold }]}>
                      {checkedCount === selectableCount ? "Tout décocher" : "Tout cocher"}
                    </Text>
                  </TouchableOpacity>

                  <ScrollView style={styles.scroll} showsVerticalScrollIndicator nestedScrollEnabled>
                    {importTpl.items.map((title, i) => {
                      const checked = !!tplChecked[i];
                      const dup = findExistingChecklistItem(title);
                      return (
                        <TouchableOpacity
                          key={i}
                          style={[styles.itemRow, !!dup && { opacity: 0.55 }]}
                          onPress={() => !dup && toggleTplItem(i)}
                          activeOpacity={0.7}
                        >
                          <View
                            style={[
                              styles.box,
                              { borderColor: checked && !dup ? C.gold : C.border, backgroundColor: checked && !dup ? C.gold : "transparent" },
                            ]}
                          >
                            {checked && !dup && <Text style={styles.boxMark}>✓</Text>}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.itemTitle, { color: checked && !dup ? C.text : C.muted }]}>{title}</Text>
                            {!!dup && <Text style={[styles.dupHint, { color: C.muted }]}>déjà dans ce dossier patient</Text>}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <View style={styles.sheetBtns}>
                    <TouchableOpacity
                      style={[styles.btnSecondary, { borderColor: C.border }]}
                      onPress={() => setImportTpl(null)}
                      disabled={importing}
                    >
                      <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Retour</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btnPrimary, { backgroundColor: C.gold, opacity: checkedCount === 0 || importing ? 0.5 : 1 }]}
                      onPress={confirmImportTemplate}
                      disabled={checkedCount === 0 || importing}
                    >
                      {importing
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.btnPrimaryText}>Importer {checkedCount > 0 ? `(${checkedCount})` : ""}</Text>
                      }
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={!!fullyImportedTplName}
        icon="✅"
        title={`📋 ${fullyImportedTplName ?? ""}`}
        message="Checklist déjà entièrement importée dans cet espace patient."
        confirmLabel="J'ai compris"
        destructive={false}
        singleButton
        onCancel={() => setFullyImportedTplName(null)}
        onConfirm={() => setFullyImportedTplName(null)}
        C={C}
      />

      {/* ── MODAL : choix de la checklist à importer ────────────────────── */}
      <Modal visible={picker} transparent animationType="fade" onRequestClose={() => setPicker(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setPicker(false)} />
          <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.gold }]}>
            <Text style={[styles.sheetTitle, { color: C.text }]}>✨ Checklists suggérées</Text>
            <Text style={[styles.intro, { color: C.muted }]}>
              Choisis la situation qui correspond — les items importés rejoignent ta checklist privée, visible de toi seul. Tu pourras décocher ce qui ne s'applique pas avant d'importer.
            </Text>
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator nestedScrollEnabled>
              {(Object.keys(CHECKLIST_TEMPLATES) as ChecklistContext[]).map((ctx) => {
                const tpl = CHECKLIST_TEMPLATES[ctx];
                const count = tpl.groups.flatMap((g) => g.items).filter((it) => isAdmin || it.sharedWithVisitors).length;
                const color = CHECKLIST_COLORS[tpl.colorKey];
                return (
                  <TouchableOpacity
                    key={ctx}
                    style={[styles.checklistCard, { borderColor: color, backgroundColor: color + "14" }]}
                    onPress={() => openImportContext(ctx)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.checklistCardIcon}>{tpl.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.checklistCardTitle, { color: C.text }]}>{tpl.label}</Text>
                      <Text style={[styles.checklistCardCount, { color: C.muted }]}>{count} items suggérés</Text>
                    </View>
                    <Text style={[styles.checklistCardArrow, { color }]}>→</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setPicker(false)}
              style={{
                width: "100%",
                height: 48,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: C.border,
                alignItems: "center",
                justifyContent: "center",
                marginTop: 10,
              }}
            >
              <Text style={{ fontFamily: "DM_Sans_600SemiBold", fontSize: 14, color: C.muted }}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL : sélection des items d'un contexte à importer ────────── */}
      <Modal visible={!!importCtx && !importWizardList.length} transparent animationType="fade" onRequestClose={() => !importSaving && setImportCtx(null)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => !importSaving && setImportCtx(null)} />
          <View style={[styles.sheet, { backgroundColor: C.card, borderColor: importCtx ? CHECKLIST_COLORS[CHECKLIST_TEMPLATES[importCtx].colorKey] : C.accent }]}>
            {importCtx && (() => {
              const tpl = CHECKLIST_TEMPLATES[importCtx];
              const color = CHECKLIST_COLORS[tpl.colorKey];
              const templateItems = tpl.groups.flatMap((g) => g.items).filter((it) => isAdmin || it.sharedWithVisitors);
              // Comparer à templateItems.length (qui inclut les items déjà
              // importés, non interactifs — voir dup plus bas) empêchait le
              // compte de jamais atteindre le total dès qu'un item était déjà
              // publié, figeant le bouton sur "Tout cocher" sans effet.
              const selectableCount = templateItems.filter((item) => !isDuplicateImportTitle(item.title)).length;
              const customCount = importCustomItems.filter((t) => !isDuplicateImportTitle(t)).length;
              const checkedCount = templateItems.filter((item, i) => importChecked[i] && !isDuplicateImportTitle(item.title)).length + customCount;
              const checkedTemplateCount = checkedCount - customCount;
              // N'annonce "Suivant" (assistant par item) que s'il y aura
              // vraiment au moins un écran à montrer — voir startImportWizard.
              const hasInteractiveItem = importPublic || templateItems.some(
                (item, i) => importChecked[i] && !isDuplicateImportTitle(item.title) && item.needsDetail,
              );
              return (
                <>
                  <Text style={[styles.sheetTitle, { color: C.text }]}>{tpl.icon} {tpl.label}</Text>
                  <TouchableOpacity onPress={() => toggleAllImport(templateItems, checkedTemplateCount < selectableCount)} activeOpacity={0.7}>
                    <Text style={[styles.toggleAll, { color }]}>
                      {checkedTemplateCount === selectableCount ? "Tout décocher" : "Tout cocher"}
                    </Text>
                  </TouchableOpacity>

                  <ScrollView style={styles.scroll} showsVerticalScrollIndicator nestedScrollEnabled>
                    {templateItems.map((item, i) => {
                      const checked = !!importChecked[i];
                      const dupTask = findDuplicateTask(item.title);
                      const dup = dupTask || findExistingChecklistItem(item.title);
                      return (
                        <View key={i} style={!!dup && { opacity: 0.55 }}>
                          <TouchableOpacity
                            style={styles.itemRow}
                            onPress={() => !dup && toggleImportItem(i)}
                            activeOpacity={0.7}
                          >
                            <View
                              style={[
                                styles.box,
                                { borderColor: checked && !dup ? color : C.border, backgroundColor: checked && !dup ? color : "transparent" },
                              ]}
                            >
                              {checked && !dup && <Text style={styles.boxMark}>✓</Text>}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.itemTitle, { color: checked && !dup ? C.text : C.muted }]}>{item.title}</Text>
                              {!!dup && (
                                <Text style={[styles.dupHint, { color: C.muted }]}>
                                  {dupTask ? "déjà dans le Mur d'Entraide" : "déjà dans Ma Checklist"}
                                </Text>
                              )}
                              {!!item.description && !dup && (
                                <Text style={[styles.itemDesc, { color: C.muted }]}>{item.description}</Text>
                              )}
                              {!!item.piecesRequises?.length && !dup && (
                                <Text style={[styles.itemDesc, { color: C.muted }]}>
                                  📎 Pièces à réunir (deviendront des sous-items à cocher) : {item.piecesRequises.join(", ")}
                                </Text>
                              )}
                              {!!item.lienExterne && !dup && (
                                <TouchableOpacity
                                  onPress={() => Linking.openURL(item.lienExterne!.url).catch(() => {})}
                                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                                >
                                  <Text style={[styles.itemLink, { color }]}>🔗 {item.lienExterne.label}</Text>
                                </TouchableOpacity>
                              )}
                              {item.recurrent === "mensuel" && !dup && (
                                <Text style={[styles.itemDesc, { color: C.muted }]}>🔁 Rappel à renouveler chaque mois</Text>
                              )}
                            </View>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                    {importCustomItems.map((title, i) => (
                      <View key={`custom-${i}`} style={styles.itemRow}>
                        <View style={[styles.box, { borderColor: color, backgroundColor: color }]}>
                          <Text style={styles.boxMark}>✓</Text>
                        </View>
                        <Text style={[styles.itemTitle, { color: C.text, flex: 1 }]}>{title}</Text>
                        <TouchableOpacity onPress={() => removeImportCustomItem(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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
                      value={importItemDraft}
                      onChangeText={setImportItemDraft}
                      onSubmitEditing={addImportCustomItem}
                    />
                    <TouchableOpacity
                      style={[styles.groupAddBtn, { borderColor: color, opacity: importItemDraft.trim() ? 1 : 0.5 }]}
                      onPress={addImportCustomItem}
                      disabled={!importItemDraft.trim()}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.groupAddBtnText, { color }]}>+ Ajouter un item</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.divider, { backgroundColor: color }]} />

                  <View style={styles.visibilityRow}>
                    <Text style={[styles.visibilityLabel, { color: C.text }]}>
                      {importPublic ? "📢 Publier aussi sur le Mur d'Entraide" : "🔒 Rester privé (visible de toi seul)"}
                    </Text>
                    <Switch value={importPublic} onValueChange={setImportPublic} trackColor={{ true: color }} />
                  </View>

                  <View style={styles.sheetBtns}>
                    <TouchableOpacity
                      style={[styles.btnSecondary, { borderColor: C.border }]}
                      onPress={() => setImportCtx(null)}
                      disabled={importSaving}
                    >
                      <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Retour</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btnPrimary, { backgroundColor: color, opacity: checkedCount === 0 || importSaving ? 0.5 : 1 }]}
                      onPress={startImportWizard}
                      disabled={checkedCount === 0 || importSaving}
                    >
                      {importSaving
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.btnPrimaryText}>{hasInteractiveItem ? "Suivant" : "Importer"} {checkedCount > 0 ? `(${checkedCount})` : ""}</Text>
                      }
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ── MODAL : assistant d'import "un item à la fois" (échéance →
          urgent, persistés même en privé — puis précision si
          item.needsDetail) — voir startImportWizard. Le calendrier
          s'affiche directement (pas de bouton à ouvrir) ; une fois une date
          choisie, l'écran enchaîne sur "Marquer Urgent" (dérivé de
          fields.dateLimite, pas d'état séparé). Overlay séparé plutôt qu'un
          pas de plus dans le sheet précédent : évite d'empiler deux <Modal>
          visibles sur Android. */}
      <Modal visible={importWizardList.length > 0} transparent animationType="fade" onRequestClose={() => !importSaving && importWizardBack()}>
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => !importSaving && importWizardBack()} />
          {importWizardList.length > 0 && importCtx && (() => {
            const color = CHECKLIST_COLORS[CHECKLIST_TEMPLATES[importCtx].colorKey];
            const entry = importWizardList[importWizardStep];
            const fields = importWizardData[entry.key] ?? { dateLimite: "", urgent: !!entry.item.urgent, detail: "" };
            const isLast = importWizardStep === importWizardList.length - 1;
            return (
              <View style={[styles.sheet, { backgroundColor: C.card, borderColor: color }]}>
                <Text style={[styles.wizardProgress, { color: C.muted }]}>
                  Item {importWizardStep + 1} / {importWizardList.length}
                </Text>
                <ScrollView style={styles.scroll} showsVerticalScrollIndicator keyboardShouldPersistTaps="handled">
                  <Text style={[styles.sheetTitle, { color: C.text }]}>{entry.item.title}</Text>
                  {!!entry.item.description && (
                    <Text style={[styles.itemDesc, { color: C.muted, marginBottom: 10 }]}>{entry.item.description}</Text>
                  )}

                  {entry.item.needsDetail && (
                    <>
                      <Text style={[styles.fieldLabel, { color: C.gold }]}>Précision (optionnel)</Text>
                      <TextInput
                        style={[styles.input, styles.wizardDetailInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                        placeholder="Ex. chez qui, laquelle, pour qui, avec qui…"
                        placeholderTextColor={C.muted}
                        value={fields.detail}
                        onChangeText={(t) => updateImportWizardField(importWizardStep, { detail: t })}
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
                        onSelect={(d) => updateImportWizardField(importWizardStep, { dateLimite: d })}
                        calMonth={importWizardDLCalMonth}
                        onMonthChange={setImportWizardDLCalMonth}
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
                          styles.dateBtn,
                          { backgroundColor: C.bg, borderColor: C.border, marginTop: 0, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14 },
                        ]}
                      >
                        <Text style={[styles.dateBtnText, { color: C.text }]}>📅 {fields.dateLimite}</Text>
                        <TouchableOpacity
                          onPress={() => updateImportWizardField(importWizardStep, { dateLimite: "" })}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text style={[styles.itemLink, { color, marginTop: 0 }]}>✎ Modifier la date</Text>
                        </TouchableOpacity>
                      </View>

                      <Text style={[styles.fieldLabel, { color: C.gold }]}>Marquer Urgent</Text>
                      <TouchableOpacity
                        onPress={() => updateImportWizardField(importWizardStep, { urgent: !fields.urgent })}
                        activeOpacity={0.8}
                        style={[
                          styles.dateBtn,
                          { backgroundColor: fields.urgent ? C.danger + "22" : C.bg, borderColor: fields.urgent ? C.danger : C.border },
                        ]}
                      >
                        <Text style={[styles.dateBtnText, { color: fields.urgent ? C.danger : C.text }]}>
                          {fields.urgent ? "🔴 Urgent" : "⚪ Marquer urgent"}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </ScrollView>

                <View style={styles.sheetBtns}>
                  <TouchableOpacity
                    style={[styles.btnSecondary, { borderColor: C.border }]}
                    onPress={importWizardBack}
                    disabled={importSaving}
                  >
                    <Text style={[styles.btnSecondaryText, { color: C.muted }]}>
                      {importWizardStep === 0 ? "Retour" : "Précédent"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btnPrimary, { backgroundColor: color, opacity: importSaving ? 0.5 : 1 }]}
                    onPress={importWizardNext}
                    disabled={importSaving}
                  >
                    {importSaving
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.btnPrimaryText}>{isLast ? "✅ Publier" : "Suivant →"}</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })()}
        </View>
      </Modal>

      {/* ── MODAL : préparer un modèle de courrier ──────────────────────── */}
      <Modal visible={!!letterModal} transparent animationType="fade" onRequestClose={() => !letterSaving && closeLetterModal()}>
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => !letterSaving && closeLetterModal()} />
          {letterModal && (() => {
            const missingRequired = letterModal.fields.some((f) => f.required && !letterValues[f.key]?.trim());
            return (
              <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.accent }]}>
                <Text style={[styles.sheetTitle, { color: C.text }]}>{letterModal.icon} {letterModal.label}</Text>
                <Text style={[styles.intro, { color: C.muted }]}>{letterModal.intro}</Text>

                {!letterPreview ? (
                  <ScrollView style={styles.scroll} showsVerticalScrollIndicator keyboardShouldPersistTaps="handled">
                    {letterModal.fields.map((f) => (
                      <View key={f.key}>
                        <Text style={[styles.fieldLabel, { color: C.gold }]}>
                          {f.label}{f.required ? " *" : ""}
                        </Text>
                        <TextInput
                          style={[
                            styles.input,
                            f.multiline && styles.wizardDetailInput,
                            { backgroundColor: C.bg, borderColor: C.border, color: C.text, marginTop: 0 },
                          ]}
                          placeholder={f.placeholder}
                          placeholderTextColor={C.muted}
                          value={letterValues[f.key] ?? ""}
                          onChangeText={(t) => updateLetterField(f.key, t)}
                          multiline={f.multiline}
                        />
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <ScrollView style={styles.scroll} showsVerticalScrollIndicator>
                    <View style={[styles.letterPreview, { borderColor: C.border, backgroundColor: C.bg }]}>
                      {splitAlignedLines(letterModal.body(letterValues)).map((line, i) => (
                        <Text
                          key={i}
                          style={[styles.letterPreviewLine, { color: C.text, textAlign: line.rightAlign ? "right" : "left" }]}
                        >
                          {line.text || " "}
                        </Text>
                      ))}
                    </View>
                    {!!letterModal.piecesJointes.length && (
                      <View style={[styles.letterPieces, { borderColor: C.gold, backgroundColor: `${C.gold}14` }]}>
                        <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 0 }]}>📎 Pièces jointes à envoyer avec ce courrier</Text>
                        {letterModal.piecesJointes.map((p, i) => (
                          <Text key={i} style={[styles.itemDesc, { color: C.text }]}>• {p}</Text>
                        ))}
                      </View>
                    )}
                  </ScrollView>
                )}

                <View style={styles.sheetBtns}>
                  <TouchableOpacity
                    style={[styles.btnSecondary, { borderColor: C.border }]}
                    onPress={() => (letterPreview ? setLetterPreview(false) : closeLetterModal())}
                    disabled={letterSaving}
                  >
                    <Text style={[styles.btnSecondaryText, { color: C.muted }]}>{letterPreview ? "Modifier" : "Annuler"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btnPrimary, { backgroundColor: C.accent, opacity: missingRequired || letterSaving ? 0.5 : 1 }]}
                    onPress={() => (letterPreview ? downloadLetter() : setLetterPreview(true))}
                    disabled={missingRequired || letterSaving}
                  >
                    {letterSaving
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={styles.btnPrimaryText}>{letterPreview ? "💾 Enregistrer / Télécharger" : "Aperçu →"}</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            );
          })()}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontFamily: "DM_Sans_600SemiBold", fontSize: 11,
    letterSpacing: 1, textTransform: "uppercase",
    marginBottom: 10, marginTop: 20,
  },
  wrapperCard: { borderWidth: 1, borderRadius: 14, padding: 12 },
  card: { borderWidth: 1, borderRadius: 14, padding: 6 },
  empty: { fontFamily: "DM_Sans_400Regular", fontSize: 13, padding: 10 },
  groupHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 12, borderBottomWidth: 1,
  },
  groupHeaderText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, flex: 1, marginRight: 10 },
  groupChevron: { fontFamily: "DM_Sans_700Bold", fontSize: 14, flexShrink: 0 },
  groupCard: { marginTop: 10, marginBottom: 4 },
  groupTintWrap: { borderRadius: 14, marginTop: 4, marginBottom: 6, paddingHorizontal: 10, overflow: "hidden" },
  selectBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, marginBottom: 10,
  },
  selectCount: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12.5 },
  selectBarBtn: { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1 },
  selectBarBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 12 },
  selectDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  selectDotCheck: { color: "#fff", fontSize: 11, fontFamily: "DM_Sans_700Bold" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 8 },
  rowText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  rowTextDone: { textDecorationLine: "line-through" },
  pieceWrap: { marginLeft: 26 },
  itemLinkWrap: { paddingHorizontal: 8, paddingBottom: 8, marginTop: -4 },
  rowDivider: { height: 1, marginHorizontal: 8, marginTop: 8, marginBottom: 2 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontFamily: "DM_Sans_400Regular", fontSize: 14, marginTop: 12 },
  groupAddRow: { padding: 6, paddingTop: 2 },
  groupAddInput: { borderWidth: 1, borderRadius: 10, padding: 10, fontFamily: "DM_Sans_400Regular", fontSize: 13, marginTop: 6 },
  groupAddBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center", marginTop: 6 },
  groupAddBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  btnSecondary: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 8 },
  btnSecondaryText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  btnPrimary: { flex: 1.3, borderRadius: 10, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  btnPrimaryText: { fontFamily: "DM_Sans_700Bold", fontSize: 15, color: "#fff" },
  importBanner: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, marginTop: 14 },
  importBannerText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13.5 },
  documentsBtn: { borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 10 },
  documentsBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 15, color: "#fff" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "center", alignItems: "center" },
  sheet: { width: "88%", borderRadius: 20, borderWidth: 1, padding: 20, maxHeight: "82%" },
  sheetTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 4 },
  sheetBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
  divider: { height: 2, borderRadius: 1, marginVertical: 14, opacity: 0.6 },
  intro: { fontFamily: "DM_Sans_400Regular", fontSize: 13, lineHeight: 18, marginBottom: 14 },

  checklistCard: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1.5, borderRadius: 14, padding: 14, marginBottom: 10 },
  checklistCardIcon: { fontSize: 26 },
  checklistCardTitle: { fontFamily: "DM_Sans_700Bold", fontSize: 15 },
  checklistCardCount: { fontFamily: "DM_Sans_400Regular", fontSize: 12.5, marginTop: 2 },
  checklistCardArrow: { fontFamily: "DM_Sans_700Bold", fontSize: 18 },

  toggleAll: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12.5, marginBottom: 10 },
  scroll: { maxHeight: 340 },
  itemRow: { flexDirection: "row", gap: 10, paddingVertical: 8, alignItems: "flex-start" },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginTop: 1 },
  boxMark: { color: "#fff", fontSize: 13, fontFamily: "DM_Sans_700Bold" },
  itemTitle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14, flexShrink: 1 },
  dupHint: { fontFamily: "DM_Sans_400Regular", fontSize: 11.5, marginTop: 2 },
  itemDesc: { fontFamily: "DM_Sans_400Regular", fontSize: 12.5, lineHeight: 17, marginTop: 2 },
  itemLink: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12.5, lineHeight: 17, marginTop: 2, textDecorationLine: "underline" },
  urgentChip: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 1, marginLeft: 8 },
  urgentChipText: { fontFamily: "DM_Sans_700Bold", fontSize: 9.5, letterSpacing: 0.4, textTransform: "uppercase" },
  detailInput: {
    marginLeft: 32, marginBottom: 8, marginTop: -4, height: 36, borderRadius: 8, borderWidth: 1,
    paddingHorizontal: 10, fontFamily: "DM_Sans_400Regular", fontSize: 12.5,
  },
  visibilityRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 10, paddingHorizontal: 2,
  },
  visibilityLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, flex: 1, marginRight: 10 },
  dateBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 10 },
  dateBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  wizardProgress: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11.5, letterSpacing: 0.3, marginBottom: 8 },
  fieldLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, marginTop: 10, marginBottom: 4 },
  wizardDetailInput: { minHeight: 70, marginTop: 0 },
  letterPreview: {
    borderWidth: 1, borderRadius: 10, padding: 12,
  },
  letterPreviewLine: {
    fontFamily: "DM_Sans_400Regular", fontSize: 13, lineHeight: 20,
  },
  letterPieces: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 12 },
});
