import { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useSpace } from "@/lib/SpaceContext";
import { supabase } from "@/lib/supabase";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { toISO, toFrLong, toFrShort, addDays } from "@/lib/slotUtils";
import { deleteLinkedCalendarEvent } from "@/lib/calendarSync";
import AdminAddIntervention, { type AdminAddInterventionHandle } from "@/components/AdminAddIntervention";
import AdminEditReservation, { type AdminEditReservationHandle } from "@/components/AdminEditReservation";
import DeleteReservationConfirm, { type DeleteReservationConfirmHandle } from "@/components/DeleteReservationConfirm";
import IntervenantFicheModal from "@/components/IntervenantFicheModal";
import IntervenantProfileModal from "@/components/IntervenantProfileModal";
import SoinsPlanifiesBlock from "@/components/SoinsPlanifiesBlock";
import MiniCalendar from "@/components/MiniCalendar";
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
  const { space, slotConfig, reservations, refreshReservations, getSlotsForDate } = useSpace();

  const addRef = useRef<AdminAddInterventionHandle>(null);
  const editRef = useRef<AdminEditReservationHandle>(null);
  const deleteRef = useRef<DeleteReservationConfirmHandle>(null);

  const startDate = space ? new Date(space.start_date + "T00:00:00") : new Date();
  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [calMonth, setCalMonth] = useState(() => ({ year: selectedDay.getFullYear(), month: selectedDay.getMonth() }));
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [viewingProfile, setViewingProfile] = useState<IntervenantProfile | null>(null);
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

  // Le calendrier mensuel suit le pager jour par jour : passer au mois
  // suivant/précédent via ‹ › recentre la grille dessous automatiquement.
  useEffect(() => {
    setCalMonth({ year: selectedDay.getFullYear(), month: selectedDay.getMonth() });
  }, [selectedDay]);

  if (!space) return null;

  const iso = toISO(selectedDay);
  const dayInterventions = reservations
    .filter((r) => r.type === "Intervention" && r.date === iso)
    .sort((a, b) => a.creneau.localeCompare(b.creneau));
  const interventionDates = new Set(reservations.filter((r) => r.type === "Intervention").map((r) => r.date));

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
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={[styles.backText, { color: C.orange }]}>← Retour</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>🩺 Planning des intervenants</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.sectionTitle, { color: C.gold }]}>Planning</Text>

        <View style={{ marginBottom: 14 }}>
          <MiniCalendar
            selDate={iso}
            onSelect={(newIso) => setSelectedDay(new Date(newIso + "T00:00:00"))}
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
              const prev = addDays(selectedDay, -1);
              if (prev >= startDate) setSelectedDay(prev);
            }}
            disabled={toISO(selectedDay) === toISO(startDate)}
            style={[styles.navBtn, { borderColor: C.border }]}
          >
            <Text style={[styles.navBtnText, { color: C.text }]}>‹</Text>
          </TouchableOpacity>
          <View style={{ alignItems: "center" }}>
            <Text style={[styles.dayTitle, { color: C.text }]}>{toFrLong(selectedDay)}</Text>
            <Text style={[styles.daySub, { color: C.muted }]}>{toFrShort(selectedDay)}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setSelectedDay(addDays(selectedDay, 1))}
            style={[styles.navBtn, { borderColor: C.border }]}
          >
            <Text style={[styles.navBtnText, { color: C.text }]}>›</Text>
          </TouchableOpacity>
        </View>

        {dayInterventions.length === 0 ? (
          <Text style={[styles.emptyText, { color: C.muted, marginBottom: 12 }]}>Aucune intervention ce jour-là.</Text>
        ) : (
          dayInterventions.map((r) => (
            <View key={r.id} style={[styles.interventionCard, { backgroundColor: C.card, borderColor: C.orange }]}>
              <TouchableOpacity
                style={{ flex: 1 }}
                activeOpacity={0.7}
                onPress={() => router.push({ pathname: "/(admin)/home/slots", params: { focusDate: r.date } } as any)}
              >
                <Text style={[styles.interventionTime, { color: C.orange }]}>
                  {r.creneau} · {r.duration_minutes} min
                </Text>
                <Text style={[styles.interventionLabel, { color: C.text }]}>{r.intervention_label}</Text>
                <Text style={[styles.interventionBy, { color: C.muted }]}>{r.prenom} {r.nom}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.editResaBtn, { borderColor: C.border }]} onPress={() => editRef.current?.open(r)}>
                <Text style={[styles.editResaBtnText, { color: C.muted }]}>Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.deleteResaBtn, { borderColor: "rgba(233,69,96,0.4)" }]} onPress={() => handleDelete(r)}>
                <Text style={{ color: "#e94560", fontSize: 13 }}>✕</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: C.orange }]}
          onPress={() => addRef.current?.open(iso)}
        >
          <Text style={styles.addBtnText}>+ Ajouter une intervention</Text>
        </TouchableOpacity>

        <SoinsPlanifiesBlock spaceId={space.id} C={C} />

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
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.editBtn, { borderColor: C.orange }]} onPress={() => setEditingProfileId(p.id)}>
                        <Text style={[styles.editBtnText, { color: C.orange }]}>Modifier</Text>
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

      {space && (
        <IntervenantFicheModal
          visible={!!editingProfileId}
          mode="edit"
          spaceId={space.id}
          prenom={profiles.find((p) => p.id === editingProfileId)?.prenom ?? ""}
          nom={profiles.find((p) => p.id === editingProfileId)?.nom ?? ""}
          pin=""
          intervenantProfileId={editingProfileId}
          theme={C}
          onClose={() => setEditingProfileId(null)}
          onSaved={async () => { setEditingProfileId(null); await refreshProfiles(); showToast("Fiche intervenant modifiée ✓"); }}
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
  editBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  editBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
  typeChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  typeChip: { borderWidth: 1, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10 },
  typeChipText: { fontFamily: "DM_Sans_400Regular", fontSize: 12 },

  dayNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 14 },
  navBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 },
  navBtnText: { fontSize: 18, fontWeight: "600" },
  dayTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 16, textTransform: "capitalize" },
  daySub: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },

  interventionCard: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  interventionTime: { fontFamily: "DM_Sans_700Bold", fontSize: 14, marginBottom: 2 },
  interventionLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  interventionBy: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },
  editResaBtn: { borderWidth: 1, borderRadius: 7, paddingVertical: 6, paddingHorizontal: 10 },
  editResaBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
  deleteResaBtn: { width: 28, height: 28, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center" },

  addBtn: { borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 6 },
  addBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },

  toast: { position: "absolute", bottom: 24, alignSelf: "center", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  toastText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, color: "#fff" },
});
