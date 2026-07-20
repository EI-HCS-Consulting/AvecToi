import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator } from "react-native";
import type { Theme } from "@/lib/themes";

// Confirmation générique (suppression, désinscription…) — remplace les
// Alert.alert natifs par une modale au design cohérent avec le reste de
// l'app, sur le même modèle que DeleteReservationConfirm.tsx.
interface Props {
  visible: boolean;
  icon?: string;
  title: string;
  message?: string;
  cancelLabel?: string;
  confirmLabel: string;
  destructive?: boolean;
  saving?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  C: Theme;
  // Masque le bouton Annuler et n'affiche qu'un unique bouton pleine
  // largeur (onConfirm) — pour les popups purement informatifs (ex.
  // "Un seul créneau par jour") qui remplacent un Alert.alert à 1 bouton.
  singleButton?: boolean;
}

export default function ConfirmModal({
  visible, icon = "🗑️", title, message, cancelLabel = "Annuler", confirmLabel,
  destructive = true, saving = false, onCancel, onConfirm, C, singleButton = false,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: C.card, borderColor: destructive ? C.danger : C.border }]}>
          <Text style={styles.icon}>{icon}</Text>
          <Text style={[styles.title, { color: C.text }]}>{title}</Text>
          {message ? <Text style={[styles.sub, { color: C.muted }]}>{message}</Text> : null}
          <View style={styles.buttons}>
            {!singleButton && (
              <TouchableOpacity style={[styles.btn, { borderColor: C.border }]} onPress={onCancel} disabled={saving}>
                <Text style={[styles.btnText, { color: C.muted }]}>{cancelLabel}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.btn,
                { backgroundColor: destructive ? C.danger : C.accent, borderColor: destructive ? C.danger : C.accent },
                saving && { opacity: 0.6 },
              ]}
              onPress={onConfirm}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={[styles.btnText, { color: "#fff" }]}>{confirmLabel}</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "center", alignItems: "center", padding: 24 },
  sheet: { width: "100%", maxWidth: 380, borderRadius: 20, borderWidth: 1, padding: 24, alignItems: "center" },
  icon: { fontSize: 32, marginBottom: 8 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, textAlign: "center", marginBottom: 6 },
  sub: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center" },
  buttons: { flexDirection: "row", gap: 10, width: "100%", marginTop: 20 },
  btn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  btnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14 },
});
