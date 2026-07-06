import { View, Text, StyleSheet } from "react-native";
import type { Theme } from "@/lib/themes";

// Écran neutre affiché à la place du calendrier/créneaux/nuitées une fois
// le cap freemium atteint — ni prix, ni wording "upgrade"/"Pro" (conformité
// reader-app). L'admin est notifié par email, seul canal autorisé à
// mentionner le passage en illimité.
export default function CapBlockScreen({ C }: { C: Theme }) {
  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <Text style={styles.emoji}>🔒</Text>
      <Text style={[styles.text, { color: C.muted }]}>
        Vous avez atteint la limite de votre espace. Consultez l'email envoyé à votre adresse pour en savoir plus.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emoji: { fontSize: 40, marginBottom: 16 },
  text: { fontFamily: "DM_Sans_400Regular", fontSize: 14, textAlign: "center", lineHeight: 22 },
});
