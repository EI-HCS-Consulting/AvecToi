import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Modal, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from "react-native";
import * as ImageManipulator from "expo-image-manipulator";
import { File } from "expo-file-system";
import { supabase } from "@/lib/supabase";
import MetierPickerModal from "@/components/MetierPickerModal";
import SoinPickerModal from "@/components/SoinPickerModal";
import SoinDurationModal from "@/components/SoinDurationModal";
import { normalizePhone } from "@/lib/phone";
import { propagateSoinChange } from "@/lib/interventionTypesSync";
import { metierLabel } from "@/lib/metiers";
import type { Theme } from "@/lib/themes";

// Création de la fiche intervenant (première connexion) — suite de popups
// enchaînées après le popup identité (prénom/nom + PIN + photo, voir
// app/(visitor)/_layout.tsx) : téléphone, phrase totem (facultative), métier,
// puis soins pratiqués. Le compte n'est créé en base qu'à la toute fin
// (handleCreateAccount), une fois au moins un soin choisi — reprend la même
// logique d'insertion que l'ancien IntervenantFicheModal en mode "create"
// (conflit 23505, upload photo différé, propagation des soins).
interface PendingSoin {
  label: string;
  duration_minutes: number;
}

interface Props {
  visible: boolean;
  spaceId: string;
  prenom: string;
  nom: string;
  pin: string;
  // Photo choisie sur le popup identité — uploadée seulement une fois le
  // profil créé (a besoin de son id pour nommer le fichier), voir
  // handleCreateAccount.
  pickedPhotoUri: string | null;
  theme: Theme;
  onCreated: (
    profileId: string, prenom: string, nom: string,
    telephone: string | null, phraseTotem: string | null,
    photo: string | null, photoUpdatedAt: string | null,
    metier: string | null,
  ) => void;
}

type Step = "telephone" | "totem" | "metier" | "soins";

export default function IntervenantOnboardingFlow({
  visible, spaceId, prenom, nom, pin, pickedPhotoUri, theme: C, onCreated,
}: Props) {
  const [step, setStep] = useState<Step>("telephone");
  const [telephone, setTelephone] = useState("");
  const [knownElsewhere, setKnownElsewhere] = useState(false);
  const [phraseTotem, setPhraseTotem] = useState("");
  const [metier, setMetier] = useState<string | null>(null);
  const [metierPickerOpen, setMetierPickerOpen] = useState(false);
  const [soins, setSoins] = useState<PendingSoin[]>([]);
  const [soinPickerOpen, setSoinPickerOpen] = useState(false);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function checkKnownElsewhere() {
    const normalized = normalizePhone(telephone);
    if (normalized.length < 6) {
      setKnownElsewhere(false);
      return;
    }
    const { count } = await supabase
      .from("intervenant_profiles")
      .select("id", { count: "exact", head: true })
      .eq("telephone", normalized)
      .neq("space_id", spaceId);
    setKnownElsewhere(!!count && count > 0);
  }

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

  async function handleCreateAccount() {
    if (soins.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const trimmedPrenom = prenom.trim();
      const trimmedNom = nom.trim();
      const trimmedTelephone = normalizePhone(telephone);
      const trimmedPhraseTotem = phraseTotem.trim();

      let profileId: string;
      const { data, error } = await supabase
        .from("intervenant_profiles")
        .insert({
          space_id: spaceId,
          prenom: trimmedPrenom,
          nom: trimmedNom,
          pin,
          telephone: trimmedTelephone || null,
          phrase_totem: trimmedPhraseTotem || null,
          metier,
        })
        .select("id")
        .single();
      if (error && error.code === "23505") {
        // Une fiche existe déjà pour ce prénom/nom dans cet espace — même
        // logique de rattachement que _layout.tsx handleSaveIdentity : si le
        // PIN correspond on réutilise la fiche existante, sinon on prévient
        // plutôt que de laisser croire à une création réussie.
        const { data: existing } = await supabase
          .from("intervenant_profiles")
          .select("id, pin")
          .eq("space_id", spaceId)
          .ilike("prenom", trimmedPrenom)
          .ilike("nom", trimmedNom)
          .maybeSingle();
        if (!existing) throw error;
        if (existing.pin !== pin) {
          throw new Error(
            "Une fiche existe déjà pour ce prénom et ce nom, avec un code différent. Vérifie ton code ou contacte l'organisateur.",
          );
        }
        profileId = existing.id;
      } else if (error || !data) {
        throw error ?? new Error("Création de la fiche impossible.");
      } else {
        profileId = data.id;
      }

      // Upload la photo seulement si une a été choisie sur le popup identité
      // — best-effort, un échec ici ne doit pas bloquer la création du
      // compte (déjà réussie) ni l'ajout des soins qui suit.
      let finalPhoto: string | null = null;
      let finalPhotoUpdatedAt: string | null = null;
      if (pickedPhotoUri) {
        try {
          const compressed = await ImageManipulator.manipulateAsync(
            pickedPhotoUri,
            [{ resize: { width: 300 } }],
            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
          );
          const fileData = await new File(compressed.uri).arrayBuffer();
          const filename = `${profileId}.jpg`;
          const { error: storageErr } = await supabase.storage
            .from("intervenant-photos")
            .upload(filename, fileData, { contentType: "image/jpeg", cacheControl: "3600", upsert: true });
          if (storageErr) {
            console.error("[IntervenantOnboardingFlow] photo upload failed:", storageErr);
          } else {
            const photoUpdatedAtIso = new Date().toISOString();
            const { error: photoErr } = await supabase
              .from("intervenant_profiles")
              .update({ photo: filename, photo_updated_at: photoUpdatedAtIso })
              .eq("id", profileId);
            if (photoErr) {
              console.error("[IntervenantOnboardingFlow] photo column update failed:", photoErr);
            } else {
              finalPhoto = filename;
              finalPhotoUpdatedAt = photoUpdatedAtIso;
            }
          }
        } catch (e) {
          console.error("[IntervenantOnboardingFlow] unexpected photo error:", e);
        }
      }

      const { error: insErr } = await supabase.from("intervention_types").insert(
        soins.map((s) => ({ intervenant_profile_id: profileId, label: s.label, duration_minutes: s.duration_minutes })),
      );
      if (insErr) throw insErr;
      for (const s of soins) {
        await propagateSoinChange(profileId, { type: "create", label: s.label, duration_minutes: s.duration_minutes });
      }

      onCreated(
        profileId, trimmedPrenom, trimmedNom,
        trimmedTelephone || null, trimmedPhraseTotem || null,
        finalPhoto, finalPhotoUpdatedAt, metier,
      );
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible de créer ta fiche intervenant.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Modal visible={visible && step === "telephone"} transparent animationType="fade" statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={styles.overlay}>
            <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
              <Text style={[styles.title, { color: C.text }]}>📞 Ton téléphone</Text>
              <Text style={[styles.subtitle, { color: C.muted }]}>
                Pour être joignable par l'administrateur ou les autres intervenants si besoin.
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                placeholder="Téléphone"
                placeholderTextColor={C.muted}
                value={telephone}
                onChangeText={setTelephone}
                onBlur={checkKnownElsewhere}
                keyboardType="phone-pad"
                autoFocus
              />
              {knownElsewhere && (
                <Text style={[styles.subtitle, { color: C.accent, marginTop: 8, textAlign: "left" }]}>
                  🔗 Ce numéro est déjà lié à un autre espace — tu pourras y accéder depuis Mon compte.
                </Text>
              )}
              <TouchableOpacity
                style={[styles.nextBtn, { backgroundColor: C.accent }, !telephone.trim() && { opacity: 0.5 }]}
                onPress={() => telephone.trim() && setStep("totem")}
                disabled={!telephone.trim()}
                activeOpacity={0.85}
              >
                <Text style={styles.nextBtnText}>Suivant</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={visible && step === "totem"} transparent animationType="fade" statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={styles.overlay}>
            <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
              <TouchableOpacity onPress={() => setStep("telephone")} style={{ marginBottom: 8 }}>
                <Text style={[styles.linkText, { color: C.accent }]}>‹ Retour</Text>
              </TouchableOpacity>
              <Text style={[styles.title, { color: C.text }]}>✨ Ta phrase totem</Text>
              <Text style={[styles.subtitle, { color: C.muted }]}>
                Une phrase ou une devise qui te représente, facultative — tu peux la laisser vide.
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                placeholder="Phrase totem (optionnel)"
                placeholderTextColor={C.muted}
                value={phraseTotem}
                onChangeText={setPhraseTotem}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.nextBtn, { backgroundColor: C.accent }]}
                onPress={() => setStep("metier")}
                activeOpacity={0.85}
              >
                <Text style={styles.nextBtnText}>Suivant</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={visible && step === "metier"} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.overlay}>
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <TouchableOpacity onPress={() => setStep("totem")} style={{ marginBottom: 8 }}>
              <Text style={[styles.linkText, { color: C.accent }]}>‹ Retour</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: C.text }]}>🧑‍⚕️ Ton métier</Text>
            <Text style={[styles.subtitle, { color: C.muted }]}>
              Choisis ta spécialisation principale dans la liste, ou "Autre" pour la saisir toi-même.
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
              onPress={() => metier && setStep("soins")}
              disabled={!metier}
              activeOpacity={0.85}
            >
              <Text style={styles.nextBtnText}>Suivant</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={visible && step === "soins"} transparent animationType="fade" statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.overlay, { flexGrow: 1, justifyContent: "center", paddingVertical: 16 }]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
              <TouchableOpacity onPress={() => setStep("metier")} style={{ marginBottom: 8 }} disabled={submitting}>
                <Text style={[styles.linkText, { color: C.accent }]}>‹ Retour</Text>
              </TouchableOpacity>
              <Text style={[styles.title, { color: C.text }]}>🩺 Tes soins</Text>
              <Text style={[styles.subtitle, { color: C.muted }]}>
                Ajoute les soins que tu pratiques, avec leur durée habituelle.
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
                style={[styles.nextBtn, { backgroundColor: C.accent }, (soins.length === 0 || submitting) && { opacity: 0.5 }]}
                onPress={handleCreateAccount}
                disabled={soins.length === 0 || submitting}
                activeOpacity={0.85}
              >
                {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.nextBtnText}>Créer mon compte</Text>}
              </TouchableOpacity>
            </View>
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
  nextBtn: { borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 4 },
  nextBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 15, color: "#fff" },
});
