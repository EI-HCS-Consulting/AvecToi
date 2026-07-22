import { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Modal, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { File, Paths } from "expo-file-system";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import PatientAvatar from "@/components/PatientAvatar";
import { normalizePhone } from "@/lib/phone";
import { METIERS } from "@/lib/metiers";
import type { Theme } from "@/lib/themes";

// updatedAt bust le cache CDN/<Image> — le fichier est uploadé sous un nom
// fixe (upsert), donc sans ce paramètre un ré-upload continuerait d'afficher
// l'ancienne photo (cacheControl 1h côté storage + cache par URI côté RN).
function intervenantPhotoUrl(filename: string, updatedAt?: string | null) {
  const { data } = supabase.storage.from("intervenant-photos").getPublicUrl(filename);
  return updatedAt ? `${data.publicUrl}?v=${new Date(updatedAt).getTime()}` : data.publicUrl;
}

interface TypeRow {
  // undefined tant que la ligne n'a jamais été sauvegardée (mode edit,
  // nouvelle ligne ajoutée) — sert à distinguer insert/update/delete au
  // moment d'enregistrer, sans avoir à tout recréer depuis zéro.
  id?: string;
  label: string;
  duration_minutes: string;
}

interface Props {
  visible: boolean;
  mode: "create" | "edit";
  spaceId: string;
  prenom: string;
  nom: string;
  pin: string;
  intervenantProfileId?: string | null;
  theme: Theme;
  // Uniquement en mode "edit" — le mode "create" est bloquant (première
  // connexion d'un intervenant, voir app/(visitor)/_layout.tsx).
  onClose?: () => void;
  // Tout ce qui est renvoyé ici est tel qu'enregistré dans
  // intervenant_profiles — l'appelant doit le répercuter sur son propre état
  // (et la session locale via saveVisitorSession) pour rester la source
  // affichée ailleurs dans l'app (Mes informations, matching des alertes
  // RebookingAlertModal…) sans attendre un rechargement. telephone/phraseTotem
  // sont `null` si vidés ou jamais remplis ; photo/photoUpdatedAt sont `null`
  // tant qu'aucune photo n'a jamais été uploadée pour cette fiche.
  onSaved: (
    profileId: string, prenom: string, nom: string,
    telephone: string | null, phraseTotem: string | null,
    photo: string | null, photoUpdatedAt: string | null,
    metier: string | null,
  ) => void;
}

// Fiche intervenant : liste ajoutable/supprimable de types d'intervention
// (label + durée), rattachée à intervenant_profiles. Utilisé en mode
// "create" (bloquant, première connexion) et "edit" (depuis Mon compte).
// Pas de FK reservations -> intervention_types (voir migration
// 20260722_reservations_intervention_columns.sql) : supprimer/recréer les
// types ici ne touche jamais les interventions déjà réservées, dont le
// libellé/durée est copié au moment de la réservation.
export default function IntervenantFicheModal({
  visible, mode, spaceId, prenom, nom, pin, intervenantProfileId, theme: C, onClose, onSaved,
}: Props) {
  const [ficheePrenom, setFichePrenom] = useState(prenom);
  const [ficheNom, setFicheNom] = useState(nom);
  // Téléphone et phrase totem : facultatifs, comme visitor_profiles.motto
  // côté visiteur — vides tant que l'intervenant ne les a pas remplis.
  const [ficheTelephone, setFicheTelephone] = useState("");
  const [fichePhraseTotem, setFichePhraseTotem] = useState("");
  // Clé du métier (voir lib/metiers.ts) — demandé dès la création (première
  // connexion), sert aussi d'icône de repli pour l'avatar sans photo.
  const [ficheMetier, setFicheMetier] = useState<string | null>(null);
  const [rows, setRows] = useState<TypeRow[]>([{ label: "", duration_minutes: "" }]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  // Nom "source de vérité" pour la comparaison avant/après à l'enregistrement
  // (voir handleSave) — ne peut pas se fier aux props prenom/nom : l'appelant
  // admin (app/(admin)/intervenants.tsx) ne les connaît pas forcément à jour
  // et passe des chaînes vides, d'où le rechargement systématique depuis
  // intervenant_profiles ci-dessous en mode edit.
  const [loadedPrenom, setLoadedPrenom] = useState(prenom);
  const [loadedNom, setLoadedNom] = useState(nom);
  const [loadedTelephone, setLoadedTelephone] = useState("");
  const [loadedPhraseTotem, setLoadedPhraseTotem] = useState("");
  const [loadedMetier, setLoadedMetier] = useState<string | null>(null);
  // existingPhoto : nom de fichier déjà enregistré (mode edit). pickedPhotoUri :
  // uri locale fraîchement choisie, pas encore uploadée (aperçu immédiat,
  // upload effectif seulement au clic sur "Enregistrer" — voir handleSave).
  const [existingPhoto, setExistingPhoto] = useState<string | null>(null);
  const [existingPhotoUpdatedAt, setExistingPhotoUpdatedAt] = useState<string | null>(null);
  const [pickedPhotoUri, setPickedPhotoUri] = useState<string | null>(null);
  // true si intervenantProfileId a été fourni (mode edit) mais ne correspond
  // à aucune ligne intervenant_profiles — session locale orpheline (profil
  // supprimé, ou rattachement jamais confirmé). Bloque la modale plutôt que
  // de laisser l'utilisateur "éditer" une fiche fantôme.
  const [orphaned, setOrphaned] = useState(false);
  // true si ce téléphone (normalisé) est déjà utilisé par une fiche sur un
  // autre espace — simple message de réassurance en mode create, ne
  // préremplit rien (chaque espace garde sa propre fiche indépendante,
  // voir "Mes espaces" dans app/(visitor)/account.tsx).
  const [knownElsewhere, setKnownElsewhere] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setFichePrenom(prenom);
    setFicheNom(nom);
    setLoadedPrenom(prenom);
    setLoadedNom(nom);
    setPickedPhotoUri(null);
    setOrphaned(false);
    setKnownElsewhere(false);
    if (mode === "create") {
      setRows([{ label: "", duration_minutes: "" }]);
      setRemovedIds([]);
      setExistingPhoto(null);
      setFicheTelephone("");
      setFichePhraseTotem("");
      setFicheMetier(null);
      setLoadedTelephone("");
      setLoadedPhraseTotem("");
      setLoadedMetier(null);
      setLoading(false);
      return;
    }
    if (!intervenantProfileId) return;
    setLoading(true);
    Promise.all([
      supabase
        .from("intervention_types")
        .select("*")
        .eq("intervenant_profile_id", intervenantProfileId)
        .order("created_at", { ascending: true }),
      supabase
        .from("intervenant_profiles")
        .select("prenom, nom, photo, photo_updated_at, telephone, phrase_totem, metier")
        .eq("id", intervenantProfileId)
        .maybeSingle(),
    ]).then(([{ data }, { data: profileData }]) => {
      if (!profileData) {
        setOrphaned(true);
        setLoading(false);
        return;
      }
      setRows(
        (data && data.length > 0)
          ? data.map((t) => ({ id: t.id, label: t.label, duration_minutes: String(t.duration_minutes) }))
          : [{ label: "", duration_minutes: "" }],
      );
      setRemovedIds([]);
      setExistingPhoto(profileData?.photo ?? null);
      setExistingPhotoUpdatedAt(profileData?.photo_updated_at ?? null);
      if (profileData?.prenom) {
        setFichePrenom(profileData.prenom);
        setLoadedPrenom(profileData.prenom);
      }
      if (profileData?.nom) {
        setFicheNom(profileData.nom);
        setLoadedNom(profileData.nom);
      }
      setFicheTelephone(profileData?.telephone ?? "");
      setLoadedTelephone(profileData?.telephone ?? "");
      setFichePhraseTotem(profileData?.phrase_totem ?? "");
      setLoadedPhraseTotem(profileData?.phrase_totem ?? "");
      setFicheMetier(profileData?.metier ?? null);
      setLoadedMetier(profileData?.metier ?? null);
      setLoading(false);
    });
  }, [visible, mode, intervenantProfileId]);

  async function pickPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission refusée", "Autorise l'accès à la galerie dans les paramètres.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;

    // Copie dans le dossier document (persistant) — le fichier renvoyé par le
    // picker vit dans le cache de l'app, non garanti de survivre jusqu'au clic
    // sur "Enregistrer" sinon (même précaution que account.tsx handlePickPhoto).
    // Nom de fichier horodaté (et non fixe) : <Image> met en cache par URI, un
    // nom constant faisait qu'un second choix de photo dans la même session
    // ne se réaffichait pas (l'app montrait encore l'aperçu précédent).
    let persistedUri = result.assets[0].uri;
    try {
      const dest = new File(Paths.document, `intervenant_fiche_photo_${Date.now()}.jpg`);
      new File(result.assets[0].uri).copy(dest);
      persistedUri = dest.uri;
    } catch {
      // Copie échouée : on garde l'uri d'origine, aperçu immédiat quand même
      // fonctionnel.
    }
    setPickedPhotoUri(persistedUri);
  }

  // Détection légère "déjà connu ailleurs" — mode create uniquement, pour
  // rassurer l'intervenant que son rattachement va fonctionner. Ne copie
  // aucune donnée (photo/phrase totem/PIN restent propres à chaque espace).
  async function checkKnownElsewhere() {
    if (mode !== "create") return;
    const normalized = normalizePhone(ficheTelephone);
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

  function updateRow(index: number, patch: Partial<TypeRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { label: "", duration_minutes: "" }]);
  }

  function removeRow(index: number) {
    setRows((prev) => {
      const row = prev[index];
      if (row.id) setRemovedIds((ids) => [...ids, row.id!]);
      return prev.filter((_, i) => i !== index);
    });
  }

  const validRows = rows
    .map((r) => ({ label: r.label.trim(), duration_minutes: parseInt(r.duration_minutes, 10) }))
    .filter((r) => r.label.length > 0 && Number.isFinite(r.duration_minutes) && r.duration_minutes > 0);
  const canSave = validRows.length > 0 && !!ficheePrenom.trim() && !!ficheNom.trim()
    && (mode === "edit" || (!!ficheTelephone.trim() && !!ficheMetier)) && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const trimmedPrenom = ficheePrenom.trim();
      const trimmedNom = ficheNom.trim();
      const trimmedTelephone = normalizePhone(ficheTelephone);
      const trimmedPhraseTotem = fichePhraseTotem.trim();
      let profileId = intervenantProfileId ?? null;

      if (!profileId) {
        const { data, error } = await supabase
          .from("intervenant_profiles")
          .insert({
            space_id: spaceId,
            prenom: trimmedPrenom,
            nom: trimmedNom,
            pin,
            telephone: trimmedTelephone || null,
            phrase_totem: trimmedPhraseTotem || null,
            metier: ficheMetier,
          })
          .select("id")
          .single();
        if (error && error.code === "23505") {
          // Une fiche existe déjà pour ce prénom/nom dans cet espace
          // (contrainte unique idx_intervenant_profiles_unique_identity) —
          // même logique de rattachement que _layout.tsx handleSaveIdentity :
          // si le PIN correspond on réutilise la fiche existante, sinon on
          // prévient plutôt que de laisser croire à une création réussie.
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
      } else {
        const updatePayload: Record<string, string | null> = {};
        if (trimmedPrenom !== loadedPrenom) updatePayload.prenom = trimmedPrenom;
        if (trimmedNom !== loadedNom) updatePayload.nom = trimmedNom;
        if (trimmedTelephone !== loadedTelephone) updatePayload.telephone = trimmedTelephone || null;
        if (trimmedPhraseTotem !== loadedPhraseTotem) updatePayload.phrase_totem = trimmedPhraseTotem || null;
        if (ficheMetier !== loadedMetier) updatePayload.metier = ficheMetier;
        if (Object.keys(updatePayload).length > 0) {
          const { error } = await supabase
            .from("intervenant_profiles")
            .update(updatePayload)
            .eq("id", profileId);
          if (error) throw error;
        }
      }

      // Upload la photo seulement si une nouvelle a été choisie — best-effort,
      // un échec ne doit pas bloquer l'enregistrement des types d'intervention
      // qui, eux, ont déjà réussi ou vont suivre. finalPhoto/finalPhotoUpdatedAt
      // suivent ce qui sera effectivement renvoyé via onSaved (voir plus bas).
      let finalPhoto = existingPhoto;
      let finalPhotoUpdatedAt = existingPhotoUpdatedAt;
      if (pickedPhotoUri && profileId) {
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
            console.error("[IntervenantFicheModal] photo upload failed:", storageErr);
          } else {
            const photoUpdatedAtIso = new Date().toISOString();
            const { error: photoErr } = await supabase
              .from("intervenant_profiles")
              .update({ photo: filename, photo_updated_at: photoUpdatedAtIso })
              .eq("id", profileId);
            if (photoErr) {
              console.error("[IntervenantFicheModal] photo column update failed:", photoErr);
            } else {
              finalPhoto = filename;
              finalPhotoUpdatedAt = photoUpdatedAtIso;
            }
          }
        } catch (e) {
          console.error("[IntervenantFicheModal] unexpected photo error:", e);
        }
      }

      if (removedIds.length > 0) {
        const { error: delErr } = await supabase.from("intervention_types").delete().in("id", removedIds);
        if (delErr) throw delErr;
      }

      const toInsert = rows.filter((r) => !r.id).map((r) => ({
        intervenant_profile_id: profileId,
        label: r.label.trim(),
        duration_minutes: parseInt(r.duration_minutes, 10),
      })).filter((r) => r.label.length > 0 && Number.isFinite(r.duration_minutes) && r.duration_minutes > 0);
      if (toInsert.length > 0) {
        const { error: insErr } = await supabase.from("intervention_types").insert(toInsert);
        if (insErr) throw insErr;
      }

      const toUpdate = rows.filter((r) => r.id);
      for (const r of toUpdate) {
        const duration = parseInt(r.duration_minutes, 10);
        if (!r.label.trim() || !Number.isFinite(duration) || duration <= 0) continue;
        const { error: updErr } = await supabase
          .from("intervention_types")
          .update({ label: r.label.trim(), duration_minutes: duration })
          .eq("id", r.id);
        if (updErr) throw updErr;
      }

      onSaved(
        profileId!, trimmedPrenom, trimmedNom,
        trimmedTelephone || null, trimmedPhraseTotem || null,
        finalPhoto, finalPhotoUpdatedAt, ficheMetier,
      );
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible d'enregistrer la fiche intervenant.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.title, { color: C.text }]}>🩺 Fiche intervenant</Text>
            <Text style={[styles.subtitle, { color: C.muted }]}>
              {mode === "create"
                ? "Confirme ton prénom et ton nom, puis indique les types d'intervention que tu peux réaliser, et leur durée habituelle. Tu pourras tout modifier plus tard."
                : "Modifie ton prénom, ton nom, ou tes types d'intervention et leur durée."}
            </Text>

            {loading ? (
              <ActivityIndicator color={C.accent} style={{ marginVertical: 24 }} />
            ) : orphaned ? (
              <>
                <Text style={[styles.subtitle, { color: C.danger }]}>
                  Cette fiche intervenant n'existe plus. Déconnecte-toi (Mon compte → Se
                  déconnecter) puis reconnecte-toi via le lien d'invitation en ressaisissant
                  ton prénom, ton nom et ton code — tu seras automatiquement rattaché à ta
                  fiche si elle existe encore.
                </Text>
                {onClose && (
                  <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                    <Text style={[styles.cancelBtnText, { color: C.muted }]}>Fermer</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                {/* Champs dans un ScrollView à hauteur bornée (plutôt que
                    toute la carte) : Enregistrer/Annuler restent toujours
                    visibles sous la liste, sans dépendre du scroll pour les
                    atteindre — voir styles.scroll. */}
                <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 4 }} keyboardShouldPersistTaps="handled">
                <TouchableOpacity style={styles.photoPicker} onPress={pickPhoto} activeOpacity={0.8}>
                  <PatientAvatar
                    photoUrl={pickedPhotoUri ?? (existingPhoto ? intervenantPhotoUrl(existingPhoto, existingPhotoUpdatedAt) : null)}
                    firstname={ficheePrenom || prenom}
                    lastname={ficheNom || nom}
                    size={72}
                    C={C}
                    metier={ficheMetier}
                  />
                  <Text style={[styles.photoPickerText, { color: C.accent }]}>Changer la photo</Text>
                </TouchableOpacity>

                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, styles.labelInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                    placeholder="Prénom"
                    placeholderTextColor={C.muted}
                    value={ficheePrenom}
                    onChangeText={setFichePrenom}
                    autoCapitalize="words"
                  />
                  <TextInput
                    style={[styles.input, styles.labelInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                    placeholder="Nom"
                    placeholderTextColor={C.muted}
                    value={ficheNom}
                    onChangeText={setFicheNom}
                    autoCapitalize="words"
                  />
                </View>

                <TextInput
                  style={[styles.input, styles.fullInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                  placeholder={mode === "create" ? "Téléphone" : "Téléphone (optionnel)"}
                  placeholderTextColor={C.muted}
                  value={ficheTelephone}
                  onChangeText={setFicheTelephone}
                  onBlur={checkKnownElsewhere}
                  keyboardType="phone-pad"
                />
                {knownElsewhere && (
                  <Text style={[styles.subtitle, { color: C.accent, marginTop: -6, marginBottom: 14, textAlign: "left" }]}>
                    🔗 Ce numéro est déjà lié à un autre espace — tu pourras y accéder depuis Mon compte.
                  </Text>
                )}
                <TextInput
                  style={[styles.input, styles.fullInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                  placeholder="Phrase totem (optionnel)"
                  placeholderTextColor={C.muted}
                  value={fichePhraseTotem}
                  onChangeText={setFichePhraseTotem}
                />

                <Text style={[styles.metierLabel, { color: C.gold }]}>
                  Métier / spécialisation{mode === "create" ? "" : " (optionnel)"}
                </Text>
                <View style={styles.metierGrid}>
                  {METIERS.map((m) => {
                    const selected = ficheMetier === m.key;
                    return (
                      <TouchableOpacity
                        key={m.key}
                        onPress={() => setFicheMetier(m.key)}
                        activeOpacity={0.8}
                        style={[
                          styles.metierChip,
                          { borderColor: selected ? C.accent : C.border, backgroundColor: selected ? `${C.accent}22` : C.bg },
                        ]}
                      >
                        <Ionicons name={m.icon} size={15} color={selected ? C.accent : C.muted} />
                        <Text style={[styles.metierChipText, { color: selected ? C.accent : C.text }]}>{m.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {rows.map((row, i) => (
                  <View key={row.id ?? `new-${i}`} style={styles.row}>
                    <TextInput
                      style={[styles.input, styles.labelInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                      placeholder="Type (ex. Kiné)"
                      placeholderTextColor={C.muted}
                      value={row.label}
                      onChangeText={(v) => updateRow(i, { label: v })}
                    />
                    <TextInput
                      style={[styles.input, styles.durationInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                      placeholder="Min"
                      placeholderTextColor={C.muted}
                      value={row.duration_minutes}
                      onChangeText={(v) => updateRow(i, { duration_minutes: v.replace(/[^0-9]/g, "") })}
                      keyboardType="number-pad"
                    />
                    <TouchableOpacity
                      onPress={() => removeRow(i)}
                      disabled={rows.length === 1}
                      style={[styles.removeBtn, rows.length === 1 && { opacity: 0.3 }]}
                    >
                      <Text style={{ color: C.danger, fontSize: 18 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity onPress={addRow} style={styles.addBtn}>
                  <Text style={[styles.addBtnText, { color: C.accent }]}>+ Ajouter un type</Text>
                </TouchableOpacity>
                </ScrollView>

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: C.accent }, !canSave && { opacity: 0.5 }]}
                  onPress={handleSave}
                  disabled={!canSave}
                  activeOpacity={0.85}
                >
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Enregistrer</Text>}
                </TouchableOpacity>

                {mode === "edit" && onClose && (
                  <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                    <Text style={[styles.cancelBtnText, { color: C.muted }]}>Annuler</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "88%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
  },
  scroll: {
    maxHeight: 420,
  },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 20,
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "DM_Sans_400Regular",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 20,
  },
  photoPicker: {
    alignItems: "center",
    marginBottom: 18,
    gap: 8,
  },
  photoPickerText: {
    fontFamily: "DM_Sans_600SemiBold",
    fontSize: 13,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 11,
    fontFamily: "DM_Sans_400Regular",
    fontSize: 14,
  },
  labelInput: { flex: 2 },
  durationInput: { flex: 1, textAlign: "center" },
  fullInput: { marginBottom: 10 },
  metierLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 },
  metierGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  metierChip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 20, paddingVertical: 7, paddingHorizontal: 12 },
  metierChipText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
  removeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: {
    alignSelf: "flex-start",
    marginBottom: 20,
    marginTop: 4,
  },
  addBtnText: {
    fontFamily: "DM_Sans_600SemiBold",
    fontSize: 14,
  },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  saveBtnText: {
    fontFamily: "DM_Sans_700Bold",
    fontSize: 15,
    color: "#fff",
  },
  cancelBtn: {
    alignItems: "center",
    marginTop: 14,
  },
  cancelBtnText: {
    fontFamily: "DM_Sans_600SemiBold",
    fontSize: 14,
  },
});
