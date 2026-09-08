import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { useSpace } from "@/lib/SpaceContext";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { supabase } from "@/lib/supabase";
import { canGrantCoAdmin } from "@/lib/freemiumCap";
import { loadSosRelaisCandidates, visitorIdentityKey, type SosRelaisCandidate, type SosRelaisPeriod } from "@/lib/visitorRoster";
import { toFrShort } from "@/lib/slotUtils";
import PatientAvatar from "@/components/PatientAvatar";
import ConfirmModal from "@/components/ConfirmModal";
import PremiumGateModal from "@/components/PremiumGateModal";
import type { PatientSpaceCoadmin } from "@/lib/types";

// Une ligne du tableau de bord = une identité (prenom+nom), avec toutes les
// périodes qu'elle a proposées via "Je m'en occupe" sur un Besoin SOS —
// chaque période a son propre statut d'octroi (voir coadminByCoverageId),
// validée/révoquée indépendamment des autres par l'admin (demande explicite :
// "il faut que l'admin puisse valider chaque proposition indépendamment des
// autres"). legacyCoadmin couvre les octrois créés avant que les octrois
// soient rattachés à une proposition précise (coverage_id encore nul,
// colonne ajoutée par 20260908_coadmin_per_proposal.sql) — affiché à part
// pour ne pas les faire disparaître silencieusement.
interface DashboardEntry {
  key: string;
  prenom: string;
  nom: string;
  photoUrl: string | null;
  periods: SosRelaisPeriod[];
  legacyCoadmin: PatientSpaceCoadmin | null;
  email: string | null;
}

// Gestion des co-administrateurs temporaires (Feature 3 du chantier SOS
// relais, voir lib/coAdmin.ts) — admin réel uniquement. Un co-admin ne voit
// jamais ce lien (masqué dans account.tsx via isCoAdmin).
export default function CoAdminsScreen() {
  const router = useRouter();
  const { space } = useSpace();
  const { theme: C } = useDisplayMode();

  const [coadmins, setCoadmins] = useState<PatientSpaceCoadmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokeTarget, setRevokeTarget] = useState<PatientSpaceCoadmin | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [premiumGateMsg, setPremiumGateMsg] = useState<string | null>(null);

  const [candidatesLoading, setCandidatesLoading] = useState(true);
  const [sosCandidates, setSosCandidates] = useState<SosRelaisCandidate[]>([]);
  const [search, setSearch] = useState("");
  // Clé = coverageId pour une proposition, ou la clé d'identité pour un
  // octroi legacy (sans coverage_id) — un seul bouton peut être en cours à la
  // fois par ligne, mais différentes lignes restent indépendantes.
  const [granting, setGranting] = useState<string | null>(null);
  const [grantErrors, setGrantErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!space) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("patient_space_coadmins")
      .select("id, space_id, visitor_id, prenom, nom, active, accepted_at, granted_at, revoked_at, granted_by_admin_id, coverage_id")
      .eq("space_id", space.id)
      .order("granted_at", { ascending: false });
    if (error) console.error("[coadmins] load failed:", error);
    setCoadmins(data || []);
    setLoading(false);
  }, [space]);

  const loadCandidates = useCallback(async () => {
    if (!space) return;
    setCandidatesLoading(true);
    const rows = await loadSosRelaisCandidates(space.id);
    setSosCandidates(rows);
    setCandidatesLoading(false);
  }, [space]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadCandidates(); }, [loadCandidates]);

  // Un octroi par proposition (coverage_id renseigné) — le plus récent
  // gagne pour une même proposition (coadmins est déjà trié granted_at
  // desc, donc le premier match rencontré est le bon).
  const coadminByCoverageId = useMemo(() => {
    const map = new Map<string, PatientSpaceCoadmin>();
    for (const c of coadmins) {
      if (!c.coverage_id || map.has(c.coverage_id)) continue;
      map.set(c.coverage_id, c);
    }
    return map;
  }, [coadmins]);

  // Fusion par identité : une proposition (task_relais_coverage) et un
  // éventuel octroi legacy (patient_space_coadmins sans coverage_id, créé
  // avant 20260908_coadmin_per_proposal.sql) pour la même personne pointent
  // vers la même ligne du tableau de bord.
  const dashboard = useMemo<DashboardEntry[]>(() => {
    const byKey = new Map<string, DashboardEntry>();
    for (const v of sosCandidates) {
      byKey.set(visitorIdentityKey(v.prenom, v.nom), {
        key: visitorIdentityKey(v.prenom, v.nom),
        prenom: v.prenom,
        nom: v.nom,
        photoUrl: v.photoUrl,
        periods: v.periods,
        legacyCoadmin: null,
        email: v.email,
      });
    }
    for (const c of coadmins) {
      if (c.coverage_id) continue;
      const key = visitorIdentityKey(c.prenom, c.nom);
      const existing = byKey.get(key);
      if (existing) { if (!existing.legacyCoadmin) existing.legacyCoadmin = c; }
      else byKey.set(key, { key, prenom: c.prenom, nom: c.nom, photoUrl: null, periods: [], legacyCoadmin: c, email: null });
    }
    return Array.from(byKey.values()).sort(
      (a, b) => a.nom.localeCompare(b.nom, "fr") || a.prenom.localeCompare(b.prenom, "fr"),
    );
  }, [sosCandidates, coadmins]);

  const filteredDashboard = dashboard.filter((v) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return `${v.prenom} ${v.nom}`.toLowerCase().includes(q);
  });

  function formatPeriod(p: SosRelaisPeriod) {
    const start = toFrShort(new Date(p.startDate + "T12:00:00"));
    const end = toFrShort(new Date(p.endDate + "T12:00:00"));
    return `du ${start} au ${end}`;
  }

  function statusLabel(c: PatientSpaceCoadmin | null): { text: string; color: string } {
    if (!c) return { text: "🙋 Proposition non traitée", color: C.muted };
    if (!c.active) return { text: "🔒 Révoqué", color: C.muted };
    if (!c.accepted_at) return { text: "⏳ En attente", color: C.orange };
    return { text: "✅ Actif", color: C.success };
  }

  // Valide UNE proposition précise (période) — indépendante des autres
  // périodes du même visiteur, chacune ayant son propre octroi
  // patient_space_coadmins rattaché via coverage_id (voir
  // 20260908_coadmin_per_proposal.sql). Demande explicite : "il faut que
  // l'admin puisse valider chaque proposition indépendamment des autres".
  async function handleGrant(v: DashboardEntry, period: SosRelaisPeriod) {
    if (!space) return;
    setGrantErrors((prev) => { const next = { ...prev }; delete next[period.coverageId]; return next; });
    if (!canGrantCoAdmin(space)) {
      setPremiumGateMsg("La co-administration temporaire fait partie de l'offre Premium. Passez votre espace en illimité pour désigner un co-administrateur.");
      return;
    }
    if (!v.email) {
      setGrantErrors((prev) => ({ ...prev, [period.coverageId]: "Cette personne n'a pas encore vérifié son adresse email — elle doit d'abord terminer le popup « Je m'en occupe »." }));
      return;
    }
    setGranting(period.coverageId);

    // Résolution prenom/nom → visitor_profiles.id (même convention que
    // VisitorProfileModal/pinResetRequests : homonymie non gérée ici, limite
    // déjà acceptée ailleurs dans l'app).
    const { data: profile, error: lookupError } = await supabase
      .from("visitor_profiles")
      .select("id")
      .eq("space_id", space.id)
      .ilike("prenom", v.prenom)
      .ilike("nom", v.nom)
      .maybeSingle();

    if (lookupError || !profile) {
      setGranting(null);
      setGrantErrors((prev) => ({ ...prev, [period.coverageId]: "Ce visiteur n'a pas encore de profil enregistré — il doit d'abord se connecter une fois via \"Qui êtes-vous ?\"." }));
      return;
    }

    // email + accepted_at renseignés dès l'octroi : l'email a déjà été vérifié
    // par code au moment de la proposition (voir Entraide.tsx, relaisClaimStep
    // "email"/"code"), donc plus d'étape d'acceptation séparée côté visiteur —
    // il devient co-administrateur actif dès que l'admin valide cette période.
    const { error: insertError } = await supabase.from("patient_space_coadmins").insert({
      space_id: space.id,
      visitor_id: profile.id,
      prenom: v.prenom,
      nom: v.nom,
      email: v.email,
      coverage_id: period.coverageId,
      accepted_at: new Date().toISOString(),
      granted_by_admin_id: space.admin_id,
    });

    setGranting(null);
    if (insertError) {
      console.error("[coadmins] grant failed:", insertError);
      setGrantErrors((prev) => ({ ...prev, [period.coverageId]: "Erreur lors de la validation. Réessaie." }));
      return;
    }
    await load();
  }

  function handleRevoke(c: PatientSpaceCoadmin) {
    setRevokeTarget(c);
  }

  async function confirmRevoke() {
    if (!revokeTarget) return;
    setRevoking(true);
    const { error } = await supabase
      .from("patient_space_coadmins")
      .update({ active: false, revoked_at: new Date().toISOString() })
      .eq("id", revokeTarget.id);
    setRevoking(false);
    setRevokeTarget(null);
    if (error) {
      console.error("[coadmins] revoke failed:", error);
      return;
    }
    await load();
  }

  const isLoading = loading || candidatesLoading;

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.replace("/(admin)/account?scrollTo=coadmin" as any)}>
          <Text style={[styles.backText, { color: C.muted }]}>← Retour</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>🛡️ Co-administrateurs</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.intro, { color: C.muted }]}>
          Tableau de bord des proches qui se sont proposés pour te remplacer via un Besoin SOS,
          avec les périodes qu'ils ont indiqué pouvoir couvrir en cliquant sur « Je m'en occupe »
          et le statut de chacun. Valide une proposition pour en faire un co-administrateur
          temporaire — il obtient l'accès complet aux réglages et au planning pendant ton absence.
          Tu gardes la main à tout moment et peux révoquer un co-administrateur ici même.
        </Text>

        <TextInput
          style={[styles.searchInput, { backgroundColor: C.card, borderColor: C.border, color: C.text }]}
          placeholder="Rechercher un nom…"
          placeholderTextColor={C.muted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="words"
        />
        {isLoading ? (
          <ActivityIndicator color={C.accent} style={{ marginTop: 24 }} />
        ) : filteredDashboard.length === 0 ? (
          <Text style={[styles.empty, { color: C.muted }]}>
            Personne ne s'est encore proposé pour un Besoin SOS via « Je m'en occupe ».
          </Text>
        ) : (
          filteredDashboard.map((v) => {
            const legacyStatus = v.legacyCoadmin ? statusLabel(v.legacyCoadmin) : null;
            return (
              <View key={v.key} style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
                <View style={styles.visitorRow}>
                  <PatientAvatar photoUrl={v.photoUrl} firstname={v.prenom} lastname={v.nom} size={40} C={C} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardName, { color: C.text }]}>{v.prenom} {v.nom}</Text>
                  </View>
                </View>

                {v.periods.length > 0 && (
                  <View style={styles.periodsBlock}>
                    {v.periods.map((p) => {
                      const grant = coadminByCoverageId.get(p.coverageId) ?? null;
                      const status = statusLabel(grant);
                      const canValidate = !grant || !grant.active;
                      return (
                        <View key={p.coverageId} style={styles.periodRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.periodText, { color: C.muted }]} numberOfLines={1}>
                              🗓️ {formatPeriod(p)}{p.fullPeriod ? " (période complète)" : ""}
                            </Text>
                            <Text style={[styles.cardStatus, { color: status.color }]}>{status.text}</Text>
                            {!!grantErrors[p.coverageId] && (
                              <Text style={[styles.errorText, { color: C.danger }]}>{grantErrors[p.coverageId]}</Text>
                            )}
                          </View>
                          {grant?.active ? (
                            <TouchableOpacity
                              style={[styles.revokeBtn, { borderColor: "rgba(233,69,96,0.4)" }]}
                              onPress={() => handleRevoke(grant)}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.revokeBtnText}>Révoquer</Text>
                            </TouchableOpacity>
                          ) : canValidate && v.email ? (
                            <TouchableOpacity
                              style={[styles.validateBtn, { backgroundColor: C.accent }]}
                              onPress={() => handleGrant(v, p)}
                              disabled={!!granting}
                              activeOpacity={0.8}
                            >
                              {granting === p.coverageId ? (
                                <ActivityIndicator color="#fff" size="small" />
                              ) : (
                                <Text style={styles.validateBtnText}>Valider</Text>
                              )}
                            </TouchableOpacity>
                          ) : canValidate ? (
                            <Text style={[styles.pendingEmailText, { color: C.muted }]}>Email non vérifié</Text>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                )}

                {v.legacyCoadmin && legacyStatus && (
                  <View style={[styles.periodRow, { marginTop: 10 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.periodText, { color: C.muted }]} numberOfLines={1}>
                        Octroi antérieur (sans période associée)
                      </Text>
                      <Text style={[styles.cardStatus, { color: legacyStatus.color }]}>{legacyStatus.text}</Text>
                    </View>
                    {v.legacyCoadmin.active && (
                      <TouchableOpacity
                        style={[styles.revokeBtn, { borderColor: "rgba(233,69,96,0.4)" }]}
                        onPress={() => handleRevoke(v.legacyCoadmin!)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.revokeBtnText}>Révoquer</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <ConfirmModal
        visible={!!revokeTarget}
        icon="🔒"
        title="Révoquer ce co-administrateur ?"
        message={revokeTarget ? `${revokeTarget.prenom} ${revokeTarget.nom} perdra l'accès à l'administration dès sa prochaine connexion.` : ""}
        confirmLabel="Révoquer"
        destructive
        saving={revoking}
        onCancel={() => setRevokeTarget(null)}
        onConfirm={confirmRevoke}
        C={C}
      />

      <PremiumGateModal
        visible={!!premiumGateMsg}
        message={premiumGateMsg ?? ""}
        onClose={() => setPremiumGateMsg(null)}
        C={C}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
    borderBottomWidth: 1, gap: 8,
  },
  backText: { fontFamily: "DM_Sans_400Regular", fontSize: 15 },
  headerTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 20 },
  scroll: { padding: 16, paddingBottom: 48 },
  intro: { fontFamily: "DM_Sans_400Regular", fontSize: 13.5, lineHeight: 20, marginBottom: 16 },
  empty: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center", marginTop: 16 },
  searchInput: {
    borderWidth: 1, borderRadius: 10, padding: 12,
    fontFamily: "DM_Sans_400Regular", fontSize: 14, marginBottom: 12,
  },
  errorText: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 3 },
  card: {
    borderWidth: 1, borderRadius: 14,
    padding: 14, marginBottom: 10,
  },
  visitorRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  cardName: { fontFamily: "DM_Sans_600SemiBold", fontSize: 15 },
  cardStatus: { fontFamily: "DM_Sans_400Regular", fontSize: 12.5, marginTop: 2 },
  revokeBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  revokeBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12.5, color: "#e94560" },
  validateBtn: { borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  validateBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12.5, color: "#fff" },
  pendingEmailText: { fontFamily: "DM_Sans_400Regular", fontSize: 11.5, maxWidth: 90, textAlign: "right" },
  periodsBlock: {
    paddingLeft: 52, marginTop: 8, gap: 10,
  },
  periodText: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },
  periodRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
  },
});
