import { useState, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import SoinAvatar from "@/components/SoinAvatar";
import SoinFormModal from "@/components/SoinFormModal";
import SoinPickerModal from "@/components/SoinPickerModal";
import SoinDurationModal from "@/components/SoinDurationModal";
import { supabase } from "@/lib/supabase";
import { getSyncedInterventionTypes, propagateSoinChange } from "@/lib/interventionTypesSync";
import type { InterventionType } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// "MES SOINS" — même présentation que IntervenantsList.tsx (bouton par
// ligne, icône ronde à la place de l'avatar) mais pour les soins que propose
// CET intervenant (intervention_types). Un appui long sur une ligne ouvre
// SoinFormModal pour modifier/supprimer ce soin ; un appui simple ne fait
// rien (choix explicite, pour éviter les ouvertures accidentelles). "+
// Ajouter un soin" enchaîne deux popups : choix du nom (SoinPickerModal) puis
// confirmation de la durée (SoinDurationModal), qui enregistre. Voir
// app/(visitor)/soins.tsx.
interface Props {
  intervenantProfileId: string;
  // Clé(s) du/des métier(s) de l'intervenant (voir lib/metiers.ts) —
  // détermine la liste de soins suggérés par métier dans les popups. Métiers
  // absents du catalogue (saisie libre "Autre") ignorés pour les suggestions.
  metiers: (string | null | undefined)[];
  C: Theme;
}

export default function MesSoinsList({ intervenantProfileId, metiers, C }: Props) {
  const [loading, setLoading] = useState(true);
  const [soins, setSoins] = useState<InterventionType[]>([]);
  const [editTarget, setEditTarget] = useState<InterventionType | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const [savingNewSoin, setSavingNewSoin] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const synced = await getSyncedInterventionTypes(intervenantProfileId);
    setSoins(synced);
    setLoading(false);
  }, [intervenantProfileId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handlePickedLabel(label: string) {
    setPendingLabel(label);
  }

  async function handleSaveNewSoin(minutes: number) {
    if (!pendingLabel) return;
    setSavingNewSoin(true);
    try {
      const payload = { label: pendingLabel, duration_minutes: minutes };
      const { error } = await supabase
        .from("intervention_types")
        .insert({ intervenant_profile_id: intervenantProfileId, ...payload });
      if (error) throw error;
      await propagateSoinChange(intervenantProfileId, { type: "create", ...payload });
      setPendingLabel(null);
      await load();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible d'enregistrer ce soin.");
    } finally {
      setSavingNewSoin(false);
    }
  }

  return (
    <>
      {loading ? (
        <ActivityIndicator color={C.accent} style={{ marginVertical: 32 }} />
      ) : (
        <View style={styles.scroll}>
          {soins.length === 0 ? (
            <Text style={[styles.emptyText, { color: C.muted }]}>Aucun soin enregistré pour l'instant.</Text>
          ) : (
            soins.map((s, i) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.row, i < soins.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
                onLongPress={() => setEditTarget(s)}
                activeOpacity={0.7}
              >
                <SoinAvatar label={s.label} size={44} C={C} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>{s.label}</Text>
                  <Text style={[styles.duration, { color: C.muted }]}>{s.duration_minutes} min</Text>
                </View>
              </TouchableOpacity>
            ))
          )}

          <TouchableOpacity style={styles.addBtn} onPress={() => setPickerOpen(true)}>
            <Text style={[styles.addBtnText, { color: C.accent }]}>+ Ajouter un soin</Text>
          </TouchableOpacity>
        </View>
      )}

      <SoinPickerModal
        visible={pickerOpen}
        metiers={metiers}
        value=""
        C={C}
        onClose={() => setPickerOpen(false)}
        onPick={handlePickedLabel}
      />

      <SoinDurationModal
        visible={pendingLabel !== null}
        label={pendingLabel ?? ""}
        saving={savingNewSoin}
        C={C}
        onClose={() => setPendingLabel(null)}
        onSave={handleSaveNewSoin}
      />

      {editTarget && (
        <SoinFormModal
          visible
          intervenantProfileId={intervenantProfileId}
          soin={editTarget}
          metiers={metiers}
          C={C}
          onClose={() => setEditTarget(null)}
          onSaved={async () => { setEditTarget(null); await load(); }}
          onDeleted={async () => { setEditTarget(null); await load(); }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 4 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  name: { fontFamily: "DM_Sans_600SemiBold", fontSize: 15 },
  duration: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },
  addBtn: { alignSelf: "flex-start", marginTop: 8 },
  addBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});
