import { useEffect, useMemo, useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, TextInput, Alert,
  Modal, KeyboardAvoidingView, Platform, Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { File } from "expo-file-system";
import { useSpace } from "@/lib/SpaceContext";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { supabase } from "@/lib/supabase";
import { updateLinkedCalendarEvent } from "@/lib/calendarSync";
import PatientAvatar from "@/components/PatientAvatar";
import PinPad from "@/components/PinPad";
import SegmentedSwitch from "@/components/SegmentedSwitch";
import MyChecklist from "@/components/MyChecklist";
import MyRelaisCommitments from "@/components/MyRelaisCommitments";
import MyAlertsModal from "@/components/MyAlertsModal";
import PatientProfileModal from "@/components/PatientProfileModal";
import VisitorsListModal from "@/components/VisitorsListModal";
import { isRgpdAlertActive, rgpdAlertMessage, prolongSpace } from "@/lib/rgpd";
import { disengageTask as performDisengage } from "@/lib/taskDisengage";
import ConfirmModal from "@/components/ConfirmModal";
import RecurringBookingModal from "@/components/RecurringBookingModal";
import { fetchOpenRelaisAlerts, fetchMyRelaisCoverageHistory, type RelaisCoverageSummary } from "@/lib/relaisAlerts";
import type { Reservation, ReservationChangeHistoryEntry, NewsEntry, SupportMessage, Task } from "@/lib/types";

const CAT_ICONS: Record<Task["category"], string> = {
  repas: "🍽️",
  affaires: "👕",
  courses: "🛒",
  transport: "🚗",
  administratif: "🗂️",
  autre: "💡",
  relais: "🆘",
};

type ContribKey = "resv" | "news" | "soutien" | "besoins";
// Libellés harmonisés avec SECTION_META côté visiteur (app/(visitor)/account.tsx)
// — même vocabulaire des deux côtés de l'App.
const CONTRIB_META: Record<ContribKey, { icon: string; label: string }> = {
  resv: { icon: "📅", label: "Mes réservations" },
  news: { icon: "📰", label: "Mes nouvelles" },
  soutien: { icon: "💛", label: "Soutien" },
  besoins: { icon: "🤝", label: "Entraide" },
};

const SHEET_MAX_HEIGHT = Dimensions.get("window").height * 0.72;

export default function AdminAccountScreen() {
  const router = useRouter();
  const {
    space, loading, hasSpace, getConfigForDate, patchSpace,
    slotConfig, slots, reservations: allReservations, refreshReservations,
  } = useSpace();
  const { mode, theme: C, setMode } = useDisplayMode();

  const [activityLoading, setActivityLoading] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  // "Réservations récurrentes" — même modale que côté visiteur (voir
  // components/RecurringBookingModal.tsx), l'admin agissant ici comme un
  // visiteur qui réserve pour lui-même. `allReservations`/`refreshReservations`
  // viennent du SpaceContext (toutes les réservations de l'espace, pas
  // seulement celles de l'admin) — nécessaires pour calculer l'occupation
  // des créneaux, contrairement à `reservations` ci-dessus qui ne sert qu'à
  // "Mes contributions".
  const [recurringModalVisible, setRecurringModalVisible] = useState(false);
  const [changeHistory, setChangeHistory] = useState<ReservationChangeHistoryEntry[]>([]);
  const [alertsModalVisible, setAlertsModalVisible] = useState(false);
  const [patientProfileVisible, setPatientProfileVisible] = useState(false);
  const [visitorsListVisible, setVisitorsListVisible] = useState(false);
  const [news, setNews] = useState<NewsEntry[]>([]);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  // Besoins pris en charge personnellement par l'admin (agissant comme un
  // visiteur) — même liste/geste que myTasks côté visiteur, voir disengageTask.
  const [myClaimedTasks, setMyClaimedTasks] = useState<Task[]>([]);
  // Besoins de relais ouverts ciblant l'admin — voir lib/relaisAlerts.ts,
  // même source que le popup RelaisAlertModal, ici consultable à tout moment.
  const [relaisAlerts, setRelaisAlerts] = useState<Task[]>([]);
  // Besoins de relais déjà pris en charge (en tout ou partie) par l'admin —
  // sortis de relaisAlerts ci-dessus, affichés dans "Historique".
  const [relaisCoverageHistory, setRelaisCoverageHistory] = useState<RelaisCoverageSummary[]>([]);
  const [desengageTarget, setDesengageTarget] = useState<Task | null>(null);
  const [desengageSaving, setDesengageSaving] = useState(false);
  async function confirmDesengage() {
    if (!desengageTarget) return;
    setDesengageSaving(true);
    await performDisengage(desengageTarget);
    setDesengageSaving(false);
    setDesengageTarget(null);
    showToast("Tu t'es désengagé ✓");
    if (space) loadActivity(space.id, adminFirstname, adminLastname);
  }

  // ── Profil admin (distinct du patient — auth.users + user_metadata) ────────
  const [profileLoading, setProfileLoading] = useState(true);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminFirstname, setAdminFirstname] = useState("");
  const [adminLastname, setAdminLastname] = useState("");
  const [adminPin, setAdminPin] = useState("");
  const [adminPhotoUrl, setAdminPhotoUrl] = useState<string | null>(null);
  const [adminMotto, setAdminMotto] = useState("");
  const [pinRevealed, setPinRevealed] = useState(false);

  const [editProfileModal, setEditProfileModal] = useState(false);
  const [tempFirstname, setTempFirstname] = useState("");
  const [tempLastname, setTempLastname] = useState("");
  const [tempMotto, setTempMotto] = useState("");
  const [tempPin, setTempPin] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  const [changePasswordModal, setChangePasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // "Se déconnecter" et "Supprimer la photo" partagent la même modale
  // stylée plutôt qu'une Alert native pour l'une et une modale custom pour
  // l'autre (cf. handleLogout/handleRemoveAdminPhoto plus bas).
  const [confirmModal, setConfirmModal] = useState<"logout" | "removePhoto" | null>(null);

  const [toast, setToast] = useState("");
  const [activeContrib, setActiveContrib] = useState<ContribKey | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [pinTileOpen, setPinTileOpen] = useState(false);
  const [tempEmail, setTempEmail] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2800);
  }

  useEffect(() => {
    loadAdminProfile();
  }, []);

  async function loadAdminProfile() {
    setProfileLoading(true);
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (user) {
      setAdminUserId(user.id);
      setAdminEmail(user.email ?? "");
      setAdminFirstname(user.user_metadata?.firstname ?? "");
      setAdminLastname(user.user_metadata?.lastname ?? "");
      setAdminPin(user.user_metadata?.pin ?? "");
      setAdminPhotoUrl(user.user_metadata?.photo_url ?? null);
      setAdminMotto(user.user_metadata?.motto ?? "");
    }
    setProfileLoading(false);
  }

  function handleOpenEditProfile() {
    setTempFirstname(adminFirstname);
    setTempLastname(adminLastname);
    setTempEmail(adminEmail);
    setTempMotto(adminMotto);
    setTempPin(adminPin);
    setPinRevealed(false);
    setPinTileOpen(false);
    setEditProfileModal(true);
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    const emailChanged = tempEmail.trim() !== adminEmail;
    const { error } = await supabase.auth.updateUser({
      ...(emailChanged ? { email: tempEmail.trim() } : {}),
      data: {
        firstname: tempFirstname.trim(),
        lastname: tempLastname.trim(),
        motto: tempMotto.trim() || null,
        pin: tempPin,
      },
    });
    setSavingProfile(false);
    if (error) {
      showToast("Erreur lors de la sauvegarde.");
      return;
    }
    setAdminFirstname(tempFirstname.trim());
    setAdminLastname(tempLastname.trim());
    setAdminMotto(tempMotto.trim());
    setAdminPin(tempPin);

    // Recopie PIN + nom dans patient_spaces : dénormalisés depuis
    // user_metadata pour être consultables via l'API publique / le dashboard
    // Supabase (auth.users n'est pas exposé), même principe que admin_email
    // (migration 20260726_patient_spaces_admin_email.sql). admin_firstname/
    // admin_lastname ne sont sinon renseignés qu'une fois, à la création de
    // l'espace (PatientOnboarding.tsx) — sans cette recopie, ils restent
    // figés à cette valeur initiale (potentiellement vide) même après que
    // l'admin renseigne ou modifie son nom ici, ce qui fait dégénérer
    // isMyReservation() vers un simple match de PIN (non fiable, PIN pas
    // garanti unique dans l'espace) côté calendrier admin.
    if (adminUserId) {
      await supabase
        .from("patient_spaces")
        .update({
          admin_pin: tempPin || null,
          admin_firstname: tempFirstname.trim() || null,
          admin_lastname: tempLastname.trim() || null,
        })
        .eq("admin_id", adminUserId);
    }

    showToast(emailChanged ? "Profil mis à jour ✓ Vérifie tes emails pour confirmer la nouvelle adresse." : "Profil mis à jour ✓");
    setEditProfileModal(false);
  }

  async function handleAdminPhotoUpload() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission refusée", "Autorise l'accès à la galerie dans les paramètres.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (result.canceled || !result.assets[0] || !adminUserId) return;

    setPhotoUploading(true);
    try {
      const compressed = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 400 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
      );

      const fileData = await new File(compressed.uri).arrayBuffer();
      const storagePath = `${adminUserId}/photo.jpg`;

      const { error: uploadErr } = await supabase.storage
        .from("admin-photos")
        .upload(storagePath, fileData, {
          contentType: "image/jpeg",
          cacheControl: "0",
          upsert: true,
        });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("admin-photos")
        .getPublicUrl(storagePath);

      const photoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateErr } = await supabase.auth.updateUser({
        data: { photo_url: photoUrl },
      });
      if (updateErr) throw updateErr;

      setAdminPhotoUrl(photoUrl);
      showToast("Photo mise à jour ✓");
    } catch (e: any) {
      showToast("Erreur : " + (e?.message ?? "inconnue"));
    }
    setPhotoUploading(false);
  }

  function handleRemoveAdminPhoto() {
    if (!adminPhotoUrl || !adminUserId) return;
    setConfirmModal("removePhoto");
  }

  async function confirmRemoveAdminPhoto() {
    setConfirmModal(null);
    if (!adminUserId) return;
    await supabase.storage.from("admin-photos").remove([`${adminUserId}/photo.jpg`]);
    await supabase.auth.updateUser({ data: { photo_url: null } });
    setAdminPhotoUrl(null);
    showToast("Photo supprimée ✓");
  }

  function handleOpenChangePassword() {
    setNewPassword("");
    setConfirmPassword("");
    setChangePasswordModal(true);
  }

  async function handleChangePassword() {
    if (newPassword.length < 6) {
      showToast("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      showToast("Erreur : " + error.message);
      return;
    }
    showToast("Mot de passe modifié ✓");
    setChangePasswordModal(false);
  }

  useEffect(() => {
    if (!space || profileLoading) return;
    loadActivity(space.id, adminFirstname, adminLastname);
  }, [space?.id, profileLoading, adminFirstname, adminLastname]); // eslint-disable-line react-hooks/exhaustive-deps

  // L'admin est aussi un visiteur (il peut réserver des créneaux comme
  // n'importe qui) : "Mes réservations" ne doit montrer que les siennes,
  // même principe que côté visiteur (app/(visitor)/account.tsx) — matching
  // par prénom/nom, plus booked_by_* pour les réservations faites par
  // l'admin au nom d'un proche.
  async function loadActivity(spaceId: string, p: string, n: string) {
    setActivityLoading(true);
    const hasIdentity = !!p.trim() && !!n.trim();
    const [resv, resvBookedFor, newsData, msgs, tasksData, claimedTasksData, changeHistoryData] = await Promise.all([
      hasIdentity
        ? supabase.from("reservations").select("*").eq("space_id", spaceId)
            .ilike("prenom", p.trim()).ilike("nom", n.trim()).order("date", { ascending: false })
        : Promise.resolve({ data: [] as Reservation[] }),
      hasIdentity
        ? supabase.from("reservations").select("*").eq("space_id", spaceId)
            .ilike("booked_by_prenom", p.trim()).ilike("booked_by_nom", n.trim()).order("date", { ascending: false })
        : Promise.resolve({ data: [] as Reservation[] }),
      supabase.from("news_entries").select("*").eq("space_id", spaceId).eq("author_pin", "ADMIN").order("created_at", { ascending: false }),
      supabase.from("support_messages").select("*").eq("space_id", spaceId).eq("author_pin", "ADMIN").order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").eq("space_id", spaceId).eq("created_by", "admin").order("created_at", { ascending: false }),
      hasIdentity
        ? supabase.from("tasks").select("*").eq("space_id", spaceId)
            .ilike("claimed_by_prenom", p.trim()).ilike("claimed_by_nom", n.trim()).order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as Task[] }),
      hasIdentity
        ? supabase.from("reservation_change_history").select("*").eq("space_id", spaceId)
            .ilike("prenom", p.trim()).ilike("nom", n.trim()).order("changed_at", { ascending: false })
        : Promise.resolve({ data: [] as ReservationChangeHistoryEntry[] }),
    ]);
    const bookedForIds = new Set((resv.data || []).map((r: Reservation) => r.id));
    const myResv = [
      ...(resv.data || []),
      ...((resvBookedFor.data || []).filter((r: Reservation) => !bookedForIds.has(r.id))),
    ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    setReservations(myResv);
    setNews(newsData.data || []);
    setMessages(msgs.data || []);
    setTasks(tasksData.data || []);
    setMyClaimedTasks(claimedTasksData.data || []);
    setChangeHistory(changeHistoryData.data || []);
    setActivityLoading(false);
    try {
      const relais = await fetchOpenRelaisAlerts(spaceId, true, { prenom: p, nom: n });
      setRelaisAlerts(relais);
    } catch (e) {
      console.error("[loadActivity] fetchOpenRelaisAlerts failed:", e);
    }
    try {
      const coverageHistory = await fetchMyRelaisCoverageHistory(spaceId, { prenom: p, nom: n });
      setRelaisCoverageHistory(coverageHistory);
    } catch (e) {
      console.error("[loadActivity] fetchMyRelaisCoverageHistory failed:", e);
    }
  }

  // Alertes actives = réservations "Visite"/"Nuit" de l'admin lui-même
  // recasées/annulées par une intervention prioritaire ou un changement de
  // règles — voir MyAlertsModal et son usage côté visiteur (app/(visitor)/account.tsx).
  // Triées par date/créneau croissants : la première à venir en premier.
  const myActiveAlerts = reservations
    .filter((r) => r.alert_message && !r.alert_seen)
    .sort((a, b) => (a.date === b.date ? a.creneau.localeCompare(b.creneau) : a.date.localeCompare(b.date)));

  // "🔔 Mes alertes" ne doit montrer que l'historique jamais vu (pas tout
  // reservation_change_history, qui ne s'efface jamais). Marqué vu
  // uniquement sur clic explicite "Marquer comme lu" (voir
  // handleHistorySeen) — pas à la fermeture du popup, sinon un admin qui
  // ouvre "Mes alertes" pour un tout autre motif perd ses alertes de
  // changement de créneau sans les avoir lues.
  const unseenChangeHistory = changeHistory.filter((h) => !h.seen);

  async function handleHistorySeen(h: ReservationChangeHistoryEntry) {
    setChangeHistory((prev) => prev.map((e) => (e.id === h.id ? { ...e, seen: true } : e)));
    await supabase.from("reservation_change_history").update({ seen: true }).eq("id", h.id);
  }

  // Alerte RGPD (conservation des données proche de l'échéance) — voir
  // lib/rgpd.ts et RgpdAlertModal.tsx pour le popup équivalent à l'ouverture
  // de l'app. Comptée dans le badge "Mes alertes" au même titre que les
  // recasages/annulations.
  const [rgpdProlonging, setRgpdProlonging] = useState(false);
  const rgpdAlertActive = !!space && isRgpdAlertActive(space);
  const alertsBadgeCount = myActiveAlerts.length + relaisAlerts.length + (rgpdAlertActive ? 1 : 0);

  async function handleRgpdProlong() {
    if (!space) return;
    setRgpdProlonging(true);
    const patch = await prolongSpace(space);
    setRgpdProlonging(false);
    if (patch) patchSpace(patch);
  }

  function handleAlertModify(r: Reservation) {
    if (r.type === "Nuit") {
      router.push({ pathname: "/(admin)/home/nights", params: { focusDate: r.date } } as any);
    } else {
      router.push({ pathname: "/(admin)/home/slots", params: { focusDate: r.date } } as any);
    }
  }

  async function handleAlertMarkSeen(r: Reservation) {
    await supabase.from("reservations").update({ alert_seen: true }).eq("id", r.id);
    const config = getConfigForDate(r.date);
    if (r.alert_type === "rebooked" && config) {
      await updateLinkedCalendarEvent(r.id, r.date, r.creneau, r.type, config);
    }
    if (space) loadActivity(space.id, adminFirstname, adminLastname);
  }

  function handleClaimRelais(t: Task) {
    setRelaisAlerts((prev) => prev.filter((x) => x.id !== t.id));
    router.push(`/(admin)/entraide?focusTaskId=${t.id}&openClaim=1` as any);
  }

  async function handleDismissRelais(t: Task) {
    const nextDismissed = [...t.relais_dismissed_by, { prenom: adminFirstname, nom: adminLastname }];
    await supabase.from("tasks").update({ relais_dismissed_by: nextDismissed }).eq("id", t.id);
    setRelaisAlerts((prev) => prev.filter((x) => x.id !== t.id));
  }

  // Une réservation faite avec un ou plusieurs accompagnants insère une ligne
  // par personne, reliées par group_id (cf. BookingFlow.tsx / AdminAddReservation.tsx).
  // Contrairement à la fiche visiteur (VisitorProfileModal), qui doit continuer
  // à montrer la réservation de chacun individuellement, "Mes contributions"
  // liste tout l'espace : on regroupe donc ici les lignes d'un même groupe en
  // une seule entrée "Prénom Nom · Avec ...". La ligne "cheffe de file" est
  // celle dont l'id a servi de group_id pour les autres.
  const reservationGroups = useMemo(() => {
    const byGroup = new Map<string, Reservation[]>();
    const order: string[] = [];
    for (const r of reservations) {
      const key = r.group_id ?? r.id;
      if (!byGroup.has(key)) {
        byGroup.set(key, []);
        order.push(key);
      }
      byGroup.get(key)!.push(r);
    }
    return order.map((key) => {
      const rows = byGroup.get(key)!;
      const leader = rows.find((r) => r.id === r.group_id) ?? rows[0];
      return { leader, companions: rows.filter((r) => r.id !== leader.id) };
    });
  }, [reservations]);

  function handleLogout() {
    setConfirmModal("logout");
  }

  async function confirmLogout() {
    setConfirmModal(null);
    await supabase.auth.signOut();
    router.replace("/");
  }

  function handleOpenReservation(r: Reservation) {
    if (r.type === "Nuit") {
      router.push({ pathname: "/(admin)/home/nights", params: { focusDate: r.date } } as any);
    } else {
      router.push({ pathname: "/(admin)/home/slots", params: { focusDate: r.date } } as any);
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      {/* Header */}
      <View
        style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
      >
        <Text style={[styles.headerTitle, { color: C.text }]}>👤 Mon compte</Text>
      </View>

      <View style={[styles.subHeader, styles.subHeaderRow, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <TouchableOpacity
          style={[styles.goldBtn, { backgroundColor: C.accent }]}
          onPress={() => router.push("/(admin)/settings")}
          activeOpacity={0.85}
        >
          <Text style={[styles.goldBtnText, { color: "#fff" }]}>⚙️ Paramètres</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Bandeau profil admin — distinct du patient (déplacé dans Paramètres) */}
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          {profileLoading ? (
            <ActivityIndicator color={C.accent} style={{ marginVertical: 8 }} />
          ) : (
            <>
              <View style={styles.patientRow}>
                <PatientAvatar
                  photoUrl={adminPhotoUrl}
                  firstname={adminFirstname || "?"}
                  lastname={adminLastname}
                  size={56}
                  C={C}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.patientName, { color: C.text }]}>
                    {adminFirstname || adminLastname ? `${adminFirstname} ${adminLastname}`.trim() : "Complète ton profil"}
                  </Text>
                  {!!adminMotto.trim() && (
                    <Text style={styles.adminMotto} numberOfLines={2}>{adminMotto.trim()}</Text>
                  )}
                  {!!adminEmail && (
                    <Text style={[styles.patientSub, { color: C.muted }]}>{adminEmail}</Text>
                  )}
                  {!!adminPin && (
                    <Text style={[styles.patientSub, { color: C.muted }]}>
                      PIN : {pinRevealed ? adminPin : "●".repeat(adminPin.length)}{" "}
                      <Text onPress={() => setPinRevealed((v) => !v)} style={{ color: C.accent }}>
                        {pinRevealed ? "🙈" : "👁"}
                      </Text>
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={[styles.editProfileBtn, { backgroundColor: C.accent, borderColor: C.accent }]}
                onPress={handleOpenEditProfile}
                activeOpacity={0.85}
              >
                <Text style={[styles.editProfileBtnText, { color: "#fff" }]}>Mon profil (Admin)</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border, marginTop: 16 }]}>
          <Text style={[styles.patientName, { color: C.text, fontSize: 16 }]}>🆘 Besoin de relais</Text>
          <Text style={[styles.cardDesc, { color: C.muted }]}>
            Tu as besoin de souffler ? Publie un besoin de relais ponctuel, visible par tous les proches ou seulement certains.
          </Text>
          <TouchableOpacity
            style={[styles.editProfileBtn, { backgroundColor: C.accent, borderColor: C.accent, marginTop: 10 }]}
            onPress={() => router.push("/(admin)/entraide?openRelais=1")}
            activeOpacity={0.85}
          >
            <Text style={[styles.editProfileBtnText, { color: "#fff" }]}>Publier un besoin de relais</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: C.accent, marginTop: 16 }, alertsBadgeCount > 0 && { backgroundColor: "#e94560" }]}
          onPress={() => setAlertsModalVisible(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>
            🔔 Mes alertes{alertsBadgeCount > 0 ? ` (${alertsBadgeCount})` : ""}
          </Text>
        </TouchableOpacity>

        <MyAlertsModal
          visible={alertsModalVisible}
          onClose={() => setAlertsModalVisible(false)}
          C={C}
          activeAlerts={myActiveAlerts}
          history={unseenChangeHistory}
          onModify={handleAlertModify}
          onMarkSeen={handleAlertMarkSeen}
          rgpdAlert={rgpdAlertActive && space ? { message: rgpdAlertMessage(space), onProlong: handleRgpdProlong, prolonging: rgpdProlonging } : null}
          relaisAlerts={relaisAlerts}
          onClaimRelais={handleClaimRelais}
          onDismissRelais={handleDismissRelais}
          relaisCoverageHistory={relaisCoverageHistory}
          onMarkHistorySeen={handleHistorySeen}
        />

        {/* Section Mon affichage */}
        <Text style={[styles.sectionTitle, { color: C.gold }]}>Mon affichage</Text>
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

        {hasSpace && space ? (
          <>
            {/* Section Mes contributions */}
            <Text style={[styles.sectionTitle, { color: C.gold }]}>Mes contributions</Text>

            {activityLoading ? (
              <ActivityIndicator color={C.accent} style={{ marginVertical: 16 }} />
            ) : (
              <>
                {(["resv", "news", "soutien", "besoins"] as ContribKey[]).map((key) => {
                  const count = key === "resv" ? reservationGroups.length
                    : key === "news" ? news.length
                    : key === "soutien" ? messages.length
                    : tasks.length;
                  const isOpen = activeContrib === key;
                  return (
                    <View key={key}>
                      <TouchableOpacity
                        style={[styles.contribHeader, { borderBottomColor: C.border }]}
                        onPress={() => setActiveContrib(isOpen ? null : key)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.contribHeaderText, { color: C.text }]}>
                          {CONTRIB_META[key].icon} {CONTRIB_META[key].label} ({count})
                        </Text>
                        <Text style={[styles.tileChevron, { color: C.muted }]}>{isOpen ? "▲" : "▼"}</Text>
                      </TouchableOpacity>

                      {isOpen && key === "resv" && (
                        <>
                          <TouchableOpacity
                            onPress={() => setRecurringModalVisible(true)}
                            activeOpacity={0.75}
                            style={[styles.recurringBtn, { borderColor: C.accent, backgroundColor: `${C.accent}18` }]}
                          >
                            <Text style={[styles.recurringBtnText, { color: C.accent }]}>🔁 Réservations récurrentes</Text>
                          </TouchableOpacity>
                        <View style={[styles.card, styles.contribCard, { backgroundColor: C.card, borderColor: C.border }]}>
                          {reservationGroups.length === 0 ? (
                            <Text style={[styles.activityEmpty, { color: C.muted }]}>Aucune réservation pour le moment.</Text>
                          ) : reservationGroups.map(({ leader, companions }) => (
                            <TouchableOpacity
                              key={leader.id}
                              style={styles.activityRow}
                              onPress={() => handleOpenReservation(leader)}
                              activeOpacity={0.7}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.activityRowText, { color: C.text }]}>
                                  {leader.type === "Nuit" ? "🌙" : "☀️"}{" "}
                                  {new Date(leader.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} · {leader.type === "Nuit" ? "Nuit" : leader.creneau}
                                </Text>
                                <Text style={[styles.activityRowSub, { color: C.muted }]} numberOfLines={1}>
                                  {leader.prenom} {leader.nom}
                                  {companions.length > 0 ? ` · Avec ${companions.map((c) => `${c.prenom} ${c.nom}`).join(", ")}` : ""}
                                </Text>
                              </View>
                              <Text style={[styles.activityChevron, { color: C.muted }]}>›</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        </>
                      )}

                      {isOpen && key === "news" && (
                        <View style={[styles.card, styles.contribCard, { backgroundColor: C.card, borderColor: C.border }]}>
                          {news.length === 0 ? (
                            <Text style={[styles.activityEmpty, { color: C.muted }]}>Aucune nouvelle publiée pour le moment.</Text>
                          ) : news.map((entry) => (
                            <TouchableOpacity
                              key={entry.id}
                              style={styles.activityRow}
                              onPress={() => router.push("/(admin)/news" as any)}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.activityRowText, { color: C.text, flex: 1 }]} numberOfLines={2}>
                                {new Date(entry.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} — {entry.content}
                              </Text>
                              <Text style={[styles.activityChevron, { color: C.muted }]}>›</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      {isOpen && key === "soutien" && (
                        <View style={[styles.card, styles.contribCard, { backgroundColor: C.card, borderColor: C.border }]}>
                          {messages.length === 0 ? (
                            <Text style={[styles.activityEmpty, { color: C.muted }]}>Aucun message envoyé pour le moment.</Text>
                          ) : messages.map((m) => (
                            <TouchableOpacity
                              key={m.id}
                              style={styles.activityRow}
                              onPress={() => router.push("/(admin)/soutien" as any)}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.activityRowText, { color: C.text, flex: 1 }]} numberOfLines={2}>
                                {new Date(m.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} — {m.message}
                              </Text>
                              <Text style={[styles.activityChevron, { color: C.muted }]}>›</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      {isOpen && key === "besoins" && (
                        <>
                          <View style={[styles.card, styles.contribCard, { backgroundColor: C.card, borderColor: C.border }]}>
                            {myClaimedTasks.length === 0 ? (
                              <Text style={[styles.activityEmpty, { color: C.muted }]}>Tu n'as pris en charge aucun besoin pour le moment.</Text>
                            ) : myClaimedTasks.map((t) => (
                              <TouchableOpacity
                                key={t.id}
                                style={styles.activityRow}
                                onPress={() => router.push("/(admin)/entraide" as any)}
                                onLongPress={() => setDesengageTarget(t)}
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
                            {tasks.length === 0 ? (
                              <Text style={[styles.activityEmpty, { color: C.muted }]}>Aucun besoin publié pour le moment.</Text>
                            ) : tasks.map((t) => (
                              <TouchableOpacity
                                key={t.id}
                                style={styles.activityRow}
                                onPress={() => router.push("/(admin)/entraide" as any)}
                                activeOpacity={0.7}
                              >
                                <Text style={[styles.activityRowText, { color: C.text, flex: 1 }]} numberOfLines={1}>
                                  {CAT_ICONS[t.category]} {t.title}
                                </Text>
                                <View style={[
                                  styles.activityStatusBadge,
                                  {
                                    borderColor: t.status === "fait" ? C.success
                                      : t.status === "pris_en_charge" ? C.accent
                                      : t.status === "ferme" ? C.danger
                                      : C.orange,
                                  },
                                ]}>
                                  <Text style={[
                                    styles.activityStatusText,
                                    {
                                      color: t.status === "fait" ? C.success
                                        : t.status === "pris_en_charge" ? C.accent
                                        : t.status === "ferme" ? C.danger
                                        : C.orange,
                                    },
                                  ]}>
                                    {t.status === "fait" ? "✓ Fait"
                                      : t.status === "pris_en_charge" ? "⏳ Pris en charge"
                                      : t.status === "ferme" ? "🔒 Fermé"
                                      : "🔓 Ouvert"}
                                  </Text>
                                </View>
                                <Text style={[styles.activityChevron, { color: C.muted }]}>›</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </>
                      )}
                    </View>
                  );
                })}

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: C.accent, marginTop: 16 }]}
                  onPress={() => router.push("/(admin)/mes-souvenirs" as any)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.saveBtnText}>📷 Mes souvenirs</Text>
                </TouchableOpacity>

                <MyChecklist
                  spaceId={space.id}
                  isAdmin
                  ownerPrenom={adminFirstname}
                  ownerNom={adminLastname}
                  ownerPin="ADMIN"
                  space={space}
                  C={C}
                />

                <MyRelaisCommitments
                  spaceId={space.id}
                  prenom={adminFirstname}
                  nom={adminLastname}
                  pin="ADMIN"
                  C={C}
                />

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: C.accent, marginTop: 16 }]}
                  onPress={() => setPatientProfileVisible(true)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.saveBtnText}>🩺 Fiche patient</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: C.accent, marginTop: 10 }]}
                  onPress={() => setVisitorsListVisible(true)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.saveBtnText}>👥 Visiteurs</Text>
                </TouchableOpacity>

                <PatientProfileModal
                  visible={patientProfileVisible}
                  onClose={() => setPatientProfileVisible(false)}
                  space={space}
                  C={C}
                />

                <VisitorsListModal
                  visible={visitorsListVisible}
                  onClose={() => setVisitorsListVisible(false)}
                  spaceId={space.id}
                  C={C}
                  isAdmin
                  adminFirstname={adminFirstname}
                  adminLastname={adminLastname}
                />

                {slotConfig && (
                  <RecurringBookingModal
                    visible={recurringModalVisible}
                    onClose={() => setRecurringModalVisible(false)}
                    C={C}
                    space={space}
                    slotConfig={slotConfig}
                    slots={slots}
                    reservations={allReservations}
                    getConfigForDate={getConfigForDate}
                    prenom={adminFirstname}
                    nom={adminLastname}
                    pin={adminPin}
                    refreshReservations={refreshReservations}
                  />
                )}

                <TouchableOpacity
                  style={[styles.logoutBtn, { borderColor: "rgba(233,69,96,0.4)" }]}
                  onPress={handleLogout}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.logoutBtnText, { color: "#e94560" }]}>🚪 Se déconnecter</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        ) : (
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.cardDesc, { color: C.muted }]}>
              Aucun espace patient actif.
            </Text>
          </View>
        )}
      </ScrollView>

      {!!toast && (
        <View style={[styles.toast, { backgroundColor: C.success }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      {/* ── MODAL MODIFIER MON PROFIL ────────────────────────────────────── */}
      <Modal visible={editProfileModal} transparent animationType="slide" onRequestClose={() => setEditProfileModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={styles.overlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setEditProfileModal(false)}
            />
            <View
              style={[
                styles.sheet,
                {
                  backgroundColor: C.card,
                  borderColor: C.accent,
                  height: headerHeight > 0 ? Dimensions.get("window").height - headerHeight : SHEET_MAX_HEIGHT,
                },
              ]}
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.sheetTitle, { color: C.text }]}>✏️ Modifier mon profil</Text>

                <View style={styles.photoSection}>
                  <PatientAvatar
                    photoUrl={adminPhotoUrl}
                    firstname={tempFirstname || "?"}
                    lastname={tempLastname}
                    size={72}
                    C={C}
                  />
                  <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                    <TouchableOpacity
                      style={[styles.smallBtn, { backgroundColor: C.overlay, borderColor: C.border }]}
                      onPress={handleAdminPhotoUpload}
                      disabled={photoUploading}
                    >
                      {photoUploading
                        ? <ActivityIndicator color={C.muted} size="small" />
                        : <Text style={[styles.smallBtnText, { color: C.muted }]}>📷 {adminPhotoUrl ? "Changer" : "Ajouter"} la photo</Text>
                      }
                    </TouchableOpacity>
                    {!!adminPhotoUrl && (
                      <TouchableOpacity
                        style={[styles.smallBtn, { backgroundColor: "rgba(233,69,96,0.1)", borderColor: "rgba(233,69,96,0.3)" }]}
                        onPress={handleRemoveAdminPhoto}
                      >
                        <Text style={[styles.smallBtnText, { color: "#e94560" }]}>Retirer</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <View style={[styles.fieldDivider, { backgroundColor: C.border }]} />

                <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 0 }]}>Prénom / Nom</Text>
                <TextInput
                  style={[styles.sheetInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                  placeholder="Prénom"
                  placeholderTextColor={C.muted}
                  value={tempFirstname}
                  onChangeText={setTempFirstname}
                  autoCapitalize="words"
                />
                <TextInput
                  style={[styles.sheetInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                  placeholder="Nom"
                  placeholderTextColor={C.muted}
                  value={tempLastname}
                  onChangeText={setTempLastname}
                  autoCapitalize="words"
                />
                <Text style={[styles.fieldLabel, { color: C.gold }]}>💬 Phrase totem (optionnel)</Text>
                <TextInput
                  style={[styles.sheetInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                  placeholder="Ex : Aimer c'est Agir !"
                  placeholderTextColor={C.muted}
                  value={tempMotto}
                  onChangeText={setTempMotto}
                />
                <Text style={[styles.fieldLabel, { color: C.gold }]}>Adresse email</Text>
                <TextInput
                  style={[styles.sheetInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                  placeholder="Email"
                  placeholderTextColor={C.muted}
                  value={tempEmail}
                  onChangeText={setTempEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <Text style={[styles.cardDesc, { color: C.muted, marginTop: 4 }]}>
                  Email + mot de passe : c'est ce qui te sert à te connecter à ton compte admin, sur l'app comme sur le site web.
                </Text>
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: C.overlay, borderColor: C.border, alignSelf: "flex-start", marginTop: 8 }]}
                  onPress={handleOpenChangePassword}
                >
                  <Text style={[styles.smallBtnText, { color: C.muted }]}>🔒 Changer mon mot de passe</Text>
                </TouchableOpacity>

                <View style={[styles.fieldDivider, { backgroundColor: C.border }]} />

                <Text style={[styles.cardDesc, { color: C.muted, marginBottom: 10 }]}>
                  Code PIN : un code à 4 chiffres, différent du mot de passe. Il te sera redemandé si tu réinstalles l'app ou si tu te connectes sur le site web, pour confirmer que c'est bien toi.
                </Text>
                <TouchableOpacity
                  style={[styles.pinTile, { backgroundColor: C.overlay, borderColor: C.border }]}
                  onPress={() => setPinTileOpen((v) => !v)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.pinTileText, { color: C.text }]}>🔑 Changer mon code PIN</Text>
                  <Text style={{ color: C.muted, fontSize: 13 }}>{pinTileOpen ? "▲" : "▼"}</Text>
                </TouchableOpacity>

                {pinTileOpen && (
                  <View style={{ marginTop: 12 }}>
                    <View style={styles.sectionTitleRow}>
                      <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 0, marginBottom: 0 }]}>Mon code PIN</Text>
                      <TouchableOpacity onPress={() => setPinRevealed((v) => !v)} style={{ paddingVertical: 2, paddingHorizontal: 4 }}>
                        <Text style={[styles.smallBtnText, { color: C.accent }]}>
                          {pinRevealed ? "🙈 Masquer" : "👁 Afficher"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <PinPad value={tempPin} onChange={setTempPin} theme={C} reveal={pinRevealed} />
                  </View>
                )}

                <View style={[styles.fieldDivider, { backgroundColor: C.border, marginTop: 16 }]} />

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: C.accent, marginTop: 16 }, savingProfile && { opacity: 0.6 }]}
                  onPress={handleSaveProfile}
                  disabled={savingProfile}
                >
                  {savingProfile
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.saveBtnText}>Enregistrer</Text>
                  }
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL CHANGER MOT DE PASSE ───────────────────────────────────── */}
      <Modal visible={changePasswordModal} transparent animationType="fade" onRequestClose={() => setChangePasswordModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.centeredOverlay} activeOpacity={1} onPress={() => setChangePasswordModal(false)}>
            <TouchableOpacity activeOpacity={1}>
              <View style={[styles.centeredSheet, { backgroundColor: C.card, borderColor: C.accent }]}>
                <Text style={[styles.sheetTitle, { color: C.text }]}>🔒 Changer mon mot de passe</Text>
                <TextInput
                  style={[styles.sheetInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                  placeholder="Nouveau mot de passe"
                  placeholderTextColor={C.muted}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
                <TextInput
                  style={[styles.sheetInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                  placeholder="Confirmer le nouveau mot de passe"
                  placeholderTextColor={C.muted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: C.accent, marginTop: 8 }, savingPassword && { opacity: 0.6 }]}
                  onPress={handleChangePassword}
                  disabled={savingPassword}
                >
                  {savingPassword
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.saveBtnText}>Enregistrer</Text>
                  }
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmModal
        visible={!!desengageTarget}
        icon="↩️"
        title="Te désengager de ce besoin ?"
        message="Il sera rouvert et visible par tous."
        confirmLabel="Me désengager"
        saving={desengageSaving}
        onCancel={() => setDesengageTarget(null)}
        onConfirm={confirmDesengage}
        C={C}
      />

      <Modal visible={!!confirmModal} transparent animationType="fade" onRequestClose={() => setConfirmModal(null)}>
        <View style={styles.logoutModalOverlay}>
          <View style={[styles.logoutModalCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={[styles.logoutModalIconWrap, { backgroundColor: "rgba(233,69,96,0.12)" }]}>
              <Text style={styles.logoutModalIcon}>{confirmModal === "logout" ? "🚪" : "🗑️"}</Text>
            </View>
            <Text style={[styles.logoutModalTitle, { color: C.text }]}>
              {confirmModal === "logout" ? "Se déconnecter ?" : "Supprimer la photo ?"}
            </Text>
            <Text style={[styles.logoutModalText, { color: C.muted }]}>
              {confirmModal === "logout"
                ? "Tu devras ressaisir ton email et ton mot de passe pour revenir sur cet espace."
                : "Ta photo de profil sera retirée de l'app."}
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
                style={[styles.logoutModalBtn, { backgroundColor: C.danger }]}
                onPress={confirmModal === "logout" ? confirmLogout : confirmRemoveAdminPhoto}
                activeOpacity={0.8}
              >
                <Text style={styles.logoutModalConfirmText}>
                  {confirmModal === "logout" ? "Se déconnecter" : "Supprimer"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  header: {
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
    borderBottomWidth: 1,
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
  },
  headerTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 20 },

  subHeader: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  subHeaderRow: { flexDirection: "row", gap: 10 },

  scroll: { padding: 16, paddingBottom: 48 },
  sectionTitle: {
    fontFamily: "DM_Sans_600SemiBold", fontSize: 11,
    letterSpacing: 1, textTransform: "uppercase",
    marginBottom: 10, marginTop: 20,
  },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 4, gap: 10 },
  cardDesc: { fontFamily: "DM_Sans_400Regular", fontSize: 13, lineHeight: 20 },

  displayModeLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 15 },

  patientRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  patientName: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18 },
  adminMotto: { fontFamily: "Caveat_600SemiBold", fontSize: 16, color: "#7EC8E3", marginTop: 1 },
  patientSub: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginTop: 2 },

  pinTile: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16,
  },
  pinTileText: { fontFamily: "DM_Sans_700Bold", fontSize: 14 },
  tileChevron: { fontFamily: "DM_Sans_700Bold", fontSize: 14 },

  contribHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 12, borderBottomWidth: 1,
  },
  contribHeaderText: { fontFamily: "DM_Sans_700Bold", fontSize: 14 },
  contribCard: { marginTop: 10 },
  recurringBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 6 },
  recurringBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 13 },

  activityEmpty: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },
  activityRow: { paddingVertical: 6, flexDirection: "row", alignItems: "center", gap: 8 },
  activityRowText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, lineHeight: 19 },
  activityRowSub: { fontFamily: "DM_Sans_400Regular", fontSize: 11.5, lineHeight: 16, marginTop: 1 },
  activityStatusBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  activityStatusText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 10 },
  activityChevron: { fontFamily: "DM_Sans_700Bold", fontSize: 16 },

  editProfileBtn: {
    borderWidth: 1, borderRadius: 10,
    paddingVertical: 10, alignItems: "center",
    marginTop: 4,
  },
  editProfileBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },

  logoutBtn: { alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: 10, paddingVertical: 12, marginTop: 24, marginBottom: 8 },
  logoutBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14 },

  logoutModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", alignItems: "center", justifyContent: "center", padding: 24 },
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

  goldBtn: { flex: 1, minWidth: 0, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  goldBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#0D1B2E" },

  toast: { position: "absolute", bottom: 24, alignSelf: "center", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  toastText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, color: "#fff" },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "flex-end" },
  sheet: {
    borderWidth: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 32, marginBottom: 12,
  },
  centeredOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "center", alignItems: "center" },
  centeredSheet: { width: "88%", borderRadius: 20, borderWidth: 1, padding: 24 },
  sheetTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 19, marginBottom: 16 },
  sheetInput: {
    borderWidth: 1, borderRadius: 10, padding: 13,
    fontFamily: "DM_Sans_400Regular", fontSize: 15, marginBottom: 10,
  },

  photoSection: { alignItems: "center", marginBottom: 6 },
  smallBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  smallBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },

  fieldDivider: { height: 1, marginVertical: 16 },
  fieldLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10, marginTop: 4 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  saveBtn: { borderRadius: 12, paddingVertical: 15, alignItems: "center" },
  saveBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 15, color: "#fff" },
});
