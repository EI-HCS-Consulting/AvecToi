import { useCallback, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator } from "react-native";
import { supabase } from "@/lib/supabase";
import { toFrShort } from "@/lib/slotUtils";
import { isRelaisFullyCovered } from "@/lib/relaisCoverage";
import { revokeCoAdminForCoverage } from "@/lib/coAdmin";
import MiniCalendar from "@/components/MiniCalendar";
import ConfirmModal from "@/components/ConfirmModal";
import type { Theme } from "@/lib/themes";

// Bloc "Mon compte" (admin + visiteur, à côté de MyChecklist) qui récapitule
// les sous-périodes de relais que cette identité a validées (voir
// task_relais_coverage, lib/relaisCoverage.ts) — la carte du besoin dans
// Entraide.tsx montre déjà cette même ligne, mais uniquement tant que le
// besoin reste visible dans le Mur d'Entraide ; ici c'est un rappel
// permanent, propre à la personne, qui ne dépend pas de retrouver la bonne
// carte. Modifier/Annuler par proposition individuelle (demande explicite :
// "je dois pouvoir les modifier (donc changer les dates ou annuler ma
// proposition)").
interface Row {
  id: string;
  start_date: string;
  end_date: string;
  task: {
    id: string; title: string; status: string; deleted_by_admin: boolean;
    relais_start_date: string | null; date_limite: string | null;
  } | null;
}

interface Props {
  spaceId: string;
  prenom: string;
  nom: string;
  pin: string;
  C: Theme;
}

export default function MyRelaisCommitments({ spaceId, prenom, nom, pin, C }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [editTarget, setEditTarget] = useState<Row | null>(null);
  const [editStep, setEditStep] = useState<"start" | "end">("start");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editStartCalMonth, setEditStartCalMonth] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });
  const [editEndCalMonth, setEditEndCalMonth] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });
  const [editSaving, setEditSaving] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<Row | null>(null);
  const [cancelSaving, setCancelSaving] = useState(false);

  const load = useCallback(async () => {
    if (!prenom.trim() || !nom.trim() || !pin) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("task_relais_coverage")
      .select("id, start_date, end_date, task:tasks(id, title, status, deleted_by_admin, space_id, relais_start_date, date_limite)")
      .ilike("prenom", prenom.trim())
      .ilike("nom", nom.trim())
      .eq("pin", pin);
    const mine = ((data as any[]) ?? [])
      .filter((r) => r.task?.space_id === spaceId && !r.task?.deleted_by_admin)
      .sort((a, b) => a.start_date.localeCompare(b.start_date)) as Row[];
    setRows(mine);
    setLoading(false);
  }, [spaceId, prenom, nom, pin]);

  useEffect(() => { load(); }, [load]);

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

  function openEdit(row: Row) {
    setEditTarget(row);
    setEditStart(row.start_date);
    setEditEnd(row.end_date);
    const startBase = row.task?.relais_start_date ? new Date(row.task.relais_start_date + "T12:00:00") : new Date(row.start_date + "T12:00:00");
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
    const fullPeriod = !!task?.relais_start_date && !!task?.date_limite
      && editStart === task.relais_start_date && editEnd === task.date_limite;
    await supabase
      .from("task_relais_coverage")
      .update({ start_date: editStart, end_date: editEnd, full_period: fullPeriod })
      .eq("id", editTarget.id);
    if (task) {
      await recomputeTaskStatus(task.id, task.relais_start_date, task.date_limite, task.status);
    }
    setEditSaving(false);
    setEditTarget(null);
    await load();
  }

  function openCancel(row: Row) {
    setCancelTarget(row);
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    setCancelSaving(true);
    const task = cancelTarget.task;
    await supabase.from("task_relais_coverage").delete().eq("id", cancelTarget.id);
    await revokeCoAdminForCoverage(cancelTarget.id);
    if (task) {
      await recomputeTaskStatus(task.id, task.relais_start_date, task.date_limite, task.status);
    }
    setCancelSaving(false);
    setCancelTarget(null);
    await load();
  }

  if (loading || rows.length === 0) return null;

  return (
    <View style={[styles.block, { backgroundColor: C.card, borderColor: C.border }]}>
      <Text style={[styles.title, { color: C.text }]}>🤝 Mes engagements de relais</Text>
      {rows.map((r) => {
        const isDone = r.task?.status === "fait";
        return (
          <View key={r.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.taskTitle, { color: C.text }]}>{r.task?.title ?? "Besoin de relais"}</Text>
              <Text style={[styles.period, { color: C.muted }]}>
                Du {toFrShort(new Date(r.start_date + "T12:00:00"))} au {toFrShort(new Date(r.end_date + "T12:00:00"))}
                {isDone ? " · ✓ Terminé" : ""}
              </Text>
            </View>
            {!isDone && (
              <View style={styles.rowActions}>
                <TouchableOpacity onPress={() => openEdit(r)} style={[styles.actionBtn, { borderColor: C.border }]} activeOpacity={0.8}>
                  <Text style={[styles.actionBtnText, { color: C.text }]}>Modifier</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openCancel(r)} style={[styles.actionBtn, { borderColor: "rgba(233,69,96,0.4)" }]} activeOpacity={0.8}>
                  <Text style={[styles.actionBtnText, { color: "#e94560" }]}>Annuler</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}

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
        message={cancelTarget ? `Tu ne seras plus inscrit·e du ${toFrShort(new Date(cancelTarget.start_date + "T12:00:00"))} au ${toFrShort(new Date(cancelTarget.end_date + "T12:00:00"))} pour « ${cancelTarget.task?.title ?? "ce besoin"} ».` : ""}
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
  row: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 10 },
  taskTitle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  period: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },
  rowActions: { flexDirection: "row", gap: 8 },
  actionBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  actionBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
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
