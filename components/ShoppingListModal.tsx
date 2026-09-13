import { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet, ActivityIndicator, Alert, Image } from "react-native";
import { supabase } from "@/lib/supabase";
import { getVisitorSession } from "@/lib/visitorSession";
import { loadPhotoRoster, initials, visitorIdentityKey } from "@/lib/visitorRoster";
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
// cochage) est visible de l'autre sans aucune synchronisation explicite :
// c'est la même table shopping_list_items qui est lue/écrite.
// Ouvert à tout visiteur ou admin de l'espace, comme la modification de la
// description d'un besoin (saveModifyDesc dans Entraide.tsx) — pas de
// restriction à l'auteur du besoin, ni au preneur formel du besoin ("Je m'en
// occupe", claimed_by_prenom) : la liste reste ouverte au cochage par tous,
// même une fois prise en charge — ça permet à un nouvel article ajouté après
// coup d'être dispatché par n'importe qui (voir "Je m'en occupe" qui
// réapparaît dans Entraide.tsx tant que courseListComplete est faux).
//
// Cocher un article ≠ l'avoir acheté : la case à cocher n'exprime qu'une
// prise en charge ("je m'en occupe"), via bought_by_prenom/nom/bought_at.
// L'achat effectif (bought=true) n'est marqué que par l'action "Fait"
// (bouton du mur d'entraide / alerte d'échéance, voir markCoursesFait et
// handleFait dans Entraide.tsx et TaskDueTodayAlertModal.tsx) — jamais ici.
// Un article déjà attribué à quelqu'un ne peut être décoché que par cette
// même personne, et seulement tant qu'il n'est pas acheté (itemLockedForMe +
// le check "item.bought" qui verrouille la case une fois l'achat confirmé) —
// on peut cocher les articles restants, jamais annuler le travail d'un
// autre, ni défaire un achat déjà confirmé par un simple tap.
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
  // Photo/avatar par personne pour l'en-tête de chaque groupe d'articles
  // (voir groupedSections ci-dessous) — même roster qu'Entraide.tsx.
  const [photoByKey, setPhotoByKey] = useState<Record<string, string | null>>({});
  useEffect(() => { loadPhotoRoster(spaceId).then(setPhotoByKey); }, [spaceId]);

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

  // Un article déjà attribué à quelqu'un d'autre ne peut pas être décoché,
  // même sans prise en charge du besoin — évite qu'une personne annule le
  // travail d'une autre pendant le dispatch libre de la liste. S'applique
  // que l'article soit déjà acheté ou seulement pris en charge.
  const itemLockedForMe = (item: ShoppingListItem) =>
    !!(item.bought_by_prenom || item.bought_by_nom) && !isSamePerson(item.bought_by_prenom, item.bought_by_nom);

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

  // Cocher = prendre en charge un article ("je m'en occupe"), pas l'acheter
  // — l'achat (bought) n'est marqué que par l'action "Fait" (voir en-tête de
  // fichier). Un article déjà acheté n'est plus décochable (voir disabled
  // dans renderItemRow) : toggleClaim ne s'occupe donc que d'attribuer/
  // désattribuer un article encore à acheter.
  async function toggleClaim(item: ShoppingListItem) {
    if (item.bought) return;
    if (itemLockedForMe(item)) return;
    const isMine = !!item.bought_by_prenom;
    const patch = isMine
      ? { bought_by_prenom: null, bought_by_nom: null, bought_at: null }
      : { bought_by_prenom: myPrenom || null, bought_by_nom: myNom || null, bought_at: new Date().toISOString() };
    const nextItems = items.map((it) => (it.id === item.id ? { ...it, ...patch } : it));
    setItems(nextItems);
    await supabase.from("shopping_list_items").update(patch).eq("id", item.id);
    // Tous les articles pris en charge (par qui que ce soit) → le besoin
    // passe "Pris en charge", même sans "Je m'en occupe" formel. Ne s'annule
    // que dans l'autre sens si personne n'a formellement pris en charge le
    // besoin (task.claimed_by_prenom) — sinon la prise en charge formelle
    // prime et le besoin reste "pris_en_charge" (voir courseListIncomplete
    // dans Entraide.tsx pour le badge "partiellement" qui prend le relais).
    if (task && task.status !== "fait") {
      const allClaimed = nextItems.length > 0 && nextItems.every((it) => !!it.bought_by_prenom);
      if (allClaimed && task.status === "ouvert") {
        await supabase.from("tasks").update({ status: "pris_en_charge" }).eq("id", task.id);
      } else if (!allClaimed && task.status === "pris_en_charge" && !task.claimed_by_prenom) {
        await supabase.from("tasks").update({ status: "ouvert" }).eq("id", task.id);
      }
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
    // Un nouvel article, forcément non attribué, annule "tous les articles
    // pris en charge" : le besoin ne peut plus rester "fait" (tout acheté) ni
    // "pris_en_charge" par pur dispatch. Une prise en charge formelle ("Je
    // m'en occupe", task.claimed_by_prenom) reste valable malgré tout — le
    // besoin redescend alors à "pris_en_charge" (pas "ouvert") et le preneur
    // n'est pas effacé, contrairement au cas sans preneur formel où "Je m'en
    // occupe" doit redevenir cliquable pour tout le monde.
    if (task && (task.status === "fait" || task.status === "pris_en_charge")) {
      if (task.claimed_by_prenom) {
        if (task.status === "fait") {
          await supabase.from("tasks").update({ status: "pris_en_charge" }).eq("id", task.id);
          await supabase.from("personal_checklist_items").update({ status: "a_faire" }).eq("task_id", task.id);
        }
      } else {
        await supabase.from("tasks").update({ status: "ouvert" }).eq("id", task.id);
        await supabase.from("personal_checklist_items").update({ status: "a_faire" }).eq("task_id", task.id);
      }
    }
  }

  const boughtCount = items.filter((it) => it.bought).length;

  // Regroupe les articles par la personne qui s'en occupe (une seule photo/
  // avatar par personne, pas par article), qu'ils soient déjà achetés ou
  // encore à acheter — alphabétique dans chaque groupe — demande explicite.
  // Le groupe de l'utilisateur qui consulte apparaît en premier, puis les
  // non-attribués (pas encore pris en charge, donc encore à dispatcher — les
  // faire suivre immédiatement son propre groupe les garde visibles sans les
  // perdre en bas de liste), puis les autres personnes par ordre alphabétique.
  interface Group { key: string; prenom: string; nom: string; items: ShoppingListItem[] }
  const groupedSections = useMemo(() => {
    const byKey = new Map<string, Group>();
    const unassigned: ShoppingListItem[] = [];
    for (const item of items) {
      if (item.bought_by_prenom?.trim() && item.bought_by_nom?.trim()) {
        const key = visitorIdentityKey(item.bought_by_prenom, item.bought_by_nom);
        if (!byKey.has(key)) {
          byKey.set(key, { key, prenom: item.bought_by_prenom.trim(), nom: item.bought_by_nom.trim(), items: [] });
        }
        byKey.get(key)!.items.push(item);
      } else {
        unassigned.push(item);
      }
    }
    const groups = Array.from(byKey.values());
    for (const g of groups) g.items.sort((a, b) => a.label.localeCompare(b.label, "fr"));
    const myKey = visitorIdentityKey(myPrenom, myNom);
    const mine = groups.filter((g) => g.key === myKey);
    const others = groups
      .filter((g) => g.key !== myKey)
      .sort((a, b) => a.nom.localeCompare(b.nom, "fr") || a.prenom.localeCompare(b.prenom, "fr"));
    return { mine, unassigned, others };
  }, [items, myPrenom, myNom]);

  function renderAvatar(prenom: string, nom: string) {
    const url = photoByKey[visitorIdentityKey(prenom, nom)];
    return url ? (
      <Image source={{ uri: url }} style={styles.groupAvatar} />
    ) : (
      <View style={[styles.groupAvatarFallback, { borderColor: C.border }]}>
        <Text style={{ color: C.muted, fontSize: 10 }}>{initials(prenom, nom)}</Text>
      </View>
    );
  }

  function renderItemRow(item: ShoppingListItem, showBoughtBy: boolean) {
    const selected = selectedIds.has(item.id);
    return (
      <View key={item.id} style={[styles.itemRow, selected && { backgroundColor: "rgba(233,69,96,0.12)", borderRadius: 8 }]}>
        <TouchableOpacity
          onPress={() => toggleClaim(item)}
          disabled={selectMode || item.bought || itemLockedForMe(item)}
          style={[
            styles.checkbox,
            { borderColor: item.bought_by_prenom ? C.accent : C.border, backgroundColor: item.bought_by_prenom ? C.accent : "transparent" },
            (selectMode || item.bought || itemLockedForMe(item)) && { opacity: 0.4 },
          ]}
        >
          {!!item.bought_by_prenom && <Text style={styles.checkboxMark}>✓</Text>}
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
          {showBoughtBy && item.bought && (item.bought_by_prenom || item.bought_by_nom) && (
            <Text style={[styles.itemBoughtBy, { color: C.muted }]}>
              par {item.bought_by_prenom} {item.bought_by_nom}
            </Text>
          )}
        </TouchableOpacity>
        {selectMode ? (
          <View style={[styles.checkbox, { marginRight: 0, borderColor: selected ? C.danger : C.border, backgroundColor: selected ? C.danger : "transparent" }]}>
            {selected && <Text style={styles.checkboxMark}>✓</Text>}
          </View>
        ) : canManageList ? (
          <TouchableOpacity onPress={() => removeItem(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ color: C.muted, fontSize: 16, marginLeft: 8 }}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  // Badge "Fait"/"À faire" par personne — reflète l'action "Fait" (achat),
  // pas le cochage : "Fait" tant que tous ses articles pris en charge sont
  // marqués achetés (voir markCoursesFait/handleFait dans Entraide.tsx et
  // TaskDueTodayAlertModal.tsx, seuls endroits qui passent bought à true).
  function renderGroup(g: Group) {
    const allBought = g.items.every((it) => it.bought);
    return (
      <View key={g.key} style={styles.group}>
        <View style={styles.groupHeader}>
          {renderAvatar(g.prenom, g.nom)}
          <Text style={[styles.groupHeaderText, { color: C.text }]}>{g.prenom} {g.nom}</Text>
          <View style={[styles.faitBadge, { borderColor: allBought ? C.success : C.orange }]}>
            <Text style={[styles.faitBadgeText, { color: allBought ? C.success : C.orange }]}>
              {allBought ? "Fait" : "À faire"}
            </Text>
          </View>
        </View>
        {g.items.map((item) => renderItemRow(item, false))}
      </View>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.title, { color: C.text }]} numberOfLines={2}>🛒 {task?.title ?? "Liste de courses"}</Text>
          {items.length > 0 && (
            <Text style={[styles.progress, { color: C.muted }]}>{boughtCount}/{items.length} achetés</Text>
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
              <>
                {groupedSections.mine.map(renderGroup)}
                {groupedSections.unassigned.length > 0 && (
                  <View style={styles.group}>
                    {(groupedSections.mine.length > 0 || groupedSections.others.length > 0) && (
                      <Text style={[styles.groupHeaderText, { color: C.muted, marginBottom: 6 }]}>À prendre en charge</Text>
                    )}
                    {groupedSections.unassigned.map((item) => renderItemRow(item, true))}
                  </View>
                )}
                {groupedSections.others.map(renderGroup)}
              </>
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
  selectBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  selectBarCount: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  selectBarAction: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  scroll: { maxHeight: 380 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginVertical: 12, lineHeight: 19 },

  group: { marginBottom: 10 },
  groupHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  groupHeaderText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12.5, flex: 1 },
  groupAvatar: { width: 22, height: 22, borderRadius: 11 },
  groupAvatarFallback: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  faitBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  faitBadgeText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 10.5 },

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
