import { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { useVisitorSpace } from "@/lib/VisitorContext";
import { getVisitorSession } from "@/lib/visitorSession";
import { normalizePhone } from "@/lib/phone";
import { careLocationDetail } from "@/lib/address";
import { switchToLinkedSpace, type LinkedIntervenantSpaceRow } from "@/lib/intervenantSpaceSwitch";
import { getMonday, getWeekDates, getDaysInMonth, toISO, addDays } from "@/lib/slotUtils";
import { getPatientColor } from "@/lib/themes";
import SegmentedSwitch from "@/components/SegmentedSwitch";
import IntervenantGlobalCalendar from "@/components/IntervenantGlobalCalendar";
import PatientColorLegend from "@/components/PatientColorLegend";
import SoinsPeriodBlock from "@/components/SoinsPeriodBlock";
import SoinsPlanifiesBlock from "@/components/SoinsPlanifiesBlock";
import InterventionEditFlow, { type InterventionEditFlowHandle } from "@/components/InterventionEditFlow";
import type { Reservation } from "@/lib/types";

interface ProfileRow extends LinkedIntervenantSpaceRow {
  patient_spaces: {
    invite_token: string;
    patient_firstname: string;
    patient_lastname: string;
    home_care_mode: boolean;
    hospital_name: string;
    hospital_service: string | null;
    hospital_room: string | null;
    home_address: string | null;
    home_address_line2: string | null;
    home_postal_code: string | null;
    home_city: string | null;
    home_country: string | null;
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
        "id, space_id, prenom, nom, pin, patient_spaces(invite_token, patient_firstname, patient_lastname, home_care_mode, hospital_name, hospital_service, hospital_room, home_address, home_address_line2, home_postal_code, home_city, home_country)",
      )
      .eq("telephone", normalized)
      .order("space_id", { ascending: true });
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

  const locationBySpaceId: Record<string, string> = {};
  const patientNameBySpaceId: Record<string, string> = {};
  const colorBySpaceId: Record<string, string> = {};
  const legendItems: { spaceId: string; name: string; color: string }[] = [];
  profiles.forEach((p, i) => {
    if (!p.patient_spaces) return;
    const location = careLocationDetail(p.patient_spaces);
    const name = `${p.patient_spaces.patient_firstname} ${p.patient_spaces.patient_lastname}`;
    const color = getPatientColor(i);
    locationBySpaceId[p.space_id] = location;
    patientNameBySpaceId[p.space_id] = name;
    colorBySpaceId[p.space_id] = color;
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

  // Tap sur un jour du calendrier — n'a de sens que pour UN patient précis
  // (impossible de savoir pour qui réserver depuis "Tous"). Si l'espace de ce
  // patient est déjà l'espace actif de la session, on reste dans le même
  // VisitorContext (comme un tap sur home/calendar.tsx). Sinon on doit
  // d'abord basculer dessus (switchToLinkedSpace), en lui passant le jour
  // ciblé pour enchaîner automatiquement vers l'écran de réservation une fois
  // arrivé (voir home/calendar.tsx, param focusIso).
  async function handleCalendarDayPress(iso: string) {
    if (!selectedSpaceId || switchingId) return;
    const row = profiles.find((p) => p.space_id === selectedSpaceId);
    if (!row) return;
    if (activeSpace?.id === selectedSpaceId) {
      setSelectedDay(new Date(iso + "T00:00:00"));
      router.navigate("/(visitor)/home/slots");
      return;
    }
    setSwitchingId(row.id);
    try {
      await switchToLinkedSpace(row, telephone ?? "", router, iso);
    } finally {
      setSwitchingId(null);
    }
  }

  async function handleRowPress(r: Reservation) {
    const row = profiles.find((p) => p.space_id === r.space_id);
    if (!row || switchingId) return;
    setSwitchingId(row.id);
    try {
      await switchToLinkedSpace(row, telephone ?? "", router);
    } finally {
      setSwitchingId(null);
    }
  }

  function handleSoinPress(r: Reservation) {
    const row = profiles.find((p) => p.id === r.intervenant_profile_id);
    if (!row) return;
    editFlowRef.current?.open(r, row.pin);
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
      <Text style={[styles.headerTitle, { color: C.text }]}>📅 Planning</Text>
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
              onDayPress={handleCalendarDayPress}
            />
            <View style={[styles.legendCard, { backgroundColor: C.card, borderColor: C.border }]}>
              <PatientColorLegend C={C} items={legendItems} selectedSpaceId={selectedSpaceId} onSelect={setSelectedSpaceId} />
            </View>

            <Text style={[styles.sectionTitle, { color: C.gold }]}>Planning</Text>
            <SoinsPeriodBlock
              C={C}
              reservations={displayReservations}
              view={planningView}
              weekAnchor={weekAnchor}
              onWeekChange={setWeekAnchor}
              monthAnchor={monthAnchor}
              onMonthChange={setMonthAnchor}
              onDayPress={() => {}}
              patientNameBySpaceId={patientNameBySpaceId}
              locationBySpaceId={locationBySpaceId}
              onSoinPress={handleSoinPress}
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
              onPressRow={(_date, r) => handleRowPress(r)}
            />
          </>
        )}
      </ScrollView>

      <InterventionEditFlow ref={editFlowRef} C={C} onSaved={load} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 52 },
  headerTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, textAlign: "center" },
  headerSubtitle: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center", marginTop: 4, marginBottom: 8, paddingHorizontal: 24 },

  scroll: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center", marginVertical: 16 },

  legendCard: { borderWidth: 1, borderRadius: 14, padding: 16, marginTop: 6, marginBottom: 20 },
});
