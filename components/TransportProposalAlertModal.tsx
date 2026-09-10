import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { toFrShort } from "@/lib/slotUtils";
import { resolveTransportIdentity, fetchOpenTransportProposalAlerts, type TransportProposalAlert } from "@/lib/transportAlerts";

// Popup affiché à la connexion (admin et visiteur, voir montage dans
// (admin)/_layout.tsx et (visitor)/_layout.tsx) quand une proposition de
// transport (catégorie "transport", voir components/Entraide.tsx) attend une
// réponse de l'auteur du besoin ou de la personne à transporter
// (transport_for_prenom/nom) — demande explicite : "les propositions de
// besoin transport doivent être affichés à l'ouverture de l'app en message
// d'alerte". Même architecture que RelaisAlertModal : requête indépendante,
// pas de "seen" implicite à la fermeture (voir
// avectoi_alerts_close_marks_seen_gotcha) — seul le bouton "Voir les
// propositions" marque seen_by_author (fait dans Entraide.tsx, via
// ?openProposals=1, une fois la modale "Propositions reçues" réellement
// ouverte).
export default function TransportProposalAlertModal({ spaceId, isAdmin }: { spaceId: string; isAdmin: boolean }) {
  const router = useRouter();
  const { theme: C } = useDisplayMode();
  const [identityReady, setIdentityReady] = useState(false);
  const [alerts, setAlerts] = useState<TransportProposalAlert[]>([]);
  // "Plus tard" : masqué pour cette session d'app uniquement (jamais
  // persisté), comme RelaisAlertModal — réapparaît à la prochaine connexion
  // tant qu'aucune action explicite n'a marqué la proposition vue.
  const [sessionHiddenIds, setSessionHiddenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const identity = await resolveTransportIdentity(isAdmin);
      const rows = await fetchOpenTransportProposalAlerts(spaceId, identity);
      setAlerts(rows);
      setIdentityReady(true);
    })();
  }, [spaceId, isAdmin]);

  const visible = alerts.filter((a) => !sessionHiddenIds.has(a.task.id));
  const current = visible[0];

  function handleView() {
    if (!current) return;
    setAlerts((prev) => prev.filter((a) => a.task.id !== current.task.id));
    router.push(`/(${isAdmin ? "admin" : "visitor"})/entraide?focusTaskId=${current.task.id}&openProposals=1` as any);
  }

  function handleLater() {
    if (!current) return;
    setSessionHiddenIds((prev) => new Set(prev).add(current.task.id));
  }

  if (!identityReady || !current) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={styles.emoji}>🚗</Text>
          <Text style={[styles.title, { color: C.text }]}>Proposition de transport</Text>
          <View style={[styles.detailBox, { borderColor: C.border }]}>
            <Text style={[styles.detailRow, { color: C.text }]}>{current.task.title}</Text>
            {current.proposals.map((p) => (
              <Text key={p.id} style={[styles.proposalLine, { color: C.text }]}>
                🙋 {p.prenom} {p.nom} — {toFrShort(new Date(p.date + "T12:00:00"))}
                {p.offers_out && p.out_time ? ` · aller ${p.out_time}` : ""}
                {p.offers_return && p.return_time ? ` · retour ${p.return_time}` : ""}
              </Text>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.btnFull, { backgroundColor: C.accent }]}
            onPress={handleView}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryText}>Voir les propositions</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnSecondary, { borderColor: C.border }]}
            onPress={handleLater}
            activeOpacity={0.85}
          >
            <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Plus tard</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
  },
  emoji: { fontSize: 44, marginBottom: 16 },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 20,
    marginBottom: 14,
    textAlign: "center",
  },
  detailBox: { width: "100%", borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 18, gap: 8 },
  detailRow: { fontFamily: "DM_Sans_700Bold", fontSize: 15 },
  proposalLine: { fontFamily: "DM_Sans_400Regular", fontSize: 13, lineHeight: 19 },
  btn: { width: "100%", borderRadius: 12, paddingVertical: 15, alignItems: "center", borderWidth: 1 },
  btnFull: { width: "100%", borderRadius: 12, paddingVertical: 15, alignItems: "center", marginBottom: 10 },
  btnSecondary: { borderWidth: 1 },
  btnSecondaryText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14, textAlign: "center" },
  btnPrimaryText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff", textAlign: "center" },
});
