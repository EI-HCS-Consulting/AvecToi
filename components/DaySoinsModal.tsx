import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet } from "react-native";
import type { Theme } from "@/lib/themes";
import type { Reservation, SlotConfig } from "@/lib/types";
import { toFrLong, type DayStatus } from "@/lib/slotUtils";
import PlanningLegend from "@/components/PlanningLegend";
import DaySlotGrid from "@/components/DaySlotGrid";

// Popup "créneaux du jour" ouverte depuis SoinsPeriodBlock (tap sur un soin
// dans (admin)/intervenants.tsx) — montre tous les créneaux de la journée
// concernée, occupés ou non, avec bouton Fermer explicite. L'admin peut
// réserver un nouveau créneau ce jour-là pour lui ou un autre intervenant
// directement depuis ici (onAddIntervention rouvre AdminAddIntervention,
// déjà pré-rempli sur ce jour, sans fermer ce popup — cf. AdminAddIntervention
// ouvert par-dessus dayBookedAlert/overlapAlert, même pattern de modales
// empilées déjà utilisé ailleurs dans l'appli).
interface Props {
  C: Theme;
  visible: boolean;
  iso: string | null;
  day: Date | null;
  config: SlotConfig | null;
  daySlots: string[];
  reservations: Reservation[];
  dayInterventions: Reservation[];
  status: DayStatus;
  onClose: () => void;
  onSlotPress: (iso: string, slot: string, occupants: Reservation[]) => void;
  onEdit: (r: Reservation) => void;
  onDelete: (r: Reservation) => void;
  onAddIntervention: () => void;
}

export default function DaySoinsModal({
  C, visible, iso, day, config, daySlots, reservations, dayInterventions, status,
  onClose, onSlotPress, onEdit, onDelete, onAddIntervention,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.accent }]}>
          <View style={[styles.headerRow, { borderBottomColor: C.border }]}>
            <Text style={[styles.title, { color: C.text }]} numberOfLines={1}>{day ? toFrLong(day) : ""}</Text>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 4 }}>
            {config && iso && day && (
              <>
                <PlanningLegend C={C} />
                <DaySlotGrid
                  C={C}
                  iso={iso}
                  day={day}
                  config={config}
                  daySlots={daySlots}
                  reservations={reservations}
                  status={status}
                  showHeader={false}
                  onSlotPress={onSlotPress}
                />
              </>
            )}

            {dayInterventions.length === 0 ? (
              <Text style={[styles.emptyText, { color: C.muted, marginTop: 4 }]}>Aucune intervention ce jour-là.</Text>
            ) : (
              dayInterventions.map((r) => {
                // r.pin vaut 'ADMIN' quand la réservation a été créée par
                // l'admin (voir AdminAddIntervention.tsx), ou le vrai PIN de
                // l'intervenant quand il a réservé lui-même depuis sa propre
                // session (InterventionBookingFlow.tsx) — l'admin ne peut
                // modifier/supprimer que les soins qu'il a créés lui-même,
                // pas ceux réservés directement par un intervenant qui a
                // l'app (même logique déjà utilisée pour "mes créneaux" dans
                // IntervenantPlanningPanel.tsx).
                const editableByAdmin = r.pin === "ADMIN";
                return (
                  <View key={r.id} style={[styles.interventionCard, { backgroundColor: C.bg, borderColor: C.orange }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.interventionTime, { color: C.orange }]}>{r.creneau} · {r.duration_minutes} min</Text>
                      <Text style={[styles.interventionLabel, { color: C.text }]}>{r.intervention_label}</Text>
                      <Text style={[styles.interventionBy, { color: C.muted }]}>{r.prenom} {r.nom}</Text>
                    </View>
                    {editableByAdmin ? (
                      <>
                        <TouchableOpacity style={[styles.editResaBtn, { borderColor: C.border }]} onPress={() => onEdit(r)}>
                          <Text style={[styles.editResaBtnText, { color: C.muted }]}>Modifier</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.deleteResaBtn, { borderColor: "rgba(233,69,96,0.4)" }]} onPress={() => onDelete(r)}>
                          <Text style={{ color: "#e94560", fontSize: 13 }}>✕</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <Text style={[styles.readOnlyBadge, { color: C.muted, borderColor: C.border }]}>Géré par l'intervenant</Text>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>

          <TouchableOpacity style={[styles.addBtn, { backgroundColor: C.orange }]} onPress={onAddIntervention}>
            <Text style={styles.addBtnText}>+ Ajouter une intervention</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.closeFooterBtn}>
            <Text style={[styles.closeFooterBtnText, { color: C.muted }]}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", maxWidth: 420, maxHeight: "85%", borderRadius: 20, borderWidth: 1, padding: 24 },
  headerRow: { marginBottom: 12, paddingBottom: 16, borderBottomWidth: 1 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, textTransform: "capitalize" },

  scroll: { maxHeight: 420 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },

  interventionCard: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  interventionTime: { fontFamily: "DM_Sans_700Bold", fontSize: 13, marginBottom: 2 },
  interventionLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  interventionBy: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },
  editResaBtn: { borderWidth: 1, borderRadius: 7, paddingVertical: 6, paddingHorizontal: 10 },
  editResaBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
  deleteResaBtn: { width: 28, height: 28, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  readOnlyBadge: { fontFamily: "DM_Sans_400Regular", fontSize: 10.5, borderWidth: 1, borderRadius: 7, paddingVertical: 6, paddingHorizontal: 8, textAlign: "center", maxWidth: 80 },

  addBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 14 },
  addBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },

  closeFooterBtn: { alignItems: "center", marginTop: 14 },
  closeFooterBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});
