import { useState, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { supabase } from "@/lib/supabase";
import PatientAvatar from "@/components/PatientAvatar";
import IntervenantProfileModal from "@/components/IntervenantProfileModal";
import { metierLabel } from "@/lib/metiers";
import type { Theme } from "@/lib/themes";

// Bloc "Intervenants" des Paramètres admin — juste après le bloc "Visiteurs"
// (voir components/VisitorsBlock.tsx, même pattern de carte repliable et de
// liste de personnes cliquables ouvrant une fiche). Liste les intervenants
// enregistrés (infirmier·ère, kiné, aide à domicile…) via intervenant_profiles
// — une vraie table de profils (PIN, pas de compte visiteur approximé par
// prénom+nom) — plutôt que les interventions elles-mêmes : un intervenant
// n'apparaît qu'une fois même s'il a plusieurs soins programmés. Un clic ouvre
// sa fiche (IntervenantProfileModal), qui liste ses soins planifiés/faits et
// permet de rebondir vers le créneau du jour.
interface IntervenantRow {
  id: string;
  prenom: string;
  nom: string;
  photo: string | null;
  photo_updated_at: string | null;
  metier: string | null;
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

export default function IntervenantsBlock({ spaceId, C }: Props) {
  const [loading, setLoading] = useState(true);
  const [intervenants, setIntervenants] = useState<IntervenantRow[]>([]);
  const [profileTarget, setProfileTarget] = useState<IntervenantRow | null>(null);
  // Replié par défaut, comme VisitorsBlock juste au-dessus.
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("intervenant_profiles")
      .select("id, prenom, nom, photo, photo_updated_at, metier")
      .eq("space_id", spaceId)
      .order("prenom", { ascending: true });

    if (error) console.error("[IntervenantsBlock] intervenant_profiles select failed:", error);
    setIntervenants(data || []);
    setLoading(false);
  }, [spaceId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <Text style={[styles.sectionTitle, { color: C.gold }]}>Intervenants</Text>
      <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
        <TouchableOpacity
          onPress={() => setExpanded((e) => !e)}
          activeOpacity={0.7}
          style={styles.headerRow}
        >
          <Text style={[styles.cardDesc, { color: C.muted, marginBottom: 0, flex: 1 }]}>
            Les intervenants (infirmier·ère, kiné, aide à domicile…) qui se sont enregistrés sur l'espace.
          </Text>
          <Text style={[styles.toggleIcon, { color: C.muted }]}>{expanded ? "▾" : "▸"}</Text>
        </TouchableOpacity>

        {expanded && (
          <View style={{ marginTop: 10 }}>
            {loading ? (
              <ActivityIndicator color={C.accent} style={{ marginVertical: 8 }} />
            ) : intervenants.length === 0 ? (
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
                    photoUrl={it.photo ? intervenantPhotoUrl(it.photo, it.photo_updated_at) : null}
                    firstname={it.prenom}
                    lastname={it.nom}
                    size={36}
                    C={C}
                    metier={it.metier}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>
                      {it.prenom} {it.nom}
                    </Text>
                    {!!it.metier && (
                      <Text style={[styles.metier, { color: C.muted }]} numberOfLines={1}>
                        {metierLabel(it.metier)}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.openBtn, { borderColor: C.border }]}>
                    <Text style={[styles.openBtnText, { color: C.accent }]}>›</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </View>

      {profileTarget && (
        <IntervenantProfileModal
          visible={!!profileTarget}
          onClose={() => setProfileTarget(null)}
          spaceId={spaceId}
          intervenantProfileId={profileTarget.id}
          prenom={profileTarget.prenom}
          nom={profileTarget.nom}
          C={C}
          isAdmin
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontFamily: "DM_Sans_600SemiBold", fontSize: 11,
    letterSpacing: 1, textTransform: "uppercase",
    marginBottom: 10, marginTop: 20,
  },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 4 },
  cardDesc: { fontFamily: "DM_Sans_400Regular", fontSize: 13, lineHeight: 20, marginBottom: 10 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  toggleIcon: { fontSize: 14 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  name: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  metier: { fontFamily: "DM_Sans_400Regular", fontSize: 11, marginTop: 1 },
  openBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  openBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 16 },
});
