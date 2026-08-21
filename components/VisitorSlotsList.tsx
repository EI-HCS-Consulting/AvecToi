import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useVisitorSpace } from "@/lib/VisitorContext";
import { getSlotOccupancy, getInterventionOverlap, isSlotFullyPast } from "@/lib/slotUtils";
import { metierLabel } from "@/lib/metiers";
import { guessFrenchArticle } from "@/lib/frenchGender";
import { INTERVENANT_ROLE_ENABLED } from "@/lib/featureFlags";
import type { OtherSpaceIntervention } from "@/lib/useOtherSpaceInterventions";
import type { Reservation } from "@/lib/types";
import type { Theme } from "@/lib/themes";
import { LOGO_PURPLE } from "@/lib/themes";

// Liste des créneaux horaires "Visite" du jour, côté visiteur/intervenant —
// extraite de app/(visitor)/home/slots.tsx pour être réutilisée telle quelle
// par la vue Hebdo du calendrier (app/(visitor)/home/calendar.tsx), qui
// affiche le détail du jour sélectionné dans la bande de 7 jours au lieu de
// sa propre page. Pulls `reservations`/`getConfigForDate`/`getSlotsForDate`
// from context directly to keep the parent component's JSX uncluttered.
// Limité aux créneaux "Visite"/"Intervention" — la nuitée garde son propre
// écran (home/nights.tsx), non concernée par la réservation depuis la bande
// Hebdo.
export default function VisitorSlotsList({
  iso, C, role, intervenantProfileId, myPin, bookable = true, otherSpaceInterventions = [], onReserveVisit, onEditVisit, onReserveIntervention, onCancelIntervention, onLongPressOtherSpaceSoin,
}: {
  iso: string;
  C: Theme;
  role: "visiteur" | "intervenant" | null;
  intervenantProfileId: string | null;
  myPin: string | null;
  // Faux uniquement pour un jour antérieur à la date d'hospitalisation, vue
  // Hebdo du calendrier (E) — le jour reste consultable, seule la
  // réservation est masquée (Modifier/Annuler restent visibles).
  bookable?: boolean;
  // Soins de CET intervenant chez d'autres patients (lib/useOtherSpaceInterventions)
  // — sert à teinter en violet les créneaux déjà pris ailleurs. Vide pour un
  // visiteur (non concerné).
  otherSpaceInterventions?: OtherSpaceIntervention[];
  onReserveVisit: (iso: string, slot: string) => void;
  onEditVisit: (r: Reservation) => void;
  onReserveIntervention: (iso: string, slot: string) => void;
  onCancelIntervention: (r: Reservation) => void;
  // Appui prolongé sur la bannière violette "Soin déjà programmé avec..." —
  // ouvre un popup proposant de modifier ce soin chez l'autre patient (voir
  // home/slots.tsx). Absent côté visiteur (otherSpaceInterventions est de
  // toute façon vide pour ce rôle, cf. plus bas).
  onLongPressOtherSpaceSoin?: (soin: OtherSpaceIntervention) => void;
}) {
  const { reservations, getConfigForDate, getSlotsForDate, intervenantProfiles } = useVisitorSpace();
  const dayConfig = getConfigForDate(iso);
  const allDaySlots = getSlotsForDate(iso);
  if (!dayConfig) return null;

  const isMine = (r: Reservation) => !!myPin && r.pin === myPin;

  // Mode "1 visite / jour" : même filtrage que app/(visitor)/home/slots.tsx.
  const dayVisitBooking = dayConfig.one_visit_per_day
    ? reservations.find((r) => r.type === "Visite" && r.date === iso && r.alert_type !== "day_cap_suspended")
    : undefined;
  const daySlots = dayVisitBooking ? allDaySlots.filter((s) => s === dayVisitBooking.creneau) : allDaySlots;

  return (
    <>
      {daySlots.map((slot) => {
        const occ = getSlotOccupancy(reservations, iso, slot);
        const full = occ.length >= dayConfig.max_visitors_per_slot;
        const past = isSlotFullyPast(iso, slot);
        const mine = occ.find(isMine);
        // Rôle Intervenant désactivé en V1 (lib/featureFlags.ts) — d'éventuels
        // soins déjà en base (créés avant ce retrait) ne doivent plus
        // apparaître ni bloquer les créneaux de visite.
        const intervention = INTERVENANT_ROLE_ENABLED
          ? getInterventionOverlap(reservations, iso, slot, dayConfig.slot_duration_minutes)
          : undefined;
        const myInterventionHere = intervention && role === "intervenant" && intervention.intervenant_profile_id === intervenantProfileId;
        // Soin déjà pris ailleurs (autre espace patient, même intervenant) qui
        // chevauche ce créneau — n'a de sens que côté intervenant, et
        // uniquement si ce créneau n'est pas déjà occupé ici (bannière orange
        // existante déjà suffisamment explicite dans ce cas).
        const otherSpaceSoin = !intervention && role === "intervenant"
          ? (getInterventionOverlap(otherSpaceInterventions, iso, slot, dayConfig.slot_duration_minutes) as OtherSpaceIntervention | undefined)
          : undefined;

        return (
          <View
            key={slot}
            style={[
              styles.slotCard,
              {
                backgroundColor: otherSpaceSoin ? `${LOGO_PURPLE}1F` : C.card,
                borderColor: intervention ? C.orange : otherSpaceSoin ? LOGO_PURPLE : full ? "rgba(233,69,96,0.3)" : C.border,
                opacity: past ? 0.5 : 1,
              },
            ]}
          >
            <View style={styles.slotLeft}>
              <Text style={[styles.slotTime, { color: C.gold }]}>{slot}</Text>
              <Text style={[styles.slotCount, { color: C.muted }]}>{occ.length}/{dayConfig.max_visitors_per_slot} inscrits</Text>
              {occ.length === 0
                ? <Text style={[styles.slotEmpty, { color: C.muted }]}>——</Text>
                : occ.map((r) => (
                  <View key={r.id} style={styles.visitorRow}>
                    <Text style={[styles.visitorName, { color: C.success }]}>● {r.prenom} {r.nom}</Text>
                  </View>
                ))
              }
              {intervention && (() => {
                const byMetier = metierLabel(intervenantProfiles.find((p) => p.id === intervention.intervenant_profile_id)?.metier);
                return (
                  <View style={[styles.interventionBanner, { backgroundColor: "rgba(249,115,22,0.12)", borderColor: C.orange }]}>
                    <Text style={[styles.interventionText, { color: C.orange }]}>
                      🩺 {intervention.intervention_label} ({intervention.duration_minutes} min){!myInterventionHere && ` - ${intervention.prenom} ${intervention.nom}${byMetier ? ` (${byMetier})` : ""}`} - Prioritaire sur les visites
                    </Text>
                  </View>
                );
              })()}
              {otherSpaceSoin && (
                <TouchableOpacity
                  style={[styles.interventionBanner, { backgroundColor: `${LOGO_PURPLE}1F`, borderColor: LOGO_PURPLE }]}
                  onLongPress={() => onLongPressOtherSpaceSoin?.(otherSpaceSoin)}
                  delayLongPress={400}
                  activeOpacity={0.7}
                  disabled={!onLongPressOtherSpaceSoin}
                >
                  <Text style={[styles.interventionText, { color: LOGO_PURPLE }]}>
                    🗂️ Soin déjà programmé avec {otherSpaceSoin.patientName} pour {guessFrenchArticle(otherSpaceSoin.intervention_label ?? "")} {otherSpaceSoin.intervention_label}
                  </Text>
                </TouchableOpacity>
              )}
              {mine?.alert_message && !mine.alert_seen && (
                <View style={[styles.alertBanner, { backgroundColor: "rgba(233,69,96,0.12)", borderColor: "rgba(233,69,96,0.4)" }]}>
                  <Text style={[styles.alertText, { color: C.danger }]}>{mine.alert_message}</Text>
                </View>
              )}
            </View>
            <View style={styles.slotRight}>
              {role === "intervenant" ? (
                <>
                  {myInterventionHere && !past && (
                    <TouchableOpacity
                      onPress={() => onCancelIntervention(intervention!)}
                      style={[styles.editBtn, { borderColor: C.border }]}
                    >
                      <Text style={[styles.editBtnText, { color: C.muted }]}>Annuler</Text>
                    </TouchableOpacity>
                  )}
                  {!intervention && !past && bookable && (
                    <TouchableOpacity
                      style={[styles.reserveBtn, { backgroundColor: C.orange }]}
                      onPress={() => onReserveIntervention(iso, slot)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.reserveBtnText}>Réserver</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <>
                  {!full && !past && !intervention && bookable && (
                    <TouchableOpacity
                      style={[styles.reserveBtn, { backgroundColor: C.accent }]}
                      onPress={() => onReserveVisit(iso, slot)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.reserveBtnText}>Réserver</Text>
                    </TouchableOpacity>
                  )}
                  {(full || intervention) && !past && (
                    <View style={[styles.fullBadge, { borderColor: C.border }]}>
                      <Text style={[styles.fullBadgeText, { color: C.muted }]}>{intervention ? "Bloqué" : "Complet"}</Text>
                    </View>
                  )}
                  {mine && !past && (
                    <TouchableOpacity onPress={() => onEditVisit(mine)} style={[styles.editBtn, { borderColor: C.border }]}>
                      <Text style={[styles.editBtnText, { color: C.muted }]}>Modifier</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  slotCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  slotLeft: { flex: 1 },
  slotRight: { alignItems: "center", gap: 8 },
  slotTime: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22 },
  slotCount: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },
  slotEmpty: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginTop: 4 },
  visitorRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  visitorName: { fontFamily: "DM_Sans_400Regular", fontSize: 13, flex: 1 },
  alertBanner: { borderWidth: 1, borderRadius: 8, padding: 8, marginTop: 8 },
  alertText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, lineHeight: 16 },
  interventionBanner: { borderWidth: 1, borderRadius: 8, padding: 8, marginTop: 8 },
  interventionText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11.5, lineHeight: 15 },
  editBtn: { borderWidth: 1, borderRadius: 7, paddingVertical: 6, paddingHorizontal: 10 },
  editBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
  reserveBtn: { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9, alignSelf: "center" },
  reserveBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 13, color: "#fff" },
  fullBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 },
  fullBadgeText: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },
});
