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
