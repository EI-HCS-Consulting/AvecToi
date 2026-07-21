import { useCallback, useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Modal, Switch,
} from "react-native";
import * as Crypto from "expo-crypto";
import { supabase } from "@/lib/supabase";
import ConfirmModal from "@/components/ConfirmModal";
import { normalizePhone } from "@/lib/phone";
import { CHECKLIST_TEMPLATES, addDaysIso, type ChecklistContext, type ChecklistItem } from "@/lib/checklistTemplates";
import type { PersonalChecklistItem, IntervenantChecklistTemplate, Task } from "@/lib/types";
import type { Theme } from "@/lib/themes";

interface Props {
  spaceId: string;
  isAdmin: boolean;
  ownerPrenom: string;
  ownerNom: string;
  // "ADMIN" côté admin (même convention que author_pin sur tasks/news_entries),
  // sinon le PIN de session du visiteur.
  ownerPin: string;
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

// Bloc "Ma Checklist" (Mon Compte, admin + visiteur) : liste personnelle où
// chacun peut cocher "Fait" directement, ajouter ses propres items en texte
// libre, ou importer une des 3 checklists suggérées d'Entraide. Un item
// importé reste lié à un vrai besoin `tasks` (visible du Mur d'Entraide) :
// basculer son statut ici met aussi à jour tasks.status, qui se propage
// partout via l'abonnement realtime déjà en place dans Entraide.tsx.
export default function MyChecklist({ spaceId, isAdmin, ownerPrenom, ownerNom, ownerPin, C, hideImportBanner, intervenantTelephone }: Props) {
  const normalizedTelephone = intervenantTelephone ? normalizePhone(intervenantTelephone) : "";
  const canUseTemplates = normalizedTelephone.length >= 6;
  const [items, setItems] = useState<PersonalChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Un seul sous-bloc ouvert à la fois, comme "Mes contributions" — clé de
  // groupe (ChecklistContext, "perso", ou nom de checklist perso créée).
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const [customText, setCustomText] = useState("");
  const [addingCustom, setAddingCustom] = useState(false);

  const [createModal, setCreateModal] = useState(false);
  const [newChecklistName, setNewChecklistName] = useState("");
  const [newChecklistItemsText, setNewChecklistItemsText] = useState("");
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

  // Sélection multiple (restant appuyé sur un item, comme dans le Mur
  // d'Entraide) — pour supprimer plusieurs items de sa checklist en une fois.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectionMode = selectedIds.size > 0;
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkDeleteSaving, setBulkDeleteSaving] = useState(false);

  const [picker, setPicker] = useState(false);
  const [importCtx, setImportCtx] = useState<ChecklistContext | null>(null);
  const [importChecked, setImportChecked] = useState<Record<number, boolean>>({});
  const [importCustomText, setImportCustomText] = useState("");
  const [importSaving, setImportSaving] = useState(false);
  // Requêté à l'ouverture du picker plutôt que tenu en permanence — MyChecklist
  // n'a pas besoin de la liste complète des besoins hors de ce flux d'import.
  const [existingTasks, setExistingTasks] = useState<Task[]>([]);

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

  async function toggleItem(item: PersonalChecklistItem) {
    const nextStatus: PersonalChecklistItem["status"] = item.status === "fait" ? "a_faire" : "fait";
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, status: nextStatus } : it)));
    await supabase.from("personal_checklist_items").update({ status: nextStatus }).eq("id", item.id);
    if (item.task_id) {
      await supabase.from("tasks").update({ status: nextStatus === "fait" ? "fait" : "ouvert" }).eq("id", item.task_id);
    }
  }

  async function addCustomItems() {
    const titles = linesToTitles(customText);
    if (!titles.length) return;
    setAddingCustom(true);
    const rows = titles.map((title) => ({
      space_id: spaceId,
      owner_prenom: ownerPrenom,
      owner_nom: ownerNom,
      owner_pin: ownerPin,
      title,
      status: "a_faire" as const,
      task_id: null,
      checklist_context: null,
      custom_checklist_name: null,
    }));
    const { error } = await supabase.from("personal_checklist_items").insert(rows);
    setAddingCustom(false);
    if (error) {
      Alert.alert("Erreur", "Impossible d'ajouter : " + error.message);
      return;
    }
    setCustomText("");
    loadItems();
  }

  async function confirmCreateChecklist() {
    const name = newChecklistName.trim();
    const titles = linesToTitles(newChecklistItemsText);
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
    setNewChecklistItemsText("");
    setOpenGroup(name);
    loadItems();
  }

  async function addItemToGroup(name: string) {
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
      checklist_context: null,
      custom_checklist_name: name,
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

  async function importTemplate(tpl: IntervenantChecklistTemplate) {
    if (!tpl.items.length) return;
    setImportingTemplateId(tpl.id);
    const rows = tpl.items.map((title) => ({
      space_id: spaceId,
      owner_prenom: ownerPrenom,
      owner_nom: ownerNom,
      owner_pin: ownerPin,
      title,
      status: "a_faire" as const,
      task_id: null,
      checklist_context: null,
      custom_checklist_name: tpl.name,
    }));
    const { error } = await supabase.from("personal_checklist_items").insert(rows);
    setImportingTemplateId(null);
    if (error) {
      Alert.alert("Erreur", "Impossible d'importer le modèle : " + error.message);
      return;
    }
    setTemplatesPicker(false);
    setOpenGroup(tpl.name);
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

  async function openImportPicker() {
    setPicker(true);
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("space_id", spaceId)
      .eq("category", "administratif")
      .neq("status", "fait");
    setExistingTasks((data ?? []) as Task[]);
  }

  function openImportContext(ctx: ChecklistContext) {
    setImportCtx(ctx);
    setImportChecked({});
    setImportCustomText("");
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

  async function confirmImport() {
    if (!importCtx) return;
    const tpl = CHECKLIST_TEMPLATES[importCtx];
    const templateItems = tpl.groups.flatMap((g) => g.items).filter((it) => isAdmin || it.sharedWithVisitors);
    const selected = [
      ...templateItems.filter((item, i) => importChecked[i] && !findDuplicateTask(item.title)),
      ...linesToTitles(importCustomText)
        .map((title): ChecklistItem => ({ title, description: "", sharedWithVisitors: true }))
        .filter((item) => !findDuplicateTask(item.title)),
    ];
    if (!selected.length) return;
    setImportSaving(true);
    const batchId = Crypto.randomUUID();
    const taskRows = selected.map((item) => ({
      space_id: spaceId,
      title: item.title,
      description: item.description,
      category: "administratif" as const,
      status: "ouvert" as const,
      created_by: isAdmin ? "admin" : "visiteur",
      author_prenom: ownerPrenom || null,
      author_nom: ownerNom || null,
      author_pin: ownerPin || null,
      date_limite: item.dateOffsetDays ? addDaysIso(item.dateOffsetDays) : null,
      urgent: !!item.urgent,
      checklist_batch_id: batchId,
    }));
    const { data: insertedTasks, error } = await supabase.from("tasks").insert(taskRows).select("id");
    if (error || !insertedTasks) {
      setImportSaving(false);
      Alert.alert("Erreur", "Impossible d'importer la checklist : " + (error?.message ?? ""));
      return;
    }
    const personalRows = insertedTasks.map((row: { id: string }, i: number) => ({
      space_id: spaceId,
      owner_prenom: ownerPrenom,
      owner_nom: ownerNom,
      owner_pin: ownerPin,
      title: selected[i].title,
      status: "a_faire" as const,
      task_id: row.id,
      checklist_context: importCtx,
      custom_checklist_name: null,
    }));
    const { error: personalError } = await supabase.from("personal_checklist_items").insert(personalRows);
    setImportSaving(false);
    if (personalError) {
      Alert.alert("Erreur", "Impossible d'importer la checklist : " + personalError.message);
      return;
    }
    setImportCtx(null);
    loadItems();
  }

  if (!canLoad) return null;

  const groupItems = (key: string) =>
    items.filter((it) => {
      if (key === "perso") return !it.checklist_context && !it.custom_checklist_name;
      if (it.custom_checklist_name) return it.custom_checklist_name === key;
      return it.checklist_context === key;
    });

  // Une checklist perso créée via "+ Créer une checklist" n'existe que si
  // elle a au moins un item (pas de ligne "coquille vide" en base).
  const customNames = Array.from(
    new Set(items.map((it) => it.custom_checklist_name).filter((n): n is string => !!n)),
  );

  // customName : nom de la checklist perso si ce groupe en est une — permet
  // d'y ajouter de nouveaux items directement (voir groupAddText). Absent
  // pour les checklists suggérées importées et pour "Mes items personnels"
  // (qui a déjà son propre champ d'ajout, tout en haut du bloc).
  function renderGroupCard(groupItemsList: PersonalChecklistItem[], customName?: string) {
    return (
      <View style={[styles.card, styles.groupCard, { backgroundColor: C.card, borderColor: C.border }]}>
        {groupItemsList.length === 0 ? (
          <Text style={[styles.empty, { color: C.muted }]}>Aucun item pour le moment.</Text>
        ) : groupItemsList.map((item) => {
          const isSel = selectedIds.has(item.id);
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.row, { borderBottomColor: C.border }, isSel && { backgroundColor: `${C.accent}18` }]}
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
                {item.title}
              </Text>
              {!selectionMode && (
                <Switch
                  value={item.status === "fait"}
                  onValueChange={() => toggleItem(item)}
                  trackColor={{ false: C.border, true: C.accent }}
                  thumbColor="#fff"
                />
              )}
            </TouchableOpacity>
          );
        })}
        {customName && (
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
              onPress={() => addItemToGroup(customName)}
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
      <Text style={[styles.sectionTitle, { color: C.gold }]}>Ma Checklist</Text>

      <View style={[styles.wrapperCard, { backgroundColor: C.card, borderColor: C.border }]}>
        {loading ? (
          <ActivityIndicator color={C.accent} style={{ marginVertical: 16 }} />
        ) : (
          <>
            {items.length === 0 && (
              <Text style={[styles.empty, { color: C.muted }]}>Ta checklist est vide pour le moment.</Text>
            )}

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
                  <TouchableOpacity onPress={exitSelection} style={[styles.selectBarBtn, { borderColor: C.border }]}>
                    <Text style={[styles.selectBarBtnText, { color: C.muted }]}>Annuler</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {(Object.keys(CHECKLIST_TEMPLATES) as ChecklistContext[]).map((ctx) => {
              const tpl = CHECKLIST_TEMPLATES[ctx];
              const groupList = groupItems(ctx);
              if (groupList.length === 0) return null;
              const isOpen = openGroup === ctx;
              return (
                <View key={ctx}>
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
                  {isOpen && renderGroupCard(groupList)}
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
                  {isOpen && renderGroupCard(groupList, name)}
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

        <TextInput
          style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
          placeholder="+ Ajouter un item perso (un par ligne)"
          placeholderTextColor={C.muted}
          value={customText}
          onChangeText={setCustomText}
          multiline
        />
        <TouchableOpacity
          style={[styles.btnSecondary, { borderColor: C.accent, opacity: customText.trim() ? 1 : 0.5 }]}
          onPress={addCustomItems}
          disabled={!customText.trim() || addingCustom}
          activeOpacity={0.8}
        >
          {addingCustom
            ? <ActivityIndicator color={C.accent} />
            : <Text style={[styles.btnSecondaryText, { color: C.accent }]}>+ Ajouter à ma checklist</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnSecondary, { borderColor: C.gold, marginTop: 8 }]}
          onPress={() => setCreateModal(true)}
          activeOpacity={0.8}
        >
          <Text style={[styles.btnSecondaryText, { color: C.gold }]}>+ Créer une checklist</Text>
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
            <Text style={[styles.importBannerText, { color: C.gold }]}>✨ Importer une checklist toute prête</Text>
          </TouchableOpacity>
        )}
      </View>

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

      {/* ── MODAL : créer sa propre checklist nommée ────────────────────── */}
      <Modal visible={createModal} transparent animationType="slide" onRequestClose={() => !creatingChecklist && setCreateModal(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => !creatingChecklist && setCreateModal(false)} />
          <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.gold, paddingBottom: 64 }]}>
            <Text style={[styles.sheetTitle, { color: C.text }]}>📋 Créer une checklist</Text>
            <Text style={[styles.intro, { color: C.muted }]}>
              Donne-lui un nom, puis ajoute ses premiers items.
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text, marginTop: 0 }]}
              placeholder="Nom de la checklist"
              placeholderTextColor={C.muted}
              value={newChecklistName}
              onChangeText={setNewChecklistName}
            />
            <TextInput
              style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
              placeholder="Items (un par ligne)"
              placeholderTextColor={C.muted}
              value={newChecklistItemsText}
              onChangeText={setNewChecklistItemsText}
              multiline
            />
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
                  { backgroundColor: C.gold, opacity: !newChecklistName.trim() || !linesToTitles(newChecklistItemsText).length || creatingChecklist ? 0.5 : 1 },
                ]}
                onPress={confirmCreateChecklist}
                disabled={!newChecklistName.trim() || !linesToTitles(newChecklistItemsText).length || creatingChecklist}
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
      <Modal visible={templatesPicker} transparent animationType="slide" onRequestClose={() => setTemplatesPicker(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setTemplatesPicker(false)} />
          <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.gold, marginBottom: 12 }]}>
            <Text style={[styles.sheetTitle, { color: C.text }]}>📥 Mes modèles</Text>
            <Text style={[styles.intro, { color: C.muted }]}>
              Importe une checklist que tu as enregistrée comme modèle (💾, depuis un autre dossier patient) dans ce dossier-ci.
            </Text>
            {loadingTemplates ? (
              <ActivityIndicator color={C.gold} style={{ marginVertical: 16 }} />
            ) : templates.length === 0 ? (
              <Text style={[styles.empty, { color: C.muted }]}>
                Aucun modèle pour le moment. Enregistre une checklist comme modèle avec 💾, depuis son en-tête.
              </Text>
            ) : (
              <ScrollView style={styles.scroll} showsVerticalScrollIndicator nestedScrollEnabled>
                {templates.map((tpl) => (
                  <TouchableOpacity
                    key={tpl.id}
                    style={[styles.checklistCard, { borderColor: C.gold, backgroundColor: C.gold + "14" }]}
                    onPress={() => importTemplate(tpl)}
                    disabled={importingTemplateId === tpl.id}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.checklistCardIcon}>📋</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.checklistCardTitle, { color: C.text }]}>{tpl.name}</Text>
                      <Text style={[styles.checklistCardCount, { color: C.muted }]}>{tpl.items.length} items</Text>
                    </View>
                    {importingTemplateId === tpl.id
                      ? <ActivityIndicator color={C.gold} />
                      : <Text style={[styles.checklistCardArrow, { color: C.gold }]}>→</Text>
                    }
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              onPress={() => setTemplatesPicker(false)}
              style={[styles.btnSecondary, { borderColor: C.border, marginTop: 10, alignSelf: "stretch" }]}
            >
              <Text style={[styles.btnSecondaryText, { color: C.muted, textAlign: "center" }]}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL : choix de la checklist à importer ────────────────────── */}
      <Modal visible={picker} transparent animationType="slide" onRequestClose={() => setPicker(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setPicker(false)} />
          <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.gold }]}>
            <Text style={[styles.sheetTitle, { color: C.text }]}>✨ Checklists suggérées</Text>
            <Text style={[styles.intro, { color: C.muted }]}>
              Choisis la situation qui correspond — tu pourras décocher ce qui ne s'applique pas avant d'importer.
            </Text>
            {(Object.keys(CHECKLIST_TEMPLATES) as ChecklistContext[]).map((ctx) => {
              const tpl = CHECKLIST_TEMPLATES[ctx];
              const count = tpl.groups.flatMap((g) => g.items).filter((it) => isAdmin || it.sharedWithVisitors).length;
              const color = C[tpl.colorKey];
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
            <TouchableOpacity
              onPress={() => setPicker(false)}
              style={[styles.btnSecondary, { borderColor: C.border, marginTop: 10, alignSelf: "stretch" }]}
            >
              <Text style={[styles.btnSecondaryText, { color: C.muted, textAlign: "center" }]}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL : sélection des items d'un contexte à importer ────────── */}
      <Modal visible={!!importCtx} transparent animationType="slide" onRequestClose={() => !importSaving && setImportCtx(null)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => !importSaving && setImportCtx(null)} />
          <View style={[styles.sheet, { backgroundColor: C.card, borderColor: importCtx ? C[CHECKLIST_TEMPLATES[importCtx].colorKey] : C.accent }]}>
            {importCtx && (() => {
              const tpl = CHECKLIST_TEMPLATES[importCtx];
              const color = C[tpl.colorKey];
              const templateItems = tpl.groups.flatMap((g) => g.items).filter((it) => isAdmin || it.sharedWithVisitors);
              const customCount = linesToTitles(importCustomText).filter((t) => !findDuplicateTask(t)).length;
              const checkedCount = templateItems.filter((item, i) => importChecked[i] && !findDuplicateTask(item.title)).length + customCount;
              return (
                <>
                  <Text style={[styles.sheetTitle, { color: C.text }]}>{tpl.icon} {tpl.label}</Text>
                  <TouchableOpacity onPress={() => toggleAllImport(templateItems, checkedCount < templateItems.length)} activeOpacity={0.7}>
                    <Text style={[styles.toggleAll, { color }]}>
                      {checkedCount === templateItems.length ? "Tout décocher" : "Tout cocher"}
                    </Text>
                  </TouchableOpacity>

                  <ScrollView style={styles.scroll} showsVerticalScrollIndicator nestedScrollEnabled>
                    {templateItems.map((item, i) => {
                      const checked = !!importChecked[i];
                      const dup = findDuplicateTask(item.title);
                      return (
                        <TouchableOpacity
                          key={i}
                          style={[styles.itemRow, !!dup && { opacity: 0.55 }]}
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
                            {!!dup && <Text style={[styles.dupHint, { color: C.muted }]}>déjà dans le Mur d'Entraide</Text>}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <TextInput
                    style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text, marginTop: 8 }]}
                    placeholder="+ Ajouter un item perso (un par ligne)"
                    placeholderTextColor={C.muted}
                    value={importCustomText}
                    onChangeText={setImportCustomText}
                    multiline
                  />

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
                      onPress={confirmImport}
                      disabled={checkedCount === 0 || importSaving}
                    >
                      {importSaving
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
  groupHeaderText: { fontFamily: "DM_Sans_700Bold", fontSize: 14 },
  groupChevron: { fontFamily: "DM_Sans_700Bold", fontSize: 14 },
  groupCard: { marginTop: 10, marginBottom: 4 },
  selectBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, marginBottom: 10,
  },
  selectCount: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12.5 },
  selectBarBtn: { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1 },
  selectBarBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 12 },
  selectDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  selectDotCheck: { color: "#fff", fontSize: 11, fontFamily: "DM_Sans_700Bold" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1 },
  rowText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  rowTextDone: { textDecorationLine: "line-through" },
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

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, padding: 20, paddingBottom: 40, maxHeight: "82%" },
  sheetTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 4 },
  sheetBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
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
});
