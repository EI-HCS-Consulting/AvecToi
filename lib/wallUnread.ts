import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { relaisIdentityKey, resolveRelaisIdentity } from "@/lib/relaisAlerts";

// Un seul mécanisme, partagé par les 3 murs de publications (Entraide/tasks,
// Soutien/support_messages, Nouvelles/news_entries) et par ses deux
// affichages :
//
// - Badge "New" (barre d'accent + chip, voir components/NewIndicator.tsx),
//   posé sur chaque élément individuel du mur, quel que soit son statut
//   (ouvert/pris en charge/fermé/fait inclus — aucun filtre sur le statut
//   ici) ;
// - Point rouge sur le picto de la barre d'onglets (voir UnreadDotIcon.tsx /
//   EntraideTabIcon.tsx) : allumé dès qu'au moins un élément du mur est
//   non-lu.
//
// Les deux sont dérivés du même Set (`unreadIds`, voir useWallUnreadIds) —
// volontairement liés : un badge "New" visible sur le mur implique le point
// rouge, et réciproquement il ne doit jamais y avoir de point rouge sans au
// moins un badge "New" quelque part sur le mur correspondant.
//
// seenIds persistés en AsyncStorage (voir useWallSeenIds), inchangé depuis
// PR #346 — flush sur AppState câblé depuis l'écran du mur lui-même
// (useWallReadTracking, qui retourne ce même `unreadIds` pour alimenter
// aussi bien les badges "New" locaux que le flush).
//
// Contrairement à l'ancien mécanisme à un seul horodatage de session
// (sessionLoginTimestamp, retiré — un élément publié avant le démarrage de
// l'app n'était jamais "New" même resté non consulté, et un élément publié
// par le viewer lui-même n'était jamais visible pour lui), et à l'ancien
// mécanisme "tout marqué vu dès l'ouverture de l'écran" d'avant lib/
// entraideBadges.ts : "vu" veut dire vu, pas "l'app tournait déjà" ni
// "l'écran a été ouvert".
//
// Un élément publié par le viewer lui-même compte comme non-lu jusqu'à ce
// qu'il soit marqué vu comme les autres (bootstrap ou flush) : c'est ce qui
// permet au badge "New" d'apparaître dès la publication, pour l'auteur
// lui-même.
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

  // Flush de session (voir AppState dans useWallReadTracking) : marque "vu" tout
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

// Calcul brut des ids "non lus" (seenIds persistés), sans effet de bord —
// partagé par useWallReadTracking (écrans, avec flush de session ci-dessous)
// et useWallBadge (picto d'onglet, qui ne doit jamais flusher lui-même :
// voir plus bas). Un élément publié par le viewer lui-même n'est PAS exclu :
// voir la note en tête de fichier — c'est ce qui fait apparaître le badge
// "New" dès sa propre publication.
export function useWallUnreadIds(scope: WallScope, spaceId: string | null, isAdmin: boolean, rows: WallRow[] | null) {
  const { seenIds, myKey, markAllSeen } = useWallSeenIds(scope, spaceId, isAdmin, rows);
  const unreadIds = seenIds === null || myKey === null || rows === null
    ? new Set<string>()
    : new Set(
        rows
          .filter((r) => !r.deleted_by_admin && !seenIds.has(r.id))
          .map((r) => r.id),
      );
  return { unreadIds, markAllSeen };
}

// À appeler depuis l'écran du mur lui-même (Entraide/Soutien/NewsFeed) : le
// Set retourné alimente à la fois le badge "New" local (components/
// NewIndicator.tsx, sur chaque élément) et, en effet de bord, le flush
// AsyncStorage qui éteint le point rouge du picto d'onglet (useWallBadge) —
// les deux sont volontairement dérivés de ce même calcul, voir la note en
// tête de fichier. `rows` doit valoir `null` tant que le chargement initial
// de l'appelant n'est pas terminé (voir useWallSeenIds plus haut) — passer
// un tableau vide prématurément romprait le bootstrap anti-historique.
export function useWallReadTracking(scope: WallScope, spaceId: string | null, isAdmin: boolean, rows: WallRow[] | null): Set<string> {
  const { unreadIds, markAllSeen } = useWallUnreadIds(scope, spaceId, isAdmin, rows);

  // Contrairement à l'ancien marquage au scroll, rien n'est marqué "vu" tant
  // que l'app reste au premier plan — seule une vraie réouverture (retour au
  // premier plan après une mise en arrière-plan : app fermée ou écran
  // éteint) flushe le lot en cours vers le storage, ce qui éteint le point
  // rouge à cet instant précis et laisse la place au nouveau lot (ce qui a
  // été publié pendant l'absence, s'il y en a). `unreadIdsRef` capture la
  // valeur juste avant le flush : l'event AppState est synchrone, donc aucun
  // refetch réseau ne peut s'être glissé entre les deux dans le même tick.
  //
  // On exige explicitement "background" (pas seulement "inactive") comme
  // état précédent : présenter/masquer un <Modal> natif RN (RebookingAlert-
  // Modal, DeletedContentAlertModal... tous montés en permanence dans les
  // _layout.tsx, donc actifs quel que soit l'onglet affiché) fait
  // transitoirement passer AppState par "inactive" sur iOS, SANS jamais
  // atteindre "background" — un simple changement d'onglet suffisait donc à
  // déclencher ce flush par erreur (et à effacer des badges "New" jamais
  // réellement vus), tout en laissant le flush ne se produire qu'au hasard
  // pour un mur donné (d'où des badges qui semblaient à la fois s'effacer
  // trop tôt sur certains murs et s'accumuler indéfiniment sur d'autres,
  // comme Soutien — un seul et même bug). Une vraie mise en arrière-plan
  // (bouton Accueil, multitâche, écran éteint) transite toujours par
  // "background" sur iOS comme sur Android.
  const unreadIdsRef = useRef(unreadIds);
  unreadIdsRef.current = unreadIds;
  const markAllSeenRef = useRef(markAllSeen);
  markAllSeenRef.current = markAllSeen;
  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (appStateRef.current === "background" && next === "active") {
        markAllSeenRef.current(unreadIdsRef.current);
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, []);

  return unreadIds;
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
