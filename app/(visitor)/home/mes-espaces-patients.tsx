import { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { getVisitorSession } from "@/lib/visitorSession";
import { normalizePhone } from "@/lib/phone";
import { careLocationDetail } from "@/lib/address";
import { switchToLinkedSpace, type LinkedIntervenantSpaceRow } from "@/lib/intervenantSpaceSwitch";
import { getMonday, getWeekDates, getDaysInMonth, toISO } from "@/lib/slotUtils";
import SegmentedSwitch from "@/components/SegmentedSwitch";
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

// Vue "Mes Espaces Patients" — planning des interventions d'un intervenant à
// travers TOUS les espaces patients auxquels il est rattaché (même
// téléphone, même mécanique que components/PatientsList.tsx), jamais de
// visites. Ouverte depuis le bouton du même nom sous "Afficher mes
// créneaux" (voir home/calendar.tsx). Réutilise SoinsPeriodBlock/
// SoinsPlanifiesBlock (déjà éprouvés côté admin) au lieu de dupliquer leur
// logique — spécificité ici : lieu (hôpital ou adresse complète à domicile)
// et nom du patient affichés sur chaque ligne, puisque les soins listés ne
// concernent plus tous le même espace.
export default function MesEspacesPatientsScreen() {
  const router = useRouter();
  const { theme: C } = useDisplayMode();
  const [loading, setLoading] = useState(true);
  const [telephone, setTelephone] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

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
    if (error) console.error("[MesEspacesPatients] intervenant_profiles select failed:", error);
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
  for (const p of profiles) {
    if (!p.patient_spaces) continue;
    locationBySpaceId[p.space_id] = careLocationDetail(p.patient_spaces);
    patientNameBySpaceId[p.space_id] = `${p.patient_spaces.patient_firstname} ${p.patient_spaces.patient_lastname}`;
  }
  const profileIds = profiles.map((p) => p.id);

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
      <Text style={[styles.headerTitle, { color: C.text }]}>🗂️ Mes Espaces Patients</Text>
      <Text style={[styles.headerSubtitle, { color: C.muted }]}>
        Tes interventions planifiées sur tous tes espaces patients.
      </Text>

      <ScrollView contentContainerStyle={styles.scroll}>
        {profileIds.length === 0 ? (
          <Text style={[styles.emptyText, { color: C.muted }]}>Aucun espace patient rattaché pour l&apos;instant.</Text>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: C.gold }]}>Planning</Text>
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

            <SoinsPeriodBlock
              C={C}
              reservations={reservations}
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
              filterIntervenantProfileIds={profileIds}
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
});
