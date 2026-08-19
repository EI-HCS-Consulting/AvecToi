import { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { supabase } from "@/lib/supabase";
import type { Task, ShoppingListItem } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Liste de courses éditable en bullet points, partagée entre le bouton
// "👁️ Aperçu" d'un besoin category="courses" (Entraide.tsx) et "📄 Mes
// documents" (MyChecklist.tsx) — les deux ouvrent ce même composant sur le
// même task, donc une modification faite d'un côté (ajout, suppression,
// coché "acheté") est visible de l'autre sans aucune synchronisation
// explicite : c'est la même table shopping_list_items qui est lue/écrite.
// Ouvert à tout visiteur ou admin de l'espace, comme la modification de la
// description d'un besoin (saveModifyDesc dans Entraide.tsx) — pas de
// restriction à l'auteur du besoin.
interface Props {
  visible: boolean;
  onClose: () => void;
  C: Theme;
  task: Task | null;
}

export default function ShoppingListModal({ visible, onClose, C, task }: Props) {
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!visible || !task) { setItems([]); return; }
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
    const nextBought = !item.bought;
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, bought: nextBought } : it)));
    await supabase.from("shopping_list_items").update({ bought: nextBought }).eq("id", item.id);
  }

  async function removeItem(item: ShoppingListItem) {
    setItems((prev) => prev.filter((it) => it.id !== item.id));
    await supabase.from("shopping_list_items").delete().eq("id", item.id);
  }

  async function addItem() {
    const label = draft.trim();
    if (!label || !task) return;
    setAdding(true);
    const { data } = await supabase
      .from("shopping_list_items")
      .insert({ task_id: task.id, label, position: items.length })
      .select("*")
      .single();
    if (data) setItems((prev) => [...prev, data as ShoppingListItem]);
    setDraft("");
    setAdding(false);
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

          <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 4 }}>
            {loading ? (
              <ActivityIndicator color={C.accent} style={{ marginVertical: 16 }} />
            ) : items.length === 0 ? (
              <Text style={[styles.emptyText, { color: C.muted }]}>Aucun article pour le moment.</Text>
            ) : (
              items.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <TouchableOpacity
                    onPress={() => toggleBought(item)}
                    style={[styles.checkbox, { borderColor: item.bought ? C.accent : C.border, backgroundColor: item.bought ? C.accent : "transparent" }]}
                  >
                    {item.bought && <Text style={styles.checkboxMark}>✓</Text>}
                  </TouchableOpacity>
                  <Text
                    style={[
                      styles.itemLabel,
                      { color: item.bought ? C.muted : C.text, textDecorationLine: item.bought ? "line-through" : "none" },
                    ]}
                  >
                    {item.label}
                  </Text>
                  <TouchableOpacity onPress={() => removeItem(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={{ color: C.muted, fontSize: 16, marginLeft: 8 }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))
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
  scroll: { maxHeight: 380 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginVertical: 12, lineHeight: 19 },

  itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginRight: 10 },
  checkboxMark: { color: "#fff", fontSize: 13, fontFamily: "DM_Sans_700Bold" },
  itemLabel: { flex: 1, fontFamily: "DM_Sans_400Regular", fontSize: 14 },

  addRow: { flexDirection: "row", gap: 8, marginTop: 12, alignItems: "center" },
  addInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontFamily: "DM_Sans_400Regular", fontSize: 13.5 },
  addBtn: { width: 42, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  addBtnText: { color: "#fff", fontFamily: "DM_Sans_700Bold", fontSize: 20, lineHeight: 22 },

  closeFooterBtn: { alignItems: "center", marginTop: 16 },
  closeFooterBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});
