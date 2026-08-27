import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { supabase } from "@/lib/supabase";
import { toFrShort } from "@/lib/slotUtils";
import type { Theme } from "@/lib/themes";

// Bloc "Mon compte" (admin + visiteur, à côté de MyChecklist) qui récapitule
// les sous-périodes de relais que cette identité a validées (voir
// task_relais_coverage, lib/relaisCoverage.ts) — la carte du besoin dans
// Entraide.tsx montre déjà cette même ligne, mais uniquement tant que le
// besoin reste visible dans le Mur d'Entraide ; ici c'est un rappel
// permanent, propre à la personne, qui ne dépend pas de retrouver la bonne
// carte.
interface Row {
  id: string;
  start_date: string;
  end_date: string;
  task: { id: string; title: string; status: string; deleted_by_admin: boolean } | null;
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

  const load = useCallback(async () => {
    if (!prenom.trim() || !nom.trim() || !pin) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("task_relais_coverage")
      .select("id, start_date, end_date, task:tasks(id, title, status, deleted_by_admin, space_id)")
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

  if (loading || rows.length === 0) return null;

  return (
    <View style={[styles.block, { backgroundColor: C.card, borderColor: C.border }]}>
      <Text style={[styles.title, { color: C.text }]}>🤝 Mes engagements de relais</Text>
      {rows.map((r) => (
        <View key={r.id} style={styles.row}>
          <Text style={[styles.taskTitle, { color: C.text }]}>{r.task?.title ?? "Besoin de relais"}</Text>
          <Text style={[styles.period, { color: C.muted }]}>
            Du {toFrShort(new Date(r.start_date + "T12:00:00"))} au {toFrShort(new Date(r.end_date + "T12:00:00"))}
            {r.task?.status === "fait" ? " · ✓ Terminé" : ""}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { borderWidth: 1, borderRadius: 14, padding: 16, marginTop: 10 },
  title: { fontFamily: "DM_Sans_700Bold", fontSize: 14, marginBottom: 10 },
  row: { marginBottom: 8 },
  taskTitle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  period: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },
});
