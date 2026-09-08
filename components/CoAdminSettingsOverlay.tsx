import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { AdminSpaceProvider } from "@/lib/SpaceContext";
import CoAdminSettingsScreen from "@/app/(admin)/settings";
import type { Theme } from "@/lib/themes";

interface Props {
  visible: boolean;
  onClose: () => void;
  spaceId: string;
  prenom: string;
  nom: string;
  pin: string;
  C: Theme;
}

// Superpose les réglages (Lieux/Infos/Règles/Histo) directement par-dessus le
// contenu de "Mon Compte", sans navigation ni <Modal> plein écran — deux
// tentatives précédentes qui poussaient vers l'onglet caché /(admin)/settings
// depuis le groupe (visitor) ont échoué à l'identique (React Navigation
// retombe sur le premier onglet déclaré au tout premier montage d'un <Tabs>
// qui n'existe pas encore), et un <Modal> plein écran masquait la vraie barre
// d'onglets tout en laissant sa propre barre de réglages passer sous la barre
// système du téléphone.
//
// Doit être rendu comme FRÈRE DIRECT du <ScrollView> de l'écran Mon Compte
// (pas à l'intérieur), dans le même conteneur flex:1 que fournit déjà le
// <Tabs.Screen> — ce conteneur s'arrête pile au-dessus de la vraie barre
// d'onglets (Accueil/Nouvelles/Entraide/Soutien/Compte), qui reste donc
// visible en dessous. La barre interne Lieux/Infos/Règles/Histo de
// settings.tsx (collée à bottom:0 de CE conteneur) vient alors se poser juste
// au-dessus de la vraie barre d'onglets, exactement comme pour un admin qui
// ouvre ses propres Paramètres.
export default function CoAdminSettingsOverlay({ visible, onClose, spaceId, prenom, nom, pin, C }: Props) {
  if (!visible) return null;
  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={[styles.closeBar, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.8}>
          <Text style={[styles.closeText, { color: C.accent }]}>✕ Fermer</Text>
        </TouchableOpacity>
      </View>
      <AdminSpaceProvider spaceId={spaceId} coAdminIdentity={{ prenom, nom, pin }}>
        <CoAdminSettingsScreen />
      </AdminSpaceProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  closeBar: { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  closeBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  closeText: { fontFamily: "DM_Sans_700Bold", fontSize: 15 },
});
