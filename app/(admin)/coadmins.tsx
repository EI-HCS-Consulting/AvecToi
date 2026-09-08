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
import { visitorIdentityKey } from "@/lib/visitorRoster";
import { toFrShort } from "@/lib/slotUtils";
import { useWallReadTracking, type WallRow } from "@/lib/wallUnread";
import PatientAvatar from "@/components/PatientAvatar";
import ConfirmModal from "@/components/ConfirmModal";
import PremiumGateModal from "@/components/PremiumGateModal";
import type { PatientSpaceCoadmin } from "@/lib/types";

interface RelaisTaskLite {
  id: string;
  title: string;
  status: "ouvert" | "pris_en_charge" | "fait" | "ferme";
  created_at: string;
  relais_start_date: string | null;
  date_limite: string | null;
}

interface CoverageRow {
  id: string;
  task_id: string;
  prenom: string;
  nom: string;
  start_date: string;
  end_date: string;
  full_period: boolean;
  email: string | null;
  created_at: string;
}

function taskStatusTag(status: RelaisTaskLite["status"]): string {
  switch (status) {
    case "ouvert": return "🟢 Ouvert";
    case "pris_en_charge": return "🟡 Pris en charge";
    case "fait": return "✅ Fait";
    case "ferme": return "⚪ Fermé";
    default: return "";
  }
}

function visitorPhotoUrl(spaceId: string, filename: string) {
  const { data } = supabase.storage.from("visitor-photos").getPublicUrl(`${spaceId}/${filename}`);
  return data.publicUrl;
}

// Gestion des co-administrateurs temporaires (Feature 3 du chantier SOS
// relais, voir lib/coAdmin.ts) — admin réel uniquement. Un co-admin ne voit
// jamais ce lien (masqué dans account.tsx via isCoAdmin).
//
// Deux sous-menus (demande explicite : "crée un premier sous-menu 'Besoins
// SOS'... crée en dessous... un sous-menu 'Co-Administrateurs'") :
// - "Besoins SOS" : un bloc par besoin créé par l'admin (catégorie "relais"),
//   regroupant TOUTES les propositions faites dessus, triées par ordre
//   chronologique de prise en charge (start_date). L'admin valide/révoque
//   chaque proposition indépendamment des autres.
// - "Co-Administrateurs" : une carte par personne ayant reçu au moins un
//   octroi (actif ou révoqué) sur n'importe quel besoin, dépliable pour voir
//   toutes ses propositions triées actif → en attente → révoqué, chacune
//   révocable (et "Annuler" pour une révocation, demande explicite : "il peut
//   s'être trompé ou changer d'avis") indépendamment des autres.
//
// Les deux vues lisent les mêmes trois tables (tasks/task_relais_coverage/
// patient_space_coadmins), juste groupées différemment — un seul load().
export default function CoAdminsScreen() {
  const router = useRouter();
  const { space } = useSpace();
  const { theme: C } = useDisplayMode();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<RelaisTaskLite[]>([]);
  const [coverage, setCoverage] = useState<CoverageRow[]>([]);
  const [coadmins, setCoadmins] = useState<PatientSpaceCoadmin[]>([]);
  const [photoByKey, setPhotoByKey] = useState<Map<string, string | null>>(new Map());

  const [search, setSearch] = useState("");
  const [expandedPersonKey, setExpandedPersonKey] = useState<string | null>(null);

  const [revokeTarget, setRevokeTarget] = useState<PatientSpaceCoadmin | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [undoing, setUndoing] = useState<string | null>(null);
  const [premiumGateMsg, setPremiumGateMsg] = useState<string | null>(null);
  // Clé = coverageId d'une proposition — un seul bouton "Valider" en cours à
  // la fois par proposition, mais différentes propositions restent
  // indépendantes (demande explicite : "l'admin doit pouvoir valider chaque
  // proposition indépendamment des autres").
  const [granting, setGranting] = useState<string | null>(null);
  const [grantErrors, setGrantErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!space) return;
    setLoading(true);
    const [tasksRes, coadminsRes, profilesRes] = await Promise.all([
      supabase.from("tasks")
        .select("id, title, status, created_at, relais_start_date, date_limite")
        .eq("space_id", space.id).eq("category", "relais")
        .order("created_at", { ascending: false }),
      supabase.from("patient_space_coadmins")
        .select("id, space_id, visitor_id, prenom, nom, active, accepted_at, granted_at, revoked_at, granted_by_admin_id, coverage_id")
        .eq("space_id", space.id)
        .order("granted_at", { ascending: false }),
      supabase.from("visitor_profiles").select("prenom,nom,photo").eq("space_id", space.id),
    ]);
    if (tasksRes.error) console.error("[coadmins] tasks load failed:", tasksRes.error);
    if (coadminsRes.error) console.error("[coadmins] coadmins load failed:", coadminsRes.error);

    const loadedTasks = (tasksRes.data as RelaisTaskLite[] | null) ?? [];
    const taskIds = loadedTasks.map((t) => t.id);
    const coverageRes = taskIds.length
      ? await supabase.from("task_relais_coverage")
          .select("id, task_id, prenom, nom, start_date, end_date, full_period, email, created_at")
          .in("task_id", taskIds)
          .order("start_date", { ascending: true })
      : { data: [] as CoverageRow[], error: null };
    if (coverageRes.error) console.error("[coadmins] coverage load failed:", coverageRes.error);

    const nextPhotoByKey = new Map<string, string | null>();
    for (const p of profilesRes.data ?? []) {
      nextPhotoByKey.set(visitorIdentityKey(p.prenom, p.nom), p.photo ? visitorPhotoUrl(space.id, p.photo) : null);
    }

    setTasks(loadedTasks);
    setCoverage((coverageRes.data as CoverageRow[] | null) ?? []);
    setCoadmins((coadminsRes.data as PatientSpaceCoadmin[] | null) ?? []);
    setPhotoByKey(nextPhotoByKey);
    setLoading(false);
  }, [space]);

  useEffect(() => { load(); }, [load]);

  // Badge "New" sur chaque proposition non encore vue (même mécanisme que
  // les 3 murs de publications, voir lib/wallUnread.ts) — le flush (marquer
  // vu) se produit sur cet écran quand l'admin revient au premier plan après
  // une vraie mise en arrière-plan pendant qu'il le consulte. Le bouton
  // "🛡️ Co-administrateurs" (Mon compte) a son propre indicateur (voir
  // useCoAdminAlertBadge, lib/coAdmin.ts) qui lit le même scope sans jamais
  // flusher lui-même.
  const wallRows = useMemo<WallRow[]>(() => coverage.map((c) => ({
    id: c.id, author_prenom: c.prenom, author_nom: c.nom, author_pin: null,
    created_at: c.created_at, deleted_by_admin: false,
  })), [coverage]);
  const unreadProposalIds = useWallReadTracking("coadmin", space?.id ?? null, true, loading ? null : wallRows);

  // Un octroi par proposition (coverage_id renseigné) — le plus récent
  // gagne pour une même proposition (coadmins est déjà trié granted_at desc).
  const coadminByCoverageId = useMemo(() => {
    const map = new Map<string, PatientSpaceCoadmin>();
    for (const c of coadmins) {
      if (!c.coverage_id || map.has(c.coverage_id)) continue;
      map.set(c.coverage_id, c);
    }
    return map;
  }, [coadmins]);

  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const coverageById = useMemo(() => new Map(coverage.map((c) => [c.id, c])), [coverage]);

  function matchesSearch(prenom: string, nom: string): boolean {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return `${prenom} ${nom}`.toLowerCase().includes(q);
  }

  // "Besoins SOS" : un bloc par besoin créé par l'admin, avec toutes les
  // propositions faites dessus triées par date de prise en charge.
  const sosBlocks = useMemo(() => {
    return tasks.map((t) => ({
      task: t,
      proposals: coverage.filter((c) => c.task_id === t.id).sort((a, b) => a.start_date.localeCompare(b.start_date)),
    }));
  }, [tasks, coverage]);

  const filteredSosBlocks = sosBlocks
    .map((b) => ({ ...b, proposals: b.proposals.filter((p) => matchesSearch(p.prenom, p.nom)) }))
    .filter((b) => !search.trim() || b.proposals.length > 0);

  // "Co-Administrateurs" : une carte par personne ayant au moins un octroi
  // (actif ou révoqué — "toutes les personnes qu'il a choisi"), dépliable
  // pour voir toutes ses propositions triées actif → en attente → révoqué.
  const personBlocks = useMemo(() => {
    const byKey = new Map<string, { key: string; prenom: string; nom: string; photoUrl: string | null; grants: PatientSpaceCoadmin[] }>();
    for (const c of coadmins) {
      const key = visitorIdentityKey(c.prenom, c.nom);
      if (!byKey.has(key)) {
        byKey.set(key, { key, prenom: c.prenom, nom: c.nom, photoUrl: photoByKey.get(key) ?? null, grants: [] });
      }
      byKey.get(key)!.grants.push(c);
    }
    const rank = (c: PatientSpaceCoadmin) => (c.active ? (c.accepted_at ? 0 : 1) : 2);
    for (const entry of byKey.values()) {
      entry.grants.sort((a, b) => rank(a) - rank(b) || (b.granted_at || "").localeCompare(a.granted_at || ""));
    }
    return Array.from(byKey.values()).sort(
      (a, b) => a.nom.localeCompare(b.nom, "fr") || a.prenom.localeCompare(b.prenom, "fr"),
    );
  }, [coadmins, photoByKey]);

  const filteredPersonBlocks = personBlocks.filter((p) => matchesSearch(p.prenom, p.nom));

  function formatPeriod(startDate: string, endDate: string) {
    return `du ${toFrShort(new Date(startDate + "T12:00:00"))} au ${toFrShort(new Date(endDate + "T12:00:00"))}`;
  }

  function statusLabel(c: PatientSpaceCoadmin | null): { text: string; color: string } {
    if (!c) return { text: "🙋 Proposition non traitée", color: C.muted };
    if (!c.active) return { text: "🔒 Révoqué", color: C.muted };
    if (!c.accepted_at) return { text: "⏳ En attente", color: C.orange };
    return { text: "✅ Actif", color: C.success };
  }

  function grantSourceLabel(c: PatientSpaceCoadmin): string {
    if (!c.coverage_id) return "Octroi antérieur (sans période associée)";
    const cov = coverageById.get(c.coverage_id);
    if (!cov) return "Octroi antérieur (sans période associée)";
    const task = taskById.get(cov.task_id);
    const period = formatPeriod(cov.start_date, cov.end_date);
    return task ? `🆘 ${task.title} — ${period}` : period;
  }

  // Valide UNE proposition précise — indépendante des autres, chacune ayant
  // son propre octroi patient_space_coadmins rattaché via coverage_id (voir
  // 20260908_coadmin_per_proposal.sql).
  async function handleGrant(p: CoverageRow) {
    if (!space) return;
    setGrantErrors((prev) => { const next = { ...prev }; delete next[p.id]; return next; });
    if (!canGrantCoAdmin(space)) {
      setPremiumGateMsg("La co-administration temporaire fait partie de l'offre Premium. Passez votre espace en illimité pour désigner un co-administrateur.");
      return;
    }
    if (!p.email) {
      setGrantErrors((prev) => ({ ...prev, [p.id]: "Cette personne n'a pas encore vérifié son adresse email — elle doit d'abord terminer le popup « Je m'en occupe »." }));
      return;
    }
    setGranting(p.id);

    // Résolution prenom/nom → visitor_profiles.id (même convention que
    // VisitorProfileModal/pinResetRequests : homonymie non gérée ici, limite
    // déjà acceptée ailleurs dans l'app).
    const { data: profile, error: lookupError } = await supabase
      .from("visitor_profiles")
      .select("id")
      .eq("space_id", space.id)
      .ilike("prenom", p.prenom)
      .ilike("nom", p.nom)
      .maybeSingle();

    if (lookupError || !profile) {
      setGranting(null);
      setGrantErrors((prev) => ({ ...prev, [p.id]: "Ce visiteur n'a pas encore de profil enregistré — il doit d'abord se connecter une fois via \"Qui êtes-vous ?\"." }));
      return;
    }

    // email + accepted_at renseignés dès l'octroi : l'email a déjà été vérifié
    // par code au moment de la proposition (voir Entraide.tsx, relaisClaimStep
    // "email"/"code"), donc plus d'étape d'acceptation séparée côté visiteur —
    // il devient co-administrateur actif dès que l'admin valide cette période.
    const { error: insertError } = await supabase.from("patient_space_coadmins").insert({
      space_id: space.id,
      visitor_id: profile.id,
      prenom: p.prenom,
      nom: p.nom,
      email: p.email,
      coverage_id: p.id,
      accepted_at: new Date().toISOString(),
      granted_by_admin_id: space.admin_id,
    });

    setGranting(null);
    if (insertError) {
      console.error("[coadmins] grant failed:", insertError);
      setGrantErrors((prev) => ({ ...prev, [p.id]: "Erreur lors de la validation. Réessaie." }));
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

  // "Annuler" une révocation — l'admin peut s'être trompé ou changer d'avis
  // (demande explicite). accepted_at n'est jamais effacé par une révocation
  // (voir confirmRevoke ci-dessus), donc rebasculer active=true suffit à
  // redonner l'accès complet, sans repasser par une validation.
  async function handleUndoRevoke(c: PatientSpaceCoadmin) {
    setUndoing(c.id);
    const { error } = await supabase
      .from("patient_space_coadmins")
      .update({ active: true, revoked_at: null })
      .eq("id", c.id);
    setUndoing(null);
    if (error) {
      console.error("[coadmins] undo revoke failed:", error);
      return;
    }
    await load();
  }

  function renderProposalActions(grant: PatientSpaceCoadmin | null, proposal: CoverageRow) {
    if (grant?.active) {
      return (
        <TouchableOpacity
          style={[styles.revokeBtn, { borderColor: "rgba(233,69,96,0.4)" }]}
          onPress={() => handleRevoke(grant)}
          activeOpacity={0.8}
        >
          <Text style={styles.revokeBtnText}>Révoquer</Text>
        </TouchableOpacity>
      );
    }
    if (grant && !grant.active) {
      return (
        <TouchableOpacity
          style={[styles.undoBtn, { borderColor: C.border }]}
          onPress={() => handleUndoRevoke(grant)}
          disabled={undoing === grant.id}
          activeOpacity={0.8}
        >
          {undoing === grant.id ? <ActivityIndicator color={C.text} size="small" /> : <Text style={[styles.undoBtnText, { color: C.text }]}>Annuler</Text>}
        </TouchableOpacity>
      );
    }
    if (proposal.email) {
      return (
        <TouchableOpacity
          style={[styles.validateBtn, { backgroundColor: C.accent }]}
          onPress={() => handleGrant(proposal)}
          disabled={!!granting}
          activeOpacity={0.8}
        >
          {granting === proposal.id ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.validateBtnText}>Valider</Text>}
        </TouchableOpacity>
      );
    }
    return <Text style={[styles.pendingEmailText, { color: C.muted }]}>Email non vérifié</Text>;
  }

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
          Tableau de bord des Besoins SOS que tu as créés, avec les propositions reçues sur chacun, et de
          tous les proches déjà désignés co-administrateurs temporaires. Valide une proposition pour en
          faire un co-administrateur — il obtient l'accès complet aux réglages et au planning pendant ton
          absence. Tu gardes la main à tout moment : tu peux révoquer, puis annuler la révocation, ici même.
        </Text>

        <TextInput
          style={[styles.searchInput, { backgroundColor: C.card, borderColor: C.border, color: C.text }]}
          placeholder="Rechercher un nom…"
          placeholderTextColor={C.muted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="words"
        />

        <Text style={[styles.sectionTitle, { color: C.text }]}>🆘 Besoins SOS</Text>
        {loading ? (
          <ActivityIndicator color={C.accent} style={{ marginTop: 24 }} />
        ) : filteredSosBlocks.length === 0 ? (
          <Text style={[styles.empty, { color: C.muted }]}>
            {search.trim() ? "Aucun besoin ne correspond à cette recherche." : "Tu n'as encore créé aucun Besoin SOS."}
          </Text>
        ) : (
          filteredSosBlocks.map(({ task, proposals }) => (
            <View key={task.id} style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={styles.taskHeaderRow}>
                <Text style={[styles.cardName, { color: C.text, flex: 1 }]} numberOfLines={2}>{task.title}</Text>
                <Text style={[styles.taskStatusTag, { color: C.muted }]}>{taskStatusTag(task.status)}</Text>
              </View>
              {!!task.relais_start_date && !!task.date_limite && (
                <Text style={[styles.periodText, { color: C.muted, marginTop: 2 }]}>
                  📅 Besoin du {toFrShort(new Date(task.relais_start_date + "T12:00:00"))} au {toFrShort(new Date(task.date_limite + "T12:00:00"))}
                </Text>
              )}

              {proposals.length === 0 ? (
                <Text style={[styles.periodText, { color: C.muted, marginTop: 10 }]}>Aucune proposition pour l'instant.</Text>
              ) : (
                <View style={styles.periodsBlock}>
                  {proposals.map((p) => {
                    const grant = coadminByCoverageId.get(p.id) ?? null;
                    const status = statusLabel(grant);
                    return (
                      <View key={p.id} style={styles.periodRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.periodText, { color: C.text }]} numberOfLines={1}>
                            🙋 {p.prenom} {p.nom}{unreadProposalIds.has(p.id) ? "  🆕" : ""}
                          </Text>
                          <Text style={[styles.periodText, { color: C.muted }]} numberOfLines={1}>
                            🗓️ {formatPeriod(p.start_date, p.end_date)}{p.full_period ? " (période complète)" : ""}
                          </Text>
                          <Text style={[styles.cardStatus, { color: status.color }]}>{status.text}</Text>
                          {!!grantErrors[p.id] && (
                            <Text style={[styles.errorText, { color: C.danger }]}>{grantErrors[p.id]}</Text>
                          )}
                        </View>
                        {renderProposalActions(grant, p)}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          ))
        )}

        <Text style={[styles.sectionTitle, { color: C.text, marginTop: 22 }]}>🛡️ Co-Administrateurs</Text>
        {loading ? null : filteredPersonBlocks.length === 0 ? (
          <Text style={[styles.empty, { color: C.muted }]}>
            {search.trim() ? "Personne ne correspond à cette recherche." : "Aucun co-administrateur désigné pour l'instant."}
          </Text>
        ) : (
          filteredPersonBlocks.map((person) => {
            const expanded = expandedPersonKey === person.key;
            const activeCount = person.grants.filter((g) => g.active).length;
            return (
              <View key={person.key} style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
                <TouchableOpacity
                  style={styles.visitorRow}
                  onPress={() => setExpandedPersonKey(expanded ? null : person.key)}
                  activeOpacity={0.8}
                >
                  <PatientAvatar photoUrl={person.photoUrl} firstname={person.prenom} lastname={person.nom} size={40} C={C} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardName, { color: C.text }]}>{person.prenom} {person.nom}</Text>
                    <Text style={[styles.periodText, { color: C.muted }]}>
                      {activeCount > 0
                        ? `${activeCount} proposition${activeCount > 1 ? "s" : ""} active${activeCount > 1 ? "s" : ""}`
                        : `${person.grants.length} proposition${person.grants.length > 1 ? "s" : ""}`}
                    </Text>
                  </View>
                  <Text style={[styles.expandChevron, { color: C.muted }]}>{expanded ? "▾" : "▸"}</Text>
                </TouchableOpacity>

                {expanded && (
                  <View style={styles.periodsBlock}>
                    {person.grants.map((g) => {
                      const status = statusLabel(g);
                      return (
                        <View key={g.id} style={styles.periodRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.periodText, { color: C.text }]} numberOfLines={2}>
                              {grantSourceLabel(g)}
                            </Text>
                            <Text style={[styles.cardStatus, { color: status.color }]}>{status.text}</Text>
                          </View>
                          {g.active ? (
                            <TouchableOpacity
                              style={[styles.revokeBtn, { borderColor: "rgba(233,69,96,0.4)" }]}
                              onPress={() => handleRevoke(g)}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.revokeBtnText}>Révoquer</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              style={[styles.undoBtn, { borderColor: C.border }]}
                              onPress={() => handleUndoRevoke(g)}
                              disabled={undoing === g.id}
                              activeOpacity={0.8}
                            >
                              {undoing === g.id ? <ActivityIndicator color={C.text} size="small" /> : <Text style={[styles.undoBtnText, { color: C.text }]}>Annuler</Text>}
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
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
        message={revokeTarget ? `${revokeTarget.prenom} ${revokeTarget.nom} perdra l'accès à l'administration dès sa prochaine connexion. Tu pourras annuler cette révocation à tout moment.` : ""}
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
  sectionTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 17, marginBottom: 10 },
  empty: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center", marginTop: 8, marginBottom: 8 },
  searchInput: {
    borderWidth: 1, borderRadius: 10, padding: 12,
    fontFamily: "DM_Sans_400Regular", fontSize: 14, marginBottom: 18,
  },
  errorText: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 3 },
  card: {
    borderWidth: 1, borderRadius: 14,
    padding: 14, marginBottom: 10,
  },
  taskHeaderRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  taskStatusTag: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11.5 },
  visitorRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  expandChevron: { fontSize: 16 },
  cardName: { fontFamily: "DM_Sans_600SemiBold", fontSize: 15 },
  cardStatus: { fontFamily: "DM_Sans_400Regular", fontSize: 12.5, marginTop: 2 },
  revokeBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  revokeBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12.5, color: "#e94560" },
  undoBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  undoBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12.5 },
  validateBtn: { borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  validateBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12.5, color: "#fff" },
  pendingEmailText: { fontFamily: "DM_Sans_400Regular", fontSize: 11.5, maxWidth: 90, textAlign: "right" },
  periodsBlock: {
    marginTop: 10, gap: 10,
  },
  periodText: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },
  periodRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
  },
});
