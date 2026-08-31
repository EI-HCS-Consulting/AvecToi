import { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, FlatList,
  StyleSheet, Alert, ActivityIndicator, Image, Modal,
  KeyboardAvoidingView, Platform, Dimensions,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { File } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "@/lib/supabase";
import { blobToArrayBuffer } from "@/lib/blobToArrayBuffer";
import { downloadAndShare, downloadAndShareMultiple, logSavedMedia, isShareAvailable } from "@/lib/mediaShare";
import { getVisitorSession, rememberAuthorPin } from "@/lib/visitorSession";
import { useWallReadTracking, useWallNewIds } from "@/lib/wallUnread";
import { NewIndicator } from "@/components/NewIndicator";
import PinPad from "@/components/PinPad";
import VisitorProfileModal from "@/components/VisitorProfileModal";
import type { SupportMessage, SupportMessageReply } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Section "Mur de soutien" extraite de l'ancien EntraideSoutien.tsx — voir
// components/Entraide.tsx pour l'autre moitié (Besoins).

const PHOTO_BUCKET = "support-photos";
const SOUVENIRS_BUCKET = "souvenirs";
const { width: SCREEN_W } = Dimensions.get("window");

function supportPhotoUrl(spaceId: string, filename: string) {
  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(`${spaceId}/${filename}`);
  return data.publicUrl;
}

// Même règle de slug que SouvenirsGallery.tsx / NewsFeed.tsx.
function sanitize(str: string) {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

interface Props {
  spaceId: string;
  C: Theme;
  isAdmin: boolean;
  capped: boolean;
}

export default function Soutien({ spaceId, C, isAdmin, capped }: Props) {
  const { focusMessageId } = useLocalSearchParams<{ focusMessageId?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const msgOffsets = useRef<Record<string, number>>({});
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const focusedRef = useRef(false);
  // Focus différé à l'ouverture du modal (via Modal.onShow) plutôt qu'un
  // autoFocus synchrone sur le TextInput : sur Android, autoFocus déclenche
  // le clavier pendant la toute première passe de layout du Modal, ce qui
  // entre en course avec le calcul de hauteur du ScrollView et laissait le
  // bas du formulaire (bouton Envoyer) invisible tant qu'aucun re-rendu
  // n'était déclenché.
  const msgTextRef = useRef<TextInput>(null);
  const soutienReplyTextRef = useRef<TextInput>(null);

  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(true);

  // Réponses aux messages, groupées par message_id.
  const [replies, setReplies] = useState<Record<string, SupportMessageReply[]>>({});
  const [replyTarget, setReplyTarget] = useState<SupportMessage | null>(null);
  const [replyDeleteTarget, setReplyDeleteTarget] = useState<SupportMessageReply | null>(null);
  const [messageDeleteTarget, setMessageDeleteTarget] = useState<SupportMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyPhotoUri, setReplyPhotoUri] = useState<string | null>(null);
  const [pickingReplyPhoto, setPickingReplyPhoto] = useState(false);
  const [replySaving, setReplySaving] = useState(false);

  const [msgText, setMsgText] = useState("");
  const [msgPrenom, setMsgPrenom] = useState("");
  const [msgNom, setMsgNom] = useState("");
  const [msgPin, setMsgPin] = useState("");
  const [msgPhotoUri, setMsgPhotoUri] = useState<string | null>(null);
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const [msgSaving, setMsgSaving] = useState(false);

  // Popup "Choisis la source de la photo" (caméra / galerie), partagé entre
  // l'ajout, l'édition et la réponse à un message — pickerTarget route le
  // choix vers le bon état (msgPhotoUri vs editPhoto vs replyPhotoUri).
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<"add" | "edit" | "reply">("add");

  // Édition d'un message déjà posté — bouton ✏️ visible uniquement pour
  // l'auteur réel du message (voir isOwnMessage plus bas).
  const [editTarget, setEditTarget] = useState<SupportMessage | null>(null);
  const [editMsgText, setEditMsgText] = useState("");
  const [editPrenom, setEditPrenom] = useState("");
  const [editNom, setEditNom] = useState("");
  const [editPhoto, setEditPhoto] = useState<{ uri: string; filename: string | null } | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [sessionPin, setSessionPin] = useState("");

  const [toast, setToast] = useState("");
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  // Ajout manuel au mur de Souvenirs (message.id en cours de synchro)
  const [syncingToSouvenirs, setSyncingToSouvenirs] = useState<string | null>(null);

  // Fiche visiteur — ouverte en cliquant le nom d'un auteur (sauf admin)
  const [profileTarget, setProfileTarget] = useState<{ prenom: string; nom: string } | null>(null);

  // Lightbox photo (message ou réponse) — appui long pour télécharger, comme
  // dans SouvenirsGallery.tsx (téléchargement via le partage natif).
  // authorPin/sourceId permettent de tracer le téléchargement dans
  // saved_media (Mes Souvenirs) quand la photo n'est pas la mienne.
  const [lightbox, setLightbox] = useState<{ url: string; authorPin: string; authorPrenom: string; authorNom: string; sourceId: string } | null>(null);
  const [downloadingLightbox, setDownloadingLightbox] = useState(false);
  const [downloadingMediaLightbox, setDownloadingMediaLightbox] = useState(false);

  // Vue "Médias" (photos seules, sans texte ni cadre de message) — même
  // pattern que components/NewsFeed.tsx. Lightbox dédié (mediaLightboxIdx)
  // pour afficher texte + auteur du message d'origine, sans les réponses.
  const [viewMode, setViewMode] = useState<"feed" | "media">("feed");
  const [mediaLightboxIdx, setMediaLightboxIdx] = useState<number | null>(null);

  // Sélection multiple dans la grille "Médias" — appui long pour entrer,
  // permet de télécharger/partager plusieurs photos d'un coup (même pattern
  // que components/SouvenirsGallery.tsx).
  const [mediaSelectMode, setMediaSelectMode] = useState(false);
  const [mediaSelected, setMediaSelected] = useState<Set<number>>(new Set());
  const [bulkDownloadingMedia, setBulkDownloadingMedia] = useState(false);

  // Trace le téléchargement dans saved_media (Mes Souvenirs) si la photo
  // n'est pas la mienne. Identifie le visiteur par prénom/nom (pas par pin,
  // pas toujours choisi) — voir lib/mediaShare.ts et MesSouvenirs.tsx.
  async function logDownloadIfNotMine(
    author: { pin: string | null; prenom: string; nom: string },
    sourceId: string,
    url: string,
  ) {
    if (isAdmin) {
      if (author.pin !== "ADMIN") {
        await logSavedMedia({ spaceId, sourceType: "support", sourceId, photoUrl: url, savedByPin: "ADMIN", savedByPrenom: "", savedByNom: "" });
      }
      return;
    }
    const session = await getVisitorSession();
    const prenom = (session?.prenom ?? "").trim();
    const nom = (session?.nom ?? "").trim();
    if (!prenom || !nom) return;
    const isMine = author.prenom?.trim().toLowerCase() === prenom.toLowerCase()
      && author.nom?.trim().toLowerCase() === nom.toLowerCase();
    if (isMine) return;
    await logSavedMedia({
      spaceId, sourceType: "support", sourceId, photoUrl: url,
      savedByPin: session?.pin ?? "", savedByPrenom: prenom, savedByNom: nom,
    });
  }

  async function downloadLightboxPhoto() {
    if (!lightbox) return;
    setDownloadingLightbox(true);
    const ok = await downloadAndShare(lightbox.url, `soutien_${Date.now()}.jpg`);
    if (!ok) showToast("Erreur lors du téléchargement");
    else await logDownloadIfNotMine({ pin: lightbox.authorPin, prenom: lightbox.authorPrenom, nom: lightbox.authorNom }, lightbox.sourceId, lightbox.url);
    setDownloadingLightbox(false);
  }

  async function downloadMediaLightboxPhoto() {
    if (mediaLightboxIdx === null) return;
    const item = mediaItems[mediaLightboxIdx];
    if (!item) return;
    setDownloadingMediaLightbox(true);
    const ok = await downloadAndShare(item.url, `soutien_${Date.now()}.jpg`);
    if (!ok) showToast("Erreur lors du téléchargement");
    else await logDownloadIfNotMine({ pin: item.message.author_pin, prenom: item.message.author_prenom, nom: item.message.author_nom }, item.message.id, item.url);
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
    const success = await downloadAndShareMultiple(
      targets.map((item, i) => ({ url: item.url, filename: `soutien_${item.message.id}_${i}.jpg` })),
    );
    if (success) {
      for (const item of targets) {
        await logDownloadIfNotMine({ pin: item.message.author_pin, prenom: item.message.author_prenom, nom: item.message.author_nom }, item.message.id, item.url);
      }
    }
    setBulkDownloadingMedia(false);
    setMediaSelectMode(false);
    setMediaSelected(new Set());
    showToast(success
      ? `${targets.length} photo${targets.length > 1 ? "s" : ""} partagée${targets.length > 1 ? "s" : ""}`
      : "Erreur lors du partage");
  }

  const loadMessages = useCallback(async () => {
    setMsgsLoading(true);
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .eq("space_id", spaceId)
      .order("created_at", { ascending: false });
    setMessages(data || []);
    setMsgsLoading(false);
  }, [spaceId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  const loadReplies = useCallback(async () => {
    const { data } = await supabase
      .from("support_message_replies")
      .select("*")
      .eq("space_id", spaceId)
      .order("created_at", { ascending: true });
    const grouped: Record<string, SupportMessageReply[]> = {};
    (data || []).forEach((r) => { (grouped[r.message_id] ??= []).push(r); });
    setReplies(grouped);
  }, [spaceId]);

  useEffect(() => { loadReplies(); }, [loadReplies]);

  // Réarme focusedRef à chaque nouvelle valeur de focusMessageId (même écran
  // déjà monté, cas des Tabs qui gardent Soutien en mémoire — sinon un 2e
  // clic depuis Mon compte sur un autre message ne refait rien).
  useEffect(() => {
    focusedRef.current = false;
  }, [focusMessageId]);

  // Arrivée depuis "Mon compte" via un lien profond (?focusMessageId=...) :
  // on scrolle jusqu'à la carte du message et on la surligne brièvement.
  // focusedRef évite de re-déclencher le scroll à chaque rechargement
  // realtime de messages.
  useEffect(() => {
    if (!focusMessageId || focusedRef.current || msgsLoading) return;
    const target = messages.find((m) => m.id === focusMessageId);
    if (!target) return;
    focusedRef.current = true;
    // scrollRef ne cible que la vue "feed" — si l'onglet était resté sur
    // "Médias" (état conservé par les Tabs), scrollTo s'appliquait à un ref
    // qui n'était plus monté et on atterrissait toujours en haut.
    setViewMode("feed");
    setHighlightId(focusMessageId);
    setTimeout(() => {
      const y = msgOffsets.current[focusMessageId];
      if (y != null) scrollRef.current?.scrollTo({ y: Math.max(y - 12, 0), animated: true });
    }, 300);
    setTimeout(() => setHighlightId(null), 2500);
  }, [focusMessageId, messages, msgsLoading]);

  // Identité déjà connue (déjà connecté) : admin → profil Supabase Auth
  // (Mon compte) ; visiteur → session enregistrée. Permet de ne jamais
  // redemander prénom/nom si déjà identifié (voir champs auteur plus bas).
  useEffect(() => {
    if (isAdmin) {
      supabase.auth.getUser().then(({ data }) => {
        setMsgPrenom((data.user?.user_metadata?.firstname ?? "").trim());
        setMsgNom((data.user?.user_metadata?.lastname ?? "").trim());
      });
      return;
    }
    getVisitorSession().then((s) => {
      if (s) {
        setMsgPrenom(s.prenom);
        setMsgNom(s.nom);
        if (s.pin) setSessionPin(s.pin);
      }
    });
  }, [isAdmin]);

  useEffect(() => {
    const ch = supabase
      .channel(`support:${spaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_messages", filter: `space_id=eq.${spaceId}` }, loadMessages)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [spaceId, loadMessages]);

  useEffect(() => {
    const ch = supabase
      .channel(`support-replies:${spaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_message_replies", filter: `space_id=eq.${spaceId}` }, loadReplies)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [spaceId, loadReplies]);

  function applyPickedPhoto(uri: string) {
    if (pickerTarget === "add") setMsgPhotoUri(uri);
    else if (pickerTarget === "edit") setEditPhoto({ uri, filename: null });
    else setReplyPhotoUri(uri);
  }

  async function pickPhotoFromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission refusée", "Autorise l'accès à la galerie dans les paramètres.");
      return;
    }
    if (pickerTarget === "add") setPickingPhoto(true);
    if (pickerTarget === "reply") setPickingReplyPhoto(true);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (pickerTarget === "add") setPickingPhoto(false);
    if (pickerTarget === "reply") setPickingReplyPhoto(false);
    if (!result.canceled && result.assets[0]) applyPickedPhoto(result.assets[0].uri);
  }

  async function pickPhotoFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission refusée", "Autorise l'accès à la caméra dans les paramètres.");
      return;
    }
    if (pickerTarget === "add") setPickingPhoto(true);
    if (pickerTarget === "reply") setPickingReplyPhoto(true);
    const result = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (pickerTarget === "add") setPickingPhoto(false);
    if (pickerTarget === "reply") setPickingReplyPhoto(false);
    if (!result.canceled && result.assets[0]) applyPickedPhoto(result.assets[0].uri);
  }

  function choosePickerSource(fn: () => void) {
    setPickerVisible(false);
    fn();
  }

  function openMsgPhotoPicker() {
    setPickerTarget("add");
    setPickerVisible(true);
  }

  function openReplyPhotoPicker() {
    setPickerTarget("reply");
    setPickerVisible(true);
  }

  function removeReplyPhoto() {
    setReplyPhotoUri(null);
  }

  function openEditPhotoPicker() {
    setPickerTarget("edit");
    setPickerVisible(true);
  }

  function removeMsgPhoto() {
    setMsgPhotoUri(null);
  }

  // Les photos du mur de soutien peuvent aussi être copiées dans la galerie
  // Souvenirs (contrairement à celles du mur d'entraide), mais uniquement à
  // la demande — bouton "Ajouter au mur de souvenirs" sur le message déjà
  // posté (voir addMessagePhotoToSouvenirs). Best-effort : un échec de sync
  // ne doit pas bloquer le reste.
  async function syncPhotoToSouvenirs(fileData: ArrayBuffer, authorPrenom: string, authorNom: string, sourceId: string) {
    try {
      const ts = String(Date.now());
      const prenomClean = sanitize(authorPrenom.trim()) || "Anonyme";
      const rand = Math.random().toString(36).slice(2, 6);
      const filename = `${ts}_${rand}__${prenomClean}.jpg`;
      const storagePath = `${spaceId}/${filename}`;

      const { error: storageErr } = await supabase.storage
        .from(SOUVENIRS_BUCKET)
        .upload(storagePath, fileData, { contentType: "image/jpeg", cacheControl: "3600" });
      if (storageErr) return;

      const { error: dbErr } = await supabase.from("souvenirs").insert({
        space_id: spaceId,
        filename,
        caption: "",
        uploaded_by_prenom: authorPrenom.trim(),
        uploaded_by_nom: authorNom.trim(),
        // Pas de PIN visiteur pour un message de soutien — "ADMIN" est le
        // sentinel déjà utilisé ailleurs (NewsFeed) pour "non supprimable
        // via PIN visiteur", ce qui correspond bien ici.
        uploaded_by_pin: "ADMIN",
        source_type: "support",
        source_id: sourceId,
      });
      if (dbErr) {
        await supabase.storage.from(SOUVENIRS_BUCKET).remove([storagePath]);
      }
    } catch {
      /* sync vers Souvenirs en best-effort */
    }
  }

  // Bouton "Ajouter au mur de souvenirs" sur un message déjà posté — relit
  // la photo depuis support-photos puis la copie vers souvenirs.
  async function addMessagePhotoToSouvenirs(m: SupportMessage) {
    if (!m.photo) return;
    setSyncingToSouvenirs(m.id);
    try {
      const { data, error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .download(`${spaceId}/${m.photo}`);
      if (error || !data) {
        showToast("Erreur lors de l'ajout");
      } else {
        const fileData = await blobToArrayBuffer(data);
        await syncPhotoToSouvenirs(fileData, m.author_prenom, m.author_nom, m.id);
        showToast("Ajouté au mur de souvenirs ✓");
      }
    } catch {
      showToast("Erreur lors de l'ajout");
    }
    setSyncingToSouvenirs(null);
  }

  async function postMessage() {
    if (!msgText.trim() || !msgPrenom.trim() || !msgNom.trim()) return;
    if (!isAdmin && !sessionPin && msgPin.length < 4) return;
    setMsgSaving(true);

    let photoFilename: string | null = null;
    if (msgPhotoUri) {
      try {
        const compressed = await ImageManipulator.manipulateAsync(
          msgPhotoUri,
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
          Alert.alert("Photo non envoyée", "Le message sera publié sans la photo.");
        }
      } catch {
        Alert.alert("Photo non envoyée", "Le message sera publié sans la photo.");
      }
    }

    const pinToUse = isAdmin ? "ADMIN" : (sessionPin || msgPin);
    await supabase.from("support_messages").insert({
      space_id: spaceId,
      message: msgText.trim(),
      author_prenom: msgPrenom.trim(),
      author_nom: msgNom.trim(),
      author_pin: pinToUse,
      photo: photoFilename,
    });
    setMsgSaving(false);
    if (!isAdmin) {
      await rememberAuthorPin(msgPrenom.trim(), msgNom.trim(), pinToUse);
      setSessionPin(pinToUse);
    }
    setMsgText(""); setMsgPhotoUri(null); setMsgPin(""); setShowAddModal(false);
    showToast("Message posté ✓");
    loadMessages();
  }

  // ── Édition (auteur réel du message ou admin sur ses propres messages) ─────
  function openEdit(m: SupportMessage) {
    setEditTarget(m);
    setEditMsgText(m.message);
    setEditPrenom(m.author_prenom);
    setEditNom(m.author_nom);
    setEditPhoto(m.photo ? { uri: supportPhotoUrl(spaceId, m.photo), filename: m.photo } : null);
  }

  function removeEditPhoto() {
    setEditPhoto(null);
  }

  async function handleSaveEdit() {
    if (!editTarget || !editMsgText.trim() || !editPrenom.trim() || !editNom.trim()) return;
    setEditSaving(true);

    // filename déjà connu (photo inchangée) ou null (pas de photo / nouvelle
    // photo locale à uploader ci-dessous).
    let finalFilename: string | null = editPhoto?.filename ?? null;

    if (editPhoto && !editPhoto.filename) {
      try {
        const compressed = await ImageManipulator.manipulateAsync(
          editPhoto.uri,
          [{ resize: { width: 1080 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
        );
        const fileData = await new File(compressed.uri).arrayBuffer();
        const fname = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`;
        const { error } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(`${spaceId}/${fname}`, fileData, { contentType: "image/jpeg", cacheControl: "3600" });
        if (!error) {
          finalFilename = fname;
        } else {
          Alert.alert("Photo non envoyée", "Le message sera modifié sans la nouvelle photo.");
          finalFilename = editTarget.photo;
        }
      } catch {
        Alert.alert("Photo non envoyée", "Le message sera modifié sans la nouvelle photo.");
        finalFilename = editTarget.photo;
      }
    }

    // Photo retirée ou remplacée : supprime l'ancien fichier du storage.
    if (editTarget.photo && editTarget.photo !== finalFilename) {
      await supabase.storage.from(PHOTO_BUCKET).remove([`${spaceId}/${editTarget.photo}`]);
    }

    const { error } = await supabase
      .from("support_messages")
      .update({
        message: editMsgText.trim(),
        author_prenom: editPrenom.trim(),
        author_nom: editNom.trim(),
        photo: finalFilename,
      })
      .eq("id", editTarget.id);

    setEditSaving(false);
    if (error) { Alert.alert("Erreur", "Erreur lors de la modification : " + error.message); return; }
    showToast("Message modifié ✓");
    setEditTarget(null);
    loadMessages();
  }

  // Suppression "douce" par l'admin d'un message publié par un autre
  // utilisateur : reste visible avec un bandeau rouge pour son auteur
  // uniquement, masqué pour tous les autres (y compris l'admin). Voir
  // supabase/migrations/20260811_content_deleted_by_admin.sql.
  async function softDeleteByAdminMessage(m: SupportMessage) {
    await supabase.from("support_messages").update({ deleted_by_admin: true }).eq("id", m.id);
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, deleted_by_admin: true } : x)));
    showToast("Message supprimé");
  }

  async function confirmDeleteMessage() {
    if (!messageDeleteTarget) return;
    const m = messageDeleteTarget;
    setMessageDeleteTarget(null);
    if (isAdmin && m.author_pin !== "ADMIN") {
      await softDeleteByAdminMessage(m);
      return;
    }
    if (m.photo) await supabase.storage.from(PHOTO_BUCKET).remove([`${spaceId}/${m.photo}`]);
    await supabase.from("support_messages").delete().eq("id", m.id);
    loadMessages();
    showToast("Message supprimé");
  }

  // ── Réponses (ouvert à tous, y compris sur ses propres messages) ───────────
  function openReply(m: SupportMessage) {
    setReplyTarget(m);
    setReplyText("");
    setReplyPhotoUri(null);
  }

  async function postReply() {
    if (!replyTarget || !replyText.trim() || !msgPrenom.trim() || !msgNom.trim()) return;
    if (!isAdmin && !sessionPin && msgPin.length < 4) return;
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

    const pinToUse = isAdmin ? "ADMIN" : (sessionPin || msgPin);
    await supabase.from("support_message_replies").insert({
      message_id: replyTarget.id,
      space_id: spaceId,
      reply_text: replyText.trim(),
      author_prenom: msgPrenom.trim(),
      author_nom: msgNom.trim(),
      author_pin: pinToUse,
      photo: photoFilename,
    });
    setReplySaving(false);
    if (!isAdmin) {
      await rememberAuthorPin(msgPrenom.trim(), msgNom.trim(), pinToUse);
      setSessionPin(pinToUse);
    }
    setReplyText(""); setReplyPhotoUri(null); setMsgPin(""); setReplyTarget(null);
    showToast("Réponse envoyée 🙏");
    loadReplies();
  }

  async function softDeleteByAdminReply(r: SupportMessageReply) {
    await supabase.from("support_message_replies").update({ deleted_by_admin: true }).eq("id", r.id);
    setReplies((prev) => ({
      ...prev,
      [r.message_id]: (prev[r.message_id] || []).map((x) => (x.id === r.id ? { ...x, deleted_by_admin: true } : x)),
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
    await supabase.from("support_message_replies").delete().eq("id", r.id);
    loadReplies();
    showToast("Réponse supprimée");
  }

  const pinReady = isAdmin || !!sessionPin || msgPin.length >= 4;

  // Même règle de propriété que dans le rendu plus bas — extraite ici pour
  // filtrer la visibilité avant le map().
  function isOwnMessage(m: SupportMessage) {
    return isAdmin
      ? m.author_pin === "ADMIN"
      : (!!sessionPin && m.author_pin === sessionPin && m.author_prenom === msgPrenom && m.author_nom === msgNom);
  }
  function isOwnReply(r: SupportMessageReply) {
    return isAdmin ? r.author_pin === "ADMIN" : (!!sessionPin && r.author_pin === sessionPin);
  }

  // Modération admin : un message supprimé "en douceur" (deleted_by_admin)
  // reste visible pour son auteur uniquement, avec un bandeau rouge — voir
  // supabase/migrations/20260811_content_deleted_by_admin.sql.
  const visibleMessages = messages.filter((m) => !m.deleted_by_admin || (!isAdmin && isOwnMessage(m)));

  // Badge "New" sur chaque message publié par quelqu'un d'autre depuis le
  // démarrage de cette session (voir lib/wallUnread.ts, mécanisme partagé
  // avec Entraide/Nouvelles). useWallReadTracking n'entretient plus que le
  // point rouge de la barre d'onglets.
  useWallReadTracking("soutien", spaceId, isAdmin, msgsLoading ? null : visibleMessages);
  const newIds = useWallNewIds(isAdmin, msgsLoading ? null : visibleMessages);

  // Liste aplatie des médias pour la vue "Médias" (bouton du sous-header) —
  // uniquement les photos des messages, pas des réponses (voir plan).
  const mediaItems = visibleMessages
    .filter((m): m is SupportMessage & { photo: string } => !!m.photo)
    .map((m) => ({ url: supportPhotoUrl(spaceId, m.photo), message: m }));

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <Text style={[styles.headerTitle, { color: C.text }]}>💛 Mur de soutien</Text>
      </View>

      <View style={[styles.subHeader, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <View style={styles.subHeaderRow}>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: C.accent }]}
            onPress={() => {
              if (capped) {
                Alert.alert(
                  "Limite atteinte",
                  "Vous avez atteint la limite de votre espace. Consultez l'email envoyé à votre adresse pour en savoir plus.",
                );
                return;
              }
              setShowAddModal(true);
            }}
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
          onPress={() => setViewMode((v) => (v === "media" ? "feed" : "media"))}
          activeOpacity={0.85}
        >
          <Text style={[styles.addBtnText, { color: viewMode === "media" ? "#fff" : C.accent }]}>
            🖼️ Médias
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === "media" ? (
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
      ) : (
      <ScrollView
        key="feed-list"
        ref={scrollRef}
        contentContainerStyle={styles.listPad}
        keyboardShouldPersistTaps="handled"
      >
        {msgsLoading ? (
          <ActivityIndicator color={C.accent} style={{ marginTop: 24 }} />
        ) : visibleMessages.length === 0 ? (
          <View style={[styles.centered, { marginTop: 32 }]}>
            <Text style={{ fontSize: 32, marginBottom: 10 }}>💛</Text>
            <Text style={[styles.emptyText, { color: C.muted }]}>Aucun message de soutien.</Text>
            <Text style={[styles.emptyHint, { color: C.muted }]}>Sois le premier à en laisser un !</Text>
          </View>
        ) : (
          visibleMessages.map((m) => {
            const highlighted = highlightId === m.id;
            const own = isOwnMessage(m);
            // Dès qu'une réponse existe, seul l'admin garde le droit de
            // supprimer le message (la suppression entraîne aussi celle de
            // toutes les réponses via on delete cascade en base) — un
            // visiteur ne doit pas pouvoir effacer une conversation à
            // laquelle d'autres ont participé. Cette règle ne s'applique
            // plus une fois le message modéré par l'admin (deleted_by_admin) :
            // seul son auteur le voit encore, donc plus aucune conversation
            // à préserver, et "Supprimer définitivement" doit rester possible.
            const canDeleteMessage = isAdmin || (own && (m.deleted_by_admin || !replies[m.id]?.length));
            const isNew = newIds.has(m.id);
            return (
            <View
              key={m.id}
              onLayout={(e) => {
                msgOffsets.current[m.id] = e.nativeEvent.layout.y;
              }}
              style={[
                styles.msgCard,
                { backgroundColor: C.card, borderColor: highlighted ? C.gold : C.border },
                highlighted && { borderWidth: 2 },
              ]}
            >
              {isNew && <NewIndicator />}
              <View style={styles.msgCardHeader}>
                <View style={[styles.msgAvatar, { backgroundColor: `${C.gold}33` }]}>
                  <Text style={[styles.msgAvatarText, { color: C.gold }]}>
                    {m.author_prenom.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  {m.author_pin !== "ADMIN" ? (
                    <TouchableOpacity onPress={() => setProfileTarget({ prenom: m.author_prenom, nom: m.author_nom })} activeOpacity={0.7}>
                      <Text style={[styles.msgAuthor, { color: C.text }]}>{m.author_prenom} {m.author_nom}</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={[styles.msgAuthor, { color: C.text }]}>{m.author_prenom} {m.author_nom}</Text>
                  )}
                  <Text style={[styles.msgDate, { color: C.muted }]}>
                    {new Date(m.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </Text>
                </View>
                {(own || isAdmin) && (
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {own && !m.deleted_by_admin && (
                      <TouchableOpacity onPress={() => openEdit(m)} style={[styles.iconBtn, { borderColor: C.border }]}>
                        <Text style={{ fontSize: 13, color: C.muted }}>✏️</Text>
                      </TouchableOpacity>
                    )}
                    {canDeleteMessage && (
                      <TouchableOpacity onPress={() => setMessageDeleteTarget(m)} style={[styles.iconBtn, { borderColor: "rgba(233,69,96,0.3)" }]}>
                        <Text style={{ fontSize: 13, color: "#e94560" }}>
                          {m.deleted_by_admin ? "🗑️ Suppr. définitivement" : "🗑️"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
              {m.deleted_by_admin && (
                <Text style={[styles.msgDeletedBanner, { color: C.danger }]}>
                  Votre publication a été supprimée par l'administrateur du compte. Elle n'est ainsi plus visible par les autres utilisateurs.
                </Text>
              )}
              <Text style={[styles.msgText, { color: C.text }]}>{m.message}</Text>
              {m.photo && (
                <>
                  <TouchableOpacity onPress={() => setLightbox({ url: supportPhotoUrl(spaceId, m.photo!), authorPin: m.author_pin ?? "", authorPrenom: m.author_prenom, authorNom: m.author_nom, sourceId: m.id })} activeOpacity={0.85}>
                    <Image source={{ uri: supportPhotoUrl(spaceId, m.photo) }} style={styles.msgPhoto} resizeMode="cover" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.souvenirsBtn, { borderColor: C.border }]}
                    onPress={() => addMessagePhotoToSouvenirs(m)}
                    disabled={syncingToSouvenirs === m.id}
                    activeOpacity={0.75}
                  >
                    {syncingToSouvenirs === m.id
                      ? <ActivityIndicator color={C.gold} size="small" />
                      : <Text style={[styles.souvenirsBtnText, { color: C.gold }]}>📸 Ajouter au mur de souvenirs</Text>
                    }
                  </TouchableOpacity>
                </>
              )}

              {(() => {
                const repliesForMsg = (replies[m.id] || []).filter((r) => !r.deleted_by_admin || (!isAdmin && isOwnReply(r)));
                if (!repliesForMsg.length) return null;
                return (
                  <View style={styles.repliesWrap}>
                    {repliesForMsg.map((r) => {
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
                              <TouchableOpacity onPress={() => setLightbox({ url: supportPhotoUrl(spaceId, r.photo!), authorPin: r.author_pin ?? "", authorPrenom: r.author_prenom, authorNom: r.author_nom, sourceId: r.id })} activeOpacity={0.85}>
                                <Image source={{ uri: supportPhotoUrl(spaceId, r.photo) }} style={[styles.replyPhotoThumb, { borderColor: C.border }]} resizeMode="cover" />
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
                onPress={() => openReply(m)}
                activeOpacity={0.75}
              >
                <Text style={[styles.replyBtnText, { color: C.gold }]}>🙏 Répondre</Text>
              </TouchableOpacity>
            </View>
            );
          })
        )}
      </ScrollView>
      )}

      {!!toast && (
        <View style={[styles.toast, { backgroundColor: C.success }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      {/* ── MODAL CHOIX SOURCE (caméra / galerie) ────────────────────────────── */}
      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <TouchableOpacity style={styles.centeredOverlay} activeOpacity={1} onPress={() => setPickerVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={{ width: "88%" }}>
            <View style={[styles.centeredSheet, styles.pickerSheet, { backgroundColor: C.card, borderColor: C.accent }]}>
              <Text style={[styles.sheetTitle, { color: C.text, textAlign: "center" }]}>📷 Ajouter une photo</Text>
              <Text style={[styles.sheetSub, { color: C.muted, textAlign: "center" }]}>Choisis la source de la photo</Text>

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

      {/* ── MODAL AJOUT ───────────────────────────────────────────────────── */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => !msgSaving && setShowAddModal(false)}
        onShow={() => setTimeout(() => msgTextRef.current?.focus(), 60)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <TouchableOpacity
            style={[styles.centeredOverlay, { justifyContent: "flex-end", paddingBottom: 12 }]}
            activeOpacity={1}
            onPress={() => !msgSaving && setShowAddModal(false)}
          >
            <TouchableOpacity activeOpacity={1} style={{ width: "88%" }}>
              <View style={[styles.centeredSheet, { backgroundColor: C.card, borderColor: C.accent, maxHeight: "94%" }]}>
                {/* Hors du ScrollView : le titre doit rester visible même
                    quand le clavier ouvert force un scroll-to-focus sur le
                    champ de saisie, sinon il se retrouve caché en haut. */}
                <Text style={[styles.sheetTitle, { color: C.text }]}>💛 Laisser un message</Text>

                <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <TextInput
                    ref={msgTextRef}
                    style={[styles.input, styles.msgArea, { height: 140, backgroundColor: C.bg, borderColor: C.border, color: C.text, marginTop: 12 }]}
                    placeholder="Un mot d'encouragement pour la famille et le patient…"
                    placeholderTextColor={C.muted}
                    value={msgText}
                    onChangeText={setMsgText}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />

                  {/* Champs auteur — uniquement si l'identité n'est pas
                      encore connue (première contribution de ce
                      visiteur/admin) ; une fois connue, inutile de la
                      redemander vu que la publication se fait déjà depuis
                      son compte. */}
                  {!(msgPrenom.trim() && msgNom.trim()) && (
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TextInput
                        style={[styles.input, { flex: 1, backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                        placeholder="Prénom *"
                        placeholderTextColor={C.muted}
                        value={msgPrenom}
                        onChangeText={setMsgPrenom}
                        autoCapitalize="words"
                      />
                      <TextInput
                        style={[styles.input, { flex: 1, backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                        placeholder="Nom *"
                        placeholderTextColor={C.muted}
                        value={msgNom}
                        onChangeText={setMsgNom}
                        autoCapitalize="words"
                      />
                    </View>
                  )}

                  {!isAdmin && !sessionPin && (
                    <>
                      <Text style={[styles.pinLabel, { color: C.gold }]}>🔐 Choisis ton code PIN (4 chiffres)</Text>
                      <Text style={[styles.pinHint, { color: C.muted }]}>
                        Garde-le précieusement — tu en auras besoin pour modifier ton message.
                      </Text>
                      <PinPad value={msgPin} onChange={setMsgPin} theme={C} />
                    </>
                  )}
                </ScrollView>

                {/* Hors du ScrollView, juste au-dessus du bouton Envoyer :
                    toujours entièrement visible, même quand le clavier ouvert
                    force un scroll-to-focus sur le champ de saisie. */}
                {msgPhotoUri ? (
                  <View style={styles.photoPreviewRow}>
                    <Image source={{ uri: msgPhotoUri }} style={styles.photoPreviewImg} resizeMode="cover" />
                    <TouchableOpacity style={[styles.photoPickRemove, { backgroundColor: "#e94560" }]} onPress={removeMsgPhoto}>
                      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.photoPickAdd, { backgroundColor: C.gold + "1c", borderColor: C.gold }]}
                    onPress={openMsgPhotoPicker}
                    disabled={pickingPhoto}
                    activeOpacity={0.8}
                  >
                    {pickingPhoto
                      ? <ActivityIndicator color={C.gold} size="small" />
                      : <Text style={[styles.photoPickAddText, { color: C.gold }]}>📷 Ajouter une photo (optionnel)</Text>
                    }
                  </TouchableOpacity>
                )}

                <View style={styles.sheetBtns}>
                  <TouchableOpacity
                    onPress={() => { setShowAddModal(false); setMsgText(""); setMsgPhotoUri(null); setMsgPin(""); }}
                    disabled={msgSaving}
                    style={[styles.btnSecondary, { borderColor: C.border }]}
                  >
                    <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={postMessage}
                    disabled={!msgText.trim() || !msgPrenom.trim() || !msgNom.trim() || !pinReady || msgSaving}
                    style={[
                      styles.btnPrimary,
                      { backgroundColor: C.gold },
                      (!msgText.trim() || !msgPrenom.trim() || !msgNom.trim() || !pinReady || msgSaving) && { opacity: 0.5 },
                    ]}
                  >
                    {msgSaving
                      ? <ActivityIndicator color="#0D1B2E" size="small" />
                      : <Text style={[styles.btnPrimaryText, { color: "#0D1B2E" }]}>Envoyer 🩷</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL ÉDITION ─────────────────────────────────────────────────── */}
      <Modal visible={!!editTarget} transparent animationType="fade" onRequestClose={() => !editSaving && setEditTarget(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <TouchableOpacity
            style={[styles.centeredOverlay, { justifyContent: "flex-end", paddingBottom: 12 }]}
            activeOpacity={1}
            onPress={() => !editSaving && setEditTarget(null)}
          >
            <TouchableOpacity activeOpacity={1} style={{ width: "88%" }}>
              <View style={[styles.centeredSheet, { backgroundColor: C.card, borderColor: C.accent, maxHeight: "94%" }]}>
                {/* Hors du ScrollView : le titre doit rester visible même
                    quand le clavier ouvert force un scroll-to-focus sur le
                    champ de saisie, sinon il se retrouve caché en haut. */}
                <Text style={[styles.sheetTitle, { color: C.text }]}>✏️ Modifier le message</Text>

                <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <TextInput
                    style={[styles.input, styles.msgArea, { backgroundColor: C.bg, borderColor: C.border, color: C.text, marginTop: 12 }]}
                    placeholder="Un mot d'encouragement…"
                    placeholderTextColor={C.muted}
                    value={editMsgText}
                    onChangeText={setEditMsgText}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />

                </ScrollView>

                {/* Hors du ScrollView, juste au-dessus du bouton Enregistrer :
                    toujours entièrement visible, même quand le clavier ouvert
                    force un scroll-to-focus sur le champ de saisie. */}
                {editPhoto ? (
                  <View style={styles.photoPreviewRow}>
                    <Image source={{ uri: editPhoto.uri }} style={styles.photoPreviewImg} resizeMode="cover" />
                    <TouchableOpacity style={[styles.photoPickRemove, { backgroundColor: "#e94560" }]} onPress={removeEditPhoto}>
                      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={[styles.photoPickAdd, { backgroundColor: C.gold + "1c", borderColor: C.gold }]} onPress={openEditPhotoPicker} activeOpacity={0.8}>
                    <Text style={[styles.photoPickAddText, { color: C.gold }]}>📷 Ajouter une photo (optionnel)</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.sheetBtns}>
                  <TouchableOpacity onPress={() => setEditTarget(null)} disabled={editSaving} style={[styles.btnSecondary, { borderColor: C.border }]}>
                    <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveEdit}
                    disabled={!editMsgText.trim() || !editPrenom.trim() || !editNom.trim() || editSaving}
                    style={[
                      styles.btnPrimary,
                      { backgroundColor: C.accent },
                      (!editMsgText.trim() || !editPrenom.trim() || !editNom.trim() || editSaving) && { opacity: 0.5 },
                    ]}
                  >
                    {editSaving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnPrimaryText}>✓ Enregistrer</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL RÉPONSE ─────────────────────────────────────────────────── */}
      <Modal
        visible={!!replyTarget}
        transparent
        animationType="fade"
        onRequestClose={() => !replySaving && setReplyTarget(null)}
        onShow={() => setTimeout(() => soutienReplyTextRef.current?.focus(), 60)}
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
                    À {replyTarget.author_prenom} {replyTarget.author_nom} : « {replyTarget.message} »
                  </Text>
                )}

                <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <TextInput
                    ref={soutienReplyTextRef}
                    style={[styles.input, styles.msgArea, { height: 140, backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                    placeholder="Ta réponse…"
                    placeholderTextColor={C.muted}
                    value={replyText}
                    onChangeText={setReplyText}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />

                  {!(msgPrenom.trim() && msgNom.trim()) && (
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TextInput
                        style={[styles.input, { flex: 1, backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                        placeholder="Prénom *"
                        placeholderTextColor={C.muted}
                        value={msgPrenom}
                        onChangeText={setMsgPrenom}
                        autoCapitalize="words"
                      />
                      <TextInput
                        style={[styles.input, { flex: 1, backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                        placeholder="Nom *"
                        placeholderTextColor={C.muted}
                        value={msgNom}
                        onChangeText={setMsgNom}
                        autoCapitalize="words"
                      />
                    </View>
                  )}

                  {!isAdmin && !sessionPin && (
                    <>
                      <Text style={[styles.pinLabel, { color: C.gold }]}>🔐 Choisis ton code PIN (4 chiffres)</Text>
                      <Text style={[styles.pinHint, { color: C.muted }]}>
                        Garde-le précieusement — tu en auras besoin pour modifier tes contributions.
                      </Text>
                      <PinPad value={msgPin} onChange={setMsgPin} theme={C} />
                    </>
                  )}
                </ScrollView>

                {/* Hors du ScrollView, juste au-dessus du bouton Envoyer :
                    toujours entièrement visible, même quand le clavier ouvert
                    force un scroll-to-focus sur le champ de saisie. */}
                {replyPhotoUri ? (
                  <View style={styles.photoPreviewRow}>
                    <Image source={{ uri: replyPhotoUri }} style={styles.photoPreviewImg} resizeMode="cover" />
                    <TouchableOpacity style={[styles.photoPickRemove, { backgroundColor: "#e94560" }]} onPress={removeReplyPhoto}>
                      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.photoPickAdd, { backgroundColor: C.gold + "1c", borderColor: C.gold }]}
                    onPress={openReplyPhotoPicker}
                    disabled={pickingReplyPhoto}
                    activeOpacity={0.8}
                  >
                    {pickingReplyPhoto
                      ? <ActivityIndicator color={C.gold} size="small" />
                      : <Text style={[styles.photoPickAddText, { color: C.gold }]}>📷 Ajouter une photo (optionnel)</Text>
                    }
                  </TouchableOpacity>
                )}

                <View style={styles.sheetBtns}>
                  <TouchableOpacity
                    onPress={() => { setReplyTarget(null); setReplyText(""); setReplyPhotoUri(null); setMsgPin(""); }}
                    disabled={replySaving}
                    style={[styles.btnSecondary, { borderColor: C.border }]}
                  >
                    <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={postReply}
                    disabled={!replyText.trim() || !msgPrenom.trim() || !msgNom.trim() || !pinReady || replySaving}
                    style={[
                      styles.btnPrimary,
                      { backgroundColor: C.gold },
                      (!replyText.trim() || !msgPrenom.trim() || !msgNom.trim() || !pinReady || replySaving) && { opacity: 0.5 },
                    ]}
                  >
                    {replySaving
                      ? <ActivityIndicator color="#0D1B2E" size="small" />
                      : <Text style={[styles.btnPrimaryText, { color: "#0D1B2E" }]}>Envoyer 🙏</Text>
                    }
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={!!replyDeleteTarget} transparent animationType="fade" onRequestClose={() => setReplyDeleteTarget(null)}>
        <TouchableOpacity style={styles.confirmOverlay} activeOpacity={1} onPress={() => setReplyDeleteTarget(null)}>
          <TouchableOpacity activeOpacity={1}>
            <View style={[styles.confirmSheet, { backgroundColor: C.card, borderColor: C.danger }]}>
              <Text style={styles.confirmIcon}>🗑️</Text>
              <Text style={[styles.confirmTitle, { color: C.text }]}>Supprimer cette réponse ?</Text>
              {replyDeleteTarget && (
                <Text style={[styles.confirmSub, { color: C.muted }]}>"{replyDeleteTarget.reply_text.slice(0, 60)}…"</Text>
              )}
              {replyDeleteTarget && isAdmin && replyDeleteTarget.author_pin !== "ADMIN" && (
                <Text style={[styles.confirmSub, { color: C.muted, marginTop: 6 }]}>
                  {replyDeleteTarget.author_prenom} recevra un message l'informant que sa publication a été supprimée.
                </Text>
              )}
              <View style={styles.confirmButtons}>
                <TouchableOpacity style={[styles.confirmBtn, { borderColor: C.border }]} onPress={() => setReplyDeleteTarget(null)}>
                  <Text style={[styles.confirmBtnText, { color: C.muted }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: C.danger, borderColor: C.danger }]} onPress={confirmDeleteReply}>
                  <Text style={[styles.confirmBtnText, { color: "#fff" }]}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={!!messageDeleteTarget} transparent animationType="fade" onRequestClose={() => setMessageDeleteTarget(null)}>
        <TouchableOpacity style={styles.confirmOverlay} activeOpacity={1} onPress={() => setMessageDeleteTarget(null)}>
          <TouchableOpacity activeOpacity={1}>
            <View style={[styles.confirmSheet, { backgroundColor: C.card, borderColor: C.danger }]}>
              <Text style={styles.confirmIcon}>🗑️</Text>
              <Text style={[styles.confirmTitle, { color: C.text }]}>Supprimer ce message ?</Text>
              {messageDeleteTarget && (
                <Text style={[styles.confirmSub, { color: C.muted }]}>"{messageDeleteTarget.message.slice(0, 60)}…"</Text>
              )}
              {messageDeleteTarget && isAdmin && messageDeleteTarget.author_pin !== "ADMIN" && (
                <Text style={[styles.confirmSub, { color: C.muted, marginTop: 6 }]}>
                  {messageDeleteTarget.author_prenom} recevra un message l'informant que sa publication a été supprimée.
                </Text>
              )}
              <View style={styles.confirmButtons}>
                <TouchableOpacity style={[styles.confirmBtn, { borderColor: C.border }]} onPress={() => setMessageDeleteTarget(null)}>
                  <Text style={[styles.confirmBtnText, { color: C.muted }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: C.danger, borderColor: C.danger }]} onPress={confirmDeleteMessage}>
                  <Text style={[styles.confirmBtnText, { color: "#fff" }]}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── LIGHTBOX PHOTO (message / réponse) ───────────────────────────── */}
      <Modal visible={!!lightbox} transparent animationType="fade" onRequestClose={() => setLightbox(null)}>
        <View style={styles.lightboxBg}>
          {lightbox && (
            <>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => setLightbox(null)}
                onLongPress={downloadLightboxPhoto}
                delayLongPress={350}
              >
                <Image source={{ uri: lightbox.url }} style={styles.lightboxImg} resizeMode="contain" />
              </TouchableOpacity>
              {downloadingLightbox
                ? <ActivityIndicator color="#fff" style={styles.lightboxHint} />
                : <Text style={styles.lightboxHint}>Reste appuyé sur la photo pour la télécharger</Text>
              }
            </>
          )}
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightbox(null)}>
            <Text style={styles.lightboxCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── LIGHTBOX MÉDIAS (avec texte + auteur du message d'origine, ────── */}
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
                {!!mediaItems[mediaLightboxIdx].message.message && (
                  <Text style={styles.mediaLightboxText} numberOfLines={4}>
                    {mediaItems[mediaLightboxIdx].message.message}
                  </Text>
                )}
                {mediaItems[mediaLightboxIdx].message.author_pin !== "ADMIN" ? (
                  <TouchableOpacity
                    onPress={() => {
                      const { author_prenom, author_nom } = mediaItems[mediaLightboxIdx!].message;
                      setMediaLightboxIdx(null);
                      setProfileTarget({ prenom: author_prenom, nom: author_nom });
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.mediaLightboxAuthor}>
                      {mediaItems[mediaLightboxIdx].message.author_prenom} {mediaItems[mediaLightboxIdx].message.author_nom}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.mediaLightboxAuthor}>
                    {mediaItems[mediaLightboxIdx].message.author_prenom} {mediaItems[mediaLightboxIdx].message.author_nom}
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

const styles = StyleSheet.create({
  container: { flex: 1 },

  confirmOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "center", alignItems: "center", padding: 24 },
  confirmSheet: { width: "100%", maxWidth: 380, borderRadius: 20, borderWidth: 1, padding: 24, alignItems: "center" },
  confirmIcon: { fontSize: 32, marginBottom: 8 },
  confirmTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, textAlign: "center", marginBottom: 6 },
  confirmSub: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center" },
  confirmButtons: { flexDirection: "row", gap: 10, width: "100%", marginTop: 20 },
  confirmBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  confirmBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 15, textAlign: "center", marginBottom: 6 },
  emptyHint: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center" },

  header: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18 },
  subHeader: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  subHeaderRow: { flexDirection: "row", gap: 10 },
  addBtn: { flex: 1, minWidth: 0, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  addBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#0D1B2E" },

  listPad: { padding: 14, paddingBottom: 40 },

  msgArea: { height: 170, textAlignVertical: "top" },
  postBtn: { borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  postBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#0D1B2E" },
  msgCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  msgCardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  msgDeletedBanner: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, lineHeight: 17, marginBottom: 6 },
  replyDeletedBanner: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, lineHeight: 15, marginBottom: 3 },
  msgAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  msgAvatarText: { fontFamily: "DM_Sans_700Bold", fontSize: 15 },
  msgAuthor: { fontFamily: "DM_Sans_700Bold", fontSize: 13 },
  msgDate: { fontFamily: "DM_Sans_400Regular", fontSize: 11, marginTop: 1 },
  msgText: { fontFamily: "DM_Sans_400Regular", fontSize: 14, lineHeight: 22 },
  msgPhoto: { width: "100%", height: 160, borderRadius: 10, marginTop: 10 },
  souvenirsBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: "center", marginTop: 8 },
  souvenirsBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
  iconBtn: { width: 30, height: 30, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center" },

  repliesWrap: { marginTop: 10, gap: 8 },
  replyItem: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderLeftWidth: 2, paddingLeft: 10 },
  replyAuthor: { fontFamily: "DM_Sans_700Bold", fontSize: 12 },
  replyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, lineHeight: 19, marginTop: 1 },
  replyPhotoThumb: { width: 80, height: 80, borderRadius: 8, borderWidth: 1, marginTop: 6 },
  replyDeleteBtn: { padding: 4 },
  replyBtn: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, marginTop: 10 },
  replyBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },

  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontFamily: "DM_Sans_400Regular", fontSize: 15, marginBottom: 10 },

  photoPreviewRow: { position: "relative", marginBottom: 10 },
  photoPreviewImg: { width: "100%", height: 140, borderRadius: 10 },
  photoPickRemove: { position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  photoPickAdd: { flexDirection: "row", borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  photoPickAddText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13.5 },

  toast: { position: "absolute", bottom: 24, alignSelf: "center", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  toastText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, color: "#fff" },

  pinLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6, marginTop: 4 },
  pinHint: { fontFamily: "DM_Sans_400Regular", fontSize: 12, lineHeight: 18, marginBottom: 12 },

  sheetTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 4 },
  sheetSub: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginBottom: 20 },
  sheetBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
  btnPrimary: { flex: 1.3, borderRadius: 10, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  btnPrimaryText: { fontFamily: "DM_Sans_700Bold", fontSize: 15, color: "#fff" },
  btnSecondary: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  btnSecondaryText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },

  // Centered overlay / sheet (for small/medium popups, distinct from the bottom-sheet pair above)
  centeredOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "center", alignItems: "center" },
  centeredSheet: { width: "100%", borderRadius: 20, borderWidth: 1, padding: 24 },
  pickerSheet: { alignItems: "stretch" },
  pickerOption: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, marginTop: 12 },
  pickerOptionIcon: { fontSize: 20 },
  pickerOptionText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 15 },

  // Lightbox
  lightboxBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.96)", alignItems: "center", justifyContent: "center" },
  lightboxImg: { width: SCREEN_W, height: SCREEN_W * 1.1 },
  lightboxHint: { color: "rgba(255,255,255,0.7)", fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 16 },
  lightboxClose: { position: "absolute", top: 52, right: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  lightboxCloseText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  lightboxNav: { position: "absolute", bottom: 60, flexDirection: "row", alignItems: "center", gap: 24 },
  lightboxNavBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  lightboxNavText: { color: "#fff", fontSize: 22, fontWeight: "600" },
  lightboxCounter: { fontFamily: "DM_Sans_400Regular", fontSize: 14, color: "rgba(255,255,255,0.7)" },

  // Vue "Médias"
  mediaToggleBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 10 },
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
});
