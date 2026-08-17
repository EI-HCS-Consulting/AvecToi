import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { Theme } from "@/lib/themes";
import type { Reservation } from "@/lib/types";
import { toFrShort, isSlotFullyPast, isMyReservation } from "@/lib/slotUtils";

// Panneau planning intégré au calendrier visiteur, commun aux 3 rôles —
// affiche les soins (tous intervenants) ou les visites/nuitées (selon
// soinsMode, voir plus bas) sous le calendrier familial
// (Mensuel) ou la bande Hebdo (WeekStrip), qui couvrent déjà la vue du jour
// courant/sélectionné pour tous les rôles (voir home/calendar.tsx) — plus
// besoin d'une grille dédiée ici. Scindé en deux sous-sections : à venir
// (toujours visible) et historique (déjà passé, repliée par défaut — même
// pattern que SoinsPlanifiesBlock). Le bascule à venir/passé est précise à la
// minute près via isSlotFullyPast, pas seulement au jour près.
// soinsMode (vue Visites/Soins du calendrier, home/calendar.tsx) détermine ce
// que ce panneau liste : soins réservés par des intervenants (soinsMode) ou
// visites/nuitées réservées par des visiteurs (!soinsMode) — labels et filtre
// de type basculent ensemble, même quand l'intervenant regarde la vue
// Visites.
interface Props {
  C: Theme;
  reservations: Reservation[];
  soinsMode: boolean;
  // Identité de session — sert uniquement à repérer, dans un groupe partagé
  // par plusieurs visiteurs, laquelle des réservations est la mienne, pour
  // n'afficher le bouton "Modifier" qu'à côté de mon propre nom (voir onEdit).
  myPin?: string | null;
  myPrenom?: string | null;
  myNom?: string | null;
  // Ouvre le modal PIN → Modifier/Annuler existant (BookingFlow.openPinModal)
  // pour la réservation visée. Omis pour les soins (pas de flux de
  // modification équivalent depuis ce panneau) et pour les rôles autres que
  // visiteur, qui n'ont pas de réservation "à eux" ici.
  onEdit?: (r: Reservation) => void;
  // Fourni uniquement quand un intervenant regarde ce panneau en mode
  // Visites avec "Afficher mes créneaux" actif (voir home/calendar.tsx) :
  // laisse remonter, au milieu des visites/nuitées, ses propres soins
  // (type Intervention) plutôt que de les exclure comme le ferait le filtre
  // normal de ce mode.
  myIntervenantProfileId?: string | null;
  // Période actuellement parcourue au-dessus (Mensuel/Hebdo, home/
  // calendar.tsx) au format "YYYY-MM-DD" — la section "à venir" ne liste
  // plus que les réservations dans cette période ; celles au-delà basculent
  // dans une sous-rubrique "Autres" distincte, voir plus bas.
  periodStartIso: string;
  periodEndIso: string;
  // "cette semaine" (Hebdo) ou "ce mois-ci" (Mensuel) — utilisé dans le
  // message affiché quand la période sélectionnée est vide.
  periodLabel: string;
}

function PlanningCard({
  group, C, done, soinsMode, myPin, myPrenom, myNom, onEdit,
}: {
  group: Reservation[]; C: Theme; done: boolean; soinsMode: boolean;
  myPin?: string | null; myPrenom?: string | null; myNom?: string | null;
  onEdit?: (r: Reservation) => void;
}) {
  const first = group[0];
  return (
    <View style={[styles.historyCard, { backgroundColor: C.card, borderColor: C.border }]}>
      <View style={styles.historyHeader}>
        <Text style={[styles.historyDate, { color: C.text }]}>
          {toFrShort(new Date(first.date + "T12:00:00"))} · {first.creneau}
        </Text>
        <Text style={[styles.historyStatus, { color: done ? C.success : C.orange }]}>
          {soinsMode ? (done ? "Effectué" : "Planifié") : (done ? "Passée" : "À venir")}
        </Text>
      </View>
      {/* Un seul titre "Visite"/"Nuitée"/"Soin" pour tout le groupe (tous les
          membres du groupe partagent le même créneau donc, en pratique
          presque toujours, le même type) — en soins, le libellé reste par
          personne, un même créneau pouvant en théorie porter des soins
          différents. En mode Visites, un intervenant qui affiche "mes
          créneaux" peut voir remonter ici son propre soin (voir
          myIntervenantProfileId) : "Soin" plutôt que "Visite" dans ce cas. */}
      {!soinsMode && (
        <Text style={[styles.historyLabel, { color: C.text }]}>
          {first.type === "Nuit" ? "Nuitée" : first.type === "Intervention" ? "Soin" : "Visite"}
        </Text>
      )}
      {group.map((r, i) => {
        // r.pin === "ADMIN" (réservation créée par l'accueil, ex. nuitée
        // arrangée par téléphone) : on veut bien la reconnaître comme
        // "mienne" pour l'affichage dans ce panneau (voir isMyReservation),
        // mais pas proposer "Modifier" — le PIN saisi lors de la réservation
        // n'existe pas pour ce cas, le visiteur ne pourrait jamais passer le
        // contrôle PIN qui suit.
        const mine = !soinsMode && r.type !== "Intervention" && r.pin !== "ADMIN"
          && isMyReservation(r, myPin ?? null, null, myPrenom ?? null, myNom ?? null);
        return (
          <View key={r.id} style={i > 0 ? { marginTop: 8 } : undefined}>
            {(soinsMode || r.type === "Intervention") && (
              <Text style={[styles.historyLabel, { color: C.text }]}>{r.intervention_label}</Text>
            )}
            <View style={styles.historyByRow}>
              <Text style={[styles.historyBy, { color: C.muted }]}>{r.prenom} {r.nom}</Text>
              {mine && onEdit && (
                <TouchableOpacity onPress={() => onEdit(r)} activeOpacity={0.7} style={styles.editBtn}>
                  <Text style={[styles.editBtnText, { color: C.accent }]}>✏️ Modifier</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// Regroupe les réservations partageant le même date+créneau (ex : 2
// visiteurs réservés sur le même créneau) dans un seul bloc/carte au lieu
// d'une carte par réservation.
function groupByDateCreneau(list: Reservation[]): Reservation[][] {
  const map = new Map<string, Reservation[]>();
  for (const r of list) {
    const key = `${r.date}|${r.creneau}`;
    const existing = map.get(key);
    if (existing) existing.push(r);
    else map.set(key, [r]);
  }
  return Array.from(map.values());
}

export default function IntervenantPlanningPanel({
  C, reservations, soinsMode, myPin, myPrenom, myNom, onEdit, myIntervenantProfileId,
  periodStartIso, periodEndIso, periodLabel,
}: Props) {
  const [historyOpen, setHistoryOpen] = useState(false);

  const filtered = reservations.filter((r) =>
    soinsMode
      ? r.type === "Intervention"
      : r.type === "Visite" || r.type === "Nuit"
        || (!!myIntervenantProfileId && r.type === "Intervention" && r.intervenant_profile_id === myIntervenantProfileId)
  );

  const notPast = filtered.filter((r) => !isSlotFullyPast(r.date, r.creneau));
  // "À venir" : restreinte à la période actuellement parcourue au-dessus
  // (mois en vue Mensuel, semaine en vue Hebdo — voir periodStartIso/
  // periodEndIso, home/calendar.tsx). "Autres" : le reste des réservations à
  // venir, hors de cette période (typiquement les semaines/mois suivants) —
  // repliée par défaut comme l'historique, mais seulement affichée si non
  // vide.
  const inPeriod = notPast.filter((r) => r.date >= periodStartIso && r.date <= periodEndIso);
  const others = notPast.filter((r) => r.date < periodStartIso || r.date > periodEndIso);

  // Liste "à venir" : chronologique, la prochaine réservation en premier.
  // Historique : anté-chronologique, la plus récemment passée en premier.
  // Regroupées par date+créneau : 2 réservations sur le même créneau
  // (ex. 2 visiteurs) forment un seul bloc au lieu de deux cartes séparées.
  const upcoming = groupByDateCreneau(inPeriod)
    .sort((a, b) => (a[0].date + a[0].creneau).localeCompare(b[0].date + b[0].creneau));
  const otherUpcoming = groupByDateCreneau(others)
    .sort((a, b) => (a[0].date + a[0].creneau).localeCompare(b[0].date + b[0].creneau));
  const past = groupByDateCreneau(
    filtered.filter((r) => isSlotFullyPast(r.date, r.creneau))
  ).sort((a, b) => (b[0].date + b[0].creneau).localeCompare(a[0].date + a[0].creneau));

  const upcomingTitle = soinsMode ? "Soins planifiés" : "Visites planifiées";
  const othersTitle = soinsMode ? "Autres soins planifiés" : "Autres visites planifiées";
  const historyTitle = soinsMode ? "Historique des soins" : "Historique des visites";

  return (
    <View>
      <Text style={[styles.sectionTitle, { color: C.gold }]}>{upcomingTitle}</Text>
      {upcoming.length === 0 ? (
        <Text style={[styles.emptyText, { color: C.muted }]}>
          {soinsMode ? `Aucun soin planifié ${periodLabel}.` : `Aucune visite planifiée ${periodLabel}.`}
        </Text>
      ) : (
        upcoming.map((g) => (
          <PlanningCard
            key={g[0].id} group={g} C={C} done={false} soinsMode={soinsMode}
            myPin={myPin} myPrenom={myPrenom} myNom={myNom} onEdit={onEdit}
          />
        ))
      )}

      {otherUpcoming.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, styles.othersTitle, { color: C.gold }]}>{othersTitle}</Text>
          {otherUpcoming.map((g) => (
            <PlanningCard
              key={g[0].id} group={g} C={C} done={false} soinsMode={soinsMode}
              myPin={myPin} myPrenom={myPrenom} myNom={myNom} onEdit={onEdit}
            />
          ))}
        </>
      )}

      <TouchableOpacity onPress={() => setHistoryOpen((o) => !o)} activeOpacity={0.7} style={styles.historyToggle}>
        <Text style={[styles.sectionTitle, { color: C.gold, marginBottom: 0 }]}>
          {historyTitle}{past.length > 0 ? ` (${past.length})` : ""}
        </Text>
        <Text style={[styles.toggleIcon, { color: C.muted }]}>{historyOpen ? "▾" : "▸"}</Text>
      </TouchableOpacity>

      {historyOpen && (
        past.length === 0 ? (
          <Text style={[styles.emptyText, { color: C.muted }]}>
            {soinsMode ? "Aucun soin effectué pour l'instant." : "Aucune visite passée pour l'instant."}
          </Text>
        ) : (
          past.map((g) => <PlanningCard key={g[0].id} group={g} C={C} done={true} soinsMode={soinsMode} />)
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 },
  othersTitle: { marginTop: 20 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginBottom: 12 },

  historyToggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 20, marginBottom: 10 },
  toggleIcon: { fontSize: 14 },

  historyCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  historyDate: { fontFamily: "DM_Sans_700Bold", fontSize: 13, textTransform: "capitalize" },
  historyStatus: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, textTransform: "uppercase" },
  historyLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, marginTop: 2 },
  historyByRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  historyBy: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },
  editBtn: { paddingVertical: 4, paddingLeft: 10 },
  editBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
});
