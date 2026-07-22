import { useState, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useVisitorSpace } from "@/lib/VisitorContext";
import { getVisitorSession } from "@/lib/visitorSession";
import { normalizePhone } from "@/lib/phone";
import { careLocationSummary } from "@/lib/address";
import { switchToLinkedSpace, type LinkedIntervenantSpaceRow } from "@/lib/intervenantSpaceSwitch";
import PatientAvatar from "@/components/PatientAvatar";
import type { Theme } from "@/lib/themes";

interface PatientRow extends LinkedIntervenantSpaceRow {
  patient_spaces: {
    invite_token: string;
    patient_firstname: string;
    patient_lastname: string;
    patient_photo_url: string | null;
    home_care_mode: boolean;
    hospital_name: string;
    hospital_service: string;
    hospital_room: string;
    home_city: string | null;
    home_postal_code: string | null;
  } | null;
}

interface Props {
  C: Theme;
}

// Onglet "Patients" — remplace "Soutien" côté intervenant (voir
// app/(visitor)/_layout.tsx) : même présentation que IntervenantsList.tsx,
// mais liste les espaces patients auxquels cet intervenant est rattaché
// (même téléphone, cf. "Mes Patients" dans app/(visitor)/account.tsx dont on
// réutilise la logique de pivot — lib/intervenantSpaceSwitch.ts).
export default function PatientsList({ C }: Props) {
  const router = useRouter();
  const { space } = useVisitorSpace();
  const [loading, setLoading] = useState(true);
  const [telephone, setTelephone] = useState<string | null>(null);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const session = await getVisitorSession();
    if (!session?.intervenantProfileId) {
      setLoading(false);
      return;
    }
    // Le téléphone en session peut être vide (jamais rechargé depuis la
    // fiche sur cet appareil) — repli sur intervenant_profiles, même
    // principe que app/(visitor)/account.tsx.
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
      setPatients([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("intervenant_profiles")
      .select("id, space_id, prenom, nom, pin, patient_spaces(invite_token, patient_firstname, patient_lastname, patient_photo_url, home_care_mode, hospital_name, hospital_service, hospital_room, home_city, home_postal_code)")
      .eq("telephone", normalized)
      .order("space_id", { ascending: true });
    if (error) console.error("[PatientsList] intervenant_profiles select failed:", error);
    setPatients((data as any) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handlePress(row: PatientRow) {
    if (!row.patient_spaces || switchingId || row.space_id === space?.id) return;
    setSwitchingId(row.id);
    try {
      await switchToLinkedSpace(row, telephone ?? "", router);
    } finally {
      setSwitchingId(null);
    }
  }

  if (loading) {
    return <ActivityIndicator color={C.accent} style={{ marginVertical: 32 }} />;
  }

  return (
    <View style={styles.scroll}>
      {patients.length === 0 ? (
        <Text style={[styles.emptyText, { color: C.muted }]}>Aucun patient rattaché pour l'instant.</Text>
      ) : (
        patients.map((p, i) => {
          const ps = p.patient_spaces;
          const isActive = p.space_id === space?.id;
          return (
            <TouchableOpacity
              key={p.id}
              style={[styles.row, i < patients.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
              onPress={() => handlePress(p)}
              activeOpacity={isActive ? 1 : 0.7}
              disabled={switchingId === p.id}
            >
              <PatientAvatar
                photoUrl={ps?.patient_photo_url ?? null}
                firstname={ps?.patient_firstname ?? ""}
                lastname={ps?.patient_lastname ?? ""}
                size={44}
                C={C}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>
                  {ps ? `${ps.patient_firstname} ${ps.patient_lastname}` : "Espace"}{isActive ? " (actuel)" : ""}
                </Text>
                {!!ps && (
                  <Text style={[styles.location, { color: C.muted }]} numberOfLines={1}>
                    {careLocationSummary(ps)}
                  </Text>
                )}
              </View>
              {switchingId === p.id ? (
                <ActivityIndicator color={C.accent} size="small" />
              ) : (
                !isActive && <Text style={[styles.chevron, { color: C.muted }]}>›</Text>
              )}
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 24 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center", marginVertical: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  name: { fontFamily: "DM_Sans_600SemiBold", fontSize: 15 },
  location: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },
  chevron: { fontFamily: "DM_Sans_700Bold", fontSize: 16 },
});
