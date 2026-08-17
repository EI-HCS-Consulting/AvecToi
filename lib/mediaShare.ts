import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";
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

// Trace qu'un utilisateur a téléchargé/partagé la photo d'un AUTRE
// (Nouvelles/Soutien) — alimente la section "Photos téléchargées" de la
// page Mes Souvenirs (components/MesSouvenirs.tsx). Les photos qu'on a
// soi-même publiées ne passent jamais par ici (voir MesSouvenirs.tsx, qui
// les dérive directement de news_entries/support_messages).
export async function logSavedMedia(params: {
  spaceId: string;
  sourceType: "news" | "support";
  sourceId: string;
  photoUrl: string;
  savedByPin: string;
}): Promise<void> {
  await supabase.from("saved_media").upsert(
    {
      space_id: params.spaceId,
      source_type: params.sourceType,
      source_id: params.sourceId,
      photo_url: params.photoUrl,
      saved_by_pin: params.savedByPin,
    },
    { onConflict: "space_id,source_type,source_id,photo_url,saved_by_pin", ignoreDuplicates: true },
  );
}
