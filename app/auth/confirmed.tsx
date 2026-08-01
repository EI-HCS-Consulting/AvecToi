import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { themes } from "@/lib/themes";

const C = themes.dark;

// Cible du lien de confirmation d'email (avectoi://auth/confirmed), voir signup.tsx.
// L'utilisateur revient ici après avoir cliqué le lien reçu par mail — il doit
// ensuite se connecter normalement (le compte n'a pas de session ouverte ici).
export default function ConfirmedScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>✓</Text>
      <Text style={styles.title}>Adresse confirmée</Text>
      <Text style={styles.subtitle}>
        Ton compte est prêt. Connecte-toi pour continuer.
      </Text>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => router.replace("/auth/login")}
        activeOpacity={0.85}
      >
        <Text style={styles.btnText}>Se connecter</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  icon: { fontSize: 40, color: C.success, marginBottom: 12 },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 24,
    color: "#fff",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "DM_Sans_400Regular",
    fontSize: 14,
    color: C.muted,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 28,
  },
  btn: {
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  btnText: {
    fontFamily: "DM_Sans_700Bold",
    fontSize: 16,
    color: "#fff",
  },
});
