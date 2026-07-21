import { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useVisitorSpace } from "@/lib/VisitorContext";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { getVisitorSession } from "@/lib/visitorSession";
import { toISO, toFrLong, toFrShort, addDays } from "@/lib/slotUtils";
import AdminAddIntervention, { type AdminAddInterventionHandle } from "@/components/AdminAddIntervention";
import SoinsPlanifiesBlock from "@/components/SoinsPlanifiesBlock";
import MiniCalendar from "@/components/MiniCalendar";
import SegmentedSwitch from "@/components/SegmentedSwitch";

// Onglet racine dédié au rôle intervenant (remplace "Entraide" dans la barre
// d'onglets, voir app/(visitor)/_layout.tsx) — Planning des soins comme côté
// admin ((admin)/intervenants.tsx), sans les contrôles d'édition/suppression
// réservés à l'admin, avec en plus une bascule "Mes interventions"/"Tous".
export default function VisitorSoinsScreen() {
  const router = useRouter();
  const { theme: C } = useDisplayMode();
  const { space, slotConfig, reservations, refreshReservations, getSlotsForDate, setSelectedDay: setContextSelectedDay } = useVisitorSpace();

  const addRef = useRef<AdminAddInterventionHandle>(null);

  const [myPin, setMyPin] = useState<string | null>(null);
  const [intervenantProfileId, setIntervenantProfileId] = useState<string | null>(null);
  useEffect(() => {
    getVisitorSession().then((s) => {
      setMyPin(s?.pin ?? null);
      setIntervenantProfileId(s?.intervenantProfileId ?? null);
    });
  }, []);

  const [scope, setScope] = useState<"mine" | "all">("mine");

  const startDate = space ? new Date(space.start_date + "T00:00:00") : new Date();
  const [viewDay, setViewDay] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [calMonth, setCalMonth] = useState(() => ({ year: viewDay.getFullYear(), month: viewDay.getMonth() }));

  useEffect(() => {
    setCalMonth({ year: viewDay.getFullYear(), month: viewDay.getMonth() });
  }, [viewDay]);

  if (!space) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  const iso = toISO(viewDay);
  const soins = reservations.filter(
    (r) => r.type === "Intervention" && (scope === "all" || r.intervenant_profile_id === intervenantProfileId),
  );
  const dayInterventions = soins.filter((r) => r.date === iso).sort((a, b) => a.creneau.localeCompare(b.creneau));
  const interventionDates = new Set(soins.map((r) => r.date));

  function goToSlot(date: string) {
    setContextSelectedDay(new Date(date + "T12:00:00"));
    router.push("/(visitor)/home/slots" as any);
  }

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <Text style={[styles.headerTitle, { color: C.text }]}>🩺 Soins</Text>

      <ScrollView contentContainerStyle={styles.scroll}>
        <SegmentedSwitch
          value={scope === "all"}
          onChange={(v) => setScope(v ? "all" : "mine")}
          leftLabel="Mes interventions"
          rightLabel="Tous"
          C={C}
        />

        <Text style={[styles.sectionTitle, { color: C.gold, marginTop: 20 }]}>Planning</Text>

        <View style={{ marginBottom: 14 }}>
          <MiniCalendar
            selDate={iso}
            onSelect={(newIso) => setViewDay(new Date(newIso + "T00:00:00"))}
            calMonth={calMonth}
            onMonthChange={setCalMonth}
            startDate={startDate}
            C={C}
            size="lg"
            markedDates={interventionDates}
          />
        </View>

        <View style={[styles.dayNav, { backgroundColor: C.card, borderColor: C.border }]}>
          <TouchableOpacity
            onPress={() => {
              const prev = addDays(viewDay, -1);
              if (prev >= startDate) setViewDay(prev);
            }}
            disabled={toISO(viewDay) === toISO(startDate)}
            style={[styles.navBtn, { borderColor: C.border }]}
          >
            <Text style={[styles.navBtnText, { color: C.text }]}>‹</Text>
          </TouchableOpacity>
          <View style={{ alignItems: "center" }}>
            <Text style={[styles.dayTitle, { color: C.text }]}>{toFrLong(viewDay)}</Text>
            <Text style={[styles.daySub, { color: C.muted }]}>{toFrShort(viewDay)}</Text>
          </View>
          <TouchableOpacity onPress={() => setViewDay(addDays(viewDay, 1))} style={[styles.navBtn, { borderColor: C.border }]}>
            <Text style={[styles.navBtnText, { color: C.text }]}>›</Text>
          </TouchableOpacity>
        </View>

        {dayInterventions.length === 0 ? (
          <Text style={[styles.emptyText, { color: C.muted, marginBottom: 12 }]}>Aucune intervention ce jour-là.</Text>
        ) : (
          dayInterventions.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={[styles.interventionCard, { backgroundColor: C.card, borderColor: C.orange }]}
              activeOpacity={0.7}
              onPress={() => goToSlot(r.date)}
            >
              <Text style={[styles.interventionTime, { color: C.orange }]}>
                {r.creneau} · {r.duration_minutes} min
              </Text>
              <Text style={[styles.interventionLabel, { color: C.text }]}>{r.intervention_label}</Text>
              <Text style={[styles.interventionBy, { color: C.muted }]}>{r.prenom} {r.nom}</Text>
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: C.orange }]}
          onPress={() => addRef.current?.open(iso)}
        >
          <Text style={styles.addBtnText}>+ Ajouter une intervention</Text>
        </TouchableOpacity>

        <SoinsPlanifiesBlock
          spaceId={space.id}
          C={C}
          filterIntervenantProfileId={scope === "mine" ? intervenantProfileId : null}
          onPressRow={goToSlot}
        />
      </ScrollView>

      {space && slotConfig && (
        <AdminAddIntervention
          ref={addRef}
          space={space}
          slotConfig={slotConfig}
          getSlotsForDate={getSlotsForDate}
          startDate={startDate}
          interventionDates={interventionDates}
          reservations={reservations}
          fixedIntervenantProfileId={intervenantProfileId ?? undefined}
          pin={myPin ?? undefined}
          onAdded={async () => { await refreshReservations(); }}
          C={C}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 52 },
  headerTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, textAlign: "center", marginBottom: 12 },

  scroll: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },

  dayNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 14 },
  navBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 },
  navBtnText: { fontSize: 18, fontWeight: "600" },
  dayTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 16, textTransform: "capitalize" },
  daySub: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },

  interventionCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  interventionTime: { fontFamily: "DM_Sans_700Bold", fontSize: 14, marginBottom: 2 },
  interventionLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  interventionBy: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },

  addBtn: { borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 6 },
  addBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
});
