import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { getVisitorSession } from "@/lib/visitorSession";
import { fetchDueTodayCommitments } from "@/lib/dueTodayAlerts";
import type { Task } from "@/lib/types";

const CATEGORY_ICONS: Partial<Record<Task["category"], string>> = {
  repas: "🍽️", affaires: "👕", administratif: "🗂️", autre: "💡",
};
const CATEGORY_LABELS: Partial<Record<Task["category"], string>> = {
  repas: "Repas", affaires: "Affaires", administratif: "Administratif", autre: "Autre",
};

// Popup affiché à la connexion (admin et visiteur, voir montage dans
// (admin)/_layout.tsx et (visitor)/_layout.tsx) pour chaque besoin pris en
// charge par cette identité dont l'échéance (date_limite) tombe aujourd'hui
// — demande explicite : un rappel le jour même, avec un bouton "Fait" qui
// valide directement le besoin. "Fait" ouvre la sheet de confirmation
// "Marquer fait" d'Entraide.tsx (PIN pré-vérifié pour son propre engagement
// + photo optionnelle) via ?openDone=1, même mécanisme que RelaisAlertModal
// ("Je m'en occupe" -> ?openClaim=1) plutôt que de dupliquer cette logique
// ici. "Fermer" passe à l'alerte suivante ou, une fois la dernière traitée,
// revient sur "Ma semaine".
//
// Alertes "regardées" pendant cette session d'app uniquement (jamais
// persisté, même principe que sessionHiddenIds dans RelaisAlertModal) : le
// popup ne doit pas revenir tant que l'app tourne, mais doit réapparaître à
// la prochaine connexion si le besoin est toujours en attente ce jour-là.
export default function TaskDueTodayAlertModal({ spaceId, isAdmin }: { spaceId: string; isAdmin: boolean }) {
  const router = useRouter();
  const { theme: C } = useDisplayMode();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessionHiddenIds, setSessionHiddenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      if (isAdmin) {
        const rows = await fetchDueTodayCommitments(spaceId, { isAdmin: true, prenom: "", nom: "", pin: "ADMIN" });
        setTasks(rows);
        return;
      }
      const session = await getVisitorSession();
      const rows = await fetchDueTodayCommitments(spaceId, {
        isAdmin: false,
        prenom: session?.prenom ?? "",
        nom: session?.nom ?? "",
        pin: session?.pin ?? "",
      });
      setTasks(rows);
    })();
  }, [spaceId, isAdmin]);

  const alerts = tasks.filter((t) => !sessionHiddenIds.has(t.id));
  const current = alerts[0];
  const basePath = `/(${isAdmin ? "admin" : "visitor"})`;

  function goHome() {
    router.push({ pathname: `${basePath}/home/ma-semaine`, params: { resetTiles: "1" } } as any);
  }

  function handleDone() {
    if (!current) return;
    const wasLast = alerts.length <= 1;
    setSessionHiddenIds((prev) => new Set(prev).add(current.id));
    router.push(`${basePath}/entraide?focusTaskId=${current.id}&openDone=1` as any);
    void wasLast;
  }

  function handleClose() {
    if (!current) return;
    const wasLast = alerts.length <= 1;
    setSessionHiddenIds((prev) => new Set(prev).add(current.id));
    if (wasLast) goHome();
  }

  if (!current) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={styles.emoji}>⏰</Text>
          <Text style={[styles.title, { color: C.text }]}>C'est aujourd'hui !</Text>
          <View style={[styles.detailBox, { borderColor: C.border }]}>
            <Text style={[styles.detailRow, { color: C.text }]}>
              {CATEGORY_ICONS[current.category] ?? "💡"} Besoin {CATEGORY_LABELS[current.category] ?? current.category}
            </Text>
            {!!current.description && (
              <Text style={[styles.detailBody, { color: C.muted }]}>{current.description}</Text>
            )}
          </View>
          <Text style={[styles.body, { color: C.muted }]}>
            Tu t'en étais occupé·e — marque-le comme fait une fois que c'est fini.
          </Text>
          <TouchableOpacity
            style={[styles.btnFull, { backgroundColor: C.accent }]}
            onPress={handleDone}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryText}>✓ C'est fait</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnSecondary, { borderColor: C.border }]}
            onPress={handleClose}
            activeOpacity={0.85}
          >
            <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Fermer</Text>
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
  detailBox: { width: "100%", borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 14, gap: 6 },
  detailRow: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  detailBody: { fontFamily: "DM_Sans_400Regular", fontSize: 13, lineHeight: 20 },
  body: {
    fontFamily: "DM_Sans_400Regular",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 18,
  },
  btn: { width: "100%", borderRadius: 12, paddingVertical: 15, alignItems: "center" },
  btnFull: { width: "100%", borderRadius: 12, paddingVertical: 15, alignItems: "center", marginBottom: 10 },
  btnSecondary: { borderWidth: 1 },
  btnSecondaryText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14, textAlign: "center" },
  btnPrimaryText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff", textAlign: "center" },
});
