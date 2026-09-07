import { useState, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import PatientAvatar from "@/components/PatientAvatar";
import VisitorProfileModal from "@/components/VisitorProfileModal";
import { loadKnownVisitors, visitorIdentityKey as identityKey, type KnownVisitor } from "@/lib/visitorRoster";
import type { Theme } from "@/lib/themes";

// Bloc "Visiteurs" des Paramètres admin — liste tout le monde ayant laissé une
// trace dans l'espace (réservation, publication, besoin Entraide, message de
// soutien, souvenir, ou simple photo de profil). Il n'existe pas de compte
// visiteur ni de table de connexion : l'identité est donc, comme partout
// ailleurs dans l'App (VisitorProfileModal, "Mes contributions"), approximée
// par prénom+nom déduit de ce qui a été saisi.
type VisitorRow = KnownVisitor;

interface Props {
  spaceId: string;
  C: Theme;
  // Utilisés uniquement pour exclure l'admin de la liste (voir plus bas) —
  // il a son propre espace "Mes contributions" côté admin et n'a pas à
  // apparaître dans le bloc Visiteurs.
  adminFirstname?: string | null;
  adminLastname?: string | null;
}

export default function VisitorsBlock({ spaceId, C, adminFirstname, adminLastname }: Props) {
  const [loading, setLoading] = useState(true);
  const [visitors, setVisitors] = useState<VisitorRow[]>([]);
  const [profileTarget, setProfileTarget] = useState<{ prenom: string; nom: string } | null>(null);
  // Replié par défaut, comme les sous-rubriques de l'Historique juste en
  // dessous — s'ouvre vers le bas en cliquant sur le bloc (titre ou texte).
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await loadKnownVisitors(spaceId, adminFirstname, adminLastname);
    setVisitors(rows);
    setLoading(false);
  }, [spaceId, adminFirstname, adminLastname]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <Text style={[styles.sectionTitle, { color: C.gold }]}>Visiteurs</Text>
      <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
        <TouchableOpacity
          onPress={() => setExpanded((e) => !e)}
          activeOpacity={0.7}
          style={styles.headerRow}
        >
          <Text style={[styles.cardDesc, { color: C.muted, marginBottom: 0, flex: 1 }]}>
            Tous ceux qui ont laissé une trace dans l'espace (réservation, publication, besoin, message, souvenir).
          </Text>
          <Text style={[styles.toggleIcon, { color: C.muted }]}>{expanded ? "▾" : "▸"}</Text>
        </TouchableOpacity>

        {expanded && (
          <View style={{ marginTop: 10 }}>
            {loading ? (
              <ActivityIndicator color={C.accent} style={{ marginVertical: 8 }} />
            ) : visitors.length === 0 ? (
              <Text style={[styles.emptyText, { color: C.muted }]}>Aucun visiteur pour l'instant.</Text>
            ) : (
              visitors.map((v, i) => (
                <TouchableOpacity
                  key={identityKey(v.prenom, v.nom)}
                  style={[styles.row, i < visitors.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
                  onPress={() => setProfileTarget({ prenom: v.prenom, nom: v.nom })}
                  activeOpacity={0.7}
                >
                  <PatientAvatar photoUrl={v.photoUrl} firstname={v.prenom} lastname={v.nom} size={36} C={C} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>
                      {v.prenom} {v.nom}
                    </Text>
                    {!!v.motto && (
                      <Text style={styles.motto} numberOfLines={1}>{v.motto}</Text>
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
        <VisitorProfileModal
          visible={!!profileTarget}
          onClose={() => setProfileTarget(null)}
          spaceId={spaceId}
          C={C}
          isAdmin
          prenom={profileTarget.prenom}
          nom={profileTarget.nom}
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
  motto: { fontFamily: "Caveat_600SemiBold", fontSize: 15, color: "#7EC8E3", marginTop: 1 },
  openBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  openBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 16 },
});
