import { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, Image, ActivityIndicator, Dimensions, Alert } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { getVisitorSession } from "@/lib/visitorSession";
import { downloadAndShare, downloadAndShareMultiple, isShareAvailable } from "@/lib/mediaShare";
import type { NewsEntry, SupportMessage, SavedMedia } from "@/lib/types";
import type { Theme } from "@/lib/themes";

const { width: SCREEN_W } = Dimensions.get("window");
const COL_GAP = 6;
const CELL_SIZE = (SCREEN_W - 32 - COL_GAP * 2) / 3;

interface Props {
  spaceId: string;
  C: Theme;
  isAdmin: boolean;
}

interface MediaItem {
  id: string;
  url: string;
  sourceType: "news" | "support";
  sourceId: string;
  createdAt: string;
}

function newsPhotoUrl(spaceId: string, filename: string) {
  const { data } = supabase.storage.from("news-photos").getPublicUrl(`${spaceId}/${filename}`);
  return data.publicUrl;
}
function supportPhotoUrl(spaceId: string, filename: string) {
  const { data } = supabase.storage.from("support-photos").getPublicUrl(`${spaceId}/${filename}`);
  return data.publicUrl;
}

export default function MesSouvenirs({ spaceId, C, isAdmin }: Props) {
  const [loading, setLoading] = useState(true);
  const [identityMissing, setIdentityMissing] = useState(false);
  const [published, setPublished] = useState<MediaItem[]>([]);
  const [downloaded, setDownloaded] = useState<MediaItem[]>([]);
  const [openPublished, setOpenPublished] = useState(false);
  const [openDownloaded, setOpenDownloaded] = useState(false);

  const [lightbox, setLightbox] = useState<{ section: "published" | "downloaded"; index: number } | null>(null);
  const [slideshowOn, setSlideshowOn] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [toast, setToast] = useState("");

  // Sélection multiple — scopée à une seule section à la fois (les listes
  // "publiées"/"téléchargées" ont chacune leurs propres ids, mais mélanger
  // les deux dans un même partage groupé n'aurait pas de sens ici).
  const [selectMode, setSelectMode] = useState(false);
  const [selectSection, setSelectSection] = useState<"published" | "downloaded" | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  }

  const load = useCallback(async () => {
    setLoading(true);

    let prenom = "";
    let nom = "";
    if (!isAdmin) {
      const s = await getVisitorSession();
      if (s) { prenom = s.prenom; nom = s.nom; }
    }

    if (!isAdmin && (!prenom.trim() || !nom.trim())) {
      setIdentityMissing(true);
      setPublished([]);
      setDownloaded([]);
      setLoading(false);
      return;
    }
    setIdentityMissing(false);

    // "Publiées" : dérivées directement de news_entries/support_messages,
    // jamais dupliquées dans une table à part — voir la doc en tête de
    // saved_media (lib/mediaShare.ts). Pour un visiteur on filtre par
    // prénom/nom plutôt que par pin, comme app/(visitor)/account.tsx
    // loadActivity() : le pin de session n'est pas toujours fiable, alors
    // que le pin "ADMIN" côté admin est un sentinel fixe et toujours présent.
    const newsQuery = isAdmin
      ? supabase.from("news_entries").select("*").eq("space_id", spaceId).eq("author_pin", "ADMIN")
      : supabase.from("news_entries").select("*").eq("space_id", spaceId)
          .ilike("author_prenom", prenom.trim()).ilike("author_nom", nom.trim());
    const supportQuery = isAdmin
      ? supabase.from("support_messages").select("*").eq("space_id", spaceId).eq("author_pin", "ADMIN")
      : supabase.from("support_messages").select("*").eq("space_id", spaceId)
          .ilike("author_prenom", prenom.trim()).ilike("author_nom", nom.trim());
    // Même raisonnement que pour "publiées" : identifier par prénom/nom,
    // pas par pin (voir lib/mediaShare.ts). L'admin reste identifié par le
    // sentinel fixe "ADMIN".
    const savedQuery = isAdmin
      ? supabase.from("saved_media").select("*").eq("space_id", spaceId).eq("saved_by_pin", "ADMIN")
      : supabase.from("saved_media").select("*").eq("space_id", spaceId)
          .ilike("saved_by_prenom", prenom.trim()).ilike("saved_by_nom", nom.trim());

    const [newsRes, supportRes, savedRes] = await Promise.all([newsQuery, supportQuery, savedQuery]);

    const publishedItems: MediaItem[] = [];
    ((newsRes.data as NewsEntry[]) || []).filter((e) => !e.deleted_by_admin).forEach((e) => {
      (e.photos || []).forEach((f, i) => {
        publishedItems.push({ id: `news-${e.id}-${i}`, url: newsPhotoUrl(spaceId, f), sourceType: "news", sourceId: e.id, createdAt: e.created_at });
      });
    });
    ((supportRes.data as SupportMessage[]) || []).filter((m) => !m.deleted_by_admin && m.photo).forEach((m) => {
      publishedItems.push({ id: `support-${m.id}`, url: supportPhotoUrl(spaceId, m.photo!), sourceType: "support", sourceId: m.id, createdAt: m.created_at });
    });
    publishedItems.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    const downloadedItems: MediaItem[] = ((savedRes.data as SavedMedia[]) || [])
      .map((s) => ({ id: s.id, url: s.photo_url, sourceType: s.source_type, sourceId: s.source_id, createdAt: s.created_at }))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    setPublished(publishedItems);
    setDownloaded(downloadedItems);
    setLoading(false);
  }, [spaceId, isAdmin]);

  useEffect(() => { load(); }, [load]);

  const currentList = lightbox?.section === "published" ? published : downloaded;
  const currentItem = lightbox ? currentList[lightbox.index] : null;

  function closeLightbox() {
    setLightbox(null);
    setSlideshowOn(false);
  }

  function showPrev() {
    setLightbox((lb) => (lb && lb.index > 0 ? { ...lb, index: lb.index - 1 } : lb));
  }
  function showNext() {
    setLightbox((lb) => (lb && lb.index < currentList.length - 1 ? { ...lb, index: lb.index + 1 } : lb));
  }

  useEffect(() => {
    if (!slideshowOn || !lightbox) return;
    const id = setInterval(() => {
      setLightbox((lb) => {
        if (!lb) return lb;
        const list = lb.section === "published" ? published : downloaded;
        if (list.length === 0) return lb;
        return { ...lb, index: lb.index + 1 >= list.length ? 0 : lb.index + 1 };
      });
    }, 3000);
    return () => clearInterval(id);
  }, [slideshowOn, lightbox, published, downloaded]);

  async function shareCurrent() {
    if (!currentItem) return;
    setSharing(true);
    const ok = await downloadAndShare(currentItem.url, `souvenir_${currentItem.id}.jpg`);
    if (!ok) showToast("Erreur lors du partage");
    setSharing(false);
  }

  function toggleSelect(section: "published" | "downloaded", id: string) {
    if (selectMode && selectSection !== section) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      if (next.size === 0) { setSelectMode(false); setSelectSection(null); }
      return next;
    });
  }

  function startSelect(section: "published" | "downloaded", id: string) {
    if (selectMode) return;
    setSelectMode(true);
    setSelectSection(section);
    setSelected(new Set([id]));
  }

  function selectAllInSection(section: "published" | "downloaded", items: MediaItem[]) {
    setSelectSection(section);
    setSelected(new Set(items.map((i) => i.id)));
  }

  function cancelSelect() {
    setSelectMode(false);
    setSelectSection(null);
    setSelected(new Set());
  }

  async function downloadSelected() {
    const list = selectSection === "published" ? published : downloaded;
    const targets = list.filter((i) => selected.has(i.id));
    if (targets.length === 0) return;
    if (!(await isShareAvailable())) {
      Alert.alert("Partage non disponible", "Le partage de fichiers n'est pas disponible sur cet appareil.");
      return;
    }

    setDownloading(true);
    const success = await downloadAndShareMultiple(
      targets.map((item) => ({ url: item.url, filename: `souvenir_${item.id}.jpg` })),
    );
    setDownloading(false);
    showToast(success
      ? `${targets.length} photo${targets.length > 1 ? "s" : ""} partagée${targets.length > 1 ? "s" : ""}`
      : "Erreur lors du partage");
    if (success) cancelSelect();
  }

  function renderSection(
    title: string,
    key: "published" | "downloaded",
    items: MediaItem[],
    isOpen: boolean,
    setOpen: (v: boolean) => void,
    emptyLabel: string,
  ) {
    return (
      <View>
        <TouchableOpacity
          style={[styles.sectionHeader, { borderBottomColor: C.border }]}
          onPress={() => setOpen(!isOpen)}
          activeOpacity={0.75}
        >
          <Text style={[styles.sectionHeaderText, { color: C.text }]}>{title} ({items.length})</Text>
          <Text style={[styles.chevron, { color: C.muted }]}>{isOpen ? "▲" : "▼"}</Text>
        </TouchableOpacity>
        {isOpen && selectMode && selectSection === key && (
          <View style={[styles.selectBar, { backgroundColor: C.card, borderBottomColor: C.border }]}>
            <View style={styles.selectBarRow}>
              <Text style={[styles.selectCount, { color: C.muted }]}>
                {selected.size} sélectionné{selected.size > 1 ? "s" : ""}
              </Text>
              <TouchableOpacity onPress={() => selectAllInSection(key, items)} style={[styles.selectBarBtn, { borderColor: C.border }]}>
                <Text style={[styles.selectBarBtnText, { color: C.text }]}>Tout sélect. ({items.length})</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.selectBarRow}>
              <TouchableOpacity
                onPress={downloadSelected}
                disabled={selected.size === 0 || downloading}
                style={[
                  styles.selectBarBtn,
                  { flex: 1, borderColor: C.accent, backgroundColor: "rgba(46,117,182,0.15)" },
                  selected.size === 0 && { opacity: 0.4 },
                ]}
              >
                {downloading
                  ? <ActivityIndicator color={C.accent} size="small" />
                  : <Text style={[styles.selectBarBtnText, { color: C.accent, textAlign: "center" }]}>↗️ Partager</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity onPress={cancelSelect} style={[styles.selectBarBtn, { borderColor: C.border }]}>
                <Text style={[styles.selectBarBtnText, { color: C.muted }]}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {isOpen && (
          items.length === 0 ? (
            <Text style={[styles.emptyText, { color: C.muted }]}>{emptyLabel}</Text>
          ) : (
            <View style={styles.grid}>
              {items.map((item, idx) => {
                const isSel = selectMode && selectSection === key && selected.has(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => {
                      if (selectMode) toggleSelect(key, item.id);
                      else setLightbox({ section: key, index: idx });
                    }}
                    onLongPress={() => startSelect(key, item.id)}
                    activeOpacity={0.85}
                    style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE, borderColor: isSel ? C.gold : "transparent" }]}
                  >
                    <Image source={{ uri: item.url }} style={styles.cellImg} resizeMode="cover" />
                    {isSel && (
                      <View style={[styles.checkBadge, { backgroundColor: C.gold }]}>
                        <Text style={styles.checkBadgeText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={[styles.backText, { color: C.accent }]}>← Retour</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>📷 Mes souvenirs</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={C.accent} size="large" />
        </View>
      ) : identityMissing ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: C.muted, textAlign: "center" }]}>
            Renseigne ton prénom et ton nom dans &quot;Mes informations&quot; pour voir tes souvenirs.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {renderSection("📤 Photos publiées", "published", published, openPublished, setOpenPublished, "Aucune photo publiée pour le moment.")}
          <View style={[styles.separator, { backgroundColor: C.border }]} />
          {renderSection("📥 Photos téléchargées", "downloaded", downloaded, openDownloaded, setOpenDownloaded, "Aucune photo téléchargée pour le moment.")}
        </ScrollView>
      )}

      <Modal visible={!!lightbox} transparent animationType="fade" onRequestClose={closeLightbox}>
        <View style={[styles.lightboxBg, { backgroundColor: "rgba(0,0,0,0.96)" }]}>
          {currentItem && (
            <>
              <TouchableOpacity style={styles.lightboxImgWrap} activeOpacity={1} onPress={() => setSlideshowOn((v) => !v)}>
                <Image source={{ uri: currentItem.url }} style={styles.lightboxImg} resizeMode="contain" />
              </TouchableOpacity>

              <View style={[styles.lightboxBtns, { backgroundColor: "rgba(0,0,0,0.7)" }]}>
                <TouchableOpacity
                  style={[styles.lbBtn, { backgroundColor: C.accent }]}
                  onPress={shareCurrent}
                  disabled={sharing}
                  activeOpacity={0.85}
                >
                  {sharing
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.lbBtnText}>↗️ Partager</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.lbBtn, { backgroundColor: slideshowOn ? C.gold : "rgba(255,255,255,0.15)" }]}
                  onPress={() => setSlideshowOn((v) => !v)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.lbBtnText}>{slideshowOn ? "⏸️ Pause" : "▶️ Diaporama"}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <TouchableOpacity style={styles.lightboxClose} onPress={closeLightbox}>
            <Text style={styles.lightboxCloseText}>✕</Text>
          </TouchableOpacity>

          {lightbox && lightbox.index > 0 && (
            <TouchableOpacity style={[styles.lightboxNavBtn, styles.lightboxNavLeft]} onPress={showPrev}>
              <Text style={styles.lightboxNavText}>‹</Text>
            </TouchableOpacity>
          )}
          {lightbox && lightbox.index < currentList.length - 1 && (
            <TouchableOpacity style={[styles.lightboxNavBtn, styles.lightboxNavRight]} onPress={showNext}>
              <Text style={styles.lightboxNavText}>›</Text>
            </TouchableOpacity>
          )}
        </View>
      </Modal>

      {!!toast && (
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

  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, borderBottomWidth: 1 },
  backText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  headerTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18 },

  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1 },
  sectionHeaderText: { fontFamily: "DM_Sans_700Bold", fontSize: 15 },
  chevron: { fontSize: 13 },
  separator: { height: 1, marginVertical: 20 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, paddingVertical: 16 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: COL_GAP, paddingTop: 12 },
  cell: { borderRadius: 10, overflow: "hidden", borderWidth: 2 },
  cellImg: { width: "100%", height: "100%" },

  selectBar: { paddingHorizontal: 4, paddingVertical: 10, borderBottomWidth: 1, gap: 8, marginTop: 8 },
  selectBarRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  selectBarBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  selectBarBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  selectCount: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  checkBadge: { position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  checkBadgeText: { fontFamily: "DM_Sans_700Bold", fontSize: 13, color: "#0D1B2E" },

  lightboxBg: { flex: 1, justifyContent: "center", alignItems: "center" },
  lightboxImgWrap: { width: "100%", height: "72%" },
  lightboxImg: { width: "100%", height: "100%" },
  lightboxBtns: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 10, padding: 20, paddingBottom: 36 },
  lbBtn: { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 18, minWidth: 130, alignItems: "center" },
  lbBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 13, color: "#fff" },
  lightboxClose: { position: "absolute", top: 52, right: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  lightboxCloseText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  lightboxNavBtn: { position: "absolute", top: "36%", width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  lightboxNavLeft: { left: 10 },
  lightboxNavRight: { right: 10 },
  lightboxNavText: { color: "#fff", fontSize: 26, fontWeight: "600", lineHeight: 28 },

  toast: { position: "absolute", bottom: 24, alignSelf: "center", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  toastText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, color: "#fff" },
});
