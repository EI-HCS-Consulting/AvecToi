import { useCallback, useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Image, Alert, Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { File, Paths } from "expo-file-system";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useVisitorSpace } from "@/lib/VisitorContext";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { supabase } from "@/lib/supabase";
import { getVisitorSession, saveVisitorSession, clearVisitorSession } from "@/lib/visitorSession";
import { enterByDossierCode } from "@/lib/visitorEntry";
import { normalizePhone } from "@/lib/phone";
import PinPad from "@/components/PinPad";
import PatientProfileModal from "@/components/PatientProfileModal";
import IntervenantFicheModal from "@/components/IntervenantFicheModal";
import IntervenantsListModal from "@/components/IntervenantsListModal";
import SegmentedSwitch from "@/components/SegmentedSwitch";
import MyChecklist from "@/components/MyChecklist";
import type { Reservation, ReservationChangeHistoryEntry, SouvenirPhoto, NewsEntry, SupportMessage, Task } from "@/lib/types";

function souvenirUrl(spaceId: string, filename: string) {
  const { data } = supabase.storage.from("souvenirs").getPublicUrl(`${spaceId}/${filename}`);
  return data.publicUrl;
}

function visitorPhotoUrl(spaceId: string, filename: string) {
  const { data } = supabase.storage.from("visitor-photos").getPublicUrl(`${spaceId}/${filename}`);
  return data.publicUrl;
}

function supportPhotoUrl(spaceId: string, filename: string) {
  const { data } = supabase.storage.from("support-photos").getPublicUrl(`${spaceId}/${filename}`);
  return data.publicUrl;
}

// updatedAt bust le cache CDN/<Image> — voir IntervenantFicheModal.tsx pour
// le détail (nom de fichier fixe + upsert, sans ça un ré-upload continuerait
// d'afficher l'ancienne photo). Même bucket/convention de nom de fichier
// (`${intervenantProfileId}.jpg`) que la fiche intervenant : les deux lisent
// et écrivent la même image.
function intervenantPhotoUrl(filename: string, updatedAt?: string | null) {
  const { data } = supabase.storage.from("intervenant-photos").getPublicUrl(filename);
  return updatedAt ? `${data.publicUrl}?v=${new Date(updatedAt).getTime()}` : data.publicUrl;
}

// Même règle de slug que NewsFeed.tsx / SouvenirsGallery.tsx / Soutien.tsx.
function sanitize(str: string) {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

interface LinkedIntervenantSpace {
  id: string;
  space_id: string;
  prenom: string;
  nom: string;
  pin: string;
  patient_spaces: { patient_firstname: string; patient_lastname: string; invite_token: string } | null;
}

const CAT_ICONS: Record<Task["category"], string> = {
  repas: "🍽️", affaires: "🧳", courses: "🛒", transport: "🚗", administratif: "🗂️", autre: "📌",
};

type AccountSectionKey = "info" | "resv" | "souvenirs" | "news" | "soutien" | "besoins";
// Ordre d'affichage de la grille = ordre des clés ci-dessous (2 tuiles par
// ligne) : Infos/Réservations, Nouvelles/Souvenirs, Entraide/Soutien. Le PIN
// n'a plus sa propre tuile — regroupé dans "Mes informations".
const SECTION_META: Record<AccountSectionKey, { icon: string; label: string }> = {
  info: { icon: "📝", label: "Mes informations" },
  resv: { icon: "📅", label: "Mes réservations" },
  news: { icon: "📰", label: "Mes nouvelles" },
  souvenirs: { icon: "📷", label: "Mes souvenirs" },
  besoins: { icon: "🤝", label: "Entraide" },
  soutien: { icon: "💛", label: "Soutien" },
};

// Onglet "Compte" côté visiteur — juste ses propres infos (pas de bouton
// Paramètres, contrairement à la version admin). Prénom/Nom/Email/PIN ne
// servent qu'à pré-remplir les futurs formulaires de réservation ; le PIN
// reste toujours ressaisi à la main pour confirmer une action sensible.
export default function VisitorAccountScreen() {
  const { space, token, setSelectedDay } = useVisitorSpace();
  const router = useRouter();
  const { mode, theme: C, setMode } = useDisplayMode();

  const [loading, setLoading] = useState(true);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [pinRevealed, setPinRevealed] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [motto, setMotto] = useState("");
  // Téléphone — intervenant uniquement (colonne intervenant_profiles.telephone,
  // voir migration 20260719_intervenant_profiles_contact.sql). Ma phrase totem
  // (state `motto` ci-dessus, réutilisé pour les deux rôles) pointe vers
  // intervenant_profiles.phrase_totem plutôt que visitor_profiles.motto quand
  // role === "intervenant" — voir syncIntervenantContact plus bas.
  const [telephone, setTelephone] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [patientProfileVisible, setPatientProfileVisible] = useState(false);
  const [intervenantsListVisible, setIntervenantsListVisible] = useState(false);
  const [role, setRole] = useState<"visiteur" | "intervenant">("visiteur");
  const [intervenantProfileId, setIntervenantProfileId] = useState<string | null>(null);
  const [ficheModalVisible, setFicheModalVisible] = useState(false);

  // "Mes Patients" — autres espaces patients déjà rejoints par ce même
  // téléphone (basculement direct, sans ressaisir le code dossier — voir
  // handleSwitchLinkedSpace). Chargé uniquement pour un intervenant dont le
  // téléphone est connu ; n'affecte jamais les visiteurs ni les autres
  // espaces (requête filtrée par le téléphone de CET appareil, pas un
  // listing ouvert).
  const [linkedSpaces, setLinkedSpaces] = useState<LinkedIntervenantSpace[]>([]);
  const [switchingSpaceId, setSwitchingSpaceId] = useState<string | null>(null);

  // "Rejoindre un nouveau patient" — pivot vers un espace jamais rejoint,
  // via le code dossier (voir components/ShareSpace.tsx côté admin). Recrée
  // la fiche intervenant à l'identique (photo, téléphone, phrase totem,
  // types d'intervention) à partir du profil courant, sans repasser par le
  // formulaire de création bloquant — voir handleJoinNewSpace.
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  // Changement de PIN — 3 phases dans une même modale, réutilisant le même
  // PinPad : (1) vérifier l'ancien PIN, (2) saisir le nouveau, (3) le
  // confirmer. Le PIN d'un item déjà créé (réservation, nouvelle…) n'est
  // jamais retouché ici : seul celui stocké dans la session change.
  // "Se déconnecter" et "Suivre un autre espace" partagent la même modale
  // stylée (cf. handleLogout/handleSwitchSpace plus bas) plutôt qu'une Alert
  // native pour l'une et une modale custom pour l'autre.
  const [confirmModal, setConfirmModal] = useState<"logout" | "switchSpace" | null>(null);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinPhase, setPinPhase] = useState<"verify" | "new" | "confirm">("verify");
  const [pinInput, setPinInput] = useState("");
  const [newPinDraft, setNewPinDraft] = useState("");
  const [pinModalError, setPinModalError] = useState(false);

  // Vue centralisée "Mes contributions" — tout ce que le visiteur a saisi
  // dans l'App, regroupé ici pour qu'il n'ait pas besoin de naviguer
  // ailleurs pour le retrouver. Le rapprochement se fait par prénom+nom
  // (pas d'identifiant de compte dans cette App), donc figé au moment du
  // chargement de la page plutôt que recalculé à chaque frappe.
  const [activityLoading, setActivityLoading] = useState(false);
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);
  // Accompagnants liés à mes réservations (même group_id), indexés par
  // group_id — chacun est une réservation à part entière (cf. BookingFlow.tsx)
  // mais n'apparaît pas dans myReservations lui-même car il porte un autre
  // prénom/nom que le mien.
  const [companionsByGroup, setCompanionsByGroup] = useState<Record<string, Reservation[]>>({});
  // Historique permanent des recasages/annulations automatiques (voir
  // reservation_change_history) — contrairement aux champs alert_* sur
  // reservations, ne s'efface jamais quand la réservation est modifiée :
  // reste affiché sous chaque réservation concernée dans "Mes réservations".
  const [myChangeHistory, setMyChangeHistory] = useState<ReservationChangeHistoryEntry[]>([]);
  const [mySouvenirs, setMySouvenirs] = useState<(SouvenirPhoto & { url: string })[]>([]);
  const [myNews, setMyNews] = useState<NewsEntry[]>([]);
  const [myMessages, setMyMessages] = useState<SupportMessage[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [myPublishedTasks, setMyPublishedTasks] = useState<Task[]>([]);

  // Lightbox plein écran pour "Mes souvenirs" — index dans mySouvenirs, ou
  // null si fermé.
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Section active de la grille de tuiles (null = grille affichée)
  const [activeSection, setActiveSection] = useState<AccountSectionKey | null>(null);

  // Revenir à la grille de tuiles à chaque fois que l'onglet Compte reprend
  // le focus, plutôt que de rester sur la dernière tuile ouverte.
  useFocusEffect(
    useCallback(() => {
      setActiveSection(null);
    }, []),
  );
  const identityMissing = !prenom.trim() || !nom.trim();

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  }

  const loadActivity = useCallback(async (spaceId: string, p: string, n: string) => {
    if (!p.trim() || !n.trim()) return;
    setActivityLoading(true);
    const [resv, resvBookedFor, souv, news, msgs, tasks, published, changeHistory] = await Promise.all([
      supabase.from("reservations").select("*").eq("space_id", spaceId)
        .ilike("prenom", p.trim()).ilike("nom", n.trim()).order("date", { ascending: false }),
      // Réservations faites pour quelqu'un d'autre (ex. un proche âgé) — le
      // prénom/nom de la réservation est celui du proche, pas le mien, donc
      // absentes de la requête ci-dessus ; on les retrouve via booked_by_*
      // (rempli uniquement quand on réserve sous un autre nom, cf. BookingFlow.tsx).
      supabase.from("reservations").select("*").eq("space_id", spaceId)
        .ilike("booked_by_prenom", p.trim()).ilike("booked_by_nom", n.trim()).order("date", { ascending: false }),
      supabase.from("souvenirs").select("*").eq("space_id", spaceId)
        .ilike("uploaded_by_prenom", p.trim()).ilike("uploaded_by_nom", n.trim()).order("created_at", { ascending: false }),
      supabase.from("news_entries").select("*").eq("space_id", spaceId)
        .ilike("author_prenom", p.trim()).ilike("author_nom", n.trim()).order("created_at", { ascending: false }),
      supabase.from("support_messages").select("*").eq("space_id", spaceId)
        .ilike("author_prenom", p.trim()).ilike("author_nom", n.trim()).order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").eq("space_id", spaceId)
        .ilike("claimed_by_prenom", p.trim()).ilike("claimed_by_nom", n.trim()).order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").eq("space_id", spaceId)
        .ilike("author_prenom", p.trim()).ilike("author_nom", n.trim()).order("created_at", { ascending: false }),
      supabase.from("reservation_change_history").select("*").eq("space_id", spaceId)
        .ilike("prenom", p.trim()).ilike("nom", n.trim()).order("changed_at", { ascending: false }),
    ]);
    const bookedForIds = new Set((resv.data || []).map((r: Reservation) => r.id));
    const myResv: Reservation[] = [
      ...(resv.data || []),
      ...((resvBookedFor.data || []).filter((r: Reservation) => !bookedForIds.has(r.id))),
    ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    setMyReservations(myResv);
    setMySouvenirs((souv.data || []).map((s: SouvenirPhoto) => ({ ...s, url: souvenirUrl(spaceId, s.filename) })));
    setMyNews(news.data || []);
    setMyMessages(msgs.data || []);
    setMyTasks(tasks.data || []);
    setMyPublishedTasks(published.data || []);
    setMyChangeHistory(changeHistory.data || []);

    // Accompagnants : réservations liées par group_id, mais avec un prénom/nom
    // différent du mien (donc absentes de myResv) — on les recharge à part.
    const groupIds = [...new Set(myResv.map((r) => r.group_id).filter((id): id is string => !!id))];
    if (groupIds.length > 0) {
      const { data: groupRows } = await supabase.from("reservations").select("*")
        .in("group_id", groupIds);
      const byGroup: Record<string, Reservation[]> = {};
      for (const r of groupRows || []) {
        if (!r.group_id) continue;
        (byGroup[r.group_id] ??= []).push(r);
      }
      setCompanionsByGroup(byGroup);
    } else {
      setCompanionsByGroup({});
    }

    setActivityLoading(false);
  }, []);

  useEffect(() => {
    getVisitorSession().then(async (s) => {
      if (s) {
        setPrenom(s.prenom);
        setNom(s.nom);
        setEmail(s.email);
        setPin(s.pin);
        setPhotoUri(s.localPhotoUri);
        setMotto(s.motto);
        setTelephone(s.telephone);
        setRole(s.role ?? "visiteur");
        setIntervenantProfileId(s.intervenantProfileId ?? null);
        if (space) {
          loadActivity(space.id, s.prenom, s.nom);
          if (s.role === "intervenant" && s.intervenantProfileId) {
            // Photo/téléphone/phrase totem de secours — même principe que le
            // fallback visiteur ci-dessous, mais la source de vérité est
            // intervenant_profiles (partagée avec la fiche intervenant, voir
            // components/IntervenantFicheModal.tsx) plutôt que visitor_profiles.
            if (!s.localPhotoUri || !s.motto || !s.telephone) {
              const { data } = await supabase
                .from("intervenant_profiles")
                .select("photo, photo_updated_at, telephone, phrase_totem")
                .eq("id", s.intervenantProfileId)
                .maybeSingle();
              if (!s.localPhotoUri && data?.photo) setPhotoUri(intervenantPhotoUrl(data.photo, data.photo_updated_at));
              if (!s.motto && data?.phrase_totem) setMotto(data.phrase_totem);
              if (!s.telephone && data?.telephone) setTelephone(data.telephone);
            }
          } else if (!s.localPhotoUri || !s.motto) {
            // Photo/motto de secours : si cet appareil/session n'a plus de copie
            // locale (réinstallation, cache vidé, nouvel appareil) mais qu'une
            // photo/phrase a déjà été synchronisée (visible côté admin dans ce
            // cas, voir components/VisitorsBlock.tsx), on l'affiche quand même
            // au lieu de proposer d'en ajouter une comme si elle n'existait pas.
            const { data } = await supabase
              .from("visitor_profiles")
              .select("photo, motto")
              .eq("space_id", space.id)
              .ilike("prenom", s.prenom)
              .ilike("nom", s.nom)
              .maybeSingle();
            if (!s.localPhotoUri && data?.photo) setPhotoUri(visitorPhotoUrl(space.id, data.photo));
            if (!s.motto && data?.motto) setMotto(data.motto);
          }
        }
      }
      setLoading(false);
    });
  }, [space, loadActivity]);

  useEffect(() => {
    const normalized = normalizePhone(telephone);
    if (role !== "intervenant" || normalized.length < 6) {
      setLinkedSpaces([]);
      return;
    }
    supabase
      .from("intervenant_profiles")
      .select("id, space_id, prenom, nom, pin, patient_spaces(patient_firstname, patient_lastname, invite_token)")
      .eq("telephone", normalized)
      .then(({ data }) => setLinkedSpaces((data as any) ?? []));
  }, [role, telephone]);

  async function handleSwitchLinkedSpace(row: LinkedIntervenantSpace) {
    if (!row.patient_spaces || switchingSpaceId) return;
    setSwitchingSpaceId(row.id);
    await saveVisitorSession({
      token: row.patient_spaces.invite_token,
      spaceId: row.space_id,
      prenom: row.prenom,
      nom: row.nom,
      pin: row.pin,
      role: "intervenant",
      intervenantProfileId: row.id,
      telephone,
      motto: "",
      localPhotoUri: null,
    });
    router.replace({
      pathname: "/(visitor)/home/calendar",
      params: { spaceId: row.space_id, token: row.patient_spaces.invite_token },
    } as any);
  }

  // Copie la photo et les types d'intervention du profil courant vers la
  // fiche fraîchement créée sur le nouvel espace — best-effort, ne bloque
  // jamais le pivot (le prénom/nom/téléphone/phrase totem sont déjà passés
  // à l'insert dans handleJoinNewSpace, seuls la photo — copie storage
  // directe, pas de re-upload — et les types d'intervention nécessitent une
  // 2e étape une fois le nouvel id connu).
  async function copyProfileExtras(targetProfileId: string) {
    if (!intervenantProfileId) return;
    try {
      const [{ data: sourceProfile }, { data: sourceTypes }] = await Promise.all([
        supabase.from("intervenant_profiles").select("photo").eq("id", intervenantProfileId).maybeSingle(),
        supabase.from("intervention_types").select("label, duration_minutes").eq("intervenant_profile_id", intervenantProfileId),
      ]);
      if (sourceProfile?.photo) {
        const { error: copyErr } = await supabase.storage
          .from("intervenant-photos")
          .copy(sourceProfile.photo, `${targetProfileId}.jpg`);
        if (!copyErr) {
          await supabase.from("intervenant_profiles")
            .update({ photo: `${targetProfileId}.jpg`, photo_updated_at: new Date().toISOString() })
            .eq("id", targetProfileId);
        } else {
          console.error("[copyProfileExtras] storage copy failed:", copyErr);
        }
      }
      if (sourceTypes && sourceTypes.length > 0) {
        const { error: typesErr } = await supabase.from("intervention_types").insert(
          sourceTypes.map((t) => ({
            intervenant_profile_id: targetProfileId,
            label: t.label,
            duration_minutes: t.duration_minutes,
          })),
        );
        if (typesErr) console.error("[copyProfileExtras] intervention_types copy failed:", typesErr);
      }
    } catch (e) {
      console.error("[copyProfileExtras] unexpected error:", e);
    }
  }

  // Rejoindre un nouvel espace via son code dossier (voir
  // components/ShareSpace.tsx côté admin, colonne patient_spaces.dossier_code).
  // Si une fiche existe déjà sur cet espace pour ce téléphone (créée par
  // l'admin, ou lors d'un précédent pivot), on la réutilise. Sinon on la
  // recrée à l'identique à partir du profil courant (prénom/nom/téléphone/
  // phrase totem à l'insert, photo/types via copyProfileExtras) — jamais de
  // formulaire à reremplir, même à la toute première connexion sur cet
  // espace.
  async function handleJoinNewSpace() {
    const code = joinCode.trim();
    if (!code || joining) return;
    setJoining(true);
    setJoinError("");
    try {
      const result = await enterByDossierCode(code);
      if (!result.ok) {
        setJoinError(
          result.reason === "inactive"
            ? "Cet espace n'est plus actif."
            : "Code dossier introuvable — vérifie-le auprès de l'organisateur.",
        );
        return;
      }
      if (!result.intervenantsEnabled) {
        setJoinError("Ce patient n'a pas activé l'accès intervenant.");
        return;
      }
      if (space && result.spaceId === space.id) {
        setJoinError("Tu es déjà sur cet espace.");
        return;
      }

      const normalizedTelephone = normalizePhone(telephone);
      const { data: existingRow } = await supabase
        .from("intervenant_profiles")
        .select("id, pin")
        .eq("space_id", result.spaceId)
        .eq("telephone", normalizedTelephone)
        .maybeSingle();

      let targetProfileId = existingRow?.id ?? null;
      let targetPin = existingRow?.pin ?? pin;

      if (!targetProfileId) {
        const { data: inserted, error: insertErr } = await supabase
          .from("intervenant_profiles")
          .insert({
            space_id: result.spaceId,
            prenom: prenom.trim(),
            nom: nom.trim(),
            pin,
            telephone: normalizedTelephone || null,
            phrase_totem: motto.trim() || null,
          })
          .select("id")
          .single();

        if (insertErr?.code === "23505") {
          // Une fiche existe déjà pour ce prénom/nom sur cet espace (créée
          // par l'admin sans le même téléphone) — même logique de
          // rattachement que IntervenantFicheModal.handleSave.
          const { data: conflictRow } = await supabase
            .from("intervenant_profiles")
            .select("id, pin")
            .eq("space_id", result.spaceId)
            .ilike("prenom", prenom.trim())
            .ilike("nom", nom.trim())
            .maybeSingle();
          if (!conflictRow || conflictRow.pin !== pin) {
            setJoinError("Une fiche existe déjà pour ce prénom et ce nom sur cet espace, avec un code différent. Contacte l'organisateur.");
            return;
          }
          targetProfileId = conflictRow.id;
          targetPin = conflictRow.pin;
        } else if (insertErr || !inserted) {
          throw insertErr ?? new Error("Impossible de rejoindre cet espace.");
        } else {
          targetProfileId = inserted.id;
          targetPin = pin;
          await copyProfileExtras(targetProfileId);
        }
      }

      await saveVisitorSession({
        token: result.token,
        spaceId: result.spaceId,
        prenom, nom, pin: targetPin,
        role: "intervenant",
        intervenantProfileId: targetProfileId,
        telephone,
        motto,
        localPhotoUri: null,
      });
      setJoinModalVisible(false);
      setJoinCode("");
      router.replace({
        pathname: "/(visitor)/home/calendar",
        params: { spaceId: result.spaceId, token: result.token },
      } as any);
    } catch (e: any) {
      setJoinError(e?.message ?? "Impossible de rejoindre cet espace.");
    } finally {
      setJoining(false);
    }
  }

  async function handlePickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission refusée", "Autorise l'accès à la galerie dans les paramètres.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;

    // Le fichier renvoyé par le picker vit dans le cache de l'app — pas
    // garanti de survivre à un redémarrage (l'OS peut le purger). On le
    // copie dans le dossier document (persistant) avant de l'enregistrer,
    // et on sauvegarde tout de suite : sinon la photo ne survit que si le
    // visiteur pense ensuite à cliquer sur "Enregistrer".
    // Nom de fichier horodaté (et non fixe) : <Image> met en cache par URI,
    // un nom constant faisait qu'un second choix de photo dans la même
    // session ne se réaffichait pas (l'app montrait encore l'aperçu précédent).
    let persistedUri = result.assets[0].uri;
    try {
      const dest = new File(Paths.document, `visitor_profile_photo_${Date.now()}.jpg`);
      new File(result.assets[0].uri).copy(dest);
      persistedUri = dest.uri;
    } catch {
      // Copie échouée : on garde l'URI d'origine (aperçu immédiat quand
      // même fonctionnel, juste pas garanti après redémarrage).
    }

    setPhotoUri(persistedUri);
    if (!space) return;
    if (role === "intervenant" && intervenantProfileId) {
      await saveVisitorSession({ token, spaceId: space.id, localPhotoUri: persistedUri });
      showToast("Photo enregistrée ✓");
      syncIntervenantPhoto(intervenantProfileId, persistedUri);
      return;
    }
    await saveVisitorSession({
      token,
      spaceId: space.id,
      prenom: prenom.trim(),
      nom: nom.trim(),
      email: email.trim(),
      localPhotoUri: persistedUri,
    });
    showToast("Photo enregistrée ✓");
    syncProfilePhoto(space.id, prenom.trim(), nom.trim(), persistedUri);
  }

  // Synchronise la photo vers intervenant_profiles — même bucket/convention
  // de nom de fichier (`${profileId}.jpg`) que components/IntervenantFicheModal.tsx,
  // pour que les deux écrans affichent toujours la même image. Best-effort,
  // comme syncProfilePhoto ci-dessous.
  async function syncIntervenantPhoto(profileId: string, localUri: string) {
    try {
      const compressed = await ImageManipulator.manipulateAsync(
        localUri,
        [{ resize: { width: 300 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );
      const fileData = await new File(compressed.uri).arrayBuffer();
      const filename = `${profileId}.jpg`;
      const { error: storageErr } = await supabase.storage
        .from("intervenant-photos")
        .upload(filename, fileData, { contentType: "image/jpeg", cacheControl: "3600", upsert: true });
      if (storageErr) {
        console.error("[syncIntervenantPhoto] storage upload failed:", storageErr);
        return;
      }
      const { error: updErr } = await supabase
        .from("intervenant_profiles")
        .update({ photo: filename, photo_updated_at: new Date().toISOString() })
        .eq("id", profileId);
      if (updErr) console.error("[syncIntervenantPhoto] update failed:", updErr);
    } catch (e) {
      console.error("[syncIntervenantPhoto] unexpected error:", e);
    }
  }

  // Synchronise téléphone + phrase totem vers intervenant_profiles — même
  // principe que syncProfileMotto ci-dessous, mais pour la fiche intervenant
  // (partagée avec components/IntervenantFicheModal.tsx) plutôt que
  // visitor_profiles.
  async function syncIntervenantContact(profileId: string, telephoneValue: string, mottoValue: string) {
    try {
      const { error } = await supabase
        .from("intervenant_profiles")
        .update({ telephone: telephoneValue.trim() || null, phrase_totem: mottoValue.trim() || null })
        .eq("id", profileId);
      if (error) console.error("[syncIntervenantContact] update failed:", error);
    } catch (e) {
      console.error("[syncIntervenantContact] unexpected error:", e);
    }
  }

  // Synchronise la photo de "Mon compte" vers Supabase — jusqu'ici elle
  // restait locale à l'appareil (localPhotoUri), invisible pour les autres
  // visiteurs. Rend cette photo visible dans la fiche visiteur (voir
  // components/VisitorProfileModal.tsx) quand un autre visiteur clique sur
  // le nom de celui-ci dans Nouvelles/Souvenirs/Soutien. Best-effort : un
  // échec ne doit pas bloquer l'enregistrement local, qui a déjà réussi.
  async function syncProfilePhoto(spaceId: string, p: string, n: string, localUri: string) {
    if (!p || !n) return;
    try {
      const compressed = await ImageManipulator.manipulateAsync(
        localUri,
        [{ resize: { width: 300 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );
      const fileData = await new File(compressed.uri).arrayBuffer();
      const filename = `${sanitize(p)}_${sanitize(n)}.jpg`;
      const { error: storageErr } = await supabase.storage
        .from("visitor-photos")
        .upload(`${spaceId}/${filename}`, fileData, { contentType: "image/jpeg", cacheControl: "3600", upsert: true });
      if (storageErr) {
        console.error("[syncProfilePhoto] storage upload failed:", storageErr);
        return;
      }
      const { error: upsertErr } = await supabase.from("visitor_profiles").upsert(
        { space_id: spaceId, prenom: p, nom: n, photo: filename, updated_at: new Date().toISOString() },
        { onConflict: "space_id,prenom,nom" },
      );
      if (upsertErr) console.error("[syncProfilePhoto] upsert failed:", upsertErr);
    } catch (e) {
      console.error("[syncProfilePhoto] unexpected error:", e);
    }
  }

  // Synchronise la phrase totem vers Supabase, sur le même principe que
  // syncProfilePhoto — best-effort, rend le totem visible dans le bloc
  // "Visiteurs" des Paramètres admin (components/VisitorsBlock.tsx). Un
  // upsert distinct (colonnes différentes) ne clobber pas la photo déjà
  // enregistrée par ailleurs : PostgREST ne met à jour que les colonnes
  // fournies dans le payload.
  async function syncProfileMotto(spaceId: string, p: string, n: string, mottoValue: string) {
    if (!p || !n) return;
    try {
      const { error } = await supabase.from("visitor_profiles").upsert(
        { space_id: spaceId, prenom: p, nom: n, motto: mottoValue.trim() || null, updated_at: new Date().toISOString() },
        { onConflict: "space_id,prenom,nom" },
      );
      if (error) console.error("[syncProfileMotto] upsert failed:", error);
    } catch (e) {
      console.error("[syncProfileMotto] unexpected error:", e);
    }
  }

  async function handleSave() {
    if (!space) return;
    setSaving(true);
    await saveVisitorSession({
      token,
      spaceId: space.id,
      prenom: prenom.trim(),
      nom: nom.trim(),
      email: email.trim(),
      localPhotoUri: photoUri,
      motto,
      telephone,
    });
    setSaving(false);
    showToast("Enregistré ✓");
    if (role === "intervenant" && intervenantProfileId) {
      syncIntervenantContact(intervenantProfileId, telephone, motto);
    } else {
      if (photoUri) syncProfilePhoto(space.id, prenom.trim(), nom.trim(), photoUri);
      if (prenom.trim() && nom.trim()) syncProfileMotto(space.id, prenom.trim(), nom.trim(), motto);
    }
    loadActivity(space.id, prenom, nom);
  }

  function openChangePinModal() {
    setPinPhase("verify");
    setPinInput("");
    setNewPinDraft("");
    setPinModalError(false);
    setPinModalVisible(true);
  }

  function closeChangePinModal() {
    setPinModalVisible(false);
    setPinPhase("verify");
    setPinInput("");
    setNewPinDraft("");
    setPinModalError(false);
  }

  async function handlePinInputChange(value: string) {
    setPinModalError(false);
    setPinInput(value);
    if (value.length < 4) return;

    if (pinPhase === "verify") {
      if (value === pin) {
        setPinPhase("new");
        setPinInput("");
      } else {
        setPinModalError(true);
        setPinInput("");
      }
      return;
    }

    if (pinPhase === "new") {
      setNewPinDraft(value);
      setPinInput("");
      setPinPhase("confirm");
      return;
    }

    // pinPhase === "confirm"
    if (value === newPinDraft) {
      if (!space) return;
      setPin(value);
      await saveVisitorSession({ token, spaceId: space.id, pin: value });
      closeChangePinModal();
      showToast("PIN modifié ✓");
    } else {
      setPinModalError(true);
      setPinInput("");
      setNewPinDraft("");
      setPinPhase("new");
    }
  }

  // Ouvre le créneau concerné sur l'écran Créneaux (Visite) ou Nuitées
  // (Nuit) — simple navigation, jamais de modale PIN automatique : la
  // modification/annulation reste une action volontaire (bouton "Modifier"),
  // à faire depuis le créneau lui-même.
  function handleOpenReservation(r: Reservation) {
    if (r.type === "Nuit") {
      router.push("/(visitor)/home/nights" as any);
    } else {
      setSelectedDay(new Date(r.date + "T12:00:00"));
      router.push("/(visitor)/home/slots" as any);
    }
  }

  // Se déconnecter et "Suivre un autre espace" font la même chose côté
  // stockage (clearVisitorSession + retour à l'entrée du lien d'invitation)
  // — un visiteur n'a pas de compte serveur, juste une identité liée à cet
  // appareil. Bouton distinct demandé pour un intitulé clair en bas de page.
  function handleLogout() {
    setConfirmModal("logout");
  }

  function handleSwitchSpace() {
    setConfirmModal("switchSpace");
  }

  async function confirmModalAction() {
    setConfirmModal(null);
    await clearVisitorSession();
    router.replace("/");
  }

  if (loading || !space) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  const missingIdentityCard = (
    <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
      <Text style={[styles.cardDesc, { color: C.muted, marginBottom: 0 }]}>
        Renseigne ton prénom et ton nom dans "Mes informations" pour retrouver ici tout ce que tu as saisi dans l'App.
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <Text style={[styles.headerTitle, { color: C.text }]}>👤 Mon compte</Text>
      </View>

      <View style={[styles.subHeader, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <TouchableOpacity
          style={[styles.backToGrid, { backgroundColor: C.gold, marginBottom: 0 }]}
          onPress={() => router.push("/(visitor)/home/calendar" as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.backToGridText}>← Accueil</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={handlePickPhoto} style={styles.photoWrap} activeOpacity={0.8}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : (
            <View style={[styles.photoPlaceholder, { backgroundColor: C.bg, borderColor: C.border }]}>
              <Text style={{ fontSize: 28 }}>📷</Text>
            </View>
          )}
          <Text style={[styles.photoHint, { color: C.muted }]}>
            {photoUri ? "Changer ma photo" : "Ajouter ma photo (optionnel)"}
          </Text>
        </TouchableOpacity>

        {(prenom.trim() || nom.trim()) && (
          <Text style={[styles.identityName, { color: C.text }, !!motto.trim() && { marginBottom: 2 }]}>
            {[prenom.trim(), nom.trim()].filter(Boolean).join(" ")}
          </Text>
        )}
        {!!motto.trim() && (
          <Text style={styles.identityMotto} numberOfLines={2}>{motto.trim()}</Text>
        )}

        <Text style={[styles.sectionTitle, { color: C.gold, marginTop: 0 }]}>Mon affichage</Text>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.displayModeLabel, { color: C.text }]}>
            Mode {mode === "light" ? "Clair" : "Sombre"}
          </Text>
          <SegmentedSwitch
            value={mode === "light"}
            onChange={(v) => setMode(v ? "light" : "dark")}
            leftLabel="Dark"
            rightLabel="Light"
            C={C}
            minWidthRatio={0.55}
          />
        </View>

        {(Object.keys(SECTION_META) as AccountSectionKey[])
          .filter((k) => !(role === "intervenant" && (k === "souvenirs" || k === "besoins" || k === "resv")))
          .map((key) => {
          const isOpen = activeSection === key;
          const hint = key === "info" ? (prenom.trim() && nom.trim() ? `${prenom} ${nom}` : "À compléter")
            : key === "resv" ? `${myReservations.length} réservation(s)`
            : key === "souvenirs" ? `${mySouvenirs.length} photo(s)`
            : key === "news" ? `${myNews.length} nouvelle(s)`
            : key === "soutien" ? `${myMessages.length} message(s)`
            : `${myTasks.length + myPublishedTasks.length} besoin(s)`;
          return (
            <View key={key}>
              <TouchableOpacity
                style={[styles.contribHeader, { borderBottomColor: C.border }]}
                onPress={() => setActiveSection(isOpen ? null : key)}
                activeOpacity={0.75}
              >
                <Text style={[styles.contribHeaderText, { color: C.text }]}>
                  {SECTION_META[key].icon} {SECTION_META[key].label}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={[styles.tileHint, { color: C.accent }]} numberOfLines={1}>{hint}</Text>
                  <Text style={[styles.tileChevron, { color: C.muted }]}>{isOpen ? "▲" : "▼"}</Text>
                </View>
              </TouchableOpacity>

              {isOpen && key === "info" && (
                <>
                  <View style={[styles.card, styles.contribCard, { backgroundColor: C.card, borderColor: C.border }]}>
                    <TextInput
                      style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                      placeholder="Prénom"
                      placeholderTextColor={C.muted}
                      value={prenom}
                      onChangeText={setPrenom}
                      autoCapitalize="words"
                    />
                    <TextInput
                      style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                      placeholder="Nom"
                      placeholderTextColor={C.muted}
                      value={nom}
                      onChangeText={setNom}
                      autoCapitalize="words"
                    />
                    <TextInput
                      style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                      placeholder="Adresse email"
                      placeholderTextColor={C.muted}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {role === "intervenant" && (
                      <TextInput
                        style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                        placeholder="Téléphone (optionnel)"
                        placeholderTextColor={C.muted}
                        value={telephone}
                        onChangeText={setTelephone}
                        keyboardType="phone-pad"
                      />
                    )}
                  </View>

                  <Text style={[styles.sectionTitle, { color: C.gold, marginTop: 8 }]}>💬 Ma phrase totem (optionnel)</Text>
                  <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
                    <TextInput
                      style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                      placeholder="Ex : Aimer c'est Agir !"
                      placeholderTextColor={C.muted}
                      value={motto}
                      onChangeText={setMotto}
                    />
                    <Text style={[styles.cardDesc, { color: C.muted, marginBottom: 0 }]}>
                      {role === "intervenant"
                        ? "Une phrase qui te définit — affichée sur ta fiche intervenant, vue par les visiteurs et les autres intervenants."
                        : "Une phrase qui te définit — affichée à côté de ton nom dans le bloc Visiteurs des Paramètres."}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: C.accent }, saving && { opacity: 0.6 }]}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    {saving
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.saveBtnText}>Enregistrer</Text>
                    }
                  </TouchableOpacity>

                  <View style={styles.sectionTitleRow}>
                    <Text style={[styles.sectionTitle, { color: C.gold, marginBottom: 0 }]}>Mon code PIN</Text>
                    <TouchableOpacity onPress={() => setPinRevealed((v) => !v)} style={styles.revealBtn}>
                      <Text style={[styles.revealBtnText, { color: C.accent }]}>
                        {pinRevealed ? "🙈 Masquer" : "👁 Afficher"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
                    <Text style={[styles.cardDesc, { color: C.muted }]}>
                      Pour t'en souvenir — il te sera toujours redemandé pour valider une réservation,
                      la modifier, l'annuler ou supprimer une photo.
                    </Text>
                    <PinPad value={pin} onChange={() => {}} theme={C} reveal={pinRevealed} readOnly />
                    <TouchableOpacity style={[styles.changePinBtn, { borderColor: C.accent }]} onPress={openChangePinModal}>
                      <Text style={[styles.changePinBtnText, { color: C.accent }]}>Changer mon PIN</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {isOpen && key === "resv" && (
                activityLoading ? (
                  <ActivityIndicator color={C.accent} style={{ marginVertical: 16 }} />
                ) : identityMissing ? missingIdentityCard : (
                  <View style={[styles.card, styles.contribCard, { backgroundColor: C.card, borderColor: C.border }]}>
                    {myReservations.length === 0 ? (
                      <Text style={[styles.activityEmpty, { color: C.muted }]}>Aucune réservation pour le moment.</Text>
                    ) : myReservations.map((r) => {
                      const companionNames = (r.group_id ? companionsByGroup[r.group_id] : undefined)
                        ?.filter((c) => c.id !== r.id)
                        .map((c) => `${c.prenom} ${c.nom}`) ?? [];
                      const history = myChangeHistory.filter((h) => h.reservation_id === r.id);
                      return (
                        <TouchableOpacity
                          key={r.id}
                          style={styles.activityRow}
                          onPress={() => handleOpenReservation(r)}
                          activeOpacity={0.7}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.activityRowText, { color: C.text }]}>
                              {r.type === "Nuit" ? "🌙" : "☀️"} {new Date(r.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} · {r.creneau}
                            </Text>
                            {r.booked_by_prenom && (
                              <Text style={[styles.activityRowSub, { color: C.muted }]}>Pour {r.prenom} {r.nom}</Text>
                            )}
                            {companionNames.length > 0 && (
                              <Text style={[styles.activityRowSub, { color: C.muted }]}>Avec {companionNames.join(", ")}</Text>
                            )}
                            {history.map((h) => (
                              <Text key={h.id} style={[styles.activityRowSub, { color: C.danger }]}>
                                ↺ {h.message}
                              </Text>
                            ))}
                          </View>
                          <Text style={[styles.activityChevron, { color: C.muted }]}>›</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )
              )}

              {isOpen && key === "souvenirs" && (
                activityLoading ? (
                  <ActivityIndicator color={C.accent} style={{ marginVertical: 16 }} />
                ) : identityMissing ? missingIdentityCard : (
                  <View style={[styles.card, styles.contribCard, { backgroundColor: C.card, borderColor: C.border }]}>
                    {mySouvenirs.length === 0 ? (
                      <Text style={[styles.activityEmpty, { color: C.muted }]}>Aucune photo envoyée pour le moment.</Text>
                    ) : (
                      <View style={styles.activityThumbRow}>
                        {mySouvenirs.map((s, idx) => (
                          <TouchableOpacity key={s.id} onPress={() => setLightboxIndex(idx)} activeOpacity={0.8}>
                            <Image source={{ uri: s.url }} style={styles.activityThumb} resizeMode="cover" />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )
              )}

              {isOpen && key === "news" && (
                activityLoading ? (
                  <ActivityIndicator color={C.accent} style={{ marginVertical: 16 }} />
                ) : identityMissing ? missingIdentityCard : (
                  <View style={[styles.card, styles.contribCard, { backgroundColor: C.card, borderColor: C.border }]}>
                    {myNews.length === 0 ? (
                      <Text style={[styles.activityEmpty, { color: C.muted }]}>Aucune nouvelle publiée pour le moment.</Text>
                    ) : myNews.map((entry) => (
                      <TouchableOpacity
                        key={entry.id}
                        style={styles.activityRow}
                        onPress={() => router.push(`/(visitor)/news?focusEntryId=${entry.id}` as any)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.activityRowText, { color: C.text, flex: 1 }]} numberOfLines={2}>
                          {new Date(entry.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} — {entry.content}
                        </Text>
                        <Text style={[styles.activityChevron, { color: C.muted }]}>›</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )
              )}

              {isOpen && key === "soutien" && (
                activityLoading ? (
                  <ActivityIndicator color={C.accent} style={{ marginVertical: 16 }} />
                ) : identityMissing ? missingIdentityCard : (
                  <View style={[styles.card, styles.contribCard, { backgroundColor: C.card, borderColor: C.border }]}>
                    {myMessages.length === 0 ? (
                      <Text style={[styles.activityEmpty, { color: C.muted }]}>Aucun message envoyé pour le moment.</Text>
                    ) : myMessages.map((m) => (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.activityRow, { alignItems: "flex-start" }]}
                        onPress={() => router.push(`/(visitor)/soutien?focusMessageId=${m.id}` as any)}
                        activeOpacity={0.7}
                      >
                        {m.photo && (
                          <Image source={{ uri: supportPhotoUrl(space.id, m.photo) }} style={styles.activityMsgThumb} resizeMode="cover" />
                        )}
                        <Text style={[styles.activityRowText, { color: C.text, flex: 1 }]} numberOfLines={2}>
                          {new Date(m.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} — {m.message}
                        </Text>
                        <Text style={[styles.activityChevron, { color: C.muted }]}>›</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )
              )}

              {isOpen && key === "besoins" && (
                activityLoading ? (
                  <ActivityIndicator color={C.accent} style={{ marginVertical: 16 }} />
                ) : identityMissing ? missingIdentityCard : (
                  <>
                    <View style={[styles.card, styles.contribCard, { backgroundColor: C.card, borderColor: C.border }]}>
                      {myTasks.length === 0 ? (
                        <Text style={[styles.activityEmpty, { color: C.muted }]}>Tu n'as pris en charge aucun besoin pour le moment.</Text>
                      ) : myTasks.map((t) => (
                        <TouchableOpacity
                          key={t.id}
                          style={styles.activityRow}
                          onPress={() => router.push(`/(visitor)/entraide?focusTaskId=${t.id}` as any)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.activityRowText, { color: C.text, flex: 1 }]} numberOfLines={2}>
                            {CAT_ICONS[t.category]} {t.title}
                          </Text>
                          <View style={[styles.activityStatusBadge, { borderColor: t.status === "fait" ? C.success : C.orange }]}>
                            <Text style={[styles.activityStatusText, { color: t.status === "fait" ? C.success : C.orange }]}>
                              {t.status === "fait" ? "✓ Fait" : "⏳ En attente"}
                            </Text>
                          </View>
                          <Text style={[styles.activityChevron, { color: C.muted }]}>›</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={[styles.card, styles.contribCard, { backgroundColor: C.card, borderColor: C.border }]}>
                      {myPublishedTasks.length === 0 ? (
                        <Text style={[styles.activityEmpty, { color: C.muted }]}>Tu n'as publié aucun besoin pour le moment.</Text>
                      ) : myPublishedTasks.map((t) => (
                        <TouchableOpacity
                          key={t.id}
                          style={styles.activityRow}
                          onPress={() => router.push(`/(visitor)/entraide?focusTaskId=${t.id}` as any)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.activityRowText, { color: C.text, flex: 1 }]} numberOfLines={2}>
                            {CAT_ICONS[t.category]} {t.title}
                          </Text>
                          <View style={[
                            styles.activityStatusBadge,
                            { borderColor: t.status === "fait" ? C.success : t.status === "ferme" ? C.danger : C.orange },
                          ]}>
                            <Text style={[
                              styles.activityStatusText,
                              { color: t.status === "fait" ? C.success : t.status === "ferme" ? C.danger : C.orange },
                            ]}>
                              {t.status === "fait" ? "✓ Fait"
                                : t.status === "pris_en_charge" ? "🤝 Pris en charge"
                                : t.status === "ferme" ? "🔒 Fermé"
                                : "⏳ Ouvert"}
                            </Text>
                          </View>
                          <Text style={[styles.activityChevron, { color: C.muted }]}>›</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )
              )}
            </View>
          );
        })}

        <MyChecklist
          spaceId={space.id}
          isAdmin={false}
          ownerPrenom={prenom}
          ownerNom={nom}
          ownerPin={pin}
          C={C}
          hideImportBanner={role === "intervenant"}
          intervenantTelephone={role === "intervenant" ? telephone : undefined}
        />

        <TouchableOpacity
          style={styles.patientProfileBtn}
          onPress={() => setPatientProfileVisible(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.patientProfileBtnText}>🩺 Fiche patient</Text>
        </TouchableOpacity>

        {space?.intervenants_enabled && role !== "intervenant" && (
          <TouchableOpacity
            style={[styles.patientProfileBtn, { marginTop: 10 }]}
            onPress={() => setIntervenantsListVisible(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.patientProfileBtnText}>🩺 Intervenants</Text>
          </TouchableOpacity>
        )}

        {role === "intervenant" && (
          <TouchableOpacity
            style={[styles.patientProfileBtn, { backgroundColor: C.orange, marginTop: 10 }]}
            onPress={() => setFicheModalVisible(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.patientProfileBtnText}>🩺 Ma fiche intervenant</Text>
          </TouchableOpacity>
        )}

        {role === "intervenant" && linkedSpaces.length >= 2 && (
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border, marginTop: 10 }]}>
            <Text style={[styles.contribHeaderText, { color: C.text, marginBottom: 2 }]}>👥 Mes Patients</Text>
            {linkedSpaces.map((row) => {
              const isActive = row.space_id === space.id;
              const label = row.patient_spaces
                ? `${row.patient_spaces.patient_firstname} ${row.patient_spaces.patient_lastname}`.trim()
                : "Espace";
              return (
                <TouchableOpacity
                  key={row.id}
                  style={styles.activityRow}
                  disabled={isActive || switchingSpaceId === row.id}
                  onPress={() => handleSwitchLinkedSpace(row)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.activityRowText, { color: C.text, flex: 1 }]}>{label}</Text>
                  {isActive ? (
                    <Text style={[styles.activityRowSub, { color: C.accent }]}>Actif</Text>
                  ) : switchingSpaceId === row.id ? (
                    <ActivityIndicator color={C.accent} size="small" />
                  ) : (
                    <Text style={[styles.activityChevron, { color: C.muted }]}>›</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {role === "intervenant" && (
          <TouchableOpacity
            style={[styles.patientProfileBtn, { backgroundColor: C.accent, marginTop: 10 }]}
            onPress={() => {
              if (normalizePhone(telephone).length < 6) {
                Alert.alert(
                  "Téléphone requis",
                  "Renseigne ton téléphone dans \"Mes informations\" avant de rejoindre un nouvel espace — il sert à retrouver ta fiche.",
                );
                return;
              }
              setJoinError("");
              setJoinCode("");
              setJoinModalVisible(true);
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.patientProfileBtnText}>➕ Rejoindre un nouveau patient</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.switchLink} onPress={handleSwitchSpace}>
          <Text style={[styles.switchLinkText, { color: C.muted }]}>Suivre un autre espace</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.logoutBtn, { borderColor: "rgba(233,69,96,0.4)" }]} onPress={handleLogout}>
          <Text style={[styles.logoutBtnText, { color: "#e94560" }]}>🚪 Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>

      {!!toast && (
        <View style={[styles.toast, { backgroundColor: C.success }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <Modal visible={lightboxIndex !== null} transparent animationType="fade" onRequestClose={() => setLightboxIndex(null)}>
        <View style={styles.lightboxOverlay}>
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightboxIndex(null)}>
            <Text style={styles.lightboxCloseText}>✕</Text>
          </TouchableOpacity>

          {lightboxIndex !== null && mySouvenirs[lightboxIndex] && (
            <>
              <Image source={{ uri: mySouvenirs[lightboxIndex].url }} style={styles.lightboxImg} resizeMode="contain" />

              <View style={styles.lightboxNavRow}>
                <TouchableOpacity
                  disabled={lightboxIndex === 0}
                  onPress={() => setLightboxIndex((i) => (i !== null ? Math.max(i - 1, 0) : i))}
                  style={[styles.lightboxNavBtn, lightboxIndex === 0 && { opacity: 0.3 }]}
                >
                  <Text style={styles.lightboxNavText}>‹ Précédent</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={lightboxIndex === mySouvenirs.length - 1}
                  onPress={() => setLightboxIndex((i) => (i !== null ? Math.min(i + 1, mySouvenirs.length - 1) : i))}
                  style={[styles.lightboxNavBtn, lightboxIndex === mySouvenirs.length - 1 && { opacity: 0.3 }]}
                >
                  <Text style={styles.lightboxNavText}>Suivant ›</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.lightboxLink, { backgroundColor: C.accent }]}
                onPress={() => {
                  setLightboxIndex(null);
                  router.push("/(visitor)/souvenirs" as any);
                }}
              >
                <Text style={styles.lightboxLinkText}>📷 Voir dans Souvenirs</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>

      <Modal visible={pinModalVisible} transparent animationType="fade" onRequestClose={closeChangePinModal}>
        <View style={styles.pinModalOverlay}>
          <View style={[styles.pinModalCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.pinModalTitle, { color: C.text }]}>
              {pinPhase === "verify" && "Confirme ton PIN actuel"}
              {pinPhase === "new" && "Choisis ton nouveau PIN"}
              {pinPhase === "confirm" && "Confirme ton nouveau PIN"}
            </Text>
            {pinModalError && (
              <Text style={[styles.pinModalError, { color: C.danger }]}>
                {pinPhase === "new" ? "Les PIN ne correspondent pas, recommence." : "PIN incorrect, réessaie."}
              </Text>
            )}
            <PinPad
              value={pinInput}
              onChange={handlePinInputChange}
              theme={C}
              hasError={pinModalError}
            />
            <TouchableOpacity style={styles.pinModalCancel} onPress={closeChangePinModal}>
              <Text style={[styles.pinModalCancelText, { color: C.muted }]}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!confirmModal} transparent animationType="fade" onRequestClose={() => setConfirmModal(null)}>
        <View style={styles.pinModalOverlay}>
          <View style={[styles.logoutModalCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <View
              style={[
                styles.logoutModalIconWrap,
                { backgroundColor: confirmModal === "logout" ? "rgba(233,69,96,0.12)" : `${C.accent}20` },
              ]}
            >
              <Text style={styles.logoutModalIcon}>{confirmModal === "logout" ? "🚪" : "🔄"}</Text>
            </View>
            <Text style={[styles.logoutModalTitle, { color: C.text }]}>
              {confirmModal === "logout" ? "Se déconnecter ?" : "Suivre un autre espace ?"}
            </Text>
            <Text style={[styles.logoutModalText, { color: C.muted }]}>
              {confirmModal === "logout"
                ? "Tu devras ressaisir tes informations pour revenir sur cet espace."
                : "Tu devras saisir un nouveau lien d'invitation."}
            </Text>
            <View style={styles.logoutModalButtons}>
              <TouchableOpacity
                style={[styles.logoutModalBtn, styles.logoutModalCancelBtn, { borderColor: C.border }]}
                onPress={() => setConfirmModal(null)}
                activeOpacity={0.8}
              >
                <Text style={[styles.logoutModalCancelText, { color: C.text }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.logoutModalBtn,
                  { backgroundColor: confirmModal === "switchSpace" ? C.accent : C.danger },
                ]}
                onPress={confirmModalAction}
                activeOpacity={0.8}
              >
                <Text style={styles.logoutModalConfirmText}>
                  {confirmModal === "logout" ? "Se déconnecter" : "Continuer"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={joinModalVisible} transparent animationType="fade" onRequestClose={() => setJoinModalVisible(false)}>
        <View style={styles.pinModalOverlay}>
          <View style={[styles.pinModalCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.pinModalTitle, { color: C.text }]}>➕ Rejoindre un nouveau patient</Text>
            <Text style={[styles.cardDesc, { color: C.muted, textAlign: "center", marginBottom: 14 }]}>
              Demande le code dossier à l'organisateur de ce nouvel espace. Ta fiche (photo,
              téléphone, phrase totem, types d'intervention) sera reprise automatiquement.
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: C.bg, borderColor: C.border, color: C.text, width: "100%", textAlign: "center", letterSpacing: 2 },
              ]}
              placeholder="Code dossier"
              placeholderTextColor={C.muted}
              value={joinCode}
              onChangeText={(v) => setJoinCode(v.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            {!!joinError && (
              <Text style={[styles.pinModalError, { color: C.danger, marginTop: 10 }]}>{joinError}</Text>
            )}
            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: C.accent, width: "100%", marginTop: 16 },
                (joining || !joinCode.trim()) && { opacity: 0.5 },
              ]}
              onPress={handleJoinNewSpace}
              disabled={joining || !joinCode.trim()}
            >
              {joining ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Rejoindre</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.pinModalCancel} onPress={() => setJoinModalVisible(false)}>
              <Text style={[styles.pinModalCancelText, { color: C.muted }]}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {space && (
        <PatientProfileModal
          visible={patientProfileVisible}
          onClose={() => setPatientProfileVisible(false)}
          space={space}
          C={C}
        />
      )}

      {space && (
        <IntervenantsListModal
          visible={intervenantsListVisible}
          onClose={() => setIntervenantsListVisible(false)}
          spaceId={space.id}
          C={C}
        />
      )}

      {space && role === "intervenant" && intervenantProfileId && (
        <IntervenantFicheModal
          visible={ficheModalVisible}
          mode="edit"
          spaceId={space.id}
          prenom={prenom}
          nom={nom}
          pin={pin}
          intervenantProfileId={intervenantProfileId}
          theme={C}
          onClose={() => setFicheModalVisible(false)}
          onSaved={async (_profileId, savedPrenom, savedNom, savedTelephone, savedPhraseTotem, savedPhoto, savedPhotoUpdatedAt) => {
            // Persiste aussi la photo dans localPhotoUri : sinon la session
            // locale garde l'ancienne URI (ou reste vide), et rouvrir l'app
            // réaffiche l'ancienne photo malgré le changement fait ici — voir
            // le fallback de rechargement dans le useEffect plus haut, qui ne
            // re-fetch depuis intervenant_profiles que si localPhotoUri est vide.
            const newPhotoUri = savedPhoto ? intervenantPhotoUrl(savedPhoto, savedPhotoUpdatedAt) : null;
            await saveVisitorSession({
              token, spaceId: space.id,
              prenom: savedPrenom, nom: savedNom,
              telephone: savedTelephone ?? "",
              motto: savedPhraseTotem ?? "",
              localPhotoUri: newPhotoUri,
            });
            setPrenom(savedPrenom);
            setNom(savedNom);
            setTelephone(savedTelephone ?? "");
            setMotto(savedPhraseTotem ?? "");
            if (newPhotoUri) setPhotoUri(newPhotoUri);
            setFicheModalVisible(false);
            showToast("Fiche intervenant enregistrée ✓");
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 20 },
  subHeader: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  scroll: { padding: 16, paddingBottom: 48 },

  photoWrap: { alignItems: "center", marginBottom: 4 },
  photo: { width: 88, height: 88, borderRadius: 44, marginBottom: 8 },
  photoPlaceholder: { width: 88, height: 88, borderRadius: 44, borderWidth: 1, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  photoHint: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
  identityName: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 17, textAlign: "center", marginBottom: 22 },
  identityMotto: { fontFamily: "Caveat_600SemiBold", fontSize: 18, color: "#7EC8E3", textAlign: "center", marginBottom: 22 },

  tileHint: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11.5, lineHeight: 15 },
  tileChevron: { fontFamily: "DM_Sans_700Bold", fontSize: 16 },
  backToGrid: { borderRadius: 10, paddingVertical: 12, alignItems: "center", marginBottom: 16 },
  backToGridText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#0D1B2E" },

  contribHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 12, borderBottomWidth: 1,
  },
  contribHeaderText: { fontFamily: "DM_Sans_700Bold", fontSize: 14 },
  contribCard: { marginTop: 10 },

  sectionTitle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10, marginTop: 8 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 10 },
  revealBtn: { paddingVertical: 2, paddingHorizontal: 4 },
  revealBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 4, gap: 10 },
  cardDesc: { fontFamily: "DM_Sans_400Regular", fontSize: 13, lineHeight: 19, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 10, padding: 13, fontFamily: "DM_Sans_400Regular", fontSize: 15 },

  displayModeLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 15 },

  activityEmpty: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },
  activityRow: { paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 8 },
  activityRowText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, lineHeight: 19 },
  activityRowSub: { fontFamily: "DM_Sans_400Regular", fontSize: 11.5, lineHeight: 16, marginTop: 1 },
  activityThumbRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  activityThumb: { width: 64, height: 64, borderRadius: 8 },
  activityMsgThumb: { width: 44, height: 44, borderRadius: 8 },
  activityStatusBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  activityStatusText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 10 },
  activityChevron: { fontFamily: "DM_Sans_700Bold", fontSize: 16 },

  saveBtn: { borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 24 },
  saveBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 15, color: "#fff" },

  changePinBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 6 },
  changePinBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 13 },

  pinModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", alignItems: "center", justifyContent: "center", padding: 24 },
  pinModalCard: { width: "100%", maxWidth: 340, borderWidth: 1, borderRadius: 16, padding: 24, alignItems: "center" },
  pinModalTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 17, textAlign: "center", marginBottom: 12 },
  pinModalError: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, textAlign: "center", marginBottom: 10 },
  pinModalCancel: { marginTop: 16 },
  pinModalCancelText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textDecorationLine: "underline" },

  logoutModalCard: { width: "100%", maxWidth: 340, borderWidth: 1, borderRadius: 20, padding: 28, alignItems: "center" },
  logoutModalIconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  logoutModalIcon: { fontSize: 26 },
  logoutModalTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 19, textAlign: "center", marginBottom: 8 },
  logoutModalText: { fontFamily: "DM_Sans_400Regular", fontSize: 13.5, textAlign: "center", lineHeight: 19, marginBottom: 22 },
  logoutModalButtons: { flexDirection: "row", gap: 10, width: "100%" },
  logoutModalBtn: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: "center", justifyContent: "center" },
  logoutModalCancelBtn: { borderWidth: 1 },
  logoutModalCancelText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  logoutModalConfirmText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14, color: "#fff" },

  patientProfileBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#2E75B6", borderRadius: 10, paddingVertical: 13, marginTop: 24,
  },
  patientProfileBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },

  switchLink: { alignItems: "center", marginTop: 20 },
  switchLinkText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textDecorationLine: "underline" },

  logoutBtn: { alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 10, paddingVertical: 12, marginTop: 24, marginBottom: 8 },
  logoutBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14 },

  toast: { position: "absolute", bottom: 24, alignSelf: "center", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  toastText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, color: "#fff" },

  lightboxOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center", padding: 16 },
  lightboxClose: { position: "absolute", top: 52, right: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", zIndex: 1 },
  lightboxCloseText: { color: "#fff", fontSize: 16, fontFamily: "DM_Sans_700Bold" },
  lightboxImg: { width: "100%", height: "65%" },
  lightboxNavRow: { flexDirection: "row", gap: 16, marginTop: 16 },
  lightboxNavBtn: { paddingVertical: 8, paddingHorizontal: 14 },
  lightboxNavText: { color: "#fff", fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  lightboxLink: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 22, marginTop: 20 },
  lightboxLinkText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
});
