import { useState, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useVisitorSpace } from "@/lib/VisitorContext";
import PatientAvatar from "@/components/PatientAvatar";
import IntervenantProfileModal from "@/components/IntervenantProfileModal";
import type { Theme } from "@/lib/themes";

// Liste des intervenants enregistrés — ouverte depuis le bouton "Intervenants"
// de Mon compte (app/(visitor)/account.tsx), juste sous "Fiche patient". Même
// principe que le bloc "Intervenants" des Paramètres admin
// (components/IntervenantsBlock.tsx), mais en plein écran (bottom-sheet) côté
// visiteur puisqu'il n'y a pas d'écran Paramètres visiteur pour l'accueillir.
interface IntervenantRow {
  id: string;
  prenom: string;
  nom: string;
  photo: string | null;
}

function intervenantPhotoUrl(filename: string) {
  const { data } = supabase.storage.from("intervenant-photos").getPublicUrl(filename);
  return data.publicUrl;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  spaceId: string;
  C: Theme;
}

export default function IntervenantsListModal({ visible, onClose, spaceId, C }: Props) {
  const router = useRouter();
  const { setSelectedDay } = useVisitorSpace();
  const [loading, setLoading] = useState(true);
  const [intervenants, setIntervenants] = useState<IntervenantRow[]>([]);
  const [profileTarget, setProfileTarget] = useState<IntervenantRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("intervenant_profiles")
      .select("id, prenom, nom, photo")
      .eq("space_id", spaceId)
      .order("prenom", { ascending: true });

    if (error) console.error("[IntervenantsListModal] intervenant_profiles select failed:", error);
    setIntervenants(data || []);
    setLoading(false);
  }, [spaceId]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  function goToSlot(date: string) {
    setSelectedDay(new Date(date + "T12:00:00"));
    router.push("/(visitor)/home/slots" as any);
  }

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.accent }]}>
            <View style={[styles.headerRow, { borderBottomColor: C.border }]}>
              <Text style={[styles.title, { color: C.text }]}>🩺 Intervenants</Text>
              <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { borderColor: C.border }]}>
                <Text style={[styles.closeBtnText, { color: C.muted }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator color={C.accent} style={{ marginVertical: 32 }} />
            ) : (
              <ScrollView contentContainerStyle={styles.scroll}>
                {intervenants.length === 0 ? (
                  <Text style={[styles.emptyText, { color: C.muted }]}>Aucun intervenant enregistré pour l'instant.</Text>
                ) : (
                  intervenants.map((it, i) => (
                    <TouchableOpacity
                      key={it.id}
                      style={[styles.row, i < intervenants.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
                      onPress={() => setProfileTarget(it)}
                      activeOpacity={0.7}
                    >
                      <PatientAvatar
                        photoUrl={it.photo ? intervenantPhotoUrl(it.photo) : null}
                        firstname={it.prenom}
                        lastname={it.nom}
                        size={44}
                        C={C}
                      />
                      <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>
                        {it.prenom} {it.nom}
                      </Text>
                      <Text style={[styles.chevron, { color: C.muted }]}>›</Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {profileTarget && (
        <IntervenantProfileModal
          visible={!!profileTarget}
          onClose={() => setProfileTarget(null)}
          spaceId={spaceId}
          intervenantProfileId={profileTarget.id}
          prenom={profileTarget.prenom}
          nom={profileTarget.nom}
          C={C}
          isAdmin={false}
          onGoToSlot={goToSlot}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "flex-end" },
  sheet: { maxHeight: "80%", borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, paddingTop: 20, paddingHorizontal: 20, marginBottom: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingBottom: 16, borderBottomWidth: 1 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  closeBtnText: { fontSize: 14, fontFamily: "DM_Sans_700Bold" },
  scroll: { paddingBottom: 24 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center", marginVertical: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  name: { fontFamily: "DM_Sans_600SemiBold", fontSize: 15, flex: 1 },
  chevron: { fontFamily: "DM_Sans_700Bold", fontSize: 16 },
});
