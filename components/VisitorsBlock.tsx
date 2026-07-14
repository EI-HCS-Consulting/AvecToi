import { useState, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { supabase } from "@/lib/supabase";
import PatientAvatar from "@/components/PatientAvatar";
import VisitorProfileModal from "@/components/VisitorProfileModal";
import type { Theme } from "@/lib/themes";

// Bloc "Visiteurs" des Paramètres admin — liste tout le monde ayant laissé une
// trace dans l'espace (réservation, publication, besoin Entraide, message de
// soutien, souvenir, ou simple photo de profil). Il n'existe pas de compte
// visiteur ni de table de connexion : l'identité est donc, comme partout
// ailleurs dans l'App (VisitorProfileModal, "Mes contributions"), approximée
// par prénom+nom déduit de ce qui a été saisi.
interface VisitorRow {
  prenom: string;
  nom: string;
  photoUrl: string | null;
}

function visitorPhotoUrl(spaceId: string, filename: string) {
  const { data } = supabase.storage.from("visitor-photos").getPublicUrl(`${spaceId}/${filename}`);
  return data.publicUrl;
}

// Insensible aux accents en plus de la casse (normalize + suppression des
// diacritiques, même principe que sanitize() dans app/(visitor)/account.tsx)
// — un même visiteur peut être saisi "François"/"Francois" selon l'écran/la
// correction automatique du téléphone ; sans ça, sa photo (visitor_profiles)
// ne se raccrocherait pas à ses réservations/publications.
function identityKey(prenom: string, nom: string) {
  const norm = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return `${norm(prenom)}|${norm(nom)}`;
}

interface Props {
  spaceId: string;
  C: Theme;
}

export default function VisitorsBlock({ spaceId, C }: Props) {
  const [loading, setLoading] = useState(true);
  const [visitors, setVisitors] = useState<VisitorRow[]>([]);
  const [profileTarget, setProfileTarget] = useState<{ prenom: string; nom: string } | null>(null);
  // Replié par défaut, comme les sous-rubriques de l'Historique juste en
  // dessous — s'ouvre vers le bas en cliquant sur le bloc (titre ou texte).
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [resv, resvGuestOf, news, tasksAuthor, tasksClaimed, tasksReturnClaimed, souv, msgs, profiles] = await Promise.all([
      supabase.from("reservations").select("prenom,nom").eq("space_id", spaceId),
      supabase.from("reservations").select("booked_by_prenom,booked_by_nom").eq("space_id", spaceId),
      supabase.from("news_entries").select("author_prenom,author_nom").eq("space_id", spaceId),
      supabase.from("tasks").select("author_prenom,author_nom").eq("space_id", spaceId),
      supabase.from("tasks").select("claimed_by_prenom,claimed_by_nom").eq("space_id", spaceId),
      supabase.from("tasks").select("transport_return_claimed_by_prenom,transport_return_claimed_by_nom").eq("space_id", spaceId),
      supabase.from("souvenirs").select("uploaded_by_prenom,uploaded_by_nom").eq("space_id", spaceId),
      supabase.from("support_messages").select("author_prenom,author_nom").eq("space_id", spaceId),
      supabase.from("visitor_profiles").select("prenom,nom,photo").eq("space_id", spaceId),
    ]);

    const byKey = new Map<string, VisitorRow>();
    function add(prenom?: string | null, nom?: string | null) {
      if (!prenom?.trim() || !nom?.trim()) return;
      const key = identityKey(prenom, nom);
      if (!byKey.has(key)) byKey.set(key, { prenom: prenom.trim(), nom: nom.trim(), photoUrl: null });
    }
    (resv.data || []).forEach((r) => add(r.prenom, r.nom));
    (resvGuestOf.data || []).forEach((r) => add(r.booked_by_prenom, r.booked_by_nom));
    (news.data || []).forEach((n) => add(n.author_prenom, n.author_nom));
    (tasksAuthor.data || []).forEach((t) => add(t.author_prenom, t.author_nom));
    (tasksClaimed.data || []).forEach((t) => add(t.claimed_by_prenom, t.claimed_by_nom));
    (tasksReturnClaimed.data || []).forEach((t) => add(t.transport_return_claimed_by_prenom, t.transport_return_claimed_by_nom));
    (souv.data || []).forEach((s) => add(s.uploaded_by_prenom, s.uploaded_by_nom));
    (msgs.data || []).forEach((m) => add(m.author_prenom, m.author_nom));
    (profiles.data || []).forEach((p) => add(p.prenom, p.nom));

    for (const p of profiles.data || []) {
      if (!p.photo) continue;
      const row = byKey.get(identityKey(p.prenom, p.nom));
      if (row) row.photoUrl = visitorPhotoUrl(spaceId, p.photo);
    }

    setVisitors(
      Array.from(byKey.values()).sort(
        (a, b) => a.nom.localeCompare(b.nom, "fr") || a.prenom.localeCompare(b.prenom, "fr")
      )
    );
    setLoading(false);
  }, [spaceId]);

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
                  <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>
                    {v.prenom} {v.nom}
                  </Text>
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
  name: { flex: 1, fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  openBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  openBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 16 },
});
