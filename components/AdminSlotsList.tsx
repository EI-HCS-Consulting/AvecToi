import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSpace } from "@/lib/SpaceContext";
import { getSlotOccupancy, getInterventionOverlap, isSlotPast } from "@/lib/slotUtils";
import type { Reservation } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Liste des créneaux horaires "Visite" du jour, côté admin — extraite de
// app/(admin)/home/slots.tsx pour être réutilisée telle quelle par la vue
// Hebdo du calendrier (app/(admin)/home/calendar.tsx), qui affiche le détail
// du jour sélectionné dans la bande de 7 jours au lieu de sa propre page.
// Pulls `slots`/`slotConfig` from context directly to keep the parent
// component's JSX uncluttered.
export default function AdminSlotsList({
  iso, reservations, C, dayIsPast, capped, bookable = true, onAdd, onEdit, onAckAlert,
}: {
  iso: string;
  reservations: Reservation[];
  C: Theme;
  dayIsPast: boolean;
  capped: boolean;
  // Faux uniquement pour un jour antérieur à la date d'hospitalisation, vue
  // Hebdo du calendrier (E) — le jour reste consultable, seule l'ajout de
  // réservation est masqué (Modifier reste visible).
  bookable?: boolean;
  onAdd: (slot: string, maxAdditional: number) => void;
  onEdit: (r: Reservation) => void;
  onAckAlert: (rs: Reservation[]) => void;
}) {
  const { getConfigForDate, getSlotsForDate } = useSpace();
  const slotConfig = getConfigForDate(iso);
  const allSlots = getSlotsForDate(iso);
  if (!slotConfig) return null;

  // Mode "1 visite / jour" : même filtrage que app/(visitor)/home/slots.tsx —
  // une fois qu'un créneau "Visite" est réservé ce jour-là, les autres
  // disparaissent de la liste, y compris côté admin (avant, seul le visiteur
  // ne les voyait plus ; l'admin retombait sur le popup "Un seul créneau par
  // jour" en tentant d'ajouter une réservation sur un autre créneau).
  const dayVisitBooking = slotConfig.one_visit_per_day
    ? reservations.find((r) => r.type === "Visite" && r.date === iso && r.alert_type !== "day_cap_suspended")
    : undefined;
  const slots = dayVisitBooking ? allSlots.filter((s) => s === dayVisitBooking.creneau) : allSlots;

  return (
    <>
      {slots.map((slot) => {
        const occ = getSlotOccupancy(reservations, iso, slot);
        const full = occ.length >= slotConfig.max_visitors_per_slot;
        const intervention = getInterventionOverlap(reservations, iso, slot, slotConfig.slot_duration_minutes);
        // Un créneau du jour même dont l'heure de début est déjà passée ne
        // peut plus être réservé (dayIsPast couvre les jours antérieurs).
        const slotPast = !dayIsPast && isSlotPast(iso, slot);

        return (
          <View key={slot} style={[styles.slotCard, { backgroundColor: C.card, borderColor: intervention ? C.orange : full ? "rgba(233,69,96,0.3)" : C.border }]}>
            <View style={styles.slotHeader}>
              <Text style={[styles.slotTime, { color: C.gold }]}>{slot}</Text>
              <Text style={[styles.slotCount, { color: C.muted }]}>{occ.length}/{slotConfig.max_visitors_per_slot}</Text>
              {!full && !intervention && !dayIsPast && !slotPast && !capped && bookable && (
                <TouchableOpacity
                  style={[styles.addResaBtn, { backgroundColor: C.accent }]}
                  onPress={() => onAdd(slot, slotConfig.max_visitors_per_slot - occ.length)}
                >
                  <Text style={styles.addResaBtnText}>Réserver</Text>
                </TouchableOpacity>
              )}
              {intervention && <Text style={[styles.fullTag, { color: C.orange }]}>Bloqué</Text>}
              {!intervention && full && <Text style={[styles.fullTag, { color: C.danger }]}>Complet</Text>}
              {!intervention && !full && slotPast && <Text style={[styles.fullTag, { color: C.muted }]}>Terminé</Text>}
              {!intervention && !full && !slotPast && !dayIsPast && capped && <Text style={[styles.fullTag, { color: C.muted }]}>Limite atteinte</Text>}
            </View>

            {intervention && (
              <View style={[styles.interventionBanner, { borderColor: C.orange, backgroundColor: "rgba(249,115,22,0.1)" }]}>
                <Text style={[styles.interventionText, { color: C.text }]}>
                  🩺 {intervention.intervention_label} ({intervention.duration_minutes} min) — {intervention.prenom} {intervention.nom} · prioritaire sur les visites
                </Text>
              </View>
            )}

            {occ.length === 0
              ? <Text style={[styles.slotEmpty, { color: C.muted }]}>Aucun visiteur inscrit</Text>
              : occ.map((r) => {
                // Un accompagnant (même group_id) partage le même événement
                // d'alerte — on regroupe leurs noms sur une seule bannière/un
                // seul bouton "Vu, relayé", affichée sur le premier membre du
                // groupe rencontré dans ce créneau plutôt que dupliquée.
                const alertCohort = r.alert_message
                  ? occ.filter((x) => x.alert_message && (r.group_id ? x.group_id === r.group_id : x.id === r.id))
                  : [];
                const isAlertLeader = alertCohort.length > 0 && alertCohort[0].id === r.id;
                const alertNeedsAck = alertCohort.some((c) => c.pin === "ADMIN" && !c.alert_seen);

                return (
                <View key={r.id} style={[styles.resaRow, { borderColor: C.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.resaName, { color: C.success }]}>● {r.prenom} {r.nom}</Text>
                    {(r.booked_by_prenom || r.booked_by_nom) ? (
                      <Text style={[styles.bookedBy, { color: C.muted }]}>Programmé par : {r.booked_by_prenom} {r.booked_by_nom}</Text>
                    ) : null}
                    {r.telephone ? <Text style={[styles.resaTel, { color: C.muted }]}>{r.telephone}</Text> : null}
                    {isAlertLeader ? (
                      <View style={[styles.alertBanner, { backgroundColor: "rgba(233,69,96,0.12)", borderColor: "rgba(233,69,96,0.4)" }]}>
                        {alertCohort.length > 1 && (
                          <Text style={[styles.alertNames, { color: C.danger }]}>
                            {alertCohort.map((c) => `${c.prenom} ${c.nom}`).join(", ")}
                          </Text>
                        )}
                        <Text style={[styles.alertText, { color: C.danger }]}>{r.alert_message}</Text>
                        {alertNeedsAck && (
                          <TouchableOpacity style={[styles.ackBtn, { borderColor: C.danger }]} onPress={() => onAckAlert(alertCohort)}>
                            <Text style={[styles.ackBtnText, { color: C.danger }]}>Vu, relayé ✓</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : null}
                  </View>
                  {!dayIsPast && !slotPast && (
                    <TouchableOpacity style={[styles.editResaBtn, { borderColor: C.border }]} onPress={() => onEdit(r)}>
                      <Text style={[styles.editResaBtnText, { color: C.muted }]}>Modifier</Text>
                    </TouchableOpacity>
                  )}
                </View>
                );
              })
            }
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  slotCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  slotHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  slotTime: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, flex: 1 },
  slotCount: { fontFamily: "DM_Sans_400Regular", fontSize: 12 },
  slotEmpty: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },
  fullTag: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
  addResaBtn: { borderRadius: 7, paddingVertical: 6, paddingHorizontal: 10 },
  addResaBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 12, color: "#fff" },
  resaRow: { flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, paddingTop: 8, marginTop: 6 },
  resaName: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  bookedBy: { fontFamily: "DM_Sans_400Regular", fontSize: 11, fontStyle: "italic", marginTop: 2 },
  resaTel: { fontFamily: "DM_Sans_400Regular", fontSize: 11, marginTop: 2 },
  editResaBtn: { borderWidth: 1, borderRadius: 7, paddingVertical: 6, paddingHorizontal: 10 },
  editResaBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },

  interventionBanner: { borderWidth: 1, borderRadius: 8, padding: 8, marginBottom: 8 },
  interventionText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11.5, lineHeight: 15 },

  alertBanner: { borderWidth: 1, borderRadius: 8, padding: 8, marginTop: 6 },
  alertNames: { fontFamily: "DM_Sans_700Bold", fontSize: 12, marginBottom: 2 },
  alertText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, lineHeight: 16 },
  ackBtn: { borderWidth: 1, borderRadius: 7, paddingVertical: 5, paddingHorizontal: 10, alignSelf: "flex-start", marginTop: 6 },
  ackBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 11 },
});
