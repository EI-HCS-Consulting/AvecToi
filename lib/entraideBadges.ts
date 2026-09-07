import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useWallUnreadIds, type WallRow } from "@/lib/wallUnread";

type BadgeTaskRow = WallRow & {
  urgent: boolean;
  status: "ouvert" | "pris_en_charge" | "fait" | "ferme";
  category: string;
};

export interface EntraideBadges {
  urgentUnclaimed: boolean;
  newUnseen: boolean;
}

// Alimente le pictogramme Entraide de la barre d'onglets ((admin)/_layout.tsx
// et (visitor)/_layout.tsx) : intérieur rouge s'il existe un besoin Urgent
// pas encore pris en charge, + un second point rouge si un besoin (le sien
// inclus, voir lib/wallUnread.ts) n'a pas encore été marqué vu pour ce
// viewer — même Set que celui qui alimente les badges "New" du mur Entraide
// lui-même (mécanisme partagé avec Soutien/Nouvelles), volontairement lié.
export function useEntraideBadges(spaceId: string | null, isAdmin: boolean): EntraideBadges {
  const [taskRows, setTaskRows] = useState<BadgeTaskRow[] | null>(null);
  // Lignes task_relais_coverage (les propositions "Je m'en occupe" sur un
  // besoin SOS) synthétisées en WallRow pour alimenter le même Set "non vu"
  // que les tâches elles-mêmes — sans ça, une nouvelle prise en charge sur un
  // besoin déjà vu n'allumait jamais le point rouge/badge New (bug remonté :
  // André Baupin prend en charge une période, aucun badge New côté admin).
  // Regroupées avec taskRows dans un seul setState pour que le bootstrap
  // "première visite jamais faite" de useWallUnreadIds (lib/wallUnread.ts)
  // voit les deux d'un coup — sinon une couverture pré-existante à l'ajout de
  // cette fonctionnalité serait à tort signalée "New" au tout premier chargement.
  const [wallRows, setWallRows] = useState<WallRow[] | null>(null);

  useEffect(() => {
    if (!spaceId) return;
    setTaskRows(null);
    setWallRows(null);
    let cancelled = false;
    async function load() {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, urgent, status, category, author_prenom, author_nom, author_pin, created_at, deleted_by_admin")
        .eq("space_id", spaceId);
      if (error) { console.error("[useEntraideBadges] query failed:", error); return; }
      const tasks = (data as BadgeTaskRow[]) ?? [];

      const relaisIds = tasks.filter((t) => t.category === "relais").map((t) => t.id);
      let coverageWallRows: WallRow[] = [];
      if (relaisIds.length > 0) {
        const { data: coverage, error: covError } = await supabase
          .from("task_relais_coverage")
          .select("id, prenom, nom, created_at")
          .in("task_id", relaisIds);
        if (covError) console.error("[useEntraideBadges] coverage query failed:", covError);
        else {
          coverageWallRows = (coverage ?? []).map((c) => ({
            id: c.id,
            author_prenom: c.prenom,
            author_nom: c.nom,
            author_pin: null,
            created_at: c.created_at,
            deleted_by_admin: false,
          }));
        }
      }

      if (cancelled) return;
      setTaskRows(tasks);
      setWallRows([...tasks, ...coverageWallRows]);
    }
    load();
    // Suffixe aléatoire indispensable : react-navigation/bottom-tabs peut
    // monter EntraideTabIcon plusieurs fois en parallèle pour le même onglet
    // (passes de mesure/animation). Avec un nom de canal fixe, la 2e instance
    // récupère le canal déjà abonné de la 1re (supabase.channel() renvoie le
    // canal existant pour un topic identique) et son .on() plante avec
    // "cannot add postgres_changes callbacks... after subscribe()". Un nom
    // unique par montage garantit que chaque instance a son propre canal.
    // task_relais_coverage n'a pas de colonne space_id (seulement task_id) :
    // pas de filtre serveur possible sur ce canal, on reload sur tout
    // événement et load() re-scope proprement côté client via relaisIds.
    const ch = supabase
      .channel(`entraide-badges:${spaceId}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `space_id=eq.${spaceId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_relais_coverage" }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [spaceId]);

  const visible = (taskRows ?? []).filter((t) => !t.deleted_by_admin);
  const urgentUnclaimed = visible.some((t) => t.urgent && t.status === "ouvert");
  const { unreadIds } = useWallUnreadIds("entraide", spaceId, isAdmin, wallRows);

  return { urgentUnclaimed, newUnseen: unreadIds.size > 0 };
}
