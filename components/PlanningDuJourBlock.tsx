import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { toISO, remainingSpotsLabel, isReservationDatePast } from "@/lib/slotUtils";
import type { Theme } from "@/lib/themes";
import type { Reservation } from "@/lib/types";

// Bloc "Planning du jour" de l'onglet Planning intervenant (soins.tsx) —
// affiche les soins d'UN seul jour : aujourd'hui par défaut, ou le dernier
// jour tapé sur IntervenantGlobalCalendar (voir selectedIso dans soins.tsx).
// Les soins des autres jours restent dans la rubrique "Planning
// mensuel/hebdo" (SoinsPeriodBlock) juste en dessous, qui exclut ce jour-là
// pour ne pas le lister deux fois.
interface Props {
  C: Theme;
  iso: string;
  reservations: Reservation[];
  patientNameBySpaceId: Record<string, string>;
  locationBySpaceId: Record<string, string>;
  onSoinPress: (r: Reservation) => void;
  // Bouton "Autres intervenants" affiché sur la même ligne que le titre —
  // inclut, quand actif, les soins des autres intervenants (mêmes espaces
  // patients) dans ce bloc ET dans "Planning mensuel/hebdo" juste en dessous
  // (voir soins.tsx, plannedReservations). Absent : pas de bouton (usages
  // hors onglet Planning intervenant, s'il y en a un jour).
  showOtherIntervenants?: boolean;
  onToggleOtherIntervenants?: () => void;
  // Libellé de repli quand r.intervention_label est vide — "Intervention" par
  // défaut (comportement historique). Passer "Visite" pour le planning des
  // visites (home/calendar.tsx, mode Visites), où intervention_label n'est
  // jamais renseigné.
  reservationType?: "Intervention" | "Visite";
  // Accompagnants d'une réservation, indexés par son id (voir
  // home/calendar.tsx, companionsByMainId) — affichés sous le nom du
  // réservant principal. Absent : rien n'est affiché (usages hors visites).
  companionsById?: Record<string, Reservation[]>;
  // Rend le message "Aucune visite prévue ce jour" tappable pour ouvrir
  // directement l'écran de réservation des créneaux de ce jour-là (voir
  // home/calendar.tsx) — absent : le message reste statique (usage
  // intervenant, soins.tsx, qui a son propre écran de créneaux par soin).
  onEmptyPress?: () => void;
  // Places prises/max du créneau de chaque ligne, indexées par r.id (voir
  // home/calendar.tsx, remainingByMainId) — affiché sous le nom du
  // réservataire pour permettre de repérer d'un coup d'œil s'il reste une
  // place sur ce créneau. Absent : rien n'est affiché (usage intervenant,
  // soins.tsx, un seul soin possible par créneau, la notion ne s'applique
  // pas).
  remainingBySlotId?: Record<string, { taken: number; max: number }>;
  // Anniversaire du patient ("YYYY-MM-DD", année de naissance) + prénom —
  // affiche "xx ans de Prénom !" dans le titre du jour quand iso tombe sur
  // le mois+jour de naissance (comparaison identique à BirthdayAlertModal et
  // home/calendar.tsx). Absent : pas d'affichage (usage intervenant,
  // soins.tsx, qui peut regrouper plusieurs patients le même jour).
  patientBirthdate?: string | null;
  patientFirstname?: string;
}

export default function PlanningDuJourBlock({ C, iso, reservations, patientNameBySpaceId, locationBySpaceId, onSoinPress, showOtherIntervenants, onToggleOtherIntervenants, reservationType = "Intervention", companionsById, onEmptyPress, remainingBySlotId, patientBirthdate, patientFirstname }: Props) {
  const isToday = iso === toISO(new Date());
  const dayDate = new Date(iso + "T00:00:00");
  const isPastDay = isReservationDatePast(iso);
  const isBirthday = !!patientBirthdate && patientBirthdate.slice(5) === iso.slice(5);
  const birthdayAge = isBirthday && patientBirthdate ? dayDate.getFullYear() - parseInt(patientBirthdate.slice(0, 4), 10) : null;
  const sorted = [...reservations].sort((a, b) => a.creneau.localeCompare(b.creneau));
  // Regroupe les réservations par créneau consécutif (sorted est déjà trié
  // par creneau) — un seul horaire affiché par groupe, centré verticalement
  // sur les noms (voir styles.slotTimeCol), et "Complet"/"X places
  // restantes" affiché une seule fois après le dernier nom du groupe plutôt
  // que répété par personne (même occupation de créneau pour tout le groupe).
  const groups: { creneau: string; rows: typeof sorted }[] = [];
  for (const r of sorted) {
    const g = groups[groups.length - 1];
    if (g && g.creneau === r.creneau) g.rows.push(r);
    else groups.push({ creneau: r.creneau, rows: [r] });
  }

  return (
    <>
      <View style={styles.titleRow}>
        <Text style={[styles.sectionTitle, { color: C.gold, marginBottom: 0 }]}>Planning du jour</Text>
        {onToggleOtherIntervenants && (
          <TouchableOpacity
            onPress={onToggleOtherIntervenants}
            activeOpacity={0.75}
            style={[
              styles.otherToggle,
              {
                backgroundColor: showOtherIntervenants ? C.gold : "transparent",
                borderColor: C.gold,
              },
            ]}
          >
            <Text style={[styles.otherToggleText, { color: showOtherIntervenants ? "#fff" : C.gold }]}>
              👥 Autres intervenants
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
        <Text style={[styles.dayTitle, { color: isToday ? C.gold : C.text }]}>
          {dayDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          {isToday ? " · Aujourd'hui" : ""}
          {isBirthday ? ` · ${birthdayAge} ans de ${patientFirstname} !` : ""}
        </Text>
        {sorted.length === 0 ? (
          onEmptyPress ? (
            <TouchableOpacity activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={onEmptyPress}>
              <Text style={[styles.emptyText, !isPastDay && styles.emptyTextLink, { color: isPastDay ? C.muted : C.accent }]}>
                {reservationType === "Visite"
                  ? (isPastDay ? "Aucune visite ce jour-là." : "Aucune visite prévue ce jour. Réserver ›")
                  : "Aucun soin prévu ce jour-là."}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.emptyText, { color: C.muted }]}>
              {reservationType === "Visite" ? "Aucune visite prévue ce jour." : "Aucun soin prévu ce jour-là."}
            </Text>
          )
        ) : (
          groups.map((group, idx) => {
            const groupRemaining = remainingBySlotId?.[group.rows[0].id];
            return (
              <View
                key={group.creneau}
                style={[styles.slotGroup, idx > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}
              >
                <View style={styles.slotTimeCol}>
                  <Text style={[styles.soinTime, { color: C.orange }]}>{group.creneau}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  {group.rows.map((r) => {
                    const boldLabel = patientNameBySpaceId[r.space_id] ?? `${r.prenom} ${r.nom}`;
                    const plainName = `${r.prenom} ${r.nom}`;
                    return (
                      <TouchableOpacity key={r.id} style={styles.slotPersonRow} activeOpacity={0.7} onPress={() => onSoinPress(r)}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.soinLabel, { color: C.text }]} numberOfLines={1}>
                            {boldLabel}
                          </Text>
                          {reservationType === "Intervention" && (
                            <Text style={[styles.soinBy, { color: C.muted }]} numberOfLines={1}>
                              {r.intervention_label ?? reservationType}{r.duration_minutes ? ` (${r.duration_minutes} min)` : ""}
                            </Text>
                          )}
                          {!!locationBySpaceId[r.space_id] && (
                            <Text style={[styles.soinBy, { color: C.muted }]} numberOfLines={1}>📍 {locationBySpaceId[r.space_id]}</Text>
                          )}
                          {/* Nom/prénom en clair uniquement s'il diffère du libellé en gras
                              ci-dessus (patient vs visiteur, mode Soins) — évite le doublon
                              du mode Visites, où les deux valeurs sont identiques. */}
                          {boldLabel !== plainName && (
                            <Text style={[styles.soinBy, { color: C.muted }]} numberOfLines={1}>{plainName}</Text>
                          )}
                          {!!companionsById?.[r.id]?.length && (
                            <Text style={[styles.soinBy, { color: C.muted }]} numberOfLines={1}>
                              + {companionsById[r.id].map((c) => `${c.prenom} ${c.nom}`).join(", ")}
                            </Text>
                          )}
                        </View>
                        <Text style={[styles.chevron, { color: C.muted }]}>›</Text>
                      </TouchableOpacity>
                    );
                  })}
                  {!!groupRemaining && (
                    <Text
                      style={[styles.soinBy, styles.slotRemaining, { color: groupRemaining.taken >= groupRemaining.max ? C.danger : C.success }]}
                      numberOfLines={1}
                    >
                      {remainingSpotsLabel(groupRemaining.taken, groupRemaining.max)}
                    </Text>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8 },
  otherToggle: { borderWidth: 1, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10 },
  otherToggleText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11 },
  sectionTitle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 20 },
  dayTitle: { fontFamily: "DM_Sans_700Bold", fontSize: 13, textTransform: "capitalize", marginBottom: 8 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },
  emptyTextLink: { fontFamily: "DM_Sans_600SemiBold" },
  // slotGroup regroupe toutes les réservations d'un même créneau : l'horaire
  // (slotTimeCol) s'étire sur toute la hauteur du groupe et se centre avec
  // justifyContent, ce qui l'aligne visuellement sur le nom du milieu quand
  // plusieurs personnes partagent le créneau.
  slotGroup: { flexDirection: "row", alignItems: "stretch", gap: 10, paddingVertical: 4 },
  slotTimeCol: { minWidth: 42, alignItems: "center", justifyContent: "center" },
  slotPersonRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 3 },
  slotRemaining: { marginTop: 2, marginBottom: 2 },
  soinTime: { fontFamily: "DM_Sans_700Bold", fontSize: 13 },
  soinLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  soinBy: { fontFamily: "DM_Sans_400Regular", fontSize: 11.5, marginTop: 1 },
  chevron: { fontFamily: "DM_Sans_700Bold", fontSize: 16 },
});
