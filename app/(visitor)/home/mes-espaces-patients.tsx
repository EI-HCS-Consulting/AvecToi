import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { getVisitorSession } from "@/lib/visitorSession";
import { normalizePhone } from "@/lib/phone";
import { careLocationDetail } from "@/lib/address";
import { switchToLinkedSpace, type LinkedIntervenantSpaceRow } from "@/lib/intervenantSpaceSwitch";
import { getMonday, toFrLong } from "@/lib/slotUtils";
import SegmentedSwitch from "@/components/SegmentedSwitch";
import SoinsPeriodBlock from "@/components/SoinsPeriodBlock";
import SoinsPlanifiesBlock from "@/components/SoinsPlanifiesBlock";
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
  const [dayPopupIso, setDayPopupIso] = useState<string | null>(null);

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

  const dayPopupDay = dayPopupIso ? new Date(dayPopupIso + "T00:00:00") : null;
  const dayPopupInterventions = dayPopupIso
    ? reservations.filter((r) => r.date === dayPopupIso).sort((a, b) => a.creneau.localeCompare(b.creneau))
    : [];

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
              onDayPress={setDayPopupIso}
            />

            <SoinsPlanifiesBlock
              C={C}
              filterIntervenantProfileIds={profileIds}
              locationBySpaceId={locationBySpaceId}
              patientNameBySpaceId={patientNameBySpaceId}
              includePast
              chronological
              onPressRow={(_date, r) => handleRowPress(r)}
            />
          </>
        )}
      </ScrollView>

      {/* Popup jour — lecture seule (pas d'ajout/édition ici, contrairement à
          DaySoinsModal côté admin) : chaque intervention peut appartenir à un
          espace/patient différent, la grille de créneaux d'un seul espace
          n'aurait pas de sens ici. */}
      <Modal visible={!!dayPopupIso} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setDayPopupIso(null)}>
        <View style={styles.overlay}>
          <View style={[styles.popupCard, { backgroundColor: C.card, borderColor: C.accent }]}>
            <Text style={[styles.popupTitle, { color: C.text }]} numberOfLines={1}>
              {dayPopupDay ? toFrLong(dayPopupDay) : ""}
            </Text>
            <ScrollView style={styles.popupScroll} contentContainerStyle={{ paddingBottom: 4 }}>
              {dayPopupInterventions.length === 0 ? (
                <Text style={[styles.emptyText, { color: C.muted }]}>Aucune intervention ce jour-là.</Text>
              ) : (
                dayPopupInterventions.map((r) => (
                  <View key={r.id} style={[styles.popupRow, { borderColor: C.orange }]}>
                    <Text style={[styles.popupTime, { color: C.orange }]}>{r.creneau}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.popupLabel, { color: C.text }]}>
                        {patientNameBySpaceId[r.space_id] ?? `${r.prenom} ${r.nom}`}{r.intervention_label ? ` — ${r.intervention_label}` : ""}
                      </Text>
                      {!!locationBySpaceId[r.space_id] && (
                        <Text style={[styles.popupLocation, { color: C.muted }]} numberOfLines={2}>📍 {locationBySpaceId[r.space_id]}</Text>
                      )}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity onPress={() => setDayPopupIso(null)} style={styles.closeFooterBtn}>
              <Text style={[styles.closeFooterBtnText, { color: C.muted }]}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 24 },
  popupCard: { width: "100%", maxWidth: 420, maxHeight: "85%", borderRadius: 20, borderWidth: 1, padding: 24 },
  popupTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, textTransform: "capitalize", marginBottom: 12 },
  popupScroll: { maxHeight: 420 },
  popupRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  popupTime: { fontFamily: "DM_Sans_700Bold", fontSize: 13, minWidth: 42 },
  popupLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  popupLocation: { fontFamily: "DM_Sans_400Regular", fontSize: 11.5, marginTop: 2 },

  closeFooterBtn: { alignItems: "center", marginTop: 14 },
  closeFooterBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});
