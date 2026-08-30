import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useWallUnread, type WallRow } from "@/lib/wallUnread";

type BadgeTaskRow = WallRow & {
  urgent: boolean;
  status: "ouvert" | "pris_en_charge" | "fait" | "ferme";
};

export interface EntraideBadges {
  urgentUnclaimed: boolean;
  newFromOthers: boolean;
}

// Alimente le pictogramme Entraide de la barre d'onglets ((admin)/_layout.tsx
// et (visitor)/_layout.tsx) : intérieur rouge s'il existe un besoin Urgent
// pas encore pris en charge, + petite cloche rouge si un besoin publié par
// quelqu'un d'autre n'a pas encore défilé dans la zone visible du mur
// Entraide pour ce viewer (voir lib/wallUnread.ts, mécanisme partagé avec
// Soutien/Nouvelles).
export function useEntraideBadges(spaceId: string | null, isAdmin: boolean): EntraideBadges {
  const [rows, setRows] = useState<BadgeTaskRow[] | null>(null);

  useEffect(() => {
    if (!spaceId) return;
    setRows(null);
    let cancelled = false;
    async function load() {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, urgent, status, author_prenom, author_nom, author_pin, created_at, deleted_by_admin")
        .eq("space_id", spaceId);
      if (error) { console.error("[useEntraideBadges] query failed:", error); return; }
      if (!cancelled) setRows((data as BadgeTaskRow[]) ?? []);
    }
    load();
    // Suffixe aléatoire indispensable : react-navigation/bottom-tabs peut
    // monter EntraideTabIcon plusieurs fois en parallèle pour le même onglet
    // (passes de mesure/animation). Avec un nom de canal fixe, la 2e instance
    // récupère le canal déjà abonné de la 1re (supabase.channel() renvoie le
    // canal existant pour un topic identique) et son .on() plante avec
    // "cannot add postgres_changes callbacks... after subscribe()". Un nom
    // unique par montage garantit que chaque instance a son propre canal.
    const ch = supabase
      .channel(`entraide-badges:${spaceId}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `space_id=eq.${spaceId}` }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [spaceId]);

  const visible = (rows ?? []).filter((t) => !t.deleted_by_admin);
  const urgentUnclaimed = visible.some((t) => t.urgent && t.status === "ouvert");
  const { unreadIds } = useWallUnread("entraide", spaceId, isAdmin, rows);

  return { urgentUnclaimed, newFromOthers: unreadIds.size > 0 };
}
