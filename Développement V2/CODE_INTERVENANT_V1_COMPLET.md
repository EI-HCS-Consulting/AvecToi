# Code intervenant V1 — archive complète

Ce document rassemble l'intégralité du code lié à la fonctionnalité "intervenant" telle qu'elle existe sur `main` au commit `4b1b8c7` (V1 de l'application AvecToi), avant son retrait de la V1. Elle est conservée ici pour permettre une réintégration ultérieure en V2 avec un minimum d'effort : la Section A contient des fichiers 100% dédiés à restaurer tels quels, la Section B des extraits de fichiers partagés à retisser manuellement, la Section C les migrations SQL, et la Section D les types TypeScript concernés.

## Sommaire

- [Section A — Fichiers dédiés (100% intervenant, à restaurer tels quels)](#section-a-fichiers-dédiés-100-intervenant-à-restaurer-tels-quels)
  - [components/IntervenantFicheModal.tsx](#componentsintervenantfichemodaltsx)
  - [components/IntervenantProfileModal.tsx](#componentsintervenantprofilemodaltsx)
  - [components/IntervenantOnboardingFlow.tsx](#componentsintervenantonboardingflowtsx)
  - [components/AdminNewIntervenantFlow.tsx](#componentsadminnewintervenantflowtsx)
  - [components/IntervenantPlanningPanel.tsx](#componentsintervenantplanningpaneltsx)
  - [components/IntervenantPriorityModal.tsx](#componentsintervenantprioritymodaltsx)
  - [components/IntervenantGlobalCalendar.tsx](#componentsintervenantglobalcalendartsx)
  - [components/IntervenantsList.tsx](#componentsintervenantslisttsx)
  - [components/IntervenantsBlock.tsx](#componentsintervenantsblocktsx)
  - [components/IntervenantsListModal.tsx](#componentsintervenantslistmodaltsx)
  - [components/NewsIntervenantModal.tsx](#componentsnewsintervenantmodaltsx)
  - [components/NightIntervenantModal.tsx](#componentsnightintervenantmodaltsx)
  - [components/InterventionEditFlow.tsx](#componentsinterventioneditflowtsx)
  - [components/InterventionBookingFlow.tsx](#componentsinterventionbookingflowtsx)
  - [components/NightInterventionBookingFlow.tsx](#componentsnightinterventionbookingflowtsx)
  - [components/AdminAddIntervention.tsx](#componentsadminaddinterventiontsx)
  - [components/MesSoinsList.tsx](#componentsmessoinslisttsx)
  - [components/SoinsPeriodBlock.tsx](#componentssoinsperiodblocktsx)
  - [components/SoinsPlanifiesBlock.tsx](#componentssoinsplanifiesblocktsx)
  - [components/SoinPickerModal.tsx](#componentssoinpickermodaltsx)
  - [components/SoinFormModal.tsx](#componentssoinformmodaltsx)
  - [components/SoinDurationModal.tsx](#componentssoindurationmodaltsx)
  - [components/SoinLabelPicker.tsx](#componentssoinlabelpickertsx)
  - [components/SoinsDayDetail.tsx](#componentssoinsdaydetailtsx)
  - [components/SoinAvatar.tsx](#componentssoinavatartsx)
  - [components/SoinActionModal.tsx](#componentssoinactionmodaltsx)
  - [components/MetierPickerModal.tsx](#componentsmetierpickermodaltsx)
  - [components/DaySoinsModal.tsx](#componentsdaysoinsmodaltsx)
  - [components/BookingProposalAlertModal.tsx](#componentsbookingproposalalertmodaltsx)
  - [components/WeeklyPlanningGrid.tsx](#componentsweeklyplanninggridtsx)
  - [components/DaySlotGrid.tsx](#componentsdayslotgridtsx)
  - [components/PatientColorLegend.tsx](#componentspatientcolorlegendtsx)
  - [components/PlanningLegend.tsx](#componentsplanninglegendtsx)
  - [components/PatientsList.tsx](#componentspatientslisttsx)
  - [lib/metiers.ts](#libmetiersts)
  - [lib/interventionTypesSync.ts](#libinterventiontypessyncts)
  - [lib/useOtherSpaceInterventions.ts](#libuseotherspaceinterventionsts)
  - [lib/intervenantSpaceSwitch.ts](#libintervenantspaceswitchts)
  - [lib/nightIntervenantAuth.ts](#libnightintervenantauthts)
  - [app/auth/intervenant-entry.tsx](#appauthintervenant-entrytsx)
  - [app/(admin)/intervenants.tsx](#appadminintervenantstsx)
  - [app/(visitor)/intervenants.tsx](#appvisitorintervenantstsx)
  - [app/(visitor)/patients.tsx](#appvisitorpatientstsx)
  - [app/(visitor)/soins.tsx](#appvisitorsoinstsx)
  - [app/(visitor)/home/planning.tsx](#appvisitorhomeplanningtsx)
  - [supabase/functions/notify-intervention-confirmation/index.ts](#supabasefunctionsnotify-intervention-confirmationindexts)
- [Section B — Fichiers partagés (extraits intervenant à réintégrer manuellement, PAS à copier-coller tels quels)](#section-b-fichiers-partagés-extraits-intervenant-à-réintégrer-manuellement-pas-à-copier-coller-tels-quels)
  - [lib/visitorEntry.ts](#libvisitorentryts)
  - [lib/visitorSession.ts](#libvisitorsessionts)
  - [lib/freemiumCap.ts](#libfreemiumcapts)
  - [app/index.tsx](#appindextsx)
  - [app/(admin)/settings.tsx](#appadminsettingstsx)
  - [app/(admin)/home/calendar.tsx](#appadminhomecalendartsx)
  - [app/(admin)/news.tsx](#appadminnewstsx)
  - [app/(admin)/_layout.tsx](#appadmin_layouttsx)
  - [app/(visitor)/_layout.tsx](#appvisitor_layouttsx)
  - [app/(visitor)/account.tsx](#appvisitoraccounttsx)
  - [app/(visitor)/home/calendar.tsx](#appvisitorhomecalendartsx)
  - [app/(visitor)/home/nights.tsx](#appvisitorhomenightstsx)
  - [app/(visitor)/home/slots.tsx](#appvisitorhomeslotstsx)
  - [app/(visitor)/news.tsx](#appvisitornewstsx)
  - [components/NewsFeed.tsx](#componentsnewsfeedtsx)
  - [components/MyChecklist.tsx](#componentsmychecklisttsx)
  - [components/VisitorSlotsList.tsx](#componentsvisitorslotslisttsx)
  - [components/PlanningDuJourBlock.tsx](#componentsplanningdujourblocktsx)
  - [components/AdminSlotsList.tsx](#componentsadminslotslisttsx)
  - [components/VisitorsList.tsx](#componentsvisitorslisttsx)
  - [components/VisitorsBlock.tsx](#componentsvisitorsblocktsx)
  - [components/Entraide.tsx](#componentsentraidetsx)
  - [components/WeekStrip.tsx](#componentsweekstriptsx)
  - [lib/SpaceContext.tsx](#libspacecontexttsx)
  - [lib/VisitorContext.tsx](#libvisitorcontexttsx)
- [Section C — Migrations SQL (intervenant, dédiées et mixtes)](#section-c-migrations-sql-intervenant-dédiées-et-mixtes)
  - [supabase/migrations/20260717_intervenant_tables.sql](#supabasemigrations20260717_intervenant_tablessql)
  - [supabase/migrations/20260717_patient_spaces_intervenants_enabled.sql](#supabasemigrations20260717_patient_spaces_intervenants_enabledsql)
  - [supabase/migrations/20260717_reservations_intervention_columns.sql](#supabasemigrations20260717_reservations_intervention_columnssql)
  - [supabase/migrations/20260717_book_intervention.sql](#supabasemigrations20260717_book_interventionsql)
  - [supabase/migrations/20260717_apply_slot_rule_change_intervention_aware.sql](#supabasemigrations20260717_apply_slot_rule_change_intervention_awaresql)
  - [supabase/migrations/20260717_check_slot_capacity_intervention_aware.sql](#supabasemigrations20260717_check_slot_capacity_intervention_awaresql)
  - [supabase/migrations/20260717_reservations_type_check_intervention.sql](#supabasemigrations20260717_reservations_type_check_interventionsql)
  - [supabase/migrations/20260719_intervenant_profiles_contact.sql](#supabasemigrations20260719_intervenant_profiles_contactsql)
  - [supabase/migrations/20260719_intervenant_profiles_unique_identity.sql](#supabasemigrations20260719_intervenant_profiles_unique_identitysql)
  - [supabase/migrations/20260719_intervenant_profiles_photo_version.sql](#supabasemigrations20260719_intervenant_profiles_photo_versionsql)
  - [supabase/migrations/20260720_intervenant_profiles_telephone_index.sql](#supabasemigrations20260720_intervenant_profiles_telephone_indexsql)
  - [supabase/migrations/20260720_book_intervention_one_visit_per_day.sql](#supabasemigrations20260720_book_intervention_one_visit_per_daysql)
  - [supabase/migrations/20260722_intervenant_metier_news_priority.sql](#supabasemigrations20260722_intervenant_metier_news_prioritysql)
  - [supabase/migrations/20260723_fix_check_slot_capacity_migration_order.sql](#supabasemigrations20260723_fix_check_slot_capacity_migration_ordersql)
  - [supabase/migrations/20260724_intervenant_profiles_photo.sql](#supabasemigrations20260724_intervenant_profiles_photosql)
  - [supabase/migrations/20260728_intervenant_checklist_templates.sql](#supabasemigrations20260728_intervenant_checklist_templatessql)
  - [supabase/migrations/20260813_intervenant_profiles_metier_secondaire.sql](#supabasemigrations20260813_intervenant_profiles_metier_secondairesql)
  - [supabase/migrations/20260813_night_authorized_intervenants.sql](#supabasemigrations20260813_night_authorized_intervenantssql)
  - [supabase/migrations/20260813_slot_config_night_intervenant_mode.sql](#supabasemigrations20260813_slot_config_night_intervenant_modesql)
  - [supabase/migrations/20260814_news_intervenant_mode.sql](#supabasemigrations20260814_news_intervenant_modesql)
  - [supabase/migrations/20260815_intervention_types_intervenant_identity.sql](#supabasemigrations20260815_intervention_types_intervenant_identitysql)
  - [supabase/migrations/20260815_apply_slot_rule_change_skip_already_past_slots.sql](#supabasemigrations20260815_apply_slot_rule_change_skip_already_past_slotssql)
  - [supabase/migrations/20260815_fix_book_intervention_same_day_rebook_order.sql](#supabasemigrations20260815_fix_book_intervention_same_day_rebook_ordersql)
  - [supabase/migrations/20260816_book_intervention_cross_space_overlap.sql](#supabasemigrations20260816_book_intervention_cross_space_overlapsql)
  - [supabase/migrations/20260817_intervenant_no_login_and_booking_alerts.sql](#supabasemigrations20260817_intervenant_no_login_and_booking_alertssql)
- [Section D — Types (lib/types.ts)](#section-d-types-libtypests)
  - [IntervenantProfile](#intervenantprofile)
  - [InterventionType](#interventiontype)
  - [IntervenantChecklistTemplate](#intervenantchecklisttemplate)
  - [Champs et références "intervenant" sur les interfaces partagées (PatientSpace, SlotConfig, Reservation, NewsEntry, etc.)](#champs-et-références-intervenant-sur-les-interfaces-partagées-patientspace-slotconfig-reservation-newsentry-etc)
## Section A — Fichiers dédiés (100% intervenant, à restaurer tels quels)

### components/IntervenantFicheModal.tsx

```tsx
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
    metier: string | null, email: string | null,
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
  // Éditable ici (contrairement au téléphone) — sert à envoyer une
  // confirmation de créneau par email, voir AdminAddIntervention.handleSendConfirmation.
  const [ficheEmail, setFicheEmail] = useState("");
  const [loadedEmail, setLoadedEmail] = useState<string | null>(null);
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
        .select("prenom, nom, photo, photo_updated_at, telephone, phrase_totem, metier, metier_secondaire, email")
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
      setFicheEmail(profileData?.email ?? "");
      setLoadedEmail(profileData?.email ?? null);
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
      const trimmedEmail = ficheEmail.trim();

      const updatePayload: Record<string, string | null> = {};
      if (ficheMetier !== loadedMetier) updatePayload.metier = ficheMetier;
      if ((trimmedEmail || null) !== loadedEmail) updatePayload.email = trimmedEmail || null;
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
        finalPhoto, finalPhotoUpdatedAt, ficheMetier, trimmedEmail || null,
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

                <Text style={[styles.metierLabel, { color: C.gold }]}>Email (optionnel)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text, marginBottom: 16 }]}
                  placeholder="Adresse email"
                  placeholderTextColor={C.muted}
                  value={ficheEmail}
                  onChangeText={setFicheEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

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
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontFamily: "DM_Sans_400Regular", fontSize: 14, marginBottom: 8 },
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

```

### components/IntervenantProfileModal.tsx

```tsx
import { useEffect, useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  Modal, StyleSheet, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { isSlotFullyPast } from "@/lib/slotUtils";
import PatientAvatar from "@/components/PatientAvatar";
import SoinAvatar from "@/components/SoinAvatar";
import { metierLabel } from "@/lib/metiers";
import type { Reservation, InterventionType } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Fiche intervenant en lecture seule — ouverte en cliquant un intervenant
// dans la liste "Fiches intervenants" de (admin)/intervenants.tsx, le bloc
// "Intervenants" des Paramètres admin, ou la liste "Intervenants" côté
// visiteur (Mon compte). Contrairement à VisitorProfileModal (rapprochement
// par prénom+nom, pas de compte visiteur), intervenant_profile_id est une
// vraie FK sur reservations : le rapprochement est donc exact, pas
// approximatif.

// updatedAt bust le cache CDN/<Image> — voir IntervenantFicheModal.tsx pour
// le détail (nom de fichier fixe + upsert, sans ça un ré-upload continuerait
// d'afficher l'ancienne photo).
function intervenantPhotoUrl(filename: string, updatedAt?: string | null) {
  const { data } = supabase.storage.from("intervenant-photos").getPublicUrl(filename);
  return updatedAt ? `${data.publicUrl}?v=${new Date(updatedAt).getTime()}` : data.publicUrl;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  spaceId: string;
  intervenantProfileId: string;
  prenom: string;
  nom: string;
  C: Theme;
  isAdmin: boolean;
  // Côté visiteur, permet au parent de positionner le bon jour avant de
  // naviguer (voir app/(visitor)/account.tsx handleOpenReservation, même
  // pattern) — le paramètre focusDate n'existe que sur la route admin des
  // créneaux (app/(admin)/home/slots.tsx), pas sur celle du visiteur.
  onGoToSlot?: (date: string) => void;
}

export default function IntervenantProfileModal({
  visible, onClose, spaceId, intervenantProfileId, prenom, nom, C, isAdmin, onGoToSlot,
}: Props) {
  const router = useRouter();
  const basePath = isAdmin ? "/(admin)" : "/(visitor)";

  const [loading, setLoading] = useState(true);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [metier, setMetier] = useState<string | null>(null);
  const [phraseTotem, setPhraseTotem] = useState<string | null>(null);
  const [soinsProposes, setSoinsProposes] = useState<InterventionType[]>([]);
  const [planifies, setPlanifies] = useState<Reservation[]>([]);
  const [faits, setFaits] = useState<Reservation[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data }, { data: profileData }, { data: typesData }] = await Promise.all([
      supabase
        .from("reservations")
        .select("*")
        .eq("space_id", spaceId)
        .eq("intervenant_profile_id", intervenantProfileId)
        .eq("type", "Intervention")
        .order("date", { ascending: true })
        .order("creneau", { ascending: true }),
      supabase
        .from("intervenant_profiles")
        .select("photo, photo_updated_at, metier, phrase_totem")
        .eq("id", intervenantProfileId)
        .maybeSingle(),
      supabase
        .from("intervention_types")
        .select("*")
        .eq("intervenant_profile_id", intervenantProfileId)
        .order("created_at", { ascending: true }),
    ]);

    const soins: Reservation[] = data || [];
    setPlanifies(soins.filter((r) => !isSlotFullyPast(r.date, r.creneau)));
    setFaits(soins.filter((r) => isSlotFullyPast(r.date, r.creneau)).reverse());
    setPhotoUrl(profileData?.photo ? intervenantPhotoUrl(profileData.photo, profileData.photo_updated_at) : null);
    setMetier(profileData?.metier ?? null);
    setPhraseTotem(profileData?.phrase_totem ?? null);
    setSoinsProposes(typesData || []);
    setLoading(false);
  }, [spaceId, intervenantProfileId]);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  function goToSlot(date: string) {
    onClose();
    if (onGoToSlot) {
      onGoToSlot(date);
      return;
    }
    router.push({ pathname: `${basePath}/home/slots`, params: { focusDate: date } } as any);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.accent }]}>
          <View style={[styles.headerRow, { borderBottomColor: C.border }]}>
            <PatientAvatar photoUrl={photoUrl} firstname={prenom} lastname={nom} size={64} C={C} metier={metier} />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.name, { color: C.text }]}>{prenom} {nom}</Text>
              <Text style={[styles.sub, { color: C.muted }]}>
                {metier ? metierLabel(metier) : "Fiche intervenant"}
              </Text>
              {!!phraseTotem && (
                <Text style={styles.totem} numberOfLines={2}>{phraseTotem}</Text>
              )}
            </View>
          </View>

          {loading ? (
            <ActivityIndicator color={C.accent} style={{ marginVertical: 32 }} />
          ) : (
            <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 4 }}>
              <Section title="✨ Soins proposés" C={C} empty={soinsProposes.length === 0} emptyText="Aucun soin renseigné pour l'instant.">
                <View style={styles.soinsChips}>
                  {soinsProposes.map((s) => (
                    <View key={s.id} style={[styles.soinChip, { borderColor: C.border, backgroundColor: C.bg }]}>
                      <SoinAvatar label={s.label} size={26} C={C} />
                      <Text style={[styles.soinChipText, { color: C.text }]} numberOfLines={1}>{s.label}</Text>
                    </View>
                  ))}
                </View>
              </Section>

              <Section title={`🩺 Soins planifiés (${planifies.length})`} C={C} empty={planifies.length === 0} emptyText="Aucun soin planifié.">
                {planifies.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={styles.row}
                    activeOpacity={0.7}
                    onPress={() => goToSlot(r.date)}
                  >
                    <Text style={[styles.rowText, { color: C.text, flex: 1 }]}>
                      {new Date(r.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} · {r.creneau}
                      {r.intervention_label ? ` — ${r.intervention_label}` : ""}
                    </Text>
                    <Text style={[styles.chevron, { color: C.muted }]}>›</Text>
                  </TouchableOpacity>
                ))}
              </Section>

              <Section title={`✅ Soins faits (${faits.length})`} C={C} empty={faits.length === 0} emptyText="Aucun soin réalisé pour le moment." last>
                {faits.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={styles.row}
                    activeOpacity={0.7}
                    onPress={() => goToSlot(r.date)}
                  >
                    <Text style={[styles.rowText, { color: C.text, flex: 1 }]}>
                      {new Date(r.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} · {r.creneau}
                      {r.intervention_label ? ` — ${r.intervention_label}` : ""}
                    </Text>
                    <Text style={[styles.chevron, { color: C.muted }]}>›</Text>
                  </TouchableOpacity>
                ))}
              </Section>
            </ScrollView>
          )}

          <TouchableOpacity onPress={onClose} style={styles.closeFooterBtn}>
            <Text style={[styles.closeFooterBtnText, { color: C.muted }]}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function Section({
  title, C, empty, emptyText, last, children,
}: { title: string; C: Theme; empty: boolean; emptyText: string; last?: boolean; children: React.ReactNode }) {
  return (
    <View style={[styles.section, !last && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
      <Text style={[styles.sectionTitle, { color: C.gold }]}>{title}</Text>
      {empty ? <Text style={[styles.emptyText, { color: C.muted }]}>{emptyText}</Text> : children}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", maxWidth: 400, maxHeight: "85%", borderRadius: 20, borderWidth: 1, padding: 24 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, paddingBottom: 16, borderBottomWidth: 1 },
  name: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18 },
  sub: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },
  // Couleur fixe (pas de token de thème) : même convention que
  // PatientProfileModal/VisitorsBlock/SpaceHeader pour une phrase totem,
  // voulue identique en Light et Dark.
  totem: { fontFamily: "Caveat_600SemiBold", fontSize: 17, color: "#7EC8E3", marginTop: 3 },
  closeFooterBtn: { alignItems: "center", marginTop: 14 },
  closeFooterBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },

  scroll: { maxHeight: 360 },
  section: { paddingVertical: 14 },
  sectionTitle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 6, gap: 8 },
  rowText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, lineHeight: 19 },
  chevron: { fontFamily: "DM_Sans_700Bold", fontSize: 16 },

  soinsChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  soinChip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10, maxWidth: "100%" },
  soinChipText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
});

```

### components/IntervenantOnboardingFlow.tsx

```tsx
import { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Modal, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert, Animated,
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
    metier: string | null, email: string | null,
  ) => void;
}

type Step = "telephone" | "totem" | "metier" | "soins" | "email";

const SLIDE_DISTANCE = 56;

export default function IntervenantOnboardingFlow({
  visible, spaceId, prenom, nom, pin, pickedPhotoUri, theme: C, onCreated,
}: Props) {
  const [step, setStep] = useState<Step>("telephone");
  // Transition "droite → gauche" entre étapes : chaque nouvelle étape glisse
  // depuis la droite (Suivant) ou la gauche (Retour) avec un léger fondu —
  // RN Modal n'a pas de animationType directionnel, donc un seul Modal reste
  // monté (voir le retour du composant) et c'est ce contenu qui s'anime.
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
  const [telephone, setTelephone] = useState("");
  const [knownElsewhere, setKnownElsewhere] = useState(false);
  const [phraseTotem, setPhraseTotem] = useState("");
  const [metier, setMetier] = useState<string | null>(null);
  const [metierPickerOpen, setMetierPickerOpen] = useState(false);
  const [soins, setSoins] = useState<PendingSoin[]>([]);
  const [soinPickerOpen, setSoinPickerOpen] = useState(false);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const [email, setEmail] = useState("");
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
      const trimmedEmail = email.trim();

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
          email: trimmedEmail || null,
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
        finalPhoto, finalPhotoUpdatedAt, metier, trimmedEmail || null,
      );
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible de créer ta fiche intervenant.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
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
              {step === "telephone" && (
                <>
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
                    onPress={() => telephone.trim() && goToStep("totem", 1)}
                    disabled={!telephone.trim()}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.nextBtnText}>Suivant</Text>
                  </TouchableOpacity>
                </>
              )}

              {step === "totem" && (
                <>
                  <TouchableOpacity onPress={() => goToStep("telephone", -1)} style={{ marginBottom: 8 }}>
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
                    onPress={() => goToStep("metier", 1)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.nextBtnText}>Suivant</Text>
                  </TouchableOpacity>
                </>
              )}

              {step === "metier" && (
                <>
                  <TouchableOpacity onPress={() => goToStep("totem", -1)} style={{ marginBottom: 8 }}>
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
                  <Text style={[styles.title, { color: C.text }]}>✉️ Ton email</Text>
                  <Text style={[styles.subtitle, { color: C.muted }]}>
                    Facultatif — permet à l'administrateur de te confirmer un créneau réservé par email.
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                    placeholder="Email (optionnel)"
                    placeholderTextColor={C.muted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                  />
                  <TouchableOpacity
                    style={[styles.nextBtn, { backgroundColor: C.accent }, submitting && { opacity: 0.5 }]}
                    onPress={handleCreateAccount}
                    disabled={submitting}
                    activeOpacity={0.85}
                  >
                    {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.nextBtnText}>Créer mon compte</Text>}
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
  nextBtn: { borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 4 },
  nextBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 15, color: "#fff" },
});

```

### components/AdminNewIntervenantFlow.tsx

```tsx
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

```

### components/IntervenantPlanningPanel.tsx

```tsx
import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { Theme } from "@/lib/themes";
import type { Reservation } from "@/lib/types";
import { toFrShort, isSlotFullyPast, isMyReservation } from "@/lib/slotUtils";

// Panneau planning intégré au calendrier visiteur, commun aux 3 rôles —
// affiche les soins (tous intervenants) ou les visites/nuitées (selon
// soinsMode, voir plus bas) sous le calendrier familial
// (Mensuel) ou la bande Hebdo (WeekStrip), qui couvrent déjà la vue du jour
// courant/sélectionné pour tous les rôles (voir home/calendar.tsx) — plus
// besoin d'une grille dédiée ici. Scindé en deux sous-sections : à venir
// (toujours visible) et historique (déjà passé, repliée par défaut — même
// pattern que SoinsPlanifiesBlock). Le bascule à venir/passé est précise à la
// minute près via isSlotFullyPast, pas seulement au jour près.
// soinsMode (vue Visites/Soins du calendrier, home/calendar.tsx) détermine ce
// que ce panneau liste : soins réservés par des intervenants (soinsMode) ou
// visites/nuitées réservées par des visiteurs (!soinsMode) — labels et filtre
// de type basculent ensemble, même quand l'intervenant regarde la vue
// Visites.
interface Props {
  C: Theme;
  reservations: Reservation[];
  soinsMode: boolean;
  // Identité de session — sert uniquement à repérer, dans un groupe partagé
  // par plusieurs visiteurs, laquelle des réservations est la mienne, pour
  // n'afficher le bouton "Modifier" qu'à côté de mon propre nom (voir onEdit).
  myPin?: string | null;
  myPrenom?: string | null;
  myNom?: string | null;
  // Ouvre le modal PIN → Modifier/Annuler existant (BookingFlow.openPinModal)
  // pour la réservation visée. Omis pour les soins (pas de flux de
  // modification équivalent depuis ce panneau) et pour les rôles autres que
  // visiteur, qui n'ont pas de réservation "à eux" ici.
  onEdit?: (r: Reservation) => void;
  // Fourni uniquement quand un intervenant regarde ce panneau en mode
  // Visites avec "Afficher mes créneaux" actif (voir home/calendar.tsx) :
  // laisse remonter, au milieu des visites/nuitées, ses propres soins
  // (type Intervention) plutôt que de les exclure comme le ferait le filtre
  // normal de ce mode.
  myIntervenantProfileId?: string | null;
  // Période actuellement parcourue au-dessus (Mensuel/Hebdo, home/
  // calendar.tsx) au format "YYYY-MM-DD" — la section "à venir" ne liste
  // plus que les réservations dans cette période ; celles au-delà basculent
  // dans une sous-rubrique "Autres" distincte, voir plus bas.
  periodStartIso: string;
  periodEndIso: string;
  // "cette semaine" (Hebdo) ou "ce mois-ci" (Mensuel) — utilisé dans le
  // message affiché quand la période sélectionnée est vide.
  periodLabel: string;
}

function PlanningCard({
  group, C, done, soinsMode, myPin, myPrenom, myNom, onEdit,
}: {
  group: Reservation[]; C: Theme; done: boolean; soinsMode: boolean;
  myPin?: string | null; myPrenom?: string | null; myNom?: string | null;
  onEdit?: (r: Reservation) => void;
}) {
  const first = group[0];
  return (
    <View style={[styles.historyCard, { backgroundColor: C.card, borderColor: C.border }]}>
      <View style={styles.historyHeader}>
        <Text style={[styles.historyDate, { color: C.text }]}>
          {toFrShort(new Date(first.date + "T12:00:00"))} · {first.creneau}
        </Text>
        <Text style={[styles.historyStatus, { color: done ? C.success : C.orange }]}>
          {soinsMode ? (done ? "Effectué" : "Planifié") : (done ? "Passée" : "À venir")}
        </Text>
      </View>
      {/* Un seul titre "Visite"/"Nuitée"/"Soin" pour tout le groupe (tous les
          membres du groupe partagent le même créneau donc, en pratique
          presque toujours, le même type) — en soins, le libellé reste par
          personne, un même créneau pouvant en théorie porter des soins
          différents. En mode Visites, un intervenant qui affiche "mes
          créneaux" peut voir remonter ici son propre soin (voir
          myIntervenantProfileId) : "Soin" plutôt que "Visite" dans ce cas. */}
      {!soinsMode && (
        <Text style={[styles.historyLabel, { color: C.text }]}>
          {first.type === "Nuit" ? "Nuitée" : first.type === "Intervention" ? "Soin" : "Visite"}
        </Text>
      )}
      {group.map((r, i) => {
        // r.pin === "ADMIN" (réservation créée par l'accueil, ex. nuitée
        // arrangée par téléphone) : on veut bien la reconnaître comme
        // "mienne" pour l'affichage dans ce panneau (voir isMyReservation),
        // mais pas proposer "Modifier" — le PIN saisi lors de la réservation
        // n'existe pas pour ce cas, le visiteur ne pourrait jamais passer le
        // contrôle PIN qui suit.
        const mine = !soinsMode && r.type !== "Intervention" && r.pin !== "ADMIN"
          && isMyReservation(r, myPin ?? null, null, myPrenom ?? null, myNom ?? null);
        return (
          <View key={r.id} style={i > 0 ? { marginTop: 8 } : undefined}>
            {(soinsMode || r.type === "Intervention") && (
              <Text style={[styles.historyLabel, { color: C.text }]}>{r.intervention_label}</Text>
            )}
            <View style={styles.historyByRow}>
              <Text style={[styles.historyBy, { color: C.muted }]}>{r.prenom} {r.nom}</Text>
              {mine && onEdit && (
                <TouchableOpacity onPress={() => onEdit(r)} activeOpacity={0.7} style={styles.editBtn}>
                  <Text style={[styles.editBtnText, { color: C.accent }]}>✏️ Modifier</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// Regroupe les réservations partageant le même date+créneau (ex : 2
// visiteurs réservés sur le même créneau) dans un seul bloc/carte au lieu
// d'une carte par réservation.
function groupByDateCreneau(list: Reservation[]): Reservation[][] {
  const map = new Map<string, Reservation[]>();
  for (const r of list) {
    const key = `${r.date}|${r.creneau}`;
    const existing = map.get(key);
    if (existing) existing.push(r);
    else map.set(key, [r]);
  }
  return Array.from(map.values());
}

export default function IntervenantPlanningPanel({
  C, reservations, soinsMode, myPin, myPrenom, myNom, onEdit, myIntervenantProfileId,
  periodStartIso, periodEndIso, periodLabel,
}: Props) {
  const [historyOpen, setHistoryOpen] = useState(false);

  const filtered = reservations.filter((r) =>
    soinsMode
      ? r.type === "Intervention"
      : r.type === "Visite" || r.type === "Nuit"
        || (!!myIntervenantProfileId && r.type === "Intervention" && r.intervenant_profile_id === myIntervenantProfileId)
  );

  const notPast = filtered.filter((r) => !isSlotFullyPast(r.date, r.creneau));
  // "À venir" : restreinte à la période actuellement parcourue au-dessus
  // (mois en vue Mensuel, semaine en vue Hebdo — voir periodStartIso/
  // periodEndIso, home/calendar.tsx). "Autres" : le reste des réservations à
  // venir, hors de cette période (typiquement les semaines/mois suivants) —
  // repliée par défaut comme l'historique, mais seulement affichée si non
  // vide.
  const inPeriod = notPast.filter((r) => r.date >= periodStartIso && r.date <= periodEndIso);
  const others = notPast.filter((r) => r.date < periodStartIso || r.date > periodEndIso);

  // Liste "à venir" : chronologique, la prochaine réservation en premier.
  // Historique : anté-chronologique, la plus récemment passée en premier.
  // Regroupées par date+créneau : 2 réservations sur le même créneau
  // (ex. 2 visiteurs) forment un seul bloc au lieu de deux cartes séparées.
  const upcoming = groupByDateCreneau(inPeriod)
    .sort((a, b) => (a[0].date + a[0].creneau).localeCompare(b[0].date + b[0].creneau));
  const otherUpcoming = groupByDateCreneau(others)
    .sort((a, b) => (a[0].date + a[0].creneau).localeCompare(b[0].date + b[0].creneau));
  const past = groupByDateCreneau(
    filtered.filter((r) => isSlotFullyPast(r.date, r.creneau))
  ).sort((a, b) => (b[0].date + b[0].creneau).localeCompare(a[0].date + a[0].creneau));

  const upcomingTitle = soinsMode ? "Soins planifiés" : "Visites planifiées";
  const othersTitle = soinsMode ? "Autres soins planifiés" : "Autres visites planifiées";
  const historyTitle = soinsMode ? "Historique des soins" : "Historique des visites";

  return (
    <View>
      <Text style={[styles.sectionTitle, { color: C.gold }]}>{upcomingTitle}</Text>
      {upcoming.length === 0 ? (
        <Text style={[styles.emptyText, { color: C.muted }]}>
          {soinsMode ? `Aucun soin planifié ${periodLabel}.` : `Aucune visite planifiée ${periodLabel}.`}
        </Text>
      ) : (
        upcoming.map((g) => (
          <PlanningCard
            key={g[0].id} group={g} C={C} done={false} soinsMode={soinsMode}
            myPin={myPin} myPrenom={myPrenom} myNom={myNom} onEdit={onEdit}
          />
        ))
      )}

      {otherUpcoming.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, styles.othersTitle, { color: C.gold }]}>{othersTitle}</Text>
          {otherUpcoming.map((g) => (
            <PlanningCard
              key={g[0].id} group={g} C={C} done={false} soinsMode={soinsMode}
              myPin={myPin} myPrenom={myPrenom} myNom={myNom} onEdit={onEdit}
            />
          ))}
        </>
      )}

      <TouchableOpacity onPress={() => setHistoryOpen((o) => !o)} activeOpacity={0.7} style={styles.historyToggle}>
        <Text style={[styles.sectionTitle, { color: C.gold, marginBottom: 0 }]}>
          {historyTitle}{past.length > 0 ? ` (${past.length})` : ""}
        </Text>
        <Text style={[styles.toggleIcon, { color: C.muted }]}>{historyOpen ? "▾" : "▸"}</Text>
      </TouchableOpacity>

      {historyOpen && (
        past.length === 0 ? (
          <Text style={[styles.emptyText, { color: C.muted }]}>
            {soinsMode ? "Aucun soin effectué pour l'instant." : "Aucune visite passée pour l'instant."}
          </Text>
        ) : (
          past.map((g) => <PlanningCard key={g[0].id} group={g} C={C} done={true} soinsMode={soinsMode} />)
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 },
  othersTitle: { marginTop: 20 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginBottom: 12 },

  historyToggle: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 20, marginBottom: 10 },
  toggleIcon: { fontSize: 14 },

  historyCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  historyDate: { fontFamily: "DM_Sans_700Bold", fontSize: 13, textTransform: "capitalize" },
  historyStatus: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, textTransform: "uppercase" },
  historyLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, marginTop: 2 },
  historyByRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  historyBy: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },
  editBtn: { paddingVertical: 4, paddingLeft: 10 },
  editBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
});

```

### components/IntervenantPriorityModal.tsx

```tsx
import { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet, ActivityIndicator, Switch } from "react-native";
import { supabase } from "@/lib/supabase";
import PatientAvatar from "@/components/PatientAvatar";
import { metierLabel } from "@/lib/metiers";
import type { Theme } from "@/lib/themes";

// Popup dédié "Règles de visite" > bloc Intervenants — permet à l'admin de
// choisir si TOUS les créneaux intervenants sont prioritaires sur les
// visites (comportement historique, slot_config.intervenant_priority_mode =
// 'all'), ou seulement ceux des intervenants cochés individuellement
// (intervenant_profiles.priority_slots) — voir check_slot_capacity() et
// book_intervention() côté serveur (migration 20260722).
//
// Écrit directement en base (pas de passage par apply_slot_rule_change) :
// changer ce réglage ne modifie ni ne recase aucune réservation existante,
// il ne fait que changer le comportement des prochaines demandes de créneau
// — aucune des logiques structurelles gérées par cette RPC (recasage,
// nuitées, plafond jour) ne s'applique ici.

interface IntervenantRow {
  id: string;
  prenom: string;
  nom: string;
  photo: string | null;
  photo_updated_at: string | null;
  metier: string | null;
  priority_slots: boolean;
}

function intervenantPhotoUrl(filename: string, updatedAt?: string | null) {
  const { data } = supabase.storage.from("intervenant-photos").getPublicUrl(filename);
  return updatedAt ? `${data.publicUrl}?v=${new Date(updatedAt).getTime()}` : data.publicUrl;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  spaceId: string;
  currentMode: "all" | "selected";
  C: Theme;
  onSaved: (mode: "all" | "selected") => void;
}

export default function IntervenantPriorityModal({ visible, onClose, spaceId, currentMode, C, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"all" | "selected">(currentMode);
  const [intervenants, setIntervenants] = useState<IntervenantRow[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("intervenant_profiles")
      .select("id, prenom, nom, photo, photo_updated_at, metier, priority_slots")
      .eq("space_id", spaceId)
      .order("prenom", { ascending: true });
    if (error) console.error("[IntervenantPriorityModal] intervenant_profiles select failed:", error);
    setIntervenants(data || []);
    setLoading(false);
  }, [spaceId]);

  useEffect(() => {
    if (visible) {
      setMode(currentMode);
      load();
    }
  }, [visible, currentMode, load]);

  function toggleIntervenant(id: string) {
    setIntervenants((list) => list.map((it) => (it.id === id ? { ...it, priority_slots: !it.priority_slots } : it)));
  }

  async function handleSave() {
    setSaving(true);
    const { error: configError } = await supabase
      .from("slot_config")
      .update({ intervenant_priority_mode: mode })
      .eq("space_id", spaceId);

    let profilesError = null;
    if (mode === "selected") {
      const results = await Promise.all(
        intervenants.map((it) =>
          supabase.from("intervenant_profiles").update({ priority_slots: it.priority_slots }).eq("id", it.id),
        ),
      );
      profilesError = results.find((r) => r.error)?.error ?? null;
    }

    setSaving(false);
    if (configError || profilesError) {
      console.error("[IntervenantPriorityModal] save failed:", configError || profilesError);
      return;
    }
    onSaved(mode);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.orange }]}>
          <Text style={[styles.title, { color: C.text }]}>Priorité des créneaux intervenants</Text>
          <Text style={[styles.desc, { color: C.muted }]}>
            Quand un créneau intervention chevauche des visites déjà réservées, ces visites sont automatiquement
            recasées si l'intervention est prioritaire.
          </Text>

          <TouchableOpacity
            style={[styles.option, { borderColor: mode === "all" ? C.orange : C.border, backgroundColor: mode === "all" ? `${C.orange}18` : "transparent" }]}
            onPress={() => setMode("all")}
            activeOpacity={0.8}
          >
            <View style={[styles.radio, { borderColor: mode === "all" ? C.orange : C.muted }]}>
              {mode === "all" && <View style={[styles.radioDot, { backgroundColor: C.orange }]} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, { color: C.text }]}>Tous les intervenants</Text>
              <Text style={[styles.optionDesc, { color: C.muted }]}>Chaque intervention est prioritaire sur les visites.</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.option, { borderColor: mode === "selected" ? C.orange : C.border, backgroundColor: mode === "selected" ? `${C.orange}18` : "transparent" }]}
            onPress={() => {
              if (mode !== "selected") {
                setIntervenants((list) => list.map((it) => ({ ...it, priority_slots: false })));
              }
              setMode("selected");
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.radio, { borderColor: mode === "selected" ? C.orange : C.muted }]}>
              {mode === "selected" && <View style={[styles.radioDot, { backgroundColor: C.orange }]} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, { color: C.text }]}>Seulement certains intervenants</Text>
              <Text style={[styles.optionDesc, { color: C.muted }]}>Choix des intervenants prioritaires.</Text>
            </View>
          </TouchableOpacity>

          {mode === "selected" && (
            loading ? (
              <ActivityIndicator color={C.orange} style={{ marginVertical: 20 }} />
            ) : intervenants.length === 0 ? (
              <Text style={[styles.emptyText, { color: C.muted }]}>Aucun intervenant enregistré pour l'instant.</Text>
            ) : (
              <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 4 }}>
                {intervenants.map((it) => (
                  <View key={it.id} style={[styles.row, { borderBottomColor: C.border }]}>
                    <PatientAvatar
                      photoUrl={it.photo ? intervenantPhotoUrl(it.photo, it.photo_updated_at) : null}
                      firstname={it.prenom}
                      lastname={it.nom}
                      size={36}
                      C={C}
                      metier={it.metier}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowName, { color: C.text }]} numberOfLines={1}>{it.prenom} {it.nom}</Text>
                      {!!it.metier && <Text style={[styles.rowMetier, { color: C.muted }]} numberOfLines={1}>{metierLabel(it.metier)}</Text>}
                    </View>
                    <Switch
                      value={it.priority_slots}
                      onValueChange={() => toggleIntervenant(it.id)}
                      trackColor={{ false: C.border, true: C.orange }}
                      thumbColor="#fff"
                    />
                  </View>
                ))}
              </ScrollView>
            )
          )}

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: C.orange }, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Enregistrer</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.closeFooterBtn}>
            <Text style={[styles.closeFooterBtnText, { color: C.muted }]}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", maxWidth: 440, maxHeight: "88%", borderRadius: 20, borderWidth: 1, padding: 24 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 6 },
  desc: { fontFamily: "DM_Sans_400Regular", fontSize: 13, lineHeight: 19, marginBottom: 16 },

  option: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  optionLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  optionDesc: { fontFamily: "DM_Sans_400Regular", fontSize: 12, lineHeight: 17, marginTop: 2 },

  list: { maxHeight: 260, marginTop: 4, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1 },
  rowName: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  rowMetier: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 1 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginVertical: 12 },

  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 12 },
  saveBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
  closeFooterBtn: { alignItems: "center", marginTop: 12 },
  closeFooterBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});

```

### components/IntervenantGlobalCalendar.tsx

```tsx
import { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { getDaysInMonth, getWeekDates, toISO } from "@/lib/slotUtils";
import { LOGO_PURPLE, LOGO_PURPLE_SOFT } from "@/lib/themes";
import { DayStripes } from "@/components/DayEdgeStripes";
import type { Reservation } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Calendrier "Planning" de l'onglet intervenant (app/(visitor)/soins.tsx) —
// cumule l'affichage de TOUS les soins de l'intervenant à travers TOUS ses
// espaces patients (contrairement au calendrier familial habituel,
// home/calendar.tsx, limité à un seul espace). Reprend exactement l'affichage
// des cases jour de home/calendar.tsx : cadre + fond violet (LOGO_PURPLE) plein
// dès qu'un soin existe ce jour-là (peu importe le patient — la couleur du
// patient n'intervient plus dans le cadre, seulement dans le(s) trait(s) de
// bord de case, voir dayPatientColors/STRIPE_LAYOUT), texte blanc sur fond
// violet pour rester lisible en mode sombre. Aujourd'hui garde un cadre
// doré/marron (C.gold) tant qu'aucun soin ne le recouvre. Un tap simple
// déclenche onDayPress (affiche les soins du jour, voir soins.tsx), un appui
// prolongé déclenche onDayLongPress (ouvre le popup "Réserver un créneau")
// — le détail chronologique complet reste dans les blocs
// SoinsPeriodBlock/SoinsPlanifiesBlock affichés juste en dessous.
const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

interface Props {
  C: Theme;
  reservations: Reservation[];
  colorByGroupId: Record<string, string>;
  // Regroupement des couleurs par jour — par patient (r.space_id, voir
  // soins.tsx) côté intervenant, par intervenant (r.intervenant_profile_id,
  // voir app/(admin)/intervenants.tsx) côté admin.
  getGroupId: (r: Reservation) => string;
  view: "mensuel" | "hebdo";
  weekAnchor: Date;
  monthAnchor: { year: number; month: number };
  onMonthChange: (m: { year: number; month: number }) => void;
  onWeekPrev: () => void;
  onWeekNext: () => void;
  // Jour actuellement retenu (ISO) — pilote à la fois le fond plein (accent)
  // ci-dessous et le bloc "Planning du jour" affiché par le parent
  // (soins.tsx). Contrôlé par le parent plutôt qu'en état local : les deux
  // doivent rester synchronisés avec le même jour.
  selectedIso: string;
  // Tap simple sur une case jour — affiche les soins de ce jour dans le bloc
  // "Planning du jour" du parent (soins.tsx), sans autre action.
  onDayPress: (iso: string) => void;
  // Appui prolongé sur une case jour — ouvre le popup "Réserver un créneau"
  // côté parent (soins.tsx). Sans effet ("Tous") tant qu'aucun patient précis
  // n'est sélectionné dans la légende : réserver depuis cette vue cumulée
  // nécessite de savoir POUR QUI (le parent applique ce garde-fou).
  onDayLongPress: (iso: string) => void;
}

// Couleurs (une par groupe distinct — patient ou intervenant selon
// getGroupId) ayant un soin ce jour-là, dans l'ordre de la légende (donc de
// colorByGroupId, lui-même stable — voir soins.tsx/intervenants.tsx, profils
// triés par created_at/prenom). Longueur 0 = pas de soin ce jour-là.
function dayGroupColors(reservations: Reservation[], iso: string, colorByGroupId: Record<string, string>, getGroupId: (r: Reservation) => string): string[] {
  const groupsToday = new Set<string>();
  for (const r of reservations) {
    if (r.date === iso && r.type === "Intervention") groupsToday.add(getGroupId(r));
  }
  const colors: string[] = [];
  for (const groupId of Object.keys(colorByGroupId)) {
    if (groupsToday.has(groupId)) colors.push(colorByGroupId[groupId]);
  }
  return colors;
}

export default function IntervenantGlobalCalendar({
  C, reservations, colorByGroupId, getGroupId, view, weekAnchor, monthAnchor, onMonthChange, onWeekPrev, onWeekNext, selectedIso, onDayPress, onDayLongPress,
}: Props) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  if (view === "hebdo") {
    const dates = getWeekDates(weekAnchor);
    const first = dates[0];
    const last = dates[dates.length - 1];
    const weekLabel = `${first.getDate()} - ${last.getDate()} ${last.toLocaleDateString("fr-FR", { month: "long" })}`;
    return (
      <View>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={onWeekPrev} style={[styles.navBtn, { borderColor: C.border }]}>
            <Text style={[styles.navBtnText, { color: C.text }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.monthName, { color: C.text }]}>{weekLabel}</Text>
          <TouchableOpacity onPress={onWeekNext} style={[styles.navBtn, { borderColor: C.border }]}>
            <Text style={[styles.navBtnText, { color: C.text }]}>›</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.weekRow}>
          {dates.map((day) => {
            const iso = toISO(day);
            const isToday = iso === toISO(today);
            const isSelected = iso === selectedIso;
            const dayColors = dayGroupColors(reservations, iso, colorByGroupId, getGroupId);
            const hasSoin = dayColors.length > 0;
            return (
              <TouchableOpacity
                key={iso}
                activeOpacity={0.7}
                onPress={() => onDayPress(iso)}
                onLongPress={() => onDayLongPress(iso)}
                style={[
                  styles.weekCell,
                  {
                    backgroundColor: isSelected ? C.accent : hasSoin ? LOGO_PURPLE_SOFT : C.card,
                    borderColor: isSelected ? C.accent : hasSoin ? LOGO_PURPLE : isToday ? C.gold : C.border,
                    borderWidth: isToday || hasSoin ? 2 : 1,
                  },
                ]}
              >
                <View style={styles.weekCellInner}>
                  <Text style={[styles.weekDayLabel, { color: isSelected || hasSoin ? "#fff" : C.muted }]}>
                    {DAY_LABELS[(day.getDay() + 6) % 7]}
                  </Text>
                  <Text style={[styles.cellDate, { color: isSelected || hasSoin ? "#fff" : isToday ? C.gold : C.text }]}>
                    {day.getDate()}
                  </Text>
                </View>
                <DayStripes colors={dayColors} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  const monthDays = getDaysInMonth(monthAnchor.year, monthAnchor.month);
  const firstDow = (new Date(monthAnchor.year, monthAnchor.month, 1).getDay() + 6) % 7;
  const trailingFillers = (7 - ((firstDow + monthDays.length) % 7)) % 7;
  const monthName = new Date(monthAnchor.year, monthAnchor.month, 1)
    .toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <View>
      <View style={styles.monthNav}>
        <TouchableOpacity
          onPress={() => { const d = new Date(monthAnchor.year, monthAnchor.month - 1, 1); onMonthChange({ year: d.getFullYear(), month: d.getMonth() }); }}
          style={[styles.navBtn, { borderColor: C.border }]}
        >
          <Text style={[styles.navBtnText, { color: C.text }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.monthName, { color: C.text }]}>{monthName}</Text>
        <TouchableOpacity
          onPress={() => { const d = new Date(monthAnchor.year, monthAnchor.month + 1, 1); onMonthChange({ year: d.getFullYear(), month: d.getMonth() }); }}
          style={[styles.navBtn, { borderColor: C.border }]}
        >
          <Text style={[styles.navBtnText, { color: C.text }]}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dayLabels}>
        {DAY_LABELS.map((d, i) => (
          <Text key={i} style={[styles.dayLabel, { color: C.muted }]}>{d}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {Array(firstDow).fill(null).map((_, i) => (
          <View key={`e${i}`} style={[styles.cell, styles.fillerCell]} />
        ))}
        {monthDays.map((day) => {
          const iso = toISO(day);
          const isToday = iso === toISO(today);
          const isSelected = iso === selectedIso;
          const dayColors = dayGroupColors(reservations, iso, colorByGroupId, getGroupId);
          const hasSoin = dayColors.length > 0;
          return (
            <TouchableOpacity
              key={iso}
              activeOpacity={0.7}
              onPress={() => onDayPress(iso)}
              onLongPress={() => onDayLongPress(iso)}
              style={[
                styles.cell,
                {
                  backgroundColor: isSelected ? C.accent : hasSoin ? LOGO_PURPLE_SOFT : C.card,
                  borderColor: isSelected ? C.accent : hasSoin ? LOGO_PURPLE : isToday ? C.gold : C.border,
                  borderWidth: isToday || hasSoin ? 2 : 1,
                },
              ]}
            >
              <View style={styles.cellInner}>
                <Text style={[styles.cellDate, { color: isSelected || hasSoin ? "#fff" : isToday ? C.gold : C.text }]}>
                  {day.getDate()}
                </Text>
              </View>
              <DayStripes colors={dayColors} />
            </TouchableOpacity>
          );
        })}
        {Array(trailingFillers).fill(null).map((_, i) => (
          <View key={`t${i}`} style={[styles.cell, styles.fillerCell]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  monthName: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 17, textTransform: "capitalize" },
  navBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 },
  navBtnText: { fontSize: 18, fontWeight: "600" },

  dayLabels: { flexDirection: "row", justifyContent: "center", gap: 3, marginBottom: 4 },
  dayLabel: { width: "13.5%", textAlign: "center", fontFamily: "DM_Sans_600SemiBold", fontSize: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 3, marginBottom: 10 },
  cell: {
    width: "13.5%",
    aspectRatio: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cellInner: { flex: 1, width: "100%", alignItems: "center", justifyContent: "center" },
  // Cases de remplissage (avant le 1er / après le dernier jour du mois) —
  // bord transparent pour éviter le défaut React Native (noir) d'un
  // borderWidth sans borderColor explicite.
  fillerCell: { borderColor: "transparent", borderWidth: 1 },
  cellDate: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, includeFontPadding: false },

  weekRow: { flexDirection: "row", justifyContent: "center", gap: 4, marginBottom: 10 },
  weekCell: {
    flex: 1,
    aspectRatio: 0.72,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    overflow: "hidden",
  },
  weekCellInner: { alignItems: "center", justifyContent: "center", gap: 3 },
  weekDayLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 10 },
});

```

### components/IntervenantsList.tsx

```tsx
import { useState, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView, Image, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useVisitorSpace } from "@/lib/VisitorContext";
import PatientAvatar from "@/components/PatientAvatar";
import IntervenantProfileModal from "@/components/IntervenantProfileModal";
import { metierLabel } from "@/lib/metiers";
import type { Theme } from "@/lib/themes";

// Corps de liste partagé entre la modale bottom-sheet (IntervenantsListModal,
// toujours utilisée côté visiteur classique via le bouton "Intervenants" de
// Mon compte) et l'onglet plein écran dédié (app/(visitor)/intervenants.tsx,
// côté intervenant).
interface IntervenantRow {
  id: string;
  prenom: string;
  nom: string;
  photo: string | null;
  photo_updated_at: string | null;
  metier: string | null;
}

// updatedAt bust le cache CDN/<Image> — voir IntervenantFicheModal.tsx pour
// le détail (nom de fichier fixe + upsert, sans ça un ré-upload continuerait
// d'afficher l'ancienne photo).
function intervenantPhotoUrl(filename: string, updatedAt?: string | null) {
  const { data } = supabase.storage.from("intervenant-photos").getPublicUrl(filename);
  return updatedAt ? `${data.publicUrl}?v=${new Date(updatedAt).getTime()}` : data.publicUrl;
}

interface Props {
  spaceId: string;
  C: Theme;
}

export default function IntervenantsList({ spaceId, C }: Props) {
  const router = useRouter();
  const { setSelectedDay } = useVisitorSpace();
  const [loading, setLoading] = useState(true);
  const [intervenants, setIntervenants] = useState<IntervenantRow[]>([]);
  const [profileTarget, setProfileTarget] = useState<IntervenantRow | null>(null);
  const [photoLightbox, setPhotoLightbox] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("intervenant_profiles")
      .select("id, prenom, nom, photo, photo_updated_at, metier")
      .eq("space_id", spaceId)
      .order("prenom", { ascending: true });

    if (error) console.error("[IntervenantsList] intervenant_profiles select failed:", error);
    setIntervenants(data || []);
    setLoading(false);
  }, [spaceId]);

  useEffect(() => {
    load();
  }, [load]);

  function goToSlot(date: string) {
    setSelectedDay(new Date(date + "T12:00:00"));
    router.push("/(visitor)/home/slots" as any);
  }

  return (
    <>
      {loading ? (
        <ActivityIndicator color={C.accent} style={{ marginVertical: 32 }} />
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scroll}>
          {intervenants.length === 0 ? (
            <Text style={[styles.emptyText, { color: C.muted }]}>Aucun intervenant enregistré pour l'instant.</Text>
          ) : (
            intervenants.map((it, i) => {
              const photoUrl = it.photo ? intervenantPhotoUrl(it.photo, it.photo_updated_at) : null;
              return (
                <TouchableOpacity
                  key={it.id}
                  style={[styles.row, i < intervenants.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
                  onPress={() => setProfileTarget(it)}
                  activeOpacity={0.7}
                >
                  <TouchableOpacity
                    onPress={() => photoUrl && setPhotoLightbox(photoUrl)}
                    activeOpacity={photoUrl ? 0.85 : 1}
                    disabled={!photoUrl}
                  >
                    <PatientAvatar photoUrl={photoUrl} firstname={it.prenom} lastname={it.nom} size={44} C={C} metier={it.metier} />
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>
                      {it.prenom} {it.nom}
                    </Text>
                    {!!it.metier && (
                      <Text style={[styles.metier, { color: C.muted }]} numberOfLines={1}>
                        {metierLabel(it.metier)}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.chevron, { color: C.muted }]}>›</Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {profileTarget && (
        <IntervenantProfileModal
          visible={!!profileTarget}
          onClose={() => setProfileTarget(null)}
          spaceId={spaceId}
          intervenantProfileId={profileTarget.id}
          prenom={profileTarget.prenom}
          nom={profileTarget.nom}
          C={C}
          isAdmin={false}
          onGoToSlot={goToSlot}
        />
      )}

      <Modal visible={!!photoLightbox} transparent animationType="fade" onRequestClose={() => setPhotoLightbox(null)}>
        <TouchableOpacity style={styles.lightboxOverlay} activeOpacity={1} onPress={() => setPhotoLightbox(null)}>
          <View style={[styles.lightboxCircle, { borderColor: C.gold }]}>
            {photoLightbox && <Image source={{ uri: photoLightbox }} style={styles.lightboxImage} resizeMode="cover" />}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // maxHeight explicite sur le ScrollView lui-même (pas seulement sur un
  // parent) : un ScrollView flex:1 dans un conteneur qui n'a qu'un maxHeight
  // (IntervenantsListModal.body) sans height propre s'effondre à 0px de
  // hauteur (Yoga ne peut pas résoudre le flex:1 sans taille définie côté
  // parent) — la liste chargeait bien mais restait invisible.
  scrollView: { maxHeight: 400 },
  scroll: { paddingBottom: 24 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center", marginVertical: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  name: { fontFamily: "DM_Sans_600SemiBold", fontSize: 15 },
  metier: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 1 },
  chevron: { fontFamily: "DM_Sans_700Bold", fontSize: 16 },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  lightboxCircle: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 4,
    overflow: "hidden",
  },
  lightboxImage: { width: "100%", height: "100%" },
});

```

### components/IntervenantsBlock.tsx

```tsx
import { useState, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { supabase } from "@/lib/supabase";
import PatientAvatar from "@/components/PatientAvatar";
import IntervenantProfileModal from "@/components/IntervenantProfileModal";
import { metierLabel } from "@/lib/metiers";
import type { Theme } from "@/lib/themes";

// Bloc "Intervenants" des Paramètres admin — juste après le bloc "Visiteurs"
// (voir components/VisitorsBlock.tsx, même pattern de carte repliable et de
// liste de personnes cliquables ouvrant une fiche). Liste les intervenants
// enregistrés (infirmier·ère, kiné, aide à domicile…) via intervenant_profiles
// — une vraie table de profils (PIN, pas de compte visiteur approximé par
// prénom+nom) — plutôt que les interventions elles-mêmes : un intervenant
// n'apparaît qu'une fois même s'il a plusieurs soins programmés. Un clic ouvre
// sa fiche (IntervenantProfileModal), qui liste ses soins planifiés/faits et
// permet de rebondir vers le créneau du jour.
interface IntervenantRow {
  id: string;
  prenom: string;
  nom: string;
  photo: string | null;
  photo_updated_at: string | null;
  metier: string | null;
}

// updatedAt bust le cache CDN/<Image> — voir IntervenantFicheModal.tsx pour
// le détail (nom de fichier fixe + upsert, sans ça un ré-upload continuerait
// d'afficher l'ancienne photo).
function intervenantPhotoUrl(filename: string, updatedAt?: string | null) {
  const { data } = supabase.storage.from("intervenant-photos").getPublicUrl(filename);
  return updatedAt ? `${data.publicUrl}?v=${new Date(updatedAt).getTime()}` : data.publicUrl;
}

interface Props {
  spaceId: string;
  C: Theme;
}

export default function IntervenantsBlock({ spaceId, C }: Props) {
  const [loading, setLoading] = useState(true);
  const [intervenants, setIntervenants] = useState<IntervenantRow[]>([]);
  const [profileTarget, setProfileTarget] = useState<IntervenantRow | null>(null);
  // Replié par défaut, comme VisitorsBlock juste au-dessus.
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("intervenant_profiles")
      .select("id, prenom, nom, photo, photo_updated_at, metier")
      .eq("space_id", spaceId)
      .order("prenom", { ascending: true });

    if (error) console.error("[IntervenantsBlock] intervenant_profiles select failed:", error);
    setIntervenants(data || []);
    setLoading(false);
  }, [spaceId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <Text style={[styles.sectionTitle, { color: C.gold }]}>Intervenants</Text>
      <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
        <TouchableOpacity
          onPress={() => setExpanded((e) => !e)}
          activeOpacity={0.7}
          style={styles.headerRow}
        >
          <Text style={[styles.cardDesc, { color: C.muted, marginBottom: 0, flex: 1 }]}>
            Les intervenants (infirmier·ère, kiné, aide à domicile…) qui se sont enregistrés sur l'espace.
          </Text>
          <Text style={[styles.toggleIcon, { color: C.muted }]}>{expanded ? "▾" : "▸"}</Text>
        </TouchableOpacity>

        {expanded && (
          <View style={{ marginTop: 10 }}>
            {loading ? (
              <ActivityIndicator color={C.accent} style={{ marginVertical: 8 }} />
            ) : intervenants.length === 0 ? (
              <Text style={[styles.emptyText, { color: C.muted }]}>Aucun intervenant enregistré pour l'instant.</Text>
            ) : (
              intervenants.map((it, i) => (
                <TouchableOpacity
                  key={it.id}
                  style={[styles.row, i < intervenants.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
                  onPress={() => setProfileTarget(it)}
                  activeOpacity={0.7}
                >
                  <PatientAvatar
                    photoUrl={it.photo ? intervenantPhotoUrl(it.photo, it.photo_updated_at) : null}
                    firstname={it.prenom}
                    lastname={it.nom}
                    size={36}
                    C={C}
                    metier={it.metier}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>
                      {it.prenom} {it.nom}
                    </Text>
                    {!!it.metier && (
                      <Text style={[styles.metier, { color: C.muted }]} numberOfLines={1}>
                        {metierLabel(it.metier)}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.openBtn, { borderColor: C.border }]}>
                    <Text style={[styles.openBtnText, { color: C.accent }]}>›</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </View>

      {profileTarget && (
        <IntervenantProfileModal
          visible={!!profileTarget}
          onClose={() => setProfileTarget(null)}
          spaceId={spaceId}
          intervenantProfileId={profileTarget.id}
          prenom={profileTarget.prenom}
          nom={profileTarget.nom}
          C={C}
          isAdmin
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontFamily: "DM_Sans_600SemiBold", fontSize: 11,
    letterSpacing: 1, textTransform: "uppercase",
    marginBottom: 10, marginTop: 20,
  },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 4 },
  cardDesc: { fontFamily: "DM_Sans_400Regular", fontSize: 13, lineHeight: 20, marginBottom: 10 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  toggleIcon: { fontSize: 14 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  name: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  metier: { fontFamily: "DM_Sans_400Regular", fontSize: 11, marginTop: 1 },
  openBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  openBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 16 },
});

```

### components/IntervenantsListModal.tsx

```tsx
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import IntervenantsList from "@/components/IntervenantsList";
import type { Theme } from "@/lib/themes";

// Liste des intervenants enregistrés — ouverte depuis le bouton "Intervenants"
// de Mon compte (app/(visitor)/account.tsx), juste sous "Fiche patient". Même
// principe que le bloc "Intervenants" des Paramètres admin
// (components/IntervenantsBlock.tsx), mais en plein écran (bottom-sheet) côté
// visiteur puisqu'il n'y a pas d'écran Paramètres visiteur pour l'accueillir.
// Corps de liste partagé avec l'onglet dédié côté intervenant, voir
// components/IntervenantsList.tsx.
interface Props {
  visible: boolean;
  onClose: () => void;
  spaceId: string;
  C: Theme;
}

export default function IntervenantsListModal({ visible, onClose, spaceId, C }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.accent }]}>
          <View style={[styles.headerRow, { borderBottomColor: C.border }]}>
            <Text style={[styles.title, { color: C.text }]}>🩺 Intervenants</Text>
          </View>

          <View style={styles.body}>
            {visible && <IntervenantsList spaceId={spaceId} C={C} />}
          </View>

          <TouchableOpacity onPress={onClose} style={styles.closeFooterBtn}>
            <Text style={[styles.closeFooterBtnText, { color: C.muted }]}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", maxWidth: 400, maxHeight: "85%", borderRadius: 20, borderWidth: 1, padding: 24 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingBottom: 16, borderBottomWidth: 1 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18 },
  body: { maxHeight: 400 },
  closeFooterBtn: { alignItems: "center", marginTop: 14 },
  closeFooterBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});

```

### components/NewsIntervenantModal.tsx

```tsx
import { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { supabase } from "@/lib/supabase";
import PatientAvatar from "@/components/PatientAvatar";
import { metierLabel } from "@/lib/metiers";
import type { Theme } from "@/lib/themes";

// Popup admin (Paramètres > bloc Planning des intervenants) — autorise un ou
// plusieurs intervenants à publier, sur l'onglet "Nouvelles", des messages
// visibles aussi par les visiteurs (au lieu de rester dans le canal privé
// intervenants+admin) : "disabled" (défaut, aucun intervenant), "some"
// (seuls ceux cochés ci-dessous, via news_authorized_intervenants) ou "all"
// (tous). Même principe que NightIntervenantModal.tsx.

interface IntervenantRow {
  id: string;
  prenom: string;
  nom: string;
  photo: string | null;
  photo_updated_at: string | null;
  metier: string | null;
}

function intervenantPhotoUrl(filename: string, updatedAt?: string | null) {
  const { data } = supabase.storage.from("intervenant-photos").getPublicUrl(filename);
  return updatedAt ? `${data.publicUrl}?v=${new Date(updatedAt).getTime()}` : data.publicUrl;
}

type NewsIntervenantMode = "disabled" | "some" | "all";

interface Props {
  visible: boolean;
  onClose: () => void;
  spaceId: string;
  currentMode: NewsIntervenantMode;
  C: Theme;
  onSaved: (mode: NewsIntervenantMode) => void;
}

export default function NewsIntervenantModal({
  visible, onClose, spaceId, currentMode, C, onSaved,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<NewsIntervenantMode>(currentMode);
  const [intervenants, setIntervenants] = useState<IntervenantRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [profiles, authorized] = await Promise.all([
      supabase.from("intervenant_profiles").select("id, prenom, nom, photo, photo_updated_at, metier").eq("space_id", spaceId).order("prenom", { ascending: true }),
      supabase.from("news_authorized_intervenants").select("intervenant_profile_id").eq("space_id", spaceId),
    ]);
    if (profiles.error) console.error("[NewsIntervenantModal] intervenant_profiles select failed:", profiles.error);
    if (authorized.error) console.error("[NewsIntervenantModal] news_authorized_intervenants select failed:", authorized.error);
    setIntervenants(profiles.data || []);
    setSelectedIds(new Set((authorized.data || []).map((a) => a.intervenant_profile_id)));
    setLoading(false);
  }, [spaceId]);

  useEffect(() => {
    if (visible) {
      setMode(currentMode);
      load();
    }
  }, [visible, currentMode, load]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // Cocher un intervenant bascule directement en mode "some" — la liste
    // est toujours visible (cf. plus bas), inutile de forcer un choix de
    // mode avant de pouvoir cocher quelqu'un.
    setMode("some");
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    const { error: configError } = await supabase
      .from("slot_config")
      .update({ news_intervenant_mode: mode })
      .eq("space_id", spaceId);
    if (configError) {
      console.error("[NewsIntervenantModal] slot_config update failed:", configError);
      setSaveError(configError.message);
      setSaving(false);
      return;
    }

    if (mode === "some") {
      const { error: deleteError } = await supabase.from("news_authorized_intervenants").delete().eq("space_id", spaceId);
      if (deleteError) {
        console.error("[NewsIntervenantModal] news_authorized_intervenants delete failed:", deleteError);
        setSaveError(deleteError.message);
        setSaving(false);
        return;
      }
      if (selectedIds.size > 0) {
        const { error: insertError } = await supabase
          .from("news_authorized_intervenants")
          .insert(Array.from(selectedIds).map((id) => ({ space_id: spaceId, intervenant_profile_id: id })));
        if (insertError) {
          console.error("[NewsIntervenantModal] news_authorized_intervenants insert failed:", insertError);
          setSaveError(insertError.message);
          setSaving(false);
          return;
        }
      }
    }

    setSaving(false);
    onSaved(mode);
    onClose();
  }

  const canSave = mode !== "some" || selectedIds.size > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.orange }]}>
          <Text style={[styles.title, { color: C.text }]}>Nouvelles des intervenants</Text>
          <Text style={[styles.desc, { color: C.muted }]}>
            Autorise les intervenants à publier sur l'onglet "Nouvelles" des messages visibles par les visiteurs.
          </Text>

          <TouchableOpacity
            style={[styles.option, { borderColor: mode === "disabled" ? C.orange : C.border, backgroundColor: mode === "disabled" ? `${C.orange}18` : "transparent" }]}
            onPress={() => setMode("disabled")}
            activeOpacity={0.8}
          >
            <View style={[styles.radio, { borderColor: mode === "disabled" ? C.orange : C.muted }]}>
              {mode === "disabled" && <View style={[styles.radioDot, { backgroundColor: C.orange }]} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, { color: C.text }]}>Désactivé</Text>
              <Text style={[styles.optionDesc, { color: C.muted }]}>Aucun intervenant ne peut publier pour les visiteurs — canal privé intervenants + admin uniquement.</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.option, { borderColor: mode === "all" ? C.orange : C.border, backgroundColor: mode === "all" ? `${C.orange}18` : "transparent" }]}
            onPress={() => setMode("all")}
            activeOpacity={0.8}
          >
            <View style={[styles.radio, { borderColor: mode === "all" ? C.orange : C.muted }]}>
              {mode === "all" && <View style={[styles.radioDot, { backgroundColor: C.orange }]} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, { color: C.text }]}>Tous les intervenants</Text>
              <Text style={[styles.optionDesc, { color: C.muted }]}>Publication aux visiteurs autorisée</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.option, { borderColor: mode === "some" ? C.orange : C.border, backgroundColor: mode === "some" ? `${C.orange}18` : "transparent" }]}
            onPress={() => setMode("some")}
            activeOpacity={0.8}
          >
            <View style={[styles.radio, { borderColor: mode === "some" ? C.orange : C.muted }]}>
              {mode === "some" && <View style={[styles.radioDot, { backgroundColor: C.orange }]} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, { color: C.text }]}>Certains intervenants</Text>
              <Text style={[styles.optionDesc, { color: C.muted }]}>Choix des intervenants</Text>
            </View>
          </TouchableOpacity>

          {loading ? (
            <ActivityIndicator color={C.orange} style={{ marginVertical: 16 }} />
          ) : intervenants.length === 0 ? (
            <Text style={[styles.emptyText, { color: C.muted }]}>Aucun intervenant enregistré pour l'instant.</Text>
          ) : (
            <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 4 }}>
              {intervenants.map((it) => {
                const selected = selectedIds.has(it.id);
                return (
                  <TouchableOpacity
                    key={it.id}
                    style={[styles.row, { borderBottomColor: C.border }]}
                    onPress={() => toggleSelected(it.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.checkbox, { borderColor: selected ? C.orange : C.muted, backgroundColor: selected ? C.orange : "transparent" }]}>
                      {selected && <Text style={styles.checkboxMark}>✓</Text>}
                    </View>
                    <PatientAvatar
                      photoUrl={it.photo ? intervenantPhotoUrl(it.photo, it.photo_updated_at) : null}
                      firstname={it.prenom}
                      lastname={it.nom}
                      size={36}
                      C={C}
                      metier={it.metier}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowName, { color: C.text }]} numberOfLines={1}>{it.prenom} {it.nom}</Text>
                      {!!it.metier && <Text style={[styles.rowMetier, { color: C.muted }]} numberOfLines={1}>{metierLabel(it.metier)}</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {!!saveError && (
            <Text style={[styles.errorText, { color: C.danger }]}>Échec de l'enregistrement : {saveError}</Text>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: C.orange }, (saving || !canSave) && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving || !canSave}
          >
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Enregistrer</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.closeFooterBtn}>
            <Text style={[styles.closeFooterBtnText, { color: C.muted }]}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", maxWidth: 440, maxHeight: "88%", borderRadius: 20, borderWidth: 1, padding: 24 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 4 },
  desc: { fontFamily: "DM_Sans_400Regular", fontSize: 12, lineHeight: 16, marginBottom: 10 },

  option: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 8 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 9, height: 9, borderRadius: 5 },
  optionLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  optionDesc: { fontFamily: "DM_Sans_400Regular", fontSize: 11, lineHeight: 14, marginTop: 1 },

  list: { maxHeight: 260, marginTop: -2, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingLeft: 4, borderBottomWidth: 1 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  checkboxMark: { color: "#fff", fontSize: 12, fontFamily: "DM_Sans_700Bold" },
  rowName: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  rowMetier: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 1 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginVertical: 12 },
  errorText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginTop: 10 },

  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 12 },
  saveBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
  closeFooterBtn: { alignItems: "center", marginTop: 12 },
  closeFooterBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});

```

### components/NightIntervenantModal.tsx

```tsx
import { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { supabase } from "@/lib/supabase";
import PatientAvatar from "@/components/PatientAvatar";
import { metierLabel } from "@/lib/metiers";
import type { Theme } from "@/lib/themes";

// Popup admin (Paramètres > bloc Intervenants) — autorise un ou plusieurs
// intervenants à réserver des nuitées (type "Nuit"), désactivé par défaut :
// "disabled" (comportement historique, aucun intervenant ne voit le bouton
// Réserver sur (visitor)/home/nights.tsx), "some" (seuls ceux cochés
// ci-dessous, via la table de liaison night_authorized_intervenants) ou
// "all" (tous). Même principe que NightVisitorModal.tsx côté visiteurs.

interface IntervenantRow {
  id: string;
  prenom: string;
  nom: string;
  photo: string | null;
  photo_updated_at: string | null;
  metier: string | null;
}

function intervenantPhotoUrl(filename: string, updatedAt?: string | null) {
  const { data } = supabase.storage.from("intervenant-photos").getPublicUrl(filename);
  return updatedAt ? `${data.publicUrl}?v=${new Date(updatedAt).getTime()}` : data.publicUrl;
}

type NightIntervenantMode = "disabled" | "some" | "all";

interface Props {
  visible: boolean;
  onClose: () => void;
  spaceId: string;
  currentMode: NightIntervenantMode;
  C: Theme;
  onSaved: (mode: NightIntervenantMode) => void;
}

export default function NightIntervenantModal({
  visible, onClose, spaceId, currentMode, C, onSaved,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<NightIntervenantMode>(currentMode);
  const [intervenants, setIntervenants] = useState<IntervenantRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [profiles, authorized] = await Promise.all([
      supabase.from("intervenant_profiles").select("id, prenom, nom, photo, photo_updated_at, metier").eq("space_id", spaceId).order("prenom", { ascending: true }),
      supabase.from("night_authorized_intervenants").select("intervenant_profile_id").eq("space_id", spaceId),
    ]);
    if (profiles.error) console.error("[NightIntervenantModal] intervenant_profiles select failed:", profiles.error);
    if (authorized.error) console.error("[NightIntervenantModal] night_authorized_intervenants select failed:", authorized.error);
    setIntervenants(profiles.data || []);
    setSelectedIds(new Set((authorized.data || []).map((a) => a.intervenant_profile_id)));
    setLoading(false);
  }, [spaceId]);

  useEffect(() => {
    if (visible) {
      setMode(currentMode);
      load();
    }
  }, [visible, currentMode, load]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // Cocher un intervenant bascule directement en mode "some" — la liste
    // est toujours visible (cf. plus bas), inutile de forcer un choix de
    // mode avant de pouvoir cocher quelqu'un.
    setMode("some");
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    const { error: configError } = await supabase
      .from("slot_config")
      .update({ night_intervenant_mode: mode })
      .eq("space_id", spaceId);
    if (configError) {
      console.error("[NightIntervenantModal] slot_config update failed:", configError);
      setSaveError(configError.message);
      setSaving(false);
      return;
    }

    if (mode === "some") {
      const { error: deleteError } = await supabase.from("night_authorized_intervenants").delete().eq("space_id", spaceId);
      if (deleteError) {
        console.error("[NightIntervenantModal] night_authorized_intervenants delete failed:", deleteError);
        setSaveError(deleteError.message);
        setSaving(false);
        return;
      }
      if (selectedIds.size > 0) {
        const { error: insertError } = await supabase
          .from("night_authorized_intervenants")
          .insert(Array.from(selectedIds).map((id) => ({ space_id: spaceId, intervenant_profile_id: id })));
        if (insertError) {
          console.error("[NightIntervenantModal] night_authorized_intervenants insert failed:", insertError);
          setSaveError(insertError.message);
          setSaving(false);
          return;
        }
      }
    }

    setSaving(false);
    onSaved(mode);
    onClose();
  }

  const canSave = mode !== "some" || selectedIds.size > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.orange }]}>
          <Text style={[styles.title, { color: C.text }]}>Nuitées intervenants</Text>
          <Text style={[styles.desc, { color: C.muted }]}>
            Autorise tous les intervenants, ou seulement certains, à réserver une nuitée.
          </Text>

          <TouchableOpacity
            style={[styles.option, { borderColor: mode === "disabled" ? C.orange : C.border, backgroundColor: mode === "disabled" ? `${C.orange}18` : "transparent" }]}
            onPress={() => setMode("disabled")}
            activeOpacity={0.8}
          >
            <View style={[styles.radio, { borderColor: mode === "disabled" ? C.orange : C.muted }]}>
              {mode === "disabled" && <View style={[styles.radioDot, { backgroundColor: C.orange }]} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, { color: C.text }]}>Désactivé</Text>
              <Text style={[styles.optionDesc, { color: C.muted }]}>Aucun intervenant ne peut réserver de nuitée.</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.option, { borderColor: mode === "all" ? C.orange : C.border, backgroundColor: mode === "all" ? `${C.orange}18` : "transparent" }]}
            onPress={() => setMode("all")}
            activeOpacity={0.8}
          >
            <View style={[styles.radio, { borderColor: mode === "all" ? C.orange : C.muted }]}>
              {mode === "all" && <View style={[styles.radioDot, { backgroundColor: C.orange }]} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, { color: C.text }]}>Tous les intervenants</Text>
              <Text style={[styles.optionDesc, { color: C.muted }]}>Chaque intervenant peut réserver une nuitée.</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.option, { borderColor: mode === "some" ? C.orange : C.border, backgroundColor: mode === "some" ? `${C.orange}18` : "transparent" }]}
            onPress={() => setMode("some")}
            activeOpacity={0.8}
          >
            <View style={[styles.radio, { borderColor: mode === "some" ? C.orange : C.muted }]}>
              {mode === "some" && <View style={[styles.radioDot, { backgroundColor: C.orange }]} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionLabel, { color: C.text }]}>Certains intervenants seulement</Text>
              <Text style={[styles.optionDesc, { color: C.muted }]}>Coche-les ci-dessous — plusieurs choix possibles.</Text>
            </View>
          </TouchableOpacity>

          {loading ? (
            <ActivityIndicator color={C.orange} style={{ marginVertical: 16 }} />
          ) : intervenants.length === 0 ? (
            <Text style={[styles.emptyText, { color: C.muted }]}>Aucun intervenant enregistré pour l'instant.</Text>
          ) : (
            <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 4 }}>
              {intervenants.map((it) => {
                const selected = selectedIds.has(it.id);
                return (
                  <TouchableOpacity
                    key={it.id}
                    style={[styles.row, { borderBottomColor: C.border }]}
                    onPress={() => toggleSelected(it.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.checkbox, { borderColor: selected ? C.orange : C.muted, backgroundColor: selected ? C.orange : "transparent" }]}>
                      {selected && <Text style={styles.checkboxMark}>✓</Text>}
                    </View>
                    <PatientAvatar
                      photoUrl={it.photo ? intervenantPhotoUrl(it.photo, it.photo_updated_at) : null}
                      firstname={it.prenom}
                      lastname={it.nom}
                      size={36}
                      C={C}
                      metier={it.metier}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowName, { color: C.text }]} numberOfLines={1}>{it.prenom} {it.nom}</Text>
                      {!!it.metier && <Text style={[styles.rowMetier, { color: C.muted }]} numberOfLines={1}>{metierLabel(it.metier)}</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {!!saveError && (
            <Text style={[styles.errorText, { color: C.danger }]}>Échec de l'enregistrement : {saveError}</Text>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: C.orange }, (saving || !canSave) && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving || !canSave}
          >
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Enregistrer</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.closeFooterBtn}>
            <Text style={[styles.closeFooterBtnText, { color: C.muted }]}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", maxWidth: 440, maxHeight: "88%", borderRadius: 20, borderWidth: 1, padding: 24 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 6 },
  desc: { fontFamily: "DM_Sans_400Regular", fontSize: 13, lineHeight: 19, marginBottom: 16 },

  option: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  optionLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  optionDesc: { fontFamily: "DM_Sans_400Regular", fontSize: 12, lineHeight: 17, marginTop: 2 },

  list: { maxHeight: 220, marginTop: -2, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingLeft: 4, borderBottomWidth: 1 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  checkboxMark: { color: "#fff", fontSize: 12, fontFamily: "DM_Sans_700Bold" },
  rowName: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  rowMetier: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 1 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginVertical: 12 },
  errorText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginTop: 10 },

  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 12 },
  saveBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
  closeFooterBtn: { alignItems: "center", marginTop: 12 },
  closeFooterBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});

```

### components/InterventionEditFlow.tsx

```tsx
import { useState, forwardRef, useImperativeHandle } from "react";
import {
  View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { generateSlots, isSlotPast, toFrShort } from "@/lib/slotUtils";
import { getSyncedInterventionTypes } from "@/lib/interventionTypesSync";
import MiniCalendar from "@/components/MiniCalendar";
import ConfirmModal from "@/components/ConfirmModal";
import type { Reservation, InterventionType } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Édition d'un soin déjà réservé (jour, horaire, type) depuis
// mes-espaces-patients.tsx — remplace le popup jour en lecture seule.
// Contrairement à AdminEditReservation.tsx (mise à jour directe de la
// ligne, réservé au contexte single-space de useSpace()), l'édition ici
// est cross-space : chaque soin peut appartenir à un espace différent de
// celui actif dans la session, donc slot_config/types sont rechargés à
// l'ouverture pour le space_id du soin visé. La sauvegarde supprime la
// réservation d'origine puis rappelle la RPC book_intervention (même
// validation que la création : conflits, recasage des visites, minuit),
// avec restauration de la ligne d'origine si la nouvelle réservation
// échoue — book_intervention ne sait pas exclure une réservation de son
// propre calcul de chevauchement.

export interface InterventionEditFlowHandle {
  open: (r: Reservation, pin: string, patientName?: string) => void;
}

interface Props {
  onSaved: () => void;
  C: Theme;
}

function InterventionEditFlow({ onSaved, C }: Props, ref: React.Ref<InterventionEditFlowHandle>) {
  const [target, setTarget] = useState<Reservation | null>(null);
  const [patientLabel, setPatientLabel] = useState("");
  const [pin, setPin] = useState("");
  const [loadingCtx, setLoadingCtx] = useState(false);
  const [slots, setSlots] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(new Date());
  const [types, setTypes] = useState<InterventionType[]>([]);

  const [editDate, setEditDate] = useState("");
  const [editSlot, setEditSlot] = useState<string | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [saving, setSaving] = useState(false);
  const [dayBookedAlert, setDayBookedAlert] = useState(false);
  const [overlapAlert, setOverlapAlert] = useState(false);
  const [otherSpaceOverlapAlert, setOtherSpaceOverlapAlert] = useState(false);

  async function open(r: Reservation, pinArg: string, patientName?: string) {
    const d = new Date(r.date + "T12:00:00");
    setTarget(r);
    setPatientLabel(patientName ?? "");
    setPin(pinArg);
    setEditDate(r.date);
    setEditSlot(r.creneau);
    setCalMonth({ year: d.getFullYear(), month: d.getMonth() });
    setSelectedTypeId(null);
    setLoadingCtx(true);

    const [spaceRes, slotConfigRes, typesRes] = await Promise.all([
      supabase.from("patient_spaces").select("start_date").eq("id", r.space_id).single(),
      supabase.from("slot_config").select("*").eq("space_id", r.space_id).single(),
      getSyncedInterventionTypes(r.intervenant_profile_id ?? ""),
    ]);

    setStartDate(spaceRes.data ? new Date(spaceRes.data.start_date + "T00:00:00") : new Date());
    setSlots(slotConfigRes.data ? generateSlots(slotConfigRes.data) : []);
    setTypes(typesRes);
    setSelectedTypeId(typesRes.find((t) => t.label === r.intervention_label)?.id ?? typesRes[0]?.id ?? null);
    setLoadingCtx(false);
  }

  useImperativeHandle(ref, () => ({ open }));

  const selectedType = types.find((t) => t.id === selectedTypeId) ?? null;

  async function handleSave() {
    if (!target || !selectedType || !editSlot) return;
    setSaving(true);

    const { error: delError } = await supabase.from("reservations").delete().eq("id", target.id);
    if (delError) {
      setSaving(false);
      Alert.alert("Erreur", "Impossible de modifier ce soin : " + delError.message);
      return;
    }

    const { error } = await supabase.rpc("book_intervention", {
      p_space_id: target.space_id,
      p_intervenant_profile_id: target.intervenant_profile_id,
      p_intervention_type_id: selectedType.id,
      p_date: editDate,
      p_start_slot: editSlot,
      p_pin: pin,
      p_slots: slots,
    });

    if (error) {
      // Restaure la réservation d'origine — la nouvelle n'a pas pu être créée.
      await supabase.from("reservations").insert({
        id: target.id,
        space_id: target.space_id,
        date: target.date,
        creneau: target.creneau,
        prenom: target.prenom,
        nom: target.nom,
        telephone: target.telephone,
        type: target.type,
        pin: target.pin,
        intervention_label: target.intervention_label,
        duration_minutes: target.duration_minutes,
        intervenant_profile_id: target.intervenant_profile_id,
      });
      setSaving(false);
      if (error.message.includes("INTERVENTION_CROSSES_MIDNIGHT")) {
        Alert.alert("Créneau impossible", "Cette intervention dépasserait minuit. Choisis un créneau plus tôt.");
      } else if (error.message.includes("INTERVENTION_OVERLAP_OTHER_SPACE")) {
        setOtherSpaceOverlapAlert(true);
      } else if (error.message.includes("INTERVENTION_OVERLAP_SELF")) {
        setOverlapAlert(true);
      } else if (error.message.includes("DAY_ALREADY_BOOKED")) {
        setDayBookedAlert(true);
      } else {
        Alert.alert("Erreur lors de la modification", error.message);
      }
      return;
    }

    setSaving(false);
    setTarget(null);
    onSaved();
  }

  const canSave = !!selectedType && !!editSlot && !saving;

  return (
    <>
      <Modal visible={!!target} transparent animationType="slide" onRequestClose={() => !saving && setTarget(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => !saving && setTarget(null)}>
            <ScrollView contentContainerStyle={styles.overlayScroll} keyboardShouldPersistTaps="handled">
              <TouchableOpacity activeOpacity={1}>
                <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.orange }]}>
                  <Text style={[styles.sheetTitle, { color: C.text }]}>✏️ Modifier ce soin</Text>
                  <Text style={[styles.sheetSub, { color: C.muted }]}>
                    Soin d&apos;origine : {target && toFrShort(new Date(target.date + "T12:00:00"))} {target?.creneau}
                    {patientLabel ? ` pour ${patientLabel}` : ""}.
                  </Text>

                  {loadingCtx ? (
                    <ActivityIndicator color={C.orange} style={{ marginVertical: 20 }} />
                  ) : (
                    <>
                      <Text style={[styles.fieldLabel, { color: C.gold }]}>Nouveau jour</Text>
                      <MiniCalendar
                        selDate={editDate}
                        onSelect={(iso) => { setEditDate(iso); setEditSlot(null); }}
                        calMonth={calMonth}
                        onMonthChange={setCalMonth}
                        startDate={startDate}
                        C={C}
                        size="lg"
                      />

                      <Text style={[styles.fieldLabel, { color: C.gold }]}>Nouveau créneau</Text>
                      <View style={styles.slotGrid}>
                        {slots.filter((slot) => !isSlotPast(editDate, slot)).map((slot) => {
                          const selected = editSlot === slot;
                          return (
                            <TouchableOpacity
                              key={slot}
                              style={[
                                styles.slotOption,
                                { backgroundColor: selected ? C.orange : C.bg, borderColor: selected ? C.orange : C.border },
                              ]}
                              onPress={() => setEditSlot(slot)}
                              activeOpacity={0.75}
                            >
                              <Text style={[styles.slotOptionTime, { color: selected ? "#fff" : C.text }]}>{slot}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <Text style={[styles.fieldLabel, { color: C.gold }]}>Type d&apos;intervention</Text>
                      {types.length === 0 ? (
                        <Text style={[styles.sheetSub, { color: C.muted }]}>
                          Aucun type d&apos;intervention disponible.
                        </Text>
                      ) : (
                        <View style={styles.typeGrid}>
                          {types.map((t) => {
                            const selected = selectedTypeId === t.id;
                            return (
                              <TouchableOpacity
                                key={t.id}
                                style={[
                                  styles.typeOption,
                                  { backgroundColor: selected ? C.orange : C.bg, borderColor: selected ? C.orange : C.border },
                                ]}
                                onPress={() => setSelectedTypeId(t.id)}
                                activeOpacity={0.75}
                              >
                                <Text style={[styles.typeOptionLabel, { color: selected ? "#fff" : C.text }]}>{t.label}</Text>
                                <Text style={[styles.typeOptionDuration, { color: selected ? "rgba(255,255,255,0.85)" : C.muted }]}>
                                  {t.duration_minutes} min
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </>
                  )}

                  <View style={styles.modalButtons}>
                    <TouchableOpacity style={[styles.modalBtnSecondary, { borderColor: C.border }]} onPress={() => setTarget(null)} disabled={saving}>
                      <Text style={[styles.modalBtnSecondaryText, { color: C.muted }]}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalBtnPrimary, { backgroundColor: C.orange }, !canSave && { opacity: 0.5 }]}
                      onPress={handleSave}
                      disabled={!canSave}
                    >
                      {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.modalBtnPrimaryText}>Valider</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmModal
        visible={dayBookedAlert}
        icon="📅"
        title="Un seul créneau par jour"
        message={"Le mode \"1 visite par jour\" est activé : une visite ou une intervention est déjà prévue ce jour-là. Choisis un autre jour."}
        singleButton
        destructive={false}
        confirmLabel="J'ai compris"
        onCancel={() => setDayBookedAlert(false)}
        onConfirm={() => setDayBookedAlert(false)}
        C={C}
      />

      <ConfirmModal
        visible={overlapAlert}
        icon="⚠️"
        title="Chevauchement"
        message="Tu as déjà une intervention prévue sur ce créneau."
        singleButton
        destructive={false}
        confirmLabel="J'ai compris"
        onCancel={() => setOverlapAlert(false)}
        onConfirm={() => setOverlapAlert(false)}
        C={C}
      />

      <ConfirmModal
        visible={otherSpaceOverlapAlert}
        icon="🗂️"
        title="Créneau déjà pris ailleurs"
        message="Tu es déjà engagé(e) sur ce créneau chez un autre patient. Tu ne peux pas le réserver depuis cet espace. Si tu as vraiment besoin de ce créneau ici, modifie d'abord ta réservation chez le premier patient pour le libérer."
        singleButton
        destructive={false}
        confirmLabel="J'ai compris"
        onCancel={() => setOtherSpaceOverlapAlert(false)}
        onConfirm={() => setOtherSpaceOverlapAlert(false)}
        C={C}
      />
    </>
  );
}

export default forwardRef(InterventionEditFlow);

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "flex-end" },
  overlayScroll: { flexGrow: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, padding: 20, paddingBottom: 28, marginBottom: 12 },
  sheetTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 4 },
  sheetSub: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginBottom: 6 },
  fieldLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8, marginTop: 14 },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4, justifyContent: "center" },
  slotOption: { borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, alignItems: "center", minWidth: "28%" },
  slotOptionTime: { fontFamily: "DM_Sans_700Bold", fontSize: 15 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeOption: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignItems: "center", minWidth: "44%" },
  typeOptionLabel: { fontFamily: "DM_Sans_700Bold", fontSize: 14 },
  typeOptionDuration: { fontFamily: "DM_Sans_400Regular", fontSize: 11, marginTop: 2 },
  modalButtons: { flexDirection: "row", gap: 10, width: "100%", marginTop: 18 },
  modalBtnSecondary: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  modalBtnSecondaryText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  modalBtnPrimary: { flex: 1.3, borderRadius: 10, paddingVertical: 13, alignItems: "center", justifyContent: "center" },
  modalBtnPrimaryText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
});

```

### components/InterventionBookingFlow.tsx

```tsx
import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  Modal, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { linkCalendarEvent, addToNativeCalendar, deleteLinkedCalendarEvent } from "@/lib/calendarSync";
import { getInterventionOverlap, isReservationDatePast, isSlotFullyPast, toFrLong, toFrShort } from "@/lib/slotUtils";
import { getSyncedInterventionTypes } from "@/lib/interventionTypesSync";
import ConfirmModal from "@/components/ConfirmModal";
import type { OtherSpaceIntervention } from "@/lib/useOtherSpaceInterventions";
import type { Reservation, SlotConfig, PatientSpace, InterventionType } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Réservation par l'intervenant lui-même — équivalent de BookingFlow.tsx
// mais sans compagnons/email invité/capture d'identité (déjà gérés par la
// fiche intervenant, voir IntervenantFicheModal.tsx). Chaque réservation
// bloque directement la durée du type d'intervention choisi et recase les
// visites en conflit via la RPC book_intervention — voir
// supabase/migrations/20260722_book_intervention.sql pour l'algorithme
// exact (identique à apply_slot_rule_change, réutilise les mêmes
// alert_type 'rebooked'/'rebooking_failed' donc RebookingAlertModal.tsx
// n'a besoin d'aucun changement).

export interface InterventionBookingFlowHandle {
  openBooking: (iso: string, slot: string) => void;
  openCancel: (r: Reservation) => void;
}

interface Props {
  space: PatientSpace;
  slotConfig: SlotConfig;
  slots: string[];
  reservations: Reservation[];
  intervenantProfileId: string;
  pin: string;
  refreshReservations: () => Promise<void>;
  // Soins de cet intervenant chez d'autres patients (lib/useOtherSpaceInterventions)
  // — permet d'afficher "Créneau déjà pris ailleurs" dès le tap sur le
  // créneau, sans passer par le popup de choix du type d'intervention (le
  // serveur refuserait de toute façon, voir book_intervention/
  // INTERVENTION_OVERLAP_OTHER_SPACE, gardée en filet de sécurité ci-dessous).
  otherSpaceInterventions?: OtherSpaceIntervention[];
  // Cible + libellé du bouton "Retour" une fois la réservation confirmée —
  // par défaut le calendrier de l'espace, mais home/slots.tsx passe l'onglet
  // Planning intervenant (avec le patient réservé présélectionné) quand la
  // réservation vient du popup "Réserver un créneau" de app/(visitor)/soins.tsx.
  homeCalendarPath: "/(visitor)/home/calendar" | { pathname: string; params?: Record<string, string> };
  homeCalendarLabel?: string;
  C: Theme;
}

interface ConfirmedBooking {
  iso: string;
  slot: string;
  label: string;
  rebookedCount: number;
  failedCount: number;
  durationMinutes: number;
  reservationId: string;
}

function InterventionBookingFlow(
  { space, slotConfig, slots, reservations, intervenantProfileId, pin, refreshReservations, otherSpaceInterventions = [], homeCalendarPath, homeCalendarLabel, C }: Props,
  ref: React.Ref<InterventionBookingFlowHandle>,
) {
  const router = useRouter();

  const [types, setTypes] = useState<InterventionType[]>([]);

  useEffect(() => {
    getSyncedInterventionTypes(intervenantProfileId).then(setTypes);
  }, [intervenantProfileId]);

  const [bookingTarget, setBookingTarget] = useState<{ iso: string; slot: string } | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dayBookedAlert, setDayBookedAlert] = useState(false);
  const [overlapAlert, setOverlapAlert] = useState(false);
  const [otherSpaceOverlapAlert, setOtherSpaceOverlapAlert] = useState(false);
  const [confirmed, setConfirmed] = useState<ConfirmedBooking | null>(null);
  const [calendarAdded, setCalendarAdded] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const [toast, setToast] = useState("");
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
  }

  function openBooking(iso: string, slot: string) {
    if (isSlotFullyPast(iso, slot)) {
      showToast("Ce créneau est déjà passé.");
      return;
    }
    // Chevauchement connu côté client (même intervenant, autre espace
    // patient) : on affiche l'alerte tout de suite plutôt que d'ouvrir le
    // popup de choix du type d'intervention pour rien — la RPC le refuserait
    // de toute façon (INTERVENTION_OVERLAP_OTHER_SPACE), gardée en filet de
    // sécurité dans handleBook pour les cas non couverts côté client
    // (ex. réservation concurrente faite entre-temps depuis l'autre espace).
    if (getInterventionOverlap(otherSpaceInterventions, iso, slot, slotConfig.slot_duration_minutes)) {
      setOtherSpaceOverlapAlert(true);
      return;
    }
    setSelectedTypeId(types[0]?.id ?? null);
    setBookingTarget({ iso, slot });
    setConfirmed(null);
    setCalendarAdded(false);
  }

  function openCancel(r: Reservation) {
    setCancelTarget(r);
  }

  useImperativeHandle(ref, () => ({ openBooking, openCancel }));

  const selectedType = types.find((t) => t.id === selectedTypeId) ?? null;

  async function handleBook() {
    if (!bookingTarget || !selectedType) return;
    setSaving(true);

    const { data, error } = await supabase.rpc("book_intervention", {
      p_space_id: space.id,
      p_intervenant_profile_id: intervenantProfileId,
      p_intervention_type_id: selectedType.id,
      p_date: bookingTarget.iso,
      p_start_slot: bookingTarget.slot,
      p_pin: pin,
      p_slots: slots,
    });

    setSaving(false);

    if (error) {
      if (error.message.includes("INTERVENTION_CROSSES_MIDNIGHT")) {
        Alert.alert("Créneau impossible", "Cette intervention dépasserait minuit. Choisis un créneau plus tôt.");
      } else if (error.message.includes("INTERVENTION_OVERLAP_OTHER_SPACE")) {
        setOtherSpaceOverlapAlert(true);
      } else if (error.message.includes("INTERVENTION_OVERLAP_SELF")) {
        setOverlapAlert(true);
      } else if (error.message.includes("DAY_ALREADY_BOOKED")) {
        setDayBookedAlert(true);
      } else {
        Alert.alert("Erreur lors de la réservation", error.message);
      }
      return;
    }

    await refreshReservations();

    setConfirmed({
      iso: bookingTarget.iso,
      slot: bookingTarget.slot,
      label: selectedType.label,
      rebookedCount: (data?.rebooked ?? []).length,
      failedCount: (data?.failed ?? []).length,
      durationMinutes: selectedType.duration_minutes,
      reservationId: data?.intervention_id ?? "",
    });
  }

  async function handleAddToCalendar() {
    if (!confirmed) return;
    const result = await addToNativeCalendar(
      space, slotConfig, confirmed.iso, confirmed.slot, "Intervention", null,
      undefined, confirmed.label, confirmed.durationMinutes,
    );
    if (result.ok) {
      if (confirmed.reservationId) await linkCalendarEvent(confirmed.reservationId, result.eventId);
      setCalendarAdded(true);
      showToast("Intervention ajoutée à ton calendrier ✓");
    } else {
      Alert.alert("Calendrier", "Impossible d'ajouter l'événement : " + result.reason);
    }
  }

  async function handleCancel() {
    if (!cancelTarget || isReservationDatePast(cancelTarget.date)) return;
    setCancelling(true);

    const { error, count } = await supabase.from("reservations").delete({ count: "exact" }).eq("id", cancelTarget.id);

    setCancelling(false);

    if (error || count === 0) {
      showToast("Erreur lors de l'annulation.");
      return;
    }

    deleteLinkedCalendarEvent(cancelTarget.id);
    await refreshReservations();
    showToast("Intervention annulée ✓");
    setCancelTarget(null);
  }

  return (
    <>
      {/* ── MODAL RÉSERVATION ──────────────────────────────────────────────── */}
      <Modal visible={!!bookingTarget && !confirmed} transparent animationType="fade" onRequestClose={() => setBookingTarget(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={styles.centeredOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => !saving && setBookingTarget(null)}
            />
            <View style={[styles.centeredSheet, { backgroundColor: C.card, borderColor: C.orange }]}>
              <Text style={[styles.sheetTitle, { color: C.text }]}>🩺 Intervention {bookingTarget?.slot}</Text>
              <Text style={[styles.sheetSub, { color: C.muted }]}>
                {bookingTarget && toFrLong(new Date(bookingTarget.iso + "T12:00:00"))}
              </Text>

              {types.length === 0 ? (
                <Text style={[styles.sheetSub, { color: C.muted }]}>
                  Ajoute au moins un type d'intervention depuis "Mon compte → Ma fiche intervenant" avant de pouvoir réserver.
                </Text>
              ) : (
                <ScrollView style={styles.typeScroll} keyboardShouldPersistTaps="handled">
                  <Text style={[styles.fieldLabel, { color: C.gold }]}>Type d'intervention</Text>
                  <View style={styles.typeGrid}>
                    {types.map((t) => {
                      const selected = selectedTypeId === t.id;
                      return (
                        <TouchableOpacity
                          key={t.id}
                          style={[
                            styles.typeOption,
                            { backgroundColor: selected ? C.orange : C.bg, borderColor: selected ? C.orange : C.border },
                          ]}
                          onPress={() => setSelectedTypeId(t.id)}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.typeOptionLabel, { color: selected ? "#fff" : C.text }]}>{t.label}</Text>
                          <Text style={[styles.typeOptionDuration, { color: selected ? "rgba(255,255,255,0.85)" : C.muted }]}>
                            {t.duration_minutes} min
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={[styles.priorityBox, { borderColor: C.orange, backgroundColor: "rgba(249,115,22,0.1)" }]}>
                    <Text style={[styles.priorityText, { color: C.text }]}>
                      ⚠️ Ton intervention est prioritaire sur les visites. Si une visite est déjà prévue sur ce créneau,
                      elle sera automatiquement déplacée au créneau valide le plus proche.
                    </Text>
                  </View>
                </ScrollView>
              )}

              <View style={styles.sheetBtns}>
                <TouchableOpacity
                  onPress={() => setBookingTarget(null)}
                  disabled={saving}
                  style={[styles.btnSecondary, { borderColor: C.border }]}
                >
                  <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleBook}
                  disabled={saving || !selectedType}
                  style={[styles.btnPrimary, { backgroundColor: C.orange }, (saving || !selectedType) && { opacity: 0.5 }]}
                >
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnPrimaryText}>Confirmer</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL CONFIRMATION ────────────────────────────────────────────── */}
      <Modal visible={!!confirmed} transparent animationType="fade" onRequestClose={() => { setConfirmed(null); setBookingTarget(null); }}>
        <View style={styles.centeredOverlay}>
          <View style={[styles.centeredSheet, { backgroundColor: C.card, borderColor: C.orange }]}>
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>🩺</Text>
              <Text style={[styles.sheetTitle, { color: C.success }]}>Intervention réservée</Text>
              <Text style={[styles.sheetSub, { color: C.muted }]}>
                {confirmed?.label} · {confirmed && toFrShort(new Date(confirmed.iso + "T12:00:00"))} {confirmed?.slot}
              </Text>
            </View>

            {!!confirmed?.rebookedCount && (
              <Text style={[styles.rebookInfo, { color: C.text, backgroundColor: C.bg, borderColor: C.border }]}>
                {confirmed.rebookedCount} visite(s) en conflit ont été automatiquement déplacées.
              </Text>
            )}
            {!!confirmed?.failedCount && (
              <Text style={[styles.rebookInfo, { color: C.danger, backgroundColor: C.bg, borderColor: C.danger }]}>
                {confirmed.failedCount} visite(s) n'ont pas pu être replacées automatiquement — l'organisateur a été alerté.
              </Text>
            )}

            <TouchableOpacity
              style={[
                styles.calendarBtn,
                { borderColor: calendarAdded ? C.success : "rgba(52,168,83,0.4)", backgroundColor: "rgba(52,168,83,0.1)" },
              ]}
              onPress={handleAddToCalendar}
              disabled={calendarAdded}
            >
              <Text style={[styles.calendarBtnText, { color: calendarAdded ? C.success : "#3da85e" }]}>
                {calendarAdded ? "✅ Ajouté au calendrier" : "📅 Ajouter à mon calendrier"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setConfirmed(null); setBookingTarget(null); router.navigate(homeCalendarPath as any); }}
              activeOpacity={0.75}
              style={{ width: "100%", height: 48, borderRadius: 10, borderWidth: 1, borderColor: C.orange, backgroundColor: `${C.orange}22`, alignItems: "center", justifyContent: "center", marginTop: 10 }}
            >
              <Text style={{ fontFamily: "DM_Sans_600SemiBold", fontSize: 14, color: C.orange }}>{homeCalendarLabel ?? "← Retour au calendrier"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL ANNULATION ──────────────────────────────────────────────── */}
      <Modal visible={!!cancelTarget} transparent animationType="fade" onRequestClose={() => setCancelTarget(null)}>
        <View style={styles.centeredOverlay}>
          <View style={[styles.centeredSheet, { backgroundColor: C.card, borderColor: C.orange }]}>
            <Text style={[styles.sheetTitle, { color: C.text }]}>Annuler cette intervention ?</Text>
            <Text style={[styles.sheetSub, { color: C.muted }]}>
              {cancelTarget?.intervention_label} · {cancelTarget && toFrShort(new Date(cancelTarget.date + "T12:00:00"))} {cancelTarget?.creneau}
            </Text>
            <View style={styles.sheetBtns}>
              <TouchableOpacity onPress={() => setCancelTarget(null)} disabled={cancelling} style={[styles.btnSecondary, { borderColor: C.border }]}>
                <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Retour</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCancel}
                disabled={cancelling}
                style={[styles.btnPrimary, { backgroundColor: C.danger }, cancelling && { opacity: 0.5 }]}
              >
                {cancelling ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnPrimaryText}>🗑️ Annuler</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {!!toast && (
        <View style={[styles.toast, { backgroundColor: C.success }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <ConfirmModal
        visible={dayBookedAlert}
        icon="📅"
        title="Un seul créneau par jour"
        message={"Le mode \"1 visite par jour\" est activé : une visite ou une intervention est déjà prévue ce jour-là. Choisis un autre jour."}
        singleButton
        destructive={false}
        confirmLabel="J'ai compris"
        onCancel={() => setDayBookedAlert(false)}
        onConfirm={() => setDayBookedAlert(false)}
        C={C}
      />

      <ConfirmModal
        visible={overlapAlert}
        icon="⚠️"
        title="Chevauchement"
        message="Tu as déjà une intervention prévue sur ce créneau."
        singleButton
        destructive={false}
        confirmLabel="J'ai compris"
        onCancel={() => setOverlapAlert(false)}
        onConfirm={() => setOverlapAlert(false)}
        C={C}
      />

      <ConfirmModal
        visible={otherSpaceOverlapAlert}
        icon="🗂️"
        title="Créneau déjà pris ailleurs"
        message="Tu es déjà engagé(e) sur ce créneau chez un autre patient. Tu ne peux pas le réserver depuis cet espace. Si tu as vraiment besoin de ce créneau ici, modifie d'abord ta réservation chez le premier patient pour le libérer."
        singleButton
        destructive={false}
        confirmLabel="J'ai compris"
        onCancel={() => setOtherSpaceOverlapAlert(false)}
        onConfirm={() => setOtherSpaceOverlapAlert(false)}
        C={C}
      />
    </>
  );
}

export default forwardRef(InterventionBookingFlow);

const styles = StyleSheet.create({
  // Centered (non-bottom-sheet) overlay/sheet — used by all three modals in this file
  // (bookingTarget, confirmed, cancelTarget), which are small/medium popups, not large forms.
  centeredOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "center", alignItems: "center", padding: 24 },
  centeredSheet: { width: "88%", maxWidth: 400, maxHeight: "82%", borderRadius: 20, borderWidth: 1, padding: 24 },
  typeScroll: { maxHeight: 280 },

  sheetTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 4 },
  sheetSub: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginBottom: 20 },

  fieldLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  typeOption: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignItems: "center", minWidth: "44%" },
  typeOptionLabel: { fontFamily: "DM_Sans_700Bold", fontSize: 14 },
  typeOptionDuration: { fontFamily: "DM_Sans_400Regular", fontSize: 11, marginTop: 2 },

  priorityBox: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 4 },
  priorityText: { fontFamily: "DM_Sans_400Regular", fontSize: 12.5, lineHeight: 18 },

  sheetBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
  btnPrimary: { flex: 1.3, borderRadius: 10, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  btnPrimaryText: { fontFamily: "DM_Sans_700Bold", fontSize: 15, color: "#fff" },
  btnSecondary: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  btnSecondaryText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  backToCalendarBtn: { width: "100%", borderWidth: 1, borderRadius: 10, paddingVertical: 14, alignItems: "center" },

  rebookInfo: { borderWidth: 1, borderRadius: 10, padding: 12, fontFamily: "DM_Sans_400Regular", fontSize: 12.5, lineHeight: 18, marginBottom: 12 },

  calendarBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  calendarBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },

  toast: { position: "absolute", bottom: 24, alignSelf: "center", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  toastText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, color: "#fff" },
});

```

### components/NightInterventionBookingFlow.tsx

```tsx
import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  Modal, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { linkCalendarEvent, addToNativeCalendar } from "@/lib/calendarSync";
import { toFrLong, nightStartSlot, nightRangeLabel } from "@/lib/slotUtils";
import { getSyncedInterventionTypes } from "@/lib/interventionTypesSync";
import type { SlotConfig, PatientSpace, InterventionType } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Réservation d'une nuitée par un intervenant autorisé (voir
// slot_config.night_intervenant_mode, components/NightIntervenantModal.tsx)
// — équivalent de InterventionBookingFlow.tsx mais pour les nuitées : même
// choix du soin, même popup centrée, mais sans RPC book_intervention (une
// nuitée occupe toute la nuit, jamais en conflit avec des réservations
// "Visite" — pas de recasage à faire). L'identité de l'intervenant vient de
// sa fiche (prenom/nom/pin), jamais saisie ici. L'édition/annulation d'une
// nuitée déjà réservée reste gérée par BookingFlow.tsx (modale PIN, déjà
// centrée) via nightFlowRef, qu'elle ait été prise par un intervenant ou un
// visiteur.

export interface NightInterventionBookingFlowHandle {
  openBooking: (iso: string) => void;
}

interface Props {
  space: PatientSpace;
  slotConfig: SlotConfig;
  intervenantProfileId: string;
  prenom: string;
  nom: string;
  pin: string;
  refreshReservations: () => Promise<void>;
  homeCalendarPath: "/(visitor)/home/calendar";
  C: Theme;
}

interface ConfirmedBooking {
  id: string;
  iso: string;
  label: string;
}

function NightInterventionBookingFlow(
  { space, slotConfig, intervenantProfileId, prenom, nom, pin, refreshReservations, homeCalendarPath, C }: Props,
  ref: React.Ref<NightInterventionBookingFlowHandle>,
) {
  const router = useRouter();

  const [types, setTypes] = useState<InterventionType[]>([]);

  useEffect(() => {
    getSyncedInterventionTypes(intervenantProfileId).then(setTypes);
  }, [intervenantProfileId]);

  const [bookingTarget, setBookingTarget] = useState<{ iso: string } | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState<ConfirmedBooking | null>(null);
  const [calendarAdded, setCalendarAdded] = useState(false);

  const [toast, setToast] = useState("");
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
  }

  function openBooking(iso: string) {
    setSelectedTypeId(types[0]?.id ?? null);
    setBookingTarget({ iso });
    setConfirmed(null);
    setCalendarAdded(false);
  }

  useImperativeHandle(ref, () => ({ openBooking }));

  const selectedType = types.find((t) => t.id === selectedTypeId) ?? null;

  async function handleBook() {
    if (!bookingTarget || !selectedType) return;
    setSaving(true);

    const { data: rows, error } = await supabase.from("reservations").insert([{
      space_id: space.id,
      date: bookingTarget.iso,
      creneau: "🌙 Nuit",
      prenom,
      nom,
      telephone: "",
      type: "Nuit",
      pin,
      intervention_label: selectedType.label,
      intervenant_profile_id: intervenantProfileId,
    }]).select();

    setSaving(false);

    if (error) {
      Alert.alert("Erreur lors de la réservation", error.message);
      return;
    }

    await refreshReservations();

    setConfirmed({
      id: rows?.[0]?.id ?? "",
      iso: bookingTarget.iso,
      label: selectedType.label,
    });
  }

  async function handleAddToCalendar() {
    if (!confirmed) return;
    const result = await addToNativeCalendar(space, slotConfig, confirmed.iso, nightStartSlot(slotConfig), "Nuit", null);
    if (result.ok) {
      if (confirmed.id) await linkCalendarEvent(confirmed.id, result.eventId);
      setCalendarAdded(true);
      showToast("Nuitée ajoutée à ton calendrier ✓");
    } else {
      Alert.alert("Calendrier", "Impossible d'ajouter l'événement : " + result.reason);
    }
  }

  return (
    <>
      {/* ── MODAL RÉSERVATION ──────────────────────────────────────────────── */}
      <Modal visible={!!bookingTarget && !confirmed} transparent animationType="fade" onRequestClose={() => setBookingTarget(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={styles.centeredOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => !saving && setBookingTarget(null)}
            />
            <View style={[styles.centeredSheet, { backgroundColor: C.card, borderColor: C.gold }]}>
              <Text style={[styles.sheetTitle, { color: C.text }]}>🌙 Réserver une nuit</Text>
              <Text style={[styles.sheetSub, { color: C.muted }]}>
                {bookingTarget && toFrLong(new Date(bookingTarget.iso + "T12:00:00"))} · {nightRangeLabel(slotConfig)}
              </Text>

              {types.length === 0 ? (
                <Text style={[styles.sheetSub, { color: C.muted }]}>
                  Ajoute au moins un type d'intervention depuis "Mon compte → Ma fiche intervenant" avant de pouvoir réserver.
                </Text>
              ) : (
                <ScrollView style={styles.typeScroll} keyboardShouldPersistTaps="handled">
                  <Text style={[styles.fieldLabel, { color: C.gold }]}>Type d'intervention</Text>
                  <View style={styles.typeGrid}>
                    {types.map((t) => {
                      const selected = selectedTypeId === t.id;
                      return (
                        <TouchableOpacity
                          key={t.id}
                          style={[
                            styles.typeOption,
                            { backgroundColor: selected ? C.gold : C.bg, borderColor: selected ? C.gold : C.border },
                          ]}
                          onPress={() => setSelectedTypeId(t.id)}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.typeOptionLabel, { color: selected ? "#0D1B2E" : C.text }]}>{t.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              )}

              <View style={styles.sheetBtns}>
                <TouchableOpacity
                  onPress={() => setBookingTarget(null)}
                  disabled={saving}
                  style={[styles.btnSecondary, { borderColor: C.border }]}
                >
                  <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleBook}
                  disabled={saving || !selectedType}
                  style={[styles.btnPrimary, { backgroundColor: C.gold }, (saving || !selectedType) && { opacity: 0.5 }]}
                >
                  {saving ? <ActivityIndicator color="#0D1B2E" size="small" /> : <Text style={styles.btnPrimaryText}>Confirmer</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL CONFIRMATION ────────────────────────────────────────────── */}
      <Modal visible={!!confirmed} transparent animationType="fade" onRequestClose={() => { setConfirmed(null); setBookingTarget(null); }}>
        <View style={styles.centeredOverlay}>
          <View style={[styles.centeredSheet, { backgroundColor: C.card, borderColor: C.gold }]}>
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>🌙</Text>
              <Text style={[styles.sheetTitle, { color: C.success }]}>Nuitée réservée</Text>
              <Text style={[styles.sheetSub, { color: C.muted }]}>
                {confirmed?.label} · {confirmed && toFrLong(new Date(confirmed.iso + "T12:00:00"))}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.calendarBtn,
                { borderColor: calendarAdded ? C.success : "rgba(52,168,83,0.4)", backgroundColor: "rgba(52,168,83,0.1)" },
              ]}
              onPress={handleAddToCalendar}
              disabled={calendarAdded}
            >
              <Text style={[styles.calendarBtnText, { color: calendarAdded ? C.success : "#3da85e" }]}>
                {calendarAdded ? "✅ Ajouté au calendrier" : "📅 Ajouter à mon calendrier"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setConfirmed(null); setBookingTarget(null); router.navigate(homeCalendarPath); }}
              activeOpacity={0.75}
              style={{ width: "100%", height: 48, borderRadius: 10, borderWidth: 1, borderColor: C.gold, backgroundColor: `${C.gold}22`, alignItems: "center", justifyContent: "center", marginTop: 10 }}
            >
              <Text style={{ fontFamily: "DM_Sans_600SemiBold", fontSize: 14, color: C.gold }}>← Retour au calendrier</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {!!toast && (
        <View style={[styles.toast, { backgroundColor: C.success }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </>
  );
}

export default forwardRef(NightInterventionBookingFlow);

const styles = StyleSheet.create({
  centeredOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "center", alignItems: "center", padding: 24 },
  centeredSheet: { width: "88%", maxWidth: 400, maxHeight: "82%", borderRadius: 20, borderWidth: 1, padding: 24 },
  typeScroll: { maxHeight: 280 },

  sheetTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 4 },
  sheetSub: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginBottom: 20 },

  fieldLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  typeOption: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignItems: "center", minWidth: "44%" },
  typeOptionLabel: { fontFamily: "DM_Sans_700Bold", fontSize: 14 },

  sheetBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
  btnPrimary: { flex: 1.3, borderRadius: 10, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  btnPrimaryText: { fontFamily: "DM_Sans_700Bold", fontSize: 15, color: "#0D1B2E" },
  btnSecondary: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  btnSecondaryText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },

  calendarBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  calendarBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },

  toast: { position: "absolute", bottom: 24, alignSelf: "center", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  toastText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, color: "#fff" },
});

```

### components/AdminAddIntervention.tsx

```tsx
import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { toFrLong, toISO, isSlotFullyPast } from "@/lib/slotUtils";
import { addToNativeCalendar, linkCalendarEvent } from "@/lib/calendarSync";
import { careLocationDetail } from "@/lib/address";
import MiniCalendar from "@/components/MiniCalendar";
import ConfirmModal from "@/components/ConfirmModal";
import AdminNewIntervenantFlow from "@/components/AdminNewIntervenantFlow";
import type { PatientSpace, SlotConfig, IntervenantProfile, InterventionType, Reservation } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Modale "ajouter une intervention" côté admin — parallèle à
// AdminAddReservation.tsx (non modifié, celui-ci reste hardcodé
// "Visite"|"Nuit") : jour → horaire → intervenant → type d'intervention,
// un seul popup en 4 étapes progressives, puis même RPC book_intervention
// que côté intervenant (voir InterventionBookingFlow.tsx), avec
// p_pin='ADMIN' — ainsi les visites en conflit sont recasées exactement de
// la même façon, que la réservation vienne de l'intervenant ou de l'admin
// en son nom.

export interface AdminAddInterventionHandle {
  open: (initialIso?: string) => void;
}

interface Props {
  space: PatientSpace;
  slotConfig: SlotConfig;
  getSlotsForDate: (iso: string) => string[];
  startDate: Date;
  interventionDates: Set<string>;
  // Toutes les réservations de l'espace (Visite + Nuit + Intervention) —
  // sert uniquement à détecter en amont, dès l'ouverture sur un jour donné,
  // qu'il est déjà pris quand le mode "1 visite par jour" est actif (même
  // règle que côté serveur, voir book_intervention() dans
  // supabase/migrations/20260720_book_intervention_one_visit_per_day.sql),
  // pour ouvrir directement la popup "Un seul créneau par jour" au lieu de
  // laisser dérouler tout le formulaire jusqu'au clic "Réserver".
  reservations: Reservation[];
  onAdded: () => void;
  C: Theme;
  // Réutilisation côté intervenant (app/(visitor)/soins.tsx, bouton
  // "Ajouter une intervention") : intervenant déjà connu, on saute l'étape
  // de sélection et on réserve avec son vrai PIN plutôt que "ADMIN".
  fixedIntervenantProfileId?: string;
  pin?: string;
}

function AdminAddIntervention({ space, slotConfig, getSlotsForDate, startDate, interventionDates, reservations, onAdded, C, fixedIntervenantProfileId, pin }: Props, ref: React.Ref<AdminAddInterventionHandle>) {
  const [visible, setVisible] = useState(false);
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<IntervenantProfile[]>([]);
  const [types, setTypes] = useState<InterventionType[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dayBookedAlert, setDayBookedAlert] = useState(false);
  const [overlapAlert, setOverlapAlert] = useState(false);

  // Même règle que le trigger check_slot_capacity() / book_intervention()
  // côté serveur : une visite ou une intervention déjà présente ce jour-là
  // (hors "day_cap_suspended") suffit à le considérer pris.
  function isDayAlreadyBooked(iso: string) {
    return reservations.some(
      (r) => r.date === iso && (r.type === "Visite" || r.type === "Intervention") && r.alert_type !== "day_cap_suspended",
    );
  }

  const [savedId, setSavedId] = useState<string | null>(null);
  const [rebookedCount, setRebookedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [addingToCalendar, setAddingToCalendar] = useState(false);
  const [calendarAdded, setCalendarAdded] = useState(false);
  const [newIntervenantOpen, setNewIntervenantOpen] = useState(false);
  const [sendingConfirmation, setSendingConfirmation] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [toast, setToast] = useState("");
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
  }

  useImperativeHandle(ref, () => ({
    open: (initialIso) => {
      const iso = initialIso ?? toISO(new Date());

      if (slotConfig.one_visit_per_day && isDayAlreadyBooked(iso)) {
        setDayBookedAlert(true);
        return;
      }

      const d = new Date(iso + "T00:00:00");
      setSelectedIso(iso);
      setCalMonth({ year: d.getFullYear(), month: d.getMonth() });
      setSelectedSlot(null);
      setSelectedTypeId(null);
      setTypes([]);
      setSavedId(null);
      setCalendarAdded(false);
      setConfirmationSent(false);
      if (fixedIntervenantProfileId) {
        setSelectedProfileId(fixedIntervenantProfileId);
        setProfiles([]);
        setLoadingProfiles(false);
      } else {
        setSelectedProfileId(null);
        setLoadingProfiles(true);
        supabase
          .from("intervenant_profiles")
          .select("*")
          .eq("space_id", space.id)
          .order("prenom", { ascending: true })
          .then(({ data }) => {
            setProfiles(data || []);
            setLoadingProfiles(false);
          });
      }
      setVisible(true);
    },
  }));

  useEffect(() => {
    if (!selectedProfileId) { setTypes([]); setSelectedTypeId(null); return; }
    setLoadingTypes(true);
    supabase
      .from("intervention_types")
      .select("*")
      .eq("intervenant_profile_id", selectedProfileId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        setTypes(data || []);
        setSelectedTypeId(data?.[0]?.id ?? null);
        setLoadingTypes(false);
      });
  }, [selectedProfileId]);

  const allSlotsForDay = selectedIso ? getSlotsForDate(selectedIso) : [];
  const futureSlotsForDay = selectedIso ? allSlotsForDay.filter((s) => !isSlotFullyPast(selectedIso, s)) : [];
  const selectedProfile = fixedIntervenantProfileId
    ? ({ id: fixedIntervenantProfileId } as IntervenantProfile)
    : profiles.find((p) => p.id === selectedProfileId) ?? null;
  const selectedType = types.find((t) => t.id === selectedTypeId) ?? null;

  function selectDay(iso: string) {
    setSelectedIso(iso);
    setSelectedSlot(null);
    if (!fixedIntervenantProfileId) setSelectedProfileId(null);
    setSelectedTypeId(null);
  }

  async function handleBook() {
    if (!selectedIso || !selectedSlot || !selectedProfile || !selectedType) return;
    setSaving(true);

    const { data, error } = await supabase.rpc("book_intervention", {
      p_space_id: space.id,
      p_intervenant_profile_id: selectedProfile.id,
      p_intervention_type_id: selectedType.id,
      p_date: selectedIso,
      p_start_slot: selectedSlot,
      p_pin: pin ?? "ADMIN",
      p_slots: allSlotsForDay,
    });

    setSaving(false);

    if (error) {
      if (error.message.includes("INTERVENTION_CROSSES_MIDNIGHT")) {
        Alert.alert("Créneau impossible", "Cette intervention dépasserait minuit. Choisis un créneau plus tôt.");
      } else if (error.message.includes("INTERVENTION_OVERLAP_SELF")) {
        setOverlapAlert(true);
      } else if (error.message.includes("DAY_ALREADY_BOOKED")) {
        setDayBookedAlert(true);
      } else {
        Alert.alert("Erreur lors de la réservation", error.message);
      }
      return;
    }

    onAdded();
    setRebookedCount((data?.rebooked ?? []).length);
    setFailedCount((data?.failed ?? []).length);
    setSavedId(data?.intervention_id ?? null);
  }

  async function handleAddToCalendar() {
    if (!selectedIso || !selectedSlot || !savedId || !selectedType) return;
    setAddingToCalendar(true);
    const result = await addToNativeCalendar(
      space, slotConfig, selectedIso, selectedSlot, "Intervention", null,
      undefined, selectedType.label, selectedType.duration_minutes,
    );
    setAddingToCalendar(false);
    if (!result.ok) {
      Alert.alert("Calendrier", result.reason);
      return;
    }
    await linkCalendarEvent(savedId, result.eventId);
    setCalendarAdded(true);
  }

  // Envoie la confirmation du créneau qui vient d'être réservé à l'intervenant
  // sélectionné : message in-app (réutilise les colonnes alert_* existantes,
  // repris à chaque connexion tant que non traité — voir
  // BookingProposalAlertModal.tsx) si la fiche a un compte (pin non nul), et/ou
  // email via l'Edge Function si une adresse est renseignée sur la fiche — les
  // deux peuvent se déclencher ensemble (compte + email).
  async function handleSendConfirmation() {
    if (!selectedProfile || !savedId || !selectedIso || !selectedSlot || !selectedType || sendingConfirmation) return;
    setSendingConfirmation(true);
    try {
      const hasAccount = selectedProfile.pin !== null;
      const sentParts: string[] = [];

      if (hasAccount) {
        const message =
          `Un créneau t'a été réservé le ${toFrLong(new Date(selectedIso + "T12:00:00"))} à ${selectedSlot} — ` +
          `${selectedType.label} (${selectedType.duration_minutes} min) pour ${space.patient_firstname} ${space.patient_lastname}, ` +
          `${careLocationDetail(space)}.`;
        const { error } = await supabase
          .from("reservations")
          .update({ alert_type: "booking_proposal", alert_seen: false, alert_message: message })
          .eq("id", savedId);
        if (error) throw error;
        sentParts.push("message affiché à la prochaine connexion");
      }

      if (selectedProfile.email) {
        const { error } = await supabase.functions.invoke("notify-intervention-confirmation", {
          body: {
            space_id: space.id,
            intervenant_email: selectedProfile.email,
            intervenant_prenom: selectedProfile.prenom,
            date: selectedIso,
            creneau: selectedSlot,
            duration_minutes: selectedType.duration_minutes,
            intervention_label: selectedType.label,
          },
        });
        if (error) throw error;
        sentParts.push("email envoyé");
      }

      setConfirmationSent(true);
      showToast(sentParts.length ? `${sentParts.join(" + ")} ✓` : "Rien à envoyer");
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible d'envoyer la confirmation.");
    } finally {
      setSendingConfirmation(false);
    }
  }

  function handleNewIntervenantCreated(profile: IntervenantProfile) {
    setProfiles((prev) => [...prev, profile].sort((a, b) => a.prenom.localeCompare(b.prenom)));
    setSelectedProfileId(profile.id);
    setNewIntervenantOpen(false);
  }

  function close() {
    setVisible(false);
    setSavedId(null);
  }

  return (
    <>
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => !saving && close()}>
          <ScrollView contentContainerStyle={styles.overlayScroll} keyboardShouldPersistTaps="handled">
            <TouchableOpacity activeOpacity={1}>
              <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.orange }]}>
                {savedId ? (
                  <>
                    <Text style={[styles.sheetTitle, { color: C.success }]}>Intervention ajoutée ✓</Text>
                    <Text style={[styles.sheetSub, { color: C.muted }]}>
                      {selectedType?.label} · {selectedIso && toFrLong(new Date(selectedIso + "T12:00:00"))} · {selectedSlot}
                    </Text>

                    {!!rebookedCount && (
                      <Text style={[styles.rebookInfo, { color: C.text, backgroundColor: C.bg, borderColor: C.border }]}>
                        {rebookedCount} visite(s) en conflit ont été automatiquement déplacées.
                      </Text>
                    )}
                    {!!failedCount && (
                      <Text style={[styles.rebookInfo, { color: C.danger, backgroundColor: C.bg, borderColor: C.danger }]}>
                        {failedCount} visite(s) n'ont pas pu être replacées automatiquement.
                      </Text>
                    )}

                    <TouchableOpacity
                      style={[
                        styles.calendarBtn,
                        { borderColor: calendarAdded ? C.success : C.orange, backgroundColor: calendarAdded ? `${C.success}22` : `${C.orange}22` },
                        addingToCalendar && { opacity: 0.6 },
                      ]}
                      onPress={handleAddToCalendar}
                      disabled={addingToCalendar || calendarAdded}
                    >
                      {addingToCalendar ? (
                        <ActivityIndicator color={C.orange} size="small" />
                      ) : (
                        <Text style={[styles.calendarBtnText, { color: calendarAdded ? C.success : C.orange }]}>
                          {calendarAdded ? "✅ Ajouté au calendrier" : "📅 Ajouter au calendrier"}
                        </Text>
                      )}
                    </TouchableOpacity>

                    {!fixedIntervenantProfileId && (
                      <TouchableOpacity
                        style={[
                          styles.calendarBtn,
                          { borderColor: confirmationSent ? C.success : C.orange, backgroundColor: confirmationSent ? `${C.success}22` : `${C.orange}22` },
                          (sendingConfirmation || (selectedProfile?.pin === null && !selectedProfile?.email)) && { opacity: 0.6 },
                        ]}
                        onPress={handleSendConfirmation}
                        disabled={sendingConfirmation || confirmationSent || (selectedProfile?.pin === null && !selectedProfile?.email)}
                      >
                        {sendingConfirmation ? (
                          <ActivityIndicator color={C.orange} size="small" />
                        ) : (
                          <Text style={[styles.calendarBtnText, { color: confirmationSent ? C.success : C.orange }]}>
                            {confirmationSent
                              ? "✅ Confirmation envoyée"
                              : selectedProfile?.pin === null && !selectedProfile?.email
                                ? "Aucun email renseigné"
                                : `✉️ Envoyer une confirmation à ${selectedProfile?.prenom}`}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[styles.btnSecondary, { borderColor: C.orange, width: "100%", marginTop: 12 }]}
                      onPress={close}
                    >
                      <Text style={[styles.btnSecondaryText, { color: C.orange }]}>Fermer</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={[styles.sheetTitle, { color: C.text }]}>🩺 Ajouter une intervention</Text>

                    <Text style={[styles.fieldLabel, { color: C.gold }]}>Jour</Text>
                    {selectedIso && (
                      <MiniCalendar
                        selDate={selectedIso}
                        onSelect={selectDay}
                        calMonth={calMonth}
                        onMonthChange={setCalMonth}
                        startDate={startDate}
                        C={C}
                        size="sm"
                        markedDates={interventionDates}
                      />
                    )}

                    {selectedIso && (
                      futureSlotsForDay.length === 0 ? (
                        <Text style={[styles.sheetSub, { color: C.muted, marginBottom: 16 }]}>
                          Aucun créneau disponible ce jour-là.
                        </Text>
                      ) : (
                        <>
                          <Text style={[styles.fieldLabel, { color: C.gold }]}>Horaire</Text>
                          <View style={styles.optionGrid}>
                            {futureSlotsForDay.map((slot) => {
                              const selected = selectedSlot === slot;
                              return (
                                <TouchableOpacity
                                  key={slot}
                                  style={[
                                    styles.option,
                                    { backgroundColor: selected ? C.orange : C.bg, borderColor: selected ? C.orange : C.border },
                                  ]}
                                  onPress={() => setSelectedSlot(slot)}
                                  activeOpacity={0.75}
                                >
                                  <Text style={[styles.optionLabel, { color: selected ? "#fff" : C.text }]}>{slot}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </>
                      )
                    )}

                    {selectedSlot && fixedIntervenantProfileId && (
                      loadingTypes ? (
                        <ActivityIndicator color={C.orange} style={{ marginVertical: 16 }} />
                      ) : types.length === 0 ? (
                        <Text style={[styles.sheetSub, { color: C.muted }]}>
                          Tu n'as pas encore renseigné de type d'intervention (voir "Ma fiche intervenant").
                        </Text>
                      ) : (
                        <>
                          <Text style={[styles.fieldLabel, { color: C.gold }]}>Type d'intervention</Text>
                          <View style={styles.optionGrid}>
                            {types.map((t) => {
                              const selected = selectedTypeId === t.id;
                              return (
                                <TouchableOpacity
                                  key={t.id}
                                  style={[
                                    styles.option,
                                    { backgroundColor: selected ? C.orange : C.bg, borderColor: selected ? C.orange : C.border },
                                  ]}
                                  onPress={() => setSelectedTypeId(t.id)}
                                  activeOpacity={0.75}
                                >
                                  <Text style={[styles.optionLabel, { color: selected ? "#fff" : C.text }]}>{t.label}</Text>
                                  <Text style={[styles.optionSub, { color: selected ? "rgba(255,255,255,0.85)" : C.muted }]}>
                                    {t.duration_minutes} min
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </>
                      )
                    )}

                    {selectedSlot && !fixedIntervenantProfileId && (
                      loadingProfiles ? (
                        <ActivityIndicator color={C.orange} style={{ marginVertical: 16 }} />
                      ) : (
                        <>
                          <Text style={[styles.fieldLabel, { color: C.gold }]}>Intervenant</Text>
                          {profiles.length === 0 && (
                            <Text style={[styles.sheetSub, { color: C.muted }]}>
                              Aucun intervenant n'a encore créé de fiche pour cet espace.
                            </Text>
                          )}
                          <View style={styles.optionGrid}>
                            {profiles.map((p) => {
                              const selected = selectedProfileId === p.id;
                              return (
                                <TouchableOpacity
                                  key={p.id}
                                  style={[
                                    styles.option,
                                    { backgroundColor: selected ? C.orange : C.bg, borderColor: selected ? C.orange : C.border },
                                  ]}
                                  onPress={() => setSelectedProfileId(p.id)}
                                  activeOpacity={0.75}
                                >
                                  <Text style={[styles.optionLabel, { color: selected ? "#fff" : C.text }]}>{p.prenom} {p.nom}</Text>
                                </TouchableOpacity>
                              );
                            })}
                            <TouchableOpacity
                              style={[styles.option, { backgroundColor: C.bg, borderColor: C.accent, borderStyle: "dashed" }]}
                              onPress={() => setNewIntervenantOpen(true)}
                              activeOpacity={0.75}
                            >
                              <Text style={[styles.optionLabel, { color: C.accent }]}>+ Nouvel intervenant</Text>
                            </TouchableOpacity>
                          </View>

                          {selectedProfileId && (
                            loadingTypes ? (
                              <ActivityIndicator color={C.orange} style={{ marginVertical: 16 }} />
                            ) : types.length === 0 ? (
                              <Text style={[styles.sheetSub, { color: C.muted }]}>
                                Cet intervenant n'a pas encore renseigné de type d'intervention.
                              </Text>
                            ) : (
                              <>
                                <Text style={[styles.fieldLabel, { color: C.gold }]}>Type d'intervention</Text>
                                <View style={styles.optionGrid}>
                                  {types.map((t) => {
                                    const selected = selectedTypeId === t.id;
                                    return (
                                      <TouchableOpacity
                                        key={t.id}
                                        style={[
                                          styles.option,
                                          { backgroundColor: selected ? C.orange : C.bg, borderColor: selected ? C.orange : C.border },
                                        ]}
                                        onPress={() => setSelectedTypeId(t.id)}
                                        activeOpacity={0.75}
                                      >
                                        <Text style={[styles.optionLabel, { color: selected ? "#fff" : C.text }]}>{t.label}</Text>
                                        <Text style={[styles.optionSub, { color: selected ? "rgba(255,255,255,0.85)" : C.muted }]}>
                                          {t.duration_minutes} min
                                        </Text>
                                      </TouchableOpacity>
                                    );
                                  })}
                                </View>
                              </>
                            )
                          )}
                        </>
                      )
                    )}

                    {!!selectedType && (
                      <View style={[styles.priorityBox, { borderColor: C.orange, backgroundColor: "rgba(249,115,22,0.1)" }]}>
                        <Text style={[styles.priorityText, { color: C.text }]}>
                          ⚠️ Cette intervention est prioritaire sur les visites. Toute visite déjà prévue sur ce
                          créneau sera automatiquement déplacée au créneau valide le plus proche.
                        </Text>
                      </View>
                    )}

                    <View style={styles.sheetBtns}>
                      <TouchableOpacity style={[styles.btnSecondary, { borderColor: C.border }]} onPress={close} disabled={saving}>
                        <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Annuler</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.btnPrimary, { backgroundColor: C.orange }, (!selectedType || saving) && { opacity: 0.5 }]}
                        onPress={handleBook}
                        disabled={!selectedType || saving}
                      >
                        {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnPrimaryText}>Réserver</Text>}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </ScrollView>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>

    {!!toast && (
      <View style={[styles.toast, { backgroundColor: C.success }]} pointerEvents="none">
        <Text style={styles.toastText}>{toast}</Text>
      </View>
    )}

    <AdminNewIntervenantFlow
      visible={newIntervenantOpen}
      spaceId={space.id}
      theme={C}
      onClose={() => setNewIntervenantOpen(false)}
      onCreated={handleNewIntervenantCreated}
    />

    <ConfirmModal
      visible={dayBookedAlert}
      icon="📅"
      title="Un seul créneau par jour"
      message={"Le mode \"1 visite par jour\" est activé : une visite ou une intervention est déjà prévue ce jour-là. Choisis un autre jour."}
      singleButton
      destructive={false}
      confirmLabel="J'ai compris"
      onCancel={() => setDayBookedAlert(false)}
      onConfirm={() => setDayBookedAlert(false)}
      C={C}
    />

    <ConfirmModal
      visible={overlapAlert}
      icon="⚠️"
      title="Chevauchement"
      message="Cet intervenant a déjà une intervention prévue sur ce créneau."
      singleButton
      destructive={false}
      confirmLabel="J'ai compris"
      onCancel={() => setOverlapAlert(false)}
      onConfirm={() => setOverlapAlert(false)}
      C={C}
    />
    </>
  );
}

export default forwardRef(AdminAddIntervention);

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "flex-end" },
  overlayScroll: { flexGrow: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, padding: 24, paddingBottom: 32, marginBottom: 12 },
  sheetTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 6, textAlign: "center" },
  sheetSub: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center", marginBottom: 16 },

  fieldLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 },
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  option: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignItems: "center", minWidth: "30%" },
  optionLabel: { fontFamily: "DM_Sans_700Bold", fontSize: 14 },
  optionSub: { fontFamily: "DM_Sans_400Regular", fontSize: 11, marginTop: 2 },

  priorityBox: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 4 },
  priorityText: { fontFamily: "DM_Sans_400Regular", fontSize: 12.5, lineHeight: 18 },

  rebookInfo: { borderWidth: 1, borderRadius: 10, padding: 12, fontFamily: "DM_Sans_400Regular", fontSize: 12.5, lineHeight: 18, marginBottom: 12 },

  calendarBtn: { width: "100%", borderWidth: 1, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  calendarBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },

  sheetBtns: { flexDirection: "row", gap: 10, width: "100%", marginTop: 16 },
  btnPrimary: { flex: 1.3, borderRadius: 10, paddingVertical: 13, alignItems: "center", justifyContent: "center" },
  btnPrimaryText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
  btnSecondary: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  btnSecondaryText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },

  toast: { position: "absolute", bottom: 24, alignSelf: "center", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  toastText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, color: "#fff" },
});

```

### components/MesSoinsList.tsx

```tsx
import { useState, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import SoinAvatar from "@/components/SoinAvatar";
import SoinFormModal from "@/components/SoinFormModal";
import SoinPickerModal from "@/components/SoinPickerModal";
import SoinDurationModal from "@/components/SoinDurationModal";
import { supabase } from "@/lib/supabase";
import { getSyncedInterventionTypes, propagateSoinChange } from "@/lib/interventionTypesSync";
import type { InterventionType } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// "MES SOINS" — même présentation que IntervenantsList.tsx (bouton par
// ligne, icône ronde à la place de l'avatar) mais pour les soins que propose
// CET intervenant (intervention_types). Un appui long sur une ligne ouvre
// SoinFormModal pour modifier/supprimer ce soin ; un appui simple ne fait
// rien (choix explicite, pour éviter les ouvertures accidentelles). "+
// Ajouter un soin" enchaîne deux popups : choix du nom (SoinPickerModal) puis
// confirmation de la durée (SoinDurationModal), qui enregistre. Voir
// app/(visitor)/soins.tsx.
interface Props {
  intervenantProfileId: string;
  // Clé(s) du/des métier(s) de l'intervenant (voir lib/metiers.ts) —
  // détermine la liste de soins suggérés par métier dans les popups. Métiers
  // absents du catalogue (saisie libre "Autre") ignorés pour les suggestions.
  metiers: (string | null | undefined)[];
  C: Theme;
}

export default function MesSoinsList({ intervenantProfileId, metiers, C }: Props) {
  const [loading, setLoading] = useState(true);
  const [soins, setSoins] = useState<InterventionType[]>([]);
  const [editTarget, setEditTarget] = useState<InterventionType | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const [savingNewSoin, setSavingNewSoin] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const synced = await getSyncedInterventionTypes(intervenantProfileId);
    setSoins(synced);
    setLoading(false);
  }, [intervenantProfileId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handlePickedLabel(label: string) {
    setPendingLabel(label);
  }

  async function handleSaveNewSoin(minutes: number) {
    if (!pendingLabel) return;
    setSavingNewSoin(true);
    try {
      const payload = { label: pendingLabel, duration_minutes: minutes };
      const { error } = await supabase
        .from("intervention_types")
        .insert({ intervenant_profile_id: intervenantProfileId, ...payload });
      if (error) throw error;
      await propagateSoinChange(intervenantProfileId, { type: "create", ...payload });
      setPendingLabel(null);
      await load();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible d'enregistrer ce soin.");
    } finally {
      setSavingNewSoin(false);
    }
  }

  return (
    <>
      {loading ? (
        <ActivityIndicator color={C.accent} style={{ marginVertical: 32 }} />
      ) : (
        <View style={styles.scroll}>
          {soins.length === 0 ? (
            <Text style={[styles.emptyText, { color: C.muted }]}>Aucun soin enregistré pour l'instant.</Text>
          ) : (
            soins.map((s, i) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.row, i < soins.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
                onLongPress={() => setEditTarget(s)}
                activeOpacity={0.7}
              >
                <SoinAvatar label={s.label} size={44} C={C} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>{s.label}</Text>
                  <Text style={[styles.duration, { color: C.muted }]}>{s.duration_minutes} min</Text>
                </View>
              </TouchableOpacity>
            ))
          )}

          <TouchableOpacity style={styles.addBtn} onPress={() => setPickerOpen(true)}>
            <Text style={[styles.addBtnText, { color: C.accent }]}>+ Ajouter un soin</Text>
          </TouchableOpacity>
        </View>
      )}

      <SoinPickerModal
        visible={pickerOpen}
        metiers={metiers}
        value=""
        C={C}
        onClose={() => setPickerOpen(false)}
        onPick={handlePickedLabel}
      />

      <SoinDurationModal
        visible={pendingLabel !== null}
        label={pendingLabel ?? ""}
        saving={savingNewSoin}
        C={C}
        onClose={() => setPendingLabel(null)}
        onSave={handleSaveNewSoin}
      />

      {editTarget && (
        <SoinFormModal
          visible
          intervenantProfileId={intervenantProfileId}
          soin={editTarget}
          metiers={metiers}
          C={C}
          onClose={() => setEditTarget(null)}
          onSaved={async () => { setEditTarget(null); await load(); }}
          onDeleted={async () => { setEditTarget(null); await load(); }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 4 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  name: { fontFamily: "DM_Sans_600SemiBold", fontSize: 15 },
  duration: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },
  addBtn: { alignSelf: "flex-start", marginTop: 8 },
  addBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});

```

### components/SoinsPeriodBlock.tsx

```tsx
import { useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, PanResponder } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Theme } from "@/lib/themes";
import type { Reservation } from "@/lib/types";
import { toISO, addDays, getWeekDates, getDaysInMonth } from "@/lib/slotUtils";
import { soinIconName } from "@/lib/soinIcons";

// Bloc "Soins" du planning des intervenants — remplace l'ancien calendrier
// (MiniCalendar+DaySlotGrid en mensuel, WeeklyPlanningGrid en hebdo) par un
// regroupement des soins (réservations type='Intervention', planifiés ET
// passés) sur la semaine ou le mois affiché. Navigable par flèches ‹ › ou en
// balayant le bloc horizontalement — ligne de temps : balayer vers la
// gauche avance vers le futur (à droite de l'écran), vers la droite recule
// vers le passé, comme un pager. Un tap sur un soin ouvre le détail de sa
// journée (voir DaySoinsModal, orchestré depuis (admin)/intervenants.tsx).

const MONTH_LABELS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

interface Props {
  C: Theme;
  reservations: Reservation[];
  view: "mensuel" | "hebdo";
  weekAnchor: Date;
  onWeekChange: (d: Date) => void;
  monthAnchor: { year: number; month: number };
  onMonthChange: (m: { year: number; month: number }) => void;
  onDayPress: (iso: string) => void;
  // Nom du patient / lieu du soin par space_id (voir lib/address.ts,
  // careLocationDetail) — fournis uniquement en vue cross-space
  // (mes-espaces-patients.tsx), où chaque ligne peut appartenir à un
  // patient/espace différent. Quand présent, la ligne affiche patient +
  // type (durée) + lieu + intervenant au lieu du type + intervenant
  // habituel (vue admin single-space, sans ces props).
  patientNameBySpaceId?: Record<string, string>;
  locationBySpaceId?: Record<string, string>;
  // Tap sur un soin précis plutôt que sur le jour entier — utilisé par
  // mes-espaces-patients.tsx pour ouvrir l'édition de ce soin (jour,
  // horaire, type). Remplace onDayPress quand fourni ; l'admin (un seul
  // espace, popup jour) continue d'utiliser onDayPress seul.
  onSoinPress?: (r: Reservation) => void;
  // Type de réservation regroupé — "Intervention" par défaut (soins.tsx,
  // vue intervenant). Passer "Visite" pour le planning des visites
  // (home/calendar.tsx, mode Visites).
  reservationType?: "Intervention" | "Visite";
  // Accompagnants d'une réservation, indexés par son id (voir
  // home/calendar.tsx, companionsByMainId) — affichés sous le nom du
  // réservant principal. Absent : rien n'est affiché (usages hors visites).
  companionsById?: Record<string, Reservation[]>;
}

export default function SoinsPeriodBlock({
  C, reservations, view, weekAnchor, onWeekChange, monthAnchor, onMonthChange, onDayPress,
  patientNameBySpaceId, locationBySpaceId, onSoinPress, reservationType = "Intervention", companionsById,
}: Props) {
  const dates = view === "hebdo" ? getWeekDates(weekAnchor) : getDaysInMonth(monthAnchor.year, monthAnchor.month);
  const isoSet = new Set(dates.map(toISO));

  const byDay: Record<string, Reservation[]> = {};
  for (const r of reservations) {
    if (r.type !== reservationType || !isoSet.has(r.date)) continue;
    (byDay[r.date] ??= []).push(r);
  }
  for (const list of Object.values(byDay)) list.sort((a, b) => a.creneau.localeCompare(b.creneau));
  const dayIsos = Object.keys(byDay).sort();

  function goPrev() {
    if (view === "hebdo") {
      onWeekChange(addDays(weekAnchor, -7));
    } else {
      const m = monthAnchor.month === 0 ? 11 : monthAnchor.month - 1;
      const y = monthAnchor.month === 0 ? monthAnchor.year - 1 : monthAnchor.year;
      onMonthChange({ year: y, month: m });
    }
  }
  function goNext() {
    if (view === "hebdo") {
      onWeekChange(addDays(weekAnchor, 7));
    } else {
      const m = monthAnchor.month === 11 ? 0 : monthAnchor.month + 1;
      const y = monthAnchor.month === 11 ? monthAnchor.year + 1 : monthAnchor.year;
      onMonthChange({ year: y, month: m });
    }
  }

  // Seuil de 40px avant de considérer le geste comme un balayage horizontal
  // plutôt qu'un scroll vertical de la page — évite de changer de période
  // par erreur en scrollant simplement la ScrollView parente.
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 16 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        if (g.dx <= -40) goNext();
        else if (g.dx >= 40) goPrev();
      },
    }),
  ).current;

  const first = dates[0];
  const last = dates[dates.length - 1];
  const periodLabel =
    view === "hebdo"
      ? first.getMonth() === last.getMonth()
        ? `Semaine du ${first.getDate()} au ${last.getDate()} ${MONTH_LABELS[last.getMonth()]}`
        : `Semaine du ${first.getDate()} ${MONTH_LABELS[first.getMonth()]} au ${last.getDate()} ${MONTH_LABELS[last.getMonth()]}`
      : `${MONTH_LABELS[monthAnchor.month].charAt(0).toUpperCase()}${MONTH_LABELS[monthAnchor.month].slice(1)} ${monthAnchor.year}`;

  const todayIso = toISO(new Date());

  return (
    <View>
      <View style={[styles.nav, { backgroundColor: C.card, borderColor: C.border }]}>
        <TouchableOpacity onPress={goPrev} style={[styles.navBtn, { borderColor: C.border }]}>
          <Text style={[styles.navBtnText, { color: C.text }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.navLabel, { color: C.text }]}>{periodLabel}</Text>
        <TouchableOpacity onPress={goNext} style={[styles.navBtn, { borderColor: C.border }]}>
          <Text style={[styles.navBtnText, { color: C.text }]}>›</Text>
        </TouchableOpacity>
      </View>

      <View {...panResponder.panHandlers}>
        {dayIsos.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.emptyText, { color: C.muted }]}>
              {view === "hebdo" ? "Aucun soin prévu cette semaine." : "Aucun soin prévu ce mois-ci."}
            </Text>
          </View>
        ) : (
          dayIsos.map((iso) => {
            const dayDate = new Date(iso + "T00:00:00");
            const isToday = iso === todayIso;
            return (
              <View key={iso} style={[styles.dayGroup, { backgroundColor: C.card, borderColor: C.border }]}>
                <Text style={[styles.dayGroupTitle, { color: isToday ? C.gold : C.text }]}>
                  {dayDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
                  {isToday ? " · Aujourd'hui" : ""}
                </Text>
                {byDay[iso].map((r) => {
                  const patientName = patientNameBySpaceId?.[r.space_id];
                  const location = locationBySpaceId?.[r.space_id];
                  const companions = companionsById?.[r.id];
                  return (
                    <TouchableOpacity
                      key={r.id}
                      style={styles.soinRow}
                      activeOpacity={0.7}
                      onPress={() => (onSoinPress ? onSoinPress(r) : onDayPress(iso))}
                    >
                      <Text style={[styles.soinTime, { color: C.orange }]}>{r.creneau}</Text>
                      <Ionicons name={soinIconName(r.intervention_label ?? "")} size={16} color={C.gold} />
                      <View style={{ flex: 1 }}>
                        {patientName ? (
                          <>
                            <Text style={[styles.soinLabel, { color: C.text }]} numberOfLines={1}>{patientName}</Text>
                            <Text style={[styles.soinBy, { color: C.muted }]} numberOfLines={1}>
                              {r.intervention_label ?? reservationType}{r.duration_minutes ? ` (${r.duration_minutes} min)` : ""}
                            </Text>
                            {!!location && (
                              <Text style={[styles.soinBy, { color: C.muted }]} numberOfLines={1}>📍 {location}</Text>
                            )}
                            <Text style={[styles.soinBy, { color: C.muted }]} numberOfLines={1}>{r.prenom} {r.nom}</Text>
                          </>
                        ) : (
                          <>
                            <Text style={[styles.soinLabel, { color: C.text }]} numberOfLines={1}>{r.intervention_label ?? reservationType}</Text>
                            <Text style={[styles.soinBy, { color: C.muted }]} numberOfLines={1}>{r.prenom} {r.nom}</Text>
                          </>
                        )}
                        {!!companions?.length && (
                          <Text style={[styles.soinBy, { color: C.muted }]} numberOfLines={1}>
                            + {companions.map((c) => `${c.prenom} ${c.nom}`).join(", ")}
                          </Text>
                        )}
                      </View>
                      <Text style={[styles.chevron, { color: C.muted }]}>›</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  navBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 },
  navBtnText: { fontSize: 18, fontWeight: "600" },
  navLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, textTransform: "capitalize", flex: 1, textAlign: "center" },

  emptyCard: { borderWidth: 1, borderRadius: 12, padding: 16, alignItems: "center" },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },

  dayGroup: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  dayGroupTitle: { fontFamily: "DM_Sans_700Bold", fontSize: 13, textTransform: "capitalize", marginBottom: 8 },
  soinRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  soinTime: { fontFamily: "DM_Sans_700Bold", fontSize: 13, minWidth: 42 },
  soinLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  soinBy: { fontFamily: "DM_Sans_400Regular", fontSize: 11.5, marginTop: 1 },
  chevron: { fontFamily: "DM_Sans_700Bold", fontSize: 16 },
});

```

### components/SoinsPlanifiesBlock.tsx

```tsx
import { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { isSlotFullyPast } from "@/lib/slotUtils";
import type { Theme } from "@/lib/themes";
import type { Reservation } from "@/lib/types";

// Bloc "Soins planifiés" — triés anté-chronologiquement par défaut (le plus
// récent/tardif en haut, le plus ancien tout en bas), sauf pour les soins à
// venir de (admin)/intervenants.tsx qui utilise chronological (le prochain
// soin en haut, voir plus bas). Extrait ici en composant autonome pour être
// réutilisé dans (admin)/intervenants.tsx et (visitor)/soins.tsx sans
// dupliquer la requête.
interface Props {
  // Optionnel quand filterIntervenantProfileIds est fourni (vue cross-space,
  // voir plus bas) — sinon requis (comportement historique, un seul espace).
  spaceId?: string;
  C: Theme;
  // Restreint la liste aux soins d'un seul intervenant — utilisé par
  // app/(visitor)/soins.tsx (bascule "Mes interventions"/"Tous"). Absent ou
  // null : tous les intervenants (comportement admin inchangé).
  filterIntervenantProfileId?: string | null;
  // Restreint aux soins de PLUSIEURS profils intervenant (un par espace,
  // même téléphone) au lieu d'un seul spaceId — utilisé par
  // app/(visitor)/home/mes-espaces-patients.tsx pour lister les
  // interventions d'un intervenant à travers tous ses espaces patients.
  // Remplace le filtre spaceId/filterIntervenantProfileId ci-dessus quand
  // fourni (spaceId devient alors inutile, voir la requête plus bas).
  filterIntervenantProfileIds?: string[];
  // Lieu du soin par space_id (voir lib/address.ts, careLocationDetail) —
  // affiché sous la date de chaque ligne quand fourni. Pertinent seulement en
  // vue cross-space (mes-espaces-patients.tsx) : dans un espace unique déjà
  // connu, répéter son lieu sur chaque ligne serait redondant.
  locationBySpaceId?: Record<string, string>;
  // Nom du patient par space_id — en vue cross-space, r.prenom/r.nom
  // désignent l'intervenant lui-même (identique sur toutes les lignes), pas
  // le patient : ce prop remplace alors ce libellé par le nom du patient
  // concerné, seule info vraiment distinctive d'une ligne à l'autre.
  patientNameBySpaceId?: Record<string, string>;
  // Remplace la navigation par défaut vers (admin)/home/slots (réservée à
  // l'admin) — voir app/(visitor)/soins.tsx. Le 2e argument (réservation
  // complète) sert à mes-espaces-patients.tsx pour distinguer plusieurs
  // soins d'espaces différents tombant sur la même date (ambigu avec la
  // seule date, contrairement au cas single-space historique).
  onPressRow?: (date: string, r: Reservation) => void;
  // Historique complet (passés ET à venir) plutôt que les seuls soins à
  // venir — utilisé par (admin)/intervenants.tsx (Paramètres > Planning des
  // intervenants), même comportement que Paramètres > Historique. Ajoute une
  // sous-section repliable "Autres soins réalisés" pour les soins passés,
  // sous la liste (sans sous-titre, on est déjà dans "Soins planifiés") des
  // soins qui restent à faire. Par défaut false : app/(visitor)/soins.tsx
  // (onglet "Mes soins" de l'intervenant) garde son comportement d'origine,
  // une seule liste tournée vers ce qui reste à faire.
  includePast?: boolean;
  // Affiche les soins à venir dans l'ordre chronologique (le plus proche en
  // premier) au lieu de l'ordre anté-chronologique par défaut ci-dessus —
  // utilisé par (admin)/intervenants.tsx (Planning des intervenants), où
  // l'admin veut voir en premier le prochain soin à venir. Les soins passés
  // (includePast) gardent l'ordre anté-chronologique (le plus récent en
  // haut) quel que soit ce réglage.
  chronological?: boolean;
  // Titre de la rubrique — défaut "Soins planifiés" (historique). Utilisé
  // par mes-espaces-patients.tsx ("Autres soins planifiés"), pour ne pas
  // faire doublon avec le planning déjà affiché au-dessus.
  title?: string;
  // Masque les soins à venir dont la date est <= cette date ISO — utilisé
  // par mes-espaces-patients.tsx pour exclure la période déjà visible dans
  // SoinsPeriodBlock au-dessus (dernier jour de la semaine/du mois affiché).
  // Ne s'applique pas aux soins passés (includePast).
  excludeUpToDate?: string;
  // Fournit directement la liste des réservations plutôt que de laisser le
  // composant faire sa propre requête Supabase — utilisé par
  // home/calendar.tsx (mode Visites), où les réservations de l'espace
  // (unique côté visiteur) sont déjà chargées par VisitorContext. Quand
  // fourni, spaceId/filterIntervenantProfileId(s)/type="Intervention" sont
  // ignorés : le tri/filtre par date reste identique, appliqué sur cette
  // liste telle quelle.
  reservations?: Reservation[];
  // Libellé utilisé pour le texte "Aucun ... planifié" / "Autres ...
  // réalisés" ci-dessous — "soin" par défaut (comportement historique).
  reservationLabel?: "soin" | "visite";
}

function SoinRow({ r, isLast, C, onPress, patientName, location }: { r: Reservation; isLast: boolean; C: Theme; onPress: () => void; patientName?: string; location?: string }) {
  return (
    <TouchableOpacity
      style={[styles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: C.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: C.text }]}>
          {patientName ?? `${r.prenom} ${r.nom}`}{r.intervention_label ? ` — ${r.intervention_label}` : ""}
        </Text>
        <Text style={[styles.rowDate, { color: C.muted }]}>
          {new Date(r.date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} · {r.creneau}
        </Text>
        {!!location && (
          <Text style={[styles.rowLocation, { color: C.muted }]} numberOfLines={1}>📍 {location}</Text>
        )}
      </View>
      <Text style={[styles.rowChevron, { color: C.muted }]}>›</Text>
    </TouchableOpacity>
  );
}

export default function SoinsPlanifiesBlock({ spaceId, C, filterIntervenantProfileId, filterIntervenantProfileIds, locationBySpaceId, patientNameBySpaceId, onPressRow, includePast = false, chronological = false, title = "Soins planifiés", excludeUpToDate, reservations, reservationLabel = "soin" }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(!reservations);
  const [soins, setSoins] = useState<Reservation[]>(reservations ?? []);
  const [pastOpen, setPastOpen] = useState(false);

  const load = useCallback(async () => {
    if (reservations) {
      setSoins(reservations);
      setLoading(false);
      return;
    }
    setLoading(true);
    let query = supabase
      .from("reservations")
      .select("*")
      .eq("type", "Intervention");
    if (spaceId) query = query.eq("space_id", spaceId);
    if (filterIntervenantProfileIds && filterIntervenantProfileIds.length > 0) {
      query = query.in("intervenant_profile_id", filterIntervenantProfileIds);
    } else if (filterIntervenantProfileId) {
      query = query.eq("intervenant_profile_id", filterIntervenantProfileId);
    }
    const { data } = await query
      .order("date", { ascending: false })
      .order("creneau", { ascending: false });
    setSoins(data || []);
    setLoading(false);
  }, [spaceId, filterIntervenantProfileId, filterIntervenantProfileIds, reservations]);

  useEffect(() => { load(); }, [load]);

  function goTo(r: Reservation) {
    return onPressRow ? () => onPressRow(r.date, r) : () => router.push({ pathname: "/(admin)/home/slots", params: { focusDate: r.date } } as any);
  }

  const upcomingDesc = soins.filter((r) => !isSlotFullyPast(r.date, r.creneau) && (!excludeUpToDate || r.date > excludeUpToDate));
  // soins est trié date/créneau descendant (voir la requête ci-dessus) :
  // reverse() suffit à obtenir l'ordre chronologique ascendant demandé,
  // sans requête ni tri supplémentaire.
  const upcoming = chronological ? [...upcomingDesc].reverse() : upcomingDesc;
  const past = includePast ? soins.filter((r) => isSlotFullyPast(r.date, r.creneau)) : [];

  return (
    <>
      <Text style={[styles.sectionTitle, { color: C.gold }]}>
        {title}{upcoming.length > 0 ? ` (${upcoming.length})` : ""}
      </Text>
      <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
        {loading ? (
          <ActivityIndicator color={C.accent} style={{ marginVertical: 8 }} />
        ) : upcoming.length === 0 ? (
          <Text style={[styles.emptyText, { color: C.muted }]}>
            {reservationLabel === "visite" ? "Aucune visite planifiée." : "Aucun soin planifié."}
          </Text>
        ) : (
          upcoming.map((r, i) => (
            <SoinRow
              key={r.id}
              r={r}
              isLast={i === upcoming.length - 1}
              C={C}
              onPress={goTo(r)}
              patientName={patientNameBySpaceId?.[r.space_id]}
              location={locationBySpaceId?.[r.space_id]}
            />
          ))
        )}
      </View>

      {includePast && !loading && (
        <View style={{ marginBottom: 10 }}>
          <TouchableOpacity onPress={() => setPastOpen((o) => !o)} activeOpacity={0.7} style={styles.pastToggle}>
            <Text style={[styles.pastToggleText, { color: C.muted }]}>
              {reservationLabel === "visite" ? "Autres visites réalisées" : "Autres soins réalisés"}{past.length > 0 ? ` (${past.length})` : ""}
            </Text>
            <Text style={[styles.toggleIcon, { color: C.muted }]}>{pastOpen ? "▾" : "▸"}</Text>
          </TouchableOpacity>

          {pastOpen && (
            <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border, marginTop: 8 }]}>
              {past.length === 0 ? (
                <Text style={[styles.emptyText, { color: C.muted }]}>
                  {reservationLabel === "visite" ? "Aucune visite réalisée." : "Aucun soin réalisé."}
                </Text>
              ) : (
                past.map((r, i) => (
                  <SoinRow
                    key={r.id}
                    r={r}
                    isLast={i === past.length - 1}
                    C={C}
                    onPress={goTo(r)}
                    patientName={patientNameBySpaceId?.[r.space_id]}
                    location={locationBySpaceId?.[r.space_id]}
                  />
                ))
              )}
            </View>
          )}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10, marginTop: 24 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  rowLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14, marginBottom: 2 },
  rowDate: { fontFamily: "DM_Sans_400Regular", fontSize: 12 },
  rowLocation: { fontFamily: "DM_Sans_400Regular", fontSize: 11.5, marginTop: 2 },
  rowChevron: { fontSize: 18, marginLeft: 8 },
  pastToggle: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  pastToggleText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, letterSpacing: 0.4, flex: 1 },
  toggleIcon: { fontSize: 14 },
});

```

### components/SoinPickerModal.tsx

```tsx
import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  FAMILLES, METIERS, metiersByFamille, metierByKey,
  soinsForMetier, soinsForMetiers,
} from "@/lib/metiers";
import type { MetierSoin } from "@/lib/metiers";
import type { Theme } from "@/lib/themes";
import { LOGO_GREEN } from "@/lib/themes";

// Popup "Type d'intervention" — bouton vert (couleur du bonhomme turquoise du
// logo, voir IntervenantFicheModal.tsx, bloc Métier / spécialisation, mode
// création). Contrairement à SoinLabelPicker.tsx (champ par ligne qui bascule
// en saisie libre inline dans le formulaire), tout se passe ici dans la
// popup : liste du métier, "Autres soins" (familles -> métiers -> soins), ou
// "Autre" -> saisie libre avec suggestions, toujours validée par un bouton
// avant de fermer. Le formulaire appelant n'affiche donc jamais de TextInput
// brut sous le champ.
interface Props {
  visible: boolean;
  // Un ou plusieurs métiers (principal + éventuelle 2ᵉ spécialisation) —
  // une section "Soins de {métier}" par métier valide du catalogue, voir
  // soinsForMetiers() dans lib/metiers.ts.
  metiers: (string | null | undefined)[];
  value: string;
  C: Theme;
  onClose: () => void;
  onPick: (label: string) => void;
}

function allCatalogSoins(): MetierSoin[] {
  const seen = new Set<string>();
  const result: MetierSoin[] = [];
  for (const m of METIERS) {
    for (const s of m.soins) {
      const lower = s.label.toLowerCase();
      if (seen.has(lower)) continue;
      seen.add(lower);
      result.push(s);
    }
  }
  return result;
}
const ALL_SOINS = allCatalogSoins();

type Screen = "main" | "browse-familles" | "browse-metier" | "custom";

export default function SoinPickerModal({ visible, metiers, value, C, onClose, onPick }: Props) {
  const [screen, setScreen] = useState<Screen>("main");
  const [browseMetier, setBrowseMetier] = useState<string | null>(null);
  const [browseFamilleOpen, setBrowseFamilleOpen] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");

  useEffect(() => {
    if (!visible) return;
    const known = ALL_SOINS.some((s) => s.label.toLowerCase() === value.toLowerCase());
    setScreen("main");
    setBrowseMetier(null);
    setBrowseFamilleOpen(null);
    setCustomText(value && !known ? value : "");
  }, [visible, value]);

  const ownSoinsByMetier = soinsForMetiers(metiers);

  function pick(label: string) {
    onPick(label);
    onClose();
  }

  function openBrowse() {
    setBrowseMetier(null);
    setBrowseFamilleOpen(null);
    setScreen("browse-familles");
  }

  const query = customText.trim().toLowerCase();
  const suggestions = query.length >= 2
    ? ALL_SOINS.filter((s) => s.label.toLowerCase().includes(query)).slice(0, 8)
    : [];

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[styles.card, { backgroundColor: C.card, borderColor: LOGO_GREEN }]}>
          {screen === "main" && (
            <>
              <Text style={[styles.title, { color: C.text }]}>Type d'intervention</Text>
              <ScrollView style={{ maxHeight: 400 }}>
                {ownSoinsByMetier.map(({ metier, soins }) => (
                  <View key={metier.key} style={{ marginBottom: 4 }}>
                    <Text style={[styles.sectionHeader, { color: C.muted }]}>Soins de {metier.label}</Text>
                    {soins.map((s) => (
                      <SoinRow key={s.label} soin={s} selected={value === s.label} C={C} onPress={() => pick(s.label)} />
                    ))}
                  </View>
                ))}
                <AutreRow C={C} onPress={() => setScreen("custom")} />
              </ScrollView>
              <TouchableOpacity onPress={openBrowse} style={[styles.otherSoinsBtn, { borderTopColor: C.border }]}>
                <Text style={[styles.otherSoinsBtnText, { color: LOGO_GREEN }]}>Autres soins</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={[styles.closeBtnText, { color: C.muted }]}>Fermer</Text>
              </TouchableOpacity>
            </>
          )}

          {screen === "browse-familles" && (
            <>
              <Text style={[styles.title, { color: C.text }]}>Autres soins</Text>
              <ScrollView style={{ maxHeight: 400 }}>
                {FAMILLES.map((famille) => {
                  const open = browseFamilleOpen === famille.key;
                  return (
                    <View key={famille.key} style={{ marginBottom: 8 }}>
                      <TouchableOpacity
                        onPress={() => setBrowseFamilleOpen(open ? null : famille.key)}
                        activeOpacity={0.8}
                        style={[styles.familleAccordionRow, { borderColor: C.border }]}
                      >
                        <View style={styles.familleHeader}>
                          <Ionicons name={famille.icon} size={16} color={C.muted} />
                          <Text style={[styles.familleAccordionText, { color: C.text }]}>{famille.label}</Text>
                        </View>
                        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={C.muted} />
                      </TouchableOpacity>
                      {open && (
                        <View style={{ marginTop: 6 }}>
                          {metiersByFamille(famille.key).map((m) => (
                            <TouchableOpacity
                              key={m.key}
                              onPress={() => { setBrowseMetier(m.key); setScreen("browse-metier"); }}
                              activeOpacity={0.8}
                              style={styles.row}
                            >
                              <Ionicons name={m.icon} size={17} color={C.muted} />
                              <Text style={[styles.rowText, { color: C.text }]}>{m.label}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
                <AutreRow C={C} onPress={() => setScreen("custom")} />
              </ScrollView>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={[styles.closeBtnText, { color: C.muted }]}>Fermer</Text>
              </TouchableOpacity>
            </>
          )}

          {screen === "browse-metier" && (
            <>
              <TouchableOpacity onPress={() => setScreen("browse-familles")} style={{ marginBottom: 8 }}>
                <Text style={[styles.linkText, { color: LOGO_GREEN }]}>‹ Retour aux métiers</Text>
              </TouchableOpacity>
              <Text style={[styles.title, { color: C.text }]}>Soins de {metierByKey(browseMetier)?.label}</Text>
              <ScrollView style={{ maxHeight: 360 }}>
                {soinsForMetier(browseMetier).map((s) => (
                  <SoinRow key={s.label} soin={s} selected={value === s.label} C={C} onPress={() => pick(s.label)} />
                ))}
                <AutreRow C={C} onPress={() => setScreen("custom")} />
              </ScrollView>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={[styles.closeBtnText, { color: C.muted }]}>Fermer</Text>
              </TouchableOpacity>
            </>
          )}

          {screen === "custom" && (
            <>
              <TouchableOpacity onPress={() => setScreen("main")} style={{ marginBottom: 8 }}>
                <Text style={[styles.linkText, { color: LOGO_GREEN }]}>‹ Retour à la liste</Text>
              </TouchableOpacity>
              <Text style={[styles.title, { color: C.text }]}>Autre type d'intervention</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                placeholder="ex. Massage du dos"
                placeholderTextColor={C.muted}
                value={customText}
                onChangeText={setCustomText}
                autoFocus
              />
              {suggestions.length > 0 && (
                <View style={[styles.suggestBox, { backgroundColor: C.bg, borderColor: C.border }]}>
                  {suggestions.map((s) => (
                    <TouchableOpacity key={s.label} onPress={() => setCustomText(s.label)} activeOpacity={0.7} style={styles.suggestRow}>
                      <Ionicons name={s.icon} size={15} color={C.muted} />
                      <Text style={[styles.suggestText, { color: C.text }]} numberOfLines={1}>{s.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <TouchableOpacity
                onPress={() => customText.trim() && pick(customText.trim())}
                disabled={!customText.trim()}
                style={[styles.validateBtn, { backgroundColor: LOGO_GREEN }, !customText.trim() && { opacity: 0.5 }]}
              >
                <Text style={styles.validateBtnText}>Valider</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={[styles.closeBtnText, { color: C.muted }]}>Fermer</Text>
              </TouchableOpacity>
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function SoinRow({ soin, selected, C, onPress }: { soin: MetierSoin; selected: boolean; C: Theme; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.row, { borderColor: selected ? LOGO_GREEN : "transparent", backgroundColor: selected ? `${LOGO_GREEN}22` : "transparent" }]}
    >
      <Ionicons name={soin.icon} size={17} color={selected ? LOGO_GREEN : C.muted} />
      <Text style={[styles.rowText, { color: selected ? LOGO_GREEN : C.text }]}>{soin.label}</Text>
    </TouchableOpacity>
  );
}

function AutreRow({ C, onPress }: { C: Theme; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.row, { borderColor: "transparent" }]}>
      <Ionicons name="create-outline" size={17} color={C.muted} />
      <Text style={[styles.rowText, { color: C.text }]}>Autre</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", maxWidth: 400, maxHeight: "80%", borderRadius: 20, borderWidth: 1, padding: 24 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 12, textAlign: "center" },
  sectionHeader: { fontFamily: "DM_Sans_700Bold", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 6, paddingHorizontal: 2 },
  familleHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  familleAccordionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderRadius: 10, padding: 12 },
  familleAccordionText: { fontFamily: "DM_Sans_700Bold", fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  rowText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  otherSoinsBtn: { alignItems: "center", paddingTop: 12, marginTop: 8, borderTopWidth: 1 },
  otherSoinsBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  closeBtn: { alignItems: "center", marginTop: 8 },
  closeBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  linkText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontFamily: "DM_Sans_400Regular", fontSize: 14, marginBottom: 4 },
  suggestBox: { borderWidth: 1, borderRadius: 10, marginTop: 6, paddingVertical: 4 },
  suggestRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 12 },
  suggestText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, flex: 1 },
  validateBtn: { borderRadius: 12, paddingVertical: 13, alignItems: "center", marginTop: 12 },
  validateBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
});

```

### components/SoinFormModal.tsx

```tsx
import { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Modal, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from "react-native";
import { supabase } from "@/lib/supabase";
import ConfirmModal from "@/components/ConfirmModal";
import SoinLabelPicker from "@/components/SoinLabelPicker";
import { propagateSoinChange } from "@/lib/interventionTypesSync";
import type { InterventionType } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Popup modification/suppression d'UN SEUL soin (intervention_type) existant
// — déclenché par un appui long sur une ligne de MesSoinsList.tsx ("MES
// SOINS" côté intervenant). La création d'un nouveau soin se fait par un
// flux séparé (SoinPickerModal puis SoinDurationModal, voir MesSoinsList.tsx
// "+ Ajouter un soin") : ce popup ne gère donc plus que l'édition.
interface Props {
  visible: boolean;
  intervenantProfileId: string;
  soin: InterventionType;
  // Clé(s) du/des métier(s) de l'intervenant (voir lib/metiers.ts) —
  // détermine la liste de soins suggérés si l'intervenant change le nom.
  metiers: (string | null | undefined)[];
  C: Theme;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export default function SoinFormModal({
  visible, intervenantProfileId, soin, metiers, C, onClose, onSaved, onDeleted,
}: Props) {
  const [label, setLabel] = useState("");
  const [duration, setDuration] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLabel(soin.label);
    setDuration(String(soin.duration_minutes));
    setConfirmDelete(false);
  }, [visible, soin]);

  const parsedDuration = parseInt(duration, 10);
  const canSave = label.trim().length > 0 && Number.isFinite(parsedDuration) && parsedDuration > 0 && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = { label: label.trim(), duration_minutes: parsedDuration };
      const { error } = await supabase.from("intervention_types").update(payload).eq("id", soin.id);
      if (error) throw error;
      await propagateSoinChange(intervenantProfileId, { type: "update", oldLabel: soin.label, ...payload });
      onSaved();
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible d'enregistrer ce soin.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    const { error } = await supabase.from("intervention_types").delete().eq("id", soin.id);
    setDeleting(false);
    if (error) {
      Alert.alert("Erreur", "Impossible de supprimer ce soin.");
      return;
    }
    await propagateSoinChange(intervenantProfileId, { type: "delete", label: soin.label });
    setConfirmDelete(false);
    onDeleted();
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
            <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
              <Text style={[styles.title, { color: C.text }]}>🩺 Modifier ce soin</Text>

              <Text style={[styles.fieldLabel, { color: C.gold }]}>Nom du soin</Text>
              <SoinLabelPicker
                key={`${soin.id}-${visible}`}
                metier={metiers[0] ?? null}
                value={label}
                onChange={setLabel}
                C={C}
              />

              <Text style={[styles.fieldLabel, { color: C.gold, marginTop: 14 }]}>Durée habituelle (minutes)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                placeholder="ex. 30"
                placeholderTextColor={C.muted}
                value={duration}
                onChangeText={(v) => setDuration(v.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
              />

              <View style={styles.buttons}>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: C.accent }, !canSave && { opacity: 0.5 }]}
                  onPress={handleSave}
                  disabled={!canSave}
                  activeOpacity={0.85}
                >
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>Modifier</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: C.danger }, saving && { opacity: 0.5 }]}
                  onPress={() => setConfirmDelete(true)}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  <Text style={styles.btnText}>Supprimer</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={onClose} style={styles.cancelBtn} disabled={saving}>
                <Text style={[styles.cancelBtnText, { color: C.muted }]}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmModal
        visible={confirmDelete}
        icon="🗑️"
        title="Supprimer ce soin ?"
        message={`"${soin.label}" ne sera plus proposable pour de nouvelles réservations.`}
        confirmLabel="Supprimer"
        saving={deleting}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        C={C}
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
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
  },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 20,
    marginBottom: 18,
    textAlign: "center",
  },
  fieldLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontFamily: "DM_Sans_400Regular",
    fontSize: 14,
  },
  buttons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
  },
  btn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  btnText: {
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

```

### components/SoinDurationModal.tsx

```tsx
import { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import type { Theme } from "@/lib/themes";

// Popup "confirmer la durée" — 2ᵉ étape du flux d'ajout d'un soin (1ère
// étape : choix du nom via SoinPickerModal.tsx). Le nom est affiché en
// lecture seule ici : il vient d'être choisi juste avant, on ne le modifie
// pas à cette étape (contrairement à SoinFormModal.tsx qui, lui, permet de
// changer le nom d'un soin déjà existant).
interface Props {
  visible: boolean;
  label: string;
  initialMinutes?: number | null;
  saving?: boolean;
  C: Theme;
  onClose: () => void;
  onSave: (minutes: number) => void;
}

export default function SoinDurationModal({ visible, label, initialMinutes, saving = false, C, onClose, onSave }: Props) {
  const [duration, setDuration] = useState("");

  useEffect(() => {
    if (!visible) return;
    setDuration(initialMinutes ? String(initialMinutes) : "");
  }, [visible, initialMinutes]);

  const parsedDuration = parseInt(duration, 10);
  const canSave = Number.isFinite(parsedDuration) && parsedDuration > 0 && !saving;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.title, { color: C.text }]}>🩺 {label}</Text>
            <Text style={[styles.fieldLabel, { color: C.gold }]}>Durée habituelle (minutes)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
              placeholder="ex. 30"
              placeholderTextColor={C.muted}
              value={duration}
              onChangeText={(v) => setDuration(v.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
              autoFocus
            />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: C.accent }, !canSave && { opacity: 0.5 }]}
              onPress={() => canSave && onSave(parsedDuration)}
              disabled={!canSave}
              activeOpacity={0.85}
            >
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Enregistrer</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn} disabled={saving}>
              <Text style={[styles.cancelBtnText, { color: C.muted }]}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", maxWidth: 400, borderRadius: 20, borderWidth: 1, padding: 24 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 18, textAlign: "center" },
  fieldLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontFamily: "DM_Sans_400Regular", fontSize: 14 },
  saveBtn: { borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 20 },
  saveBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 15, color: "#fff" },
  cancelBtn: { alignItems: "center", marginTop: 14 },
  cancelBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});

```

### components/SoinLabelPicker.tsx

```tsx
import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  FAMILLES, METIERS, metiersByFamille, metierByKey,
  soinsForMetier, otherFamilleSoinsForMetier,
} from "@/lib/metiers";
import { soinIconName } from "@/lib/soinIcons";
import type { MetierSoin } from "@/lib/metiers";
import type { Theme } from "@/lib/themes";

// Champ "Nom du soin" réutilisable — SoinFormModal.tsx ("+ Ajouter un soin")
// et IntervenantFicheModal.tsx (lignes de la fiche en mode création)
// partagent ce même composant pour rester cohérents. Trois façons de
// renseigner un soin :
//  1. Liste déroulante par défaut : soins du métier de l'intervenant, "Autre"
//     en dernière position de cette même liste (bascule en saisie libre), et
//     un bouton "Autres soins" pour parcourir les autres familles/métiers.
//  2. "Autre" -> saisie libre avec auto-complétion par mot-clé sur tout le
//     catalogue (ex. taper "massage" propose tous les soins contenant ce mot,
//     toutes familles confondues).
//  3. "Autres soins" (depuis la liste ou la saisie libre) -> familles en
//     accordéon (une seule ouverte à la fois) puis métiers, puis soins de ce
//     métier — "Autre" toujours en dernière position de chaque écran pour
//     retomber sur la saisie libre.
// Une fois une valeur choisie dans le catalogue, la liste déroulante affiche
// son icône + une coche pour matérialiser la sélection comme "validée".
// Remonter `key` (côté appelant) quand la cible change (nouveau soin, popup
// rouverte…) pour réinitialiser proprement le mode (liste vs saisie libre).
interface Props {
  metier: string | null;
  value: string;
  onChange: (label: string) => void;
  C: Theme;
  placeholder?: string;
  // Ouvre directement le picker au montage (liste catalogue) — utilisé par
  // IntervenantFicheModal.tsx quand une ligne vient d'être ajoutée via
  // "+ Ajouter un type", pour éviter le clic supplémentaire "ouvrir le
  // menu déroulant" avant de pouvoir choisir un soin.
  autoOpen?: boolean;
}

function allCatalogSoins(): MetierSoin[] {
  const seen = new Set<string>();
  const result: MetierSoin[] = [];
  for (const m of METIERS) {
    for (const s of m.soins) {
      const lower = s.label.toLowerCase();
      if (seen.has(lower)) continue;
      seen.add(lower);
      result.push(s);
    }
  }
  return result;
}
const ALL_SOINS = allCatalogSoins();

export default function SoinLabelPicker({ metier, value, onChange, C, placeholder, autoOpen }: Props) {
  const ownSoins = soinsForMetier(metier);
  const otherSoins = otherFamilleSoinsForMetier(metier);
  const hasCatalog = ownSoins.length > 0 || otherSoins.length > 0;
  const catalogLabelsLower = new Set([...ownSoins, ...otherSoins].map((s) => s.label.toLowerCase()));

  const initialCustomMode = !hasCatalog || (!!value && !catalogLabelsLower.has(value.toLowerCase()));
  const [customMode, setCustomMode] = useState(initialCustomMode);
  const [pickerOpen, setPickerOpen] = useState(() => !!autoOpen && !initialCustomMode);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [browseMetier, setBrowseMetier] = useState<string | null>(null);
  const [browseFamilleOpen, setBrowseFamilleOpen] = useState<string | null>(null);

  const metierLabelText = metierByKey(metier)?.label ?? "";

  function openBrowse() {
    setBrowseMetier(null);
    setBrowseFamilleOpen(null);
    setBrowseOpen(true);
  }

  function pickCustom(fromModal: "picker" | "browse") {
    setCustomMode(true);
    onChange("");
    if (fromModal === "picker") setPickerOpen(false);
    else setBrowseOpen(false);
  }

  const query = value.trim().toLowerCase();
  const suggestions = customMode && query.length >= 2
    ? ALL_SOINS.filter((s) => s.label.toLowerCase().includes(query)).slice(0, 8)
    : [];

  return (
    <>
      {customMode ? (
        <>
          <TextInput
            style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
            placeholder={placeholder ?? "ex. Massage du dos"}
            placeholderTextColor={C.muted}
            value={value}
            onChangeText={onChange}
          />
          {suggestions.length > 0 && (
            <View style={[styles.suggestBox, { backgroundColor: C.bg, borderColor: C.border }]}>
              {suggestions.map((s) => (
                <TouchableOpacity
                  key={s.label}
                  onPress={() => onChange(s.label)}
                  activeOpacity={0.7}
                  style={styles.suggestRow}
                >
                  <Ionicons name={s.icon} size={15} color={C.muted} />
                  <Text style={[styles.suggestText, { color: C.text }]} numberOfLines={1}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={styles.linkRow}>
            {hasCatalog && (
              <TouchableOpacity onPress={() => { setCustomMode(false); onChange(""); }}>
                <Text style={[styles.linkText, { color: C.accent }]}>↩ Choisir dans la liste</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={openBrowse}>
              <Text style={[styles.linkText, { color: C.accent }]}>🔍 Autres soins</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <TouchableOpacity
          style={[styles.input, styles.dropdown, { backgroundColor: C.bg, borderColor: value ? C.accent : C.border }]}
          onPress={() => setPickerOpen(true)}
          activeOpacity={0.8}
        >
          <View style={styles.dropdownLeft}>
            {!!value && <Ionicons name={soinIconName(value)} size={18} color={C.accent} style={{ marginRight: 8 }} />}
            <Text style={[styles.dropdownText, { color: value ? C.text : C.muted }]} numberOfLines={1}>
              {value || "Choisir un soin"}
            </Text>
          </View>
          <Ionicons name={value ? "checkmark-circle" : "chevron-down"} size={18} color={value ? C.accent : C.muted} />
        </TouchableOpacity>
      )}

      <Modal visible={pickerOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setPickerOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.title, { color: C.text }]}>Choisir un soin</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              <View style={{ marginBottom: 4 }}>
                <Text style={[styles.sectionHeader, { color: C.muted }]}>Soins de {metierLabelText}</Text>
                {ownSoins.map((s) => (
                  <SoinRow key={s.label} soin={s} selected={value === s.label} C={C}
                    onPress={() => { onChange(s.label); setPickerOpen(false); }} />
                ))}
                <AutreRow C={C} onPress={() => pickCustom("picker")} />
              </View>
            </ScrollView>
            <TouchableOpacity onPress={() => { setPickerOpen(false); openBrowse(); }} style={[styles.otherSoinsBtn, { borderTopColor: C.border }]}>
              <Text style={[styles.otherSoinsBtnText, { color: C.accent }]}>Autres soins</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPickerOpen(false)} style={styles.closeBtn}>
              <Text style={[styles.closeBtnText, { color: C.muted }]}>Fermer</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={browseOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setBrowseOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setBrowseOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            {!browseMetier ? (
              <>
                <Text style={[styles.title, { color: C.text }]}>Autres soins</Text>
                <ScrollView style={{ maxHeight: 400 }}>
                  {FAMILLES.map((famille) => {
                    const open = browseFamilleOpen === famille.key;
                    return (
                      <View key={famille.key} style={{ marginBottom: 8 }}>
                        <TouchableOpacity
                          onPress={() => setBrowseFamilleOpen(open ? null : famille.key)}
                          activeOpacity={0.8}
                          style={[styles.familleAccordionRow, { borderColor: C.border }]}
                        >
                          <View style={styles.familleHeader}>
                            <Ionicons name={famille.icon} size={16} color={C.muted} />
                            <Text style={[styles.familleAccordionText, { color: C.text }]}>{famille.label}</Text>
                          </View>
                          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={C.muted} />
                        </TouchableOpacity>
                        {open && (
                          <View style={{ marginTop: 6 }}>
                            {metiersByFamille(famille.key).map((m) => (
                              <TouchableOpacity
                                key={m.key}
                                onPress={() => setBrowseMetier(m.key)}
                                activeOpacity={0.8}
                                style={styles.row}
                              >
                                <Ionicons name={m.icon} size={17} color={C.muted} />
                                <Text style={[styles.rowText, { color: C.text }]}>{m.label}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })}
                  <AutreRow C={C} onPress={() => pickCustom("browse")} />
                </ScrollView>
              </>
            ) : (
              <>
                <TouchableOpacity onPress={() => setBrowseMetier(null)} style={{ marginBottom: 8 }}>
                  <Text style={[styles.linkText, { color: C.accent }]}>‹ Retour aux métiers</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: C.text }]}>Soins de {metierByKey(browseMetier)?.label}</Text>
                <ScrollView style={{ maxHeight: 360 }}>
                  {soinsForMetier(browseMetier).map((s) => (
                    <SoinRow key={s.label} soin={s} selected={value === s.label} C={C}
                      onPress={() => { onChange(s.label); setBrowseOpen(false); }} />
                  ))}
                  <AutreRow C={C} onPress={() => pickCustom("browse")} />
                </ScrollView>
              </>
            )}
            <TouchableOpacity onPress={() => setBrowseOpen(false)} style={styles.closeBtn}>
              <Text style={[styles.closeBtnText, { color: C.muted }]}>Fermer</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function SoinRow({ soin, selected, C, onPress }: { soin: MetierSoin; selected: boolean; C: Theme; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.row, { borderColor: selected ? C.accent : "transparent", backgroundColor: selected ? `${C.accent}22` : "transparent" }]}
    >
      <Ionicons name={soin.icon} size={17} color={selected ? C.accent : C.muted} />
      <Text style={[styles.rowText, { color: selected ? C.accent : C.text }]}>{soin.label}</Text>
    </TouchableOpacity>
  );
}

function AutreRow({ C, onPress }: { C: Theme; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.row, { borderColor: "transparent" }]}>
      <Ionicons name="create-outline" size={17} color={C.muted} />
      <Text style={[styles.rowText, { color: C.text }]}>Autre</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontFamily: "DM_Sans_400Regular", fontSize: 14 },
  dropdown: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dropdownLeft: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 },
  dropdownText: { fontFamily: "DM_Sans_400Regular", fontSize: 14, flexShrink: 1 },
  suggestBox: { borderWidth: 1, borderRadius: 10, marginTop: 6, paddingVertical: 4 },
  suggestRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 12 },
  suggestText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, flex: 1 },
  linkRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, gap: 12 },
  linkText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", maxWidth: 400, maxHeight: "80%", borderRadius: 20, borderWidth: 1, padding: 24 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 12, textAlign: "center" },
  sectionHeader: { fontFamily: "DM_Sans_700Bold", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 6, paddingHorizontal: 2 },
  familleHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  familleAccordionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderRadius: 10, padding: 12 },
  familleAccordionText: { fontFamily: "DM_Sans_700Bold", fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  rowText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  otherSoinsBtn: { alignItems: "center", paddingTop: 12, marginTop: 8, borderTopWidth: 1 },
  otherSoinsBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  closeBtn: { alignItems: "center", marginTop: 8 },
  closeBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});

```

### components/SoinsDayDetail.tsx

```tsx
import { useState } from "react";
import type { Theme } from "@/lib/themes";
import type { Reservation, SlotConfig } from "@/lib/types";
import type { DayStatus } from "@/lib/slotUtils";
import DaySlotGrid from "@/components/DaySlotGrid";
import SlotOccupantsModal, { type SelectedSlot } from "@/components/SlotOccupantsModal";

// Détail lecture seule des soins du jour sélectionné, vue Hebdo + Soins du
// calendrier principal (visiteur/admin) — même rendu que le planning des
// intervenants (WeeklyPlanningGrid) mais sans sa propre navigation de
// semaine, qui vit déjà dans WeekStrip juste au-dessus. Ni le visiteur ni
// l'admin ne réservent de soin depuis cette vue (c'est à l'intervenant de le
// faire pour lui-même) — seule la consultation (qui/quoi) est proposée ici.
interface Props {
  C: Theme;
  iso: string;
  day: Date;
  config: SlotConfig;
  daySlots: string[];
  reservations: Reservation[];
  status: DayStatus;
}

export default function SoinsDayDetail({ C, iso, day, config, daySlots, reservations, status }: Props) {
  const [selected, setSelected] = useState<SelectedSlot | null>(null);

  return (
    <>
      <DaySlotGrid
        C={C}
        iso={iso}
        day={day}
        config={config}
        daySlots={daySlots}
        reservations={reservations}
        status={status}
        showHeader={false}
        onSlotPress={(slotIso, slot, occupants) => setSelected({ iso: slotIso, slot, occupants })}
      />
      <SlotOccupantsModal C={C} selected={selected} onClose={() => setSelected(null)} readOnly />
    </>
  );
}

```

### components/SoinAvatar.tsx

```tsx
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { soinIconName } from "@/lib/soinIcons";
import type { Theme } from "@/lib/themes";

// Même gabarit que PatientAvatar.tsx (cercle, anneau doré) mais avec une
// icône devinée depuis le libellé du soin à la place d'une photo/des
// initiales — utilisé par MesSoinsList.tsx en lieu et place de l'avatar
// des intervenants.
interface Props {
  label: string;
  size?: number;
  C: Theme;
}

export default function SoinAvatar({ label, size = 42, C }: Props) {
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `${C.accent}33`,
          borderColor: C.gold,
        },
      ]}
    >
      <Ionicons name={soinIconName(label)} size={size * 0.5} color={C.gold} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { borderWidth: 2, alignItems: "center", justifyContent: "center" },
});

```

### components/SoinActionModal.tsx

```tsx
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { remainingSpotsLabel } from "@/lib/slotUtils";
import type { Theme } from "@/lib/themes";
import type { Reservation } from "@/lib/types";

// Popup ouverte au tap sur un soin dans l'onglet Planning intervenant
// (app/(visitor)/soins.tsx) — que ce soit depuis PlanningDuJourBlock,
// SoinsPeriodBlock ou SoinsPlanifiesBlock, un tap ouvre désormais ce choix
// plutôt que d'agir directement : "Modifier" ouvre InterventionEditFlow (édition
// jour/horaire/type), "Y Aller" bascule sur l'espace du patient concerné et
// navigue vers son calendrier/jour (même logique qu'un tap sur une case du
// calendrier global, voir handleCalendarDayPress), "Fermer" referme le popup
// sans action et revient sur la page Planning.
interface Props {
  C: Theme;
  visible: boolean;
  reservation: Reservation | null;
  patientNameBySpaceId: Record<string, string>;
  locationBySpaceId: Record<string, string>;
  onModifier: () => void;
  onYAller: () => void;
  onClose: () => void;
  // Bouton "Ajouter une Visite" supplémentaire — permet de réserver un autre
  // créneau (même jour ou un autre) sans quitter le popup, plutôt que d'avoir
  // à fermer puis rouvrir l'écran des créneaux depuis zéro. Absent : le
  // bouton n'est pas affiché (usage intervenant, soins.tsx, qui n'a pas
  // cette notion de créneaux visite).
  onAjouterVisite?: () => void;
  // Places prises/max du créneau de cette réservation (voir home/calendar.tsx,
  // pendingVisiteCapacity) — affiché sous la ligne date/créneau pour savoir
  // d'un coup d'œil s'il reste une place sur ce même créneau. Absent : rien
  // n'est affiché (usage intervenant, soins.tsx, un seul soin possible par
  // créneau, la notion ne s'applique pas).
  remaining?: { taken: number; max: number } | null;
}

export default function SoinActionModal({
  C, visible, reservation, patientNameBySpaceId, locationBySpaceId, onModifier, onYAller, onClose, onAjouterVisite, remaining,
}: Props) {
  if (!reservation) return null;
  const dayDate = new Date(reservation.date + "T00:00:00");

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.title, { color: C.text }]} numberOfLines={1}>
            {patientNameBySpaceId[reservation.space_id] ?? `${reservation.prenom} ${reservation.nom}`}
          </Text>
          <Text style={[styles.sub, { color: C.muted }]}>
            {dayDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} · {reservation.creneau}
          </Text>
          {!!remaining && (
            <Text style={[styles.sub, { color: remaining.taken >= remaining.max ? C.danger : C.success }]}>
              {remainingSpotsLabel(remaining.taken, remaining.max)}
            </Text>
          )}
          {!!reservation.intervention_label && (
            <Text style={[styles.sub, { color: C.muted }]}>{reservation.intervention_label}</Text>
          )}
          {!!locationBySpaceId[reservation.space_id] && (
            <Text style={[styles.sub, { color: C.muted }]} numberOfLines={1}>📍 {locationBySpaceId[reservation.space_id]}</Text>
          )}

          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, { borderColor: C.border }]} onPress={onModifier}>
              <Text style={[styles.btnText, { color: C.text }]}>Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: C.accent, borderColor: C.accent }]} onPress={onYAller}>
              <Text style={[styles.btnText, { color: "#fff" }]}>Y Aller</Text>
            </TouchableOpacity>
          </View>

          {onAjouterVisite && (
            <TouchableOpacity
              style={[styles.addVisiteBtn, { backgroundColor: C.orange }]}
              onPress={onAjouterVisite}
            >
              <Text style={styles.addVisiteBtnText}>+ Ajouter une Visite</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={[styles.closeBtnText, { color: C.muted }]}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "center", alignItems: "center", padding: 24 },
  sheet: { width: "100%", maxWidth: 380, borderRadius: 20, borderWidth: 1, padding: 24, alignItems: "center" },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, textAlign: "center", textTransform: "capitalize" },
  sub: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center", marginTop: 4 },
  row: { flexDirection: "row", gap: 10, width: "100%", marginTop: 20 },
  btn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  btnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14 },
  addVisiteBtn: { width: "100%", borderRadius: 10, paddingVertical: 13, alignItems: "center", marginTop: 10 },
  addVisiteBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
  closeBtn: { alignItems: "center", marginTop: 14 },
  closeBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});

```

### components/MetierPickerModal.tsx

```tsx
import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FAMILLES, metiersByFamille } from "@/lib/metiers";
import type { Theme } from "@/lib/themes";

// Popup métier/spécialisation — familles repliables (une ouverte à la fois),
// même pattern accordéon que l'écran "Autres soins" de SoinPickerModal.tsx.
// "Autre" ouvre un écran de saisie libre : la valeur tapée est alors stockée
// telle quelle dans intervenant_profiles.metier/metier_secondaire (pas de
// clé de catalogue associée, voir lib/metiers.ts metierLabel()).
interface Props {
  visible: boolean;
  C: Theme;
  // Masque un métier déjà choisi ailleurs sur le profil (ex. le métier
  // principal, quand on choisit la 2ᵉ spécialisation).
  excludeKey?: string | null;
  onClose: () => void;
  onPick: (value: string) => void;
}

type Screen = "main" | "custom";

export default function MetierPickerModal({ visible, C, excludeKey, onClose, onPick }: Props) {
  const [screen, setScreen] = useState<Screen>("main");
  const [openFamille, setOpenFamille] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");

  useEffect(() => {
    if (!visible) return;
    setScreen("main");
    setOpenFamille(null);
    setCustomText("");
  }, [visible]);

  function pick(value: string) {
    onPick(value);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          {screen === "main" && (
            <>
              <Text style={[styles.title, { color: C.text }]}>Métier / spécialisation</Text>
              <ScrollView style={{ maxHeight: 400 }}>
                {FAMILLES.map((famille) => {
                  const open = openFamille === famille.key;
                  const metiers = metiersByFamille(famille.key).filter((m) => m.key !== excludeKey);
                  if (metiers.length === 0) return null;
                  return (
                    <View key={famille.key} style={{ marginBottom: 8 }}>
                      <TouchableOpacity
                        onPress={() => setOpenFamille(open ? null : famille.key)}
                        activeOpacity={0.8}
                        style={[styles.familleAccordionRow, { borderColor: C.border }]}
                      >
                        <View style={styles.familleHeader}>
                          <Ionicons name={famille.icon} size={16} color={C.muted} />
                          <Text style={[styles.familleAccordionText, { color: C.text }]}>{famille.label}</Text>
                        </View>
                        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={C.muted} />
                      </TouchableOpacity>
                      {open && (
                        <View style={{ marginTop: 6 }}>
                          {metiers.map((m) => (
                            <TouchableOpacity key={m.key} onPress={() => pick(m.key)} activeOpacity={0.8} style={styles.row}>
                              <Ionicons name={m.icon} size={17} color={C.muted} />
                              <Text style={[styles.rowText, { color: C.text }]}>{m.label}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
                <TouchableOpacity onPress={() => setScreen("custom")} activeOpacity={0.8} style={[styles.row, { borderColor: "transparent" }]}>
                  <Ionicons name="create-outline" size={17} color={C.muted} />
                  <Text style={[styles.rowText, { color: C.text }]}>Autre</Text>
                </TouchableOpacity>
              </ScrollView>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={[styles.closeBtnText, { color: C.muted }]}>Fermer</Text>
              </TouchableOpacity>
            </>
          )}

          {screen === "custom" && (
            <>
              <TouchableOpacity onPress={() => setScreen("main")} style={{ marginBottom: 8 }}>
                <Text style={[styles.linkText, { color: C.accent }]}>‹ Retour à la liste</Text>
              </TouchableOpacity>
              <Text style={[styles.title, { color: C.text }]}>Autre métier</Text>
              <TextInput
                style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
                placeholder="ex. Ostéopathe"
                placeholderTextColor={C.muted}
                value={customText}
                onChangeText={setCustomText}
                autoFocus
                autoCapitalize="sentences"
              />
              <TouchableOpacity
                onPress={() => customText.trim() && pick(customText.trim())}
                disabled={!customText.trim()}
                style={[styles.validateBtn, { backgroundColor: C.accent }, !customText.trim() && { opacity: 0.5 }]}
              >
                <Text style={styles.validateBtnText}>Valider</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={[styles.closeBtnText, { color: C.muted }]}>Fermer</Text>
              </TouchableOpacity>
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", maxWidth: 400, maxHeight: "80%", borderRadius: 20, borderWidth: 1, padding: 24 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 12, textAlign: "center" },
  familleHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  familleAccordionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderRadius: 10, padding: 12 },
  familleAccordionText: { fontFamily: "DM_Sans_700Bold", fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  rowText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  closeBtn: { alignItems: "center", marginTop: 8 },
  closeBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  linkText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontFamily: "DM_Sans_400Regular", fontSize: 14, marginBottom: 4 },
  validateBtn: { borderRadius: 12, paddingVertical: 13, alignItems: "center", marginTop: 12 },
  validateBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
});

```

### components/DaySoinsModal.tsx

```tsx
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet } from "react-native";
import type { Theme } from "@/lib/themes";
import type { Reservation, SlotConfig } from "@/lib/types";
import { toFrLong, type DayStatus } from "@/lib/slotUtils";
import PlanningLegend from "@/components/PlanningLegend";
import DaySlotGrid from "@/components/DaySlotGrid";

// Popup "créneaux du jour" ouverte depuis SoinsPeriodBlock (tap sur un soin
// dans (admin)/intervenants.tsx) — montre tous les créneaux de la journée
// concernée, occupés ou non, avec bouton Fermer explicite. L'admin peut
// réserver un nouveau créneau ce jour-là pour lui ou un autre intervenant
// directement depuis ici (onAddIntervention rouvre AdminAddIntervention,
// déjà pré-rempli sur ce jour, sans fermer ce popup — cf. AdminAddIntervention
// ouvert par-dessus dayBookedAlert/overlapAlert, même pattern de modales
// empilées déjà utilisé ailleurs dans l'appli).
interface Props {
  C: Theme;
  visible: boolean;
  iso: string | null;
  day: Date | null;
  config: SlotConfig | null;
  daySlots: string[];
  reservations: Reservation[];
  dayInterventions: Reservation[];
  status: DayStatus;
  onClose: () => void;
  onSlotPress: (iso: string, slot: string, occupants: Reservation[]) => void;
  onEdit: (r: Reservation) => void;
  onDelete: (r: Reservation) => void;
  onAddIntervention: () => void;
}

export default function DaySoinsModal({
  C, visible, iso, day, config, daySlots, reservations, dayInterventions, status,
  onClose, onSlotPress, onEdit, onDelete, onAddIntervention,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.accent }]}>
          <View style={[styles.headerRow, { borderBottomColor: C.border }]}>
            <Text style={[styles.title, { color: C.text }]} numberOfLines={1}>{day ? toFrLong(day) : ""}</Text>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 4 }}>
            {config && iso && day && (
              <>
                <PlanningLegend C={C} />
                <DaySlotGrid
                  C={C}
                  iso={iso}
                  day={day}
                  config={config}
                  daySlots={daySlots}
                  reservations={reservations}
                  status={status}
                  showHeader={false}
                  onSlotPress={onSlotPress}
                />
              </>
            )}

            {dayInterventions.length === 0 ? (
              <Text style={[styles.emptyText, { color: C.muted, marginTop: 4 }]}>Aucune intervention ce jour-là.</Text>
            ) : (
              dayInterventions.map((r) => {
                // r.pin vaut 'ADMIN' quand la réservation a été créée par
                // l'admin (voir AdminAddIntervention.tsx), ou le vrai PIN de
                // l'intervenant quand il a réservé lui-même depuis sa propre
                // session (InterventionBookingFlow.tsx) — l'admin ne peut
                // modifier/supprimer que les soins qu'il a créés lui-même,
                // pas ceux réservés directement par un intervenant qui a
                // l'app (même logique déjà utilisée pour "mes créneaux" dans
                // IntervenantPlanningPanel.tsx).
                const editableByAdmin = r.pin === "ADMIN";
                return (
                  <View key={r.id} style={[styles.interventionCard, { backgroundColor: C.bg, borderColor: C.orange }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.interventionTime, { color: C.orange }]}>{r.creneau} · {r.duration_minutes} min</Text>
                      <Text style={[styles.interventionLabel, { color: C.text }]}>{r.intervention_label}</Text>
                      <Text style={[styles.interventionBy, { color: C.muted }]}>{r.prenom} {r.nom}</Text>
                    </View>
                    {editableByAdmin ? (
                      <>
                        <TouchableOpacity style={[styles.editResaBtn, { borderColor: C.border }]} onPress={() => onEdit(r)}>
                          <Text style={[styles.editResaBtnText, { color: C.muted }]}>Modifier</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.deleteResaBtn, { borderColor: "rgba(233,69,96,0.4)" }]} onPress={() => onDelete(r)}>
                          <Text style={{ color: "#e94560", fontSize: 13 }}>✕</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <Text style={[styles.readOnlyBadge, { color: C.muted, borderColor: C.border }]}>Géré par l'intervenant</Text>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>

          <TouchableOpacity style={[styles.addBtn, { backgroundColor: C.orange }]} onPress={onAddIntervention}>
            <Text style={styles.addBtnText}>+ Ajouter une intervention</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.closeFooterBtn}>
            <Text style={[styles.closeFooterBtnText, { color: C.muted }]}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", maxWidth: 420, maxHeight: "85%", borderRadius: 20, borderWidth: 1, padding: 24 },
  headerRow: { marginBottom: 12, paddingBottom: 16, borderBottomWidth: 1 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, textTransform: "capitalize" },

  scroll: { maxHeight: 420 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },

  interventionCard: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  interventionTime: { fontFamily: "DM_Sans_700Bold", fontSize: 13, marginBottom: 2 },
  interventionLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },
  interventionBy: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },
  editResaBtn: { borderWidth: 1, borderRadius: 7, paddingVertical: 6, paddingHorizontal: 10 },
  editResaBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
  deleteResaBtn: { width: 28, height: 28, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  readOnlyBadge: { fontFamily: "DM_Sans_400Regular", fontSize: 10.5, borderWidth: 1, borderRadius: 7, paddingVertical: 6, paddingHorizontal: 8, textAlign: "center", maxWidth: 80 },

  addBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 14 },
  addBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },

  closeFooterBtn: { alignItems: "center", marginTop: 14 },
  closeFooterBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
});

```

### components/BookingProposalAlertModal.tsx

```tsx
import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet, Linking } from "react-native";
import { useRouter } from "expo-router";
import { useVisitorSpace } from "@/lib/VisitorContext";
import { getVisitorSession, VisitorSession } from "@/lib/visitorSession";
import { careLocationDetail, mapsUrlForSpace } from "@/lib/address";
import { toFrLong } from "@/lib/slotUtils";
import { supabase } from "@/lib/supabase";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import type { Reservation } from "@/lib/types";

// Popup affiché à un intervenant (avec compte) à chaque connexion à l'espace
// patient tant qu'il n'a pas réagi à un créneau que l'admin lui a réservé
// depuis "Ajouter une intervention" (voir AdminAddIntervention.handleSendConfirmation).
// Même mécanique qu'RebookingAlertModal (une alerte à la fois, cache locale
// hiddenId le temps de la navigation post-"Modifier"), mais filtrée sur
// intervenant_profile_id plutôt que sur pin+prénom+nom : la réservation porte
// toujours pin="ADMIN" côté book_intervention quand c'est l'admin qui réserve.
export default function BookingProposalAlertModal() {
  const { space, reservations, refreshReservations } = useVisitorSpace();
  const router = useRouter();
  const { theme: C } = useDisplayMode();
  const [mySession, setMySession] = useState<VisitorSession | null>(null);
  // Voir RebookingAlertModal : masque localement l'alerte qu'on vient
  // d'envoyer vers "Modifier"/"Voir mon planning", le temps que la
  // navigation/le rafraîchissement de `reservations` rattrape l'état réel.
  const [hiddenId, setHiddenId] = useState<string | null>(null);

  useEffect(() => {
    getVisitorSession().then(setMySession);
  }, []);

  const alerts = mySession && mySession.role === "intervenant" && mySession.intervenantProfileId
    ? reservations
        .filter((r) =>
          r.type === "Intervention"
          && r.alert_type === "booking_proposal"
          && !r.alert_seen
          && r.intervenant_profile_id === mySession.intervenantProfileId
          && r.id !== hiddenId,
        )
        .sort((a, b) => (a.date === b.date ? a.creneau.localeCompare(b.creneau) : a.date.localeCompare(b.date)))
    : [];
  const current: Reservation | undefined = alerts[0];

  const locationDetail = space ? careLocationDetail(space) : "";
  const mapsUrl = space ? mapsUrlForSpace(space) : null;

  async function handleAccept() {
    if (!current) return;
    await supabase.from("reservations").update({ alert_seen: true }).eq("id", current.id);
    await refreshReservations();
  }

  // "Voir mon planning" ne marque pas l'alerte comme vue — le popup doit
  // pouvoir réapparaître tant que l'intervenant n'a pas explicitement
  // accepté ou modifié le créneau proposé.
  function handleSeePlanning() {
    if (!current) return;
    setHiddenId(current.id);
    router.push("/(visitor)/home/calendar" as any);
  }

  async function handleModify() {
    if (!current) return;
    setHiddenId(current.id);
    await supabase.from("reservations").delete().eq("id", current.id);
    await refreshReservations();
    router.push("/(visitor)/home/calendar" as any);
  }

  if (!current) return null;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={styles.emoji}>🩺</Text>
          <Text style={[styles.title, { color: C.text }]}>Créneau proposé</Text>
          <View style={[styles.detailBox, { borderColor: C.border }]}>
            <Text style={[styles.detailRow, { color: C.text }]}>
              📅 {toFrLong(new Date(current.date + "T12:00:00"))}
            </Text>
            <Text style={[styles.detailRow, { color: C.text }]}>
              🕐 {current.creneau}{current.duration_minutes ? ` (${current.duration_minutes} min)` : ""}
            </Text>
            {!!current.intervention_label && (
              <Text style={[styles.detailRow, { color: C.text }]}>💊 {current.intervention_label}</Text>
            )}
            {!!space && (
              <Text style={[styles.detailRow, { color: C.text }]}>
                🧑 {space.patient_firstname} {space.patient_lastname}
              </Text>
            )}
            {!!locationDetail && (
              <TouchableOpacity disabled={!mapsUrl} onPress={() => mapsUrl && Linking.openURL(mapsUrl).catch(() => {})}>
                <Text style={[styles.detailRow, { color: mapsUrl ? C.accent : C.text }]}>📍 {locationDetail}</Text>
              </TouchableOpacity>
            )}
          </View>
          {!!current.alert_message && (
            <Text style={[styles.body, { color: C.muted }]}>{current.alert_message}</Text>
          )}
          <TouchableOpacity
            style={[styles.planningBtn, { borderColor: C.border }]}
            onPress={handleSeePlanning}
            activeOpacity={0.85}
          >
            <Text style={[styles.planningBtnText, { color: C.text }]}>📆 Voir mon planning</Text>
          </TouchableOpacity>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary, { borderColor: C.border }]}
              onPress={handleModify}
              activeOpacity={0.85}
            >
              <Text style={[styles.btnSecondaryText, { color: C.muted }]}>Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: C.accent }]}
              onPress={handleAccept}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryText}>Accepter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
  },
  emoji: { fontSize: 44, marginBottom: 16 },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 20,
    marginBottom: 14,
    textAlign: "center",
  },
  detailBox: { width: "100%", borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 14, gap: 6 },
  detailRow: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  body: {
    fontFamily: "DM_Sans_400Regular",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 18,
  },
  planningBtn: { width: "100%", borderWidth: 1, borderRadius: 12, paddingVertical: 13, alignItems: "center", marginBottom: 14 },
  planningBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  row: { flexDirection: "row", gap: 10, width: "100%" },
  btn: { flex: 1, borderRadius: 12, paddingVertical: 15, alignItems: "center" },
  btnSecondary: { borderWidth: 1 },
  btnSecondaryText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  btnPrimaryText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
});

```

### components/WeeklyPlanningGrid.tsx

```tsx
import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { Theme } from "@/lib/themes";
import { LOGO_PURPLE } from "@/lib/themes";
import type { Reservation, SlotConfig } from "@/lib/types";
import { addDays, getWeekDates, toISO, toFrLong, getDayStatus } from "@/lib/slotUtils";
import PlanningLegend from "@/components/PlanningLegend";
import DaySlotGrid from "@/components/DaySlotGrid";
import SlotOccupantsModal, { type SelectedSlot } from "@/components/SlotOccupantsModal";

// Vue "planning des intervenants" en semaine — réutilisée en lecture/écriture
// par l'admin (app/(admin)/intervenants.tsx) et en lecture seule par les
// visiteurs/intervenants (app/(visitor)/home/planning.tsx et
// IntervenantPlanningPanel), pour éviter de dupliquer cette logique.
// Bande de 7 jours compacts sur la largeur de l'écran (même code visuel que
// le calendrier mensuel : pastille de statut + cadre violet si au moins un
// soin ce jour-là), synoptique de la semaine sans avoir à scroller. Un tap
// sur un jour affiche son détail (créneaux) juste en dessous — un seul jour
// de détail à la fois plutôt que les 7 grilles de créneaux empilées
// verticalement (ancien comportement, qui obligeait à scroller loin pour
// repérer les soins programmés).

const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

interface Props {
  C: Theme;
  slotConfig: SlotConfig;
  reservations: Reservation[];
  getSlotsForDate: (iso: string) => string[];
  getConfigForDate: (iso: string) => SlotConfig | null;
  startDate: Date;
  weekAnchor: Date;
  onWeekChange: (anchor: Date) => void;
  // Lecture seule côté visiteur/intervenant — pas de boutons Modifier/✕ dans
  // le modal de détail d'un créneau occupé.
  readOnly: boolean;
  onEdit?: (r: Reservation) => void;
  onDelete?: (r: Reservation) => void;
}

export default function WeeklyPlanningGrid({
  C,
  slotConfig,
  reservations,
  getSlotsForDate,
  getConfigForDate,
  startDate,
  weekAnchor,
  onWeekChange,
  readOnly,
  onEdit,
  onDelete,
}: Props) {
  const [selected, setSelected] = useState<SelectedSlot | null>(null);

  const weekDates = getWeekDates(weekAnchor);
  const first = weekDates[0];
  const last = weekDates[6];
  const weekLabel =
    first.getMonth() === last.getMonth()
      ? `Semaine du ${first.getDate()} au ${last.getDate()} ${last.toLocaleDateString("fr-FR", { month: "long" })}`
      : `Semaine du ${first.getDate()} ${first.toLocaleDateString("fr-FR", { month: "long" })} au ${last.getDate()} ${last.toLocaleDateString("fr-FR", { month: "long" })}`;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = toISO(today);
  const weekAnchorIso = toISO(weekAnchor);

  const [selectedIso, setSelectedIso] = useState(() => {
    const isos = weekDates.map(toISO);
    return isos.includes(todayIso) ? todayIso : isos[0];
  });

  // Changement de semaine (‹ ›) : si le jour sélectionné n'appartient plus à
  // la semaine affichée, on retombe sur aujourd'hui s'il y est, sinon le
  // lundi de la nouvelle semaine.
  useEffect(() => {
    const isos = getWeekDates(weekAnchor).map(toISO);
    setSelectedIso((prev) => (isos.includes(prev) ? prev : isos.includes(todayIso) ? todayIso : isos[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekAnchorIso]);

  const selectedDay = new Date(selectedIso + "T00:00:00");
  const selectedConfig = getConfigForDate(selectedIso) ?? slotConfig;
  const selectedSlots = getSlotsForDate(selectedIso);
  const selectedStatus = getDayStatus(reservations, selectedIso, selectedDay, selectedConfig, selectedSlots, startDate, "Intervention");

  return (
    <View>
      <View style={[styles.weekNav, { backgroundColor: C.card, borderColor: C.border }]}>
        <TouchableOpacity onPress={() => onWeekChange(addDays(weekAnchor, -7))} style={[styles.navBtn, { borderColor: C.border }]}>
          <Text style={[styles.navBtnText, { color: C.text }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.weekLabel, { color: C.text }]}>{weekLabel}</Text>
        <TouchableOpacity onPress={() => onWeekChange(addDays(weekAnchor, 7))} style={[styles.navBtn, { borderColor: C.border }]}>
          <Text style={[styles.navBtnText, { color: C.text }]}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.strip}>
        {weekDates.map((day) => {
          const iso = toISO(day);
          const config = getConfigForDate(iso) ?? slotConfig;
          const daySlots = getSlotsForDate(iso);
          const status = getDayStatus(reservations, iso, day, config, daySlots, startDate, "Intervention");
          const dotColor =
            status === "full" ? C.danger : status === "partial" ? C.orange : status === "empty" ? C.success : "transparent";
          const hasIntervention = reservations.some((r) => r.type === "Intervention" && r.date === iso);
          const isSelected = iso === selectedIso;
          const isToday = iso === todayIso;

          return (
            <TouchableOpacity
              key={iso}
              onPress={() => setSelectedIso(iso)}
              activeOpacity={0.7}
              style={[
                styles.stripCell,
                {
                  backgroundColor: isSelected ? C.accent : C.card,
                  borderColor: isSelected ? C.accent : hasIntervention ? LOGO_PURPLE : isToday ? C.gold : C.border,
                  borderWidth: isToday || hasIntervention ? 2 : 1,
                },
              ]}
            >
              <Text style={[styles.stripDow, { color: isSelected ? "#fff" : C.muted }]}>
                {WEEKDAY_LABELS[day.getDay() === 0 ? 6 : day.getDay() - 1]}
              </Text>
              <Text style={[styles.stripDate, { color: isSelected ? "#fff" : isToday ? C.gold : C.text }]}>{day.getDate()}</Text>
              <View style={[styles.stripDot, { backgroundColor: dotColor }]} />
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.stripLegend}>
        <View style={[styles.stripLegendFrame, { borderColor: LOGO_PURPLE }]} />
        <Text style={[styles.stripLegendLabel, { color: C.muted }]}>Soin programmé ce jour-là</Text>
      </View>

      <Text style={[styles.dayTitle, { color: C.text }]}>{toFrLong(selectedDay)}</Text>
      <PlanningLegend C={C} />
      <DaySlotGrid
        C={C}
        iso={selectedIso}
        day={selectedDay}
        config={selectedConfig}
        daySlots={selectedSlots}
        reservations={reservations}
        status={selectedStatus}
        showHeader={false}
        onSlotPress={(slotIso, slot, occupants) => setSelected({ iso: slotIso, slot, occupants })}
      />

      <SlotOccupantsModal
        C={C}
        selected={selected}
        onClose={() => setSelected(null)}
        readOnly={readOnly}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  weekNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  navBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 },
  navBtnText: { fontSize: 18, fontWeight: "600" },
  weekLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, textTransform: "capitalize", flex: 1, textAlign: "center" },

  strip: { flexDirection: "row", justifyContent: "space-between", gap: 4, marginBottom: 8 },
  stripCell: { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 8, alignItems: "center", gap: 3 },
  stripDow: { fontFamily: "DM_Sans_600SemiBold", fontSize: 10, textTransform: "uppercase" },
  stripDate: { fontFamily: "DM_Sans_700Bold", fontSize: 15 },
  stripDot: { width: 5, height: 5, borderRadius: 2.5 },

  stripLegend: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginBottom: 14 },
  stripLegendFrame: { width: 12, height: 12, borderRadius: 4, borderWidth: 2 },
  stripLegendLabel: { fontFamily: "DM_Sans_400Regular", fontSize: 11 },

  dayTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 16, textTransform: "capitalize", textAlign: "center", marginBottom: 10 },
});

```

### components/DaySlotGrid.tsx

```tsx
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { Theme } from "@/lib/themes";
import type { Reservation, SlotConfig } from "@/lib/types";
import { getInterventionOverlap, type DayStatus } from "@/lib/slotUtils";

// Carte d'un jour du planning des intervenants — pastille par créneau selon
// la présence d'un soin (intervention) sur ce créneau (vert = libre, rouge =
// occupé) + cadre violet assorti. Les visites ne sont plus affichées ici :
// elles ont leur propre planning global en page d'accueil. Réutilisée telle
// quelle par WeeklyPlanningGrid (une carte par jour de la semaine) et par
// l'affichage mensuel de (admin)/intervenants.tsx (une seule carte pour le
// jour sélectionné) pour ne pas dupliquer cette logique deux fois.
interface Props {
  C: Theme;
  iso: string;
  day: Date;
  config: SlotConfig;
  daySlots: string[];
  reservations: Reservation[];
  status: DayStatus;
  // Le calendrier mensuel affiche déjà le nom/la date du jour sélectionné
  // via sa propre barre de navigation — pas besoin de le répéter ici.
  showHeader?: boolean;
  weekdayLabel?: string;
  onSlotPress: (iso: string, slot: string, occupants: Reservation[]) => void;
}

export default function DaySlotGrid({ C, iso, day, config, daySlots, reservations, status, showHeader = true, weekdayLabel, onSlotPress }: Props) {
  const unavailable = status === "past";
  const dotColor =
    status === "full" ? C.danger : status === "partial" ? C.orange : status === "empty" ? C.success : "transparent";

  return (
    <View style={[styles.daySection, { backgroundColor: C.card, borderColor: C.border }]}>
      {showHeader && (
        <View style={styles.dayHeader}>
          <Text style={[styles.dayHeaderText, { color: C.text }]}>
            {weekdayLabel} {day.getDate()}
          </Text>
          <View style={[styles.dayDot, { backgroundColor: dotColor }]} />
        </View>
      )}

      {unavailable ? (
        <Text style={[styles.emptyText, { color: C.muted }]}>Jour non disponible.</Text>
      ) : daySlots.length === 0 ? (
        <Text style={[styles.emptyText, { color: C.muted }]}>Aucun créneau configuré.</Text>
      ) : (
        <View style={styles.slotsWrap}>
          {daySlots.map((slot) => {
            const intervention = getInterventionOverlap(reservations, iso, slot, config.slot_duration_minutes);
            const occupants = intervention ? [intervention] : [];
            const occupied = !!intervention;
            const chipDotColor = occupied ? C.danger : C.success;

            return (
              <TouchableOpacity
                key={slot}
                disabled={!occupied}
                activeOpacity={0.7}
                onPress={() => onSlotPress(iso, slot, occupants)}
                style={[styles.slotChip, { backgroundColor: C.bg, borderColor: C.border, borderWidth: 1 }]}
              >
                <Text style={[styles.slotChipText, { color: C.text }]}>{slot}</Text>
                <View style={[styles.slotChipDot, { backgroundColor: chipDotColor }]} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  daySection: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  dayHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  dayHeaderText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, textTransform: "capitalize" },
  dayDot: { width: 8, height: 8, borderRadius: 4 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 12 },

  slotsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slotChip: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
  slotChipText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12 },
  slotChipDot: { width: 6, height: 6, borderRadius: 3 },
});

```

### components/PatientColorLegend.tsx

```tsx
import { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { Theme } from "@/lib/themes";

// Légende du calendrier "Planning" (app/(visitor)/soins.tsx, onglet
// intervenant) — associe chaque patient rattaché à l'intervenant à la
// couleur de ses pastilles sur IntervenantGlobalCalendar.tsx. Nommé
// différemment de components/PlanningLegend.tsx (légende Dispo/Partiel/
// Complet d'un tout autre écran, home/planning.tsx) pour éviter toute
// confusion entre les deux. Grille 2 colonnes fixe (largeur nécessaire pour
// ne pas couper les noms/prénoms). Chaque nom (+ "Tous") est tapable : filtre
// le calendrier et les blocs de jours planifiés en dessous sur ce seul
// patient — voir selectedSpaceId/onSelect dans soins.tsx.
interface Item {
  id: string;
  name: string;
  color: string;
}

interface Props {
  C: Theme;
  items: Item[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  // Limite le nombre d'items affichés d'emblée (hors "Tous", toujours
  // affiché) — au-delà, un bouton "Plus de visiteurs" déplie le reste. Sans
  // effet si absente ou si items.length <= maxVisible (comportement soins.tsx
  // inchangé).
  maxVisible?: number;
}

export default function PatientColorLegend({ C, items, selectedId, onSelect, maxVisible }: Props) {
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return null;
  const shouldCollapse = !!maxVisible && items.length > maxVisible;
  const visibleItems = shouldCollapse && !expanded ? items.slice(0, maxVisible) : items;
  return (
    <View style={styles.grid}>
      {visibleItems.map((item) => (
        <TouchableOpacity key={item.id} style={styles.item} onPress={() => onSelect(item.id)} activeOpacity={0.7}>
          <View style={[styles.swatch, { backgroundColor: item.color }]} />
          <Text
            style={[styles.label, { color: C.text }, selectedId === item.id && styles.labelActive]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.item} onPress={() => onSelect(null)} activeOpacity={0.7}>
        <View
          style={[
            styles.swatch,
            styles.allSwatch,
            { borderColor: C.text },
            selectedId === null && { backgroundColor: C.text },
          ]}
        />
        <Text
          style={[styles.label, { color: C.text }, selectedId === null && styles.labelActive]}
          numberOfLines={1}
        >
          Tous
        </Text>
      </TouchableOpacity>
      {shouldCollapse && (
        <TouchableOpacity style={styles.item} onPress={() => setExpanded((v) => !v)} activeOpacity={0.7}>
          <Text style={[styles.label, styles.toggleLabel, { color: C.muted }]} numberOfLines={1}>
            {expanded ? "Moins de visiteurs ▴" : "Plus de visiteurs ▾"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap" },
  item: { width: "50%", flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 5, paddingRight: 6 },
  swatch: { width: 10, height: 10, borderRadius: 5 },
  allSwatch: { borderWidth: 1.5, backgroundColor: "transparent" },
  label: { fontFamily: "DM_Sans_400Regular", fontSize: 12, flexShrink: 1 },
  labelActive: { fontFamily: "DM_Sans_700Bold" },
  toggleLabel: { fontFamily: "DM_Sans_600SemiBold", textDecorationLine: "underline" },
});

```

### components/PlanningLegend.tsx

```tsx
import { View, Text, StyleSheet } from "react-native";
import type { Theme } from "@/lib/themes";

// Légende partagée entre l'affichage mensuel et hebdomadaire du planning des
// intervenants — pastilles de couleur pour l'occupation des créneaux de
// soins (interventions). Les visites ne sont plus affichées sur cet écran.
export default function PlanningLegend({ C }: { C: Theme }) {
  return (
    <View style={styles.legend}>
      {([[C.success, "Dispo"], [C.orange, "Partiel"], [C.danger, "Complet"]] as [string, string][]).map(([color, label]) => (
        <View key={label} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: color }]} />
          <Text style={[styles.legendLabel, { color: C.muted }]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", gap: 16, marginBottom: 14 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontFamily: "DM_Sans_400Regular", fontSize: 11 },
});

```

### components/PatientsList.tsx

```tsx
import { useState, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useVisitorSpace } from "@/lib/VisitorContext";
import { getVisitorSession } from "@/lib/visitorSession";
import { normalizePhone } from "@/lib/phone";
import { careLocationSummary } from "@/lib/address";
import { switchToLinkedSpace, type LinkedIntervenantSpaceRow } from "@/lib/intervenantSpaceSwitch";
import PatientAvatar from "@/components/PatientAvatar";
import type { Theme } from "@/lib/themes";

interface PatientRow extends LinkedIntervenantSpaceRow {
  patient_spaces: {
    invite_token: string;
    patient_firstname: string;
    patient_lastname: string;
    patient_photo_url: string | null;
    home_care_mode: boolean;
    hospital_name: string;
    hospital_service: string;
    hospital_room: string;
    home_city: string | null;
    home_postal_code: string | null;
  } | null;
}

interface Props {
  C: Theme;
}

// Onglet "Patients" — remplace "Soutien" côté intervenant (voir
// app/(visitor)/_layout.tsx) : même présentation que IntervenantsList.tsx,
// mais liste les espaces patients auxquels cet intervenant est rattaché
// (même téléphone, cf. "Mes Patients" dans app/(visitor)/account.tsx dont on
// réutilise la logique de pivot — lib/intervenantSpaceSwitch.ts).
export default function PatientsList({ C }: Props) {
  const router = useRouter();
  const { space } = useVisitorSpace();
  const [loading, setLoading] = useState(true);
  const [telephone, setTelephone] = useState<string | null>(null);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const session = await getVisitorSession();
    if (!session?.intervenantProfileId) {
      setLoading(false);
      return;
    }
    // Le téléphone en session peut être vide (jamais rechargé depuis la
    // fiche sur cet appareil) — repli sur intervenant_profiles, même
    // principe que app/(visitor)/account.tsx.
    let tel = session.telephone;
    if (!tel) {
      const { data } = await supabase
        .from("intervenant_profiles")
        .select("telephone")
        .eq("id", session.intervenantProfileId)
        .maybeSingle();
      tel = data?.telephone ?? "";
    }
    const normalized = normalizePhone(tel);
    setTelephone(tel);
    if (normalized.length < 6) {
      setPatients([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("intervenant_profiles")
      .select("id, space_id, prenom, nom, pin, patient_spaces(invite_token, patient_firstname, patient_lastname, patient_photo_url, home_care_mode, hospital_name, hospital_service, hospital_room, home_city, home_postal_code)")
      .eq("telephone", normalized)
      .order("space_id", { ascending: true });
    if (error) console.error("[PatientsList] intervenant_profiles select failed:", error);
    setPatients((data as any) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handlePress(row: PatientRow) {
    if (!row.patient_spaces || switchingId || row.space_id === space?.id) return;
    setSwitchingId(row.id);
    try {
      await switchToLinkedSpace(row, telephone ?? "", router);
    } finally {
      setSwitchingId(null);
    }
  }

  if (loading) {
    return <ActivityIndicator color={C.accent} style={{ marginVertical: 32 }} />;
  }

  return (
    <View style={styles.scroll}>
      {patients.length === 0 ? (
        <Text style={[styles.emptyText, { color: C.muted }]}>Aucun patient rattaché pour l'instant.</Text>
      ) : (
        patients.map((p, i) => {
          const ps = p.patient_spaces;
          const isActive = p.space_id === space?.id;
          return (
            <TouchableOpacity
              key={p.id}
              style={[styles.row, i < patients.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
              onPress={() => handlePress(p)}
              activeOpacity={isActive ? 1 : 0.7}
              disabled={switchingId === p.id}
            >
              <PatientAvatar
                photoUrl={ps?.patient_photo_url ?? null}
                firstname={ps?.patient_firstname ?? ""}
                lastname={ps?.patient_lastname ?? ""}
                size={44}
                C={C}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>
                  {ps ? `${ps.patient_firstname} ${ps.patient_lastname}` : "Espace"}{isActive ? " (actuel)" : ""}
                </Text>
                {!!ps && (
                  <Text style={[styles.location, { color: C.muted }]} numberOfLines={1}>
                    {careLocationSummary(ps)}
                  </Text>
                )}
              </View>
              {switchingId === p.id ? (
                <ActivityIndicator color={C.accent} size="small" />
              ) : (
                !isActive && <Text style={[styles.chevron, { color: C.muted }]}>›</Text>
              )}
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 24 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center", marginVertical: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  name: { fontFamily: "DM_Sans_600SemiBold", fontSize: 15 },
  location: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },
  chevron: { fontFamily: "DM_Sans_700Bold", fontSize: 16 },
});

```

### lib/metiers.ts

```ts
import type { Ionicons } from "@expo/vector-icons";

// Catalogue pré-établi des métiers d'intervenants possibles en soins à
// domicile, ainsi que ceux pouvant venir en renfort de l'équipe médicale
// hospitalière — utilisé pour :
//  - la fiche intervenant (famille puis métier saisis à la création, voir
//    IntervenantFicheModal.tsx) ;
//  - l'icône de repli de l'avatar (PatientAvatar.tsx) quand aucune photo
//    n'est définie ;
//  - la liste de soins suggérés par métier/famille (SoinFormModal.tsx) ;
//  - la reconnaissance d'icône par libellé exact pour "Mes soins"
//    (lib/soinIcons.ts, SoinAvatar.tsx).
//
// `key` (Metier et Famille) est la valeur stockée en base
// (intervenant_profiles.metier pour Metier.key) — ne jamais la renommer sans
// migration, seuls label/icon/soins/familleKey peuvent évoluer librement.
export interface MetierSoin {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export interface Famille {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export interface Metier {
  key: string;
  familleKey: string | null;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  soins: MetierSoin[];
}

export const FAMILLES: Famille[] = [
  { key: "medical", label: "Médical / paramédical", icon: "medkit-outline" },
  { key: "bien_etre", label: "Bien-être / soins corporels", icon: "sparkles-outline" },
  { key: "psy", label: "Accompagnement psychologique", icon: "chatbubble-ellipses-outline" },
  { key: "aide_domicile", label: "Aide à domicile / vie quotidienne", icon: "home-outline" },
  { key: "social_admin", label: "Accompagnement social / administratif", icon: "people-outline" },
  { key: "transport", label: "Transport", icon: "car-outline" },
  { key: "vie_sociale", label: "Vie sociale / loisirs / spirituel", icon: "sunny-outline" },
];

export const METIERS: Metier[] = [
  // ─── A. Médical / paramédical ─────────────────────────────────────────
  {
    key: "medecin",
    familleKey: "medical",
    label: "Médecin",
    icon: "medkit-outline",
    soins: [
      { label: "Consultation", icon: "medkit-outline" },
      { label: "Téléconsultation", icon: "videocam-outline" },
      { label: "Coordination du parcours", icon: "git-network-outline" },
      { label: "Éducation thérapeutique du patient", icon: "school-outline" },
      { label: "Renouvellement d'ordonnance", icon: "document-text-outline" },
      { label: "Visite de contrôle", icon: "checkmark-circle-outline" },
    ],
  },
  {
    key: "infirmier",
    familleKey: "medical",
    label: "Infirmier·ère",
    icon: "medical-outline",
    soins: [
      { label: "Pansement", icon: "bandage-outline" },
      { label: "Injection / Piqûre", icon: "medical-outline" },
      { label: "Prise de sang", icon: "water-outline" },
      { label: "Perfusion", icon: "git-commit-outline" },
      { label: "Surveillance post-opératoire", icon: "pulse-outline" },
      { label: "Éducation thérapeutique du patient", icon: "school-outline" },
    ],
  },
  {
    key: "aide_soignant",
    familleKey: "medical",
    label: "Aide-soignant·e",
    icon: "hand-left-outline",
    soins: [
      { label: "Toilette", icon: "water-outline" },
      { label: "Aide au lever / coucher", icon: "bed-outline" },
      { label: "Aide aux repas", icon: "restaurant-outline" },
      { label: "Change", icon: "refresh-outline" },
    ],
  },
  {
    key: "kine",
    familleKey: "medical",
    label: "Kinésithérapeute",
    icon: "body-outline",
    soins: [
      { label: "Rééducation motrice", icon: "walk-outline" },
      { label: "Massage thérapeutique", icon: "body-outline" },
      { label: "Drainage lymphatique", icon: "water-outline" },
      { label: "Kiné respiratoire", icon: "fitness-outline" },
    ],
  },
  {
    key: "ergotherapeute",
    familleKey: "medical",
    label: "Ergothérapeute",
    icon: "construct-outline",
    soins: [
      { label: "Adaptation du domicile", icon: "construct-outline" },
      { label: "Rééducation gestes du quotidien", icon: "hand-left-outline" },
    ],
  },
  {
    key: "orthophoniste",
    familleKey: "medical",
    label: "Orthophoniste",
    icon: "mic-outline",
    soins: [
      { label: "Rééducation du langage", icon: "mic-outline" },
      { label: "Rééducation de la déglutition", icon: "restaurant-outline" },
    ],
  },
  {
    key: "orthoptiste",
    familleKey: "medical",
    label: "Orthoptiste",
    icon: "eye-outline",
    soins: [
      { label: "Rééducation visuelle", icon: "eye-outline" },
    ],
  },
  {
    key: "psychomotricien",
    familleKey: "medical",
    label: "Psychomotricien·ne",
    icon: "walk-outline",
    soins: [
      { label: "Gym douce", icon: "walk-outline" },
      { label: "Travail de l'équilibre", icon: "walk-outline" },
      { label: "Relaxation corporelle", icon: "leaf-outline" },
    ],
  },
  {
    key: "dieteticien",
    familleKey: "medical",
    label: "Diététicien·ne",
    icon: "restaurant-outline",
    soins: [
      { label: "Bilan nutritionnel", icon: "clipboard-outline" },
      { label: "Suivi alimentaire", icon: "restaurant-outline" },
    ],
  },
  {
    key: "podologue",
    familleKey: "medical",
    label: "Pédicure-podologue",
    icon: "footsteps-outline",
    soins: [
      { label: "Soin des pieds (pédicure)", icon: "footsteps-outline" },
      { label: "Podologie (soin médical du pied)", icon: "footsteps-outline" },
      { label: "Semelles orthopédiques", icon: "footsteps-outline" },
    ],
  },
  {
    key: "sage_femme",
    familleKey: "medical",
    label: "Sage-femme",
    icon: "heart-outline",
    soins: [
      { label: "Suivi post-partum", icon: "heart-outline" },
      { label: "Accompagnement allaitement", icon: "heart-outline" },
    ],
  },
  {
    key: "pharmacien",
    familleKey: "medical",
    label: "Pharmacien·ne",
    icon: "bag-outline",
    soins: [
      { label: "Préparation piluliers", icon: "bag-outline" },
      { label: "Livraison de médicaments", icon: "bicycle-outline" },
    ],
  },
  {
    key: "labo",
    familleKey: "medical",
    label: "Technicien·ne de laboratoire",
    icon: "flask-outline",
    soins: [
      { label: "Prélèvement à domicile", icon: "flask-outline" },
    ],
  },

  // ─── B. Bien-être / soins corporels ───────────────────────────────────
  {
    key: "socio_esthetique",
    familleKey: "bien_etre",
    label: "Socio-esthéticien·ne",
    icon: "sparkles-outline",
    soins: [
      { label: "Socio-esthétique", icon: "sparkles-outline" },
      { label: "Soin de la peau", icon: "sparkles-outline" },
      { label: "Maquillage", icon: "sparkles-outline" },
    ],
  },
  {
    key: "esthetique",
    familleKey: "bien_etre",
    label: "Esthéticien·ne",
    icon: "sparkles-outline",
    soins: [
      { label: "Manucure", icon: "hand-left-outline" },
      { label: "Soin du visage", icon: "sparkles-outline" },
      { label: "Maquillage", icon: "sparkles-outline" },
    ],
  },
  {
    key: "coiffeur",
    familleKey: "bien_etre",
    label: "Coiffeur·se",
    icon: "cut-outline",
    soins: [
      { label: "Coupe", icon: "cut-outline" },
      { label: "Shampoing", icon: "water-outline" },
      { label: "Coiffage", icon: "sparkles-outline" },
      { label: "Rasage / entretien barbe", icon: "cut-outline" },
    ],
  },
  {
    key: "masseur_bien_etre",
    familleKey: "bien_etre",
    label: "Masseur·se bien-être",
    icon: "hand-right-outline",
    soins: [
      { label: "Massage relaxant", icon: "hand-right-outline" },
    ],
  },
  {
    key: "reflexologue",
    familleKey: "bien_etre",
    label: "Réflexologue",
    icon: "footsteps-outline",
    soins: [
      { label: "Réflexologie plantaire", icon: "footsteps-outline" },
      { label: "Réflexologie palmaire", icon: "hand-left-outline" },
    ],
  },
  {
    key: "aromatherapie",
    familleKey: "bien_etre",
    label: "Praticien·ne aromathérapie",
    icon: "leaf-outline",
    soins: [
      { label: "Séance d'aromathérapie", icon: "leaf-outline" },
      { label: "Relaxation", icon: "leaf-outline" },
    ],
  },
  {
    key: "sophrologue",
    familleKey: "bien_etre",
    label: "Sophrologue",
    icon: "cloud-outline",
    soins: [
      { label: "Séance de sophrologie", icon: "cloud-outline" },
      { label: "Gestion du stress", icon: "cloud-outline" },
      { label: "Respiration guidée", icon: "cloud-outline" },
      { label: "Luminothérapie", icon: "sunny-outline" },
    ],
  },
  {
    key: "hypnose",
    familleKey: "bien_etre",
    label: "Praticien·ne hypnose",
    icon: "moon-outline",
    soins: [
      { label: "Séance d'hypnose", icon: "moon-outline" },
      { label: "Aide au sommeil", icon: "moon-outline" },
    ],
  },
  {
    key: "osteopathe",
    familleKey: "bien_etre",
    label: "Ostéopathe",
    icon: "accessibility-outline",
    soins: [
      { label: "Séance d'ostéopathie", icon: "accessibility-outline" },
    ],
  },
  {
    key: "acupuncteur",
    familleKey: "bien_etre",
    label: "Acupuncteur·rice",
    icon: "body-outline",
    soins: [
      { label: "Séance d'acupuncture", icon: "body-outline" },
    ],
  },
  {
    key: "naturopathe",
    familleKey: "bien_etre",
    label: "Naturopathe",
    icon: "leaf-outline",
    soins: [
      { label: "Consultation naturopathie", icon: "leaf-outline" },
      { label: "Conseils nutrition", icon: "restaurant-outline" },
    ],
  },
  {
    key: "yoga_gym_douce",
    familleKey: "bien_etre",
    label: "Professeur·e de yoga / gym douce",
    icon: "fitness-outline",
    soins: [
      { label: "Yoga doux", icon: "fitness-outline" },
      { label: "Gym douce", icon: "walk-outline" },
      { label: "Relaxation corporelle", icon: "leaf-outline" },
    ],
  },

  // ─── C. Accompagnement psychologique ──────────────────────────────────
  {
    key: "psychologue",
    familleKey: "psy",
    label: "Psychologue",
    icon: "chatbubble-ellipses-outline",
    soins: [
      { label: "Entretien de soutien", icon: "chatbubble-ellipses-outline" },
      { label: "Suivi psychologique", icon: "heart-outline" },
    ],
  },
  {
    key: "psychiatre",
    familleKey: "psy",
    label: "Psychiatre",
    icon: "pulse-outline",
    soins: [
      { label: "Consultation psychiatrique", icon: "pulse-outline" },
      { label: "Suivi médicamenteux", icon: "medkit-outline" },
      { label: "Renouvellement d'ordonnance", icon: "document-text-outline" },
    ],
  },
  {
    key: "art_therapeute",
    familleKey: "psy",
    label: "Art-thérapeute",
    icon: "color-palette-outline",
    soins: [
      { label: "Art-thérapie", icon: "color-palette-outline" },
      { label: "Activité créative", icon: "color-palette-outline" },
    ],
  },
  {
    key: "musicotherapeute",
    familleKey: "psy",
    label: "Musicothérapeute",
    icon: "musical-notes-outline",
    soins: [
      { label: "Musicothérapie", icon: "musical-notes-outline" },
    ],
  },
  {
    key: "chant_therapie",
    familleKey: "psy",
    label: "Praticien·ne chant-thérapie",
    icon: "musical-notes-outline",
    soins: [
      { label: "Chant-thérapie", icon: "musical-notes-outline" },
    ],
  },
  {
    key: "animateur_groupe_parole",
    familleKey: "psy",
    label: "Animateur·rice groupe de parole",
    icon: "people-circle-outline",
    soins: [
      { label: "Groupe de parole", icon: "people-circle-outline" },
      { label: "Soutien aux proches / aidants", icon: "people-circle-outline" },
    ],
  },
  {
    key: "accompagnant_fin_de_vie",
    familleKey: "psy",
    label: "Accompagnant·e fin de vie",
    icon: "heart-outline",
    soins: [
      { label: "Présence", icon: "heart-outline" },
      { label: "Accompagnement de fin de vie", icon: "heart-outline" },
      { label: "Écoute", icon: "chatbubble-ellipses-outline" },
    ],
  },

  // ─── D. Aide à domicile / vie quotidienne ─────────────────────────────
  {
    key: "auxiliaire_vie",
    familleKey: "aide_domicile",
    label: "Auxiliaire de vie",
    icon: "home-outline",
    soins: [
      { label: "Toilette", icon: "water-outline" },
      { label: "Aide aux repas", icon: "restaurant-outline" },
      { label: "Aide à l'habillage", icon: "shirt-outline" },
      { label: "Courses", icon: "cart-outline" },
      { label: "Ménage léger", icon: "home-outline" },
      { label: "Compagnie / présence", icon: "people-outline" },
    ],
  },
  {
    key: "amp_aes",
    familleKey: "aide_domicile",
    label: "AMP / AES",
    icon: "hand-left-outline",
    soins: [
      { label: "Aide à l'autonomie", icon: "hand-left-outline" },
      { label: "Accompagnement quotidien", icon: "home-outline" },
      { label: "Activités", icon: "color-palette-outline" },
    ],
  },
  {
    key: "tisf",
    familleKey: "aide_domicile",
    label: "TISF (technicien·ne intervention sociale et familiale)",
    icon: "home-outline",
    soins: [
      { label: "Soutien familial", icon: "people-outline" },
      { label: "Organisation du domicile", icon: "home-outline" },
      { label: "Aide aux démarches", icon: "document-text-outline" },
    ],
  },
  {
    key: "aide_menagere",
    familleKey: "aide_domicile",
    label: "Aide ménagère",
    icon: "home-outline",
    soins: [
      { label: "Ménage", icon: "home-outline" },
      { label: "Linge / lessive", icon: "shirt-outline" },
      { label: "Repassage", icon: "shirt-outline" },
      { label: "Entretien du logement", icon: "home-outline" },
    ],
  },
  {
    key: "employe_service_domicile",
    familleKey: "aide_domicile",
    label: "Employé·e de service à domicile",
    icon: "basket-outline",
    soins: [
      { label: "Courses", icon: "cart-outline" },
      { label: "Préparation repas", icon: "restaurant-outline" },
      { label: "Jardinage", icon: "leaf-outline" },
      { label: "Petit bricolage", icon: "construct-outline" },
    ],
  },

  // ─── E. Accompagnement social / administratif ─────────────────────────
  {
    key: "assistant_social",
    familleKey: "social_admin",
    label: "Assistant·e social·e",
    icon: "people-outline",
    soins: [
      { label: "Aide aux démarches", icon: "document-text-outline" },
      { label: "Démarches CPAM / mutuelle", icon: "document-text-outline" },
      { label: "Orientation", icon: "folder-outline" },
    ],
  },
  {
    key: "conseiller_esf",
    familleKey: "social_admin",
    label: "Conseiller·ère en économie sociale et familiale",
    icon: "document-text-outline",
    soins: [
      { label: "Aide à l'organisation du domicile", icon: "home-outline" },
      { label: "Budget", icon: "document-text-outline" },
      { label: "Démarches", icon: "document-text-outline" },
    ],
  },
  {
    key: "coordinateur_parcours",
    familleKey: "social_admin",
    label: "Coordinateur·rice de parcours",
    icon: "git-network-outline",
    soins: [
      { label: "Coordination du parcours", icon: "git-network-outline" },
      { label: "Lien entre intervenants", icon: "people-outline" },
    ],
  },
  {
    key: "benevole_association",
    familleKey: "social_admin",
    label: "Bénévole d'association",
    icon: "people-outline",
    soins: [
      { label: "Visite / compagnie", icon: "people-outline" },
      { label: "Transport", icon: "car-outline" },
      { label: "Démarches", icon: "document-text-outline" },
      { label: "Lecture", icon: "book-outline" },
    ],
  },

  // ─── F. Transport ──────────────────────────────────────────────────────
  {
    key: "chauffeur_taxi",
    familleKey: "transport",
    label: "Chauffeur·se taxi conventionné",
    icon: "car-outline",
    soins: [
      { label: "Transport accompagné", icon: "car-outline" },
      { label: "Accompagnement RDV médical", icon: "medkit-outline" },
    ],
  },
  {
    key: "ambulancier",
    familleKey: "transport",
    label: "Ambulancier·ère / Brancardier·ère",
    icon: "car-outline",
    soins: [
      { label: "Transport médicalisé", icon: "car-outline" },
      { label: "Transfert brancard", icon: "car-outline" },
      { label: "Transport PMR", icon: "car-outline" },
    ],
  },
  {
    key: "transport_pmr",
    familleKey: "transport",
    label: "Transport PMR / accompagné",
    icon: "car-outline",
    soins: [
      { label: "Transport adapté", icon: "car-outline" },
      { label: "Accompagnement courses", icon: "cart-outline" },
    ],
  },

  // ─── G. Vie sociale / loisirs / spirituel ─────────────────────────────
  {
    key: "animateur_socioculturel",
    familleKey: "vie_sociale",
    label: "Animateur·rice socioculturel·le",
    icon: "game-controller-outline",
    soins: [
      { label: "Activité créative", icon: "color-palette-outline" },
      { label: "Jeux", icon: "game-controller-outline" },
      { label: "Sortie", icon: "walk-outline" },
      { label: "Moment convivial", icon: "people-outline" },
    ],
  },
  {
    key: "benevole_lecture",
    familleKey: "vie_sociale",
    label: "Bénévole lecture / bibliothèque",
    icon: "book-outline",
    soins: [
      { label: "Lecture", icon: "book-outline" },
      { label: "Accompagnement culturel", icon: "book-outline" },
    ],
  },
  {
    key: "musicien_intervenant",
    familleKey: "vie_sociale",
    label: "Musicien·ne intervenant·e",
    icon: "musical-notes-outline",
    soins: [
      { label: "Musique", icon: "musical-notes-outline" },
      { label: "Chant", icon: "musical-notes-outline" },
    ],
  },
  {
    key: "photographe",
    familleKey: "vie_sociale",
    label: "Photographe",
    icon: "camera-outline",
    soins: [
      { label: "Photographie / souvenir", icon: "camera-outline" },
    ],
  },
  {
    key: "mediation_animale",
    familleKey: "vie_sociale",
    label: "Intervenant·e médiation animale",
    icon: "paw-outline",
    soins: [
      { label: "Médiation animale / zoothérapie", icon: "paw-outline" },
    ],
  },
  {
    key: "accompagnant_spirituel",
    familleKey: "vie_sociale",
    label: "Accompagnant·e spirituel·le",
    icon: "sunny-outline",
    soins: [
      { label: "Accompagnement spirituel / religieux", icon: "sunny-outline" },
    ],
  },

  // ─── Repli ─────────────────────────────────────────────────────────────
  {
    key: "autre",
    familleKey: null,
    label: "Autre",
    icon: "briefcase-outline",
    soins: [],
  },
];

export function metierByKey(key: string | null | undefined): Metier | undefined {
  if (!key) return undefined;
  return METIERS.find((m) => m.key === key);
}

export function familleByKey(key: string | null | undefined): Famille | undefined {
  if (!key) return undefined;
  return FAMILLES.find((f) => f.key === key);
}

export function metiersByFamille(familleKey: string): Metier[] {
  return METIERS.filter((m) => m.familleKey === familleKey);
}

export function metierIconName(key: string | null | undefined): keyof typeof Ionicons.glyphMap {
  return metierByKey(key)?.icon ?? "briefcase-outline";
}

// Repli sur la clé brute (plutôt que "") quand elle n'est pas dans le
// catalogue : cas d'un métier "Autre" saisi librement à la création (voir
// MetierPickerModal.tsx) — la valeur stockée est alors directement le texte
// tapé par l'intervenant, sans clé de catalogue associée.
export function metierLabel(key: string | null | undefined): string {
  return metierByKey(key)?.label ?? key ?? "";
}

// Soins propres au métier — ordre du catalogue (voir SoinFormModal.tsx,
// section "Soins de {métier}").
export function soinsForMetier(key: string | null | undefined): MetierSoin[] {
  return metierByKey(key)?.soins ?? [];
}

// Variante multi-métiers — une entrée par clé valide du catalogue (clés
// libres/"Autre" ignorées : pas de soins suggérés dans ce cas), dédupliquées.
// Utilisé par SoinPickerModal.tsx pour afficher une section "Soins de
// {métier}" par métier du profil (principal + éventuelle 2ᵉ spécialisation).
export function soinsForMetiers(keys: (string | null | undefined)[]): { metier: Metier; soins: MetierSoin[] }[] {
  const seen = new Set<string>();
  const result: { metier: Metier; soins: MetierSoin[] }[] = [];
  for (const key of keys) {
    const metier = metierByKey(key);
    if (!metier || seen.has(metier.key)) continue;
    seen.add(metier.key);
    result.push({ metier, soins: metier.soins });
  }
  return result;
}

// Reste des soins de la même famille (autres métiers), dédupliqués par
// libellé et sans redite des soins déjà propres au métier — permet à un
// intervenant d'ajouter un soin réalisé par un collègue de sa famille
// (ex. un·e aide-soignant·e proposant "Ménage léger" vu chez l'auxiliaire de
// vie) sans devoir taper un libellé libre. Voir SoinFormModal.tsx, section
// "Autres soins de {famille}".
export function otherFamilleSoinsForMetier(key: string | null | undefined): MetierSoin[] {
  const metier = metierByKey(key);
  if (!metier || !metier.familleKey) return [];
  const ownLabels = new Set(metier.soins.map((s) => s.label.toLowerCase()));
  const seen = new Set<string>();
  const result: MetierSoin[] = [];
  for (const m of metiersByFamille(metier.familleKey)) {
    if (m.key === metier.key) continue;
    for (const s of m.soins) {
      const lower = s.label.toLowerCase();
      if (ownLabels.has(lower) || seen.has(lower)) continue;
      seen.add(lower);
      result.push(s);
    }
  }
  return result;
}

// Index plat libellé → icône (première correspondance dans l'ordre du
// catalogue) — utilisé par lib/soinIcons.ts pour retrouver l'icône exacte
// d'un soin choisi dans la liste, avant repli sur la reconnaissance par
// mot-clé (soins tapés librement, voir option "Autre" de SoinFormModal.tsx).
export function soinIconByExactLabel(label: string): keyof typeof Ionicons.glyphMap | undefined {
  const lower = label.trim().toLowerCase();
  for (const m of METIERS) {
    for (const s of m.soins) {
      if (s.label.toLowerCase() === lower) return s.icon;
    }
  }
  return undefined;
}

```

### lib/interventionTypesSync.ts

```ts
import { supabase } from "@/lib/supabase";
import type { InterventionType } from "@/lib/types";

// Un même intervenant a une fiche (intervenant_profiles) indépendante par
// espace patient auquel il est rattaché (voir IntervenantFicheModal.tsx) —
// "Mes espaces" (lib/intervenantSpaceSwitch.ts) les relie entre elles via le
// téléphone normalisé. Les soins (intervention_types) suivent chaque fiche
// individuellement ; les fonctions ci-dessous les gardent synchronisés
// partout où l'intervenant intervient, pour qu'un soin créé sur un espace
// soit immédiatement disponible sur les autres (Fiche intervenant / Soins /
// Réservation de créneau).
async function getSiblingProfileIds(intervenantProfileId: string): Promise<string[]> {
  const { data: self } = await supabase
    .from("intervenant_profiles")
    .select("telephone")
    .eq("id", intervenantProfileId)
    .maybeSingle();
  if (!self?.telephone) return [];
  const { data: siblings } = await supabase
    .from("intervenant_profiles")
    .select("id")
    .eq("telephone", self.telephone)
    .neq("id", intervenantProfileId);
  return (siblings ?? []).map((s) => s.id);
}

// Soins de cette fiche, complétés automatiquement avec ceux créés sur une
// fiche jumelle (autre espace, même téléphone) mais absents ici — plutôt que
// de simplement fusionner l'affichage, on crée la ligne manquante côté
// serveur pour que ce soin reste sélectionnable par la RPC book_intervention
// (qui exige un intervention_type_id appartenant à CE profil).
export async function getSyncedInterventionTypes(intervenantProfileId: string): Promise<InterventionType[]> {
  const siblingIds = await getSiblingProfileIds(intervenantProfileId);
  const allIds = [intervenantProfileId, ...siblingIds];
  const { data } = await supabase
    .from("intervention_types")
    .select("*")
    .in("intervenant_profile_id", allIds)
    .order("created_at", { ascending: true });
  const rows = data ?? [];
  const mine = rows.filter((t) => t.intervenant_profile_id === intervenantProfileId);
  if (siblingIds.length === 0) return mine;

  const mineLabels = new Set(mine.map((t) => t.label));
  const missing = new Map<string, { label: string; duration_minutes: number }>();
  for (const t of rows) {
    if (!mineLabels.has(t.label) && !missing.has(t.label)) {
      missing.set(t.label, { label: t.label, duration_minutes: t.duration_minutes });
    }
  }
  if (missing.size === 0) return mine;

  const { data: created } = await supabase
    .from("intervention_types")
    .insert(Array.from(missing.values()).map((m) => ({ intervenant_profile_id: intervenantProfileId, ...m })))
    .select("*");
  return [...mine, ...(created ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

// À appeler juste après la création/modification/suppression d'un soin
// (SoinFormModal.tsx, IntervenantFicheModal.tsx) pour répercuter le même
// changement sur les fiches jumelles — matching par ancien libellé
// (oldLabel côté update), avec création si aucune ligne ne correspond
// plutôt que de laisser une fiche jumelle désynchronisée. Best-effort : un
// échec ici ne doit jamais faire échouer l'action principale de l'appelant.
export async function propagateSoinChange(
  intervenantProfileId: string,
  change:
    | { type: "create"; label: string; duration_minutes: number }
    | { type: "update"; oldLabel: string; label: string; duration_minutes: number }
    | { type: "delete"; label: string },
): Promise<void> {
  try {
    const siblingIds = await getSiblingProfileIds(intervenantProfileId);
    if (siblingIds.length === 0) return;

    if (change.type === "delete") {
      await supabase.from("intervention_types").delete().in("intervenant_profile_id", siblingIds).eq("label", change.label);
      return;
    }

    const matchLabel = change.type === "update" ? change.oldLabel : change.label;
    const { data: matches } = await supabase
      .from("intervention_types")
      .select("id, intervenant_profile_id")
      .in("intervenant_profile_id", siblingIds)
      .eq("label", matchLabel);
    const matchedIds = (matches ?? []).map((m) => m.id);
    const matchedProfileIds = new Set((matches ?? []).map((m) => m.intervenant_profile_id));

    if (matchedIds.length > 0) {
      await supabase.from("intervention_types").update({ label: change.label, duration_minutes: change.duration_minutes }).in("id", matchedIds);
    }
    const missingProfileIds = siblingIds.filter((id) => !matchedProfileIds.has(id));
    if (missingProfileIds.length > 0) {
      await supabase.from("intervention_types").insert(
        missingProfileIds.map((id) => ({ intervenant_profile_id: id, label: change.label, duration_minutes: change.duration_minutes })),
      );
    }
  } catch (e) {
    console.error("[interventionTypesSync] propagateSoinChange failed:", e);
  }
}

```

### lib/useOtherSpaceInterventions.ts

```ts
import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { normalizePhone } from "./phone";
import { getVisitorSession } from "./visitorSession";
import type { Reservation } from "./types";

export interface OtherSpaceIntervention extends Reservation {
  patientName: string;
  // PIN de la fiche intervenant DANS L'ESPACE DE CE SOIN (r.space_id) —
  // distinct du PIN de session courant (autre espace) : requis pour ouvrir
  // InterventionEditFlow sur ce soin (voir home/slots.tsx, long-press sur la
  // bannière violette "Soin déjà programmé avec...").
  pin: string;
}

// Soins "Intervention" de CET intervenant (même téléphone, cf.
// book_intervention/INTERVENTION_OVERLAP_OTHER_SPACE) dans TOUS ses AUTRES
// espaces patients — même requête que app/(visitor)/soins.tsx (onglet
// Planning), réutilisée ici côté Créneaux (home/slots.tsx) pour :
// 1. prévenir immédiatement d'un chevauchement avant même d'ouvrir le popup
//    de réservation (InterventionBookingFlow.openBooking) ;
// 2. teinter en violet les créneaux déjà occupés ailleurs (VisitorSlotsList).
// Pas d'abonnement realtime (comme soins.tsx) : un simple refresh au montage/
// changement de fiche suffit, ce n'est qu'une aide visuelle — la garde
// déterminante reste côté serveur (RPC book_intervention).
export function useOtherSpaceInterventions(
  intervenantProfileId: string | null,
  currentSpaceId: string | null,
): { otherSpaceInterventions: OtherSpaceIntervention[]; refresh: () => Promise<void> } {
  const [list, setList] = useState<OtherSpaceIntervention[]>([]);

  const load = useCallback(async () => {
    if (!intervenantProfileId) {
      setList([]);
      return;
    }
    const session = await getVisitorSession();
    let tel = session?.telephone;
    if (!tel) {
      const { data } = await supabase
        .from("intervenant_profiles")
        .select("telephone")
        .eq("id", intervenantProfileId)
        .maybeSingle();
      tel = data?.telephone ?? "";
    }
    const normalized = normalizePhone(tel ?? "");
    if (normalized.length < 6) {
      setList([]);
      return;
    }

    const { data: profileData } = await supabase
      .from("intervenant_profiles")
      .select("id, space_id, pin, patient_spaces(patient_firstname, patient_lastname)")
      .eq("telephone", normalized);
    const rows = (profileData as any as {
      id: string;
      space_id: string;
      pin: string;
      patient_spaces: { patient_firstname: string; patient_lastname: string } | null;
    }[]) ?? [];
    const otherRows = rows.filter((r) => r.space_id !== currentSpaceId);
    const ids = otherRows.map((r) => r.id);
    if (ids.length === 0) {
      setList([]);
      return;
    }

    const nameBySpaceId: Record<string, string> = {};
    const pinBySpaceId: Record<string, string> = {};
    otherRows.forEach((r) => {
      if (r.patient_spaces) {
        nameBySpaceId[r.space_id] = `${r.patient_spaces.patient_firstname} ${r.patient_spaces.patient_lastname}`;
      }
      pinBySpaceId[r.space_id] = r.pin;
    });

    const { data: resaData } = await supabase
      .from("reservations")
      .select("*")
      .in("intervenant_profile_id", ids)
      .eq("type", "Intervention");
    setList((resaData || []).map((r) => ({ ...r, patientName: nameBySpaceId[r.space_id] ?? "", pin: pinBySpaceId[r.space_id] ?? "" })));
  }, [intervenantProfileId, currentSpaceId]);

  useEffect(() => {
    load();
  }, [load]);

  return { otherSpaceInterventions: list, refresh: load };
}

```

### lib/intervenantSpaceSwitch.ts

```ts
import type { useRouter } from "expo-router";
import { saveVisitorSession } from "@/lib/visitorSession";

export interface LinkedIntervenantSpaceRow {
  id: string;
  space_id: string;
  prenom: string;
  nom: string;
  pin: string;
  patient_spaces: { invite_token: string } | null;
}

// Bascule la session locale + navigue vers le calendrier d'un autre espace
// patient auquel cet intervenant est rattaché (même téléphone) — partagé
// entre app/(visitor)/account.tsx ("Mes Patients") et
// components/PatientsList.tsx (onglet "Patients"), pour ne garder qu'une
// seule version de cette logique de pivot.
export async function switchToLinkedSpace(
  row: LinkedIntervenantSpaceRow,
  telephone: string,
  router: ReturnType<typeof useRouter>,
  // Jour à cibler une fois arrivé sur le calendrier du nouvel espace — voir
  // app/(visitor)/home/calendar.tsx (param focusIso) qui, en le recevant,
  // enchaîne directement vers home/slots.tsx sur ce jour. Utilisé par le
  // Planning global intervenant (app/(visitor)/soins.tsx) quand on tape un
  // jour pour un patient dont l'espace n'est pas déjà l'espace actif.
  focusIso?: string,
  // Paramètres additionnels à faire suivre jusqu'à home/slots.tsx une fois
  // focusIso consommé (voir home/calendar.tsx) — utilisé par le Planning
  // global intervenant pour marquer "returnTo=planning" + le patient réservé
  // (returnSpaceId), afin qu'une fois le soin réservé InterventionBookingFlow
  // ramène sur l'onglet Planning avec ce patient présélectionné plutôt que
  // sur le calendrier de l'espace.
  extraParams?: Record<string, string>,
): Promise<void> {
  if (!row.patient_spaces) return;
  await saveVisitorSession({
    token: row.patient_spaces.invite_token,
    spaceId: row.space_id,
    prenom: row.prenom,
    nom: row.nom,
    pin: row.pin,
    role: "intervenant",
    intervenantProfileId: row.id,
    telephone,
    motto: "",
    localPhotoUri: null,
  });
  router.replace({
    pathname: "/(visitor)/home/calendar",
    params: {
      spaceId: row.space_id,
      token: row.patient_spaces.invite_token,
      ...(focusIso ? { focusIso } : {}),
      ...(extraParams ?? {}),
    },
  } as any);
}

```

### lib/nightIntervenantAuth.ts

```ts
import { supabase } from "./supabase";

// N'a d'effet que lorsque slot_config.night_intervenant_mode = "some" —
// sinon ("disabled"/"all") aucun lookup n'est nécessaire, voir
// (visitor)/home/nights.tsx et (visitor)/home/slots.tsx. Contrairement aux
// visiteurs (lib/nightVisitorAuth.ts), l'intervenant a un identifiant de
// compte stable (intervenant_profiles.id) — pas besoin de matcher par
// prénom/nom.
export async function isIntervenantAuthorizedForNight(spaceId: string, intervenantProfileId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("night_authorized_intervenants")
    .select("intervenant_profile_id")
    .eq("space_id", spaceId)
    .eq("intervenant_profile_id", intervenantProfileId)
    .maybeSingle();
  if (error) {
    console.error("[nightIntervenantAuth] select failed:", error);
    return false;
  }
  return !!data;
}

```

### app/auth/intervenant-entry.tsx

```tsx
import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { themes } from "@/lib/themes";
import { enterByToken, enterByDossierCode, completeIntervenantEntry } from "@/lib/visitorEntry";

const C = themes.dark;

// Quasi-copie de visitor-entry.tsx : même lien/code d'invitation, seul le
// rôle stocké en session diffère (voir completeIntervenantEntry). Un
// intervenant ne peut entrer que si l'admin a activé le Planning des
// intervenants pour cet espace (patient_spaces.intervenants_enabled).
//
// Deux méthodes d'accès, pour ne pas obliger l'intervenant à recopier un
// lien depuis un SMS/email sur son téléphone perso : le code dossier (court,
// dictable à l'oral) en premier, ou le lien d'invitation classique — préempli
// si l'écran est ouvert via un lien contenant déjà ?token=.
export default function IntervenantEntryScreen() {
  const router = useRouter();
  const { token: prefilledToken } = useLocalSearchParams<{ token?: string }>();
  const [mode, setMode] = useState<"code" | "link">("code");
  const [token, setToken] = useState("");
  const [dossierCode, setDossierCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (prefilledToken) {
      setToken(prefilledToken);
      setMode("link");
    }
  }, [prefilledToken]);

  async function handleResult(result: Awaited<ReturnType<typeof enterByToken>>) {
    if (!result.ok) {
      if (result.reason === "inactive") {
        Alert.alert(
          "Espace inactif",
          result.patientFirstname
            ? `L'espace pour ${result.patientFirstname} n'est pas encore actif.`
            : "Cet espace n'est pas encore actif.",
        );
      } else {
        Alert.alert("Introuvable", "Ce lien ou ce code n'existe pas ou a expiré.");
      }
      return;
    }

    if (!result.intervenantsEnabled) {
      Alert.alert(
        "Fonctionnalité non activée",
        "L'organisateur n'a pas encore activé le Planning des intervenants pour cet espace. Contactez-le pour l'activer avant de continuer.",
      );
      return;
    }

    await completeIntervenantEntry(result);
    router.replace({
      pathname: "/(visitor)/home/calendar",
      params: { spaceId: result.spaceId, token: result.token },
    });
  }

  async function handleEnterByToken() {
    const t = token.trim();
    if (!t) return;
    setLoading(true);
    const result = await enterByToken(t);
    setLoading(false);
    await handleResult(result);
  }

  async function handleEnterByCode() {
    const c = dossierCode.trim();
    if (!c) return;
    setLoading(true);
    const result = await enterByDossierCode(c);
    setLoading(false);
    await handleResult(result);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Accès intervenant</Text>

        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === "code" && styles.modeBtnActive]}
            onPress={() => setMode("code")}
            activeOpacity={0.85}
          >
            <Text style={[styles.modeBtnText, mode === "code" && styles.modeBtnTextActive]}>Code dossier</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === "link" && styles.modeBtnActive]}
            onPress={() => setMode("link")}
            activeOpacity={0.85}
          >
            <Text style={[styles.modeBtnText, mode === "link" && styles.modeBtnTextActive]}>Lien d'invitation</Text>
          </TouchableOpacity>
        </View>

        {mode === "code" ? (
          <>
            <Text style={styles.sectionLabel}>Code dossier</Text>
            <Text style={styles.subtitle}>
              Saisis le code à 7 caractères communiqué par l'organisateur — il te donnera accès à ton propre planning d'interventions.
            </Text>

            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder="EX. 7K9QXHM"
              placeholderTextColor={C.muted}
              value={dossierCode}
              onChangeText={(v) => setDossierCode(v.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={7}
              autoFocus={mode === "code"}
            />

            <TouchableOpacity
              style={[styles.btn, (!dossierCode.trim() || loading) && styles.btnDisabled]}
              onPress={handleEnterByCode}
              disabled={!dossierCode.trim() || loading}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>
                {loading ? "Vérification…" : "Accéder au planning"}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Lien d'invitation</Text>
            <Text style={styles.subtitle}>
              Collez le même lien d'invitation que celui reçu par les visiteurs — il te donnera accès à ton propre planning d'interventions.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Lien d'invitation…"
              placeholderTextColor={C.muted}
              value={token}
              onChangeText={(v) => {
                const parsed = v.includes("token=")
                  ? v.split("token=")[1].split("&")[0]
                  : v;
                setToken(parsed);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
            />

            <TouchableOpacity
              style={[styles.btn, (!token.trim() || loading) && styles.btnDisabled]}
              onPress={handleEnterByToken}
              disabled={!token.trim() || loading}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>
                {loading ? "Vérification…" : "Accéder au planning"}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.hint}>
          AvecToi prend soin de vos données en les sécurisant. Aucune de vos
          données ne seront jamais vendues ou communiquées à des Tiers.
        </Text>
        <Text style={[styles.hint, styles.hintStacked]}>
          Merci pour votre confiance
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: C.bg,
    padding: 24,
    paddingTop: 60,
    paddingBottom: 48,
  },
  back: { marginBottom: 32 },
  backText: { fontFamily: "DM_Sans_400Regular", color: C.muted, fontSize: 15 },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 28,
    color: "#fff",
    marginBottom: 24,
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 4,
    marginBottom: 24,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: "center",
  },
  modeBtnActive: {
    backgroundColor: C.accent,
  },
  modeBtnText: {
    fontFamily: "DM_Sans_600SemiBold",
    fontSize: 13,
    color: C.muted,
  },
  modeBtnTextActive: {
    color: "#fff",
  },
  sectionLabel: {
    fontFamily: "DM_Sans_700Bold",
    fontSize: 15,
    color: "#fff",
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: "DM_Sans_400Regular",
    fontSize: 14,
    color: C.muted,
    lineHeight: 22,
    marginBottom: 16,
  },
  input: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 14,
    color: C.text,
    fontFamily: "DM_Sans_400Regular",
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  codeInput: {
    minHeight: 0,
    fontFamily: "DM_Sans_700Bold",
    fontSize: 20,
    letterSpacing: 3,
    textAlign: "center",
    textAlignVertical: "center",
  },
  btn: {
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    fontFamily: "DM_Sans_700Bold",
    fontSize: 16,
    color: "#fff",
  },
  hint: {
    fontFamily: "DM_Sans_400Regular",
    fontSize: 12,
    color: C.muted,
    textAlign: "center",
    marginTop: 32,
    lineHeight: 20,
  },
  hintStacked: { marginTop: 10 },
});

```

### app/(admin)/intervenants.tsx

```tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSpace } from "@/lib/SpaceContext";
import { supabase } from "@/lib/supabase";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { getMonday, getDayStatus, isReservationDatePast, addDays } from "@/lib/slotUtils";
import { deleteLinkedCalendarEvent } from "@/lib/calendarSync";
import AdminAddIntervention, { type AdminAddInterventionHandle } from "@/components/AdminAddIntervention";
import AdminEditReservation, { type AdminEditReservationHandle } from "@/components/AdminEditReservation";
import DeleteReservationConfirm, { type DeleteReservationConfirmHandle } from "@/components/DeleteReservationConfirm";
import IntervenantProfileModal from "@/components/IntervenantProfileModal";
import SoinsPlanifiesBlock from "@/components/SoinsPlanifiesBlock";
import SegmentedSwitch from "@/components/SegmentedSwitch";
import SoinsPeriodBlock from "@/components/SoinsPeriodBlock";
import DaySoinsModal from "@/components/DaySoinsModal";
import SlotOccupantsModal, { type SelectedSlot } from "@/components/SlotOccupantsModal";
import IntervenantGlobalCalendar from "@/components/IntervenantGlobalCalendar";
import PatientColorLegend from "@/components/PatientColorLegend";
import { getPatientColor } from "@/lib/themes";
import { metierLabel } from "@/lib/metiers";
import { soinIconName } from "@/lib/soinIcons";
import PatientAvatar from "@/components/PatientAvatar";
import type { Reservation, IntervenantProfile, InterventionType } from "@/lib/types";

// Écran admin dédié "Planning des intervenants" — n'affiche que les
// réservations type='Intervention' (jamais les visites), avec droits
// complets d'édition/suppression (réutilise AdminEditReservation/
// DeleteReservationConfirm, étendus pour accepter ce type — voir
// components/AdminEditReservation.tsx). Accessible depuis Réglages quand le
// toggle intervenants_enabled est actif (voir (admin)/settings.tsx).
export default function AdminIntervenantsScreen() {
  const router = useRouter();
  const { theme: C } = useDisplayMode();
  const { space, slotConfig, reservations, refreshReservations, getSlotsForDate, getConfigForDate } = useSpace();

  const addRef = useRef<AdminAddInterventionHandle>(null);
  const editRef = useRef<AdminEditReservationHandle>(null);
  const deleteRef = useRef<DeleteReservationConfirmHandle>(null);

  const startDate = space ? new Date(space.start_date + "T00:00:00") : new Date();
  const [planningView, setPlanningView] = useState<"mensuel" | "hebdo">("mensuel");
  const [weekAnchor, setWeekAnchor] = useState(() => getMonday(new Date()));
  const [monthAnchor, setMonthAnchor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [dayPopupIso, setDayPopupIso] = useState<string | null>(null);
  // Filtre "Tous" (null) / un seul intervenant (profile id) — piloté par un
  // tap sur la légende (PatientColorLegend, réutilisée telle quelle). "Tous"
  // reproduit exactement l'ancienne vue unique de cet écran (voir
  // filteredReservations plus bas). Entraîne le calendrier, le planning
  // mensuel/hebdo et le popup jour à ne montrer que les soins de cet
  // intervenant.
  const [selectedIntervenantId, setSelectedIntervenantId] = useState<string | null>(null);
  const [viewingProfile, setViewingProfile] = useState<IntervenantProfile | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  // Replié par défaut — reléguée en bas d'écran, derrière Planning et Soins
  // planifiés (voir components/IntervenantsBlock.tsx pour le même pattern).
  const [fichesOpen, setFichesOpen] = useState(false);

  const [profiles, setProfiles] = useState<IntervenantProfile[]>([]);
  const [typesByProfile, setTypesByProfile] = useState<Record<string, InterventionType[]>>({});
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  const [toast, setToast] = useState("");
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  const refreshProfiles = useCallback(async () => {
    if (!space) return;
    setLoadingProfiles(true);
    const { data: profileData } = await supabase
      .from("intervenant_profiles")
      .select("*")
      .eq("space_id", space.id)
      .order("prenom", { ascending: true });
    const list = profileData || [];
    setProfiles(list);

    if (list.length > 0) {
      const { data: typeData } = await supabase
        .from("intervention_types")
        .select("*")
        .in("intervenant_profile_id", list.map((p) => p.id))
        .order("created_at", { ascending: true });
      const grouped: Record<string, InterventionType[]> = {};
      for (const t of typeData || []) {
        (grouped[t.intervenant_profile_id] ??= []).push(t);
      }
      setTypesByProfile(grouped);
    } else {
      setTypesByProfile({});
    }
    setLoadingProfiles(false);
  }, [space]);

  useEffect(() => { refreshProfiles(); }, [refreshProfiles]);

  if (!space) return null;

  const interventionDates = new Set(reservations.filter((r) => r.type === "Intervention").map((r) => r.date));

  // Une couleur par intervenant (même principe que IntervenantGlobalCalendar
  // côté visiteur, voir soins.tsx) — profils déjà triés par prenom
  // (refreshProfiles), donc l'ordre (et la couleur) de chacun reste stable.
  const colorByIntervenantId: Record<string, string> = {};
  const legendItems: { id: string; name: string; color: string }[] = [];
  profiles.forEach((p, i) => {
    const color = getPatientColor(i);
    colorByIntervenantId[p.id] = color;
    legendItems.push({ id: p.id, name: `${p.prenom} ${p.nom}`, color });
  });

  // "Tous" (selectedIntervenantId === null) reproduit exactement l'ancienne
  // vue unique de cet écran, avant l'ajout du filtre par intervenant.
  const filteredReservations = selectedIntervenantId
    ? reservations.filter((r) => r.intervenant_profile_id === selectedIntervenantId)
    : reservations;

  const dayPopupDay = dayPopupIso ? new Date(dayPopupIso + "T00:00:00") : null;
  const dayPopupInterventions = dayPopupIso
    ? filteredReservations.filter((r) => r.type === "Intervention" && r.date === dayPopupIso).sort((a, b) => a.creneau.localeCompare(b.creneau))
    : [];
  const dayPopupConfig = dayPopupIso ? (getConfigForDate(dayPopupIso) ?? slotConfig) : null;
  const dayPopupSlots = dayPopupIso ? getSlotsForDate(dayPopupIso) : [];
  // Le popup jour (grille de créneaux + statut) reste basé sur TOUTES les
  // réservations, quel que soit le filtre intervenant — l'occupation réelle
  // du jour ne dépend pas de qui on regarde. Seule la liste d'interventions
  // listée en dessous (dayPopupInterventions) suit le filtre.
  const dayPopupStatus =
    dayPopupIso && dayPopupDay && dayPopupConfig
      ? getDayStatus(reservations, dayPopupIso, dayPopupDay, dayPopupConfig, dayPopupSlots, startDate, "Intervention")
      : "empty";

  function handleDelete(r: Reservation) {
    deleteRef.current?.open(r);
  }

  async function handleConfirmDelete(ids: string[]) {
    const { error, count } = await supabase.from("reservations").delete({ count: "exact" }).in("id", ids);
    if (error || count !== ids.length) {
      showToast("Erreur : suppression non enregistrée en base.");
      return;
    }
    await deleteLinkedCalendarEvent(ids[0]);
    await refreshReservations();
    showToast("Intervention supprimée ✓");
  }

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <TouchableOpacity style={styles.back} onPress={() => router.push("/(admin)/settings")}>
          <Text style={[styles.backText, { color: C.orange }]}>← Retour</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>🩺 Planning des intervenants</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.sectionTitle, { color: C.gold }]}>Planning</Text>

        <View style={{ marginBottom: 14 }}>
          <SegmentedSwitch
            value={planningView === "hebdo"}
            onChange={(v) => setPlanningView(v ? "hebdo" : "mensuel")}
            leftLabel="Mensuel"
            rightLabel="Hebdo"
            C={C}
            minWidthRatio={0.5}
          />
        </View>

        <IntervenantGlobalCalendar
          C={C}
          reservations={filteredReservations}
          colorByGroupId={colorByIntervenantId}
          getGroupId={(r) => r.intervenant_profile_id ?? ""}
          view={planningView}
          weekAnchor={weekAnchor}
          monthAnchor={monthAnchor}
          onMonthChange={setMonthAnchor}
          onWeekPrev={() => setWeekAnchor(addDays(weekAnchor, -7))}
          onWeekNext={() => setWeekAnchor(addDays(weekAnchor, 7))}
          selectedIso={dayPopupIso ?? ""}
          onDayPress={(iso) => { if (!isReservationDatePast(iso)) setDayPopupIso(iso); }}
          onDayLongPress={(iso) => { if (!isReservationDatePast(iso)) addRef.current?.open(iso); }}
        />
        <View style={{ marginBottom: 14 }}>
          <PatientColorLegend C={C} items={legendItems} selectedId={selectedIntervenantId} onSelect={setSelectedIntervenantId} />
        </View>

        <SoinsPeriodBlock
          C={C}
          reservations={filteredReservations}
          view={planningView}
          weekAnchor={weekAnchor}
          onWeekChange={setWeekAnchor}
          monthAnchor={monthAnchor}
          onMonthChange={setMonthAnchor}
          onDayPress={(iso) => { if (!isReservationDatePast(iso)) setDayPopupIso(iso); }}
        />

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: C.orange }]}
          onPress={() => addRef.current?.open()}
        >
          <Text style={styles.addBtnText}>+ Ajouter une intervention</Text>
        </TouchableOpacity>

        <SoinsPlanifiesBlock spaceId={space.id} C={C} filterIntervenantProfileId={selectedIntervenantId} includePast chronological />

        <Text style={[styles.sectionTitle, { color: C.gold, marginTop: 24 }]}>Fiches intervenants</Text>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <TouchableOpacity onPress={() => setFichesOpen((o) => !o)} activeOpacity={0.7} style={styles.headerRow}>
            <Text style={[styles.emptyText, { color: C.muted, flex: 1 }]}>
              {profiles.length === 0 ? "Aucun intervenant n'a encore rejoint cet espace." : `${profiles.length} intervenant${profiles.length > 1 ? "s" : ""} enregistré${profiles.length > 1 ? "s" : ""}.`}
            </Text>
            <Text style={[styles.toggleIcon, { color: C.muted }]}>{fichesOpen ? "▾" : "▸"}</Text>
          </TouchableOpacity>

          {fichesOpen && (
            <View style={{ marginTop: 10 }}>
              {loadingProfiles ? null : profiles.length === 0 ? null : (
                profiles.map((p) => (
                  <View key={p.id} style={[styles.subCard, { borderColor: C.border }]}>
                    <View style={styles.profileRow}>
                      <TouchableOpacity style={styles.profileRowTap} activeOpacity={0.7} onPress={() => setViewingProfile(p)}>
                        <PatientAvatar photoUrl={p.photo} firstname={p.prenom} lastname={p.nom} metier={p.metier} size={40} C={C} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.profileName, { color: C.text }]}>{p.prenom} {p.nom}</Text>
                          {!!p.metier && (
                            <Text style={[styles.profileMetier, { color: C.muted }]}>
                              {metierLabel(p.metier)}
                              {p.metier_secondaire ? ` · ${metierLabel(p.metier_secondaire)}` : ""}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    </View>
                    {(typesByProfile[p.id] || []).length === 0 ? (
                      <Text style={[styles.emptyText, { color: C.muted }]}>Aucun type d'intervention renseigné.</Text>
                    ) : (
                      <View style={styles.typeChips}>
                        {(typesByProfile[p.id] || []).map((t) => (
                          <View key={t.id} style={[styles.typeChip, { borderColor: C.border, backgroundColor: C.bg }]}>
                            <Ionicons name={soinIconName(t.label)} size={13} color={C.gold} />
                            <Text style={[styles.typeChipText, { color: C.text }]}>{t.label} · {t.duration_minutes} min</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {space && slotConfig && (
        <AdminAddIntervention
          ref={addRef}
          space={space}
          slotConfig={slotConfig}
          getSlotsForDate={getSlotsForDate}
          startDate={startDate}
          interventionDates={interventionDates}
          reservations={reservations}
          onAdded={async () => { await refreshReservations(); showToast("Intervention ajoutée ✓"); }}
          C={C}
        />
      )}

      <AdminEditReservation
        ref={editRef}
        onSaved={async () => { await refreshReservations(); showToast("Intervention modifiée ✓"); }}
        onDelete={handleDelete}
        C={C}
      />

      <DeleteReservationConfirm
        ref={deleteRef}
        reservations={reservations}
        onConfirm={handleConfirmDelete}
        C={C}
      />

      <SlotOccupantsModal
        C={C}
        selected={selectedSlot}
        onClose={() => setSelectedSlot(null)}
        readOnly={false}
        onEdit={(r) => editRef.current?.open(r)}
        onDelete={handleDelete}
      />

      <DaySoinsModal
        C={C}
        visible={!!dayPopupIso}
        iso={dayPopupIso}
        day={dayPopupDay}
        config={dayPopupConfig}
        daySlots={dayPopupSlots}
        reservations={reservations}
        dayInterventions={dayPopupInterventions}
        status={dayPopupStatus}
        onClose={() => setDayPopupIso(null)}
        onSlotPress={(slotIso, slot, occupants) => setSelectedSlot({ iso: slotIso, slot, occupants })}
        onEdit={(r) => editRef.current?.open(r)}
        onDelete={handleDelete}
        onAddIntervention={() => dayPopupIso && addRef.current?.open(dayPopupIso)}
      />

      {space && viewingProfile && (
        <IntervenantProfileModal
          visible={!!viewingProfile}
          onClose={() => setViewingProfile(null)}
          spaceId={space.id}
          intervenantProfileId={viewingProfile.id}
          prenom={viewingProfile.prenom}
          nom={viewingProfile.nom}
          C={C}
          isAdmin
        />
      )}

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
  header: { paddingHorizontal: 20, paddingTop: 42, paddingBottom: 16, borderBottomWidth: 1 },
  back: { alignSelf: "flex-start", marginBottom: 10 },
  backText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  headerTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 20 },

  scroll: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },

  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  toggleIcon: { fontSize: 14 },
  subCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  profileRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  profileRowTap: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  profileName: { fontFamily: "DM_Sans_700Bold", fontSize: 15 },
  profileMetier: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 1 },
  typeChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  typeChip: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10 },
  typeChipText: { fontFamily: "DM_Sans_400Regular", fontSize: 12 },

  addBtn: { borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 6, marginBottom: 24 },
  addBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },

  toast: { position: "absolute", bottom: 24, alignSelf: "center", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  toastText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, color: "#fff" },
});

```

### app/(visitor)/intervenants.tsx

```tsx
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useVisitorSpace } from "@/lib/VisitorContext";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import IntervenantsList from "@/components/IntervenantsList";

// Onglet racine dédié au rôle intervenant (remplace "Souvenirs" dans la barre
// d'onglets, voir app/(visitor)/_layout.tsx) — liste des intervenants de
// l'espace, avatar photo + fiche en lecture seule.
export default function VisitorIntervenantsScreen() {
  const { space } = useVisitorSpace();
  const { theme: C } = useDisplayMode();

  if (!space) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <Text style={[styles.title, { color: C.text }]}>🩺 Intervenants</Text>
      <View style={styles.body}>
        <IntervenantsList spaceId={space.id} C={C} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 52 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, textAlign: "center", marginBottom: 12 },
  body: { flex: 1, paddingHorizontal: 20 },
});

```

### app/(visitor)/patients.tsx

```tsx
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useVisitorSpace } from "@/lib/VisitorContext";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import PatientsList from "@/components/PatientsList";

// Onglet racine dédié au rôle intervenant (remplace "Soutien" dans la barre
// d'onglets, voir app/(visitor)/_layout.tsx) — liste des patients auxquels
// l'intervenant est rattaché, même présentation que intervenants.tsx.
export default function VisitorPatientsScreen() {
  const { space } = useVisitorSpace();
  const { theme: C } = useDisplayMode();

  if (!space) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <Text style={[styles.title, { color: C.text }]}>🩺 Patients</Text>
      <View style={styles.body}>
        <PatientsList C={C} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 52 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, textAlign: "center", marginBottom: 12 },
  body: { flex: 1, paddingHorizontal: 20 },
});

```

### app/(visitor)/soins.tsx

```tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Linking } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { useVisitorSpace } from "@/lib/VisitorContext";
import { getVisitorSession } from "@/lib/visitorSession";
import { normalizePhone } from "@/lib/phone";
import { careLocationDetail, mapsUrlForSpace } from "@/lib/address";
import { switchToLinkedSpace, type LinkedIntervenantSpaceRow } from "@/lib/intervenantSpaceSwitch";
import { getMonday, getWeekDates, getDaysInMonth, toISO, addDays } from "@/lib/slotUtils";
import { getPatientColor } from "@/lib/themes";
import SegmentedSwitch from "@/components/SegmentedSwitch";
import IntervenantGlobalCalendar from "@/components/IntervenantGlobalCalendar";
import PatientColorLegend from "@/components/PatientColorLegend";
import PlanningDuJourBlock from "@/components/PlanningDuJourBlock";
import SoinsPeriodBlock from "@/components/SoinsPeriodBlock";
import SoinsPlanifiesBlock from "@/components/SoinsPlanifiesBlock";
import InterventionEditFlow, { type InterventionEditFlowHandle } from "@/components/InterventionEditFlow";
import SoinActionModal from "@/components/SoinActionModal";
import BookSlotPromptModal from "@/components/BookSlotPromptModal";
import type { Reservation } from "@/lib/types";

interface ProfileRow extends LinkedIntervenantSpaceRow {
  // Date de rattachement de l'intervenant à cet espace patient — sert à trier
  // les profils par ordre d'arrivée (voir colorBySpaceId plus bas) plutôt que
  // par space_id (UUID, ordre non chronologique), pour que la couleur d'un
  // patient déjà présent ne change jamais quand un nouveau patient arrive.
  created_at: string;
  patient_spaces: {
    invite_token: string;
    patient_firstname: string;
    patient_lastname: string;
    home_care_mode: boolean;
    hospital_name: string;
    hospital_service: string | null;
    hospital_room: string | null;
    hospital_address: string;
    hospital_address_line2: string | null;
    hospital_postal_code: string | null;
    hospital_city: string | null;
    hospital_country: string | null;
    hospital_maps_url: string;
    home_address: string | null;
    home_address_line2: string | null;
    home_postal_code: string | null;
    home_city: string | null;
    home_country: string | null;
    home_maps_url: string | null;
  } | null;
}

// Onglet "Planning" de l'intervenant — remplace l'ancien onglet "Soins"
// (Mes soins/CRUD des types d'intervention, déjà disponible par ailleurs
// depuis "Mon compte → Ma fiche intervenant", voir IntervenantFicheModal.tsx,
// et liste des soins d'un seul espace). Reprend la logique cross-space de
// l'ancienne page home/mes-espaces-patients.tsx (même téléphone = même
// intervenant à travers plusieurs espaces patients) et y ajoute un
// calendrier global coloré par patient (IntervenantGlobalCalendar) + sa
// légende (PatientColorLegend), pour repérer en un coup d'œil un
// chevauchement entre deux espaces avant même de réserver — la garde
// serveur (book_intervention, exception INTERVENTION_OVERLAP_OTHER_SPACE)
// reste la protection déterminante, ce calendrier n'est qu'une aide visuelle.
export default function VisitorPlanningScreen() {
  const router = useRouter();
  const { theme: C } = useDisplayMode();
  const { space: activeSpace, setSelectedDay } = useVisitorSpace();
  // Retour depuis une réservation faite via le popup "Réserver un créneau"
  // (voir handleConfirmBookSlot ci-dessous → home/slots.tsx →
  // InterventionBookingFlow "← Retour au planning") — présélectionne le
  // patient pour qui le soin vient d'être réservé, une seule fois.
  const { focusSpaceId } = useLocalSearchParams<{ focusSpaceId?: string }>();
  const focusSpaceHandled = useRef(false);
  const [loading, setLoading] = useState(true);
  const [telephone, setTelephone] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  // Soins des AUTRES intervenants (même espaces patients que moi, tout
  // intervenant confondu) — chargés à part de `reservations` (mes soins à
  // moi uniquement) pour rester optionnels : n'entrent dans les blocs
  // "Planning du jour"/"Planning mensuel/hebdo" que si showOtherIntervenants
  // est actif (bouton sur la ligne de PlanningDuJourBlock). Le calendrier
  // global (IntervenantGlobalCalendar) au-dessus n'en tient jamais compte.
  const [otherIntervenantsReservations, setOtherIntervenantsReservations] = useState<Reservation[]>([]);
  const [showOtherIntervenants, setShowOtherIntervenants] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  // Filtre "Tous" (null) / un seul patient (space_id) — piloté par un tap
  // sur la légende (PatientColorLegend). Entraîne le calendrier ET les blocs
  // de jours planifiés en dessous à ne montrer que ce patient, et permet de
  // réserver pour lui en tapant un jour (voir handleCalendarDayPress).
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  // Jour retenu par le calendrier (ISO) — aujourd'hui par défaut, mis à jour
  // à chaque tap sur une case (voir handleCalendarDayPress). Pilote le bloc
  // "Planning du jour" ci-dessous, qui affiche les soins de ce seul jour ;
  // les autres jours restent dans la rubrique Planning mensuel/hebdo.
  const [selectedIso, setSelectedIso] = useState<string>(() => toISO(new Date()));
  // Soin tapé dans un des blocs sous le calendrier (Planning du jour,
  // Planning mensuel/hebdo, Autres soins planifiés) — non-null tant que le
  // popup d'action (Modifier / Y Aller / Fermer, voir SoinActionModal) est
  // ouvert. Un seul état partagé par les 3 blocs plutôt qu'un par bloc,
  // puisqu'un seul popup peut être ouvert à la fois.
  const [pendingSoin, setPendingSoin] = useState<Reservation | null>(null);
  // Appui prolongé sur une case du calendrier — ISO du jour ciblé tant que le
  // popup "Réserver un créneau" (handleCalendarDayLongPress) est ouvert, null
  // sinon. Distinct de selectedIso, qui lui est mis à jour dès le tap simple.
  const [bookPromptIso, setBookPromptIso] = useState<string | null>(null);

  const [planningView, setPlanningView] = useState<"mensuel" | "hebdo">("mensuel");
  const [weekAnchor, setWeekAnchor] = useState(() => getMonday(new Date()));
  const [monthAnchor, setMonthAnchor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const editFlowRef = useRef<InterventionEditFlowHandle>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const session = await getVisitorSession();
    if (!session?.intervenantProfileId) {
      setLoading(false);
      return;
    }
    let tel = session.telephone;
    if (!tel) {
      const { data } = await supabase
        .from("intervenant_profiles")
        .select("telephone")
        .eq("id", session.intervenantProfileId)
        .maybeSingle();
      tel = data?.telephone ?? "";
    }
    const normalized = normalizePhone(tel);
    setTelephone(tel);
    if (normalized.length < 6) {
      setProfiles([]);
      setReservations([]);
      setLoading(false);
      return;
    }
    const { data: profileData, error } = await supabase
      .from("intervenant_profiles")
      .select(
        "id, space_id, prenom, nom, pin, created_at, patient_spaces(invite_token, patient_firstname, patient_lastname, home_care_mode, hospital_name, hospital_service, hospital_room, hospital_address, hospital_address_line2, hospital_postal_code, hospital_city, hospital_country, hospital_maps_url, home_address, home_address_line2, home_postal_code, home_city, home_country, home_maps_url)",
      )
      .eq("telephone", normalized)
      .order("created_at", { ascending: true });
    if (error) console.error("[Planning] intervenant_profiles select failed:", error);
    const rows = (profileData as any as ProfileRow[]) ?? [];
    setProfiles(rows);

    const ids = rows.map((r) => r.id);
    if (ids.length > 0) {
      const { data: resaData } = await supabase
        .from("reservations")
        .select("*")
        .in("intervenant_profile_id", ids)
        .eq("type", "Intervention");
      setReservations(resaData || []);
    } else {
      setReservations([]);
    }

    const spaceIds = rows.map((r) => r.space_id);
    if (spaceIds.length > 0) {
      const { data: allSpaceResa } = await supabase
        .from("reservations")
        .select("*")
        .eq("type", "Intervention")
        .in("space_id", spaceIds);
      const ownIdSet = new Set(ids);
      setOtherIntervenantsReservations((allSpaceResa || []).filter((r) => !ownIdSet.has(r.intervenant_profile_id ?? "")));
    } else {
      setOtherIntervenantsReservations([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // "Autres intervenants" n'a de sens que patient par patient (mélanger
  // plusieurs patients à la fois rendrait le bloc illisible) — désactivé
  // automatiquement dès qu'on revient en mode "Tous" (voir bouton masqué
  // ci-dessous, PlanningDuJourBlock). Sans effet si un seul patient est
  // rattaché : dans ce cas "Tous" et "ce patient" sont équivalents, donc le
  // bouton reste affiché (toujours inactif par défaut, l'utilisateur clique
  // s'il veut voir).
  useEffect(() => {
    if (!selectedSpaceId && profiles.length !== 1) setShowOtherIntervenants(false);
  }, [selectedSpaceId, profiles.length]);

  useEffect(() => {
    if (focusSpaceHandled.current || !focusSpaceId || profiles.length === 0) return;
    focusSpaceHandled.current = true;
    if (profiles.some((p) => p.space_id === focusSpaceId)) setSelectedSpaceId(focusSpaceId);
  }, [focusSpaceId, profiles]);

  // En Hebdo, dès qu'on change de semaine (ou qu'on bascule sur Hebdo), le
  // curseur jour saute automatiquement sur le premier soin de la semaine
  // affichée — le bloc "Planning du jour" en dessous suit alors sans action
  // supplémentaire. Si la semaine n'a aucun soin, on laisse selectedIso tel
  // quel (pas d'instruction pour ce cas). Filtré sur le patient sélectionné
  // dans la légende, comme le reste de l'onglet (voir displayReservations).
  useEffect(() => {
    if (planningView !== "hebdo") return;
    const weekIsos = getWeekDates(weekAnchor).map(toISO);
    const pool = selectedSpaceId ? reservations.filter((r) => r.space_id === selectedSpaceId) : reservations;
    const firstSoinIso = weekIsos.find((iso) => pool.some((r) => r.date === iso));
    if (firstSoinIso) setSelectedIso(firstSoinIso);
  }, [planningView, weekAnchor, selectedSpaceId, reservations]);

  const locationBySpaceId: Record<string, string> = {};
  const patientNameBySpaceId: Record<string, string> = {};
  const colorBySpaceId: Record<string, string> = {};
  const mapsUrlBySpaceId: Record<string, string> = {};
  const legendItems: { id: string; spaceId: string; name: string; color: string }[] = [];
  profiles.forEach((p, i) => {
    if (!p.patient_spaces) return;
    const location = careLocationDetail(p.patient_spaces);
    const name = `${p.patient_spaces.patient_firstname} ${p.patient_spaces.patient_lastname}`;
    const color = getPatientColor(i);
    locationBySpaceId[p.space_id] = location;
    patientNameBySpaceId[p.space_id] = name;
    colorBySpaceId[p.space_id] = color;
    const mapsUrl = mapsUrlForSpace(p.patient_spaces);
    if (mapsUrl) mapsUrlBySpaceId[p.space_id] = mapsUrl;
    legendItems.push({ id: p.space_id, spaceId: p.space_id, name, color });
  });
  const profileIds = profiles.map((p) => p.id);

  // Vue filtrée sur un seul patient (calendrier + blocs de jours en dessous)
  // — "Tous" (selectedSpaceId === null) garde la vérité complète.
  const displayReservations = selectedSpaceId
    ? reservations.filter((r) => r.space_id === selectedSpaceId)
    : reservations;
  const displayProfileIds = selectedSpaceId
    ? profiles.filter((p) => p.space_id === selectedSpaceId).map((p) => p.id)
    : profileIds;

  // Soins des autres intervenants, filtrés comme displayReservations
  // (patient sélectionné dans la légende) puis mélangés à mes propres soins
  // uniquement si showOtherIntervenants est actif — voir PlanningDuJourBlock/
  // SoinsPeriodBlock plus bas, seuls blocs concernés (pas le calendrier).
  const displayOtherReservations = selectedSpaceId
    ? otherIntervenantsReservations.filter((r) => r.space_id === selectedSpaceId)
    : otherIntervenantsReservations;
  const plannedReservations = showOtherIntervenants
    ? [...displayReservations, ...displayOtherReservations]
    : displayReservations;

  // Tap simple sur un jour du calendrier — se contente d'afficher les soins
  // de ce jour dans le bloc "Planning du jour" ci-dessous, sans navigation.
  function handleCalendarDayPress(iso: string) {
    setSelectedIso(iso);
  }

  // Appui prolongé sur un jour du calendrier — ouvre le popup "Réserver un
  // créneau". Si un patient précis est sélectionné dans la légende, le popup
  // ne demande qu'une confirmation ; en mode "Tous", il demande d'abord pour
  // quel patient (voir BookSlotPromptModal), impossible à deviner depuis la
  // vue cumulée. Aucune action sur un jour déjà passé — rien à réserver.
  function handleCalendarDayLongPress(iso: string) {
    if (iso < toISO(new Date())) return;
    setSelectedIso(iso);
    setBookPromptIso(iso);
  }

  // Confirmation du popup "Réserver un créneau", pour le patient choisi
  // (spaceId) — si son espace est déjà l'espace actif de la session, on
  // reste dans le même VisitorContext (comme un tap sur home/calendar.tsx).
  // Sinon on doit d'abord basculer dessus (switchToLinkedSpace), en lui
  // passant le jour ciblé pour enchaîner automatiquement vers l'écran de
  // réservation une fois arrivé (voir home/calendar.tsx, param focusIso).
  // Les params returnTo/returnSpaceId font le chemin inverse une fois le
  // soin réservé (voir home/slots.tsx, InterventionBookingFlow) pour
  // ramener sur cet onglet avec ce même patient présélectionné.
  async function handleConfirmBookSlot(spaceId: string) {
    const iso = bookPromptIso;
    setBookPromptIso(null);
    if (!iso || switchingId) return;
    const row = profiles.find((p) => p.space_id === spaceId);
    if (!row) return;
    const returnParams = { returnTo: "planning", returnSpaceId: spaceId };
    if (activeSpace?.id === spaceId) {
      setSelectedDay(new Date(iso + "T00:00:00"));
      router.navigate({ pathname: "/(visitor)/home/slots", params: returnParams } as any);
      return;
    }
    setSwitchingId(row.id);
    try {
      await switchToLinkedSpace(row, telephone ?? "", router, iso, returnParams);
    } finally {
      setSwitchingId(null);
    }
  }

  // Tap sur un soin dans un des blocs sous le calendrier — ouvre le popup
  // d'action (Modifier / Y Aller / Fermer) plutôt que d'agir directement.
  // Aucune action si ce soin appartient à un AUTRE intervenant (visible
  // uniquement quand showOtherIntervenants est actif) — seul l'intervenant
  // qui l'a réservé peut le modifier, personne d'autre ne doit même voir le
  // popup s'ouvrir.
  function openSoinActions(r: Reservation) {
    if (!profileIds.includes(r.intervenant_profile_id ?? "")) return;
    setPendingSoin(r);
  }

  function handleModifierPress() {
    const r = pendingSoin;
    setPendingSoin(null);
    if (!r) return;
    const row = profiles.find((p) => p.id === r.intervenant_profile_id);
    if (!row) return;
    editFlowRef.current?.open(r, row.pin, patientNameBySpaceId[r.space_id]);
  }

  // "Y Aller" — ouvre le lien Google Maps du lieu d'intervention (voir
  // mapsUrlForSpace, lib/address.ts), plutôt que de naviguer dans l'app.
  function handleYAllerPress() {
    const r = pendingSoin;
    setPendingSoin(null);
    if (!r) return;
    const url = mapsUrlBySpaceId[r.space_id];
    if (url) Linking.openURL(url).catch(() => {});
  }

  // Dernier jour de la période actuellement affichée par SoinsPeriodBlock —
  // "Autres soins planifiés" en dessous n'affiche que ce qui vient après,
  // pour ne pas dupliquer ce qui est déjà visible dans la grille.
  const periodDates = planningView === "hebdo" ? getWeekDates(weekAnchor) : getDaysInMonth(monthAnchor.year, monthAnchor.month);
  const periodEndIso = toISO(periodDates[periodDates.length - 1]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: C.bg, justifyContent: "center" }]}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={styles.headerTitleRow}>
        <View style={[styles.calBadge, { borderColor: C.border, backgroundColor: C.card }]}>
          <View style={[styles.calBadgeHeader, { backgroundColor: C.danger }]}>
            <Text style={styles.calBadgeMonth}>MAI</Text>
          </View>
          <Text style={[styles.calBadgeDay, { color: C.text }]}>28</Text>
        </View>
        <Text style={[styles.headerTitle, { color: C.text }]}>Planning</Text>
      </View>
      <Text style={[styles.headerSubtitle, { color: C.muted }]}>
        Tes interventions sur tous tes espaces patients.
      </Text>

      <ScrollView contentContainerStyle={styles.scroll}>
        {profileIds.length === 0 ? (
          <Text style={[styles.emptyText, { color: C.muted }]}>Aucun espace patient rattaché pour l&apos;instant.</Text>
        ) : (
          <>
            <View style={{ marginBottom: 14 }}>
              <SegmentedSwitch
                value={planningView === "hebdo"}
                onChange={(v) => setPlanningView(v ? "hebdo" : "mensuel")}
                leftLabel="Mensuel"
                rightLabel="Hebdo"
                C={C}
                minWidthRatio={0.5}
              />
            </View>

            <IntervenantGlobalCalendar
              C={C}
              reservations={displayReservations}
              colorByGroupId={colorBySpaceId}
              getGroupId={(r) => r.space_id}
              view={planningView}
              weekAnchor={weekAnchor}
              monthAnchor={monthAnchor}
              onMonthChange={setMonthAnchor}
              onWeekPrev={() => setWeekAnchor(addDays(weekAnchor, -7))}
              onWeekNext={() => setWeekAnchor(addDays(weekAnchor, 7))}
              selectedIso={selectedIso}
              onDayPress={handleCalendarDayPress}
              onDayLongPress={handleCalendarDayLongPress}
            />
            <View style={{ marginBottom: 20 }}>
              <PatientColorLegend C={C} items={legendItems} selectedId={selectedSpaceId} onSelect={setSelectedSpaceId} />
            </View>

            <PlanningDuJourBlock
              C={C}
              iso={selectedIso}
              reservations={plannedReservations.filter((r) => r.date === selectedIso)}
              patientNameBySpaceId={patientNameBySpaceId}
              locationBySpaceId={locationBySpaceId}
              onSoinPress={openSoinActions}
              showOtherIntervenants={showOtherIntervenants}
              onToggleOtherIntervenants={
                selectedSpaceId || profileIds.length === 1 ? () => setShowOtherIntervenants((v) => !v) : undefined
              }
            />

            <Text style={[styles.sectionTitle, { color: C.gold }]}>
              {planningView === "hebdo" ? "Planning hebdo" : "Planning mensuel"}
            </Text>
            <SoinsPeriodBlock
              C={C}
              reservations={plannedReservations.filter((r) => r.date !== selectedIso)}
              view={planningView}
              weekAnchor={weekAnchor}
              onWeekChange={setWeekAnchor}
              monthAnchor={monthAnchor}
              onMonthChange={setMonthAnchor}
              onDayPress={() => {}}
              patientNameBySpaceId={patientNameBySpaceId}
              locationBySpaceId={locationBySpaceId}
              onSoinPress={openSoinActions}
            />

            <SoinsPlanifiesBlock
              C={C}
              filterIntervenantProfileIds={displayProfileIds}
              locationBySpaceId={locationBySpaceId}
              patientNameBySpaceId={patientNameBySpaceId}
              includePast
              chronological
              title="Autres soins planifiés"
              excludeUpToDate={periodEndIso}
              onPressRow={(_date, r) => openSoinActions(r)}
            />
          </>
        )}
      </ScrollView>

      <InterventionEditFlow ref={editFlowRef} C={C} onSaved={load} />
      <SoinActionModal
        C={C}
        visible={!!pendingSoin}
        reservation={pendingSoin}
        patientNameBySpaceId={patientNameBySpaceId}
        locationBySpaceId={locationBySpaceId}
        onModifier={handleModifierPress}
        onYAller={handleYAllerPress}
        onClose={() => setPendingSoin(null)}
      />
      <BookSlotPromptModal
        C={C}
        visible={!!bookPromptIso}
        iso={bookPromptIso}
        selectedSpaceId={selectedSpaceId}
        legendItems={legendItems}
        patientNameBySpaceId={patientNameBySpaceId}
        onChoosePatient={handleConfirmBookSlot}
        onClose={() => setBookPromptIso(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 52 },
  headerTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  headerTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, textAlign: "center" },
  headerSubtitle: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center", marginTop: 4, marginBottom: 8, paddingHorizontal: 24 },

  // Petit picto "calendrier à effeuiller" fixé sur le 28 Mai (l'emoji 📅
  // dépend du rendu de chaque plateforme, jamais du contrôle de l'app).
  calBadge: { width: 22, height: 22, borderRadius: 5, borderWidth: 1, overflow: "hidden", alignItems: "center", justifyContent: "flex-end" },
  calBadgeHeader: { position: "absolute", top: 0, left: 0, right: 0, height: 8, alignItems: "center", justifyContent: "center" },
  calBadgeMonth: { fontFamily: "DM_Sans_700Bold", fontSize: 5, color: "#fff", letterSpacing: 0.2 },
  calBadgeDay: { fontFamily: "DM_Sans_700Bold", fontSize: 11, lineHeight: 12, marginBottom: 1 },

  scroll: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center", marginVertical: 16 },
});

```

### app/(visitor)/home/planning.tsx

```tsx
import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useVisitorSpace } from "@/lib/VisitorContext";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { toISO, toFrLong, toFrShort, addDays, getMonday, getDayStatus } from "@/lib/slotUtils";
import MiniCalendar from "@/components/MiniCalendar";
import SegmentedSwitch from "@/components/SegmentedSwitch";
import WeeklyPlanningGrid from "@/components/WeeklyPlanningGrid";
import PlanningLegend from "@/components/PlanningLegend";
import DaySlotGrid from "@/components/DaySlotGrid";
import SlotOccupantsModal, { type SelectedSlot } from "@/components/SlotOccupantsModal";

// Planning des intervenants, en lecture seule — miroir de
// app/(admin)/intervenants.tsx (section "Planning" uniquement, sans les
// actions d'édition/suppression ni les fiches intervenants). Accessible
// depuis (visitor)/home/calendar.tsx dès que space.intervenants_enabled est
// actif, pour les deux rôles visiteur/intervenant.
export default function VisitorPlanningScreen() {
  const router = useRouter();
  const { theme: C } = useDisplayMode();
  const { space, slotConfig, reservations, getSlotsForDate, getConfigForDate } = useVisitorSpace();

  const startDate = space ? new Date(space.start_date + "T00:00:00") : new Date();
  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [calMonth, setCalMonth] = useState(() => ({ year: selectedDay.getFullYear(), month: selectedDay.getMonth() }));
  const [planningView, setPlanningView] = useState<"mensuel" | "hebdo">("mensuel");
  const [weekAnchor, setWeekAnchor] = useState(() => getMonday(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);

  if (!space) return null;

  const iso = toISO(selectedDay);
  const dayInterventions = reservations
    .filter((r) => r.type === "Intervention" && r.date === iso)
    .sort((a, b) => a.creneau.localeCompare(b.creneau));
  const interventionDates = new Set(reservations.filter((r) => r.type === "Intervention").map((r) => r.date));
  const dayConfig = getConfigForDate(iso) ?? slotConfig;
  const daySlots = getSlotsForDate(iso);
  const dayStatus = dayConfig ? getDayStatus(reservations, iso, selectedDay, dayConfig, daySlots, startDate, "Intervention") : "empty";

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Text style={[styles.backText, { color: C.orange }]}>← Retour</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>🩺 Planning des intervenants</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={{ marginBottom: 14 }}>
          <SegmentedSwitch
            value={planningView === "hebdo"}
            onChange={(v) => setPlanningView(v ? "hebdo" : "mensuel")}
            leftLabel="Mensuel"
            rightLabel="Hebdo"
            C={C}
            minWidthRatio={0.5}
          />
        </View>

        {planningView === "hebdo" && slotConfig ? (
          <WeeklyPlanningGrid
            C={C}
            slotConfig={slotConfig}
            reservations={reservations}
            getSlotsForDate={getSlotsForDate}
            getConfigForDate={getConfigForDate}
            startDate={startDate}
            weekAnchor={weekAnchor}
            onWeekChange={setWeekAnchor}
            readOnly
          />
        ) : (
          <>
            <View style={{ marginBottom: 14 }}>
              <MiniCalendar
                selDate={iso}
                onSelect={(newIso) => setSelectedDay(new Date(newIso + "T00:00:00"))}
                calMonth={calMonth}
                onMonthChange={setCalMonth}
                startDate={startDate}
                C={C}
                size="lg"
                markedDates={interventionDates}
              />
            </View>

            <View style={[styles.dayNav, { backgroundColor: C.card, borderColor: C.border }]}>
              <TouchableOpacity
                onPress={() => {
                  const prev = addDays(selectedDay, -1);
                  if (prev >= startDate) setSelectedDay(prev);
                }}
                disabled={toISO(selectedDay) === toISO(startDate)}
                style={[styles.navBtn, { borderColor: C.border }]}
              >
                <Text style={[styles.navBtnText, { color: C.text }]}>‹</Text>
              </TouchableOpacity>
              <View style={{ alignItems: "center" }}>
                <Text style={[styles.dayTitle, { color: C.text }]}>{toFrLong(selectedDay)}</Text>
                <Text style={[styles.daySub, { color: C.muted }]}>{toFrShort(selectedDay)}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedDay(addDays(selectedDay, 1))}
                style={[styles.navBtn, { borderColor: C.border }]}
              >
                <Text style={[styles.navBtnText, { color: C.text }]}>›</Text>
              </TouchableOpacity>
            </View>

            {dayConfig && (
              <>
                <PlanningLegend C={C} />
                <DaySlotGrid
                  C={C}
                  iso={iso}
                  day={selectedDay}
                  config={dayConfig}
                  daySlots={daySlots}
                  reservations={reservations}
                  status={dayStatus}
                  showHeader={false}
                  onSlotPress={(slotIso, slot, occupants) => setSelectedSlot({ iso: slotIso, slot, occupants })}
                />
              </>
            )}

            {dayInterventions.length === 0 ? (
              <Text style={[styles.emptyText, { color: C.muted }]}>Aucune intervention ce jour-là.</Text>
            ) : (
              dayInterventions.map((r) => (
                <View key={r.id} style={[styles.interventionCard, { backgroundColor: C.card, borderColor: C.orange }]}>
                  <Text style={[styles.interventionTime, { color: C.orange }]}>
                    {r.creneau} · {r.duration_minutes} min
                  </Text>
                  <Text style={[styles.interventionLabel, { color: C.text }]}>{r.intervention_label}</Text>
                  <Text style={[styles.interventionBy, { color: C.muted }]}>{r.prenom} {r.nom}</Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      <SlotOccupantsModal
        C={C}
        selected={selectedSlot}
        onClose={() => setSelectedSlot(null)}
        readOnly
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 42, paddingBottom: 16, borderBottomWidth: 1 },
  back: { alignSelf: "flex-start", marginBottom: 10 },
  backText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  headerTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 20 },

  scroll: { padding: 16, paddingBottom: 40 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginBottom: 12 },

  dayNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 14 },
  navBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 },
  navBtnText: { fontSize: 18, fontWeight: "600" },
  dayTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 16, textTransform: "capitalize" },
  daySub: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },

  interventionCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 10 },
  interventionTime: { fontFamily: "DM_Sans_700Bold", fontSize: 14, marginBottom: 2 },
  interventionLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14 },
  interventionBy: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },
});

```

### supabase/functions/notify-intervention-confirmation/index.ts

```ts
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// Adresse sur une seule ligne — même logique que joinAddress()/hospitalAddressParts()
// dans lib/address.ts, dupliquée ici (pas de dossier _shared/ dans ce projet,
// chaque fonction Edge est autonome, cf. notify-guest-confirmation).
function joinAddress(parts: (string | null)[]): string {
  return parts.filter((p) => p && p.trim().length > 0).join(", ");
}

function googleMapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { space_id, intervenant_email, intervenant_prenom, date, creneau, duration_minutes, intervention_label } = await req.json();

    if (!space_id || !intervenant_email || !date || !creneau || !intervention_label) {
      return json({ error: "Missing required fields" }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: space } = await supabaseAdmin
      .from("patient_spaces")
      .select(
        "patient_firstname, patient_lastname, hospital_name, hospital_room, hospital_address, " +
        "hospital_address_line2, hospital_postal_code, hospital_city, hospital_country, hospital_maps_url, " +
        "home_care_mode, home_address, home_address_line2, home_postal_code, home_city, home_country, home_maps_url",
      )
      .eq("id", space_id)
      .single();

    if (!space) return json({ error: "Space not found" }, 404);

    const useHome = !!space.home_care_mode;
    const address = joinAddress(useHome
      ? [space.home_address, space.home_address_line2, [space.home_postal_code, space.home_city].filter(Boolean).join(" "), space.home_country]
      : [space.hospital_address, space.hospital_address_line2, [space.hospital_postal_code, space.hospital_city].filter(Boolean).join(" "), space.hospital_country]);
    const locationName = useHome ? "Domicile" : space.hospital_name;
    const mapsUrl = (useHome ? space.home_maps_url : space.hospital_maps_url) || googleMapsSearchUrl(address || locationName);

    const dateObj = new Date(`${date}T12:00:00`);
    const dateFr = dateObj.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set — email skipped");
      return json({ ok: true, warning: "email not sent" });
    }

    const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:#1F3864;margin-bottom:4px">🩺 Confirmation de créneau réservé</h2>
  <p style="color:#666;margin-top:0">AvecToi — ${space.patient_firstname} ${space.patient_lastname}</p>

  <p>Bonjour${intervenant_prenom ? " " + intervenant_prenom : ""},<br/>
  Un créneau d'intervention a été réservé pour vous. Voici les informations pratiques :</p>

  <table style="border-collapse:collapse;width:100%;margin-top:16px">
    <tr>
      <td style="padding:10px;border:1px solid #eee;background:#f9f9f9;width:130px"><strong>Date</strong></td>
      <td style="padding:10px;border:1px solid #eee">${dateFr}</td>
    </tr>
    <tr>
      <td style="padding:10px;border:1px solid #eee;background:#f9f9f9"><strong>Heure</strong></td>
      <td style="padding:10px;border:1px solid #eee">${creneau}${duration_minutes ? ` (${duration_minutes} min)` : ""}</td>
    </tr>
    <tr>
      <td style="padding:10px;border:1px solid #eee;background:#f9f9f9"><strong>Type de soin</strong></td>
      <td style="padding:10px;border:1px solid #eee">${intervention_label}</td>
    </tr>
    <tr>
      <td style="padding:10px;border:1px solid #eee;background:#f9f9f9"><strong>Patient</strong></td>
      <td style="padding:10px;border:1px solid #eee">${space.patient_firstname} ${space.patient_lastname}</td>
    </tr>
    <tr>
      <td style="padding:10px;border:1px solid #eee;background:#f9f9f9"><strong>Lieu</strong></td>
      <td style="padding:10px;border:1px solid #eee">${locationName}${space.hospital_room && !useHome ? " — " + space.hospital_room : ""}${address ? "<br/>" + address : ""}</td>
    </tr>
  </table>

  <div style="margin-top:24px">
    <a href="${mapsUrl}" style="display:inline-block;background:#1F3864;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">📍 Voir l'itinéraire</a>
  </div>

  <p style="color:#C45911;font-size:12px;font-weight:bold;margin-top:24px;margin-bottom:0">AvecToi</p>
  <p style="color:#999;font-size:12px;margin-top:4px">
    Cet email vous a été envoyé car l'administrateur de cet espace vous a réservé un créneau via l'application AvecToi.
  </p>
</div>`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "AvecToi <notifications@notifications.avectoi.care>",
        to: [intervenant_email],
        subject: `AvecToi — Confirmation de votre créneau du ${dateFr}`,
        html,
      }),
    });

    if (!resendRes.ok) {
      const detail = await resendRes.text();
      console.error("Resend error:", detail);
      return json({ error: "Email failed", detail }, 500);
    }

    return json({ ok: true });
  } catch (err) {
    console.error("notify-intervention-confirmation error:", err);
    return json({ error: String(err) }, 500);
  }
});

```

## Section B — Fichiers partagés (extraits intervenant à réintégrer manuellement, PAS à copier-coller tels quels)

### lib/visitorEntry.ts

Fichier partagé (petit) — contenu intégral cité pour contexte, la logique intervenant y est entremêlée avec celle du visiteur.

```ts
import { supabase } from "@/lib/supabase";
import { saveVisitorSession } from "@/lib/visitorSession";
import { normalizeDossierCode } from "@/lib/dossierCode";

export type VisitorEntryResult =
  | { ok: true; spaceId: string; token: string; intervenantsEnabled: boolean }
  | { ok: false; reason: "not_found" | "inactive"; patientFirstname?: string };

async function lookupSpace(column: "invite_token" | "dossier_code", value: string): Promise<VisitorEntryResult> {
  const { data, error } = await supabase
    .from("patient_spaces")
    .select("id, invite_token, is_active, patient_firstname, intervenants_enabled")
    .eq(column, value)
    .single();

  if (error || !data) return { ok: false, reason: "not_found" };
  if (!data.is_active) return { ok: false, reason: "inactive", patientFirstname: data.patient_firstname };
  return { ok: true, spaceId: data.id, token: data.invite_token, intervenantsEnabled: data.intervenants_enabled };
}

export function enterByToken(token: string) {
  return lookupSpace("invite_token", token);
}

export function enterByDossierCode(code: string) {
  return lookupSpace("dossier_code", normalizeDossierCode(code));
}

// Persiste la session visiteur — toujours indexée sur invite_token en
// interne (VisitorContext ne connaît que cette colonne), même quand
// l'entrée s'est faite via le code dossier.
export async function completeVisitorEntry(result: { ok: true; spaceId: string; token: string }): Promise<void> {
  await saveVisitorSession({ token: result.token, spaceId: result.spaceId, role: "visiteur" });
}

// Même lien/code d'invitation que les visiteurs — seul le rôle stocké en
// session diffère, ce qui fait apparaître le modal de création de fiche
// intervenant dans (visitor)/_layout.tsx et bascule le flux de réservation.
export async function completeIntervenantEntry(result: { ok: true; spaceId: string; token: string }): Promise<void> {
  await saveVisitorSession({ token: result.token, spaceId: result.spaceId, role: "intervenant" });
}

```

### lib/visitorSession.ts

Fichier partagé (petit) — contenu intégral cité pour contexte, la session intervenant réutilise le même mécanisme que la session visiteur.

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";

// Persists "who is this visitor" on-device so reopening the app lands
// straight on the calendar instead of asking for the invite link again,
// and so booking forms can be pre-filled with prénom/nom. One slot per
// device — in practice a visitor's phone only ever follows one patient's
// link.
//
// `pin` is also the credential checked by `sessionPinMatches` below to skip
// re-asking for a PIN when modifying/cancelling a record the visitor
// authored on this same device — see sessionPinMatches.
const KEY = "visitor_session";

export interface VisitorSession {
  token: string;
  spaceId: string;
  prenom: string;
  nom: string;
  email: string;
  pin: string;
  localPhotoUri: string | null;
  motto: string;
  // Lien avec le patient (Père/Mère/Ami·e/...), voir lib/relations.ts —
  // visiteur uniquement, même principe local que motto ci-dessus.
  relation: string;
  // Téléphone — pertinent seulement côté intervenant (intervenant_profiles),
  // caché localement sur le même principe que motto ci-dessus.
  telephone: string;
  // Clé du métier (voir lib/metiers.ts) — pertinent seulement côté
  // intervenant, même principe que telephone ci-dessus.
  metier: string;
  // "intervenant" pour un professionnel (infirmier·ère, kiné, aide à
  // domicile…) entré via "🩺 Je suis intervenant" — sessions déjà
  // persistées sans ce champ sont traitées comme "visiteur" (voir fallback
  // dans saveVisitorSession), aucune migration de données locale requise.
  role: "visiteur" | "intervenant";
  // Non-null une fois la fiche intervenant créée (voir
  // components/IntervenantFicheModal.tsx) — tant qu'il est null, l'écran
  // (visitor)/_layout.tsx affiche le modal de création bloquant.
  intervenantProfileId: string | null;
}

export async function getVisitorSession(): Promise<VisitorSession | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as VisitorSession;
  } catch {
    return null;
  }
}

export async function saveVisitorSession(
  partial: {
    token: string;
    spaceId: string;
    prenom?: string;
    nom?: string;
    email?: string;
    pin?: string;
    localPhotoUri?: string | null;
    motto?: string;
    relation?: string;
    telephone?: string;
    metier?: string;
    role?: "visiteur" | "intervenant";
    intervenantProfileId?: string | null;
  },
): Promise<void> {
  const existing = await getVisitorSession();
  const merged: VisitorSession = {
    token: partial.token,
    spaceId: partial.spaceId,
    prenom: partial.prenom ?? existing?.prenom ?? "",
    nom: partial.nom ?? existing?.nom ?? "",
    email: partial.email ?? existing?.email ?? "",
    pin: partial.pin ?? existing?.pin ?? "",
    localPhotoUri: partial.localPhotoUri ?? existing?.localPhotoUri ?? null,
    motto: partial.motto ?? existing?.motto ?? "",
    relation: partial.relation ?? existing?.relation ?? "",
    telephone: partial.telephone ?? existing?.telephone ?? "",
    metier: partial.metier ?? existing?.metier ?? "",
    role: partial.role ?? existing?.role ?? "visiteur",
    intervenantProfileId: partial.intervenantProfileId ?? existing?.intervenantProfileId ?? null,
  };
  await AsyncStorage.setItem(KEY, JSON.stringify(merged));
}

export async function clearVisitorSession(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

// Le PIN saisi une fois en "Mon compte" sert d'identité pour ce téléphone :
// s'il correspond au PIN stocké sur l'élément (réservation, nouvelle,
// tâche, message), on évite de le redemander pour le modifier/annuler.
// Si aucune session n'est enregistrée, ou si le PIN ne correspond pas
// (élément créé par quelqu'un d'autre sur le même appareil), on retombe
// sur la saisie manuelle du PIN.
//
// Le PIN seul ne suffit pas : il ne fait que 4 chiffres (10 000
// combinaisons), deux visiteurs différents peuvent donc en avoir un
// identique par hasard. On exige en plus que le prénom/nom de l'auteur de
// l'élément corresponde à celui de la session, sans quoi une collision de
// PIN permettrait de modifier/supprimer le contenu de quelqu'un d'autre.
export async function sessionPinMatches(
  pin: string | null | undefined,
  author: { prenom: string | null | undefined; nom: string | null | undefined },
): Promise<boolean> {
  if (!pin) return false;
  const session = await getVisitorSession();
  if (!session || session.pin !== pin) return false;
  return (
    session.prenom.trim().toLowerCase() === (author.prenom ?? "").trim().toLowerCase()
    && session.nom.trim().toLowerCase() === (author.nom ?? "").trim().toLowerCase()
  );
}

// À appeler juste après la création d'un élément protégé par PIN
// (réservation, nouvelle, message de soutien, prise en charge d'une
// tâche) pour que sessionPinMatches puisse reconnaître l'auteur plus tard
// sans redemander le PIN. No-op si aucune session (token/spaceId) n'existe
// encore — ne devrait pas arriver, le visiteur arrive toujours via un lien
// d'invitation qui crée la session en premier.
export async function rememberAuthorPin(prenom: string, nom: string, pin: string): Promise<void> {
  const existing = await getVisitorSession();
  if (!existing) return;
  await saveVisitorSession({ token: existing.token, spaceId: existing.spaceId, prenom, nom, pin });
}

```

### lib/freemiumCap.ts

Fichier partagé (petit) — contenu intégral cité ; contient `canEnableIntervenants(space)` qui verrouille le rôle intervenant derrière `space.premium`.

```ts
import type { PatientSpace, Reservation } from "./types";

export const FREE_VISIT_LIMIT = 8;

export function isSpaceCapped(space: PatientSpace | null, reservations: Reservation[]): boolean {
  if (!space || space.premium) return false;
  return reservations.filter((r) => r.type === "Visite").length >= FREE_VISIT_LIMIT;
}

export function canEnableIntervenants(space: PatientSpace | null): boolean {
  if (!space) return false;
  return space.premium;
}

```

### app/index.tsx

Fichier partagé — écran d'accueil/routage initial, contient l'aiguillage vers l'entrée intervenant.

```tsx
53-      <Text style={styles.baseline}>
54-        Parce qu'être présent,{"\n"}ça s'organise
55-      </Text>
56-
57-      <View style={styles.buttons}>
58-        <TouchableOpacity
59-          style={styles.btnPrimary}
60-          onPress={() => router.push("/auth/visitor-entry")}
61-          activeOpacity={0.85}
62-        >
63-          <Text style={styles.btnPrimaryText}>📅 Je rends visite</Text>
64-        </TouchableOpacity>
65-
66-        <TouchableOpacity
67-          style={styles.btnSecondary}
68:          onPress={() => router.push("/auth/intervenant-entry")}
69-          activeOpacity={0.85}
70-        >
71:          <Text style={styles.btnSecondaryText}>🩺 Je suis intervenant</Text>
72-        </TouchableOpacity>
73-
74-        <TouchableOpacity
75-          style={styles.btnSecondary}
76-          onPress={() => router.push("/auth/login")}
77-          activeOpacity={0.85}
78-        >
79-          <Text style={styles.btnSecondaryText}>🙋 Je suis Admin</Text>
80-        </TouchableOpacity>
81-      </View>
82-
83-      {/* Reader app notice — no pricing, no purchase CTA */}
84-      <Text style={styles.notice}>
85-        Connectez-vous à votre espace patient pour commencer.
86-      </Text>

```

### app/(admin)/settings.tsx

Fichier partagé — écran de paramétrage admin, contient les réglages liés au rôle intervenant (activation, night mode, checklists...).

```tsx
9-// Percentages ("85%") on the sheet don't resolve reliably since its parent
10-// TouchableOpacity has no defined height (hugs content) — use a pixel value
11-// so the ScrollView actually gets a bounded viewport to scroll within.
12-const SHEET_MAX_HEIGHT = Dimensions.get("window").height * 0.85;
13-import { useRouter } from "expo-router";
14-import { useFocusEffect } from "@react-navigation/native";
15-import DateTimePicker from "@react-native-community/datetimepicker";
16-import * as ImagePicker from "expo-image-picker";
17-import * as ImageManipulator from "expo-image-manipulator";
18-import { File } from "expo-file-system";
19-import { supabase } from "@/lib/supabase";
20-import { useSpace } from "@/lib/SpaceContext";
21-import { useDisplayMode } from "@/lib/DisplayModeContext";
22-import PatientAvatar from "@/components/PatientAvatar";
23-import VisitorsBlock from "@/components/VisitorsBlock";
24:import IntervenantsBlock from "@/components/IntervenantsBlock";
25:import IntervenantPriorityModal from "@/components/IntervenantPriorityModal";
26:import NightIntervenantModal from "@/components/NightIntervenantModal";
27:import NewsIntervenantModal from "@/components/NewsIntervenantModal";
28-import NightVisitorModal from "@/components/NightVisitorModal";
29-import { resolvePlaceFromMapsUrl } from "@/lib/address";
30-import { generateSlots, formatHourMinute } from "@/lib/slotUtils";
31-import { updateLinkedCalendarEvent } from "@/lib/calendarSync";
32:import { canEnableIntervenants } from "@/lib/freemiumCap";
33-import { RGPD_EXTENSION_DAYS, prolongSpace, isRgpdAlertActive, rgpdEarlyProlongMessage } from "@/lib/rgpd";
34-import ConfirmModal from "@/components/ConfirmModal";
35-import type { Theme } from "@/lib/themes";
36-import { LOGO_PURPLE } from "@/lib/themes";
37-import type { NewsEntry, Task, SupportMessage, SlotConfig, ReservationChangeHistoryEntry, Reservation } from "@/lib/types";
38-import { openAndroidTimePicker, openAndroidDatePicker } from "@/lib/androidTimePicker";
39-
40-// Résultat de la RPC apply_slot_rule_change (voir migration
41-// 20260711_apply_slot_rule_change.sql) — ids des réservations recasées/
42-// annulées par le changement de règles qui vient d'être validé.
43-interface RuleChangeResult {
44-  rebooked: string[];
45-  night_cancelled: string[];
46-  failed: string[];
47-  day_cap_suspended: string[];
48-}
49-
50-// ─── Historique des champs hospitaliers ───────────────────────────────────────
51-interface FieldHistoryEntry {
52-  id: string;
53-  field_name: string;
54-  old_value: string | null;
55-  new_value: string | null;
56-  changed_at: string;
57-}
58-
59-// ─── Chronologie (popup frise) ─────────────────────────────────────────────
60-// "resa" = réservation faite par un visiteur (ou l'admin, aussi visiteur) ;
61:// "resa_intervenant" = même type de réservation (Visite/Nuit) mais faite par
62:// un intervenant (distingué via reservations.intervenant_profile_id) ; "soin"
63:// = intervention (toujours faite par un intervenant). Couleur : vert pour les
64:// visiteurs, violet du bonhomme du logo (LOGO_PURPLE) pour les intervenants —
65-// voir chronoKindColor() plus bas, appliqué au rendu de la frise.
66:type ChronoEventKind = "hosp" | "regles" | "consignes" | "resa" | "resa_intervenant" | "soin" | "hospitalisation" | "sortie" | "besoin";
67-interface ChronoEvent {
68-  id: string;
69-  kind: ChronoEventKind;
70-  date: Date;
71-  icon: string;
72-  title: string;
73-  detail?: string;
74-}
75-const CHRONO_KIND_COLOR: Record<ChronoEventKind, keyof Theme> = {
76-  hosp: "accent",
77-  regles: "gold",
78-  consignes: "accent",
79-  resa: "success",
80:  resa_intervenant: "success",
81-  soin: "success",
82-  hospitalisation: "danger",
83-  sortie: "success",
84-  besoin: "orange",
85-};
86-// Couleur effective d'un événement de la frise — surcharge violette (logo)
87:// pour les événements liés à un intervenant, vert (C.success) sinon.
88-function chronoKindColor(kind: ChronoEventKind, C: Theme): string {
89:  return kind === "soin" || kind === "resa_intervenant" ? LOGO_PURPLE : C[CHRONO_KIND_COLOR[kind]];
90-}
91-
92-// Libellés des catégories de besoins réaffichés dans la frise Chronologie
93-// (les icônes réutilisent TASK_CAT_ICONS, déjà défini plus bas pour le bloc
94-// Historique / Publications).
95-const TASK_CAT_LABELS: Record<Task["category"], string> = {
96-  repas: "Repas", affaires: "Affaires", courses: "Courses", transport: "Transport", administratif: "Administratif", autre: "Autre", relais: "Relais",
97-};
98-const TASK_STATUS_LABELS: Record<Task["status"], string> = {
99-  ouvert: "Ouvert", pris_en_charge: "Pris en charge", fait: "Terminé", ferme: "Clôturé",
100-};
101-
102-const BLOOD_GROUPS = [["A+", "A-"], ["B+", "B-"], ["AB+", "AB-"], ["O+", "O-"]];
103-
104-const COMMON_ALLERGIES = [
--
125-  visit_rules: "Consignes de visite",
126-  home_care_mode: "Mode de soin",
127-  home_address: "Adresse du domicile",
128-  home_maps_url: "Lien Google Maps (domicile)",
129-  visit_start_hour: "Heure de début des visites",
130-  visit_end_hour: "Heure de fin des visites",
131-  slot_duration_minutes: "Durée d'une visite",
132-  min_gap_minutes: "Intervalle entre créneaux",
133-  gap_includes_duration: "Intervalle inclut la durée",
134-  max_visitors_per_slot: "Visiteurs max par créneau",
135-  allowed_weekdays: "Jours de visite autorisés",
136-  blocked_dates: "Dates sans visites",
137-  night_enabled: "Nuitées",
138-  night_start_hour: "Heure de début des nuitées",
139-  night_end_hour: "Heure de fin des nuitées",
140:  intervenants_enabled: "Planning des intervenants",
141-};
142-const FIELD_ICONS: Record<string, string> = {
143-  hospital_room: "🛏️",
144-  hospital_service: "🏥",
145-  hospital_sector: "📍",
146-  visit_rules: "📝",
147-  home_care_mode: "🔄",
148-  home_address: "📍",
149-  home_maps_url: "🗺️",
150-  visit_start_hour: "⏰",
151-  visit_end_hour: "⏰",
152-  slot_duration_minutes: "⏱",
153-  min_gap_minutes: "⏲",
154-  gap_includes_duration: "⏲",
155-  max_visitors_per_slot: "👥",
156-  allowed_weekdays: "📅",
157-  blocked_dates: "🚫",
158-  night_enabled: "🌙",
159-  night_start_hour: "🌙",
160-  night_end_hour: "🌙",
161:  intervenants_enabled: "🩺",
162-};
163-
164-// Champs journalisés dans space_field_history qui appartiennent à la
165-// section "Règles de visite" (par opposition aux champs hospitaliers ci-dessus).
166-const VISIT_RULE_FIELD_NAMES = new Set([
167-  "visit_start_hour", "visit_end_hour", "slot_duration_minutes", "min_gap_minutes",
168-  "gap_includes_duration", "max_visitors_per_slot", "allowed_weekdays", "blocked_dates",
169:  "night_enabled", "night_start_hour", "night_end_hour", "intervenants_enabled",
170-]);
171-
172-const WEEKDAY_HISTORY_LABELS: Record<number, string> = {
173-  0: "Dim", 1: "Lun", 2: "Mar", 3: "Mer", 4: "Jeu", 5: "Ven", 6: "Sam",
174-};
175-
176-function formatWeekdaysList(days: number[]) {
177-  if (!days.length) return "Aucun";
178-  return [...days]
179-    .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
180-    .map((d) => WEEKDAY_HISTORY_LABELS[d])
181-    .join(", ");
182-}
183-
184-function formatBlockedDatesList(dates: string[]) {
--
364-  const { theme: C } = useDisplayMode();
365-
366-  const [photoUploading, setPhotoUploading] = useState(false);
367-  // undefined = use space value; null = cleared locally; string = new URL (immediate preview before Realtime)
368-  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null | undefined>(undefined);
369-  const displayPhotoUrl = localPhotoUrl !== undefined ? localPhotoUrl : (space?.patient_photo_url ?? null);
370-  const [prolonging, setProlonging] = useState(false);
371-  const [earlyProlongModal, setEarlyProlongModal] = useState(false);
372-  const [toast, setToast] = useState("");
373-
374-  // Section active de la barre de navigation des réglages — la roue ⚙️ n'est
375-  // plus cliquable (simple en-tête de rubrique), donc on ouvre toujours sur
376-  // le premier onglet ("Lieux") plutôt que sur un état "aucune section".
377-  const [activeSection, setActiveSection] = useState<SectionKey | null>("coord");
378-
379:  // Retour déterministe depuis "Planning des intervenants" : le bouton qui y
380-  // mène ne vit que dans la section Règles, tout en bas — donc au lieu de
381-  // restaurer un scroll générique (fragile, dépend du dernier onScroll reçu),
382-  // on force cette section et on scrolle en bas de page.
383:  // pendingIntervenantsReturnRef est armé juste avant le router.push vers
384:  // Planning des intervenants, et consommé au prochain focus (retour arrière)
385-  // uniquement — jamais au premier montage ni lors d'une entrée directe.
386-  const scrollRef = useRef<ScrollView>(null);
387:  const pendingIntervenantsReturnRef = useRef(false);
388-  useFocusEffect(
389-    useCallback(() => {
390:      if (pendingIntervenantsReturnRef.current) {
391:        pendingIntervenantsReturnRef.current = false;
392-        setActiveSection("regles");
393-        requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: false }));
394-      }
395-    }, []),
396-  );
397-
398-  // Admin notes
399-  const notesInit = useRef(false);
400-  const [visitRules, setVisitRules] = useState("");
401-  const [notesSaving, setNotesSaving] = useState(false);
402-  useEffect(() => {
403-    if (space && !notesInit.current) {
404-      notesInit.current = true;
405-      setVisitRules(space.visit_rules ?? "");
406-    }
--
512-    const { error } = await supabase
513-      .from("patient_spaces")
514-      .update({
515-        patient_motto: patientMotto.trim() || null,
516-        patient_admission_date: patientAdmissionDate,
517-        patient_discharge_date: patientDischargeDate,
518-        patient_birthdate: patientBirthdate,
519-        patient_sex: patientSex,
520-        patient_blood_type: patientBloodType,
521-        patient_allergies: parts.length ? parts.join(", ") : null,
522-      })
523-      .eq("id", space.id);
524-    setPatientMedicalSaving(false);
525-    if (error) showToast("Erreur lors de la sauvegarde.");
526-    else {
527:      // Pas de refreshSpace() : voir le commentaire dans handleToggleIntervenants —
528-      // le canal realtime `space-admin:*` reflète déjà cet update sans démonter les Tabs.
529-      showToast("Fiche patient enregistrée ✓");
530-    }
531-  }
532-
533-  // Infos hospitalières (room / service / secteur)
534-  const hospitalInfosInit = useRef(false);
535-  const [room, setRoom] = useState("");
536-  const [service, setService] = useState("");
537-  const [sector, setSector] = useState("");
538-  const [hospitalInfosSaving, setHospitalInfosSaving] = useState(false);
539-  useEffect(() => {
540-    if (space && !hospitalInfosInit.current) {
541-      hospitalInfosInit.current = true;
542-      setRoom(space.hospital_room ?? "");
--
705-        const w = homeCareTrackWidthRef.current;
706-        if (w <= 0) return;
707-        const frac = Math.min(1, Math.max(0, homeCareDragStart.current + g.dx / w));
708-        const next = frac >= 0.5;
709-        Animated.spring(homeCareThumbX, { toValue: next ? 1 : 0, useNativeDriver: true, friction: 8 }).start();
710-        setHomeCareDraft(next);
711-      },
712-      onPanResponderTerminate: () => {
713-        Animated.spring(homeCareThumbX, { toValue: homeCareDraftRef.current ? 1 : 0, useNativeDriver: true, friction: 8 }).start();
714-      },
715-    })
716-  ).current;
717-
718-  // Nuitées toggle + heures
719-  const [nightToggling, setNightToggling] = useState(false);
720:  const [intervenantsToggling, setIntervenantsToggling] = useState(false);
721-  const [priorityModalVisible, setPriorityModalVisible] = useState(false);
722:  const [nightIntervenantModalVisible, setNightIntervenantModalVisible] = useState(false);
723:  const [newsIntervenantModalVisible, setNewsIntervenantModalVisible] = useState(false);
724-  const [nightVisitorModalVisible, setNightVisitorModalVisible] = useState(false);
725-  const [oneVisitPerDayToggling, setOneVisitPerDayToggling] = useState(false);
726-  const nightHoursInit = useRef(false);
727-  const [nightStartHour, setNightStartHour] = useState(19);
728-  const [nightStartMinute, setNightStartMinute] = useState(0);
729-  const [nightEndHour, setNightEndHour] = useState(8);
730-  const [nightEndMinute, setNightEndMinute] = useState(0);
731-  const [nightHoursSaving, setNightHoursSaving] = useState(false);
732-  useEffect(() => {
733-    if (slotConfig && !nightHoursInit.current) {
734-      nightHoursInit.current = true;
735-      setNightStartHour(slotConfig.night_start_hour ?? 19);
736-      setNightStartMinute(slotConfig.night_start_minute ?? 0);
737-      setNightEndHour(slotConfig.night_end_hour ?? 8);
738-      setNightEndMinute(slotConfig.night_end_minute ?? 0);
--
819-  }
820-
821-  async function loadReservationChangeHistory() {
822-    if (!space) return;
823-    setResaHistoryLoading(true);
824-    const { data } = await supabase
825-      .from("reservation_change_history")
826-      .select("*")
827-      .eq("space_id", space.id)
828-      .order("changed_at", { ascending: false })
829-      .limit(50);
830-    setReservationChangeHistory(data || []);
831-    setResaHistoryLoading(false);
832-  }
833-
834:  // Soins planifiés (tous intervenants confondus, passés ET à venir) — même
835:  // donnée que la section "Soins planifiés" de IntervenantProfileModal, mais
836:  // sans filtre sur un intervenant particulier et sans exclure les soins déjà
837-  // passés (c'est ici l'historique complet). Tri anté-chronologique : le plus
838-  // tardif/récent en haut, le plus ancien tout en bas du scroll.
839-  async function loadSoinsPlanifies() {
840-    if (!space) return;
841-    setSoinsLoading(true);
842-    const { data } = await supabase
843-      .from("reservations")
844-      .select("*")
845-      .eq("space_id", space.id)
846:      .eq("type", "Intervention")
847-      .order("date", { ascending: false })
848-      .order("creneau", { ascending: false });
849-    setSoinsPlanifies(data || []);
850-    setSoinsLoading(false);
851-  }
852-
853-  // Réservations visiteurs (type "Visite" ou "Nuit" faites par un visiteur ou
854:  // par l'admin lui-même — qui est aussi un visiteur) : intervenant_profile_id
855:  // n'est renseigné que lorsque la réservation a été faite par un intervenant
856-  // (voir NightInterventionBookingFlow.tsx/InterventionBookingFlow.tsx), donc
857:  // is null suffit à exclure aussi bien les soins (type "Intervention") que
858:  // les nuitées réservées par un intervenant.
859-  async function loadResaVisiteurs() {
860-    if (!space) return;
861-    setResaVisiteursLoading(true);
862-    const { data } = await supabase
863-      .from("reservations")
864-      .select("*")
865-      .eq("space_id", space.id)
866:      .is("intervenant_profile_id", null)
867-      .order("date", { ascending: false })
868-      .order("creneau", { ascending: false });
869-    setResaVisiteurs(data || []);
870-    setResaVisiteursLoading(false);
871-  }
872-
873-  function openSection(key: SectionKey) {
874-    if (key === "hist") {
875-      setHistorySearch("");
876-      loadHistory();
877-      loadPublicationsHistory();
878-      loadReservationChangeHistory();
879-      loadSoinsPlanifies();
880-      loadResaVisiteurs();
881-    }
--
924-        return {
925-          id: `fh-${h.id}`, kind: "consignes", date: new Date(h.changed_at),
926-          icon: "📝", title: "Consignes de visite modifiées",
927-          detail: h.new_value ? `→ "${h.new_value}"` : "→ (vide)",
928-        };
929-      }
930-      const isRegle = VISIT_RULE_FIELD_NAMES.has(h.field_name);
931-      return {
932-        id: `fh-${h.id}`, kind: isRegle ? "regles" : "hosp", date: new Date(h.changed_at),
933-        icon: FIELD_ICONS[h.field_name] ?? "✏️",
934-        title: FIELD_LABELS[h.field_name] ?? h.field_name,
935-        detail: h.new_value ? `→ ${h.new_value}` : "→ (vide)",
936-      };
937-    }),
938-    ...chronoReservations.map((r): ChronoEvent => {
939:      if (r.type === "Intervention") {
940-        return {
941-          id: `resa-${r.id}`, kind: "soin", date: new Date(r.date + "T12:00:00"),
942-          icon: "🩺",
943:          title: `Visite intervenant : ${r.prenom} ${r.nom} à ${r.creneau}`,
944-          detail: `Soin : ${r.intervention_label ?? "?"}${r.duration_minutes ? ` · ${r.duration_minutes} min` : ""}`,
945-        };
946-      }
947-      return {
948:        id: `resa-${r.id}`, kind: r.intervenant_profile_id ? "resa_intervenant" : "resa", date: new Date(r.date + "T12:00:00"),
949-        icon: r.type === "Nuit" ? "🌙" : "☀️",
950-        title: `${r.prenom} ${r.nom}`,
951-        detail: `${r.type === "Nuit" ? "Nuitée" : "Visite"} · ${r.creneau}`,
952-      };
953-    }),
954-    ...chronoTasks.map((t): ChronoEvent => ({
955-      id: `task-${t.id}`, kind: "besoin", date: new Date(t.created_at),
956-      icon: TASK_CAT_ICONS[t.category],
957-      title: t.title,
958-      detail: `${TASK_CAT_LABELS[t.category]} · ${TASK_STATUS_LABELS[t.status]}`,
959-    })),
960-    ...(space?.patient_admission_date ? [{
961-      id: "hospitalisation",
962-      kind: "hospitalisation" as const,
963-      date: new Date(space.patient_admission_date + "T00:00:00"),
--
1252-    setNightToggling(true);
1253-    const nextEnabled = !slotConfig.night_enabled;
1254-    const wasEnabled = slotConfig.night_enabled;
1255-    const res = await applyRuleChange({ night_enabled: nextEnabled });
1256-    setNightToggling(false);
1257-    refreshSlotConfig();
1258-    if (!res.ok) {
1259-      showToast("Erreur lors de la mise à jour.");
1260-      return;
1261-    }
1262-    await logFieldChange("night_enabled", wasEnabled ? "Activées" : "Suspendues", nextEnabled ? "Activées" : "Suspendues");
1263-    loadHistory();
1264-    showToast(rebookingSummary(res.result) ?? (wasEnabled ? "Nuitées suspendues ✓" : "Nuitées activées ✓"));
1265-  }
1266-
1267:  // ── Intervenants toggle ──────────────────────────────────────────────────────
1268:  async function handleToggleIntervenants() {
1269-    if (!space) return;
1270:    const nextEnabled = !space.intervenants_enabled;
1271:    if (nextEnabled && !canEnableIntervenants(space)) {
1272-      Alert.alert(
1273-        "Fonctionnalité Premium",
1274:        "La gestion des intervenants fait partie de l'offre Premium. Passez votre espace en illimité pour l'activer.",
1275-        [
1276-          { text: "Fermer", style: "cancel" },
1277-          { text: "En savoir plus", onPress: () => Linking.openURL("https://avectoi.care") },
1278-        ],
1279-      );
1280-      return;
1281-    }
1282:    setIntervenantsToggling(true);
1283:    const wasEnabled = space.intervenants_enabled;
1284-    const { error } = await supabase
1285-      .from("patient_spaces")
1286:      .update({ intervenants_enabled: nextEnabled })
1287-      .eq("id", space.id);
1288:    setIntervenantsToggling(false);
1289-    if (error) {
1290-      showToast("Erreur lors de la mise à jour.");
1291-      return;
1292-    }
1293-    // Pas de refreshSpace() ici : il bascule le flag `loading` du contexte, ce qui
1294-    // démonte tout le <Tabs> le temps du refetch (voir AdminGate dans _layout.tsx)
1295-    // et fait retomber la navigation sur l'onglet par défaut (accueil). Le canal
1296-    // realtime `space-admin:*` finit par refléter l'update, mais son tick peut
1297-    // arriver après le prochain render du Switch (qui repasserait alors sur
1298-    // l'ancienne valeur) — on met donc à jour le space en mémoire tout de suite.
1299:    patchSpace({ intervenants_enabled: nextEnabled });
1300:    await logFieldChange("intervenants_enabled", wasEnabled ? "Activé" : "Désactivé", nextEnabled ? "Activé" : "Désactivé");
1301-    loadHistory();
1302:    showToast(wasEnabled ? "Planning des intervenants désactivé ✓" : "Planning des intervenants activé ✓");
1303-  }
1304-
1305-  // ── "1 visite par jour" toggle ───────────────────────────────────────────
1306-  // Applique immédiatement (comme handleToggleNight) plutôt que d'attendre
1307-  // le bouton "Enregistrer" des règles de créneaux : le mode ne doit jamais
1308-  // rester activé côté écran sans être réellement persisté en base, sinon
1309-  // check_slot_capacity() continue d'autoriser plusieurs créneaux le même
1310-  // jour alors que l'admin croit l'avoir activé.
1311-  async function handleToggleOneVisitPerDay() {
1312-    if (!slotConfig) return;
1313-    setOneVisitPerDayToggling(true);
1314-    const next = !oneVisitPerDay;
1315-    const prev = oneVisitPerDay;
1316-    const res = await applyRuleChange({ one_visit_per_day: next });
1317-    setOneVisitPerDayToggling(false);
--
2341-                    </View>
2342-                  </View>
2343-
2344-                  <TouchableOpacity
2345-                    style={[styles.saveNotesBtn, { backgroundColor: C.accent, marginTop: 8 }, nightHoursSaving && { opacity: 0.6 }]}
2346-                    onPress={handleSaveNightHours}
2347-                    disabled={nightHoursSaving}
2348-                  >
2349-                    {nightHoursSaving
2350-                      ? <ActivityIndicator color="#fff" size="small" />
2351-                      : <Text style={styles.saveNotesBtnText}>Enregistrer les heures de nuitée</Text>
2352-                    }
2353-                  </TouchableOpacity>
2354-                </View>
2355-
2356:                {/* ── Bloc : Intervenants ───────────────────────────────────── */}
2357-                {space && (
2358-                  <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border, marginTop: 16 }]}>
2359:                    <Text style={[styles.fieldLabel, { color: C.orange, marginTop: 0 }]}>🩺 Planning des intervenants</Text>
2360-                    <View style={styles.nightRow}>
2361-                      <View style={{ flex: 1 }}>
2362-                        <Text style={[styles.nightLabel, { color: C.text }]}>
2363:                          {space.intervenants_enabled ? "Planning des intervenants activé" : "Planning des intervenants désactivé"}
2364-                        </Text>
2365-                        <Text style={[styles.nightDesc, { color: C.muted }]}>
2366:                          {space.intervenants_enabled
2367-                            ? "Les infirmier·ères, kinés et aides à domicile peuvent réserver leurs interventions, prioritaires sur les visites."
2368:                            : "Active cette option pour permettre à des intervenants (infirmier·ère, kiné, aide à domicile…) de gérer leur propre planning."}
2369-                        </Text>
2370-                      </View>
2371:                      {intervenantsToggling
2372-                        ? <ActivityIndicator color={C.orange} />
2373-                        : <Switch
2374:                            value={space.intervenants_enabled}
2375:                            onValueChange={handleToggleIntervenants}
2376-                            trackColor={{ false: C.border, true: C.orange }}
2377-                            thumbColor="#fff"
2378-                          />
2379-                      }
2380-                    </View>
2381-
2382:                    {space.intervenants_enabled && (
2383-                      <>
2384-                        <View style={[styles.fieldDivider, { backgroundColor: C.border }]} />
2385-                        <TouchableOpacity
2386-                          style={[styles.saveNotesBtn, { backgroundColor: C.orange }]}
2387-                          onPress={() => {
2388:                            pendingIntervenantsReturnRef.current = true;
2389:                            router.push("/(admin)/intervenants");
2390-                          }}
2391-                        >
2392:                          <Text style={styles.saveNotesBtnText}>🩺 Planning des intervenants →</Text>
2393-                        </TouchableOpacity>
2394-                        <TouchableOpacity
2395-                          style={[styles.saveNotesBtn, { backgroundColor: C.card, borderWidth: 1, borderColor: C.orange, marginTop: 8 }]}
2396:                          onPress={() => setNightIntervenantModalVisible(true)}
2397-                        >
2398:                          <Text style={[styles.saveNotesBtnText, { color: C.orange }]}>🌙 Nuitées intervenants</Text>
2399-                        </TouchableOpacity>
2400-                        <TouchableOpacity
2401-                          style={[styles.saveNotesBtn, { backgroundColor: C.card, borderWidth: 1, borderColor: C.orange, marginTop: 8 }]}
2402-                          onPress={() => setPriorityModalVisible(true)}
2403-                        >
2404:                          <Text style={[styles.saveNotesBtnText, { color: C.orange }]}>⚡ Priorité des créneaux intervenants</Text>
2405-                        </TouchableOpacity>
2406-                        <TouchableOpacity
2407-                          style={[styles.saveNotesBtn, { backgroundColor: C.card, borderWidth: 1, borderColor: C.orange, marginTop: 8 }]}
2408:                          onPress={() => setNewsIntervenantModalVisible(true)}
2409-                        >
2410:                          <Text style={[styles.saveNotesBtnText, { color: C.orange }]}>📰 Nouvelles des intervenants</Text>
2411-                        </TouchableOpacity>
2412-                      </>
2413-                    )}
2414-                  </View>
2415-                )}
2416-              </>
2417-            )}
2418-          </>
2419-        ) : (
2420-          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
2421-            <Text style={[styles.cardDesc, { color: C.muted }]}>
2422-              Aucun espace patient actif.{"\n"}Rendez-vous sur avectoi.care pour créer votre espace.
2423-            </Text>
2424-          </View>
2425-        )}
2426-
2427:        {/* ── Section : Historique (sous-blocs Visiteurs, Intervenants, puis Historique) ── */}
2428-        {hasSpace && space && activeSection === "hist" && (
2429-          <VisitorsBlock spaceId={space.id} C={C} adminFirstname={space.admin_firstname} adminLastname={space.admin_lastname} />
2430-        )}
2431-        {hasSpace && space && activeSection === "hist" && (
2432:          <IntervenantsBlock spaceId={space.id} C={C} />
2433-        )}
2434-        {hasSpace && space && activeSection === "hist" && (
2435-          <>
2436-            <Text style={[styles.sectionTitle, { color: C.gold }]}>Historique</Text>
2437-            <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
2438-              <TextInput
2439-                style={[styles.sectorInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text, marginBottom: 16 }]}
2440-                placeholder="🔍 Rechercher un mot-clé (toutes rubriques)…"
2441-                placeholderTextColor={C.muted}
2442-                value={historySearch}
2443-                onChangeText={setHistorySearch}
2444-              />
2445-
2446-              {/* Bloc 1 : Infos hospitalières */}
2447-              <TouchableOpacity style={styles.historyBlockHeader} onPress={() => toggleHistoryBlock("hosp")} activeOpacity={0.7}>
--
2536-                      )}
2537-                      <Text style={[styles.historyDate, { color: C.muted }]}>
2538-                        {new Date(h.changed_at).toLocaleString("fr-FR", {
2539-                          day: "numeric", month: "long", year: "numeric",
2540-                          hour: "2-digit", minute: "2-digit",
2541-                        })}
2542-                      </Text>
2543-                    </View>
2544-                  ))
2545-                )
2546-              )}
2547-
2548-              <View style={[styles.fieldDivider, { backgroundColor: C.border }]} />
2549-
2550-              {/* Bloc 3bis : Soins planifiés — même donnée que la section
2551:                  "Soins planifiés" de IntervenantProfileModal (tous
2552:                  intervenants confondus), mais historique complet (passés ET
2553-                  à venir) triée anté-chronologiquement : le plus récent/
2554-                  tardif en haut, le plus ancien tout en bas du scroll. */}
2555-              <TouchableOpacity style={styles.historyBlockHeader} onPress={() => toggleHistoryBlock("soins")} activeOpacity={0.7}>
2556-                <View style={styles.historyBlockTitleRow}>
2557-                  <Text style={[styles.fieldLabel, { color: C.gold, marginBottom: 0, flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="tail">
2558-                    🩺 Soins planifiés
2559-                  </Text>
2560-                  {filteredSoinsPlanifies.length > 0 && (
2561-                    <Text style={[styles.fieldLabel, { color: C.gold, marginBottom: 0, marginLeft: 4, flexShrink: 0 }]}>
2562-                      ({filteredSoinsPlanifies.length})
2563-                    </Text>
2564-                  )}
2565-                </View>
2566-                <Text style={[styles.historyToggleIcon, { color: C.muted }]}>{historyBlocksOpen.soins ? "▾" : "▸"}</Text>
2567-              </TouchableOpacity>
--
2585-                        <Text style={[styles.historyDate, { color: C.muted }]}>
2586-                          {new Date(r.date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} · {r.creneau}
2587-                        </Text>
2588-                      </View>
2589-                      <Text style={[styles.historyRowChevron, { color: C.muted }]}>›</Text>
2590-                    </TouchableOpacity>
2591-                  ))
2592-                )
2593-              )}
2594-
2595-              <View style={[styles.fieldDivider, { backgroundColor: C.border }]} />
2596-
2597-              {/* Bloc 3ter : Réservations visiteurs — visites et nuitées
2598-                  réservées par un visiteur ou par l'admin (aussi un visiteur),
2599-                  à l'exclusion des soins et des nuitées réservées par un
2600:                  intervenant (cf. loadResaVisiteurs). Historique complet,
2601-                  passées ET à venir, plus récent en haut. */}
2602-              <TouchableOpacity style={styles.historyBlockHeader} onPress={() => toggleHistoryBlock("resaVisiteurs")} activeOpacity={0.7}>
2603-                <View style={styles.historyBlockTitleRow}>
2604-                  <Text style={[styles.fieldLabel, { color: C.gold, marginBottom: 0, flexShrink: 1 }]} numberOfLines={1} ellipsizeMode="tail">
2605-                    🌙 Réservations visiteurs
2606-                  </Text>
2607-                  {filteredResaVisiteurs.length > 0 && (
2608-                    <Text style={[styles.fieldLabel, { color: C.gold, marginBottom: 0, marginLeft: 4, flexShrink: 0 }]}>
2609-                      ({filteredResaVisiteurs.length})
2610-                    </Text>
2611-                  )}
2612-                </View>
2613-                <Text style={[styles.historyToggleIcon, { color: C.muted }]}>{historyBlocksOpen.resaVisiteurs ? "▾" : "▸"}</Text>
2614-              </TouchableOpacity>
2615-              {historyBlocksOpen.resaVisiteurs && (
--
3469-                        {nameChangeSending
3470-                          ? <ActivityIndicator color="#fff" size="small" />
3471-                          : <Text style={styles.btnPrimaryText}>Envoyer</Text>
3472-                        }
3473-                      </TouchableOpacity>
3474-                    </View>
3475-                  </Fragment>
3476-                )}
3477-              </View>
3478-            </TouchableOpacity>
3479-          </TouchableOpacity>
3480-        </KeyboardAvoidingView>
3481-      </Modal>
3482-
3483-      {space && slotConfig && (
3484:        <IntervenantPriorityModal
3485-          visible={priorityModalVisible}
3486-          onClose={() => setPriorityModalVisible(false)}
3487-          spaceId={space.id}
3488:          currentMode={slotConfig.intervenant_priority_mode ?? "all"}
3489-          C={C}
3490:          onSaved={() => { refreshSlotConfig(); showToast("Priorité des créneaux intervenants enregistrée ✓"); }}
3491-        />
3492-      )}
3493-
3494-      {space && slotConfig && (
3495:        <NightIntervenantModal
3496:          visible={nightIntervenantModalVisible}
3497:          onClose={() => setNightIntervenantModalVisible(false)}
3498-          spaceId={space.id}
3499:          currentMode={slotConfig.night_intervenant_mode ?? "disabled"}
3500-          C={C}
3501-          onSaved={() => { refreshSlotConfig(); showToast("Modification enregistrée"); }}
3502-        />
3503-      )}
3504-
3505-      {space && slotConfig && (
3506:        <NewsIntervenantModal
3507:          visible={newsIntervenantModalVisible}
3508:          onClose={() => setNewsIntervenantModalVisible(false)}
3509-          spaceId={space.id}
3510:          currentMode={slotConfig.news_intervenant_mode ?? "disabled"}
3511-          C={C}
3512-          onSaved={() => { refreshSlotConfig(); showToast("Modification enregistrée"); }}
3513-        />
3514-      )}
3515-
3516-      {space && slotConfig && (
3517-        <NightVisitorModal
3518-          visible={nightVisitorModalVisible}
3519-          onClose={() => setNightVisitorModalVisible(false)}
3520-          spaceId={space.id}
3521-          currentMode={slotConfig.night_visitor_mode ?? "all"}
3522-          C={C}
3523-          onSaved={() => { refreshSlotConfig(); showToast("Modification enregistrée"); }}
3524-        />
3525-      )}
--
3541-          <View style={[styles.centeredSheet, { backgroundColor: C.card, borderColor: C.accent, maxHeight: "82%" }]}>
3542-            <Text style={[styles.sheetTitle, { color: C.text }]}>🕐 Chronologie</Text>
3543-            <Text style={[styles.cardDesc, { color: C.muted, marginBottom: 10 }]}>
3544-              Du plus récent (en haut) à {space?.home_care_mode ? "l'entrée en soin" : "l'hospitalisation"} (en bas) — fais défiler la frise pour naviguer.
3545-            </Text>
3546-
3547-            {chronoLoading ? (
3548-              <ActivityIndicator color={C.accent} style={{ marginVertical: 24 }} />
3549-            ) : chronoEvents.length === 0 ? (
3550-              <Text style={[styles.historyEmpty, { color: C.muted }]}>Aucun événement pour l'instant.</Text>
3551-            ) : (
3552-              <ScrollView style={styles.chronoScroll} showsVerticalScrollIndicator nestedScrollEnabled>
3553-                {chronoEvents.map((ev, i) => {
3554-                  const isLast = i === chronoEvents.length - 1;
3555-                  const dotColor = chronoKindColor(ev.kind, C);
3556:                  const isIntervenantFrame = ev.kind === "soin" || ev.kind === "resa_intervenant";
3557-                  const isVisiteurFrame = ev.kind === "resa";
3558-                  return (
3559-                    <View key={ev.id} style={styles.chronoRow}>
3560-                      <View style={styles.chronoRail}>
3561-                        <View style={[styles.chronoDot, { backgroundColor: dotColor, borderColor: C.card }]}>
3562-                          <Text style={styles.chronoDotIcon}>{ev.icon}</Text>
3563-                        </View>
3564-                        {!isLast && <View style={[styles.chronoLine, { backgroundColor: C.border }]} />}
3565-                      </View>
3566-                      <View
3567-                        style={[
3568-                          styles.chronoContent,
3569:                          isIntervenantFrame && [styles.chronoSoinBox, { borderColor: LOGO_PURPLE, backgroundColor: `${LOGO_PURPLE}14` }],
3570-                          isVisiteurFrame && [styles.chronoSoinBox, { borderColor: C.success, backgroundColor: `${C.success}14` }],
3571-                        ]}
3572-                      >
3573-                        <Text style={[styles.historyDate, { color: C.muted }]}>
3574-                          {ev.date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
3575-                        </Text>
3576-                        <Text style={[styles.chronoTitle, { color: ev.kind === "hospitalisation" ? C.danger : C.text }]}>
3577-                          {ev.title}
3578-                        </Text>
3579-                        {ev.detail && (
3580:                          <Text style={[styles.historyOld, { color: isIntervenantFrame ? LOGO_PURPLE : isVisiteurFrame ? C.success : C.muted }]}>
3581-                            {ev.detail}
3582-                          </Text>
3583-                        )}
3584-                      </View>
3585-                    </View>
3586-                  );
3587-                })}
3588-              </ScrollView>
3589-            )}
3590-
3591-            {!chronoLoading && !space?.patient_admission_date && (
3592-              <Text style={[styles.historyEmpty, { color: C.muted, marginTop: 8 }]}>
3593-                🏥 {space?.home_care_mode ? "La date de début du soin à domicile n'est" : "La date d'hospitalisation n'est"} pas renseignée — ajoute-la dans la fiche patient ci-dessus pour l'afficher tout en bas de la frise.
3594-              </Text>
3595-            )}

```

### app/(admin)/home/calendar.tsx

Fichier partagé — calendrier admin, contient l'affichage/la gestion des interventions.

```tsx
1-import { useState, useMemo, useRef } from "react";
2-import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Modal, Switch } from "react-native";
3-import { useRouter } from "expo-router";
4-import { useSpace } from "@/lib/SpaceContext";
5-import { supabase } from "@/lib/supabase";
6-import {
7-  getDayStatus, findNextAvailableSlot, getDaysInMonth, getMonday, addDays, toISO, toFrLong, isMyReservation,
8-} from "@/lib/slotUtils";
9-import { deleteLinkedCalendarEvent } from "@/lib/calendarSync";
10-import { useDisplayMode } from "@/lib/DisplayModeContext";
11-import { LOGO_GREEN, LOGO_PURPLE } from "@/lib/themes";
12-import SpaceHeader from "@/components/SpaceHeader";
13-import SegmentedSwitch from "@/components/SegmentedSwitch";
14-import WeekStrip from "@/components/WeekStrip";
15:import IntervenantPlanningPanel from "@/components/IntervenantPlanningPanel";
16-import SoinsDayDetail from "@/components/SoinsDayDetail";
17-import AdminAddReservation, { type AdminAddReservationHandle } from "@/components/AdminAddReservation";
18-import AdminEditReservation, { type AdminEditReservationHandle } from "@/components/AdminEditReservation";
19-import DeleteReservationConfirm, { type DeleteReservationConfirmHandle } from "@/components/DeleteReservationConfirm";
20-import { isSpaceCapped } from "@/lib/freemiumCap";
21-import type { Reservation } from "@/lib/types";
22-
23-const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];
24-
25-export default function AdminCalendarScreen() {
26-  const { space, slotConfig, slots, reservations, loading, hasSpace, selectedDay, setSelectedDay, setPendingBookingSlot, refreshReservations, getConfigForDate, getSlotsForDate } = useSpace();
27-  const router = useRouter();
28-  const { theme: C } = useDisplayMode();
29-  const [nextDispoModal, setNextDispoModal] = useState<{ date: Date; iso: string; slot: string } | null>(null);
30-  const [blockedDayModal, setBlockedDayModal] = useState<Date | null>(null);
--
128-    showToast(ids.length > 1 ? "Réservations supprimées ✓" : "Réservation supprimée ✓");
129-  }
130-
131-  if (loading) return null;
132-
133-  if (!hasSpace || !space || !slotConfig) {
134-    return (
135-      <View style={[styles.center, { backgroundColor: C.bg }]}>
136-        <Text style={[styles.emptyText, { color: C.muted }]}>Aucun espace patient actif.</Text>
137-      </View>
138-    );
139-  }
140-
141-  // Identité personnelle de l'admin (voir mesCreneauxOnly ci-dessus) —
142-  // toujours issue du space, jamais d'une session à charger comme côté
143:  // visiteur/intervenant.
144-  const myPin = space.admin_pin ?? null;
145-  const myPrenom = space.admin_firstname ?? null;
146-  const myNom = space.admin_lastname ?? null;
147-  const identityReady = !!myPrenom && !!myNom;
148-  // isMyReservation() retombe sur un simple match de PIN (sans vérifier le
149-  // nom) quand myPrenom/myNom sont vides — sûr côté visiteur (nom chargé de
150-  // façon asynchrone, au pire brièvement absent) mais pas pour l'admin : son
151-  // PIN peut être défini (recopié depuis son profil, voir account.tsx) sans
152-  // que admin_firstname/admin_lastname le soient (colonnes renseignées une
153-  // fois à la création de l'espace seulement). Sans cette garde, un visiteur
154-  // ayant choisi le même PIN à 4 chiffres que l'admin (pas garanti unique
155-  // dans l'espace) serait à tort reconnu comme "mien". On ignore donc le PIN
156-  // tant que le nom n'est pas fiable.
157-  const effectiveMyPin = identityReady ? myPin : null;
158-
--
164-
165-  // Marqueurs hospitalisation (F) / sortie (G) et seuil de grisage/réservation
166-  // (E) de la vue Hebdo — au format "YYYY-MM-DD", comparables directement aux
167-  // iso des jours de la bande.
168-  const admissionIso = space.patient_admission_date;
169-  const dischargeIso = space.patient_discharge_date;
170-  // Anniversaire du patient : ne compare que mois+jour ("MM-DD"), l'année de
171-  // patient_birthdate étant celle de naissance — se répète donc chaque année
172-  // dans la grille mensuelle (voir aussi BirthdayAlertModal, même logique).
173-  const birthdateMonthDay = space.patient_birthdate ? space.patient_birthdate.slice(5) : null;
174-
175-  const selectedIso = toISO(selectedDay);
176-  const selectedDayConfig = getConfigForDate(selectedIso) ?? slotConfig;
177-  const selectedDaySlots = getSlotsForDate(selectedIso);
178-
179:  // Période affichée par le panneau perso (IntervenantPlanningPanel) — suit
180-  // le switch Mensuel/Hebdo et le mois/la semaine parcouru(e), même logique
181-  // que (visitor)/home/calendar.tsx.
182-  const periodStartIso = planningView === "hebdo"
183-    ? toISO(weekAnchor)
184-    : toISO(new Date(calMonth.year, calMonth.month, 1));
185-  const periodEndIso = planningView === "hebdo"
186-    ? toISO(addDays(weekAnchor, 6))
187-    : toISO(new Date(calMonth.year, calMonth.month + 1, 0));
188-
189:  // Panneau perso sous le calendrier (IntervenantPlanningPanel) — même
190-  // logique que le visiteur (élargi aux réservations partageant EXACTEMENT
191-  // un de mes créneaux, ex. un autre visiteur au même horaire) ; la grille,
192-  // elle, affiche toujours la vérité complète, voir familyBooked plus bas.
193-  const myReservations = identityReady
194-    ? reservations.filter((r) => isMyReservation(r, effectiveMyPin, null, myPrenom, myNom))
195-    : reservations;
196-  const myPanelSlotKeys = new Set(myReservations.map((r) => `${r.date}|${r.creneau}`));
197-  const panelReservations = mesCreneauxOnly && identityReady
198-    ? reservations.filter((r) => myPanelSlotKeys.has(`${r.date}|${r.creneau}`))
199-    : reservations;
200-
201-  // Tap sur une case de la bande Hebdo — en mode Visites, même comportement
202-  // que le visiteur : navigue vers l'écran dédié des créneaux, aucun détail
203-  // affiché inline. En mode Soins, l'admin n'a pas d'écran dédié aux soins
204-  // (home/slots.tsx est réservé aux visites) — on se contente de sélectionner
--
285-          {DAY_LABELS.map((d, i) => (
286-            <Text key={i} style={[styles.dayLabel, { color: C.muted }]}>{d}</Text>
287-          ))}
288-        </View>
289-
290-        <View style={styles.grid}>
291-          {Array(firstDow).fill(null).map((_, i) => <View key={`e${i}`} style={[styles.cellOuter, styles.cell]} />)}
292-          {monthDays.map((day) => {
293-            const iso = toISO(day);
294-            const dayReservations = reservationsByDate.get(iso) ?? [];
295-            const dayConfig = getConfigForDate(iso) ?? slotConfig;
296-            const daySlots = getSlotsForDate(iso);
297-            // `status` sert au blocage/navigation (tap sur la case) et suit
298-            // le type du mode actif. La pastille, elle, ne représente plus
299-            // jamais que les visites — voir visiteStatus.
300:            const status = getDayStatus(dayReservations, iso, day, dayConfig, daySlots, startDate, soinsMode ? "Intervention" : "Visite");
301-            const isToday = toISO(day) === toISO(today);
302-            const isSelected = toISO(day) === toISO(selectedDay);
303-            const isPast = iso < toISO(today) || status === "past";
304-            // Un jour non réservable (avant le début du suivi, jour de
305-            // semaine exclu, date bloquée) reste non cliquable — mais un
306-            // jour simplement passé s'ouvre, en lecture, pour voir qui est
307-            // venu ce jour-là.
308-            const isDisabled = status === "past" || iso === admissionIso;
309-            // Pastille Dispo/Partiel/Complet : ne représente plus que les
310-            // visites, et ne s'affiche qu'en mode Visites — en mode Soins,
311-            // seul le cadre violet reste visible.
312-            const visiteStatus = getDayStatus(dayReservations, iso, day, dayConfig, daySlots, startDate, "Visite");
313-            const dotColor = soinsMode ? "transparent" :
314-              visiteStatus === "full" ? C.danger :
315-              visiteStatus === "partial" ? C.orange :
316-              visiteStatus === "empty" ? C.success : "transparent";
317-
318-            // Bande verte en bas de case = strictement personnelle (mes
319-            // propres visites/nuitées, voir isMyReservation/identityReady
320-            // plus haut) — jamais celles d'un autre visiteur. Toujours
321-            // visible, quel que soit le mode ou "Afficher mes créneaux".
322-            const familyBooked = dayReservations.some((r) => isMyReservation(r, effectiveMyPin, null, myPrenom, myNom));
323-            // Cadre violet : uniquement en mode Soins (l'admin n'a jamais de
324:            // fiche intervenant, donc pas de filtrage "mes cadres" possible
325-            // ici — toujours la vérité complète des soins de tous les
326:            // intervenants).
327:            const interventionBooked = dayReservations.some((r) => r.type === "Intervention");
328-            const frameVisible = soinsMode && interventionBooked;
329-            // Jour hospitalisation/sortie/anniversaire : remplace tout le
330-            // contenu de la case (numéro du jour compris) par un pictogramme
331-            // plein cadre, jamais grisé même passé — voir styles.cellSpecialIcon.
332-            const specialIcon = iso === admissionIso ? "🏥" : iso === dischargeIso ? "🏠" : birthdateMonthDay === iso.slice(5) ? "🎉" : null;
333-
334-            return (
335-              <View key={iso} style={styles.cellOuter}>
336-                <TouchableOpacity
337-                  style={[
338-                    styles.cell,
339-                    {
340-                      backgroundColor: isSelected ? C.accent : specialIcon ? C.card : isPast ? "transparent" : C.card,
341-                      borderColor: isSelected ? C.accent : frameVisible ? LOGO_PURPLE : isToday ? C.gold : C.border,
342-                      borderWidth: isToday || frameVisible ? 2 : 1,
--
383-                <View style={[styles.legendDot, { backgroundColor: color }]} />
384-                <Text style={[styles.legendLabel, { color: C.muted }]}>{label}</Text>
385-              </View>
386-            ),
387-          )}
388-        </View>
389-        <View style={[styles.legend, styles.legendRow2]}>
390-          <View style={styles.legendItem}>
391-            <View style={[styles.legendStripeSwatch, { borderColor: C.border }]}>
392-              <View style={[styles.legendStripeBar, { backgroundColor: LOGO_GREEN }]} />
393-            </View>
394-            <Text style={[styles.legendLabel, { color: C.muted }]}>Mes créneaux</Text>
395-          </View>
396-          <View style={styles.legendItem}>
397-            <View style={[styles.legendFrame, { borderColor: LOGO_PURPLE }]} />
398:            <Text style={[styles.legendLabel, { color: C.muted }]}>{soinsMode ? "Soin" : "Intervenant"}</Text>
399-          </View>
400-        </View>
401-        </>
402-        ) : (
403-        <>
404-        {/* Vue Hebdo (D) — bande de 7 jours avec marqueurs hospitalisation/
405-            sortie (F/G) et grisage avant la date d'hospitalisation (E). Aucun
406-            détail de jour affiché inline ici, exactement comme le visiteur :
407-            un tap navigue vers l'écran dédié des créneaux (en mode Visites).
408-            En mode Soins, l'admin n'a pas d'écran dédié — le détail
409-            (lecture seule) est affiché plus bas, sous le switch. */}
410-        <WeekStrip
411-          C={C}
412-          slotConfig={slotConfig}
413-          reservations={reservations}
414-          getSlotsForDate={getSlotsForDate}
415-          getConfigForDate={getConfigForDate}
416-          startDate={startDate}
417-          weekAnchor={weekAnchor}
418-          onWeekChange={setWeekAnchor}
419-          selectedIso={selectedIso}
420-          onSelectDay={(iso) => setSelectedDay(new Date(iso + "T00:00:00"))}
421-          onDayPress={handleWeekDayPress}
422-          soinsMode={soinsMode}
423-          mesCreneauxOnly={mesCreneauxOnly}
424-          role="visiteur"
425:          intervenantProfileId={null}
426-          myPin={effectiveMyPin}
427-          myPrenom={myPrenom}
428-          myNom={myNom}
429-          admissionIso={admissionIso}
430-          dischargeIso={dischargeIso}
431-        />
432-        </>
433-        )}
434-
435-        {/* Switch Visites/Soins + "Afficher mes créneaux" regroupés dans un
436-            même bloc, placé sous le calendrier — mêmes réglages que le
437-            visiteur : eux seuls règlent l'affichage du panneau perso juste
438-            en dessous, le calendrier affichant toujours la vérité complète
439-            (voir familyBooked plus haut). Le bloc reste affiché même sans
440:            intervenants activés, "Afficher mes créneaux" restant utile pour
441-            filtrer les visites/nuitées. */}
442-        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border, marginTop: 16 }]}>
443:          {space.intervenants_enabled && (
444-            <SegmentedSwitch value={soinsMode} onChange={setSoinsMode} leftLabel="Visites" rightLabel="Soins" C={C} thumbWidth={viewThumbWidth || undefined} />
445-          )}
446-          <View style={styles.toggleRow}>
447-            <View style={{ flex: 1 }}>
448-              <Text style={[styles.toggleLabel, { color: C.text }]}>👁️ Afficher mes créneaux</Text>
449-              <Text style={[styles.toggleDesc, { color: C.muted }]}>
450-                {mesCreneauxOnly
451-                  ? "Le panneau ci-dessous ne liste que vos propres visites/nuitées. Le calendrier, lui, affiche toujours tout le monde."
452-                  : soinsMode
453:                    ? "Le panneau ci-dessous liste les soins de tous les intervenants de l'espace patient."
454-                    : "Le panneau ci-dessous liste les visites/nuitées de tout le monde."}
455-              </Text>
456-            </View>
457-            <Switch
458-              value={mesCreneauxOnly}
459-              onValueChange={setMesCreneauxOnly}
460-              trackColor={{ false: C.border, true: C.accent }}
461-              thumbColor="#fff"
462-            />
463-          </View>
464-        </View>
465-
466-        {/* Détail Soins de la semaine (Hebdo + mode Soins uniquement) — pas
467-            d'écran dédié équivalent à home/slots.tsx pour les soins côté
468-            admin, donc affiché ici en lecture seule, juste avant "SOINS
469-            PLANIFIÉS". */}
470-        {planningView === "hebdo" && soinsMode && (
471-          <>
472-            <Text style={[styles.weekDayTitle, { color: C.text, marginTop: 16 }]}>{toFrLong(selectedDay)}</Text>
473-            <SoinsDayDetail
474-              C={C}
475-              iso={selectedIso}
476-              day={selectedDay}
477-              config={selectedDayConfig}
478-              daySlots={selectedDaySlots}
479-              reservations={reservations}
480:              status={getDayStatus(reservations, selectedIso, selectedDay, selectedDayConfig, selectedDaySlots, startDate, "Intervention")}
481-            />
482-          </>
483-        )}
484-
485-        <View style={{ marginTop: 16 }}>
486:          <IntervenantPlanningPanel
487-            C={C}
488-            reservations={panelReservations}
489-            soinsMode={soinsMode}
490-            myPin={effectiveMyPin}
491-            myPrenom={myPrenom}
492-            myNom={myNom}
493-            periodStartIso={periodStartIso}
494-            periodEndIso={periodEndIso}
495-            periodLabel={planningView === "hebdo" ? "cette semaine" : "ce mois-ci"}
496-          />
497-        </View>
498-      </ScrollView>
499-
500-      <AdminAddReservation
501-        ref={addRef}
--
599-  dayLabels: { flexDirection: "row", justifyContent: "center", gap: 3, marginBottom: 4 },
600-  dayLabel: { width: "13.5%", textAlign: "center", fontFamily: "DM_Sans_600SemiBold", fontSize: 10 },
601-  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 3, marginBottom: 10 },
602-  cellOuter: { width: "13.5%", position: "relative" },
603-  cell: { aspectRatio: 1, borderRadius: 8, borderWidth: 1, overflow: "hidden" },
604-  cellInner: { flex: 1, width: "100%", alignItems: "center", justifyContent: "center", gap: 2 },
605-  cellDate: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, textAlignVertical: "center", includeFontPadding: false },
606-  // Jour hospitalisation/sortie/anniversaire : pictogramme plein cadre à la
607-  // place du numéro du jour, centré horizontalement et verticalement.
608-  cellSpecialIcon: { fontSize: 20, lineHeight: 24 },
609-  dot: { width: 4, height: 4, borderRadius: 2 },
610-  visitStripe: { position: "absolute", left: 0, right: 0, bottom: 0, height: 4 },
611-  legend: { flexDirection: "row", justifyContent: "center", gap: 20 },
612-  legendPrefix: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11 },
613-  // Ecart plus large que la ligne du dessus pour bien séparer "Mes créneaux"
614:  // de "Intervenant"/"Soin".
615-  legendRow2: { marginTop: 8, gap: 40 },
616-  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
617-  legendDot: { width: 8, height: 8, borderRadius: 4 },
618-  legendFrame: { width: 14, height: 14, borderRadius: 4, borderWidth: 2 },
619-  legendStripeSwatch: { width: 14, height: 14, borderRadius: 4, borderWidth: 1, overflow: "hidden" },
620-  legendStripeBar: { position: "absolute", left: 0, right: 0, bottom: 0, height: 3 },
621-  legendLabel: { fontFamily: "DM_Sans_400Regular", fontSize: 11 },
622-
623-  card: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 6 },
624-  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
625-  toggleLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14, marginBottom: 4 },
626-  toggleDesc: { fontFamily: "DM_Sans_400Regular", fontSize: 12, lineHeight: 17 },
627-
628-  weekDayTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 16, textTransform: "capitalize", textAlign: "center", marginBottom: 10 },
629-

```

### app/(admin)/news.tsx

Fichier partagé — écran actualités admin, contient le mode de diffusion ciblé intervenant.

```tsx
18-
19-  if (!hasSpace || !space) {
20-    return (
21-      <View style={[styles.center, { backgroundColor: C.bg }]}>
22-        <Text style={[styles.msg, { color: C.muted }]}>Aucun espace patient actif.</Text>
23-      </View>
24-    );
25-  }
26-
27-  return (
28-    <NewsFeed
29-      spaceId={space.id}
30-      C={C}
31-      isAdmin={true}
32-      capped={isSpaceCapped(space, reservations)}
33:      newsIntervenantMode={slotConfig?.news_intervenant_mode ?? "disabled"}
34-    />
35-  );
36-}
37-
38-const styles = StyleSheet.create({
39-  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
40-  msg: { fontFamily: "DM_Sans_400Regular", fontSize: 15, textAlign: "center" },
41-});

```

### app/(admin)/_layout.tsx

Fichier partagé — layout admin, contient la référence à l'onglet/écran intervenants.

```tsx
126-              tabBarIcon: ({ color, size }) => <Ionicons name="heart-outline" size={size} color={color} />,
127-            }}
128-          />
129-          <Tabs.Screen
130-            name="account"
131-            options={{
132-              title: "Compte",
133-              tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} />,
134-            }}
135-          />
136-          <Tabs.Screen
137-            name="settings"
138-            options={{ href: null }}
139-          />
140-          <Tabs.Screen
141:            name="intervenants"
142-            options={{ href: null }}
143-          />
144-          <Tabs.Screen
145-            name="mes-souvenirs"
146-            options={{ href: null }}
147-          />
148-        </Tabs>
149-      </AdminGate>
150-    </AdminSpaceProvider>
151-  );
152-}
153-
154-const styles = StyleSheet.create({
155-  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
156-});

```

### app/(visitor)/_layout.tsx

Fichier partagé — layout visiteur/intervenant, contient le routage conditionnel selon le rôle intervenant.

```tsx
4-import { Ionicons } from "@expo/vector-icons";
5-import AsyncStorage from "@react-native-async-storage/async-storage";
6-import * as ImagePicker from "expo-image-picker";
7-import { File, Paths } from "expo-file-system";
8-import { supabase } from "@/lib/supabase";
9-import { VisitorSpaceProvider, useVisitorSpace } from "@/lib/VisitorContext";
10-import { useDisplayMode } from "@/lib/DisplayModeContext";
11-import { setupNotifications } from "@/lib/notifications";
12-import { getVisitorSession, saveVisitorSession } from "@/lib/visitorSession";
13-import PinPad from "@/components/PinPad";
14-import PatientAvatar from "@/components/PatientAvatar";
15-import RebookingAlertModal from "@/components/RebookingAlertModal";
16-import BookingProposalAlertModal from "@/components/BookingProposalAlertModal";
17-import RelaisAlertModal from "@/components/RelaisAlertModal";
18-import BirthdayAlertModal from "@/components/BirthdayAlertModal";
19:import IntervenantOnboardingFlow from "@/components/IntervenantOnboardingFlow";
20-
21-function VisitorTabs() {
22-  const { space, token, loading } = useVisitorSpace();
23-  const router = useRouter();
24-  const { theme: C } = useDisplayMode();
25-  const [consentGiven, setConsentGiven] = useState<boolean | null>(null);
26-
27-  // Identité stable du visiteur — demandée une seule fois, à la toute
28-  // première arrivée sur cet espace (avant même le consentement RGPD),
29-  // et jamais réécrite ensuite par une réservation ou une autre action :
30-  // c'est elle qui préremplit les formulaires par défaut, y compris quand
31-  // le visiteur réserve pour quelqu'un d'autre (ex. un proche âgé sans
32-  // téléphone) — voir BookingFlow.tsx.
33-  const [identityKnown, setIdentityKnown] = useState<boolean | null>(null);
34-  const [identityPrenom, setIdentityPrenom] = useState("");
35-  const [identityNom, setIdentityNom] = useState("");
36-  // Choisi une seule fois ici, dès la connexion — devient le PIN par défaut
37-  // préempli (mais toujours modifiable) sur toutes les actions protégées
38-  // (Entraide, nouvelles, soutien, souvenirs, réservations) : voir samePerson()
39-  // dans Entraide.tsx et les écrans équivalents.
40-  const [identityPin, setIdentityPin] = useState("");
41-  const [savingIdentity, setSavingIdentity] = useState(false);
42:  // Photo choisie sur ce même popup identité — intervenant uniquement (voir
43-  // rendu ci-dessous). Uploadée seulement après création de la fiche par
44:  // IntervenantOnboardingFlow.tsx, qui a besoin de l'id du profil.
45-  const [identityPhotoUri, setIdentityPhotoUri] = useState<string | null>(null);
46-
47:  // Rôle de la session (visiteur par défaut) — un intervenant doit créer sa
48-  // fiche (métier + soins pratiqués) avant de pouvoir continuer, voir
49:  // IntervenantOnboardingFlow.tsx. La fiche n'est jamais redemandée une fois
50:  // intervenantProfileId connu.
51:  const [role, setRole] = useState<"visiteur" | "intervenant">("visiteur");
52:  const [intervenantProfileId, setIntervenantProfileId] = useState<string | null>(null);
53-
54-  useEffect(() => {
55-    setupNotifications();
56-  }, []);
57-
58-  useEffect(() => {
59-    if (!loading && !space) {
60-      router.replace("/auth/visitor-entry");
61-    }
62-  }, [loading, space]);
63-
64-  useEffect(() => {
65-    if (!space) return;
66-    getVisitorSession().then((s) => {
67-      setIdentityKnown(!!(s?.prenom.trim() && s?.nom.trim()));
68-      setRole(s?.role ?? "visiteur");
69:      setIntervenantProfileId(s?.intervenantProfileId ?? null);
70-    });
71-  }, [space?.id]);
72-
73-  useEffect(() => {
74-    if (!space) return;
75-    AsyncStorage.getItem(`consent_${space.id}`).then((val) => {
76-      setConsentGiven(val === "true");
77-    });
78-  }, [space?.id]);
79-
80-  async function handleSaveIdentity() {
81-    if (!space || !identityPrenom.trim() || !identityNom.trim() || identityPin.length < 4) return;
82-    setSavingIdentity(true);
83-    const trimmedPrenom = identityPrenom.trim();
84-    const trimmedNom = identityNom.trim();
85-
86:    // Un intervenant qui se connecte depuis un nouvel appareil (ou après
87:    // réinstallation/vidage du cache) n'a plus intervenantProfileId en
88-    // session locale — sans ce contrôle, la fiche "create" plus bas
89-    // recréerait systématiquement un doublon pour le même prénom/nom au
90-    // lieu de rattacher l'appareil à la fiche existante. Le code à 4
91-    // chiffres saisi ci-dessus sert de vérification avant rattachement.
92:    if (role === "intervenant") {
93-      const { data: existing } = await supabase
94:        .from("intervenant_profiles")
95-        .select("id, pin")
96-        .eq("space_id", space.id)
97-        .ilike("prenom", trimmedPrenom)
98-        .ilike("nom", trimmedNom)
99-        .maybeSingle();
100-
101-      if (existing) {
102-        if (existing.pin !== identityPin) {
103-          setSavingIdentity(false);
104-          Alert.alert(
105-            "Code différent",
106:            "Un intervenant du même prénom et nom existe déjà pour cet espace, avec un autre code. Demande-lui son code à 4 chiffres, ou contacte l'administrateur.",
107-          );
108-          return;
109-        }
110-        await saveVisitorSession({
111-          token, spaceId: space.id, prenom: trimmedPrenom, nom: trimmedNom,
112:          pin: identityPin, intervenantProfileId: existing.id,
113-        });
114-        setSavingIdentity(false);
115:        setIntervenantProfileId(existing.id);
116-        setIdentityKnown(true);
117-        return;
118-      }
119-    }
120-
121-    await saveVisitorSession({ token, spaceId: space.id, prenom: trimmedPrenom, nom: trimmedNom, pin: identityPin });
122-    setSavingIdentity(false);
123-    setIdentityKnown(true);
124-  }
125-
126-  async function pickIdentityPhoto() {
127-    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
128-    if (!perm.granted) {
129-      Alert.alert("Permission refusée", "Autorise l'accès à la galerie dans les paramètres.");
130-      return;
131-    }
132-    const result = await ImagePicker.launchImageLibraryAsync({
133-      mediaTypes: ["images"],
134-      quality: 0.8,
135-      allowsEditing: true,
136-      aspect: [1, 1],
137-    });
138-    if (result.canceled || !result.assets[0]) return;
139-
140-    // Copie dans le dossier document (persistant) — même précaution que
141:    // IntervenantFicheModal.tsx pickPhoto (le fichier renvoyé par le picker
142-    // vit dans le cache de l'app, non garanti de survivre jusqu'à la création
143-    // du compte, plusieurs popups plus tard).
144-    let persistedUri = result.assets[0].uri;
145-    try {
146:      const dest = new File(Paths.document, `intervenant_onboarding_photo_${Date.now()}.jpg`);
147-      new File(result.assets[0].uri).copy(dest);
148-      persistedUri = dest.uri;
149-    } catch {
150-      // Copie échouée : on garde l'uri d'origine, aperçu immédiat quand même
151-      // fonctionnel.
152-    }
153-    setIdentityPhotoUri(persistedUri);
154-  }
155-
156-  async function handleConsent() {
157-    if (!space) return;
158-    await AsyncStorage.setItem(`consent_${space.id}`, "true");
159-    setConsentGiven(true);
160-  }
161-
--
166-      </View>
167-    );
168-  }
169-
170-  return (
171-    <>
172-      <Modal visible={identityKnown === false} transparent animationType="fade" statusBarTranslucent>
173-        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
174-          <ScrollView
175-            style={{ flex: 1 }}
176-            contentContainerStyle={[consentStyles.overlay, { flexGrow: 1, justifyContent: "center", paddingVertical: 16 }]}
177-            keyboardShouldPersistTaps="handled"
178-          >
179-            <View style={[consentStyles.card, identityStyles.compactCard, { backgroundColor: C.card, borderColor: C.border }]}>
180-              <Text style={[consentStyles.title, identityStyles.compactTitle, { color: C.text }]}>👋 Bienvenue !</Text>
181:              {role === "intervenant" && (
182-                <TouchableOpacity style={identityStyles.photoPicker} onPress={pickIdentityPhoto} activeOpacity={0.8}>
183-                  <PatientAvatar
184-                    photoUrl={identityPhotoUri}
185-                    firstname={identityPrenom}
186-                    lastname={identityNom}
187-                    size={64}
188-                    C={C}
189-                  />
190-                  <Text style={[identityStyles.photoPickerText, { color: C.accent }]}>Ajouter une photo</Text>
191-                </TouchableOpacity>
192-              )}
193-              <View style={identityStyles.row}>
194-                <TextInput
195-                  style={[identityStyles.input, identityStyles.rowInput, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
196-                  placeholder="Prénom" placeholderTextColor={C.muted}
--
208-              </Text>
209-              <PinPad value={identityPin} onChange={setIdentityPin} theme={C} />
210-              <TouchableOpacity
211-                style={[consentStyles.btn, identityStyles.compactBtn, { backgroundColor: C.accent }, (!identityPrenom.trim() || !identityNom.trim() || identityPin.length < 4 || savingIdentity) && { opacity: 0.5 }]}
212-                onPress={handleSaveIdentity}
213-                disabled={!identityPrenom.trim() || !identityNom.trim() || identityPin.length < 4 || savingIdentity}
214-                activeOpacity={0.85}
215-              >
216-                {savingIdentity ? <ActivityIndicator color="#fff" size="small" /> : <Text style={consentStyles.btnText}>Continuer</Text>}
217-              </TouchableOpacity>
218-            </View>
219-          </ScrollView>
220-        </KeyboardAvoidingView>
221-      </Modal>
222-
223:      {identityKnown === true && role === "intervenant" && !intervenantProfileId && space && (
224:        <IntervenantOnboardingFlow
225-          visible
226-          spaceId={space.id}
227-          prenom={identityPrenom}
228-          nom={identityNom}
229-          pin={identityPin}
230-          pickedPhotoUri={identityPhotoUri}
231-          theme={C}
232-          onCreated={async (profileId, savedPrenom, savedNom, _telephone, _phraseTotem, _photo, _photoUpdatedAt, savedMetier, _email) => {
233-            await saveVisitorSession({
234:              token, spaceId: space.id, intervenantProfileId: profileId,
235-              prenom: savedPrenom, nom: savedNom, metier: savedMetier ?? "",
236-            });
237-            setIdentityPrenom(savedPrenom);
238-            setIdentityNom(savedNom);
239:            setIntervenantProfileId(profileId);
240-          }}
241-        />
242-      )}
243-
244-      <Modal
245:        visible={identityKnown === true && (role !== "intervenant" || !!intervenantProfileId) && consentGiven === false}
246-        transparent animationType="fade" statusBarTranslucent
247-      >
248-        <View style={consentStyles.overlay}>
249-          <View style={[consentStyles.card, { backgroundColor: C.card, borderColor: C.border }]}>
250-            <Text style={consentStyles.emoji}>👥</Text>
251-            <Text style={[consentStyles.title, { color: C.text }]}>Avant de continuer</Text>
252-            <Text style={[consentStyles.body, { color: C.muted }]}>
253-              Ton prénom et ton nom seront visibles par les autres personnes qui consultent ce planning.
254-            </Text>
255-            <TouchableOpacity
256-              style={[consentStyles.btn, { backgroundColor: C.accent }]}
257-              onPress={handleConsent}
258-              activeOpacity={0.85}
259-            >
260-              <Text style={consentStyles.btnText}>J'ai compris, continuer</Text>
261-            </TouchableOpacity>
262-          </View>
263-        </View>
264-      </Modal>
265-
266:      {identityKnown === true && (role !== "intervenant" || !!intervenantProfileId) && consentGiven === true && <RebookingAlertModal />}
267-
268:      {identityKnown === true && role === "intervenant" && !!intervenantProfileId && consentGiven === true && <BookingProposalAlertModal />}
269-
270:      {identityKnown === true && (role !== "intervenant" || !!intervenantProfileId) && consentGiven === true && !!space && (
271-        <RelaisAlertModal spaceId={space.id} isAdmin={false} />
272-      )}
273-
274:      {identityKnown === true && (role !== "intervenant" || !!intervenantProfileId) && consentGiven === true && !!space && (
275-        <BirthdayAlertModal spaceId={space.id} birthdate={space.patient_birthdate} patientFirstname={space.patient_firstname} />
276-      )}
277-
278-    <Tabs
279-      screenOptions={{
280-        headerShown: false,
281-        tabBarStyle: { backgroundColor: C.card, borderTopColor: C.border, borderTopWidth: 1, paddingBottom: 6 },
282-        tabBarActiveTintColor: C.accent,
283-        tabBarInactiveTintColor: C.muted,
284-        tabBarLabelStyle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11 },
285-      }}
286-    >
287-      <Tabs.Screen
288-        name="home"
289-        options={{
290-          href: undefined,
291-          title: "Accueil",
292-          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
293-        }}
294-        listeners={{
295-          // Le groupe "home" est un Stack à plusieurs écrans (calendrier,
296-          // créneaux, nuits...) sans route "index" — un appui direct sur cet
297-          // onglet doit toujours ramener au calendrier plutôt que de
298-          // dépendre de l'état interne du Stack. Visible et actif pour les 2
299:          // rôles désormais (auparavant réservé à l'intervenant) : le
300-          // visiteur atteignait déjà ce même écran (mode Visites) via des
301-          // boutons "← Accueil" disséminés dans les autres onglets — c'est
302-          // maintenant son point d'entrée principal, en 1ère position.
303-          tabPress: (e) => {
304-            e.preventDefault();
305-            router.push("/(visitor)/home/calendar" as any);
306-          },
307-        }}
308-      />
309-      <Tabs.Screen
310-        name="news"
311-        options={{
312-          title: "Nouvelles",
313-          tabBarIcon: ({ color, size }) => <Ionicons name="newspaper-outline" size={size} color={color} />,
314:          href: role === "intervenant" ? null : undefined,
315-        }}
316-      />
317-      <Tabs.Screen
318-        name="souvenirs"
319-        options={{ href: null }}
320-      />
321-      <Tabs.Screen
322:        name="intervenants"
323-        options={{
324:          title: "Intervenants",
325-          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
326:          href: role === "intervenant" ? undefined : null,
327-        }}
328-      />
329-      <Tabs.Screen
330-        name="entraide"
331-        options={{
332-          title: "Entraide",
333-          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
334:          href: role === "intervenant" ? null : undefined,
335-        }}
336-      />
337-      <Tabs.Screen
338-        name="soins"
339-        options={{
340-          title: "Planning",
341-          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
342:          href: role === "intervenant" ? undefined : null,
343-        }}
344-      />
345-      <Tabs.Screen
346-        name="soutien"
347-        options={{
348-          title: "Soutien",
349-          tabBarIcon: ({ color, size }) => <Ionicons name="heart-outline" size={size} color={color} />,
350:          href: role === "intervenant" ? null : undefined,
351-        }}
352-      />
353-      <Tabs.Screen
354-        name="patients"
355-        options={{
356-          title: "Patients",
357-          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
358:          href: role === "intervenant" ? undefined : null,
359-        }}
360-      />
361-      <Tabs.Screen
362-        name="account"
363-        options={{
364-          title: "Compte",
365-          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} />,
366-        }}
367-      />
368-      <Tabs.Screen
369-        name="mes-souvenirs"
370-        options={{ href: null }}
371-      />
372-    </Tabs>
373-    </>

```

### app/(visitor)/account.tsx

Fichier partagé — écran compte visiteur, contient la logique spécifique au profil intervenant.

```tsx
10-import { useFocusEffect } from "@react-navigation/native";
11-import { useVisitorSpace } from "@/lib/VisitorContext";
12-import { useDisplayMode } from "@/lib/DisplayModeContext";
13-import { supabase } from "@/lib/supabase";
14-import { getVisitorSession, saveVisitorSession, clearVisitorSession } from "@/lib/visitorSession";
15-import { updateLinkedCalendarEvent } from "@/lib/calendarSync";
16-import { enterByDossierCode } from "@/lib/visitorEntry";
17-import { normalizePhone } from "@/lib/phone";
18-import { metierLabel } from "@/lib/metiers";
19-import { relationLabel } from "@/lib/relations";
20-import { isSlotFullyPast } from "@/lib/slotUtils";
21-import { disengageTask as performDisengage } from "@/lib/taskDisengage";
22-import ConfirmModal from "@/components/ConfirmModal";
23-import PinPad from "@/components/PinPad";
24-import PatientProfileModal from "@/components/PatientProfileModal";
25:import IntervenantFicheModal from "@/components/IntervenantFicheModal";
26-import RelationPickerModal from "@/components/RelationPickerModal";
27-import RecurringBookingModal from "@/components/RecurringBookingModal";
28-import VisitorsListModal from "@/components/VisitorsListModal";
29:import { switchToLinkedSpace } from "@/lib/intervenantSpaceSwitch";
30-import SegmentedSwitch from "@/components/SegmentedSwitch";
31-import MyChecklist from "@/components/MyChecklist";
32-import MyAlertsModal from "@/components/MyAlertsModal";
33-import type { Reservation, ReservationChangeHistoryEntry, NewsEntry, SupportMessage, Task } from "@/lib/types";
34-
35-function visitorPhotoUrl(spaceId: string, filename: string) {
36-  const { data } = supabase.storage.from("visitor-photos").getPublicUrl(`${spaceId}/${filename}`);
37-  return data.publicUrl;
38-}
39-
40-function supportPhotoUrl(spaceId: string, filename: string) {
41-  const { data } = supabase.storage.from("support-photos").getPublicUrl(`${spaceId}/${filename}`);
42-  return data.publicUrl;
43-}
44-
45-function newsPhotoUrl(spaceId: string, filename: string) {
46-  const { data } = supabase.storage.from("news-photos").getPublicUrl(`${spaceId}/${filename}`);
47-  return data.publicUrl;
48-}
49-
50:// updatedAt bust le cache CDN/<Image> — voir IntervenantFicheModal.tsx pour
51-// le détail (nom de fichier fixe + upsert, sans ça un ré-upload continuerait
52-// d'afficher l'ancienne photo). Même bucket/convention de nom de fichier
53:// (`${intervenantProfileId}.jpg`) que la fiche intervenant : les deux lisent
54-// et écrivent la même image.
55:function intervenantPhotoUrl(filename: string, updatedAt?: string | null) {
56:  const { data } = supabase.storage.from("intervenant-photos").getPublicUrl(filename);
57-  return updatedAt ? `${data.publicUrl}?v=${new Date(updatedAt).getTime()}` : data.publicUrl;
58-}
59-
60-// Même règle de slug que NewsFeed.tsx / SouvenirsGallery.tsx / Soutien.tsx.
61-function sanitize(str: string) {
62-  return str
63-    .normalize("NFD")
64-    .replace(/[̀-ͯ]/g, "")
65-    .replace(/[^a-zA-Z0-9]/g, "-")
66-    .replace(/-+/g, "-")
67-    .replace(/^-|-$/g, "");
68-}
69-
70:interface LinkedIntervenantSpace {
71-  id: string;
72-  space_id: string;
73-  prenom: string;
74-  nom: string;
75-  pin: string;
76-  patient_spaces: { patient_firstname: string; patient_lastname: string; invite_token: string } | null;
77-}
78-
79-const CAT_ICONS: Record<Task["category"], string> = {
80-  repas: "🍽️", affaires: "🧳", courses: "🛒", transport: "🚗", administratif: "🗂️", autre: "📌", relais: "🆘",
81-};
82-
83-type AccountSectionKey = "info" | "patients" | "mes_soins" | "resv" | "news" | "soutien" | "besoins";
84-// Ordre d'affichage de la grille = ordre des clés ci-dessous : Infos/
85-// Réservations, Nouvelles, Entraide/Soutien. Le PIN n'a plus sa propre tuile
86-// — regroupé dans "Mes informations". "patients" et "mes_soins" n'existent
87:// que pour un intervenant (voir le filter plus bas) — "mes_soins" remplace
88:// "soutien" (Mur de soutien, sans objet côté intervenant) et liste ses soins
89-// effectués/planifiés sur ce patient. "Mes souvenirs" n'est plus une tuile
90-// de cette liste — c'est un bouton à part, juste avant <MyChecklist> plus
91-// bas, qui ouvre components/MesSouvenirs.tsx.
92-const SECTION_META: Record<AccountSectionKey, { icon: string; label: string }> = {
93-  info: { icon: "📝", label: "Mes informations" },
94-  patients: { icon: "👥", label: "Mes Patients" },
95-  mes_soins: { icon: "🩺", label: "Mes soins" },
96-  resv: { icon: "📅", label: "Mes réservations" },
97-  news: { icon: "📰", label: "Mes nouvelles" },
98-  besoins: { icon: "🤝", label: "Entraide" },
99-  soutien: { icon: "💛", label: "Soutien" },
100-};
101-
102-// Onglet "Compte" côté visiteur — juste ses propres infos (pas de bouton
103-// Paramètres, contrairement à la version admin). Prénom/Nom/Email/PIN ne
--
105-// reste toujours ressaisi à la main pour confirmer une action sensible.
106-export default function VisitorAccountScreen() {
107-  const { space, token, slotConfig, slots, reservations: spaceReservations, getConfigForDate, refreshReservations, setSelectedDay, setPendingEditReservationId } = useVisitorSpace();
108-  const router = useRouter();
109-  const { mode, theme: C, setMode } = useDisplayMode();
110-
111-  const [loading, setLoading] = useState(true);
112-  const [prenom, setPrenom] = useState("");
113-  const [nom, setNom] = useState("");
114-  const [email, setEmail] = useState("");
115-  const [pin, setPin] = useState("");
116-  const [pinRevealed, setPinRevealed] = useState(false);
117-  const [photoUri, setPhotoUri] = useState<string | null>(null);
118-  const [motto, setMotto] = useState("");
119-  // Lien avec le patient (Père/Mère/Ami·e/...), voir lib/relations.ts —
120:  // visiteur uniquement (pas de sens pour un intervenant, qui a un métier).
121-  const [relation, setRelation] = useState("");
122:  // Téléphone — intervenant uniquement (colonne intervenant_profiles.telephone,
123:  // voir migration 20260719_intervenant_profiles_contact.sql). Ma phrase totem
124-  // (state `motto` ci-dessus, réutilisé pour les deux rôles) pointe vers
125:  // intervenant_profiles.phrase_totem plutôt que visitor_profiles.motto quand
126:  // role === "intervenant" — voir syncIntervenantContact plus bas.
127-  const [telephone, setTelephone] = useState("");
128:  // Métier — intervenant uniquement (intervenant_profiles.metier, voir
129-  // lib/metiers.ts), même principe que telephone ci-dessus.
130-  const [metier, setMetier] = useState<string | null>(null);
131-  const [saving, setSaving] = useState(false);
132-  const [toast, setToast] = useState("");
133-  const [patientProfileVisible, setPatientProfileVisible] = useState(false);
134-  const [visitorsListVisible, setVisitorsListVisible] = useState(false);
135:  const [role, setRole] = useState<"visiteur" | "intervenant">("visiteur");
136:  const [intervenantProfileId, setIntervenantProfileId] = useState<string | null>(null);
137-  const [ficheModalVisible, setFicheModalVisible] = useState(false);
138-  const [relationModalVisible, setRelationModalVisible] = useState(false);
139-  const [recurringModalVisible, setRecurringModalVisible] = useState(false);
140-
141-  // "Mes Patients" — autres espaces patients déjà rejoints par ce même
142-  // téléphone (basculement direct, sans ressaisir le code dossier — voir
143:  // handleSwitchLinkedSpace). Chargé uniquement pour un intervenant dont le
144-  // téléphone est connu ; n'affecte jamais les visiteurs ni les autres
145-  // espaces (requête filtrée par le téléphone de CET appareil, pas un
146-  // listing ouvert).
147:  const [linkedSpaces, setLinkedSpaces] = useState<LinkedIntervenantSpace[]>([]);
148-  const [switchingSpaceId, setSwitchingSpaceId] = useState<string | null>(null);
149-
150-  // "Rejoindre un nouveau patient" — pivot vers un espace jamais rejoint,
151-  // via le code dossier (voir components/ShareSpace.tsx côté admin). Recrée
152:  // la fiche intervenant à l'identique (photo, téléphone, phrase totem,
153:  // types d'intervention) à partir du profil courant, sans repasser par le
154-  // formulaire de création bloquant — voir handleJoinNewSpace.
155-  const [joinModalVisible, setJoinModalVisible] = useState(false);
156-  const [joinCode, setJoinCode] = useState("");
157-  const [joining, setJoining] = useState(false);
158-  const [joinError, setJoinError] = useState("");
159-
160-  // Changement de PIN — 3 phases dans une même modale, réutilisant le même
161-  // PinPad : (1) vérifier l'ancien PIN, (2) saisir le nouveau, (3) le
162-  // confirmer. Le PIN d'un item déjà créé (réservation, nouvelle…) n'est
163-  // jamais retouché ici : seul celui stocké dans la session change.
164-  // "Se déconnecter" et "Suivre un autre espace" partagent la même modale
165-  // stylée (cf. handleLogout/handleSwitchSpace plus bas) plutôt qu'une Alert
166-  // native pour l'une et une modale custom pour l'autre.
167-  const [confirmModal, setConfirmModal] = useState<"logout" | "switchSpace" | null>(null);
168-  const [alertsModalVisible, setAlertsModalVisible] = useState(false);
--
289-  }
290-
291-  useEffect(() => {
292-    getVisitorSession().then(async (s) => {
293-      if (s) {
294-        setPrenom(s.prenom);
295-        setNom(s.nom);
296-        setEmail(s.email);
297-        setPin(s.pin);
298-        setPhotoUri(s.localPhotoUri);
299-        setMotto(s.motto);
300-        setRelation(s.relation);
301-        setTelephone(s.telephone);
302-        setMetier(s.metier || null);
303-        setRole(s.role ?? "visiteur");
304:        setIntervenantProfileId(s.intervenantProfileId ?? null);
305-        if (space) {
306-          loadActivity(space.id, s.prenom, s.nom);
307:          if (s.role === "intervenant" && s.intervenantProfileId) {
308-            // Photo/téléphone/phrase totem/métier de secours — même principe
309-            // que le fallback visiteur ci-dessous, mais la source de vérité
310:            // est intervenant_profiles (partagée avec la fiche intervenant,
311:            // voir components/IntervenantFicheModal.tsx) plutôt que
312-            // visitor_profiles.
313-            if (!s.localPhotoUri || !s.motto || !s.telephone || !s.metier) {
314-              const { data } = await supabase
315:                .from("intervenant_profiles")
316-                .select("photo, photo_updated_at, telephone, phrase_totem, metier")
317:                .eq("id", s.intervenantProfileId)
318-                .maybeSingle();
319:              if (!s.localPhotoUri && data?.photo) setPhotoUri(intervenantPhotoUrl(data.photo, data.photo_updated_at));
320-              if (!s.motto && data?.phrase_totem) setMotto(data.phrase_totem);
321-              if (!s.telephone && data?.telephone) setTelephone(data.telephone);
322-              if (!s.metier && data?.metier) setMetier(data.metier);
323-            }
324-          } else if (!s.localPhotoUri || !s.motto || !s.relation) {
325-            // Photo/motto/relation de secours : si cet appareil/session n'a plus
326-            // de copie locale (réinstallation, cache vidé, nouvel appareil) mais
327-            // qu'une valeur a déjà été synchronisée (visible côté admin dans ce
328-            // cas, voir components/VisitorsBlock.tsx), on l'affiche quand même
329-            // au lieu de proposer d'en ajouter une comme si elle n'existait pas.
330-            // Un select portant sur "relation" échoue entièrement (et
331-            // viderait aussi photo/motto) tant que la migration
332-            // 20260821_visitor_profiles_relation.sql n'a pas été rejouée
333-            // manuellement en base — repli sans cette colonne au besoin,
334-            // même filet que components/VisitorsList.tsx.
--
350-                .maybeSingle();
351-              data = fallback.data ? { ...fallback.data, relation: null } : null;
352-            }
353-            if (!s.localPhotoUri && data?.photo) setPhotoUri(visitorPhotoUrl(space.id, data.photo));
354-            if (!s.motto && data?.motto) setMotto(data.motto);
355-            if (!s.relation && data?.relation) setRelation(data.relation);
356-          }
357-        }
358-      }
359-      setLoading(false);
360-    });
361-  }, [space, loadActivity]);
362-
363-  useEffect(() => {
364-    const normalized = normalizePhone(telephone);
365:    if (role !== "intervenant" || normalized.length < 6) {
366-      setLinkedSpaces([]);
367-      return;
368-    }
369-    supabase
370:      .from("intervenant_profiles")
371-      .select("id, space_id, prenom, nom, pin, patient_spaces(patient_firstname, patient_lastname, invite_token)")
372-      .eq("telephone", normalized)
373-      .then(({ data }) => setLinkedSpaces((data as any) ?? []));
374-    // space?.id est nécessaire ici (en plus de role/telephone) : rejoindre un
375-    // nouvel espace (handleJoinNewSpace) ou basculer vers un espace déjà lié
376-    // (handleSwitchLinkedSpace) ne change ni le rôle ni le téléphone — sans
377-    // cette dépendance, la liste restait figée sur son état au tout premier
378-    // montage et n'incluait jamais les espaces rejoints depuis.
379-  }, [role, telephone, space?.id]);
380-
381:  async function handleSwitchLinkedSpace(row: LinkedIntervenantSpace) {
382-    if (!row.patient_spaces || switchingSpaceId) return;
383-    setSwitchingSpaceId(row.id);
384-    // try/finally : l'onglet Compte reste monté en arrière-plan quand on
385-    // navigue vers le calendrier (Tabs ne démonte pas les écrans visités) —
386-    // sans ce reset, switchingSpaceId restait bloqué sur cette ligne et son
387-    // bouton ne répondait plus au retour sur Compte, tant que route/patients
388-    // n'était pas rouverte sur un state neuf.
389-    try {
390-      await switchToLinkedSpace(row, telephone, router);
391-    } finally {
392-      setSwitchingSpaceId(null);
393-    }
394-  }
395-
396:  // Copie la photo et les types d'intervention du profil courant vers la
397-  // fiche fraîchement créée sur le nouvel espace — best-effort, ne bloque
398-  // jamais le pivot (le prénom/nom/téléphone/phrase totem sont déjà passés
399-  // à l'insert dans handleJoinNewSpace, seuls la photo — copie storage
400:  // directe, pas de re-upload — et les types d'intervention nécessitent une
401-  // 2e étape une fois le nouvel id connu).
402-  async function copyProfileExtras(targetProfileId: string) {
403:    if (!intervenantProfileId) return;
404-    try {
405-      const [{ data: sourceProfile }, { data: sourceTypes }] = await Promise.all([
406:        supabase.from("intervenant_profiles").select("photo").eq("id", intervenantProfileId).maybeSingle(),
407:        supabase.from("intervention_types").select("label, duration_minutes").eq("intervenant_profile_id", intervenantProfileId),
408-      ]);
409-      if (sourceProfile?.photo) {
410-        const { error: copyErr } = await supabase.storage
411:          .from("intervenant-photos")
412-          .copy(sourceProfile.photo, `${targetProfileId}.jpg`);
413-        if (!copyErr) {
414:          await supabase.from("intervenant_profiles")
415-            .update({ photo: `${targetProfileId}.jpg`, photo_updated_at: new Date().toISOString() })
416-            .eq("id", targetProfileId);
417-        } else {
418-          console.error("[copyProfileExtras] storage copy failed:", copyErr);
419-        }
420-      }
421-      if (sourceTypes && sourceTypes.length > 0) {
422-        const { error: typesErr } = await supabase.from("intervention_types").insert(
423-          sourceTypes.map((t) => ({
424:            intervenant_profile_id: targetProfileId,
425-            label: t.label,
426-            duration_minutes: t.duration_minutes,
427-          })),
428-        );
429-        if (typesErr) console.error("[copyProfileExtras] intervention_types copy failed:", typesErr);
430-      }
431-    } catch (e) {
432-      console.error("[copyProfileExtras] unexpected error:", e);
433-    }
434-  }
435-
436-  // Rejoindre un nouvel espace via son code dossier (voir
437-  // components/ShareSpace.tsx côté admin, colonne patient_spaces.dossier_code).
438-  // Si une fiche existe déjà sur cet espace pour ce téléphone (créée par
439-  // l'admin, ou lors d'un précédent pivot), on la réutilise. Sinon on la
--
444-  async function handleJoinNewSpace() {
445-    const code = joinCode.trim();
446-    if (!code || joining) return;
447-    setJoining(true);
448-    setJoinError("");
449-    try {
450-      const result = await enterByDossierCode(code);
451-      if (!result.ok) {
452-        setJoinError(
453-          result.reason === "inactive"
454-            ? "Cet espace n'est plus actif."
455-            : "Code dossier introuvable — vérifie-le auprès de l'organisateur.",
456-        );
457-        return;
458-      }
459:      if (!result.intervenantsEnabled) {
460:        setJoinError("Ce patient n'a pas activé l'accès intervenant.");
461-        return;
462-      }
463-      if (space && result.spaceId === space.id) {
464-        setJoinError("Tu es déjà sur cet espace.");
465-        return;
466-      }
467-
468-      const normalizedTelephone = normalizePhone(telephone);
469-      const { data: existingRow } = await supabase
470:        .from("intervenant_profiles")
471-        .select("id, pin")
472-        .eq("space_id", result.spaceId)
473-        .eq("telephone", normalizedTelephone)
474-        .maybeSingle();
475-
476-      let targetProfileId = existingRow?.id ?? null;
477-      let targetPin = existingRow?.pin ?? pin;
478-
479-      if (!targetProfileId) {
480-        const { data: inserted, error: insertErr } = await supabase
481:          .from("intervenant_profiles")
482-          .insert({
483-            space_id: result.spaceId,
484-            prenom: prenom.trim(),
485-            nom: nom.trim(),
486-            pin,
487-            telephone: normalizedTelephone || null,
488-            phrase_totem: motto.trim() || null,
489-          })
490-          .select("id")
491-          .single();
492-
493-        if (insertErr?.code === "23505") {
494-          // Une fiche existe déjà pour ce prénom/nom sur cet espace (créée
495-          // par l'admin sans le même téléphone) — même logique de
496:          // rattachement que IntervenantFicheModal.handleSave.
497-          const { data: conflictRow } = await supabase
498:            .from("intervenant_profiles")
499-            .select("id, pin")
500-            .eq("space_id", result.spaceId)
501-            .ilike("prenom", prenom.trim())
502-            .ilike("nom", nom.trim())
503-            .maybeSingle();
504-          if (!conflictRow || conflictRow.pin !== pin) {
505-            setJoinError("Une fiche existe déjà pour ce prénom et ce nom sur cet espace, avec un code différent. Contacte l'organisateur.");
506-            return;
507-          }
508-          targetProfileId = conflictRow.id;
509-          targetPin = conflictRow.pin;
510-        } else if (insertErr || !inserted) {
511-          throw insertErr ?? new Error("Impossible de rejoindre cet espace.");
512-        } else {
513-          targetProfileId = inserted.id;
514-          targetPin = pin;
515-          await copyProfileExtras(targetProfileId);
516-        }
517-      }
518-
519-      await saveVisitorSession({
520-        token: result.token,
521-        spaceId: result.spaceId,
522-        prenom, nom, pin: targetPin,
523:        role: "intervenant",
524:        intervenantProfileId: targetProfileId,
525-        telephone,
526-        motto,
527-        localPhotoUri: null,
528-      });
529-      setJoinModalVisible(false);
530-      setJoinCode("");
531-      router.replace({
532-        pathname: "/(visitor)/home/calendar",
533-        params: { spaceId: result.spaceId, token: result.token },
534-      } as any);
535-    } catch (e: any) {
536-      setJoinError(e?.message ?? "Impossible de rejoindre cet espace.");
537-    } finally {
538-      setJoining(false);
539-    }
--
561-    // Nom de fichier horodaté (et non fixe) : <Image> met en cache par URI,
562-    // un nom constant faisait qu'un second choix de photo dans la même
563-    // session ne se réaffichait pas (l'app montrait encore l'aperçu précédent).
564-    let persistedUri = result.assets[0].uri;
565-    try {
566-      const dest = new File(Paths.document, `visitor_profile_photo_${Date.now()}.jpg`);
567-      new File(result.assets[0].uri).copy(dest);
568-      persistedUri = dest.uri;
569-    } catch {
570-      // Copie échouée : on garde l'URI d'origine (aperçu immédiat quand
571-      // même fonctionnel, juste pas garanti après redémarrage).
572-    }
573-
574-    setPhotoUri(persistedUri);
575-    if (!space) return;
576:    if (role === "intervenant" && intervenantProfileId) {
577-      await saveVisitorSession({ token, spaceId: space.id, localPhotoUri: persistedUri });
578-      showToast("Photo enregistrée ✓");
579:      syncIntervenantPhoto(intervenantProfileId, persistedUri);
580-      return;
581-    }
582-    await saveVisitorSession({
583-      token,
584-      spaceId: space.id,
585-      prenom: prenom.trim(),
586-      nom: nom.trim(),
587-      email: email.trim(),
588-      localPhotoUri: persistedUri,
589-    });
590-    showToast("Photo enregistrée ✓");
591-    syncProfilePhoto(space.id, prenom.trim(), nom.trim(), persistedUri);
592-  }
593-
594:  // Synchronise la photo vers intervenant_profiles — même bucket/convention
595:  // de nom de fichier (`${profileId}.jpg`) que components/IntervenantFicheModal.tsx,
596-  // pour que les deux écrans affichent toujours la même image. Best-effort,
597-  // comme syncProfilePhoto ci-dessous.
598:  async function syncIntervenantPhoto(profileId: string, localUri: string) {
599-    try {
600-      const compressed = await ImageManipulator.manipulateAsync(
601-        localUri,
602-        [{ resize: { width: 300 } }],
603-        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
604-      );
605-      const fileData = await new File(compressed.uri).arrayBuffer();
606-      const filename = `${profileId}.jpg`;
607-      const { error: storageErr } = await supabase.storage
608:        .from("intervenant-photos")
609-        .upload(filename, fileData, { contentType: "image/jpeg", cacheControl: "3600", upsert: true });
610-      if (storageErr) {
611:        console.error("[syncIntervenantPhoto] storage upload failed:", storageErr);
612-        return;
613-      }
614-      const { error: updErr } = await supabase
615:        .from("intervenant_profiles")
616-        .update({ photo: filename, photo_updated_at: new Date().toISOString() })
617-        .eq("id", profileId);
618:      if (updErr) console.error("[syncIntervenantPhoto] update failed:", updErr);
619-    } catch (e) {
620:      console.error("[syncIntervenantPhoto] unexpected error:", e);
621-    }
622-  }
623-
624-  // Synchronise prénom + nom + téléphone + phrase totem vers
625:  // intervenant_profiles — la fiche intervenant (components/IntervenantFicheModal.tsx)
626-  // reste la source de vérité pour les soins, mais "Mes informations" doit
627-  // pouvoir mettre à jour l'identité de la même fiche, sinon les deux écrans
628-  // désynchronisent silencieusement (prénom/nom modifiés ici ne se
629:  // répercutaient jamais sur intervenant_profiles). Même contrainte unique
630:  // que IntervenantFicheModal.handleSave (idx_intervenant_profiles_unique_identity) :
631-  // en cas de conflit, on retente sans prénom/nom pour ne pas perdre la sync
632-  // téléphone/totem, et on prévient l'utilisateur.
633-  // Renvoie true si la synchronisation a réussi — handleSave s'en sert pour
634:  // ne montrer "Enregistré ✓" que si la fiche intervenant a effectivement
635-  // été mise à jour, plutôt que de l'afficher inconditionnellement alors
636-  // qu'un échec silencieux (réseau, erreur inattendue) ne laissait avant
637-  // aucune trace visible pour l'utilisateur.
638:  async function syncIntervenantContact(
639-    profileId: string,
640-    prenomValue: string,
641-    nomValue: string,
642-    telephoneValue: string,
643-    mottoValue: string,
644-  ): Promise<boolean> {
645-    const trimmedPrenom = prenomValue.trim();
646-    const trimmedNom = nomValue.trim();
647-    const payload: Record<string, string | null> = {
648-      telephone: telephoneValue.trim() || null,
649-      phrase_totem: mottoValue.trim() || null,
650-    };
651-    if (trimmedPrenom) payload.prenom = trimmedPrenom;
652-    if (trimmedNom) payload.nom = trimmedNom;
653-    try {
654:      const { error } = await supabase.from("intervenant_profiles").update(payload).eq("id", profileId);
655-      if (error) {
656-        if (error.code === "23505") {
657-          const { prenom: _p, nom: _n, ...contactOnly } = payload;
658:          await supabase.from("intervenant_profiles").update(contactOnly).eq("id", profileId);
659-          Alert.alert(
660-            "Nom déjà utilisé",
661:            "Une fiche intervenant existe déjà avec ce prénom et ce nom dans cet espace. Téléphone et phrase totem ont été enregistrés, mais le prénom/nom n'a pas pu être modifié.",
662-          );
663-          return false;
664-        }
665:        console.error("[syncIntervenantContact] update failed:", error);
666-        Alert.alert(
667-          "Erreur d'enregistrement",
668:          "Tes informations n'ont pas pu être synchronisées avec ta fiche intervenant. Vérifie ta connexion et réessaie.",
669-        );
670-        return false;
671-      }
672-      return true;
673-    } catch (e) {
674:      console.error("[syncIntervenantContact] unexpected error:", e);
675-      Alert.alert(
676-        "Erreur d'enregistrement",
677:        "Tes informations n'ont pas pu être synchronisées avec ta fiche intervenant. Vérifie ta connexion et réessaie.",
678-      );
679-      return false;
680-    }
681-  }
682-
683-  // Synchronise la photo de "Mon compte" vers Supabase — jusqu'ici elle
684-  // restait locale à l'appareil (localPhotoUri), invisible pour les autres
685-  // visiteurs. Rend cette photo visible dans la fiche visiteur (voir
686-  // components/VisitorProfileModal.tsx) quand un autre visiteur clique sur
687-  // le nom de celui-ci dans Nouvelles/Souvenirs/Soutien. Best-effort : un
688-  // échec ne doit pas bloquer l'enregistrement local, qui a déjà réussi.
689-  async function syncProfilePhoto(spaceId: string, p: string, n: string, localUri: string) {
690-    if (!p || !n) return;
691-    try {
692-      const compressed = await ImageManipulator.manipulateAsync(
--
737-  async function handleSave() {
738-    if (!space) return;
739-    setSaving(true);
740-    await saveVisitorSession({
741-      token,
742-      spaceId: space.id,
743-      prenom: prenom.trim(),
744-      nom: nom.trim(),
745-      email: email.trim(),
746-      localPhotoUri: photoUri,
747-      motto,
748-      relation,
749-      telephone,
750-    });
751-    let ok = true;
752:    if (role === "intervenant" && intervenantProfileId) {
753:      ok = await syncIntervenantContact(intervenantProfileId, prenom, nom, telephone, motto);
754-    } else {
755-      if (photoUri) syncProfilePhoto(space.id, prenom.trim(), nom.trim(), photoUri);
756-      if (prenom.trim() && nom.trim()) syncProfileMottoAndRelation(space.id, prenom.trim(), nom.trim(), motto, relation);
757-    }
758-    setSaving(false);
759-    if (ok) showToast("Enregistré ✓");
760-    loadActivity(space.id, prenom, nom);
761-  }
762-
763-  function openChangePinModal() {
764-    setPinPhase("verify");
765-    setPinInput("");
766-    setNewPinDraft("");
767-    setPinModalError(false);
768-    setPinModalVisible(true);
--
842-  async function confirmModalAction() {
843-    setConfirmModal(null);
844-    await clearVisitorSession();
845-    router.replace("/");
846-  }
847-
848-  if (loading || !space) {
849-    return (
850-      <View style={[styles.center, { backgroundColor: C.bg }]}>
851-        <ActivityIndicator color={C.accent} size="large" />
852-      </View>
853-    );
854-  }
855-
856-  // Alertes actives = réservations "Visite"/"Nuit" recasées/annulées par une
857:  // intervention prioritaire (book_intervention) ou un changement de règles
858-  // admin (apply_slot_rule_change) et pas encore vues — voir MyAlertsModal.
859-  // Triées par date/créneau croissants : la première à venir en premier.
860-  const myActiveAlerts = myReservations
861-    .filter((r) => r.alert_message && !r.alert_seen)
862-    .sort((a, b) => (a.date === b.date ? a.creneau.localeCompare(b.creneau) : a.date.localeCompare(b.date)));
863-
864-  async function handleAlertModify(r: Reservation) {
865:    // Intervention proposée par l'admin (voir BookingProposalAlertModal) :
866-    // pas d'édition en place possible, on supprime la réservation puis on
867:    // renvoie l'intervenant sur son planning pour en choisir une autre.
868:    if (r.type === "Intervention") {
869-      await supabase.from("reservations").delete().eq("id", r.id);
870-      if (space) loadActivity(space.id, prenom, nom);
871-      router.push("/(visitor)/home/calendar" as any);
872-      return;
873-    }
874-    setPendingEditReservationId(r.id);
875-    if (r.type === "Nuit") {
876-      router.push("/(visitor)/home/nights" as any);
877-    } else {
878-      setSelectedDay(new Date(r.date + "T12:00:00"));
879-      router.push("/(visitor)/home/slots" as any);
880-    }
881-  }
882-
883-  async function handleAlertMarkSeen(r: Reservation) {
--
940-          <Text style={[styles.displayModeLabel, { color: C.text }]}>
941-            Mode {mode === "light" ? "Clair" : "Sombre"}
942-          </Text>
943-          <SegmentedSwitch
944-            value={mode === "light"}
945-            onChange={(v) => setMode(v ? "light" : "dark")}
946-            leftLabel="Dark"
947-            rightLabel="Light"
948-            C={C}
949-            minWidthRatio={0.55}
950-          />
951-        </View>
952-
953-        {(Object.keys(SECTION_META) as AccountSectionKey[])
954-          .filter((k) => {
955:            if (k === "patients" || k === "mes_soins") return role === "intervenant";
956:            return !(role === "intervenant" && (k === "besoins" || k === "resv" || k === "soutien"));
957-          })
958-          .map((key) => {
959-          const isOpen = activeSection === key;
960:          const mesSoins = myReservations.filter((r) => r.type === "Intervention");
961-          const mesSoinsPlanifies = mesSoins.filter((r) => !isSlotFullyPast(r.date, r.creneau));
962-          const mesSoinsFaits = mesSoins.filter((r) => isSlotFullyPast(r.date, r.creneau));
963-          const hint = key === "info" ? (prenom.trim() && nom.trim() ? `${prenom} ${nom}` : "À compléter")
964-            : key === "patients" ? `${Math.max(linkedSpaces.length, 1)} patient(s)`
965-            : key === "mes_soins" ? `${mesSoinsPlanifies.length} planifié(s)`
966-            : key === "resv" ? `${myReservations.length} réservation(s)`
967-            : key === "news" ? `${myNews.length} nouvelle(s)`
968-            : key === "soutien" ? `${myMessages.length} message(s)`
969-            : `${myTasks.length + myPublishedTasks.length} besoin(s)`;
970-          return (
971-            <View key={key}>
972-              <TouchableOpacity
973-                style={[styles.contribHeader, { borderBottomColor: C.border }]}
974-                onPress={() => setActiveSection(isOpen ? null : key)}
975-                activeOpacity={0.75}
--
1000-                      placeholderTextColor={C.muted}
1001-                      value={nom}
1002-                      onChangeText={setNom}
1003-                      autoCapitalize="words"
1004-                    />
1005-                    <TextInput
1006-                      style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
1007-                      placeholder="Adresse email"
1008-                      placeholderTextColor={C.muted}
1009-                      value={email}
1010-                      onChangeText={setEmail}
1011-                      keyboardType="email-address"
1012-                      autoCapitalize="none"
1013-                      autoCorrect={false}
1014-                    />
1015:                    {role === "intervenant" && (
1016-                      <TextInput
1017-                        style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
1018-                        placeholder="Téléphone (optionnel)"
1019-                        placeholderTextColor={C.muted}
1020-                        value={telephone}
1021-                        onChangeText={setTelephone}
1022-                        keyboardType="phone-pad"
1023-                      />
1024-                    )}
1025-
1026:                    {role !== "intervenant" && (
1027-                      <View>
1028-                        <Text style={[styles.fieldLabel, { color: C.muted }]}>
1029-                          Votre lien avec {space.patient_firstname || "le patient"} (optionnel)
1030-                        </Text>
1031-                        <TouchableOpacity
1032-                          style={[styles.card, { backgroundColor: C.bg, borderColor: C.border }]}
1033-                          onPress={() => setRelationModalVisible(true)}
1034-                          activeOpacity={0.7}
1035-                        >
1036-                          <Text style={[styles.metierInfoValue, { color: C.gold }]}>
1037-                            {relation ? relationLabel(relation) : "À renseigner ›"}
1038-                          </Text>
1039-                        </TouchableOpacity>
1040-                      </View>
1041-                    )}
1042-                  </View>
1043-
1044:                  {role === "intervenant" && (
1045-                    <>
1046-                      <Text style={[styles.sectionTitle, { color: C.gold, marginTop: 8 }]}>Métier / Spécialisation</Text>
1047-                      <TouchableOpacity
1048-                        style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}
1049-                        onPress={() => setFicheModalVisible(true)}
1050-                        activeOpacity={0.7}
1051-                      >
1052-                        <Text style={[styles.metierInfoValue, { color: C.gold }]}>
1053-                          {metier ? metierLabel(metier) : "À renseigner ›"}
1054-                        </Text>
1055-                      </TouchableOpacity>
1056-                    </>
1057-                  )}
1058-
1059-                  <Text style={[styles.sectionTitle, { color: C.gold, marginTop: 8 }]}>💬 Ma phrase totem (optionnel)</Text>
1060-                  <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
1061-                    <TextInput
1062-                      style={[styles.input, { backgroundColor: C.bg, borderColor: C.border, color: C.text }]}
1063-                      placeholder="Ex : Aimer c'est Agir !"
1064-                      placeholderTextColor={C.muted}
1065-                      value={motto}
1066-                      onChangeText={setMotto}
1067-                    />
1068-                    <Text style={[styles.cardDesc, { color: C.muted, marginBottom: 0 }]}>
1069:                      {role === "intervenant"
1070:                        ? "Une phrase qui te définit — affichée sur ta fiche intervenant, vue par les visiteurs et les autres intervenants."
1071-                        : "Une phrase qui te définit — affichée à côté de ton nom dans le bloc Visiteurs des Paramètres."}
1072-                    </Text>
1073-                  </View>
1074-
1075-                  <TouchableOpacity
1076-                    style={[styles.saveBtn, { backgroundColor: C.accent }, saving && { opacity: 0.6 }]}
1077-                    onPress={handleSave}
1078-                    disabled={saving}
1079-                  >
1080-                    {saving
1081-                      ? <ActivityIndicator color="#fff" size="small" />
1082-                      : <Text style={styles.saveBtnText}>Enregistrer</Text>
1083-                    }
1084-                  </TouchableOpacity>
1085-
--
1375-                                : t.status === "ferme" ? "🔒 Fermé"
1376-                                : "⏳ Ouvert"}
1377-                            </Text>
1378-                          </View>
1379-                          <Text style={[styles.activityChevron, { color: C.muted }]}>›</Text>
1380-                        </TouchableOpacity>
1381-                      ))}
1382-                    </View>
1383-                  </>
1384-                )
1385-              )}
1386-            </View>
1387-          );
1388-        })}
1389-
1390:        {role !== "intervenant" && (
1391-          <TouchableOpacity
1392-            style={styles.patientProfileBtn}
1393-            onPress={() => router.push("/(visitor)/mes-souvenirs" as any)}
1394-            activeOpacity={0.85}
1395-          >
1396-            <Text style={styles.patientProfileBtnText}>📷 Mes souvenirs</Text>
1397-          </TouchableOpacity>
1398-        )}
1399-
1400-        <MyChecklist
1401-          spaceId={space.id}
1402-          isAdmin={false}
1403-          ownerPrenom={prenom}
1404-          ownerNom={nom}
1405-          ownerPin={pin}
1406-          space={space}
1407-          C={C}
1408:          hideImportBanner={role === "intervenant"}
1409:          intervenantTelephone={role === "intervenant" ? telephone : undefined}
1410-        />
1411-
1412-        <TouchableOpacity
1413-          style={[styles.patientProfileBtn, { marginTop: 10 }]}
1414-          onPress={() => setPatientProfileVisible(true)}
1415-          activeOpacity={0.85}
1416-        >
1417-          <Text style={styles.patientProfileBtnText}>🩺 Fiche patient</Text>
1418-        </TouchableOpacity>
1419-
1420:        {role !== "intervenant" && (
1421-          <TouchableOpacity
1422-            style={[styles.patientProfileBtn, { marginTop: 10 }]}
1423-            onPress={() => setVisitorsListVisible(true)}
1424-            activeOpacity={0.85}
1425-          >
1426-            <Text style={styles.patientProfileBtnText}>👥 Visiteurs</Text>
1427-          </TouchableOpacity>
1428-        )}
1429-
1430:        {role === "intervenant" && (
1431-          <TouchableOpacity
1432-            style={[styles.patientProfileBtn, { backgroundColor: C.orange, marginTop: 10 }]}
1433-            onPress={() => setFicheModalVisible(true)}
1434-            activeOpacity={0.85}
1435-          >
1436:            <Text style={styles.patientProfileBtnText}>🩺 Ma fiche intervenant</Text>
1437-          </TouchableOpacity>
1438-        )}
1439-
1440-        <TouchableOpacity style={styles.switchLink} onPress={handleSwitchSpace}>
1441-          <Text style={[styles.switchLinkText, { color: C.muted }]}>Suivre un autre espace</Text>
1442-        </TouchableOpacity>
1443-
1444-        <TouchableOpacity style={[styles.logoutBtn, { borderColor: "rgba(233,69,96,0.4)" }]} onPress={handleLogout}>
1445-          <Text style={[styles.logoutBtnText, { color: "#e94560" }]}>🚪 Se déconnecter</Text>
1446-        </TouchableOpacity>
1447-      </ScrollView>
1448-
1449-      {!!toast && (
1450-        <View style={[styles.toast, { backgroundColor: C.success }]}>
1451-          <Text style={styles.toastText}>{toast}</Text>
--
1528-        title="Te désengager de ce besoin ?"
1529-        message="Il sera rouvert et visible par tous."
1530-        confirmLabel="Me désengager"
1531-        saving={desengageSaving}
1532-        onCancel={() => setDesengageTarget(null)}
1533-        onConfirm={confirmDesengage}
1534-        C={C}
1535-      />
1536-
1537-      <Modal visible={joinModalVisible} transparent animationType="fade" onRequestClose={() => setJoinModalVisible(false)}>
1538-        <View style={styles.pinModalOverlay}>
1539-          <View style={[styles.pinModalCard, { backgroundColor: C.card, borderColor: C.border }]}>
1540-            <Text style={[styles.pinModalTitle, { color: C.text }]}>➕ Rejoindre un nouveau patient</Text>
1541-            <Text style={[styles.cardDesc, { color: C.muted, textAlign: "center", marginBottom: 14 }]}>
1542-              Demande le code dossier à l'organisateur de ce nouvel espace. Ta fiche (photo,
1543:              téléphone, phrase totem, types d'intervention) sera reprise automatiquement.
1544-            </Text>
1545-            <TextInput
1546-              style={[
1547-                styles.input,
1548-                { backgroundColor: C.bg, borderColor: C.border, color: C.text, width: "100%", textAlign: "center", letterSpacing: 2 },
1549-              ]}
1550-              placeholder="Code dossier"
1551-              placeholderTextColor={C.muted}
1552-              value={joinCode}
1553-              onChangeText={(v) => setJoinCode(v.toUpperCase())}
1554-              autoCapitalize="characters"
1555-              autoCorrect={false}
1556-            />
1557-            {!!joinError && (
1558-              <Text style={[styles.pinModalError, { color: C.danger, marginTop: 10 }]}>{joinError}</Text>
--
1594-          adminFirstname={space.admin_firstname}
1595-          adminLastname={space.admin_lastname}
1596-        />
1597-      )}
1598-
1599-      <MyAlertsModal
1600-        visible={alertsModalVisible}
1601-        onClose={() => setAlertsModalVisible(false)}
1602-        C={C}
1603-        activeAlerts={myActiveAlerts}
1604-        history={myChangeHistory}
1605-        onModify={handleAlertModify}
1606-        onMarkSeen={handleAlertMarkSeen}
1607-      />
1608-
1609:      {space && role === "intervenant" && intervenantProfileId && (
1610:        <IntervenantFicheModal
1611-          visible={ficheModalVisible}
1612-          prenom={prenom}
1613-          nom={nom}
1614:          intervenantProfileId={intervenantProfileId}
1615-          theme={C}
1616-          onClose={() => setFicheModalVisible(false)}
1617-          onSaved={async (_profileId, savedPrenom, savedNom, savedTelephone, savedPhraseTotem, savedPhoto, savedPhotoUpdatedAt, savedMetier, _email) => {
1618-            // Persiste aussi la photo dans localPhotoUri : sinon la session
1619-            // locale garde l'ancienne URI (ou reste vide), et rouvrir l'app
1620-            // réaffiche l'ancienne photo malgré le changement fait ici — voir
1621-            // le fallback de rechargement dans le useEffect plus haut, qui ne
1622:            // re-fetch depuis intervenant_profiles que si localPhotoUri est vide.
1623:            const newPhotoUri = savedPhoto ? intervenantPhotoUrl(savedPhoto, savedPhotoUpdatedAt) : null;
1624-            await saveVisitorSession({
1625-              token, spaceId: space.id,
1626-              prenom: savedPrenom, nom: savedNom,
1627-              telephone: savedTelephone ?? "",
1628-              motto: savedPhraseTotem ?? "",
1629-              metier: savedMetier ?? "",
1630-              localPhotoUri: newPhotoUri,
1631-            });
1632-            setPrenom(savedPrenom);
1633-            setNom(savedNom);
1634-            setTelephone(savedTelephone ?? "");
1635-            setMotto(savedPhraseTotem ?? "");
1636-            setMetier(savedMetier ?? null);
1637-            if (newPhotoUri) setPhotoUri(newPhotoUri);
1638-            setFicheModalVisible(false);
1639:            showToast("Fiche intervenant enregistrée ✓");
1640-          }}
1641-        />
1642-      )}
1643-
1644-      <RelationPickerModal
1645-        visible={relationModalVisible}
1646-        C={C}
1647-        value={relation}
1648-        onClose={() => setRelationModalVisible(false)}
1649-        onPick={setRelation}
1650-      />
1651-
1652-      {space && slotConfig && (
1653-        <RecurringBookingModal
1654-          visible={recurringModalVisible}

```

### app/(visitor)/home/calendar.tsx

Fichier partagé — calendrier visiteur, contient l'affichage des interventions et le lien vers le planning intervenant.

```tsx
3-  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Modal, Switch, Linking,
4-} from "react-native";
5-import { useVisitorSpace } from "@/lib/VisitorContext";
6-import {
7-  getDayStatus, findNextAvailableSlot, getDaysInMonth, getMonday, addDays,
8-  toISO, toFrLong, isMyReservation, visiteurIdentityKey, isSlotFullyPast,
9-  getSlotOccupancy,
10-} from "@/lib/slotUtils";
11-import { useDisplayMode } from "@/lib/DisplayModeContext";
12-import { getVisitorSession } from "@/lib/visitorSession";
13-import { LOGO_GREEN, LOGO_PURPLE, LOGO_NAVY, VISITES_ORANGE_FILL, VISITES_DANGER_FILL, getPatientColor } from "@/lib/themes";
14-import { careLocationDetail, mapsUrlForSpace } from "@/lib/address";
15-import SpaceHeader from "@/components/SpaceHeader";
16-import SegmentedSwitch from "@/components/SegmentedSwitch";
17-import WeekStrip from "@/components/WeekStrip";
18:import IntervenantPlanningPanel from "@/components/IntervenantPlanningPanel";
19-import { DayStripes } from "@/components/DayEdgeStripes";
20-import PatientColorLegend from "@/components/PatientColorLegend";
21-import PlanningDuJourBlock from "@/components/PlanningDuJourBlock";
22-import SoinsPeriodBlock from "@/components/SoinsPeriodBlock";
23-import SoinsPlanifiesBlock from "@/components/SoinsPlanifiesBlock";
24-import SoinActionModal from "@/components/SoinActionModal";
25-import VisiteEditFlow, { type VisiteEditFlowHandle } from "@/components/VisiteEditFlow";
26-import BookingFlow, { type BookingFlowHandle } from "@/components/BookingFlow";
27-import InterventionBookingFlow, { type InterventionBookingFlowHandle } from "@/components/InterventionBookingFlow";
28-import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
29-import type { Reservation } from "@/lib/types";
30-
31-const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];
32-
33-export default function VisitorCalendarScreen() {
--
41-  // le tableau COMPLET à chaque case de la grille Mensuelle (jusqu'à 42),
42-  // plusieurs fois par case (status, visiteStatus, familyBooked...), ça
43-  // coûte O(cases × reservations). Ici, un seul passage O(n) puis des accès
44-  // O(1) par jour — résultat identique (filtrer un sous-tableau déjà
45-  // iso-filtré par iso ne change rien).
46-  const reservationsByDate = useMemo(() => {
47-    const map = new Map<string, Reservation[]>();
48-    for (const r of reservations) {
49-      const list = map.get(r.date);
50-      if (list) list.push(r); else map.set(r.date, [r]);
51-    }
52-    return map;
53-  }, [reservations]);
54-  // false = planning global (visites/nuitées), true = ne montre que
55-  // l'occupation des soins (interventions) — remplace l'ancien raccourci
56:  // "Voir les nuitées". Par défaut sur "Soins" pour un intervenant (voir
57-  // l'effet d'identité plus bas), sur "Visites" pour les 2 autres rôles.
58-  // "Afficher mes créneaux" reste indépendant du switch et n'est plus reset
59:  // en changeant de mode : un intervenant doit pouvoir le garder actif en
60-  // passant de Soins à Visites (et inversement) pour voir ses propres
61-  // créneaux mélangés à la vérité complète de l'autre catégorie — voir
62-  // frameVisible plus bas.
63-  const [soinsMode, setSoinsMode] = useState(false);
64:  // Un intervenant voit, en plus du cadre violet visible par tous (soin ce
65-  // jour-là), l'intérieur de la case remplie en violet quand le soin lui est
66:  // assigné à LUI précisément — voir home/slots.tsx pour role/intervenantProfileId.
67:  const [role, setRole] = useState<"visiteur" | "intervenant" | null>(null);
68:  const [intervenantProfileId, setIntervenantProfileId] = useState<string | null>(null);
69-  const [myPin, setMyPin] = useState<string | null>(null);
70-  // Prénom/nom de la session — désambiguïsent deux visiteurs ayant choisi le
71-  // même PIN à 4 chiffres (pas garanti unique dans un espace) lors du calcul
72-  // de la bande verte "mes créneaux" — voir isMyReservation (lib/slotUtils.ts).
73-  const [myPrenom, setMyPrenom] = useState<string | null>(null);
74-  const [myNom, setMyNom] = useState<string | null>(null);
75-  // Mensuel/Hebdo — commun aux 3 rôles désormais. En Hebdo, une bande de 7
76-  // jours (WeekStrip) remplace la grille mensuelle et permet de réserver
77-  // directement un créneau du jour sélectionné (D), sans passer par l'écran
78-  // dédié (home/slots.tsx), qui reste accessible en Mensuel (tap sur un jour).
79-  const [planningView, setPlanningView] = useState<"mensuel" | "hebdo">("mensuel");
80-  // Bascule "Afficher mes créneaux" (mesCreneauxOnly, partagée via
81-  // VisitorContext — voir home/slots.tsx qui en tient compte aussi),
82-  // disponible pour tous les rôles. La grille (pastille, cadre violet, bande
83-  // verte) affiche TOUJOURS la vérité complète, quel que soit ce réglage —
84-  // voir familyBooked/interventionBooked plus bas. Son seul effet : filtrer
85:  // le panneau perso en dessous du calendrier (IntervenantPlanningPanel,
86-  // commun aux 3 rôles) sur les seules réservations de LA PERSONNE QUI
87-  // REGARDE plutôt que celles de tout le monde — voir panelReservations.
88-  // Les 2 switches du bloc de réglages doivent avoir des pastilles de même
89-  // taille et des libellés alignés à la même position — le switch Visites/
90-  // Soins reprend la largeur naturelle calculée par Mensuel/Hebdo au lieu
91-  // d'en calculer une indépendamment (même mécanisme que Entraide.tsx).
92-  const [viewThumbWidth, setViewThumbWidth] = useState(0);
93-  // Filtre légende visiteurs (mode Visites) — 1 visiteur (visiteurIdentityKey)
94-  // ou "Tous" (null). Filtre les traits de bord (DayStripes) et les panneaux
95-  // sous le calendrier ; jamais le fond Partiel/Complet (vérité globale de
96-  // capacité, voir dayVisiteurColors/visitesFill plus bas).
97-  const [selectedVisiteurKey, setSelectedVisiteurKey] = useState<string | null>(null);
98-  // Visite tapée dans un des blocs sous le calendrier (mode Visites) — non-null
99-  // tant que le popup d'action (Modifier / Y Aller / Fermer, SoinActionModal)
100-  // est ouvert.
101-  const [pendingVisite, setPendingVisite] = useState<Reservation | null>(null);
102-  // Dépend de `token` (pas juste []) : après un changement d'espace patient
103:  // depuis le Planning global intervenant (switchToLinkedSpace, qui fait un
104-  // router.replace vers cet écran sans le démonter), reservations se
105-  // recharge déjà pour le nouvel espace (VisitorContext, effet sur token),
106:  // mais role/intervenantProfileId/myPin restaient sinon ceux de l'ancien
107-  // espace — myInterventionToday comparait alors des soins du nouvel espace
108:  // à un intervenant_profile_id de l'ancien, qui ne matchait jamais.
109-  useEffect(() => {
110-    getVisitorSession().then((s) => {
111-      const r = s?.role ?? "visiteur";
112-      setRole(r);
113:      // Défaut Visite même pour un intervenant : cette page sert avant tout
114-      // à voir les créneaux de visite des visiteurs — s'il veut voir les
115:      // soins des autres intervenants, c'est une sélection active (bascule
116-      // Soins + "Afficher mes créneaux"), pas le défaut à l'arrivée.
117:      setIntervenantProfileId(s?.intervenantProfileId ?? null);
118-      setMyPin(s?.pin ?? null);
119-      setMyPrenom(s?.prenom ?? null);
120-      setMyNom(s?.nom ?? null);
121-    });
122-  }, [token]);
123-
124-  const { theme: C } = useDisplayMode();
125-  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
126-  const startDate = useMemo(
127-    () => space ? new Date(space.start_date + "T00:00:00") : today,
128-    [space, today],
129-  );
130-  const initialDay = useMemo(() => (today >= startDate ? today : startDate), [today, startDate]);
131-
132-  const [calMonth, setCalMonth] = useState({ year: initialDay.getFullYear(), month: initialDay.getMonth() });
133-  const [weekAnchor, setWeekAnchor] = useState(() => getMonday(initialDay));
134-
135:  // Arrivée via le Planning global intervenant (soins.tsx) après un
136:  // changement d'espace patient (lib/intervenantSpaceSwitch.ts) — enchaîne
137-  // directement vers l'écran de réservation sur le jour ciblé, comme un tap
138-  // direct sur ce jour l'aurait fait ici. Un ref pour ne déclencher qu'une
139-  // seule fois (évite une boucle si l'utilisateur revient ensuite sur ce
140-  // calendrier).
141-  const focusHandled = useRef(false);
142-  useEffect(() => {
143-    if (focusHandled.current || !focusIso || !space) return;
144-    focusHandled.current = true;
145-    const day = new Date(focusIso + "T00:00:00");
146-    setSelectedDay(day);
147-    setCalMonth({ year: day.getFullYear(), month: day.getMonth() });
148-    router.navigate({
149-      pathname: "/(visitor)/home/slots",
150-      params: returnTo ? { returnTo, returnSpaceId: returnSpaceId ?? "" } : {},
151-    } as any);
--
210-
211-  if (!space || !slotConfig) return null;
212-
213-  // Marqueurs hospitalisation (F) / sortie (G) et seuil de grisage/réservation
214-  // (E) de la vue Hebdo — au format "YYYY-MM-DD", comparables directement aux
215-  // iso des jours de la bande.
216-  const admissionIso = space.patient_admission_date;
217-  const dischargeIso = space.patient_discharge_date;
218-  // Anniversaire du patient : ne compare que mois+jour ("MM-DD"), l'année de
219-  // patient_birthdate étant celle de naissance — se répète donc chaque année
220-  // dans la grille mensuelle (voir aussi BirthdayAlertModal, même logique).
221-  const birthdateMonthDay = space.patient_birthdate ? space.patient_birthdate.slice(5) : null;
222-
223-  // La grille (pastille de statut, cadre violet, bande Hebdo) affiche
224-  // toujours la vérité complète : vue Visites = toutes les visites des
225:  // visiteurs, vue Soins = tous les soins de tous les intervenants —
226-  // "Afficher mes créneaux" ne filtre plus ces éléments, voir plus bas
227-  // pour son seul effet restant : le panneau perso sous le calendrier
228:  // (IntervenantPlanningPanel, commun aux 3 rôles), qui s'auto-filtre déjà
229-  // par type de réservation selon soinsMode — voir isMyReservation
230-  // (lib/slotUtils.ts) pour le détail : PIN + prénom/nom pour une visite/
231:  // nuitée, intervenant_profile_id (fiable, pas de collision possible) pour
232-  // un soin. Tant que l'identité de session n'est pas encore chargée, on
233-  // retombe sur la liste complète plutôt que sur un panneau vide le temps du
234-  // fetch.
235:  const identityReady = !!myPin || !!intervenantProfileId;
236-  const myReservations = identityReady
237:    ? reservations.filter((r) => isMyReservation(r, myPin, intervenantProfileId, myPrenom, myNom))
238-    : reservations;
239-  // "Afficher mes créneaux" ne doit pas masquer un autre visiteur partageant
240-  // EXACTEMENT un de mes créneaux (ex. 2 visiteurs sur le même horaire) —
241-  // savoir qui est présent avec soi lors d'une visite est une information
242-  // importante à garder visible, même filtre activé. On élargit donc aux
243-  // réservations dont le date+créneau correspond à l'un des miens, sans pour
244-  // autant réafficher tout le monde comme quand le filtre est désactivé.
245-  const myPanelSlotKeys = new Set(myReservations.map((r) => `${r.date}|${r.creneau}`));
246-  const panelReservations = mesCreneauxOnly && identityReady
247-    ? reservations.filter((r) => myPanelSlotKeys.has(`${r.date}|${r.creneau}`))
248-    : reservations;
249-
250-  const selectedIso = toISO(selectedDay);
251-
252-  // Période affichée par le panneau perso sous le calendrier
253:  // (IntervenantPlanningPanel) — suit le switch Mensuel/Hebdo (planningView)
254-  // et le mois/la semaine actuellement parcouru(e), pas juste "aujourd'hui" :
255-  // naviguer avec ‹ › doit aussi déplacer la période du panneau, exactement
256-  // comme elle déplace déjà celle du calendrier/de la bande au-dessus.
257-  const periodStartIso = planningView === "hebdo"
258-    ? toISO(weekAnchor)
259-    : toISO(new Date(calMonth.year, calMonth.month, 1));
260-  const periodEndIso = planningView === "hebdo"
261-    ? toISO(addDays(weekAnchor, 6))
262-    : toISO(new Date(calMonth.year, calMonth.month + 1, 0));
263-
264-  // Légende visiteurs (mode Visites) — regroupe les réservations Visite par
265-  // identité approximée (visiteurIdentityKey), la personne qui regarde
266-  // toujours en premier, le reste trié alphabétiquement (nom puis prénom,
267-  // comme VisitorsBlock.tsx). Couleur = getPatientColor(index) sur cet ordre.
268-  const visiteurGroups: Record<string, { prenom: string; nom: string }> = {};
--
352-        max: (getConfigForDate(pendingVisite.date) ?? slotConfig).max_visitors_per_slot,
353-      }
354-    : null;
355-
356-  // Tap sur une visite : si elle m'appartient (isMyReservation compare PIN +
357-  // prénom/nom, et gère le cas d'une réservation "ADMIN" arrangée pour un
358-  // visiteur précis — voir lib/slotUtils.ts), ouvre le popup Modifier/Y
359-  // Aller habituel. Sinon (visite d'un autre visiteur, ex. sélectionné dans
360-  // la légende) : réservation rapide sur ce même créneau s'il reste une
361-  // place, sinon ouverture de l'écran des créneaux de ce jour-là pour en
362-  // choisir un autre. Dans tous les cas, une visite déjà passée n'ouvre plus
363-  // rien (ni Modifier/Y Aller ni réservation n'ont de sens une fois le
364-  // créneau écoulé).
365-  function openVisiteActions(r: Reservation) {
366-    if (isSlotFullyPast(r.date, r.creneau)) return;
367:    if (isMyReservation(r, myPin, intervenantProfileId, myPrenom, myNom)) {
368-      setPendingVisite(r);
369-      return;
370-    }
371-    const dayConfig = getConfigForDate(r.date) ?? slotConfig!;
372-    const occupancy = getSlotOccupancy(reservations, r.date, r.creneau);
373-    if (occupancy.length < dayConfig.max_visitors_per_slot) {
374-      flowRef.current?.openBooking(r.date, r.creneau);
375-    } else {
376-      setSelectedDay(new Date(r.date + "T00:00:00"));
377-      router.navigate("/(visitor)/home/slots");
378-    }
379-  }
380-  function handleModifierVisitePress() {
381-    const r = pendingVisite;
382-    setPendingVisite(null);
--
406-  // bloc "Planning du jour" tapé, y compris sur un jour déjà passé.
407-  function handleEmptyPlanningPress() {
408-    const day = new Date(selectedIso + "T00:00:00");
409-    setSelectedDay(day);
410-    setCalMonth({ year: day.getFullYear(), month: day.getMonth() });
411-    router.navigate("/(visitor)/home/slots");
412-  }
413-
414-  // Tap sur une case de la bande Hebdo. Mode Soins : comportement inchangé
415-  // (navigation directe vers l'écran des créneaux). Mode Visites : sélectionne
416-  // seulement le jour, sans naviguer — voir handleWeekDayLongPress pour ça.
417-  const handleWeekDayPress = (iso: string) => {
418-    const day = new Date(iso + "T00:00:00");
419-    const dayConfig = getConfigForDate(iso) ?? slotConfig;
420-    const daySlots = getSlotsForDate(iso);
421:    const status = getDayStatus(reservations, iso, day, dayConfig, daySlots, startDate, soinsMode ? "Intervention" : "Visite");
422-    const isPast = iso < toISO(today);
423-    const isBlocked = (status === "past" && !isPast) || iso === admissionIso;
424-    if (isBlocked) {
425-      setBlockedDayModal(day);
426-      return;
427-    }
428-    setSelectedDay(day);
429-    setCalMonth({ year: day.getFullYear(), month: day.getMonth() });
430-    if (soinsMode) router.navigate("/(visitor)/home/slots");
431-  };
432-
433-  // Appui prolongé sur une case de la bande Hebdo — mode Visites uniquement :
434-  // reprend l'ancien comportement du tap simple (navigation vers l'écran des
435-  // créneaux pour ce jour).
436-  const handleWeekDayLongPress = (iso: string) => {
--
464-        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border, marginBottom: 14 }]}>
465-          <SegmentedSwitch
466-            value={planningView === "hebdo"}
467-            onChange={(v) => {
468-              setPlanningView(v ? "hebdo" : "mensuel");
469-              if (v) setWeekAnchor(getMonday(selectedDay));
470-            }}
471-            leftLabel="Mensuel"
472-            rightLabel="Hebdo"
473-            C={C}
474-            minWidthRatio={0.5}
475-            onThumbWidth={setViewThumbWidth}
476-          />
477-        </View>
478-
479:        {/* "Prochaine disponibilité" reste réservé aux visiteurs (l'intervenant
480-            n'a pas besoin de chercher un créneau libre côté famille). */}
481:        {role !== "intervenant" && (
482-          <TouchableOpacity
483-            style={[styles.nextDispoBtn, { backgroundColor: C.accent }]}
484-            onPress={handleNextDispo}
485-            activeOpacity={0.85}
486-          >
487-            <Text style={styles.nextDispoText}>⚡ Prochaine disponibilité</Text>
488-          </TouchableOpacity>
489-        )}
490-
491-        {planningView === "mensuel" ? (
492-        <>
493-        <View style={styles.monthNav}>
494-          <TouchableOpacity
495-            onPress={() => setCalMonth((m) => {
496-              const d = new Date(m.year, m.month - 1, 1);
--
516-        <View style={styles.dayLabels}>
517-          {DAY_LABELS.map((d, i) => (
518-            <Text key={i} style={[styles.dayLabel, { color: C.muted }]}>{d}</Text>
519-          ))}
520-        </View>
521-
522-        {/* Grid */}
523-        <View style={styles.grid}>
524-          {Array(firstDow).fill(null).map((_, i) => <View key={`e${i}`} style={[styles.cellOuter, styles.cell]} />)}
525-          {monthDays.map((day) => {
526-            const iso = toISO(day);
527-            const dayReservations = reservationsByDate.get(iso) ?? [];
528-            const dayConfig = getConfigForDate(iso) ?? slotConfig;
529-            const daySlots = getSlotsForDate(iso);
530-            // `status` sert au blocage/navigation (tap sur la case) et suit
531:            // le type du mode actif (Visite/Intervention). La pastille, elle,
532-            // ne représente plus jamais que les visites — voir visiteStatus.
533:            const status = getDayStatus(dayReservations, iso, day, dayConfig, daySlots, startDate, soinsMode ? "Intervention" : "Visite");
534-            const isToday = toISO(day) === toISO(today);
535-            const isSelected = toISO(day) === toISO(selectedDay);
536-            // Un jour déjà passé reste consultable (lecture seule — la
537-            // réservation/modification est de toute façon bloquée par
538-            // BookingFlow) ; seul un jour structurellement invalide (avant le
539-            // début de l'espace, hors jours autorisés, date bloquée par
540-            // l'admin) reste non cliquable.
541-            const isPast = iso < toISO(today);
542-            const isBlocked = (status === "past" && !isPast) || iso === admissionIso;
543-            const dimmed = isPast || isBlocked;
544-
545-            // Pastille Dispo/Partiel/Complet : ne représente plus que les
546-            // visites (jamais les soins, qui ont leur propre cadre violet) et
547-            // ne s'affiche qu'en mode Soins — en mode Visites, le fond de
548-            // case (visitesFill ci-dessous) remplace la pastille.
--
569-            if (!soinsMode) {
570-              const keysToday = new Set<string>();
571-              for (const r of dayReservations) {
572-                if (r.type !== "Visite") continue;
573-                const key = visiteurIdentityKey(r.prenom, r.nom);
574-                if (selectedVisiteurKey && key !== selectedVisiteurKey) continue;
575-                keysToday.add(key);
576-              }
577-              for (const key of Object.keys(visiteurColorByKey)) {
578-                if (keysToday.has(key)) dayVisiteurColors.push(visiteurColorByKey[key]);
579-              }
580-            }
581-
582-            // Bande verte en bas de case = strictement personnelle (comparée
583-            // au PIN de la session courante) : visite/nuitée réservée par MOI
584:            // ou, si je suis intervenant, soin réservé par MOI — jamais les
585:            // réservations d'un autre visiteur/intervenant ni de l'admin.
586-            // Toujours visible, quel que soit le mode ou "Afficher mes
587-            // créneaux" — reste individuelle pour les 3 profils. Mode Soins
588-            // uniquement (mode Visites : voir dayVisiteurColors ci-dessus).
589:            const familyBooked = dayReservations.some((r) => isMyReservation(r, myPin, intervenantProfileId, myPrenom, myNom));
590:            // Case remplie en violet uniquement pour l'intervenant assigné à
591:            // CE soin — les autres intervenants (comme les visiteurs/admin)
592-            // ne voient que le cadre violet ci-dessous.
593:            const myInterventionToday = role === "intervenant" && !!intervenantProfileId &&
594:              dayReservations.some((r) => r.type === "Intervention" && r.intervenant_profile_id === intervenantProfileId);
595:            const interventionBooked = dayReservations.some((r) => r.type === "Intervention");
596-            // Cadre violet : en mode Soins, tous les soins de tous les
597:            // intervenants (vérité complète) — sauf pour un intervenant qui a
598-            // activé "Afficher mes créneaux", où le calendrier lui-même se
599-            // filtre pour ne montrer que SES cadres violets, mélangés aux
600-            // traits verts. En mode Visites, aucun cadre par défaut (seules
601:            // les pastilles comptent) — sauf, là aussi, pour un intervenant
602-            // avec "Afficher mes créneaux" actif : ses propres soins
603-            // apparaissent quand même, mélangés aux pastilles.
604-            const frameVisible = soinsMode
605:              ? (role === "intervenant" && mesCreneauxOnly ? myInterventionToday : interventionBooked)
606:              : (role === "intervenant" && mesCreneauxOnly && myInterventionToday);
607-            const fillPurple = frameVisible && myInterventionToday;
608-            const whiteText = soinsMode ? (isSelected || fillPurple) : isSelected;
609-            // Jour hospitalisation/sortie/anniversaire : remplace tout le
610-            // contenu de la case (numéro du jour compris) par un pictogramme
611-            // plein cadre, jamais grisé même passé — voir styles.cellSpecialIcon.
612-            const specialIcon = iso === admissionIso ? "🏥" : iso === dischargeIso ? "🏠" : birthdateMonthDay === iso.slice(5) ? "🎉" : null;
613-
614-            return (
615-              <View key={iso} style={styles.cellOuter}>
616-                <TouchableOpacity
617-                  style={[
618-                    styles.cell,
619-                    {
620-                      backgroundColor: isSelected ? C.accent : specialIcon ? C.card : dimmed ? "transparent" : soinsMode ? (fillPurple ? LOGO_PURPLE : C.card) : (visitesFill ?? C.card),
621-                      borderColor: isSelected ? C.accent : soinsMode && frameVisible ? LOGO_PURPLE : isToday ? C.gold : C.border,
--
659-                  {soinsMode ? (
660-                    !!familyBooked && (
661-                      <View pointerEvents="none" style={[styles.visitStripe, { backgroundColor: LOGO_GREEN }]} />
662-                    )
663-                  ) : (
664-                    <DayStripes colors={dayVisiteurColors} />
665-                  )}
666-                </TouchableOpacity>
667-              </View>
668-            );
669-          })}
670-          {Array(trailingFillers).fill(null).map((_, i) => <View key={`t${i}`} style={[styles.cellOuter, styles.cell]} />)}
671-        </View>
672-
673-        {/* Legend — mode Soins : pastilles Dispo/Partiel/Complet + Mes
674:            créneaux/Intervenant, inchangé. Mode Visites : le fond de case
675-            remplace la pastille (voir visitesFill ci-dessus), la légende par
676-            visiteur (couleurs) est désormais celle affichée sous le bloc
677-            Visites/Soins (PatientColorLegend) — ici, juste Partiel/Complet. */}
678-        {soinsMode ? (
679-          <>
680-            <View style={styles.legend}>
681-              <Text style={[styles.legendPrefix, { color: C.muted }]}>Visiteurs :</Text>
682-              {([[C.success, "Dispo"], [C.orange, "Partiel"], [C.danger, "Complet"]] as [string, string][]).map(
683-                ([color, label]) => (
684-                  <View key={label} style={styles.legendItem}>
685-                    <View style={[styles.legendDot, { backgroundColor: color }]} />
686-                    <Text style={[styles.legendLabel, { color: C.muted }]}>{label}</Text>
687-                  </View>
688-                ),
689-              )}
--
725-          C={C}
726-          slotConfig={slotConfig}
727-          reservations={reservations}
728-          getSlotsForDate={getSlotsForDate}
729-          getConfigForDate={getConfigForDate}
730-          startDate={startDate}
731-          weekAnchor={weekAnchor}
732-          onWeekChange={setWeekAnchor}
733-          selectedIso={selectedIso}
734-          onSelectDay={(iso) => setSelectedDay(new Date(iso + "T00:00:00"))}
735-          onDayPress={handleWeekDayPress}
736-          onDayLongPress={handleWeekDayLongPress}
737-          soinsMode={soinsMode}
738-          mesCreneauxOnly={mesCreneauxOnly}
739-          role={role}
740:          intervenantProfileId={intervenantProfileId}
741-          myPin={myPin}
742-          myPrenom={myPrenom}
743-          myNom={myNom}
744-          admissionIso={admissionIso}
745-          dischargeIso={dischargeIso}
746-          richVisitesMode
747-          visiteurColorByKey={visiteurColorByKey}
748-          selectedVisiteurKey={selectedVisiteurKey}
749-        />
750-        </>
751-        )}
752-
753-        {/* Switch Visites/Soins + "Afficher mes créneaux" regroupés dans un
754-            même bloc, placé sous le calendrier : ils règlent l'affichage du
755-            panneau perso juste en dessous (voir panelReservations plus
756:            haut), et pour un intervenant, également celui des cadres violets
757-            du calendrier lui-même (voir frameVisible plus haut — un
758:            intervenant qui active "Afficher mes créneaux" ne voit plus, en
759-            mode Soins, que ses propres cadres, et voit ses propres cadres
760-            apparaître même en mode Visites). Pour les visiteurs/admin, le
761-            calendrier reste une vérité complète quel que soit ce réglage.
762:            Le switch Visites/Soins n'existe que si les intervenants sont
763-            activés dans l'espace ; le bouton "Afficher mes créneaux" reste
764-            utile même sans eux (filtre visites/nuitées). Bloc réservé au
765:            profil intervenant : pour un visiteur, la légende par visiteur
766-            (PatientColorLegend, filtrable) juste en dessous couvre déjà ce
767-            besoin ("voir seulement mes visites"), ce bloc n'a donc plus
768-            d'utilité pour ce profil. */}
769:        {role === "intervenant" && (
770-        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border, marginTop: 16 }]}>
771:          {space.intervenants_enabled && (
772-            <SegmentedSwitch value={soinsMode} onChange={setSoinsMode} leftLabel="Visites" rightLabel="Soins" C={C} thumbWidth={viewThumbWidth || undefined} />
773-          )}
774-          <View style={styles.toggleRow}>
775-            <View style={{ flex: 1 }}>
776-              <Text style={[styles.toggleLabel, { color: C.text }]}>👁️ Afficher mes créneaux</Text>
777-              <Text style={[styles.toggleDesc, { color: C.muted }]}>
778-                {mesCreneauxOnly
779-                  ? "Le panneau ci-dessous ne liste que tes propres soins. Le calendrier ne montre plus que tes propres cadres violets, mélangés aux traits verts de tout le monde."
780-                  : soinsMode
781:                    ? "Le panneau ci-dessous liste les soins de tous les intervenants de l'espace patient."
782-                    : "Le panneau ci-dessous liste les visites/nuitées de tout le monde."}
783-              </Text>
784-            </View>
785-            <Switch
786-              value={mesCreneauxOnly}
787-              onValueChange={setMesCreneauxOnly}
788-              trackColor={{ false: C.border, true: C.accent }}
789-              thumbColor="#fff"
790-            />
791-          </View>
792-        </View>
793-        )}
794-
795-        {!soinsMode && (
796-          <View style={{ marginTop: 16 }}>
797-            <PatientColorLegend
798-              C={C}
799-              items={visiteurLegendItems}
800-              selectedId={selectedVisiteurKey}
801-              onSelect={setSelectedVisiteurKey}
802-              maxVisible={4}
803-            />
804-          </View>
805-        )}
806-
807-        <View style={{ marginTop: 16 }}>
808-          {soinsMode ? (
809:            <IntervenantPlanningPanel
810-              C={C}
811-              reservations={panelReservations}
812-              soinsMode={soinsMode}
813-              myPin={myPin}
814-              myPrenom={myPrenom}
815-              myNom={myNom}
816-              onEdit={(r) => flowRef.current?.openPinModal(r)}
817:              myIntervenantProfileId={role === "intervenant" && mesCreneauxOnly ? intervenantProfileId : null}
818-              periodStartIso={periodStartIso}
819-              periodEndIso={periodEndIso}
820-              periodLabel={planningView === "hebdo" ? "cette semaine" : "ce mois-ci"}
821-            />
822-          ) : (
823-            <>
824-              <PlanningDuJourBlock
825-                C={C}
826-                iso={selectedIso}
827-                reservations={visitesMainRows.filter((r) => r.date === selectedIso)}
828-                patientNameBySpaceId={{}}
829-                locationBySpaceId={{}}
830-                onSoinPress={openVisiteActions}
831-                reservationType="Visite"
832-                companionsById={companionsByMainId}
--
871-
872-      <BookingFlow
873-        ref={flowRef}
874-        type="Visite"
875-        space={space}
876-        slotConfig={slotConfig}
877-        slots={slots}
878-        reservations={reservations}
879-        startDate={startDate}
880-        token={token}
881-        refreshReservations={refreshReservations}
882-        homeCalendarPath="/(visitor)/home/calendar"
883-        C={C}
884-      />
885-
886:      {role === "intervenant" && intervenantProfileId && myPin && (
887-        <InterventionBookingFlow
888-          ref={interventionFlowRef}
889-          space={space}
890-          slotConfig={slotConfig}
891-          slots={slots}
892-          reservations={reservations}
893:          intervenantProfileId={intervenantProfileId}
894-          pin={myPin}
895-          refreshReservations={refreshReservations}
896-          homeCalendarPath="/(visitor)/home/calendar"
897-          C={C}
898-        />
899-      )}
900-
901-      <SoinActionModal
902-        C={C}
903-        visible={!!pendingVisite}
904-        reservation={pendingVisite}
905-        patientNameBySpaceId={{ [space.id]: "Visite auprès de " + space.patient_firstname }}
906-        locationBySpaceId={{ [space.id]: careLocationDetail(space) }}
907-        onModifier={handleModifierVisitePress}
908-        onYAller={handleYAllerVisitePress}
--
999-    aspectRatio: 1,
1000-    borderRadius: 8,
1001-    borderWidth: 1,
1002-    overflow: "hidden",
1003-  },
1004-  cellInner: { flex: 1, width: "100%", alignItems: "center", justifyContent: "center", gap: 2 },
1005-  cellDate: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, textAlignVertical: "center", includeFontPadding: false },
1006-  // Jour hospitalisation/sortie/anniversaire : pictogramme plein cadre à la
1007-  // place du numéro du jour, centré horizontalement et verticalement.
1008-  cellSpecialIcon: { fontSize: 20, lineHeight: 24 },
1009-  dot: { width: 4, height: 4, borderRadius: 2 },
1010-  visitStripe: { position: "absolute", left: 0, right: 0, bottom: 0, height: 4 },
1011-  legend: { flexDirection: "row", justifyContent: "center", gap: 20 },
1012-  legendPrefix: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11 },
1013-  // Ecart plus large que la ligne du dessus pour bien séparer "Mes créneaux"
1014:  // de "Intervenant"/"Soin" — les deux notions sont trop souvent confondues
1015-  // sinon.
1016-  legendRow2: { marginTop: 8, gap: 40 },
1017-  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
1018-  legendDot: { width: 8, height: 8, borderRadius: 4 },
1019-  legendFrame: { width: 14, height: 14, borderRadius: 4, borderWidth: 2 },
1020-  legendStripeSwatch: { width: 14, height: 14, borderRadius: 4, borderWidth: 1, overflow: "hidden" },
1021-  legendStripeBar: { position: "absolute", left: 0, right: 0, bottom: 0, height: 3 },
1022-  legendLabel: { fontFamily: "DM_Sans_400Regular", fontSize: 11 },
1023-
1024-  sectionTitle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10, marginTop: 20 },
1025-  card: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 6 },
1026-  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
1027-  toggleLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14, marginBottom: 4 },
1028-  toggleDesc: { fontFamily: "DM_Sans_400Regular", fontSize: 12, lineHeight: 17 },
1029-  chevron: { fontFamily: "DM_Sans_700Bold", fontSize: 16 },

```

### app/(visitor)/home/nights.tsx

Fichier partagé — écran nuits visiteur, contient la logique de nuit avec intervenant.

```tsx
1-import { useRef, useMemo, useEffect, useState } from "react";
2-import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from "react-native";
3-import { useVisitorSpace } from "@/lib/VisitorContext";
4-import { getVisitorSession } from "@/lib/visitorSession";
5-import SpaceHeader from "@/components/SpaceHeader";
6-import BookingFlow, { type BookingFlowHandle } from "@/components/BookingFlow";
7-import NightInterventionBookingFlow, { type NightInterventionBookingFlowHandle } from "@/components/NightInterventionBookingFlow";
8-import { findNextAvailableNight, toISO, toFrLong, nightStartSlot } from "@/lib/slotUtils";
9-import { useDisplayMode } from "@/lib/DisplayModeContext";
10-import { isVisitorAuthorizedForNight } from "@/lib/nightVisitorAuth";
11:import { isIntervenantAuthorizedForNight } from "@/lib/nightIntervenantAuth";
12-import type { Reservation } from "@/lib/types";
13-
14-export default function VisitorNightsScreen() {
15-  const { space, slotConfig, reservations, token, refreshReservations, pendingEditReservationId, setPendingEditReservationId } = useVisitorSpace();
16-  const { theme: C } = useDisplayMode();
17-  const flowRef = useRef<BookingFlowHandle>(null);
18:  const intervenantFlowRef = useRef<NightInterventionBookingFlowHandle>(null);
19-
20-  // PIN de session de cet appareil — sert à ne montrer "Modifier" que sur
21-  // les nuitées faites depuis ce même appareil (y compris quand elles ont
22-  // été faites pour quelqu'un d'autre, cf. booked_by_prenom/nom), jamais
23-  // sur celles des autres visiteurs.
24-  const [myPin, setMyPin] = useState<string | null>(null);
25:  // Rôle + fiche de la session — un intervenant ne peut réserver une nuitée
26:  // que si l'admin l'a explicitement autorisé (voir slot_config.night_intervenant_mode,
27:  // components/NightIntervenantModal.tsx). Les visiteurs "famille" ne sont pas
28-  // concernés par cette restriction, seul night_enabled les gouverne.
29:  const [role, setRole] = useState<"visiteur" | "intervenant">("visiteur");
30:  const [intervenantProfileId, setIntervenantProfileId] = useState<string | null>(null);
31-  const [myPrenom, setMyPrenom] = useState("");
32-  const [myNom, setMyNom] = useState("");
33-  // Dépend de `token` — voir home/slots.tsx pour le détail (changement
34-  // d'espace patient sans démontage de l'écran).
35-  useEffect(() => {
36-    getVisitorSession().then((s) => {
37-      setMyPin(s?.pin ?? null);
38-      setRole(s?.role ?? "visiteur");
39:      setIntervenantProfileId(s?.intervenantProfileId ?? null);
40-      setMyPrenom(s?.prenom ?? "");
41-      setMyNom(s?.nom ?? "");
42-    });
43-  }, [token]);
44-  const isMine = (r: Reservation) => !!myPin && r.pin === myPin;
45-
46-  // Autorisation des visiteurs "famille" (voir slot_config.night_visitor_mode,
47-  // components/NightVisitorModal.tsx) — n'a d'effet que si l'admin a
48-  // restreint aux "certains visiteurs seulement" (mode "some"), sinon (mode
49-  // "all", défaut) tout le monde peut réserver, comportement historique.
50-  const [nightVisitorAuthorized, setNightVisitorAuthorized] = useState(true);
51-  useEffect(() => {
52-    if (role !== "visiteur" || !space || slotConfig?.night_visitor_mode !== "some" || !myPrenom || !myNom) {
53-      setNightVisitorAuthorized(true);
54-      return;
55-    }
56-    isVisitorAuthorizedForNight(space.id, myPrenom, myNom).then(setNightVisitorAuthorized);
57-  }, [role, space, slotConfig?.night_visitor_mode, myPrenom, myNom]);
58-
59:  // Autorisation des intervenants (voir slot_config.night_intervenant_mode,
60:  // components/NightIntervenantModal.tsx) — même principe que les visiteurs
61:  // ci-dessus, mais matché par intervenant_profiles.id (compte stable) via
62:  // night_authorized_intervenants plutôt que par prénom/nom.
63:  const [nightIntervenantAuthorized, setNightIntervenantAuthorized] = useState(true);
64-  useEffect(() => {
65:    if (role !== "intervenant" || !space || slotConfig?.night_intervenant_mode !== "some" || !intervenantProfileId) {
66:      setNightIntervenantAuthorized(false);
67-      return;
68-    }
69:    isIntervenantAuthorizedForNight(space.id, intervenantProfileId).then(setNightIntervenantAuthorized);
70:  }, [role, space, slotConfig?.night_intervenant_mode, intervenantProfileId]);
71-
72-  const canReserveNight =
73:    (role !== "intervenant"
74:      || slotConfig?.night_intervenant_mode === "all"
75:      || (slotConfig?.night_intervenant_mode === "some" && nightIntervenantAuthorized))
76-    && (role !== "visiteur" || nightVisitorAuthorized);
77-
78-  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
79-  const startDate = space ? new Date(space.start_date + "T00:00:00") : today;
80-
81-  // Arrivée via RebookingAlertModal (recasage/annulation suite à un
82-  // changement de règles admin) : rouvre la modale PIN/modification
83-  // directement sur la nuitée visée. Ne concerne pas "Mon compte" > "Mes
84-  // réservations", qui ne fait qu'une navigation simple.
85-  useEffect(() => {
86-    if (!pendingEditReservationId) return;
87-    const r = reservations.find((x) => x.id === pendingEditReservationId && x.type === "Nuit");
88-    if (!r) return;
89-    flowRef.current?.openPinModal(r);
90-    setPendingEditReservationId(null);
--
95-  const allNightReservations = reservations.filter((r): r is Reservation => r.type === "Nuit");
96-  const upcomingNights = allNightReservations
97-    .filter((r) => r.date >= toISO(today))
98-    .sort((a, b) => a.date.localeCompare(b.date));
99-  const pastNights = allNightReservations
100-    .filter((r) => r.date < toISO(today))
101-    .sort((a, b) => b.date.localeCompare(a.date));
102-
103-  function handleReserveNext() {
104-    if (!slotConfig) return;
105-    const next = findNextAvailableNight(reservations, slotConfig, startDate);
106-    if (!next) {
107-      Alert.alert("Aucune disponibilité", "Aucune nuitée libre dans les 90 prochains jours.");
108-      return;
109-    }
110:    if (role === "intervenant") {
111:      intervenantFlowRef.current?.openBooking(next.iso);
112-    } else {
113-      flowRef.current?.openBooking(next.iso, nightStartSlot(slotConfig));
114-    }
115-  }
116-
117-  return (
118-    <View style={[styles.container, { backgroundColor: C.bg }]}>
119-      <SpaceHeader space={space} active="nights" basePath="/(visitor)/home" C={C} />
120-
121-      <ScrollView contentContainerStyle={styles.scroll}>
122-        {!slotConfig.night_enabled && (
123-          <View style={styles.empty}>
124-            <Text style={{ fontSize: 36, marginBottom: 12 }}>🌙</Text>
125-            <Text style={[styles.emptyText, { color: C.muted }]}>
126-              Les nuitées sont actuellement suspendues par l'organisateur.
--
192-
193-      <BookingFlow
194-        ref={flowRef}
195-        type="Nuit"
196-        space={space}
197-        slotConfig={slotConfig}
198-        slots={[]}
199-        reservations={reservations}
200-        startDate={startDate}
201-        token={token}
202-        refreshReservations={refreshReservations}
203-        homeCalendarPath="/(visitor)/home/calendar"
204-        C={C}
205-      />
206-
207:      {role === "intervenant" && intervenantProfileId && myPin && (
208-        <NightInterventionBookingFlow
209:          ref={intervenantFlowRef}
210-          space={space}
211-          slotConfig={slotConfig}
212:          intervenantProfileId={intervenantProfileId}
213-          prenom={myPrenom}
214-          nom={myNom}
215-          pin={myPin}
216-          refreshReservations={refreshReservations}
217-          homeCalendarPath="/(visitor)/home/calendar"
218-          C={C}
219-        />
220-      )}
221-    </View>
222-  );
223-}
224-
225-const styles = StyleSheet.create({
226-  container: { flex: 1 },
227-  scroll: { padding: 16, paddingBottom: 32 },

```

### app/(visitor)/home/slots.tsx

Fichier partagé — écran créneaux visiteur, contient la prise en compte des interventions dans la disponibilité des créneaux.

```tsx
1-import { useRef, useEffect, useState } from "react";
2-import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
3-import { useLocalSearchParams } from "expo-router";
4-import { useVisitorSpace } from "@/lib/VisitorContext";
5-import { getVisitorSession } from "@/lib/visitorSession";
6-import SpaceHeader from "@/components/SpaceHeader";
7-import BookingFlow, { type BookingFlowHandle } from "@/components/BookingFlow";
8-import InterventionBookingFlow, { type InterventionBookingFlowHandle } from "@/components/InterventionBookingFlow";
9-import NightInterventionBookingFlow, { type NightInterventionBookingFlowHandle } from "@/components/NightInterventionBookingFlow";
10-import InterventionEditFlow, { type InterventionEditFlowHandle } from "@/components/InterventionEditFlow";
11-import ConfirmModal from "@/components/ConfirmModal";
12-import VisitorSlotsList from "@/components/VisitorSlotsList";
13-import { getNightReservation, isReservationDatePast, isSlotFullyPast, toISO, toFrLong, toFrShort, addDays, nightStartSlot, nightRangeLabel } from "@/lib/slotUtils";
14:import { useOtherSpaceInterventions, type OtherSpaceIntervention } from "@/lib/useOtherSpaceInterventions";
15-import { useDisplayMode } from "@/lib/DisplayModeContext";
16-import { isVisitorAuthorizedForNight } from "@/lib/nightVisitorAuth";
17:import { isIntervenantAuthorizedForNight } from "@/lib/nightIntervenantAuth";
18-import type { Reservation, SlotConfig } from "@/lib/types";
19-
20-// Recentré sur les créneaux "Visite" uniquement depuis le Lot 3 — la nuitée
21-// a son propre écran (home/nights.tsx). La logique de réservation/PIN/édition
22-// elle-même vit dans components/BookingFlow.tsx, partagée entre les deux.
23-export default function SlotsScreen() {
24-  const { space, slotConfig, slots, reservations, selectedDay, setSelectedDay, refreshReservations, token, pendingBookingSlot, setPendingBookingSlot, pendingEditReservationId, setPendingEditReservationId, getConfigForDate } = useVisitorSpace();
25-  const { theme: C } = useDisplayMode();
26:  // Arrivée depuis le popup "Réserver un créneau" du Planning intervenant
27-  // (app/(visitor)/soins.tsx, via home/calendar.tsx qui fait suivre ces
28-  // params) — une fois la réservation confirmée, InterventionBookingFlow
29-  // doit ramener sur l'onglet Planning avec ce patient présélectionné
30-  // plutôt que sur le calendrier de l'espace (comportement par défaut).
31-  const { returnTo, returnSpaceId } = useLocalSearchParams<{ returnTo?: string; returnSpaceId?: string }>();
32-  const returnToPlanning = returnTo === "planning";
33-  const interventionHomeCalendarPath = returnToPlanning
34-    ? { pathname: "/(visitor)/soins", params: { focusSpaceId: returnSpaceId ?? "" } }
35-    : ("/(visitor)/home/calendar" as const);
36-  const interventionHomeCalendarLabel = returnToPlanning ? "← Retour au planning" : undefined;
37-  const flowRef = useRef<BookingFlowHandle>(null);
38-  const nightFlowRef = useRef<BookingFlowHandle>(null);
39-  const interventionFlowRef = useRef<InterventionBookingFlowHandle>(null);
40-  const nightInterventionFlowRef = useRef<NightInterventionBookingFlowHandle>(null);
41-  const otherSoinEditFlowRef = useRef<InterventionEditFlowHandle>(null);
42-  // Appui prolongé sur la bannière violette "Soin déjà programmé avec..."
43-  // (VisitorSlotsList) — popup Modifier/Fermer, puis bascule sur "Modifier ce
44-  // soin" (InterventionEditFlow) pour l'espace de CE patient X, sans jamais
45-  // changer d'espace actif (le composant est déjà capable de charger le
46:  // slot_config/les types d'intervention de r.space_id lui-même).
47:  const [conflictSoin, setConflictSoin] = useState<OtherSpaceIntervention | null>(null);
48-
49-  const startDate = space ? new Date(space.start_date + "T00:00:00") : new Date();
50-
51-  // PIN de session de cet appareil — sert à ne montrer "Modifier" que sur
52-  // les réservations faites depuis ce même appareil (y compris quand elles
53-  // ont été faites pour quelqu'un d'autre, cf. booked_by_prenom/nom), jamais
54-  // sur celles des autres visiteurs.
55-  const [myPin, setMyPin] = useState<string | null>(null);
56:  // Un intervenant réutilise cet écran (même vue que le visiteur), mais son
57-  // bouton "Réserver" ouvre InterventionBookingFlow au lieu de BookingFlow —
58:  // voir lib/visitorSession.ts pour role/intervenantProfileId.
59:  const [role, setRole] = useState<"visiteur" | "intervenant" | null>(null);
60:  const [intervenantProfileId, setIntervenantProfileId] = useState<string | null>(null);
61-  const [myPrenom, setMyPrenom] = useState("");
62-  const [myNom, setMyNom] = useState("");
63-  // Dépend de `token` : un changement d'espace patient (switchToLinkedSpace,
64:  // depuis le Planning global intervenant) ne démonte pas cet écran — sans
65:  // ça, role/intervenantProfileId restaient ceux de l'ancien espace alors
66-  // que `reservations` (VisitorContext) avait déjà basculé sur le nouveau.
67-  useEffect(() => {
68-    getVisitorSession().then((s) => {
69-      setMyPin(s?.pin ?? null);
70-      setRole(s?.role ?? "visiteur");
71:      setIntervenantProfileId(s?.intervenantProfileId ?? null);
72-      setMyPrenom(s?.prenom ?? "");
73-      setMyNom(s?.nom ?? "");
74-    });
75-  }, [token]);
76-  const isMine = (r: Reservation) => !!myPin && r.pin === myPin;
77-
78:  const { otherSpaceInterventions, refresh: refreshOtherSpaceInterventions } = useOtherSpaceInterventions(intervenantProfileId, space?.id ?? null);
79-
80:  // Un intervenant ne peut réserver une nuitée que si l'admin l'a
81-  // explicitement autorisé (même règle que home/nights.tsx — voir
82:  // slot_config.night_intervenant_mode, components/NightIntervenantModal.tsx).
83-  // Un visiteur "famille" ne peut être restreint que si l'admin a limité aux
84-  // "certains visiteurs seulement" (slot_config.night_visitor_mode = "some",
85-  // components/NightVisitorModal.tsx) — sinon (mode "all", défaut) aucune
86-  // restriction, comportement historique.
87-  const [nightVisitorAuthorized, setNightVisitorAuthorized] = useState(true);
88-  useEffect(() => {
89-    if (role !== "visiteur" || !space || slotConfig?.night_visitor_mode !== "some" || !myPrenom || !myNom) {
90-      setNightVisitorAuthorized(true);
91-      return;
92-    }
93-    isVisitorAuthorizedForNight(space.id, myPrenom, myNom).then(setNightVisitorAuthorized);
94-  }, [role, space, slotConfig?.night_visitor_mode, myPrenom, myNom]);
95-
96-  // Même principe que nightVisitorAuthorized ci-dessus, mais matché par
97:  // intervenant_profiles.id (compte stable) via night_authorized_intervenants
98:  // plutôt que par prénom/nom — voir lib/nightIntervenantAuth.ts.
99:  const [nightIntervenantAuthorized, setNightIntervenantAuthorized] = useState(true);
100-  useEffect(() => {
101:    if (role !== "intervenant" || !space || slotConfig?.night_intervenant_mode !== "some" || !intervenantProfileId) {
102:      setNightIntervenantAuthorized(false);
103-      return;
104-    }
105:    isIntervenantAuthorizedForNight(space.id, intervenantProfileId).then(setNightIntervenantAuthorized);
106:  }, [role, space, slotConfig?.night_intervenant_mode, intervenantProfileId]);
107-
108-  const canReserveNight =
109:    (role !== "intervenant"
110:      || slotConfig?.night_intervenant_mode === "all"
111:      || (slotConfig?.night_intervenant_mode === "some" && nightIntervenantAuthorized))
112-    && (role !== "visiteur" || nightVisitorAuthorized);
113-
114-  // Arrivée via "Prochaine disponibilité → Réserver" (Calendrier) : ouvre
115-  // directement la modale de réservation sur le créneau ciblé — celle de
116:  // l'intervenant (InterventionBookingFlow) ou celle du visiteur/famille
117-  // (BookingFlow) selon le rôle, une fois celui-ci chargé (voir role ci-
118-  // dessus, initialisé à null pour distinguer "pas encore chargé" de
119-  // "visiteur"). Un ref pour ne déclencher qu'une seule fois.
120-  const pendingBookingHandled = useRef(false);
121-  useEffect(() => {
122-    if (pendingBookingHandled.current || role === null || !pendingBookingSlot) return;
123-    pendingBookingHandled.current = true;
124-    const slot = pendingBookingSlot;
125-    setPendingBookingSlot(null);
126:    if (role === "intervenant") {
127-      interventionFlowRef.current?.openBooking(toISO(selectedDay), slot);
128-    } else {
129-      getVisitorSession().then((s) => {
130-        flowRef.current?.openBooking(toISO(selectedDay), slot, s ? { prenom: s.prenom, nom: s.nom } : undefined);
131-      });
132-    }
133-  }, [role, pendingBookingSlot, selectedDay, setPendingBookingSlot]);
134-
135-  // Arrivée via RebookingAlertModal (recasage/annulation suite à un
136-  // changement de règles admin) : rouvre la modale PIN/modification
137-  // directement sur la réservation visée, une fois les réservations
138-  // chargées dans le contexte. Ne concerne pas "Mon compte" > "Mes
139-  // réservations", qui ne fait qu'une navigation simple (pas de pendingEditReservationId).
140-  useEffect(() => {
141-    if (!pendingEditReservationId) return;
--
204-  );
205-
206-  return (
207-    <View style={[styles.container, { backgroundColor: C.bg }]}>
208-      <SpaceHeader space={space} active="slots" basePath="/(visitor)/home" C={C} />
209-
210-      <ScrollView contentContainerStyle={styles.scroll}>
211-        {/* Day navigation */}
212-        {dayNav}
213-
214-        {/* Slots */}
215-        <VisitorSlotsList
216-          iso={iso}
217-          C={C}
218-          role={role}
219:          intervenantProfileId={intervenantProfileId}
220-          myPin={myPin}
221-          otherSpaceInterventions={otherSpaceInterventions}
222-          onReserveVisit={(slotIso, slot) => flowRef.current?.openBooking(slotIso, slot)}
223-          onEditVisit={(r) => flowRef.current?.openPinModal(r)}
224:          onReserveIntervention={(slotIso, slot) => interventionFlowRef.current?.openBooking(slotIso, slot)}
225:          onCancelIntervention={(r) => interventionFlowRef.current?.openCancel(r)}
226-          onLongPressOtherSpaceSoin={(soin) => setConflictSoin(soin)}
227-        />
228-
229-        {/* Nuitée du jour — ajoutée à la fin de la liste des créneaux, même
230-            écran et même interaction que les créneaux "Visite" (Lot demandé
231-            par l'utilisateur). Réservation/édition gérées par une seconde
232-            instance de BookingFlow en type="Nuit" (la nuitée a sa propre
233-            logique de créneau/horaire — voir home/nights.tsx). */}
234-        {dayConfig.night_enabled && (() => {
235-          const nightResa = getNightReservation(reservations, iso);
236-          const nightPast = isSlotFullyPast(iso, nightStartSlot(dayConfig));
237-          return (
238-            <View
239-              style={[styles.slotCard, { backgroundColor: C.card, borderColor: nightResa ? "rgba(233,69,96,0.3)" : C.border, opacity: nightPast ? 0.5 : 1 }]}
240-            >
--
243-                <Text style={[styles.slotCount, { color: C.muted }]}>{nightRangeLabel(dayConfig)}</Text>
244-                {!nightResa
245-                  ? <Text style={[styles.slotEmpty, { color: C.muted }]}>——</Text>
246-                  : (
247-                    <View style={styles.visitorRow}>
248-                      <Text style={[styles.visitorName, { color: C.success }]}>● {nightResa.prenom} {nightResa.nom}</Text>
249-                    </View>
250-                  )
251-                }
252-              </View>
253-              <View style={styles.slotRight}>
254-                {!nightResa && !nightPast && canReserveNight && (
255-                  <TouchableOpacity
256-                    style={[styles.reserveBtn, { backgroundColor: C.accent }]}
257-                    onPress={() => {
258:                      if (role === "intervenant") {
259-                        nightInterventionFlowRef.current?.openBooking(iso);
260-                      } else {
261-                        nightFlowRef.current?.openBooking(iso, nightStartSlot(slotConfig));
262-                      }
263-                    }}
264-                    activeOpacity={0.85}
265-                  >
266-                    <Text style={styles.reserveBtnText}>Réserver</Text>
267-                  </TouchableOpacity>
268-                )}
269-                {nightResa && (
270-                  <View style={[styles.fullBadge, { borderColor: C.border }]}>
271-                    <Text style={[styles.fullBadgeText, { color: C.muted }]}>Complet</Text>
272-                  </View>
273-                )}
--
300-
301-      <BookingFlow
302-        ref={nightFlowRef}
303-        type="Nuit"
304-        space={space}
305-        slotConfig={slotConfig}
306-        slots={[]}
307-        reservations={reservations}
308-        startDate={startDate}
309-        token={token}
310-        refreshReservations={refreshReservations}
311-        homeCalendarPath="/(visitor)/home/calendar"
312-        C={C}
313-      />
314-
315:      {role === "intervenant" && intervenantProfileId && myPin && (
316-        <InterventionBookingFlow
317-          ref={interventionFlowRef}
318-          space={space}
319-          slotConfig={slotConfig}
320-          slots={slots}
321-          reservations={reservations}
322:          intervenantProfileId={intervenantProfileId}
323-          pin={myPin}
324-          refreshReservations={refreshReservations}
325-          otherSpaceInterventions={otherSpaceInterventions}
326-          homeCalendarPath={interventionHomeCalendarPath}
327-          homeCalendarLabel={interventionHomeCalendarLabel}
328-          C={C}
329-        />
330-      )}
331-
332:      {role === "intervenant" && intervenantProfileId && myPin && (
333-        <NightInterventionBookingFlow
334-          ref={nightInterventionFlowRef}
335-          space={space}
336-          slotConfig={slotConfig}
337:          intervenantProfileId={intervenantProfileId}
338-          prenom={myPrenom}
339-          nom={myNom}
340-          pin={myPin}
341-          refreshReservations={refreshReservations}
342-          homeCalendarPath="/(visitor)/home/calendar"
343-          C={C}
344-        />
345-      )}
346-
347-      <InterventionEditFlow
348-        ref={otherSoinEditFlowRef}
349-        C={C}
350-        onSaved={refreshOtherSpaceInterventions}
351-      />
352-      <ConfirmModal

```

### app/(visitor)/news.tsx

Fichier partagé — écran actualités visiteur, contient la prise en compte du mode intervenant.

```tsx
1-import { useState, useEffect } from "react";
2-import { View, ActivityIndicator } from "react-native";
3-import { useVisitorSpace } from "@/lib/VisitorContext";
4-import { useDisplayMode } from "@/lib/DisplayModeContext";
5-import { isSpaceCapped } from "@/lib/freemiumCap";
6-import { getVisitorSession } from "@/lib/visitorSession";
7-import NewsFeed from "@/components/NewsFeed";
8-
9-export default function VisitorNewsScreen() {
10-  const { space, reservations, slotConfig } = useVisitorSpace();
11-  const { theme: C } = useDisplayMode();
12:  const [role, setRole] = useState<"visiteur" | "intervenant">("visiteur");
13-
14-  useEffect(() => {
15-    getVisitorSession().then((s) => setRole(s?.role ?? "visiteur"));
16-  }, []);
17-
18-  if (!space) {
19-    return (
20-      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
21-        <ActivityIndicator color={C.accent} size="large" />
22-      </View>
23-    );
24-  }
25-
26-  return (
27-    <NewsFeed
28-      spaceId={space.id}
29-      C={C}
30-      isAdmin={false}
31-      capped={isSpaceCapped(space, reservations)}
32-      viewerRole={role}
33:      newsIntervenantMode={slotConfig?.news_intervenant_mode ?? "disabled"}
34-    />
35-  );
36-}

```

### components/NewsFeed.tsx

Fichier partagé — fil d'actualités, contient l'affichage du mode/badge intervenant sur les news.

```tsx
20-
21-const { width: SCREEN_W } = Dimensions.get("window");
22-const PHOTO_BUCKET = "news-photos";
23-
24-// ─── Types ────────────────────────────────────────────────────────────────────
25-interface NewsEntryWithUrls extends NewsEntry {
26-  photoUrls: string[];
27-}
28-
29-interface Props {
30-  spaceId: string;
31-  C: Theme;
32-  isAdmin: boolean;
33-  capped: boolean;
34-  // Rôle de la session visiteur (ignoré si isAdmin) — détermine si les
35:  // publications de CE viewer sont marquées author_role "intervenant" et
36:  // s'il voit le canal intervenants+admin en entier (voir filtrage plus bas).
37:  viewerRole?: "visiteur" | "intervenant";
38:  // slot_config.news_intervenant_mode — réglé depuis Paramètres > Règles >
39:  // Planning des intervenants (voir components/NewsIntervenantModal.tsx),
40-  // propagé en temps réel par SpaceContext/VisitorContext (realtime sur
41:  // slot_config). Détermine si les publications des intervenants (et de
42-  // l'admin, qui suit la même règle) sont visibles des visiteurs.
43:  newsIntervenantMode: "disabled" | "some" | "all";
44-}
45-
46-// ─── Utils ────────────────────────────────────────────────────────────────────
47-function newsPhotoUrl(spaceId: string, filename: string) {
48-  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(`${spaceId}/${filename}`);
49-  return data.publicUrl;
50-}
51-
52-function frDateTime(iso: string) {
53-  return new Date(iso).toLocaleString("fr-FR", {
54-    day: "numeric", month: "long", year: "numeric",
55-    hour: "2-digit", minute: "2-digit",
56-  });
57-}
58-
59-function frDateShort(iso: string) {
60-  return new Date(iso).toLocaleDateString("fr-FR", {
61-    weekday: "long", day: "numeric", month: "long",
62-  });
63-}
64-
65-function avatarInitial(prenom: string) {
66-  return prenom.trim().charAt(0).toUpperCase() || "?";
67-}
68-
69-// ─── Composant principal ──────────────────────────────────────────────────────
70:export default function NewsFeed({ spaceId, C, isAdmin, capped, viewerRole = "visiteur", newsIntervenantMode }: Props) {
71:  const effectiveRole: "visiteur" | "intervenant" | "admin" = isAdmin ? "admin" : viewerRole;
72-
73:  // IDs des intervenants autorisés à publier pour les visiteurs quand
74:  // newsIntervenantMode === "some" (voir components/NewsIntervenantModal.tsx).
75:  const [authorizedIntervenantIds, setAuthorizedIntervenantIds] = useState<Set<string>>(new Set());
76-
77:  const loadAuthorizedIntervenants = useCallback(async () => {
78:    if (newsIntervenantMode !== "some") { setAuthorizedIntervenantIds(new Set()); return; }
79-    const { data } = await supabase
80:      .from("news_authorized_intervenants")
81:      .select("intervenant_profile_id")
82-      .eq("space_id", spaceId);
83:    setAuthorizedIntervenantIds(new Set((data || []).map((r) => r.intervenant_profile_id)));
84:  }, [spaceId, newsIntervenantMode]);
85-
86:  useEffect(() => { loadAuthorizedIntervenants(); }, [loadAuthorizedIntervenants]);
87-
88-  useEffect(() => {
89-    const channel = supabase
90:      .channel(`news-authorized-intervenants:${spaceId}`)
91-      .on("postgres_changes", {
92:        event: "*", schema: "public", table: "news_authorized_intervenants",
93-        filter: `space_id=eq.${spaceId}`,
94:      }, loadAuthorizedIntervenants)
95-      .subscribe();
96-    return () => { supabase.removeChannel(channel); };
97:  }, [spaceId, loadAuthorizedIntervenants]);
98-
99:  // Une nouvelle d'intervenant/admin est-elle visible des visiteurs ? L'admin
100:  // suit la même règle que les intervenants pour ses propres publications
101:  // (pas de réglage séparé, voir Props.newsIntervenantMode).
102-  function isNewsEntryVisibleToVisitor(e: NewsEntryWithUrls) {
103-    if (e.author_role === "visiteur") return true;
104:    if (newsIntervenantMode === "all") return true;
105:    if (newsIntervenantMode === "some") {
106:      return e.author_role === "intervenant"
107:        ? !!e.intervenant_profile_id && authorizedIntervenantIds.has(e.intervenant_profile_id)
108-        : false; // admin en mode "some" : pas de canal individuel pour lui, reste privé
109-    }
110-    return false;
111-  }
112-
113-  const { focusEntryId } = useLocalSearchParams<{ focusEntryId?: string }>();
114-  const listRef = useRef<FlatList<NewsEntryWithUrls>>(null);
115-  const [highlightId, setHighlightId] = useState<string | null>(null);
116-  const focusedRef = useRef(false);
117-  // Focus différé à l'ouverture du modal (via Modal.onShow) plutôt qu'un
118-  // autoFocus synchrone sur le TextInput : sur Android, autoFocus déclenche
119-  // le clavier pendant la toute première passe de layout du Modal, ce qui
120-  // entre en course avec le calcul de hauteur du ScrollView et laissait le
121-  // bas du formulaire (bouton Publier) invisible tant qu'aucun re-rendu
122-  // n'était déclenché.
--
173-  const [viewMode, setViewMode] = useState<"feed" | "media">("feed");
174-  const [mediaLightboxIdx, setMediaLightboxIdx] = useState<number | null>(null);
175-  const [downloadingMediaLightbox, setDownloadingMediaLightbox] = useState(false);
176-
177-  // Sélection multiple dans la grille "Médias" — appui long pour entrer,
178-  // permet de télécharger/partager plusieurs photos d'un coup (même pattern
179-  // que components/SouvenirsGallery.tsx).
180-  const [mediaSelectMode, setMediaSelectMode] = useState(false);
181-  const [mediaSelected, setMediaSelected] = useState<Set<number>>(new Set());
182-  const [bulkDownloadingMedia, setBulkDownloadingMedia] = useState(false);
183-
184-  // Fiche visiteur — ouverte en cliquant le nom de l'auteur (sauf admin)
185-  const [profileTarget, setProfileTarget] = useState<{ prenom: string; nom: string } | null>(null);
186-
187-  const [sessionPin, setSessionPin] = useState("");
188:  // ID intervenant_profiles de l'intervenant connecté — rempli à la
189:  // publication d'une nouvelle en author_role "intervenant" (voir
190-  // handleSave), sert à vérifier son autorisation dans
191:  // news_authorized_intervenants quand newsIntervenantMode = "some".
192:  const [sessionIntervenantProfileId, setSessionIntervenantProfileId] = useState<string | null>(null);
193-
194-  const [toast, setToast] = useState("");
195-
196-  function showToast(msg: string) {
197-    setToast(msg);
198-    setTimeout(() => setToast(""), 3200);
199-  }
200-
201-  // ── Load ───────────────────────────────────────────────────────────────────
202-  const loadEntries = useCallback(async () => {
203-    setLoading(true);
204-    const { data, error } = await supabase
205-      .from("news_entries")
206-      .select("*")
207-      .eq("space_id", spaceId)
--
241-  // seulement à l'ouverture de "+ Publier") pour être disponible dès le
242-  // premier tap sur "Répondre".
243-  useEffect(() => {
244-    if (isAdmin) {
245-      supabase.auth.getUser().then(({ data }) => {
246-        setFormPrenom((data.user?.user_metadata?.firstname ?? "").trim());
247-        setFormNom((data.user?.user_metadata?.lastname ?? "").trim());
248-      });
249-      return;
250-    }
251-    getVisitorSession().then((s) => {
252-      if (s) {
253-        setFormPrenom(s.prenom);
254-        setFormNom(s.nom);
255-        if (s.pin) setSessionPin(s.pin);
256:        if (s.intervenantProfileId) setSessionIntervenantProfileId(s.intervenantProfileId);
257-      }
258-    });
259-  }, [isAdmin]);
260-
261:  // Canal intervenants+admin : un visiteur ne voit que les nouvelles
262:  // publiées par des visiteurs, plus celles d'intervenants/admin autorisées
263:  // par newsIntervenantMode (voir isNewsEntryVisibleToVisitor ci-dessus).
264:  // Intervenants et admin voient toujours tout.
265-  const visibleEntries = entries.filter(
266-    (e) =>
267-      (effectiveRole !== "visiteur" || isNewsEntryVisibleToVisitor(e)) &&
268-      (!e.deleted_by_admin || (!isAdmin && e.author_pin === sessionPin)),
269-  );
270-
271-  // Liste aplatie des médias pour la vue "Médias" (bouton du sous-header) —
272-  // dérivée de visibleEntries (déjà filtrée), pas de nouvelle requête.
273-  const mediaItems = visibleEntries.flatMap((e) => e.photoUrls.map((url) => ({ url, entry: e })));
274-
275-  // Trace le téléchargement dans saved_media (Mes Souvenirs) si la photo
276-  // n'est pas la mienne. Identifie le visiteur par prénom/nom (pas par pin,
277-  // pas toujours choisi) — voir lib/mediaShare.ts et MesSouvenirs.tsx.
278-  async function logDownloadIfNotMine(entry: NewsEntryWithUrls, url: string) {
279-    if (isAdmin) {
--
388-    setEditTarget(null);
389-    setFormText(""); setFormPrenom(""); setFormNom(""); setFormPin("");
390-    setFormPhotos([]);
391-    if (isAdmin) {
392-      // Admin déjà connecté à son compte : son prénom/nom viennent de son
393-      // profil Supabase Auth (renseigné dans Mon compte), jamais ressaisis.
394-      const { data } = await supabase.auth.getUser();
395-      setFormPrenom((data.user?.user_metadata?.firstname ?? "").trim());
396-      setFormNom((data.user?.user_metadata?.lastname ?? "").trim());
397-    } else {
398-      const s = await getVisitorSession();
399-      if (s) {
400-        setFormPrenom(s.prenom);
401-        setFormNom(s.nom);
402-        if (s.pin) setSessionPin(s.pin);
403:        if (s.intervenantProfileId) setSessionIntervenantProfileId(s.intervenantProfileId);
404-      }
405-    }
406-    setShowForm(true);
407-  }
408-
409-  function openEdit(entry: NewsEntryWithUrls) {
410-    setEditTarget(entry);
411-    setFormText(entry.content);
412-    setFormPrenom(entry.author_prenom);
413-    setFormNom(entry.author_nom);
414-    setFormPin("");
415-    // When editing, existing photos are kept server-side;
416-    // show them as "already uploaded" (no local uri)
417-    setFormPhotos(entry.photos.map((f, i) => ({ uri: entry.photoUrls[i], filename: f })));
418-    setShowForm(true);
--
582-      setFormSaving(false);
583-      // The publish/edit sheet is a native <Modal> — it stays open on error
584-      // (so the user can retry), which would hide the toast banner behind
585-      // it. Alert is native too, so it's visible regardless.
586-      if (error) { Alert.alert("Erreur", "Erreur lors de la modification : " + error.message); return; }
587-      showToast("Nouvelle modifiée ✓");
588-    } else {
589-      const { error } = await supabase.from("news_entries").insert({
590-        space_id: spaceId,
591-        news_date: new Date().toISOString().slice(0, 10),
592-        content: formText.trim(),
593-        author_prenom: formPrenom.trim(),
594-        author_nom: formNom.trim(),
595-        author_pin: isAdmin ? "ADMIN" : (sessionPin || formPin),
596-        author_role: effectiveRole,
597:        intervenant_profile_id: effectiveRole === "intervenant" ? sessionIntervenantProfileId : null,
598-        photos: uploadedFilenames,
599-      });
600-
601-      setFormSaving(false);
602-      if (error) { Alert.alert("Erreur", "Erreur lors de la publication : " + error.message); return; }
603-      if (!isAdmin) await rememberAuthorPin(formPrenom.trim(), formNom.trim(), sessionPin || formPin);
604-      showToast("Nouvelle publiée ✓");
605-    }
606-
607-    closeForm();
608-    await loadEntries();
609-  }
610-
611-  // ── Delete ─────────────────────────────────────────────────────────────────
612-  async function doDelete(entry: NewsEntryWithUrls) {
--
740-    setReplyDeleteTarget(null);
741-    if (isAdmin && r.author_pin !== "ADMIN") {
742-      await softDeleteByAdminReply(r);
743-      return;
744-    }
745-    await supabase.from("news_entry_replies").delete().eq("id", r.id);
746-    loadReplies();
747-    showToast("Réponse supprimée");
748-  }
749-
750-  // ── Render entry ───────────────────────────────────────────────────────────
751-  function renderEntry({ item: entry }: { item: NewsEntryWithUrls }) {
752-    const canModify = isAdmin || entry.author_pin !== "ADMIN";
753-    const highlighted = highlightId === entry.id;
754-    // Vue admin uniquement : distingue en un coup d'œil les publications
755:    // visiteurs (orange) des publications intervenants (violet), le fil
756-    // mélangeant les deux (voir isNewsEntryVisibleToVisitor pour la règle de
757-    // visibilité côté visiteurs).
758-    const entryAccentColor = isAdmin
759:      ? entry.author_role === "visiteur" ? C.orange : entry.author_role === "intervenant" ? LOGO_PURPLE : C.border
760-      : C.border;
761-    return (
762-      <View
763-        style={[
764-          styles.card,
765-          { backgroundColor: C.card, borderColor: highlighted ? C.gold : entryAccentColor },
766-          highlighted && { borderWidth: 2 },
767-        ]}
768-      >
769-        {/* Author + date */}
770-        <View style={styles.cardHeader}>
771-          <View style={[styles.avatar, { backgroundColor: C.accent }]}>
772-            <Text style={styles.avatarText}>{avatarInitial(entry.author_prenom)}</Text>
773-          </View>
774-          <View style={{ flex: 1 }}>
--
880-        >
881-          <Text style={[styles.replyBtnText, { color: C.gold }]}>🙏 Répondre</Text>
882-        </TouchableOpacity>
883-      </View>
884-    );
885-  }
886-
887-  // ─── Render ────────────────────────────────────────────────────────────────
888-  return (
889-    <View style={[styles.container, { backgroundColor: C.bg }]}>
890-      {/* Header */}
891-      <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
892-        <Text style={[styles.headerTitle, { color: C.text }]}>📰 Nouvelles du jour</Text>
893-        {effectiveRole !== "visiteur" && (
894-          <View style={styles.headerStatusRow}>
895:            <Text style={[styles.headerStatusText, { color: newsIntervenantMode !== "disabled" ? C.success : C.muted }]}>
896:              {newsIntervenantMode === "all"
897-                ? "🔓 Visible aussi par les visiteurs"
898:                : newsIntervenantMode === "some"
899:                ? "🔓 Visible aussi par les visiteurs (intervenants autorisés)"
900:                : "🔒 Dédié aux intervenants et à l'admin"}
901-            </Text>
902-          </View>
903-        )}
904-      </View>
905-
906-      <View style={[styles.subHeader, { backgroundColor: C.card, borderBottomColor: C.border }]}>
907-        <View style={styles.subHeaderRow}>
908-          <TouchableOpacity
909-            style={[styles.addBtn, { backgroundColor: C.accent }]}
910-            onPress={openPublish}
911-            activeOpacity={0.85}
912-          >
913-            <Text style={[styles.addBtnText, { color: "#fff" }]}>+ Publier</Text>
914-          </TouchableOpacity>
915-        </View>

```

### components/MyChecklist.tsx

Fichier partagé — checklist personnelle, contient l'intégration des templates de checklist intervenant.

```tsx
1-import { useCallback, useEffect, useState } from "react";
2-import {
3-  View, Text, TextInput, TouchableOpacity, ScrollView,
4-  StyleSheet, ActivityIndicator, Alert, Modal, Switch, Linking,
5-} from "react-native";
6-import * as Crypto from "expo-crypto";
7-import { supabase } from "@/lib/supabase";
8-import ConfirmModal from "@/components/ConfirmModal";
9-import MiniCalendar from "@/components/MiniCalendar";
10-import { normalizePhone } from "@/lib/phone";
11-import { CHECKLIST_TEMPLATES, addDaysIso, checklistItemDescription, findTemplateItemByTitle, type ChecklistContext, type ChecklistItem } from "@/lib/checklistTemplates";
12-import { findLetterTemplateForChecklistItem, LETTER_TEMPLATES, type LetterTemplate } from "@/lib/letterTemplates";
13-import { saveAndShareDoc, splitAlignedLines } from "@/lib/mediaShare";
14-import MesDocumentsModal from "@/components/MesDocumentsModal";
15-import ShoppingListModal from "@/components/ShoppingListModal";
16:import type { PersonalChecklistItem, IntervenantChecklistTemplate, PersonalDocument, PatientSpace, Task } from "@/lib/types";
17-import { CHECKLIST_COLORS, type Theme } from "@/lib/themes";
18-
19-interface Props {
20-  spaceId: string;
21-  isAdmin: boolean;
22-  ownerPrenom: string;
23-  ownerNom: string;
24-  // "ADMIN" côté admin (même convention que author_pin sur tasks/news_entries),
25-  // sinon le PIN de session du visiteur.
26-  ownerPin: string;
27-  // Dossier patient de cet espace — sert uniquement à pré-remplir les
28-  // courriers (voir openLetterModal/lib/letterTemplates.ts, prefill) avec
29-  // les infos déjà connues de l'app (nom du patient, établissement
30-  // hospitalier, adresse du domicile...).
31-  space: PatientSpace;
32-  C: Theme;
33-  // Masque "✨ Importer une checklist toute prête" — les checklists
34:  // suggérées (Entraide) ne concernent pas les intervenants, voir
35-  // app/(visitor)/account.tsx.
36-  hideImportBanner?: boolean;
37:  // Téléphone brut de la fiche intervenant (role === "intervenant"
38-  // uniquement) — active "💾 Enregistrer comme modèle" / "📥 Mes modèles"
39-  // pour réutiliser une checklist perso dans un autre dossier patient.
40-  // Normalisé en interne (voir normalizePhone), même mécanisme que "Mes
41-  // espaces" (app/(visitor)/account.tsx, linkedSpaces).
42:  intervenantTelephone?: string;
43-}
44-
45-function linesToTitles(text: string): string[] {
46-  return text.split("\n").map((l) => l.trim()).filter(Boolean);
47-}
48-
49-// Assistant de publication de checklist (voir startImportWizard) — un item
50-// à la fois (échéance → urgent → précision), pas de photo ici (aucune
51-// infra ImagePicker dans ce fichier, et non demandé pour ce flux).
52-type ImportWizardEntry = { key: string; item: ChecklistItem };
53-type ImportWizardFields = { dateLimite: string; urgent: boolean; detail: string };
54-
55-// Bloc "Ma Checklist" (Mon Compte, admin + visiteur) : liste personnelle où
56-// chacun peut cocher "Fait" directement, ajouter ses propres items en texte
57-// libre, ou importer une des checklists suggérées d'Entraide. Par défaut un
58-// import reste privé (aucune ligne tasks créée) — bascule "Publier aussi sur
59-// le Mur d'Entraide" dans confirmImport pour lier l'item à un vrai besoin
60-// `tasks` public ; dans ce cas, basculer son statut ici met aussi à jour
61-// tasks.status, qui se propage partout via l'abonnement realtime déjà en
62-// place dans Entraide.tsx.
63:export default function MyChecklist({ spaceId, isAdmin, ownerPrenom, ownerNom, ownerPin, space, C, hideImportBanner, intervenantTelephone }: Props) {
64:  const normalizedTelephone = intervenantTelephone ? normalizePhone(intervenantTelephone) : "";
65-  const canUseTemplates = normalizedTelephone.length >= 6;
66-  const [items, setItems] = useState<PersonalChecklistItem[]>([]);
67-  const [loading, setLoading] = useState(true);
68-  // Un seul sous-bloc ouvert à la fois, comme "Mes contributions" — clé de
69-  // groupe (ChecklistContext, "perso", ou nom de checklist perso créée).
70-  const [openGroup, setOpenGroup] = useState<string | null>(null);
71-
72-  const [createModal, setCreateModal] = useState(false);
73-  const [newChecklistName, setNewChecklistName] = useState("");
74-  const [newChecklistItems, setNewChecklistItems] = useState<string[]>([]);
75-  const [newChecklistItemDraft, setNewChecklistItemDraft] = useState("");
76-  const [creatingChecklist, setCreatingChecklist] = useState(false);
77-
78-  // Ajout d'items dans une checklist perso déjà créée — un seul champ car un
79-  // seul groupe est ouvert à la fois (openGroup), remis à zéro à chaque
80-  // changement de groupe ouvert (voir useEffect plus bas).
81-  const [groupAddText, setGroupAddText] = useState("");
82-  const [groupAddSaving, setGroupAddSaving] = useState(false);
83-
84:  // "Mes modèles" (intervenant uniquement) — sauvegarder une checklist perso
85-  // comme modèle réutilisable, puis l'importer dans un autre dossier patient.
86-  const [savingTemplateName, setSavingTemplateName] = useState<string | null>(null);
87-  const [templatesPicker, setTemplatesPicker] = useState(false);
88:  const [templates, setTemplates] = useState<IntervenantChecklistTemplate[]>([]);
89-  const [loadingTemplates, setLoadingTemplates] = useState(false);
90-  const [importingTemplateId, setImportingTemplateId] = useState<string | null>(null);
91-  // Popup de sélection avant import d'un modèle — tous les items du modèle
92-  // (y compris ceux déjà cochés "fait" dans l'espace patient d'origine, un
93-  // modèle n'a pas de statut, voir saveGroupAsTemplate) apparaissent
94-  // pré-cochés, sauf ceux déjà présents dans ce dossier patient (n'importe
95-  // quelle checklist, pas seulement une réimportation du même modèle — voir
96-  // findExistingChecklistItem) qui sont grisés pour éviter les doublons.
97:  const [importTpl, setImportTpl] = useState<IntervenantChecklistTemplate | null>(null);
98-  const [tplChecked, setTplChecked] = useState<Record<number, boolean>>({});
99-  // Quand tous les items d'un modèle sont déjà présents dans ce dossier
100-  // patient — popup purement informatif (ConfirmModal singleButton) plutôt
101-  // que la sélection, qui n'aurait plus rien d'importable.
102-  const [fullyImportedTplName, setFullyImportedTplName] = useState<string | null>(null);
103-
104-  // Sélection multiple (restant appuyé sur un item, comme dans le Mur
105-  // d'Entraide) — pour supprimer plusieurs items de sa checklist en une fois.
106-  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
107-  const selectionMode = selectedIds.size > 0;
108-  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
109-  const [bulkDeleteSaving, setBulkDeleteSaving] = useState(false);
110-
111-  // Suppression d'une checklist perso nommée en entier (clic prolongé sur son
112-  // en-tête) — utile notamment pour retirer une checklist importée depuis un
--
411-    setGroupAddSaving(false);
412-    if (error) {
413-      Alert.alert("Erreur", "Impossible d'ajouter : " + error.message);
414-      return;
415-    }
416-    setGroupAddText("");
417-    loadItems();
418-  }
419-
420-  async function saveGroupAsTemplate(name: string) {
421-    if (!canUseTemplates) return;
422-    const titles = groupItems(name).map((it) => it.title);
423-    if (!titles.length) return;
424-    setSavingTemplateName(name);
425-    const { error } = await supabase
426:      .from("intervenant_checklist_templates")
427-      .upsert({ telephone: normalizedTelephone, name, items: titles }, { onConflict: "telephone,name" });
428-    setSavingTemplateName(null);
429-    if (error) {
430-      Alert.alert("Erreur", "Impossible d'enregistrer le modèle : " + error.message);
431-      return;
432-    }
433-    Alert.alert("Modèle enregistré", `"${name}" est maintenant disponible dans "📥 Mes modèles", dans tous tes dossiers patient.`);
434-  }
435-
436-  async function openTemplatesPicker() {
437-    if (!canUseTemplates) return;
438-    setTemplatesPicker(true);
439-    setLoadingTemplates(true);
440-    const { data } = await supabase
441:      .from("intervenant_checklist_templates")
442-      .select("*")
443-      .eq("telephone", normalizedTelephone)
444-      .order("name", { ascending: true });
445:    setTemplates((data ?? []) as IntervenantChecklistTemplate[]);
446-    setLoadingTemplates(false);
447-  }
448-
449:  function openTemplateImport(tpl: IntervenantChecklistTemplate) {
450-    if (!tpl.items.length) return;
451-    if (tpl.items.every((title) => !!findExistingChecklistItem(title))) {
452-      setTemplatesPicker(false);
453-      setFullyImportedTplName(tpl.name);
454-      return;
455-    }
456-    const checked: Record<number, boolean> = {};
457-    tpl.items.forEach((title, i) => { if (!findExistingChecklistItem(title)) checked[i] = true; });
458-    setTplChecked(checked);
459-    setImportTpl(tpl);
460-    setTemplatesPicker(false);
461-  }
462-
463-  function toggleTplItem(i: number) {
464-    setTplChecked((prev) => ({ ...prev, [i]: !prev[i] }));
465-  }
466-
467:  function toggleAllTplItems(tpl: IntervenantChecklistTemplate, on: boolean) {
468-    const next: Record<number, boolean> = {};
469-    tpl.items.forEach((title, i) => { if (!findExistingChecklistItem(title)) next[i] = on; });
470-    setTplChecked(next);
471-  }
472-
473-  async function confirmImportTemplate() {
474-    if (!importTpl) return;
475-    const selected = importTpl.items.filter((title, i) => tplChecked[i] && !findExistingChecklistItem(title));
476-    if (!selected.length) return;
477-    setImportingTemplateId(importTpl.id);
478-    const rows = selected.map((title) => ({
479-      space_id: spaceId,
480-      owner_prenom: ownerPrenom,
481-      owner_nom: ownerNom,
482-      owner_pin: ownerPin,
--
745-
746-  if (!canLoad) return null;
747-
748-  // checklist_context prime sur custom_checklist_name : une pièce à réunir
749-  // (voir publishImportWizard, pieceRows) porte les deux à la fois pour
750-  // rester rattachée à sa checklist toute prête d'origine plutôt que de
751-  // retomber dans le seau générique des checklists perso nommées.
752-  const groupItems = (key: string) =>
753-    items.filter((it) => {
754-      if (key === "perso") return !it.checklist_context && !it.custom_checklist_name;
755-      if (it.checklist_context) return it.checklist_context === key;
756-      return it.custom_checklist_name === key;
757-    });
758-
759-  // Une checklist perso créée via "+ Créer une checklist" (ou importée comme
760:  // modèle intervenant) n'existe que si elle a au moins un item — et exclut
761-  // les pièces à réunir des checklists toute prêtes, qui portent aussi
762-  // custom_checklist_name mais ont un checklist_context (voir groupItems).
763-  const customNames = Array.from(
764-    new Set(
765-      items
766-        .filter((it) => !it.checklist_context && it.custom_checklist_name)
767-        .map((it) => it.custom_checklist_name as string),
768-    ),
769-  );
770-
771-  // Ordre d'apparition des checklists toute prêtes importées — items déjà
772-  // triés par created_at ascendant (voir loadItems), donc Array.from(new
773-  // Set(...)) conserve l'ordre chronologique du premier import de chaque
774-  // contexte plutôt que l'ordre fixe de CHECKLIST_TEMPLATES.
775-  const importedCtxOrder = Array.from(
--
1186-                  { backgroundColor: C.gold, opacity: !newChecklistName.trim() || !newChecklistItems.length || creatingChecklist ? 0.5 : 1 },
1187-                ]}
1188-                onPress={confirmCreateChecklist}
1189-                disabled={!newChecklistName.trim() || !newChecklistItems.length || creatingChecklist}
1190-              >
1191-                {creatingChecklist
1192-                  ? <ActivityIndicator color="#fff" />
1193-                  : <Text style={styles.btnPrimaryText}>Créer</Text>
1194-                }
1195-              </TouchableOpacity>
1196-            </View>
1197-          </View>
1198-        </View>
1199-      </Modal>
1200-
1201:      {/* ── MODAL : mes modèles de checklist (intervenant, cross-space) ─── */}
1202-      <Modal visible={templatesPicker} transparent animationType="fade" onRequestClose={() => setTemplatesPicker(false)}>
1203-        <View style={styles.overlay}>
1204-          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setTemplatesPicker(false)} />
1205-          <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.gold }]}>
1206-            <Text style={[styles.sheetTitle, { color: C.text }]}>📥 Mes modèles</Text>
1207-            <Text style={[styles.intro, { color: C.muted }]}>
1208-              Retrouve ici les checklists que tu as enregistrées comme modèle (💾, depuis un autre dossier patient). Choisis-en une pour sélectionner les items à importer dans ce dossier-ci.
1209-            </Text>
1210-            {loadingTemplates ? (
1211-              <ActivityIndicator color={C.gold} style={{ marginVertical: 16 }} />
1212-            ) : templates.length === 0 ? (
1213-              <Text style={[styles.empty, { color: C.muted }]}>
1214-                Aucun modèle pour le moment. Enregistre une checklist comme modèle avec 💾, depuis son en-tête.
1215-              </Text>
1216-            ) : (

```

### components/VisitorSlotsList.tsx

Fichier partagé — liste de créneaux visiteur, contient la prise en compte des interventions dans l'affichage.

```tsx
1-import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
2-import { useVisitorSpace } from "@/lib/VisitorContext";
3-import { getSlotOccupancy, getInterventionOverlap, isSlotFullyPast } from "@/lib/slotUtils";
4-import { metierLabel } from "@/lib/metiers";
5-import { guessFrenchArticle } from "@/lib/frenchGender";
6:import type { OtherSpaceIntervention } from "@/lib/useOtherSpaceInterventions";
7-import type { Reservation } from "@/lib/types";
8-import type { Theme } from "@/lib/themes";
9-import { LOGO_PURPLE } from "@/lib/themes";
10-
11:// Liste des créneaux horaires "Visite" du jour, côté visiteur/intervenant —
12-// extraite de app/(visitor)/home/slots.tsx pour être réutilisée telle quelle
13-// par la vue Hebdo du calendrier (app/(visitor)/home/calendar.tsx), qui
14-// affiche le détail du jour sélectionné dans la bande de 7 jours au lieu de
15-// sa propre page. Pulls `reservations`/`getConfigForDate`/`getSlotsForDate`
16-// from context directly to keep the parent component's JSX uncluttered.
17:// Limité aux créneaux "Visite"/"Intervention" — la nuitée garde son propre
18-// écran (home/nights.tsx), non concernée par la réservation depuis la bande
19-// Hebdo.
20-export default function VisitorSlotsList({
21:  iso, C, role, intervenantProfileId, myPin, bookable = true, otherSpaceInterventions = [], onReserveVisit, onEditVisit, onReserveIntervention, onCancelIntervention, onLongPressOtherSpaceSoin,
22-}: {
23-  iso: string;
24-  C: Theme;
25:  role: "visiteur" | "intervenant" | null;
26:  intervenantProfileId: string | null;
27-  myPin: string | null;
28-  // Faux uniquement pour un jour antérieur à la date d'hospitalisation, vue
29-  // Hebdo du calendrier (E) — le jour reste consultable, seule la
30-  // réservation est masquée (Modifier/Annuler restent visibles).
31-  bookable?: boolean;
32:  // Soins de CET intervenant chez d'autres patients (lib/useOtherSpaceInterventions)
33-  // — sert à teinter en violet les créneaux déjà pris ailleurs. Vide pour un
34-  // visiteur (non concerné).
35:  otherSpaceInterventions?: OtherSpaceIntervention[];
36-  onReserveVisit: (iso: string, slot: string) => void;
37-  onEditVisit: (r: Reservation) => void;
38:  onReserveIntervention: (iso: string, slot: string) => void;
39:  onCancelIntervention: (r: Reservation) => void;
40-  // Appui prolongé sur la bannière violette "Soin déjà programmé avec..." —
41-  // ouvre un popup proposant de modifier ce soin chez l'autre patient (voir
42-  // home/slots.tsx). Absent côté visiteur (otherSpaceInterventions est de
43-  // toute façon vide pour ce rôle, cf. plus bas).
44:  onLongPressOtherSpaceSoin?: (soin: OtherSpaceIntervention) => void;
45-}) {
46:  const { reservations, getConfigForDate, getSlotsForDate, intervenantProfiles } = useVisitorSpace();
47-  const dayConfig = getConfigForDate(iso);
48-  const allDaySlots = getSlotsForDate(iso);
49-  if (!dayConfig) return null;
50-
51-  const isMine = (r: Reservation) => !!myPin && r.pin === myPin;
52-
53-  // Mode "1 visite / jour" : même filtrage que app/(visitor)/home/slots.tsx.
54-  const dayVisitBooking = dayConfig.one_visit_per_day
55-    ? reservations.find((r) => r.type === "Visite" && r.date === iso && r.alert_type !== "day_cap_suspended")
56-    : undefined;
57-  const daySlots = dayVisitBooking ? allDaySlots.filter((s) => s === dayVisitBooking.creneau) : allDaySlots;
58-
59-  return (
60-    <>
61-      {daySlots.map((slot) => {
62-        const occ = getSlotOccupancy(reservations, iso, slot);
63-        const full = occ.length >= dayConfig.max_visitors_per_slot;
64-        const past = isSlotFullyPast(iso, slot);
65-        const mine = occ.find(isMine);
66:        const intervention = getInterventionOverlap(reservations, iso, slot, dayConfig.slot_duration_minutes);
67:        const myInterventionHere = intervention && role === "intervenant" && intervention.intervenant_profile_id === intervenantProfileId;
68:        // Soin déjà pris ailleurs (autre espace patient, même intervenant) qui
69:        // chevauche ce créneau — n'a de sens que côté intervenant, et
70-        // uniquement si ce créneau n'est pas déjà occupé ici (bannière orange
71-        // existante déjà suffisamment explicite dans ce cas).
72:        const otherSpaceSoin = !intervention && role === "intervenant"
73:          ? (getInterventionOverlap(otherSpaceInterventions, iso, slot, dayConfig.slot_duration_minutes) as OtherSpaceIntervention | undefined)
74-          : undefined;
75-
76-        return (
77-          <View
78-            key={slot}
79-            style={[
80-              styles.slotCard,
81-              {
82-                backgroundColor: otherSpaceSoin ? `${LOGO_PURPLE}1F` : C.card,
83:                borderColor: intervention ? C.orange : otherSpaceSoin ? LOGO_PURPLE : full ? "rgba(233,69,96,0.3)" : C.border,
84-                opacity: past ? 0.5 : 1,
85-              },
86-            ]}
87-          >
88-            <View style={styles.slotLeft}>
89-              <Text style={[styles.slotTime, { color: C.gold }]}>{slot}</Text>
90-              <Text style={[styles.slotCount, { color: C.muted }]}>{occ.length}/{dayConfig.max_visitors_per_slot} inscrits</Text>
91-              {occ.length === 0
92-                ? <Text style={[styles.slotEmpty, { color: C.muted }]}>——</Text>
93-                : occ.map((r) => (
94-                  <View key={r.id} style={styles.visitorRow}>
95-                    <Text style={[styles.visitorName, { color: C.success }]}>● {r.prenom} {r.nom}</Text>
96-                  </View>
97-                ))
98-              }
99:              {intervention && (() => {
100:                const byMetier = metierLabel(intervenantProfiles.find((p) => p.id === intervention.intervenant_profile_id)?.metier);
101-                return (
102-                  <View style={[styles.interventionBanner, { backgroundColor: "rgba(249,115,22,0.12)", borderColor: C.orange }]}>
103-                    <Text style={[styles.interventionText, { color: C.orange }]}>
104:                      🩺 {intervention.intervention_label} ({intervention.duration_minutes} min){!myInterventionHere && ` - ${intervention.prenom} ${intervention.nom}${byMetier ? ` (${byMetier})` : ""}`} - Prioritaire sur les visites
105-                    </Text>
106-                  </View>
107-                );
108-              })()}
109-              {otherSpaceSoin && (
110-                <TouchableOpacity
111-                  style={[styles.interventionBanner, { backgroundColor: `${LOGO_PURPLE}1F`, borderColor: LOGO_PURPLE }]}
112-                  onLongPress={() => onLongPressOtherSpaceSoin?.(otherSpaceSoin)}
113-                  delayLongPress={400}
114-                  activeOpacity={0.7}
115-                  disabled={!onLongPressOtherSpaceSoin}
116-                >
117-                  <Text style={[styles.interventionText, { color: LOGO_PURPLE }]}>
118-                    🗂️ Soin déjà programmé avec {otherSpaceSoin.patientName} pour {guessFrenchArticle(otherSpaceSoin.intervention_label ?? "")} {otherSpaceSoin.intervention_label}
119-                  </Text>
120-                </TouchableOpacity>
121-              )}
122-              {mine?.alert_message && !mine.alert_seen && (
123-                <View style={[styles.alertBanner, { backgroundColor: "rgba(233,69,96,0.12)", borderColor: "rgba(233,69,96,0.4)" }]}>
124-                  <Text style={[styles.alertText, { color: C.danger }]}>{mine.alert_message}</Text>
125-                </View>
126-              )}
127-            </View>
128-            <View style={styles.slotRight}>
129:              {role === "intervenant" ? (
130-                <>
131-                  {myInterventionHere && !past && (
132-                    <TouchableOpacity
133:                      onPress={() => onCancelIntervention(intervention!)}
134-                      style={[styles.editBtn, { borderColor: C.border }]}
135-                    >
136-                      <Text style={[styles.editBtnText, { color: C.muted }]}>Annuler</Text>
137-                    </TouchableOpacity>
138-                  )}
139:                  {!intervention && !past && bookable && (
140-                    <TouchableOpacity
141-                      style={[styles.reserveBtn, { backgroundColor: C.orange }]}
142:                      onPress={() => onReserveIntervention(iso, slot)}
143-                      activeOpacity={0.85}
144-                    >
145-                      <Text style={styles.reserveBtnText}>Réserver</Text>
146-                    </TouchableOpacity>
147-                  )}
148-                </>
149-              ) : (
150-                <>
151:                  {!full && !past && !intervention && bookable && (
152-                    <TouchableOpacity
153-                      style={[styles.reserveBtn, { backgroundColor: C.accent }]}
154-                      onPress={() => onReserveVisit(iso, slot)}
155-                      activeOpacity={0.85}
156-                    >
157-                      <Text style={styles.reserveBtnText}>Réserver</Text>
158-                    </TouchableOpacity>
159-                  )}
160:                  {(full || intervention) && !past && (
161-                    <View style={[styles.fullBadge, { borderColor: C.border }]}>
162:                      <Text style={[styles.fullBadgeText, { color: C.muted }]}>{intervention ? "Bloqué" : "Complet"}</Text>
163-                    </View>
164-                  )}
165-                  {mine && !past && (
166-                    <TouchableOpacity onPress={() => onEditVisit(mine)} style={[styles.editBtn, { borderColor: C.border }]}>
167-                      <Text style={[styles.editBtnText, { color: C.muted }]}>Modifier</Text>
168-                    </TouchableOpacity>
169-                  )}
170-                </>
171-              )}
172-            </View>
173-          </View>
174-        );
175-      })}
176-    </>
177-  );

```

### components/PlanningDuJourBlock.tsx

Fichier partagé — bloc planning du jour, contient l'affichage des interventions aux côtés des visites.

```tsx
1-import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
2-import { toISO, remainingSpotsLabel, isReservationDatePast } from "@/lib/slotUtils";
3-import type { Theme } from "@/lib/themes";
4-import type { Reservation } from "@/lib/types";
5-
6:// Bloc "Planning du jour" de l'onglet Planning intervenant (soins.tsx) —
7-// affiche les soins d'UN seul jour : aujourd'hui par défaut, ou le dernier
8:// jour tapé sur IntervenantGlobalCalendar (voir selectedIso dans soins.tsx).
9-// Les soins des autres jours restent dans la rubrique "Planning
10-// mensuel/hebdo" (SoinsPeriodBlock) juste en dessous, qui exclut ce jour-là
11-// pour ne pas le lister deux fois.
12-interface Props {
13-  C: Theme;
14-  iso: string;
15-  reservations: Reservation[];
16-  patientNameBySpaceId: Record<string, string>;
17-  locationBySpaceId: Record<string, string>;
18-  onSoinPress: (r: Reservation) => void;
19:  // Bouton "Autres intervenants" affiché sur la même ligne que le titre —
20:  // inclut, quand actif, les soins des autres intervenants (mêmes espaces
21-  // patients) dans ce bloc ET dans "Planning mensuel/hebdo" juste en dessous
22-  // (voir soins.tsx, plannedReservations). Absent : pas de bouton (usages
23:  // hors onglet Planning intervenant, s'il y en a un jour).
24:  showOtherIntervenants?: boolean;
25:  onToggleOtherIntervenants?: () => void;
26:  // Libellé de repli quand r.intervention_label est vide — "Intervention" par
27-  // défaut (comportement historique). Passer "Visite" pour le planning des
28-  // visites (home/calendar.tsx, mode Visites), où intervention_label n'est
29-  // jamais renseigné.
30:  reservationType?: "Intervention" | "Visite";
31-  // Accompagnants d'une réservation, indexés par son id (voir
32-  // home/calendar.tsx, companionsByMainId) — affichés sous le nom du
33-  // réservant principal. Absent : rien n'est affiché (usages hors visites).
34-  companionsById?: Record<string, Reservation[]>;
35-  // Rend le message "Aucune visite prévue ce jour" tappable pour ouvrir
36-  // directement l'écran de réservation des créneaux de ce jour-là (voir
37-  // home/calendar.tsx) — absent : le message reste statique (usage
38:  // intervenant, soins.tsx, qui a son propre écran de créneaux par soin).
39-  onEmptyPress?: () => void;
40-  // Places prises/max du créneau de chaque ligne, indexées par r.id (voir
41-  // home/calendar.tsx, remainingByMainId) — affiché sous le nom du
42-  // réservataire pour permettre de repérer d'un coup d'œil s'il reste une
43:  // place sur ce créneau. Absent : rien n'est affiché (usage intervenant,
44-  // soins.tsx, un seul soin possible par créneau, la notion ne s'applique
45-  // pas).
46-  remainingBySlotId?: Record<string, { taken: number; max: number }>;
47-  // Anniversaire du patient ("YYYY-MM-DD", année de naissance) + prénom —
48-  // affiche "xx ans de Prénom !" dans le titre du jour quand iso tombe sur
49-  // le mois+jour de naissance (comparaison identique à BirthdayAlertModal et
50:  // home/calendar.tsx). Absent : pas d'affichage (usage intervenant,
51-  // soins.tsx, qui peut regrouper plusieurs patients le même jour).
52-  patientBirthdate?: string | null;
53-  patientFirstname?: string;
54-  // Date d'hospitalisation ("YYYY-MM-DD", PatientSpace.patient_admission_date)
55-  // — quand iso tombe exactement dessus, le titre du jour affiche l'année
56-  // (seul cas où elle apparaît, pour ne pas dater les autres jours) suivie de
57-  // "- Jour d'hospitalisation". Absent/null : titre inchangé (usage
58:  // intervenant, soins.tsx, qui regroupe plusieurs patients sans notion
59-  // d'hospitalisation unique).
60-  patientAdmissionDate?: string | null;
61-}
62-
63:export default function PlanningDuJourBlock({ C, iso, reservations, patientNameBySpaceId, locationBySpaceId, onSoinPress, showOtherIntervenants, onToggleOtherIntervenants, reservationType = "Intervention", companionsById, onEmptyPress, remainingBySlotId, patientBirthdate, patientFirstname, patientAdmissionDate }: Props) {
64-  const isToday = iso === toISO(new Date());
65-  const dayDate = new Date(iso + "T00:00:00");
66-  const isPastDay = isReservationDatePast(iso);
67-  const isBirthday = !!patientBirthdate && patientBirthdate.slice(5) === iso.slice(5);
68-  const birthdayAge = isBirthday && patientBirthdate ? dayDate.getFullYear() - parseInt(patientBirthdate.slice(0, 4), 10) : null;
69-  const isAdmissionDay = !!patientAdmissionDate && patientAdmissionDate === iso;
70-  const sorted = [...reservations].sort((a, b) => a.creneau.localeCompare(b.creneau));
71-  // Regroupe les réservations par créneau consécutif (sorted est déjà trié
72-  // par creneau) — un seul horaire affiché par groupe, centré verticalement
73-  // sur les noms (voir styles.slotTimeCol), et "Complet"/"X places
74-  // restantes" affiché une seule fois après le dernier nom du groupe plutôt
75-  // que répété par personne (même occupation de créneau pour tout le groupe).
76-  const groups: { creneau: string; rows: typeof sorted }[] = [];
77-  for (const r of sorted) {
78-    const g = groups[groups.length - 1];
79-    if (g && g.creneau === r.creneau) g.rows.push(r);
80-    else groups.push({ creneau: r.creneau, rows: [r] });
81-  }
82-
83-  return (
84-    <>
85-      <View style={styles.titleRow}>
86-        <Text style={[styles.sectionTitle, { color: C.gold, marginBottom: 0 }]}>Planning du jour</Text>
87:        {onToggleOtherIntervenants && (
88-          <TouchableOpacity
89:            onPress={onToggleOtherIntervenants}
90-            activeOpacity={0.75}
91-            style={[
92-              styles.otherToggle,
93-              {
94:                backgroundColor: showOtherIntervenants ? C.gold : "transparent",
95-                borderColor: C.gold,
96-              },
97-            ]}
98-          >
99:            <Text style={[styles.otherToggleText, { color: showOtherIntervenants ? "#fff" : C.gold }]}>
100:              👥 Autres intervenants
101-            </Text>
102-          </TouchableOpacity>
103-        )}
104-      </View>
105-      <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
106-        <Text style={[styles.dayTitle, { color: isToday ? C.gold : C.text }]}>
107-          {dayDate.toLocaleDateString("fr-FR", isAdmissionDay
108-            ? { weekday: "long", day: "numeric", month: "long", year: "numeric" }
109-            : { weekday: "long", day: "numeric", month: "long" })}
110-          {isAdmissionDay ? " - Jour d'hospitalisation" : ""}
111-          {isToday ? " · Aujourd'hui" : ""}
112-          {isBirthday ? ` · ${birthdayAge} ans de ${patientFirstname} !` : ""}
113-        </Text>
114-        {sorted.length === 0 ? (
115-          onEmptyPress ? (
--
134-                style={[styles.slotGroup, idx > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}
135-              >
136-                <View style={styles.slotTimeCol}>
137-                  <Text style={[styles.soinTime, { color: C.orange }]}>{group.creneau}</Text>
138-                </View>
139-                <View style={{ flex: 1 }}>
140-                  {group.rows.map((r) => {
141-                    const boldLabel = patientNameBySpaceId[r.space_id] ?? `${r.prenom} ${r.nom}`;
142-                    const plainName = `${r.prenom} ${r.nom}`;
143-                    return (
144-                      <TouchableOpacity key={r.id} style={styles.slotPersonRow} activeOpacity={0.7} onPress={() => onSoinPress(r)}>
145-                        <View style={{ flex: 1 }}>
146-                          <Text style={[styles.soinLabel, { color: C.text }]} numberOfLines={1}>
147-                            {boldLabel}
148-                          </Text>
149:                          {reservationType === "Intervention" && (
150-                            <Text style={[styles.soinBy, { color: C.muted }]} numberOfLines={1}>
151-                              {r.intervention_label ?? reservationType}{r.duration_minutes ? ` (${r.duration_minutes} min)` : ""}
152-                            </Text>
153-                          )}
154-                          {!!locationBySpaceId[r.space_id] && (
155-                            <Text style={[styles.soinBy, { color: C.muted }]} numberOfLines={1}>📍 {locationBySpaceId[r.space_id]}</Text>
156-                          )}
157-                          {/* Nom/prénom en clair uniquement s'il diffère du libellé en gras
158-                              ci-dessus (patient vs visiteur, mode Soins) — évite le doublon
159-                              du mode Visites, où les deux valeurs sont identiques. */}
160-                          {boldLabel !== plainName && (
161-                            <Text style={[styles.soinBy, { color: C.muted }]} numberOfLines={1}>{plainName}</Text>
162-                          )}
163-                          {!!companionsById?.[r.id]?.length && (
164-                            <Text style={[styles.soinBy, { color: C.muted }]} numberOfLines={1}>

```

### components/AdminSlotsList.tsx

Fichier partagé — liste de créneaux admin, contient la prise en compte des interventions.

```tsx
15-  iso, reservations, C, dayIsPast, capped, bookable = true, onAdd, onEdit, onAckAlert,
16-}: {
17-  iso: string;
18-  reservations: Reservation[];
19-  C: Theme;
20-  dayIsPast: boolean;
21-  capped: boolean;
22-  // Faux uniquement pour un jour antérieur à la date d'hospitalisation, vue
23-  // Hebdo du calendrier (E) — le jour reste consultable, seule l'ajout de
24-  // réservation est masqué (Modifier reste visible).
25-  bookable?: boolean;
26-  onAdd: (slot: string, maxAdditional: number) => void;
27-  onEdit: (r: Reservation) => void;
28-  onAckAlert: (rs: Reservation[]) => void;
29-}) {
30:  const { getConfigForDate, getSlotsForDate, intervenantProfiles } = useSpace();
31-  const slotConfig = getConfigForDate(iso);
32-  const allSlots = getSlotsForDate(iso);
33-  if (!slotConfig) return null;
34-
35-  // Mode "1 visite / jour" : même filtrage que app/(visitor)/home/slots.tsx —
36-  // une fois qu'un créneau "Visite" est réservé ce jour-là, les autres
37-  // disparaissent de la liste, y compris côté admin (avant, seul le visiteur
38-  // ne les voyait plus ; l'admin retombait sur le popup "Un seul créneau par
39-  // jour" en tentant d'ajouter une réservation sur un autre créneau).
40-  const dayVisitBooking = slotConfig.one_visit_per_day
41-    ? reservations.find((r) => r.type === "Visite" && r.date === iso && r.alert_type !== "day_cap_suspended")
42-    : undefined;
43-  const slots = dayVisitBooking ? allSlots.filter((s) => s === dayVisitBooking.creneau) : allSlots;
44-
45-  return (
46-    <>
47-      {slots.map((slot) => {
48-        const occ = getSlotOccupancy(reservations, iso, slot);
49-        const full = occ.length >= slotConfig.max_visitors_per_slot;
50:        const intervention = getInterventionOverlap(reservations, iso, slot, slotConfig.slot_duration_minutes);
51-        // Un créneau du jour même dont l'heure de début est déjà passée ne
52-        // peut plus être réservé (dayIsPast couvre les jours antérieurs).
53-        const slotPast = !dayIsPast && isSlotPast(iso, slot);
54-
55-        return (
56:          <View key={slot} style={[styles.slotCard, { backgroundColor: C.card, borderColor: intervention ? C.orange : full ? "rgba(233,69,96,0.3)" : C.border }]}>
57-            <View style={styles.slotHeader}>
58-              <Text style={[styles.slotTime, { color: C.gold }]}>{slot}</Text>
59-              <Text style={[styles.slotCount, { color: C.muted }]}>{occ.length}/{slotConfig.max_visitors_per_slot}</Text>
60:              {!full && !intervention && !dayIsPast && !slotPast && !capped && bookable && (
61-                <TouchableOpacity
62-                  style={[styles.addResaBtn, { backgroundColor: C.accent }]}
63-                  onPress={() => onAdd(slot, slotConfig.max_visitors_per_slot - occ.length)}
64-                >
65-                  <Text style={styles.addResaBtnText}>Réserver</Text>
66-                </TouchableOpacity>
67-              )}
68:              {intervention && <Text style={[styles.fullTag, { color: C.orange }]}>Bloqué</Text>}
69:              {!intervention && full && <Text style={[styles.fullTag, { color: C.danger }]}>Complet</Text>}
70:              {!intervention && !full && slotPast && <Text style={[styles.fullTag, { color: C.muted }]}>Terminé</Text>}
71:              {!intervention && !full && !slotPast && !dayIsPast && capped && <Text style={[styles.fullTag, { color: C.muted }]}>Limite atteinte</Text>}
72-            </View>
73-
74:            {intervention && (() => {
75:              const byMetier = metierLabel(intervenantProfiles.find((p) => p.id === intervention.intervenant_profile_id)?.metier);
76-              return (
77-                <View style={[styles.interventionBanner, { borderColor: C.orange, backgroundColor: "rgba(249,115,22,0.1)" }]}>
78-                  <Text style={[styles.interventionText, { color: C.text }]}>
79:                    🩺 {intervention.intervention_label} ({intervention.duration_minutes} min) - {intervention.prenom} {intervention.nom}{byMetier ? ` (${byMetier})` : ""} - Prioritaire sur les visites
80-                  </Text>
81-                </View>
82-              );
83-            })()}
84-
85-            {occ.length === 0
86-              ? <Text style={[styles.slotEmpty, { color: C.muted }]}>Aucun visiteur inscrit</Text>
87-              : occ.map((r) => (
88-                <View key={r.id} style={[styles.resaRow, { borderColor: C.border }]}>
89-                  <View style={{ flex: 1 }}>
90-                    <Text style={[styles.resaName, { color: C.success }]}>● {r.prenom} {r.nom}</Text>
91-                    {(r.booked_by_prenom || r.booked_by_nom) ? (
92-                      <Text style={[styles.bookedBy, { color: C.muted }]}>Programmé par : {r.booked_by_prenom} {r.booked_by_nom}</Text>
93-                    ) : null}
94-                    {r.telephone ? <Text style={[styles.resaTel, { color: C.muted }]}>{r.telephone}</Text> : null}

```

### components/VisitorsList.tsx

Fichier partagé — liste des visiteurs, contient une référence croisée au rôle intervenant.

```tsx
1-import { useState, useCallback, useEffect } from "react";
2-import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
3-import { supabase } from "@/lib/supabase";
4-import PatientAvatar from "@/components/PatientAvatar";
5-import VisitorProfileModal from "@/components/VisitorProfileModal";
6-import { relationLabel } from "@/lib/relations";
7-import type { Theme } from "@/lib/themes";
8-
9-// Corps de liste partagé entre VisitorsBlock (bloc repliable des Paramètres
10-// admin) et VisitorsListModal (bottom-sheet ouverte depuis le bouton
11-// "Visiteurs" de Mon compte, visiteur comme admin) — même principe que
12:// IntervenantsList.tsx / IntervenantsBlock.tsx pour les intervenants. Requête
13-// dupliquée depuis VisitorsBlock.tsx plutôt que factorisée, pour rester
14-// cohérent avec ce précédent (liste + bloc repliable ne partagent pas leur
15-// query non plus).
16-interface VisitorRow {
17-  prenom: string;
18-  nom: string;
19-  photoUrl: string | null;
20-  motto: string | null;
21-  relation: string | null;
22-}
23-
24-function visitorPhotoUrl(spaceId: string, filename: string) {
25-  const { data } = supabase.storage.from("visitor-photos").getPublicUrl(`${spaceId}/${filename}`);
26-  return data.publicUrl;
27-}
--
54-  // email) qu'à l'admin — un visiteur consultant la fiche d'un autre visiteur
55-  // ne doit pas voir ses coordonnées.
56-  isAdmin: boolean;
57-  // Utilisés uniquement pour exclure l'admin de la liste, voir VisitorsBlock.tsx.
58-  adminFirstname?: string | null;
59-  adminLastname?: string | null;
60-}
61-
62-export default function VisitorsList({ spaceId, C, isAdmin, adminFirstname, adminLastname }: Props) {
63-  const [loading, setLoading] = useState(true);
64-  const [visitors, setVisitors] = useState<VisitorRow[]>([]);
65-  const [profileTarget, setProfileTarget] = useState<{ prenom: string; nom: string } | null>(null);
66-
67-  const load = useCallback(async () => {
68-    setLoading(true);
69:    const [resv, resvGuestOf, news, tasksAuthor, tasksClaimed, tasksReturnClaimed, souv, msgs, profiles, intervenants] = await Promise.all([
70-      supabase.from("reservations").select("prenom,nom").eq("space_id", spaceId),
71-      supabase.from("reservations").select("booked_by_prenom,booked_by_nom").eq("space_id", spaceId),
72-      supabase.from("news_entries").select("author_prenom,author_nom").eq("space_id", spaceId),
73-      supabase.from("tasks").select("author_prenom,author_nom").eq("space_id", spaceId),
74-      supabase.from("tasks").select("claimed_by_prenom,claimed_by_nom").eq("space_id", spaceId),
75-      supabase.from("tasks").select("transport_return_claimed_by_prenom,transport_return_claimed_by_nom").eq("space_id", spaceId),
76-      supabase.from("souvenirs").select("uploaded_by_prenom,uploaded_by_nom").eq("space_id", spaceId),
77-      supabase.from("support_messages").select("author_prenom,author_nom").eq("space_id", spaceId),
78-      fetchVisitorProfiles(spaceId),
79:      supabase.from("intervenant_profiles").select("prenom,nom").eq("space_id", spaceId),
80-    ]);
81-
82-    if (profiles.error) console.error("[VisitorsList] visitor_profiles select failed:", profiles.error);
83:    if (intervenants.error) console.error("[VisitorsList] intervenant_profiles select failed:", intervenants.error);
84-
85:    // Ce bloc ne doit lister que les visiteurs : ni les intervenants (qui
86-    // laissent eux aussi des traces — réservations, tâches...), ni l'admin
87-    // lui-même.
88:    const excludedKeys = new Set((intervenants.data || []).map((i) => identityKey(i.prenom, i.nom)));
89-    if (adminFirstname && adminLastname) excludedKeys.add(identityKey(adminFirstname, adminLastname));
90-
91-    const byKey = new Map<string, VisitorRow>();
92-    function add(prenom?: string | null, nom?: string | null) {
93-      if (!prenom?.trim() || !nom?.trim()) return;
94-      const key = identityKey(prenom, nom);
95-      if (excludedKeys.has(key)) return;
96-      if (!byKey.has(key)) byKey.set(key, { prenom: prenom.trim(), nom: nom.trim(), photoUrl: null, motto: null, relation: null });
97-    }
98-    (resv.data || []).forEach((r) => add(r.prenom, r.nom));
99-    (resvGuestOf.data || []).forEach((r) => add(r.booked_by_prenom, r.booked_by_nom));
100-    (news.data || []).forEach((n) => add(n.author_prenom, n.author_nom));
101-    (tasksAuthor.data || []).forEach((t) => add(t.author_prenom, t.author_nom));
102-    (tasksClaimed.data || []).forEach((t) => add(t.claimed_by_prenom, t.claimed_by_nom));
103-    (tasksReturnClaimed.data || []).forEach((t) => add(t.transport_return_claimed_by_prenom, t.transport_return_claimed_by_nom));
--
165-          visible={!!profileTarget}
166-          onClose={() => setProfileTarget(null)}
167-          spaceId={spaceId}
168-          C={C}
169-          isAdmin={isAdmin}
170-          prenom={profileTarget.prenom}
171-          nom={profileTarget.nom}
172-        />
173-      )}
174-    </>
175-  );
176-}
177-
178-const styles = StyleSheet.create({
179-  // maxHeight explicite sur le ScrollView lui-même — voir le commentaire
180:  // équivalent dans IntervenantsList.tsx (Yoga ne résout pas flex:1 sans
181-  // hauteur définie côté parent, la liste resterait invisible sinon).
182-  scrollView: { maxHeight: 400 },
183-  scroll: { paddingBottom: 24 },
184-  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center", marginVertical: 16 },
185-  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
186-  name: { fontFamily: "DM_Sans_600SemiBold", fontSize: 15 },
187-  relation: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 1 },
188-  motto: { fontFamily: "Caveat_600SemiBold", fontSize: 16, color: "#7EC8E3", marginTop: 1 },
189-  chevron: { fontFamily: "DM_Sans_700Bold", fontSize: 16 },
190-});

```

### components/VisitorsBlock.tsx

Fichier partagé — bloc visiteurs, contient une référence croisée au rôle intervenant.

```tsx
41-  // apparaître dans le bloc Visiteurs.
42-  adminFirstname?: string | null;
43-  adminLastname?: string | null;
44-}
45-
46-export default function VisitorsBlock({ spaceId, C, adminFirstname, adminLastname }: Props) {
47-  const [loading, setLoading] = useState(true);
48-  const [visitors, setVisitors] = useState<VisitorRow[]>([]);
49-  const [profileTarget, setProfileTarget] = useState<{ prenom: string; nom: string } | null>(null);
50-  // Replié par défaut, comme les sous-rubriques de l'Historique juste en
51-  // dessous — s'ouvre vers le bas en cliquant sur le bloc (titre ou texte).
52-  const [expanded, setExpanded] = useState(false);
53-
54-  const load = useCallback(async () => {
55-    setLoading(true);
56:    const [resv, resvGuestOf, news, tasksAuthor, tasksClaimed, tasksReturnClaimed, souv, msgs, profiles, intervenants] = await Promise.all([
57-      supabase.from("reservations").select("prenom,nom").eq("space_id", spaceId),
58-      supabase.from("reservations").select("booked_by_prenom,booked_by_nom").eq("space_id", spaceId),
59-      supabase.from("news_entries").select("author_prenom,author_nom").eq("space_id", spaceId),
60-      supabase.from("tasks").select("author_prenom,author_nom").eq("space_id", spaceId),
61-      supabase.from("tasks").select("claimed_by_prenom,claimed_by_nom").eq("space_id", spaceId),
62-      supabase.from("tasks").select("transport_return_claimed_by_prenom,transport_return_claimed_by_nom").eq("space_id", spaceId),
63-      supabase.from("souvenirs").select("uploaded_by_prenom,uploaded_by_nom").eq("space_id", spaceId),
64-      supabase.from("support_messages").select("author_prenom,author_nom").eq("space_id", spaceId),
65-      supabase.from("visitor_profiles").select("prenom,nom,photo,motto").eq("space_id", spaceId),
66:      supabase.from("intervenant_profiles").select("prenom,nom").eq("space_id", spaceId),
67-    ]);
68-
69-    if (profiles.error) console.error("[VisitorsBlock] visitor_profiles select failed:", profiles.error);
70:    if (intervenants.error) console.error("[VisitorsBlock] intervenant_profiles select failed:", intervenants.error);
71-
72:    // Ce bloc ne doit lister que les visiteurs : ni les intervenants (qui
73-    // laissent eux aussi des traces — réservations, tâches...), ni l'admin
74-    // lui-même (qui a son propre suivi côté "Mon Compte").
75:    const excludedKeys = new Set((intervenants.data || []).map((i) => identityKey(i.prenom, i.nom)));
76-    if (adminFirstname && adminLastname) excludedKeys.add(identityKey(adminFirstname, adminLastname));
77-
78-    const byKey = new Map<string, VisitorRow>();
79-    function add(prenom?: string | null, nom?: string | null) {
80-      if (!prenom?.trim() || !nom?.trim()) return;
81-      const key = identityKey(prenom, nom);
82-      if (excludedKeys.has(key)) return;
83-      if (!byKey.has(key)) byKey.set(key, { prenom: prenom.trim(), nom: nom.trim(), photoUrl: null, motto: null });
84-    }
85-    (resv.data || []).forEach((r) => add(r.prenom, r.nom));
86-    (resvGuestOf.data || []).forEach((r) => add(r.booked_by_prenom, r.booked_by_nom));
87-    (news.data || []).forEach((n) => add(n.author_prenom, n.author_nom));
88-    (tasksAuthor.data || []).forEach((t) => add(t.author_prenom, t.author_nom));
89-    (tasksClaimed.data || []).forEach((t) => add(t.claimed_by_prenom, t.claimed_by_nom));
90-    (tasksReturnClaimed.data || []).forEach((t) => add(t.transport_return_claimed_by_prenom, t.transport_return_claimed_by_nom));

```

### components/Entraide.tsx

Fichier partagé — écran entraide, contient une référence au rôle intervenant dans les permissions/affichage.

```tsx
695-    setFTHomeAddress("");
696-    setFTSwapped(false);
697-    setFTHomePostalCode(""); setFTHomeCity(""); setFTHomeCountry("");
698-    setFTForSomeoneElse(false); setFTForPrenom(""); setFTForNom("");
699-    setFTCalMonth(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
700-    setFDateLimite(""); setFDLPickerOpen(false); setFUrgent(false);
701-    setFDLCalMonth(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
702-    setFCourseItems([]); setFCourseItemDraft("");
703-    setFRelaisStartDate(""); setFRelaisVisibleTo("all"); setFRelaisSelectedKeys(new Set());
704-    autoRelaisMsgRef.current = "";
705-    setTaskForm(true);
706-  }
707-
708-  // Candidats pour le ciblage "Certains proches seulement" d'un besoin de
709-  // relais — même requête que NightVisitorModal.load() (reservations +
710:  // visitor_profiles, intervenants exclus), mais sans table "autorized"
711-  // dédiée : la sélection va directement dans relais_recipients au submit,
712-  // le ciblage se choisit à chaque besoin plutôt que comme réglage d'espace.
713-  async function loadRelaisCandidates() {
714-    setFRelaisCandidatesLoading(true);
715:    const [resv, profiles, intervenants] = await Promise.all([
716-      supabase.from("reservations").select("prenom,nom").eq("space_id", spaceId),
717-      supabase.from("visitor_profiles").select("prenom,nom").eq("space_id", spaceId),
718:      supabase.from("intervenant_profiles").select("prenom,nom").eq("space_id", spaceId),
719-    ]);
720:    const intervenantKeys = new Set((intervenants.data || []).map((i) => relaisIdentityKey(i.prenom, i.nom)));
721-    const byKey = new Map<string, { prenom: string; nom: string }>();
722-    function add(prenom?: string | null, nom?: string | null) {
723-      if (!prenom?.trim() || !nom?.trim()) return;
724-      const key = relaisIdentityKey(prenom, nom);
725:      if (intervenantKeys.has(key)) return;
726-      if (!byKey.has(key)) byKey.set(key, { prenom: prenom.trim(), nom: nom.trim() });
727-    }
728-    (resv.data || []).forEach((r) => add(r.prenom, r.nom));
729-    (profiles.data || []).forEach((p) => add(p.prenom, p.nom));
730-    setFRelaisCandidates(
731-      Array.from(byKey.values()).sort((a, b) => a.nom.localeCompare(b.nom, "fr") || a.prenom.localeCompare(b.prenom, "fr")),
732-    );
733-    setFRelaisCandidatesLoading(false);
734-  }
735-
736-  // Point d'entrée "Mon compte" (?openRelais=1, voir l'effet plus bas) :
737-  // ouvre directement le formulaire Publier sur la catégorie "relais" (non
738-  // sélectionnable à la main), avec le message pré-rempli et la liste de
739-  // destinataires potentiels chargée.
740-  async function openRelaisForm() {

```

### components/WeekStrip.tsx

Fichier partagé — bandeau semaine, contient l'affichage des interventions sur la frise.

```tsx
1-import { useEffect } from "react";
2-import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
3-import type { Theme } from "@/lib/themes";
4-import { LOGO_GREEN, LOGO_PURPLE, LOGO_NAVY, VISITES_ORANGE_FILL, VISITES_DANGER_FILL } from "@/lib/themes";
5-import { DayStripes } from "@/components/DayEdgeStripes";
6-import type { Reservation, SlotConfig } from "@/lib/types";
7-import { addDays, getWeekDates, toISO, getDayStatus, isMyReservation, visiteurIdentityKey } from "@/lib/slotUtils";
8-
9-// Bande de 7 jours pour la vue Hebdo du calendrier principal (visiteur/admin/
10:// intervenant) — même code visuel que la grille mensuelle (pastille de statut
11-// + cadre violet + bande verte) et que WeeklyPlanningGrid (planning des
12:// intervenants), mais commune aux 3 rôles et enrichie des marqueurs
13-// hospitalisation/sortie (F/G) et du grisage des jours antérieurs à la date
14-// d'hospitalisation (E). Un tap sur une case navigue vers l'écran dédié des
15-// créneaux (onDayPress), exactement comme la grille Mensuel — aucun détail de
16-// jour affiché inline ici.
17-const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];
18-
19-interface Props {
20-  C: Theme;
21-  slotConfig: SlotConfig;
22-  // Déjà filtrée par le parent selon "Afficher mes créneaux" (rôle
23:  // intervenant, home/calendar.tsx) : ne contient les réservations
24:  // "Intervention" d'un AUTRE intervenant que si ce mode est désactivé — la
25-  // bande n'a donc pas à connaître ce réglage elle-même.
26-  reservations: Reservation[];
27-  getSlotsForDate: (iso: string) => string[];
28-  getConfigForDate: (iso: string) => SlotConfig | null;
29-  startDate: Date;
30-  weekAnchor: Date;
31-  onWeekChange: (anchor: Date) => void;
32-  selectedIso: string;
33-  // Housekeeping interne uniquement (recalage du jour sélectionné après un
34-  // changement de semaine ‹ › via le useEffect ci-dessous) — jamais déclenché
35-  // par un tap utilisateur, voir onDayPress pour ça.
36-  onSelectDay: (iso: string) => void;
37-  // Tap explicite sur une case du jour. Mode Soins : navigue vers l'écran
38-  // dédié des créneaux (home/slots.tsx), exactement comme la grille Mensuel.
39-  // Mode Visites : sélectionne seulement le jour (voir onDayLongPress pour la
40-  // navigation, home/calendar.tsx).
41-  onDayPress: (iso: string) => void;
42-  // Appui prolongé — mode Visites uniquement (sans effet en mode Soins) :
43-  // reprend l'ancien comportement de tap, navigue vers l'écran des créneaux
44-  // pour ce jour. Voir home/calendar.tsx.
45-  onDayLongPress?: (iso: string) => void;
46-  soinsMode: boolean;
47:  // "Afficher mes créneaux" (home/calendar.tsx) — pour un intervenant,
48-  // filtre aussi les cadres violets de la bande elle-même (pas seulement le
49-  // panneau perso sous le calendrier) : voir frameVisible plus bas.
50-  mesCreneauxOnly: boolean;
51:  role: "visiteur" | "intervenant" | null;
52:  intervenantProfileId: string | null;
53-  // PIN de la session courante — restreint la bande verte (familyBooked) aux
54-  // seules réservations de la personne qui regarde, jamais celles d'un autre
55-  // membre de la famille ou prises par l'admin en son nom. Prénom/nom
56-  // désambiguïsent deux visiteurs ayant choisi le même PIN — voir
57-  // isMyReservation (lib/slotUtils.ts).
58-  myPin: string | null;
59-  myPrenom?: string | null;
60-  myNom?: string | null;
61-  // Marqueurs hospitalisation (F) / sortie (G) et seuil de grisage (E) — au
62-  // format "YYYY-MM-DD" comme PatientSpace.patient_admission_date, ou null si
63-  // non renseigné côté fiche patient.
64-  admissionIso: string | null;
65-  dischargeIso: string | null;
66-  // Active le rendu "riche" du mode Visites (fond Orange/Rouge, traits de
67-  // bord par visiteur, légende Partiel/Complet) — utilisé par le calendrier
--
70-  // calendrier admin ((admin)/home/calendar.tsx), qui n'a pas la notion de
71-  // visiteur sélectionné/coloré. Toujours ignoré en mode Soins.
72-  richVisitesMode?: boolean;
73-  // Couleur par visiteur (clé = visiteurIdentityKey), dans l'ordre de la
74-  // légende — voir home/calendar.tsx. Ignoré si richVisitesMode est absent.
75-  visiteurColorByKey?: Record<string, string>;
76-  // Filtre légende (1 visiteur ou "Tous" = null) — filtre les traits de bord
77-  // (DayStripes) de la bande, jamais le fond Partiel/Complet (vérité globale
78-  // d'occupation, voir home/calendar.tsx). Ignoré si richVisitesMode est absent.
79-  selectedVisiteurKey?: string | null;
80-}
81-
82-export default function WeekStrip({
83-  C, slotConfig, reservations, getSlotsForDate, getConfigForDate, startDate,
84-  weekAnchor, onWeekChange, selectedIso, onSelectDay, onDayPress, onDayLongPress, soinsMode, mesCreneauxOnly, role,
85:  intervenantProfileId, myPin, myPrenom, myNom, admissionIso, dischargeIso,
86-  richVisitesMode = false, visiteurColorByKey = {}, selectedVisiteurKey = null,
87-}: Props) {
88-  // Mode Visites "riche" (nouveaux traits de bord/fond coloré) uniquement si
89-  // explicitement demandé par le parent ET qu'on n'est pas en mode Soins —
90-  // voir richVisitesMode ci-dessus.
91-  const rich = !soinsMode && richVisitesMode;
92-  const weekDates = getWeekDates(weekAnchor);
93-  const first = weekDates[0];
94-  const last = weekDates[6];
95-  const weekLabel =
96-    first.getMonth() === last.getMonth()
97-      ? `Semaine du ${first.getDate()} au ${last.getDate()} ${last.toLocaleDateString("fr-FR", { month: "long" })}`
98-      : `Semaine du ${first.getDate()} ${first.toLocaleDateString("fr-FR", { month: "long" })} au ${last.getDate()} ${last.toLocaleDateString("fr-FR", { month: "long" })}`;
99-
100-  const today = new Date();
--
122-        </TouchableOpacity>
123-        <Text style={[styles.weekLabel, { color: C.text }]}>{weekLabel}</Text>
124-        <TouchableOpacity onPress={() => onWeekChange(addDays(weekAnchor, 7))} style={[styles.navBtn, { borderColor: C.border }]}>
125-          <Text style={[styles.navBtnText, { color: C.text }]}>›</Text>
126-        </TouchableOpacity>
127-      </View>
128-
129-      <View style={styles.strip}>
130-        {weekDates.map((day) => {
131-          const iso = toISO(day);
132-          const config = getConfigForDate(iso) ?? slotConfig;
133-          const daySlots = getSlotsForDate(iso);
134-          // `status` sert au blocage/navigation via onDayPress → suit le
135-          // type du mode actif. La pastille, elle, ne représente plus jamais
136-          // que les visites — voir visiteStatus.
137:          const status = getDayStatus(reservations, iso, day, config, daySlots, startDate, soinsMode ? "Intervention" : "Visite");
138-          const visiteStatus = getDayStatus(reservations, iso, day, config, daySlots, startDate, "Visite");
139-          const dotColor = soinsMode ? "transparent" :
140-            visiteStatus === "full" ? C.danger : visiteStatus === "partial" ? C.orange : visiteStatus === "empty" ? C.success : "transparent";
141-          // Bande verte strictement personnelle (visite/nuitée réservée par
142:          // MOI, ou soin réservé par MOI si je suis intervenant) — jamais les
143:          // réservations d'un autre visiteur/intervenant, ni de l'admin (role
144-          // === null, sans PIN ni fiche : ne matche jamais isMyReservation).
145-          // Toujours visible, quel que soit le mode ou "Afficher mes
146-          // créneaux".
147:          const familyBooked = reservations.some((r) => r.date === iso && isMyReservation(r, myPin, intervenantProfileId, myPrenom, myNom));
148:          const myInterventionToday = role === "intervenant" && !!intervenantProfileId &&
149:            reservations.some((r) => r.date === iso && r.type === "Intervention" && r.intervenant_profile_id === intervenantProfileId);
150:          const interventionBooked = reservations.some((r) => r.date === iso && r.type === "Intervention");
151-          // Cadre violet : même règle que la grille Mensuel (home/calendar.tsx)
152:          // — vérité complète en mode Soins, sauf pour un intervenant avec
153-          // "Afficher mes créneaux" actif (filtré à ses seuls cadres, y
154-          // compris en mode Visites où aucun cadre n'apparaît sinon).
155-          const frameVisible = soinsMode
156:            ? (role === "intervenant" && mesCreneauxOnly ? myInterventionToday : interventionBooked)
157:            : (role === "intervenant" && mesCreneauxOnly && myInterventionToday);
158-          const fillPurple = frameVisible && myInterventionToday;
159-          const isSelected = iso === selectedIso;
160-          const isToday = iso === todayIso;
161-          // Grisage (E) : uniquement les jours strictement avant la date
162-          // d'hospitalisation — un jour passé mais postérieur à celle-ci
163-          // reste affiché normalement (juste non réservable, géré par le
164-          // parent via la prop `bookable` des listes de créneaux).
165-          const beforeAdmission = !!admissionIso && iso < admissionIso;
166-
167-          // Mode Visites : le fond pastel de case remplace la pastille de
168-          // statut (vérité globale, non filtrée par selectedVisiteurKey —
169-          // voir home/calendar.tsx) ; les traits de bord par visiteur
170-          // remplacent la bande verte unique "Mes créneaux" (réservée au
171-          // mode Soins). Le point vert "Dispo" reste affiché (voir plus bas)
172-          // pour les jours sans aucune visite.
--
259-              <Text style={[styles.stripLegendLabel, { color: C.muted }]}>Partiel</Text>
260-            </View>
261-            <View style={styles.legendItem}>
262-              <View style={[styles.legendStripeSwatch, { borderColor: C.border, backgroundColor: VISITES_DANGER_FILL }]} />
263-              <Text style={[styles.stripLegendLabel, { color: C.muted }]}>Complet</Text>
264-            </View>
265-          </>
266-        ) : (
267-          <>
268-            <View style={styles.legendItem}>
269-              <View style={[styles.legendStripeSwatch, { borderColor: C.border, backgroundColor: LOGO_GREEN }]} />
270-              <Text style={[styles.stripLegendLabel, { color: C.muted }]}>Mes créneaux</Text>
271-            </View>
272-            <View style={styles.legendItem}>
273-              <View style={[styles.stripLegendFrame, { borderColor: LOGO_PURPLE }]} />
274:              <Text style={[styles.stripLegendLabel, { color: C.muted }]}>{soinsMode ? "Soin" : "Intervenant"}</Text>
275-            </View>
276-          </>
277-        )}
278-      </View>
279-    </View>
280-  );
281-}
282-
283-const styles = StyleSheet.create({
284-  weekNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
285-  navBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 14 },
286-  navBtnText: { fontSize: 18, fontWeight: "600" },
287-  weekLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13, textTransform: "capitalize", flex: 1, textAlign: "center" },
288-
289-  strip: { flexDirection: "row", justifyContent: "space-between", gap: 4, marginBottom: 8 },
--
295-  // top/bottom: 0 des traits.
296-  stripCellOuter: { flex: 1, position: "relative" },
297-  stripCell: { flex: 1, borderRadius: 10, borderWidth: 1, position: "relative", overflow: "hidden" },
298-  stripCellInner: { paddingTop: 8, paddingBottom: 14, alignItems: "center", justifyContent: "center", gap: 3 },
299-  stripDow: { fontFamily: "DM_Sans_600SemiBold", fontSize: 10, textTransform: "uppercase" },
300-  stripDate: { fontFamily: "DM_Sans_700Bold", fontSize: 15 },
301-  stripDot: { width: 5, height: 5, borderRadius: 2.5 },
302-  visitStripe: { position: "absolute", left: 0, right: 0, bottom: 0, height: 8, borderBottomLeftRadius: 9, borderBottomRightRadius: 9 },
303-
304-  // Jour hospitalisation/sortie : pictogramme plein cadre, centré, remplace
305-  // jour de semaine + numéro (voir cellSpecialIcon dans home/calendar.tsx,
306-  // même principe).
307-  stripCellSpecialIcon: { fontSize: 22, lineHeight: 26 },
308-
309-  // Ecart plus large qu'avant pour bien séparer "Mes créneaux" de
310:  // "Intervenant"/"Soin" — mêmes valeurs que la légende de la vue Mensuel.
311-  stripLegend: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 40, marginBottom: 4 },
312-  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
313-  legendStripeSwatch: { width: 12, height: 12, borderRadius: 4, borderWidth: 1 },
314-  stripLegendFrame: { width: 12, height: 12, borderRadius: 4, borderWidth: 2 },
315-  stripLegendLabel: { fontFamily: "DM_Sans_400Regular", fontSize: 11 },
316-});

```

### lib/SpaceContext.tsx

Fichier partagé — contexte espace admin, contient les champs et fonctions liés aux intervenants de l'espace.

```tsx
1-import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from "react";
2-import { supabase } from "./supabase";
3-import { generateSlots, resolveConfigForDate, toISO } from "./slotUtils";
4:import type { PatientSpace, SlotConfig, SlotConfigHistoryEntry, Reservation, IntervenantProfile } from "./types";
5-
6-interface SpaceContextValue {
7-  space: PatientSpace | null;
8-  slotConfig: SlotConfig | null;
9-  slots: string[];
10-  reservations: Reservation[];
11:  // Fiches de tous les intervenants de l'espace — sert à afficher le métier
12:  // de l'intervenant dans les blocs d'intervention (voir AdminSlotsList.tsx).
13:  intervenantProfiles: IntervenantProfile[];
14-  loading: boolean;
15-  hasSpace: boolean;
16-  selectedDay: Date;
17-  setSelectedDay: (day: Date) => void;
18-  // Same pattern as VisitorContext — "Prochaine disponibilité → Réserver"
19-  // sets this so the Créneaux screen auto-opens the add-reservation modal.
20-  pendingBookingSlot: string | null;
21-  setPendingBookingSlot: (slot: string | null) => void;
22-  refreshReservations: () => Promise<void>;
23-  refreshSpace: () => Promise<void>;
24-  refreshSlotConfig: () => Promise<void>;
25-  // Met à jour le space en mémoire sans refetch ni toucher `loading` — pour
26-  // refléter un update qu'on vient de faire soi-même sans attendre le tick
27-  // realtime (qui peut arriver après le prochain render et donner l'impression
28-  // que le changement "ne tient pas").
--
31-  // aujourd'hui/le futur, renvoie la config live (référence identique,
32-  // aucun lookup) ; pour un jour déjà passé, résout via slot_config_history
33-  // pour garder l'affichage tel qu'il était au moment du changement de règles
34-  // (voir apply_slot_rule_change). Fallback sur la config live si l'historique
35-  // n'a pas encore chargé ou ne couvre pas la date (ne devrait pas arriver
36-  // une fois le backfill de la migration passé).
37-  getConfigForDate: (iso: string) => SlotConfig | null;
38-  getSlotsForDate: (iso: string) => string[];
39-}
40-
41-const SpaceContext = createContext<SpaceContextValue>({
42-  space: null,
43-  slotConfig: null,
44-  slots: [],
45-  reservations: [],
46:  intervenantProfiles: [],
47-  loading: true,
48-  hasSpace: false,
49-  selectedDay: new Date(),
50-  setSelectedDay: () => {},
51-  pendingBookingSlot: null,
52-  setPendingBookingSlot: () => {},
53-  refreshReservations: async () => {},
54-  refreshSpace: async () => {},
55-  refreshSlotConfig: async () => {},
56-  patchSpace: () => {},
57-  getConfigForDate: () => null,
58-  getSlotsForDate: () => [],
59-});
60-
61-export function useSpace() {
62-  return useContext(SpaceContext);
63-}
64-
65-export function AdminSpaceProvider({ adminId, children }: { adminId: string; children: ReactNode }) {
66-  const [space, setSpace] = useState<PatientSpace | null>(null);
67-  const [slotConfig, setSlotConfig] = useState<SlotConfig | null>(null);
68-  const [slots, setSlots] = useState<string[]>([]);
69-  const [configHistory, setConfigHistory] = useState<SlotConfigHistoryEntry[]>([]);
70-  const [reservations, setReservations] = useState<Reservation[]>([]);
71:  const [intervenantProfiles, setIntervenantProfiles] = useState<IntervenantProfile[]>([]);
72-  const [loading, setLoading] = useState(true);
73-  // Cache des grilles de créneaux calculées pour des jours passés — évite de
74-  // relancer generateSlots() à chaque render pour le même historique/date.
75-  const pastSlotsCache = useRef<Map<string, string[]>>(new Map());
76-  const [selectedDay, setSelectedDay] = useState<Date>(() => {
77-    const d = new Date();
78-    d.setHours(0, 0, 0, 0);
79-    return d;
80-  });
81-  const [pendingBookingSlot, setPendingBookingSlot] = useState<string | null>(null);
82-
83-  const fetchSpace = useCallback(async () => {
84-    const { data: spaceData } = await supabase
85-      .from("patient_spaces")
86-      .select("*")
--
168-      .eq("space_id", space.id)
169-      .order("valid_from", { ascending: true });
170-    pastSlotsCache.current.clear();
171-    setConfigHistory(historyData || []);
172-  }, [space?.id]); // eslint-disable-line react-hooks/exhaustive-deps
173-
174-  const patchSpace = useCallback((patch: Partial<PatientSpace>) => {
175-    setSpace((prev) => (prev ? { ...prev, ...patch } : prev));
176-  }, []);
177-
178-  const getConfigForDate = useCallback(
179-    (iso: string): SlotConfig | null => {
180-      if (!slotConfig) return null;
181-      if (iso >= toISO(new Date())) return slotConfig;
182-      const entry = resolveConfigForDate(configHistory, iso);
183:      // slot_config_history ne trace pas intervenant_priority_mode ni
184:      // night_intervenant_mode/night_visitor_mode/news_intervenant_mode (pas
185-      // de pertinence rétroactive, purement affichage) — on retombe sur la
186-      // valeur live pour compléter le type.
187-      return entry
188-        ? {
189-            ...entry,
190:            intervenant_priority_mode: slotConfig?.intervenant_priority_mode ?? "all",
191:            night_intervenant_mode: slotConfig?.night_intervenant_mode ?? "disabled",
192-            night_visitor_mode: slotConfig?.night_visitor_mode ?? "all",
193:            news_intervenant_mode: slotConfig?.news_intervenant_mode ?? "disabled",
194-          }
195-        : slotConfig;
196-    },
197-    [slotConfig, configHistory],
198-  );
199-
200-  const getSlotsForDate = useCallback(
201-    (iso: string): string[] => {
202-      if (iso >= toISO(new Date())) return slots;
203-      const cached = pastSlotsCache.current.get(iso);
204-      if (cached) return cached;
205-      const config = getConfigForDate(iso);
206-      const generated = config ? generateSlots(config) : [];
207-      pastSlotsCache.current.set(iso, generated);
208-      return generated;
209-    },
210-    [slots, getConfigForDate],
211-  );
212-
213-  const refreshReservations = useCallback(async () => {
214-    if (!space) return;
215-    const { data } = await supabase
216-      .from("reservations")
217-      .select("*")
218-      .eq("space_id", space.id);
219-    setReservations(data || []);
220-  }, [space]);
221-
222:  const refreshIntervenantProfiles = useCallback(async () => {
223-    if (!space) return;
224-    const { data } = await supabase
225:      .from("intervenant_profiles")
226-      .select("*")
227-      .eq("space_id", space.id);
228:    setIntervenantProfiles(data || []);
229-  }, [space]);
230-
231-  useEffect(() => {
232-    if (!space) return;
233-
234-    refreshReservations();
235:    refreshIntervenantProfiles();
236-
237-    // Reservations realtime
238-    const ch1 = supabase
239-      .channel(`reservations:${space.id}`)
240-      .on(
241-        "postgres_changes",
242-        { event: "*", schema: "public", table: "reservations", filter: `space_id=eq.${space.id}` },
243-        refreshReservations,
244-      )
245-      .subscribe();
246-
247-    // Space realtime — reflect any field change immediately (re-fetch to get
248-    // the full row; payload.new only includes changed columns without REPLICA
249-    // IDENTITY FULL, so direct assignment would drop unmodified fields).
250-    const ch2 = supabase
--
265-        { event: "UPDATE", schema: "public", table: "slot_config", filter: `space_id=eq.${spaceId}` },
266-        async () => {
267-          const { data } = await supabase.from("slot_config").select("*").eq("space_id", spaceId).single();
268-          if (data) { setSlotConfig(data); setSlots(generateSlots(data)); }
269-          const { data: historyData } = await supabase
270-            .from("slot_config_history")
271-            .select("*")
272-            .eq("space_id", spaceId)
273-            .order("valid_from", { ascending: true });
274-          pastSlotsCache.current.clear();
275-          setConfigHistory(historyData || []);
276-        },
277-      )
278-      .subscribe();
279-
280:    // intervenant_profiles realtime — reflète le métier immédiatement si
281:    // modifié depuis la fiche ou si un nouveau intervenant rejoint l'espace.
282-    const ch4 = supabase
283:      .channel(`space-admin-intervenant-profiles:${space.id}`)
284-      .on(
285-        "postgres_changes",
286:        { event: "*", schema: "public", table: "intervenant_profiles", filter: `space_id=eq.${space.id}` },
287:        refreshIntervenantProfiles,
288-      )
289-      .subscribe();
290-
291-    return () => {
292-      supabase.removeChannel(ch1);
293-      supabase.removeChannel(ch2);
294-      supabase.removeChannel(ch3);
295-      supabase.removeChannel(ch4);
296-    };
297:  }, [space?.id, refreshReservations, refreshIntervenantProfiles]);
298-
299-  // Mémoïsé : sans ça, ce littéral d'objet est recréé à chaque render du
300-  // provider (donc à chaque changement de N'IMPORTE laquelle de ses ~10
301-  // pièces d'état, y compris selectedDay ou pendingBookingSlot) et casse la
302-  // référence de value à chaque fois, ce qui force TOUS les consommateurs de
303-  // useSpace() dans l'app (dont les grilles de calendrier, coûteuses) à
304-  // re-render même quand rien qui les concerne n'a changé.
305-  const value = useMemo<SpaceContextValue>(
306:    () => ({ space, slotConfig, slots, reservations, intervenantProfiles, loading, hasSpace: !!space, selectedDay, setSelectedDay, pendingBookingSlot, setPendingBookingSlot, refreshReservations, refreshSpace, refreshSlotConfig, patchSpace, getConfigForDate, getSlotsForDate }),
307:    [space, slotConfig, slots, reservations, intervenantProfiles, loading, selectedDay, pendingBookingSlot, refreshReservations, refreshSpace, refreshSlotConfig, patchSpace, getConfigForDate, getSlotsForDate],
308-  );
309-
310-  return (
311-    <SpaceContext.Provider value={value}>
312-      {children}
313-    </SpaceContext.Provider>
314-  );
315-}

```

### lib/VisitorContext.tsx

Fichier partagé — contexte espace visiteur/intervenant, contient la logique de chargement des données intervenant.

```tsx
1-import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from "react";
2-import { supabase } from "./supabase";
3-import { generateSlots, resolveConfigForDate, toISO } from "./slotUtils";
4:import type { PatientSpace, SlotConfig, SlotConfigHistoryEntry, Reservation, IntervenantProfile } from "./types";
5-
6-interface VisitorContextValue {
7-  space: PatientSpace | null;
8-  slotConfig: SlotConfig | null;
9-  slots: string[];
10-  reservations: Reservation[];
11:  // Fiches de tous les intervenants de l'espace (pas seulement la session
12:  // courante) — sert à afficher le métier de l'intervenant qui a réservé un
13-  // soin dans VisitorSlotsList, même quand ce n'est pas "le mien".
14:  intervenantProfiles: IntervenantProfile[];
15-  loading: boolean;
16-  token: string;
17-  selectedDay: Date;
18-  setSelectedDay: (day: Date) => void;
19-  // Set by "Prochaine disponibilité" 's "Réserver" button (Calendrier) so the
20-  // Créneaux screen can auto-open the booking modal on mount, pre-targeted —
21-  // shared via context rather than a route param, since query params don't
22-  // reliably survive navigation through the Tabs > home Stack nesting.
23-  pendingBookingSlot: string | null;
24-  setPendingBookingSlot: (slot: string | null) => void;
25-  // Set par RebookingAlertModal (recasage/annulation suite à un changement de
26-  // règles admin) pour que l'écran Créneaux ou Nuitées rouvre directement la
27-  // modale PIN/modification sur la réservation visée — même mécanisme que
28-  // pendingBookingSlot, pour la même raison. Volontairement PAS utilisé par
29-  // "Mon compte" > "Mes réservations" : là, le clic doit seulement naviguer,
30-  // jamais ouvrir de modale automatiquement.
31-  pendingEditReservationId: string | null;
32-  setPendingEditReservationId: (id: string | null) => void;
33-  refreshReservations: () => Promise<void>;
34-  // Voir SpaceContext.tsx — même résolution "figée dans le temps" pour les
35-  // jours déjà passés, à partir de slot_config_history.
36-  getConfigForDate: (iso: string) => SlotConfig | null;
37-  getSlotsForDate: (iso: string) => string[];
38:  // Bascule "Afficher mes créneaux" (rôle intervenant, par défaut = true) —
39-  // partagée via le contexte plutôt qu'un state local à home/calendar.tsx
40-  // pour que home/slots.tsx (détail d'un jour en vue Mensuel) et
41-  // VisitorSlotsList en tiennent compte aussi, pas seulement la grille/bande
42-  // de calendar.tsx. Sans effet pour les rôles visiteur/admin.
43-  mesCreneauxOnly: boolean;
44-  setMesCreneauxOnly: (v: boolean) => void;
45-}
46-
47-const VisitorContext = createContext<VisitorContextValue>({
48-  space: null,
49-  slotConfig: null,
50-  slots: [],
51-  reservations: [],
52:  intervenantProfiles: [],
53-  loading: true,
54-  token: "",
55-  selectedDay: new Date(),
56-  setSelectedDay: () => {},
57-  pendingBookingSlot: null,
58-  setPendingBookingSlot: () => {},
59-  pendingEditReservationId: null,
60-  setPendingEditReservationId: () => {},
61-  refreshReservations: async () => {},
62-  getConfigForDate: () => null,
63-  getSlotsForDate: () => [],
64-  mesCreneauxOnly: false,
65-  setMesCreneauxOnly: () => {},
66-});
67-
68-export function useVisitorSpace() {
69-  return useContext(VisitorContext);
70-}
71-
72-export function VisitorSpaceProvider({ token, children }: { token: string; children: ReactNode }) {
73-  const [space, setSpace] = useState<PatientSpace | null>(null);
74-  const [slotConfig, setSlotConfig] = useState<SlotConfig | null>(null);
75-  const [slots, setSlots] = useState<string[]>([]);
76-  const [configHistory, setConfigHistory] = useState<SlotConfigHistoryEntry[]>([]);
77-  const [reservations, setReservations] = useState<Reservation[]>([]);
78:  const [intervenantProfiles, setIntervenantProfiles] = useState<IntervenantProfile[]>([]);
79-  const [loading, setLoading] = useState(true);
80-  const pastSlotsCache = useRef<Map<string, string[]>>(new Map());
81-  const [selectedDay, setSelectedDay] = useState<Date>(() => {
82-    const d = new Date();
83-    d.setHours(0, 0, 0, 0);
84-    return d;
85-  });
86-  const [pendingBookingSlot, setPendingBookingSlot] = useState<string | null>(null);
87-  const [pendingEditReservationId, setPendingEditReservationId] = useState<string | null>(null);
88-  const [mesCreneauxOnly, setMesCreneauxOnly] = useState(false);
89-
90-  const fetchSpace = useCallback(async () => {
91-    if (!token) { setLoading(false); return; }
92-
93-    const { data: spaceData } = await supabase
--
123-    pastSlotsCache.current.clear();
124-    setConfigHistory(historyData || []);
125-
126-    setLoading(false);
127-  }, [token]);
128-
129-  useEffect(() => {
130-    fetchSpace();
131-  }, [fetchSpace]);
132-
133-  const getConfigForDate = useCallback(
134-    (iso: string): SlotConfig | null => {
135-      if (!slotConfig) return null;
136-      if (iso >= toISO(new Date())) return slotConfig;
137-      const entry = resolveConfigForDate(configHistory, iso);
138:      // slot_config_history ne trace pas intervenant_priority_mode ni
139:      // night_intervenant_mode/night_visitor_mode/news_intervenant_mode (pas
140-      // de pertinence rétroactive, purement affichage) — on retombe sur la
141-      // valeur live pour compléter le type.
142-      return entry
143-        ? {
144-            ...entry,
145:            intervenant_priority_mode: slotConfig?.intervenant_priority_mode ?? "all",
146:            night_intervenant_mode: slotConfig?.night_intervenant_mode ?? "disabled",
147-            night_visitor_mode: slotConfig?.night_visitor_mode ?? "all",
148:            news_intervenant_mode: slotConfig?.news_intervenant_mode ?? "disabled",
149-          }
150-        : slotConfig;
151-    },
152-    [slotConfig, configHistory],
153-  );
154-
155-  const getSlotsForDate = useCallback(
156-    (iso: string): string[] => {
157-      if (iso >= toISO(new Date())) return slots;
158-      const cached = pastSlotsCache.current.get(iso);
159-      if (cached) return cached;
160-      const config = getConfigForDate(iso);
161-      const generated = config ? generateSlots(config) : [];
162-      pastSlotsCache.current.set(iso, generated);
163-      return generated;
164-    },
165-    [slots, getConfigForDate],
166-  );
167-
168-  const refreshReservations = useCallback(async () => {
169-    if (!space) return;
170-    const { data } = await supabase
171-      .from("reservations")
172-      .select("*")
173-      .eq("space_id", space.id);
174-    setReservations(data || []);
175-  }, [space]);
176-
177:  const refreshIntervenantProfiles = useCallback(async () => {
178-    if (!space) return;
179-    const { data } = await supabase
180:      .from("intervenant_profiles")
181-      .select("*")
182-      .eq("space_id", space.id);
183:    setIntervenantProfiles(data || []);
184-  }, [space]);
185-
186-  useEffect(() => {
187-    if (!space) return;
188-    refreshReservations();
189:    refreshIntervenantProfiles();
190-
191-    // Reservations realtime
192-    const ch1 = supabase
193-      .channel(`visitor-reservations:${space.id}`)
194-      .on("postgres_changes", { event: "*", schema: "public", table: "reservations", filter: `space_id=eq.${space.id}` }, refreshReservations)
195-      .subscribe();
196-
197:    // Intervenant profiles realtime — le métier affiché dans le détail d'un
198:    // soin (VisitorSlotsList) doit rester à jour si un intervenant modifie sa
199:    // fiche ou si un nouveau intervenant rejoint l'espace.
200-    const ch4 = supabase
201:      .channel(`visitor-intervenant-profiles:${space.id}`)
202:      .on("postgres_changes", { event: "*", schema: "public", table: "intervenant_profiles", filter: `space_id=eq.${space.id}` }, refreshIntervenantProfiles)
203-      .subscribe();
204-
205-    // Space realtime — re-fetch on any admin update to get the full row
206-    // (payload.new only includes changed columns without REPLICA IDENTITY FULL)
207-    const ch2 = supabase
208-      .channel(`space-visitor:${space.id}`)
209-      .on(
210-        "postgres_changes",
211-        { event: "UPDATE", schema: "public", table: "patient_spaces", filter: `id=eq.${space.id}` },
212-        () => { fetchSpace(); },
213-      )
214-      .subscribe();
215-
216-    // slot_config realtime — visitor sees updated visit rules immediately.
217-    const spaceId = space.id;
--
228-            .select("*")
229-            .eq("space_id", spaceId)
230-            .order("valid_from", { ascending: true });
231-          pastSlotsCache.current.clear();
232-          setConfigHistory(historyData || []);
233-        },
234-      )
235-      .subscribe();
236-
237-    return () => {
238-      supabase.removeChannel(ch1);
239-      supabase.removeChannel(ch2);
240-      supabase.removeChannel(ch3);
241-      supabase.removeChannel(ch4);
242-    };
243:  }, [space?.id, refreshReservations, refreshIntervenantProfiles, fetchSpace]);
244-
245-  // Mémoïsé — même raison que SpaceContext.tsx : un littéral d'objet
246-  // recréé à chaque render forcerait tous les consommateurs de
247-  // useVisitorSpace() à re-render à chaque changement de n'importe laquelle
248-  // des ~11 pièces d'état du provider, même sans rapport avec eux.
249-  const value = useMemo<VisitorContextValue>(
250:    () => ({ space, slotConfig, slots, reservations, intervenantProfiles, loading, token, selectedDay, setSelectedDay, pendingBookingSlot, setPendingBookingSlot, pendingEditReservationId, setPendingEditReservationId, refreshReservations, getConfigForDate, getSlotsForDate, mesCreneauxOnly, setMesCreneauxOnly }),
251:    [space, slotConfig, slots, reservations, intervenantProfiles, loading, token, selectedDay, pendingBookingSlot, pendingEditReservationId, refreshReservations, getConfigForDate, getSlotsForDate, mesCreneauxOnly],
252-  );
253-
254-  return (
255-    <VisitorContext.Provider value={value}>
256-      {children}
257-    </VisitorContext.Provider>
258-  );
259-}

```

## Section C — Migrations SQL (intervenant, dédiées et mixtes)

### supabase/migrations/20260717_intervenant_tables.sql

```sql
-- Fiche intervenant (infirmier·ère, kiné, aide à domicile…) : nouveau rôle
-- léger, même mécanique d'identité que les visiteurs (session locale +
-- PIN, pas de compte Supabase Auth) — voir lib/visitorSession.ts. Chaque
-- intervenant définit à sa première connexion un ou plusieurs types
-- d'intervention avec leur durée (ex. "Toilette" 30min, "Kiné" 45min),
-- utilisés ensuite pour réserver un créneau qui bloque la durée exacte
-- (voir book_intervention, migration ultérieure).
--
-- RLS permissive comme reservations/visitor_profiles : aucune session
-- Supabase Auth côté intervenant, le contrôle d'accès réel se fait côté
-- client via comparaison de PIN en clair (même convention que le reste
-- de l'app).

create table if not exists public.intervenant_profiles (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.patient_spaces(id) on delete cascade,
  prenom text not null,
  nom text not null,
  pin text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_intervenant_profiles_space
  on public.intervenant_profiles (space_id);

alter table public.intervenant_profiles enable row level security;

drop policy if exists "public can select intervenant_profiles" on public.intervenant_profiles;
create policy "public can select intervenant_profiles"
  on public.intervenant_profiles for select using (true);

drop policy if exists "public can insert intervenant_profiles" on public.intervenant_profiles;
create policy "public can insert intervenant_profiles"
  on public.intervenant_profiles for insert with check (true);

drop policy if exists "public can update intervenant_profiles" on public.intervenant_profiles;
create policy "public can update intervenant_profiles"
  on public.intervenant_profiles for update using (true) with check (true);

drop policy if exists "public can delete intervenant_profiles" on public.intervenant_profiles;
create policy "public can delete intervenant_profiles"
  on public.intervenant_profiles for delete using (true);

create table if not exists public.intervention_types (
  id uuid primary key default gen_random_uuid(),
  intervenant_profile_id uuid not null references public.intervenant_profiles(id) on delete cascade,
  label text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_intervention_types_profile
  on public.intervention_types (intervenant_profile_id);

alter table public.intervention_types enable row level security;

drop policy if exists "public can select intervention_types" on public.intervention_types;
create policy "public can select intervention_types"
  on public.intervention_types for select using (true);

drop policy if exists "public can insert intervention_types" on public.intervention_types;
create policy "public can insert intervention_types"
  on public.intervention_types for insert with check (true);

drop policy if exists "public can update intervention_types" on public.intervention_types;
create policy "public can update intervention_types"
  on public.intervention_types for update using (true) with check (true);

drop policy if exists "public can delete intervention_types" on public.intervention_types;
create policy "public can delete intervention_types"
  on public.intervention_types for delete using (true);

```

### supabase/migrations/20260717_patient_spaces_intervenants_enabled.sql

```sql
-- Interrupteur admin pour le Planning des intervenants. Désactivé par
-- défaut (false) : tant que l'admin ne l'a pas activé dans les réglages
-- ("regles", à côté de night_enabled), l'entrée "Je suis intervenant" à
-- l'accueil est refusée pour cet espace (voir lib/visitorEntry.ts) et le
-- bloc "Planning des intervenants" reste masqué côté admin.
alter table public.patient_spaces
  add column if not exists intervenants_enabled boolean not null default false;

```

### supabase/migrations/20260717_reservations_intervention_columns.sql

```sql
-- Colonnes portant les réservations de type 'Intervention' (voir
-- 20260717_intervenant_tables.sql). Aucune contrainte CHECK n'existe sur
-- reservations.type — 'Intervention' est une simple nouvelle valeur
-- acceptée sans migration de contrainte.
--
-- duration_minutes/intervention_label sont copiés au moment de la
-- réservation (pas de FK vers intervention_types) : l'historique d'une
-- intervention ne doit jamais changer si l'intervenant modifie ou
-- supprime ce type plus tard. intervenant_profile_id reste une vraie FK
-- (on delete set null) pour permettre de retrouver le profil tant qu'il
-- existe, sans casser l'historique si le profil est supprimé.
alter table public.reservations
  add column if not exists duration_minutes integer,
  add column if not exists intervention_label text,
  add column if not exists intervenant_profile_id uuid references public.intervenant_profiles(id) on delete set null;

create index if not exists idx_reservations_space_type
  on public.reservations (space_id, type);

```

### supabase/migrations/20260717_book_intervention.sql

```sql
-- book_intervention : réservation d'un créneau d'intervention (infirmier·ère,
-- kiné, aide à domicile…), prioritaire sur les visites. Calquée sur
-- apply_slot_rule_change (20260711_apply_slot_rule_change.sql) : dans la
-- même transaction, insère la réservation 'Intervention' puis recase
-- automatiquement chaque réservation 'Visite' dont le créneau chevauche la
-- fenêtre de l'intervention vers le créneau valide le plus proche (même
-- jour d'abord, sinon jour par jour jusqu'à 60 jours) — même algorithme,
-- réutilise les mêmes valeurs alert_type ('rebooked'/'rebooking_failed')
-- pour que RebookingAlertModal.tsx n'ait besoin d'aucune modification.
--
-- p_slots est la grille de créneaux du jour, calculée côté client via
-- generateSlots() (même convention que p_new_slots dans
-- apply_slot_rule_change — la logique de génération vit uniquement dans
-- lib/slotUtils.ts).
--
-- Identité et durée résolues côté serveur (jamais depuis le client) :
-- prenom/nom/pin de l'intervenant garantissent que tout le mécanisme
-- existant de permission/historique/alerte basé sur le PIN fonctionne sans
-- changement. p_pin peut valoir 'ADMIN' quand c'est l'admin qui réserve
-- pour le compte d'un intervenant (même convention que les réservations
-- créées par l'admin sans PIN visiteur).
--
-- Première RPC de l'app appelée depuis une session PIN non authentifiée
-- par Supabase Auth (les visiteurs n'ont pas de compte) — grant execute
-- explicite à anon/authenticated en fin de fichier.

create or replace function public.book_intervention(
  p_space_id uuid,
  p_intervenant_profile_id uuid,
  p_intervention_type_id uuid,
  p_date date,
  p_start_slot text,
  p_pin text,
  p_slots text[]
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prenom text;
  v_nom text;
  v_duration_minutes integer;
  v_label text;
  v_start_min integer;
  v_end_min integer;
  v_config slot_config%rowtype;
  v_intervention_id uuid;

  v_rebooked uuid[] := array[]::uuid[];
  v_failed uuid[] := array[]::uuid[];

  v_cohort record;
  v_same_day_slots text[];
  v_day_slots text[];
  v_candidate_date date;
  v_candidate_slot text;
  v_target_date date;
  v_target_creneau text;
  v_found boolean;
  v_occ_count integer;
  v_overlaps_intervention boolean;
  v_i integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_space_id::text));

  p_slots := coalesce(p_slots, array[]::text[]);

  select prenom, nom into v_prenom, v_nom
    from intervenant_profiles
    where id = p_intervenant_profile_id and space_id = p_space_id;
  if not found then
    raise exception 'INTERVENANT_NOT_FOUND';
  end if;

  select label, duration_minutes into v_label, v_duration_minutes
    from intervention_types
    where id = p_intervention_type_id and intervenant_profile_id = p_intervenant_profile_id;
  if not found then
    raise exception 'INTERVENTION_TYPE_NOT_FOUND';
  end if;

  v_start_min := to_minutes(p_start_slot);
  v_end_min := v_start_min + v_duration_minutes;
  if v_end_min > 1440 then
    raise exception 'INTERVENTION_CROSSES_MIDNIGHT';
  end if;

  -- Un même intervenant ne peut pas chevaucher deux de ses propres
  -- interventions ce jour-là (des intervenants différents peuvent en
  -- revanche intervenir en même temps — ex. infirmière + kiné).
  if exists (
    select 1 from reservations
    where space_id = p_space_id
      and type = 'Intervention'
      and date = p_date
      and intervenant_profile_id = p_intervenant_profile_id
      and to_minutes(creneau) < v_end_min
      and to_minutes(creneau) + coalesce(duration_minutes, 0) > v_start_min
  ) then
    raise exception 'INTERVENTION_OVERLAP_SELF';
  end if;

  select * into v_config from slot_config where space_id = p_space_id;
  if not found then
    raise exception 'NO_SLOT_CONFIG_FOR_SPACE';
  end if;

  insert into reservations (
    space_id, date, creneau, prenom, nom, telephone, type, pin,
    duration_minutes, intervention_label, intervenant_profile_id
  ) values (
    p_space_id, p_date, p_start_slot, v_prenom, v_nom, '', 'Intervention', p_pin,
    v_duration_minutes, v_label, p_intervenant_profile_id
  )
  returning id into v_intervention_id;

  -- Recasage des cohortes "Visite" dont le créneau chevauche la fenêtre de
  -- l'intervention qu'on vient d'insérer.
  for v_cohort in
    select
      coalesce(group_id, id) as cohort_key,
      (array_agg(creneau order by created_at))[1] as cohort_creneau,
      array_agg(id order by created_at) as member_ids,
      count(*) as cohort_size
    from reservations
    where space_id = p_space_id and type = 'Visite' and date = p_date
    group by coalesce(group_id, id)
    having to_minutes((array_agg(creneau order by created_at))[1]) < v_end_min
       and to_minutes((array_agg(creneau order by created_at))[1]) + v_config.slot_duration_minutes > v_start_min
  loop
    select coalesce(array_agg(s order by abs(to_minutes(s) - to_minutes(v_cohort.cohort_creneau))), array[]::text[])
      into v_same_day_slots
      from unnest(p_slots) s;

    v_target_date := null;
    v_target_creneau := null;

    <<day_loop>>
    for v_i in 0..60 loop
      v_candidate_date := p_date + v_i;

      if not (extract(dow from v_candidate_date)::integer = any(v_config.allowed_weekdays)) then
        continue;
      end if;
      if to_char(v_candidate_date, 'YYYY-MM-DD') = any(v_config.blocked_dates) then
        continue;
      end if;

      v_day_slots := case when v_i = 0 then v_same_day_slots else p_slots end;

      foreach v_candidate_slot in array v_day_slots loop
        select count(*) into v_occ_count from reservations
          where space_id = p_space_id and date = v_candidate_date and creneau = v_candidate_slot
            and type = 'Visite' and not (id = any(v_cohort.member_ids));

        select exists (
          select 1 from reservations
          where space_id = p_space_id and date = v_candidate_date and type = 'Intervention'
            and to_minutes(creneau) < to_minutes(v_candidate_slot) + v_config.slot_duration_minutes
            and to_minutes(creneau) + coalesce(duration_minutes, 0) > to_minutes(v_candidate_slot)
        ) into v_overlaps_intervention;

        if v_occ_count + v_cohort.cohort_size <= v_config.max_visitors_per_slot and not v_overlaps_intervention then
          v_target_date := v_candidate_date;
          v_target_creneau := v_candidate_slot;
          exit day_loop;
        end if;
      end loop;
    end loop day_loop;

    if v_target_date is not null then
      update reservations set
        date = v_target_date,
        creneau = v_target_creneau,
        previous_date = date,
        previous_creneau = creneau,
        alert_type = 'rebooked',
        alert_message = 'Une intervention (' || v_label || ') est prioritaire sur votre créneau du '
          || to_char(p_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
          || '. Votre réservation a été automatiquement déplacée au '
          || to_char(v_target_date, 'DD/MM/YYYY') || ' à ' || v_target_creneau || '.',
        alert_seen = false
      where id = any(v_cohort.member_ids);

      insert into reservation_change_history (
        space_id, reservation_id, prenom, nom, type, change_type,
        previous_date, previous_creneau, new_date, new_creneau, message
      )
      select p_space_id, id, prenom, nom, type, 'rebooked',
        p_date, v_cohort.cohort_creneau, v_target_date, v_target_creneau,
        'Créneau prioritaire attribué à une intervention (' || v_label || '), réservation du '
          || to_char(p_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
          || ' automatiquement déplacée au ' || to_char(v_target_date, 'DD/MM/YYYY')
          || ' à ' || v_target_creneau || '.'
      from reservations where id = any(v_cohort.member_ids);

      v_rebooked := v_rebooked || v_cohort.member_ids;
    else
      update reservations set
        alert_type = 'rebooking_failed',
        alert_message = 'Une intervention (' || v_label || ') est prioritaire sur votre créneau du '
          || to_char(p_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
          || '. Nous n''avons pas pu automatiquement replacer votre réservation. '
          || 'Merci de contacter l''organisateur pour choisir un nouveau créneau.',
        alert_seen = false
      where id = any(v_cohort.member_ids);

      insert into reservation_change_history (
        space_id, reservation_id, prenom, nom, type, change_type,
        previous_date, previous_creneau, new_date, new_creneau, message
      )
      select p_space_id, id, prenom, nom, type, 'rebooking_failed',
        p_date, v_cohort.cohort_creneau, null, null,
        'Créneau prioritaire attribué à une intervention (' || v_label || '), réservation du '
          || to_char(p_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
          || ' n''a pas pu être automatiquement replacée.'
      from reservations where id = any(v_cohort.member_ids);

      v_failed := v_failed || v_cohort.member_ids;
    end if;
  end loop;

  return jsonb_build_object(
    'intervention_id', v_intervention_id,
    'rebooked', to_jsonb(v_rebooked),
    'failed', to_jsonb(v_failed)
  );
end;
$$;

grant execute on function public.book_intervention(uuid, uuid, uuid, date, text, text, text[])
  to anon, authenticated;

```

### supabase/migrations/20260717_apply_slot_rule_change_intervention_aware.sql

```sql
-- Durcit apply_slot_rule_change (20260711_apply_slot_rule_change.sql) :
-- la recherche du créneau candidat lors d'un recasage doit aussi exclure
-- les créneaux déjà occupés par une intervention (prioritaire par
-- construction — voir book_intervention). Sans cet ajout, un changement de
-- règles de visite pourrait recaser un visiteur pile sur une intervention
-- déjà réservée. Seule la ligne marquée ci-dessous change par rapport à la
-- version d'origine.

create or replace function public.apply_slot_rule_change(
  p_space_id uuid,
  p_new_config jsonb,
  p_new_slots text[]
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old slot_config%rowtype;

  v_visit_start_hour integer;
  v_visit_end_hour integer;
  v_slot_duration_minutes integer;
  v_min_gap_minutes integer;
  v_gap_includes_duration boolean;
  v_max_visitors_per_slot integer;
  v_allowed_weekdays integer[];
  v_blocked_dates text[];
  v_blocked_date_reasons jsonb;
  v_night_enabled boolean;
  v_night_start_hour integer;
  v_night_end_hour integer;
  v_max_night_visitors integer;

  v_structural_change boolean;
  v_weekday_blocked_changed boolean;
  v_night_scan_needed boolean;
  v_night_became_disabled boolean;

  v_rebooked uuid[] := array[]::uuid[];
  v_night_cancelled uuid[] := array[]::uuid[];
  v_failed uuid[] := array[]::uuid[];

  v_cohort record;
  v_night record;
  v_same_day_slots text[];
  v_day_slots text[];
  v_candidate_date date;
  v_candidate_slot text;
  v_target_date date;
  v_target_creneau text;
  v_found boolean;
  v_occ_count integer;
  v_overlaps_intervention boolean;
  v_night_invalid boolean;
  v_i integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_space_id::text));

  p_new_slots := coalesce(p_new_slots, array[]::text[]);

  select * into v_old from slot_config where space_id = p_space_id;
  if not found then
    raise exception 'NO_SLOT_CONFIG_FOR_SPACE';
  end if;

  v_visit_start_hour := case when p_new_config ? 'visit_start_hour'
    then (p_new_config->>'visit_start_hour')::integer else v_old.visit_start_hour end;
  v_visit_end_hour := case when p_new_config ? 'visit_end_hour'
    then (p_new_config->>'visit_end_hour')::integer else v_old.visit_end_hour end;
  v_slot_duration_minutes := case when p_new_config ? 'slot_duration_minutes'
    then (p_new_config->>'slot_duration_minutes')::integer else v_old.slot_duration_minutes end;
  v_min_gap_minutes := case when p_new_config ? 'min_gap_minutes'
    then (p_new_config->>'min_gap_minutes')::integer else v_old.min_gap_minutes end;
  v_gap_includes_duration := case when p_new_config ? 'gap_includes_duration'
    then (p_new_config->>'gap_includes_duration')::boolean else v_old.gap_includes_duration end;
  v_max_visitors_per_slot := case when p_new_config ? 'max_visitors_per_slot'
    then (p_new_config->>'max_visitors_per_slot')::integer else v_old.max_visitors_per_slot end;
  v_allowed_weekdays := case when p_new_config ? 'allowed_weekdays'
    then (select coalesce(array_agg(x::integer), array[]::integer[]) from jsonb_array_elements_text(p_new_config->'allowed_weekdays') x)
    else v_old.allowed_weekdays end;
  v_blocked_dates := case when p_new_config ? 'blocked_dates'
    then (select coalesce(array_agg(x), array[]::text[]) from jsonb_array_elements_text(p_new_config->'blocked_dates') x)
    else v_old.blocked_dates end;
  v_blocked_date_reasons := case when p_new_config ? 'blocked_date_reasons'
    then (p_new_config->'blocked_date_reasons') else v_old.blocked_date_reasons end;
  v_night_enabled := case when p_new_config ? 'night_enabled'
    then (p_new_config->>'night_enabled')::boolean else v_old.night_enabled end;
  v_night_start_hour := case when p_new_config ? 'night_start_hour'
    then (p_new_config->>'night_start_hour')::integer else v_old.night_start_hour end;
  v_night_end_hour := case when p_new_config ? 'night_end_hour'
    then (p_new_config->>'night_end_hour')::integer else v_old.night_end_hour end;
  v_max_night_visitors := case when p_new_config ? 'max_night_visitors'
    then (p_new_config->>'max_night_visitors')::integer else v_old.max_night_visitors end;

  -- 1. Historique + config live
  insert into slot_config_history (
    space_id, valid_from, visit_start_hour, visit_end_hour, slot_duration_minutes,
    min_gap_minutes, gap_includes_duration, max_visitors_per_slot, allowed_weekdays,
    blocked_dates, blocked_date_reasons, night_enabled, night_start_hour,
    night_end_hour, max_night_visitors
  ) values (
    p_space_id, current_date, v_visit_start_hour, v_visit_end_hour, v_slot_duration_minutes,
    v_min_gap_minutes, v_gap_includes_duration, v_max_visitors_per_slot, v_allowed_weekdays,
    v_blocked_dates, v_blocked_date_reasons, v_night_enabled, v_night_start_hour,
    v_night_end_hour, v_max_night_visitors
  )
  on conflict (space_id, valid_from) do update set
    visit_start_hour = excluded.visit_start_hour,
    visit_end_hour = excluded.visit_end_hour,
    slot_duration_minutes = excluded.slot_duration_minutes,
    min_gap_minutes = excluded.min_gap_minutes,
    gap_includes_duration = excluded.gap_includes_duration,
    max_visitors_per_slot = excluded.max_visitors_per_slot,
    allowed_weekdays = excluded.allowed_weekdays,
    blocked_dates = excluded.blocked_dates,
    blocked_date_reasons = excluded.blocked_date_reasons,
    night_enabled = excluded.night_enabled,
    night_start_hour = excluded.night_start_hour,
    night_end_hour = excluded.night_end_hour,
    max_night_visitors = excluded.max_night_visitors;

  update slot_config set
    visit_start_hour = v_visit_start_hour,
    visit_end_hour = v_visit_end_hour,
    slot_duration_minutes = v_slot_duration_minutes,
    min_gap_minutes = v_min_gap_minutes,
    gap_includes_duration = v_gap_includes_duration,
    max_visitors_per_slot = v_max_visitors_per_slot,
    allowed_weekdays = v_allowed_weekdays,
    blocked_dates = v_blocked_dates,
    blocked_date_reasons = v_blocked_date_reasons,
    night_enabled = v_night_enabled,
    night_start_hour = v_night_start_hour,
    night_end_hour = v_night_end_hour,
    max_night_visitors = v_max_night_visitors
  where space_id = p_space_id;

  v_weekday_blocked_changed := (v_allowed_weekdays is distinct from v_old.allowed_weekdays)
    or (v_blocked_dates is distinct from v_old.blocked_dates);

  v_structural_change := v_weekday_blocked_changed
    or (v_visit_start_hour is distinct from v_old.visit_start_hour)
    or (v_visit_end_hour is distinct from v_old.visit_end_hour)
    or (v_slot_duration_minutes is distinct from v_old.slot_duration_minutes)
    or (v_min_gap_minutes is distinct from v_old.min_gap_minutes)
    or (v_gap_includes_duration is distinct from v_old.gap_includes_duration)
    or (v_max_visitors_per_slot is distinct from v_old.max_visitors_per_slot);

  v_night_became_disabled := v_old.night_enabled and not v_night_enabled;
  v_night_scan_needed := v_night_became_disabled or v_weekday_blocked_changed;

  -- 2. Recasage des réservations "Visite" futures invalidées
  if v_structural_change then
    for v_cohort in
      select
        coalesce(group_id, id) as cohort_key,
        (array_agg(date order by created_at))[1] as cohort_date,
        (array_agg(creneau order by created_at))[1] as cohort_creneau,
        array_agg(id order by created_at) as member_ids,
        count(*) as cohort_size
      from reservations
      where space_id = p_space_id and type = 'Visite' and date >= current_date
      group by coalesce(group_id, id)
      order by min(created_at) asc
    loop
      v_found := (v_cohort.cohort_creneau = any(p_new_slots))
        and (extract(dow from v_cohort.cohort_date)::integer = any(v_allowed_weekdays))
        and not (to_char(v_cohort.cohort_date, 'YYYY-MM-DD') = any(v_blocked_dates));

      if v_found then
        select count(*) into v_occ_count from reservations
          where space_id = p_space_id and date = v_cohort.cohort_date and creneau = v_cohort.cohort_creneau
            and type = 'Visite' and not (id = any(v_cohort.member_ids));
        if v_occ_count + v_cohort.cohort_size > v_max_visitors_per_slot then
          v_found := false;
        end if;
      end if;

      if v_found then
        continue; -- créneau toujours valide et non-saturé, rien à faire
      end if;

      -- Recherche du créneau valide le plus proche : même jour trié par
      -- distance, sinon jour par jour (ordre chronologique de p_new_slots).
      select coalesce(array_agg(s order by abs(to_minutes(s) - to_minutes(v_cohort.cohort_creneau))), array[]::text[])
        into v_same_day_slots
        from unnest(p_new_slots) s;

      v_target_date := null;
      v_target_creneau := null;

      <<day_loop>>
      for v_i in 0..60 loop
        v_candidate_date := v_cohort.cohort_date + v_i;

        if not (extract(dow from v_candidate_date)::integer = any(v_allowed_weekdays)) then
          continue;
        end if;
        if to_char(v_candidate_date, 'YYYY-MM-DD') = any(v_blocked_dates) then
          continue;
        end if;

        v_day_slots := case when v_i = 0 then v_same_day_slots else p_new_slots end;

        foreach v_candidate_slot in array v_day_slots loop
          select count(*) into v_occ_count from reservations
            where space_id = p_space_id and date = v_candidate_date and creneau = v_candidate_slot
              and type = 'Visite' and not (id = any(v_cohort.member_ids));

          -- Ajout intervenants : un créneau déjà couvert par une intervention
          -- (prioritaire) n'est jamais un candidat valide.
          select exists (
            select 1 from reservations
            where space_id = p_space_id and date = v_candidate_date and type = 'Intervention'
              and to_minutes(creneau) < to_minutes(v_candidate_slot) + v_slot_duration_minutes
              and to_minutes(creneau) + coalesce(duration_minutes, 0) > to_minutes(v_candidate_slot)
          ) into v_overlaps_intervention;

          if v_occ_count + v_cohort.cohort_size <= v_max_visitors_per_slot and not v_overlaps_intervention then
            v_target_date := v_candidate_date;
            v_target_creneau := v_candidate_slot;
            exit day_loop;
          end if;
        end loop;
      end loop day_loop;

      if v_target_date is not null then
        update reservations set
          date = v_target_date,
          creneau = v_target_creneau,
          previous_date = date,
          previous_creneau = creneau,
          alert_type = 'rebooked',
          alert_message = 'Suite à une modification des règles de visite, votre réservation du '
            || to_char(v_cohort.cohort_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
            || ' a été automatiquement déplacée au ' || to_char(v_target_date, 'DD/MM/YYYY')
            || ' à ' || v_target_creneau || '.',
          alert_seen = false
        where id = any(v_cohort.member_ids);

        insert into reservation_change_history (
          space_id, reservation_id, prenom, nom, type, change_type,
          previous_date, previous_creneau, new_date, new_creneau, message
        )
        select p_space_id, id, prenom, nom, type, 'rebooked',
          v_cohort.cohort_date, v_cohort.cohort_creneau, v_target_date, v_target_creneau,
          'Suite à une modification des règles de visite, réservation du '
            || to_char(v_cohort.cohort_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
            || ' automatiquement déplacée au ' || to_char(v_target_date, 'DD/MM/YYYY')
            || ' à ' || v_target_creneau || '.'
        from reservations where id = any(v_cohort.member_ids);

        v_rebooked := v_rebooked || v_cohort.member_ids;
      else
        update reservations set
          alert_type = 'rebooking_failed',
          alert_message = 'Suite à une modification des règles de visite, votre réservation du '
            || to_char(v_cohort.cohort_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
            || ' n''a pas pu être automatiquement replacée. Merci de contacter l''organisateur '
            || 'pour choisir un nouveau créneau.',
          alert_seen = false
        where id = any(v_cohort.member_ids);

        insert into reservation_change_history (
          space_id, reservation_id, prenom, nom, type, change_type,
          previous_date, previous_creneau, new_date, new_creneau, message
        )
        select p_space_id, id, prenom, nom, type, 'rebooking_failed',
          v_cohort.cohort_date, v_cohort.cohort_creneau, null, null,
          'Suite à une modification des règles de visite, réservation du '
            || to_char(v_cohort.cohort_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
            || ' n''a pas pu être automatiquement replacée.'
        from reservations where id = any(v_cohort.member_ids);

        v_failed := v_failed || v_cohort.member_ids;
      end if;
    end loop;
  end if;

  -- 3. Nuitées invalidées : message seul, jamais de déplacement/suppression
  if v_night_scan_needed then
    for v_night in
      select id, date from reservations
      where space_id = p_space_id and type = 'Nuit' and date >= current_date
    loop
      v_night_invalid := v_night_became_disabled
        or not (extract(dow from v_night.date)::integer = any(v_allowed_weekdays))
        or (to_char(v_night.date, 'YYYY-MM-DD') = any(v_blocked_dates));

      if v_night_invalid then
        update reservations set
          alert_type = 'night_cancelled',
          alert_message = 'Nuitée annulée suite au changement de consignes.',
          alert_seen = false
        where id = v_night.id;

        insert into reservation_change_history (
          space_id, reservation_id, prenom, nom, type, change_type,
          previous_date, previous_creneau, new_date, new_creneau, message
        )
        select p_space_id, id, prenom, nom, type, 'night_cancelled',
          date, creneau, date, creneau, 'Nuitée annulée suite au changement de consignes.'
        from reservations where id = v_night.id;

        v_night_cancelled := v_night_cancelled || v_night.id;
      end if;
    end loop;
  end if;

  return jsonb_build_object(
    'rebooked', to_jsonb(v_rebooked),
    'night_cancelled', to_jsonb(v_night_cancelled),
    'failed', to_jsonb(v_failed)
  );
end;
$$;

```

### supabase/migrations/20260717_check_slot_capacity_intervention_aware.sql

```sql
-- Durcit check_slot_capacity() (20260707_slot_capacity_trigger.sql) : une
-- réservation "Visite" ne doit jamais pouvoir atterrir sur un créneau déjà
-- couvert par une intervention (prioritaire par construction — voir
-- book_intervention). Sans ce verrou serveur, un insert direct contournant
-- le bouton désactivé côté UI (slots.tsx) passerait quand même, exactement
-- le même raisonnement que le verrou de capacité déjà en place.

create or replace function public.check_slot_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max integer;
  v_count integer;
  v_slot_duration integer;
  v_blocked boolean;
begin
  if new.type <> 'Visite' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.space_id::text || new.date::text || new.creneau, 0));

  select max_visitors_per_slot, slot_duration_minutes into v_max, v_slot_duration
    from slot_config where space_id = new.space_id;
  if v_max is null then
    return new;
  end if;

  select count(*) into v_count from reservations
    where space_id = new.space_id
      and date = new.date
      and creneau = new.creneau
      and type = 'Visite'
      and id <> new.id;

  if v_count >= v_max then
    raise exception 'SLOT_FULL';
  end if;

  select exists (
    select 1 from reservations
    where space_id = new.space_id
      and date = new.date
      and type = 'Intervention'
      and to_minutes(creneau) < to_minutes(new.creneau) + coalesce(v_slot_duration, 0)
      and to_minutes(creneau) + coalesce(duration_minutes, 0) > to_minutes(new.creneau)
  ) into v_blocked;

  if v_blocked then
    raise exception 'SLOT_BLOCKED_BY_INTERVENTION';
  end if;

  return new;
end;
$$;

```

### supabase/migrations/20260717_reservations_type_check_intervention.sql

```sql
-- Corrige 20260717_reservations_intervention_columns.sql : contrairement à ce
-- qui était supposé, une contrainte CHECK existait bel et bien sur
-- reservations.type (reservations_type_check, limitée à 'Visite'/'Nuit'),
-- posée lors de la création initiale de la table (hors migrations suivies).
-- Sans cette correction, tout insert type='Intervention' (book_intervention,
-- AdminAddIntervention) échoue avec "violates check constraint
-- reservations_type_check".

alter table public.reservations
  drop constraint if exists reservations_type_check;

alter table public.reservations
  add constraint reservations_type_check
  check (type in ('Visite', 'Nuit', 'Intervention'));

```

### supabase/migrations/20260719_intervenant_profiles_contact.sql

```sql
-- Téléphone et phrase totem optionnels sur la fiche intervenant — premiers
-- champs de la refonte du compte Intervenant (téléphone pour être joignable
-- par l'admin/les autres intervenants si besoin, phrase totem sur le même
-- principe que visitor_profiles.motto côté visiteur).
alter table public.intervenant_profiles
  add column if not exists telephone text,
  add column if not exists phrase_totem text;

```

### supabase/migrations/20260719_intervenant_profiles_unique_identity.sql

```sql
-- Empêche la création de plusieurs fiches intervenant pour la même
-- personne dans un même espace. Avant cette contrainte, la déduplication
-- reposait uniquement sur un check-then-insert côté client
-- (_layout.tsx handleSaveIdentity, commit 722e1f7), non atomique — une
-- session locale ayant échoué à ce rattachement (ex: profil supprimé
-- après coup, ou PIN saisi différent) pouvait finir par référencer un
-- intervenantProfileId local qui n'existe plus, ou un insert créer un
-- vrai doublon en base. Vérifié avant migration : aucun doublon existant
-- sur (space_id, prenom, nom) en prod.
create unique index if not exists idx_intervenant_profiles_unique_identity
  on public.intervenant_profiles (space_id, lower(prenom), lower(nom));

```

### supabase/migrations/20260719_intervenant_profiles_photo_version.sql

```sql
-- La photo d'un intervenant est uploadée sous un nom de fichier fixe
-- (intervenant_profile_id + ".jpg", upsert:true, cache-control 1h côté
-- storage) — donc un ré-upload gardait la même URL publique, et le CDN
-- comme <Image> (cache par URI) continuaient de servir l'ancienne image.
-- Cette colonne sert uniquement de "cache buster" (?v=timestamp) sur les
-- URLs publiques lues côté app (voir intervenantPhotoUrl dans
-- IntervenantFicheModal/IntervenantProfileModal/IntervenantsListModal/
-- IntervenantsBlock) — pas d'usage métier.
alter table public.intervenant_profiles
  add column if not exists photo_updated_at timestamptz;

```

### supabase/migrations/20260720_intervenant_profiles_telephone_index.sql

```sql
-- Index pour le matching par téléphone (rattachement multi-espaces d'un
-- même intervenant, voir lib/phone.ts + IntervenantFicheModal.tsx +
-- app/(visitor)/account.tsx "Mes espaces") — le téléphone existe déjà
-- (20260719_intervenant_profiles_contact.sql), aucune autre colonne
-- nécessaire.
create index if not exists idx_intervenant_profiles_telephone
  on public.intervenant_profiles (telephone)
  where telephone is not null;

```

### supabase/migrations/20260720_book_intervention_one_visit_per_day.sql

```sql
-- Le mode "1 visite / jour" ne s'appliquait qu'entre réservations "Visite" :
-- book_intervention() (soins/intervenants) ne le consultait pas du tout, et
-- check_slot_capacity() ne comptait pas les interventions existantes dans
-- son propre calcul du jour déjà pris. Résultat, mode actif ou non : on
-- pouvait quand même empiler plusieurs soins le même jour, ou un soin après
-- une visite déjà posée. Ce correctif traite Visite et Intervention comme
-- un seul et même "évènement du jour" pour le plafond, des deux côtés —
-- cohérent avec le fait qu'une intervention est déjà prioritaire sur les
-- visites (book_intervention recase automatiquement les visites en conflit
-- horaire, voir 20260717_book_intervention.sql).

create or replace function public.check_slot_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max integer;
  v_count integer;
  v_slot_duration integer;
  v_blocked boolean;
  v_one_visit_per_day boolean;
  v_day_taken boolean;
begin
  if new.type <> 'Visite' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.space_id::text || new.date::text || new.creneau, 0));

  select max_visitors_per_slot, slot_duration_minutes, one_visit_per_day
    into v_max, v_slot_duration, v_one_visit_per_day
    from slot_config where space_id = new.space_id;
  if v_max is null then
    return new;
  end if;

  select count(*) into v_count from reservations
    where space_id = new.space_id
      and date = new.date
      and creneau = new.creneau
      and type = 'Visite'
      and id <> new.id;

  if v_count >= v_max then
    raise exception 'SLOT_FULL';
  end if;

  select exists (
    select 1 from reservations
    where space_id = new.space_id
      and date = new.date
      and type = 'Intervention'
      and to_minutes(creneau) < to_minutes(new.creneau) + coalesce(v_slot_duration, 0)
      and to_minutes(creneau) + coalesce(duration_minutes, 0) > to_minutes(new.creneau)
  ) into v_blocked;

  if v_blocked then
    raise exception 'SLOT_BLOCKED_BY_INTERVENTION';
  end if;

  if v_one_visit_per_day then
    perform pg_advisory_xact_lock(hashtextextended(new.space_id::text || new.date::text || 'one_visit_per_day', 0));

    select exists (
      select 1 from reservations
      where space_id = new.space_id
        and date = new.date
        and coalesce(alert_type, '') <> 'day_cap_suspended'
        and (
          type = 'Intervention'
          or (type = 'Visite'
            and creneau <> new.creneau
            and coalesce(group_id, id) <> coalesce(new.group_id, new.id))
        )
    ) into v_day_taken;

    if v_day_taken then
      raise exception 'DAY_ALREADY_BOOKED';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.book_intervention(
  p_space_id uuid,
  p_intervenant_profile_id uuid,
  p_intervention_type_id uuid,
  p_date date,
  p_start_slot text,
  p_pin text,
  p_slots text[]
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prenom text;
  v_nom text;
  v_duration_minutes integer;
  v_label text;
  v_start_min integer;
  v_end_min integer;
  v_config slot_config%rowtype;
  v_intervention_id uuid;
  v_day_taken boolean;

  v_rebooked uuid[] := array[]::uuid[];
  v_failed uuid[] := array[]::uuid[];

  v_cohort record;
  v_same_day_slots text[];
  v_day_slots text[];
  v_candidate_date date;
  v_candidate_slot text;
  v_target_date date;
  v_target_creneau text;
  v_found boolean;
  v_occ_count integer;
  v_overlaps_intervention boolean;
  v_i integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_space_id::text));

  p_slots := coalesce(p_slots, array[]::text[]);

  select prenom, nom into v_prenom, v_nom
    from intervenant_profiles
    where id = p_intervenant_profile_id and space_id = p_space_id;
  if not found then
    raise exception 'INTERVENANT_NOT_FOUND';
  end if;

  select label, duration_minutes into v_label, v_duration_minutes
    from intervention_types
    where id = p_intervention_type_id and intervenant_profile_id = p_intervenant_profile_id;
  if not found then
    raise exception 'INTERVENTION_TYPE_NOT_FOUND';
  end if;

  v_start_min := to_minutes(p_start_slot);
  v_end_min := v_start_min + v_duration_minutes;
  if v_end_min > 1440 then
    raise exception 'INTERVENTION_CROSSES_MIDNIGHT';
  end if;

  select * into v_config from slot_config where space_id = p_space_id;
  if not found then
    raise exception 'NO_SLOT_CONFIG_FOR_SPACE';
  end if;

  -- Un même intervenant ne peut pas chevaucher deux de ses propres
  -- interventions ce jour-là (des intervenants différents peuvent en
  -- revanche intervenir en même temps — ex. infirmière + kiné).
  if exists (
    select 1 from reservations
    where space_id = p_space_id
      and type = 'Intervention'
      and date = p_date
      and intervenant_profile_id = p_intervenant_profile_id
      and to_minutes(creneau) < v_end_min
      and to_minutes(creneau) + coalesce(duration_minutes, 0) > v_start_min
  ) then
    raise exception 'INTERVENTION_OVERLAP_SELF';
  end if;

  -- Mode "1 visite / jour" : une intervention compte comme l'évènement du
  -- jour au même titre qu'une visite (voir check_slot_capacity() ci-dessus,
  -- même règle des deux côtés).
  if v_config.one_visit_per_day then
    perform pg_advisory_xact_lock(hashtextextended(p_space_id::text || p_date::text || 'one_visit_per_day', 0));

    select exists (
      select 1 from reservations
      where space_id = p_space_id
        and date = p_date
        and type in ('Visite', 'Intervention')
        and coalesce(alert_type, '') <> 'day_cap_suspended'
    ) into v_day_taken;

    if v_day_taken then
      raise exception 'DAY_ALREADY_BOOKED';
    end if;
  end if;

  insert into reservations (
    space_id, date, creneau, prenom, nom, telephone, type, pin,
    duration_minutes, intervention_label, intervenant_profile_id
  ) values (
    p_space_id, p_date, p_start_slot, v_prenom, v_nom, '', 'Intervention', p_pin,
    v_duration_minutes, v_label, p_intervenant_profile_id
  )
  returning id into v_intervention_id;

  -- Recasage des cohortes "Visite" dont le créneau chevauche la fenêtre de
  -- l'intervention qu'on vient d'insérer.
  for v_cohort in
    select
      coalesce(group_id, id) as cohort_key,
      (array_agg(creneau order by created_at))[1] as cohort_creneau,
      array_agg(id order by created_at) as member_ids,
      count(*) as cohort_size
    from reservations
    where space_id = p_space_id and type = 'Visite' and date = p_date
    group by coalesce(group_id, id)
    having to_minutes((array_agg(creneau order by created_at))[1]) < v_end_min
       and to_minutes((array_agg(creneau order by created_at))[1]) + v_config.slot_duration_minutes > v_start_min
  loop
    select coalesce(array_agg(s order by abs(to_minutes(s) - to_minutes(v_cohort.cohort_creneau))), array[]::text[])
      into v_same_day_slots
      from unnest(p_slots) s;

    v_target_date := null;
    v_target_creneau := null;

    <<day_loop>>
    for v_i in 0..60 loop
      v_candidate_date := p_date + v_i;

      if not (extract(dow from v_candidate_date)::integer = any(v_config.allowed_weekdays)) then
        continue;
      end if;
      if to_char(v_candidate_date, 'YYYY-MM-DD') = any(v_config.blocked_dates) then
        continue;
      end if;

      v_day_slots := case when v_i = 0 then v_same_day_slots else p_slots end;

      foreach v_candidate_slot in array v_day_slots loop
        select count(*) into v_occ_count from reservations
          where space_id = p_space_id and date = v_candidate_date and creneau = v_candidate_slot
            and type = 'Visite' and not (id = any(v_cohort.member_ids));

        select exists (
          select 1 from reservations
          where space_id = p_space_id and date = v_candidate_date and type = 'Intervention'
            and to_minutes(creneau) < to_minutes(v_candidate_slot) + v_config.slot_duration_minutes
            and to_minutes(creneau) + coalesce(duration_minutes, 0) > to_minutes(v_candidate_slot)
        ) into v_overlaps_intervention;

        if v_occ_count + v_cohort.cohort_size <= v_config.max_visitors_per_slot and not v_overlaps_intervention then
          v_target_date := v_candidate_date;
          v_target_creneau := v_candidate_slot;
          exit day_loop;
        end if;
      end loop;
    end loop day_loop;

    if v_target_date is not null then
      update reservations set
        date = v_target_date,
        creneau = v_target_creneau,
        previous_date = date,
        previous_creneau = creneau,
        alert_type = 'rebooked',
        alert_message = 'Une intervention (' || v_label || ') est prioritaire sur votre créneau du '
          || to_char(p_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
          || '. Votre réservation a été automatiquement déplacée au '
          || to_char(v_target_date, 'DD/MM/YYYY') || ' à ' || v_target_creneau || '.',
        alert_seen = false
      where id = any(v_cohort.member_ids);

      insert into reservation_change_history (
        space_id, reservation_id, prenom, nom, type, change_type,
        previous_date, previous_creneau, new_date, new_creneau, message
      )
      select p_space_id, id, prenom, nom, type, 'rebooked',
        p_date, v_cohort.cohort_creneau, v_target_date, v_target_creneau,
        'Créneau prioritaire attribué à une intervention (' || v_label || '), réservation du '
          || to_char(p_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
          || ' automatiquement déplacée au ' || to_char(v_target_date, 'DD/MM/YYYY')
          || ' à ' || v_target_creneau || '.'
      from reservations where id = any(v_cohort.member_ids);

      v_rebooked := v_rebooked || v_cohort.member_ids;
    else
      update reservations set
        alert_type = 'rebooking_failed',
        alert_message = 'Une intervention (' || v_label || ') est prioritaire sur votre créneau du '
          || to_char(p_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
          || '. Nous n''avons pas pu automatiquement replacer votre réservation. '
          || 'Merci de contacter l''organisateur pour choisir un nouveau créneau.',
        alert_seen = false
      where id = any(v_cohort.member_ids);

      insert into reservation_change_history (
        space_id, reservation_id, prenom, nom, type, change_type,
        previous_date, previous_creneau, new_date, new_creneau, message
      )
      select p_space_id, id, prenom, nom, type, 'rebooking_failed',
        p_date, v_cohort.cohort_creneau, null, null,
        'Créneau prioritaire attribué à une intervention (' || v_label || '), réservation du '
          || to_char(p_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
          || ' n''a pas pu être automatiquement replacée.'
      from reservations where id = any(v_cohort.member_ids);

      v_failed := v_failed || v_cohort.member_ids;
    end if;
  end loop;

  return jsonb_build_object(
    'intervention_id', v_intervention_id,
    'rebooked', to_jsonb(v_rebooked),
    'failed', to_jsonb(v_failed)
  );
end;
$$;

```

### supabase/migrations/20260722_intervenant_metier_news_priority.sql

```sql
-- Bundle de 3 additions schema (session du 22/07) :
-- 1. Métier/spécialisation de l'intervenant, saisi à la création de sa fiche
--    (voir components/IntervenantFicheModal.tsx).
-- 2. Visibilité "Nouvelles du jour" aux visiteurs pour les messages postés par
--    des intervenants — masqués par défaut (canal dédié intervenants+admin),
--    activable par espace via un bouton admin (voir components/NewsFeed.tsx).
-- 3. Priorité des créneaux intervenants configurable : "all" (comportement
--    actuel, tous les intervenants sont prioritaires sur les visites) ou
--    "selected" (seuls les intervenants avec priority_slots=true le sont).
--    Défaut 'all' + priority_slots=true partout : aucun changement de
--    comportement tant que l'admin n'ouvre pas le nouveau popup dédié.

alter table intervenant_profiles
  add column if not exists metier text;

alter table patient_spaces
  add column if not exists intervenant_news_visible_to_visitors boolean not null default false;

alter table news_entries
  add column if not exists author_role text not null default 'visiteur'
    check (author_role in ('visiteur', 'intervenant', 'admin'));

update news_entries set author_role = 'admin' where author_pin = 'ADMIN' and author_role <> 'admin';

alter table slot_config
  add column if not exists intervenant_priority_mode text not null default 'all'
    check (intervenant_priority_mode in ('all', 'selected'));

alter table intervenant_profiles
  add column if not exists priority_slots boolean not null default true;

-- ─── check_slot_capacity() : la réservation 'Visite' n'est bloquée par une
-- intervention que si celle-ci est prioritaire (mode 'all', ou intervenant
-- avec priority_slots=true en mode 'selected'). Ne change rien tant que
-- intervenant_priority_mode reste à 'all' (défaut).
create or replace function public.check_slot_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max integer;
  v_count integer;
  v_slot_duration integer;
  v_priority_mode text;
  v_blocked boolean;
begin
  if new.type <> 'Visite' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.space_id::text || new.date::text || new.creneau, 0));

  select max_visitors_per_slot, slot_duration_minutes, intervenant_priority_mode
    into v_max, v_slot_duration, v_priority_mode
    from slot_config where space_id = new.space_id;
  if v_max is null then
    return new;
  end if;

  select count(*) into v_count from reservations
    where space_id = new.space_id
      and date = new.date
      and creneau = new.creneau
      and type = 'Visite'
      and id <> new.id;

  if v_count >= v_max then
    raise exception 'SLOT_FULL';
  end if;

  select exists (
    select 1 from reservations r
    left join intervenant_profiles ip on ip.id = r.intervenant_profile_id
    where r.space_id = new.space_id
      and r.date = new.date
      and r.type = 'Intervention'
      and to_minutes(r.creneau) < to_minutes(new.creneau) + coalesce(v_slot_duration, 0)
      and to_minutes(r.creneau) + coalesce(r.duration_minutes, 0) > to_minutes(new.creneau)
      and (coalesce(v_priority_mode, 'all') = 'all' or coalesce(ip.priority_slots, true))
  ) into v_blocked;

  if v_blocked then
    raise exception 'SLOT_BLOCKED_BY_INTERVENTION';
  end if;

  return new;
end;
$$;

-- ─── book_intervention() : le recasage automatique des visites chevauchant
-- l'intervention n'a lieu que si l'intervention est prioritaire (v_priority).
-- Sinon l'intervention est insérée telle quelle (coexiste avec les visites
-- déjà en place, comme n'importe quelle réservation non bloquante).
create or replace function public.book_intervention(
  p_space_id uuid,
  p_intervenant_profile_id uuid,
  p_intervention_type_id uuid,
  p_date date,
  p_start_slot text,
  p_pin text,
  p_slots text[]
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prenom text;
  v_nom text;
  v_duration_minutes integer;
  v_label text;
  v_start_min integer;
  v_end_min integer;
  v_config slot_config%rowtype;
  v_priority boolean;
  v_intervention_id uuid;

  v_rebooked uuid[] := array[]::uuid[];
  v_failed uuid[] := array[]::uuid[];

  v_cohort record;
  v_same_day_slots text[];
  v_day_slots text[];
  v_candidate_date date;
  v_candidate_slot text;
  v_target_date date;
  v_target_creneau text;
  v_found boolean;
  v_occ_count integer;
  v_overlaps_intervention boolean;
  v_i integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_space_id::text));

  p_slots := coalesce(p_slots, array[]::text[]);

  select prenom, nom into v_prenom, v_nom
    from intervenant_profiles
    where id = p_intervenant_profile_id and space_id = p_space_id;
  if not found then
    raise exception 'INTERVENANT_NOT_FOUND';
  end if;

  select label, duration_minutes into v_label, v_duration_minutes
    from intervention_types
    where id = p_intervention_type_id and intervenant_profile_id = p_intervenant_profile_id;
  if not found then
    raise exception 'INTERVENTION_TYPE_NOT_FOUND';
  end if;

  v_start_min := to_minutes(p_start_slot);
  v_end_min := v_start_min + v_duration_minutes;
  if v_end_min > 1440 then
    raise exception 'INTERVENTION_CROSSES_MIDNIGHT';
  end if;

  -- Un même intervenant ne peut pas chevaucher deux de ses propres
  -- interventions ce jour-là (des intervenants différents peuvent en
  -- revanche intervenir en même temps — ex. infirmière + kiné).
  if exists (
    select 1 from reservations
    where space_id = p_space_id
      and type = 'Intervention'
      and date = p_date
      and intervenant_profile_id = p_intervenant_profile_id
      and to_minutes(creneau) < v_end_min
      and to_minutes(creneau) + coalesce(duration_minutes, 0) > v_start_min
  ) then
    raise exception 'INTERVENTION_OVERLAP_SELF';
  end if;

  select * into v_config from slot_config where space_id = p_space_id;
  if not found then
    raise exception 'NO_SLOT_CONFIG_FOR_SPACE';
  end if;

  select (coalesce(v_config.intervenant_priority_mode, 'all') = 'all' or coalesce(priority_slots, true))
    into v_priority
    from intervenant_profiles where id = p_intervenant_profile_id;

  insert into reservations (
    space_id, date, creneau, prenom, nom, telephone, type, pin,
    duration_minutes, intervention_label, intervenant_profile_id
  ) values (
    p_space_id, p_date, p_start_slot, v_prenom, v_nom, '', 'Intervention', p_pin,
    v_duration_minutes, v_label, p_intervenant_profile_id
  )
  returning id into v_intervention_id;

  -- Recasage des cohortes "Visite" dont le créneau chevauche la fenêtre de
  -- l'intervention qu'on vient d'insérer — uniquement si elle est prioritaire.
  if v_priority then
  for v_cohort in
    select
      coalesce(group_id, id) as cohort_key,
      (array_agg(creneau order by created_at))[1] as cohort_creneau,
      array_agg(id order by created_at) as member_ids,
      count(*) as cohort_size
    from reservations
    where space_id = p_space_id and type = 'Visite' and date = p_date
    group by coalesce(group_id, id)
    having to_minutes((array_agg(creneau order by created_at))[1]) < v_end_min
       and to_minutes((array_agg(creneau order by created_at))[1]) + v_config.slot_duration_minutes > v_start_min
  loop
    select coalesce(array_agg(s order by abs(to_minutes(s) - to_minutes(v_cohort.cohort_creneau))), array[]::text[])
      into v_same_day_slots
      from unnest(p_slots) s;

    v_target_date := null;
    v_target_creneau := null;

    <<day_loop>>
    for v_i in 0..60 loop
      v_candidate_date := p_date + v_i;

      if not (extract(dow from v_candidate_date)::integer = any(v_config.allowed_weekdays)) then
        continue;
      end if;
      if to_char(v_candidate_date, 'YYYY-MM-DD') = any(v_config.blocked_dates) then
        continue;
      end if;

      v_day_slots := case when v_i = 0 then v_same_day_slots else p_slots end;

      foreach v_candidate_slot in array v_day_slots loop
        select count(*) into v_occ_count from reservations
          where space_id = p_space_id and date = v_candidate_date and creneau = v_candidate_slot
            and type = 'Visite' and not (id = any(v_cohort.member_ids));

        select exists (
          select 1 from reservations
          where space_id = p_space_id and date = v_candidate_date and type = 'Intervention'
            and to_minutes(creneau) < to_minutes(v_candidate_slot) + v_config.slot_duration_minutes
            and to_minutes(creneau) + coalesce(duration_minutes, 0) > to_minutes(v_candidate_slot)
        ) into v_overlaps_intervention;

        if v_occ_count + v_cohort.cohort_size <= v_config.max_visitors_per_slot and not v_overlaps_intervention then
          v_target_date := v_candidate_date;
          v_target_creneau := v_candidate_slot;
          exit day_loop;
        end if;
      end loop;
    end loop day_loop;

    if v_target_date is not null then
      update reservations set
        date = v_target_date,
        creneau = v_target_creneau,
        previous_date = date,
        previous_creneau = creneau,
        alert_type = 'rebooked',
        alert_message = 'Une intervention (' || v_label || ') est prioritaire sur votre créneau du '
          || to_char(p_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
          || '. Votre réservation a été automatiquement déplacée au '
          || to_char(v_target_date, 'DD/MM/YYYY') || ' à ' || v_target_creneau || '.',
        alert_seen = false
      where id = any(v_cohort.member_ids);

      insert into reservation_change_history (
        space_id, reservation_id, prenom, nom, type, change_type,
        previous_date, previous_creneau, new_date, new_creneau, message
      )
      select p_space_id, id, prenom, nom, type, 'rebooked',
        p_date, v_cohort.cohort_creneau, v_target_date, v_target_creneau,
        'Créneau prioritaire attribué à une intervention (' || v_label || '), réservation du '
          || to_char(p_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
          || ' automatiquement déplacée au ' || to_char(v_target_date, 'DD/MM/YYYY')
          || ' à ' || v_target_creneau || '.'
      from reservations where id = any(v_cohort.member_ids);

      v_rebooked := v_rebooked || v_cohort.member_ids;
    else
      update reservations set
        alert_type = 'rebooking_failed',
        alert_message = 'Une intervention (' || v_label || ') est prioritaire sur votre créneau du '
          || to_char(p_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
          || '. Nous n''avons pas pu automatiquement replacer votre réservation. '
          || 'Merci de contacter l''organisateur pour choisir un nouveau créneau.',
        alert_seen = false
      where id = any(v_cohort.member_ids);

      insert into reservation_change_history (
        space_id, reservation_id, prenom, nom, type, change_type,
        previous_date, previous_creneau, new_date, new_creneau, message
      )
      select p_space_id, id, prenom, nom, type, 'rebooking_failed',
        p_date, v_cohort.cohort_creneau, null, null,
        'Créneau prioritaire attribué à une intervention (' || v_label || '), réservation du '
          || to_char(p_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
          || ' n''a pas pu être automatiquement replacée.'
      from reservations where id = any(v_cohort.member_ids);

      v_failed := v_failed || v_cohort.member_ids;
    end if;
  end loop;
  end if;

  return jsonb_build_object(
    'intervention_id', v_intervention_id,
    'rebooked', to_jsonb(v_rebooked),
    'failed', to_jsonb(v_failed)
  );
end;
$$;

grant execute on function public.book_intervention(uuid, uuid, uuid, date, text, text, text[])
  to anon, authenticated;

```

### supabase/migrations/20260723_fix_check_slot_capacity_migration_order.sql

```sql
-- Corrige un bug de production : les migrations "Planning des intervenants"
-- (`check_slot_capacity_intervention_aware.sql`, `apply_slot_rule_change_
-- intervention_aware.sql`) avaient été committées le 17/07 mais nommées avec
-- un préfixe de date erroné "20260722" — postérieur aux migrations "1 visite
-- / jour" du 18-19/07. Rejouées dans l'ordre alphabétique des fichiers
-- (l'ordre standard pour appliquer des migrations Supabase), elles
-- écrasaient `check_slot_capacity()` et `apply_slot_rule_change()` avec une
-- version antérieure à `one_visit_per_day`, qui n'avait donc plus aucun
-- effet côté serveur : le toggle "1 visite par jour" restait sans effet
-- réel malgré une activation apparente côté écran.
--
-- Les fichiers fautifs ont été renommés en `20260717_*` (leur vraie date)
-- dans ce même correctif, pour que tout futur rejeu complet des migrations
-- (ex. isolation d'une nouvelle instance Supabase, cf. ISOLATION_SUPABASE.md)
-- produise le bon résultat sans intervention manuelle. Cette migration-ci
-- répare uniquement l'instance de production déjà contaminée par le mauvais
-- ordre : elle réapplique tel quel l'état final voulu de
-- `20260719_one_visit_per_day_activation.sql` (intervention-aware ET
-- one_visit_per_day-aware), en `create or replace` idempotent.

create or replace function public.check_slot_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max integer;
  v_count integer;
  v_slot_duration integer;
  v_blocked boolean;
  v_one_visit_per_day boolean;
  v_day_taken boolean;
begin
  if new.type <> 'Visite' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.space_id::text || new.date::text || new.creneau, 0));

  select max_visitors_per_slot, slot_duration_minutes, one_visit_per_day
    into v_max, v_slot_duration, v_one_visit_per_day
    from slot_config where space_id = new.space_id;
  if v_max is null then
    return new;
  end if;

  select count(*) into v_count from reservations
    where space_id = new.space_id
      and date = new.date
      and creneau = new.creneau
      and type = 'Visite'
      and id <> new.id;

  if v_count >= v_max then
    raise exception 'SLOT_FULL';
  end if;

  select exists (
    select 1 from reservations
    where space_id = new.space_id
      and date = new.date
      and type = 'Intervention'
      and to_minutes(creneau) < to_minutes(new.creneau) + coalesce(v_slot_duration, 0)
      and to_minutes(creneau) + coalesce(duration_minutes, 0) > to_minutes(new.creneau)
  ) into v_blocked;

  if v_blocked then
    raise exception 'SLOT_BLOCKED_BY_INTERVENTION';
  end if;

  if v_one_visit_per_day then
    perform pg_advisory_xact_lock(hashtextextended(new.space_id::text || new.date::text || 'one_visit_per_day', 0));

    select exists (
      select 1 from reservations
      where space_id = new.space_id
        and date = new.date
        and type = 'Visite'
        and creneau <> new.creneau
        and coalesce(group_id, id) <> coalesce(new.group_id, new.id)
        and coalesce(alert_type, '') <> 'day_cap_suspended'
    ) into v_day_taken;

    if v_day_taken then
      raise exception 'DAY_ALREADY_BOOKED';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.apply_slot_rule_change(
  p_space_id uuid,
  p_new_config jsonb,
  p_new_slots text[]
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old slot_config%rowtype;

  v_visit_start_hour integer;
  v_visit_end_hour integer;
  v_slot_duration_minutes integer;
  v_min_gap_minutes integer;
  v_gap_includes_duration boolean;
  v_max_visitors_per_slot integer;
  v_allowed_weekdays integer[];
  v_blocked_dates text[];
  v_blocked_date_reasons jsonb;
  v_night_enabled boolean;
  v_night_start_hour integer;
  v_night_end_hour integer;
  v_max_night_visitors integer;
  v_one_visit_per_day boolean;

  v_structural_change boolean;
  v_weekday_blocked_changed boolean;
  v_night_scan_needed boolean;
  v_night_became_disabled boolean;
  v_one_visit_activated boolean;

  v_rebooked uuid[] := array[]::uuid[];
  v_night_cancelled uuid[] := array[]::uuid[];
  v_failed uuid[] := array[]::uuid[];
  v_day_cap_suspended uuid[] := array[]::uuid[];

  v_cohort record;
  v_night record;
  v_same_day_slots text[];
  v_day_slots text[];
  v_candidate_date date;
  v_candidate_slot text;
  v_target_date date;
  v_target_creneau text;
  v_found boolean;
  v_occ_count integer;
  v_overlaps_intervention boolean;
  v_night_invalid boolean;
  v_i integer;

  v_daycap_date date;
  v_winning_cohort uuid;
  v_loser record;
begin
  perform pg_advisory_xact_lock(hashtext(p_space_id::text));

  p_new_slots := coalesce(p_new_slots, array[]::text[]);

  select * into v_old from slot_config where space_id = p_space_id;
  if not found then
    raise exception 'NO_SLOT_CONFIG_FOR_SPACE';
  end if;

  v_visit_start_hour := case when p_new_config ? 'visit_start_hour'
    then (p_new_config->>'visit_start_hour')::integer else v_old.visit_start_hour end;
  v_visit_end_hour := case when p_new_config ? 'visit_end_hour'
    then (p_new_config->>'visit_end_hour')::integer else v_old.visit_end_hour end;
  v_slot_duration_minutes := case when p_new_config ? 'slot_duration_minutes'
    then (p_new_config->>'slot_duration_minutes')::integer else v_old.slot_duration_minutes end;
  v_min_gap_minutes := case when p_new_config ? 'min_gap_minutes'
    then (p_new_config->>'min_gap_minutes')::integer else v_old.min_gap_minutes end;
  v_gap_includes_duration := case when p_new_config ? 'gap_includes_duration'
    then (p_new_config->>'gap_includes_duration')::boolean else v_old.gap_includes_duration end;
  v_max_visitors_per_slot := case when p_new_config ? 'max_visitors_per_slot'
    then (p_new_config->>'max_visitors_per_slot')::integer else v_old.max_visitors_per_slot end;
  v_allowed_weekdays := case when p_new_config ? 'allowed_weekdays'
    then (select coalesce(array_agg(x::integer), array[]::integer[]) from jsonb_array_elements_text(p_new_config->'allowed_weekdays') x)
    else v_old.allowed_weekdays end;
  v_blocked_dates := case when p_new_config ? 'blocked_dates'
    then (select coalesce(array_agg(x), array[]::text[]) from jsonb_array_elements_text(p_new_config->'blocked_dates') x)
    else v_old.blocked_dates end;
  v_blocked_date_reasons := case when p_new_config ? 'blocked_date_reasons'
    then (p_new_config->'blocked_date_reasons') else v_old.blocked_date_reasons end;
  v_night_enabled := case when p_new_config ? 'night_enabled'
    then (p_new_config->>'night_enabled')::boolean else v_old.night_enabled end;
  v_night_start_hour := case when p_new_config ? 'night_start_hour'
    then (p_new_config->>'night_start_hour')::integer else v_old.night_start_hour end;
  v_night_end_hour := case when p_new_config ? 'night_end_hour'
    then (p_new_config->>'night_end_hour')::integer else v_old.night_end_hour end;
  v_max_night_visitors := case when p_new_config ? 'max_night_visitors'
    then (p_new_config->>'max_night_visitors')::integer else v_old.max_night_visitors end;
  v_one_visit_per_day := case when p_new_config ? 'one_visit_per_day'
    then (p_new_config->>'one_visit_per_day')::boolean else v_old.one_visit_per_day end;

  -- 1. Historique + config live
  insert into slot_config_history (
    space_id, valid_from, visit_start_hour, visit_end_hour, slot_duration_minutes,
    min_gap_minutes, gap_includes_duration, max_visitors_per_slot, allowed_weekdays,
    blocked_dates, blocked_date_reasons, night_enabled, night_start_hour,
    night_end_hour, max_night_visitors, one_visit_per_day
  ) values (
    p_space_id, current_date, v_visit_start_hour, v_visit_end_hour, v_slot_duration_minutes,
    v_min_gap_minutes, v_gap_includes_duration, v_max_visitors_per_slot, v_allowed_weekdays,
    v_blocked_dates, v_blocked_date_reasons, v_night_enabled, v_night_start_hour,
    v_night_end_hour, v_max_night_visitors, v_one_visit_per_day
  )
  on conflict (space_id, valid_from) do update set
    visit_start_hour = excluded.visit_start_hour,
    visit_end_hour = excluded.visit_end_hour,
    slot_duration_minutes = excluded.slot_duration_minutes,
    min_gap_minutes = excluded.min_gap_minutes,
    gap_includes_duration = excluded.gap_includes_duration,
    max_visitors_per_slot = excluded.max_visitors_per_slot,
    allowed_weekdays = excluded.allowed_weekdays,
    blocked_dates = excluded.blocked_dates,
    blocked_date_reasons = excluded.blocked_date_reasons,
    night_enabled = excluded.night_enabled,
    night_start_hour = excluded.night_start_hour,
    night_end_hour = excluded.night_end_hour,
    max_night_visitors = excluded.max_night_visitors,
    one_visit_per_day = excluded.one_visit_per_day;

  update slot_config set
    visit_start_hour = v_visit_start_hour,
    visit_end_hour = v_visit_end_hour,
    slot_duration_minutes = v_slot_duration_minutes,
    min_gap_minutes = v_min_gap_minutes,
    gap_includes_duration = v_gap_includes_duration,
    max_visitors_per_slot = v_max_visitors_per_slot,
    allowed_weekdays = v_allowed_weekdays,
    blocked_dates = v_blocked_dates,
    blocked_date_reasons = v_blocked_date_reasons,
    night_enabled = v_night_enabled,
    night_start_hour = v_night_start_hour,
    night_end_hour = v_night_end_hour,
    max_night_visitors = v_max_night_visitors,
    one_visit_per_day = v_one_visit_per_day
  where space_id = p_space_id;

  v_weekday_blocked_changed := (v_allowed_weekdays is distinct from v_old.allowed_weekdays)
    or (v_blocked_dates is distinct from v_old.blocked_dates);

  v_structural_change := v_weekday_blocked_changed
    or (v_visit_start_hour is distinct from v_old.visit_start_hour)
    or (v_visit_end_hour is distinct from v_old.visit_end_hour)
    or (v_slot_duration_minutes is distinct from v_old.slot_duration_minutes)
    or (v_min_gap_minutes is distinct from v_old.min_gap_minutes)
    or (v_gap_includes_duration is distinct from v_old.gap_includes_duration)
    or (v_max_visitors_per_slot is distinct from v_old.max_visitors_per_slot);

  v_night_became_disabled := v_old.night_enabled and not v_night_enabled;
  v_night_scan_needed := v_night_became_disabled or v_weekday_blocked_changed;
  v_one_visit_activated := (not coalesce(v_old.one_visit_per_day, false)) and coalesce(v_one_visit_per_day, false);

  -- 2. Recasage des réservations "Visite" futures invalidées
  if v_structural_change then
    for v_cohort in
      select
        coalesce(group_id, id) as cohort_key,
        (array_agg(date order by created_at))[1] as cohort_date,
        (array_agg(creneau order by created_at))[1] as cohort_creneau,
        array_agg(id order by created_at) as member_ids,
        count(*) as cohort_size
      from reservations
      where space_id = p_space_id and type = 'Visite' and date >= current_date
      group by coalesce(group_id, id)
      order by min(created_at) asc
    loop
      v_found := (v_cohort.cohort_creneau = any(p_new_slots))
        and (extract(dow from v_cohort.cohort_date)::integer = any(v_allowed_weekdays))
        and not (to_char(v_cohort.cohort_date, 'YYYY-MM-DD') = any(v_blocked_dates));

      if v_found then
        select count(*) into v_occ_count from reservations
          where space_id = p_space_id and date = v_cohort.cohort_date and creneau = v_cohort.cohort_creneau
            and type = 'Visite' and not (id = any(v_cohort.member_ids));
        if v_occ_count + v_cohort.cohort_size > v_max_visitors_per_slot then
          v_found := false;
        end if;
      end if;

      if v_found then
        continue; -- créneau toujours valide et non-saturé, rien à faire
      end if;

      -- Recherche du créneau valide le plus proche : même jour trié par
      -- distance, sinon jour par jour (ordre chronologique de p_new_slots).
      select coalesce(array_agg(s order by abs(to_minutes(s) - to_minutes(v_cohort.cohort_creneau))), array[]::text[])
        into v_same_day_slots
        from unnest(p_new_slots) s;

      v_target_date := null;
      v_target_creneau := null;

      <<day_loop>>
      for v_i in 0..60 loop
        v_candidate_date := v_cohort.cohort_date + v_i;

        if not (extract(dow from v_candidate_date)::integer = any(v_allowed_weekdays)) then
          continue;
        end if;
        if to_char(v_candidate_date, 'YYYY-MM-DD') = any(v_blocked_dates) then
          continue;
        end if;

        v_day_slots := case when v_i = 0 then v_same_day_slots else p_new_slots end;

        foreach v_candidate_slot in array v_day_slots loop
          select count(*) into v_occ_count from reservations
            where space_id = p_space_id and date = v_candidate_date and creneau = v_candidate_slot
              and type = 'Visite' and not (id = any(v_cohort.member_ids));

          -- Ajout intervenants : un créneau déjà couvert par une intervention
          -- (prioritaire) n'est jamais un candidat valide.
          select exists (
            select 1 from reservations
            where space_id = p_space_id and date = v_candidate_date and type = 'Intervention'
              and to_minutes(creneau) < to_minutes(v_candidate_slot) + v_slot_duration_minutes
              and to_minutes(creneau) + coalesce(duration_minutes, 0) > to_minutes(v_candidate_slot)
          ) into v_overlaps_intervention;

          if v_occ_count + v_cohort.cohort_size <= v_max_visitors_per_slot and not v_overlaps_intervention then
            v_target_date := v_candidate_date;
            v_target_creneau := v_candidate_slot;
            exit day_loop;
          end if;
        end loop;
      end loop day_loop;

      if v_target_date is not null then
        update reservations set
          date = v_target_date,
          creneau = v_target_creneau,
          previous_date = date,
          previous_creneau = creneau,
          alert_type = 'rebooked',
          alert_message = 'Suite à une modification des règles de visite, votre réservation du '
            || to_char(v_cohort.cohort_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
            || ' a été automatiquement déplacée au ' || to_char(v_target_date, 'DD/MM/YYYY')
            || ' à ' || v_target_creneau || '.',
          alert_seen = false
        where id = any(v_cohort.member_ids);

        insert into reservation_change_history (
          space_id, reservation_id, prenom, nom, type, change_type,
          previous_date, previous_creneau, new_date, new_creneau, message
        )
        select p_space_id, id, prenom, nom, type, 'rebooked',
          v_cohort.cohort_date, v_cohort.cohort_creneau, v_target_date, v_target_creneau,
          'Suite à une modification des règles de visite, réservation du '
            || to_char(v_cohort.cohort_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
            || ' automatiquement déplacée au ' || to_char(v_target_date, 'DD/MM/YYYY')
            || ' à ' || v_target_creneau || '.'
        from reservations where id = any(v_cohort.member_ids);

        v_rebooked := v_rebooked || v_cohort.member_ids;
      else
        update reservations set
          alert_type = 'rebooking_failed',
          alert_message = 'Suite à une modification des règles de visite, votre réservation du '
            || to_char(v_cohort.cohort_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
            || ' n''a pas pu être automatiquement replacée. Merci de contacter l''organisateur '
            || 'pour choisir un nouveau créneau.',
          alert_seen = false
        where id = any(v_cohort.member_ids);

        insert into reservation_change_history (
          space_id, reservation_id, prenom, nom, type, change_type,
          previous_date, previous_creneau, new_date, new_creneau, message
        )
        select p_space_id, id, prenom, nom, type, 'rebooking_failed',
          v_cohort.cohort_date, v_cohort.cohort_creneau, null, null,
          'Suite à une modification des règles de visite, réservation du '
            || to_char(v_cohort.cohort_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
            || ' n''a pas pu être automatiquement replacée.'
        from reservations where id = any(v_cohort.member_ids);

        v_failed := v_failed || v_cohort.member_ids;
      end if;
    end loop;
  end if;

  -- 3. Nuitées invalidées : message seul, jamais de déplacement/suppression
  if v_night_scan_needed then
    for v_night in
      select id, date from reservations
      where space_id = p_space_id and type = 'Nuit' and date >= current_date
    loop
      v_night_invalid := v_night_became_disabled
        or not (extract(dow from v_night.date)::integer = any(v_allowed_weekdays))
        or (to_char(v_night.date, 'YYYY-MM-DD') = any(v_blocked_dates));

      if v_night_invalid then
        update reservations set
          alert_type = 'night_cancelled',
          alert_message = 'Nuitée annulée suite au changement de consignes.',
          alert_seen = false
        where id = v_night.id;

        insert into reservation_change_history (
          space_id, reservation_id, prenom, nom, type, change_type,
          previous_date, previous_creneau, new_date, new_creneau, message
        )
        select p_space_id, id, prenom, nom, type, 'night_cancelled',
          date, creneau, date, creneau, 'Nuitée annulée suite au changement de consignes.'
        from reservations where id = v_night.id;

        v_night_cancelled := v_night_cancelled || v_night.id;
      end if;
    end loop;
  end if;

  -- 4. Activation du mode "1 visite / jour" : ne touche jamais le passé
  -- (date >= current_date), et ne déplace ni ne supprime rien — pour chaque
  -- jour où plusieurs réservations "Visite" existent déjà, la première
  -- enregistrée (created_at le plus ancien) reste active, toutes les autres
  -- sont marquées "day_cap_suspended".
  if v_one_visit_activated then
    for v_daycap_date in
      select date
      from reservations
      where space_id = p_space_id and type = 'Visite' and date >= current_date
      group by date
      having count(distinct coalesce(group_id, id)) > 1
    loop
      select coalesce(group_id, id) into v_winning_cohort
      from reservations
      where space_id = p_space_id and type = 'Visite' and date = v_daycap_date
      group by coalesce(group_id, id)
      order by min(created_at) asc
      limit 1;

      for v_loser in
        select id, prenom, nom, type, date, creneau
        from reservations
        where space_id = p_space_id and type = 'Visite' and date = v_daycap_date
          and coalesce(group_id, id) <> v_winning_cohort
      loop
        update reservations set
          alert_type = 'day_cap_suspended',
          alert_message = 'Le mode "1 visite par jour" a été activé : votre réservation du '
            || to_char(v_loser.date, 'DD/MM/YYYY') || ' à ' || v_loser.creneau
            || ' a été suspendue car une autre réservation existait déjà ce jour-là. '
            || 'Modifiez-la pour choisir un autre jour.',
          alert_seen = false
        where id = v_loser.id;

        insert into reservation_change_history (
          space_id, reservation_id, prenom, nom, type, change_type,
          previous_date, previous_creneau, new_date, new_creneau, message
        ) values (
          p_space_id, v_loser.id, v_loser.prenom, v_loser.nom, v_loser.type, 'day_cap_suspended',
          v_loser.date, v_loser.creneau, v_loser.date, v_loser.creneau,
          'Réservation du ' || to_char(v_loser.date, 'DD/MM/YYYY') || ' à ' || v_loser.creneau
            || ' suspendue suite à l''activation du mode "1 visite par jour".'
        );

        v_day_cap_suspended := v_day_cap_suspended || v_loser.id;
      end loop;
    end loop;
  end if;

  return jsonb_build_object(
    'rebooked', to_jsonb(v_rebooked),
    'night_cancelled', to_jsonb(v_night_cancelled),
    'failed', to_jsonb(v_failed),
    'day_cap_suspended', to_jsonb(v_day_cap_suspended)
  );
end;
$$;

```

### supabase/migrations/20260724_intervenant_profiles_photo.sql

```sql
-- Photo de profil intervenant — affichée dans la liste "Intervenants" côté
-- visiteur (components/IntervenantsListModal.tsx) et dans la fiche
-- intervenant (components/IntervenantProfileModal.tsx), au même titre que la
-- photo de profil visiteur (voir 20260713_visitor_profiles.sql, même
-- convention de bucket public). Renseignée depuis IntervenantFicheModal
-- (mode "create" à la première connexion, ou "edit" depuis Mon compte/
-- Réglages admin), fichier nommé par intervenant_profile_id (contrairement à
-- visitor_profiles qui n'a pas d'id stable côté app et utilise prénom+nom).

alter table public.intervenant_profiles
  add column if not exists photo text;

insert into storage.buckets (id, name, public)
values ('intervenant-photos', 'intervenant-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read intervenant-photos"   on storage.objects;
drop policy if exists "Public insert intervenant-photos" on storage.objects;
drop policy if exists "Public update intervenant-photos" on storage.objects;
drop policy if exists "Public delete intervenant-photos" on storage.objects;

create policy "Public read intervenant-photos"
  on storage.objects for select
  using (bucket_id = 'intervenant-photos');

create policy "Public insert intervenant-photos"
  on storage.objects for insert
  with check (bucket_id = 'intervenant-photos');

create policy "Public update intervenant-photos"
  on storage.objects for update
  using (bucket_id = 'intervenant-photos')
  with check (bucket_id = 'intervenant-photos');

create policy "Public delete intervenant-photos"
  on storage.objects for delete
  using (bucket_id = 'intervenant-photos');

```

### supabase/migrations/20260728_intervenant_checklist_templates.sql

```sql
-- "Mes modèles" (components/MyChecklist.tsx) — permet à un intervenant de
-- sauvegarder une checklist perso (créée via "+ Créer une checklist") comme
-- modèle réutilisable, puis de l'importer dans un autre dossier patient.
-- Identité cross-space par téléphone normalisé (chiffres seuls, voir
-- lib/phone.ts normalizePhone), même principe que "Mes espaces"
-- (app/(visitor)/account.tsx, linkedSpaces) — volontairement sans space_id
-- puisque l'intérêt du modèle est d'exister indépendamment d'un espace
-- patient précis. items est un tableau de titres à plat (pas de statut :
-- un modèle n'est jamais "fait", seule sa copie importée dans
-- personal_checklist_items l'est).
create table if not exists public.intervenant_checklist_templates (
  id uuid primary key default gen_random_uuid(),
  telephone text not null,
  name text not null,
  items text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (telephone, name)
);

alter table public.intervenant_checklist_templates enable row level security;

-- Même modèle que personal_checklist_items : RLS ouvert, contrôle d'accès
-- géré côté app (pas de vrais comptes intervenant, identité = téléphone
-- renseigné dans la fiche).
create policy "public read intervenant checklist templates"
  on public.intervenant_checklist_templates for select
  using (true);

create policy "public write intervenant checklist templates"
  on public.intervenant_checklist_templates for insert
  with check (true);

create policy "public update intervenant checklist templates"
  on public.intervenant_checklist_templates for update
  using (true);

create policy "public delete intervenant checklist templates"
  on public.intervenant_checklist_templates for delete
  using (true);

create index if not exists intervenant_checklist_templates_telephone_idx
  on public.intervenant_checklist_templates (telephone);

```

### supabase/migrations/20260813_intervenant_profiles_metier_secondaire.sql

```sql
-- 2ᵉ spécialisation optionnelle sur la fiche intervenant — permet à un
-- intervenant d'ajouter un second métier (avec ses propres soins suggérés)
-- en plus de son métier principal (intervenant_profiles.metier), voir
-- IntervenantFicheModal.tsx.
alter table public.intervenant_profiles
  add column if not exists metier_secondaire text;

```

### supabase/migrations/20260813_night_authorized_intervenants.sql

```sql
-- Autorisation MULTIPLE des intervenants à réserver une nuitée : remplace le
-- single night_intervenant_profile_id (un seul intervenant désigné, mode
-- "one") par une table de liaison, même principe que night_authorized_visitors
-- (20260813_slot_config_night_visitor_mode.sql) côté visiteurs. Le mode "one"
-- devient "some" (plusieurs intervenants possibles) ; les réglages existants
-- sont migrés automatiquement vers la nouvelle table.

-- La contrainte doit être retirée AVANT l'UPDATE (sinon il viole l'ancienne
-- contrainte 'disabled'/'one'/'all' dès qu'une ligne vaut encore 'one'), et
-- rajoutée seulement APRÈS l'UPDATE (sinon ADD CONSTRAINT la valide contre les
-- lignes encore à 'one', qui ne sont pas dans la nouvelle liste autorisée).
alter table public.slot_config
  drop constraint if exists slot_config_night_intervenant_mode_check;

update public.slot_config
  set night_intervenant_mode = 'some'
  where night_intervenant_mode = 'one';

alter table public.slot_config
  add constraint slot_config_night_intervenant_mode_check
  check (night_intervenant_mode in ('disabled', 'some', 'all'));

create table if not exists public.night_authorized_intervenants (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.patient_spaces(id) on delete cascade,
  intervenant_profile_id uuid not null references public.intervenant_profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.night_authorized_intervenants
  drop constraint if exists night_authorized_intervenants_unique;
alter table public.night_authorized_intervenants
  add constraint night_authorized_intervenants_unique unique (space_id, intervenant_profile_id);

-- Backfill depuis l'ancien night_intervenant_profile_id (mode "some" ex-"one")
insert into public.night_authorized_intervenants (space_id, intervenant_profile_id)
select space_id, night_intervenant_profile_id
from public.slot_config
where night_intervenant_mode = 'some' and night_intervenant_profile_id is not null
on conflict do nothing;

alter table public.night_authorized_intervenants enable row level security;

drop policy if exists "public can manage night_authorized_intervenants" on public.night_authorized_intervenants;
create policy "public can manage night_authorized_intervenants"
  on public.night_authorized_intervenants
  for all
  to public
  using (true)
  with check (true);

-- Remplacé par la table de liaison ci-dessus, plus lu ni écrit côté client.
alter table public.slot_config
  drop column if exists night_intervenant_profile_id;

```

### supabase/migrations/20260813_slot_config_night_intervenant_mode.sql

```sql
-- Autorisation des intervenants à réserver des nuitées (type 'Nuit'),
-- configurable par l'admin : "disabled" (défaut — aucun intervenant ne peut
-- réserver, comportement identique à avant cette migration puisque
-- app/(visitor)/home/nights.tsx ne montrait déjà cette possibilité qu'aux
-- visiteurs), "one" (un seul intervenant désigné, night_intervenant_profile_id)
-- ou "all" (tous les intervenants). Même principe que
-- slot_config.intervenant_priority_mode (20260722) : réglage live, pas de
-- passage par apply_slot_rule_change ni de suivi dans slot_config_history —
-- voir components/NightIntervenantModal.tsx.

alter table slot_config
  add column if not exists night_intervenant_mode text not null default 'disabled'
    check (night_intervenant_mode in ('disabled', 'one', 'all'));

alter table slot_config
  add column if not exists night_intervenant_profile_id uuid references intervenant_profiles(id) on delete set null;

```

### supabase/migrations/20260814_news_intervenant_mode.sql

```sql
-- Remplace le toggle unique patient_spaces.intervenant_news_visible_to_visitors
-- (tout ou rien pour intervenants+admin ensemble) par un réglage géré depuis
-- Paramètres > Règles > Planning des intervenants, même principe que
-- night_intervenant_mode (components/NightIntervenantModal.tsx) : "disabled"
-- (défaut, canal intervenants+admin non visible des visiteurs — comportement
-- historique), "some" (seuls les intervenants listés dans
-- news_authorized_intervenants), "all" (tous les intervenants). Voir
-- components/NewsIntervenantModal.tsx.
--
-- news_entries.intervenant_profile_id identifie l'intervenant auteur d'une
-- nouvelle (rempli uniquement quand author_role = 'intervenant'), nécessaire
-- pour vérifier son autorisation en mode "some" — voir components/NewsFeed.tsx.
--
-- L'admin reste groupé avec les intervenants dans le canal privé : ses
-- propres publications suivent la même règle qu'eux, sans réglage séparé —
-- visibles des visiteurs seulement en mode "all" ("some" ne s'applique qu'aux
-- intervenants listés dans news_authorized_intervenants, l'admin n'y a pas sa
-- place). Voir components/NewsFeed.tsx (isNewsEntryVisibleToVisitor).

alter table public.slot_config
  add column if not exists news_intervenant_mode text not null default 'disabled'
    check (news_intervenant_mode in ('disabled', 'some', 'all'));

create table if not exists public.news_authorized_intervenants (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.patient_spaces(id) on delete cascade,
  intervenant_profile_id uuid not null references public.intervenant_profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.news_authorized_intervenants
  drop constraint if exists news_authorized_intervenants_unique;
alter table public.news_authorized_intervenants
  add constraint news_authorized_intervenants_unique unique (space_id, intervenant_profile_id);

alter table public.news_authorized_intervenants enable row level security;

drop policy if exists "public can manage news_authorized_intervenants" on public.news_authorized_intervenants;
create policy "public can manage news_authorized_intervenants"
  on public.news_authorized_intervenants
  for all
  to public
  using (true)
  with check (true);

alter table public.news_entries
  add column if not exists intervenant_profile_id uuid references public.intervenant_profiles(id) on delete set null;

-- Remplacé par news_intervenant_mode/news_authorized_intervenants ci-dessus,
-- plus lu ni écrit côté client (voir components/NewsFeed.tsx).
alter table public.patient_spaces
  drop column if exists intervenant_news_visible_to_visitors;

```

### supabase/migrations/20260815_intervention_types_intervenant_identity.sql

```sql
-- Ajoute prenom/nom/metier de l'intervenant directement sur intervention_types
-- (dénormalisé depuis intervenant_profiles) — pratique pour parcourir la
-- table dans l'éditeur Supabase sans jointure. Contrairement au libellé/durée
-- copiés une fois pour toutes sur reservations au moment de la réservation
-- (voir migration 20260717_reservations_intervention_columns.sql),
-- intervention_types représente toujours l'offre *actuelle* d'un intervenant :
-- ces colonnes restent donc synchronisées en continu via triggers plutôt que
-- figées à la création.

alter table public.intervention_types
  add column if not exists prenom text,
  add column if not exists nom text,
  add column if not exists metier text;

update public.intervention_types it
set prenom = ip.prenom, nom = ip.nom, metier = ip.metier
from public.intervenant_profiles ip
where it.intervenant_profile_id = ip.id;

-- Remplit/actualise prenom/nom/metier à chaque insert, et si
-- intervenant_profile_id change (cas normalement rare).
create or replace function public.sync_intervention_type_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select prenom, nom, metier into new.prenom, new.nom, new.metier
  from intervenant_profiles
  where id = new.intervenant_profile_id;
  return new;
end;
$$;

drop trigger if exists trg_sync_intervention_type_identity on public.intervention_types;
create trigger trg_sync_intervention_type_identity
  before insert or update of intervenant_profile_id on public.intervention_types
  for each row execute function public.sync_intervention_type_identity();

-- Répercute un changement de prenom/nom/metier sur intervenant_profiles vers
-- tous les intervention_types de ce profil (sinon les colonnes ci-dessus
-- deviennent obsolètes dès la première modification de la fiche intervenant,
-- voir components/IntervenantFicheModal.tsx).
create or replace function public.sync_intervention_types_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.prenom is distinct from old.prenom
     or new.nom is distinct from old.nom
     or new.metier is distinct from old.metier then
    update intervention_types
    set prenom = new.prenom, nom = new.nom, metier = new.metier
    where intervenant_profile_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_intervention_types_from_profile on public.intervenant_profiles;
create trigger trg_sync_intervention_types_from_profile
  after update of prenom, nom, metier on public.intervenant_profiles
  for each row execute function public.sync_intervention_types_from_profile();

```

### supabase/migrations/20260815_apply_slot_rule_change_skip_already_past_slots.sql

```sql
-- apply_slot_rule_change() ne devait toucher que les réservations "à
-- venir", mais son filtre `date >= current_date` laisse passer les
-- créneaux du jour même déjà passés en heure (ex. un changement de règles
-- fait à 17h ne devrait plus pouvoir recaser/suspendre une visite de 10h
-- ce même jour — elle a déjà eu lieu). `current_date` seul ignore l'heure
-- murale ; on calcule maintenant l'heure Europe/Paris (le serveur tourne
-- en UTC) et on exclut, pour les cohortes "Visite" candidates au
-- recasage/à la suspension "1 visite par jour", tout créneau du jour même
-- dont l'heure de début est déjà dépassée. Les nuitées restent traitées
-- au jour près uniquement (comme isReservationDatePast côté client :
-- l'heure du jour n'entre pas en jeu pour une "Nuit", qui couvre toute la
-- soirée/nuit) — aucun changement sur ce point.
--
-- Signature et reste du corps inchangés par rapport à
-- supabase/migrations/20260815_fix_book_intervention_same_day_rebook_order.sql
-- (recasage vers le prochain créneau libre, pas le plus proche).

create or replace function public.apply_slot_rule_change(
  p_space_id uuid,
  p_new_config jsonb,
  p_new_slots text[]
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old slot_config%rowtype;

  v_visit_start_hour integer;
  v_visit_end_hour integer;
  v_slot_duration_minutes integer;
  v_min_gap_minutes integer;
  v_gap_includes_duration boolean;
  v_max_visitors_per_slot integer;
  v_allowed_weekdays integer[];
  v_blocked_dates text[];
  v_blocked_date_reasons jsonb;
  v_night_enabled boolean;
  v_night_start_hour integer;
  v_night_end_hour integer;
  v_max_night_visitors integer;
  v_one_visit_per_day boolean;

  v_structural_change boolean;
  v_weekday_blocked_changed boolean;
  v_night_scan_needed boolean;
  v_night_became_disabled boolean;
  v_one_visit_activated boolean;

  v_rebooked uuid[] := array[]::uuid[];
  v_night_cancelled uuid[] := array[]::uuid[];
  v_failed uuid[] := array[]::uuid[];
  v_day_cap_suspended uuid[] := array[]::uuid[];

  v_cohort record;
  v_night record;
  v_same_day_slots text[];
  v_day_slots text[];
  v_candidate_date date;
  v_candidate_slot text;
  v_target_date date;
  v_target_creneau text;
  v_found boolean;
  v_occ_count integer;
  v_overlaps_intervention boolean;
  v_night_invalid boolean;
  v_i integer;

  v_daycap_date date;
  v_winning_cohort uuid;
  v_loser record;

  v_today date;
  v_now_minutes integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_space_id::text));

  p_new_slots := coalesce(p_new_slots, array[]::text[]);

  -- Heure murale Europe/Paris (le serveur tourne en UTC) — sert à ne
  -- jamais recaser/suspendre une réservation "Visite" dont le créneau du
  -- jour même est déjà passé, même si son jour est bien >= aujourd'hui.
  v_today := (now() at time zone 'Europe/Paris')::date;
  v_now_minutes := extract(hour from (now() at time zone 'Europe/Paris'))::integer * 60
    + extract(minute from (now() at time zone 'Europe/Paris'))::integer;

  select * into v_old from slot_config where space_id = p_space_id;
  if not found then
    raise exception 'NO_SLOT_CONFIG_FOR_SPACE';
  end if;

  v_visit_start_hour := case when p_new_config ? 'visit_start_hour'
    then (p_new_config->>'visit_start_hour')::integer else v_old.visit_start_hour end;
  v_visit_end_hour := case when p_new_config ? 'visit_end_hour'
    then (p_new_config->>'visit_end_hour')::integer else v_old.visit_end_hour end;
  v_slot_duration_minutes := case when p_new_config ? 'slot_duration_minutes'
    then (p_new_config->>'slot_duration_minutes')::integer else v_old.slot_duration_minutes end;
  v_min_gap_minutes := case when p_new_config ? 'min_gap_minutes'
    then (p_new_config->>'min_gap_minutes')::integer else v_old.min_gap_minutes end;
  v_gap_includes_duration := case when p_new_config ? 'gap_includes_duration'
    then (p_new_config->>'gap_includes_duration')::boolean else v_old.gap_includes_duration end;
  v_max_visitors_per_slot := case when p_new_config ? 'max_visitors_per_slot'
    then (p_new_config->>'max_visitors_per_slot')::integer else v_old.max_visitors_per_slot end;
  v_allowed_weekdays := case when p_new_config ? 'allowed_weekdays'
    then (select coalesce(array_agg(x::integer), array[]::integer[]) from jsonb_array_elements_text(p_new_config->'allowed_weekdays') x)
    else v_old.allowed_weekdays end;
  v_blocked_dates := case when p_new_config ? 'blocked_dates'
    then (select coalesce(array_agg(x), array[]::text[]) from jsonb_array_elements_text(p_new_config->'blocked_dates') x)
    else v_old.blocked_dates end;
  v_blocked_date_reasons := case when p_new_config ? 'blocked_date_reasons'
    then (p_new_config->'blocked_date_reasons') else v_old.blocked_date_reasons end;
  v_night_enabled := case when p_new_config ? 'night_enabled'
    then (p_new_config->>'night_enabled')::boolean else v_old.night_enabled end;
  v_night_start_hour := case when p_new_config ? 'night_start_hour'
    then (p_new_config->>'night_start_hour')::integer else v_old.night_start_hour end;
  v_night_end_hour := case when p_new_config ? 'night_end_hour'
    then (p_new_config->>'night_end_hour')::integer else v_old.night_end_hour end;
  v_max_night_visitors := case when p_new_config ? 'max_night_visitors'
    then (p_new_config->>'max_night_visitors')::integer else v_old.max_night_visitors end;
  v_one_visit_per_day := case when p_new_config ? 'one_visit_per_day'
    then (p_new_config->>'one_visit_per_day')::boolean else v_old.one_visit_per_day end;

  -- 1. Historique + config live
  insert into slot_config_history (
    space_id, valid_from, visit_start_hour, visit_end_hour, slot_duration_minutes,
    min_gap_minutes, gap_includes_duration, max_visitors_per_slot, allowed_weekdays,
    blocked_dates, blocked_date_reasons, night_enabled, night_start_hour,
    night_end_hour, max_night_visitors, one_visit_per_day
  ) values (
    p_space_id, current_date, v_visit_start_hour, v_visit_end_hour, v_slot_duration_minutes,
    v_min_gap_minutes, v_gap_includes_duration, v_max_visitors_per_slot, v_allowed_weekdays,
    v_blocked_dates, v_blocked_date_reasons, v_night_enabled, v_night_start_hour,
    v_night_end_hour, v_max_night_visitors, v_one_visit_per_day
  )
  on conflict (space_id, valid_from) do update set
    visit_start_hour = excluded.visit_start_hour,
    visit_end_hour = excluded.visit_end_hour,
    slot_duration_minutes = excluded.slot_duration_minutes,
    min_gap_minutes = excluded.min_gap_minutes,
    gap_includes_duration = excluded.gap_includes_duration,
    max_visitors_per_slot = excluded.max_visitors_per_slot,
    allowed_weekdays = excluded.allowed_weekdays,
    blocked_dates = excluded.blocked_dates,
    blocked_date_reasons = excluded.blocked_date_reasons,
    night_enabled = excluded.night_enabled,
    night_start_hour = excluded.night_start_hour,
    night_end_hour = excluded.night_end_hour,
    max_night_visitors = excluded.max_night_visitors,
    one_visit_per_day = excluded.one_visit_per_day;

  update slot_config set
    visit_start_hour = v_visit_start_hour,
    visit_end_hour = v_visit_end_hour,
    slot_duration_minutes = v_slot_duration_minutes,
    min_gap_minutes = v_min_gap_minutes,
    gap_includes_duration = v_gap_includes_duration,
    max_visitors_per_slot = v_max_visitors_per_slot,
    allowed_weekdays = v_allowed_weekdays,
    blocked_dates = v_blocked_dates,
    blocked_date_reasons = v_blocked_date_reasons,
    night_enabled = v_night_enabled,
    night_start_hour = v_night_start_hour,
    night_end_hour = v_night_end_hour,
    max_night_visitors = v_max_night_visitors,
    one_visit_per_day = v_one_visit_per_day
  where space_id = p_space_id;

  v_weekday_blocked_changed := (v_allowed_weekdays is distinct from v_old.allowed_weekdays)
    or (v_blocked_dates is distinct from v_old.blocked_dates);

  v_structural_change := v_weekday_blocked_changed
    or (v_visit_start_hour is distinct from v_old.visit_start_hour)
    or (v_visit_end_hour is distinct from v_old.visit_end_hour)
    or (v_slot_duration_minutes is distinct from v_old.slot_duration_minutes)
    or (v_min_gap_minutes is distinct from v_old.min_gap_minutes)
    or (v_gap_includes_duration is distinct from v_old.gap_includes_duration)
    or (v_max_visitors_per_slot is distinct from v_old.max_visitors_per_slot);

  v_night_became_disabled := v_old.night_enabled and not v_night_enabled;
  v_night_scan_needed := v_night_became_disabled or v_weekday_blocked_changed;
  v_one_visit_activated := (not coalesce(v_old.one_visit_per_day, false)) and coalesce(v_one_visit_per_day, false);

  -- 2. Recasage des réservations "Visite" futures invalidées — jamais un
  -- créneau du jour même déjà passé en heure (v_today/v_now_minutes).
  if v_structural_change then
    for v_cohort in
      select
        coalesce(group_id, id) as cohort_key,
        (array_agg(date order by created_at))[1] as cohort_date,
        (array_agg(creneau order by created_at))[1] as cohort_creneau,
        array_agg(id order by created_at) as member_ids,
        count(*) as cohort_size
      from reservations
      where space_id = p_space_id and type = 'Visite'
        and (date > v_today or (date = v_today and to_minutes(creneau) > v_now_minutes))
      group by coalesce(group_id, id)
      order by min(created_at) asc
    loop
      v_found := (v_cohort.cohort_creneau = any(p_new_slots))
        and (extract(dow from v_cohort.cohort_date)::integer = any(v_allowed_weekdays))
        and not (to_char(v_cohort.cohort_date, 'YYYY-MM-DD') = any(v_blocked_dates));

      if v_found then
        select count(*) into v_occ_count from reservations
          where space_id = p_space_id and date = v_cohort.cohort_date and creneau = v_cohort.cohort_creneau
            and type = 'Visite' and not (id = any(v_cohort.member_ids));
        if v_occ_count + v_cohort.cohort_size > v_max_visitors_per_slot then
          v_found := false;
        end if;
      end if;

      if v_found then
        continue; -- créneau toujours valide et non-saturé, rien à faire
      end if;

      -- Créneaux du même jour STRICTEMENT postérieurs au créneau d'origine,
      -- triés par ordre chronologique croissant (le prochain créneau libre
      -- d'abord) — voir commentaire en tête de fichier. Repli jour par jour
      -- (ordre chronologique de p_new_slots) si aucun ne convient.
      select coalesce(array_agg(s order by to_minutes(s)), array[]::text[])
        into v_same_day_slots
        from unnest(p_new_slots) s
        where to_minutes(s) > to_minutes(v_cohort.cohort_creneau);

      v_target_date := null;
      v_target_creneau := null;

      <<day_loop>>
      for v_i in 0..60 loop
        v_candidate_date := v_cohort.cohort_date + v_i;

        if not (extract(dow from v_candidate_date)::integer = any(v_allowed_weekdays)) then
          continue;
        end if;
        if to_char(v_candidate_date, 'YYYY-MM-DD') = any(v_blocked_dates) then
          continue;
        end if;

        v_day_slots := case when v_i = 0 then v_same_day_slots else p_new_slots end;

        foreach v_candidate_slot in array v_day_slots loop
          select count(*) into v_occ_count from reservations
            where space_id = p_space_id and date = v_candidate_date and creneau = v_candidate_slot
              and type = 'Visite' and not (id = any(v_cohort.member_ids));

          -- Ajout intervenants : un créneau déjà couvert par une intervention
          -- (prioritaire) n'est jamais un candidat valide.
          select exists (
            select 1 from reservations
            where space_id = p_space_id and date = v_candidate_date and type = 'Intervention'
              and to_minutes(creneau) < to_minutes(v_candidate_slot) + v_slot_duration_minutes
              and to_minutes(creneau) + coalesce(duration_minutes, 0) > to_minutes(v_candidate_slot)
          ) into v_overlaps_intervention;

          if v_occ_count + v_cohort.cohort_size <= v_max_visitors_per_slot and not v_overlaps_intervention then
            v_target_date := v_candidate_date;
            v_target_creneau := v_candidate_slot;
            exit day_loop;
          end if;
        end loop;
      end loop day_loop;

      if v_target_date is not null then
        update reservations set
          date = v_target_date,
          creneau = v_target_creneau,
          previous_date = date,
          previous_creneau = creneau,
          alert_type = 'rebooked',
          alert_message = 'Suite à une modification des règles de visite, votre réservation du '
            || to_char(v_cohort.cohort_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
            || ' a été automatiquement déplacée au ' || to_char(v_target_date, 'DD/MM/YYYY')
            || ' à ' || v_target_creneau || '.',
          alert_seen = false
        where id = any(v_cohort.member_ids);

        insert into reservation_change_history (
          space_id, reservation_id, prenom, nom, type, change_type,
          previous_date, previous_creneau, new_date, new_creneau, message
        )
        select p_space_id, id, prenom, nom, type, 'rebooked',
          v_cohort.cohort_date, v_cohort.cohort_creneau, v_target_date, v_target_creneau,
          'Suite à une modification des règles de visite, réservation du '
            || to_char(v_cohort.cohort_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
            || ' automatiquement déplacée au ' || to_char(v_target_date, 'DD/MM/YYYY')
            || ' à ' || v_target_creneau || '.'
        from reservations where id = any(v_cohort.member_ids);

        v_rebooked := v_rebooked || v_cohort.member_ids;
      else
        update reservations set
          alert_type = 'rebooking_failed',
          alert_message = 'Suite à une modification des règles de visite, votre réservation du '
            || to_char(v_cohort.cohort_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
            || ' n''a pas pu être automatiquement replacée. Merci de contacter l''organisateur '
            || 'pour choisir un nouveau créneau.',
          alert_seen = false
        where id = any(v_cohort.member_ids);

        insert into reservation_change_history (
          space_id, reservation_id, prenom, nom, type, change_type,
          previous_date, previous_creneau, new_date, new_creneau, message
        )
        select p_space_id, id, prenom, nom, type, 'rebooking_failed',
          v_cohort.cohort_date, v_cohort.cohort_creneau, null, null,
          'Suite à une modification des règles de visite, réservation du '
            || to_char(v_cohort.cohort_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
            || ' n''a pas pu être automatiquement replacée.'
        from reservations where id = any(v_cohort.member_ids);

        v_failed := v_failed || v_cohort.member_ids;
      end if;
    end loop;
  end if;

  -- 3. Nuitées invalidées : message seul, jamais de déplacement/suppression.
  -- Contrairement aux visites, l'heure du jour n'entre pas en jeu pour une
  -- "Nuit" (elle couvre toute la soirée) — seul le jour compte, comme
  -- isReservationDatePast côté client.
  if v_night_scan_needed then
    for v_night in
      select id, date from reservations
      where space_id = p_space_id and type = 'Nuit' and date >= v_today
    loop
      v_night_invalid := v_night_became_disabled
        or not (extract(dow from v_night.date)::integer = any(v_allowed_weekdays))
        or (to_char(v_night.date, 'YYYY-MM-DD') = any(v_blocked_dates));

      if v_night_invalid then
        update reservations set
          alert_type = 'night_cancelled',
          alert_message = 'Nuitée annulée suite au changement de consignes.',
          alert_seen = false
        where id = v_night.id;

        insert into reservation_change_history (
          space_id, reservation_id, prenom, nom, type, change_type,
          previous_date, previous_creneau, new_date, new_creneau, message
        )
        select p_space_id, id, prenom, nom, type, 'night_cancelled',
          date, creneau, date, creneau, 'Nuitée annulée suite au changement de consignes.'
        from reservations where id = v_night.id;

        v_night_cancelled := v_night_cancelled || v_night.id;
      end if;
    end loop;
  end if;

  -- 4. Activation du mode "1 visite / jour" : ne touche jamais le passé
  -- (jour révolu, ou créneau du jour même déjà passé en heure), et ne
  -- déplace ni ne supprime rien — pour chaque jour où plusieurs réservations
  -- "Visite" à venir existent déjà, la première enregistrée (created_at le
  -- plus ancien) reste active, toutes les autres sont marquées
  -- "day_cap_suspended".
  if v_one_visit_activated then
    for v_daycap_date in
      select date
      from reservations
      where space_id = p_space_id and type = 'Visite'
        and (date > v_today or (date = v_today and to_minutes(creneau) > v_now_minutes))
      group by date
      having count(distinct coalesce(group_id, id)) > 1
    loop
      select coalesce(group_id, id) into v_winning_cohort
      from reservations
      where space_id = p_space_id and type = 'Visite' and date = v_daycap_date
        and (v_daycap_date > v_today or to_minutes(creneau) > v_now_minutes)
      group by coalesce(group_id, id)
      order by min(created_at) asc
      limit 1;

      for v_loser in
        select id, prenom, nom, type, date, creneau
        from reservations
        where space_id = p_space_id and type = 'Visite' and date = v_daycap_date
          and (v_daycap_date > v_today or to_minutes(creneau) > v_now_minutes)
          and coalesce(group_id, id) <> v_winning_cohort
      loop
        update reservations set
          alert_type = 'day_cap_suspended',
          alert_message = 'Le mode "1 visite par jour" a été activé : votre réservation du '
            || to_char(v_loser.date, 'DD/MM/YYYY') || ' à ' || v_loser.creneau
            || ' a été suspendue car une autre réservation existait déjà ce jour-là. '
            || 'Modifiez-la pour choisir un autre jour.',
          alert_seen = false
        where id = v_loser.id;

        insert into reservation_change_history (
          space_id, reservation_id, prenom, nom, type, change_type,
          previous_date, previous_creneau, new_date, new_creneau, message
        ) values (
          p_space_id, v_loser.id, v_loser.prenom, v_loser.nom, v_loser.type, 'day_cap_suspended',
          v_loser.date, v_loser.creneau, v_loser.date, v_loser.creneau,
          'Réservation du ' || to_char(v_loser.date, 'DD/MM/YYYY') || ' à ' || v_loser.creneau
            || ' suspendue suite à l''activation du mode "1 visite par jour".'
        );

        v_day_cap_suspended := v_day_cap_suspended || v_loser.id;
      end loop;
    end loop;
  end if;

  return jsonb_build_object(
    'rebooked', to_jsonb(v_rebooked),
    'night_cancelled', to_jsonb(v_night_cancelled),
    'failed', to_jsonb(v_failed),
    'day_cap_suspended', to_jsonb(v_day_cap_suspended)
  );
end;
$$;

```

### supabase/migrations/20260815_fix_book_intervention_same_day_rebook_order.sql

```sql
-- Corrige le recasage automatique des visites (book_intervention() ET
-- apply_slot_rule_change()) : la recherche du "créneau valide le plus
-- proche" côté même jour triait les candidats par distance ABSOLUE au
-- créneau d'origine (abs(to_minutes(s) - to_minutes(cohort_creneau))). Une
-- visite à 14h40 pouvait donc être recasée à 14h20 (20 min d'écart) plutôt
-- qu'à 16h00 (80 min d'écart) si 14h20 était libre — alors qu'un horaire
-- ANTÉRIEUR à la réservation d'origine n'a aucun sens pour un "recasage vers
-- le prochain créneau disponible". On ne trie plus que les créneaux
-- strictement postérieurs au créneau d'origine, par ordre chronologique
-- croissant (le plus proche dans le futur en premier) ; le reste de
-- l'algorithme (vérif capacité/chevauchement intervention dans la boucle,
-- repli jour par jour si aucun créneau du jour même ne convient) est
-- inchangé.

create or replace function public.book_intervention(
  p_space_id uuid,
  p_intervenant_profile_id uuid,
  p_intervention_type_id uuid,
  p_date date,
  p_start_slot text,
  p_pin text,
  p_slots text[]
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prenom text;
  v_nom text;
  v_duration_minutes integer;
  v_label text;
  v_start_min integer;
  v_end_min integer;
  v_config slot_config%rowtype;
  v_priority boolean;
  v_intervention_id uuid;

  v_rebooked uuid[] := array[]::uuid[];
  v_failed uuid[] := array[]::uuid[];

  v_cohort record;
  v_same_day_slots text[];
  v_day_slots text[];
  v_candidate_date date;
  v_candidate_slot text;
  v_target_date date;
  v_target_creneau text;
  v_found boolean;
  v_occ_count integer;
  v_overlaps_intervention boolean;
  v_i integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_space_id::text));

  p_slots := coalesce(p_slots, array[]::text[]);

  select prenom, nom into v_prenom, v_nom
    from intervenant_profiles
    where id = p_intervenant_profile_id and space_id = p_space_id;
  if not found then
    raise exception 'INTERVENANT_NOT_FOUND';
  end if;

  select label, duration_minutes into v_label, v_duration_minutes
    from intervention_types
    where id = p_intervention_type_id and intervenant_profile_id = p_intervenant_profile_id;
  if not found then
    raise exception 'INTERVENTION_TYPE_NOT_FOUND';
  end if;

  v_start_min := to_minutes(p_start_slot);
  v_end_min := v_start_min + v_duration_minutes;
  if v_end_min > 1440 then
    raise exception 'INTERVENTION_CROSSES_MIDNIGHT';
  end if;

  -- Un même intervenant ne peut pas chevaucher deux de ses propres
  -- interventions ce jour-là (des intervenants différents peuvent en
  -- revanche intervenir en même temps — ex. infirmière + kiné).
  if exists (
    select 1 from reservations
    where space_id = p_space_id
      and type = 'Intervention'
      and date = p_date
      and intervenant_profile_id = p_intervenant_profile_id
      and to_minutes(creneau) < v_end_min
      and to_minutes(creneau) + coalesce(duration_minutes, 0) > v_start_min
  ) then
    raise exception 'INTERVENTION_OVERLAP_SELF';
  end if;

  select * into v_config from slot_config where space_id = p_space_id;
  if not found then
    raise exception 'NO_SLOT_CONFIG_FOR_SPACE';
  end if;

  select (coalesce(v_config.intervenant_priority_mode, 'all') = 'all' or coalesce(priority_slots, true))
    into v_priority
    from intervenant_profiles where id = p_intervenant_profile_id;

  insert into reservations (
    space_id, date, creneau, prenom, nom, telephone, type, pin,
    duration_minutes, intervention_label, intervenant_profile_id
  ) values (
    p_space_id, p_date, p_start_slot, v_prenom, v_nom, '', 'Intervention', p_pin,
    v_duration_minutes, v_label, p_intervenant_profile_id
  )
  returning id into v_intervention_id;

  -- Recasage des cohortes "Visite" dont le créneau chevauche la fenêtre de
  -- l'intervention qu'on vient d'insérer — uniquement si elle est prioritaire.
  if v_priority then
  for v_cohort in
    select
      coalesce(group_id, id) as cohort_key,
      (array_agg(creneau order by created_at))[1] as cohort_creneau,
      array_agg(id order by created_at) as member_ids,
      count(*) as cohort_size
    from reservations
    where space_id = p_space_id and type = 'Visite' and date = p_date
    group by coalesce(group_id, id)
    having to_minutes((array_agg(creneau order by created_at))[1]) < v_end_min
       and to_minutes((array_agg(creneau order by created_at))[1]) + v_config.slot_duration_minutes > v_start_min
  loop
    -- Créneaux du même jour STRICTEMENT postérieurs au créneau d'origine,
    -- triés par ordre chronologique croissant (le prochain créneau libre
    -- d'abord) — voir commentaire en tête de fichier.
    select coalesce(array_agg(s order by to_minutes(s)), array[]::text[])
      into v_same_day_slots
      from unnest(p_slots) s
      where to_minutes(s) > to_minutes(v_cohort.cohort_creneau);

    v_target_date := null;
    v_target_creneau := null;

    <<day_loop>>
    for v_i in 0..60 loop
      v_candidate_date := p_date + v_i;

      if not (extract(dow from v_candidate_date)::integer = any(v_config.allowed_weekdays)) then
        continue;
      end if;
      if to_char(v_candidate_date, 'YYYY-MM-DD') = any(v_config.blocked_dates) then
        continue;
      end if;

      v_day_slots := case when v_i = 0 then v_same_day_slots else p_slots end;

      foreach v_candidate_slot in array v_day_slots loop
        select count(*) into v_occ_count from reservations
          where space_id = p_space_id and date = v_candidate_date and creneau = v_candidate_slot
            and type = 'Visite' and not (id = any(v_cohort.member_ids));

        select exists (
          select 1 from reservations
          where space_id = p_space_id and date = v_candidate_date and type = 'Intervention'
            and to_minutes(creneau) < to_minutes(v_candidate_slot) + v_config.slot_duration_minutes
            and to_minutes(creneau) + coalesce(duration_minutes, 0) > to_minutes(v_candidate_slot)
        ) into v_overlaps_intervention;

        if v_occ_count + v_cohort.cohort_size <= v_config.max_visitors_per_slot and not v_overlaps_intervention then
          v_target_date := v_candidate_date;
          v_target_creneau := v_candidate_slot;
          exit day_loop;
        end if;
      end loop;
    end loop day_loop;

    if v_target_date is not null then
      update reservations set
        date = v_target_date,
        creneau = v_target_creneau,
        previous_date = date,
        previous_creneau = creneau,
        alert_type = 'rebooked',
        alert_message = 'Une intervention (' || v_label || ') est prioritaire sur votre créneau du '
          || to_char(p_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
          || '. Votre réservation a été automatiquement déplacée au '
          || to_char(v_target_date, 'DD/MM/YYYY') || ' à ' || v_target_creneau || '.',
        alert_seen = false
      where id = any(v_cohort.member_ids);

      insert into reservation_change_history (
        space_id, reservation_id, prenom, nom, type, change_type,
        previous_date, previous_creneau, new_date, new_creneau, message
      )
      select p_space_id, id, prenom, nom, type, 'rebooked',
        p_date, v_cohort.cohort_creneau, v_target_date, v_target_creneau,
        'Créneau prioritaire attribué à une intervention (' || v_label || '), réservation du '
          || to_char(p_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
          || ' automatiquement déplacée au ' || to_char(v_target_date, 'DD/MM/YYYY')
          || ' à ' || v_target_creneau || '.'
      from reservations where id = any(v_cohort.member_ids);

      v_rebooked := v_rebooked || v_cohort.member_ids;
    else
      update reservations set
        alert_type = 'rebooking_failed',
        alert_message = 'Une intervention (' || v_label || ') est prioritaire sur votre créneau du '
          || to_char(p_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
          || '. Nous n''avons pas pu automatiquement replacer votre réservation. '
          || 'Merci de contacter l''organisateur pour choisir un nouveau créneau.',
        alert_seen = false
      where id = any(v_cohort.member_ids);

      insert into reservation_change_history (
        space_id, reservation_id, prenom, nom, type, change_type,
        previous_date, previous_creneau, new_date, new_creneau, message
      )
      select p_space_id, id, prenom, nom, type, 'rebooking_failed',
        p_date, v_cohort.cohort_creneau, null, null,
        'Créneau prioritaire attribué à une intervention (' || v_label || '), réservation du '
          || to_char(p_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
          || ' n''a pas pu être automatiquement replacée.'
      from reservations where id = any(v_cohort.member_ids);

      v_failed := v_failed || v_cohort.member_ids;
    end if;
  end loop;
  end if;

  return jsonb_build_object(
    'intervention_id', v_intervention_id,
    'rebooked', to_jsonb(v_rebooked),
    'failed', to_jsonb(v_failed)
  );
end;
$$;

grant execute on function public.book_intervention(uuid, uuid, uuid, date, text, text, text[])
  to anon, authenticated;

create or replace function public.apply_slot_rule_change(
  p_space_id uuid,
  p_new_config jsonb,
  p_new_slots text[]
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old slot_config%rowtype;

  v_visit_start_hour integer;
  v_visit_end_hour integer;
  v_slot_duration_minutes integer;
  v_min_gap_minutes integer;
  v_gap_includes_duration boolean;
  v_max_visitors_per_slot integer;
  v_allowed_weekdays integer[];
  v_blocked_dates text[];
  v_blocked_date_reasons jsonb;
  v_night_enabled boolean;
  v_night_start_hour integer;
  v_night_end_hour integer;
  v_max_night_visitors integer;
  v_one_visit_per_day boolean;

  v_structural_change boolean;
  v_weekday_blocked_changed boolean;
  v_night_scan_needed boolean;
  v_night_became_disabled boolean;
  v_one_visit_activated boolean;

  v_rebooked uuid[] := array[]::uuid[];
  v_night_cancelled uuid[] := array[]::uuid[];
  v_failed uuid[] := array[]::uuid[];
  v_day_cap_suspended uuid[] := array[]::uuid[];

  v_cohort record;
  v_night record;
  v_same_day_slots text[];
  v_day_slots text[];
  v_candidate_date date;
  v_candidate_slot text;
  v_target_date date;
  v_target_creneau text;
  v_found boolean;
  v_occ_count integer;
  v_overlaps_intervention boolean;
  v_night_invalid boolean;
  v_i integer;

  v_daycap_date date;
  v_winning_cohort uuid;
  v_loser record;
begin
  perform pg_advisory_xact_lock(hashtext(p_space_id::text));

  p_new_slots := coalesce(p_new_slots, array[]::text[]);

  select * into v_old from slot_config where space_id = p_space_id;
  if not found then
    raise exception 'NO_SLOT_CONFIG_FOR_SPACE';
  end if;

  v_visit_start_hour := case when p_new_config ? 'visit_start_hour'
    then (p_new_config->>'visit_start_hour')::integer else v_old.visit_start_hour end;
  v_visit_end_hour := case when p_new_config ? 'visit_end_hour'
    then (p_new_config->>'visit_end_hour')::integer else v_old.visit_end_hour end;
  v_slot_duration_minutes := case when p_new_config ? 'slot_duration_minutes'
    then (p_new_config->>'slot_duration_minutes')::integer else v_old.slot_duration_minutes end;
  v_min_gap_minutes := case when p_new_config ? 'min_gap_minutes'
    then (p_new_config->>'min_gap_minutes')::integer else v_old.min_gap_minutes end;
  v_gap_includes_duration := case when p_new_config ? 'gap_includes_duration'
    then (p_new_config->>'gap_includes_duration')::boolean else v_old.gap_includes_duration end;
  v_max_visitors_per_slot := case when p_new_config ? 'max_visitors_per_slot'
    then (p_new_config->>'max_visitors_per_slot')::integer else v_old.max_visitors_per_slot end;
  v_allowed_weekdays := case when p_new_config ? 'allowed_weekdays'
    then (select coalesce(array_agg(x::integer), array[]::integer[]) from jsonb_array_elements_text(p_new_config->'allowed_weekdays') x)
    else v_old.allowed_weekdays end;
  v_blocked_dates := case when p_new_config ? 'blocked_dates'
    then (select coalesce(array_agg(x), array[]::text[]) from jsonb_array_elements_text(p_new_config->'blocked_dates') x)
    else v_old.blocked_dates end;
  v_blocked_date_reasons := case when p_new_config ? 'blocked_date_reasons'
    then (p_new_config->'blocked_date_reasons') else v_old.blocked_date_reasons end;
  v_night_enabled := case when p_new_config ? 'night_enabled'
    then (p_new_config->>'night_enabled')::boolean else v_old.night_enabled end;
  v_night_start_hour := case when p_new_config ? 'night_start_hour'
    then (p_new_config->>'night_start_hour')::integer else v_old.night_start_hour end;
  v_night_end_hour := case when p_new_config ? 'night_end_hour'
    then (p_new_config->>'night_end_hour')::integer else v_old.night_end_hour end;
  v_max_night_visitors := case when p_new_config ? 'max_night_visitors'
    then (p_new_config->>'max_night_visitors')::integer else v_old.max_night_visitors end;
  v_one_visit_per_day := case when p_new_config ? 'one_visit_per_day'
    then (p_new_config->>'one_visit_per_day')::boolean else v_old.one_visit_per_day end;

  -- 1. Historique + config live
  insert into slot_config_history (
    space_id, valid_from, visit_start_hour, visit_end_hour, slot_duration_minutes,
    min_gap_minutes, gap_includes_duration, max_visitors_per_slot, allowed_weekdays,
    blocked_dates, blocked_date_reasons, night_enabled, night_start_hour,
    night_end_hour, max_night_visitors, one_visit_per_day
  ) values (
    p_space_id, current_date, v_visit_start_hour, v_visit_end_hour, v_slot_duration_minutes,
    v_min_gap_minutes, v_gap_includes_duration, v_max_visitors_per_slot, v_allowed_weekdays,
    v_blocked_dates, v_blocked_date_reasons, v_night_enabled, v_night_start_hour,
    v_night_end_hour, v_max_night_visitors, v_one_visit_per_day
  )
  on conflict (space_id, valid_from) do update set
    visit_start_hour = excluded.visit_start_hour,
    visit_end_hour = excluded.visit_end_hour,
    slot_duration_minutes = excluded.slot_duration_minutes,
    min_gap_minutes = excluded.min_gap_minutes,
    gap_includes_duration = excluded.gap_includes_duration,
    max_visitors_per_slot = excluded.max_visitors_per_slot,
    allowed_weekdays = excluded.allowed_weekdays,
    blocked_dates = excluded.blocked_dates,
    blocked_date_reasons = excluded.blocked_date_reasons,
    night_enabled = excluded.night_enabled,
    night_start_hour = excluded.night_start_hour,
    night_end_hour = excluded.night_end_hour,
    max_night_visitors = excluded.max_night_visitors,
    one_visit_per_day = excluded.one_visit_per_day;

  update slot_config set
    visit_start_hour = v_visit_start_hour,
    visit_end_hour = v_visit_end_hour,
    slot_duration_minutes = v_slot_duration_minutes,
    min_gap_minutes = v_min_gap_minutes,
    gap_includes_duration = v_gap_includes_duration,
    max_visitors_per_slot = v_max_visitors_per_slot,
    allowed_weekdays = v_allowed_weekdays,
    blocked_dates = v_blocked_dates,
    blocked_date_reasons = v_blocked_date_reasons,
    night_enabled = v_night_enabled,
    night_start_hour = v_night_start_hour,
    night_end_hour = v_night_end_hour,
    max_night_visitors = v_max_night_visitors,
    one_visit_per_day = v_one_visit_per_day
  where space_id = p_space_id;

  v_weekday_blocked_changed := (v_allowed_weekdays is distinct from v_old.allowed_weekdays)
    or (v_blocked_dates is distinct from v_old.blocked_dates);

  v_structural_change := v_weekday_blocked_changed
    or (v_visit_start_hour is distinct from v_old.visit_start_hour)
    or (v_visit_end_hour is distinct from v_old.visit_end_hour)
    or (v_slot_duration_minutes is distinct from v_old.slot_duration_minutes)
    or (v_min_gap_minutes is distinct from v_old.min_gap_minutes)
    or (v_gap_includes_duration is distinct from v_old.gap_includes_duration)
    or (v_max_visitors_per_slot is distinct from v_old.max_visitors_per_slot);

  v_night_became_disabled := v_old.night_enabled and not v_night_enabled;
  v_night_scan_needed := v_night_became_disabled or v_weekday_blocked_changed;
  v_one_visit_activated := (not coalesce(v_old.one_visit_per_day, false)) and coalesce(v_one_visit_per_day, false);

  -- 2. Recasage des réservations "Visite" futures invalidées
  if v_structural_change then
    for v_cohort in
      select
        coalesce(group_id, id) as cohort_key,
        (array_agg(date order by created_at))[1] as cohort_date,
        (array_agg(creneau order by created_at))[1] as cohort_creneau,
        array_agg(id order by created_at) as member_ids,
        count(*) as cohort_size
      from reservations
      where space_id = p_space_id and type = 'Visite' and date >= current_date
      group by coalesce(group_id, id)
      order by min(created_at) asc
    loop
      v_found := (v_cohort.cohort_creneau = any(p_new_slots))
        and (extract(dow from v_cohort.cohort_date)::integer = any(v_allowed_weekdays))
        and not (to_char(v_cohort.cohort_date, 'YYYY-MM-DD') = any(v_blocked_dates));

      if v_found then
        select count(*) into v_occ_count from reservations
          where space_id = p_space_id and date = v_cohort.cohort_date and creneau = v_cohort.cohort_creneau
            and type = 'Visite' and not (id = any(v_cohort.member_ids));
        if v_occ_count + v_cohort.cohort_size > v_max_visitors_per_slot then
          v_found := false;
        end if;
      end if;

      if v_found then
        continue; -- créneau toujours valide et non-saturé, rien à faire
      end if;

      -- Créneaux du même jour STRICTEMENT postérieurs au créneau d'origine,
      -- triés par ordre chronologique croissant (le prochain créneau libre
      -- d'abord) — voir commentaire en tête de fichier. Repli jour par jour
      -- (ordre chronologique de p_new_slots) si aucun ne convient.
      select coalesce(array_agg(s order by to_minutes(s)), array[]::text[])
        into v_same_day_slots
        from unnest(p_new_slots) s
        where to_minutes(s) > to_minutes(v_cohort.cohort_creneau);

      v_target_date := null;
      v_target_creneau := null;

      <<day_loop>>
      for v_i in 0..60 loop
        v_candidate_date := v_cohort.cohort_date + v_i;

        if not (extract(dow from v_candidate_date)::integer = any(v_allowed_weekdays)) then
          continue;
        end if;
        if to_char(v_candidate_date, 'YYYY-MM-DD') = any(v_blocked_dates) then
          continue;
        end if;

        v_day_slots := case when v_i = 0 then v_same_day_slots else p_new_slots end;

        foreach v_candidate_slot in array v_day_slots loop
          select count(*) into v_occ_count from reservations
            where space_id = p_space_id and date = v_candidate_date and creneau = v_candidate_slot
              and type = 'Visite' and not (id = any(v_cohort.member_ids));

          -- Ajout intervenants : un créneau déjà couvert par une intervention
          -- (prioritaire) n'est jamais un candidat valide.
          select exists (
            select 1 from reservations
            where space_id = p_space_id and date = v_candidate_date and type = 'Intervention'
              and to_minutes(creneau) < to_minutes(v_candidate_slot) + v_slot_duration_minutes
              and to_minutes(creneau) + coalesce(duration_minutes, 0) > to_minutes(v_candidate_slot)
          ) into v_overlaps_intervention;

          if v_occ_count + v_cohort.cohort_size <= v_max_visitors_per_slot and not v_overlaps_intervention then
            v_target_date := v_candidate_date;
            v_target_creneau := v_candidate_slot;
            exit day_loop;
          end if;
        end loop;
      end loop day_loop;

      if v_target_date is not null then
        update reservations set
          date = v_target_date,
          creneau = v_target_creneau,
          previous_date = date,
          previous_creneau = creneau,
          alert_type = 'rebooked',
          alert_message = 'Suite à une modification des règles de visite, votre réservation du '
            || to_char(v_cohort.cohort_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
            || ' a été automatiquement déplacée au ' || to_char(v_target_date, 'DD/MM/YYYY')
            || ' à ' || v_target_creneau || '.',
          alert_seen = false
        where id = any(v_cohort.member_ids);

        insert into reservation_change_history (
          space_id, reservation_id, prenom, nom, type, change_type,
          previous_date, previous_creneau, new_date, new_creneau, message
        )
        select p_space_id, id, prenom, nom, type, 'rebooked',
          v_cohort.cohort_date, v_cohort.cohort_creneau, v_target_date, v_target_creneau,
          'Suite à une modification des règles de visite, réservation du '
            || to_char(v_cohort.cohort_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
            || ' automatiquement déplacée au ' || to_char(v_target_date, 'DD/MM/YYYY')
            || ' à ' || v_target_creneau || '.'
        from reservations where id = any(v_cohort.member_ids);

        v_rebooked := v_rebooked || v_cohort.member_ids;
      else
        update reservations set
          alert_type = 'rebooking_failed',
          alert_message = 'Suite à une modification des règles de visite, votre réservation du '
            || to_char(v_cohort.cohort_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
            || ' n''a pas pu être automatiquement replacée. Merci de contacter l''organisateur '
            || 'pour choisir un nouveau créneau.',
          alert_seen = false
        where id = any(v_cohort.member_ids);

        insert into reservation_change_history (
          space_id, reservation_id, prenom, nom, type, change_type,
          previous_date, previous_creneau, new_date, new_creneau, message
        )
        select p_space_id, id, prenom, nom, type, 'rebooking_failed',
          v_cohort.cohort_date, v_cohort.cohort_creneau, null, null,
          'Suite à une modification des règles de visite, réservation du '
            || to_char(v_cohort.cohort_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
            || ' n''a pas pu être automatiquement replacée.'
        from reservations where id = any(v_cohort.member_ids);

        v_failed := v_failed || v_cohort.member_ids;
      end if;
    end loop;
  end if;

  -- 3. Nuitées invalidées : message seul, jamais de déplacement/suppression
  if v_night_scan_needed then
    for v_night in
      select id, date from reservations
      where space_id = p_space_id and type = 'Nuit' and date >= current_date
    loop
      v_night_invalid := v_night_became_disabled
        or not (extract(dow from v_night.date)::integer = any(v_allowed_weekdays))
        or (to_char(v_night.date, 'YYYY-MM-DD') = any(v_blocked_dates));

      if v_night_invalid then
        update reservations set
          alert_type = 'night_cancelled',
          alert_message = 'Nuitée annulée suite au changement de consignes.',
          alert_seen = false
        where id = v_night.id;

        insert into reservation_change_history (
          space_id, reservation_id, prenom, nom, type, change_type,
          previous_date, previous_creneau, new_date, new_creneau, message
        )
        select p_space_id, id, prenom, nom, type, 'night_cancelled',
          date, creneau, date, creneau, 'Nuitée annulée suite au changement de consignes.'
        from reservations where id = v_night.id;

        v_night_cancelled := v_night_cancelled || v_night.id;
      end if;
    end loop;
  end if;

  -- 4. Activation du mode "1 visite / jour" : ne touche jamais le passé
  -- (date >= current_date), et ne déplace ni ne supprime rien — pour chaque
  -- jour où plusieurs réservations "Visite" existent déjà, la première
  -- enregistrée (created_at le plus ancien) reste active, toutes les autres
  -- sont marquées "day_cap_suspended".
  if v_one_visit_activated then
    for v_daycap_date in
      select date
      from reservations
      where space_id = p_space_id and type = 'Visite' and date >= current_date
      group by date
      having count(distinct coalesce(group_id, id)) > 1
    loop
      select coalesce(group_id, id) into v_winning_cohort
      from reservations
      where space_id = p_space_id and type = 'Visite' and date = v_daycap_date
      group by coalesce(group_id, id)
      order by min(created_at) asc
      limit 1;

      for v_loser in
        select id, prenom, nom, type, date, creneau
        from reservations
        where space_id = p_space_id and type = 'Visite' and date = v_daycap_date
          and coalesce(group_id, id) <> v_winning_cohort
      loop
        update reservations set
          alert_type = 'day_cap_suspended',
          alert_message = 'Le mode "1 visite par jour" a été activé : votre réservation du '
            || to_char(v_loser.date, 'DD/MM/YYYY') || ' à ' || v_loser.creneau
            || ' a été suspendue car une autre réservation existait déjà ce jour-là. '
            || 'Modifiez-la pour choisir un autre jour.',
          alert_seen = false
        where id = v_loser.id;

        insert into reservation_change_history (
          space_id, reservation_id, prenom, nom, type, change_type,
          previous_date, previous_creneau, new_date, new_creneau, message
        ) values (
          p_space_id, v_loser.id, v_loser.prenom, v_loser.nom, v_loser.type, 'day_cap_suspended',
          v_loser.date, v_loser.creneau, v_loser.date, v_loser.creneau,
          'Réservation du ' || to_char(v_loser.date, 'DD/MM/YYYY') || ' à ' || v_loser.creneau
            || ' suspendue suite à l''activation du mode "1 visite par jour".'
        );

        v_day_cap_suspended := v_day_cap_suspended || v_loser.id;
      end loop;
    end loop;
  end if;

  return jsonb_build_object(
    'rebooked', to_jsonb(v_rebooked),
    'night_cancelled', to_jsonb(v_night_cancelled),
    'failed', to_jsonb(v_failed),
    'day_cap_suspended', to_jsonb(v_day_cap_suspended)
  );
end;
$$;

```

### supabase/migrations/20260816_book_intervention_cross_space_overlap.sql

```sql
-- Ajoute un contrôle de chevauchement CROSS-SPACE à book_intervention() :
-- jusqu'ici, un même intervenant (identifié par son intervenant_profile_id,
-- propre à CHAQUE espace patient) pouvait réserver le même créneau horaire
-- depuis deux espaces patients différents sans qu'aucune règle ne l'en
-- empêche (le contrôle existant, INTERVENTION_OVERLAP_SELF, ne compare que
-- les réservations du MÊME espace). On identifie ici le "même intervenant"
-- à travers les espaces via intervenant_profiles.telephone (numéro
-- normalisé côté client par lib/phone.ts avant stockage/requête, comparable
-- en égalité stricte — même mécanique que app/(visitor)/soins.tsx et
-- lib/intervenantSpaceSwitch.ts), pas via intervenant_profile_id qui change
-- d'un espace à l'autre pour la même personne.
create or replace function public.book_intervention(
  p_space_id uuid,
  p_intervenant_profile_id uuid,
  p_intervention_type_id uuid,
  p_date date,
  p_start_slot text,
  p_pin text,
  p_slots text[]
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prenom text;
  v_nom text;
  v_telephone text;
  v_duration_minutes integer;
  v_label text;
  v_start_min integer;
  v_end_min integer;
  v_config slot_config%rowtype;
  v_priority boolean;
  v_intervention_id uuid;

  v_rebooked uuid[] := array[]::uuid[];
  v_failed uuid[] := array[]::uuid[];

  v_cohort record;
  v_same_day_slots text[];
  v_day_slots text[];
  v_candidate_date date;
  v_candidate_slot text;
  v_target_date date;
  v_target_creneau text;
  v_found boolean;
  v_occ_count integer;
  v_overlaps_intervention boolean;
  v_i integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_space_id::text));

  p_slots := coalesce(p_slots, array[]::text[]);

  select prenom, nom, telephone into v_prenom, v_nom, v_telephone
    from intervenant_profiles
    where id = p_intervenant_profile_id and space_id = p_space_id;
  if not found then
    raise exception 'INTERVENANT_NOT_FOUND';
  end if;

  select label, duration_minutes into v_label, v_duration_minutes
    from intervention_types
    where id = p_intervention_type_id and intervenant_profile_id = p_intervenant_profile_id;
  if not found then
    raise exception 'INTERVENTION_TYPE_NOT_FOUND';
  end if;

  v_start_min := to_minutes(p_start_slot);
  v_end_min := v_start_min + v_duration_minutes;
  if v_end_min > 1440 then
    raise exception 'INTERVENTION_CROSSES_MIDNIGHT';
  end if;

  -- Un même intervenant ne peut pas chevaucher deux de ses propres
  -- interventions ce jour-là (des intervenants différents peuvent en
  -- revanche intervenir en même temps — ex. infirmière + kiné).
  if exists (
    select 1 from reservations
    where space_id = p_space_id
      and type = 'Intervention'
      and date = p_date
      and intervenant_profile_id = p_intervenant_profile_id
      and to_minutes(creneau) < v_end_min
      and to_minutes(creneau) + coalesce(duration_minutes, 0) > v_start_min
  ) then
    raise exception 'INTERVENTION_OVERLAP_SELF';
  end if;

  -- Même contrôle, mais à travers les AUTRES espaces patients auxquels cet
  -- intervenant est rattaché (même téléphone) : impossible de réserver ce
  -- créneau depuis cet espace s'il est déjà engagé dessus ailleurs.
  if v_telephone is not null and v_telephone <> '' then
    if exists (
      select 1
      from reservations r
      join intervenant_profiles ip on ip.id = r.intervenant_profile_id
      where r.type = 'Intervention'
        and r.date = p_date
        and r.space_id <> p_space_id
        and ip.telephone = v_telephone
        and to_minutes(r.creneau) < v_end_min
        and to_minutes(r.creneau) + coalesce(r.duration_minutes, 0) > v_start_min
    ) then
      raise exception 'INTERVENTION_OVERLAP_OTHER_SPACE';
    end if;
  end if;

  select * into v_config from slot_config where space_id = p_space_id;
  if not found then
    raise exception 'NO_SLOT_CONFIG_FOR_SPACE';
  end if;

  select (coalesce(v_config.intervenant_priority_mode, 'all') = 'all' or coalesce(priority_slots, true))
    into v_priority
    from intervenant_profiles where id = p_intervenant_profile_id;

  insert into reservations (
    space_id, date, creneau, prenom, nom, telephone, type, pin,
    duration_minutes, intervention_label, intervenant_profile_id
  ) values (
    p_space_id, p_date, p_start_slot, v_prenom, v_nom, '', 'Intervention', p_pin,
    v_duration_minutes, v_label, p_intervenant_profile_id
  )
  returning id into v_intervention_id;

  -- Recasage des cohortes "Visite" dont le créneau chevauche la fenêtre de
  -- l'intervention qu'on vient d'insérer — uniquement si elle est prioritaire.
  if v_priority then
  for v_cohort in
    select
      coalesce(group_id, id) as cohort_key,
      (array_agg(creneau order by created_at))[1] as cohort_creneau,
      array_agg(id order by created_at) as member_ids,
      count(*) as cohort_size
    from reservations
    where space_id = p_space_id and type = 'Visite' and date = p_date
    group by coalesce(group_id, id)
    having to_minutes((array_agg(creneau order by created_at))[1]) < v_end_min
       and to_minutes((array_agg(creneau order by created_at))[1]) + v_config.slot_duration_minutes > v_start_min
  loop
    -- Créneaux du même jour STRICTEMENT postérieurs au créneau d'origine,
    -- triés par ordre chronologique croissant (le prochain créneau libre
    -- d'abord).
    select coalesce(array_agg(s order by to_minutes(s)), array[]::text[])
      into v_same_day_slots
      from unnest(p_slots) s
      where to_minutes(s) > to_minutes(v_cohort.cohort_creneau);

    v_target_date := null;
    v_target_creneau := null;

    <<day_loop>>
    for v_i in 0..60 loop
      v_candidate_date := p_date + v_i;

      if not (extract(dow from v_candidate_date)::integer = any(v_config.allowed_weekdays)) then
        continue;
      end if;
      if to_char(v_candidate_date, 'YYYY-MM-DD') = any(v_config.blocked_dates) then
        continue;
      end if;

      v_day_slots := case when v_i = 0 then v_same_day_slots else p_slots end;

      foreach v_candidate_slot in array v_day_slots loop
        select count(*) into v_occ_count from reservations
          where space_id = p_space_id and date = v_candidate_date and creneau = v_candidate_slot
            and type = 'Visite' and not (id = any(v_cohort.member_ids));

        select exists (
          select 1 from reservations
          where space_id = p_space_id and date = v_candidate_date and type = 'Intervention'
            and to_minutes(creneau) < to_minutes(v_candidate_slot) + v_config.slot_duration_minutes
            and to_minutes(creneau) + coalesce(duration_minutes, 0) > to_minutes(v_candidate_slot)
        ) into v_overlaps_intervention;

        if v_occ_count + v_cohort.cohort_size <= v_config.max_visitors_per_slot and not v_overlaps_intervention then
          v_target_date := v_candidate_date;
          v_target_creneau := v_candidate_slot;
          exit day_loop;
        end if;
      end loop;
    end loop day_loop;

    if v_target_date is not null then
      update reservations set
        date = v_target_date,
        creneau = v_target_creneau,
        previous_date = date,
        previous_creneau = creneau,
        alert_type = 'rebooked',
        alert_message = 'Une intervention (' || v_label || ') est prioritaire sur votre créneau du '
          || to_char(p_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
          || '. Votre réservation a été automatiquement déplacée au '
          || to_char(v_target_date, 'DD/MM/YYYY') || ' à ' || v_target_creneau || '.',
        alert_seen = false
      where id = any(v_cohort.member_ids);

      insert into reservation_change_history (
        space_id, reservation_id, prenom, nom, type, change_type,
        previous_date, previous_creneau, new_date, new_creneau, message
      )
      select p_space_id, id, prenom, nom, type, 'rebooked',
        p_date, v_cohort.cohort_creneau, v_target_date, v_target_creneau,
        'Créneau prioritaire attribué à une intervention (' || v_label || '), réservation du '
          || to_char(p_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
          || ' automatiquement déplacée au ' || to_char(v_target_date, 'DD/MM/YYYY')
          || ' à ' || v_target_creneau || '.'
      from reservations where id = any(v_cohort.member_ids);

      v_rebooked := v_rebooked || v_cohort.member_ids;
    else
      update reservations set
        alert_type = 'rebooking_failed',
        alert_message = 'Une intervention (' || v_label || ') est prioritaire sur votre créneau du '
          || to_char(p_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
          || '. Nous n''avons pas pu automatiquement replacer votre réservation. '
          || 'Merci de contacter l''organisateur pour choisir un nouveau créneau.',
        alert_seen = false
      where id = any(v_cohort.member_ids);

      insert into reservation_change_history (
        space_id, reservation_id, prenom, nom, type, change_type,
        previous_date, previous_creneau, new_date, new_creneau, message
      )
      select p_space_id, id, prenom, nom, type, 'rebooking_failed',
        p_date, v_cohort.cohort_creneau, null, null,
        'Créneau prioritaire attribué à une intervention (' || v_label || '), réservation du '
          || to_char(p_date, 'DD/MM/YYYY') || ' à ' || v_cohort.cohort_creneau
          || ' n''a pas pu être automatiquement replacée.'
      from reservations where id = any(v_cohort.member_ids);

      v_failed := v_failed || v_cohort.member_ids;
    end if;
  end loop;
  end if;

  return jsonb_build_object(
    'intervention_id', v_intervention_id,
    'rebooked', to_jsonb(v_rebooked),
    'failed', to_jsonb(v_failed)
  );
end;
$$;

grant execute on function public.book_intervention(uuid, uuid, uuid, date, text, text, text[])
  to anon, authenticated;

```

### supabase/migrations/20260817_intervenant_no_login_and_booking_alerts.sql

```sql
-- Fiches intervenant "sans connexion" créées par l'admin (pin NULL) + email
-- optionnel sur toutes les fiches + nouveau type d'alerte réservation pour
-- proposer un créneau à un intervenant.

alter table public.intervenant_profiles
  alter column pin drop not null,
  add column if not exists email text;

-- pin IS NULL == fiche créée par l'admin, sans connexion possible.

do $$ begin
  alter table public.reservations drop constraint reservations_alert_type_check;
exception when undefined_object then null; end $$;
alter table public.reservations
  add constraint reservations_alert_type_check
  check (alert_type in ('rebooked', 'night_cancelled', 'rebooking_failed', 'day_cap_suspended', 'booking_proposal'));

```

## Section D — Types (lib/types.ts)

### IntervenantProfile

```ts
export interface IntervenantProfile {
  id: string;
  space_id: string;
  prenom: string;
  nom: string;
  // Null pour une fiche créée par l'admin sans connexion possible (voir
  // components/AdminNewIntervenantFlow.tsx) — sinon le PIN choisi par
  // l'intervenant à sa propre création de fiche.
  pin: string | null;
  photo: string | null;
  photo_updated_at: string | null;
  telephone: string | null;
  phrase_totem: string | null;
  // Optionnel — sert à envoyer une confirmation de créneau réservé (voir
  // notify-intervention-confirmation) et, pour une fiche avec compte, un
  // email de secours en plus du message in-app.
  email: string | null;
  // Clé du métier (voir lib/metiers.ts, ex. "infirmier", "kine") — saisi à la
  // création de la fiche, sert à afficher la spécialisation et à choisir
  // l'icône de repli de l'avatar (IntervenantAvatar.tsx) sans photo.
  metier: string | null;
  // 2ᵉ spécialisation optionnelle (même format de clé que metier) — voir
  // IntervenantFicheModal.tsx, section "2ᵉ spécialisation".
  metier_secondaire: string | null;
  // Créneaux d'intervention prioritaires sur les visites — n'a d'effet que
  // si slot_config.intervenant_priority_mode = "selected" (sinon tous les
  // intervenants sont prioritaires, voir IntervenantPriorityModal.tsx).
  priority_slots: boolean;
  created_at: string;
}

```

### InterventionType

```ts
// Type d'intervention défini par l'intervenant (ex. "Toilette" 30min,
// "Kiné" 45min) — un intervenant peut en avoir plusieurs, de durées
// différentes. Choisi au moment de réserver un créneau (voir
// components/InterventionBookingFlow.tsx).
export interface InterventionType {
  id: string;
  intervenant_profile_id: string;
  label: string;
  duration_minutes: number;
  created_at: string;
  // Dénormalisé depuis intervenant_profiles, synchronisé en continu par
  // trigger (voir migration 20260815_intervention_types_intervenant_identity.sql)
  // — pas utilisé côté app pour l'instant (toujours accessible via
  // intervenant_profile_id), juste pour parcourir la table côté Supabase.
  prenom?: string | null;
  nom?: string | null;
  metier?: string | null;
}

```

### IntervenantChecklistTemplate

```ts
// Modèle de checklist réutilisable par un intervenant, indépendant d'un
// space_id précis — voir components/MyChecklist.tsx (💾 Enregistrer comme
// modèle / 📥 Mes modèles) et supabase/migrations/20260728_intervenant_checklist_templates.sql.
// Identité cross-space par téléphone normalisé, même mécanisme que "Mes
// espaces" (app/(visitor)/account.tsx, linkedSpaces).
export interface IntervenantChecklistTemplate {
  id: string;
  telephone: string;
  name: string;
  items: string[];
  created_at: string;
}

```

### Champs et références "intervenant" sur les interfaces partagées (PatientSpace, SlotConfig, Reservation, NewsEntry, etc.)

```ts
49-  last_activity_at: string;
50-  purge_scheduled_at: string;
51-  created_at: string;
52:  // Active le Planning des intervenants (infirmier·ère, kiné, aide à
53:  // domicile…) pour cet espace — voir components/IntervenantFicheModal.tsx
54:  // et app/(admin)/intervenants.tsx. Désactivé par défaut.
55:  intervenants_enabled: boolean;
56-}
57-
58-export interface SlotConfig {
--
80-  // indisponibles pour tout le monde sauf pour l'auteur de la réservation
81-  // (voir check_slot_capacity() côté serveur et (visitor)/home/slots.tsx).
82-  one_visit_per_day: boolean;
83:  // "all" = tous les créneaux intervenants sont prioritaires sur les visites
84:  // (comportement historique). "selected" = seuls les intervenants avec
85:  // intervenant_profiles.priority_slots=true le sont — voir
86-  // check_slot_capacity()/book_intervention() côté serveur et
87:  // components/IntervenantPriorityModal.tsx.
88:  intervenant_priority_mode: "all" | "selected";
89:  // Autorisation des intervenants à réserver des nuitées : "disabled" (aucun,
90:  // défaut), "some" (seuls ceux listés dans night_authorized_intervenants),
91:  // "all" (tous) — voir components/NightIntervenantModal.tsx et
92-  // (visitor)/home/nights.tsx.
93:  night_intervenant_mode: "disabled" | "some" | "all";
94-  // Autorisation des visiteurs à réserver des nuitées : "all" (tous, défaut
95-  // — comportement historique) ou "some" (seuls ceux listés dans
96-  // night_authorized_visitors) — voir components/NightVisitorModal.tsx.
97-  night_visitor_mode: "all" | "some";
98:  // Autorisation des intervenants à publier sur "Nouvelles du jour" des
99-  // messages visibles aussi par les visiteurs : "disabled" (défaut, canal
100:  // intervenants+admin non visible des visiteurs), "some" (seuls ceux listés
101:  // dans news_authorized_intervenants), "all" (tous) — voir
102:  // components/NewsIntervenantModal.tsx et components/NewsFeed.tsx. L'admin
103-  // suit la même règle pour ses propres publications (pas de réglage séparé,
104:  // visibles seulement en "all" — "some" ne concerne que les intervenants
105-  // listés).
106:  news_intervenant_mode: "disabled" | "some" | "all";
107-}
108-
109-// Snapshot versionné de SlotConfig — une ligne fait foi de son valid_from
--
180-  // ne doit jamais bouger si le type est modifié/supprimé ensuite).
181-  duration_minutes: number | null;
182-  intervention_label: string | null;
183:  intervenant_profile_id: string | null;
184-}
185-
186:// Fiche d'un intervenant (infirmier·ère, kiné, aide à domicile…) — même
187-// mécanique d'identité device-local + PIN que les visiteurs, voir
188-// lib/visitorSession.ts. Créée à la première connexion via
189:// components/IntervenantFicheModal.tsx.
190:export interface IntervenantProfile {
191-  id: string;
192-  space_id: string;
193-  prenom: string;
194-  nom: string;
195-  // Null pour une fiche créée par l'admin sans connexion possible (voir
196:  // components/AdminNewIntervenantFlow.tsx) — sinon le PIN choisi par
197:  // l'intervenant à sa propre création de fiche.
198-  pin: string | null;
199-  photo: string | null;
200-  photo_updated_at: string | null;
--
206-  email: string | null;
207-  // Clé du métier (voir lib/metiers.ts, ex. "infirmier", "kine") — saisi à la
208-  // création de la fiche, sert à afficher la spécialisation et à choisir
209:  // l'icône de repli de l'avatar (IntervenantAvatar.tsx) sans photo.
210-  metier: string | null;
211-  // 2ᵉ spécialisation optionnelle (même format de clé que metier) — voir
212:  // IntervenantFicheModal.tsx, section "2ᵉ spécialisation".
213-  metier_secondaire: string | null;
214-  // Créneaux d'intervention prioritaires sur les visites — n'a d'effet que
215:  // si slot_config.intervenant_priority_mode = "selected" (sinon tous les
216:  // intervenants sont prioritaires, voir IntervenantPriorityModal.tsx).
217-  priority_slots: boolean;
218-  created_at: string;
219-}
220-
221:// Type d'intervention défini par l'intervenant (ex. "Toilette" 30min,
222:// "Kiné" 45min) — un intervenant peut en avoir plusieurs, de durées
223-// différentes. Choisi au moment de réserver un créneau (voir
224-// components/InterventionBookingFlow.tsx).
225-export interface InterventionType {
226-  id: string;
227:  intervenant_profile_id: string;
228-  label: string;
229-  duration_minutes: number;
230-  created_at: string;
231:  // Dénormalisé depuis intervenant_profiles, synchronisé en continu par
232:  // trigger (voir migration 20260815_intervention_types_intervenant_identity.sql)
233-  // — pas utilisé côté app pour l'instant (toujours accessible via
234:  // intervenant_profile_id), juste pour parcourir la table côté Supabase.
235-  prenom?: string | null;
236-  nom?: string | null;
237-  metier?: string | null;
--
286-  author_nom: string;
287-  author_pin: string;
288-  // Rôle de l'auteur au moment de la publication — détermine la portée du
289:  // message : "intervenant"/"admin" restent réservés au canal
290:  // intervenants+admin, sauf si l'espace autorise leur visibilité aux
291:  // visiteurs (voir slot_config.news_intervenant_mode et
292-  // components/NewsFeed.tsx). Les messages "visiteur" restent toujours
293-  // visibles de tous, comme avant cette fonctionnalité.
294:  author_role: "visiteur" | "intervenant" | "admin";
295:  // Intervenant auteur (rempli uniquement si author_role = 'intervenant') —
296:  // sert à vérifier son autorisation dans news_authorized_intervenants quand
297:  // slot_config.news_intervenant_mode = 'some'.
298:  intervenant_profile_id: string | null;
299-  created_at: string;
300-  // Suppression "douce" par l'admin (contenu d'un autre utilisateur que lui) :
301-  // reste visible avec un bandeau rouge pour l'auteur uniquement, masqué pour
--
515-  created_at: string;
516-}
517-
518:// Modèle de checklist réutilisable par un intervenant, indépendant d'un
519-// space_id précis — voir components/MyChecklist.tsx (💾 Enregistrer comme
520:// modèle / 📥 Mes modèles) et supabase/migrations/20260728_intervenant_checklist_templates.sql.
521-// Identité cross-space par téléphone normalisé, même mécanisme que "Mes
522-// espaces" (app/(visitor)/account.tsx, linkedSpaces).
523:export interface IntervenantChecklistTemplate {
524-  id: string;
525-  telephone: string;
526-  name: string;

```

## Note de clôture

Cette archive couvre 46 fichiers de code dédiés (Section A), 25 fichiers partagés extraits (Section B), 25 migrations SQL (Section C, dont 2 découvertes lors de la recherche live et absentes de la liste initiale : `20260717_check_slot_capacity_intervention_aware.sql` et `20260717_reservations_type_check_intervention.sql`) et les types TypeScript concernés (Section D). Les extraits de la Section B ne sont **pas** des blocs à copier-coller tels quels : ce sont des fragments de fichiers partagés (routage, contextes, écrans mixtes visiteur/admin) qu'il faudra retisser manuellement dans leur version V2 en suivant les instructions du document de réintégration, en particulier autour des points d'entrée (`app/index.tsx`, `lib/visitorEntry.ts`, `lib/visitorSession.ts`), des contextes (`SpaceContext`, `VisitorContext`) et de la restriction freemium (`lib/freemiumCap.ts`).
