import { useEffect } from "react";
import { View, ActivityIndicator, Text, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { themes } from "@/lib/themes";
import { enterByToken, completeVisitorEntry } from "@/lib/visitorEntry";

const C = themes.blue;

export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!token) {
      Alert.alert("Lien invalide", "Ce lien d'invitation est manquant ou corrompu.");
      router.replace("/");
      return;
    }

    async function validateToken() {
      const result = await enterByToken(token);

      if (!result.ok) {
        if (result.reason === "inactive") {
          Alert.alert(
            "Espace inactif",
            result.patientFirstname
              ? `L'espace pour ${result.patientFirstname} n'est pas encore actif. Contactez l'organisateur.`
              : "Cet espace n'est pas encore actif. Contactez l'organisateur.",
          );
        } else {
          Alert.alert("Lien invalide", "Ce lien d'invitation n'existe pas ou a expiré.");
        }
        router.replace("/");
        return;
      }

      // Same rationale as auth/visitor-entry.tsx — see app/(visitor)/_layout.tsx.
      await completeVisitorEntry(result);

      router.replace({
        pathname: "/(visitor)/home/calendar",
        params: { spaceId: result.spaceId, token: result.token },
      });
    }

    validateToken();
  }, [token]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={C.accent} size="large" />
      <Text style={styles.text}>Vérification du lien…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, justifyContent: "center", alignItems: "center", gap: 16 },
  text: { fontFamily: "DM_Sans_400Regular", fontSize: 14, color: C.muted },
});
