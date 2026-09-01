import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { themes } from "@/lib/themes";
import PinPad from "@/components/PinPad";
import RelationPickerModal from "@/components/RelationPickerModal";
import { relationLabel } from "@/lib/relations";
import { claimOrCreateVisitorProfile } from "@/lib/visitorProfile";
import { saveVisitorSession } from "@/lib/visitorSession";

const C = themes.dark;

// Écran C du flow de reconnaissance serveur (voir
// SPEC_reconnaissance_visiteur_serveur.md §3.2) : création (ou récupération
// d'un profil hérité sans PIN) via rpc_visitor_claim_or_create. Le PIN est
// saisi deux fois pour éviter une faute de frappe qui bloquerait la
// reconnexion depuis un autre appareil plus tard.
export default function VisitorCreateProfileScreen() {
  const router = useRouter();
  const { spaceId, token, prenom: prefilledPrenom, nom: prefilledNom } = useLocalSearchParams<{
    spaceId: string; token: string; prenom?: string; nom?: string;
  }>();
  const [prenom, setPrenom] = useState(prefilledPrenom ?? "");
  const [nom, setNom] = useState(prefilledNom ?? "");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [relation, setRelation] = useState("");
  const [relationPickerVisible, setRelationPickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const canSubmit = prenom.trim() && nom.trim() && pin.length === 4 && pinConfirm.length === 4 && !loading;

  async function handleSubmit() {
    if (!canSubmit) return;
    if (pin !== pinConfirm) {
      setErrorMsg("Les deux codes ne correspondent pas.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    const result = await claimOrCreateVisitorProfile(spaceId, prenom.trim(), nom.trim(), pin, relation || null);
    setLoading(false);

    if (!result.ok) {
      setErrorMsg(
        result.reason === "duplicate"
          ? "Ce code est déjà utilisé pour ce nom. Choisis-en un autre."
          : "Une erreur est survenue. Réessaie.",
      );
      return;
    }

    await saveVisitorSession({
      token,
      spaceId,
      prenom: result.row.prenom,
      nom: result.row.nom,
      pin,
      motto: result.row.motto ?? "",
      relation: result.row.relation ?? "",
    });
    router.replace({ pathname: "/(visitor)/home/calendar", params: { spaceId, token } });
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

        <Text style={styles.title}>Créer mon profil</Text>
        <Text style={styles.subtitle}>
          Choisissez un code personnel à 4 chiffres : il vous permettra de retrouver votre
          profil, même depuis un autre téléphone.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Prénom"
          placeholderTextColor={C.muted}
          value={prenom}
          onChangeText={(v) => { setPrenom(v); setErrorMsg(""); }}
          autoCapitalize="words"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="Nom"
          placeholderTextColor={C.muted}
          value={nom}
          onChangeText={(v) => { setNom(v); setErrorMsg(""); }}
          autoCapitalize="words"
          autoCorrect={false}
        />

        <TouchableOpacity style={styles.relationRow} onPress={() => setRelationPickerVisible(true)} activeOpacity={0.8}>
          <Text style={styles.sectionLabel}>Lien avec le patient</Text>
          <Text style={styles.relationValue}>{relation ? relationLabel(relation) : "Non renseigné"}</Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>Choisir un code personnel</Text>
        <PinPad
          value={pin}
          onChange={(v) => { setPin(v); setErrorMsg(""); }}
          theme={C}
          hasError={!!errorMsg && pin !== pinConfirm}
        />

        <Text style={styles.sectionLabel}>Confirmer le code</Text>
        <PinPad
          value={pinConfirm}
          onChange={(v) => { setPinConfirm(v); setErrorMsg(""); }}
          theme={C}
          hasError={!!errorMsg && pin !== pinConfirm}
        />

        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

        <TouchableOpacity
          style={[styles.btn, !canSubmit && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>
            {loading ? "Création…" : "Valider"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <RelationPickerModal
        visible={relationPickerVisible}
        C={C}
        value={relation}
        onClose={() => setRelationPickerVisible(false)}
        onPick={setRelation}
      />
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
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "DM_Sans_400Regular",
    fontSize: 14,
    color: C.muted,
    lineHeight: 22,
    marginBottom: 24,
  },
  sectionLabel: {
    fontFamily: "DM_Sans_700Bold",
    fontSize: 15,
    color: "#fff",
    marginBottom: 12,
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
    marginBottom: 12,
  },
  relationRow: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  relationValue: {
    fontFamily: "DM_Sans_400Regular",
    fontSize: 14,
    color: C.muted,
    marginTop: 4,
  },
  errorText: {
    fontFamily: "DM_Sans_400Regular",
    color: C.danger,
    fontSize: 13,
    marginBottom: 12,
    textAlign: "center",
  },
  btn: {
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    fontFamily: "DM_Sans_700Bold",
    fontSize: 16,
    color: "#fff",
  },
});
