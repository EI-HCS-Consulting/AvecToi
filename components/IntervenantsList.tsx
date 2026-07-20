import { useState, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView, Image, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useVisitorSpace } from "@/lib/VisitorContext";
import PatientAvatar from "@/components/PatientAvatar";
import IntervenantProfileModal from "@/components/IntervenantProfileModal";
import type { Theme } from "@/lib/themes";

// Corps de liste partagé entre la modale bottom-sheet (IntervenantsListModal,
// toujours utilisée côté visiteur classique via le bouton "Intervenants" de
// Mon compte) et l'onglet plein écran dédié (app/(visitor)/intervenants.tsx,
// côté intervenant).
interface IntervenantRow {
  id: string;
  prenom: string;
  nom: string;
  photo: string | null;
  photo_updated_at: string | null;
}

// updatedAt bust le cache CDN/<Image> — voir IntervenantFicheModal.tsx pour
// le détail (nom de fichier fixe + upsert, sans ça un ré-upload continuerait
// d'afficher l'ancienne photo).
function intervenantPhotoUrl(filename: string, updatedAt?: string | null) {
  const { data } = supabase.storage.from("intervenant-photos").getPublicUrl(filename);
  return updatedAt ? `${data.publicUrl}?v=${new Date(updatedAt).getTime()}` : data.publicUrl;
}

interface Props {
  spaceId: string;
  C: Theme;
}

export default function IntervenantsList({ spaceId, C }: Props) {
  const router = useRouter();
  const { setSelectedDay } = useVisitorSpace();
  const [loading, setLoading] = useState(true);
  const [intervenants, setIntervenants] = useState<IntervenantRow[]>([]);
  const [profileTarget, setProfileTarget] = useState<IntervenantRow | null>(null);
  const [photoLightbox, setPhotoLightbox] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("intervenant_profiles")
      .select("id, prenom, nom, photo, photo_updated_at")
      .eq("space_id", spaceId)
      .order("prenom", { ascending: true });

    if (error) console.error("[IntervenantsList] intervenant_profiles select failed:", error);
    setIntervenants(data || []);
    setLoading(false);
  }, [spaceId]);

  useEffect(() => {
    load();
  }, [load]);

  function goToSlot(date: string) {
    setSelectedDay(new Date(date + "T12:00:00"));
    router.push("/(visitor)/home/slots" as any);
  }

  return (
    <>
      {loading ? (
        <ActivityIndicator color={C.accent} style={{ marginVertical: 32 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {intervenants.length === 0 ? (
            <Text style={[styles.emptyText, { color: C.muted }]}>Aucun intervenant enregistré pour l'instant.</Text>
          ) : (
            intervenants.map((it, i) => {
              const photoUrl = it.photo ? intervenantPhotoUrl(it.photo, it.photo_updated_at) : null;
              return (
                <TouchableOpacity
                  key={it.id}
                  style={[styles.row, i < intervenants.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
                  onPress={() => setProfileTarget(it)}
                  activeOpacity={0.7}
                >
                  <TouchableOpacity
                    onPress={() => photoUrl && setPhotoLightbox(photoUrl)}
                    activeOpacity={photoUrl ? 0.85 : 1}
                    disabled={!photoUrl}
                  >
                    <PatientAvatar photoUrl={photoUrl} firstname={it.prenom} lastname={it.nom} size={44} C={C} />
                  </TouchableOpacity>
                  <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>
                    {it.prenom} {it.nom}
                  </Text>
                  <Text style={[styles.chevron, { color: C.muted }]}>›</Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

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

      <Modal visible={!!photoLightbox} transparent animationType="fade" onRequestClose={() => setPhotoLightbox(null)}>
        <TouchableOpacity style={styles.lightboxOverlay} activeOpacity={1} onPress={() => setPhotoLightbox(null)}>
          <View style={[styles.lightboxCircle, { borderColor: C.gold }]}>
            {photoLightbox && <Image source={{ uri: photoLightbox }} style={styles.lightboxImage} resizeMode="cover" />}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 24 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center", marginVertical: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  name: { fontFamily: "DM_Sans_600SemiBold", fontSize: 15, flex: 1 },
  chevron: { fontFamily: "DM_Sans_700Bold", fontSize: 16 },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  lightboxCircle: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 4,
    overflow: "hidden",
  },
  lightboxImage: { width: "100%", height: "100%" },
});
