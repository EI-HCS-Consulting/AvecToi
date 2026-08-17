import { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Modal, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert, Animated,
} from "react-native";
import { supabase } from "@/lib/supabase";
import MetierPickerModal from "@/components/MetierPickerModal";
import SoinPickerModal from "@/components/SoinPickerModal";
import SoinDurationModal from "@/components/SoinDurationModal";
import { propagateSoinChange } from "@/lib/interventionTypesSync";
import { metierLabel } from "@/lib/metiers";
import type { Theme } from "@/lib/themes";
import type { IntervenantProfile } from "@/lib/types";

// Fiche intervenant express créée par l'admin, sans code PIN ni rien qui
// permettrait une future connexion (voir migration
// 20260817_intervenant_no_login_and_booking_alerts.sql, pin nullable) —
// ouverte depuis l'étape "Intervenant" de AdminAddIntervention.tsx pour
// créer à la volée la fiche d'un intervenant qui n'a pas et n'aura jamais
// de compte dans l'app. Même squelette que IntervenantOnboardingFlow.tsx
// (Modal + Animated slide entre étapes, réutilise les mêmes pickers) mais
// réduit aux étapes utiles ici : identité, métier, soins, email optionnel —
// pas de téléphone ni de phrase totem (réservés à l'auto-onboarding).
interface PendingSoin {
  label: string;
  duration_minutes: number;
}

interface Props {
  visible: boolean;
  spaceId: string;
  theme: Theme;
  onClose: () => void;
  onCreated: (profile: IntervenantProfile) => void;
}

type Step = "identite" | "metier" | "soins" | "email";

const SLIDE_DISTANCE = 56;

export default function AdminNewIntervenantFlow({ visible, spaceId, theme: C, onClose, onCreated }: Props) {
  const [step, setStep] = useState<Step>("identite");
  const slideAnim = useRef(new Animated.Value(0)).current;
  const directionRef = useRef<1 | -1>(1);
  function goToStep(next: Step, direction: 1 | -1) {
    directionRef.current = direction;
    setStep(next);
  }
  useEffect(() => {
    slideAnim.setValue(directionRef.current * SLIDE_DISTANCE);
    Animated.timing(slideAnim, { toValue: 0, duration: 260, useNativeDriver: true }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [metier, setMetier] = useState<string | null>(null);
  const [metierPickerOpen, setMetierPickerOpen] = useState(false);
  const [soins, setSoins] = useState<PendingSoin[]>([]);
  const [soinPickerOpen, setSoinPickerOpen] = useState(false);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Ce composant reste monté (ouvert/fermé) par AdminAddIntervention plutôt
  // que d'être créé à chaque fois — reset explicite à chaque ouverture pour
  // ne pas laisser traîner la fiche précédemment saisie.
  useEffect(() => {
    if (!visible) return;
    setStep("identite");
    setPrenom("");
    setNom("");
    setMetier(null);
    setSoins([]);
    setEmail("");
  }, [visible]);

  function removeSoin(index: number) {
    setSoins((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSoinDurationSave(minutes: number) {
    if (!pendingLabel) return;
    setSoins((prev) => {
      const idx = prev.findIndex((s) => s.label === pendingLabel);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { label: pendingLabel, duration_minutes: minutes };
        return copy;
      }
      return [...prev, { label: pendingLabel, duration_minutes: minutes }];
    });
    setPendingLabel(null);
  }

  async function handleCreate() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const trimmedPrenom = prenom.trim();
      const trimmedNom = nom.trim();
      const trimmedEmail = email.trim();

      const { data, error } = await supabase
        .from("intervenant_profiles")
        .insert({
          space_id: spaceId,
          prenom: trimmedPrenom,
          nom: trimmedNom,
          pin: null,
          email: trimmedEmail || null,
          metier,
        })
        .select("*")
        .single();
      if (error && error.code === "23505") {
        throw new Error(
          "Une fiche existe déjà pour ce prénom et ce nom dans cet espace. Retrouve-la dans Fiches Intervenants plutôt que d'en créer une nouvelle.",
        );
      }
      if (error || !data) throw error ?? new Error("Création de la fiche impossible.");

      const { error: insErr } = await supabase.from("intervention_types").insert(
        soins.map((s) => ({ intervenant_profile_id: data.id, label: s.label, duration_minutes: s.duration_minutes })),
      );
      if (insErr) throw insErr;
      for (const s of soins) {
        await propagateSoinChange(data.id, { type: "create", label: s.label, duration_minutes: s.duration_minutes });
      }

      onCreated(data as IntervenantProfile);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible de créer cette fiche intervenant.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.overlay, { flexGrow: 1, justifyContent: "center", paddingVertical: 16 }]}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View
              style={[
                styles.card,
                { backgroundColor: C.card, borderColor: C.border, overflow: "hidden" },
                { transform: [{ translateX: slideAnim }], opacity: slideAnim.interpolate({
                  inputRange: [-SLIDE_DISTANCE, 0, SLIDE_DISTANCE],
                  outputRange: [0, 1, 0],
                }) },
              ]}
            >
              {step === "identite" && (
                <>
                  <Text style={[styles.title, { color: C.text }]}>🩺 Nouvel intervenant</Text>
                  <Text style={[styles.subtitle, { color: C.muted }]}>
                    Fiche express, sans code ni connexion possible pour cette personne — juste
                    de quoi lui réserver des créneaux.
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                    placeholder="Prénom"
                    placeholderTextColor={C.muted}
                    value={prenom}
                    onChangeText={setPrenom}
                    autoFocus
                  />
                  <TextInput
                    style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text, marginTop: 10 }]}
                    placeholder="Nom"
                    placeholderTextColor={C.muted}
                    value={nom}
                    onChangeText={setNom}
                  />
                  <View style={styles.rowBtns}>
                    <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                      <Text style={[styles.cancelBtnText, { color: C.muted }]}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.nextBtn, { backgroundColor: C.accent }, (!prenom.trim() || !nom.trim()) && { opacity: 0.5 }]}
                      onPress={() => prenom.trim() && nom.trim() && goToStep("metier", 1)}
                      disabled={!prenom.trim() || !nom.trim()}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.nextBtnText}>Suivant</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {step === "metier" && (
                <>
                  <TouchableOpacity onPress={() => goToStep("identite", -1)} style={{ marginBottom: 8 }}>
                    <Text style={[styles.linkText, { color: C.accent }]}>‹ Retour</Text>
                  </TouchableOpacity>
                  <Text style={[styles.title, { color: C.text }]}>🧑‍⚕️ Son métier</Text>
                  <Text style={[styles.subtitle, { color: C.muted }]}>
                    Choisis sa spécialisation principale dans la liste, ou "Autre" pour la saisir toi-même.
                  </Text>
                  <TouchableOpacity
                    style={[styles.metierBtn, { backgroundColor: C.orange }]}
                    onPress={() => setMetierPickerOpen(true)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.metierBtnText} numberOfLines={1}>
                      {metier ? metierLabel(metier) : "Choisir un métier"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.nextBtn, { backgroundColor: C.accent }, !metier && { opacity: 0.5 }]}
                    onPress={() => metier && goToStep("soins", 1)}
                    disabled={!metier}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.nextBtnText}>Suivant</Text>
                  </TouchableOpacity>
                </>
              )}

              {step === "soins" && (
                <>
                  <TouchableOpacity onPress={() => goToStep("metier", -1)} style={{ marginBottom: 8 }} disabled={submitting}>
                    <Text style={[styles.linkText, { color: C.accent }]}>‹ Retour</Text>
                  </TouchableOpacity>
                  <Text style={[styles.title, { color: C.text }]}>🩺 Ses soins</Text>
                  <Text style={[styles.subtitle, { color: C.muted }]}>
                    Ajoute les soins qu'il/elle pratique, avec leur durée habituelle.
                  </Text>
                  {soins.map((s, i) => (
                    <View key={s.label} style={[styles.soinRow, { borderColor: C.border }]}>
                      <Text style={[styles.soinRowText, { color: C.text }]} numberOfLines={1}>
                        {s.label} — {s.duration_minutes} min
                      </Text>
                      <TouchableOpacity onPress={() => removeSoin(i)} style={styles.removeBtn}>
                        <Text style={{ color: C.danger, fontSize: 18 }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity
                    onPress={() => setSoinPickerOpen(true)}
                    style={[styles.addSoinBtn, { backgroundColor: C.orange }]}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.addSoinBtnText}>+ Ajouter un soin</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.nextBtn, { backgroundColor: C.accent }, soins.length === 0 && { opacity: 0.5 }]}
                    onPress={() => soins.length > 0 && goToStep("email", 1)}
                    disabled={soins.length === 0}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.nextBtnText}>Suivant</Text>
                  </TouchableOpacity>
                </>
              )}

              {step === "email" && (
                <>
                  <TouchableOpacity onPress={() => goToStep("soins", -1)} style={{ marginBottom: 8 }} disabled={submitting}>
                    <Text style={[styles.linkText, { color: C.accent }]}>‹ Retour</Text>
                  </TouchableOpacity>
                  <Text style={[styles.title, { color: C.text }]}>✉️ Son email</Text>
                  <Text style={[styles.subtitle, { color: C.muted }]}>
                    Facultatif — permet de lui envoyer une confirmation quand tu lui réserves un créneau.
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                    placeholder="Email (optionnel)"
                    placeholderTextColor={C.muted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={[styles.nextBtn, { backgroundColor: C.accent }, submitting && { opacity: 0.5 }]}
                    onPress={handleCreate}
                    disabled={submitting}
                    activeOpacity={0.85}
                  >
                    {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.nextBtnText}>Créer la fiche</Text>}
                  </TouchableOpacity>
                </>
              )}
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <MetierPickerModal
        visible={metierPickerOpen}
        C={C}
        onClose={() => setMetierPickerOpen(false)}
        onPick={setMetier}
      />

      <SoinPickerModal
        visible={soinPickerOpen}
        metiers={[metier]}
        value=""
        C={C}
        onClose={() => setSoinPickerOpen(false)}
        onPick={(label) => setPendingLabel(label)}
      />

      <SoinDurationModal
        visible={pendingLabel !== null}
        label={pendingLabel ?? ""}
        C={C}
        onClose={() => setPendingLabel(null)}
        onSave={handleSoinDurationSave}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", maxWidth: 400, borderRadius: 20, borderWidth: 1, padding: 24 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, marginBottom: 10, textAlign: "center" },
  subtitle: { fontFamily: "DM_Sans_400Regular", fontSize: 14, lineHeight: 20, textAlign: "center", marginBottom: 18 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontFamily: "DM_Sans_400Regular", fontSize: 14 },
  linkText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  metierBtn: { borderRadius: 10, padding: 13, alignItems: "center", marginBottom: 16 },
  metierBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14, color: "#fff" },
  soinRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  soinRowText: { flex: 1, fontFamily: "DM_Sans_600SemiBold", fontSize: 14, marginRight: 8 },
  removeBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  addSoinBtn: { borderRadius: 12, paddingVertical: 13, alignItems: "center", marginTop: 8, marginBottom: 16 },
  addSoinBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
  nextBtn: { borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 4, flex: 1 },
  nextBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 15, color: "#fff" },
  rowBtns: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: { alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  cancelBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});
