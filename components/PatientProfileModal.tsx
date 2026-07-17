import { useState } from "react";
import { View, Text, TouchableOpacity, Image, Modal, StyleSheet } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import PatientAvatar from "@/components/PatientAvatar";
import type { PatientSpace } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Fiche patient en lecture seule — ouverte en cliquant la photo du patient
// dans SpaceHeader (visiteur) ou depuis "Mon compte". Les champs (naissance,
// sexe, groupe sanguin, allergies) sont saisis par l'admin dans "Profil
// Patient" (app/(admin)/settings.tsx). Même présentation circulaire de la
// photo en grand que le lightbox patient existant, avec en plus un
// téléchargement (voir sharePhoto de SouvenirsGallery.tsx).

function ageFromBirthdate(birthdate: string): number {
  const b = new Date(birthdate + "T00:00:00");
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const monthDiff = now.getMonth() - b.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  space: PatientSpace;
  C: Theme;
}

export default function PatientProfileModal({ visible, onClose, space, C }: Props) {
  const [photoLightbox, setPhotoLightbox] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const age = space.patient_birthdate ? ageFromBirthdate(space.patient_birthdate) : null;
  const birthdateLabel = space.patient_birthdate
    ? new Date(space.patient_birthdate + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;
  const admissionDateLabel = space.patient_admission_date
    ? new Date(space.patient_admission_date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;
  const dischargeDateLabel = space.patient_discharge_date
    ? new Date(space.patient_discharge_date + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;

  async function downloadPhoto() {
    if (!space.patient_photo_url) return;
    if (!(await Sharing.isAvailableAsync())) return;
    setDownloading(true);
    try {
      const localUri = (FileSystem.cacheDirectory ?? "") + `patient_${space.id}.jpg`;
      const { uri } = await FileSystem.downloadAsync(space.patient_photo_url, localUri);
      await Sharing.shareAsync(uri, { mimeType: "image/jpeg" });
    } catch {
      /* échec silencieux — pas de retour bloquant pour un simple téléchargement */
    }
    setDownloading(false);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.accent }]}>
          <View style={[styles.headerRow, { borderBottomColor: C.border }]}>
            <TouchableOpacity
              onPress={() => space.patient_photo_url && setPhotoLightbox(true)}
              activeOpacity={space.patient_photo_url ? 0.8 : 1}
            >
              <PatientAvatar
                photoUrl={space.patient_photo_url}
                firstname={space.patient_firstname}
                lastname={space.patient_lastname}
                size={64}
                C={C}
              />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.name, { color: C.text }]}>
                {space.patient_firstname} {space.patient_lastname}
              </Text>
              {!!space.patient_motto && (
                <Text style={styles.motto} numberOfLines={2}>
                  {space.patient_motto}
                </Text>
              )}
              <Text style={[styles.sub, { color: C.muted }]}>Fiche patient</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { borderColor: C.border }]}>
              <Text style={[styles.closeBtnText, { color: C.muted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.rows}>
            {admissionDateLabel && (
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: C.gold }]}>🏥 Date d'hospitalisation</Text>
                <Text style={[styles.rowValue, { color: C.text }]}>{admissionDateLabel}</Text>
              </View>
            )}

            {dischargeDateLabel && (
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: C.gold }]}>🚪 Date de sortie d'hospitalisation</Text>
                <Text style={[styles.rowValue, { color: C.text }]}>{dischargeDateLabel}</Text>
              </View>
            )}

            {birthdateLabel && (
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: C.gold }]}>🎂 Date de naissance</Text>
                <Text style={[styles.rowValue, { color: C.text }]}>
                  {birthdateLabel}{age !== null ? ` · ${age} ans` : ""}
                </Text>
              </View>
            )}

            {space.patient_sex && (
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: C.gold }]}>Sexe</Text>
                <Text style={[styles.rowValue, { color: C.text }]}>
                  {space.patient_sex === "F" ? "♀ Femme" : "♂ Homme"}
                </Text>
              </View>
            )}

            {space.patient_blood_type && (
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: C.gold }]}>🩸 Groupe sanguin</Text>
                <Text style={[styles.rowValue, { color: C.text }]}>{space.patient_blood_type}</Text>
              </View>
            )}

            {space.patient_allergies && (
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: C.gold }]}>⚠️ Allergies</Text>
                <Text style={[styles.rowValue, { color: C.text }]}>{space.patient_allergies}</Text>
              </View>
            )}

            {!admissionDateLabel && !dischargeDateLabel && !birthdateLabel && !space.patient_sex && !space.patient_blood_type && !space.patient_allergies && (
              <Text style={[styles.emptyText, { color: C.muted }]}>
                Aucune information supplémentaire renseignée pour le moment.
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Photo en grand — même présentation circulaire que le lightbox patient de SpaceHeader */}
      {!!space.patient_photo_url && (
        <Modal visible={photoLightbox} transparent animationType="fade" onRequestClose={() => setPhotoLightbox(false)}>
          <View style={styles.lightboxOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setPhotoLightbox(false)} />
            <View style={[styles.lightboxCircle, { borderColor: C.gold }]}>
              <Image source={{ uri: space.patient_photo_url }} style={styles.lightboxImage} resizeMode="cover" />
            </View>
            <TouchableOpacity
              style={[styles.downloadBtn, { backgroundColor: C.accent }]}
              onPress={downloadPhoto}
              disabled={downloading}
            >
              <Text style={styles.downloadBtnText}>{downloading ? "…" : "⬇️ Télécharger"}</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, padding: 20, paddingBottom: 40, marginBottom: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, paddingBottom: 16, borderBottomWidth: 1 },
  name: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18 },
  // Couleur fixe (pas de token de thème) : voulue identique en Light et Dark.
  motto: { fontFamily: "Caveat_600SemiBold", fontSize: 18, color: "#7EC8E3", marginTop: 1 },
  sub: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  closeBtnText: { fontSize: 14, fontFamily: "DM_Sans_700Bold" },

  rows: { gap: 14 },
  row: { gap: 3 },
  rowLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase" },
  rowValue: { fontFamily: "DM_Sans_400Regular", fontSize: 15, lineHeight: 21 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center", paddingVertical: 8 },

  lightboxOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center", padding: 16 },
  lightboxCircle: { width: 280, height: 280, borderRadius: 140, borderWidth: 4, overflow: "hidden" },
  lightboxImage: { width: "100%", height: "100%" },
  downloadBtn: { marginTop: 24, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24 },
  downloadBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
});
