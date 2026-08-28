import { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { supabase } from "@/lib/supabase";
import { getVisitorSession } from "@/lib/visitorSession";
import type { Task, ShoppingListItem } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Insensible à la casse/accents pour éviter les doublons — même principe que
// normalizeShoppingLabel dans Entraide.tsx.
function normalizeShoppingLabel(s: string) {
  return s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Liste de courses éditable en bullet points, partagée entre le bouton
// "👁️ Aperçu" d'un besoin category="courses" (Entraide.tsx) et "📄 Mes
// documents" (MyChecklist.tsx) — les deux ouvrent ce même composant sur le
// même task, donc une modification faite d'un côté (ajout, suppression,
// coché "acheté") est visible de l'autre sans aucune synchronisation
// explicite : c'est la même table shopping_list_items qui est lue/écrite.
// Ouvert à tout visiteur ou admin de l'espace, comme la modification de la
// description d'un besoin (saveModifyDesc dans Entraide.tsx) — pas de
// restriction à l'auteur du besoin. Seul le cochage des articles est
// restreint : une fois que quelqu'un a cliqué "Je m'en occupe" sur le besoin
// (claimed_by_prenom/nom renseignés), seule cette personne peut cocher/
// décocher — tant que personne ne l'a pris en charge, la liste reste ouverte
// à tous pour dispatcher les articles. Même sans prise en charge du besoin,
// un article déjà coché par quelqu'un ne peut être décoché que par cette
// même personne (itemLockedForMe) — on peut cocher les articles restants,
// jamais annuler le travail d'un autre.
interface Props {
  visible: boolean;
  onClose: () => void;
  C: Theme;
  task: Task | null;
  isAdmin: boolean;
  spaceId: string;
  // Auteur du besoin "courses" affiché — avec isAdmin, détermine qui peut
  // faire un appui long pour supprimer plusieurs articles à la fois. Le
  // simple ✕ par article reste ouvert à tous, comme avant.
  isAuthor: boolean;
}

export default function ShoppingListModal({ visible, onClose, C, task, isAdmin, spaceId, isAuthor }: Props) {
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [myPrenom, setMyPrenom] = useState("");
  const [myNom, setMyNom] = useState("");
  // Sélection multiple par appui long, réservée à isAdmin/isAuthor — voir
  // deleteSelected. Reset à chaque fermeture du popup (useEffect ci-dessous).
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const canManageList = isAdmin || isAuthor;

  useEffect(() => {
    (async () => {
      if (isAdmin) {
        const { data } = await supabase.auth.getUser();
        setMyPrenom((data.user?.user_metadata?.firstname ?? "").trim());
        setMyNom((data.user?.user_metadata?.lastname ?? "").trim());
      } else {
        const session = await getVisitorSession();
        setMyPrenom(session?.prenom ?? "");
        setMyNom(session?.nom ?? "");
      }
    })();
  }, [isAdmin]);

  const isSamePerson = (prenom: string | null | undefined, nom: string | null | undefined) =>
    !!prenom && !!nom
      && prenom.trim().toLowerCase() === myPrenom.trim().toLowerCase()
      && nom.trim().toLowerCase() === myNom.trim().toLowerCase();

  // Prise en charge = quelqu'un a cliqué "Je m'en occupe" sur le besoin
  // (claimed_by_prenom renseigné, quel que soit le statut courant — y
  // compris "fait", pour ne pas rouvrir le cochage à tous après coup).
  const claimedByOther = !!task?.claimed_by_prenom && !isSamePerson(task.claimed_by_prenom, task.claimed_by_nom);

  // Un article déjà coché par quelqu'un d'autre ne peut pas être décoché,
  // même sans prise en charge du besoin — évite qu'une personne annule le
  // travail d'une autre pendant le dispatch libre de la liste.
  const itemLockedForMe = (item: ShoppingListItem) =>
    item.bought && !!(item.bought_by_prenom || item.bought_by_nom) && !isSamePerson(item.bought_by_prenom, item.bought_by_nom);

  useEffect(() => {
    if (!visible || !task) { setItems([]); return; }
    setSelectMode(false);
    setSelectedIds(new Set());
    let cancelled = false;
    setLoading(true);
    supabase
      .from("shopping_list_items")
      .select("*")
      .eq("task_id", task.id)
      .order("position", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setItems((data ?? []) as ShoppingListItem[]);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [visible, task]);

  async function toggleBought(item: ShoppingListItem) {
    if (claimedByOther) return;
    if (itemLockedForMe(item)) return;
    const nextBought = !item.bought;
    const boughtBy = nextBought ? { bought_by_prenom: myPrenom || null, bought_by_nom: myNom || null } : { bought_by_prenom: null, bought_by_nom: null };
    const nextItems = items.map((it) => (it.id === item.id ? { ...it, bought: nextBought, ...boughtBy } : it));
    setItems(nextItems);
    await supabase.from("shopping_list_items").update({ bought: nextBought, ...boughtBy }).eq("id", item.id);
    // Coche le dernier article → plus besoin de repasser par "C'est fait"
    // (photo + PIN, voir confirmDone dans Entraide.tsx) : la liste pleine
    // vaut déjà preuve que les courses sont faites.
    if (nextBought && task && task.status !== "fait" && nextItems.length > 0 && nextItems.every((it) => it.bought)) {
      await supabase.from("tasks").update({ status: "fait" }).eq("id", task.id);
      // Miroir pour "Ma Checklist" (voir syncPersonalChecklistStatus dans
      // Entraide.tsx) : ce chemin de complétion automatique passe par ici,
      // pas par les autres endroits qui font déjà ce miroir.
      await supabase.from("personal_checklist_items").update({ status: "fait" }).eq("task_id", task.id);
    }
    // Redécocher un article après coup annule ce constat : le besoin repasse
    // à l'état où il était avant d'être marqué "fait" tout seul.
    if (!nextBought && task && task.status === "fait") {
      const revertStatus = task.claimed_by_prenom ? "pris_en_charge" : "ouvert";
      await supabase.from("tasks").update({ status: revertStatus }).eq("id", task.id);
      await supabase.from("personal_checklist_items").update({ status: "a_faire" }).eq("task_id", task.id);
    }
  }

  async function removeItem(item: ShoppingListItem) {
    setItems((prev) => prev.filter((it) => it.id !== item.id));
    await supabase.from("shopping_list_items").delete().eq("id", item.id);
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // "L'utilisateur qui a publié une liste peut toujours supprimer 1 ou
  // plusieurs article de sa liste en faisant un clic prolongé" — même geste
  // pour l'admin, réservé aux deux via canManageList.
  function startSelect(id: string) {
    if (!canManageList) return;
    setSelectMode(true);
    setSelectedIds(new Set([id]));
  }

  async function deleteSelected() {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setItems((prev) => prev.filter((it) => !ids.includes(it.id)));
    setSelectedIds(new Set());
    setSelectMode(false);
    await supabase.from("shopping_list_items").delete().in("id", ids);
  }

  async function addItem() {
    const label = draft.trim();
    if (!label || !task) return;
    if (items.some((it) => normalizeShoppingLabel(it.label) === normalizeShoppingLabel(label))) {
      Alert.alert("Article déjà présent", "Cet article figure déjà dans la liste.");
      return;
    }
    setAdding(true);
    const { data } = await supabase
      .from("shopping_list_items")
      .insert({ task_id: task.id, label, position: items.length })
      .select("*")
      .single();
    if (data) setItems((prev) => [...prev, data as ShoppingListItem]);
    setDraft("");
    setAdding(false);
    // Enrichit "Produits récurrents" (voir Entraide.tsx) — insert en conflit
    // (même libellé déjà catalogué pour l'espace) ignoré silencieusement.
    await supabase.from("recurring_shopping_items").insert({ space_id: spaceId, label });
  }

  const boughtCount = items.filter((it) => it.bought).length;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.title, { color: C.text }]} numberOfLines={2}>🛒 {task?.title ?? "Liste de courses"}</Text>
          {items.length > 0 && (
            <Text style={[styles.progress, { color: C.muted }]}>{boughtCount}/{items.length} achetés</Text>
          )}
          {claimedByOther && (
            <Text style={[styles.lockedNotice, { color: C.gold }]}>
              🔒 Prise en charge par {task?.claimed_by_prenom} {task?.claimed_by_nom} — seule cette personne peut cocher les articles.
            </Text>
          )}

          {selectMode && (
            <View style={styles.selectBar}>
              <Text style={[styles.selectBarCount, { color: C.text }]}>{selectedIds.size} sélectionné(s)</Text>
              <View style={{ flexDirection: "row", gap: 16 }}>
                <TouchableOpacity onPress={() => { setSelectMode(false); setSelectedIds(new Set()); }}>
                  <Text style={[styles.selectBarAction, { color: C.muted }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={deleteSelected} disabled={!selectedIds.size}>
                  <Text style={[styles.selectBarAction, { color: C.danger, opacity: selectedIds.size ? 1 : 0.4 }]}>🗑️ Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 4 }}>
            {loading ? (
              <ActivityIndicator color={C.accent} style={{ marginVertical: 16 }} />
            ) : items.length === 0 ? (
              <Text style={[styles.emptyText, { color: C.muted }]}>Aucun article pour le moment.</Text>
            ) : (
              items.map((item) => {
                const selected = selectedIds.has(item.id);
                return (
                <View key={item.id} style={[styles.itemRow, selected && { backgroundColor: "rgba(233,69,96,0.12)", borderRadius: 8 }]}>
                  <TouchableOpacity
                    onPress={() => toggleBought(item)}
                    disabled={selectMode || claimedByOther || itemLockedForMe(item)}
                    style={[
                      styles.checkbox,
                      { borderColor: item.bought ? C.accent : C.border, backgroundColor: item.bought ? C.accent : "transparent" },
                      (selectMode || claimedByOther || itemLockedForMe(item)) && { opacity: 0.4 },
                    ]}
                  >
                    {item.bought && <Text style={styles.checkboxMark}>✓</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.itemLabelCol}
                    activeOpacity={selectMode ? 0.6 : 1}
                    onPress={() => selectMode && toggleSelected(item.id)}
                    onLongPress={() => startSelect(item.id)}
                    disabled={!selectMode && !canManageList}
                  >
                    <Text
                      style={[
                        styles.itemLabel,
                        { color: item.bought ? C.muted : C.text, textDecorationLine: item.bought ? "line-through" : "none" },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {item.bought && (item.bought_by_prenom || item.bought_by_nom) && (
                      <Text style={[styles.itemBoughtBy, { color: C.muted }]}>
                        par {item.bought_by_prenom} {item.bought_by_nom}
                      </Text>
                    )}
                  </TouchableOpacity>
                  {selectMode ? (
                    <View style={[styles.checkbox, { marginRight: 0, borderColor: selected ? C.danger : C.border, backgroundColor: selected ? C.danger : "transparent" }]}>
                      {selected && <Text style={styles.checkboxMark}>✓</Text>}
                    </View>
                  ) : (
                    <TouchableOpacity onPress={() => removeItem(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={{ color: C.muted, fontSize: 16, marginLeft: 8 }}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
                );
              })
            )}
          </ScrollView>

          <View style={styles.addRow}>
            <TextInput
              style={[styles.addInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
              placeholder="Ajouter un article"
              placeholderTextColor={C.muted}
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={addItem}
              editable={!adding}
            />
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: C.accent, opacity: draft.trim() && !adding ? 1 : 0.5 }]}
              onPress={addItem}
              disabled={!draft.trim() || adding}
            >
              {adding ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.addBtnText}>+</Text>}
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={onClose} style={styles.closeFooterBtn}>
            <Text style={[styles.closeFooterBtnText, { color: C.muted }]}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", maxWidth: 440, maxHeight: "88%", borderRadius: 20, borderWidth: 1, padding: 24 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 4 },
  progress: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12.5, marginBottom: 14 },
  lockedNotice: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12.5, marginBottom: 14, lineHeight: 17 },
  selectBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  selectBarCount: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  selectBarAction: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  scroll: { maxHeight: 380 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginVertical: 12, lineHeight: 19 },

  itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginRight: 10 },
  checkboxMark: { color: "#fff", fontSize: 13, fontFamily: "DM_Sans_700Bold" },
  itemLabelCol: { flex: 1 },
  itemLabel: { fontFamily: "DM_Sans_400Regular", fontSize: 14 },
  itemBoughtBy: { fontFamily: "DM_Sans_400Regular", fontSize: 11.5, marginTop: 1 },

  addRow: { flexDirection: "row", gap: 8, marginTop: 12, alignItems: "center" },
  addInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontFamily: "DM_Sans_400Regular", fontSize: 13.5 },
  addBtn: { width: 42, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  addBtnText: { color: "#fff", fontFamily: "DM_Sans_700Bold", fontSize: 20, lineHeight: 22 },

  closeFooterBtn: { alignItems: "center", marginTop: 16 },
  closeFooterBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});
