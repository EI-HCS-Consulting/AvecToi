import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { relaisIdentityKey, resolveRelaisIdentity } from "@/lib/relaisAlerts";

// Mécanisme générique de "non lu" partagé par les 3 murs de publications
// (Entraide/tasks, Soutien/support_messages, Nouvelles/news_entries) :
// cadre orange sur chaque élément publié par quelqu'un d'autre depuis la
// dernière fois que ce viewer a rouvert l'app, + point rouge sur le picto de
// la barre d'onglets tant qu'il en reste au moins un (voir UnreadDotIcon.tsx).
// Le cadre reste fixe tout le temps que la connexion dure (pas de marquage
// "vu" au scroll) et ne disparaît qu'à la prochaine réouverture de l'app
// après une mise en arrière-plan (fermeture ou écran éteint) — voir le
// flush sur AppState dans useWallUnread plus bas. Remplace l'ancien
// mécanisme à un seul horodatage (lib/entraideBadges.ts avant ce fichier) :
// celui-ci marquait tout "vu" dès l'ouverture de l'écran, avant même que le
// viewer ait pu lire quoi que ce soit.
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

  // Flush de session (voir AppState dans useWallUnread) : marque "vu" tout
  // un lot d'ids d'un coup plutôt qu'un par un, pour n'écrire qu'une seule
  // fois en storage à la réouverture de l'app.
  const markAllSeen = useCallback((ids: Set<string>) => {
    if (!key || ids.size === 0) return;
    setSeenIds((prev) => {
      const base = prev ?? new Set<string>();
      let changed = false;
      const next = new Set(base);
      ids.forEach((id) => {
        if (!next.has(id)) { next.add(id); changed = true; }
      });
      if (!changed) return prev;
      writeSeenIds(key, next);
      return next;
    });
  }, [key]);

  return { seenIds, myKey, markSeen, markAllSeen };
}

// Calcul brut des ids "non lus", sans effet de bord — partagé par
// useWallUnread (écrans, avec flush de session ci-dessous) et useWallBadge
// (picto d'onglet, qui ne doit jamais flusher lui-même : voir plus bas).
function useWallUnreadIds(scope: WallScope, spaceId: string | null, isAdmin: boolean, rows: WallRow[] | null) {
  const { seenIds, myKey, markAllSeen } = useWallSeenIds(scope, spaceId, isAdmin, rows);
  const unreadIds = seenIds === null || myKey === null || rows === null
    ? new Set<string>()
    : new Set(
        rows
          .filter((r) => !r.deleted_by_admin && !isSelfWallAuthor(r, isAdmin, myKey) && !seenIds.has(r.id))
          .map((r) => r.id),
      );
  return { unreadIds, markAllSeen };
}

// À utiliser dans l'écran du mur lui-même (Entraide/Soutien/NewsFeed) :
// expose les ids "non lus" (cadre orange tant qu'ils y restent). `rows` doit
// valoir `null` tant que le chargement initial de l'appelant n'est pas
// terminé (voir useWallSeenIds ci-dessus) — passer un tableau vide
// prématurément romprait le bootstrap anti-historique.
export function useWallUnread(scope: WallScope, spaceId: string | null, isAdmin: boolean, rows: WallRow[] | null) {
  const { unreadIds, markAllSeen } = useWallUnreadIds(scope, spaceId, isAdmin, rows);

  // Cadre fixe le temps de la connexion : contrairement à l'ancien marquage
  // au scroll, rien n'est marqué "vu" tant que l'app reste au premier plan —
  // seule une vraie réouverture (retour au premier plan après une mise en
  // arrière-plan : app fermée ou écran éteint) flushe le lot en cours vers le
  // storage, ce qui le fait disparaître à cet instant précis et laisse la
  // place au nouveau lot (ce qui a été publié pendant l'absence, s'il y en
  // a). `unreadIdsRef` capture la valeur juste avant le flush : l'event
  // AppState est synchrone, donc aucun refetch réseau ne peut s'être glissé
  // entre les deux dans le même tick. Volontairement absent de useWallBadge :
  // le picto d'onglet reste monté même sans jamais visiter le mur, un flush
  // câblé là-bas éteindrait le point rouge au simple fait de rouvrir l'app,
  // sans que le viewer ait rien vu.
  const unreadIdsRef = useRef(unreadIds);
  unreadIdsRef.current = unreadIds;
  const markAllSeenRef = useRef(markAllSeen);
  markAllSeenRef.current = markAllSeen;
  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (/inactive|background/.test(appStateRef.current) && next === "active") {
        markAllSeenRef.current(unreadIdsRef.current);
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, []);

  return { unreadIds };
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

  const { unreadIds } = useWallUnreadIds(scope, spaceId, isAdmin, rows);
  return unreadIds.size > 0;
}
