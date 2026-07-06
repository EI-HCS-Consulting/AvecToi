import { useState, forwardRef, useImperativeHandle } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { toFrShort } from "@/lib/slotUtils";
import type { Reservation } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Fenêtre de confirmation de suppression — remplace l'Alert.alert natif basique
// par une modale au design cohérent avec le reste de l'app (cf. AdminEditReservation).
// Si la réservation ciblée fait partie d'un groupe (group_id, cf. "+ Ajouter une
// autre personne" dans AdminAddReservation.tsx), propose en plus de supprimer
// chaque accompagnant lié, via une case à cocher par personne (décochée par défaut).

export interface DeleteReservationConfirmHandle {
  open: (r: Reservation) => void;
}

interface Props {
  reservations: Reservation[];
  onConfirm: (ids: string[]) => void;
  C: Theme;
}

function DeleteReservationConfirm({ reservations, onConfirm, C }: Props, ref: React.Ref<DeleteReservationConfirmHandle>) {
  const [target, setTarget] = useState<Reservation | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useImperativeHandle(ref, () => ({
    open: (r) => {
      setTarget(r);
      setChecked({});
    },
  }));

  const companions = target?.group_id
    ? reservations.filter((x) => x.group_id === target.group_id && x.id !== target.id)
    : [];

  function toggle(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function close() {
    setTarget(null);
  }

  function confirm() {
    if (!target) return;
    const ids = [target.id, ...companions.filter((c) => checked[c.id]).map((c) => c.id)];
    close();
    onConfirm(ids);
  }

  return (
    <Modal visible={!!target} transparent animationType="fade" onRequestClose={close}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={close}>
        <TouchableOpacity activeOpacity={1}>
          <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.danger }]}>
            <Text style={[styles.icon]}>🗑️</Text>
            <Text style={[styles.title, { color: "#fff" }]}>Supprimer cette réservation ?</Text>
            {target && (
              <Text style={[styles.sub, { color: C.muted }]}>
                {target.prenom} {target.nom} · {toFrShort(new Date(target.date + "T12:00:00"))} {target.type === "Nuit" ? "🌙 Nuitée" : target.creneau}
              </Text>
            )}

            {companions.length > 0 && (
              <View style={[styles.companionBox, { borderColor: C.border }]}>
                <Text style={[styles.companionLabel, { color: C.gold }]}>Réservation liée</Text>
                {companions.map((c) => (
                  <TouchableOpacity key={c.id} style={styles.companionRow} onPress={() => toggle(c.id)} activeOpacity={0.7}>
                    <View style={[styles.checkbox, { borderColor: C.accent }, checked[c.id] && { backgroundColor: C.accent }]}>
                      {checked[c.id] && <Text style={styles.checkboxMark}>✓</Text>}
                    </View>
                    <Text style={[styles.companionText, { color: C.text }]}>
                      Supprimer aussi pour {c.prenom} {c.nom}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.buttons}>
              <TouchableOpacity style={[styles.btn, { borderColor: C.border }]} onPress={close}>
                <Text style={[styles.btnText, { color: C.muted }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: C.danger, borderColor: C.danger }]} onPress={confirm}>
                <Text style={[styles.btnText, { color: "#fff" }]}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export default forwardRef(DeleteReservationConfirm);

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "center", alignItems: "center", padding: 24 },
  sheet: { width: "100%", maxWidth: 380, borderRadius: 20, borderWidth: 1, padding: 24, alignItems: "center" },
  icon: { fontSize: 32, marginBottom: 8 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, textAlign: "center", marginBottom: 6 },
  sub: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center", marginBottom: 4 },
  companionBox: { width: "100%", borderTopWidth: 1, marginTop: 16, paddingTop: 14 },
  companionLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 },
  companionRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  checkboxMark: { color: "#fff", fontSize: 13, fontFamily: "DM_Sans_700Bold" },
  companionText: { fontFamily: "DM_Sans_400Regular", fontSize: 14, flexShrink: 1 },
  buttons: { flexDirection: "row", gap: 10, width: "100%", marginTop: 20 },
  btn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  btnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14 },
});
