import { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Image, Modal,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { File } from "expo-file-system";
import { supabase } from "@/lib/supabase";
import { blobToArrayBuffer } from "@/lib/blobToArrayBuffer";
import { getVisitorSession, rememberAuthorPin } from "@/lib/visitorSession";
import PinPad from "@/components/PinPad";
import VisitorProfileModal from "@/components/VisitorProfileModal";
import type { SupportMessage, SupportMessageReply } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Section "Mur de soutien" extraite de l'ancien EntraideSoutien.tsx — voir
// components/Entraide.tsx pour l'autre moitié (Besoins).

const PHOTO_BUCKET = "support-photos";
const SOUVENIRS_BUCKET = "souvenirs";

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
  const router = useRouter();
  const { focusMessageId } = useLocalSearchParams<{ focusMessageId?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const msgOffsets = useRef<Record<string, number>>({});
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const focusedRef = useRef(false);

  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(true);

  // Réponses aux messages, groupées par message_id.
  const [replies, setReplies] = useState<Record<string, SupportMessageReply[]>>({});
  const [replyTarget, setReplyTarget] = useState<SupportMessage | null>(null);
  const [replyDeleteTarget, setReplyDeleteTarget] = useState<SupportMessageReply | null>(null);
  const [messageDeleteTarget, setMessageDeleteTarget] = useState<SupportMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySaving, setReplySaving] = useState(false);

  const [msgText, setMsgText] = useState("");
  const [msgPrenom, setMsgPrenom] = useState("");
  const [msgNom, setMsgNom] = useState("");
  const [msgPin, setMsgPin] = useState("");
  const [msgPhotoUri, setMsgPhotoUri] = useState<string | null>(null);
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const [msgSaving, setMsgSaving] = useState(false);

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

  // Arrivée depuis "Mon compte" via un lien profond (?focusMessageId=...) :
  // on scrolle jusqu'à la carte du message et on la surligne brièvement.
  // focusedRef évite de re-déclencher le scroll à chaque rechargement
  // realtime de messages.
  useEffect(() => {
    if (!focusMessageId || focusedRef.current || msgsLoading) return;
    const target = messages.find((m) => m.id === focusMessageId);
    if (!target) return;
    focusedRef.current = true;
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

  async function pickMsgPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission refusée", "Autorise l'accès à la galerie dans les paramètres.");
      return;
    }
    setPickingPhoto(true);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    setPickingPhoto(false);
    if (!result.canceled && result.assets[0]) {
      setMsgPhotoUri(result.assets[0].uri);
    }
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

  async function pickEditPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission refusée", "Autorise l'accès à la galerie dans les paramètres.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (!result.canceled && result.assets[0]) {
      setEditPhoto({ uri: result.assets[0].uri, filename: null });
    }
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

  async function confirmDeleteMessage() {
    if (!messageDeleteTarget) return;
    const m = messageDeleteTarget;
    setMessageDeleteTarget(null);
    if (m.photo) await supabase.storage.from(PHOTO_BUCKET).remove([`${spaceId}/${m.photo}`]);
    await supabase.from("support_messages").delete().eq("id", m.id);
    loadMessages();
    showToast("Message supprimé");
  }

  // ── Réponses (ouvert à tous, y compris sur ses propres messages) ───────────
  function openReply(m: SupportMessage) {
    setReplyTarget(m);
    setReplyText("");
  }

  async function postReply() {
    if (!replyTarget || !replyText.trim() || !msgPrenom.trim() || !msgNom.trim()) return;
    if (!isAdmin && !sessionPin && msgPin.length < 4) return;
    setReplySaving(true);

    const pinToUse = isAdmin ? "ADMIN" : (sessionPin || msgPin);
    await supabase.from("support_message_replies").insert({
      message_id: replyTarget.id,
      space_id: spaceId,
      reply_text: replyText.trim(),
      author_prenom: msgPrenom.trim(),
      author_nom: msgNom.trim(),
      author_pin: pinToUse,
    });
    setReplySaving(false);
    if (!isAdmin) {
      await rememberAuthorPin(msgPrenom.trim(), msgNom.trim(), pinToUse);
      setSessionPin(pinToUse);
    }
    setReplyText(""); setMsgPin(""); setReplyTarget(null);
    showToast("Réponse envoyée 🙏");
    loadReplies();
  }

  async function confirmDeleteReply() {
    if (!replyDeleteTarget) return;
    const r = replyDeleteTarget;
    setReplyDeleteTarget(null);
    await supabase.from("support_message_replies").delete().eq("id", r.id);
    loadReplies();
    showToast("Réponse supprimée");
  }

  const pinReady = isAdmin || !!sessionPin || msgPin.length >= 4;

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <Text style={[styles.headerTitle, { color: "#fff" }]}>💛 Mur de soutien</Text>
      </View>

      <View style={[styles.subHeader, styles.subHeaderRow, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: C.gold }]}
          onPress={() => router.push((isAdmin ? "/(admin)/home/calendar" : "/(visitor)/home/calendar") as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.addBtnText}>← Accueil</Text>
        </TouchableOpacity>
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

      <ScrollView ref={scrollRef} contentContainerStyle={styles.listPad} keyboardShouldPersistTaps="handled">
        {msgsLoading ? (
          <ActivityIndicator color={C.accent} style={{ marginTop: 24 }} />
        ) : messages.length === 0 ? (
          <View style={[styles.centered, { marginTop: 32 }]}>
            <Text style={{ fontSize: 32, marginBottom: 10 }}>💛</Text>
            <Text style={[styles.emptyText, { color: C.muted }]}>Aucun message de soutien.</Text>
            <Text style={[styles.emptyHint, { color: C.muted }]}>Sois le premier à en laisser un !</Text>
          </View>
        ) : (
          messages.map((m) => {
            const highlighted = highlightId === m.id;
            // Propriété réelle du message : admin uniquement sur ses propres
            // messages ("ADMIN"), visiteur uniquement si le PIN ET le
            // prénom+nom de sa session correspondent à l'auteur. Le PIN seul
            // ne suffit pas : deux personnes différentes choisissant le même
            // code à 4 chiffres (ex. "1111") se retrouveraient sinon
            // considérées comme le même auteur.
            const isOwnMessage = isAdmin
              ? m.author_pin === "ADMIN"
              : (!!sessionPin && m.author_pin === sessionPin && m.author_prenom === msgPrenom && m.author_nom === msgNom);
            // Dès qu'une réponse existe, seul l'admin garde le droit de
            // supprimer le message (la suppression entraîne aussi celle de
            // toutes les réponses via on delete cascade en base) — un
            // visiteur ne doit pas pouvoir effacer une conversation à
            // laquelle d'autres ont participé.
            const canDeleteMessage = isAdmin || (isOwnMessage && !replies[m.id]?.length);
            return (
            <View
              key={m.id}
              onLayout={(e) => { msgOffsets.current[m.id] = e.nativeEvent.layout.y; }}
              style={[
                styles.msgCard,
                { backgroundColor: C.card, borderColor: highlighted ? C.gold : C.border },
                highlighted && { borderWidth: 2 },
              ]}
            >
              <View style={styles.msgCardHeader}>
                <View style={[styles.msgAvatar, { backgroundColor: `${C.gold}33` }]}>
                  <Text style={[styles.msgAvatarText, { color: C.gold }]}>
                    {m.author_prenom.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  {m.author_pin !== "ADMIN" ? (
                    <TouchableOpacity onPress={() => setProfileTarget({ prenom: m.author_prenom, nom: m.author_nom })} activeOpacity={0.7}>
                      <Text style={[styles.msgAuthor, { color: "#fff" }]}>{m.author_prenom} {m.author_nom}</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={[styles.msgAuthor, { color: "#fff" }]}>{m.author_prenom} {m.author_nom}</Text>
                  )}
                  <Text style={[styles.msgDate, { color: C.muted }]}>
                    {new Date(m.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </Text>
                </View>
                {(isOwnMessage || isAdmin) && (
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {isOwnMessage && (
                      <TouchableOpacity onPress={() => openEdit(m)} style={[styles.iconBtn, { borderColor: C.border }]}>
                        <Text style={{ fontSize: 13, color: C.muted }}>✏️</Text>
                      </TouchableOpacity>
                    )}
                    {canDeleteMessage && (
                      <TouchableOpacity onPress={() => setMessageDeleteTarget(m)} style={[styles.iconBtn, { borderColor: "rgba(233,69,96,0.3)" }]}>
                        <Text style={{ fontSize: 13, color: "#e94560" }}>🗑️</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
              <Text style={[styles.msgText, { color: C.text }]}>{m.message}</Text>
              {m.photo && (
                <>
                  <Image source={{ uri: supportPhotoUrl(spaceId, m.photo) }} style={styles.msgPhoto} resizeMode="cover" />
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

              {!!replies[m.id]?.length && (
                <View style={styles.repliesWrap}>
                  {replies[m.id].map((r) => {
                    const canDeleteReply = isAdmin || (!!sessionPin && r.author_pin === sessionPin);
                    return (
                      <View key={r.id} style={[styles.replyItem, { borderLeftColor: C.gold }]}>
                        <View style={{ flex: 1 }}>
                          {r.author_pin !== "ADMIN" ? (
                            <TouchableOpacity onPress={() => setProfileTarget({ prenom: r.author_prenom, nom: r.author_nom })} activeOpacity={0.7}>
                              <Text style={[styles.replyAuthor, { color: "#fff" }]}>{r.author_prenom} {r.author_nom}</Text>
                            </TouchableOpacity>
                          ) : (
                            <Text style={[styles.replyAuthor, { color: "#fff" }]}>{r.author_prenom} {r.author_nom}</Text>
                          )}
                          <Text style={[styles.replyText, { color: C.text }]}>{r.reply_text}</Text>
                        </View>
                        {canDeleteReply && (
                          <TouchableOpacity onPress={() => setReplyDeleteTarget(r)} style={styles.replyDeleteBtn}>
                            <Text style={{ fontSize: 12, color: C.muted }}>✕</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

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

      {!!toast && (
        <View style={[styles.toast, { backgroundColor: C.success }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      {/* ── MODAL AJOUT ───────────────────────────────────────────────────── */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => !msgSaving && setShowAddModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => !msgSaving && setShowAddModal(false)}>
            <ScrollView contentContainerStyle={styles.overlayScroll} keyboardShouldPersistTaps="handled">
              <TouchableOpacity activeOpacity={1}>
                <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.accent }]}>
                  <Text style={[styles.sheetTitle, { color: "#fff" }]}>💛 Laisser un message</Text>

                  <TextInput
                    style={[styles.input, styles.msgArea, { backgroundColor: C.bg, borderColor: C.border, color: C.text, marginTop: 12 }]}
                    placeholder="Un mot d'encouragement pour la famille et le patient…"
                    placeholderTextColor={C.muted}
                    value={msgText}
                    onChangeText={setMsgText}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    autoFocus
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

                  {msgPhotoUri ? (
                    <View style={styles.photoPreviewRow}>
                      <Image source={{ uri: msgPhotoUri }} style={styles.photoPreviewImg} resizeMode="cover" />
                      <TouchableOpacity style={[styles.photoPickRemove, { backgroundColor: "#e94560" }]} onPress={removeMsgPhoto}>
                        <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.photoPickAdd, { backgroundColor: C.bg, borderColor: C.border }]}
                      onPress={pickMsgPhoto}
                      disabled={pickingPhoto}
                    >
                      {pickingPhoto
                        ? <ActivityIndicator color={C.accent} size="small" />
                        : <Text style={[styles.photoPickAddText, { color: C.muted }]}>📷 Ajouter une photo (optionnel)</Text>
                      }
                    </TouchableOpacity>
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
            </ScrollView>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL ÉDITION ─────────────────────────────────────────────────── */}
      <Modal visible={!!editTarget} transparent animationType="slide" onRequestClose={() => !editSaving && setEditTarget(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => !editSaving && setEditTarget(null)}>
            <ScrollView contentContainerStyle={styles.overlayScroll} keyboardShouldPersistTaps="handled">
              <TouchableOpacity activeOpacity={1}>
                <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.accent }]}>
                  <Text style={[styles.sheetTitle, { color: "#fff" }]}>✏️ Modifier le message</Text>

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

                  {editPhoto ? (
                    <View style={styles.photoPreviewRow}>
                      <Image source={{ uri: editPhoto.uri }} style={styles.photoPreviewImg} resizeMode="cover" />
                      <TouchableOpacity style={[styles.photoPickRemove, { backgroundColor: "#e94560" }]} onPress={removeEditPhoto}>
                        <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={[styles.photoPickAdd, { backgroundColor: C.bg, borderColor: C.border }]} onPress={pickEditPhoto}>
                      <Text style={[styles.photoPickAddText, { color: C.muted }]}>📷 Ajouter une photo (optionnel)</Text>
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
            </ScrollView>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL RÉPONSE ─────────────────────────────────────────────────── */}
      <Modal visible={!!replyTarget} transparent animationType="slide" onRequestClose={() => !replySaving && setReplyTarget(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => !replySaving && setReplyTarget(null)}>
            <ScrollView contentContainerStyle={styles.overlayScroll} keyboardShouldPersistTaps="handled">
              <TouchableOpacity activeOpacity={1}>
                <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.accent }]}>
                  <Text style={[styles.sheetTitle, { color: "#fff" }]}>🙏 Répondre</Text>
                  {replyTarget && (
                    <Text style={[styles.sheetSub, { color: C.muted }]} numberOfLines={2}>
                      À {replyTarget.author_prenom} {replyTarget.author_nom} : « {replyTarget.message} »
                    </Text>
                  )}

                  <TextInput
                    style={[styles.input, styles.msgArea, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                    placeholder="Ta réponse…"
                    placeholderTextColor={C.muted}
                    value={replyText}
                    onChangeText={setReplyText}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    autoFocus
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

                  <View style={styles.sheetBtns}>
                    <TouchableOpacity
                      onPress={() => { setReplyTarget(null); setReplyText(""); setMsgPin(""); }}
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
            </ScrollView>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={!!replyDeleteTarget} transparent animationType="fade" onRequestClose={() => setReplyDeleteTarget(null)}>
        <TouchableOpacity style={styles.confirmOverlay} activeOpacity={1} onPress={() => setReplyDeleteTarget(null)}>
          <TouchableOpacity activeOpacity={1}>
            <View style={[styles.confirmSheet, { backgroundColor: C.card, borderColor: C.danger }]}>
              <Text style={styles.confirmIcon}>🗑️</Text>
              <Text style={[styles.confirmTitle, { color: "#fff" }]}>Supprimer cette réponse ?</Text>
              {replyDeleteTarget && (
                <Text style={[styles.confirmSub, { color: C.muted }]}>"{replyDeleteTarget.reply_text.slice(0, 60)}…"</Text>
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
              <Text style={[styles.confirmTitle, { color: "#fff" }]}>Supprimer ce message ?</Text>
              {messageDeleteTarget && (
                <Text style={[styles.confirmSub, { color: C.muted }]}>"{messageDeleteTarget.message.slice(0, 60)}…"</Text>
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

  msgArea: { height: 80, textAlignVertical: "top" },
  postBtn: { borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  postBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#0D1B2E" },
  msgCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  msgCardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
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
  replyDeleteBtn: { padding: 4 },
  replyBtn: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, marginTop: 10 },
  replyBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },

  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontFamily: "DM_Sans_400Regular", fontSize: 15, marginBottom: 10 },

  photoPreviewRow: { position: "relative", marginBottom: 10 },
  photoPreviewImg: { width: "100%", height: 140, borderRadius: 10 },
  photoPickRemove: { position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  photoPickAdd: { borderWidth: 1, borderStyle: "dashed", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginBottom: 10 },
  photoPickAddText: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },

  toast: { position: "absolute", bottom: 24, alignSelf: "center", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  toastText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, color: "#fff" },

  pinLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6, marginTop: 4 },
  pinHint: { fontFamily: "DM_Sans_400Regular", fontSize: 12, lineHeight: 18, marginBottom: 12 },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "flex-end" },
  overlayScroll: { flexGrow: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, padding: 24, paddingBottom: 40 },
  sheetTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 4 },
  sheetSub: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginBottom: 20 },
  sheetBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
  btnPrimary: { flex: 1.3, borderRadius: 10, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  btnPrimaryText: { fontFamily: "DM_Sans_700Bold", fontSize: 15, color: "#fff" },
  btnSecondary: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  btnSecondaryText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});
