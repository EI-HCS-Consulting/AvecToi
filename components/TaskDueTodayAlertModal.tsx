import { useCallback, useEffect, useState } from "react";
import { AppState, View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { getVisitorSession } from "@/lib/visitorSession";
import { supabase } from "@/lib/supabase";
import { fetchDueTodayCommitments, type DueTodayAlert } from "@/lib/dueTodayAlerts";
import type { Task } from "@/lib/types";

const CATEGORY_ICONS: Partial<Record<Task["category"], string>> = {
  repas: "🍽️", affaires: "👕", administratif: "🗂️", autre: "💡", courses: "🛒",
};
const CATEGORY_LABELS: Partial<Record<Task["category"], string>> = {
  repas: "Repas", affaires: "Affaires", administratif: "Administratif", autre: "Autre", courses: "Courses",
};

// Popup affiché à la connexion (admin et visiteur, voir montage dans
// (admin)/_layout.tsx et (visitor)/_layout.tsx) pour chaque besoin pris en
// charge par cette identité dont l'échéance (date_limite) tombe aujourd'hui
// — demande explicite : un rappel le jour même, avec un bouton "Fait" qui
// valide directement le besoin. Pour repas/affaires/administratif/autre,
// "Fait" ouvre la sheet de confirmation "Marquer fait" d'Entraide.tsx (PIN
// pré-vérifié pour son propre engagement + photo optionnelle) via
// ?openDone=1, même mécanisme que RelaisAlertModal ("Je m'en occupe" ->
// ?openClaim=1) plutôt que de dupliquer cette logique ici. Pour courses (pas
// de PIN par article), le bouton principal ouvre directement l'aperçu de la
// liste (?openShoppingList=1) et un second bouton "✓ Fait" (voir handleFait)
// marque achetés les articles que j'ai pris en charge (cochage = attribution,
// "Fait" = achat réel une fois les courses faites) et ne referme le besoin
// que quand plus personne n'a d'article en attente d'achat — utilisable par
// toute personne ayant coché ≥1 article, pas seulement la preneuse formelle
// (même logique que courseFaitEligible dans Entraide.tsx). "Fermer" passe à
// l'alerte suivante ou, une fois la dernière traitée, revient sur "Ma
// semaine".
//
// Alertes "regardées" le temps de rester sur l'écran courant uniquement
// (jamais persisté) : le popup ne doit pas réapparaître en boucle pendant
// qu'on clique "Fermer" alerte après alerte, mais doit revenir à chaque
// nouvelle connexion/réouverture de l'app (y compris un simple retour au
// premier plan depuis l'arrière-plan, pas seulement un relancement complet)
// tant que le besoin n'a pas été marqué "fait" — demande explicite : le
// rappel doit "revenir toute la journée à chaque connexion". On re-fetch et
// on vide sessionHiddenIds à chaque passage à "active" pour ça.
export default function TaskDueTodayAlertModal({ spaceId, isAdmin }: { spaceId: string; isAdmin: boolean }) {
  const router = useRouter();
  const { theme: C } = useDisplayMode();
  const [alertsData, setAlertsData] = useState<DueTodayAlert[]>([]);
  const [sessionHiddenIds, setSessionHiddenIds] = useState<Set<string>>(new Set());
  // Identité courante — gardée à part de fetchDueTodayCommitments pour être
  // réutilisée par le bouton "Fait" (courses, voir handleFait) sans re-
  // résoudre l'identité une 2e fois.
  const [identity, setIdentity] = useState<{ prenom: string; nom: string } | null>(null);

  const refresh = useCallback(async () => {
    if (isAdmin) {
      // Le matching des articles de courses (bought_by_prenom/nom) se fait
      // sur le vrai nom de l'admin, pas un sentinel — comme dans
      // ShoppingListModal.tsx, seul endroit qui écrit ces colonnes.
      const { data } = await supabase.auth.getUser();
      const prenom = (data.user?.user_metadata?.firstname ?? "").trim();
      const nom = (data.user?.user_metadata?.lastname ?? "").trim();
      setIdentity({ prenom, nom });
      const rows = await fetchDueTodayCommitments(spaceId, { isAdmin: true, prenom, nom, pin: "ADMIN" });
      setAlertsData(rows);
      return;
    }
    const session = await getVisitorSession();
    setIdentity({ prenom: session?.prenom ?? "", nom: session?.nom ?? "" });
    const rows = await fetchDueTodayCommitments(spaceId, {
      isAdmin: false,
      prenom: session?.prenom ?? "",
      nom: session?.nom ?? "",
      pin: session?.pin ?? "",
    });
    setAlertsData(rows);
  }, [spaceId, isAdmin]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        setSessionHiddenIds(new Set());
        refresh();
      }
    });
    return () => sub.remove();
  }, [refresh]);

  const alerts = alertsData.filter((a) => !sessionHiddenIds.has(a.task.id));
  const current = alerts[0];
  const isCourses = current?.task.category === "courses";
  const basePath = `/(${isAdmin ? "admin" : "visitor"})`;

  function goHome() {
    router.push({ pathname: `${basePath}/home/ma-semaine`, params: { resetTiles: "1" } } as any);
  }

  function handleDone() {
    if (!current) return;
    const wasLast = alerts.length <= 1;
    setSessionHiddenIds((prev) => new Set(prev).add(current.task.id));
    // Courses n'a pas de sheet "Marquer fait" dédiée — le bouton principal
    // ouvre directement l'aperçu de la liste (cochage = attribution, voir
    // toggleClaim dans ShoppingListModal.tsx) ; l'achat se marque séparément
    // via le bouton "Fait" ci-dessous (handleFait) ou celui du mur.
    const param = isCourses ? "openShoppingList" : "openDone";
    router.push(`${basePath}/entraide?focusTaskId=${current.task.id}&${param}=1` as any);
    void wasLast;
  }

  function handleClose() {
    if (!current) return;
    const wasLast = alerts.length <= 1;
    setSessionHiddenIds((prev) => new Set(prev).add(current.task.id));
    if (wasLast) goHome();
  }

  // "Fait" (courses uniquement) : marque achetés les articles que j'ai pris
  // en charge (bought_by_* = moi) — jamais ceux attribués à quelqu'un
  // d'autre, le cochage restant une prise en charge distincte de l'achat.
  // Filet de sécurité pour une liste restée bloquée par un cas ancien
  // (articles jamais attribués) : ceux-là sont alors pris à mon nom et
  // marqués achetés en même temps — même logique que markCoursesFait dans
  // Entraide.tsx (voir aussi le bouton "Fait" du mur), dupliquée ici pour
  // éviter un aller-retour d'écran. Ne referme le besoin ("fait") que quand
  // plus aucun article de la liste n'est en attente d'achat, c'est-à-dire
  // quand toutes les personnes engagées ont fait de même.
  async function handleFait() {
    if (!current || !identity) return;
    const wasLast = alerts.length <= 1;
    setSessionHiddenIds((prev) => new Set(prev).add(current.task.id));
    await supabase
      .from("shopping_list_items")
      .update({ bought: true })
      .eq("task_id", current.task.id)
      .eq("bought", false)
      .ilike("bought_by_prenom", identity.prenom)
      .ilike("bought_by_nom", identity.nom);
    await supabase
      .from("shopping_list_items")
      .update({
        bought: true,
        bought_by_prenom: identity.prenom,
        bought_by_nom: identity.nom,
        bought_at: new Date().toISOString(),
      })
      .eq("task_id", current.task.id)
      .eq("bought", false)
      .is("bought_by_prenom", null);
    const { count } = await supabase
      .from("shopping_list_items")
      .select("id", { count: "exact", head: true })
      .eq("task_id", current.task.id)
      .eq("bought", false);
    if ((count ?? 0) === 0) {
      await supabase.from("tasks").update({ status: "fait" }).eq("id", current.task.id);
      await supabase.from("personal_checklist_items").update({ status: "fait" }).eq("task_id", current.task.id);
    }
    if (wasLast) goHome();
  }

  if (!current) return null;
  const { task, items } = current;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={styles.emoji}>⏰</Text>
          <Text style={[styles.title, { color: C.text }]}>C'est aujourd'hui !</Text>
          <View style={[styles.detailBox, { borderColor: C.border }]}>
            <Text style={[styles.detailRow, { color: C.text }]}>
              {CATEGORY_ICONS[task.category] ?? "💡"} Besoin {CATEGORY_LABELS[task.category] ?? task.category}
            </Text>
            {!!task.description && (
              <Text style={[styles.detailBody, { color: C.muted }]}>{task.description}</Text>
            )}
            {!!items?.length && (
              <Text style={[styles.detailBody, { color: C.muted }]}>
                Tu t'es chargé(e) de : {items.join(", ")}
              </Text>
            )}
          </View>
          <Text style={[styles.body, { color: C.muted }]}>
            {isCourses
              ? `Tu t'es engagé(e) à acheter ${items?.length ?? 0} article${(items?.length ?? 0) > 1 ? "s" : ""} de la liste ${task.title} et c'est pour aujourd'hui.`
              : `Tu as pris en charge ce besoin ${task.title} et c'est pour aujourd'hui. Marque-le comme fait si tu t'en es déjà occupé.`}
          </Text>
          <TouchableOpacity
            style={[styles.btnFull, { backgroundColor: C.accent }]}
            onPress={handleDone}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryText}>{isCourses ? "🛒 Voir ma liste" : "✓ C'est fait"}</Text>
          </TouchableOpacity>
          {isCourses && (
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary, { borderColor: C.success, marginBottom: 10 }]}
              onPress={handleFait}
              activeOpacity={0.85}
            >
              <Text style={[styles.btnSecondaryText, { color: C.success }]}>✓ C'est fait</Text>
            </TouchableOpacity>
          )}
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
