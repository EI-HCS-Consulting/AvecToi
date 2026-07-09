import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import * as Crypto from "expo-crypto";
import { supabase } from "@/lib/supabase";
import { useSpace } from "@/lib/SpaceContext";
import { themes, themeLabels } from "@/lib/themes";
import type { ThemeKey } from "@/lib/themes";
import { generateDossierCode } from "@/lib/dossierCode";
import { FREE_VISIT_LIMIT } from "@/lib/freemiumCap";
import type { PatientSpace } from "@/lib/types";
import ShareSpace from "@/components/ShareSpace";

const DOSSIER_CODE_UNIQUE_VIOLATION = "23505";
const DOSSIER_CODE_MAX_ATTEMPTS = 5;

const THEME_SWATCHES: Record<ThemeKey, string> = {
  blue: "#2E75B6",
  red: "#C0392B",
  pink: "#E91E8C",
  green: "#27AE60",
  yellow: "#D4A017",
  orange: "#E67E22",
};
const THEME_ORDER: ThemeKey[] = ["blue", "red", "pink", "green", "yellow", "orange"];

// Horaires par défaut pré-remplis dans le formulaire — l'admin les ajuste
// dès la création de l'espace au lieu de devoir passer par Paramètres.
const DEFAULT_HOURS = {
  visit_start_hour: 14,
  visit_end_hour: 20,
  slot_duration_minutes: 30,
  min_gap_minutes: 0,
};

// Pas encore saisissables à l'onboarding — réglables ensuite dans Paramètres.
const FIXED_SLOT_CONFIG = {
  max_visitors_per_slot: 2,
  night_enabled: false,
  max_night_visitors: 1,
};

const SPACE_DURATION_DAYS = 30; // matches the "Prolonger de 30 jours" RGPD cycle

type Step = "patient" | "care" | "hours" | "rules" | "theme" | "share";
const FORM_STEPS: Step[] = ["patient", "care", "hours", "rules", "theme"];
const STEP_TITLES: Record<Step, string> = {
  patient: "Patient",
  care: "Où est-il / elle suivi(e) ?",
  hours: "Horaires de visite",
  rules: "Consignes de visite",
  theme: "Thème de couleur",
  share: "Inviter des proches",
};

function isoDate(d: Date) {
  return d.toISOString().split("T")[0];
}

function parseHour(value: string, fallback: number) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 && n <= 23 ? n : fallback;
}

function parseMinutes(value: string, fallback: number) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/**
 * Shown in place of the admin tabs as soon as an authenticated admin has no
 * active patient_spaces row yet — covers both the fresh-signup path and an
 * admin who logs back in after a space was somehow removed. Runs as a
 * sequential wizard so the invite link is generated and shown as soon as the
 * space exists, instead of only after every field is filled in.
 */
export default function PatientOnboarding() {
  const { refreshSpace } = useSpace();
  const C = themes.blue;

  const [step, setStep] = useState<Step>("patient");
  const [createdSpace, setCreatedSpace] = useState<PatientSpace | null>(null);

  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");

  const [homeCareMode, setHomeCareMode] = useState(false);
  const [hospitalName, setHospitalName] = useState("");
  const [hospitalService, setHospitalService] = useState("");
  const [hospitalSector, setHospitalSector] = useState("");
  const [hospitalRoom, setHospitalRoom] = useState("");
  const [hospitalAddress, setHospitalAddress] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [homeAddressLine2, setHomeAddressLine2] = useState("");
  const [homePostalCode, setHomePostalCode] = useState("");
  const [homeCity, setHomeCity] = useState("");
  const [homeCountry, setHomeCountry] = useState("");

  const [visitRules, setVisitRules] = useState("");
  const [theme, setTheme] = useState<ThemeKey>("blue");
  const [submitting, setSubmitting] = useState(false);

  // Horaires de visite (pré-remplis, modifiables avant création de l'espace)
  const [visitStartHour, setVisitStartHour] = useState(String(DEFAULT_HOURS.visit_start_hour));
  const [visitEndHour, setVisitEndHour] = useState(String(DEFAULT_HOURS.visit_end_hour));
  const [slotDuration, setSlotDuration] = useState(String(DEFAULT_HOURS.slot_duration_minutes));
  const [minGap, setMinGap] = useState(String(DEFAULT_HOURS.min_gap_minutes));

  const canLeavePatientStep = firstname.trim().length > 0 && lastname.trim().length > 0;

  function goBack() {
    const idx = FORM_STEPS.indexOf(step as Step);
    if (idx > 0) setStep(FORM_STEPS[idx - 1]);
  }

  function goNext() {
    if (step === "patient" && !canLeavePatientStep) return;
    const idx = FORM_STEPS.indexOf(step as Step);
    if (idx >= 0 && idx < FORM_STEPS.length - 1) setStep(FORM_STEPS[idx + 1]);
  }

  async function handleCreate() {
    if (submitting) return;
    setSubmitting(true);

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) throw userErr ?? new Error("Session expirée, reconnecte-toi.");

      const now = new Date();
      const end = new Date(now);
      end.setDate(end.getDate() + SPACE_DURATION_DAYS);

      const careFields = homeCareMode
        ? {
            home_care_mode: true,
            home_address: homeAddress.trim() || null,
            home_address_line2: homeAddressLine2.trim() || null,
            home_postal_code: homePostalCode.trim() || null,
            home_city: homeCity.trim() || null,
            home_country: homeCountry.trim() || null,
            home_maps_url: null,
            hospital_name: "",
            hospital_service: "",
            hospital_sector: null,
            hospital_room: "",
            hospital_address: "",
          }
        : {
            home_care_mode: false,
            home_address: null,
            home_address_line2: null,
            home_postal_code: null,
            home_city: null,
            home_country: null,
            home_maps_url: null,
            hospital_name: hospitalName.trim(),
            hospital_service: hospitalService.trim(),
            hospital_sector: hospitalSector.trim() || null,
            hospital_room: hospitalRoom.trim(),
            hospital_address: hospitalAddress.trim(),
          };

      let space: PatientSpace | null = null;
      let spaceErr: any = null;
      for (let attempt = 0; attempt < DOSSIER_CODE_MAX_ATTEMPTS; attempt++) {
        const result = await supabase
          .from("patient_spaces")
          .insert({
            admin_id: userData.user.id,
            admin_firstname: userData.user.user_metadata?.firstname ?? null,
            admin_lastname: userData.user.user_metadata?.lastname ?? null,
            patient_firstname: firstname.trim(),
            patient_lastname: lastname.trim(),
            ...careFields,
            hospital_maps_url: "",
            visit_rules: visitRules.trim(),
            theme,
            is_active: true,
            premium: false,
            invite_token: Crypto.randomUUID(),
            dossier_code: generateDossierCode(),
            start_date: isoDate(now),
            end_date: isoDate(end),
            last_activity_at: now.toISOString(),
            purge_scheduled_at: end.toISOString(),
          })
          .select()
          .single();

        space = result.data;
        spaceErr = result.error;

        // Retry only on a dossier_code collision (extremely unlikely) — any
        // other error should surface immediately.
        if (!spaceErr || spaceErr.code !== DOSSIER_CODE_UNIQUE_VIOLATION) break;
      }

      if (spaceErr || !space) throw spaceErr ?? new Error("Création de l'espace impossible.");

      const startHour = parseHour(visitStartHour, DEFAULT_HOURS.visit_start_hour);
      const endHour = parseHour(visitEndHour, DEFAULT_HOURS.visit_end_hour);
      const { error: slotErr } = await supabase
        .from("slot_config")
        .insert({
          space_id: space.id,
          visit_start_hour: endHour > startHour ? startHour : DEFAULT_HOURS.visit_start_hour,
          visit_end_hour: endHour > startHour ? endHour : DEFAULT_HOURS.visit_end_hour,
          slot_duration_minutes: parseMinutes(slotDuration, DEFAULT_HOURS.slot_duration_minutes) || DEFAULT_HOURS.slot_duration_minutes,
          min_gap_minutes: parseMinutes(minGap, DEFAULT_HOURS.min_gap_minutes),
          ...FIXED_SLOT_CONFIG,
        });

      if (slotErr) throw slotErr;

      setCreatedSpace(space);
      setStep("share");
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible de créer l'espace pour le moment.");
    } finally {
      setSubmitting(false);
    }
  }

  const formStepIndex = FORM_STEPS.indexOf(step as Step);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Bienvenue 👋</Text>
        {step !== "share" && (
          <Text style={[styles.stepIndicator, { color: C.muted }]}>
            Étape {formStepIndex + 1} sur {FORM_STEPS.length}
          </Text>
        )}
        <Text style={[styles.sectionTitle, { color: C.gold }]}>{STEP_TITLES[step]}</Text>

        {step === "patient" && (
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <TextInput
              style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
              placeholder="Prénom *"
              placeholderTextColor={C.muted}
              value={firstname}
              onChangeText={setFirstname}
            />
            <TextInput
              style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
              placeholder="Nom *"
              placeholderTextColor={C.muted}
              value={lastname}
              onChangeText={setLastname}
            />
            <Text style={[styles.cardDesc, { color: C.muted }]}>
              Le nom du patient ne pourra plus être modifié directement une fois l'espace créé.
              Pour tout changement, une demande sera à envoyer depuis Paramètres.
            </Text>
          </View>
        )}

        {step === "care" && (
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={{ gap: 8 }}>
              <TouchableOpacity
                style={[
                  styles.careOption,
                  {
                    backgroundColor: C.bg,
                    borderColor: !homeCareMode ? C.accent : C.border,
                    borderWidth: !homeCareMode ? 2 : 1,
                  },
                ]}
                onPress={() => setHomeCareMode(false)}
                activeOpacity={0.75}
              >
                <Text style={[styles.careOptionText, { color: !homeCareMode ? "#fff" : C.muted }]}>
                  🏥 Suivi hospitalier
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.careOption,
                  {
                    backgroundColor: C.bg,
                    borderColor: homeCareMode ? C.accent : C.border,
                    borderWidth: homeCareMode ? 2 : 1,
                  },
                ]}
                onPress={() => setHomeCareMode(true)}
                activeOpacity={0.75}
              >
                <Text style={[styles.careOptionText, { color: homeCareMode ? "#fff" : C.muted }]}>
                  🏠 Soin à domicile
                </Text>
              </TouchableOpacity>
            </View>

            {homeCareMode ? (
              <>
                <TextInput
                  style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                  placeholder="Adresse"
                  placeholderTextColor={C.muted}
                  value={homeAddress}
                  onChangeText={setHomeAddress}
                />
                <TextInput
                  style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                  placeholder="Complément d'adresse"
                  placeholderTextColor={C.muted}
                  value={homeAddressLine2}
                  onChangeText={setHomeAddressLine2}
                />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TextInput
                    style={[styles.input, { flex: 1, backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                    placeholder="Code postal"
                    placeholderTextColor={C.muted}
                    value={homePostalCode}
                    onChangeText={setHomePostalCode}
                    keyboardType="number-pad"
                  />
                  <TextInput
                    style={[styles.input, { flex: 2, backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                    placeholder="Ville"
                    placeholderTextColor={C.muted}
                    value={homeCity}
                    onChangeText={setHomeCity}
                  />
                </View>
                <TextInput
                  style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                  placeholder="Pays"
                  placeholderTextColor={C.muted}
                  value={homeCountry}
                  onChangeText={setHomeCountry}
                />
              </>
            ) : (
              <>
                <TextInput
                  style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                  placeholder="Nom de l'hôpital"
                  placeholderTextColor={C.muted}
                  value={hospitalName}
                  onChangeText={setHospitalName}
                />
                <TextInput
                  style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                  placeholder="Service"
                  placeholderTextColor={C.muted}
                  value={hospitalService}
                  onChangeText={setHospitalService}
                />
                <TextInput
                  style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                  placeholder="Service de l'hôpital (ex : Secteur A)"
                  placeholderTextColor={C.muted}
                  value={hospitalSector}
                  onChangeText={setHospitalSector}
                />
                <TextInput
                  style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                  placeholder="N° de chambre"
                  placeholderTextColor={C.muted}
                  value={hospitalRoom}
                  onChangeText={setHospitalRoom}
                />
                <TextInput
                  style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                  placeholder="Adresse"
                  placeholderTextColor={C.muted}
                  value={hospitalAddress}
                  onChangeText={setHospitalAddress}
                />
              </>
            )}
          </View>
        )}

        {step === "hours" && (
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.cardDesc, { color: C.muted }]}>
              Réglable plus tard dans Paramètres si besoin.
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                placeholder="Début (ex : 14)"
                placeholderTextColor={C.muted}
                value={visitStartHour}
                onChangeText={setVisitStartHour}
                keyboardType="number-pad"
              />
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                placeholder="Fin (ex : 20)"
                placeholderTextColor={C.muted}
                value={visitEndHour}
                onChangeText={setVisitEndHour}
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                placeholder="Durée/visite (min)"
                placeholderTextColor={C.muted}
                value={slotDuration}
                onChangeText={setSlotDuration}
                keyboardType="number-pad"
              />
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                placeholder="Pause entre visites (min)"
                placeholderTextColor={C.muted}
                value={minGap}
                onChangeText={setMinGap}
                keyboardType="number-pad"
              />
            </View>
          </View>
        )}

        {step === "rules" && (
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.cardDesc, { color: C.muted }]}>
              Une consigne par ligne — affichées aux visiteurs dans l'onglet Infos.
            </Text>
            <TextInput
              style={[styles.input, styles.textarea, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
              placeholder={"Ex :\nMasque obligatoire\nMax 2 personnes par visite"}
              placeholderTextColor={C.muted}
              value={visitRules}
              onChangeText={setVisitRules}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        )}

        {step === "theme" && (
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={styles.themeGrid}>
              {THEME_ORDER.map((key) => {
                const isActive = theme === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.themeOption,
                      {
                        backgroundColor: C.bg,
                        borderColor: isActive ? THEME_SWATCHES[key] : C.border,
                        borderWidth: isActive ? 2 : 1,
                      },
                    ]}
                    onPress={() => setTheme(key)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.themeSwatch, { backgroundColor: THEME_SWATCHES[key] }]} />
                    <Text style={[styles.themeLabel, { color: isActive ? "#fff" : C.muted }]}>
                      {themeLabels[key]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {step === "share" && createdSpace && (
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border, alignItems: "center" }]}>
            <Text style={[styles.cardDesc, { color: C.muted, textAlign: "center" }]}>
              Espace créé ✓ Invite quelqu'un dès maintenant.
            </Text>
            <ShareSpace space={createdSpace} C={C} />
          </View>
        )}

        {step !== "share" && (
          <View style={styles.nav}>
            {step !== "patient" && (
              <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.75}>
                <Text style={[styles.backBtnText, { color: C.muted }]}>← Retour</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.submitBtn,
                { backgroundColor: C.accent },
                step === "patient" && !canLeavePatientStep && styles.submitBtnDisabled,
              ]}
              onPress={step === "theme" ? handleCreate : goNext}
              disabled={(step === "patient" && !canLeavePatientStep) || submitting}
              activeOpacity={0.85}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.submitBtnText}>{step === "theme" ? "Créer l'espace" : "Suivant →"}</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {step === "share" && (
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: C.accent }]}
            onPress={refreshSpace}
            activeOpacity={0.85}
          >
            <Text style={styles.submitBtnText}>Continuer →</Text>
          </TouchableOpacity>
        )}

        {step === "patient" && (
          <Text style={styles.hint}>
            Tu pourras planifier jusqu'à {FREE_VISIT_LIMIT} visites gratuitement.{"\n"}
            Pas de carte bancaire, pas d'engagement.
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingTop: 56, paddingBottom: 48 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 26, color: "#fff", marginBottom: 8 },
  stepIndicator: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginBottom: 18 },
  sectionTitle: {
    fontFamily: "DM_Sans_600SemiBold", fontSize: 11,
    letterSpacing: 1, textTransform: "uppercase",
    marginBottom: 10,
  },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 10 },
  cardDesc: { fontFamily: "DM_Sans_400Regular", fontSize: 13, lineHeight: 19, marginBottom: 2 },
  input: {
    borderWidth: 1, borderRadius: 10, padding: 13,
    fontFamily: "DM_Sans_400Regular", fontSize: 15,
  },
  textarea: { minHeight: 90 },
  careOption: {
    borderRadius: 10, paddingVertical: 14, paddingHorizontal: 14,
  },
  careOptionText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 15 },
  themeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  themeOption: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12,
    minWidth: "46%",
  },
  themeSwatch: { width: 18, height: 18, borderRadius: 9 },
  themeLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, flex: 1 },
  nav: { flexDirection: "row", gap: 12, alignItems: "center", marginTop: 28 },
  backBtn: { paddingVertical: 16, paddingHorizontal: 4 },
  backBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 15 },
  submitBtn: { flex: 1, borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 28 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 16, color: "#fff" },
  hint: {
    fontFamily: "DM_Sans_400Regular", fontSize: 12, color: "#7a8fa6",
    textAlign: "center", marginTop: 16, lineHeight: 18,
  },
});
