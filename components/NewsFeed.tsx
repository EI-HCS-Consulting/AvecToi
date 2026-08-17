import { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  FlatList, Image, Modal, StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Dimensions,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { File } from "expo-file-system";
import { supabase } from "@/lib/supabase";
import { getVisitorSession, rememberAuthorPin, sessionPinMatches } from "@/lib/visitorSession";
import { downloadAndShare, logSavedMedia, isShareAvailable } from "@/lib/mediaShare";
import PinPad from "@/components/PinPad";
import VisitorProfileModal from "@/components/VisitorProfileModal";
import ConfirmModal from "@/components/ConfirmModal";
import type { NewsEntry, NewsEntryReply } from "@/lib/types";
import type { Theme } from "@/lib/themes";
import { LOGO_PURPLE } from "@/lib/themes";

const { width: SCREEN_W } = Dimensions.get("window");
const PHOTO_BUCKET = "news-photos";

// ─── Types ────────────────────────────────────────────────────────────────────
interface NewsEntryWithUrls extends NewsEntry {
  photoUrls: string[];
}

interface Props {
  spaceId: string;
  C: Theme;
  isAdmin: boolean;
  capped: boolean;
  // Rôle de la session visiteur (ignoré si isAdmin) — détermine si les
  // publications de CE viewer sont marquées author_role "intervenant" et
  // s'il voit le canal intervenants+admin en entier (voir filtrage plus bas).
  viewerRole?: "visiteur" | "intervenant";
  // slot_config.news_intervenant_mode — réglé depuis Paramètres > Règles >
  // Planning des intervenants (voir components/NewsIntervenantModal.tsx),
  // propagé en temps réel par SpaceContext/VisitorContext (realtime sur
  // slot_config). Détermine si les publications des intervenants (et de
  // l'admin, qui suit la même règle) sont visibles des visiteurs.
  newsIntervenantMode: "disabled" | "some" | "all";
}

// ─── Utils ────────────────────────────────────────────────────────────────────
function newsPhotoUrl(spaceId: string, filename: string) {
  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(`${spaceId}/${filename}`);
  return data.publicUrl;
}

function frDateTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function frDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function avatarInitial(prenom: string) {
  return prenom.trim().charAt(0).toUpperCase() || "?";
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function NewsFeed({ spaceId, C, isAdmin, capped, viewerRole = "visiteur", newsIntervenantMode }: Props) {
  const effectiveRole: "visiteur" | "intervenant" | "admin" = isAdmin ? "admin" : viewerRole;

  // IDs des intervenants autorisés à publier pour les visiteurs quand
  // newsIntervenantMode === "some" (voir components/NewsIntervenantModal.tsx).
  const [authorizedIntervenantIds, setAuthorizedIntervenantIds] = useState<Set<string>>(new Set());

  const loadAuthorizedIntervenants = useCallback(async () => {
    if (newsIntervenantMode !== "some") { setAuthorizedIntervenantIds(new Set()); return; }
    const { data } = await supabase
      .from("news_authorized_intervenants")
      .select("intervenant_profile_id")
      .eq("space_id", spaceId);
    setAuthorizedIntervenantIds(new Set((data || []).map((r) => r.intervenant_profile_id)));
  }, [spaceId, newsIntervenantMode]);

  useEffect(() => { loadAuthorizedIntervenants(); }, [loadAuthorizedIntervenants]);

  useEffect(() => {
    const channel = supabase
      .channel(`news-authorized-intervenants:${spaceId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "news_authorized_intervenants",
        filter: `space_id=eq.${spaceId}`,
      }, loadAuthorizedIntervenants)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [spaceId, loadAuthorizedIntervenants]);

  // Une nouvelle d'intervenant/admin est-elle visible des visiteurs ? L'admin
  // suit la même règle que les intervenants pour ses propres publications
  // (pas de réglage séparé, voir Props.newsIntervenantMode).
  function isNewsEntryVisibleToVisitor(e: NewsEntryWithUrls) {
    if (e.author_role === "visiteur") return true;
    if (newsIntervenantMode === "all") return true;
    if (newsIntervenantMode === "some") {
      return e.author_role === "intervenant"
        ? !!e.intervenant_profile_id && authorizedIntervenantIds.has(e.intervenant_profile_id)
        : false; // admin en mode "some" : pas de canal individuel pour lui, reste privé
    }
    return false;
  }

  const { focusEntryId } = useLocalSearchParams<{ focusEntryId?: string }>();
  const listRef = useRef<FlatList<NewsEntryWithUrls>>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const focusedRef = useRef(false);
  // Focus différé à l'ouverture du modal (via Modal.onShow) plutôt qu'un
  // autoFocus synchrone sur le TextInput : sur Android, autoFocus déclenche
  // le clavier pendant la toute première passe de layout du Modal, ce qui
  // entre en course avec le calcul de hauteur du ScrollView et laissait le
  // bas du formulaire (bouton Publier) invisible tant qu'aucun re-rendu
  // n'était déclenché.
  const formTextRef = useRef<TextInput>(null);
  const newsReplyTextRef = useRef<TextInput>(null);

  const [entries, setEntries] = useState<NewsEntryWithUrls[]>([]);
  const [loading, setLoading] = useState(true);

  // Publish / edit modal
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<NewsEntryWithUrls | null>(null);

  // Form state
  const [formText, setFormText] = useState("");
  const [formPrenom, setFormPrenom] = useState("");
  const [formNom, setFormNom] = useState("");
  const [formPin, setFormPin] = useState("");
  const [formPhotos, setFormPhotos] = useState<{ uri: string; filename: string }[]>([]);
  const [formSaving, setFormSaving] = useState(false);
  const [addingPhoto, setAddingPhoto] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  // Le popup "Choisis la source de la photo" est partagé entre le formulaire
  // (multi-photos) et la réponse à une nouvelle (photo unique) — pickerTarget
  // route le résultat du choix vers le bon état.
  const [pickerTarget, setPickerTarget] = useState<"form" | "reply">("form");

  // PIN modal (visitor edit/delete)
  const [pinModal, setPinModal] = useState<{ entry: NewsEntryWithUrls; action: "edit" | "delete" } | null>(null);
  const [pinEntry, setPinEntry] = useState("");
  const [pinError, setPinError] = useState(false);

  // Confirmation de suppression — remplace un ancien Alert.alert() natif,
  // cohérent avec le reste de l'app (cf. Entraide.tsx / ConfirmModal.tsx).
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<NewsEntryWithUrls | null>(null);

  // Réponses aux nouvelles, groupées par entry_id — même principe que le Mur
  // de soutien (components/Soutien.tsx), ouvert à tous y compris sur ses
  // propres nouvelles.
  const [replies, setReplies] = useState<Record<string, NewsEntryReply[]>>({});
  const [replyTarget, setReplyTarget] = useState<NewsEntryWithUrls | null>(null);
  const [replyDeleteTarget, setReplyDeleteTarget] = useState<NewsEntryReply | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyPhotoUri, setReplyPhotoUri] = useState<string | null>(null);
  const [replySaving, setReplySaving] = useState(false);

  // Lightbox
  const [lightbox, setLightbox] = useState<{ urls: string[]; idx: number } | null>(null);

  // Vue "Médias" (photos seules, sans texte ni cadre de publication) — bascule
  // le rendu du fil (voir mediaItems et le sous-header plus bas). Lightbox
  // dédié (mediaLightboxIdx) car il doit afficher texte + auteur de la
  // publication d'origine, contrairement à la lightbox du fil ci-dessus.
  const [viewMode, setViewMode] = useState<"feed" | "media">("feed");
  const [mediaLightboxIdx, setMediaLightboxIdx] = useState<number | null>(null);
  const [downloadingMediaLightbox, setDownloadingMediaLightbox] = useState(false);

  // Sélection multiple dans la grille "Médias" — appui long pour entrer,
  // permet de télécharger/partager plusieurs photos d'un coup (même pattern
  // que components/SouvenirsGallery.tsx).
  const [mediaSelectMode, setMediaSelectMode] = useState(false);
  const [mediaSelected, setMediaSelected] = useState<Set<number>>(new Set());
  const [bulkDownloadingMedia, setBulkDownloadingMedia] = useState(false);

  // Fiche visiteur — ouverte en cliquant le nom de l'auteur (sauf admin)
  const [profileTarget, setProfileTarget] = useState<{ prenom: string; nom: string } | null>(null);

  const [sessionPin, setSessionPin] = useState("");
  const myPin = isAdmin ? "ADMIN" : sessionPin;
  // ID intervenant_profiles de l'intervenant connecté — rempli à la
  // publication d'une nouvelle en author_role "intervenant" (voir
  // handleSave), sert à vérifier son autorisation dans
  // news_authorized_intervenants quand newsIntervenantMode = "some".
  const [sessionIntervenantProfileId, setSessionIntervenantProfileId] = useState<string | null>(null);

  const [toast, setToast] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
  }

  // ── Load ───────────────────────────────────────────────────────────────────
  const loadEntries = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("news_entries")
      .select("*")
      .eq("space_id", spaceId)
      .order("created_at", { ascending: false });

    if (error) {
      showToast("Erreur chargement nouvelles");
      setLoading(false);
      return;
    }

    const withUrls: NewsEntryWithUrls[] = (data || []).map((e: NewsEntry) => ({
      ...e,
      photoUrls: (e.photos || []).map((f: string) => newsPhotoUrl(spaceId, f)),
    }));
    setEntries(withUrls);
    setLoading(false);
  }, [spaceId]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const loadReplies = useCallback(async () => {
    const { data } = await supabase
      .from("news_entry_replies")
      .select("*")
      .eq("space_id", spaceId)
      .order("created_at", { ascending: true });
    const grouped: Record<string, NewsEntryReply[]> = {};
    (data || []).forEach((r) => { (grouped[r.entry_id] ??= []).push(r); });
    setReplies(grouped);
  }, [spaceId]);

  useEffect(() => { loadReplies(); }, [loadReplies]);

  // Identité déjà connue (déjà connecté) : admin → profil Supabase Auth
  // (Mon compte) ; visiteur → session enregistrée. Chargée au montage (pas
  // seulement à l'ouverture de "+ Publier") pour être disponible dès le
  // premier tap sur "Répondre".
  useEffect(() => {
    if (isAdmin) {
      supabase.auth.getUser().then(({ data }) => {
        setFormPrenom((data.user?.user_metadata?.firstname ?? "").trim());
        setFormNom((data.user?.user_metadata?.lastname ?? "").trim());
      });
      return;
    }
    getVisitorSession().then((s) => {
      if (s) {
        setFormPrenom(s.prenom);
        setFormNom(s.nom);
        if (s.pin) setSessionPin(s.pin);
        if (s.intervenantProfileId) setSessionIntervenantProfileId(s.intervenantProfileId);
      }
    });
  }, [isAdmin]);

  // Canal intervenants+admin : un visiteur ne voit que les nouvelles
  // publiées par des visiteurs, plus celles d'intervenants/admin autorisées
  // par newsIntervenantMode (voir isNewsEntryVisibleToVisitor ci-dessus).
  // Intervenants et admin voient toujours tout.
  const visibleEntries = entries.filter(
    (e) =>
      (effectiveRole !== "visiteur" || isNewsEntryVisibleToVisitor(e)) &&
      (!e.deleted_by_admin || (!isAdmin && e.author_pin === sessionPin)),
  );

  // Liste aplatie des médias pour la vue "Médias" (bouton du sous-header) —
  // dérivée de visibleEntries (déjà filtrée), pas de nouvelle requête.
  const mediaItems = visibleEntries.flatMap((e) => e.photoUrls.map((url) => ({ url, entry: e })));

  async function downloadMediaLightboxPhoto() {
    if (mediaLightboxIdx === null) return;
    const item = mediaItems[mediaLightboxIdx];
    if (!item) return;
    setDownloadingMediaLightbox(true);
    const ok = await downloadAndShare(item.url, `nouvelles_${Date.now()}.jpg`);
    if (ok && myPin && item.entry.author_pin && item.entry.author_pin !== myPin) {
      await logSavedMedia({ spaceId, sourceType: "news", sourceId: item.entry.id, photoUrl: item.url, savedByPin: myPin });
    }
    setDownloadingMediaLightbox(false);
  }

  function toggleMediaSelect(index: number) {
    setMediaSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      if (next.size === 0) setMediaSelectMode(false);
      return next;
    });
  }

  function selectAllMedia() {
    setMediaSelected(new Set(mediaItems.map((_, i) => i)));
  }

  async function downloadSelectedMedia() {
    const targets = mediaItems.filter((_, i) => mediaSelected.has(i));
    if (targets.length === 0) return;
    if (!(await isShareAvailable())) {
      Alert.alert("Partage non disponible", "Le partage de fichiers n'est pas disponible sur cet appareil.");
      return;
    }
    setBulkDownloadingMedia(true);
    let ok = 0;
    for (let i = 0; i < targets.length; i++) {
      const item = targets[i];
      const success = await downloadAndShare(item.url, `nouvelles_${item.entry.id}_${i}.jpg`);
      if (success) {
        ok++;
        if (myPin && item.entry.author_pin && item.entry.author_pin !== myPin) {
          await logSavedMedia({ spaceId, sourceType: "news", sourceId: item.entry.id, photoUrl: item.url, savedByPin: myPin });
        }
      }
    }
    setBulkDownloadingMedia(false);
    setMediaSelectMode(false);
    setMediaSelected(new Set());
    showToast(`${ok}/${targets.length} photo${targets.length > 1 ? "s" : ""} partagée${targets.length > 1 ? "s" : ""}`);
  }

  // Arrivée depuis Souvenirs ("Voir l'original") via un lien profond
  // (?focusEntryId=...) : on scrolle jusqu'à la carte et on la surligne
  // brièvement. focusedRef évite de re-déclencher le scroll à chaque
  // rechargement realtime des entrées.
  useEffect(() => {
    if (!focusEntryId || focusedRef.current || loading) return;
    const index = visibleEntries.findIndex((e) => e.id === focusEntryId);
    if (index === -1) return;
    focusedRef.current = true;
    setHighlightId(focusEntryId);
    setTimeout(() => {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.2 });
    }, 300);
    setTimeout(() => setHighlightId(null), 2500);
  }, [focusEntryId, visibleEntries, loading]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`news:${spaceId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "news_entries",
        filter: `space_id=eq.${spaceId}`,
      }, loadEntries)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [spaceId, loadEntries]);

  useEffect(() => {
    const ch = supabase
      .channel(`news-replies:${spaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "news_entry_replies", filter: `space_id=eq.${spaceId}` }, loadReplies)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [spaceId, loadReplies]);

  // ── Form helpers ───────────────────────────────────────────────────────────
  async function openPublish() {
    if (capped) {
      Alert.alert(
        "Limite atteinte",
        "Vous avez atteint la limite de votre espace. Consultez l'email envoyé à votre adresse pour en savoir plus.",
      );
      return;
    }
    setEditTarget(null);
    setFormText(""); setFormPrenom(""); setFormNom(""); setFormPin("");
    setFormPhotos([]);
    if (isAdmin) {
      // Admin déjà connecté à son compte : son prénom/nom viennent de son
      // profil Supabase Auth (renseigné dans Mon compte), jamais ressaisis.
      const { data } = await supabase.auth.getUser();
      setFormPrenom((data.user?.user_metadata?.firstname ?? "").trim());
      setFormNom((data.user?.user_metadata?.lastname ?? "").trim());
    } else {
      const s = await getVisitorSession();
      if (s) {
        setFormPrenom(s.prenom);
        setFormNom(s.nom);
        if (s.pin) setSessionPin(s.pin);
        if (s.intervenantProfileId) setSessionIntervenantProfileId(s.intervenantProfileId);
      }
    }
    setShowForm(true);
  }

  function openEdit(entry: NewsEntryWithUrls) {
    setEditTarget(entry);
    setFormText(entry.content);
    setFormPrenom(entry.author_prenom);
    setFormNom(entry.author_nom);
    setFormPin("");
    // When editing, existing photos are kept server-side;
    // show them as "already uploaded" (no local uri)
    setFormPhotos(entry.photos.map((f, i) => ({ uri: entry.photoUrls[i], filename: f })));
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditTarget(null);
    setFormPhotos([]);
  }

  // ── Photo picking ──────────────────────────────────────────────────────────
  function addPickedAssets(assets: { uri: string }[]) {
    const newPhotos: { uri: string; filename: string }[] = [];
    for (const asset of assets) {
      const ts = Date.now();
      const idx = formPhotos.length + newPhotos.length;
      const filename = `${ts}_${idx}.jpg`;
      newPhotos.push({ uri: asset.uri, filename });
    }
    setFormPhotos((prev) => [...prev, ...newPhotos]);
  }

  async function pickFromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission refusée", "Autorise l'accès à la galerie dans les paramètres.");
      return;
    }
    setAddingPhoto(true);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: pickerTarget === "form",
      quality: 1,
    });
    setAddingPhoto(false);
    if (result.canceled) return;
    if (pickerTarget === "reply") setReplyPhotoUri(result.assets[0].uri);
    else addPickedAssets(result.assets);
  }

  async function pickFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission refusée", "Autorise l'accès à la caméra dans les paramètres.");
      return;
    }
    setAddingPhoto(true);
    const result = await ImagePicker.launchCameraAsync({ quality: 1, allowsEditing: false });
    setAddingPhoto(false);
    if (result.canceled) return;
    if (pickerTarget === "reply") setReplyPhotoUri(result.assets[0].uri);
    else addPickedAssets(result.assets);
  }

  function choosePickerSource(fn: () => void) {
    setPickerVisible(false);
    fn();
  }

  function openFormPhotoPicker() {
    setPickerTarget("form");
    setPickerVisible(true);
  }

  function openReplyPhotoPicker() {
    setPickerTarget("reply");
    setPickerVisible(true);
  }

  function removePhoto(idx: number) {
    setFormPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  function removeReplyPhoto() {
    setReplyPhotoUri(null);
  }

  async function uploadNewPhotos(
    photos: { uri: string; filename: string }[],
  ): Promise<{ filenames: string[]; lastError: string | null }> {
    const filenames: string[] = [];
    let lastError: string | null = null;
    for (const photo of photos) {
      // Skip already-uploaded photos (uri starts with https)
      if (photo.uri.startsWith("http")) {
        filenames.push(photo.filename);
        continue;
      }
      try {
        const compressed = await ImageManipulator.manipulateAsync(
          photo.uri,
          [{ resize: { width: 1080 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
        );
        // fetch(localUri).blob() est peu fiable sur expo-file-system v19
        // (échoue souvent en "Network request failed") — lecture directe
        // du fichier local via la nouvelle API File, sans passer par le réseau.
        const fileData = await new File(compressed.uri).arrayBuffer();
        const ts = Date.now();
        const fname = `${ts}_${Math.random().toString(36).slice(2, 6)}.jpg`;
        const { error } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(`${spaceId}/${fname}`, fileData, { contentType: "image/jpeg", cacheControl: "3600" });
        if (!error) {
          filenames.push(fname);
        } else {
          lastError = error.message;
        }
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
      }
    }
    return { filenames, lastError };
  }

  // ── Save (create / edit) ───────────────────────────────────────────────────
  async function handleSave() {
    if (!formText.trim() || !formPrenom.trim() || !formNom.trim()) return;
    if (!isAdmin && !editTarget && !sessionPin && formPin.length < 4) return;
    setFormSaving(true);

    // Upload new photos
    const newPhotosCount = formPhotos.filter((p) => !p.uri.startsWith("http")).length;
    const { filenames: uploadedFilenames, lastError } = await uploadNewPhotos(formPhotos);
    const keptCount = formPhotos.filter((p) => p.uri.startsWith("http")).length;
    const newlyUploadedCount = uploadedFilenames.length - keptCount;
    if (newlyUploadedCount < newPhotosCount) {
      // uploadNewPhotos() skips photos that fail to upload — warn instead of
      // letting the post save with fewer photos than expected and no
      // explanation. On affiche le détail technique pour pouvoir diagnostiquer
      // (ex: policy Storage manquante sur ce bucket précis).
      Alert.alert(
        "Envoi de photo incomplet",
        `${newPhotosCount - newlyUploadedCount} photo(s) sur ${newPhotosCount} n'a/n'ont pas pu être envoyée(s). La nouvelle sera publiée avec les autres.` +
          (lastError ? `\n\nDétail : ${lastError}` : ""),
      );
    }

    if (editTarget) {
      // Edit: remove old photos that were removed from formPhotos
      const keptFilenames = formPhotos
        .filter((p) => p.uri.startsWith("http"))
        .map((p) => p.filename);
      const removedFilenames = editTarget.photos.filter((f) => !keptFilenames.includes(f));

      // Delete removed photos from storage
      if (removedFilenames.length) {
        await supabase.storage.from(PHOTO_BUCKET).remove(
          removedFilenames.map((f) => `${spaceId}/${f}`),
        );
      }

      // Merge: kept + newly uploaded
      const finalFilenames = [...keptFilenames, ...uploadedFilenames.filter((f) => !keptFilenames.includes(f))];

      const { error } = await supabase
        .from("news_entries")
        .update({
          content: formText.trim(),
          author_prenom: formPrenom.trim(),
          author_nom: formNom.trim(),
          photos: finalFilenames,
        })
        .eq("id", editTarget.id);

      setFormSaving(false);
      // The publish/edit sheet is a native <Modal> — it stays open on error
      // (so the user can retry), which would hide the toast banner behind
      // it. Alert is native too, so it's visible regardless.
      if (error) { Alert.alert("Erreur", "Erreur lors de la modification : " + error.message); return; }
      showToast("Nouvelle modifiée ✓");
    } else {
      const { error } = await supabase.from("news_entries").insert({
        space_id: spaceId,
        news_date: new Date().toISOString().slice(0, 10),
        content: formText.trim(),
        author_prenom: formPrenom.trim(),
        author_nom: formNom.trim(),
        author_pin: isAdmin ? "ADMIN" : (sessionPin || formPin),
        author_role: effectiveRole,
        intervenant_profile_id: effectiveRole === "intervenant" ? sessionIntervenantProfileId : null,
        photos: uploadedFilenames,
      });

      setFormSaving(false);
      if (error) { Alert.alert("Erreur", "Erreur lors de la publication : " + error.message); return; }
      if (!isAdmin) await rememberAuthorPin(formPrenom.trim(), formNom.trim(), sessionPin || formPin);
      showToast("Nouvelle publiée ✓");
    }

    closeForm();
    await loadEntries();
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function doDelete(entry: NewsEntryWithUrls) {
    // Delete photos from storage
    if (entry.photos.length) {
      await supabase.storage.from(PHOTO_BUCKET).remove(
        entry.photos.map((f) => `${spaceId}/${f}`),
      );
    }
    await supabase.from("news_entries").delete().eq("id", entry.id);
    setEntries((prev) => prev.filter((e) => e.id !== entry.id));
    showToast("Nouvelle supprimée ✓");
  }

  // Suppression par l'admin d'une nouvelle publiée par quelqu'un d'autre :
  // pas de suppression réelle, on marque juste deleted_by_admin — elle reste
  // visible pour son auteur avec un bandeau rouge, qui peut ensuite la
  // supprimer définitivement lui-même (même bouton, cf. canModify ci-dessous).
  async function softDeleteByAdmin(entry: NewsEntryWithUrls) {
    await supabase.from("news_entries").update({ deleted_by_admin: true }).eq("id", entry.id);
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, deleted_by_admin: true } : e)));
    showToast("Nouvelle supprimée ✓");
  }

  async function requestDelete(entry: NewsEntryWithUrls) {
    // Le PIN enregistré dans "Mon compte" (ou choisi à la publication) fait
    // foi : s'il correspond (ou si admin), on évite de le redemander.
    if (isAdmin || (await sessionPinMatches(entry.author_pin))) {
      setDeleteConfirmTarget(entry);
      return;
    }
    setPinModal({ entry, action: "delete" });
    setPinEntry(""); setPinError(false);
  }

  async function requestEdit(entry: NewsEntryWithUrls) {
    if (isAdmin || (await sessionPinMatches(entry.author_pin))) {
      openEdit(entry);
      return;
    }
    setPinModal({ entry, action: "edit" });
    setPinEntry(""); setPinError(false);
  }

  function checkPin() {
    if (!pinModal) return;
    if (pinEntry === pinModal.entry.author_pin) {
      const { entry, action } = pinModal;
      setPinModal(null);
      if (action === "edit") openEdit(entry);
      else doDelete(entry);
    } else {
      setPinError(true);
      setPinEntry("");
    }
  }

  // ── Réponses (ouvert à tous, y compris sur ses propres nouvelles) ──────────
  function openReply(entry: NewsEntryWithUrls) {
    setReplyTarget(entry);
    setReplyText("");
    setReplyPhotoUri(null);
  }

  const pinReady = isAdmin || !!sessionPin || formPin.length >= 4;

  async function postReply() {
    if (!replyTarget || !replyText.trim() || !formPrenom.trim() || !formNom.trim()) return;
    if (!isAdmin && !sessionPin && formPin.length < 4) return;
    setReplySaving(true);

    let photoFilename: string | null = null;
    if (replyPhotoUri) {
      try {
        const compressed = await ImageManipulator.manipulateAsync(
          replyPhotoUri,
          [{ resize: { width: 1080 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
        );
        const fileData = await new File(compressed.uri).arrayBuffer();
        const fname = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`;
        const { error } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(`${spaceId}/${fname}`, fileData, { contentType: "image/jpeg", cacheControl: "3600" });
        if (!error) {
          photoFilename = fname;
        } else {
          Alert.alert("Photo non envoyée", "La réponse sera publiée sans la photo.");
        }
      } catch {
        Alert.alert("Photo non envoyée", "La réponse sera publiée sans la photo.");
      }
    }

    const pinToUse = isAdmin ? "ADMIN" : (sessionPin || formPin);
    await supabase.from("news_entry_replies").insert({
      entry_id: replyTarget.id,
      space_id: spaceId,
      reply_text: replyText.trim(),
      author_prenom: formPrenom.trim(),
      author_nom: formNom.trim(),
      author_pin: pinToUse,
      photo: photoFilename,
    });
    setReplySaving(false);
    if (!isAdmin) {
      await rememberAuthorPin(formPrenom.trim(), formNom.trim(), pinToUse);
      setSessionPin(pinToUse);
    }
    setReplyText(""); setReplyPhotoUri(null); setFormPin(""); setReplyTarget(null);
    showToast("Réponse envoyée 🙏");
    loadReplies();
  }

  function isOwnReply(r: NewsEntryReply) {
    return isAdmin ? r.author_pin === "ADMIN" : (!!sessionPin && r.author_pin === sessionPin);
  }

  async function softDeleteByAdminReply(r: NewsEntryReply) {
    await supabase.from("news_entry_replies").update({ deleted_by_admin: true }).eq("id", r.id);
    setReplies((prev) => ({
      ...prev,
      [r.entry_id]: (prev[r.entry_id] || []).map((x) => (x.id === r.id ? { ...x, deleted_by_admin: true } : x)),
    }));
    showToast("Réponse supprimée");
  }

  async function confirmDeleteReply() {
    if (!replyDeleteTarget) return;
    const r = replyDeleteTarget;
    setReplyDeleteTarget(null);
    if (isAdmin && r.author_pin !== "ADMIN") {
      await softDeleteByAdminReply(r);
      return;
    }
    await supabase.from("news_entry_replies").delete().eq("id", r.id);
    loadReplies();
    showToast("Réponse supprimée");
  }

  // ── Render entry ───────────────────────────────────────────────────────────
  function renderEntry({ item: entry }: { item: NewsEntryWithUrls }) {
    const canModify = isAdmin || entry.author_pin !== "ADMIN";
    const highlighted = highlightId === entry.id;
    // Vue admin uniquement : distingue en un coup d'œil les publications
    // visiteurs (orange) des publications intervenants (violet), le fil
    // mélangeant les deux (voir isNewsEntryVisibleToVisitor pour la règle de
    // visibilité côté visiteurs).
    const entryAccentColor = isAdmin
      ? entry.author_role === "visiteur" ? C.orange : entry.author_role === "intervenant" ? LOGO_PURPLE : C.border
      : C.border;
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: C.card, borderColor: highlighted ? C.gold : entryAccentColor },
          highlighted && { borderWidth: 2 },
        ]}
      >
        {/* Author + date */}
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: C.accent }]}>
            <Text style={styles.avatarText}>{avatarInitial(entry.author_prenom)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            {entry.author_pin !== "ADMIN" ? (
              <TouchableOpacity onPress={() => setProfileTarget({ prenom: entry.author_prenom, nom: entry.author_nom })} activeOpacity={0.7}>
                <Text style={[styles.authorName, { color: C.text }]}>
                  {entry.author_prenom} {entry.author_nom}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.authorName, { color: C.text }]}>
                {entry.author_prenom} {entry.author_nom}
              </Text>
            )}
            <Text style={[styles.entryDate, { color: C.muted }]}>
              {frDateTime(entry.created_at)}
            </Text>
          </View>
          {canModify && (
            <View style={styles.cardActions}>
              {!entry.deleted_by_admin && (
                <TouchableOpacity onPress={() => requestEdit(entry)} style={[styles.actionBtn, { borderColor: C.border }]}>
                  <Text style={[styles.actionBtnText, { color: C.muted }]}>✏️</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => requestDelete(entry)} style={[styles.actionBtn, { borderColor: "rgba(233,69,96,0.3)" }]}>
                <Text style={[styles.actionBtnText, { color: C.danger }]}>🗑️</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {entry.deleted_by_admin && (
          <Text style={[styles.deletedBanner, { color: C.danger }]}>
            Votre publication a été supprimée par l'administrateur du compte. Elle n'est ainsi plus visible par les autres utilisateurs.
          </Text>
        )}

        {/* Text */}
        <Text style={[styles.entryText, { color: C.text }]}>{entry.content}</Text>

        {/* Photos */}
        {entry.photoUrls.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoStrip}
          >
            {entry.photoUrls.map((url, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setLightbox({ urls: entry.photoUrls, idx: i })}
                activeOpacity={0.85}
              >
                <Image source={{ uri: url }} style={[styles.photoThumb, { borderColor: C.border }]} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {(() => {
          const repliesForEntry = (replies[entry.id] || []).filter((r) => !r.deleted_by_admin || (!isAdmin && isOwnReply(r)));
          if (!repliesForEntry.length) return null;
          return (
            <View style={styles.repliesWrap}>
              {repliesForEntry.map((r) => {
                const canDeleteReply = isAdmin || (!!sessionPin && r.author_pin === sessionPin);
                return (
                  <View key={r.id} style={[styles.replyItem, { borderLeftColor: C.gold }]}>
                    <View style={{ flex: 1 }}>
                      {r.author_pin !== "ADMIN" ? (
                        <TouchableOpacity onPress={() => setProfileTarget({ prenom: r.author_prenom, nom: r.author_nom })} activeOpacity={0.7}>
                          <Text style={[styles.replyAuthor, { color: C.text }]}>{r.author_prenom} {r.author_nom}</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={[styles.replyAuthor, { color: C.text }]}>{r.author_prenom} {r.author_nom}</Text>
                      )}
                      {r.deleted_by_admin && (
                        <Text style={[styles.replyDeletedBanner, { color: C.danger }]}>
                          Votre publication a été supprimée par l'administrateur du compte. Elle n'est ainsi plus visible par les autres utilisateurs.
                        </Text>
                      )}
                      <Text style={[styles.replyText, { color: C.text }]}>{r.reply_text}</Text>
                      {r.photo && (
                        <TouchableOpacity
                          onPress={() => setLightbox({ urls: [newsPhotoUrl(spaceId, r.photo!)], idx: 0 })}
                          activeOpacity={0.85}
                        >
                          <Image source={{ uri: newsPhotoUrl(spaceId, r.photo) }} style={[styles.replyPhotoThumb, { borderColor: C.border }]} resizeMode="cover" />
                        </TouchableOpacity>
                      )}
                    </View>
                    {canDeleteReply && (
                      <TouchableOpacity onPress={() => setReplyDeleteTarget(r)} style={styles.replyDeleteBtn}>
                        <Text style={{ fontSize: 12, color: C.muted }}>{r.deleted_by_admin ? "🗑️" : "✕"}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })()}

        <TouchableOpacity
          style={[styles.replyBtn, { borderColor: C.border }]}
          onPress={() => openReply(entry)}
          activeOpacity={0.75}
        >
          <Text style={[styles.replyBtnText, { color: C.gold }]}>🙏 Répondre</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <Text style={[styles.headerTitle, { color: C.text }]}>📰 Nouvelles du jour</Text>
        {effectiveRole !== "visiteur" && (
          <View style={styles.headerStatusRow}>
            <Text style={[styles.headerStatusText, { color: newsIntervenantMode !== "disabled" ? C.success : C.muted }]}>
              {newsIntervenantMode === "all"
                ? "🔓 Visible aussi par les visiteurs"
                : newsIntervenantMode === "some"
                ? "🔓 Visible aussi par les visiteurs (intervenants autorisés)"
                : "🔒 Dédié aux intervenants et à l'admin"}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.subHeader, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <View style={styles.subHeaderRow}>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: C.accent }]}
            onPress={openPublish}
            activeOpacity={0.85}
          >
            <Text style={[styles.addBtnText, { color: "#fff" }]}>+ Publier</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[
            styles.mediaToggleBtn,
            { borderColor: C.accent },
            viewMode === "media" && { backgroundColor: C.accent },
          ]}
          onPress={() => setViewMode((m) => (m === "media" ? "feed" : "media"))}
          activeOpacity={0.85}
        >
          <Text style={[styles.addBtnText, { color: viewMode === "media" ? "#fff" : C.accent }]}>
            🖼️ Médias
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={C.accent} size="large" /></View>
      ) : viewMode === "media" ? (
        <>
          {mediaSelectMode && (
            <View style={[styles.selectBar, { backgroundColor: C.card, borderBottomColor: C.border }]}>
              <View style={styles.selectBarRow}>
                <Text style={[styles.selectBarBtnText, { color: C.muted }]}>
                  {mediaSelected.size} sélectionné{mediaSelected.size > 1 ? "s" : ""}
                </Text>
                <TouchableOpacity onPress={selectAllMedia} style={[styles.selectBarBtn, { borderColor: C.border }]}>
                  <Text style={[styles.selectBarBtnText, { color: C.text }]}>Tout sélect. ({mediaItems.length})</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.selectBarRow}>
                <TouchableOpacity
                  onPress={downloadSelectedMedia}
                  disabled={mediaSelected.size === 0 || bulkDownloadingMedia}
                  style={[
                    styles.selectBarBtn,
                    { flex: 1, borderColor: C.accent, backgroundColor: "rgba(46,117,182,0.15)" },
                    mediaSelected.size === 0 && { opacity: 0.4 },
                  ]}
                >
                  {bulkDownloadingMedia
                    ? <ActivityIndicator color={C.accent} size="small" />
                    : <Text style={[styles.selectBarBtnText, { color: C.accent, textAlign: "center" }]}>⬇️ Télécharger</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setMediaSelectMode(false); setMediaSelected(new Set()); }}
                  style={[styles.selectBarBtn, { borderColor: C.border }]}
                >
                  <Text style={[styles.selectBarBtnText, { color: C.muted }]}>Annuler</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {mediaItems.length === 0 ? (
            <View style={styles.centered}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🖼️</Text>
              <Text style={[styles.emptyText, { color: C.muted }]}>Aucun média pour l'instant.</Text>
            </View>
          ) : (
            <FlatList
              key="media-grid"
              data={mediaItems}
              keyExtractor={(_, i) => String(i)}
              numColumns={2}
              contentContainerStyle={styles.mediaGrid}
              renderItem={({ item, index }) => {
                const isSel = mediaSelected.has(index);
                return (
                  <TouchableOpacity
                    style={[styles.mediaCell, isSel && { borderWidth: 3, borderColor: C.gold }]}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (mediaSelectMode) toggleMediaSelect(index);
                      else setMediaLightboxIdx(index);
                    }}
                    onLongPress={() => {
                      if (!mediaSelectMode) {
                        setMediaSelectMode(true);
                        setMediaSelected(new Set([index]));
                      }
                    }}
                  >
                    <Image source={{ uri: item.url }} style={styles.mediaCellImg} resizeMode="cover" />
                    {isSel && (
                      <View style={[styles.checkBadge, { backgroundColor: C.gold }]}>
                        <Text style={styles.checkBadgeText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </>
      ) : visibleEntries.length === 0 ? (
        <View style={styles.centered}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>📰</Text>
          <Text style={[styles.emptyText, { color: C.muted }]}>Aucune nouvelle pour l'instant.</Text>
          <Text style={[styles.emptyHint, { color: C.muted }]}>Partage un compte-rendu après ta visite 💛</Text>
        </View>
      ) : (
        <FlatList
          key="feed-list"
          ref={listRef}
          data={visibleEntries}
          keyExtractor={(e) => e.id}
          renderItem={renderEntry}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          onScrollToIndexFailed={(info) => {
            listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
          }}
        />
      )}

      {/* ── MODAL CHOIX SOURCE (caméra / galerie) ─────────────────────────── */}
      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <TouchableOpacity style={styles.centeredOverlay} activeOpacity={1} onPress={() => setPickerVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={{ width: "88%" }}>
            <View style={[styles.centeredSheet, styles.pickerSheet, { backgroundColor: C.card, borderColor: C.accent }]}>
              <Text style={[styles.sheetTitle, { color: C.text, textAlign: "center" }]}>📷 Ajouter une photo</Text>
              <Text style={[styles.sheetSub, { color: C.muted, textAlign: "center" }]}>Choisis la source de la photo</Text>

              <TouchableOpacity
                style={[styles.pickerOption, { borderColor: C.border }]}
                onPress={() => choosePickerSource(pickFromCamera)}
                activeOpacity={0.7}
              >
                <Text style={styles.pickerOptionIcon}>📷</Text>
                <Text style={[styles.pickerOptionText, { color: C.text }]}>Prendre une photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pickerOption, { borderColor: C.border }]}
                onPress={() => choosePickerSource(pickFromGallery)}
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

      {/* ── MODAL PUBLICATION / ÉDITION ───────────────────────────────────── */}
      <Modal
        visible={showForm}
        transparent
        animationType="fade"
        onRequestClose={closeForm}
        onShow={() => setTimeout(() => formTextRef.current?.focus(), 60)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <TouchableOpacity
            style={[styles.centeredOverlay, { justifyContent: "flex-end", paddingBottom: 12 }]}
            activeOpacity={1}
            onPress={() => !formSaving && closeForm()}
          >
            <TouchableOpacity activeOpacity={1} style={{ width: "88%" }}>
              <View style={[styles.centeredSheet, { backgroundColor: C.card, borderColor: C.accent, maxHeight: "94%" }]}>
                {/* Hors du ScrollView : le titre doit rester visible même
                    quand le clavier ouvert force un scroll-to-focus sur le
                    champ de saisie, sinon il se retrouve caché en haut. */}
                <Text style={[styles.sheetTitle, { color: C.text }]}>
                  {editTarget ? "✏️ Modifier la nouvelle" : "📰 Nouvelle du jour"}
                </Text>

                <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {/* Champs auteur — uniquement si l'identité n'est pas encore
                      connue (première publication de ce visiteur/admin) ;
                      une fois connue (session visiteur ou profil admin),
                      inutile de la redemander vu que la publication se fait
                      déjà depuis son compte. Jamais affiché en édition. */}
                  {!editTarget && !(formPrenom.trim() && formNom.trim()) && (
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TextInput
                        style={[styles.input, { flex: 1, backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                        placeholder="Prénom *"
                        placeholderTextColor={C.muted}
                        value={formPrenom}
                        onChangeText={setFormPrenom}
                        autoCapitalize="words"
                      />
                      <TextInput
                        style={[styles.input, { flex: 1, backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                        placeholder="Nom *"
                        placeholderTextColor={C.muted}
                        value={formNom}
                        onChangeText={setFormNom}
                        autoCapitalize="words"
                      />
                    </View>
                  )}

                  {/* Texte */}
                  <TextInput
                    ref={formTextRef}
                    style={[styles.input, styles.textarea, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                    placeholder="Donnez des nouvelles de votre visite… ✍️"
                    placeholderTextColor={C.muted}
                    value={formText}
                    onChangeText={setFormText}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                  />

                  {/* PIN (visiteur uniquement, à la création, si pas de PIN mémorisé) */}
                  {!isAdmin && !editTarget && !sessionPin && (
                    <>
                      <Text style={[styles.fieldLabel, { color: C.gold }]}>
                        🔐 Code PIN (pour modifier ou supprimer)
                      </Text>
                      <PinPad value={formPin} onChange={setFormPin} theme={C} />
                    </>
                  )}
                </ScrollView>

                {/* Hors du ScrollView, juste au-dessus du bouton Publier :
                    toujours entièrement visible, même quand le clavier ouvert
                    force un scroll-to-focus sur le champ de saisie. */}
                {formPhotos.length > 0 && (
                  <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginBottom: 10, height: 84, flexShrink: 0 }}>
                    <View style={{ flexDirection: "row", gap: 8, paddingVertical: 4 }}>
                      {formPhotos.map((p, i) => (
                        <View key={i} style={styles.photoPickItem}>
                          <Image source={{ uri: p.uri }} style={styles.photoPickThumb} resizeMode="cover" />
                          <TouchableOpacity
                            style={[styles.photoPickRemove, { backgroundColor: C.danger }]}
                            onPress={() => removePhoto(i)}
                          >
                            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )}
                <TouchableOpacity
                  style={[styles.photoAddBanner, { backgroundColor: C.gold + "1c", borderColor: C.gold }]}
                  onPress={openFormPhotoPicker}
                  disabled={addingPhoto}
                  activeOpacity={0.8}
                >
                  {addingPhoto
                    ? <ActivityIndicator color={C.gold} size="small" />
                    : <Text style={[styles.photoAddBannerText, { color: C.gold }]}>📷 Ajouter une photo (optionnel)</Text>
                  }
                </TouchableOpacity>

                <View style={styles.sheetBtns}>
                  <TouchableOpacity
                    onPress={closeForm}
                    disabled={formSaving}
                    style={[styles.btnSecondary, { borderColor: C.border }]}
                  >
                    <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSave}
                    disabled={
                      !formText.trim() || !formPrenom.trim() || !formNom.trim() ||
                      (!isAdmin && !editTarget && !sessionPin && formPin.length < 4) ||
                      formSaving
                    }
                    style={[
                      styles.btnPrimary,
                      { backgroundColor: C.accent },
                      (!formText.trim() || !formPrenom.trim() || !formNom.trim() ||
                        (!isAdmin && !editTarget && !sessionPin && formPin.length < 4) || formSaving) && { opacity: 0.5 },
                    ]}
                  >
                    {formSaving
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.btnPrimaryText}>{editTarget ? "Enregistrer" : "Publier"}</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL PIN ─────────────────────────────────────────────────────── */}
      <Modal visible={!!pinModal} transparent animationType="fade" onRequestClose={() => setPinModal(null)}>
        <TouchableOpacity style={styles.centeredOverlay} activeOpacity={1} onPress={() => setPinModal(null)}>
          <TouchableOpacity activeOpacity={1} style={{ width: "88%" }}>
            <View style={[styles.centeredSheet, { backgroundColor: C.card, borderColor: C.accent }]}>
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 32, marginBottom: 6 }}>🔐</Text>
              <Text style={[styles.sheetTitle, { color: C.text }]}>Code PIN</Text>
              <Text style={[styles.sheetSub, { color: C.muted }]}>
                {pinModal?.action === "edit"
                  ? "Saisis ton PIN pour modifier cette nouvelle."
                  : "Saisis ton PIN pour supprimer cette nouvelle."}
              </Text>
            </View>

            {pinModal && (
              <View style={[styles.pinContext, { backgroundColor: C.bg, borderColor: C.border }]}>
                <Text style={[styles.pinContextText, { color: C.text }]} numberOfLines={2}>
                  "{pinModal.entry.content.slice(0, 80)}{pinModal.entry.content.length > 80 ? "…" : ""}"
                </Text>
                <Text style={[styles.pinContextAuthor, { color: C.muted }]}>
                  — {pinModal.entry.author_prenom} {pinModal.entry.author_nom}
                </Text>
              </View>
            )}

            <PinPad value={pinEntry} onChange={setPinEntry} theme={C} hasError={pinError} />

            {pinError && (
              <Text style={[styles.pinErrorText, { color: C.danger }]}>
                PIN incorrect.
              </Text>
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
                  { backgroundColor: pinModal?.action === "delete" ? C.danger : C.accent },
                  pinEntry.length < 4 && { opacity: 0.5 },
                ]}
              >
                <Text style={styles.btnPrimaryText}>
                  {pinModal?.action === "delete" ? "Supprimer" : "Modifier"}
                </Text>
              </TouchableOpacity>
            </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── MODAL RÉPONSE ─────────────────────────────────────────────────── */}
      <Modal
        visible={!!replyTarget}
        transparent
        animationType="fade"
        onRequestClose={() => !replySaving && setReplyTarget(null)}
        onShow={() => setTimeout(() => newsReplyTextRef.current?.focus(), 60)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <TouchableOpacity
            style={[styles.centeredOverlay, { justifyContent: "flex-end", paddingBottom: 12 }]}
            activeOpacity={1}
            onPress={() => !replySaving && setReplyTarget(null)}
          >
            <TouchableOpacity activeOpacity={1} style={{ width: "88%" }}>
              <View style={[styles.centeredSheet, { backgroundColor: C.card, borderColor: C.accent, maxHeight: "94%" }]}>
                {/* Hors du ScrollView : le contexte (à qui on répond) doit rester
                    visible même quand le clavier ouvert force un scroll-to-focus
                    sur le champ de saisie, sinon il se retrouve rogné en haut. */}
                <Text style={[styles.sheetTitle, { color: C.text }]}>🙏 Répondre</Text>
                {replyTarget && (
                  <Text style={[styles.sheetSub, { color: C.muted }]} numberOfLines={2}>
                    À {replyTarget.author_prenom} {replyTarget.author_nom} : « {replyTarget.content} »
                  </Text>
                )}

                <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <TextInput
                    ref={newsReplyTextRef}
                    style={[styles.input, styles.textarea, { height: 160, backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                    placeholder="Ta réponse…"
                    placeholderTextColor={C.muted}
                    value={replyText}
                    onChangeText={setReplyText}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />

                  {!(formPrenom.trim() && formNom.trim()) && (
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TextInput
                        style={[styles.input, { flex: 1, backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                        placeholder="Prénom *"
                        placeholderTextColor={C.muted}
                        value={formPrenom}
                        onChangeText={setFormPrenom}
                        autoCapitalize="words"
                      />
                      <TextInput
                        style={[styles.input, { flex: 1, backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                        placeholder="Nom *"
                        placeholderTextColor={C.muted}
                        value={formNom}
                        onChangeText={setFormNom}
                        autoCapitalize="words"
                      />
                    </View>
                  )}

                  {!isAdmin && !sessionPin && (
                    <>
                      <Text style={[styles.fieldLabel, { color: C.gold }]}>
                        🔐 Code PIN (pour modifier ou supprimer)
                      </Text>
                      <PinPad value={formPin} onChange={setFormPin} theme={C} />
                    </>
                  )}
                </ScrollView>

                {/* Hors du ScrollView, juste au-dessus du bouton Envoyer :
                    toujours entièrement visible, même quand le clavier ouvert
                    force un scroll-to-focus sur le champ de saisie. */}
                {replyPhotoUri ? (
                  <View style={[styles.photoPickItem, { marginBottom: 10 }]}>
                    <Image source={{ uri: replyPhotoUri }} style={styles.photoPickThumb} resizeMode="cover" />
                    <TouchableOpacity style={[styles.photoPickRemove, { backgroundColor: C.danger }]} onPress={removeReplyPhoto}>
                      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.photoAddBanner, { backgroundColor: C.gold + "1c", borderColor: C.gold }]}
                    onPress={openReplyPhotoPicker}
                    disabled={addingPhoto}
                    activeOpacity={0.8}
                  >
                    {addingPhoto
                      ? <ActivityIndicator color={C.gold} size="small" />
                      : <Text style={[styles.photoAddBannerText, { color: C.gold }]}>📷 Ajouter une photo (optionnel)</Text>
                    }
                  </TouchableOpacity>
                )}

                <View style={styles.sheetBtns}>
                  <TouchableOpacity
                    onPress={() => { setReplyTarget(null); setReplyText(""); setReplyPhotoUri(null); setFormPin(""); }}
                    disabled={replySaving}
                    style={[styles.btnSecondary, { borderColor: C.border }]}
                  >
                    <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={postReply}
                    disabled={!replyText.trim() || !formPrenom.trim() || !formNom.trim() || !pinReady || replySaving}
                    style={[
                      styles.btnPrimary,
                      { backgroundColor: C.accent },
                      (!replyText.trim() || !formPrenom.trim() || !formNom.trim() || !pinReady || replySaving) && { opacity: 0.5 },
                    ]}
                  >
                    {replySaving
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.btnPrimaryText}>Envoyer 🙏</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmModal
        visible={!!replyDeleteTarget}
        title="Supprimer cette réponse ?"
        message={replyDeleteTarget ? `"${replyDeleteTarget.reply_text.slice(0, 60)}${replyDeleteTarget.reply_text.length > 60 ? "…" : ""}"` : undefined}
        confirmLabel="Supprimer"
        onCancel={() => setReplyDeleteTarget(null)}
        onConfirm={confirmDeleteReply}
        C={C}
      />

      <ConfirmModal
        visible={!!deleteConfirmTarget}
        title="Supprimer cette nouvelle ?"
        message={
          deleteConfirmTarget
            ? isAdmin && deleteConfirmTarget.author_pin !== "ADMIN"
              ? `"${deleteConfirmTarget.content.slice(0, 60)}${deleteConfirmTarget.content.length > 60 ? "…" : ""}"\n\n${deleteConfirmTarget.author_prenom} recevra un message l'informant que sa publication a été supprimée.`
              : `"${deleteConfirmTarget.content.slice(0, 60)}${deleteConfirmTarget.content.length > 60 ? "…" : ""}"`
            : undefined
        }
        confirmLabel="Supprimer"
        onCancel={() => setDeleteConfirmTarget(null)}
        onConfirm={() => {
          if (!deleteConfirmTarget) return;
          const entry = deleteConfirmTarget;
          setDeleteConfirmTarget(null);
          if (isAdmin && entry.author_pin !== "ADMIN") {
            softDeleteByAdmin(entry);
          } else {
            doDelete(entry);
          }
        }}
        C={C}
      />

      {/* ── LIGHTBOX ──────────────────────────────────────────────────────── */}
      <Modal visible={!!lightbox} transparent animationType="fade" onRequestClose={() => setLightbox(null)}>
        <View style={styles.lightboxBg}>
          {lightbox && (
            <>
              <Image
                source={{ uri: lightbox.urls[lightbox.idx] }}
                style={styles.lightboxImg}
                resizeMode="contain"
              />
              {/* Prev / next */}
              {lightbox.urls.length > 1 && (
                <View style={styles.lightboxNav}>
                  <TouchableOpacity
                    onPress={() => setLightbox({ ...lightbox, idx: Math.max(0, lightbox.idx - 1) })}
                    style={[styles.lightboxNavBtn, lightbox.idx === 0 && { opacity: 0.3 }]}
                    disabled={lightbox.idx === 0}
                  >
                    <Text style={styles.lightboxNavText}>‹</Text>
                  </TouchableOpacity>
                  <Text style={styles.lightboxCounter}>
                    {lightbox.idx + 1} / {lightbox.urls.length}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setLightbox({ ...lightbox, idx: Math.min(lightbox.urls.length - 1, lightbox.idx + 1) })}
                    style={[styles.lightboxNavBtn, lightbox.idx === lightbox.urls.length - 1 && { opacity: 0.3 }]}
                    disabled={lightbox.idx === lightbox.urls.length - 1}
                  >
                    <Text style={styles.lightboxNavText}>›</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightbox(null)}>
            <Text style={styles.lightboxCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── LIGHTBOX MÉDIAS (avec texte + auteur de la publication d'origine, ─ */}
      {/*    pas les réponses) ────────────────────────────────────────────── */}
      <Modal visible={mediaLightboxIdx !== null} transparent animationType="fade" onRequestClose={() => setMediaLightboxIdx(null)}>
        <View style={styles.lightboxBg}>
          {mediaLightboxIdx !== null && mediaItems[mediaLightboxIdx] && (
            <>
              <Image
                source={{ uri: mediaItems[mediaLightboxIdx].url }}
                style={styles.lightboxImg}
                resizeMode="contain"
              />
              {mediaItems.length > 1 && (
                <View style={[styles.lightboxNav, { bottom: 170 }]}>
                  <TouchableOpacity
                    onPress={() => setMediaLightboxIdx((i) => Math.max(0, (i ?? 0) - 1))}
                    style={[styles.lightboxNavBtn, mediaLightboxIdx === 0 && { opacity: 0.3 }]}
                    disabled={mediaLightboxIdx === 0}
                  >
                    <Text style={styles.lightboxNavText}>‹</Text>
                  </TouchableOpacity>
                  <Text style={styles.lightboxCounter}>
                    {mediaLightboxIdx + 1} / {mediaItems.length}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setMediaLightboxIdx((i) => Math.min(mediaItems.length - 1, (i ?? 0) + 1))}
                    style={[styles.lightboxNavBtn, mediaLightboxIdx === mediaItems.length - 1 && { opacity: 0.3 }]}
                    disabled={mediaLightboxIdx === mediaItems.length - 1}
                  >
                    <Text style={styles.lightboxNavText}>›</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.mediaLightboxInfo}>
                {!!mediaItems[mediaLightboxIdx].entry.content && (
                  <Text style={styles.mediaLightboxText} numberOfLines={4}>
                    {mediaItems[mediaLightboxIdx].entry.content}
                  </Text>
                )}
                {mediaItems[mediaLightboxIdx].entry.author_pin !== "ADMIN" ? (
                  <TouchableOpacity
                    onPress={() => {
                      const { author_prenom, author_nom } = mediaItems[mediaLightboxIdx!].entry;
                      setMediaLightboxIdx(null);
                      setProfileTarget({ prenom: author_prenom, nom: author_nom });
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.mediaLightboxAuthor}>
                      {mediaItems[mediaLightboxIdx].entry.author_prenom} {mediaItems[mediaLightboxIdx].entry.author_nom}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.mediaLightboxAuthor}>
                    {mediaItems[mediaLightboxIdx].entry.author_prenom} {mediaItems[mediaLightboxIdx].entry.author_nom}
                  </Text>
                )}
                <TouchableOpacity
                  style={styles.mediaLightboxDownloadBtn}
                  onPress={downloadMediaLightboxPhoto}
                  disabled={downloadingMediaLightbox}
                  activeOpacity={0.8}
                >
                  {downloadingMediaLightbox ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.mediaLightboxDownloadText}>📥 Télécharger</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setMediaLightboxIdx(null)}>
            <Text style={styles.lightboxCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Toast */}
      {!!toast && (
        <View style={[styles.toast, { backgroundColor: C.success }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      {/* ── FICHE VISITEUR ────────────────────────────────────────────────── */}
      {profileTarget && (
        <VisitorProfileModal
          visible={!!profileTarget}
          onClose={() => setProfileTarget(null)}
          spaceId={spaceId}
          C={C}
          isAdmin={isAdmin}
          prenom={profileTarget.prenom}
          nom={profileTarget.nom}
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 15, textAlign: "center", marginBottom: 8 },
  emptyHint: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center" },

  header: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, borderBottomWidth: 1 },
  headerTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18 },
  headerStatusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  headerStatusText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, flex: 1 },
  subHeader: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  subHeaderRow: { flexDirection: "row", gap: 10 },
  addBtn: { flex: 1, minWidth: 0, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  addBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#0D1B2E" },
  mediaToggleBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 10 },

  list: { padding: 14, paddingBottom: 32 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: "DM_Sans_700Bold", fontSize: 16, color: "#fff" },
  authorName: { fontFamily: "DM_Sans_700Bold", fontSize: 14 },
  entryDate: { fontFamily: "DM_Sans_400Regular", fontSize: 11, marginTop: 1 },
  cardActions: { flexDirection: "row", gap: 6 },
  actionBtn: { width: 32, height: 32, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  actionBtnText: { fontSize: 14 },
  entryText: { fontFamily: "DM_Sans_400Regular", fontSize: 14, lineHeight: 22 },
  deletedBanner: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, lineHeight: 17, marginBottom: 8 },
  photoStrip: { paddingTop: 10, gap: 6 },
  photoThumb: { width: 100, height: 100, borderRadius: 10, borderWidth: 1 },

  selectBar: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  selectBarRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  selectBarBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  selectBarBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  checkBadge: { position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  checkBadgeText: { fontFamily: "DM_Sans_700Bold", fontSize: 13, color: "#0D1B2E" },

  mediaGrid: { padding: 6 },
  mediaCell: { flex: 1 / 2, aspectRatio: 1, margin: 4, borderRadius: 10, overflow: "hidden" },
  mediaCellImg: { width: "100%", height: "100%" },
  mediaLightboxInfo: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.72)", padding: 16, paddingBottom: 28 },
  mediaLightboxText: { fontFamily: "DM_Sans_400Regular", fontSize: 14, lineHeight: 20, color: "#fff", marginBottom: 8 },
  mediaLightboxAuthor: { fontFamily: "DM_Sans_700Bold", fontSize: 13, color: "#fff" },
  mediaLightboxDownloadBtn: {
    marginTop: 12, alignSelf: "flex-start", flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14,
  },
  mediaLightboxDownloadText: { fontFamily: "DM_Sans_700Bold", fontSize: 13, color: "#fff" },

  repliesWrap: { marginTop: 10, gap: 8 },
  replyItem: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderLeftWidth: 2, paddingLeft: 10 },
  replyAuthor: { fontFamily: "DM_Sans_700Bold", fontSize: 12 },
  replyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, lineHeight: 19, marginTop: 1 },
  replyPhotoThumb: { width: 80, height: 80, borderRadius: 8, borderWidth: 1, marginTop: 6 },
  replyDeletedBanner: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, lineHeight: 15, marginBottom: 3 },
  replyDeleteBtn: { padding: 4 },
  replyBtn: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, marginTop: 10 },
  replyBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },

  // Overlay / sheet
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "flex-end" },
  overlayScroll: { flexGrow: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, padding: 20, paddingBottom: 40, marginBottom: 12 },
  sheetTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 4 },
  sheetSub: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginBottom: 20 },

  // Centered overlay / sheet (for small popups, distinct from the bottom-sheet pair above)
  centeredOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "center", alignItems: "center" },
  centeredSheet: { width: "100%", borderRadius: 20, borderWidth: 1, padding: 24 },
  pickerSheet: { alignItems: "stretch" },
  pickerOption: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, marginTop: 12 },
  pickerOptionIcon: { fontSize: 20 },
  pickerOptionText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 15 },

  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontFamily: "DM_Sans_400Regular", fontSize: 15, marginBottom: 10 },
  textarea: { height: 190, textAlignVertical: "top" },
  fieldLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 },

  photoPickItem: { position: "relative" },
  photoPickThumb: { width: 72, height: 72, borderRadius: 10 },
  photoPickRemove: { position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  photoAddBanner: { flexDirection: "row", borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  photoAddBannerText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13.5 },

  pinContext: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 16 },
  pinContextText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, lineHeight: 20, fontStyle: "italic" },
  pinContextAuthor: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, marginTop: 6 },
  pinErrorText: { fontFamily: "DM_Sans_400Regular", fontSize: 12, textAlign: "center", marginTop: 8 },

  sheetBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
  btnPrimary: { flex: 1.3, borderRadius: 10, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  btnPrimaryText: { fontFamily: "DM_Sans_700Bold", fontSize: 15, color: "#fff" },
  btnSecondary: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  btnSecondaryText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },

  // Lightbox
  lightboxBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.96)", alignItems: "center", justifyContent: "center" },
  lightboxImg: { width: SCREEN_W, height: SCREEN_W * 1.1 },
  lightboxNav: { position: "absolute", bottom: 60, flexDirection: "row", alignItems: "center", gap: 24 },
  lightboxNavBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  lightboxNavText: { color: "#fff", fontSize: 22, fontWeight: "600" },
  lightboxCounter: { fontFamily: "DM_Sans_400Regular", fontSize: 14, color: "rgba(255,255,255,0.7)" },
  lightboxClose: { position: "absolute", top: 52, right: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  lightboxCloseText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  toast: { position: "absolute", bottom: 24, alignSelf: "center", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  toastText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, color: "#fff" },
});
