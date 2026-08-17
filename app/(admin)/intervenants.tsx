import { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSpace } from "@/lib/SpaceContext";
import { supabase } from "@/lib/supabase";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { getMonday, getDayStatus, isReservationDatePast, addDays } from "@/lib/slotUtils";
import { deleteLinkedCalendarEvent } from "@/lib/calendarSync";
import AdminAddIntervention, { type AdminAddInterventionHandle } from "@/components/AdminAddIntervention";
import AdminEditReservation, { type AdminEditReservationHandle } from "@/components/AdminEditReservation";
import DeleteReservationConfirm, { type DeleteReservationConfirmHandle } from "@/components/DeleteReservationConfirm";
import IntervenantProfileModal from "@/components/IntervenantProfileModal";
import SoinsPlanifiesBlock from "@/components/SoinsPlanifiesBlock";
import SegmentedSwitch from "@/components/SegmentedSwitch";
import SoinsPeriodBlock from "@/components/SoinsPeriodBlock";
import DaySoinsModal from "@/components/DaySoinsModal";
import SlotOccupantsModal, { type SelectedSlot } from "@/components/SlotOccupantsModal";
import IntervenantGlobalCalendar from "@/components/IntervenantGlobalCalendar";
import PatientColorLegend from "@/components/PatientColorLegend";
import { getPatientColor } from "@/lib/themes";
import { metierLabel } from "@/lib/metiers";
import type { Reservation, IntervenantProfile, InterventionType } from "@/lib/types";

// Écran admin dédié "Planning des intervenants" — n'affiche que les
// réservations type='Intervention' (jamais les visites), avec droits
// complets d'édition/suppression (réutilise AdminEditReservation/
// DeleteReservationConfirm, étendus pour accepter ce type — voir
// components/AdminEditReservation.tsx). Accessible depuis Réglages quand le
// toggle intervenants_enabled est actif (voir (admin)/settings.tsx).
export default function AdminIntervenantsScreen() {
  const router = useRouter();
  const { theme: C } = useDisplayMode();
  const { space, slotConfig, reservations, refreshReservations, getSlotsForDate, getConfigForDate } = useSpace();

  const addRef = useRef<AdminAddInterventionHandle>(null);
  const editRef = useRef<AdminEditReservationHandle>(null);
  const deleteRef = useRef<DeleteReservationConfirmHandle>(null);

  const startDate = space ? new Date(space.start_date + "T00:00:00") : new Date();
  const [planningView, setPlanningView] = useState<"mensuel" | "hebdo">("mensuel");
  const [weekAnchor, setWeekAnchor] = useState(() => getMonday(new Date()));
  const [monthAnchor, setMonthAnchor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [dayPopupIso, setDayPopupIso] = useState<string | null>(null);
  // Filtre "Tous" (null) / un seul intervenant (profile id) — piloté par un
  // tap sur la légende (PatientColorLegend, réutilisée telle quelle). "Tous"
  // reproduit exactement l'ancienne vue unique de cet écran (voir
  // filteredReservations plus bas). Entraîne le calendrier, le planning
  // mensuel/hebdo et le popup jour à ne montrer que les soins de cet
  // intervenant.
  const [selectedIntervenantId, setSelectedIntervenantId] = useState<string | null>(null);
  const [viewingProfile, setViewingProfile] = useState<IntervenantProfile | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  // Replié par défaut — reléguée en bas d'écran, derrière Planning et Soins
  // planifiés (voir components/IntervenantsBlock.tsx pour le même pattern).
  const [fichesOpen, setFichesOpen] = useState(false);

  const [profiles, setProfiles] = useState<IntervenantProfile[]>([]);
  const [typesByProfile, setTypesByProfile] = useState<Record<string, InterventionType[]>>({});
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  const [toast, setToast] = useState("");
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  const refreshProfiles = useCallback(async () => {
    if (!space) return;
    setLoadingProfiles(true);
    const { data: profileData } = await supabase
      .from("intervenant_profiles")
      .select("*")
      .eq("space_id", space.id)
      .order("prenom", { ascending: true });
    const list = profileData || [];
    setProfiles(list);

    if (list.length > 0) {
      const { data: typeData } = await supabase
        .from("intervention_types")
        .select("*")
        .in("intervenant_profile_id", list.map((p) => p.id))
        .order("created_at", { ascending: true });
      const grouped: Record<string, InterventionType[]> = {};
      for (const t of typeData || []) {
        (grouped[t.intervenant_profile_id] ??= []).push(t);
      }
      setTypesByProfile(grouped);
    } else {
      setTypesByProfile({});
    }
    setLoadingProfiles(false);
  }, [space]);

  useEffect(() => { refreshProfiles(); }, [refreshProfiles]);

  if (!space) return null;

  const interventionDates = new Set(reservations.filter((r) => r.type === "Intervention").map((r) => r.date));

  // Une couleur par intervenant (même principe que IntervenantGlobalCalendar
  // côté visiteur, voir soins.tsx) — profils déjà triés par prenom
  // (refreshProfiles), donc l'ordre (et la couleur) de chacun reste stable.
  const colorByIntervenantId: Record<string, string> = {};
  const legendItems: { id: string; name: string; color: string }[] = [];
  profiles.forEach((p, i) => {
    const color = getPatientColor(i);
    colorByIntervenantId[p.id] = color;
    legendItems.push({ id: p.id, name: `${p.prenom} ${p.nom}`, color });
  });

  // "Tous" (selectedIntervenantId === null) reproduit exactement l'ancienne
  // vue unique de cet écran, avant l'ajout du filtre par intervenant.
  const filteredReservations = selectedIntervenantId
    ? reservations.filter((r) => r.intervenant_profile_id === selectedIntervenantId)
    : reservations;

  const dayPopupDay = dayPopupIso ? new Date(dayPopupIso + "T00:00:00") : null;
  const dayPopupInterventions = dayPopupIso
    ? filteredReservations.filter((r) => r.type === "Intervention" && r.date === dayPopupIso).sort((a, b) => a.creneau.localeCompare(b.creneau))
    : [];
  const dayPopupConfig = dayPopupIso ? (getConfigForDate(dayPopupIso) ?? slotConfig) : null;
  const dayPopupSlots = dayPopupIso ? getSlotsForDate(dayPopupIso) : [];
  // Le popup jour (grille de créneaux + statut) reste basé sur TOUTES les
  // réservations, quel que soit le filtre intervenant — l'occupation réelle
  // du jour ne dépend pas de qui on regarde. Seule la liste d'interventions
  // listée en dessous (dayPopupInterventions) suit le filtre.
  const dayPopupStatus =
    dayPopupIso && dayPopupDay && dayPopupConfig
      ? getDayStatus(reservations, dayPopupIso, dayPopupDay, dayPopupConfig, dayPopupSlots, startDate, "Intervention")
      : "empty";

  function handleDelete(r: Reservation) {
    deleteRef.current?.open(r);
  }

  async function handleConfirmDelete(ids: string[]) {
    const { error, count } = await supabase.from("reservations").delete({ count: "exact" }).in("id", ids);
    if (error || count !== ids.length) {
      showToast("Erreur : suppression non enregistrée en base.");
      return;
    }
    await deleteLinkedCalendarEvent(ids[0]);
    await refreshReservations();
    showToast("Intervention supprimée ✓");
  }

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <TouchableOpacity style={styles.back} onPress={() => router.push("/(admin)/settings")}>
          <Text style={[styles.backText, { color: C.orange }]}>← Retour</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>🩺 Planning des intervenants</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.sectionTitle, { color: C.gold }]}>Planning</Text>

        <View style={{ marginBottom: 14 }}>
          <SegmentedSwitch
            value={planningView === "hebdo"}
            onChange={(v) => setPlanningView(v ? "hebdo" : "mensuel")}
            leftLabel="Mensuel"
            rightLabel="Hebdo"
            C={C}
            minWidthRatio={0.5}
          />
        </View>

        <IntervenantGlobalCalendar
          C={C}
          reservations={filteredReservations}
          colorByGroupId={colorByIntervenantId}
          getGroupId={(r) => r.intervenant_profile_id ?? ""}
          view={planningView}
          weekAnchor={weekAnchor}
          monthAnchor={monthAnchor}
          onMonthChange={setMonthAnchor}
          onWeekPrev={() => setWeekAnchor(addDays(weekAnchor, -7))}
          onWeekNext={() => setWeekAnchor(addDays(weekAnchor, 7))}
          selectedIso={dayPopupIso ?? ""}
          onDayPress={(iso) => { if (!isReservationDatePast(iso)) setDayPopupIso(iso); }}
          onDayLongPress={(iso) => { if (!isReservationDatePast(iso)) addRef.current?.open(iso); }}
        />
        <View style={{ marginBottom: 14 }}>
          <PatientColorLegend C={C} items={legendItems} selectedId={selectedIntervenantId} onSelect={setSelectedIntervenantId} />
        </View>

        <SoinsPeriodBlock
          C={C}
          reservations={filteredReservations}
          view={planningView}
          weekAnchor={weekAnchor}
          onWeekChange={setWeekAnchor}
          monthAnchor={monthAnchor}
          onMonthChange={setMonthAnchor}
          onDayPress={(iso) => { if (!isReservationDatePast(iso)) setDayPopupIso(iso); }}
        />

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: C.orange }]}
          onPress={() => addRef.current?.open()}
        >
          <Text style={styles.addBtnText}>+ Ajouter une intervention</Text>
        </TouchableOpacity>

        <SoinsPlanifiesBlock spaceId={space.id} C={C} filterIntervenantProfileId={selectedIntervenantId} includePast chronological />

        <Text style={[styles.sectionTitle, { color: C.gold, marginTop: 24 }]}>Fiches intervenants</Text>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <TouchableOpacity onPress={() => setFichesOpen((o) => !o)} activeOpacity={0.7} style={styles.headerRow}>
            <Text style={[styles.emptyText, { color: C.muted, flex: 1 }]}>
              {profiles.length === 0 ? "Aucun intervenant n'a encore rejoint cet espace." : `${profiles.length} intervenant${profiles.length > 1 ? "s" : ""} enregistré${profiles.length > 1 ? "s" : ""}.`}
            </Text>
            <Text style={[styles.toggleIcon, { color: C.muted }]}>{fichesOpen ? "▾" : "▸"}</Text>
          </TouchableOpacity>

          {fichesOpen && (
            <View style={{ marginTop: 10 }}>
              {loadingProfiles ? null : profiles.length === 0 ? null : (
                profiles.map((p) => (
                  <View key={p.id} style={[styles.subCard, { borderColor: C.border }]}>
                    <View style={styles.profileRow}>
                      <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.7} onPress={() => setViewingProfile(p)}>
                        <Text style={[styles.profileName, { color: C.text }]}>{p.prenom} {p.nom}</Text>
                        {!!p.metier && (
                          <Text style={[styles.profileMetier, { color: C.muted }]}>
                            {metierLabel(p.metier)}
                            {p.metier_secondaire ? ` · ${metierLabel(p.metier_secondaire)}` : ""}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                    {(typesByProfile[p.id] || []).length === 0 ? (
                      <Text style={[styles.emptyText, { color: C.muted }]}>Aucun type d'intervention renseigné.</Text>
                    ) : (
                      <View style={styles.typeChips}>
                        {(typesByProfile[p.id] || []).map((t) => (
                          <View key={t.id} style={[styles.typeChip, { borderColor: C.border, backgroundColor: C.bg }]}>
                            <Text style={[styles.typeChipText, { color: C.text }]}>{t.label} · {t.duration_minutes} min</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          )}
        </View>
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
          onAdded={async () => { await refreshReservations(); showToast("Intervention ajoutée ✓"); }}
          C={C}
        />
      )}

      <AdminEditReservation
        ref={editRef}
        onSaved={async () => { await refreshReservations(); showToast("Intervention modifiée ✓"); }}
        onDelete={handleDelete}
        C={C}
      />

      <DeleteReservationConfirm
        ref={deleteRef}
        reservations={reservations}
        onConfirm={handleConfirmDelete}
        C={C}
      />

      <SlotOccupantsModal
        C={C}
        selected={selectedSlot}
        onClose={() => setSelectedSlot(null)}
        readOnly={false}
        onEdit={(r) => editRef.current?.open(r)}
        onDelete={handleDelete}
      />

      <DaySoinsModal
        C={C}
        visible={!!dayPopupIso}
        iso={dayPopupIso}
        day={dayPopupDay}
        config={dayPopupConfig}
        daySlots={dayPopupSlots}
        reservations={reservations}
        dayInterventions={dayPopupInterventions}
        status={dayPopupStatus}
        onClose={() => setDayPopupIso(null)}
        onSlotPress={(slotIso, slot, occupants) => setSelectedSlot({ iso: slotIso, slot, occupants })}
        onEdit={(r) => editRef.current?.open(r)}
        onDelete={handleDelete}
        onAddIntervention={() => dayPopupIso && addRef.current?.open(dayPopupIso)}
      />

      {space && viewingProfile && (
        <IntervenantProfileModal
          visible={!!viewingProfile}
          onClose={() => setViewingProfile(null)}
          spaceId={space.id}
          intervenantProfileId={viewingProfile.id}
          prenom={viewingProfile.prenom}
          nom={viewingProfile.nom}
          C={C}
          isAdmin
        />
      )}

      {!!toast && (
        <View style={[styles.toast, { backgroundColor: C.success }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 42, paddingBottom: 16, borderBottomWidth: 1 },
  back: { alignSelf: "flex-start", marginBottom: 10 },
  backText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  headerTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 20 },

  scroll: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },

  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  toggleIcon: { fontSize: 14 },
  subCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  profileRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  profileName: { fontFamily: "DM_Sans_700Bold", fontSize: 15 },
  profileMetier: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 1 },
  typeChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  typeChip: { borderWidth: 1, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10 },
  typeChipText: { fontFamily: "DM_Sans_400Regular", fontSize: 12 },

  addBtn: { borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 6, marginBottom: 24 },
  addBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },

  toast: { position: "absolute", bottom: 24, alignSelf: "center", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  toastText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, color: "#fff" },
});
