import { useState, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { supabase } from "@/lib/supabase";
import PatientAvatar from "@/components/PatientAvatar";
import VisitorProfileModal from "@/components/VisitorProfileModal";
import { relationLabel } from "@/lib/relations";
import type { Theme } from "@/lib/themes";

// Corps de liste partagé entre VisitorsBlock (bloc repliable des Paramètres
// admin) et VisitorsListModal (bottom-sheet ouverte depuis le bouton
// "Visiteurs" de Mon compte, visiteur comme admin) — même principe que
// IntervenantsList.tsx / IntervenantsBlock.tsx pour les intervenants. Requête
// dupliquée depuis VisitorsBlock.tsx plutôt que factorisée, pour rester
// cohérent avec ce précédent (liste + bloc repliable ne partagent pas leur
// query non plus).
interface VisitorRow {
  prenom: string;
  nom: string;
  photoUrl: string | null;
  motto: string | null;
  relation: string | null;
}

function visitorPhotoUrl(spaceId: string, filename: string) {
  const { data } = supabase.storage.from("visitor-photos").getPublicUrl(`${spaceId}/${filename}`);
  return data.publicUrl;
}

// PostgREST fait échouer le select entier (et pas juste la colonne en
// trop) si "relation" n'existe pas encore en base — les migrations de ce
// projet sont appliquées manuellement par Guillaume via le dashboard
// Supabase, pas automatiquement au merge (voir
// 20260821_visitor_profiles_relation.sql). Sans ce filet, photo/motto
// disparaîtraient eux aussi tant que la migration n'a pas été rejouée.
async function fetchVisitorProfiles(spaceId: string) {
  const full = await supabase.from("visitor_profiles").select("prenom,nom,photo,motto,relation").eq("space_id", spaceId);
  if (!full.error) return full;
  console.error("[VisitorsList] select avec relation en échec, repli sans cette colonne:", full.error);
  const fallback = await supabase.from("visitor_profiles").select("prenom,nom,photo,motto").eq("space_id", spaceId);
  return { data: (fallback.data || []).map((p) => ({ ...p, relation: null as string | null })), error: fallback.error };
}

// Insensible aux accents en plus de la casse — même principe que
// VisitorsBlock.tsx / app/(visitor)/account.tsx.
function identityKey(prenom: string, nom: string) {
  const norm = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return `${norm(prenom)}|${norm(nom)}`;
}

interface Props {
  spaceId: string;
  C: Theme;
  // Passé à VisitorProfileModal pour n'afficher les coordonnées (téléphone/
  // email) qu'à l'admin — un visiteur consultant la fiche d'un autre visiteur
  // ne doit pas voir ses coordonnées.
  isAdmin: boolean;
  // Utilisés uniquement pour exclure l'admin de la liste, voir VisitorsBlock.tsx.
  adminFirstname?: string | null;
  adminLastname?: string | null;
}

export default function VisitorsList({ spaceId, C, isAdmin, adminFirstname, adminLastname }: Props) {
  const [loading, setLoading] = useState(true);
  const [visitors, setVisitors] = useState<VisitorRow[]>([]);
  const [profileTarget, setProfileTarget] = useState<{ prenom: string; nom: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [resv, resvGuestOf, news, tasksAuthor, tasksClaimed, tasksReturnClaimed, souv, msgs, profiles, intervenants] = await Promise.all([
      supabase.from("reservations").select("prenom,nom").eq("space_id", spaceId),
      supabase.from("reservations").select("booked_by_prenom,booked_by_nom").eq("space_id", spaceId),
      supabase.from("news_entries").select("author_prenom,author_nom").eq("space_id", spaceId),
      supabase.from("tasks").select("author_prenom,author_nom").eq("space_id", spaceId),
      supabase.from("tasks").select("claimed_by_prenom,claimed_by_nom").eq("space_id", spaceId),
      supabase.from("tasks").select("transport_return_claimed_by_prenom,transport_return_claimed_by_nom").eq("space_id", spaceId),
      supabase.from("souvenirs").select("uploaded_by_prenom,uploaded_by_nom").eq("space_id", spaceId),
      supabase.from("support_messages").select("author_prenom,author_nom").eq("space_id", spaceId),
      fetchVisitorProfiles(spaceId),
      supabase.from("intervenant_profiles").select("prenom,nom").eq("space_id", spaceId),
    ]);

    if (profiles.error) console.error("[VisitorsList] visitor_profiles select failed:", profiles.error);
    if (intervenants.error) console.error("[VisitorsList] intervenant_profiles select failed:", intervenants.error);

    // Ce bloc ne doit lister que les visiteurs : ni les intervenants (qui
    // laissent eux aussi des traces — réservations, tâches...), ni l'admin
    // lui-même.
    const excludedKeys = new Set((intervenants.data || []).map((i) => identityKey(i.prenom, i.nom)));
    if (adminFirstname && adminLastname) excludedKeys.add(identityKey(adminFirstname, adminLastname));

    const byKey = new Map<string, VisitorRow>();
    function add(prenom?: string | null, nom?: string | null) {
      if (!prenom?.trim() || !nom?.trim()) return;
      const key = identityKey(prenom, nom);
      if (excludedKeys.has(key)) return;
      if (!byKey.has(key)) byKey.set(key, { prenom: prenom.trim(), nom: nom.trim(), photoUrl: null, motto: null, relation: null });
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
      const row = byKey.get(identityKey(p.prenom, p.nom));
      if (!row) continue;
      if (p.photo) row.photoUrl = visitorPhotoUrl(spaceId, p.photo);
      if (p.motto) row.motto = p.motto;
      if (p.relation) row.relation = p.relation;
    }

    setVisitors(
      Array.from(byKey.values()).sort(
        (a, b) => a.nom.localeCompare(b.nom, "fr") || a.prenom.localeCompare(b.prenom, "fr")
      )
    );
    setLoading(false);
  }, [spaceId, adminFirstname, adminLastname]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      {loading ? (
        <ActivityIndicator color={C.accent} style={{ marginVertical: 32 }} />
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scroll}>
          {visitors.length === 0 ? (
            <Text style={[styles.emptyText, { color: C.muted }]}>Aucun visiteur enregistré pour l'instant.</Text>
          ) : (
            visitors.map((v, i) => (
              <TouchableOpacity
                key={identityKey(v.prenom, v.nom)}
                style={[styles.row, i < visitors.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
                onPress={() => setProfileTarget({ prenom: v.prenom, nom: v.nom })}
                activeOpacity={0.7}
              >
                <PatientAvatar photoUrl={v.photoUrl} firstname={v.prenom} lastname={v.nom} size={44} C={C} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>
                    {v.prenom} {v.nom}
                  </Text>
                  {!!v.relation && (
                    <Text style={[styles.relation, { color: C.muted }]} numberOfLines={1}>{relationLabel(v.relation)}</Text>
                  )}
                  {!!v.motto && (
                    <Text style={styles.motto} numberOfLines={1}>{v.motto}</Text>
                  )}
                </View>
                <Text style={[styles.chevron, { color: C.muted }]}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {profileTarget && (
        <VisitorProfileModal
          visible={!!profileTarget}
          onClose={() => setProfileTarget(null)}
          spaceId={spaceId}
          C={C}
          isAdmin={isAdmin}
          prenom={profileTarget.prenom}
          nom={profileTarget.nom}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  // maxHeight explicite sur le ScrollView lui-même — voir le commentaire
  // équivalent dans IntervenantsList.tsx (Yoga ne résout pas flex:1 sans
  // hauteur définie côté parent, la liste resterait invisible sinon).
  scrollView: { maxHeight: 400 },
  scroll: { paddingBottom: 24 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center", marginVertical: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  name: { fontFamily: "DM_Sans_600SemiBold", fontSize: 15 },
  relation: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 1 },
  motto: { fontFamily: "Caveat_600SemiBold", fontSize: 16, color: "#7EC8E3", marginTop: 1 },
  chevron: { fontFamily: "DM_Sans_700Bold", fontSize: 16 },
});
