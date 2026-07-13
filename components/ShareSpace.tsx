import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Share, Linking, Alert } from "react-native";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";
import { supabase } from "@/lib/supabase";
import { generateDossierCode } from "@/lib/dossierCode";
import type { PatientSpace } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Extrait de l'ancienne modale "Inviter" de (admin)/dashboard.tsx — devient
// un écran à part entière (onglet "📱 Partager"), accessible à l'admin ET
// au visiteur (qui peut ainsi relayer le lien à d'autres proches).
const WEB_BASE = "https://avectoi.care";
const DOSSIER_CODE_UNIQUE_VIOLATION = "23505";
const DOSSIER_CODE_MAX_ATTEMPTS = 5;

function inviteLink(token: string) {
  return `${WEB_BASE}/invite?token=${token}`;
}

export default function ShareSpace({ space, C }: { space: PatientSpace; C: Theme }) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const link = inviteLink(space.invite_token);

  // Espaces créés avant l'introduction du dossier_code : on lui en génère un
  // paresseusement au premier affichage. Le canal Realtime `space-admin`/
  // `space-visitor` déjà en place répercute la mise à jour automatiquement.
  useEffect(() => {
    if (space.dossier_code) return;

    async function ensureDossierCode() {
      for (let attempt = 0; attempt < DOSSIER_CODE_MAX_ATTEMPTS; attempt++) {
        const { error } = await supabase
          .from("patient_spaces")
          .update({ dossier_code: generateDossierCode() })
          .eq("id", space.id)
          .is("dossier_code", null);
        if (!error || error.code !== DOSSIER_CODE_UNIQUE_VIOLATION) return;
      }
    }

    ensureDossierCode();
  }, [space.id, space.dossier_code]);

  async function handleCopyLink() {
    await Clipboard.setStringAsync(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  }

  async function handleCopyDossierCode() {
    if (!space.dossier_code) return;
    await Clipboard.setStringAsync(space.dossier_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  }

  async function handleShareLink() {
    await Share.share({
      message: `Rejoins l'espace AvecToi pour ${space.patient_firstname} ${space.patient_lastname} :\n${link}`,
      url: link,
    });
  }

  function handleWhatsApp() {
    const msg = encodeURIComponent(`Voici le lien pour suivre les visites de ${space.patient_firstname} : ${link}`);
    Linking.openURL(`whatsapp://send?text=${msg}`).catch(() =>
      Alert.alert("WhatsApp non disponible", "Installe WhatsApp pour partager via l'appli."),
    );
  }

  function handleSMS() {
    const msg = encodeURIComponent(`Rejoins l'espace AvecToi : ${link}`);
    Linking.openURL(`sms:?body=${msg}`);
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: C.text }]}>🔗 Partager l'invitation</Text>

      <Text style={[styles.sub, { color: C.muted }]}>
        Envoie ce lien aux proches pour qu'ils rejoignent l'espace.
      </Text>

      <View style={[styles.qrContainer, { backgroundColor: "#fff", borderColor: C.border }]}>
        <QRCode value={link} size={170} backgroundColor="#fff" color="#0D1B2E" />
      </View>

      <View style={[styles.linkBox, { backgroundColor: C.bg, borderColor: C.border }]}>
        <Text style={[styles.linkText, { color: C.muted }]} numberOfLines={1} ellipsizeMode="middle">
          {link}
        </Text>
      </View>

      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.accent }]} onPress={handleCopyLink}>
        <Text style={styles.actionBtnText}>{copiedLink ? "✓ Copié !" : "📋 Copier le lien"}</Text>
      </TouchableOpacity>

      <View style={styles.row}>
        <TouchableOpacity style={[styles.smallBtn, { backgroundColor: "#25D366" }]} onPress={handleWhatsApp}>
          <Text style={styles.smallBtnText}>WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.smallBtn, { backgroundColor: C.border }]} onPress={handleSMS}>
          <Text style={[styles.smallBtnText, { color: C.text }]}>💬 SMS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.smallBtn, { backgroundColor: C.border }]} onPress={handleShareLink}>
          <Text style={[styles.smallBtnText, { color: C.text }]}>⬆️ Partager</Text>
        </TouchableOpacity>
      </View>

      {space.dossier_code && (
        <View style={[styles.dossierBoxSmall, { borderColor: C.border }]}>
          <Text style={[styles.dossierLabelSmall, { color: C.muted }]}>
            Code dossier : <Text style={{ fontFamily: "DM_Sans_700Bold", color: C.text }}>{space.dossier_code}</Text>
          </Text>
          <TouchableOpacity onPress={handleCopyDossierCode}>
            <Text style={[styles.dossierCopySmall, { color: C.accent }]}>
              {copiedCode ? "✓ Copié" : "Copier"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: "center" },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, marginBottom: 8, textAlign: "center" },
  sub: { fontFamily: "DM_Sans_400Regular", fontSize: 13, textAlign: "center", marginBottom: 22 },
  qrContainer: { borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1 },
  linkBox: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, width: "100%", marginBottom: 14 },
  linkText: { fontFamily: "DM_Sans_400Regular", fontSize: 12 },
  actionBtn: { borderRadius: 10, paddingVertical: 14, paddingHorizontal: 20, width: "100%", alignItems: "center", marginBottom: 12 },
  actionBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 14, color: "#fff" },
  row: { flexDirection: "row", gap: 8, width: "100%" },
  smallBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  smallBtnText: { fontFamily: "DM_Sans_700Bold", fontSize: 12, color: "#fff" },
  dossierBoxSmall: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, width: "100%", paddingTop: 14, marginTop: 14 },
  dossierLabelSmall: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },
  dossierCopySmall: { fontFamily: "DM_Sans_700Bold", fontSize: 13 },
});
