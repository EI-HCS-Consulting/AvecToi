import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { relaisIdentityKey, resolveRelaisIdentity } from "@/lib/relaisAlerts";

type BadgeTaskRow = {
  urgent: boolean;
  status: "ouvert" | "pris_en_charge" | "fait" | "ferme";
  author_prenom: string | null;
  author_nom: string | null;
  author_pin: string | null;
  created_at: string;
  deleted_by_admin: boolean;
};

function seenKey(spaceId: string, isAdmin: boolean, myKey: string) {
  return `entraide_seen_${spaceId}_${isAdmin ? "ADMIN" : myKey}`;
}

// À appeler quand l'écran Entraide est effectivement affiché (voir
// components/Entraide.tsx) — sert de référence à useEntraideBadges
// ci-dessous pour savoir si un besoin publié par quelqu'un d'autre est
// "nouveau" depuis la dernière visite de ce viewer.
export async function markEntraideSeen(spaceId: string, isAdmin: boolean): Promise<void> {
  const identity = await resolveRelaisIdentity(isAdmin);
  const myKey = relaisIdentityKey(identity.prenom, identity.nom);
  await AsyncStorage.setItem(seenKey(spaceId, isAdmin, myKey), new Date().toISOString());
}

export interface EntraideBadges {
  urgentUnclaimed: boolean;
  newFromOthers: boolean;
}

// Alimente le pictogramme Entraide de la barre d'onglets ((admin)/_layout.tsx
// et (visitor)/_layout.tsx) : intérieur rouge s'il existe un besoin Urgent
// pas encore pris en charge, + petite cloche rouge si quelqu'un d'autre a
// publié un besoin depuis la dernière visite de cet écran par ce viewer.
export function useEntraideBadges(spaceId: string | null, isAdmin: boolean): EntraideBadges {
  const [rows, setRows] = useState<BadgeTaskRow[]>([]);
  const [myKey, setMyKey] = useState<string | null>(null);
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  useEffect(() => {
    if (!spaceId) return;
    let cancelled = false;
    (async () => {
      const identity = await resolveRelaisIdentity(isAdmin);
      const key = relaisIdentityKey(identity.prenom, identity.nom);
      const seen = await AsyncStorage.getItem(seenKey(spaceId, isAdmin, key));
      if (cancelled) return;
      setMyKey(key);
      setLastSeen(seen);
    })();
    return () => { cancelled = true; };
  }, [spaceId, isAdmin]);

  useEffect(() => {
    if (!spaceId) return;
    let cancelled = false;
    async function load() {
      const { data, error } = await supabase
        .from("tasks")
        .select("urgent, status, author_prenom, author_nom, author_pin, created_at, deleted_by_admin")
        .eq("space_id", spaceId);
      if (error) { console.error("[useEntraideBadges] query failed:", error); return; }
      if (!cancelled) setRows((data as BadgeTaskRow[]) ?? []);
    }
    load();
    const ch = supabase
      .channel(`entraide-badges:${spaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `space_id=eq.${spaceId}` }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [spaceId]);

  const visible = rows.filter((t) => !t.deleted_by_admin);
  const urgentUnclaimed = visible.some((t) => t.urgent && t.status === "ouvert");
  const newFromOthers = myKey !== null && visible.some((t) => {
    const isSelfAuthor = isAdmin
      ? t.author_pin === "ADMIN"
      : relaisIdentityKey(t.author_prenom ?? "", t.author_nom ?? "") === myKey;
    if (isSelfAuthor) return false;
    return !lastSeen || t.created_at > lastSeen;
  });

  return { urgentUnclaimed, newFromOthers };
}
