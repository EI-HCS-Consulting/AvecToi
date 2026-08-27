import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { toFrShort } from "@/lib/slotUtils";
import { relaisIdentityKey, resolveRelaisIdentity, fetchOpenRelaisAlerts } from "@/lib/relaisAlerts";
import type { Task } from "@/lib/types";

// Popup affiché à la connexion (admin et visiteur, voir montage dans
// (admin)/_layout.tsx et (visitor)/_layout.tsx) pour un besoin de relais
// ponctuel (catégorie "relais", voir components/Entraide.tsx) qui cible
// l'identité courante et qu'elle n'a pas déjà écarté. Interroge directement
// `tasks` (pas de contexte partagé la contenant déjà) et gère son propre
// état local plutôt que le hack "hiddenId" de BookingProposalAlertModal :
// ici l'action met à jour la liste chargée directement, pas besoin de
// masquer le temps qu'un contexte externe rattrape son état.
export default function RelaisAlertModal({ spaceId, isAdmin }: { spaceId: string; isAdmin: boolean }) {
  const router = useRouter();
  const { theme: C } = useDisplayMode();
  const [myPrenom, setMyPrenom] = useState("");
  const [myNom, setMyNom] = useState("");
  const [identityReady, setIdentityReady] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [acting, setActing] = useState(false);
  // Alertes "regardées" pendant cette session d'app uniquement (jamais
  // persisté) — voir handleLater ci-dessous : le popup ne doit pas revenir
  // tant que l'app tourne, mais doit réapparaître à la prochaine connexion,
  // et rester consultable dans "Mes alertes" entre-temps.
  const [sessionHiddenIds, setSessionHiddenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const identity = await resolveRelaisIdentity(isAdmin);
      setMyPrenom(identity.prenom);
      setMyNom(identity.nom);
      setIdentityReady(true);
    })();
  }, [isAdmin]);

  useEffect(() => {
    if (!identityReady) return;
    fetchOpenRelaisAlerts(spaceId, isAdmin, { prenom: myPrenom, nom: myNom }).then(setTasks);
  }, [identityReady, spaceId, isAdmin, myPrenom, myNom]);

  const alerts = tasks.filter((t) => !sessionHiddenIds.has(t.id));
  const current = alerts[0];

  async function handleAccept() {
    if (!current) return;
    setActing(true);
    setTasks((prev) => prev.filter((t) => t.id !== current.id));
    router.push(`/(${isAdmin ? "admin" : "visitor"})/entraide?focusTaskId=${current.id}&openClaim=1` as any);
    setActing(false);
  }

  async function handleDismiss() {
    if (!current) return;
    setActing(true);
    const nextDismissed = [...current.relais_dismissed_by, { prenom: myPrenom, nom: myNom }];
    await supabase.from("tasks").update({ relais_dismissed_by: nextDismissed }).eq("id", current.id);
    setTasks((prev) => prev.map((t) => (t.id === current.id ? { ...t, relais_dismissed_by: nextDismissed } : t)));
    setActing(false);
  }

  function handleLater() {
    if (!current) return;
    setSessionHiddenIds((prev) => new Set(prev).add(current.id));
  }

  if (!current) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={styles.emoji}>🆘</Text>
          <Text style={[styles.title, { color: C.text }]}>Besoin de relais</Text>
          {!!(current.author_prenom || current.relais_start_date) && (
            <View style={[styles.detailBox, { borderColor: C.border }]}>
              {!!current.author_prenom && (
                <Text style={[styles.detailRow, { color: C.text }]}>🙋 Publié par {current.author_prenom}</Text>
              )}
              {!!current.relais_start_date && !!current.date_limite && (
                <Text style={[styles.detailRow, { color: C.text }]}>
                  📅 Du {toFrShort(new Date(current.relais_start_date + "T12:00:00"))} au {toFrShort(new Date(current.date_limite + "T12:00:00"))}
                </Text>
              )}
              {current.relais_visible_to === "some" && !!current.relais_recipients?.length && (
                <Text style={[styles.detailRow, { color: C.text }]}>
                  🙋 Sollicité·e·s : {current.relais_recipients.map((r) => `${r.prenom} ${r.nom}`.trim()).join(", ")}
                </Text>
              )}
            </View>
          )}
          {!!current.description && (
            <Text style={[styles.body, { color: C.muted }]}>{current.description}</Text>
          )}
          <TouchableOpacity
            style={[styles.btnFull, { backgroundColor: C.accent }]}
            onPress={handleAccept}
            disabled={acting}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryText}>🙋 Je m'en occupe</Text>
          </TouchableOpacity>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary, { borderColor: C.border }]}
              onPress={handleDismiss}
              disabled={acting}
              activeOpacity={0.85}
            >
              <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Pas cette fois</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary, { borderColor: C.border }]}
              onPress={handleLater}
              disabled={acting}
              activeOpacity={0.85}
            >
              <Text style={[styles.btnSecondaryText, { color: C.muted }]}>🗓️ Je regarde mon planning</Text>
            </TouchableOpacity>
          </View>
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
  detailBox: { width: "100%", borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 14, gap: 6 },
  detailRow: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  body: {
    fontFamily: "DM_Sans_400Regular",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 18,
  },
  row: { flexDirection: "row", gap: 10, width: "100%" },
  btn: { flex: 1, borderRadius: 12, paddingVertical: 15, alignItems: "center" },
  btnFull: { width: "100%", borderRadius: 12, paddingVertical: 15, alignItems: "center", marginBottom: 10 },
  btnSecondary: { borderWidth: 1 },
  btnSecondaryText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14, textAlign: "center" },
  btnPrimaryText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff", textAlign: "center" },
});
