import { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Linking } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { useVisitorSpace } from "@/lib/VisitorContext";
import { getVisitorSession } from "@/lib/visitorSession";
import { normalizePhone } from "@/lib/phone";
import { careLocationDetail, mapsUrlForSpace } from "@/lib/address";
import { switchToLinkedSpace, type LinkedIntervenantSpaceRow } from "@/lib/intervenantSpaceSwitch";
import { getMonday, getWeekDates, getDaysInMonth, toISO, addDays } from "@/lib/slotUtils";
import { getPatientColor } from "@/lib/themes";
import SegmentedSwitch from "@/components/SegmentedSwitch";
import IntervenantGlobalCalendar from "@/components/IntervenantGlobalCalendar";
import PatientColorLegend from "@/components/PatientColorLegend";
import PlanningDuJourBlock from "@/components/PlanningDuJourBlock";
import SoinsPeriodBlock from "@/components/SoinsPeriodBlock";
import SoinsPlanifiesBlock from "@/components/SoinsPlanifiesBlock";
import InterventionEditFlow, { type InterventionEditFlowHandle } from "@/components/InterventionEditFlow";
import SoinActionModal from "@/components/SoinActionModal";
import BookSlotPromptModal from "@/components/BookSlotPromptModal";
import type { Reservation } from "@/lib/types";

interface ProfileRow extends LinkedIntervenantSpaceRow {
  // Date de rattachement de l'intervenant à cet espace patient — sert à trier
  // les profils par ordre d'arrivée (voir colorBySpaceId plus bas) plutôt que
  // par space_id (UUID, ordre non chronologique), pour que la couleur d'un
  // patient déjà présent ne change jamais quand un nouveau patient arrive.
  created_at: string;
  patient_spaces: {
    invite_token: string;
    patient_firstname: string;
    patient_lastname: string;
    home_care_mode: boolean;
    hospital_name: string;
    hospital_service: string | null;
    hospital_room: string | null;
    hospital_address: string;
    hospital_address_line2: string | null;
    hospital_postal_code: string | null;
    hospital_city: string | null;
    hospital_country: string | null;
    hospital_maps_url: string;
    home_address: string | null;
    home_address_line2: string | null;
    home_postal_code: string | null;
    home_city: string | null;
    home_country: string | null;
    home_maps_url: string | null;
  } | null;
}

// Onglet "Planning" de l'intervenant — remplace l'ancien onglet "Soins"
// (Mes soins/CRUD des types d'intervention, déjà disponible par ailleurs
// depuis "Mon compte → Ma fiche intervenant", voir IntervenantFicheModal.tsx,
// et liste des soins d'un seul espace). Reprend la logique cross-space de
// l'ancienne page home/mes-espaces-patients.tsx (même téléphone = même
// intervenant à travers plusieurs espaces patients) et y ajoute un
// calendrier global coloré par patient (IntervenantGlobalCalendar) + sa
// légende (PatientColorLegend), pour repérer en un coup d'œil un
// chevauchement entre deux espaces avant même de réserver — la garde
// serveur (book_intervention, exception INTERVENTION_OVERLAP_OTHER_SPACE)
// reste la protection déterminante, ce calendrier n'est qu'une aide visuelle.
export default function VisitorPlanningScreen() {
  const router = useRouter();
  const { theme: C } = useDisplayMode();
  const { space: activeSpace, setSelectedDay } = useVisitorSpace();
  // Retour depuis une réservation faite via le popup "Réserver un créneau"
  // (voir handleConfirmBookSlot ci-dessous → home/slots.tsx →
  // InterventionBookingFlow "← Retour au planning") — présélectionne le
  // patient pour qui le soin vient d'être réservé, une seule fois.
  const { focusSpaceId } = useLocalSearchParams<{ focusSpaceId?: string }>();
  const focusSpaceHandled = useRef(false);
  const [loading, setLoading] = useState(true);
  const [telephone, setTelephone] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  // Filtre "Tous" (null) / un seul patient (space_id) — piloté par un tap
  // sur la légende (PatientColorLegend). Entraîne le calendrier ET les blocs
  // de jours planifiés en dessous à ne montrer que ce patient, et permet de
  // réserver pour lui en tapant un jour (voir handleCalendarDayPress).
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  // Jour retenu par le calendrier (ISO) — aujourd'hui par défaut, mis à jour
  // à chaque tap sur une case (voir handleCalendarDayPress). Pilote le bloc
  // "Planning du jour" ci-dessous, qui affiche les soins de ce seul jour ;
  // les autres jours restent dans la rubrique Planning mensuel/hebdo.
  const [selectedIso, setSelectedIso] = useState<string>(() => toISO(new Date()));
  // Soin tapé dans un des blocs sous le calendrier (Planning du jour,
  // Planning mensuel/hebdo, Autres soins planifiés) — non-null tant que le
  // popup d'action (Modifier / Y Aller / Fermer, voir SoinActionModal) est
  // ouvert. Un seul état partagé par les 3 blocs plutôt qu'un par bloc,
  // puisqu'un seul popup peut être ouvert à la fois.
  const [pendingSoin, setPendingSoin] = useState<Reservation | null>(null);
  // Appui prolongé sur une case du calendrier — ISO du jour ciblé tant que le
  // popup "Réserver un créneau" (handleCalendarDayLongPress) est ouvert, null
  // sinon. Distinct de selectedIso, qui lui est mis à jour dès le tap simple.
  const [bookPromptIso, setBookPromptIso] = useState<string | null>(null);

  const [planningView, setPlanningView] = useState<"mensuel" | "hebdo">("mensuel");
  const [weekAnchor, setWeekAnchor] = useState(() => getMonday(new Date()));
  const [monthAnchor, setMonthAnchor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const editFlowRef = useRef<InterventionEditFlowHandle>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const session = await getVisitorSession();
    if (!session?.intervenantProfileId) {
      setLoading(false);
      return;
    }
    let tel = session.telephone;
    if (!tel) {
      const { data } = await supabase
        .from("intervenant_profiles")
        .select("telephone")
        .eq("id", session.intervenantProfileId)
        .maybeSingle();
      tel = data?.telephone ?? "";
    }
    const normalized = normalizePhone(tel);
    setTelephone(tel);
    if (normalized.length < 6) {
      setProfiles([]);
      setReservations([]);
      setLoading(false);
      return;
    }
    const { data: profileData, error } = await supabase
      .from("intervenant_profiles")
      .select(
        "id, space_id, prenom, nom, pin, created_at, patient_spaces(invite_token, patient_firstname, patient_lastname, home_care_mode, hospital_name, hospital_service, hospital_room, hospital_address, hospital_address_line2, hospital_postal_code, hospital_city, hospital_country, hospital_maps_url, home_address, home_address_line2, home_postal_code, home_city, home_country, home_maps_url)",
      )
      .eq("telephone", normalized)
      .order("created_at", { ascending: true });
    if (error) console.error("[Planning] intervenant_profiles select failed:", error);
    const rows = (profileData as any as ProfileRow[]) ?? [];
    setProfiles(rows);

    const ids = rows.map((r) => r.id);
    if (ids.length > 0) {
      const { data: resaData } = await supabase
        .from("reservations")
        .select("*")
        .in("intervenant_profile_id", ids)
        .eq("type", "Intervention");
      setReservations(resaData || []);
    } else {
      setReservations([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (focusSpaceHandled.current || !focusSpaceId || profiles.length === 0) return;
    focusSpaceHandled.current = true;
    if (profiles.some((p) => p.space_id === focusSpaceId)) setSelectedSpaceId(focusSpaceId);
  }, [focusSpaceId, profiles]);

  // En Hebdo, dès qu'on change de semaine (ou qu'on bascule sur Hebdo), le
  // curseur jour saute automatiquement sur le premier soin de la semaine
  // affichée — le bloc "Planning du jour" en dessous suit alors sans action
  // supplémentaire. Si la semaine n'a aucun soin, on laisse selectedIso tel
  // quel (pas d'instruction pour ce cas). Filtré sur le patient sélectionné
  // dans la légende, comme le reste de l'onglet (voir displayReservations).
  useEffect(() => {
    if (planningView !== "hebdo") return;
    const weekIsos = getWeekDates(weekAnchor).map(toISO);
    const pool = selectedSpaceId ? reservations.filter((r) => r.space_id === selectedSpaceId) : reservations;
    const firstSoinIso = weekIsos.find((iso) => pool.some((r) => r.date === iso));
    if (firstSoinIso) setSelectedIso(firstSoinIso);
  }, [planningView, weekAnchor, selectedSpaceId, reservations]);

  const locationBySpaceId: Record<string, string> = {};
  const patientNameBySpaceId: Record<string, string> = {};
  const colorBySpaceId: Record<string, string> = {};
  const mapsUrlBySpaceId: Record<string, string> = {};
  const legendItems: { spaceId: string; name: string; color: string }[] = [];
  profiles.forEach((p, i) => {
    if (!p.patient_spaces) return;
    const location = careLocationDetail(p.patient_spaces);
    const name = `${p.patient_spaces.patient_firstname} ${p.patient_spaces.patient_lastname}`;
    const color = getPatientColor(i);
    locationBySpaceId[p.space_id] = location;
    patientNameBySpaceId[p.space_id] = name;
    colorBySpaceId[p.space_id] = color;
    const mapsUrl = mapsUrlForSpace(p.patient_spaces);
    if (mapsUrl) mapsUrlBySpaceId[p.space_id] = mapsUrl;
    legendItems.push({ spaceId: p.space_id, name, color });
  });
  const profileIds = profiles.map((p) => p.id);

  // Vue filtrée sur un seul patient (calendrier + blocs de jours en dessous)
  // — "Tous" (selectedSpaceId === null) garde la vérité complète.
  const displayReservations = selectedSpaceId
    ? reservations.filter((r) => r.space_id === selectedSpaceId)
    : reservations;
  const displayProfileIds = selectedSpaceId
    ? profiles.filter((p) => p.space_id === selectedSpaceId).map((p) => p.id)
    : profileIds;

  // Tap simple sur un jour du calendrier — se contente d'afficher les soins
  // de ce jour dans le bloc "Planning du jour" ci-dessous, sans navigation.
  function handleCalendarDayPress(iso: string) {
    setSelectedIso(iso);
  }

  // Appui prolongé sur un jour du calendrier — ouvre le popup "Réserver un
  // créneau". Si un patient précis est sélectionné dans la légende, le popup
  // ne demande qu'une confirmation ; en mode "Tous", il demande d'abord pour
  // quel patient (voir BookSlotPromptModal), impossible à deviner depuis la
  // vue cumulée.
  function handleCalendarDayLongPress(iso: string) {
    setSelectedIso(iso);
    setBookPromptIso(iso);
  }

  // Confirmation du popup "Réserver un créneau", pour le patient choisi
  // (spaceId) — si son espace est déjà l'espace actif de la session, on
  // reste dans le même VisitorContext (comme un tap sur home/calendar.tsx).
  // Sinon on doit d'abord basculer dessus (switchToLinkedSpace), en lui
  // passant le jour ciblé pour enchaîner automatiquement vers l'écran de
  // réservation une fois arrivé (voir home/calendar.tsx, param focusIso).
  // Les params returnTo/returnSpaceId font le chemin inverse une fois le
  // soin réservé (voir home/slots.tsx, InterventionBookingFlow) pour
  // ramener sur cet onglet avec ce même patient présélectionné.
  async function handleConfirmBookSlot(spaceId: string) {
    const iso = bookPromptIso;
    setBookPromptIso(null);
    if (!iso || switchingId) return;
    const row = profiles.find((p) => p.space_id === spaceId);
    if (!row) return;
    const returnParams = { returnTo: "planning", returnSpaceId: spaceId };
    if (activeSpace?.id === spaceId) {
      setSelectedDay(new Date(iso + "T00:00:00"));
      router.navigate({ pathname: "/(visitor)/home/slots", params: returnParams } as any);
      return;
    }
    setSwitchingId(row.id);
    try {
      await switchToLinkedSpace(row, telephone ?? "", router, iso, returnParams);
    } finally {
      setSwitchingId(null);
    }
  }

  // Tap sur un soin dans un des blocs sous le calendrier — ouvre le popup
  // d'action (Modifier / Y Aller / Fermer) plutôt que d'agir directement.
  function openSoinActions(r: Reservation) {
    setPendingSoin(r);
  }

  function handleModifierPress() {
    const r = pendingSoin;
    setPendingSoin(null);
    if (!r) return;
    const row = profiles.find((p) => p.id === r.intervenant_profile_id);
    if (!row) return;
    editFlowRef.current?.open(r, row.pin);
  }

  // "Y Aller" — ouvre le lien Google Maps du lieu d'intervention (voir
  // mapsUrlForSpace, lib/address.ts), plutôt que de naviguer dans l'app.
  function handleYAllerPress() {
    const r = pendingSoin;
    setPendingSoin(null);
    if (!r) return;
    const url = mapsUrlBySpaceId[r.space_id];
    if (url) Linking.openURL(url).catch(() => {});
  }

  // Dernier jour de la période actuellement affichée par SoinsPeriodBlock —
  // "Autres soins planifiés" en dessous n'affiche que ce qui vient après,
  // pour ne pas dupliquer ce qui est déjà visible dans la grille.
  const periodDates = planningView === "hebdo" ? getWeekDates(weekAnchor) : getDaysInMonth(monthAnchor.year, monthAnchor.month);
  const periodEndIso = toISO(periodDates[periodDates.length - 1]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: C.bg, justifyContent: "center" }]}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={styles.headerTitleRow}>
        <View style={[styles.calBadge, { borderColor: C.border, backgroundColor: C.card }]}>
          <View style={[styles.calBadgeHeader, { backgroundColor: C.danger }]}>
            <Text style={styles.calBadgeMonth}>MAI</Text>
          </View>
          <Text style={[styles.calBadgeDay, { color: C.text }]}>28</Text>
        </View>
        <Text style={[styles.headerTitle, { color: C.text }]}>Planning</Text>
      </View>
      <Text style={[styles.headerSubtitle, { color: C.muted }]}>
        Toutes tes interventions, sur tous tes espaces patients.
      </Text>

      <ScrollView contentContainerStyle={styles.scroll}>
        {profileIds.length === 0 ? (
          <Text style={[styles.emptyText, { color: C.muted }]}>Aucun espace patient rattaché pour l&apos;instant.</Text>
        ) : (
          <>
            <View style={{ marginBottom: 14 }}>
              <SegmentedSwitch
                value={planningView === "hebdo"}
                onChange={(v) => setPlanningView(v ? "hebdo" : "mensuel")}
                leftLabel="Mensuel"
                rightLabel="Hebdo"
                C={C}
                minWidthRatio={0.5}
              />
            </View>

            <IntervenantGlobalCalendar
              C={C}
              reservations={displayReservations}
              colorBySpaceId={colorBySpaceId}
              view={planningView}
              weekAnchor={weekAnchor}
              monthAnchor={monthAnchor}
              onMonthChange={setMonthAnchor}
              onWeekPrev={() => setWeekAnchor(addDays(weekAnchor, -7))}
              onWeekNext={() => setWeekAnchor(addDays(weekAnchor, 7))}
              selectedIso={selectedIso}
              onDayPress={handleCalendarDayPress}
              onDayLongPress={handleCalendarDayLongPress}
            />
            <View style={{ marginBottom: 20 }}>
              <PatientColorLegend C={C} items={legendItems} selectedSpaceId={selectedSpaceId} onSelect={setSelectedSpaceId} />
            </View>

            <PlanningDuJourBlock
              C={C}
              iso={selectedIso}
              reservations={displayReservations.filter((r) => r.date === selectedIso)}
              patientNameBySpaceId={patientNameBySpaceId}
              locationBySpaceId={locationBySpaceId}
              onSoinPress={openSoinActions}
            />

            <Text style={[styles.sectionTitle, { color: C.gold }]}>
              {planningView === "hebdo" ? "Planning hebdo" : "Planning mensuel"}
            </Text>
            <SoinsPeriodBlock
              C={C}
              reservations={displayReservations.filter((r) => r.date !== selectedIso)}
              view={planningView}
              weekAnchor={weekAnchor}
              onWeekChange={setWeekAnchor}
              monthAnchor={monthAnchor}
              onMonthChange={setMonthAnchor}
              onDayPress={() => {}}
              patientNameBySpaceId={patientNameBySpaceId}
              locationBySpaceId={locationBySpaceId}
              onSoinPress={openSoinActions}
            />

            <SoinsPlanifiesBlock
              C={C}
              filterIntervenantProfileIds={displayProfileIds}
              locationBySpaceId={locationBySpaceId}
              patientNameBySpaceId={patientNameBySpaceId}
              includePast
              chronological
              title="Autres soins planifiés"
              excludeUpToDate={periodEndIso}
              onPressRow={(_date, r) => openSoinActions(r)}
            />
          </>
        )}
      </ScrollView>

      <InterventionEditFlow ref={editFlowRef} C={C} onSaved={load} />
      <SoinActionModal
        C={C}
        visible={!!pendingSoin}
        reservation={pendingSoin}
        patientNameBySpaceId={patientNameBySpaceId}
        locationBySpaceId={locationBySpaceId}
        onModifier={handleModifierPress}
        onYAller={handleYAllerPress}
        onClose={() => setPendingSoin(null)}
      />
      <BookSlotPromptModal
        C={C}
        visible={!!bookPromptIso}
        iso={bookPromptIso}
        selectedSpaceId={selectedSpaceId}
        legendItems={legendItems}
        patientNameBySpaceId={patientNameBySpaceId}
        onChoosePatient={handleConfirmBookSlot}
        onClose={() => setBookPromptIso(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 52 },
  headerTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  headerTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, textAlign: "center" },
  headerSubtitle: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center", marginTop: 4, marginBottom: 8, paddingHorizontal: 24 },

  // Petit picto "calendrier à effeuiller" fixé sur le 28 Mai (l'emoji 📅
  // dépend du rendu de chaque plateforme, jamais du contrôle de l'app).
  calBadge: { width: 22, height: 22, borderRadius: 5, borderWidth: 1, overflow: "hidden", alignItems: "center", justifyContent: "flex-end" },
  calBadgeHeader: { position: "absolute", top: 0, left: 0, right: 0, height: 8, alignItems: "center", justifyContent: "center" },
  calBadgeMonth: { fontFamily: "DM_Sans_700Bold", fontSize: 5, color: "#fff", letterSpacing: 0.2 },
  calBadgeDay: { fontFamily: "DM_Sans_700Bold", fontSize: 11, lineHeight: 12, marginBottom: 1 },

  scroll: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center", marginVertical: 16 },
});
