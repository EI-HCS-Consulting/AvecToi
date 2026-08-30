import { useCallback, useEffect, useRef, useState } from "react";
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { relaisIdentityKey, resolveRelaisIdentity } from "@/lib/relaisAlerts";

// Mécanisme générique de "non lu" partagé par les 3 murs de publications
// (Entraide/tasks, Soutien/support_messages, Nouvelles/news_entries) : fond
// pastel orange sur chaque élément publié par quelqu'un d'autre depuis la
// dernière fois que ce viewer a fait défiler le mur jusqu'à lui (voir
// registerItemLayout/useWallVisibility plus bas), + point rouge sur le
// picto de la barre d'onglets tant qu'il en reste au moins un (voir
// UnreadDotIcon.tsx). Remplace l'ancien mécanisme à un seul horodatage
// (lib/entraideBadges.ts avant ce fichier) : celui-ci marquait tout "vu" dès
// l'ouverture de l'écran, avant même que le viewer ait pu lire quoi que ce
// soit.
export type WallScope = "entraide" | "soutien" | "news";

export interface WallRow {
  id: string;
  author_prenom: string | null;
  author_nom: string | null;
  author_pin: string | null;
  created_at: string;
  deleted_by_admin: boolean;
}

function storageKey(scope: WallScope, spaceId: string, isAdmin: boolean, myKey: string): string {
  return `wall_seen_ids_${scope}_${spaceId}_${isAdmin ? "ADMIN" : myKey}`;
}

async function readSeenIds(key: string): Promise<Set<string> | null> {
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) return null;
  try {
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

// Pub/sub en mémoire, propre à ce module : le picto de la barre d'onglets
// reste monté en permanence par le Tab Navigator (jamais démonté au
// changement d'onglet), donc son hook ne relit jamais spontanément
// AsyncStorage — sans ceci, un marquage "lu" fait depuis l'écran du mur
// n'effacerait le point rouge qu'après un redémarrage complet de l'app.
type Listener = (ids: Set<string>) => void;
const listeners = new Map<string, Set<Listener>>();

function notify(key: string, ids: Set<string>) {
  listeners.get(key)?.forEach((fn) => fn(ids));
}

function subscribe(key: string, fn: Listener): () => void {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key)!.add(fn);
  return () => listeners.get(key)?.delete(fn);
}

async function writeSeenIds(key: string, ids: Set<string>) {
  await AsyncStorage.setItem(key, JSON.stringify([...ids]));
  notify(key, ids);
}

export function isSelfWallAuthor(r: WallRow, isAdmin: boolean, myKey: string): boolean {
  return isAdmin ? r.author_pin === "ADMIN" : relaisIdentityKey(r.author_prenom ?? "", r.author_nom ?? "") === myKey;
}

function useMyWallKey(isAdmin: boolean): string | null {
  const [myKey, setMyKey] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    resolveRelaisIdentity(isAdmin).then((identity) => {
      if (!cancelled) setMyKey(relaisIdentityKey(identity.prenom, identity.nom));
    });
    return () => { cancelled = true; };
  }, [isAdmin]);
  return myKey;
}

// Ids déjà lus pour ce scope, avec bootstrap sur le 1er chargement RÉEL des
// lignes (rows === null tant que l'appelant n'a pas fini son propre fetch,
// voir plus bas) : la toute première fois qu'un viewer voit ce mur — aucune
// clé en storage — tout ce qui existe déjà est marqué lu d'un coup, pour ne
// pas faire ressurgir en orange tout l'historique existant. Un simple
// `rows.length > 0` serait insuffisant ici : un mur réellement vide au tout
// premier chargement (rows === [] parce que fetch terminé, pas parce qu'il
// n'a pas encore eu lieu) doit quand même figer le bootstrap à cet instant
// (storage = Set vide), sinon la 1ère publication qui arrive juste après
// serait avalée par le bootstrap au lieu d'apparaître en non-lu.
function useWallSeenIds(scope: WallScope, spaceId: string | null, isAdmin: boolean, rows: WallRow[] | null) {
  const myKey = useMyWallKey(isAdmin);
  const key = spaceId && myKey !== null ? storageKey(scope, spaceId, isAdmin, myKey) : null;
  const [seenIds, setSeenIds] = useState<Set<string> | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    initRef.current = false;
    setSeenIds(null);
  }, [key]);

  useEffect(() => {
    if (!key || initRef.current) return;
    let cancelled = false;
    (async () => {
      const stored = await readSeenIds(key);
      if (cancelled) return;
      if (stored !== null) {
        initRef.current = true;
        setSeenIds(stored);
      } else if (rows !== null) {
        initRef.current = true;
        const ids = new Set(rows.map((r) => r.id));
        await writeSeenIds(key, ids);
        if (!cancelled) setSeenIds(ids);
      }
    })();
    return () => { cancelled = true; };
  }, [key, rows]);

  useEffect(() => {
    if (!key) return;
    return subscribe(key, setSeenIds);
  }, [key]);

  const markSeen = useCallback((id: string) => {
    if (!key) return;
    setSeenIds((prev) => {
      const base = prev ?? new Set<string>();
      if (base.has(id)) return prev;
      const next = new Set(base);
      next.add(id);
      writeSeenIds(key, next);
      return next;
    });
  }, [key]);

  return { seenIds, myKey, markSeen };
}

// À utiliser dans l'écran du mur lui-même (Entraide/Soutien/NewsFeed) :
// expose les ids "non lus" (fond pastel tant qu'ils y restent) et markSeen,
// à appeler via useWallVisibility ci-dessous quand un élément défile dans le
// viewport visible. `rows` doit valoir `null` tant que le chargement initial
// de l'appelant n'est pas terminé (voir useWallSeenIds ci-dessus) — passer un
// tableau vide prématurément romprait le bootstrap anti-historique.
export function useWallUnread(scope: WallScope, spaceId: string | null, isAdmin: boolean, rows: WallRow[] | null) {
  const { seenIds, myKey, markSeen } = useWallSeenIds(scope, spaceId, isAdmin, rows);
  const unreadIds = seenIds === null || myKey === null || rows === null
    ? new Set<string>()
    : new Set(
        rows
          .filter((r) => !r.deleted_by_admin && !isSelfWallAuthor(r, isAdmin, myKey) && !seenIds.has(r.id))
          .map((r) => r.id),
      );
  return { unreadIds, markSeen };
}

// À utiliser dans le picto de la barre d'onglets (voir UnreadDotIcon.tsx) :
// fait son propre fetch (table paramétrée par mur) + s'abonne au realtime,
// et reflète en direct tout marquage "lu" fait ailleurs (voir subscribe
// ci-dessus) sans dépendre d'un remount de l'icône.
export function useWallBadge(scope: WallScope, table: string, spaceId: string | null, isAdmin: boolean): boolean {
  const [rows, setRows] = useState<WallRow[] | null>(null);

  useEffect(() => {
    if (!spaceId) return;
    setRows(null);
    let cancelled = false;
    async function load() {
      const { data, error } = await supabase
        .from(table)
        .select("id, author_prenom, author_nom, author_pin, created_at, deleted_by_admin")
        .eq("space_id", spaceId);
      if (error) { console.error(`[useWallBadge:${scope}] query failed:`, error); return; }
      if (!cancelled) setRows((data as WallRow[]) ?? []);
    }
    load();
    // Suffixe aléatoire indispensable : react-navigation/bottom-tabs peut
    // monter ce picto plusieurs fois en parallèle (passes de mesure) — voir
    // EntraideTabIcon.tsx pour le même besoin.
    const ch = supabase
      .channel(`wall-badge-${scope}:${spaceId}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table, filter: `space_id=eq.${spaceId}` }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [scope, table, spaceId]);

  const { unreadIds } = useWallUnread(scope, spaceId, isAdmin, rows);
  return unreadIds.size > 0;
}

// Suit, pour un mur rendu en ScrollView + .map() (pas de virtualisation), la
// position de chaque élément et la fenêtre visible du ScrollView, pour
// marquer "lu" (markSeen) tout élément non lu dès qu'il apparaît à l'écran —
// avec ou sans scroll (un élément déjà visible sans avoir besoin de
// défiler compte aussi comme lu, sinon un mur court resterait orange en
// permanence). onScroll/onScrollViewLayout se posent sur le ScrollView,
// registerItemLayout(id) sur le onLayout de chaque carte.
export function useWallVisibility(unreadIds: Set<string>, markSeen: (id: string) => void) {
  const offsets = useRef<Record<string, number>>({});
  const heights = useRef<Record<string, number>>({});
  const scrollY = useRef(0);
  const viewportH = useRef(0);
  const seenLocally = useRef<Set<string>>(new Set());
  const unreadRef = useRef(unreadIds);
  unreadRef.current = unreadIds;
  const markSeenRef = useRef(markSeen);
  markSeenRef.current = markSeen;

  const check = useCallback(() => {
    const top = scrollY.current;
    const bottom = top + viewportH.current;
    if (viewportH.current <= 0) return;
    unreadRef.current.forEach((id) => {
      if (seenLocally.current.has(id)) return;
      const y = offsets.current[id];
      const h = heights.current[id];
      if (y === undefined || h === undefined) return;
      const overlapsViewport = y < bottom && y + h > top;
      if (overlapsViewport) {
        seenLocally.current.add(id);
        markSeenRef.current(id);
      }
    });
  }, []);

  // Ré-évalue dès que la liste des non-lus change (ex. chargement initial
  // terminé) : un élément déjà déposé/mesuré peut alors se retrouver
  // immédiatement visible sans qu'aucun scroll ne se produise.
  useEffect(() => { check(); }, [unreadIds, check]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = e.nativeEvent.contentOffset.y;
    check();
  }, [check]);

  const onScrollViewLayout = useCallback((e: LayoutChangeEvent) => {
    viewportH.current = e.nativeEvent.layout.height;
    check();
  }, [check]);

  const registerItemLayout = useCallback((id: string) => (e: LayoutChangeEvent) => {
    offsets.current[id] = e.nativeEvent.layout.y;
    heights.current[id] = e.nativeEvent.layout.height;
    check();
  }, [check]);

  return { onScroll, onScrollViewLayout, registerItemLayout };
}
