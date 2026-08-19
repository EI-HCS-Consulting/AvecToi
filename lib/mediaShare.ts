import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import Share from "react-native-share";
import { Alert, Platform } from "react-native";
import { supabase } from "@/lib/supabase";

export async function isShareAvailable(): Promise<boolean> {
  return Sharing.isAvailableAsync();
}

// Télécharge une photo distante dans le cache local puis ouvre la feuille de
// partage native (SMS/WhatsApp/Email/Telegram/Signal/etc., selon ce qui est
// installé sur l'appareil) — pattern commun à NewsFeed.tsx, Soutien.tsx et
// SouvenirsGallery.tsx, centralisé ici pour éviter la duplication.
export async function downloadAndShare(url: string, filename: string, dialogTitle?: string): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) {
    Alert.alert("Partage non disponible", "Le partage de fichiers n'est pas disponible sur cet appareil.");
    return false;
  }
  try {
    const localUri = (FileSystem.cacheDirectory ?? "") + filename;
    const { uri } = await FileSystem.downloadAsync(url, localUri);
    await Sharing.shareAsync(uri, { mimeType: "image/jpeg", dialogTitle });
    return true;
  } catch {
    return false;
  }
}

// Version groupée de downloadAndShare : télécharge plusieurs photos dans le
// cache local puis ouvre une SEULE feuille de partage native pour toutes à
// la fois (react-native-share, via Share.open({ urls })) — expo-sharing ne
// permet pas de partager plusieurs fichiers en un seul appel, d'où le
// passage par cette lib pour la sélection multiple (Nouvelles/Soutien/
// Souvenirs). Le partage d'un seul média continue d'utiliser downloadAndShare.
export async function downloadAndShareMultiple(
  items: { url: string; filename: string }[],
  dialogTitle?: string,
): Promise<boolean> {
  if (items.length === 0) return false;
  if (!(await Sharing.isAvailableAsync())) {
    Alert.alert("Partage non disponible", "Le partage de fichiers n'est pas disponible sur cet appareil.");
    return false;
  }
  try {
    const localUris = await Promise.all(
      items.map(async (item) => {
        const localUri = (FileSystem.cacheDirectory ?? "") + item.filename;
        const { uri } = await FileSystem.downloadAsync(item.url, localUri);
        return uri;
      }),
    );
    await Share.open({ urls: localUris, failOnCancel: false, title: dialogTitle });
    return true;
  } catch {
    return false;
  }
}

// Enregistre un texte généré localement (courrier, voir lib/letterTemplates.ts)
// puis propose de le sauvegarder/partager — pas de téléchargement réseau ici,
// à la différence de downloadAndShare, le contenu est déjà en mémoire. Sur
// web, expo-sharing n'est pas disponible : on déclenche un téléchargement
// navigateur classique (Blob + <a download>) plutôt que d'échouer.
export async function saveAndShareText(content: string, filename: string, dialogTitle?: string): Promise<boolean> {
  if (Platform.OS === "web") {
    try {
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    } catch {
      return false;
    }
  }
  if (!(await Sharing.isAvailableAsync())) {
    Alert.alert("Partage non disponible", "Le partage de fichiers n'est pas disponible sur cet appareil.");
    return false;
  }
  try {
    const localUri = (FileSystem.cacheDirectory ?? "") + filename;
    await FileSystem.writeAsStringAsync(localUri, content, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(localUri, { mimeType: "text/plain", dialogTitle });
    return true;
  } catch {
    return false;
  }
}

// RTF minimal (pas de vraie lib docx) : Word/LibreOffice l'ouvrent nativement
// sous l'extension .doc. \uNNNN? échappe tout caractère non-ASCII (accents),
// ? servant de repli pour les lecteurs RTF qui ignorent \u.
function escapeRtf(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0;
    if (ch === "\\" || ch === "{" || ch === "}") {
      out += "\\" + ch;
    } else if (ch === "\n") {
      out += "\\par\n";
    } else if (ch === "\t") {
      out += "\\tab ";
    } else if (code > 127) {
      out += `\\u${code}?`;
    } else {
      out += ch;
    }
  }
  return out;
}

// A4, marges 2,5cm (repère standard courrier FR) : donne une largeur de
// page connue pour placer le bloc destinataire (voir
// lettre_employeur_conge_proche_aidant, lib/letterTemplates.ts) à environ
// 10cm de la marge gauche, soit ~12,5cm du bord de la page — cohérent avec
// la norme AFNOR NF Z11-001 (bloc destinataire visible dans la fenêtre
// d'une enveloppe à fenêtre, repère ~11cm du bord) — tout en laissant ~6cm
// jusqu'à la marge droite pour qu'une ligne d'adresse courante ne soit
// jamais coupée ni ne revienne à la ligne.
// \tx (taquet de tabulation explicite posé par \pard) plutôt que \deftab
// seul : \deftab n'est pas fiable sur tous les lecteurs RTF (Word mobile,
// Google Docs, WPS…), qui retombent alors sur un taquet par défaut bien
// trop court — \tx est le contrôle RTF standard le plus largement respecté
// pour un taquet de tabulation à une position donnée.
const ADDRESS_TAB_TWIPS = 5670;
function textToRtf(content: string): string {
  return `{\\rtf1\\ansi\\ansicpg1252\\deff0{\\fonttbl{\\f0 Calibri;}}\\paperw11906\\paperh16838\\margl1417\\margr1417\\margt1417\\margb1417\\deftab${ADDRESS_TAB_TWIPS}\\pard\\tx${ADDRESS_TAB_TWIPS}\\f0\\fs22 ${escapeRtf(content)}}`;
}

// Même usage que saveAndShareText (courrier généré, voir lib/letterTemplates.ts)
// mais enregistré au format .doc (RTF) plutôt qu'en .txt brut, pour que le
// document soit directement modifiable dans Word/LibreOffice.
// `subject` préremplit l'objet de l'email quand l'appli choisie dans la
// feuille de partage est un client mail (voir LetterTemplate.objet dans
// lib/letterTemplates.ts) — expo-sharing n'expose pas ce champ, d'où le
// passage par react-native-share (Share.open) plutôt que Sharing.shareAsync.
export async function saveAndShareDoc(content: string, filename: string, dialogTitle?: string, subject?: string): Promise<boolean> {
  const rtf = textToRtf(content);
  if (Platform.OS === "web") {
    try {
      const blob = new Blob([rtf], { type: "application/msword;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    } catch {
      return false;
    }
  }
  if (!(await Sharing.isAvailableAsync())) {
    Alert.alert("Partage non disponible", "Le partage de fichiers n'est pas disponible sur cet appareil.");
    return false;
  }
  try {
    const localUri = (FileSystem.cacheDirectory ?? "") + filename;
    await FileSystem.writeAsStringAsync(localUri, rtf, { encoding: FileSystem.EncodingType.UTF8 });
    await Share.open({ url: localUri, type: "application/msword", title: dialogTitle, subject, failOnCancel: false });
    return true;
  } catch {
    return false;
  }
}

// Trace qu'un utilisateur a téléchargé/partagé la photo d'un AUTRE
// (Nouvelles/Soutien) — alimente la section "Photos téléchargées" de la
// page Mes Souvenirs (components/MesSouvenirs.tsx). Les photos qu'on a
// soi-même publiées ne passent jamais par ici (voir MesSouvenirs.tsx, qui
// les dérive directement de news_entries/support_messages).
//
// L'identité s'appuie sur prénom/nom (savedByPrenom/Nom), pas seulement sur
// le pin de session : un visiteur qui n'a jamais publié n'a pas encore de
// pin, sinon ses téléchargements ne seraient jamais tracés. Passer "" pour
// savedByPin côté visiteur sans pin est valide ; l'admin passe toujours
// savedByPin="ADMIN" et peut laisser prénom/nom vides.
export async function logSavedMedia(params: {
  spaceId: string;
  sourceType: "news" | "support";
  sourceId: string;
  photoUrl: string;
  savedByPin: string;
  savedByPrenom: string;
  savedByNom: string;
}): Promise<void> {
  await supabase.from("saved_media").upsert(
    {
      space_id: params.spaceId,
      source_type: params.sourceType,
      source_id: params.sourceId,
      photo_url: params.photoUrl,
      saved_by_pin: params.savedByPin,
      saved_by_prenom: params.savedByPrenom,
      saved_by_nom: params.savedByNom,
    },
    { onConflict: "space_id,source_type,source_id,photo_url,saved_by_pin,saved_by_prenom,saved_by_nom", ignoreDuplicates: true },
  );
}
