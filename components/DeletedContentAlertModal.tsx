import { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { supabase } from "@/lib/supabase";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { getVisitorSession, VisitorSession } from "@/lib/visitorSession";
import { fetchOpenDeletedContentAlerts, DeletedContentAlert } from "@/lib/deletedContentAlerts";

// Popup affiché à la connexion (visiteur uniquement, l'admin ne se supprime
// jamais son propre contenu "en douceur", voir deletedContentAlerts.ts) quand
// l'admin a supprimé une de ses publications (besoin/nouvelle/message). Même
// principe "une alerte à la fois" que RebookingAlertModal.tsx : la suivante
// apparaît une fois celle-ci traitée. Le détail "supprimé par l'admin" reste
// aussi visible dans Mon Compte (bandeau rouge sur la ligne concernée), ce
// popup ne fait que signaler l'événement à la connexion.
const KIND_LABEL: Record<DeletedContentAlert["kind"], string> = {
  besoin: "un besoin",
  nouvelle: "une nouvelle",
  message: "un message dans Soutien",
};

export default function DeletedContentAlertModal({ spaceId }: { spaceId: string }) {
  const { theme: C } = useDisplayMode();
  const [session, setSession] = useState<VisitorSession | null>(null);
  const [alerts, setAlerts] = useState<DeletedContentAlert[]>([]);

  useEffect(() => {
    getVisitorSession().then(setSession);
  }, []);

  const load = useCallback(async (s: VisitorSession) => {
    const rows = await fetchOpenDeletedContentAlerts(spaceId, s);
    setAlerts(rows);
  }, [spaceId]);

  useEffect(() => {
    if (session) load(session);
  }, [session, load]);

  const current = alerts[0];

  async function markSeen() {
    if (!current) return;
    await supabase.from(current.table).update({ deleted_seen: true }).eq("id", current.id);
    setAlerts((prev) => prev.filter((a) => a.id !== current.id));
  }

  if (!current) return null;

  const message = "L'administrateur du compte a supprimé " + KIND_LABEL[current.kind]
    + " que tu avais publié : « " + current.preview + " »";

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={styles.emoji}>🗑️</Text>
          <Text style={[styles.title, { color: C.text }]}>Publication supprimée</Text>
          <Text style={[styles.body, { color: C.muted }]}>{message}</Text>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: C.accent }]}
            onPress={markSeen}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryText}>OK, j'ai compris</Text>
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
    maxWidth: 360,
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
  body: {
    fontFamily: "DM_Sans_400Regular",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 28,
  },
  btn: { width: "100%", borderRadius: 12, paddingVertical: 15, alignItems: "center" },
  btnPrimaryText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
});
