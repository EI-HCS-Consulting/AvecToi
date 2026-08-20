import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { getVisitorSession } from "@/lib/visitorSession";
import { supabase } from "@/lib/supabase";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { toFrShort } from "@/lib/slotUtils";
import type { Task } from "@/lib/types";

function relaisIdentityKey(prenom: string, nom: string) {
  return `${prenom}|${nom}`.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

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

  useEffect(() => {
    (async () => {
      if (isAdmin) {
        const { data } = await supabase.auth.getUser();
        setMyPrenom((data.user?.user_metadata?.firstname ?? "").trim());
        setMyNom((data.user?.user_metadata?.lastname ?? "").trim());
      } else {
        const session = await getVisitorSession();
        setMyPrenom(session?.prenom ?? "");
        setMyNom(session?.nom ?? "");
      }
      setIdentityReady(true);
    })();
  }, [isAdmin]);

  useEffect(() => {
    if (!identityReady) return;
    supabase
      .from("tasks")
      .select("*")
      .eq("space_id", spaceId)
      .eq("category", "relais")
      .eq("status", "ouvert")
      .then(({ data }) => setTasks((data as Task[] | null) ?? []));
  }, [identityReady, spaceId]);

  const myKey = relaisIdentityKey(myPrenom, myNom);
  const alerts = tasks.filter((t) => {
    const isSelfAuthor = isAdmin
      ? t.author_pin === "ADMIN"
      : relaisIdentityKey(t.author_prenom ?? "", t.author_nom ?? "") === myKey;
    if (isSelfAuthor) return false;
    const targeted = t.relais_visible_to !== "some"
      || (t.relais_recipients ?? []).some((r) => relaisIdentityKey(r.prenom, r.nom) === myKey);
    if (!targeted) return false;
    const dismissed = t.relais_dismissed_by.some((d) => relaisIdentityKey(d.prenom, d.nom) === myKey);
    return !dismissed;
  });
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
            </View>
          )}
          {!!current.description && (
            <Text style={[styles.body, { color: C.muted }]}>{current.description}</Text>
          )}
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
              style={[styles.btn, { backgroundColor: C.accent }]}
              onPress={handleAccept}
              disabled={acting}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryText}>🙋 Je m'en occupe</Text>
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
  btnSecondary: { borderWidth: 1 },
  btnSecondaryText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  btnPrimaryText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
});
