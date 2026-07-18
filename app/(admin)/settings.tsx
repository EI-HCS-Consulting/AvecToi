import { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Alert, ActivityIndicator, Image, TextInput, Switch,
  Linking, Modal, KeyboardAvoidingView, Platform, Dimensions,
  PanResponder, Animated,
} from "react-native";

// Percentages ("85%") on the sheet don't resolve reliably since its parent
// TouchableOpacity has no defined height (hugs content) — use a pixel value
// so the ScrollView actually gets a bounded viewport to scroll within.
const SHEET_MAX_HEIGHT = Dimensions.get("window").height * 0.85;
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { File } from "expo-file-system";
import { supabase } from "@/lib/supabase";
import { useSpace } from "@/lib/SpaceContext";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import PatientAvatar from "@/components/PatientAvatar";
import VisitorsBlock from "@/components/VisitorsBlock";
import IntervenantsBlock from "@/components/IntervenantsBlock";
import { resolvePlaceFromMapsUrl } from "@/lib/address";
import { generateSlots, formatHourMinute } from "@/lib/slotUtils";
import { updateLinkedCalendarEvent } from "@/lib/calendarSync";
import type { Theme } from "@/lib/themes";
import type { NewsEntry, Task, SupportMessage, SlotConfig, ReservationChangeHistoryEntry, Reservation } from "@/lib/types";
import { openAndroidTimePicker, openAndroidDatePicker } from "@/lib/androidTimePicker";

// Résultat de la RPC apply_slot_rule_change (voir migration
// 20260711_apply_slot_rule_change.sql) — ids des réservations recasées/
// annulées par le changement de règles qui vient d'être validé.
interface RuleChangeResult {
  rebooked: string[];
  night_cancelled: string[];
  failed: string[];
  day_cap_suspended: string[];
}

// ─── Historique des champs hospitaliers ───────────────────────────────────────
interface FieldHistoryEntry {
  id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
}

// ─── Chronologie (popup frise) ─────────────────────────────────────────────
type ChronoEventKind = "hosp" | "regles" | "consignes" | "resa" | "hospitalisation" | "sortie" | "besoin";
interface ChronoEvent {
  id: string;
  kind: ChronoEventKind;
  date: Date;
  icon: string;
  title: string;
  detail?: string;
}
const CHRONO_KIND_COLOR: Record<ChronoEventKind, keyof Theme> = {
  hosp: "accent",
  regles: "gold",
  consignes: "accent",
  resa: "success",
  hospitalisation: "danger",
  sortie: "success",
  besoin: "orange",
};

// Libellés des catégories de besoins réaffichés dans la frise Chronologie
// (les icônes réutilisent TASK_CAT_ICONS, déjà défini plus bas pour le bloc
// Historique / Publications).
const TASK_CAT_LABELS: Record<Task["category"], string> = {
  repas: "Repas", affaires: "Affaires", courses: "Courses", transport: "Transport", administratif: "Administratif", autre: "Autre",
};
const TASK_STATUS_LABELS: Record<Task["status"], string> = {
  ouvert: "Ouvert", pris_en_charge: "Pris en charge", fait: "Terminé", ferme: "Clôturé",
};

const BLOOD_GROUPS = [["A+", "A-"], ["B+", "B-"], ["AB+", "AB-"], ["O+", "O-"]];

const COMMON_ALLERGIES = [
  "Arachides", "Fruits à coque", "Gluten", "Lactose",
  "Œufs", "Poisson", "Crustacés", "Soja",
];

const BIRTH_MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
// Roue jour/mois/année native (calendar ET spinner) peu fiable selon la
// version/le fabricant Android : reset au 1er janvier lors d'un changement
// d'année, année bloquée à partir de 1970 sur certains launchers. Patientèle
// visée souvent née avant 1970 → sélecteur maison (3 listes indépendantes),
// aucune dépendance au widget natif.
const BIRTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const BIRTH_YEARS = Array.from({ length: new Date().getFullYear() - 1900 + 1 }, (_, i) => new Date().getFullYear() - i);

const FIELD_LABELS: Record<string, string> = {
  hospital_room: "Chambre",
  hospital_service: "Service",
  hospital_sector: "Secteur",
  visit_rules: "Consignes de visite",
  home_care_mode: "Mode de soin",
  home_address: "Adresse du domicile",
  home_maps_url: "Lien Google Maps (domicile)",
  visit_start_hour: "Heure de début des visites",
  visit_end_hour: "Heure de fin des visites",
  slot_duration_minutes: "Durée d'une visite",
  min_gap_minutes: "Intervalle entre créneaux",
  gap_includes_duration: "Intervalle inclut la durée",
  max_visitors_per_slot: "Visiteurs max par créneau",
  allowed_weekdays: "Jours de visite autorisés",
  blocked_dates: "Dates sans visites",
  night_enabled: "Nuitées",
  night_start_hour: "Heure de début des nuitées",
  night_end_hour: "Heure de fin des nuitées",
  intervenants_enabled: "Planning des intervenants",
};
const FIELD_ICONS: Record<string, string> = {
  hospital_room: "🛏️",
  hospital_service: "🏥",
  hospital_sector: "📍",
  visit_rules: "📝",
  home_care_mode: "🔄",
  home_address: "📍",
  home_maps_url: "🗺️",
  visit_start_hour: "⏰",
  visit_end_hour: "⏰",
  slot_duration_minutes: "⏱",
  min_gap_minutes: "⏲",
  gap_includes_duration: "⏲",
  max_visitors_per_slot: "👥",
  allowed_weekdays: "📅",
  blocked_dates: "🚫",
  night_enabled: "🌙",
  night_start_hour: "🌙",
  night_end_hour: "🌙",
  intervenants_enabled: "🩺",
};

// Champs journalisés dans space_field_history qui appartiennent à la
// section "Règles de visite" (par opposition aux champs hospitaliers ci-dessus).
const VISIT_RULE_FIELD_NAMES = new Set([
  "visit_start_hour", "visit_end_hour", "slot_duration_minutes", "min_gap_minutes",
  "gap_includes_duration", "max_visitors_per_slot", "allowed_weekdays", "blocked_dates",
  "night_enabled", "night_start_hour", "night_end_hour", "intervenants_enabled",
]);

const WEEKDAY_HISTORY_LABELS: Record<number, string> = {
  0: "Dim", 1: "Lun", 2: "Mar", 3: "Mer", 4: "Jeu", 5: "Ven", 6: "Sam",
};

function formatWeekdaysList(days: number[]) {
  if (!days.length) return "Aucun";
  return [...days]
    .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
    .map((d) => WEEKDAY_HISTORY_LABELS[d])
    .join(", ");
}

function formatBlockedDatesList(dates: string[]) {
  if (!dates.length) return "Aucune";
  return [...dates]
    .sort()
    .map((iso) => new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" }))
    .join(", ");
}

const TASK_CAT_ICONS: Record<Task["category"], string> = {
  repas: "🍽️",
  affaires: "👕",
  courses: "🛒",
  transport: "🚗",
  administratif: "🗂️",
  autre: "💡",
};

// ─── Barre de navigation des réglages (remplace la grille de tuiles) ─────────
type SectionKey = "coord" | "hosp" | "regles" | "hist";

const SECTION_META: Record<SectionKey, { icon: string; label: string; hint: string }> = {
  coord: { icon: "📍", label: "Coordonnées", hint: "Mode de soin, adresse, lien Maps" },
  hosp: { icon: "🏥", label: "Infos hospitalières", hint: "Chambre, service, secteur, consignes" },
  regles: { icon: "⏰", label: "Règles de visite", hint: "Horaires, durée, jours, nuitées" },
  hist: { icon: "🕐", label: "Historique", hint: "Modifications passées, conservation des données" },
};

const SETTINGS_NAV_ORDER: SectionKey[] = ["coord", "hosp", "regles", "hist"];
const SETTINGS_NAV_LABELS: Record<SectionKey, string> = {
  coord: "Lieux",
  hosp: "Infos",
  regles: "Règles",
  hist: "Histo",
};
const SETTINGS_NAV_BAR_HEIGHT = 60;

// ─── Sélecteur d'heure "horloge Android" (@react-native-community/datetimepicker) ──
function hourToDate(hour: number, minute = 0) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}
function hmToMinutes(h: number, m: number) {
  return h * 60 + m;
}
function minutesToHM(total: number): [number, number] {
  const wrapped = ((total % 1440) + 1440) % 1440;
  return [Math.floor(wrapped / 60), wrapped % 60];
}
function formatDuration(totalMinutes: number) {
  return totalMinutes < 60
    ? `${totalMinutes} min`
    : `${Math.floor(totalMinutes / 60)}h${totalMinutes % 60 ? totalMinutes % 60 : ""}`;
}

// ─── Curseur "barre de minutes" (intervalle entre créneaux) ──────────────────
const SLIDER_TRACK_H = 44;
const SLIDER_BAR_H = 8;
const SLIDER_THUMB_D = 26;
const SLIDER_GLOW_D = 40;

function MinuteSlider({ value, onChange, min, max, step, C }: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  C: Theme;
}) {
  const trackWidthRef = useRef(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStartFrac = useRef(0);
  const thumbScale = useRef(new Animated.Value(1)).current;

  const clampVal = (v: number) => Math.min(max, Math.max(min, v));
  const fracFromValue = (v: number) => (max === min ? 0 : (clampVal(v) - min) / (max - min));
  const valueFromFrac = (f: number) => clampVal(Math.round((min + f * (max - min)) / step) * step);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const w = trackWidthRef.current;
        if (w <= 0) return;
        setDragging(true);
        Animated.spring(thumbScale, { toValue: 1.25, friction: 5, useNativeDriver: true }).start();
        const frac = Math.min(1, Math.max(0, evt.nativeEvent.locationX / w));
        dragStartFrac.current = frac;
        onChange(valueFromFrac(frac));
      },
      onPanResponderMove: (_, g) => {
        const w = trackWidthRef.current;
        if (w <= 0) return;
        const frac = Math.min(1, Math.max(0, dragStartFrac.current + g.dx / w));
        onChange(valueFromFrac(frac));
      },
      onPanResponderRelease: () => {
        setDragging(false);
        Animated.spring(thumbScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => {
        setDragging(false);
        Animated.spring(thumbScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
      },
    })
  ).current;

  const frac = fracFromValue(value);

  return (
    <View
      style={sliderStyles.track}
      onLayout={(e) => {
        trackWidthRef.current = e.nativeEvent.layout.width;
        setTrackWidth(e.nativeEvent.layout.width);
      }}
      {...panResponder.panHandlers}
    >
      <View style={[sliderStyles.trackBase, { backgroundColor: C.border }]} />
      <View style={[sliderStyles.trackFill, { backgroundColor: C.accent, width: `${frac * 100}%` }]} />
      {trackWidth > 0 && (
        <>
          <Animated.View
            pointerEvents="none"
            style={[
              sliderStyles.thumbGlow,
              {
                backgroundColor: dragging ? `${C.gold}40` : `${C.gold}22`,
                left: frac * trackWidth - SLIDER_GLOW_D / 2,
                transform: [{ scale: thumbScale }],
              },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              sliderStyles.thumb,
              {
                backgroundColor: C.gold,
                borderColor: dragging ? C.accent : C.card,
                left: frac * trackWidth - SLIDER_THUMB_D / 2,
                transform: [{ scale: thumbScale }],
              },
            ]}
          />
        </>
      )}
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  track: { height: SLIDER_TRACK_H, justifyContent: "center" },
  trackBase: {
    position: "absolute", left: 0, right: 0, height: SLIDER_BAR_H,
    borderRadius: SLIDER_BAR_H / 2, top: (SLIDER_TRACK_H - SLIDER_BAR_H) / 2,
  },
  trackFill: {
    position: "absolute", left: 0, height: SLIDER_BAR_H,
    borderRadius: SLIDER_BAR_H / 2, top: (SLIDER_TRACK_H - SLIDER_BAR_H) / 2,
  },
  thumbGlow: {
    position: "absolute", width: SLIDER_GLOW_D, height: SLIDER_GLOW_D,
    borderRadius: SLIDER_GLOW_D / 2, top: (SLIDER_TRACK_H - SLIDER_GLOW_D) / 2,
  },
  thumb: {
    position: "absolute", width: SLIDER_THUMB_D, height: SLIDER_THUMB_D,
    borderRadius: SLIDER_THUMB_D / 2, top: (SLIDER_TRACK_H - SLIDER_THUMB_D) / 2,
    borderWidth: 2.5,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.35, shadowRadius: 3,
    elevation: 4,
  },
});

export default function SettingsScreen() {
  const router = useRouter();
  const { space, slotConfig, loading, hasSpace, refreshSlotConfig, refreshSpace } = useSpace();
  const { theme: C } = useDisplayMode();

  const [photoUploading, setPhotoUploading] = useState(false);
  // undefined = use space value; null = cleared locally; string = new URL (immediate preview before Realtime)
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null | undefined>(undefined);
  const displayPhotoUrl = localPhotoUrl !== undefined ? localPhotoUrl : (space?.patient_photo_url ?? null);
  const [prolonging, setProlonging] = useState(false);
  const [toast, setToast] = useState("");

  // Section active de la barre de navigation des réglages — la roue ⚙️ n'est
  // plus cliquable (simple en-tête de rubrique), donc on ouvre toujours sur
  // le premier onglet ("Lieux") plutôt que sur un état "aucune section".
  const [activeSection, setActiveSection] = useState<SectionKey | null>("coord");

  // Admin notes
  const notesInit = useRef(false);
  const [visitRules, setVisitRules] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  useEffect(() => {
    if (space && !notesInit.current) {
      notesInit.current = true;
      setVisitRules(space.visit_rules ?? "");
    }
  }, [space]);

  // Fiche patient (naissance / sexe / groupe sanguin / allergies)
  const patientMedicalInit = useRef(false);
  const [patientMotto, setPatientMotto] = useState("");
  const [patientAdmissionDate, setPatientAdmissionDate] = useState<string | null>(null);
  const [showAdmissionDatePicker, setShowAdmissionDatePicker] = useState(false);
  const [patientDischargeDate, setPatientDischargeDate] = useState<string | null>(null);
  const [showDischargeDatePicker, setShowDischargeDatePicker] = useState(false);
  const [patientBirthdate, setPatientBirthdate] = useState<string | null>(null);
  const [patientSex, setPatientSex] = useState<"M" | "F" | null>(null);
  const [patientBloodType, setPatientBloodType] = useState<string | null>(null);
  // Allergies : cases à cocher pour les plus fréquentes + "Autre" en texte
  // libre. Persistées ensemble comme une simple liste texte séparée par
  // virgules (colonne patient_allergies inchangée) — au chargement, les
  // segments reconnus cochent leur case, le reste atterrit dans "Autre".
  const [allergyChecks, setAllergyChecks] = useState<Set<string>>(new Set());
  const [allergyOtherChecked, setAllergyOtherChecked] = useState(false);
  const [allergyOtherText, setAllergyOtherText] = useState("");
  const [bdPickerField, setBdPickerField] = useState<"day" | "month" | "year" | null>(null);
  const [patientMedicalSaving, setPatientMedicalSaving] = useState(false);
  useEffect(() => {
    if (space && !patientMedicalInit.current) {
      patientMedicalInit.current = true;
      setPatientMotto(space.patient_motto ?? "");
      setPatientAdmissionDate(space.patient_admission_date ?? null);
      setPatientDischargeDate(space.patient_discharge_date ?? null);
      setPatientBirthdate(space.patient_birthdate ?? null);
      setPatientSex(space.patient_sex ?? null);
      setPatientBloodType(space.patient_blood_type ?? null);

      const parts = (space.patient_allergies ?? "").split(",").map((p) => p.trim()).filter(Boolean);
      const checks = new Set<string>();
      const rest: string[] = [];
      for (const p of parts) {
        const match = COMMON_ALLERGIES.find((a) => a.toLowerCase() === p.toLowerCase());
        if (match) checks.add(match); else rest.push(p);
      }
      setAllergyChecks(checks);
      setAllergyOtherChecked(rest.length > 0);
      setAllergyOtherText(rest.join(", "));
    }
  }, [space]);

  function toggleAllergyCheck(item: string) {
    setAllergyChecks((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item); else next.add(item);
      return next;
    });
  }

  const bdParts = patientBirthdate ? patientBirthdate.split("-").map(Number) : null;
  const bdYear = bdParts ? bdParts[0] : null;
  const bdMonth = bdParts ? bdParts[1] : null;
  const bdDay = bdParts ? bdParts[2] : null;

  function updateBirthdatePart(part: "day" | "month" | "year", value: number) {
    const now = new Date();
    const [y, m, d] = bdParts ?? [now.getFullYear() - 50, now.getMonth() + 1, now.getDate()];
    const next = { y, m, d };
    if (part === "year") next.y = value;
    if (part === "month") next.m = value;
    if (part === "day") next.d = value;
    const daysInMonth = new Date(next.y, next.m, 0).getDate();
    if (next.d > daysInMonth) next.d = daysInMonth;
    setPatientBirthdate(`${next.y}-${String(next.m).padStart(2, "0")}-${String(next.d).padStart(2, "0")}`);
    setBdPickerField(null);
  }

  function isoDate(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  const admissionDateValue = patientAdmissionDate ? new Date(patientAdmissionDate + "T00:00:00") : new Date();
  const admissionDateLabel = patientAdmissionDate
    ? new Date(patientAdmissionDate + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;

  function openAdmissionDatePicker() {
    if (Platform.OS === "android") {
      openAndroidDatePicker(admissionDateValue, (date) => setPatientAdmissionDate(isoDate(date)), new Date());
    } else {
      setShowAdmissionDatePicker(true);
    }
  }

  const dischargeDateValue = patientDischargeDate ? new Date(patientDischargeDate + "T00:00:00") : new Date();
  const dischargeDateLabel = patientDischargeDate
    ? new Date(patientDischargeDate + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;

  function openDischargeDatePicker() {
    if (Platform.OS === "android") {
      openAndroidDatePicker(dischargeDateValue, (date) => setPatientDischargeDate(isoDate(date)), new Date());
    } else {
      setShowDischargeDatePicker(true);
    }
  }

  async function handleSavePatientMedical() {
    if (!space) return;
    setPatientMedicalSaving(true);
    const parts = COMMON_ALLERGIES.filter((a) => allergyChecks.has(a));
    if (allergyOtherChecked && allergyOtherText.trim()) parts.push(allergyOtherText.trim());
    const { error } = await supabase
      .from("patient_spaces")
      .update({
        patient_motto: patientMotto.trim() || null,
        patient_admission_date: patientAdmissionDate,
        patient_discharge_date: patientDischargeDate,
        patient_birthdate: patientBirthdate,
        patient_sex: patientSex,
        patient_blood_type: patientBloodType,
        patient_allergies: parts.length ? parts.join(", ") : null,
      })
      .eq("id", space.id);
    setPatientMedicalSaving(false);
    if (error) showToast("Erreur lors de la sauvegarde.");
    else {
      await refreshSpace();
      showToast("Fiche patient enregistrée ✓");
    }
  }

  // Infos hospitalières (room / service / secteur)
  const hospitalInfosInit = useRef(false);
  const [room, setRoom] = useState("");
  const [service, setService] = useState("");
  const [sector, setSector] = useState("");
  const [hospitalInfosSaving, setHospitalInfosSaving] = useState(false);
  useEffect(() => {
    if (space && !hospitalInfosInit.current) {
      hospitalInfosInit.current = true;
      setRoom(space.hospital_room ?? "");
      setService(space.hospital_service ?? "");
      setSector(space.hospital_sector ?? "");
    }
  }, [space]);

  // Coordonnées de l'hôpital (name / address / lien Maps collé manuellement par l'admin)
  const hospitalCoordsInit = useRef(false);
  const [hospitalName, setHospitalName] = useState("");
  const [hospitalAddress, setHospitalAddress] = useState("");
  const [hospitalAddressLine2, setHospitalAddressLine2] = useState("");
  const [hospitalPostalCode, setHospitalPostalCode] = useState("");
  const [hospitalCity, setHospitalCity] = useState("");
  const [hospitalCountry, setHospitalCountry] = useState("");
  const [hospitalMapsUrl, setHospitalMapsUrl] = useState("");
  const [hospitalNameResolving, setHospitalNameResolving] = useState(false);
  useEffect(() => {
    if (space && !hospitalCoordsInit.current) {
      hospitalCoordsInit.current = true;
      setHospitalName(space.hospital_name ?? "");
      setHospitalAddress(space.hospital_address ?? "");
      setHospitalAddressLine2(space.hospital_address_line2 ?? "");
      setHospitalPostalCode(space.hospital_postal_code ?? "");
      setHospitalCity(space.hospital_city ?? "");
      setHospitalCountry(space.hospital_country ?? "");
      setHospitalMapsUrl(space.hospital_maps_url ?? "");
    }
  }, [space]);

  // Coordonnées du domicile (mode "Soin à domicile")
  const homeCoordsInit = useRef(false);
  const [homeAddress, setHomeAddress] = useState("");
  const [homeAddressLine2, setHomeAddressLine2] = useState("");
  const [homePostalCode, setHomePostalCode] = useState("");
  const [homeCity, setHomeCity] = useState("");
  const [homeCountry, setHomeCountry] = useState("");
  const [homeMapsUrl, setHomeMapsUrl] = useState("");
  const [homeAddressResolving, setHomeAddressResolving] = useState(false);
  useEffect(() => {
    if (space && !homeCoordsInit.current) {
      homeCoordsInit.current = true;
      setHomeAddress(space.home_address ?? "");
      setHomeAddressLine2(space.home_address_line2 ?? "");
      setHomePostalCode(space.home_postal_code ?? "");
      setHomeCity(space.home_city ?? "");
      setHomeCountry(space.home_country ?? "");
      setHomeMapsUrl(space.home_maps_url ?? "");
    }
  }, [space]);

  // "Secteur" (Infos hospitalières) et "Complément d'adresse" (Coordonnées,
  // mode hôpital) désignent en pratique la même information pour les
  // admins — pour éviter la saisie en double (et les valeurs contradictoires
  // entre les deux écrans), on les synchronise en temps réel. Uniquement en
  // mode hôpital : pas de champ "Secteur" en soin à domicile.
  function setHospitalSectorSynced(value: string) {
    setSector(value);
    setHospitalAddressLine2(value);
  }

  // Modal profil patient (photo + changement de nom + thème)
  const [editProfileModal, setEditProfileModal] = useState(false);

  // Modal suppression photo patient — bottom-sheet plutôt qu'Alert native,
  // pour rester cohérent avec le reste des popups de cet écran.
  const [removePhotoModal, setRemovePhotoModal] = useState(false);

  // Modal changement de nom
  const [nameChangeModal, setNameChangeModal] = useState(false);
  const [nameChangeFirstname, setNameChangeFirstname] = useState("");
  const [nameChangeLastname, setNameChangeLastname] = useState("");
  const [nameChangeReason, setNameChangeReason] = useState("");

  // Historique des champs hospitaliers
  const [fieldHistory, setFieldHistory] = useState<FieldHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Historique (infos hospitalières + règles de visite + consignes + publications) — affiché en tuile
  const [historySearch, setHistorySearch] = useState("");
  const [pubLoading, setPubLoading] = useState(false);
  const [pubNews, setPubNews] = useState<NewsEntry[]>([]);
  const [pubTasks, setPubTasks] = useState<Task[]>([]);
  const [pubMessages, setPubMessages] = useState<SupportMessage[]>([]);
  const [reservationChangeHistory, setReservationChangeHistory] = useState<ReservationChangeHistoryEntry[]>([]);
  const [resaHistoryLoading, setResaHistoryLoading] = useState(false);

  // Sous-rubriques de l'historique en accordéon (repliées par défaut — trop
  // long à scroller sinon une fois l'espace utilisé depuis un moment).
  const [historyBlocksOpen, setHistoryBlocksOpen] = useState({
    hosp: false, regles: false, consignes: false, resa: false, pub: false,
  });
  function toggleHistoryBlock(key: keyof typeof historyBlocksOpen) {
    setHistoryBlocksOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // Chronologie — popup frise verticale (infos hospitalières + consignes +
  // règles de visite + visites/nuitées réservées). Réutilise fieldHistory
  // (chargé par loadHistory) et charge les réservations à part, ce bloc
  // pouvant être ouvert sans être jamais passé par la section "Historique".
  const [chronoModal, setChronoModal] = useState(false);
  const [chronoLoading, setChronoLoading] = useState(false);
  const [chronoReservations, setChronoReservations] = useState<Reservation[]>([]);
  const [chronoTasks, setChronoTasks] = useState<Task[]>([]);

  async function openChronoModal() {
    setChronoModal(true);
    setChronoLoading(true);
    const [, resaData, tasksData] = await Promise.all([
      loadHistory(),
      supabase.from("reservations").select("*").eq("space_id", space!.id).order("date", { ascending: false }),
      supabase.from("tasks").select("*").eq("space_id", space!.id).neq("category", "transport").order("created_at", { ascending: false }),
    ]);
    setChronoReservations(resaData.data || []);
    setChronoTasks(tasksData.data || []);
    setChronoLoading(false);
  }

  // Soin à domicile toggle
  const [homeCareToggling, setHomeCareToggling] = useState(false);
  const [homeCareDraft, setHomeCareDraft] = useState(false);
  useEffect(() => {
    if (space) setHomeCareDraft(space.home_care_mode);
  }, [space?.home_care_mode]);
  const [homeCareTrackWidth, setHomeCareTrackWidth] = useState(0);
  const homeCareTrackWidthRef = useRef(0);
  const homeCareDraftRef = useRef(homeCareDraft);
  useEffect(() => { homeCareDraftRef.current = homeCareDraft; }, [homeCareDraft]);
  const homeCareTogglingRef = useRef(homeCareToggling);
  useEffect(() => { homeCareTogglingRef.current = homeCareToggling; }, [homeCareToggling]);
  const homeCareThumbX = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(homeCareThumbX, { toValue: homeCareDraft ? 1 : 0, useNativeDriver: true, friction: 8 }).start();
  }, [homeCareDraft]);
  const [homeCareLeftLabelWidth, setHomeCareLeftLabelWidth] = useState(0);
  const [homeCareRightLabelWidth, setHomeCareRightLabelWidth] = useState(0);
  const [homeCareDescHeightHospital, setHomeCareDescHeightHospital] = useState(0);
  const [homeCareDescHeightHome, setHomeCareDescHeightHome] = useState(0);
  const homeCareDragStart = useRef(0);
  const homeCarePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !homeCareTogglingRef.current,
      onMoveShouldSetPanResponder: () => !homeCareTogglingRef.current,
      onPanResponderGrant: (evt) => {
        const w = homeCareTrackWidthRef.current;
        if (w <= 0) return;
        const frac = Math.min(1, Math.max(0, evt.nativeEvent.locationX / w));
        homeCareDragStart.current = frac;
        homeCareThumbX.setValue(frac);
      },
      onPanResponderMove: (_, g) => {
        const w = homeCareTrackWidthRef.current;
        if (w <= 0) return;
        const frac = Math.min(1, Math.max(0, homeCareDragStart.current + g.dx / w));
        homeCareThumbX.setValue(frac);
      },
      onPanResponderRelease: (_, g) => {
        const w = homeCareTrackWidthRef.current;
        if (w <= 0) return;
        const frac = Math.min(1, Math.max(0, homeCareDragStart.current + g.dx / w));
        const next = frac >= 0.5;
        Animated.spring(homeCareThumbX, { toValue: next ? 1 : 0, useNativeDriver: true, friction: 8 }).start();
        setHomeCareDraft(next);
      },
      onPanResponderTerminate: () => {
        Animated.spring(homeCareThumbX, { toValue: homeCareDraftRef.current ? 1 : 0, useNativeDriver: true, friction: 8 }).start();
      },
    })
  ).current;

  // Nuitées toggle + heures
  const [nightToggling, setNightToggling] = useState(false);
  const [intervenantsToggling, setIntervenantsToggling] = useState(false);
  const [oneVisitPerDayToggling, setOneVisitPerDayToggling] = useState(false);
  const nightHoursInit = useRef(false);
  const [nightStartHour, setNightStartHour] = useState(19);
  const [nightStartMinute, setNightStartMinute] = useState(0);
  const [nightEndHour, setNightEndHour] = useState(8);
  const [nightEndMinute, setNightEndMinute] = useState(0);
  const [nightHoursSaving, setNightHoursSaving] = useState(false);
  useEffect(() => {
    if (slotConfig && !nightHoursInit.current) {
      nightHoursInit.current = true;
      setNightStartHour(slotConfig.night_start_hour ?? 19);
      setNightStartMinute(slotConfig.night_start_minute ?? 0);
      setNightEndHour(slotConfig.night_end_hour ?? 8);
      setNightEndMinute(slotConfig.night_end_minute ?? 0);
    }
  }, [slotConfig]);

  // Règles des créneaux
  const slotRulesInit = useRef(false);
  const [visitStartHour, setVisitStartHour] = useState(9);
  const [visitStartMinute, setVisitStartMinute] = useState(0);
  const [visitEndHour, setVisitEndHour] = useState(20);
  const [visitEndMinute, setVisitEndMinute] = useState(0);
  const [slotDuration, setSlotDuration] = useState(60);
  const [slotGap, setSlotGap] = useState(5);
  const [gapIncludesDuration, setGapIncludesDuration] = useState(false);
  const [maxVisitors, setMaxVisitors] = useState(2);
  const [oneVisitPerDay, setOneVisitPerDay] = useState(false);
  // Pickers "horloge Android" (visibilité des popovers natifs)
  const [showVisitStartPicker, setShowVisitStartPicker] = useState(false);
  const [showVisitEndPicker, setShowVisitEndPicker] = useState(false);
  const [showNightStartPicker, setShowNightStartPicker] = useState(false);
  const [showNightEndPicker, setShowNightEndPicker] = useState(false);
  const [allowedWeekdays, setAllowedWeekdays] = useState<number[]>([0,1,2,3,4,5,6]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [blockedDateReasons, setBlockedDateReasons] = useState<Record<string, string>>({});
  const [blockPickerReason, setBlockPickerReason] = useState("");
  const [lastAddedBlockedDate, setLastAddedBlockedDate] = useState<string | null>(null);
  const [slotRulesSaving, setSlotRulesSaving] = useState(false);
  useEffect(() => {
    if (slotConfig && !slotRulesInit.current) {
      slotRulesInit.current = true;
      setVisitStartHour(slotConfig.visit_start_hour);
      setVisitStartMinute(slotConfig.visit_start_minute ?? 0);
      setVisitEndHour(slotConfig.visit_end_hour);
      setVisitEndMinute(slotConfig.visit_end_minute ?? 0);
      setSlotDuration(slotConfig.slot_duration_minutes);
      setSlotGap(Math.max(5, slotConfig.min_gap_minutes || 0));
      setGapIncludesDuration(slotConfig.gap_includes_duration ?? false);
      setMaxVisitors(slotConfig.max_visitors_per_slot);
      setOneVisitPerDay(slotConfig.one_visit_per_day ?? false);
      setAllowedWeekdays(slotConfig.allowed_weekdays ?? [0,1,2,3,4,5,6]);
      setBlockedDates(slotConfig.blocked_dates ?? []);
      setBlockedDateReasons(slotConfig.blocked_date_reasons ?? {});
    }
  }, [slotConfig]);

  // Modal calendrier pour ajouter une date bloquée
  const [blockPickerVisible, setBlockPickerVisible] = useState(false);
  const [blockPickerDate, setBlockPickerDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d;
  });

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  // ── Historique ─────────────────────────────────────────────────────────────
  async function loadHistory() {
    if (!space) return;
    setHistoryLoading(true);
    const { data } = await supabase
      .from("space_field_history")
      .select("*")
      .eq("space_id", space.id)
      .order("changed_at", { ascending: false })
      .limit(50);
    setFieldHistory(data || []);
    setHistoryLoading(false);
  }

  async function loadPublicationsHistory() {
    if (!space) return;
    setPubLoading(true);
    const [newsData, tasksData, msgsData] = await Promise.all([
      supabase.from("news_entries").select("*").eq("space_id", space.id).order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").eq("space_id", space.id).order("created_at", { ascending: false }),
      supabase.from("support_messages").select("*").eq("space_id", space.id).order("created_at", { ascending: false }),
    ]);
    setPubNews(newsData.data || []);
    setPubTasks(tasksData.data || []);
    setPubMessages(msgsData.data || []);
    setPubLoading(false);
  }

  async function loadReservationChangeHistory() {
    if (!space) return;
    setResaHistoryLoading(true);
    const { data } = await supabase
      .from("reservation_change_history")
      .select("*")
      .eq("space_id", space.id)
      .order("changed_at", { ascending: false })
      .limit(50);
    setReservationChangeHistory(data || []);
    setResaHistoryLoading(false);
  }

  function openSection(key: SectionKey) {
    if (key === "hist") {
      setHistorySearch("");
      loadHistory();
      loadPublicationsHistory();
      loadReservationChangeHistory();
    }
    setActiveSection(key);
  }

  function matchesHistoryQuery(...values: (string | null | undefined)[]): boolean {
    const q = historySearch.trim().toLowerCase();
    if (!q) return true;
    return values.some((v) => (v ?? "").toLowerCase().includes(q));
  }

  const hospitalFieldHistory = fieldHistory.filter((h) =>
    h.field_name !== "visit_rules" && !VISIT_RULE_FIELD_NAMES.has(h.field_name)
    && matchesHistoryQuery(FIELD_LABELS[h.field_name] ?? h.field_name, h.old_value, h.new_value)
  );
  const slotRuleFieldHistory = fieldHistory.filter((h) =>
    VISIT_RULE_FIELD_NAMES.has(h.field_name) && matchesHistoryQuery(FIELD_LABELS[h.field_name] ?? h.field_name, h.old_value, h.new_value)
  );
  const visitRulesHistory = fieldHistory.filter((h) =>
    h.field_name === "visit_rules" && matchesHistoryQuery(h.old_value, h.new_value)
  );
  const filteredReservationChangeHistory = reservationChangeHistory.filter((h) =>
    matchesHistoryQuery(h.prenom, h.nom, h.message)
  );
  const filteredPubNews = pubNews.filter((n) => matchesHistoryQuery(n.content, n.author_prenom, n.author_nom));
  const filteredPubTasks = pubTasks.filter((t) => matchesHistoryQuery(t.title, t.description, t.category));
  const filteredPubMessages = pubMessages.filter((m) => matchesHistoryQuery(m.message, m.author_prenom, m.author_nom));

  // Frise "Chronologie" — combine infos hospitalières + consignes + règles de
  // visite (fieldHistory, chargé par loadHistory), visites/nuitées réservées
  // et besoins publiés hors Transport (chronoReservations/chronoTasks,
  // chargés par openChronoModal), plus des repères fixes sur les dates
  // d'hospitalisation et de sortie. Tri du plus récent (haut) au plus ancien
  // (bas) — voir styles.chronoList pour le rendu inversé qui place la date
  // d'hospitalisation en bas de la frise.
  const chronoEvents: ChronoEvent[] = [
    ...fieldHistory.map((h): ChronoEvent => {
      if (h.field_name === "visit_rules") {
        return {
          id: `fh-${h.id}`, kind: "consignes", date: new Date(h.changed_at),
          icon: "📝", title: "Consignes de visite modifiées",
          detail: h.new_value ? `→ "${h.new_value}"` : "→ (vide)",
        };
      }
      const isRegle = VISIT_RULE_FIELD_NAMES.has(h.field_name);
      return {
        id: `fh-${h.id}`, kind: isRegle ? "regles" : "hosp", date: new Date(h.changed_at),
        icon: FIELD_ICONS[h.field_name] ?? "✏️",
        title: FIELD_LABELS[h.field_name] ?? h.field_name,
        detail: h.new_value ? `→ ${h.new_value}` : "→ (vide)",
      };
    }),
    ...chronoReservations.map((r): ChronoEvent => ({
      id: `resa-${r.id}`, kind: "resa", date: new Date(r.date + "T12:00:00"),
      icon: r.type === "Nuit" ? "🌙" : "☀️",
      title: `${r.prenom} ${r.nom}`,
      detail: `${r.type === "Nuit" ? "Nuitée" : "Visite"} · ${r.creneau}`,
    })),
    ...chronoTasks.map((t): ChronoEvent => ({
      id: `task-${t.id}`, kind: "besoin", date: new Date(t.created_at),
      icon: TASK_CAT_ICONS[t.category],
      title: t.title,
      detail: `${TASK_CAT_LABELS[t.category]} · ${TASK_STATUS_LABELS[t.status]}`,
    })),
    ...(space?.patient_admission_date ? [{
      id: "hospitalisation",
      kind: "hospitalisation" as const,
      date: new Date(space.patient_admission_date + "T00:00:00"),
      icon: "🏥",
      title: space.home_care_mode ? "Début du soin à domicile" : "Hospitalisation",
    }] : []),
    ...(space?.patient_discharge_date ? [{
      id: "sortie",
      kind: "sortie" as const,
      date: new Date(space.patient_discharge_date + "T00:00:00"),
      icon: "🚪",
      title: space.home_care_mode ? "Fin du soin à domicile" : "Sortie d'hospitalisation",
    }] : []),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  useEffect(() => { if (space) loadHistory(); }, [space?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function logFieldChange(fieldName: string, oldValue: string | null | undefined, newValue: string | null) {
    const old = oldValue?.trim() || null;
    const next = newValue?.trim() || null;
    if (old === next) return;
    await supabase.from("space_field_history").insert({
      space_id: space!.id,
      field_name: fieldName,
      old_value: old,
      new_value: next,
    });
  }

  // ── Chambre ────────────────────────────────────────────────────────────────
  async function handleSaveHospitalInfos() {
    if (!space) return;
    setHospitalInfosSaving(true);
    const nextRoom = room.trim() || null;
    const nextService = service.trim() || null;
    const nextSector = sector.trim() || null;
    const logChanges: Promise<void>[] = [];
    if (nextRoom !== space.hospital_room) logChanges.push(logFieldChange("hospital_room", space.hospital_room, nextRoom));
    if (nextService !== space.hospital_service) logChanges.push(logFieldChange("hospital_service", space.hospital_service, nextService));
    if (nextSector !== space.hospital_sector) logChanges.push(logFieldChange("hospital_sector", space.hospital_sector, nextSector));
    await Promise.all(logChanges);
    // "Secteur" et "Complément d'adresse" sont synchronisés en temps réel
    // (voir setHospitalSectorSynced) — on persiste donc aussi hospital_address_line2
    // ici pour que la BDD reste cohérente même si l'admin n'a jamais ouvert
    // la section Coordonnées.
    const { error } = await supabase
      .from("patient_spaces")
      .update({ hospital_room: nextRoom, hospital_service: nextService, hospital_sector: nextSector, hospital_address_line2: nextSector })
      .eq("id", space.id);
    setHospitalInfosSaving(false);
    if (error) showToast("Erreur lors de la sauvegarde.");
    else { showToast("Infos hospitalières enregistrées ✓"); loadHistory(); }
  }

  // ── Admin notes ────────────────────────────────────────────────────────────
  async function handleSaveNotes() {
    if (!space) return;
    setNotesSaving(true);
    const nextRules = visitRules.trim() || null;
    await logFieldChange("visit_rules", space.visit_rules, nextRules);
    const { error } = await supabase
      .from("patient_spaces")
      .update({ visit_rules: nextRules })
      .eq("id", space.id);
    setNotesSaving(false);
    if (error) showToast("Erreur lors de la sauvegarde.");
    else { showToast("Message enregistré ✓"); loadHistory(); }
  }

  // Dès que l'admin quitte le champ lien Maps, on tente de récupérer le nom
  // (lu dans l'URL) et l'adresse (géocodage inverse des coordonnées GPS de
  // l'URL via OpenStreetMap Nominatim) — sans écraser une saisie manuelle
  // en cours si la résolution échoue.
  async function handleHospitalMapsUrlBlur() {
    const url = hospitalMapsUrl.trim();
    if (!url) return;
    setHospitalNameResolving(true);
    const place = await resolvePlaceFromMapsUrl(url);
    setHospitalNameResolving(false);
    if (place.name) setHospitalName(place.name);
    if (place.street) setHospitalAddress(place.street);
    if (place.postalCode) setHospitalPostalCode(place.postalCode);
    if (place.city) setHospitalCity(place.city);
    if (place.country) setHospitalCountry(place.country);
    const gotAddress = !!(place.street || place.postalCode || place.city);
    if (place.name && gotAddress) showToast("Nom et adresse récupérés depuis le lien ✓");
    else if (place.name) showToast("Nom récupéré — adresse à compléter manuellement.");
    else if (gotAddress) showToast("Adresse récupérée depuis le lien ✓");
  }

  // Même principe que handleHospitalMapsUrlBlur, mais pas de "nom" à
  // récupérer pour une adresse de domicile.
  async function handleHomeMapsUrlBlur() {
    const url = homeMapsUrl.trim();
    if (!url) return;
    setHomeAddressResolving(true);
    const place = await resolvePlaceFromMapsUrl(url);
    setHomeAddressResolving(false);
    if (place.street) setHomeAddress(place.street);
    if (place.postalCode) setHomePostalCode(place.postalCode);
    if (place.city) setHomeCity(place.city);
    if (place.country) setHomeCountry(place.country);
    const gotAddress = !!(place.street || place.postalCode || place.city);
    if (gotAddress) showToast("Adresse récupérée depuis le lien ✓");
  }

  // ── Coordonnées hôpital ────────────────────────────────────────────────────
  function handleOpenNameChange() {
    setNameChangeFirstname("");
    setNameChangeLastname("");
    setNameChangeReason("");
    setNameChangeModal(true);
  }

  function handleSendNameChange() {
    if (!space) return;
    const subject = encodeURIComponent(`Demande de changement de nom — espace ${space.patient_firstname} ${space.patient_lastname}`);
    const body = encodeURIComponent(
      `Nom actuel : ${space.patient_firstname} ${space.patient_lastname}\n` +
      `Nouveau prénom souhaité : ${nameChangeFirstname.trim()}\n` +
      `Nouveau nom souhaité : ${nameChangeLastname.trim()}\n\n` +
      `Raison du changement :\n${nameChangeReason.trim()}\n\n` +
      `ID espace : ${space.id}`
    );
    Linking.openURL(`mailto:support@avectoi.care?subject=${subject}&body=${body}`);
    setNameChangeModal(false);
  }

  // ── Coordonnées (mode de soin + adresse hôpital/domicile) ─────────────────
  async function handleConfirmHomeCare() {
    if (!space) return;
    setHomeCareToggling(true);
    const nextMode = homeCareDraft;
    const modeChanged = nextMode !== space.home_care_mode;
    const update: Record<string, string | boolean | null> = { home_care_mode: nextMode };
    if (nextMode) {
      const nextAddress = homeAddress.trim() || null;
      update.home_address = nextAddress;
      update.home_address_line2 = homeAddressLine2.trim() || null;
      update.home_postal_code = homePostalCode.trim() || null;
      update.home_city = homeCity.trim() || null;
      update.home_country = homeCountry.trim() || null;
      update.home_maps_url = homeMapsUrl.trim() || null;
      if (!modeChanged && nextAddress !== space.home_address) {
        await logFieldChange("home_address", space.home_address, nextAddress);
      }
    } else {
      update.hospital_name = hospitalName.trim() || null;
      update.hospital_address = hospitalAddress.trim() || null;
      update.hospital_address_line2 = hospitalAddressLine2.trim() || null;
      // Synchronisé avec "Secteur" (voir setHospitalSectorSynced) — persisté
      // ici aussi pour que la BDD reste cohérente même si l'admin n'a jamais
      // ouvert la section Infos hospitalières.
      update.hospital_sector = hospitalAddressLine2.trim() || null;
      update.hospital_postal_code = hospitalPostalCode.trim() || null;
      update.hospital_city = hospitalCity.trim() || null;
      update.hospital_country = hospitalCountry.trim() || null;
      update.hospital_maps_url = hospitalMapsUrl.trim() || null;
    }
    const { error } = await supabase
      .from("patient_spaces")
      .update(update)
      .eq("id", space.id);
    if (!error && modeChanged) {
      await logFieldChange(
        "home_care_mode",
        space.home_care_mode ? "Soin à domicile" : "Suivi hospitalier",
        nextMode ? "Soin à domicile" : "Suivi hospitalier"
      );
    }
    if (!error) loadHistory();
    setHomeCareToggling(false);
    if (error) {
      showToast("Erreur lors de la mise à jour.");
      return;
    }
    showToast(
      modeChanged
        ? (nextMode ? "Soin à domicile activé ✓" : "Retour au suivi hospitalier ✓")
        : "Coordonnées enregistrées ✓"
    );
  }

  // ── Bascule des règles de créneaux ──────────────────────────────────────────
  // Point d'entrée unique vers apply_slot_rule_change (RPC atomique) pour les
  // trois handlers ci-dessous : verse l'historique versionné, met à jour la
  // config live, et — si le changement est structurel — recase les
  // réservations futures invalidées (voir la migration pour l'algorithme).
  // mergedConfig sert à la fois à calculer p_new_slots (seule source de
  // vérité : generateSlots dans lib/slotUtils.ts) et à la synchro calendrier
  // native opportuniste des réservations recasées sur cet appareil.
  async function applyRuleChange(
    patch: Partial<SlotConfig>,
  ): Promise<{ ok: true; result: RuleChangeResult } | { ok: false; error: string }> {
    if (!space || !slotConfig) return { ok: false, error: "NO_SPACE" };
    const mergedConfig: SlotConfig = { ...slotConfig, ...patch };
    const newSlots = generateSlots(mergedConfig);

    const { data, error } = await supabase.rpc("apply_slot_rule_change", {
      p_space_id: space.id,
      p_new_config: patch,
      p_new_slots: newSlots,
    });
    if (error) return { ok: false, error: error.message };

    const result = data as RuleChangeResult;
    if (result.rebooked.length > 0) {
      const { data: rows } = await supabase
        .from("reservations")
        .select("id, date, creneau, type")
        .in("id", result.rebooked);
      for (const r of rows ?? []) {
        await updateLinkedCalendarEvent(r.id, r.date, r.creneau, r.type, mergedConfig);
      }
    }
    return { ok: true, result };
  }

  function rebookingSummary(result: RuleChangeResult): string | null {
    const parts: string[] = [];
    if (result.rebooked.length) parts.push(`${result.rebooked.length} réservation(s) recasée(s)`);
    if (result.night_cancelled.length) parts.push(`${result.night_cancelled.length} nuitée(s) annulée(s)`);
    if (result.failed.length) parts.push(`${result.failed.length} réservation(s) à recaser manuellement`);
    if (result.day_cap_suspended?.length) parts.push(`${result.day_cap_suspended.length} réservation(s) suspendue(s) (1 visite/jour)`);
    return parts.length ? parts.join(", ") + " — visiteurs alertés." : null;
  }

  // ── Nuitées toggle ─────────────────────────────────────────────────────────
  async function handleToggleNight() {
    if (!slotConfig) return;
    setNightToggling(true);
    const nextEnabled = !slotConfig.night_enabled;
    const wasEnabled = slotConfig.night_enabled;
    const res = await applyRuleChange({ night_enabled: nextEnabled });
    setNightToggling(false);
    refreshSlotConfig();
    if (!res.ok) {
      showToast("Erreur lors de la mise à jour.");
      return;
    }
    await logFieldChange("night_enabled", wasEnabled ? "Activées" : "Suspendues", nextEnabled ? "Activées" : "Suspendues");
    loadHistory();
    showToast(rebookingSummary(res.result) ?? (wasEnabled ? "Nuitées suspendues ✓" : "Nuitées activées ✓"));
  }

  // ── Intervenants toggle ──────────────────────────────────────────────────────
  async function handleToggleIntervenants() {
    if (!space) return;
    setIntervenantsToggling(true);
    const nextEnabled = !space.intervenants_enabled;
    const wasEnabled = space.intervenants_enabled;
    const { error } = await supabase
      .from("patient_spaces")
      .update({ intervenants_enabled: nextEnabled })
      .eq("id", space.id);
    setIntervenantsToggling(false);
    if (error) {
      showToast("Erreur lors de la mise à jour.");
      return;
    }
    await refreshSpace();
    await logFieldChange("intervenants_enabled", wasEnabled ? "Activé" : "Désactivé", nextEnabled ? "Activé" : "Désactivé");
    loadHistory();
    showToast(wasEnabled ? "Planning des intervenants désactivé ✓" : "Planning des intervenants activé ✓");
  }

  // ── "1 visite par jour" toggle ───────────────────────────────────────────
  // Applique immédiatement (comme handleToggleNight) plutôt que d'attendre
  // le bouton "Enregistrer" des règles de créneaux : le mode ne doit jamais
  // rester activé côté écran sans être réellement persisté en base, sinon
  // check_slot_capacity() continue d'autoriser plusieurs créneaux le même
  // jour alors que l'admin croit l'avoir activé.
  async function handleToggleOneVisitPerDay() {
    if (!slotConfig) return;
    setOneVisitPerDayToggling(true);
    const next = !oneVisitPerDay;
    const prev = oneVisitPerDay;
    const res = await applyRuleChange({ one_visit_per_day: next });
    setOneVisitPerDayToggling(false);
    if (!res.ok) {
      showToast("Erreur lors de la mise à jour.");
      return;
    }
    setOneVisitPerDay(next);
    refreshSlotConfig();
    await logFieldChange("one_visit_per_day", prev ? "Activé" : "Désactivé", next ? "Activé" : "Désactivé");
    loadHistory();
    showToast(rebookingSummary(res.result) ?? (next ? "Mode 1 visite/jour activé ✓" : "Mode 1 visite/jour désactivé ✓"));
  }

  async function handleSaveNightHours() {
    if (!slotConfig) return;
    setNightHoursSaving(true);
    const logs: Promise<void>[] = [];
    if (nightStartHour !== (slotConfig.night_start_hour ?? 19) || nightStartMinute !== (slotConfig.night_start_minute ?? 0)) {
      logs.push(logFieldChange(
        "night_start_hour",
        formatHourMinute(slotConfig.night_start_hour ?? 19, slotConfig.night_start_minute ?? 0),
        formatHourMinute(nightStartHour, nightStartMinute),
      ));
    }
    if (nightEndHour !== (slotConfig.night_end_hour ?? 8) || nightEndMinute !== (slotConfig.night_end_minute ?? 0)) {
      logs.push(logFieldChange(
        "night_end_hour",
        formatHourMinute(slotConfig.night_end_hour ?? 8, slotConfig.night_end_minute ?? 0),
        formatHourMinute(nightEndHour, nightEndMinute),
      ));
    }
    await Promise.all(logs);
    const res = await applyRuleChange({
      night_start_hour: nightStartHour, night_start_minute: nightStartMinute,
      night_end_hour: nightEndHour, night_end_minute: nightEndMinute,
    });
    setNightHoursSaving(false);
    refreshSlotConfig();
    loadHistory();
    if (!res.ok) { showToast("Erreur lors de la sauvegarde."); return; }
    showToast(rebookingSummary(res.result) ?? "Heures de nuitée enregistrées ✓");
  }

  // ── Règles des créneaux ───────────────────────────────────────────────────
  function toggleWeekday(day: number) {
    setAllowedWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  function toggleBlockedDate(iso: string) {
    const isBlocked = blockedDates.includes(iso);
    setBlockedDates((prev) =>
      isBlocked ? prev.filter((d) => d !== iso) : [...prev, iso].sort()
    );
    setBlockedDateReasons((prev) => {
      const next = { ...prev };
      if (isBlocked) {
        delete next[iso];
      } else if (blockPickerReason.trim()) {
        next[iso] = blockPickerReason.trim();
      }
      return next;
    });
    if (isBlocked) {
      if (lastAddedBlockedDate === iso) setLastAddedBlockedDate(null);
    } else {
      // La date vient d'être bloquée : si le motif est tapé après coup
      // (plutôt qu'avant, dans le champ au-dessus du calendrier), il doit
      // quand même s'attacher à cette date — voir onChangeText ci-dessous.
      setLastAddedBlockedDate(iso);
    }
  }

  async function handleSaveSlotRules() {
    if (!slotConfig) return;
    setSlotRulesSaving(true);

    const logs: Promise<void>[] = [];
    if (visitStartHour !== slotConfig.visit_start_hour || visitStartMinute !== (slotConfig.visit_start_minute ?? 0)) {
      logs.push(logFieldChange(
        "visit_start_hour",
        formatHourMinute(slotConfig.visit_start_hour, slotConfig.visit_start_minute ?? 0),
        formatHourMinute(visitStartHour, visitStartMinute),
      ));
    }
    if (visitEndHour !== slotConfig.visit_end_hour || visitEndMinute !== (slotConfig.visit_end_minute ?? 0)) {
      logs.push(logFieldChange(
        "visit_end_hour",
        formatHourMinute(slotConfig.visit_end_hour, slotConfig.visit_end_minute ?? 0),
        formatHourMinute(visitEndHour, visitEndMinute),
      ));
    }
    if (slotDuration !== slotConfig.slot_duration_minutes) {
      logs.push(logFieldChange("slot_duration_minutes", formatDuration(slotConfig.slot_duration_minutes), formatDuration(slotDuration)));
    }
    const prevGap = Math.max(5, slotConfig.min_gap_minutes || 0);
    if (slotGap !== prevGap) {
      logs.push(logFieldChange("min_gap_minutes", formatDuration(prevGap), formatDuration(slotGap)));
    }
    if (maxVisitors !== slotConfig.max_visitors_per_slot) {
      logs.push(logFieldChange("max_visitors_per_slot", String(slotConfig.max_visitors_per_slot), String(maxVisitors)));
    }
    const prevGapIncludes = slotConfig.gap_includes_duration ?? false;
    if (gapIncludesDuration !== prevGapIncludes) {
      logs.push(logFieldChange("gap_includes_duration", prevGapIncludes ? "Oui" : "Non", gapIncludesDuration ? "Oui" : "Non"));
    }
    const prevWeekdays = slotConfig.allowed_weekdays ?? [0, 1, 2, 3, 4, 5, 6];
    if (JSON.stringify([...allowedWeekdays].sort()) !== JSON.stringify([...prevWeekdays].sort())) {
      logs.push(logFieldChange("allowed_weekdays", formatWeekdaysList(prevWeekdays), formatWeekdaysList(allowedWeekdays)));
    }
    const prevBlockedDates = slotConfig.blocked_dates ?? [];
    if (JSON.stringify([...blockedDates].sort()) !== JSON.stringify([...prevBlockedDates].sort())) {
      logs.push(logFieldChange("blocked_dates", formatBlockedDatesList(prevBlockedDates), formatBlockedDatesList(blockedDates)));
    }
    await Promise.all(logs);

    const res = await applyRuleChange({
      visit_start_hour: visitStartHour,
      visit_start_minute: visitStartMinute,
      visit_end_hour: visitEndHour,
      visit_end_minute: visitEndMinute,
      slot_duration_minutes: slotDuration,
      min_gap_minutes: slotGap,
      max_visitors_per_slot: maxVisitors,
      allowed_weekdays: allowedWeekdays,
      blocked_dates: blockedDates,
      blocked_date_reasons: blockedDateReasons,
      gap_includes_duration: gapIncludesDuration,
    });

    setSlotRulesSaving(false);
    refreshSlotConfig();
    loadHistory();
    if (!res.ok) {
      showToast("Erreur : " + res.error);
      return;
    }
    showToast(rebookingSummary(res.result) ?? "Règles de visite enregistrées ✓");
  }

  // ── Patient photo upload ───────────────────────────────────────────────────
  async function handlePhotoUpload() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission refusée", "Autorise l'accès à la galerie dans les paramètres.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (result.canceled || !result.assets[0]) return;

    setPhotoUploading(true);
    try {
      const compressed = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 400 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
      );

      // fetch(localUri).blob() est peu fiable sur expo-file-system v19
      // (échoue souvent en "Network request failed") — lecture directe
      // du fichier local via la nouvelle API File, sans passer par le réseau.
      const fileData = await new File(compressed.uri).arrayBuffer();
      const storagePath = `${space!.id}/photo.jpg`;

      const { error: uploadErr } = await supabase.storage
        .from("patient-photos")
        .upload(storagePath, fileData, {
          contentType: "image/jpeg",
          cacheControl: "0",
          upsert: true,
        });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("patient-photos")
        .getPublicUrl(storagePath);

      // Bust cache with a timestamp
      const photoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: dbErr } = await supabase
        .from("patient_spaces")
        .update({ patient_photo_url: photoUrl })
        .eq("id", space!.id);

      if (dbErr) throw dbErr;

      setLocalPhotoUrl(photoUrl);
      showToast("Photo mise à jour ✓");
    } catch (e: any) {
      showToast("Erreur : " + (e?.message ?? "inconnue"));
    }
    setPhotoUploading(false);
  }

  function handleRemovePhoto() {
    if (!space?.patient_photo_url) return;
    setRemovePhotoModal(true);
  }

  async function confirmRemovePhoto() {
    setRemovePhotoModal(false);
    if (!space) return;
    await supabase.storage.from("patient-photos").remove([`${space.id}/photo.jpg`]);
    await supabase.from("patient_spaces").update({ patient_photo_url: null }).eq("id", space.id);
    setLocalPhotoUrl(null);
    showToast("Photo supprimée ✓");
  }

  // ── Prolongation RGPD ─────────────────────────────────────────────────────
  function handleProlong() {
    if (!space) return;
    Alert.alert(
      "Prolonger l'espace",
      "Ajouter 30 jours à la date de conservation ? Toutes les données seront conservées 30 jours de plus.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Prolonger",
          onPress: async () => {
            setProlonging(true);

            const currentPurge = new Date(space.purge_scheduled_at);
            const newPurge = new Date(currentPurge);
            newPurge.setDate(newPurge.getDate() + 30);

            const currentEnd = new Date(space.end_date + "T00:00:00");
            const newEnd = new Date(currentEnd);
            newEnd.setDate(newEnd.getDate() + 30);

            const { error } = await supabase
              .from("patient_spaces")
              .update({
                purge_scheduled_at: newPurge.toISOString(),
                end_date: newEnd.toISOString().split("T")[0],
              })
              .eq("id", space.id);

            setProlonging(false);
            if (error) {
              showToast("Erreur lors de la prolongation.");
            } else {
              showToast("Espace prolongé de 30 jours ✓");
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <Text style={[styles.headerTitle, { color: C.text }]}>⚙️ Paramètres</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 48 + SETTINGS_NAV_BAR_HEIGHT }]}>

        {hasSpace && space ? (
          <>
            {/* ── Section : Patient ────────────────────────────────────────────── */}
            <Text style={[styles.sectionTitle, { color: C.gold }]}>Patient</Text>
            <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={styles.patientRow}>
                <PatientAvatar photoUrl={displayPhotoUrl} firstname={space.patient_firstname} lastname={space.patient_lastname} size={56} C={C} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.patientName, { color: C.text }]}>{space.patient_firstname} {space.patient_lastname}</Text>
                  <Text style={[styles.patientHospital, { color: C.muted }]}>
                    {space.home_care_mode ? "🏠 Soin à domicile" : space.hospital_name}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.saveNotesBtn, { backgroundColor: C.accent, borderWidth: 1, borderColor: C.accent, marginTop: 14 }]}
                onPress={() => setEditProfileModal(true)}
              >
                <Text style={[styles.saveNotesBtnText, { color: "#fff" }]}>Profil Patient</Text>
              </TouchableOpacity>
            </View>

            {/* ── Section : Coordonnées (mode de soin + adresse) ─────────────── */}
            {activeSection === "coord" && (
              <>
                <Text style={[styles.sectionTitle, { color: C.gold }]}>Coordonnées</Text>
                <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
                  {/* Mode de soin */}
                  <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 0 }]}>🔄 Mode de soin</Text>
                  <View
                    style={{
                      minHeight: Math.max(homeCareDescHeightHospital, homeCareDescHeightHome) || undefined,
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      onLayout={(e) => setHomeCareDescHeightHospital(e.nativeEvent.layout.height)}
                      style={[
                        styles.nightDesc,
                        { color: C.muted },
                        homeCareDraft && styles.homeCareDescHidden,
                      ]}
                    >
                      Activez si le patient quitte l'hôpital et que les visites se poursuivent à domicile.
                    </Text>
                    <Text
                      onLayout={(e) => setHomeCareDescHeightHome(e.nativeEvent.layout.height)}
                      style={[
                        styles.nightDesc,
                        { color: C.muted },
                        !homeCareDraft && styles.homeCareDescHidden,
                      ]}
                    >
                      Activez si le patient doit faire un séjour hospitalier.
                    </Text>
                  </View>
                  <View
                    style={[styles.homeCareTrack, { borderColor: C.border, backgroundColor: C.bg }]}
                    onLayout={(e) => {
                      const w = e.nativeEvent.layout.width;
                      homeCareTrackWidthRef.current = w;
                      setHomeCareTrackWidth(w);
                    }}
                    {...homeCarePanResponder.panHandlers}
                  >
                    {homeCareTrackWidth > 0 && homeCareLeftLabelWidth > 0 && homeCareRightLabelWidth > 0 && (() => {
                      const padding = 24;
                      const thumbWidth = Math.max(homeCareLeftLabelWidth, homeCareRightLabelWidth) + padding;
                      const leftPos = 0;
                      const rightPos = homeCareTrackWidth - thumbWidth;
                      return (
                        <Animated.View
                          pointerEvents="none"
                          style={[
                            styles.homeCareThumb,
                            {
                              backgroundColor: C.accent,
                              width: thumbWidth,
                              transform: [{
                                translateX: homeCareThumbX.interpolate({ inputRange: [0, 1], outputRange: [leftPos, rightPos] }),
                              }],
                            },
                          ]}
                        />
                      );
                    })()}
                    <View style={[styles.homeCareOption, { left: 0 }]} pointerEvents="none">
                      <Text
                        onLayout={(e) => setHomeCareLeftLabelWidth(e.nativeEvent.layout.width)}
                        style={[styles.homeCareOptionText, { color: !homeCareDraft ? "#fff" : C.muted }]}
                      >
                        Suivi hospitalier
                      </Text>
                    </View>
                    <View style={[styles.homeCareOption, { right: 0 }]} pointerEvents="none">
                      <Text
                        onLayout={(e) => setHomeCareRightLabelWidth(e.nativeEvent.layout.width)}
                        style={[styles.homeCareOptionText, { color: homeCareDraft ? "#fff" : C.muted }]}
                      >
                        Soin à domicile
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.fieldDivider, { backgroundColor: C.border, marginTop: 16 }]} />

                  {/* Adresse (hôpital ou domicile selon le mode sélectionné ci-dessus) */}
                  {homeCareDraft ? (
                    <>
                      <Text style={[styles.cardDesc, { color: C.muted }]}>Colle le lien Google Maps trouvé sur internet — l'adresse se remplit automatiquement en dessous (à vérifier, l'adresse peut être approximative).</Text>

                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 0 }]}>🗺️ Lien Google Maps</Text>
                        {homeAddressResolving && <ActivityIndicator color={C.accent} size="small" />}
                      </View>
                      <TextInput
                        style={[styles.sectorInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                        placeholder="Colle ici le lien copié depuis Google Maps"
                        placeholderTextColor={C.muted}
                        value={homeMapsUrl}
                        onChangeText={setHomeMapsUrl}
                        onBlur={handleHomeMapsUrlBlur}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 12 }]}>📍 Adresse</Text>
                      <TextInput
                        style={[styles.sectorInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                        placeholder="Ex : 12 rue des Lilas"
                        placeholderTextColor={C.muted}
                        value={homeAddress}
                        onChangeText={setHomeAddress}
                      />
                      <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 12 }]}>🏠 Complément d'adresse</Text>
                      <TextInput
                        style={[styles.sectorInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                        placeholder="Ex : Bâtiment B, 2e étage"
                        placeholderTextColor={C.muted}
                        value={homeAddressLine2}
                        onChangeText={setHomeAddressLine2}
                      />
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.fieldLabel, { color: C.gold }]}>Code postal</Text>
                          <TextInput
                            style={[styles.sectorInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                            placeholder="38000"
                            placeholderTextColor={C.muted}
                            value={homePostalCode}
                            onChangeText={setHomePostalCode}
                            keyboardType="number-pad"
                          />
                        </View>
                        <View style={{ flex: 2 }}>
                          <Text style={[styles.fieldLabel, { color: C.gold }]}>Ville</Text>
                          <TextInput
                            style={[styles.sectorInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                            placeholder="Grenoble"
                            placeholderTextColor={C.muted}
                            value={homeCity}
                            onChangeText={setHomeCity}
                          />
                        </View>
                      </View>
                      <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 12 }]}>🌍 Pays</Text>
                      <TextInput
                        style={[styles.sectorInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                        placeholder="Laisser vide si France"
                        placeholderTextColor={C.muted}
                        value={homeCountry}
                        onChangeText={setHomeCountry}
                      />
                    </>
                  ) : (
                    <>
                      <Text style={[styles.cardDesc, { color: C.muted }]}>Colle le lien Google Maps trouvé sur internet — le nom et l'adresse se remplissent automatiquement en dessous (à vérifier, l'adresse peut être approximative).</Text>

                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 0 }]}>🗺️ Lien Google Maps</Text>
                        {hospitalNameResolving && <ActivityIndicator color={C.accent} size="small" />}
                      </View>
                      <TextInput
                        style={[styles.sectorInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                        placeholder="Colle ici le lien copié depuis Google Maps"
                        placeholderTextColor={C.muted}
                        value={hospitalMapsUrl}
                        onChangeText={setHospitalMapsUrl}
                        onBlur={handleHospitalMapsUrlBlur}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 12 }]}>🏥 Nom de l'hôpital</Text>
                      <TextInput
                        style={[styles.sectorInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                        placeholder="Ex : CHU de Grenoble"
                        placeholderTextColor={C.muted}
                        value={hospitalName}
                        onChangeText={setHospitalName}
                      />
                      <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 12 }]}>📍 Adresse</Text>
                      <TextInput
                        style={[styles.sectorInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                        placeholder="Ex : Avenue de Maquis du Grésivaudan"
                        placeholderTextColor={C.muted}
                        value={hospitalAddress}
                        onChangeText={setHospitalAddress}
                      />
                      <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 12 }]}>🏥 Complément d'adresse</Text>
                      <TextInput
                        style={[styles.sectorInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                        placeholder="Ex : Bâtiment Chevalier, entrée C"
                        placeholderTextColor={C.muted}
                        value={hospitalAddressLine2}
                        onChangeText={setHospitalSectorSynced}
                      />
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.fieldLabel, { color: C.gold }]}>Code postal</Text>
                          <TextInput
                            style={[styles.sectorInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                            placeholder="38000"
                            placeholderTextColor={C.muted}
                            value={hospitalPostalCode}
                            onChangeText={setHospitalPostalCode}
                            keyboardType="number-pad"
                          />
                        </View>
                        <View style={{ flex: 2 }}>
                          <Text style={[styles.fieldLabel, { color: C.gold }]}>Ville</Text>
                          <TextInput
                            style={[styles.sectorInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                            placeholder="Grenoble"
                            placeholderTextColor={C.muted}
                            value={hospitalCity}
                            onChangeText={setHospitalCity}
                          />
                        </View>
                      </View>
                      <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 12 }]}>🌍 Pays</Text>
                      <TextInput
                        style={[styles.sectorInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                        placeholder="Laisser vide si France"
                        placeholderTextColor={C.muted}
                        value={hospitalCountry}
                        onChangeText={setHospitalCountry}
                      />
                    </>
                  )}

                  {(() => {
                    // Le bouton doit aussi s'activer si les champs d'adresse ont
                    // été modifiés sans changer de mode (ex : coller un nouveau
                    // lien Maps) — pas seulement au bascule Hôpital/Domicile,
                    // sinon les modifications de champs sont silencieusement
                    // perdues (bouton grisé, rien à cliquer).
                    const fieldsChanged = homeCareDraft
                      ? (homeAddress.trim() || null) !== space.home_address
                        || (homeAddressLine2.trim() || null) !== space.home_address_line2
                        || (homePostalCode.trim() || null) !== space.home_postal_code
                        || (homeCity.trim() || null) !== space.home_city
                        || (homeCountry.trim() || null) !== space.home_country
                        || (homeMapsUrl.trim() || null) !== space.home_maps_url
                      : (hospitalName.trim() || null) !== space.hospital_name
                        || (hospitalAddress.trim() || null) !== space.hospital_address
                        || (hospitalAddressLine2.trim() || null) !== space.hospital_address_line2
                        || (hospitalPostalCode.trim() || null) !== space.hospital_postal_code
                        || (hospitalCity.trim() || null) !== space.hospital_city
                        || (hospitalCountry.trim() || null) !== space.hospital_country
                        || (hospitalMapsUrl.trim() || null) !== space.hospital_maps_url;
                    const homeCareChanged = homeCareDraft !== space.home_care_mode || fieldsChanged;
                    return (
                      <TouchableOpacity
                        style={[
                          styles.saveNotesBtn,
                          homeCareChanged
                            ? { backgroundColor: C.accent, marginTop: 8 }
                            : { backgroundColor: C.overlay, borderWidth: 1, borderColor: C.border, marginTop: 8 },
                          homeCareToggling && { opacity: 0.6 },
                        ]}
                        onPress={handleConfirmHomeCare}
                        disabled={homeCareToggling || !homeCareChanged}
                      >
                        {homeCareToggling
                          ? <ActivityIndicator color={homeCareChanged ? "#fff" : C.muted} size="small" />
                          : <Text style={[styles.saveNotesBtnText, !homeCareChanged && { color: C.muted }]}>Enregistrer les coordonnées</Text>
                        }
                      </TouchableOpacity>
                    );
                  })()}
                </View>
              </>
            )}

            {/* ── Section : Infos hospitalières ─────────────────────────────── */}
            {activeSection === "hosp" && (
              <>
                <Text style={[styles.sectionTitle, { color: C.gold }]}>Infos hospitalières</Text>
                {!space.home_care_mode && (
                  <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
                    <Text style={[styles.cardDesc, { color: C.muted }]}>
                      Affichées dans le bandeau de l'app. Chaque modification est datée et conservée.
                    </Text>

                    {/* Service médical */}
                    <Text style={[styles.fieldLabel, { color: C.gold }]}>🏥 Service médical</Text>
                    <TextInput
                      style={[styles.sectorInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                      placeholder="Ex : NEUROLOGIE"
                      placeholderTextColor={C.muted}
                      value={service}
                      onChangeText={setService}
                      autoCapitalize="characters"
                    />

                    <View style={[styles.fieldDivider, { backgroundColor: C.border }]} />

                    {/* Secteur */}
                    <Text style={[styles.fieldLabel, { color: C.gold }]}>📍 Secteur</Text>
                    <TextInput
                      style={[styles.sectorInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                      placeholder="Ex : Secteur A"
                      placeholderTextColor={C.muted}
                      value={sector}
                      onChangeText={setHospitalSectorSynced}
                    />

                    <View style={[styles.fieldDivider, { backgroundColor: C.border }]} />

                    {/* Chambre */}
                    <Text style={[styles.fieldLabel, { color: C.gold }]}>🛏️ Chambre</Text>
                    <TextInput
                      style={[styles.sectorInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                      placeholder="Ex : 205 B"
                      placeholderTextColor={C.muted}
                      value={room}
                      onChangeText={setRoom}
                    />

                    <TouchableOpacity
                      style={[styles.saveNotesBtn, { backgroundColor: C.accent, marginTop: 8 }, hospitalInfosSaving && { opacity: 0.6 }]}
                      onPress={handleSaveHospitalInfos}
                      disabled={hospitalInfosSaving}
                    >
                      {hospitalInfosSaving
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={styles.saveNotesBtnText}>Enregistrer les infos hospitalières</Text>
                      }
                    </TouchableOpacity>
                  </View>
                )}

                {/* ── Bloc : Consignes de visite / Infos ─────────────────────── */}
                <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border, marginTop: space.home_care_mode ? 0 : 16 }]}>
                  <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 0 }]}>📋 Consignes de visite / Infos</Text>
                  <Text style={[styles.cardDesc, { color: C.muted }]}>
                    Affiché dans le bloc "Informations" de l'onglet Infos, sous les consignes automatiques.
                  </Text>
                  <Text style={[styles.warningText, { color: C.orange }]}>
                    ⚠️ N'indiquez pas d'informations médicales sensibles.
                  </Text>
                  <TextInput
                    style={[styles.notesInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                    placeholder="Ex : La chambre se trouve au 3ème étage, aile B…"
                    placeholderTextColor={C.muted}
                    value={visitRules}
                    onChangeText={setVisitRules}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  <TouchableOpacity
                    style={[styles.saveNotesBtn, { backgroundColor: C.accent }, notesSaving && { opacity: 0.6 }]}
                    onPress={handleSaveNotes}
                    disabled={notesSaving}
                  >
                    {notesSaving
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.saveNotesBtnText}>Enregistrer les consignes</Text>
                    }
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* ── Section : Règles de visite ──────────────────────────────────── */}
            {activeSection === "regles" && slotConfig && (
              <>
                <Text style={[styles.sectionTitle, { color: C.gold }]}>Règles de visite</Text>
                <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>

                  {/* Horaires */}
                  <Text style={[styles.fieldLabel, { color: C.gold }]}>⏰ Horaires des visites</Text>
                  <View style={styles.hourRow}>
                    <View style={styles.hourBlock}>
                      <Text style={[styles.hourLabel, { color: C.muted }]}>Début</Text>
                      <TouchableOpacity
                        style={[styles.timeBtn, { backgroundColor: C.bg, borderColor: C.border }]}
                        onPress={() => {
                          if (Platform.OS === "android") {
                            openAndroidTimePicker(hourToDate(visitStartHour, visitStartMinute), (date) => {
                              const endTotal = hmToMinutes(visitEndHour, visitEndMinute);
                              const [h, m] = minutesToHM(Math.min(hmToMinutes(date.getHours(), date.getMinutes()), endTotal - 1));
                              setVisitStartHour(h); setVisitStartMinute(m);
                            });
                          } else {
                            setShowVisitStartPicker(true);
                          }
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.timeBtnText, { color: C.text }]}>🕐 {formatHourMinute(visitStartHour, visitStartMinute)}</Text>
                      </TouchableOpacity>
                      {showVisitStartPicker && (
                        <DateTimePicker
                          value={hourToDate(visitStartHour, visitStartMinute)}
                          mode="time"
                          is24Hour
                          display={Platform.OS === "ios" ? "spinner" : "clock"}
                          onChange={(_, date) => {
                            setShowVisitStartPicker(false);
                            if (date) {
                              const endTotal = hmToMinutes(visitEndHour, visitEndMinute);
                              const [h, m] = minutesToHM(Math.min(hmToMinutes(date.getHours(), date.getMinutes()), endTotal - 1));
                              setVisitStartHour(h); setVisitStartMinute(m);
                            }
                          }}
                        />
                      )}
                    </View>
                    <Text style={[styles.hourSep, { color: C.muted }]}>→</Text>
                    <View style={styles.hourBlock}>
                      <Text style={[styles.hourLabel, { color: C.muted }]}>Fin</Text>
                      <TouchableOpacity
                        style={[styles.timeBtn, { backgroundColor: C.bg, borderColor: C.border }]}
                        onPress={() => {
                          if (Platform.OS === "android") {
                            openAndroidTimePicker(hourToDate(visitEndHour, visitEndMinute), (date) => {
                              const startTotal = hmToMinutes(visitStartHour, visitStartMinute);
                              const [h, m] = minutesToHM(Math.max(hmToMinutes(date.getHours(), date.getMinutes()), startTotal + 1));
                              setVisitEndHour(h); setVisitEndMinute(m);
                            });
                          } else {
                            setShowVisitEndPicker(true);
                          }
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.timeBtnText, { color: C.text }]}>🕐 {formatHourMinute(visitEndHour, visitEndMinute)}</Text>
                      </TouchableOpacity>
                      {showVisitEndPicker && (
                        <DateTimePicker
                          value={hourToDate(visitEndHour, visitEndMinute)}
                          mode="time"
                          is24Hour
                          display={Platform.OS === "ios" ? "spinner" : "clock"}
                          onChange={(_, date) => {
                            setShowVisitEndPicker(false);
                            if (date) {
                              const startTotal = hmToMinutes(visitStartHour, visitStartMinute);
                              const [h, m] = minutesToHM(Math.max(hmToMinutes(date.getHours(), date.getMinutes()), startTotal + 1));
                              setVisitEndHour(h); setVisitEndMinute(m);
                            }
                          }}
                        />
                      )}
                    </View>
                  </View>

                  <View style={[styles.fieldDivider, { backgroundColor: C.border }]} />

                  {/* Durée d'une visite */}
                  <Text style={[styles.fieldLabel, { color: C.gold }]}>⏱ Durée d'une visite</Text>
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={[styles.stepBtn, { backgroundColor: C.bg, borderColor: C.border }]}
                      onPress={() => setSlotDuration((d) => Math.max(5, d - 5))}
                    >
                      <Text style={[styles.stepBtnText, { color: C.text }]}>−</Text>
                    </TouchableOpacity>
                    <Text style={[styles.stepValue, { color: C.text }]}>{formatDuration(slotDuration)}</Text>
                    <TouchableOpacity
                      style={[styles.stepBtn, { backgroundColor: C.bg, borderColor: C.border }]}
                      onPress={() => setSlotDuration((d) => Math.min(240, d + 5))}
                    >
                      <Text style={[styles.stepBtnText, { color: C.text }]}>+</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.fieldDivider, { backgroundColor: C.border }]} />

                  {/* Intervalle entre les créneaux */}
                  <View style={styles.sliderHeaderRow}>
                    <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 0 }]}>⏲ Intervalle entre deux créneaux</Text>
                    <Text style={[styles.sliderValueText, { color: C.gold }]}>{formatDuration(slotGap)}</Text>
                  </View>
                  <MinuteSlider value={slotGap} onChange={setSlotGap} min={5} max={240} step={5} C={C} />
                  <View style={styles.sliderBoundsRow}>
                    <Text style={[styles.sliderBoundLabel, { color: C.muted }]}>5 min</Text>
                    <Text style={[styles.sliderBoundLabel, { color: C.muted }]}>4h</Text>
                  </View>

                  <View style={[styles.nightRow, { marginTop: 12 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.nightLabel, { color: C.text }]}>Ajouter la durée de visite à l'intervalle</Text>
                      <Text style={[styles.nightDesc, { color: C.muted }]}>
                        {gapIncludesDuration
                          ? `Ex. : visite de ${slotDuration} min + ${slotGap} min d'intervalle → créneau suivant ${slotDuration + slotGap} min plus tard.`
                          : `Actuellement, l'intervalle (${slotGap} min) est le seul écart entre deux créneaux, quelle que soit la durée de visite.`}
                      </Text>
                    </View>
                    <Switch
                      value={gapIncludesDuration}
                      onValueChange={setGapIncludesDuration}
                      trackColor={{ false: C.border, true: C.accent }}
                      thumbColor="#fff"
                    />
                  </View>

                  <View style={[styles.fieldDivider, { backgroundColor: C.border }]} />

                  {/* Résumé des créneaux générés */}
                  <Text style={[styles.cardDesc, { color: C.muted, marginBottom: 0 }]}>
                    {`Créneaux générés : ${
                      generateSlots({
                        ...slotConfig,
                        visit_start_hour: visitStartHour,
                        visit_start_minute: visitStartMinute,
                        visit_end_hour: visitEndHour,
                        visit_end_minute: visitEndMinute,
                        slot_duration_minutes: slotDuration,
                        min_gap_minutes: slotGap,
                        gap_includes_duration: gapIncludesDuration,
                      }).join(" · ") || "Aucun — vérifiez les horaires."
                    }`}
                  </Text>

                  <View style={[styles.fieldDivider, { backgroundColor: C.border }]} />

                  {/* Choisir 1 visite par jour */}
                  <View style={styles.nightRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.nightLabel, { color: C.text }]}>🔒 Choisir 1 visite par jour</Text>
                      <Text style={[styles.nightDesc, { color: C.muted }]}>
                        {oneVisitPerDay
                          ? "Activé : dès qu'un créneau \"Visite\" est réservé un jour donné, les autres créneaux de ce jour disparaissent de l'onglet Créneaux pour tout le monde. Seul l'auteur de la réservation peut encore la déplacer vers un autre créneau."
                          : "Prend effet immédiatement à l'activation, à partir d'aujourd'hui : les réservations déjà passées ne sont pas effacées, mais si plusieurs sont déjà prises le même jour (à venir), seule la première enregistrée reste active — les autres sont suspendues et leurs auteurs sont prévenus pour choisir un autre jour."}
                      </Text>
                    </View>
                    <Switch
                      value={oneVisitPerDay}
                      onValueChange={handleToggleOneVisitPerDay}
                      disabled={oneVisitPerDayToggling}
                      trackColor={{ false: C.border, true: C.accent }}
                      thumbColor="#fff"
                    />
                  </View>

                  <View style={[styles.fieldDivider, { backgroundColor: C.border }]} />

                  {/* Visiteurs max */}
                  <Text style={[styles.fieldLabel, { color: C.gold }]}>👥 Visiteurs max par créneau</Text>
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={[styles.stepBtn, { backgroundColor: C.bg, borderColor: C.border }]}
                      onPress={() => setMaxVisitors((v) => Math.max(1, v - 1))}
                    >
                      <Text style={[styles.stepBtnText, { color: C.text }]}>−</Text>
                    </TouchableOpacity>
                    <Text style={[styles.stepValue, { color: C.text, minWidth: 32, textAlign: "center" }]}>{maxVisitors}</Text>
                    <TouchableOpacity
                      style={[styles.stepBtn, { backgroundColor: C.bg, borderColor: C.border }]}
                      onPress={() => setMaxVisitors((v) => Math.min(10, v + 1))}
                    >
                      <Text style={[styles.stepBtnText, { color: C.text }]}>+</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.fieldDivider, { backgroundColor: C.border }]} />

                  {/* Jours de visite autorisés */}
                  <Text style={[styles.fieldLabel, { color: C.gold }]}>📅 Jours de visite autorisés</Text>
                  <Text style={[styles.cardDesc, { color: C.muted, marginBottom: 10, marginTop: -4 }]}>
                    Désactivez les jours sans visites possibles.
                  </Text>
                  <View style={styles.weekdayRow}>
                    {[
                      { label: "Lun", js: 1 }, { label: "Mar", js: 2 }, { label: "Mer", js: 3 },
                      { label: "Jeu", js: 4 }, { label: "Ven", js: 5 }, { label: "Sam", js: 6 }, { label: "Dim", js: 0 },
                    ].map(({ label, js }) => {
                      const active = allowedWeekdays.includes(js);
                      return (
                        <TouchableOpacity
                          key={js}
                          onPress={() => toggleWeekday(js)}
                          style={[
                            styles.weekdayBtn,
                            { borderColor: active ? C.accent : C.border, backgroundColor: active ? C.accent : "transparent" },
                          ]}
                        >
                          <Text style={[styles.weekdayBtnText, { color: active ? "#fff" : C.muted }]}>{label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={[styles.fieldDivider, { backgroundColor: C.border }]} />

                  {/* Dates spécifiquement bloquées */}
                  <Text style={[styles.fieldLabel, { color: C.gold }]}>🚫 Dates sans visites</Text>
                  <Text style={[styles.cardDesc, { color: C.muted, marginBottom: 10, marginTop: -4 }]}>
                    Bloquez ponctuellement une date (jour férié, indisponibilité…).
                  </Text>
                  {blockedDates.length > 0 && (
                    <View style={styles.blockedChipRow}>
                      {blockedDates.sort().map((iso) => (
                        <TouchableOpacity
                          key={iso}
                          onPress={() => toggleBlockedDate(iso)}
                          style={[styles.blockedChip, { backgroundColor: "rgba(233,69,96,0.12)", borderColor: "rgba(233,69,96,0.4)" }]}
                        >
                          <Text style={[styles.blockedChipText, { color: "#e94560" }]}>
                            {new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                            {blockedDateReasons[iso] ? ` — ${blockedDateReasons[iso]}` : ""} ✕
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => { setBlockPickerDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); setBlockPickerReason(""); setLastAddedBlockedDate(null); setBlockPickerVisible(true); }}
                    style={[styles.saveNotesBtn, { backgroundColor: C.overlay, borderWidth: 1, borderColor: C.border, marginTop: 4 }]}
                  >
                    <Text style={[styles.saveNotesBtnText, { color: C.muted }]}>+ Ajouter une date bloquée</Text>
                  </TouchableOpacity>

                  <View style={[styles.fieldDivider, { backgroundColor: C.border }]} />

                  <TouchableOpacity
                    style={[styles.saveNotesBtn, { backgroundColor: C.accent, marginTop: 8 }, slotRulesSaving && { opacity: 0.6 }]}
                    onPress={handleSaveSlotRules}
                    disabled={slotRulesSaving}
                  >
                    {slotRulesSaving
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.saveNotesBtnText}>Enregistrer les règles de visite</Text>
                    }
                  </TouchableOpacity>
                </View>

                {/* ── Bloc : Nuitées ────────────────────────────────────────── */}
                <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border, marginTop: 16 }]}>
                  <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 0 }]}>🌙 Nuitées</Text>
                  <View style={styles.nightRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.nightLabel, { color: C.text }]}>
                        {slotConfig.night_enabled ? "Nuitées activées" : "Nuitées suspendues"}
                      </Text>
                      <Text style={[styles.nightDesc, { color: C.muted }]}>
                        {slotConfig.night_enabled
                          ? `Les visiteurs peuvent réserver une nuit (${formatHourMinute(nightStartHour, nightStartMinute)} → ${formatHourMinute(nightEndHour, nightEndMinute)}).`
                          : "Le bloc nuit est masqué pour les visiteurs."}
                      </Text>
                    </View>
                    {nightToggling
                      ? <ActivityIndicator color={C.accent} />
                      : <Switch
                          value={slotConfig.night_enabled}
                          onValueChange={handleToggleNight}
                          trackColor={{ false: C.border, true: C.accent }}
                          thumbColor="#fff"
                        />
                    }
                  </View>

                  <View style={[styles.fieldDivider, { backgroundColor: C.border }]} />

                  <Text style={[styles.fieldLabel, { color: C.gold }]}>⏰ Heures de nuitée</Text>
                  <View style={styles.hourRow}>
                    <View style={styles.hourBlock}>
                      <Text style={[styles.hourLabel, { color: C.muted }]}>Début</Text>
                      <TouchableOpacity
                        style={[styles.timeBtn, { backgroundColor: C.bg, borderColor: C.border }]}
                        onPress={() => {
                          if (Platform.OS === "android") {
                            openAndroidTimePicker(hourToDate(nightStartHour, nightStartMinute), (date) => {
                              setNightStartHour(date.getHours());
                              setNightStartMinute(date.getMinutes());
                            });
                          } else {
                            setShowNightStartPicker(true);
                          }
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.timeBtnText, { color: C.text }]}>🕐 {formatHourMinute(nightStartHour, nightStartMinute)}</Text>
                      </TouchableOpacity>
                      {showNightStartPicker && (
                        <DateTimePicker
                          value={hourToDate(nightStartHour, nightStartMinute)}
                          mode="time"
                          is24Hour
                          display={Platform.OS === "ios" ? "spinner" : "clock"}
                          onChange={(_, date) => {
                            setShowNightStartPicker(false);
                            if (date) {
                              setNightStartHour(date.getHours());
                              setNightStartMinute(date.getMinutes());
                            }
                          }}
                        />
                      )}
                    </View>
                    <Text style={[styles.hourSep, { color: C.muted }]}>→</Text>
                    <View style={styles.hourBlock}>
                      <Text style={[styles.hourLabel, { color: C.muted }]}>Fin (lendemain)</Text>
                      <TouchableOpacity
                        style={[styles.timeBtn, { backgroundColor: C.bg, borderColor: C.border }]}
                        onPress={() => {
                          if (Platform.OS === "android") {
                            openAndroidTimePicker(hourToDate(nightEndHour, nightEndMinute), (date) => {
                              setNightEndHour(date.getHours());
                              setNightEndMinute(date.getMinutes());
                            });
                          } else {
                            setShowNightEndPicker(true);
                          }
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.timeBtnText, { color: C.text }]}>🕐 {formatHourMinute(nightEndHour, nightEndMinute)}</Text>
                      </TouchableOpacity>
                      {showNightEndPicker && (
                        <DateTimePicker
                          value={hourToDate(nightEndHour, nightEndMinute)}
                          mode="time"
                          is24Hour
                          display={Platform.OS === "ios" ? "spinner" : "clock"}
                          onChange={(_, date) => {
                            setShowNightEndPicker(false);
                            if (date) {
                              setNightEndHour(date.getHours());
                              setNightEndMinute(date.getMinutes());
                            }
                          }}
                        />
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.saveNotesBtn, { backgroundColor: C.accent, marginTop: 8 }, nightHoursSaving && { opacity: 0.6 }]}
                    onPress={handleSaveNightHours}
                    disabled={nightHoursSaving}
                  >
                    {nightHoursSaving
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.saveNotesBtnText}>Enregistrer les heures de nuitée</Text>
                    }
                  </TouchableOpacity>
                </View>

                {/* ── Bloc : Intervenants ───────────────────────────────────── */}
                {space && (
                  <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border, marginTop: 16 }]}>
                    <Text style={[styles.fieldLabel, { color: C.orange, marginTop: 0 }]}>🩺 Planning des intervenants</Text>
                    <View style={styles.nightRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.nightLabel, { color: C.text }]}>
                          {space.intervenants_enabled ? "Planning des intervenants activé" : "Planning des intervenants désactivé"}
                        </Text>
                        <Text style={[styles.nightDesc, { color: C.muted }]}>
                          {space.intervenants_enabled
                            ? "Les infirmier·ères, kinés et aides à domicile peuvent réserver leurs interventions, prioritaires sur les visites."
                            : "Active cette option pour permettre à des intervenants (infirmier·ère, kiné, aide à domicile…) de gérer leur propre planning."}
                        </Text>
                      </View>
                      {intervenantsToggling
                        ? <ActivityIndicator color={C.orange} />
                        : <Switch
                            value={space.intervenants_enabled}
                            onValueChange={handleToggleIntervenants}
                            trackColor={{ false: C.border, true: C.orange }}
                            thumbColor="#fff"
                          />
                      }
                    </View>

                    {space.intervenants_enabled && (
                      <>
                        <View style={[styles.fieldDivider, { backgroundColor: C.border }]} />
                        <TouchableOpacity
                          style={[styles.saveNotesBtn, { backgroundColor: C.orange }]}
                          onPress={() => router.push("/(admin)/intervenants")}
                        >
                          <Text style={styles.saveNotesBtnText}>🩺 Planning des intervenants →</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
              </>
            )}
          </>
        ) : (
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.cardDesc, { color: C.muted }]}>
              Aucun espace patient actif.{"\n"}Rendez-vous sur avectoi.care pour créer votre espace.
            </Text>
          </View>
        )}

        {/* ── Section : Historique (sous-blocs Visiteurs, Intervenants, puis Historique) ── */}
        {hasSpace && space && activeSection === "hist" && (
          <VisitorsBlock spaceId={space.id} C={C} adminFirstname={space.admin_firstname} adminLastname={space.admin_lastname} />
        )}
        {hasSpace && space && activeSection === "hist" && (
          <IntervenantsBlock spaceId={space.id} C={C} />
        )}
        {hasSpace && space && activeSection === "hist" && (
          <>
            <Text style={[styles.sectionTitle, { color: C.gold }]}>Historique</Text>
            <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
              <TextInput
                style={[styles.sectorInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text, marginBottom: 16 }]}
                placeholder="🔍 Rechercher un mot-clé (toutes rubriques)…"
                placeholderTextColor={C.muted}
                value={historySearch}
                onChangeText={setHistorySearch}
              />

              {/* Bloc 1 : Infos hospitalières */}
              <TouchableOpacity style={styles.historyBlockHeader} onPress={() => toggleHistoryBlock("hosp")} activeOpacity={0.7}>
                <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 0 }]}>
                  🏥 Infos hospitalières{hospitalFieldHistory.length > 0 ? ` (${hospitalFieldHistory.length})` : ""}
                </Text>
                <Text style={[styles.historyToggleIcon, { color: C.muted }]}>{historyBlocksOpen.hosp ? "▾" : "▸"}</Text>
              </TouchableOpacity>
              {historyBlocksOpen.hosp && (
                historyLoading ? (
                  <ActivityIndicator color={C.accent} style={{ marginVertical: 8 }} />
                ) : hospitalFieldHistory.length === 0 ? (
                  <Text style={[styles.historyEmpty, { color: C.muted }]}>Aucun changement trouvé.</Text>
                ) : (
                  hospitalFieldHistory.map((h) => (
                    <View key={h.id} style={[styles.historyRow, { borderLeftColor: C.accent }]}>
                      <Text style={[styles.historyField, { color: C.text }]}>
                        {FIELD_ICONS[h.field_name] ?? "✏️"} {FIELD_LABELS[h.field_name] ?? h.field_name}
                        {h.new_value ? ` → "${h.new_value}"` : " → (vide)"}
                      </Text>
                      {h.old_value != null && (
                        <Text style={[styles.historyOld, { color: C.muted }]}>était : {h.old_value || "(vide)"}</Text>
                      )}
                      <Text style={[styles.historyDate, { color: C.muted }]}>
                        {new Date(h.changed_at).toLocaleString("fr-FR", {
                          day: "numeric", month: "long", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </Text>
                    </View>
                  ))
                )
              )}

              <View style={[styles.fieldDivider, { backgroundColor: C.border }]} />

              {/* Bloc 2 : Règles de visite */}
              <TouchableOpacity style={styles.historyBlockHeader} onPress={() => toggleHistoryBlock("regles")} activeOpacity={0.7}>
                <Text style={[styles.fieldLabel, { color: C.gold }]}>
                  ⏰ Règles de visite{slotRuleFieldHistory.length > 0 ? ` (${slotRuleFieldHistory.length})` : ""}
                </Text>
                <Text style={[styles.historyToggleIcon, { color: C.muted }]}>{historyBlocksOpen.regles ? "▾" : "▸"}</Text>
              </TouchableOpacity>
              {historyBlocksOpen.regles && (
                historyLoading ? (
                  <ActivityIndicator color={C.accent} style={{ marginVertical: 8 }} />
                ) : slotRuleFieldHistory.length === 0 ? (
                  <Text style={[styles.historyEmpty, { color: C.muted }]}>Aucun changement trouvé.</Text>
                ) : (
                  slotRuleFieldHistory.map((h) => (
                    <View key={h.id} style={[styles.historyRow, { borderLeftColor: C.accent }]}>
                      <Text style={[styles.historyField, { color: C.text }]}>
                        {FIELD_ICONS[h.field_name] ?? "✏️"} {FIELD_LABELS[h.field_name] ?? h.field_name}
                        {h.new_value ? ` → ${h.new_value}` : " → (vide)"}
                      </Text>
                      {h.old_value != null && (
                        <Text style={[styles.historyOld, { color: C.muted }]}>était : {h.old_value || "(vide)"}</Text>
                      )}
                      <Text style={[styles.historyDate, { color: C.muted }]}>
                        {new Date(h.changed_at).toLocaleString("fr-FR", {
                          day: "numeric", month: "long", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </Text>
                    </View>
                  ))
                )
              )}

              <View style={[styles.fieldDivider, { backgroundColor: C.border }]} />

              {/* Bloc 3 : Consignes de visite */}
              <TouchableOpacity style={styles.historyBlockHeader} onPress={() => toggleHistoryBlock("consignes")} activeOpacity={0.7}>
                <Text style={[styles.fieldLabel, { color: C.gold }]}>
                  📝 Consignes de visite{visitRulesHistory.length > 0 ? ` (${visitRulesHistory.length})` : ""}
                </Text>
                <Text style={[styles.historyToggleIcon, { color: C.muted }]}>{historyBlocksOpen.consignes ? "▾" : "▸"}</Text>
              </TouchableOpacity>
              {historyBlocksOpen.consignes && (
                historyLoading ? (
                  <ActivityIndicator color={C.accent} style={{ marginVertical: 8 }} />
                ) : visitRulesHistory.length === 0 ? (
                  <Text style={[styles.historyEmpty, { color: C.muted }]}>Aucune modification enregistrée.</Text>
                ) : (
                  visitRulesHistory.map((h) => (
                    <View key={h.id} style={[styles.historyRow, { borderLeftColor: C.accent }]}>
                      <Text style={[styles.historyField, { color: C.text }]}>
                        {h.new_value ? `→ "${h.new_value}"` : "→ (vide)"}
                      </Text>
                      {h.old_value != null && (
                        <Text style={[styles.historyOld, { color: C.muted }]}>était : {h.old_value || "(vide)"}</Text>
                      )}
                      <Text style={[styles.historyDate, { color: C.muted }]}>
                        {new Date(h.changed_at).toLocaleString("fr-FR", {
                          day: "numeric", month: "long", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </Text>
                    </View>
                  ))
                )
              )}

              <View style={[styles.fieldDivider, { backgroundColor: C.border }]} />

              {/* Bloc 4 : Modification de réservations — recasages/annulations
                  automatiques posés par apply_slot_rule_change() lors d'un
                  changement de règles. Historique permanent (reservation_change_history),
                  distinct des alertes reservations.alert_* qui s'effacent dès que
                  la réservation concernée est modifiée. */}
              <TouchableOpacity style={styles.historyBlockHeader} onPress={() => toggleHistoryBlock("resa")} activeOpacity={0.7}>
                <Text style={[styles.fieldLabel, { color: C.gold }]}>
                  🔁 Modification de réservations{filteredReservationChangeHistory.length > 0 ? ` (${filteredReservationChangeHistory.length})` : ""}
                </Text>
                <Text style={[styles.historyToggleIcon, { color: C.muted }]}>{historyBlocksOpen.resa ? "▾" : "▸"}</Text>
              </TouchableOpacity>
              {historyBlocksOpen.resa && (
                resaHistoryLoading ? (
                  <ActivityIndicator color={C.accent} style={{ marginVertical: 8 }} />
                ) : filteredReservationChangeHistory.length === 0 ? (
                  <Text style={[styles.historyEmpty, { color: C.muted }]}>Aucune modification enregistrée.</Text>
                ) : (
                  filteredReservationChangeHistory.map((h) => {
                    const frDate = (iso: string | null) =>
                      iso ? new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";
                    const changeLine =
                      h.change_type === "night_cancelled"
                        ? `${frDate(h.previous_date)} à ${h.previous_creneau} — nuitée annulée`
                        : h.change_type === "rebooking_failed"
                        ? `${frDate(h.previous_date)} à ${h.previous_creneau} → non replacé`
                        : `${frDate(h.previous_date)} à ${h.previous_creneau} → ${frDate(h.new_date)} à ${h.new_creneau}`;
                    return (
                      <View key={h.id} style={[styles.historyRow, { borderLeftColor: C.danger }]}>
                        <Text style={[styles.historyField, { color: C.text }]}>
                          {h.change_type === "night_cancelled" ? "🌙" : "☀️"} {h.prenom} {h.nom}
                        </Text>
                        <Text style={[styles.historyOld, { color: C.muted }]}>{changeLine}</Text>
                        <Text style={[styles.historyMsg, { color: C.danger }]}>{h.message}</Text>
                        <Text style={[styles.historyDate, { color: C.muted }]}>
                          {new Date(h.changed_at).toLocaleString("fr-FR", {
                            day: "numeric", month: "long", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </Text>
                      </View>
                    );
                  })
                )
              )}

              <View style={[styles.fieldDivider, { backgroundColor: C.border }]} />

              {/* Bloc 5 : Publications */}
              <TouchableOpacity style={styles.historyBlockHeader} onPress={() => toggleHistoryBlock("pub")} activeOpacity={0.7}>
                <Text style={[styles.fieldLabel, { color: C.gold }]}>
                  📢 Publications ({filteredPubNews.length + filteredPubTasks.length + filteredPubMessages.length})
                </Text>
                <Text style={[styles.historyToggleIcon, { color: C.muted }]}>{historyBlocksOpen.pub ? "▾" : "▸"}</Text>
              </TouchableOpacity>
              {historyBlocksOpen.pub && (
                pubLoading ? (
                  <ActivityIndicator color={C.accent} style={{ marginVertical: 8 }} />
                ) : (
                  <>
                    <Text style={[styles.historySubGroup, { color: C.muted }]}>📰 Nouvelles du jour ({filteredPubNews.length})</Text>
                    {filteredPubNews.length === 0 ? (
                      <Text style={[styles.historyEmpty, { color: C.muted }]}>Aucune nouvelle trouvée.</Text>
                    ) : (
                      filteredPubNews.map((n) => (
                        <TouchableOpacity
                          key={n.id}
                          style={[styles.historyRow, styles.historyRowPressable, { borderLeftColor: C.accent }]}
                          onPress={() => router.push({ pathname: "/(admin)/news", params: { focusEntryId: n.id } } as any)}
                          activeOpacity={0.7}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.historyField, { color: C.text }]} numberOfLines={2}>{n.content}</Text>
                            <Text style={[styles.historyDate, { color: C.muted }]}>
                              {n.author_prenom} {n.author_nom} · {new Date(n.created_at).toLocaleString("fr-FR", {
                                day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
                              })}
                            </Text>
                          </View>
                          <Text style={[styles.historyRowChevron, { color: C.muted }]}>›</Text>
                        </TouchableOpacity>
                      ))
                    )}

                    <Text style={[styles.historySubGroup, { color: C.muted, marginTop: 10 }]}>🤝 Entraide — besoins ({filteredPubTasks.length})</Text>
                    {filteredPubTasks.length === 0 ? (
                      <Text style={[styles.historyEmpty, { color: C.muted }]}>Aucun besoin trouvé.</Text>
                    ) : (
                      filteredPubTasks.map((t) => (
                        <TouchableOpacity
                          key={t.id}
                          style={[styles.historyRow, styles.historyRowPressable, { borderLeftColor: C.accent }]}
                          onPress={() => router.push({ pathname: "/(admin)/entraide", params: { focusTaskId: t.id } } as any)}
                          activeOpacity={0.7}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.historyField, { color: C.text }]} numberOfLines={1}>
                              {TASK_CAT_ICONS[t.category]} {t.title}
                            </Text>
                            <Text style={[styles.historyDate, { color: C.muted }]}>
                              {new Date(t.created_at).toLocaleString("fr-FR", {
                                day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
                              })}
                            </Text>
                          </View>
                          <Text style={[styles.historyRowChevron, { color: C.muted }]}>›</Text>
                        </TouchableOpacity>
                      ))
                    )}

                    <Text style={[styles.historySubGroup, { color: C.muted, marginTop: 10 }]}>💛 Mur de soutien ({filteredPubMessages.length})</Text>
                    {filteredPubMessages.length === 0 ? (
                      <Text style={[styles.historyEmpty, { color: C.muted }]}>Aucun message trouvé.</Text>
                    ) : (
                      filteredPubMessages.map((m) => (
                        <TouchableOpacity
                          key={m.id}
                          style={[styles.historyRow, styles.historyRowPressable, { borderLeftColor: C.accent }]}
                          onPress={() => router.push({ pathname: "/(admin)/soutien", params: { focusMessageId: m.id } } as any)}
                          activeOpacity={0.7}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.historyField, { color: C.text }]} numberOfLines={2}>{m.message}</Text>
                            <Text style={[styles.historyDate, { color: C.muted }]}>
                              {m.author_prenom} {m.author_nom} · {new Date(m.created_at).toLocaleString("fr-FR", {
                                day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
                              })}
                            </Text>
                          </View>
                          <Text style={[styles.historyRowChevron, { color: C.muted }]}>›</Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </>
                )
              )}
            </View>

            {/* ── Bloc : Chronologie ───────────────────────────────────────── */}
            <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border, marginTop: 16 }]}>
              <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 0 }]}>🕐 Chronologie</Text>
              <Text style={[styles.cardDesc, { color: C.muted }]}>
                Frise chronologique du passage {space.home_care_mode ? "en soin à domicile" : "à l'hôpital"} : infos hospitalières,
                consignes et règles de visite, visites et nuitées réservées, besoins publiés (hors Transport).
              </Text>
              <TouchableOpacity
                style={[styles.saveNotesBtn, { backgroundColor: C.accent, borderWidth: 1, borderColor: C.accent }]}
                onPress={openChronoModal}
              >
                <Text style={[styles.saveNotesBtnText, { color: "#fff" }]}>Chronologie</Text>
              </TouchableOpacity>
            </View>

            {/* ── Bloc : Conservation des données ─────────────────────────── */}
            {(() => {
              const purgeDate = new Date(space.purge_scheduled_at);
              const todayMs = new Date().setHours(0, 0, 0, 0);
              const daysLeft = Math.ceil((purgeDate.getTime() - todayMs) / (1000 * 60 * 60 * 24));
              const purgeDateFr = purgeDate.toLocaleDateString("fr-FR", {
                day: "numeric", month: "long", year: "numeric",
              });
              const isUrgent = daysLeft <= 7;
              const isWarning = daysLeft <= 30;
              const alertColor = isUrgent ? "#e94560" : isWarning ? C.orange : C.muted;

              return (
                <View style={[styles.card, {
                  backgroundColor: C.card,
                  borderColor: isUrgent ? "rgba(233,69,96,0.5)" : isWarning ? "rgba(230,126,34,0.4)" : C.border,
                  padding: 12,
                  marginTop: 16,
                }]}>
                  <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 0 }]}>🗄️ Conservation des données</Text>
                  <View style={styles.rgpdRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rgpdLabel, { color: C.muted }]}>Suppression prévue le</Text>
                      <Text style={[styles.rgpdDate, { color: isUrgent ? C.danger : C.text, fontSize: 15 }]}>
                        {purgeDateFr}
                      </Text>
                      <Text style={[styles.rgpdDays, { color: alertColor }]}>
                        {daysLeft > 0
                          ? `J-${daysLeft}${isUrgent ? " ⚠️  Suppression imminente" : isWarning ? " — Pensez à prolonger" : ""}`
                          : "Expiration dépassée"
                        }
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.cardDesc, { color: C.muted, fontSize: 12, lineHeight: 17, marginTop: 8, marginBottom: 10 }]}>
                    Planning, souvenirs et messages seront définitivement supprimés à cette date. Conforme RGPD.
                  </Text>

                  <TouchableOpacity
                    style={[styles.prolongBtn, { backgroundColor: C.accent, paddingVertical: 10 }, prolonging && { opacity: 0.6 }]}
                    onPress={handleProlong}
                    disabled={prolonging}
                  >
                    {prolonging
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={[styles.prolongBtnText, { textAlign: "center" }]}>⏳ Prolonger de 30 jours{"\n"}(renouvelable gratuitement)</Text>
                    }
                  </TouchableOpacity>
                </View>
              );
            })()}
          </>
        )}

      </ScrollView>

      {/* ── Barre horizontale fixe de navigation des réglages ────────────── */}
      {hasSpace && space && (
        <View
          style={[
            styles.settingsNavBar,
            { backgroundColor: C.card, borderTopColor: C.border, bottom: 0, height: SETTINGS_NAV_BAR_HEIGHT },
          ]}
        >
          {/* En-tête de rubrique "Paramètres" — non cliquable, marque juste que
              les onglets Lieux/Infos/Règles/Histo sont ses sous-menus. */}
          <View style={styles.settingsNavBtn}>
            <View style={[styles.settingsNavIconWrap, { backgroundColor: `${C.gold}33` }]}>
              <Text style={styles.settingsNavIconText}>⚙️</Text>
            </View>
          </View>
          {SETTINGS_NAV_ORDER.map((key) => {
            const isDisabled = key === "regles" && !slotConfig;
            const isActive = activeSection === key;
            return (
              <TouchableOpacity
                key={key}
                style={styles.settingsNavBtn}
                onPress={() => openSection(key)}
                disabled={isDisabled}
                activeOpacity={0.75}
              >
                <View style={[styles.settingsNavIconWrap, isActive && { backgroundColor: C.accent }]}>
                  <Text style={[styles.settingsNavIconText, { opacity: isDisabled ? 0.35 : 1 }]}>
                    {SECTION_META[key].icon}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.settingsNavLabel,
                    { color: isActive ? C.accent : C.muted, opacity: isDisabled ? 0.35 : 1 },
                  ]}
                >
                  {SETTINGS_NAV_LABELS[key]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ── MODAL CALENDRIER DATES BLOQUÉES ─────────────────────────────── */}
      <Modal visible={blockPickerVisible} transparent animationType="slide" onRequestClose={() => setBlockPickerVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setBlockPickerVisible(false)}>
            <TouchableOpacity activeOpacity={1}>
              <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.border }]}>
                <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 0 }]}>Motif (optionnel)</Text>
                <TextInput
                  style={[styles.sectorInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text, marginBottom: 12 }]}
                  placeholder="Ex : Jour férié, indisponibilité…"
                  placeholderTextColor={C.muted}
                  value={blockPickerReason}
                  onChangeText={(text) => {
                    setBlockPickerReason(text);
                    if (lastAddedBlockedDate) {
                      setBlockedDateReasons((prev) => {
                        const next = { ...prev };
                        if (text.trim()) next[lastAddedBlockedDate] = text.trim();
                        else delete next[lastAddedBlockedDate];
                        return next;
                      });
                    }
                  }}
                />

                {/* Navigation mois */}
                <View style={styles.calNavRow}>
                  <TouchableOpacity
                    onPress={() => setBlockPickerDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                    style={styles.calNavBtn}
                  >
                    <Text style={[styles.calNavText, { color: C.muted }]}>‹</Text>
                  </TouchableOpacity>
                  <Text style={[styles.calMonthTitle, { color: C.text }]}>
                    {blockPickerDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setBlockPickerDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                    style={styles.calNavBtn}
                  >
                    <Text style={[styles.calNavText, { color: C.muted }]}>›</Text>
                  </TouchableOpacity>
                </View>

                {/* En-tête jours */}
                <View style={styles.calHeaderRow}>
                  {["L","M","M","J","V","S","D"].map((d, i) => (
                    <Text key={i} style={[styles.calHeaderCell, { color: C.muted }]}>{d}</Text>
                  ))}
                </View>

                {/* Grille jours */}
                {(() => {
                  const today = new Date(); today.setHours(0,0,0,0);
                  const year = blockPickerDate.getFullYear();
                  const month = blockPickerDate.getMonth();
                  const firstDay = new Date(year, month, 1);
                  // Padding (JS Sunday=0 → French Mon=0, shift: (jsDay + 6) % 7)
                  const firstWeekdayFr = (firstDay.getDay() + 6) % 7;
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const cells: (number | null)[] = [
                    ...Array(firstWeekdayFr).fill(null),
                    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
                  ];
                  // Pad to full rows
                  while (cells.length % 7 !== 0) cells.push(null);

                  const rows: (number | null)[][] = [];
                  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

                  return rows.map((row, ri) => (
                    <View key={ri} style={styles.calRow}>
                      {row.map((day, ci) => {
                        if (!day) return <View key={ci} style={styles.calCell} />;
                        const d = new Date(year, month, day);
                        d.setHours(0,0,0,0);
                        const iso = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                        const isPast = d < today;
                        const isBlocked = blockedDates.includes(iso);
                        return (
                          <TouchableOpacity
                            key={ci}
                            style={[
                              styles.calCell,
                              isBlocked && { backgroundColor: "rgba(233,69,96,0.18)", borderRadius: 20 },
                            ]}
                            onPress={() => { if (!isPast) { toggleBlockedDate(iso); } }}
                            disabled={isPast}
                            activeOpacity={isPast ? 1 : 0.7}
                          >
                            <Text style={[
                              styles.calDayText,
                              { color: isPast ? C.border : isBlocked ? "#e94560" : C.text },
                            ]}>
                              {day}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ));
                })()}

                <TouchableOpacity
                  onPress={() => setBlockPickerVisible(false)}
                  style={[styles.saveNotesBtn, { backgroundColor: C.accent, marginTop: 16 }]}
                >
                  <Text style={styles.saveNotesBtnText}>Fermer</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL PROFIL PATIENT (photo + nom + thème) ──────────────────── */}
      <Modal visible={editProfileModal} transparent animationType="slide" onRequestClose={() => setEditProfileModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={styles.overlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setEditProfileModal(false)}
            />
            <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.accent, maxHeight: SHEET_MAX_HEIGHT }]}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={[styles.sheetTitle, { color: C.text }]}>✏️ Modifier le profil patient</Text>

                  <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 0 }]}>Photo</Text>
                  <Text style={[styles.cardDesc, { color: C.muted }]}>
                    Affichée en avatar dans l'app pour tous les visiteurs. Ronde, centrée sur le visage.
                  </Text>
                  <View style={styles.photoRow}>
                    <PatientAvatar
                      photoUrl={displayPhotoUrl}
                      firstname={space?.patient_firstname ?? ""}
                      lastname={space?.patient_lastname ?? ""}
                      size={72}
                      C={C}
                    />
                    <View style={{ flex: 1, gap: 8 }}>
                      <TouchableOpacity
                        style={[styles.photoBtn, { backgroundColor: C.accent }]}
                        onPress={handlePhotoUpload}
                        disabled={photoUploading}
                      >
                        {photoUploading
                          ? <ActivityIndicator color="#fff" size="small" />
                          : <Text style={styles.photoBtnText}>
                              {displayPhotoUrl ? "Changer la photo" : "Ajouter une photo"}
                            </Text>
                        }
                      </TouchableOpacity>
                      {displayPhotoUrl && (
                        <TouchableOpacity
                          style={[styles.photoBtn, { borderWidth: 1, borderColor: "rgba(233,69,96,0.4)", backgroundColor: "rgba(233,69,96,0.08)" }]}
                          onPress={handleRemovePhoto}
                        >
                          <Text style={[styles.photoBtnText, { color: "#e94560" }]}>Supprimer</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 14 }]}>💬 Phrase totem (optionnel)</Text>
                  <TextInput
                    style={[styles.sectorInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
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
                    style={[styles.sectorInput, { backgroundColor: C.bg, borderColor: C.border }]}
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
                        if (date) setPatientAdmissionDate(isoDate(date));
                      }}
                    />
                  )}
                  <Text style={[styles.cardDesc, { color: C.muted }]}>
                    Date d'entrée à l'hôpital — visible dans la fiche patient.
                  </Text>

                  <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 14 }]}>🚪 Date de sortie d'hospitalisation (optionnel)</Text>
                  <TouchableOpacity
                    style={[styles.sectorInput, { backgroundColor: C.bg, borderColor: C.border }]}
                    onPress={openDischargeDatePicker}
                    activeOpacity={0.75}
                  >
                    <Text style={{ fontFamily: "DM_Sans_400Regular", fontSize: 14, color: dischargeDateLabel ? C.text : C.muted }}>
                      {dischargeDateLabel ?? "Sélectionner une date"}
                    </Text>
                  </TouchableOpacity>
                  {showDischargeDatePicker && (
                    <DateTimePicker
                      value={dischargeDateValue}
                      mode="date"
                      display="spinner"
                      maximumDate={new Date()}
                      onChange={(_, date) => {
                        setShowDischargeDatePicker(false);
                        if (date) setPatientDischargeDate(isoDate(date));
                      }}
                    />
                  )}
                  <Text style={[styles.cardDesc, { color: C.muted }]}>
                    Date de fin de séjour — apparaît dans la Chronologie une fois renseignée.
                  </Text>

                  <View style={[styles.fieldDivider, { backgroundColor: C.border }]} />

                  <Text style={[styles.fieldLabel, { color: C.gold }]}>Nom du patient</Text>
                  <Text style={[styles.cardDesc, { color: C.muted, marginBottom: 8 }]}>
                    Le nom et prénom ne peuvent pas être modifiés directement. En cas d'erreur ou de changement, contactez le service client.
                  </Text>
                  <TouchableOpacity
                    style={[styles.saveNotesBtn, { backgroundColor: C.overlay, borderWidth: 1, borderColor: C.border }]}
                    onPress={handleOpenNameChange}
                  >
                    <Text style={[styles.saveNotesBtnText, { color: C.muted }]}>✏️ Demander un changement de nom</Text>
                  </TouchableOpacity>

                  <View style={[styles.fieldDivider, { backgroundColor: C.border }]} />

                  <Text style={[styles.fieldLabel, { color: C.gold }]}>🎂 Date de naissance</Text>
                  <Text style={[styles.cardDesc, { color: C.muted, marginBottom: 8 }]}>
                    Visible de tous les visiteurs (âge affiché + anniversaire).
                  </Text>
                  <View style={{ flexDirection: "row", gap: 5 }}>
                    <TouchableOpacity
                      style={[styles.bdFieldBtn, { backgroundColor: C.bg, borderColor: C.border, flex: 0.75 }]}
                      onPress={() => setBdPickerField("day")}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.bdFieldLabel, { color: C.muted }]}>Jour</Text>
                      <View style={styles.bdFieldValueRow}>
                        <Text style={[styles.bdFieldValue, { color: bdDay ? C.text : C.muted }]}>{bdDay ?? "—"}</Text>
                        <Text style={[styles.bdFieldChevron, { color: C.accent }]}>▾</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.bdFieldBtn, { backgroundColor: C.bg, borderColor: C.border, flex: 1.5 }]}
                      onPress={() => setBdPickerField("month")}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.bdFieldLabel, { color: C.muted }]}>Mois</Text>
                      <View style={styles.bdFieldValueRow}>
                        <Text
                          style={[styles.bdFieldValue, { color: bdMonth ? C.text : C.muted }]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                        >
                          {bdMonth ? BIRTH_MONTHS[bdMonth - 1] : "—"}
                        </Text>
                        <Text style={[styles.bdFieldChevron, { color: C.accent }]}>▾</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.bdFieldBtn, { backgroundColor: C.bg, borderColor: C.border, flex: 0.75 }]}
                      onPress={() => setBdPickerField("year")}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.bdFieldLabel, { color: C.muted }]}>Année</Text>
                      <View style={styles.bdFieldValueRow}>
                        <Text style={[styles.bdFieldValue, { color: bdYear ? C.text : C.muted }]}>{bdYear ?? "—"}</Text>
                        <Text style={[styles.bdFieldChevron, { color: C.accent }]}>▾</Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  <Modal
                    visible={bdPickerField !== null}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setBdPickerField(null)}
                  >
                    <TouchableOpacity style={styles.bdPickerOverlay} activeOpacity={1} onPress={() => setBdPickerField(null)}>
                      <TouchableOpacity activeOpacity={1}>
                        <View
                          style={[
                            styles.bdPickerCard,
                            { backgroundColor: C.card, borderColor: C.border, width: bdPickerField === "month" ? 200 : 150 },
                          ]}
                        >
                          <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 0, textAlign: "center" }]}>
                            {bdPickerField === "day" ? "Jour" : bdPickerField === "month" ? "Mois" : "Année"}
                          </Text>
                          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 260 }}>
                            {(bdPickerField === "day" ? BIRTH_DAYS : bdPickerField === "month" ? BIRTH_MONTHS.map((_, i) => i + 1) : BIRTH_YEARS).map((v) => {
                              const label = bdPickerField === "month" ? BIRTH_MONTHS[(v as number) - 1] : String(v);
                              const selected = bdPickerField === "day" ? bdDay === v : bdPickerField === "month" ? bdMonth === v : bdYear === v;
                              return (
                                <TouchableOpacity
                                  key={v}
                                  style={[styles.bdPickerRow, selected && { backgroundColor: C.accent + "22" }]}
                                  onPress={() => updateBirthdatePart(bdPickerField as "day" | "month" | "year", v as number)}
                                >
                                  <Text style={[styles.bdPickerRowText, { color: selected ? C.accent : C.text }]}>{label}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        </View>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  </Modal>

                  <View style={[styles.fieldDivider, { backgroundColor: C.border }]} />

                  <Text style={[styles.fieldLabel, { color: C.gold }]}>Sexe</Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      style={[
                        styles.bloodChip,
                        { backgroundColor: patientSex === "M" ? C.accent : C.bg, borderColor: patientSex === "M" ? C.accent : C.border, flex: 1 },
                      ]}
                      onPress={() => setPatientSex("M")}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.bloodChipText, { color: patientSex === "M" ? "#fff" : C.text, textAlign: "center" }]}>♂ Homme</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.bloodChip,
                        { backgroundColor: patientSex === "F" ? "#f97316" : C.bg, borderColor: patientSex === "F" ? "#f97316" : C.border, flex: 1 },
                      ]}
                      onPress={() => setPatientSex("F")}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.bloodChipText, { color: patientSex === "F" ? "#fff" : C.text, textAlign: "center" }]}>♀ Femme</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.fieldDivider, { backgroundColor: C.border }]} />

                  <Text style={[styles.fieldLabel, { color: C.gold }]}>🩸 Groupe sanguin</Text>
                  <Text style={[styles.cardDesc, { color: C.muted, marginBottom: 8 }]}>
                    En cas de besoin ponctuel de transfusion, les proches pourront proposer de donner leur sang.
                  </Text>
                  <View style={styles.bloodGroupWrap}>
                    {BLOOD_GROUPS.map((pair) => (
                      <View key={pair[0]} style={styles.bloodGroupRow}>
                        {pair.map((bt) => {
                          const selected = patientBloodType === bt;
                          return (
                            <TouchableOpacity
                              key={bt}
                              style={[
                                styles.bloodChip,
                                styles.bloodChipHalf,
                                { backgroundColor: selected ? "#f97316" : C.bg, borderColor: selected ? "#f97316" : C.border },
                              ]}
                              onPress={() => setPatientBloodType(selected ? null : bt)}
                              activeOpacity={0.75}
                            >
                              <Text style={[styles.bloodChipText, { color: selected ? "#fff" : C.text, textAlign: "center" }]}>{bt}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ))}
                  </View>

                  <View style={[styles.fieldDivider, { backgroundColor: C.border }]} />

                  <Text style={[styles.fieldLabel, { color: C.gold }]}>⚠️ Allergies</Text>
                  <Text style={[styles.cardDesc, { color: C.muted, marginBottom: 8 }]}>
                    Affichées en rappel aux proches qui publient ou prennent en charge un besoin "Repas".
                  </Text>
                  <View style={styles.allergyGrid}>
                    {COMMON_ALLERGIES.map((item) => {
                      const checked = allergyChecks.has(item);
                      return (
                        <TouchableOpacity
                          key={item}
                          style={styles.allergyRow}
                          onPress={() => toggleAllergyCheck(item)}
                          activeOpacity={0.65}
                        >
                          <View style={[styles.allergyDot, { borderColor: checked ? "#f97316" : C.border }, checked && styles.allergyDotFilled]} />
                          <Text style={[styles.allergyRowText, { color: checked ? C.text : C.muted }]}>{item}</Text>
                        </TouchableOpacity>
                      );
                    })}
                    <TouchableOpacity
                      style={styles.allergyRow}
                      onPress={() => setAllergyOtherChecked((v) => !v)}
                      activeOpacity={0.65}
                    >
                      <View style={[styles.allergyDot, { borderColor: allergyOtherChecked ? "#f97316" : C.border }, allergyOtherChecked && styles.allergyDotFilled]} />
                      <Text style={[styles.allergyRowText, { color: allergyOtherChecked ? C.text : C.muted }]}>Autre</Text>
                    </TouchableOpacity>
                  </View>

                  {allergyOtherChecked && (
                    <TextInput
                      style={[styles.notesInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text, marginTop: 10 }]}
                      placeholder="Précise la ou les autres allergies..."
                      placeholderTextColor={C.muted}
                      value={allergyOtherText}
                      onChangeText={setAllergyOtherText}
                      multiline
                      numberOfLines={2}
                      textAlignVertical="top"
                    />
                  )}

                  <TouchableOpacity
                    style={[styles.saveNotesBtn, { backgroundColor: C.accent, marginTop: 8 }, patientMedicalSaving && { opacity: 0.6 }]}
                    onPress={handleSavePatientMedical}
                    disabled={patientMedicalSaving}
                  >
                    {patientMedicalSaving
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={styles.saveNotesBtnText}>Enregistrer la fiche patient</Text>
                    }
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setEditProfileModal(false)}
                    style={[styles.saveNotesBtn, { backgroundColor: C.accent, marginTop: 8 }]}
                  >
                    <Text style={styles.saveNotesBtnText}>Fermer</Text>
                  </TouchableOpacity>
                </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL SUPPRESSION PHOTO PATIENT ──────────────────────────────── */}
      <Modal visible={removePhotoModal} transparent animationType="slide" onRequestClose={() => setRemovePhotoModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setRemovePhotoModal(false)}>
          <TouchableOpacity activeOpacity={1}>
            <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.danger }]}>
              <View style={{ alignItems: "center", marginBottom: 4 }}>
                <Text style={{ fontSize: 32, marginBottom: 6 }}>🗑️</Text>
                <Text style={[styles.sheetTitle, { color: C.text }]}>Supprimer la photo ?</Text>
                <Text style={[styles.sheetSub, { color: C.muted, textAlign: "center" }]}>
                  La photo du patient sera retirée de l'app.
                </Text>
              </View>
              <View style={styles.sheetBtns}>
                <TouchableOpacity onPress={() => setRemovePhotoModal(false)} style={[styles.btnSecondary, { borderColor: C.border }]}>
                  <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirmRemovePhoto} style={[styles.btnPrimary, { backgroundColor: C.danger }]}>
                  <Text style={styles.btnPrimaryText}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── MODAL CHANGEMENT DE NOM ──────────────────────────────────────── */}
      <Modal visible={nameChangeModal} transparent animationType="slide" onRequestClose={() => setNameChangeModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setNameChangeModal(false)}>
            <TouchableOpacity activeOpacity={1}>
              <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.accent }]}>
                <Text style={[styles.sheetTitle, { color: C.text }]}>✏️ Demande de changement de nom</Text>
                <Text style={[styles.sheetSub, { color: C.muted }]}>
                  Nom actuel : {space?.patient_firstname} {space?.patient_lastname}
                </Text>
                <TextInput
                  style={[styles.sheetInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                  placeholder="Nouveau prénom"
                  placeholderTextColor={C.muted}
                  value={nameChangeFirstname}
                  onChangeText={setNameChangeFirstname}
                  autoCapitalize="words"
                />
                <TextInput
                  style={[styles.sheetInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                  placeholder="Nouveau nom"
                  placeholderTextColor={C.muted}
                  value={nameChangeLastname}
                  onChangeText={setNameChangeLastname}
                  autoCapitalize="words"
                />
                <TextInput
                  style={[styles.sheetInput, styles.sheetTextarea, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                  placeholder="Raison du changement (obligatoire)"
                  placeholderTextColor={C.muted}
                  value={nameChangeReason}
                  onChangeText={setNameChangeReason}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                <View style={styles.sheetBtns}>
                  <TouchableOpacity onPress={() => setNameChangeModal(false)} style={[styles.btnSecondary, { borderColor: C.border }]}>
                    <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSendNameChange}
                    disabled={!nameChangeFirstname.trim() || !nameChangeLastname.trim() || !nameChangeReason.trim()}
                    style={[
                      styles.btnPrimary,
                      { backgroundColor: C.accent },
                      (!nameChangeFirstname.trim() || !nameChangeLastname.trim() || !nameChangeReason.trim()) && { opacity: 0.5 },
                    ]}
                  >
                    <Text style={styles.btnPrimaryText}>Envoyer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL CHRONOLOGIE (frise) ──────────────────────────────────── */}
      <Modal visible={chronoModal} transparent animationType="slide" onRequestClose={() => setChronoModal(false)}>
        <View style={styles.overlay}>
          {/* TouchableOpacity en frère (absoluteFill), pas en ancêtre du sheet :
              même pattern que MODAL PROFIL PATIENT. Un Touchable ANCÊTRE de la
              ScrollView ci-dessous entre en conflit avec son geste de pan (scroll
              saccadé, impossible de remonter) — en sibling positionné derrière,
              il capte les taps sur le fond sans jamais entrer dans la chaîne de
              responder de la ScrollView. */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setChronoModal(false)}
          />
          <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.accent, maxHeight: SHEET_MAX_HEIGHT }]}>
            <Text style={[styles.sheetTitle, { color: C.text }]}>🕐 Chronologie</Text>
            <Text style={[styles.cardDesc, { color: C.muted, marginBottom: 10 }]}>
              Du plus récent (en haut) à {space?.home_care_mode ? "l'entrée en soin" : "l'hospitalisation"} (en bas) — fais défiler la frise pour naviguer.
            </Text>

            {chronoLoading ? (
              <ActivityIndicator color={C.accent} style={{ marginVertical: 24 }} />
            ) : chronoEvents.length === 0 ? (
              <Text style={[styles.historyEmpty, { color: C.muted }]}>Aucun événement pour l'instant.</Text>
            ) : (
              <ScrollView style={styles.chronoScroll} showsVerticalScrollIndicator nestedScrollEnabled>
                {chronoEvents.map((ev, i) => {
                  const isLast = i === chronoEvents.length - 1;
                  const dotColor = C[CHRONO_KIND_COLOR[ev.kind]];
                  return (
                    <View key={ev.id} style={styles.chronoRow}>
                      <View style={styles.chronoRail}>
                        <View style={[styles.chronoDot, { backgroundColor: dotColor, borderColor: C.card }]}>
                          <Text style={styles.chronoDotIcon}>{ev.icon}</Text>
                        </View>
                        {!isLast && <View style={[styles.chronoLine, { backgroundColor: C.border }]} />}
                      </View>
                      <View style={styles.chronoContent}>
                        <Text style={[styles.historyDate, { color: C.muted }]}>
                          {ev.date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                        </Text>
                        <Text style={[styles.chronoTitle, { color: ev.kind === "hospitalisation" ? C.danger : C.text }]}>
                          {ev.title}
                        </Text>
                        {ev.detail && <Text style={[styles.historyOld, { color: C.muted }]}>{ev.detail}</Text>}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            {!chronoLoading && !space?.patient_admission_date && (
              <Text style={[styles.historyEmpty, { color: C.muted, marginTop: 8 }]}>
                🏥 {space?.home_care_mode ? "La date de début du soin à domicile n'est" : "La date d'hospitalisation n'est"} pas renseignée — ajoute-la dans la fiche patient ci-dessus pour l'afficher tout en bas de la frise.
              </Text>
            )}

            <TouchableOpacity
              onPress={() => setChronoModal(false)}
              style={[styles.saveNotesBtn, { backgroundColor: C.accent, marginTop: 14 }]}
            >
              <Text style={styles.saveNotesBtnText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Toast */}
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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 20 },

  scroll: { padding: 16, paddingBottom: 48 },
  sectionTitle: {
    fontFamily: "DM_Sans_600SemiBold", fontSize: 11,
    letterSpacing: 1, textTransform: "uppercase",
    marginBottom: 10, marginTop: 20,
  },
  card: {
    borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 4,
  },
  cardDesc: { fontFamily: "DM_Sans_400Regular", fontSize: 13, lineHeight: 20, marginBottom: 14 },

  // Patient row
  patientRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  patientName: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 16 },
  patientHospital: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginTop: 2 },

  // Barre horizontale fixe de navigation des réglages (au-dessus de la tab bar)
  settingsNavBar: {
    position: "absolute", left: 0, right: 0,
    flexDirection: "row", borderTopWidth: 1,
    paddingTop: 6, paddingBottom: 6,
  },
  settingsNavBtn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 4, gap: 2 },
  settingsNavIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
  },
  settingsNavIconText: { fontSize: 17 },
  settingsNavLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11 },

  // Photo
  photoRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  photoBtn: {
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14,
    alignItems: "center", justifyContent: "center",
  },
  photoBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, color: "#fff" },

  bloodChip: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16 },
  bloodChipText: { fontFamily: "DM_Sans_700Bold", fontSize: 14 },
  bloodGroupWrap: { gap: 8 },
  bloodGroupRow: { flexDirection: "row", gap: 8 },
  bloodChipHalf: { flex: 1 },
  allergyGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: 13 },
  allergyRow: { flexDirection: "row", alignItems: "center", gap: 9, width: "50%" },
  allergyDot: { width: 15, height: 15, borderRadius: 8, borderWidth: 1.5 },
  allergyDotFilled: { backgroundColor: "#f97316", borderColor: "#f97316" },
  allergyRowText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13.5 },
  bdPickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "center", alignItems: "center" },
  bdPickerCard: { borderRadius: 16, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 8 },
  bdPickerRow: { paddingVertical: 9, paddingHorizontal: 8, borderRadius: 8 },
  bdPickerRowText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14, textAlign: "center" },
  bdFieldBtn: { flex: 1, alignItems: "center", borderWidth: 1.5, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 4 },
  bdFieldLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 10, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 1 },
  bdFieldValueRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  bdFieldValue: { fontFamily: "DM_Sans_700Bold", fontSize: 16 },
  bdFieldChevron: { fontSize: 12, fontFamily: "DM_Sans_700Bold" },

  // RGPD
  rgpdRow: { flexDirection: "row", alignItems: "flex-start" },
  rgpdLabel: { fontFamily: "DM_Sans_400Regular", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  rgpdDate: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 17 },
  rgpdDays: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, marginTop: 4 },
  prolongBtn: { borderRadius: 10, paddingVertical: 13, alignItems: "center", justifyContent: "center" },
  prolongBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },

  // Infos hospitalières
  fieldLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8, marginTop: 4 },
  fieldDivider: { height: 1, marginVertical: 16 },
  sectorInput: {
    borderWidth: 1, borderRadius: 10, padding: 12,
    fontFamily: "DM_Sans_400Regular", fontSize: 14,
    marginBottom: 12,
  },
  historyEmpty: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginBottom: 4, fontStyle: "italic" },
  historyBlockHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  historyToggleIcon: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  historyRow: { borderLeftWidth: 3, paddingLeft: 12, marginBottom: 12 },
  historyRowPressable: { flexDirection: "row", alignItems: "center" },
  historyRowChevron: { fontSize: 18, marginLeft: 8 },
  historyField: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, marginBottom: 2 },
  historyOld: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginBottom: 2, fontStyle: "italic" },
  historyMsg: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginBottom: 2 },
  historyDate: { fontFamily: "DM_Sans_400Regular", fontSize: 11 },
  historySubGroup: { fontFamily: "DM_Sans_700Bold", fontSize: 12, marginBottom: 8 },

  // Chronologie (popup frise) — cadre borné : seule cette zone scrolle,
  // le reste de la popup (titre, légende, bouton Fermer) reste fixe.
  // Hauteur fixe (pas maxHeight+flexShrink) : évite toute renégociation de
  // layout à chaque render qui rendait le scroll saccadé / bloqué dans un
  // seul sens sur appareil réel.
  chronoScroll: { height: 340 },
  chronoRow: { flexDirection: "row" },
  chronoRail: { width: 30, alignItems: "center" },
  chronoDot: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 2,
    alignItems: "center", justifyContent: "center", marginBottom: 2,
  },
  chronoDotIcon: { fontSize: 12 },
  chronoLine: { flex: 1, width: 2, marginBottom: 2 },
  chronoContent: { flex: 1, paddingLeft: 10, paddingBottom: 18 },
  chronoTitle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13.5, marginTop: 2, marginBottom: 2 },

  // Admin notes
  warningText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, marginBottom: 10 },
  notesInput: {
    borderWidth: 1, borderRadius: 10, padding: 12,
    fontFamily: "DM_Sans_400Regular", fontSize: 14,
    minHeight: 100, marginBottom: 12,
  },
  saveNotesBtn: { borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  saveNotesBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },

  // Nuitées
  nightRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  nightLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 15, marginBottom: 4 },
  nightDesc: { fontFamily: "DM_Sans_400Regular", fontSize: 13, lineHeight: 18 },

  homeCareTrack: {
    width: "100%", height: 48,
    borderWidth: 1, borderRadius: 24, overflow: "hidden", position: "relative",
  },
  homeCareThumb: {
    position: "absolute", top: 0, bottom: 0, left: 0, borderRadius: 24,
  },
  homeCareOption: { position: "absolute", top: 0, bottom: 0, justifyContent: "center", paddingHorizontal: 12 },
  homeCareOptionText: { fontFamily: "DM_Sans_700Bold", fontSize: 13 },
  homeCareDescHidden: { position: "absolute", left: 0, right: 0, opacity: 0 },

  toast: {
    position: "absolute", bottom: 24, alignSelf: "center",
    paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10,
  },
  toastText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, color: "#fff" },

  // Règles de visite
  hourRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  hourBlock: { flex: 1, gap: 6 },
  hourLabel: { fontFamily: "DM_Sans_400Regular", fontSize: 12, textAlign: "center" },
  hourSep: { fontFamily: "DM_Sans_700Bold", fontSize: 18, marginTop: 20 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepBtn: { width: 36, height: 36, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  stepBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 18, lineHeight: 20 },
  stepValue: { fontFamily: "DM_Sans_700Bold", fontSize: 16, minWidth: 48, textAlign: "center" },
  timeBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, alignItems: "center" },
  timeBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 16 },
  sliderHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sliderValueText: { fontFamily: "DM_Sans_700Bold", fontSize: 16 },
  sliderBoundsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  sliderBoundLabel: { fontFamily: "DM_Sans_400Regular", fontSize: 11 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  pill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  pillText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  weekdayRow: { flexDirection: "row", gap: 6, marginBottom: 4 },
  weekdayBtn: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  weekdayBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 12 },
  blockedChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  blockedChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  blockedChipText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },

  // Calendrier date picker
  calNavRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  calNavBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  calNavText: { fontFamily: "DM_Sans_700Bold", fontSize: 22 },
  calMonthTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 16 },
  calHeaderRow: { flexDirection: "row", marginBottom: 6 },
  calHeaderCell: { flex: 1, textAlign: "center", fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
  calRow: { flexDirection: "row", marginBottom: 4 },
  calCell: { flex: 1, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  calDayText: { fontFamily: "DM_Sans_400Regular", fontSize: 14 },

  // Modal changement de nom
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, padding: 24, paddingBottom: 40, marginBottom: 12 },
  sheetTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 4 },
  sheetSub: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginBottom: 16 },
  sheetInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontFamily: "DM_Sans_400Regular", fontSize: 15, marginBottom: 10 },
  sheetTextarea: { height: 80, textAlignVertical: "top" },
  sheetBtns: { flexDirection: "row", gap: 10, marginTop: 8 },
  btnPrimary: { flex: 1.3, borderRadius: 10, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  btnPrimaryText: { fontFamily: "DM_Sans_700Bold", fontSize: 15, color: "#fff" },
  btnSecondary: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  btnSecondaryText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});
