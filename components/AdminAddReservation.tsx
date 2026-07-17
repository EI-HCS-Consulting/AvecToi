import { useState, forwardRef, useImperativeHandle } from "react";
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { toFrLong } from "@/lib/slotUtils";
import { addToNativeCalendar, linkCalendarEvent } from "@/lib/calendarSync";
import { isSpaceCapped } from "@/lib/freemiumCap";
import type { PatientSpace, Reservation, SlotConfig } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Modale "ajouter une réservation" côté admin — pas de PIN, mais soumise
// au même cap freemium serveur que le visiteur (trigger check_visite_cap
// sur reservations : l'admin ne peut plus ajouter au-delà de la limite non
// plus). Partagée entre (admin)/home/slots.tsx (Visite) et nights.tsx (Nuit)
// pour éviter de dupliquer ce formulaire dans les deux écrans.

export interface AdminAddReservationHandle {
  // maxAdditional : nombre de personnes qu'il reste possible d'ajouter sur ce
  // créneau/nuitée (capacité du réglage "visiteurs max par créneau" moins les
  // places déjà occupées) — borne le bouton "+ Ajouter une autre personne".
  open: (iso: string, slot: string, type: "Visite" | "Nuit", maxAdditional: number) => void;
}

interface Props {
  spaceId: string;
  space: PatientSpace;
  slotConfig: SlotConfig;
  reservations: Reservation[];
  onAdded: () => void;
  C: Theme;
}

interface Person {
  prenom: string;
  nom: string;
}

const EMPTY_PERSON: Person = { prenom: "", nom: "" };

function AdminAddReservation({ spaceId, space, slotConfig, reservations, onAdded, C }: Props, ref: React.Ref<AdminAddReservationHandle>) {
  const [target, setTarget] = useState<{ iso: string; slot: string; type: "Visite" | "Nuit"; maxAdditional: number } | null>(null);
  const [people, setPeople] = useState<Person[]>([EMPTY_PERSON]);
  const [saving, setSaving] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  // Réservation(s) enregistrée(s) : id de la première, pour proposer l'ajout
  // au calendrier natif une fois la sauvegarde faite (même geste que côté
  // visiteur dans BookingFlow.tsx).
  const [savedId, setSavedId] = useState<string | null>(null);
  const [addingToCalendar, setAddingToCalendar] = useState(false);
  const [calendarAdded, setCalendarAdded] = useState(false);

  useImperativeHandle(ref, () => ({
    open: (iso, slot, type, maxAdditional) => {
      setTarget({ iso, slot, type, maxAdditional });
      setPeople([EMPTY_PERSON]);
      setSavedId(null);
      setCalendarAdded(false);
      // Préremplit le premier visiteur avec le prénom/nom de l'utilisateur
      // connecté — récupéré à chaque ouverture (pas au montage) car sur une
      // arrivée fraîche (ex. "Prochaine disponibilité" depuis le calendrier),
      // le composant vient de monter et open() est appelé avant qu'un fetch
      // lancé au montage ait eu le temps de résoudre.
      supabase.auth.getUser().then(({ data }) => {
        const meta = data.user?.user_metadata;
        const name: Person = meta ? { prenom: meta.firstname ?? "", nom: meta.lastname ?? "" } : EMPTY_PERSON;
        setAdminEmail(data.user?.email ?? null);
        setPeople((prev) => prev.map((p, i) => (i === 0 ? name : p)));
      });
    },
  }));

  function updatePerson(index: number, field: keyof Person, value: string) {
    setPeople((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  function addPerson() {
    setPeople((prev) => (target && prev.length < target.maxAdditional ? [...prev, EMPTY_PERSON] : prev));
  }

  const canAddPerson = !!target && target.type !== "Nuit" && people.length < target.maxAdditional;

  const validPeople = people
    .filter((p) => p.prenom.trim() && p.nom.trim())
    .slice(0, target?.maxAdditional ?? 1);

  async function handleAdd() {
    if (!target || validPeople.length === 0) return;
    if (target.type === "Visite" && isSpaceCapped(space, reservations)) {
      Alert.alert(
        "Limite atteinte",
        "Vous avez atteint la limite de votre espace. Consultez l'email envoyé à votre adresse pour en savoir plus.",
      );
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.from("reservations").insert(
      validPeople.map((p) => ({
        space_id: spaceId,
        date: target.iso,
        creneau: target.type === "Nuit" ? "🌙 Nuit" : target.slot,
        prenom: p.prenom.trim(),
        nom: p.nom.trim(),
        telephone: "",
        type: target.type,
        pin: "ADMIN",
      })),
    ).select("id");
    setSaving(false);
    if (error) {
      // Modale native au-dessus de tout — visible même si la modale d'ajout
      // (elle aussi native) reste ouverte.
      if (error.message.includes("FREEMIUM_CAP_REACHED")) {
        Alert.alert(
          "Limite atteinte",
          "Vous avez atteint la limite de votre espace. Consultez l'email envoyé à votre adresse pour en savoir plus.",
        );
      } else if (error.message.includes("SLOT_FULL")) {
        Alert.alert("Créneau complet", "Ce créneau est déjà complet. Choisis-en un autre.");
      } else if (error.message.includes("SLOT_BLOCKED_BY_INTERVENTION")) {
        Alert.alert(
          "Créneau indisponible",
          "Ce créneau est réservé à une intervention prioritaire (infirmier·ère, kiné…). Choisis-en un autre.",
        );
      } else {
        Alert.alert("Erreur", "Erreur lors de l'ajout : " + error.message);
      }
      return;
    }

    // Plusieurs personnes réservées ensemble → on les relie par group_id
    // (id de la 1ère) pour pouvoir proposer "Modifier/Supprimer aussi pour
    // [accompagnant] ?" plus tard (édition/suppression admin).
    if (data && data.length > 1) {
      const ids = data.map((d) => d.id);
      await supabase.from("reservations").update({ group_id: ids[0] }).in("id", ids);
    }

    onAdded();
    // Garde la modale ouverte le temps de proposer l'ajout au calendrier
    // natif — un seul événement par réservation créée (pas un par personne).
    setSavedId(data?.[0]?.id ?? null);
  }

  async function handleAddToCalendar() {
    if (!target || !savedId) return;
    setAddingToCalendar(true);
    // Le premier de la liste est le réservataire principal (préaffiché avec
    // le nom de l'admin connecté) — les suivants sont les accompagnants
    // affichés dans le titre de l'événement ("Avec ...").
    const companions = validPeople.slice(1).map((p) => p.prenom.trim()).filter(Boolean);
    const result = await addToNativeCalendar(space, slotConfig, target.iso, target.slot, target.type, adminEmail, companions);
    setAddingToCalendar(false);
    if (!result.ok) {
      Alert.alert("Calendrier", result.reason);
      return;
    }
    await linkCalendarEvent(savedId, result.eventId);
    setCalendarAdded(true);
  }

  function close() {
    setTarget(null);
    setSavedId(null);
  }

  return (
    <Modal visible={!!target} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => !saving && close()}>
          <TouchableOpacity activeOpacity={1}>
            <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.accent }]}>
              {savedId ? (
                <>
                  <Text style={[styles.sheetTitle, { color: C.text }]}>Réservation ajoutée ✓</Text>
                  <Text style={[styles.sheetSub, { color: C.muted }]}>
                    {target && toFrLong(new Date(target.iso + "T12:00:00"))}
                    {target?.type === "Visite" ? ` · ${target.slot}` : ""}
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.calendarBtn,
                      { borderColor: calendarAdded ? C.success : C.accent, backgroundColor: calendarAdded ? `${C.success}22` : `${C.accent}22` },
                      addingToCalendar && { opacity: 0.6 },
                    ]}
                    onPress={handleAddToCalendar}
                    disabled={addingToCalendar || calendarAdded}
                  >
                    {addingToCalendar ? (
                      <ActivityIndicator color={C.accent} size="small" />
                    ) : (
                      <Text style={[styles.calendarBtnText, { color: calendarAdded ? C.success : C.accent }]}>
                        {calendarAdded ? "✅ Ajouté au calendrier" : "📅 Ajouter au calendrier"}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalBtnSecondary, { flex: undefined, borderColor: C.accent, paddingHorizontal: 4, width: "100%", marginTop: 12 }]}
                    onPress={close}
                  >
                    <Text style={[styles.modalBtnSecondaryText, { color: C.accent }]}>Fermer</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={[styles.sheetTitle, { color: C.text }]}>
                    {target?.type === "Nuit" ? "Réserver la nuitée" : "Réserver ce créneau"}
                  </Text>
                  <Text style={[styles.sheetSub, { color: C.muted }]}>
                    {target && toFrLong(new Date(target.iso + "T12:00:00"))}
                    {target?.type === "Visite" ? ` · ${target.slot}` : ""}
                  </Text>

                  {people.map((p, i) => (
                    <View key={i} style={styles.nameRow}>
                      <TextInput
                        style={[styles.input, styles.nameInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                        placeholder="Prénom *" placeholderTextColor={C.muted}
                        value={p.prenom} onChangeText={(v) => updatePerson(i, "prenom", v)} autoCapitalize="words"
                      />
                      <TextInput
                        style={[styles.input, styles.nameInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                        placeholder="Nom *" placeholderTextColor={C.muted}
                        value={p.nom} onChangeText={(v) => updatePerson(i, "nom", v)} autoCapitalize="words"
                      />
                    </View>
                  ))}

                  {canAddPerson && (
                    <TouchableOpacity style={styles.addPersonBtn} onPress={addPerson}>
                      <Text style={[styles.addPersonBtnText, { color: C.accent }]}>+ Ajouter une autre personne</Text>
                    </TouchableOpacity>
                  )}

                  <View style={styles.modalButtons}>
                    <TouchableOpacity style={[styles.modalBtnSecondary, { borderColor: C.border }]} onPress={close} disabled={saving}>
                      <Text style={[styles.modalBtnSecondaryText, { color: C.muted }]}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalBtnPrimary, { backgroundColor: C.accent }, (validPeople.length === 0 || saving) && { opacity: 0.5 }]}
                      onPress={handleAdd}
                      disabled={validPeople.length === 0 || saving}
                    >
                      {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalBtnPrimaryText}>Réserver</Text>}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default forwardRef(AdminAddReservation);

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "center", alignItems: "center", padding: 20 },
  sheet: { width: "100%", maxWidth: 380, borderRadius: 20, borderWidth: 1, padding: 24, paddingBottom: 36, alignItems: "center" },
  sheetTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 6, textAlign: "center" },
  sheetSub: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center", marginBottom: 20 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontFamily: "DM_Sans_400Regular", fontSize: 15, marginBottom: 10, width: "100%" },
  nameRow: { flexDirection: "row", gap: 8, width: "100%" },
  nameInput: { flex: 1, width: undefined },
  addPersonBtn: { alignSelf: "flex-start", paddingVertical: 6, marginBottom: 4 },
  addPersonBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  calendarBtn: { width: "100%", borderWidth: 1, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 8, alignItems: "center", marginTop: 8 },
  calendarBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  modalButtons: { flexDirection: "row", gap: 10, width: "100%", marginTop: 16 },
  modalBtnSecondary: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  modalBtnSecondaryText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  modalBtnPrimary: { flex: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center", justifyContent: "center" },
  modalBtnPrimaryText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
});
