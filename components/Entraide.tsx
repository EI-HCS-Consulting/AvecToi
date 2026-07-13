import { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Modal, StyleSheet, Alert, ActivityIndicator, Image,
  KeyboardAvoidingView, Platform, Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { File } from "expo-file-system";
import { supabase } from "@/lib/supabase";
import { getVisitorSession, rememberAuthorPin, sessionPinMatches } from "@/lib/visitorSession";
import PinPad from "@/components/PinPad";
import MiniCalendar from "@/components/MiniCalendar";
import SegmentedSwitch from "@/components/SegmentedSwitch";
import TimeClockPicker from "@/components/TimeClockPicker";
import { toFrShort } from "@/lib/slotUtils";
import { googleMapsSearchUrl, joinAddress } from "@/lib/address";
import { addGenericEventToNativeCalendar } from "@/lib/calendarSync";
import type { Task, TransportProposal } from "@/lib/types";
import type { Theme } from "@/lib/themes";

const PHOTO_BUCKET = "entraide-photos";

function taskPhotoUrl(spaceId: string, filename: string) {
  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(`${spaceId}/${filename}`);
  return data.publicUrl;
}

// Section "Besoins" extraite de l'ancien EntraideSoutien.tsx (qui combinait
// Besoins + Mur de soutien sous un toggle interne) — voir components/Soutien.tsx
// pour l'autre moitié. Même logique, juste sans le toggle de section.

type TaskStatus = Task["status"];
type TaskCategory = Task["category"];

const CATEGORY_ICONS: Record<TaskCategory, string> = {
  repas: "🍽️",
  affaires: "👕",
  courses: "🛒",
  transport: "🚗",
  administratif: "🗂️",
  autre: "💡",
};

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  repas: "Repas",
  affaires: "Affaires",
  courses: "Courses",
  transport: "Transport",
  administratif: "Administratif",
  autre: "Autre",
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  ouvert: "Ouvert",
  pris_en_charge: "Pris en charge",
  fait: "Fait ✓",
};

const STATUS_COLORS = (C: Theme): Record<TaskStatus, string> => ({
  ouvert: C.success,
  pris_en_charge: C.orange,
  fait: C.muted,
});

interface Props {
  spaceId: string;
  C: Theme;
  isAdmin: boolean;
  capped: boolean;
  // Préremplit "Arrivée" dans le formulaire de création d'un besoin Transport.
  hospitalName?: string;
  // Allergies du patient (saisies par l'admin dans "Profil Patient") — affichées
  // en rappel à quiconque publie ou prend en charge un besoin "Repas".
  allergies?: string | null;
}

// "07/07 à 14h30" — combine la date (toFrShort) et une heure "HH:MM" stockée
// telle quelle en base (pas de fuseau horaire à gérer, contrairement à un
// timestamptz).
function slotLabel(dateIso: string, time: string): string {
  return `${toFrShort(new Date(dateIso + "T12:00:00"))} à ${time.replace(":", "h")}`;
}

export default function Entraide({ spaceId, C, isAdmin, capped, hospitalName, allergies }: Props) {
  const router = useRouter();
  const { focusTaskId } = useLocalSearchParams<{ focusTaskId?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const taskOffsets = useRef<Record<string, number>>({});
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const focusedRef = useRef(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  // PIN de session de cet appareil — sert à ne montrer "C'est fait" /
  // "Se désinscrire" que sur les besoins pris en charge par ce même
  // visiteur, jamais sur ceux pris en charge par quelqu'un d'autre.
  const [mySession, setMySession] = useState<{ prenom: string; nom: string; pin: string } | null>(null);
  useEffect(() => {
    if (!isAdmin) getVisitorSession().then((s) => {
      if (s) setMySession({ prenom: s.prenom, nom: s.nom, pin: s.pin });
    });
  }, [isAdmin]);
  // Un PIN seul ne suffit pas à identifier une personne de façon fiable ici :
  // ce ne sont pas des comptes, juste un code à 4 chiffres choisi librement —
  // deux identités différentes testées sur le même appareil peuvent tomber
  // sur le même PIN par coïncidence (ou par habitude en test), ce qui ferait
  // passer un besoin publié par quelqu'un d'autre pour "le mien". On exige
  // donc aussi la correspondance du prénom/nom de la session en cours.
  function samePerson(prenom: string | null, nom: string | null, pin: string | null): boolean {
    if (!mySession || !pin || !prenom || !nom) return false;
    return (
      mySession.pin === pin &&
      mySession.prenom.trim().toLowerCase() === prenom.trim().toLowerCase() &&
      mySession.nom.trim().toLowerCase() === nom.trim().toLowerCase()
    );
  }
  const isMine = (t: Task) => samePerson(t.claimed_by_prenom, t.claimed_by_nom, t.claimed_by_pin);
  // Preneur du retour, uniquement renseigné quand aller et retour ont été
  // attribués séparément à deux personnes différentes (sinon ce champ reste
  // null même si la même personne fait les deux, voir lib/types.ts).
  const isMineReturn = (t: Task) => samePerson(t.transport_return_claimed_by_prenom, t.transport_return_claimed_by_nom, t.transport_return_claimed_by_pin);
  // Le créateur d'un besoin Transport — seul lui (ou l'admin) peut valider
  // une proposition d'horaire.
  const isAuthor = (t: Task) => samePerson(t.author_prenom, t.author_nom, t.author_pin);
  const canManageTransport = (t: Task) => isAdmin || isAuthor(t);
  // Vrai dès qu'au moins une jambe (aller ou retour) a déjà un preneur —
  // sert à masquer "Je m'en occupe" (qui prendrait les deux jambes d'un
  // coup) une fois qu'une jambe a été attribuée séparément via une
  // proposition, pour ne pas écraser cette attribution.
  const transportAnyLegClaimed = (t: Task) => !!t.claimed_by_prenom || !!t.transport_return_claimed_by_prenom;
  // Jambe(s) que CE visiteur a personnellement en charge sur ce besoin — sert
  // à limiter "C'est fait"/"Se désinscrire"/"Ajouter au calendrier" à ce qui
  // le concerne. Si l'aller et le retour ont été pris par la même personne
  // (claim direct, transport_return_claimed_by_prenom resté null), les deux
  // jambes lui reviennent.
  const myTransportLegs = (t: Task): ("out" | "return")[] => {
    const legs: ("out" | "return")[] = [];
    if (isMine(t)) legs.push("out");
    if (t.transport_round_trip) {
      if (t.transport_return_claimed_by_prenom) {
        if (isMineReturn(t)) legs.push("return");
      } else if (isMine(t)) {
        legs.push("return");
      }
    }
    return legs;
  };
  // null = pas de filtre, affiche tous les besoins (existant). Cliquer à
  // nouveau sur l'onglet actif désélectionne.
  const [activeCat, setActiveCat] = useState<TaskCategory | null>(null);

  const [taskForm, setTaskForm] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [fTitle, setFTitle] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fCat, setFCat] = useState<TaskCategory>("autre");
  const [fPhotoUri, setFPhotoUri] = useState<string | null>(null);
  const [fExistingPhoto, setFExistingPhoto] = useState<string | null>(null);
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const [taskSaving, setTaskSaving] = useState(false);

  // Champs spécifiques catégorie "transport" dans le formulaire de création.
  const [fTDate, setFTDate] = useState("");
  const [fTCalMonth, setFTCalMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [fTOutTime, setFTOutTime] = useState("");
  const [fTReturnTime, setFTReturnTime] = useState("");
  const [fTRoundTrip, setFTRoundTrip] = useState(false);
  const [fTFlexible, setFTFlexible] = useState(true);
  // Adresse du domicile du demandeur — seul lieu éditable ici. Le lieu de
  // soin (hôpital) est figé (space.hospital_name, non modifiable dans ce
  // formulaire) : "Intervertir" ne fait que changer de quel côté (Départ ou
  // Arrivée) se trouve ce bloc domicile, pas son contenu.
  const [fTHomeAddress, setFTHomeAddress] = useState("");
  // false = domicile en Départ, hôpital (figé) en Arrivée (par défaut).
  // true = inversé (utile pour une demande de retour hôpital → domicile).
  const [fTSwapped, setFTSwapped] = useState(false);
  // Code postal / ville / pays du domicile — sert à générer un lien Google
  // Maps pour l'aidant qui prend en charge la demande, quel que soit le
  // côté (Départ ou Arrivée) où se trouve le domicile.
  const [fTHomePostalCode, setFTHomePostalCode] = useState("");
  const [fTHomeCity, setFTHomeCity] = useState("");
  const [fTHomeCountry, setFTHomeCountry] = useState("");
  // "Publier pour quelqu'un d'autre" (ex. un proche âgé) — distinct de
  // l'auteur (author_prenom/nom), qui reste toujours la personne connectée.
  const [fTForSomeoneElse, setFTForSomeoneElse] = useState(false);
  const [fTForPrenom, setFTForPrenom] = useState("");
  const [fTForNom, setFTForNom] = useState("");
  // Dernier titre généré automatiquement (catégorie/date) — permet de ne
  // jamais écraser un titre que la personne a personnalisé à la main.
  const autoTransportTitleRef = useRef("");
  // Largeur de pastille du switch "Aller simple / Aller-retour", reprise
  // par le switch "Flexible / Horaire fixe" juste en dessous pour que les
  // deux curseurs aient la même taille.
  const [transportThumbWidth, setTransportThumbWidth] = useState(0);

  const transportFormReady = fTDate.trim() && fTOutTime.length === 5 && fTHomeAddress.trim()
    && (!fTRoundTrip || fTReturnTime.length === 5)
    && (!fTForSomeoneElse || (fTForPrenom.trim() && fTForNom.trim()));

  function selectCategory(cat: TaskCategory) {
    setFCat(cat);
    if (cat === "transport" && !editTask && !fTitle.trim()) {
      autoTransportTitleRef.current = "Besoin covoiturage";
      setFTitle("Besoin covoiturage");
    }
  }

  function handleTransportDateSelect(iso: string) {
    setFTDate(iso);
    if (!fTitle.trim() || fTitle === autoTransportTitleRef.current) {
      const next = `Besoin covoiturage : ${toFrShort(new Date(iso + "T12:00:00"))}`;
      autoTransportTitleRef.current = next;
      setFTitle(next);
    }
  }

  function swapTransportDirection() {
    // Le lieu de soin reste figé — seul le côté (Départ/Arrivée) qui
    // affiche le bloc domicile change, son contenu ne bouge pas.
    setFTSwapped((v) => !v);
  }

  // Bloc domicile (adresse éditable + CP/ville/pays) — affiché du côté
  // Départ ou Arrivée selon fTSwapped, jamais dupliqué ni figé (contrairement
  // au lieu de soin, affiché à part via renderFixedCareLocation()).
  function renderHomeAddressFields() {
    return (
      <>
        <TextInput
          style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
          placeholder="Ex : Domicile, 12 rue des Lilas"
          placeholderTextColor={C.muted}
          value={fTHomeAddress}
          onChangeText={setFTHomeAddress}
        />
        <Text style={[styles.transportHint, { color: C.muted }]}>
          Pour générer un lien Google Maps du domicile, à l'usage de la personne qui prend en charge le trajet :
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.fieldLabel, { color: C.gold }]}>Code postal</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
              placeholder="38000"
              placeholderTextColor={C.muted}
              value={fTHomePostalCode}
              onChangeText={setFTHomePostalCode}
              keyboardType="number-pad"
            />
          </View>
          <View style={{ flex: 2 }}>
            <Text style={[styles.fieldLabel, { color: C.gold }]}>Ville</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
              placeholder="Grenoble"
              placeholderTextColor={C.muted}
              value={fTHomeCity}
              onChangeText={setFTHomeCity}
            />
          </View>
        </View>
        <Text style={[styles.fieldLabel, { color: C.gold }]}>Pays</Text>
        <TextInput
          style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
          placeholder="Laisser vide si France"
          placeholderTextColor={C.muted}
          value={fTHomeCountry}
          onChangeText={setFTHomeCountry}
        />
      </>
    );
  }

  // Lieu de soin — figé, non modifiable ici (configuré dans les réglages de
  // l'espace, hospitalName). Affiché en lecture seule du côté opposé au
  // domicile.
  function renderFixedCareLocation() {
    return (
      <View style={[styles.input, styles.fixedLocationBox, { backgroundColor: C.bg, borderColor: C.border }]}>
        <Text style={{ fontFamily: "DM_Sans_400Regular", fontSize: 15, color: C.muted }}>
          {hospitalName || "Hôpital"}
        </Text>
        <Text style={[styles.transportHint, { color: C.muted, marginTop: 4, marginBottom: 0 }]}>
          🔒 Lieu de soin
        </Text>
      </View>
    );
  }

  // ── Modale "Propositions reçues" (demandeur/admin consulte les
  // propositions d'un besoin Transport et valide aller et/ou retour,
  // éventuellement depuis deux propositions différentes) ──
  const [proposalsTarget, setProposalsTarget] = useState<Task | null>(null);

  // ── Modale "Proposition" (aidant propose un autre horaire sur un besoin
  // Transport ouvert, sans le prendre en charge directement) ──
  const [proposeTarget, setProposeTarget] = useState<Task | null>(null);
  const [pDate, setPDate] = useState("");
  const [pCalMonth, setPCalMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [pOutTime, setPOutTime] = useState("");
  const [pReturnTime, setPReturnTime] = useState("");
  // Sur un besoin aller-retour, l'aidant choisit ce qu'il propose : l'aller,
  // le retour, ou les deux — pour que le demandeur puisse ensuite valider
  // chaque jambe séparément, avec des aidants différents si besoin.
  const [pIncludeOut, setPIncludeOut] = useState(true);
  const [pIncludeReturn, setPIncludeReturn] = useState(true);
  const [pNote, setPNote] = useState("");
  const [pPrenom, setPPrenom] = useState("");
  const [pNom, setPNom] = useState("");
  const [pPin, setPPin] = useState("");
  const [proposeSaving, setProposeSaving] = useState(false);

  const proposeFormReady = pDate.trim() && pPrenom.trim() && pNom.trim()
    && (!pIncludeOut || pOutTime.length === 5)
    && (!proposeTarget?.transport_round_trip || !pIncludeReturn || pReturnTime.length === 5)
    && (!proposeTarget?.transport_round_trip || pIncludeOut || pIncludeReturn)
    && (isAdmin || pPin.length >= 4);

  // Case à cocher "je m'en occupe déjà" dans le formulaire de création (pas
  // en édition) — le besoin est alors créé directement en "pris_en_charge"
  // au lieu de "ouvert", avec l'identité de son créateur. Réutilise les
  // mêmes states que le claim d'un besoin déjà publié (claimPrenom/Nom/Pin
  // ci-dessous) : les deux formulaires ne sont jamais ouverts en même temps.
  const [claimOnCreate, setClaimOnCreate] = useState(false);

  const [claimTarget, setClaimTarget] = useState<Task | null>(null);
  const [claimPrenom, setClaimPrenom] = useState("");
  const [claimNom, setClaimNom] = useState("");
  const [claimPin, setClaimPin] = useState("");
  const [claimPhotoUri, setClaimPhotoUri] = useState<string | null>(null);
  const [claimPickingPhoto, setClaimPickingPhoto] = useState(false);
  const [claimText, setClaimText] = useState("");
  const [claimSaving, setClaimSaving] = useState(false);

  const [pinModal, setPinModal] = useState<{ task: Task; action: "unclaim"; leg: "out" | "return" } | null>(null);
  const [pinEntry, setPinEntry] = useState("");
  const [pinError, setPinError] = useState(false);

  const [doneTarget, setDoneTarget] = useState<Task | null>(null);
  const [donePhotoUri, setDonePhotoUri] = useState<string | null>(null);
  const [donePickingPhoto, setDonePickingPhoto] = useState(false);
  const [donePin, setDonePin] = useState("");
  const [donePinError, setDonePinError] = useState(false);
  const [donePinVerified, setDonePinVerified] = useState(false);
  const [doneSaving, setDoneSaving] = useState(false);

  const [toast, setToast] = useState("");
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  const loadTasks = useCallback(async () => {
    setTasksLoading(true);
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("space_id", spaceId)
      .order("created_at", { ascending: false });
    setTasks(data || []);
    setTasksLoading(false);
  }, [spaceId]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  // Arrivée depuis "Mon compte" via un lien profond (?focusTaskId=...) :
  // on retire un éventuel filtre de catégorie qui cacherait le besoin, on
  // scrolle jusqu'à sa carte et on la surligne brièvement. focusedRef évite
  // de re-déclencher le scroll à chaque rechargement realtime de tasks.
  useEffect(() => {
    if (!focusTaskId || focusedRef.current || tasksLoading) return;
    const target = tasks.find((t) => t.id === focusTaskId);
    if (!target) return;
    focusedRef.current = true;
    if (activeCat && activeCat !== target.category) setActiveCat(null);
    setHighlightId(focusTaskId);
    setTimeout(() => {
      const y = taskOffsets.current[focusTaskId];
      if (y != null) scrollRef.current?.scrollTo({ y: Math.max(y - 12, 0), animated: true });
    }, 300);
    setTimeout(() => setHighlightId(null), 2500);
  }, [focusTaskId, tasks, tasksLoading, activeCat]);

  useEffect(() => {
    const ch = supabase
      .channel(`tasks:${spaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `space_id=eq.${spaceId}` }, loadTasks)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [spaceId, loadTasks]);

  function openCreateTask() {
    if (capped) {
      Alert.alert(
        "Limite atteinte",
        "Vous avez atteint la limite de votre espace. Consultez l'email envoyé à votre adresse pour en savoir plus.",
      );
      return;
    }
    setEditTask(null);
    setFTitle(""); setFDesc(""); setFCat("autre");
    setFPhotoUri(null); setFExistingPhoto(null);
    setClaimOnCreate(false);
    setClaimPrenom(""); setClaimNom(""); setClaimPin("");
    setFTDate(""); setFTOutTime(""); setFTReturnTime("");
    setFTRoundTrip(false); setFTFlexible(true);
    setFTHomeAddress("");
    setFTSwapped(false);
    setFTHomePostalCode(""); setFTHomeCity(""); setFTHomeCountry("");
    setFTForSomeoneElse(false); setFTForPrenom(""); setFTForNom("");
    setFTCalMonth(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
    autoTransportTitleRef.current = "";
    setTaskForm(true);
  }

  // Bascule "je m'en occupe déjà" à la création — reprend l'identité déjà
  // connue (profil admin ou session visiteur), même logique que NewsFeed et
  // Soutien : on ne redemande prénom/nom que si elle est vraiment inconnue.
  async function toggleClaimOnCreate() {
    const next = !claimOnCreate;
    setClaimOnCreate(next);
    if (!next) return;
    if (isAdmin) {
      const { data } = await supabase.auth.getUser();
      setClaimPrenom((data.user?.user_metadata?.firstname ?? "").trim());
      setClaimNom((data.user?.user_metadata?.lastname ?? "").trim());
      setClaimPin("ADMIN");
    } else {
      const s = await getVisitorSession();
      setClaimPrenom(s?.prenom ?? "");
      setClaimNom(s?.nom ?? "");
      setClaimPin(s?.pin ?? "");
    }
  }

  function openEditTask(t: Task) {
    setEditTask(t);
    setFTitle(t.title); setFDesc(t.description); setFCat(t.category);
    setFPhotoUri(null); setFExistingPhoto(t.photo);
    setTaskForm(true);
  }

  async function pickTaskPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission refusée", "Autorise l'accès à la galerie dans les paramètres.");
      return;
    }
    setPickingPhoto(true);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    setPickingPhoto(false);
    if (!result.canceled && result.assets[0]) {
      setFPhotoUri(result.assets[0].uri);
      setFExistingPhoto(null);
    }
  }

  function removeTaskPhoto() {
    setFPhotoUri(null);
    setFExistingPhoto(null);
  }

  const claimOnCreateReady = !claimOnCreate
    || (claimPrenom.trim() && claimNom.trim() && (isAdmin || claimPin.length >= 4));

  async function saveTask() {
    if (!fTitle.trim() || (!editTask && !claimOnCreateReady)) return;
    if (!editTask && fCat === "transport" && !transportFormReady) return;
    setTaskSaving(true);

    let photoFilename = fExistingPhoto;
    if (fPhotoUri) {
      try {
        const compressed = await ImageManipulator.manipulateAsync(
          fPhotoUri,
          [{ resize: { width: 1080 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
        );
        const fileData = await new File(compressed.uri).arrayBuffer();
        const fname = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`;
        const { error } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(`${spaceId}/${fname}`, fileData, { contentType: "image/jpeg", cacheControl: "3600" });
        if (!error) photoFilename = fname;
        else Alert.alert("Photo non envoyée", "Le besoin sera enregistré sans la photo.");
      } catch {
        Alert.alert("Photo non envoyée", "Le besoin sera enregistré sans la photo.");
      }
    }

    if (editTask) {
      const removedFilename = editTask.photo && editTask.photo !== photoFilename ? editTask.photo : null;
      await supabase.from("tasks").update({
        title: fTitle.trim(), description: fDesc.trim(), category: fCat, photo: photoFilename,
      }).eq("id", editTask.id);
      if (removedFilename) {
        await supabase.storage.from(PHOTO_BUCKET).remove([`${spaceId}/${removedFilename}`]);
      }
      showToast("Besoin modifié ✓");
    } else {
      // Identité de l'auteur — utile pour toutes les catégories (section
      // "Mes besoins publiés" de Mon compte), pas seulement Transport où
      // elle servait jusqu'ici à autoriser la validation d'une proposition.
      let authorPrenom = "", authorNom = "", authorPin = "";
      if (isAdmin) {
        const { data } = await supabase.auth.getUser();
        authorPrenom = (data.user?.user_metadata?.firstname ?? "").trim();
        authorNom = (data.user?.user_metadata?.lastname ?? "").trim();
        authorPin = "ADMIN";
      } else if (mySession) {
        authorPrenom = mySession.prenom;
        authorNom = mySession.nom;
        authorPin = mySession.pin;
      }
      let transportFields: Record<string, unknown> = {};
      if (fCat === "transport") {
        const homeAddr = fTHomeAddress.trim();
        const careAddr = hospitalName ?? "";
        transportFields = {
          transport_date: fTDate,
          transport_out_time: fTOutTime,
          transport_return_time: fTRoundTrip ? fTReturnTime : null,
          transport_round_trip: fTRoundTrip,
          transport_flexible: fTFlexible,
          transport_from: fTSwapped ? careAddr : homeAddr,
          transport_to: fTSwapped ? homeAddr : careAddr,
          transport_home_postal_code: fTHomePostalCode.trim() || null,
          transport_home_city: fTHomeCity.trim() || null,
          transport_home_country: fTHomeCountry.trim() || null,
          transport_home_is_arrival: fTSwapped,
          transport_for_prenom: fTForSomeoneElse ? fTForPrenom.trim() : null,
          transport_for_nom: fTForSomeoneElse ? fTForNom.trim() : null,
        };
      }
      const { error: insertError } = await supabase.from("tasks").insert({
        space_id: spaceId,
        title: fTitle.trim(),
        description: fDesc.trim(),
        category: fCat,
        status: claimOnCreate ? "pris_en_charge" : "ouvert",
        created_by: isAdmin ? "admin" : "visiteur",
        photo: photoFilename,
        author_prenom: authorPrenom || null,
        author_nom: authorNom || null,
        author_pin: authorPin || null,
        ...transportFields,
        ...(claimOnCreate ? {
          claimed_by_prenom: claimPrenom.trim(),
          claimed_by_nom: claimNom.trim(),
          claimed_by_pin: claimPin,
          ...(fCat === "transport" ? {
            transport_confirmed_date: fTDate,
            transport_confirmed_out_time: fTOutTime,
            transport_confirmed_return_time: fTRoundTrip ? fTReturnTime : null,
          } : {}),
        } : {}),
      });
      if (insertError) {
        Alert.alert("DEBUG insert error", JSON.stringify(insertError));
        setTaskSaving(false);
        return;
      }
      if (claimOnCreate && !isAdmin) await rememberAuthorPin(claimPrenom.trim(), claimNom.trim(), claimPin);
      showToast(claimOnCreate ? "Besoin créé — tu t'en occupes déjà ✓" : "Besoin créé ✓");
    }
    setTaskSaving(false);
    setTaskForm(false);
    loadTasks();
  }

  async function deleteTask(t: Task) {
    if (t.status === "fait") return;
    Alert.alert("Supprimer ce besoin ?", t.title, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer", style: "destructive", onPress: async () => {
          const toRemove = [t.photo, t.claimed_photo].filter((f): f is string => !!f);
          if (toRemove.length) await supabase.storage.from(PHOTO_BUCKET).remove(toRemove.map((f) => `${spaceId}/${f}`));
          await supabase.from("tasks").delete().eq("id", t.id);
          showToast("Besoin supprimé");
          loadTasks();
        },
      },
    ]);
  }

  async function adminSetStatus(t: Task, status: TaskStatus) {
    if (status === "ouvert" && t.done_photo) {
      await supabase.storage.from(PHOTO_BUCKET).remove([`${spaceId}/${t.done_photo}`]);
    }
    await supabase.from("tasks").update({
      status,
      ...(status === "ouvert" ? { done_photo: null } : {}),
    }).eq("id", t.id);
    loadTasks();
  }

  // Marquer un besoin "Fait", avec une photo optionnelle (ex: preuve du
  // repas livré). Accessible à l'admin directement, et au preneur via PIN.
  async function openDone(task: Task) {
    setDoneTarget(task);
    setDonePhotoUri(null);
    setDonePin("");
    setDonePinError(false);
    setDonePinVerified(
      !isAdmin && ((await sessionPinMatches(task.claimed_by_pin)) || (await sessionPinMatches(task.transport_return_claimed_by_pin))),
    );
  }

  async function pickDonePhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission refusée", "Autorise l'accès à la galerie dans les paramètres.");
      return;
    }
    setDonePickingPhoto(true);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    setDonePickingPhoto(false);
    if (!result.canceled && result.assets[0]) {
      setDonePhotoUri(result.assets[0].uri);
    }
  }

  function removeDonePhoto() {
    setDonePhotoUri(null);
  }

  async function confirmDone() {
    if (!doneTarget) return;
    if (!isAdmin && !donePinVerified && donePin !== doneTarget.claimed_by_pin && donePin !== doneTarget.transport_return_claimed_by_pin) {
      setDonePinError(true);
      setDonePin("");
      return;
    }
    setDoneSaving(true);

    let doneFilename: string | null = null;
    if (donePhotoUri) {
      try {
        const compressed = await ImageManipulator.manipulateAsync(
          donePhotoUri,
          [{ resize: { width: 1080 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
        );
        const fileData = await new File(compressed.uri).arrayBuffer();
        const fname = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`;
        const { error } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(`${spaceId}/${fname}`, fileData, { contentType: "image/jpeg", cacheControl: "3600" });
        if (!error) doneFilename = fname;
        else Alert.alert("DEBUG upload error", JSON.stringify(error));
      } catch (e: any) {
        Alert.alert("DEBUG catch error", String(e?.message || e));
      }
    }

    const { error: updateError } = await supabase.from("tasks").update({ status: "fait", done_photo: doneFilename }).eq("id", doneTarget.id);
    if (updateError) Alert.alert("DEBUG update error", JSON.stringify(updateError));
    setDoneSaving(false);
    setDoneTarget(null);
    showToast("Marqué comme fait ✓");
    loadTasks();
  }

  async function openClaim(t: Task) {
    setClaimTarget(t);
    setClaimPrenom(""); setClaimNom(""); setClaimPin(""); setClaimPhotoUri(null); setClaimText("");
    // Prénom/nom/PIN ne sont plus jamais ressaisis ici : repris de la session
    // visiteur (PIN choisi dès la connexion) ou du profil admin — le champ
    // PIN n'est donc plus affiché dans ce formulaire.
    if (isAdmin) {
      const { data } = await supabase.auth.getUser();
      setClaimPrenom((data.user?.user_metadata?.firstname ?? "").trim());
      setClaimNom((data.user?.user_metadata?.lastname ?? "").trim());
      setClaimPin("ADMIN");
    } else {
      const s = await getVisitorSession();
      if (s) { setClaimPrenom(s.prenom); setClaimNom(s.nom); setClaimPin(s.pin ?? ""); }
    }
  }

  async function pickClaimPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission refusée", "Autorise l'accès à la galerie dans les paramètres.");
      return;
    }
    setClaimPickingPhoto(true);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    setClaimPickingPhoto(false);
    if (!result.canceled && result.assets[0]) {
      setClaimPhotoUri(result.assets[0].uri);
    }
  }

  function removeClaimPhoto() {
    setClaimPhotoUri(null);
  }

  async function handleClaim() {
    if (!claimTarget || !claimPrenom.trim() || !claimNom.trim() || claimPin.length < 4) return;
    setClaimSaving(true);

    let claimedPhotoFilename: string | null = null;
    if (claimPhotoUri) {
      try {
        const compressed = await ImageManipulator.manipulateAsync(
          claimPhotoUri,
          [{ resize: { width: 1080 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
        );
        const fileData = await new File(compressed.uri).arrayBuffer();
        const fname = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`;
        const { error } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(`${spaceId}/${fname}`, fileData, { contentType: "image/jpeg", cacheControl: "3600" });
        if (!error) claimedPhotoFilename = fname;
        else Alert.alert("Photo non envoyée", "Tu peux quand même confirmer sans la photo.");
      } catch {
        Alert.alert("Photo non envoyée", "Tu peux quand même confirmer sans la photo.");
      }
    }

    await supabase.from("tasks").update({
      status: "pris_en_charge",
      claimed_by_prenom: claimPrenom.trim(),
      claimed_by_nom: claimNom.trim(),
      claimed_by_pin: claimPin,
      claimed_photo: claimedPhotoFilename,
      claimed_text: claimText.trim() || null,
      ...(claimTarget.category === "transport" ? {
        transport_confirmed_date: claimTarget.transport_date,
        transport_confirmed_out_time: claimTarget.transport_out_time,
        transport_confirmed_return_time: claimTarget.transport_return_time,
      } : {}),
    }).eq("id", claimTarget.id);
    setClaimSaving(false);
    setClaimTarget(null);
    if (!isAdmin) {
      await rememberAuthorPin(claimPrenom.trim(), claimNom.trim(), claimPin);
      // mySession n'est lu qu'au montage — sans ça, isMine() resterait faux
      // juste après cette prise en charge (PIN inédit sur ce téléphone) et
      // masquerait "C'est fait"/"Ajouter au calendrier".
      setMySession({ prenom: claimPrenom.trim(), nom: claimNom.trim(), pin: claimPin });
    }
    showToast("Merci ! Tu t'en occupes 💛");
    loadTasks();
  }

  // Se désinscrire d'un besoin Transport aller-retour ne libère que la
  // jambe de la personne qui se désinscrit quand aller et retour ont été
  // attribués séparément — l'autre jambe (et son preneur) reste intacte.
  // Sinon (besoin simple, ou même personne sur les deux jambes), tout est
  // libéré d'un coup comme avant.
  async function performUnclaim(task: Task, leg: "out" | "return" = "out") {
    const splitLegs = task.transport_round_trip && !!task.transport_return_claimed_by_prenom;
    if (splitLegs && leg === "return") {
      await supabase.from("tasks").update({
        status: "ouvert",
        transport_return_claimed_by_prenom: null,
        transport_return_claimed_by_nom: null,
        transport_return_claimed_by_pin: null,
        transport_confirmed_return_time: null,
      }).eq("id", task.id);
    } else if (splitLegs && leg === "out") {
      if (task.claimed_photo) {
        await supabase.storage.from(PHOTO_BUCKET).remove([`${spaceId}/${task.claimed_photo}`]);
      }
      await supabase.from("tasks").update({
        status: "ouvert",
        claimed_by_prenom: null,
        claimed_by_nom: null,
        claimed_by_pin: null,
        claimed_photo: null,
        claimed_text: null,
        transport_confirmed_out_time: null,
      }).eq("id", task.id);
    } else {
      if (task.claimed_photo) {
        await supabase.storage.from(PHOTO_BUCKET).remove([`${spaceId}/${task.claimed_photo}`]);
      }
      await supabase.from("tasks").update({
        status: "ouvert",
        claimed_by_prenom: null,
        claimed_by_nom: null,
        claimed_by_pin: null,
        claimed_photo: null,
        claimed_text: null,
        ...(task.category === "transport" ? {
          transport_confirmed_date: null,
          transport_confirmed_out_time: null,
          transport_confirmed_return_time: null,
        } : {}),
      }).eq("id", task.id);
    }
    showToast("Tu t'es désinscrit ✓");
    loadTasks();
  }

  async function openPinModal(task: Task, action: "unclaim", leg: "out" | "return" = "out") {
    const legPin = leg === "return" ? task.transport_return_claimed_by_pin : task.claimed_by_pin;
    if (!isAdmin && (await sessionPinMatches(legPin))) {
      Alert.alert(
        "Te désinscrire de cette tâche ?",
        task.title,
        [
          { text: "Annuler", style: "cancel" },
          { text: "Me désinscrire", style: "destructive", onPress: () => performUnclaim(task, leg) },
        ],
      );
      return;
    }
    setPinModal({ task, action, leg });
    setPinEntry(""); setPinError(false);
  }

  async function checkPin() {
    if (!pinModal) return;
    const legPin = pinModal.leg === "return" ? pinModal.task.transport_return_claimed_by_pin : pinModal.task.claimed_by_pin;
    if (pinEntry === legPin) {
      const { task, leg } = pinModal;
      setPinModal(null);
      await performUnclaim(task, leg);
    } else {
      setPinError(true);
      setPinEntry("");
    }
  }

  // ── Négociation d'horaire Transport ──────────────────────────────────
  // Un besoin "pris en charge" dont l'horaire confirmé (aller, ou retour
  // s'il y en a un) est déjà passé bascule visuellement en "Fait" — sans
  // toucher au statut réel en base, pour que "C'est fait" (avec photo)
  // reste possible ensuite si personne ne l'a cliqué.
  function transportOverdue(t: Task): boolean {
    if (t.category !== "transport" || t.status !== "pris_en_charge" || !t.transport_confirmed_date) return false;
    const time = t.transport_confirmed_return_time || t.transport_confirmed_out_time || "23:59";
    return new Date(`${t.transport_confirmed_date}T${time}:00`) < new Date();
  }

  async function openTransportPropose(t: Task) {
    setProposeTarget(t);
    setPDate(t.transport_date ?? "");
    if (t.transport_date) {
      const d = new Date(t.transport_date + "T12:00:00");
      setPCalMonth({ year: d.getFullYear(), month: d.getMonth() });
    }
    setPOutTime(t.transport_out_time ?? "");
    setPReturnTime(t.transport_return_time ?? "");
    setPIncludeOut(true);
    setPIncludeReturn(true);
    setPNote("");
    if (isAdmin) {
      const { data } = await supabase.auth.getUser();
      setPPrenom((data.user?.user_metadata?.firstname ?? "").trim());
      setPNom((data.user?.user_metadata?.lastname ?? "").trim());
    } else {
      setPPrenom(mySession?.prenom ?? "");
      setPNom(mySession?.nom ?? "");
    }
    // Pré-rempli depuis la session — le PIN choisi à la connexion, modifiable.
    setPPin(!isAdmin ? (mySession?.pin ?? "") : "");
  }

  async function submitTransportProposal() {
    if (!proposeTarget || !proposeFormReady) return;
    setProposeSaving(true);
    const includeReturn = !!proposeTarget.transport_round_trip && pIncludeReturn;
    const proposal: TransportProposal = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      prenom: pPrenom.trim(),
      nom: pNom.trim(),
      pin: isAdmin ? "ADMIN" : pPin,
      date: pDate,
      out_time: pIncludeOut ? pOutTime : null,
      return_time: includeReturn ? pReturnTime : null,
      offers_out: pIncludeOut,
      offers_return: includeReturn,
      note: pNote.trim() || null,
      created_at: new Date().toISOString(),
    };
    // Relit transport_proposals juste avant d'écrire pour limiter le risque
    // d'écraser une proposition envoyée entre-temps par quelqu'un d'autre
    // (pas de RPC dédiée pour un append atomique, l'app n'en a jamais eu besoin
    // jusqu'ici et le volume ici reste très faible).
    const { data, error: selectError } = await supabase
      .from("tasks").select("transport_proposals").eq("id", proposeTarget.id).single();
    if (selectError) {
      setProposeSaving(false);
      Alert.alert("Erreur", "Impossible de charger le besoin : " + selectError.message);
      return;
    }
    const current: TransportProposal[] = data?.transport_proposals ?? proposeTarget.transport_proposals ?? [];
    const { error: updateError } = await supabase
      .from("tasks").update({ transport_proposals: [...current, proposal] }).eq("id", proposeTarget.id);
    if (updateError) {
      setProposeSaving(false);
      Alert.alert("Erreur", "La proposition n'a pas pu être envoyée : " + updateError.message);
      return;
    }
    if (!isAdmin) {
      await rememberAuthorPin(pPrenom.trim(), pNom.trim(), pPin);
      setMySession({ prenom: pPrenom.trim(), nom: pNom.trim(), pin: pPin });
    }
    setProposeSaving(false);
    setProposeTarget(null);
    showToast("Proposition envoyée ✓");
    loadTasks();
  }

  // Valide une seule jambe (aller ou retour) d'une proposition — l'autre
  // jambe, si elle n'est pas déjà attribuée, reste ouverte aux autres
  // propositions. Le statut ne passe à "pris_en_charge" (et la liste de
  // propositions n'est vidée) qu'une fois les deux jambes attribuées (ou la
  // seule jambe, pour un besoin simple aller uniquement).
  async function validateTransportLeg(t: Task, p: TransportProposal, leg: "out" | "return") {
    const otherLegDone = leg === "out"
      ? (!t.transport_round_trip || !!t.transport_return_claimed_by_prenom)
      : !!t.claimed_by_prenom;
    const patch: Record<string, unknown> = { transport_confirmed_date: p.date };
    if (leg === "out") {
      patch.claimed_by_prenom = p.prenom;
      patch.claimed_by_nom = p.nom;
      patch.claimed_by_pin = p.pin;
      patch.transport_confirmed_out_time = p.out_time;
    } else {
      patch.transport_return_claimed_by_prenom = p.prenom;
      patch.transport_return_claimed_by_nom = p.nom;
      patch.transport_return_claimed_by_pin = p.pin;
      patch.transport_confirmed_return_time = p.return_time;
    }
    if (otherLegDone) {
      patch.status = "pris_en_charge";
      patch.transport_proposals = [];
    }
    await supabase.from("tasks").update(patch).eq("id", t.id);
    showToast(otherLegDone ? "Horaire validé ✓" : leg === "out" ? "Aller validé — en attente du retour" : "Retour validé — en attente de l'aller");
    if (otherLegDone) setProposalsTarget(null);
    loadTasks();
  }

  async function rejectTransportProposals(t: Task) {
    await supabase.from("tasks").update({ transport_proposals: [] }).eq("id", t.id);
    setProposalsTarget(null);
    showToast("Propositions écartées");
    loadTasks();
  }

  // Ajoute au calendrier natif la (ou les) jambe(s) que ce visiteur a lui-même
  // en charge — l'aller, le retour, ou les deux s'il a pris le besoin
  // directement via "Je m'en occupe". Pas de suivi de l'event créé (pas de
  // update/annulation prévue côté transport, contrairement aux réservations).
  async function handleAddTransportToCalendar(t: Task) {
    const legs = myTransportLegs(t);
    if (legs.length === 0) return;
    const session = !isAdmin ? await getVisitorSession() : null;
    let addedAny = false;
    for (const leg of legs) {
      const time = leg === "out" ? t.transport_confirmed_out_time : t.transport_confirmed_return_time;
      if (!t.transport_confirmed_date || !time) continue;
      const start = new Date(`${t.transport_confirmed_date}T${time}:00`);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const from = leg === "out" ? t.transport_from : t.transport_to;
      const to = leg === "out" ? t.transport_to : t.transport_from;
      const title = `Transport ${leg === "out" ? "aller" : "retour"} — ${t.title}`;
      const location = [from, to].filter(Boolean).join(" → ");
      const result = await addGenericEventToNativeCalendar(title, start, end, location, t.description || undefined, session?.email || null);
      if (result.ok) addedAny = true;
      else {
        Alert.alert("Calendrier", "Impossible d'ajouter l'événement : " + result.reason);
        return;
      }
    }
    if (addedAny) showToast("Ajouté à ton calendrier ✓");
  }

  function renderTask(t: Task) {
    const statusColors = STATUS_COLORS(C);
    const highlighted = highlightId === t.id;
    return (
      <View
        key={t.id}
        onLayout={(e) => { taskOffsets.current[t.id] = e.nativeEvent.layout.y; }}
        style={[
          styles.taskCard,
          { backgroundColor: C.card, borderColor: highlighted ? C.gold : (t.status === "fait" ? "rgba(122,143,166,0.2)" : C.border) },
          highlighted && { borderWidth: 2 },
        ]}
      >
        <View style={styles.taskHeader}>
          <View style={[styles.catBadge, { backgroundColor: `${C.accent}22` }]}>
            <Text style={styles.catIcon}>{CATEGORY_ICONS[t.category]}</Text>
            <Text style={[styles.catLabel, { color: C.accent }]}>{CATEGORY_LABELS[t.category]}</Text>
          </View>
          <View style={[styles.statusBadge, { borderColor: transportOverdue(t) ? statusColors.fait : statusColors[t.status] }]}>
            <Text style={[styles.statusLabel, { color: transportOverdue(t) ? statusColors.fait : statusColors[t.status] }]}>
              {transportOverdue(t) ? STATUS_LABELS.fait : STATUS_LABELS[t.status]}
            </Text>
          </View>
          {isAdmin && (
            <View style={{ flexDirection: "row", gap: 4 }}>
              <TouchableOpacity onPress={() => openEditTask(t)} style={[styles.iconBtn, { borderColor: C.border }]}>
                <Text style={{ fontSize: 13 }}>✏️</Text>
              </TouchableOpacity>
              {t.status !== "fait" && (
                <TouchableOpacity onPress={() => deleteTask(t)} style={[styles.iconBtn, { borderColor: "rgba(233,69,96,0.3)" }]}>
                  <Text style={{ fontSize: 13, color: "#e94560" }}>🗑️</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <Text style={[styles.taskTitle, { color: t.status === "fait" ? C.muted : C.text }]}>{t.title}</Text>
        {t.description ? (
          <Text style={[styles.taskDesc, { color: C.muted }]}>{t.description}</Text>
        ) : null}
        {t.photo && (
          <Image source={{ uri: taskPhotoUrl(spaceId, t.photo) }} style={styles.taskPhoto} resizeMode="cover" />
        )}

        {t.category === "transport" && (
          <View style={[styles.transportInfo, { borderColor: C.border, backgroundColor: `${C.gold}11` }]}>
            {(t.author_prenom || t.author_nom) && (
              <Text style={[styles.transportInfoText, { color: C.muted }]}>
                👤 Demandé par {t.author_prenom} {t.author_nom}
              </Text>
            )}
            {(t.transport_for_prenom || t.transport_for_nom) && (
              <Text style={[styles.transportInfoText, { color: C.muted }]}>
                Pour {t.transport_for_prenom} {t.transport_for_nom}
              </Text>
            )}
            <Text style={[styles.transportInfoText, { color: C.text }]}>
              📍 {t.transport_home_is_arrival ? t.transport_from : `${t.transport_from}${t.transport_home_city ? `, ${t.transport_home_city}` : ""}`}
              {" → "}
              {t.transport_home_is_arrival ? `${t.transport_to}${t.transport_home_city ? `, ${t.transport_home_city}` : ""}` : t.transport_to}
            </Text>
            {(t.transport_home_is_arrival ? t.transport_to : t.transport_from) ? (
              <TouchableOpacity
                onPress={() => {
                  const url = googleMapsSearchUrl(joinAddress({
                    street: t.transport_home_is_arrival ? t.transport_to : t.transport_from, line2: null,
                    postalCode: t.transport_home_postal_code, city: t.transport_home_city, country: t.transport_home_country,
                  }));
                  Linking.openURL(url).catch(() => {});
                }}
              >
                <Text style={[styles.transportInfoText, { color: C.gold, textDecorationLine: "underline" }]}>
                  🗺️ Voir le domicile ({t.transport_home_is_arrival ? "arrivée" : "départ"}) sur Google Maps
                </Text>
              </TouchableOpacity>
            ) : null}
            {t.transport_round_trip ? (
              <>
                <Text style={[styles.transportInfoText, { color: C.text }]}>
                  🕐 Aller : {t.transport_confirmed_out_time
                    ? `${slotLabel(t.transport_confirmed_date ?? t.transport_date ?? "", t.transport_confirmed_out_time)}${t.claimed_by_prenom ? ` — ${t.claimed_by_prenom} ${t.claimed_by_nom}` : ""}`
                    : `demandé ${t.transport_date && t.transport_out_time ? slotLabel(t.transport_date, t.transport_out_time) : "—"}`}
                </Text>
                <Text style={[styles.transportInfoText, { color: C.text }]}>
                  🕐 Retour : {t.transport_confirmed_return_time
                    ? `${t.transport_confirmed_return_time.replace(":", "h")}${
                        t.transport_return_claimed_by_prenom
                          ? ` — ${t.transport_return_claimed_by_prenom} ${t.transport_return_claimed_by_nom}`
                          : (t.status === "pris_en_charge" && t.claimed_by_prenom ? ` — ${t.claimed_by_prenom} ${t.claimed_by_nom}` : "")
                      }`
                    : `demandé ${t.transport_return_time ? t.transport_return_time.replace(":", "h") : "—"}`}
                </Text>
              </>
            ) : t.status === "ouvert" ? (
              <Text style={[styles.transportInfoText, { color: C.text }]}>
                🕐 Demandé : {t.transport_date && t.transport_out_time ? slotLabel(t.transport_date, t.transport_out_time) : "—"}
              </Text>
            ) : (
              <Text style={[styles.transportInfoText, { color: C.text }]}>
                🕐 Confirmé : {t.transport_confirmed_date && t.transport_confirmed_out_time ? slotLabel(t.transport_confirmed_date, t.transport_confirmed_out_time) : "—"}
              </Text>
            )}
            {t.transport_flexible && t.status === "ouvert" && (
              <Text style={[styles.transportFlexible, { color: C.gold }]}>🕊️ Horaires flexibles — d'autres créneaux peuvent convenir</Text>
            )}
          </View>
        )}

        {t.status !== "ouvert" && t.claimed_by_prenom && (!t.transport_round_trip || !t.transport_return_claimed_by_prenom) && (
          <View style={[styles.claimerRow, { borderColor: C.border, backgroundColor: `${C.accent}11` }]}>
            <Text style={[styles.claimerText, { color: C.text }]}>
              👤 {t.claimed_by_prenom} {t.claimed_by_nom} s'en occupe
            </Text>
            {t.claimed_photo && (
              <Image source={{ uri: taskPhotoUrl(spaceId, t.claimed_photo) }} style={styles.claimedPhoto} resizeMode="cover" />
            )}
            {t.claimed_text && (
              <Text style={[styles.claimerText, { color: C.muted, marginTop: 4 }]}>{t.claimed_text}</Text>
            )}
          </View>
        )}

        {t.status === "ouvert" && t.category !== "transport" && (
          <TouchableOpacity
            style={[styles.claimBtn, { backgroundColor: C.accent }]}
            onPress={() => openClaim(t)}
            activeOpacity={0.85}
          >
            <Text style={styles.claimBtnText}>🙋 Je m'en occupe</Text>
          </TouchableOpacity>
        )}

        {t.status === "ouvert" && t.category === "transport" && (
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            {!transportAnyLegClaimed(t) && (
              <TouchableOpacity
                style={[styles.claimBtn, { backgroundColor: C.accent, flex: 1, marginTop: 0 }]}
                onPress={() => openClaim(t)}
                activeOpacity={0.85}
              >
                <Text style={styles.claimBtnText}>🙋 Je m'en occupe</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.claimBtn,
                canManageTransport(t)
                  ? { backgroundColor: C.accent }
                  : { backgroundColor: C.card, borderWidth: 1, borderColor: C.accent },
                { flex: 1, marginTop: 0 },
              ]}
              onPress={() => canManageTransport(t) ? setProposalsTarget(t) : openTransportPropose(t)}
              activeOpacity={0.85}
            >
              <Text style={[styles.claimBtnText, canManageTransport(t) ? null : { color: C.accent }]}>
                {canManageTransport(t)
                  ? `🕐 Propositions${t.transport_proposals.length ? ` (${t.transport_proposals.length})` : ""}`
                  : "🕐 Proposition"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {t.status === "pris_en_charge" && !isAdmin && myTransportLegs(t).length > 0 && (
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <TouchableOpacity
              style={[styles.actionSmall, { borderColor: C.success, backgroundColor: `${C.success}18` }]}
              onPress={() => openDone(t)}
            >
              <Text style={[styles.actionSmallText, { color: C.success }]}>✓ C'est fait</Text>
            </TouchableOpacity>
            {myTransportLegs(t).length > 1 ? (
              <>
                <TouchableOpacity
                  style={[styles.actionSmall, { borderColor: C.border }]}
                  onPress={() => openPinModal(t, "unclaim", "out")}
                >
                  <Text style={[styles.actionSmallText, { color: C.muted }]}>Se désinscrire (aller)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionSmall, { borderColor: C.border }]}
                  onPress={() => openPinModal(t, "unclaim", "return")}
                >
                  <Text style={[styles.actionSmallText, { color: C.muted }]}>Se désinscrire (retour)</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.actionSmall, { borderColor: C.border }]}
                onPress={() => openPinModal(t, "unclaim", myTransportLegs(t)[0])}
              >
                <Text style={[styles.actionSmallText, { color: C.muted }]}>Se désinscrire</Text>
              </TouchableOpacity>
            )}
            {t.category === "transport" && (
              <TouchableOpacity
                style={[styles.actionSmall, { borderColor: C.gold, backgroundColor: `${C.gold}18` }]}
                onPress={() => handleAddTransportToCalendar(t)}
              >
                <Text style={[styles.actionSmallText, { color: C.gold }]}>📅 Ajouter au calendrier</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {t.status === "pris_en_charge" && isAdmin && (
          <TouchableOpacity
            style={[styles.actionSmall, { borderColor: C.success, backgroundColor: `${C.success}18`, marginTop: 10, alignSelf: "flex-start" }]}
            onPress={() => openDone(t)}
          >
            <Text style={[styles.actionSmallText, { color: C.success }]}>✓ Marquer fait</Text>
          </TouchableOpacity>
        )}

        {t.status === "fait" && t.done_photo && (
          <Image source={{ uri: taskPhotoUrl(spaceId, t.done_photo) }} style={styles.claimedPhoto} resizeMode="cover" />
        )}

        {t.status === "fait" && isAdmin && (
          <TouchableOpacity
            style={[styles.actionSmall, { borderColor: C.border, marginTop: 10, alignSelf: "flex-start" }]}
            onPress={() => adminSetStatus(t, "ouvert")}
          >
            <Text style={[styles.actionSmallText, { color: C.muted }]}>↩ Réouvrir</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const visibleTasks = activeCat ? tasks.filter((t) => t.category === activeCat) : tasks;

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <Text style={[styles.headerTitle, { color: C.text }]}>🤝 Entraide</Text>
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
          onPress={openCreateTask}
          activeOpacity={0.85}
        >
          <Text style={[styles.addBtnText, { color: "#fff" }]}>Publier</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.catTabsBar, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        {(Object.keys(CATEGORY_ICONS) as TaskCategory[]).map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.catTab,
              { backgroundColor: activeCat === cat ? C.accent : "transparent", borderColor: activeCat === cat ? C.accent : C.border },
            ]}
            onPress={() => setActiveCat((prev) => (prev === cat ? null : cat))}
            activeOpacity={0.75}
          >
            <Text style={styles.catTabIcon}>{CATEGORY_ICONS[cat]}</Text>
            <Text style={[styles.catTabLabel, { color: activeCat === cat ? "#fff" : C.text }]}>{CATEGORY_LABELS[cat]}</Text>
          </TouchableOpacity>
        ))}
        {/* "Tous" en dernier — seul sur sa ligne, centré (6 catégories sur 2
            lignes de 3 juste au-dessus). */}
        <TouchableOpacity
          style={[
            styles.catTab,
            { backgroundColor: activeCat === null ? C.accent : "transparent", borderColor: activeCat === null ? C.accent : C.border },
          ]}
          onPress={() => setActiveCat(null)}
          activeOpacity={0.75}
        >
          <Text style={styles.catTabIcon}>📋</Text>
          <Text style={[styles.catTabLabel, { color: activeCat === null ? "#fff" : C.text }]}>Tous</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.sectionBar, { borderBottomColor: C.border }]}>
        <Text style={[styles.sectionCount, { color: C.muted, marginBottom: 0 }]}>
          {tasks.filter((t) => t.status !== "fait").length} besoin{tasks.filter((t) => t.status !== "fait").length !== 1 ? "s" : ""} ouvert{tasks.filter((t) => t.status !== "fait").length !== 1 ? "s" : ""}
        </Text>
      </View>

      {tasksLoading ? (
        <View style={styles.centered}><ActivityIndicator color={C.accent} size="large" /></View>
      ) : visibleTasks.length === 0 ? (
        <View style={styles.centered}>
          <Text style={{ fontSize: 36, marginBottom: 12 }}>🤝</Text>
          <Text style={[styles.emptyText, { color: C.muted }]}>
            {activeCat ? `Aucun besoin dans ${CATEGORY_LABELS[activeCat]} pour l'instant.` : "Aucun besoin pour l'instant."}
          </Text>
          <Text style={[styles.emptyHint, { color: C.muted }]}>Crée un besoin si tu as besoin d'aide.</Text>
        </View>
      ) : (
        <ScrollView ref={scrollRef} contentContainerStyle={styles.listPad}>
          {visibleTasks.map(renderTask)}
        </ScrollView>
      )}

      {/* ── MODAL CRÉER / ÉDITER BESOIN ───────────────────────────────────── */}
      <Modal visible={taskForm} transparent animationType="slide" onRequestClose={() => setTaskForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => !taskSaving && setTaskForm(false)}>
            <ScrollView contentContainerStyle={styles.overlayScroll} keyboardShouldPersistTaps="handled">
              <TouchableOpacity activeOpacity={1}>
                <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.accent }]}>
                  <Text style={[styles.sheetTitle, { color: C.text }]}>
                    {editTask ? "✏️ Modifier le besoin" : "➕ Nouveau besoin"}
                  </Text>

                  <TextInput
                    style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                    placeholder="Titre du besoin *"
                    placeholderTextColor={C.muted}
                    value={fTitle}
                    onChangeText={setFTitle}
                    autoFocus
                  />
                  <TextInput
                    style={[styles.input, styles.descArea, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                    placeholder="Description (optionnelle)"
                    placeholderTextColor={C.muted}
                    value={fDesc}
                    onChangeText={setFDesc}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />

                  <Text style={[styles.fieldLabel, { color: C.gold }]}>Catégorie</Text>
                  <View style={styles.catGrid}>
                    {(Object.keys(CATEGORY_ICONS) as TaskCategory[]).map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.catOption,
                          {
                            backgroundColor: fCat === cat ? C.accent : C.bg,
                            borderColor: fCat === cat ? C.accent : C.border,
                          },
                        ]}
                        onPress={() => selectCategory(cat)}
                        activeOpacity={0.75}
                      >
                        <Text style={styles.catOptionIcon}>{CATEGORY_ICONS[cat]}</Text>
                        <Text style={[styles.catOptionLabel, { color: fCat === cat ? "#fff" : C.text }]}>
                          {CATEGORY_LABELS[cat]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {fCat === "repas" && !!allergies && (
                    <View style={[styles.allergyBanner, { backgroundColor: "rgba(233,69,96,0.1)", borderColor: "rgba(233,69,96,0.35)" }]}>
                      <Text style={[styles.allergyBannerText, { color: "#e94560" }]}>
                        ⚠️ Allergies du patient : {allergies}
                      </Text>
                    </View>
                  )}

                  {!editTask && fCat === "transport" && (
                    <View style={[styles.transportForm, { borderColor: C.border }]}>
                      <Text style={[styles.fieldLabel, { color: C.gold }]}>Départ *</Text>
                      {fTSwapped ? renderFixedCareLocation() : renderHomeAddressFields()}
                      <Text style={[styles.fieldLabel, { color: C.gold }]}>Arrivée *</Text>
                      {fTSwapped ? renderHomeAddressFields() : renderFixedCareLocation()}
                      <View style={styles.swapBtnRow}>
                        <TouchableOpacity
                          style={[styles.swapBtn, { backgroundColor: C.gold }]}
                          onPress={swapTransportDirection}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.swapBtnText}>⇄ Intervertir départ / arrivée</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={{ marginTop: 4 }}>
                        <SegmentedSwitch
                          value={fTRoundTrip}
                          onChange={setFTRoundTrip}
                          leftLabel="➡️ Aller simple"
                          rightLabel="🔁 Aller-retour"
                          C={C}
                          onThumbWidth={setTransportThumbWidth}
                        />
                      </View>

                      <View style={{ marginTop: 10 }}>
                        <SegmentedSwitch
                          value={!fTFlexible}
                          onChange={(v) => setFTFlexible(!v)}
                          leftLabel="🕊️ Flexible"
                          rightLabel="Horaire fixe"
                          C={C}
                          thumbWidth={transportThumbWidth || undefined}
                        />
                      </View>

                      <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 12 }]}>Date souhaitée *</Text>
                      <MiniCalendar
                        selDate={fTDate}
                        onSelect={handleTransportDateSelect}
                        calMonth={fTCalMonth}
                        onMonthChange={setFTCalMonth}
                        startDate={new Date()}
                        C={C}
                        size="lg"
                      />

                      <Text style={[styles.fieldLabel, { color: C.gold }]}>Heure aller *</Text>
                      <TimeClockPicker value={fTOutTime} onChange={setFTOutTime} C={C} />

                      {fTRoundTrip && (
                        <>
                          <Text style={[styles.fieldLabel, { color: C.gold }]}>Heure retour *</Text>
                          <TimeClockPicker value={fTReturnTime} onChange={setFTReturnTime} C={C} />
                        </>
                      )}

                      <TouchableOpacity
                        style={[
                          styles.claimOnCreateBtn,
                          {
                            backgroundColor: fTForSomeoneElse ? `${C.accent}22` : C.bg,
                            borderColor: fTForSomeoneElse ? C.accent : C.border,
                          },
                        ]}
                        onPress={() => setFTForSomeoneElse((v) => !v)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.claimOnCreateText, { color: fTForSomeoneElse ? C.accent : C.text }]}>
                          {fTForSomeoneElse ? "👤 Pour une autre personne" : "👤 Publier pour quelqu'un d'autre"}
                        </Text>
                      </TouchableOpacity>

                      {fTForSomeoneElse && (
                        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                          <TextInput
                            style={[styles.input, { flex: 1, backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                            placeholder="Son prénom *"
                            placeholderTextColor={C.muted}
                            value={fTForPrenom}
                            onChangeText={setFTForPrenom}
                            autoCapitalize="words"
                          />
                          <TextInput
                            style={[styles.input, { flex: 1, backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                            placeholder="Son nom *"
                            placeholderTextColor={C.muted}
                            value={fTForNom}
                            onChangeText={setFTForNom}
                            autoCapitalize="words"
                          />
                        </View>
                      )}
                    </View>
                  )}

                  {fCat !== "transport" && (
                    <>
                      <Text style={[styles.fieldLabel, { color: C.gold }]}>Photo (optionnelle)</Text>
                      {(fPhotoUri || fExistingPhoto) ? (
                        <View style={styles.photoPreviewRow}>
                          <Image
                            source={{ uri: fPhotoUri ?? taskPhotoUrl(spaceId, fExistingPhoto!) }}
                            style={styles.photoPreviewImg}
                            resizeMode="cover"
                          />
                          <TouchableOpacity
                            style={[styles.photoPickRemove, { backgroundColor: "#e94560" }]}
                            onPress={removeTaskPhoto}
                          >
                            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.photoPickAdd, { backgroundColor: C.bg, borderColor: C.border }]}
                          onPress={pickTaskPhoto}
                          disabled={pickingPhoto}
                        >
                          {pickingPhoto
                            ? <ActivityIndicator color={C.accent} size="small" />
                            : <Text style={[styles.photoPickAddText, { color: C.muted }]}>📷 Ajouter une photo</Text>
                          }
                        </TouchableOpacity>
                      )}
                    </>
                  )}

                  {!editTask && (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.claimOnCreateBtn,
                          {
                            backgroundColor: claimOnCreate ? `${C.accent}22` : C.bg,
                            borderColor: claimOnCreate ? C.accent : C.border,
                          },
                        ]}
                        onPress={toggleClaimOnCreate}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.claimOnCreateText, { color: claimOnCreate ? C.accent : C.text }]}>
                          {claimOnCreate ? "🙋 Tu t'en occupes déjà" : "🙋 Je vais me débrouiller"}
                        </Text>
                      </TouchableOpacity>

                      {claimOnCreate && (
                        <>
                          <Text style={[styles.claimOnCreateHint, { color: C.muted }]}>
                            Le besoin apparaîtra directement comme "Pris en charge" par toi.
                          </Text>

                          {!(claimPrenom.trim() && claimNom.trim()) && (
                            <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
                              <TextInput
                                style={[styles.input, { flex: 1, backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                                placeholder="Prénom *"
                                placeholderTextColor={C.muted}
                                value={claimPrenom}
                                onChangeText={setClaimPrenom}
                                autoCapitalize="words"
                              />
                              <TextInput
                                style={[styles.input, { flex: 1, backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                                placeholder="Nom *"
                                placeholderTextColor={C.muted}
                                value={claimNom}
                                onChangeText={setClaimNom}
                                autoCapitalize="words"
                              />
                            </View>
                          )}

                          {!isAdmin && (
                            <>
                              <Text style={[styles.fieldLabel, { color: C.gold }]}>
                                🔐 Code PIN (pour te désinscrire si besoin)
                              </Text>
                              <PinPad value={claimPin} onChange={setClaimPin} theme={C} />
                            </>
                          )}
                        </>
                      )}
                    </>
                  )}

                  <View style={styles.sheetBtns}>
                    <TouchableOpacity
                      onPress={() => setTaskForm(false)}
                      disabled={taskSaving}
                      style={[styles.btnSecondary, { borderColor: C.border }]}
                    >
                      <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={saveTask}
                      disabled={!fTitle.trim() || taskSaving || (!editTask && !claimOnCreateReady) || (!editTask && fCat === "transport" && !transportFormReady)}
                      style={[
                        styles.btnPrimary,
                        { backgroundColor: C.accent },
                        (!fTitle.trim() || taskSaving || (!editTask && !claimOnCreateReady) || (!editTask && fCat === "transport" && !transportFormReady)) && { opacity: 0.5 },
                      ]}
                    >
                      {taskSaving
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={styles.btnPrimaryText}>{editTask ? "Enregistrer" : "Créer"}</Text>
                      }
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL CLAIM ───────────────────────────────────────────────────── */}
      <Modal visible={!!claimTarget} transparent animationType="slide" onRequestClose={() => setClaimTarget(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => !claimSaving && setClaimTarget(null)}>
            <ScrollView contentContainerStyle={styles.overlayScroll} keyboardShouldPersistTaps="handled">
              <TouchableOpacity activeOpacity={1}>
                <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.accent }]}>
                  <View style={{ alignItems: "center", marginBottom: 14 }}>
                    <Text style={{ fontSize: 32, marginBottom: 6 }}>🙋</Text>
                    <Text style={[styles.sheetTitle, { color: C.text }]}>Je m'en occupe</Text>
                    {claimTarget && (
                      <Text style={[styles.sheetSub, { color: C.muted }]}>
                        {CATEGORY_ICONS[claimTarget.category]} {claimTarget.title}
                      </Text>
                    )}
                  </View>

                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TextInput
                      style={[styles.input, { flex: 1, backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                      placeholder="Prénom *"
                      placeholderTextColor={C.muted}
                      value={claimPrenom}
                      onChangeText={setClaimPrenom}
                      autoCapitalize="words"
                      autoFocus
                    />
                    <TextInput
                      style={[styles.input, { flex: 1, backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                      placeholder="Nom *"
                      placeholderTextColor={C.muted}
                      value={claimNom}
                      onChangeText={setClaimNom}
                      autoCapitalize="words"
                    />
                  </View>

                  {claimTarget?.category === "repas" && !!allergies && (
                    <View style={[styles.allergyBanner, { backgroundColor: "rgba(233,69,96,0.1)", borderColor: "rgba(233,69,96,0.35)" }]}>
                      <Text style={[styles.allergyBannerText, { color: "#e94560" }]}>
                        ⚠️ Allergies du patient : {allergies}
                      </Text>
                    </View>
                  )}

                  {claimTarget?.category !== "transport" && (
                    <>
                      <Text style={[styles.fieldLabel, { color: C.gold }]}>Photo (optionnelle)</Text>
                      {claimPhotoUri ? (
                        <View style={styles.photoPreviewRow}>
                          <Image source={{ uri: claimPhotoUri }} style={styles.photoPreviewImg} resizeMode="cover" />
                          <TouchableOpacity
                            style={[styles.photoPickRemove, { backgroundColor: "#e94560" }]}
                            onPress={removeClaimPhoto}
                          >
                            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.photoPickAdd, { backgroundColor: C.bg, borderColor: C.border }]}
                          onPress={pickClaimPhoto}
                          disabled={claimPickingPhoto}
                        >
                          {claimPickingPhoto
                            ? <ActivityIndicator color={C.accent} size="small" />
                            : <Text style={[styles.photoPickAddText, { color: C.muted }]}>📷 Ajouter une photo (ex : le plat préparé)</Text>
                          }
                        </TouchableOpacity>
                      )}
                    </>
                  )}

                  <TextInput
                    style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text, marginTop: 8 }]}
                    placeholder="Une précision (ou non)..."
                    placeholderTextColor={C.muted}
                    value={claimText}
                    onChangeText={setClaimText}
                    multiline
                  />

                  <View style={styles.sheetBtns}>
                    <TouchableOpacity
                      onPress={() => setClaimTarget(null)}
                      disabled={claimSaving}
                      style={[styles.btnSecondary, { borderColor: C.border }]}
                    >
                      <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleClaim}
                      disabled={!claimPrenom.trim() || !claimNom.trim() || claimPin.length < 4 || claimSaving}
                      style={[
                        styles.btnPrimary,
                        { backgroundColor: C.accent },
                        (!claimPrenom.trim() || !claimNom.trim() || claimPin.length < 4 || claimSaving) && { opacity: 0.5 },
                      ]}
                    >
                      {claimSaving
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={styles.btnPrimaryText}>Confirmer</Text>
                      }
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL PROPOSITION (transport, autre horaire) ────────────────────── */}
      <Modal visible={!!proposeTarget} transparent animationType="slide" onRequestClose={() => setProposeTarget(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => !proposeSaving && setProposeTarget(null)}>
            <ScrollView contentContainerStyle={styles.overlayScroll} keyboardShouldPersistTaps="handled">
              <TouchableOpacity activeOpacity={1}>
                <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.accent }]}>
                  <View style={{ alignItems: "center", marginBottom: 14 }}>
                    <Text style={{ fontSize: 32, marginBottom: 6 }}>🕐</Text>
                    <Text style={[styles.sheetTitle, { color: C.text }]}>Proposer un horaire</Text>
                    {proposeTarget && (
                      <Text style={[styles.sheetSub, { color: C.muted }]}>
                        Demandé : {proposeTarget.transport_date && proposeTarget.transport_out_time
                          ? slotLabel(proposeTarget.transport_date, proposeTarget.transport_out_time) : "—"}
                        {proposeTarget.transport_round_trip && proposeTarget.transport_return_time
                          ? ` · retour ${proposeTarget.transport_return_time.replace(":", "h")}` : ""}
                      </Text>
                    )}
                  </View>

                  <Text style={[styles.fieldLabel, { color: C.gold }]}>Date proposée</Text>
                  <MiniCalendar
                    selDate={pDate}
                    onSelect={setPDate}
                    calMonth={pCalMonth}
                    onMonthChange={setPCalMonth}
                    startDate={new Date()}
                    C={C}
                    size="lg"
                  />

                  {proposeTarget?.transport_round_trip && (
                    <View style={{ flexDirection: "row", gap: 8, marginBottom: 4 }}>
                      <TouchableOpacity
                        onPress={() => setPIncludeOut((v) => !v)}
                        style={[styles.legToggle, { borderColor: pIncludeOut ? C.accent : C.border, backgroundColor: pIncludeOut ? `${C.accent}22` : "transparent" }]}
                      >
                        <Text style={{ color: pIncludeOut ? C.accent : C.muted, fontFamily: "DM_Sans_600SemiBold", fontSize: 13 }}>
                          {pIncludeOut ? "☑" : "☐"} Aller
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setPIncludeReturn((v) => !v)}
                        style={[styles.legToggle, { borderColor: pIncludeReturn ? C.accent : C.border, backgroundColor: pIncludeReturn ? `${C.accent}22` : "transparent" }]}
                      >
                        <Text style={{ color: pIncludeReturn ? C.accent : C.muted, fontFamily: "DM_Sans_600SemiBold", fontSize: 13 }}>
                          {pIncludeReturn ? "☑" : "☐"} Retour
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {pIncludeOut && (
                    <>
                      <Text style={[styles.fieldLabel, { color: C.gold }]}>Heure aller</Text>
                      <TimeClockPicker value={pOutTime} onChange={setPOutTime} C={C} />
                    </>
                  )}

                  {proposeTarget?.transport_round_trip && pIncludeReturn && (
                    <>
                      <Text style={[styles.fieldLabel, { color: C.gold }]}>Heure retour</Text>
                      <TimeClockPicker value={pReturnTime} onChange={setPReturnTime} C={C} />
                    </>
                  )}

                  <TextInput
                    style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text, marginTop: 8 }]}
                    placeholder="Un mot pour expliquer (optionnel)"
                    placeholderTextColor={C.muted}
                    value={pNote}
                    onChangeText={setPNote}
                    multiline
                  />

                  {!(pPrenom.trim() && pNom.trim()) && (
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                      <TextInput
                        style={[styles.input, { flex: 1, backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                        placeholder="Prénom *"
                        placeholderTextColor={C.muted}
                        value={pPrenom}
                        onChangeText={setPPrenom}
                        autoCapitalize="words"
                      />
                      <TextInput
                        style={[styles.input, { flex: 1, backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                        placeholder="Nom *"
                        placeholderTextColor={C.muted}
                        value={pNom}
                        onChangeText={setPNom}
                        autoCapitalize="words"
                      />
                    </View>
                  )}

                  <View style={styles.sheetBtns}>
                    <TouchableOpacity
                      onPress={() => setProposeTarget(null)}
                      disabled={proposeSaving}
                      style={[styles.btnSecondary, { borderColor: C.border }]}
                    >
                      <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={submitTransportProposal}
                      disabled={!proposeFormReady || proposeSaving}
                      style={[
                        styles.btnPrimary,
                        { backgroundColor: C.accent },
                        (!proposeFormReady || proposeSaving) && { opacity: 0.5 },
                      ]}
                    >
                      {proposeSaving
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={styles.btnPrimaryText}>Proposer</Text>
                      }
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL PROPOSITIONS REÇUES (demandeur/admin consulte et valide) ──── */}
      <Modal visible={!!proposalsTarget} transparent animationType="slide" onRequestClose={() => setProposalsTarget(null)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setProposalsTarget(null)}>
            <ScrollView contentContainerStyle={styles.overlayScroll} keyboardShouldPersistTaps="handled">
              <TouchableOpacity activeOpacity={1}>
                <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.accent }]}>
                  <View style={{ alignItems: "center", marginBottom: 14 }}>
                    <Text style={{ fontSize: 32, marginBottom: 6 }}>🕐</Text>
                    <Text style={[styles.sheetTitle, { color: C.text }]}>Propositions reçues</Text>
                  </View>

                  {proposalsTarget && proposalsTarget.transport_proposals.length === 0 && (
                    <Text style={[styles.sheetSub, { color: C.muted, textAlign: "center" }]}>
                      Aucune proposition pour l'instant.
                    </Text>
                  )}

                  {proposalsTarget?.transport_proposals.map((p) => {
                    const offersOut = p.offers_out ?? true;
                    const offersReturn = p.offers_return ?? !!p.return_time;
                    const outDone = !!proposalsTarget.claimed_by_prenom;
                    const returnDone = !!proposalsTarget.transport_return_claimed_by_prenom;
                    return (
                      <View key={p.id} style={[styles.proposalRow, { borderColor: C.border }]}>
                        <Text style={[styles.proposalText, { color: C.text }]}>👤 {p.prenom} {p.nom}</Text>
                        {offersOut && (
                          <Text style={[styles.proposalText, { color: C.text }]}>
                            Aller : {p.out_time ? slotLabel(p.date, p.out_time) : "—"}
                          </Text>
                        )}
                        {offersReturn && (
                          <Text style={[styles.proposalText, { color: C.text }]}>
                            Retour : {p.return_time ? p.return_time.replace(":", "h") : "—"}
                          </Text>
                        )}
                        {p.note && <Text style={[styles.proposalNote, { color: C.muted }]}>{p.note}</Text>}
                        <View style={{ flexDirection: "row", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                          {offersOut && !outDone && (
                            <TouchableOpacity
                              style={[styles.actionSmall, { borderColor: C.success, backgroundColor: `${C.success}18` }]}
                              onPress={() => validateTransportLeg(proposalsTarget, p, "out")}
                            >
                              <Text style={[styles.actionSmallText, { color: C.success }]}>✓ Valider l'aller</Text>
                            </TouchableOpacity>
                          )}
                          {proposalsTarget.transport_round_trip && offersReturn && !returnDone && (
                            <TouchableOpacity
                              style={[styles.actionSmall, { borderColor: C.success, backgroundColor: `${C.success}18` }]}
                              onPress={() => validateTransportLeg(proposalsTarget, p, "return")}
                            >
                              <Text style={[styles.actionSmallText, { color: C.success }]}>✓ Valider le retour</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}

                  {proposalsTarget && proposalsTarget.transport_proposals.length > 0 && (
                    <TouchableOpacity
                      style={[styles.actionSmall, { borderColor: C.border, marginTop: 10, alignSelf: "flex-start" }]}
                      onPress={() => rejectTransportProposals(proposalsTarget)}
                    >
                      <Text style={[styles.actionSmallText, { color: C.muted }]}>Aucune ne convient</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={() => setProposalsTarget(null)}
                    style={[styles.btnSecondary, { borderColor: C.border, marginTop: 14 }]}
                  >
                    <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Fermer</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── MODAL PIN (désinscrire) ────────────────────────── */}
      <Modal visible={!!pinModal} transparent animationType="fade" onRequestClose={() => setPinModal(null)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.accent }]}>
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 32, marginBottom: 6 }}>🔐</Text>
              <Text style={[styles.sheetTitle, { color: C.text }]}>Confirmer avec ton PIN</Text>
              <Text style={[styles.sheetSub, { color: C.muted }]}>
                Saisis ton PIN pour te désinscrire de ce besoin.
              </Text>
            </View>

            {pinModal && (
              <View style={[styles.pinContext, { backgroundColor: C.bg, borderColor: C.border }]}>
                <Text style={[styles.pinContextText, { color: C.text }]}>
                  {CATEGORY_ICONS[pinModal.task.category]} {pinModal.task.title}
                </Text>
                <Text style={[styles.pinContextSub, { color: C.muted }]}>
                  Pris en charge par {pinModal.leg === "return"
                    ? `${pinModal.task.transport_return_claimed_by_prenom} ${pinModal.task.transport_return_claimed_by_nom}`
                    : `${pinModal.task.claimed_by_prenom} ${pinModal.task.claimed_by_nom}`}
                </Text>
              </View>
            )}

            <PinPad value={pinEntry} onChange={setPinEntry} theme={C} hasError={pinError} />

            {pinError && (
              <Text style={[styles.pinErrorText, { color: "#e94560" }]}>PIN incorrect.</Text>
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
                  { backgroundColor: C.accent },
                  pinEntry.length < 4 && { opacity: 0.5 },
                ]}
              >
                <Text style={styles.btnPrimaryText}>Me désinscrire</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL "Fait" (photo optionnelle + PIN si visiteur) ─────────────── */}
      <Modal visible={!!doneTarget} transparent animationType="fade" onRequestClose={() => setDoneTarget(null)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.success }]}>
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 32, marginBottom: 6 }}>✓</Text>
              <Text style={[styles.sheetTitle, { color: C.text }]}>Marquer comme fait</Text>
              <Text style={[styles.sheetSub, { color: C.muted }]}>
                Tu peux ajouter une photo (optionnel).
              </Text>
            </View>

            {donePhotoUri ? (
              <View style={styles.photoPreviewRow}>
                <Image source={{ uri: donePhotoUri }} style={styles.photoPreviewImg} resizeMode="cover" />
                <TouchableOpacity onPress={removeDonePhoto} style={[styles.photoPickRemove, { backgroundColor: "#e94560" }]}>
                  <Text style={{ color: "#fff", fontSize: 12 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={pickDonePhoto}
                disabled={donePickingPhoto}
                style={[styles.photoPickAdd, { backgroundColor: C.bg, borderColor: C.border }]}
              >
                {donePickingPhoto
                  ? <ActivityIndicator color={C.accent} size="small" />
                  : <Text style={[styles.photoPickAddText, { color: C.muted }]}>📷 Ajouter une photo</Text>
                }
              </TouchableOpacity>
            )}

            {!isAdmin && !donePinVerified && (
              <>
                <Text style={[styles.sheetSub, { color: C.muted, marginTop: 16 }]}>
                  Saisis ton PIN pour confirmer.
                </Text>
                <PinPad value={donePin} onChange={setDonePin} theme={C} hasError={donePinError} />
                {donePinError && (
                  <Text style={[styles.pinErrorText, { color: "#e94560" }]}>PIN incorrect.</Text>
                )}
              </>
            )}

            <View style={[styles.sheetBtns, { marginTop: 16 }]}>
              <TouchableOpacity
                onPress={() => setDoneTarget(null)}
                disabled={doneSaving}
                style={[styles.btnSecondary, { borderColor: C.border }]}
              >
                <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmDone}
                disabled={doneSaving || (!isAdmin && !donePinVerified && donePin.length < 4)}
                style={[
                  styles.btnPrimary,
                  { backgroundColor: C.success },
                  (doneSaving || (!isAdmin && !donePinVerified && donePin.length < 4)) && { opacity: 0.5 },
                ]}
              >
                {doneSaving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.btnPrimaryText}>✓ Fait !</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
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
  emptyText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 15, textAlign: "center", marginBottom: 6 },
  emptyHint: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center" },

  header: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18 },
  subHeader: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  subHeaderRow: { flexDirection: "row", gap: 10 },
  addBtn: { flex: 1, minWidth: 0, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  addBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#0D1B2E" },

  catTabsBar: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", paddingHorizontal: 10, paddingVertical: 10, gap: 8, borderBottomWidth: 1 },
  catTab: { width: "31%", borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 4, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  catTabIcon: { fontSize: 13 },
  catTabLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, textAlign: "center" },

  sectionBar: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  sectionCount: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginBottom: 8 },

  listPad: { padding: 14, paddingBottom: 40 },

  taskCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  taskHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" },
  catBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  catIcon: { fontSize: 14 },
  catLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11 },
  statusBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11 },
  iconBtn: { width: 30, height: 30, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  taskTitle: { fontFamily: "DM_Sans_700Bold", fontSize: 15, marginBottom: 4 },
  taskDesc: { fontFamily: "DM_Sans_400Regular", fontSize: 13, lineHeight: 20, marginBottom: 6 },
  taskPhoto: { width: "100%", height: 140, borderRadius: 10, marginBottom: 6 },
  claimerRow: { borderWidth: 1, borderRadius: 8, padding: 8, marginVertical: 8 },
  claimerText: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },
  claimedPhoto: { width: "100%", height: 120, borderRadius: 8, marginTop: 8 },
  claimBtn: { borderRadius: 10, paddingVertical: 10, alignItems: "center", marginTop: 8 },
  claimBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 13, color: "#fff" },
  actionSmall: { borderWidth: 1, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 14 },
  actionSmallText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
  legToggle: { borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },

  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontFamily: "DM_Sans_400Regular", fontSize: 15, marginBottom: 10 },
  descArea: { height: 80, textAlignVertical: "top" },
  fieldLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 },
  transportHint: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginBottom: 8, marginTop: -4 },
  fixedLocationBox: { justifyContent: "center" },
  catGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginBottom: 4 },
  catOption: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 6, minWidth: "45%" },
  catOptionIcon: { fontSize: 16 },
  catOptionLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },

  allergyBanner: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 4, marginBottom: 10 },
  allergyBannerText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, lineHeight: 19 },

  transportForm: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 },
  transportInfo: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 8, gap: 4 },
  transportInfoText: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },
  swapBtnRow: { alignItems: "center", marginBottom: 10 },
  swapBtn: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16 },
  swapBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 13, color: "#0D1B2E", textAlign: "center" },
  transportFlexible: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, marginTop: 2 },
  proposalRow: { borderTopWidth: 1, paddingTop: 8, marginTop: 2 },
  proposalText: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },
  proposalNote: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2, fontStyle: "italic" },

  photoPreviewRow: { position: "relative", marginBottom: 4 },
  photoPreviewImg: { width: "100%", height: 140, borderRadius: 10 },
  photoPickRemove: { position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  photoPickAdd: { borderWidth: 1, borderStyle: "dashed", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginBottom: 4 },
  photoPickAddText: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },

  claimOnCreateBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 10 },
  claimOnCreateText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  claimOnCreateHint: { fontFamily: "DM_Sans_400Regular", fontSize: 12, lineHeight: 17, marginTop: 8, marginBottom: 10, textAlign: "center" },

  pinContext: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 16 },
  pinContextText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  pinContextSub: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 4 },
  pinErrorText: { fontFamily: "DM_Sans_400Regular", fontSize: 12, textAlign: "center", marginTop: 8 },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "flex-end" },
  overlayScroll: { flexGrow: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, padding: 20, paddingBottom: 40 },
  sheetTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 4 },
  sheetSub: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginBottom: 4, textAlign: "center" },
  sheetBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
  btnPrimary: { flex: 1.3, borderRadius: 10, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  btnPrimaryText: { fontFamily: "DM_Sans_700Bold", fontSize: 15, color: "#fff" },
  btnSecondary: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  btnSecondaryText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },

  toast: { position: "absolute", bottom: 24, alignSelf: "center", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  toastText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, color: "#fff" },
});
