import { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, Modal, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { File, Paths } from "expo-file-system";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import PatientAvatar from "@/components/PatientAvatar";
import MesSoinsList from "@/components/MesSoinsList";
import MetierPickerModal from "@/components/MetierPickerModal";
import SoinPickerModal from "@/components/SoinPickerModal";
import SoinDurationModal from "@/components/SoinDurationModal";
import { propagateSoinChange } from "@/lib/interventionTypesSync";
import { metierLabel } from "@/lib/metiers";
import type { Theme } from "@/lib/themes";
import { LOGO_GREEN } from "@/lib/themes";

// updatedAt bust le cache CDN/<Image> — le fichier est uploadé sous un nom
// fixe (upsert), donc sans ce paramètre un ré-upload continuerait d'afficher
// l'ancienne photo (cacheControl 1h côté storage + cache par URI côté RN).
function intervenantPhotoUrl(filename: string, updatedAt?: string | null) {
  const { data } = supabase.storage.from("intervenant-photos").getPublicUrl(filename);
  return updatedAt ? `${data.publicUrl}?v=${new Date(updatedAt).getTime()}` : data.publicUrl;
}

interface Props {
  visible: boolean;
  prenom: string;
  nom: string;
  intervenantProfileId: string;
  theme: Theme;
  onClose: () => void;
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

// Fiche intervenant (édition) — photo, métier principal, 2ᵉ spécialisation
// optionnelle et liste des soins pratiqués (rattachée à
// intervenant_profiles). Prénom/nom/phrase totem sont affichés en lecture
// seule (même rendu que la fiche publique, voir styles.ficheName/ficheTotem)
// : leur édition se fait dans Mes informations (app/(visitor)/account.tsx,
// motto = phrase_totem), qui les répercute via syncIntervenantContact — pas
// de double saisie. La création (première connexion) est un flux séparé,
// voir components/IntervenantOnboardingFlow.tsx.
// Pas de FK reservations -> intervention_types (voir migration
// 20260722_reservations_intervention_columns.sql) : supprimer/recréer les
// types ici ne touche jamais les interventions déjà réservées, dont le
// libellé/durée est copié au moment de la réservation.
export default function IntervenantFicheModal({
  visible, prenom, nom, intervenantProfileId, theme: C, onClose, onSaved,
}: Props) {
  const [ficheePrenom, setFichePrenom] = useState(prenom);
  const [ficheNom, setFicheNom] = useState(nom);
  const [fichePhraseTotem, setFichePhraseTotem] = useState("");
  // Clé du métier (voir lib/metiers.ts) — sert aussi d'icône de repli pour
  // l'avatar sans photo.
  const [ficheMetier, setFicheMetier] = useState<string | null>(null);
  const [metierPickerOpen, setMetierPickerOpen] = useState(false);
  // 2ᵉ spécialisation optionnelle — persistée immédiatement au choix (pas
  // liée au bouton "Enregistrer" ci-dessous), voir handleAddSpecialisation.
  const [ficheMetierSecondaire, setFicheMetierSecondaire] = useState<string | null>(null);
  const [metierSecondairePickerOpen, setMetierSecondairePickerOpen] = useState(false);
  const [secondarySoinPickerOpen, setSecondarySoinPickerOpen] = useState(false);
  const [secondaryPendingLabel, setSecondaryPendingLabel] = useState<string | null>(null);
  const [savingSecondarySoin, setSavingSecondarySoin] = useState(false);
  // Incrémenté après l'ajout d'un soin via le flux 2ᵉ spécialisation
  // ci-dessus (hors MesSoinsList) — sert de `key` pour forcer MesSoinsList à
  // recharger sa liste depuis la base plutôt que d'ajouter une prop dédiée.
  const [soinsVersion, setSoinsVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Non éditable ici (voir suppression du champ Téléphone ci-dessous) — gardé
  // tel quel pour le répercuter inchangé dans onSaved, dont l'appelant
  // (app/(visitor)/account.tsx) dépend toujours pour sa propre session locale.
  // La seule source d'écriture du téléphone reste désormais "Mes informations"
  // (syncIntervenantContact dans account.tsx).
  const [existingTelephone, setExistingTelephone] = useState<string | null>(null);
  // Nom "source de vérité" pour la comparaison avant/après à l'enregistrement
  // du métier (voir handleSave) — prénom/nom/totem ne sont plus éditables ici
  // (affichés en lecture seule sous "Changer la photo", voir plus bas), donc
  // seul le métier a encore besoin de cette comparaison.
  const [loadedMetier, setLoadedMetier] = useState<string | null>(null);
  // existingPhoto : nom de fichier déjà enregistré. pickedPhotoUri : uri
  // locale fraîchement choisie, pas encore uploadée (aperçu immédiat, upload
  // effectif seulement au clic sur "Enregistrer" — voir handleSave).
  const [existingPhoto, setExistingPhoto] = useState<string | null>(null);
  const [existingPhotoUpdatedAt, setExistingPhotoUpdatedAt] = useState<string | null>(null);
  const [pickedPhotoUri, setPickedPhotoUri] = useState<string | null>(null);
  // true si intervenantProfileId ne correspond à aucune ligne
  // intervenant_profiles — session locale orpheline (profil supprimé, ou
  // rattachement jamais confirmé). Bloque la modale plutôt que de laisser
  // l'utilisateur "éditer" une fiche fantôme.
  const [orphaned, setOrphaned] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setFichePrenom(prenom);
    setFicheNom(nom);
    setPickedPhotoUri(null);
    setOrphaned(false);
    setLoading(true);
    Promise.all([
      supabase
        .from("intervention_types")
        .select("*")
        .eq("intervenant_profile_id", intervenantProfileId)
        .order("created_at", { ascending: true }),
      supabase
        .from("intervenant_profiles")
        .select("prenom, nom, photo, photo_updated_at, telephone, phrase_totem, metier, metier_secondaire")
        // telephone n'est plus édité ici (voir existingTelephone plus haut),
        // juste lu pour le répercuter tel quel dans onSaved.
        .eq("id", intervenantProfileId)
        .maybeSingle(),
    ]).then(([, { data: profileData }]) => {
      if (!profileData) {
        setOrphaned(true);
        setLoading(false);
        return;
      }
      setExistingPhoto(profileData?.photo ?? null);
      setExistingPhotoUpdatedAt(profileData?.photo_updated_at ?? null);
      if (profileData?.prenom) setFichePrenom(profileData.prenom);
      if (profileData?.nom) setFicheNom(profileData.nom);
      setExistingTelephone(profileData?.telephone ?? null);
      setFichePhraseTotem(profileData?.phrase_totem ?? "");
      setFicheMetier(profileData?.metier ?? null);
      setLoadedMetier(profileData?.metier ?? null);
      setFicheMetierSecondaire(profileData?.metier_secondaire ?? null);
      setLoading(false);
    });
  }, [visible, intervenantProfileId]);

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

  // Persisté immédiatement (pas via le bouton "Enregistrer" plus bas) : une
  // fois choisie, la spécialisation ouvre tout de suite le picker de soins
  // liés à ce nouveau métier, comme demandé.
  async function handleAddSpecialisation(value: string) {
    const { error } = await supabase
      .from("intervenant_profiles")
      .update({ metier_secondaire: value })
      .eq("id", intervenantProfileId);
    if (error) {
      Alert.alert("Erreur", "Impossible d'enregistrer cette spécialisation.");
      return;
    }
    setFicheMetierSecondaire(value);
    setSecondarySoinPickerOpen(true);
  }

  async function handleClearSpecialisation() {
    const { error } = await supabase
      .from("intervenant_profiles")
      .update({ metier_secondaire: null })
      .eq("id", intervenantProfileId);
    if (error) {
      Alert.alert("Erreur", "Impossible de retirer cette spécialisation.");
      return;
    }
    setFicheMetierSecondaire(null);
  }

  async function handleSecondarySoinDurationSave(minutes: number) {
    if (!secondaryPendingLabel) return;
    setSavingSecondarySoin(true);
    try {
      const payload = { label: secondaryPendingLabel, duration_minutes: minutes };
      const { error } = await supabase
        .from("intervention_types")
        .insert({ intervenant_profile_id: intervenantProfileId, ...payload });
      if (error) throw error;
      await propagateSoinChange(intervenantProfileId, { type: "create", ...payload });
      setSecondaryPendingLabel(null);
      setSoinsVersion((v) => v + 1);
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible d'enregistrer ce soin.");
    } finally {
      setSavingSecondarySoin(false);
    }
  }

  const canSave = !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const trimmedPrenom = ficheePrenom.trim();
      const trimmedNom = ficheNom.trim();
      const trimmedPhraseTotem = fichePhraseTotem.trim();

      const updatePayload: Record<string, string | null> = {};
      if (ficheMetier !== loadedMetier) updatePayload.metier = ficheMetier;
      if (Object.keys(updatePayload).length > 0) {
        const { error } = await supabase
          .from("intervenant_profiles")
          .update(updatePayload)
          .eq("id", intervenantProfileId);
        if (error) throw error;
      }

      // Upload la photo seulement si une nouvelle a été choisie — best-effort,
      // un échec ne doit pas bloquer l'enregistrement du reste de la fiche,
      // déjà réussi juste au-dessus.
      let finalPhoto = existingPhoto;
      let finalPhotoUpdatedAt = existingPhotoUpdatedAt;
      if (pickedPhotoUri) {
        try {
          const compressed = await ImageManipulator.manipulateAsync(
            pickedPhotoUri,
            [{ resize: { width: 300 } }],
            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
          );
          const fileData = await new File(compressed.uri).arrayBuffer();
          const filename = `${intervenantProfileId}.jpg`;
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
              .eq("id", intervenantProfileId);
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

      onSaved(
        intervenantProfileId, trimmedPrenom, trimmedNom,
        existingTelephone, trimmedPhraseTotem || null,
        finalPhoto, finalPhotoUpdatedAt, ficheMetier,
      );
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible d'enregistrer la fiche intervenant.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.title, { color: C.text }]}>🩺 Fiche intervenant</Text>
            <Text style={[styles.subtitle, { color: C.muted }]}>
              Modifie ta photo, ton métier ou tes soins pratiqués.
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
                <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                  <Text style={[styles.cancelBtnText, { color: C.muted }]}>Fermer</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
              {/* Corps borné (voir styles.body) : le titre ci-dessus et les
                  boutons Enregistrer/Annuler ci-dessous restent hors du
                  ScrollView, donc toujours visibles/atteignables quel que
                  soit le contenu défilé — corrige le popup qui grandissait
                  sans limite et rendait le bouton Annuler inatteignable. */}
              <ScrollView style={styles.body} showsVerticalScrollIndicator keyboardShouldPersistTaps="handled">
                <View style={styles.photoPicker}>
                  <TouchableOpacity onPress={pickPhoto} activeOpacity={0.8} style={{ alignItems: "center", gap: 8 }}>
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
                  {/* Lecture seule : même rendu (police/couleur) que la fiche
                      publique (IntervenantProfileModal) — prénom/nom/totem ne
                      se modifient plus depuis ce champ, voir handleSave. */}
                  <Text style={[styles.ficheName, { color: C.text }]}>{ficheePrenom} {ficheNom}</Text>
                  {!!fichePhraseTotem && (
                    <Text style={styles.ficheTotem} numberOfLines={2}>{fichePhraseTotem}</Text>
                  )}
                </View>

                <Text style={[styles.metierLabel, { color: C.gold }]}>Métier / spécialisation (optionnel)</Text>
                <TouchableOpacity
                  style={[styles.metierBtn, { backgroundColor: C.orange }]}
                  onPress={() => setMetierPickerOpen(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="briefcase-outline" size={16} color="#fff" />
                  <Text style={styles.metierBtnText} numberOfLines={1}>
                    {ficheMetier ? metierLabel(ficheMetier) : "Choisir un métier"}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#fff" />
                </TouchableOpacity>

                <Text style={[styles.metierLabel, { color: C.gold }]}>2ᵉ spécialisation</Text>
                {ficheMetierSecondaire ? (
                  <View style={[styles.row, { marginBottom: 16 }]}>
                    <TouchableOpacity
                      style={[styles.metierBtn, { backgroundColor: C.orange, flex: 1, marginBottom: 0 }]}
                      onPress={() => setMetierSecondairePickerOpen(true)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="briefcase-outline" size={16} color="#fff" />
                      <Text style={styles.metierBtnText} numberOfLines={1}>{metierLabel(ficheMetierSecondaire)}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleClearSpecialisation} style={styles.removeBtn}>
                      <Text style={{ color: C.danger, fontSize: 18 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => setMetierSecondairePickerOpen(true)}
                    style={[styles.addSoinBtn, { backgroundColor: LOGO_GREEN }]}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="add-circle-outline" size={18} color="#fff" />
                    <Text style={styles.addSoinBtnText}>Ajouter une spécialisation</Text>
                  </TouchableOpacity>
                )}

                <View style={[styles.separator, { borderTopColor: C.border }]} />
                <Text style={[styles.metierLabel, { color: C.gold }]}>Mes soins</Text>
                <MesSoinsList
                  key={soinsVersion}
                  intervenantProfileId={intervenantProfileId}
                  metiers={[ficheMetier, ficheMetierSecondaire]}
                  C={C}
                />
              </ScrollView>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: C.accent }, !canSave && { opacity: 0.5 }]}
                onPress={handleSave}
                disabled={!canSave}
                activeOpacity={0.85}
              >
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Enregistrer</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                <Text style={[styles.cancelBtnText, { color: C.muted }]}>Annuler</Text>
              </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>

    <MetierPickerModal
      visible={metierPickerOpen}
      C={C}
      onClose={() => setMetierPickerOpen(false)}
      onPick={setFicheMetier}
    />

    <MetierPickerModal
      visible={metierSecondairePickerOpen}
      C={C}
      excludeKey={ficheMetier}
      onClose={() => setMetierSecondairePickerOpen(false)}
      onPick={handleAddSpecialisation}
    />

    <SoinPickerModal
      visible={secondarySoinPickerOpen}
      metiers={[ficheMetierSecondaire]}
      value=""
      C={C}
      onClose={() => setSecondarySoinPickerOpen(false)}
      onPick={(label) => setSecondaryPendingLabel(label)}
    />

    <SoinDurationModal
      visible={secondaryPendingLabel !== null}
      label={secondaryPendingLabel ?? ""}
      saving={savingSecondarySoin}
      C={C}
      onClose={() => setSecondaryPendingLabel(null)}
      onSave={handleSecondarySoinDurationSave}
    />
    </>
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
    maxHeight: "85%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
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
  // Même rendu que le nom/la phrase totem sur la fiche publique
  // (IntervenantProfileModal styles.name / styles.totem) — couleur du totem
  // fixe (pas de token de thème), voulue identique en Light et Dark.
  ficheName: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 18,
    textAlign: "center",
  },
  ficheTotem: {
    fontFamily: "Caveat_600SemiBold",
    fontSize: 17,
    color: "#7EC8E3",
    textAlign: "center",
    marginTop: 3,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  metierLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 },
  metierBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, padding: 12, marginBottom: 16 },
  metierBtnText: { flex: 1, fontFamily: "DM_Sans_600SemiBold", fontSize: 14, color: "#fff" },
  addSoinBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 13, marginBottom: 20, marginTop: 4 },
  addSoinBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
  separator: { borderTopWidth: 1, marginVertical: 16 },
  // Hauteur bornée (même convention que DaySoinsModal/IntervenantProfileModal) :
  // le corps défilable est borné indépendamment du titre et des boutons
  // Enregistrer/Annuler ci-dessous, qui restent hors du ScrollView et donc
  // toujours visibles quel que soit le nombre de soins ajoutés.
  body: { maxHeight: 420, marginBottom: 4 },
  removeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
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
