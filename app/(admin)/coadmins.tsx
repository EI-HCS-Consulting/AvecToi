import { useCallback, useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Modal, TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { useSpace } from "@/lib/SpaceContext";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { supabase } from "@/lib/supabase";
import { canGrantCoAdmin } from "@/lib/freemiumCap";
import { loadKnownVisitors, visitorIdentityKey, type KnownVisitor } from "@/lib/visitorRoster";
import PatientAvatar from "@/components/PatientAvatar";
import ConfirmModal from "@/components/ConfirmModal";
import PremiumGateModal from "@/components/PremiumGateModal";
import type { PatientSpaceCoadmin } from "@/lib/types";

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

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [knownVisitors, setKnownVisitors] = useState<KnownVisitor[]>([]);
  const [search, setSearch] = useState("");
  const [granting, setGranting] = useState<string | null>(null);
  const [grantError, setGrantError] = useState("");

  const load = useCallback(async () => {
    if (!space) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("patient_space_coadmins")
      .select("id, space_id, visitor_id, prenom, nom, active, accepted_at, granted_at, revoked_at, granted_by_admin_id")
      .eq("space_id", space.id)
      .order("granted_at", { ascending: false });
    if (error) console.error("[coadmins] load failed:", error);
    setCoadmins(data || []);
    setLoading(false);
  }, [space]);

  useEffect(() => { load(); }, [load]);

  // Un même visiteur ne peut pas avoir deux invitations/octrois en attente
  // ou actifs simultanément — exclu du picker s'il a déjà une ligne non révoquée.
  const activeOrPendingKeys = new Set(
    coadmins.filter((c) => c.active).map((c) => visitorIdentityKey(c.prenom, c.nom)),
  );

  function handleOpenAdd() {
    if (!space) return;
    if (!canGrantCoAdmin(space)) {
      setPremiumGateMsg("La co-administration temporaire fait partie de l'offre Premium. Passez votre espace en illimité pour désigner un co-administrateur.");
      return;
    }
    setSearch("");
    setGrantError("");
    setPickerVisible(true);
    setPickerLoading(true);
    loadKnownVisitors(space.id, space.admin_firstname, space.admin_lastname).then((rows) => {
      setKnownVisitors(rows);
      setPickerLoading(false);
    });
  }

  const filteredVisitors = knownVisitors.filter((v) => {
    if (activeOrPendingKeys.has(visitorIdentityKey(v.prenom, v.nom))) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return `${v.prenom} ${v.nom}`.toLowerCase().includes(q);
  });

  async function handleGrant(v: KnownVisitor) {
    if (!space) return;
    setGranting(visitorIdentityKey(v.prenom, v.nom));
    setGrantError("");

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
      setGrantError("Ce visiteur n'a pas encore de profil enregistré — il doit d'abord se connecter une fois via \"Qui êtes-vous ?\".");
      return;
    }

    const { error: insertError } = await supabase.from("patient_space_coadmins").insert({
      space_id: space.id,
      visitor_id: profile.id,
      prenom: v.prenom,
      nom: v.nom,
      granted_by_admin_id: space.admin_id,
    });

    setGranting(null);
    if (insertError) {
      console.error("[coadmins] grant failed:", insertError);
      setGrantError("Erreur lors de l'envoi de l'invitation. Réessaie.");
      return;
    }

    setPickerVisible(false);
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

  function statusLabel(c: PatientSpaceCoadmin): { text: string; color: string } {
    if (!c.active) return { text: "🔒 Révoqué", color: C.muted };
    if (!c.accepted_at) return { text: "⏳ En attente", color: C.orange };
    return { text: "✅ Actif", color: C.success };
  }

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backText, { color: C.muted }]}>← Retour</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>🛡️ Co-administrateurs</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.intro, { color: C.muted }]}>
          Désigne un ou plusieurs proches qui se sont proposés pour du relais comme
          co-administrateurs temporaires — ils obtiennent l'accès complet aux réglages et
          au planning pendant ton absence. Tu gardes la main à tout moment et peux révoquer
          un co-administrateur ici même.
        </Text>

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: C.accent }]}
          onPress={handleOpenAdd}
          activeOpacity={0.85}
        >
          <Text style={styles.addBtnText}>+ Ajouter un co-administrateur</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator color={C.accent} style={{ marginTop: 24 }} />
        ) : coadmins.length === 0 ? (
          <Text style={[styles.empty, { color: C.muted }]}>Aucun co-administrateur pour le moment.</Text>
        ) : (
          coadmins.map((c) => {
            const status = statusLabel(c);
            return (
              <View key={c.id} style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardName, { color: C.text }]}>{c.prenom} {c.nom}</Text>
                  <Text style={[styles.cardStatus, { color: status.color }]}>{status.text}</Text>
                </View>
                {c.active && (
                  <TouchableOpacity
                    style={[styles.revokeBtn, { borderColor: "rgba(233,69,96,0.4)" }]}
                    onPress={() => handleRevoke(c)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.revokeBtnText}>Révoquer</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Picker de sélection d'un visiteur connu */}
      <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setPickerVisible(false)} />
          <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.sheetTitle, { color: C.text }]}>Choisir un visiteur</Text>
            <TextInput
              style={[styles.searchInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
              placeholder="Rechercher un nom…"
              placeholderTextColor={C.muted}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="words"
            />
            {!!grantError && <Text style={[styles.errorText, { color: C.danger }]}>{grantError}</Text>}
            {pickerLoading ? (
              <ActivityIndicator color={C.accent} style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView style={{ maxHeight: 360 }}>
                {filteredVisitors.length === 0 ? (
                  <Text style={[styles.empty, { color: C.muted }]}>Aucun visiteur disponible.</Text>
                ) : filteredVisitors.map((v) => {
                  const key = visitorIdentityKey(v.prenom, v.nom);
                  return (
                    <TouchableOpacity
                      key={key}
                      style={styles.visitorRow}
                      onPress={() => handleGrant(v)}
                      disabled={!!granting}
                      activeOpacity={0.7}
                    >
                      <PatientAvatar photoUrl={v.photoUrl} firstname={v.prenom} lastname={v.nom} size={40} C={C} />
                      <Text style={[styles.visitorName, { color: C.text }]}>{v.prenom} {v.nom}</Text>
                      {granting === key && <ActivityIndicator color={C.accent} size="small" />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={!!revokeTarget}
        icon="🔒"
        title="Révoquer ce co-administrateur ?"
        message={revokeTarget ? `${revokeTarget.prenom} ${revokeTarget.nom} perdra l'accès à l'administration dès son prochain lancement de l'app.` : ""}
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
  addBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginBottom: 20 },
  addBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
  empty: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center", marginTop: 16 },
  card: {
    flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 14,
    padding: 14, marginBottom: 10,
  },
  cardName: { fontFamily: "DM_Sans_600SemiBold", fontSize: 15 },
  cardStatus: { fontFamily: "DM_Sans_400Regular", fontSize: 12.5, marginTop: 2 },
  revokeBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12 },
  revokeBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12.5, color: "#e94560" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "flex-end" },
  sheet: {
    borderWidth: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 32,
  },
  sheetTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 12 },
  searchInput: {
    borderWidth: 1, borderRadius: 10, padding: 12,
    fontFamily: "DM_Sans_400Regular", fontSize: 14, marginBottom: 10,
  },
  errorText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginBottom: 10, textAlign: "center" },
  visitorRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 10,
  },
  visitorName: { fontFamily: "DM_Sans_400Regular", fontSize: 14, flex: 1 },
});
