import { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { toISO, addDays } from "@/lib/slotUtils";
import { isRelaisFullyCovered } from "@/lib/relaisCoverage";
import { revokeCoAdminForCoverage, checkCoAdminStatus } from "@/lib/coAdmin";
import MiniCalendar from "@/components/MiniCalendar";
import ConfirmModal from "@/components/ConfirmModal";
import type { Theme } from "@/lib/themes";

// Bloc "Mon compte" (admin + visiteur, à côté de MyChecklist) qui récapitule
// les besoins de relais où cette identité a proposé une période (voir
// task_relais_coverage, lib/relaisCoverage.ts) — la carte du besoin dans
// Entraide.tsx montre déjà cette même info, mais uniquement tant que le
// besoin reste visible dans le Mur d'Entraide ; ici c'est un rappel
// permanent, propre à la personne, qui ne dépend pas de retrouver la bonne
// carte.
//
// Regroupé PAR BESOIN (pas par proposition) — demande explicite : montrer la
// période initialement demandée par l'admin, une barre de progression
// jour par jour (vert = couvert par au moins un contributeur, rouge = pas
// encore), puis TOUTES les propositions faites sur ce besoin (pas seulement
// celles de la personne qui regarde) pour qu'elle voie d'un coup d'œil ce
// qu'il reste à combler. Modifier/Annuler ne reste possible que sur SES
// propres propositions (mineRowIds), les autres lignes sont juste
// informatives.
interface TaskInfo {
  id: string; title: string; status: string; deleted_by_admin: boolean;
  relais_start_date: string | null; date_limite: string | null;
}
interface ContribRow {
  id: string;
  prenom: string;
  nom: string;
  start_date: string;
  end_date: string;
}
interface TaskGroup {
  task: TaskInfo;
  rows: ContribRow[];
}

interface Props {
  spaceId: string;
  prenom: string;
  nom: string;
  pin: string;
  C: Theme;
}

// "du 10 au 14 septembre" (un seul nom de mois si les deux bornes tombent
// dans le même mois/année) ou "du 28 septembre au 3 octobre" sinon.
function formatFrRange(startIso: string, endIso: string): string {
  const start = new Date(startIso + "T12:00:00");
  const end = new Date(endIso + "T12:00:00");
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `du ${start.getDate()} au ${end.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`;
  }
  return `du ${start.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} au ${end.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`;
}

// Une case par jour de [startIso, endIso] — vert si ce jour tombe dans au
// moins une plage de coverageRanges, rouge sinon. Le nombre de jours d'un
// besoin de relais reste toujours petit (quelques semaines maximum), pas
// besoin de virtualisation.
function buildDaySquares(
  startIso: string,
  endIso: string,
  coverageRanges: { start_date: string; end_date: string }[],
): { iso: string; day: number; covered: boolean }[] {
  const days: { iso: string; day: number; covered: boolean }[] = [];
  let cursor = new Date(startIso + "T12:00:00");
  const end = new Date(endIso + "T12:00:00");
  while (cursor <= end) {
    const iso = toISO(cursor);
    days.push({
      iso,
      day: cursor.getDate(),
      covered: coverageRanges.some((r) => r.start_date <= iso && r.end_date >= iso),
    });
    cursor = addDays(cursor, 1);
  }
  return days;
}

export default function MyRelaisCommitments({ spaceId, prenom, nom, pin, C }: Props) {
  const router = useRouter();
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  // ids des lignes task_relais_coverage qui m'appartiennent — seules celles-ci
  // affichent Modifier/Annuler dans la liste des contributeurs.
  const [mineRowIds, setMineRowIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Statut co-admin de cette identité — pas rattaché au chargement de
  // groups ci-dessus : un co-admin dont toutes les propositions ont été
  // annulées peut garder un octroi actif sur une autre (voir
  // 20260908_coadmin_per_proposal.sql), le bouton "Paramètres
  // Co-Administrateur" doit rester visible même si groups est vide.
  const [coAdminActive, setCoAdminActive] = useState(false);

  const [editTarget, setEditTarget] = useState<{ row: ContribRow; task: TaskInfo } | null>(null);
  const [editStep, setEditStep] = useState<"start" | "end">("start");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editStartCalMonth, setEditStartCalMonth] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });
  const [editEndCalMonth, setEditEndCalMonth] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });
  const [editSaving, setEditSaving] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<{ row: ContribRow; task: TaskInfo } | null>(null);
  const [cancelSaving, setCancelSaving] = useState(false);

  const load = useCallback(async () => {
    if (!prenom.trim() || !nom.trim() || !pin) {
      setGroups([]);
      setMineRowIds(new Set());
      setLoading(false);
      return;
    }
    const { data: mine } = await supabase
      .from("task_relais_coverage")
      .select("id, start_date, end_date, task:tasks(id, title, status, deleted_by_admin, space_id, relais_start_date, date_limite)")
      .ilike("prenom", prenom.trim())
      .ilike("nom", nom.trim())
      .eq("pin", pin);
    const myRows = ((mine as any[]) ?? []).filter((r) => r.task?.space_id === spaceId && !r.task?.deleted_by_admin);
    const taskById = new Map<string, TaskInfo>();
    for (const r of myRows) if (r.task) taskById.set(r.task.id, r.task as TaskInfo);
    setMineRowIds(new Set(myRows.map((r) => r.id)));

    const taskIds = [...taskById.keys()];
    if (taskIds.length === 0) {
      setGroups([]);
      setLoading(false);
      return;
    }
    const { data: allCoverage } = await supabase
      .from("task_relais_coverage")
      .select("id, task_id, prenom, nom, start_date, end_date")
      .in("task_id", taskIds);
    const rowsByTask = new Map<string, ContribRow[]>();
    for (const r of (allCoverage as any[]) ?? []) {
      const arr = rowsByTask.get(r.task_id) ?? [];
      arr.push({ id: r.id, prenom: r.prenom, nom: r.nom, start_date: r.start_date, end_date: r.end_date });
      rowsByTask.set(r.task_id, arr);
    }
    const built: TaskGroup[] = taskIds
      .map((id) => ({
        task: taskById.get(id)!,
        rows: (rowsByTask.get(id) ?? []).sort((a, b) => a.start_date.localeCompare(b.start_date)),
      }))
      .sort((a, b) => (a.task.relais_start_date ?? "").localeCompare(b.task.relais_start_date ?? ""));
    setGroups(built);
    setLoading(false);
  }, [spaceId, prenom, nom, pin]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!prenom.trim() || !nom.trim()) {
      setCoAdminActive(false);
      return;
    }
    checkCoAdminStatus(spaceId, prenom, nom).then((status) => setCoAdminActive(status === "active"));
  }, [spaceId, prenom, nom]);

  // Recalcule le statut du besoin après modification/annulation d'UNE
  // proposition — relit toutes les lignes task_relais_coverage du besoin
  // (pas seulement celles de cette identité) car d'autres contributeurs
  // peuvent couvrir le reste de la période. Même logique que
  // performRelaisCoverageUnclaim/handleClaim dans Entraide.tsx.
  async function recomputeTaskStatus(taskId: string, relaisStart: string | null, relaisEnd: string | null, currentStatus: string) {
    if (!relaisStart || !relaisEnd) return;
    const { data } = await supabase
      .from("task_relais_coverage")
      .select("start_date, end_date")
      .eq("task_id", taskId);
    const covered = isRelaisFullyCovered((data as any[]) ?? [], relaisStart, relaisEnd);
    if (covered && currentStatus !== "pris_en_charge") {
      await supabase.from("tasks").update({ status: "pris_en_charge" }).eq("id", taskId);
    } else if (!covered && currentStatus === "pris_en_charge") {
      await supabase.from("tasks").update({ status: "ouvert" }).eq("id", taskId);
    }
  }

  function openEdit(row: ContribRow, task: TaskInfo) {
    setEditTarget({ row, task });
    setEditStart(row.start_date);
    setEditEnd(row.end_date);
    const startBase = task.relais_start_date ? new Date(task.relais_start_date + "T12:00:00") : new Date(row.start_date + "T12:00:00");
    setEditStartCalMonth({ year: startBase.getFullYear(), month: startBase.getMonth() });
    const endBase = new Date(row.start_date + "T12:00:00");
    setEditEndCalMonth({ year: endBase.getFullYear(), month: endBase.getMonth() });
    setEditStep("start");
  }

  function closeEdit() {
    setEditTarget(null);
  }

  function confirmEditStart() {
    if (!editStart) return;
    const d = new Date(editStart + "T12:00:00");
    setEditEndCalMonth({ year: d.getFullYear(), month: d.getMonth() });
    setEditStep("end");
  }

  const editPeriodValid = !!editStart && !!editEnd && editEnd >= editStart;

  async function confirmEditPeriod() {
    if (!editTarget || !editPeriodValid) return;
    setEditSaving(true);
    const task = editTarget.task;
    const fullPeriod = !!task.relais_start_date && !!task.date_limite
      && editStart === task.relais_start_date && editEnd === task.date_limite;
    await supabase
      .from("task_relais_coverage")
      .update({ start_date: editStart, end_date: editEnd, full_period: fullPeriod })
      .eq("id", editTarget.row.id);
    await recomputeTaskStatus(task.id, task.relais_start_date, task.date_limite, task.status);
    setEditSaving(false);
    setEditTarget(null);
    await load();
  }

  function openCancel(row: ContribRow, task: TaskInfo) {
    setCancelTarget({ row, task });
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    setCancelSaving(true);
    const { row, task } = cancelTarget;
    await supabase.from("task_relais_coverage").delete().eq("id", row.id);
    await revokeCoAdminForCoverage(row.id);
    await recomputeTaskStatus(task.id, task.relais_start_date, task.date_limite, task.status);
    setCancelSaving(false);
    setCancelTarget(null);
    await load();
  }

  if (loading || (groups.length === 0 && !coAdminActive)) return null;

  return (
    <View style={[styles.block, { backgroundColor: C.card, borderColor: C.border }]}>
      <Text style={[styles.title, { color: C.text }]}>🤝 Mes engagements de relais</Text>

      {groups.map(({ task, rows }) => {
        const isDone = task.status === "fait";
        const daySquares = task.relais_start_date && task.date_limite
          ? buildDaySquares(task.relais_start_date, task.date_limite, rows)
          : [];
        return (
          <View key={task.id} style={[styles.taskGroup, { borderColor: C.border }]}>
            <Text style={[styles.taskTitle, { color: C.text }]}>
              {task.title}{isDone ? " · ✓ Terminé" : ""}
            </Text>
            {task.relais_start_date && task.date_limite && (
              <Text style={[styles.period, { color: C.muted }]}>
                Besoin de relais demandé {formatFrRange(task.relais_start_date, task.date_limite)}
              </Text>
            )}

            {daySquares.length > 0 && (
              <View style={styles.daySquaresRow}>
                {daySquares.map((d) => (
                  <View
                    key={d.iso}
                    style={[styles.daySquare, { backgroundColor: d.covered ? C.success : C.danger }]}
                  >
                    <Text style={styles.daySquareText}>{d.day}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.contribList}>
              {rows.map((r) => (
                <View key={r.id} style={styles.contribRow}>
                  <Text style={[styles.contribText, { color: C.text }]}>
                    {r.prenom} {r.nom} : {formatFrRange(r.start_date, r.end_date)}
                  </Text>
                  {mineRowIds.has(r.id) && !isDone && (
                    <View style={styles.rowActions}>
                      <TouchableOpacity onPress={() => openEdit(r, task)} style={[styles.actionBtn, { borderColor: C.border }]} activeOpacity={0.8}>
                        <Text style={[styles.actionBtnText, { color: C.text }]}>Modifier</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => openCancel(r, task)} style={[styles.actionBtn, { borderColor: "rgba(233,69,96,0.4)" }]} activeOpacity={0.8}>
                        <Text style={[styles.actionBtnText, { color: "#e94560" }]}>Annuler</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        );
      })}

      {coAdminActive && (
        <TouchableOpacity
          onPress={() => router.push("/(admin)/settings" as any)}
          style={[styles.coAdminBtn, { backgroundColor: C.accent }]}
          activeOpacity={0.85}
        >
          <Text style={styles.coAdminBtnText}>⚙️ Paramètres Co-Administrateur</Text>
        </TouchableOpacity>
      )}

      <Modal visible={!!editTarget} transparent animationType="fade" onRequestClose={closeEdit}>
        <View style={styles.overlay}>
          <View style={[styles.editSheet, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={{ alignItems: "center", marginBottom: 14 }}>
              <Text style={{ fontSize: 32, marginBottom: 6 }}>📅</Text>
              <Text style={[styles.editTitle, { color: C.text }]}>
                Modifie ta période — {editStep === "start" ? "Du" : "Au"}
              </Text>
              <Text style={[styles.editSub, { color: C.muted }]}>{editTarget?.task?.title ?? ""}</Text>
            </View>

            {editStep === "start" ? (
              <MiniCalendar
                selDate={editStart}
                onSelect={setEditStart}
                calMonth={editStartCalMonth}
                onMonthChange={setEditStartCalMonth}
                startDate={editTarget?.task?.relais_start_date ? new Date(editTarget.task.relais_start_date + "T12:00:00") : new Date()}
                allowedRange={editTarget?.task?.relais_start_date && editTarget?.task?.date_limite ? {
                  start: new Date(editTarget.task.relais_start_date + "T12:00:00"),
                  end: new Date(editTarget.task.date_limite + "T12:00:00"),
                } : undefined}
                C={C}
                size="lg"
              />
            ) : (
              <MiniCalendar
                selDate={editEnd}
                onSelect={setEditEnd}
                calMonth={editEndCalMonth}
                onMonthChange={setEditEndCalMonth}
                startDate={editStart ? new Date(editStart + "T12:00:00") : new Date()}
                allowedRange={editTarget?.task?.relais_start_date && editTarget?.task?.date_limite ? {
                  start: new Date(editTarget.task.relais_start_date + "T12:00:00"),
                  end: new Date(editTarget.task.date_limite + "T12:00:00"),
                } : undefined}
                C={C}
                size="lg"
              />
            )}

            <View style={styles.editBtns}>
              <TouchableOpacity
                onPress={editStep === "start" ? closeEdit : () => setEditStep("start")}
                style={[styles.btnSecondary, { borderColor: C.border }]}
              >
                <Text style={[styles.btnSecondaryText, { color: C.muted }]}>{editStep === "start" ? "Annuler" : "Retour"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={editStep === "start" ? confirmEditStart : confirmEditPeriod}
                disabled={editStep === "start" ? !editStart : (!editPeriodValid || editSaving)}
                style={[
                  styles.btnPrimary,
                  { backgroundColor: C.accent },
                  ((editStep === "start" ? !editStart : !editPeriodValid) || editSaving) && { opacity: 0.5 },
                ]}
              >
                {editSaving ? <ActivityIndicator color="#fff" size="small" /> : (
                  <Text style={styles.btnPrimaryText}>{editStep === "start" ? "Continuer" : "Valider"}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={!!cancelTarget}
        icon="🤝"
        title="Annuler cette proposition ?"
        message={cancelTarget ? `Tu ne seras plus inscrit·e ${formatFrRange(cancelTarget.row.start_date, cancelTarget.row.end_date)} pour « ${cancelTarget.task.title} ».` : ""}
        confirmLabel="Annuler ma proposition"
        destructive
        saving={cancelSaving}
        onCancel={() => setCancelTarget(null)}
        onConfirm={confirmCancel}
        C={C}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { borderWidth: 1, borderRadius: 14, padding: 16, marginTop: 10 },
  title: { fontFamily: "DM_Sans_700Bold", fontSize: 14, marginBottom: 10 },
  taskGroup: { borderTopWidth: 1, paddingTop: 12, marginTop: 12 },
  taskTitle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  period: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },
  daySquaresRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 8 },
  daySquare: { width: 26, height: 26, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  daySquareText: { fontFamily: "DM_Sans_700Bold", fontSize: 11, color: "#fff" },
  contribList: { marginTop: 10, gap: 8 },
  contribRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  contribText: { flex: 1, fontFamily: "DM_Sans_400Regular", fontSize: 12 },
  rowActions: { flexDirection: "row", gap: 8 },
  actionBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  actionBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
  coAdminBtn: { borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 16 },
  coAdminBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  editSheet: { width: "100%", maxWidth: 420, borderWidth: 1, borderRadius: 18, padding: 20 },
  editTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginTop: 4, textAlign: "center" },
  editSub: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginTop: 4, textAlign: "center" },
  editBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
  btnSecondary: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  btnSecondaryText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  btnPrimary: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  btnPrimaryText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14, color: "#fff", textAlign: "center" },
});
