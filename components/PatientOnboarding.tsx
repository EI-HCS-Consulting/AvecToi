import { useRef, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Animated, PanResponder,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Crypto from "expo-crypto";
import { supabase } from "@/lib/supabase";
import { useSpace } from "@/lib/SpaceContext";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { generateDossierCode } from "@/lib/dossierCode";
import { FREE_VISIT_LIMIT } from "@/lib/freemiumCap";
import { resolvePlaceFromMapsUrl } from "@/lib/address";
import { openAndroidTimePicker, openAndroidDatePicker } from "@/lib/androidTimePicker";
import { formatHourMinute } from "@/lib/slotUtils";
import type { PatientSpace } from "@/lib/types";

const DOSSIER_CODE_UNIQUE_VIOLATION = "23505";
const DOSSIER_CODE_MAX_ATTEMPTS = 5;

// Horaires par défaut pré-remplis dans le formulaire — l'admin les ajuste
// dès la création de l'espace au lieu de devoir passer par Paramètres.
const DEFAULT_HOURS = {
  visit_start_hour: 14,
  visit_start_minute: 0,
  visit_end_hour: 20,
  visit_end_minute: 0,
  slot_duration_minutes: 30,
  min_gap_minutes: 0,
};

const DEFAULT_MAX_VISITORS = 2;

// Pas encore saisissables à l'onboarding — réglables ensuite dans Paramètres.
const FIXED_SLOT_CONFIG = {
  night_enabled: false,
  max_night_visitors: 1,
};

const SPACE_DURATION_DAYS = 90; // matches the "Prolonger de 90 jours" RGPD cycle

type Step = "patient" | "care" | "hours" | "capacity";
const FORM_STEPS: Step[] = ["patient", "care", "hours", "capacity"];
const STEP_TITLES: Record<Step, string> = {
  patient: "Patient",
  care: "Lieu de suivi hospitalier",
  hours: "Horaires de visite",
  capacity: "Capacité & durée des visites",
};

function isoDate(d: Date) {
  return d.toISOString().split("T")[0];
}

function hourToDate(hour: number, minute = 0) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
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
  const { theme: C } = useDisplayMode();

  const [step, setStep] = useState<Step>("patient");

  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [patientMotto, setPatientMotto] = useState("");
  const [admissionDate, setAdmissionDate] = useState<string | null>(null);
  const [showAdmissionDatePicker, setShowAdmissionDatePicker] = useState(false);

  const [homeCareMode, setHomeCareMode] = useState(false);
  const homeCareModeRef = useRef(homeCareMode);
  homeCareModeRef.current = homeCareMode;
  const careThumbX = useRef(new Animated.Value(0)).current;
  const [careTrackWidth, setCareTrackWidth] = useState(0);
  const careTrackWidthRef = useRef(0);
  const [careLeftLabelWidth, setCareLeftLabelWidth] = useState(0);
  const [careRightLabelWidth, setCareRightLabelWidth] = useState(0);
  const careDragStart = useRef(0);

  function setCareMode(next: boolean) {
    setHomeCareMode(next);
    Animated.spring(careThumbX, { toValue: next ? 1 : 0, useNativeDriver: true, friction: 8 }).start();
  }

  const carePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const w = careTrackWidthRef.current;
        if (w <= 0) return;
        const frac = Math.min(1, Math.max(0, evt.nativeEvent.locationX / w));
        careDragStart.current = frac;
        careThumbX.setValue(frac);
      },
      onPanResponderMove: (_, g) => {
        const w = careTrackWidthRef.current;
        if (w <= 0) return;
        const frac = Math.min(1, Math.max(0, careDragStart.current + g.dx / w));
        careThumbX.setValue(frac);
      },
      onPanResponderRelease: (_, g) => {
        const w = careTrackWidthRef.current;
        if (w <= 0) return;
        const frac = Math.min(1, Math.max(0, careDragStart.current + g.dx / w));
        const next = frac >= 0.5;
        Animated.spring(careThumbX, { toValue: next ? 1 : 0, useNativeDriver: true, friction: 8 }).start();
        setHomeCareMode(next);
      },
      onPanResponderTerminate: () => {
        Animated.spring(careThumbX, { toValue: homeCareModeRef.current ? 1 : 0, useNativeDriver: true, friction: 8 }).start();
      },
    })
  ).current;

  const [hospitalName, setHospitalName] = useState("");
  const [hospitalService, setHospitalService] = useState("");
  const [hospitalSector, setHospitalSector] = useState("");
  const [hospitalRoom, setHospitalRoom] = useState("");
  const [hospitalAddress, setHospitalAddress] = useState("");
  const [hospitalPostalCode, setHospitalPostalCode] = useState("");
  const [hospitalCity, setHospitalCity] = useState("");
  const [hospitalCountry, setHospitalCountry] = useState("");
  const [hospitalMapsUrl, setHospitalMapsUrl] = useState("");
  const [hospitalResolving, setHospitalResolving] = useState(false);

  const [homeAddress, setHomeAddress] = useState("");
  const [homeAddressLine2, setHomeAddressLine2] = useState("");
  const [homePostalCode, setHomePostalCode] = useState("");
  const [homeCity, setHomeCity] = useState("");
  const [homeCountry, setHomeCountry] = useState("");
  const [homeMapsUrl, setHomeMapsUrl] = useState("");
  const [homeResolving, setHomeResolving] = useState(false);

  async function handleHospitalMapsUrlBlur() {
    const url = hospitalMapsUrl.trim();
    if (!url) return;
    setHospitalResolving(true);
    const place = await resolvePlaceFromMapsUrl(url);
    setHospitalResolving(false);
    if (place.name) setHospitalName(place.name);
    if (place.street) setHospitalAddress(place.street);
    if (place.postalCode) setHospitalPostalCode(place.postalCode);
    if (place.city) setHospitalCity(place.city);
    if (place.country) setHospitalCountry(place.country);
  }

  async function handleHomeMapsUrlBlur() {
    const url = homeMapsUrl.trim();
    if (!url) return;
    setHomeResolving(true);
    const place = await resolvePlaceFromMapsUrl(url);
    setHomeResolving(false);
    if (place.street) setHomeAddress(place.street);
    if (place.postalCode) setHomePostalCode(place.postalCode);
    if (place.city) setHomeCity(place.city);
    if (place.country) setHomeCountry(place.country);
  }

  const [visitRules, setVisitRules] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Horaires de visite (pré-remplis, modifiables avant création de l'espace)
  const [visitStartHour, setVisitStartHour] = useState(DEFAULT_HOURS.visit_start_hour);
  const [visitStartMinute, setVisitStartMinute] = useState(DEFAULT_HOURS.visit_start_minute);
  const [visitEndHour, setVisitEndHour] = useState(DEFAULT_HOURS.visit_end_hour);
  const [visitEndMinute, setVisitEndMinute] = useState(DEFAULT_HOURS.visit_end_minute);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Capacité & durée des visites
  const [maxVisitors, setMaxVisitors] = useState(DEFAULT_MAX_VISITORS);
  const [slotDuration, setSlotDuration] = useState(DEFAULT_HOURS.slot_duration_minutes);
  const [minGap, setMinGap] = useState(DEFAULT_HOURS.min_gap_minutes);

  const canLeavePatientStep = firstname.trim().length > 0 && lastname.trim().length > 0;

  function goBack() {
    const idx = FORM_STEPS.indexOf(step);
    if (idx > 0) setStep(FORM_STEPS[idx - 1]);
  }

  function goNext() {
    if (step === "patient" && !canLeavePatientStep) return;
    const idx = FORM_STEPS.indexOf(step);
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
            home_maps_url: homeMapsUrl.trim() || null,
            hospital_name: "",
            hospital_service: "",
            hospital_sector: null,
            hospital_room: "",
            hospital_address: "",
            hospital_postal_code: null,
            hospital_city: null,
            hospital_country: null,
            hospital_maps_url: "",
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
            hospital_postal_code: hospitalPostalCode.trim() || null,
            hospital_city: hospitalCity.trim() || null,
            hospital_country: hospitalCountry.trim() || null,
            hospital_maps_url: hospitalMapsUrl.trim(),
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
            admin_email: userData.user.email ?? null,
            patient_firstname: firstname.trim(),
            patient_lastname: lastname.trim(),
            patient_motto: patientMotto.trim() || null,
            patient_admission_date: admissionDate,
            ...careFields,
            visit_rules: visitRules.trim(),
            // Colonne conservée pour compatibilité DB — le mode d'affichage est
            // désormais une préférence locale par utilisateur (voir DisplayModeContext),
            // plus lue depuis patient_spaces.theme.
            theme: "blue",
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

      const isValidRange =
        visitEndHour * 60 + visitEndMinute > visitStartHour * 60 + visitStartMinute;

      const { error: slotErr } = await supabase
        .from("slot_config")
        .insert({
          space_id: space.id,
          visit_start_hour: isValidRange ? visitStartHour : DEFAULT_HOURS.visit_start_hour,
          visit_start_minute: isValidRange ? visitStartMinute : DEFAULT_HOURS.visit_start_minute,
          visit_end_hour: isValidRange ? visitEndHour : DEFAULT_HOURS.visit_end_hour,
          visit_end_minute: isValidRange ? visitEndMinute : DEFAULT_HOURS.visit_end_minute,
          slot_duration_minutes: slotDuration,
          min_gap_minutes: minGap,
          max_visitors_per_slot: maxVisitors,
          ...FIXED_SLOT_CONFIG,
        });

      if (slotErr) throw slotErr;

      await refreshSpace();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible de créer l'espace pour le moment.");
    } finally {
      setSubmitting(false);
    }
  }

  const formStepIndex = FORM_STEPS.indexOf(step);

  const admissionDateValue = admissionDate ? new Date(admissionDate + "T00:00:00") : new Date();
  const admissionDateLabel = admissionDate
    ? new Date(admissionDate + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;

  function openAdmissionDatePicker() {
    if (Platform.OS === "android") {
      openAndroidDatePicker(admissionDateValue, (date) => setAdmissionDate(isoDate(date)), new Date());
    } else {
      setShowAdmissionDatePicker(true);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: C.text }]}>Bienvenue 👋</Text>
        <Text style={[styles.stepIndicator, { color: C.muted }]}>
          Étape {formStepIndex + 1} sur {FORM_STEPS.length}
        </Text>
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

            <View style={[styles.fieldDivider, { backgroundColor: C.border }]} />

            <Text style={[styles.fieldLabel, { color: C.gold }]}>💬 Phrase totem (optionnel)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
              placeholder="Ex : Aimer c'est Agir !"
              placeholderTextColor={C.muted}
              value={patientMotto}
              onChangeText={setPatientMotto}
            />
            <Text style={[styles.cardDesc, { color: C.muted }]}>
              Un mantra qui définit le patient — affiché sous son nom dans la fiche patient et dans le bandeau de l'app.
            </Text>

            <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 14 }]}>🏥 Date d'hospitalisation (optionnel)</Text>
            <TouchableOpacity
              style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, justifyContent: "center" }]}
              onPress={openAdmissionDatePicker}
              activeOpacity={0.75}
            >
              <Text style={{ fontFamily: "DM_Sans_400Regular", fontSize: 14, color: admissionDateLabel ? C.text : C.muted }}>
                {admissionDateLabel ?? "Sélectionner une date"}
              </Text>
            </TouchableOpacity>
            {showAdmissionDatePicker && (
              <DateTimePicker
                value={admissionDateValue}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={(_, date) => {
                  setShowAdmissionDatePicker(false);
                  if (date) setAdmissionDate(isoDate(date));
                }}
              />
            )}
          </View>
        )}

        {step === "care" && (
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <View
              style={[styles.careTrack, { borderColor: C.border, backgroundColor: C.bg }]}
              onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                careTrackWidthRef.current = w;
                setCareTrackWidth(w);
              }}
              {...carePanResponder.panHandlers}
            >
              {careTrackWidth > 0 && careLeftLabelWidth > 0 && careRightLabelWidth > 0 && (() => {
                const padding = 24;
                const thumbWidth = Math.max(careLeftLabelWidth, careRightLabelWidth) + padding;
                const leftPos = 0;
                const rightPos = careTrackWidth - thumbWidth;
                return (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.careThumb,
                      {
                        backgroundColor: C.accent,
                        width: thumbWidth,
                        transform: [{
                          translateX: careThumbX.interpolate({ inputRange: [0, 1], outputRange: [leftPos, rightPos] }),
                        }],
                      },
                    ]}
                  />
                );
              })()}
              <View style={[styles.careOptionHalf, { left: 0 }]} pointerEvents="none">
                <Text
                  onLayout={(e) => setCareLeftLabelWidth(e.nativeEvent.layout.width)}
                  style={[styles.careOptionText, { color: !homeCareMode ? "#fff" : C.muted }]}
                >
                  🏥 Suivi hospitalier
                </Text>
              </View>
              <View style={[styles.careOptionHalf, { right: 0 }]} pointerEvents="none">
                <Text
                  onLayout={(e) => setCareRightLabelWidth(e.nativeEvent.layout.width)}
                  style={[styles.careOptionText, { color: homeCareMode ? "#fff" : C.muted }]}
                >
                  🏠 Soin à domicile
                </Text>
              </View>
            </View>

            {homeCareMode ? (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <Text style={[styles.fieldLabel, { color: C.gold }]}>🗺️ Lien Google Maps</Text>
                  {homeResolving && <ActivityIndicator color={C.accent} size="small" />}
                </View>
                <TextInput
                  style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                  placeholder="Colle ici le lien copié depuis Google Maps"
                  placeholderTextColor={C.muted}
                  value={homeMapsUrl}
                  onChangeText={setHomeMapsUrl}
                  onBlur={handleHomeMapsUrlBlur}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
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
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <Text style={[styles.fieldLabel, { color: C.gold }]}>🗺️ Lien Google Maps</Text>
                  {hospitalResolving && <ActivityIndicator color={C.accent} size="small" />}
                </View>
                <TextInput
                  style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                  placeholder="Colle ici le lien copié depuis Google Maps"
                  placeholderTextColor={C.muted}
                  value={hospitalMapsUrl}
                  onChangeText={setHospitalMapsUrl}
                  onBlur={handleHospitalMapsUrlBlur}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
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
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TextInput
                    style={[styles.input, { flex: 1, backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                    placeholder="Code postal"
                    placeholderTextColor={C.muted}
                    value={hospitalPostalCode}
                    onChangeText={setHospitalPostalCode}
                    keyboardType="number-pad"
                  />
                  <TextInput
                    style={[styles.input, { flex: 2, backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                    placeholder="Ville"
                    placeholderTextColor={C.muted}
                    value={hospitalCity}
                    onChangeText={setHospitalCity}
                  />
                </View>
                <TextInput
                  style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                  placeholder="Pays"
                  placeholderTextColor={C.muted}
                  value={hospitalCountry}
                  onChangeText={setHospitalCountry}
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
            <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 4 }]}>Début des visites</Text>
            <TouchableOpacity
              style={[styles.timeBtn, { backgroundColor: C.bg, borderColor: C.border }]}
              onPress={() => {
                if (Platform.OS === "android") {
                  openAndroidTimePicker(hourToDate(visitStartHour, visitStartMinute), (date) => {
                    setVisitStartHour(date.getHours());
                    setVisitStartMinute(date.getMinutes());
                  });
                } else {
                  setShowStartPicker(true);
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.timeBtnText, { color: C.text }]}>🕐 {formatHourMinute(visitStartHour, visitStartMinute)}</Text>
            </TouchableOpacity>
            {showStartPicker && (
              <DateTimePicker
                value={hourToDate(visitStartHour, visitStartMinute)}
                mode="time"
                is24Hour
                display={Platform.OS === "ios" ? "spinner" : "clock"}
                onChange={(_, date) => {
                  setShowStartPicker(false);
                  if (date) {
                    setVisitStartHour(date.getHours());
                    setVisitStartMinute(date.getMinutes());
                  }
                }}
              />
            )}

            <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 16 }]}>Fin des visites</Text>
            <TouchableOpacity
              style={[styles.timeBtn, { backgroundColor: C.bg, borderColor: C.border }]}
              onPress={() => {
                if (Platform.OS === "android") {
                  openAndroidTimePicker(hourToDate(visitEndHour, visitEndMinute), (date) => {
                    setVisitEndHour(date.getHours());
                    setVisitEndMinute(date.getMinutes());
                  });
                } else {
                  setShowEndPicker(true);
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.timeBtnText, { color: C.text }]}>🕐 {formatHourMinute(visitEndHour, visitEndMinute)}</Text>
            </TouchableOpacity>
            {showEndPicker && (
              <DateTimePicker
                value={hourToDate(visitEndHour, visitEndMinute)}
                mode="time"
                is24Hour
                display={Platform.OS === "ios" ? "spinner" : "clock"}
                onChange={(_, date) => {
                  setShowEndPicker(false);
                  if (date) {
                    setVisitEndHour(date.getHours());
                    setVisitEndMinute(date.getMinutes());
                  }
                }}
              />
            )}
          </View>
        )}

        {step === "capacity" && (
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.cardDesc, { color: C.muted }]}>
              Réglable plus tard dans Paramètres si besoin.
            </Text>

            <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 4 }]}>👥 Visiteurs max par créneau</Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={[styles.stepBtn, { backgroundColor: C.bg, borderColor: C.border }]}
                onPress={() => setMaxVisitors((v) => Math.max(1, v - 1))}
              >
                <Text style={[styles.stepBtnText, { color: C.text }]}>−</Text>
              </TouchableOpacity>
              <Text style={[styles.stepValue, { color: C.text }]}>{maxVisitors}</Text>
              <TouchableOpacity
                style={[styles.stepBtn, { backgroundColor: C.bg, borderColor: C.border }]}
                onPress={() => setMaxVisitors((v) => Math.min(10, v + 1))}
              >
                <Text style={[styles.stepBtnText, { color: C.text }]}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.fieldDivider, { backgroundColor: C.border }]} />

            <Text style={[styles.fieldLabel, { color: C.gold }]}>⏱ Durée d'une visite</Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={[styles.stepBtn, { backgroundColor: C.bg, borderColor: C.border }]}
                onPress={() => setSlotDuration((d) => Math.max(5, d - 5))}
              >
                <Text style={[styles.stepBtnText, { color: C.text }]}>−</Text>
              </TouchableOpacity>
              <Text style={[styles.stepValue, { color: C.text }]}>
                {slotDuration < 60 ? `${slotDuration} min` : `${Math.floor(slotDuration / 60)}h${slotDuration % 60 ? slotDuration % 60 : ""}`}
              </Text>
              <TouchableOpacity
                style={[styles.stepBtn, { backgroundColor: C.bg, borderColor: C.border }]}
                onPress={() => setSlotDuration((d) => Math.min(240, d + 5))}
              >
                <Text style={[styles.stepBtnText, { color: C.text }]}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.fieldDivider, { backgroundColor: C.border }]} />

            <Text style={[styles.fieldLabel, { color: C.gold }]}>⏲ Pause entre deux visites</Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={[styles.stepBtn, { backgroundColor: C.bg, borderColor: C.border }]}
                onPress={() => setMinGap((g) => Math.max(0, g - 5))}
              >
                <Text style={[styles.stepBtnText, { color: C.text }]}>−</Text>
              </TouchableOpacity>
              <Text style={[styles.stepValue, { color: C.text }]}>{minGap} min</Text>
              <TouchableOpacity
                style={[styles.stepBtn, { backgroundColor: C.bg, borderColor: C.border }]}
                onPress={() => setMinGap((g) => Math.min(60, g + 5))}
              >
                <Text style={[styles.stepBtnText, { color: C.text }]}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.fieldDivider, { backgroundColor: C.border }]} />

            <Text style={[styles.fieldLabel, { color: C.gold }]}>📋 Consignes de visite (optionnel)</Text>
            <Text style={[styles.cardDesc, { color: C.muted, marginBottom: 0 }]}>
              Réglable plus tard dans Paramètres si besoin. N'indique pas d'informations médicales sensibles.
            </Text>
            <TextInput
              style={[styles.textarea, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
              placeholder="Ex : La chambre se trouve au 3ème étage, aile B…"
              placeholderTextColor={C.muted}
              value={visitRules}
              onChangeText={setVisitRules}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        )}

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
            onPress={step === "capacity" ? handleCreate : goNext}
            disabled={(step === "patient" && !canLeavePatientStep) || submitting}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitBtnText}>{step === "capacity" ? "Créer l'espace" : "Suivant →"}</Text>
            }
          </TouchableOpacity>
        </View>

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
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 26, marginBottom: 8 },
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
  textarea: {
    borderWidth: 1, borderRadius: 10, padding: 13, minHeight: 90,
    fontFamily: "DM_Sans_400Regular", fontSize: 14, lineHeight: 20,
  },
  fieldLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  careTrack: {
    width: "100%", height: 52,
    borderWidth: 1, borderRadius: 26, overflow: "hidden", position: "relative",
  },
  careThumb: { position: "absolute", top: 0, bottom: 0, left: 0, borderRadius: 26 },
  careOptionHalf: { position: "absolute", top: 0, bottom: 0, justifyContent: "center", paddingHorizontal: 12 },
  careOptionText: { fontFamily: "DM_Sans_700Bold", fontSize: 13 },
  timeBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  timeBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 16 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepBtn: { width: 36, height: 36, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  stepBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 18 },
  stepValue: { fontFamily: "DM_Sans_700Bold", fontSize: 16, minWidth: 64, textAlign: "center" },
  fieldDivider: { height: 1, marginVertical: 4 },
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
