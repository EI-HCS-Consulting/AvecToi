import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "@/lib/supabase";
import type { PatientSpace, Reservation, Task, ShoppingListItem, TaskRelaisCoverage } from "@/lib/types";
import type { Theme } from "@/lib/themes";
import { LOGO_ORANGE, LOGO_GREEN, LOGO_NAVY, LOGO_PURPLE, LOGO_SKYBLUE, PASTEL_COLORS } from "@/lib/themes";
import { isMyReservation, getSlotOccupancy, getWeekDates, toISO, toFrLong, toFrShort, addDays } from "@/lib/slotUtils";
import { visitorIdentityKey, initials } from "@/lib/visitorRoster";

// Dupliqué depuis components/Entraide.tsx (non exportés là-bas) — jeu réduit,
// pas de sous-titre auto ni de catégorie "Publier un besoin".
const CATEGORY_ICONS: Record<Task["category"], string> = {
  repas: "🍽️", affaires: "👕", courses: "🛒", transport: "🚗",
  administratif: "🗂️", autre: "💡", relais: "🆘",
};
const CATEGORY_LABELS: Record<Task["category"], string> = {
  repas: "Repas", affaires: "Affaires", courses: "Courses", transport: "Transport",
  administratif: "Administratif", autre: "Autre", relais: "Relais",
};

// Palette des liserés/textes par contributeur d'un besoin courses (voir
// courseContributorColors) — couleurs du logo utilisées en priorité, ordre
// vert/orange en premier car ce sont les 2 cas les plus fréquents (moi +
// 1 autre personne).
const COURSE_PALETTE = [LOGO_GREEN, LOGO_ORANGE, LOGO_NAVY, LOGO_PURPLE, LOGO_SKYBLUE];

// Même helper que lib/visitorRoster.ts (privé là-bas) — pas d'export ajouté
// pour un usage à cet unique endroit en plus des 2 déjà existants.
function visitorPhotoUrl(spaceId: string, filename: string): string {
  const { data } = supabase.storage.from("visitor-photos").getPublicUrl(`${spaceId}/${filename}`);
  return data.publicUrl;
}

// "samedi 12/09/2026" — jour de la semaine + JJ/MM/AAAA, ni l'un
// (toFrLong, pas d'année) ni l'autre (toFrShort, pas de jour) des formats
// existants dans slotUtils.ts ne suffisant seuls pour l'échéance affichée
// dans "Mes engagements".
function dueDateLabel(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  const weekday = d.toLocaleDateString("fr-FR", { weekday: "long" });
  return `${weekday} ${toFrShort(d)}`;
}

// Cible de navigation au tap d'une entrée — "reservation" réutilise le
// pattern focusDate/focusCreneau de VisitorProfileModal.tsx (slots/nights
// scrollent jusqu'à la ligne exacte), "task" réutilise focusTaskId
// d'Entraide.tsx (scroll + surlignage du besoin dans le mur d'entraide).
type AgendaNav =
  | { kind: "reservation"; type: "Visite" | "Nuit"; date: string; creneau: string | null }
  | { kind: "task"; taskId: string };

interface AgendaEntry {
  id: string;
  date: string;
  time: string | null;
  title: string;
  subtitle: string | null;
  nav: AgendaNav;
}

interface Props {
  space: PatientSpace;
  reservations: Reservation[];
  basePath: "/(visitor)/home" | "/(admin)/home";
  myPin: string | null;
  myPrenom: string | null;
  myNom: string | null;
  isAdmin: boolean;
  C: Theme;
}

/**
 * Onglet "Ma semaine" (dernier de la 2ème barre, voir SpaceHeader.tsx) —
 * vue par défaut à l'ouverture de l'app (hors intervenant). 2 tuiles : "Mon
 * agenda" (mes visites/nuitées de la semaine + transports où je conduis ou
 * dont je suis la personne concernée, fusionnés chronologiquement) et "Mes
 * engagements" (besoins sur lesquels je suis engagé, hors transport déjà
 * couvert par la 1ère tuile). Chaque entrée renvoie vers son équivalent dans
 * le mur d'entraide (besoins) ou dans slots/nights (visites/nuitées). Reste
 * sous le header patient et les 2 barres d'onglets — ouvrir une tuile ne
 * quitte jamais cet écran, retaper "Ma semaine" (via resetTiles, voir
 * SpaceHeader.tsx) referme la tuile.
 */
export default function MyWeekScreen({ space, reservations, basePath, myPin, myPrenom, myNom, isAdmin, C }: Props) {
  const router = useRouter();
  const params = useLocalSearchParams<{ resetTiles?: string }>();
  const [openTile, setOpenTile] = useState<"agenda" | "engagements" | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (params.resetTiles) setOpenTile(null);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.resetTiles]),
  );

  // Chemin du mur d'entraide correspondant, pour les renvois focusTaskId
  // depuis "Mes engagements" et "Mon agenda" — basePath inclut déjà "/home",
  // contrairement à celui de VisitorProfileModal.tsx.
  const entraideBasePath = basePath === "/(visitor)/home" ? "/(visitor)/entraide" : "/(admin)/entraide";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [shoppingByTask, setShoppingByTask] = useState<Record<string, ShoppingListItem[]>>({});
  const [relaisCoverageByTask, setRelaisCoverageByTask] = useState<Record<string, TaskRelaisCoverage[]>>({});
  const [photoByKey, setPhotoByKey] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: taskRows } = await supabase
      .from("tasks")
      .select("*")
      .eq("space_id", space.id)
      .order("created_at", { ascending: false });
    const allTasks = (taskRows as Task[] | null) ?? [];
    setTasks(allTasks);

    const courseIds = allTasks.filter((t) => t.category === "courses").map((t) => t.id);
    const relaisIds = allTasks.filter((t) => t.category === "relais").map((t) => t.id);

    const [shopRes, covRes, profilesRes] = await Promise.all([
      courseIds.length
        ? supabase.from("shopping_list_items").select("*").in("task_id", courseIds).order("position", { ascending: true })
        : Promise.resolve({ data: [] as ShoppingListItem[] }),
      relaisIds.length
        ? supabase.from("task_relais_coverage").select("*").in("task_id", relaisIds)
        : Promise.resolve({ data: [] as TaskRelaisCoverage[] }),
      supabase.from("visitor_profiles").select("prenom,nom,photo").eq("space_id", space.id),
    ]);

    const shopByTask: Record<string, ShoppingListItem[]> = {};
    ((shopRes.data as ShoppingListItem[] | null) ?? []).forEach((row) => {
      (shopByTask[row.task_id] ??= []).push(row);
    });
    setShoppingByTask(shopByTask);

    const covByTask: Record<string, TaskRelaisCoverage[]> = {};
    ((covRes.data as TaskRelaisCoverage[] | null) ?? []).forEach((row) => {
      (covByTask[row.task_id] ??= []).push(row);
    });
    setRelaisCoverageByTask(covByTask);

    const photos: Record<string, string | null> = {};
    ((profilesRes.data as { prenom: string; nom: string; photo: string | null }[] | null) ?? []).forEach((p) => {
      photos[visitorIdentityKey(p.prenom, p.nom)] = p.photo ? visitorPhotoUrl(space.id, p.photo) : null;
    });
    // Photo de l'admin : pas dans visitor_profiles (réservé aux visiteurs),
    // dénormalisée à part sur patient_spaces.admin_photo_url (auth.users
    // n'est pas exposé) — voir account.tsx.
    if (space.admin_firstname && space.admin_lastname) {
      photos[visitorIdentityKey(space.admin_firstname, space.admin_lastname)] = space.admin_photo_url ?? null;
    }
    setPhotoByKey(photos);

    setLoading(false);
  }, [space.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Identité "moi" pour les champs Task (author/claimed/relais coverage) —
  // même garde ADMIN sentinel que isMyBesoin() dans Entraide.tsx : côté
  // admin on ignore tout PIN/prénom réel, seul le sentinel compte.
  const samePerson = useCallback(
    (prenom: string | null, nom: string | null, pin: string | null): boolean => {
      if (isAdmin) return pin === "ADMIN";
      if (!myPin || !myPrenom || !myNom || !pin || !prenom || !nom) return false;
      return (
        pin === myPin &&
        prenom.trim().toLowerCase() === myPrenom.trim().toLowerCase() &&
        nom.trim().toLowerCase() === myNom.trim().toLowerCase()
      );
    },
    [isAdmin, myPin, myPrenom, myNom],
  );

  const courseContributedByMe = useCallback(
    (t: Task): boolean => {
      if (!myPrenom || !myNom) return false;
      const key = visitorIdentityKey(myPrenom, myNom);
      return (shoppingByTask[t.id] ?? []).some(
        (i) => i.bought && i.bought_by_prenom && i.bought_by_nom && visitorIdentityKey(i.bought_by_prenom, i.bought_by_nom) === key,
      );
    },
    [shoppingByTask, myPrenom, myNom],
  );

  // Couleur par contributeur d'un besoin courses : moi = toujours vert (je
  // suis forcément parmi les contributeurs, voir courseContributedByMe qui
  // filtre mesEngagementsBesoins), les suivants reprennent la palette du
  // logo dans l'ordre de leur 1er article coché ; au-delà de 5 contributeurs
  // on boucle sur PASTEL_COLORS. Comparaison par nom uniquement (pas de PIN
  // sur shopping_list_items), même clé que courseContributedByMe ci-dessus.
  const courseContributorColors = useCallback(
    (t: Task): Map<string, string> => {
      const myKey = myPrenom && myNom ? visitorIdentityKey(myPrenom, myNom) : null;
      const orderedKeys: string[] = [];
      for (const i of shoppingByTask[t.id] ?? []) {
        if (!i.bought || !i.bought_by_prenom || !i.bought_by_nom) continue;
        const key = visitorIdentityKey(i.bought_by_prenom, i.bought_by_nom);
        if (!orderedKeys.includes(key)) orderedKeys.push(key);
      }
      if (myKey && orderedKeys.includes(myKey)) {
        orderedKeys.splice(orderedKeys.indexOf(myKey), 1);
        orderedKeys.unshift(myKey);
      }
      const colors = new Map<string, string>();
      orderedKeys.forEach((key, index) => {
        colors.set(
          key,
          index < COURSE_PALETTE.length
            ? COURSE_PALETTE[index]
            : PASTEL_COLORS[(index - COURSE_PALETTE.length) % PASTEL_COLORS.length],
        );
      });
      return colors;
    },
    [shoppingByTask, myPrenom, myNom],
  );

  const relaisEngagedByMe = useCallback(
    (t: Task): boolean => (relaisCoverageByTask[t.id] ?? []).some((c) => samePerson(c.prenom, c.nom, c.pin)),
    [relaisCoverageByTask, samePerson],
  );

  // ── Semaine en cours (lundi -> dimanche), comparée en "YYYY-MM-DD" comme
  // les colonnes date/date_limite/transport_*_date en base. ──────────────
  const weekStartIso = useMemo(() => toISO(getWeekDates(new Date())[0]), []);
  const weekEndIso = useMemo(() => toISO(getWeekDates(new Date())[6]), []);
  const inWeek = useCallback((iso: string) => iso >= weekStartIso && iso <= weekEndIso, [weekStartIso, weekEndIso]);
  const todayIsoStr = useMemo(() => toISO(new Date()), []);

  interface RelaisDayInfo {
    iso: string;
    day: number;
    state: "me" | "other" | "none";
    coverPrenom: string | null;
    coverNom: string | null;
  }

  // Barre de progression d'un besoin relais dans "Mes engagements", bornée à
  // la semaine en cours quand le besoin s'étend sur plusieurs semaines — côté
  // visiteur, variante à 3 couleurs (vert = moi, orange = quelqu'un d'autre,
  // rouge = personne) du damier à 2 couleurs de RelaisDayProgress.tsx (Mon
  // Compte / Besoins SOS admin / mur d'entraide) ; côté admin, réduite à 2
  // couleurs (vert = pris en charge par quiconque, rouge = non pris en
  // charge — l'admin ne fait pas partie des contributeurs, "moi/autre" n'a
  // pas de sens ici). coverPrenom/coverNom identifient qui couvre ce jour
  // précis (1er contributeur trouvé), pour la photo/l'avatar affiché dessous.
  const relaisWeekDays = useCallback(
    (t: Task, coverage: TaskRelaisCoverage[]): RelaisDayInfo[] => {
      const periodStart = t.relais_start_date || t.date_limite;
      const periodEnd = t.date_limite || t.relais_start_date;
      if (!periodStart || !periodEnd) return [];
      const rangeStart = periodStart > weekStartIso ? periodStart : weekStartIso;
      const rangeEnd = periodEnd < weekEndIso ? periodEnd : weekEndIso;
      if (rangeStart > rangeEnd) return [];
      const days: RelaisDayInfo[] = [];
      let cursor = new Date(rangeStart + "T12:00:00");
      const end = new Date(rangeEnd + "T12:00:00");
      while (cursor <= end) {
        const iso = toISO(cursor);
        const dayCoverage = coverage.filter((c) => c.start_date <= iso && c.end_date >= iso);
        const cover = dayCoverage[0] ?? null;
        let state: "me" | "other" | "none";
        if (isAdmin) {
          state = dayCoverage.length > 0 ? "me" : "none";
        } else {
          const coveredByMe = dayCoverage.some((c) => samePerson(c.prenom, c.nom, c.pin));
          state = coveredByMe ? "me" : dayCoverage.length > 0 ? "other" : "none";
        }
        days.push({ iso, day: cursor.getDate(), state, coverPrenom: cover?.prenom ?? null, coverNom: cover?.nom ?? null });
        cursor = addDays(cursor, 1);
      }
      return days;
    },
    [weekStartIso, weekEndIso, samePerson, isAdmin],
  );

  // ── Tuile "Mon agenda" : mes visites/nuitées de la semaine + transports où
  // je conduis, fusionnés en une seule chronologie. ──────────────────────
  const agendaEntries = useMemo<AgendaEntry[]>(() => {
    const visitesAll = reservations.filter((r) => r.type === "Visite");
    const visitesById: Record<string, Reservation> = {};
    visitesAll.forEach((r) => { visitesById[r.id] = r; });
    const companionsByMainId: Record<string, Reservation[]> = {};
    visitesAll.forEach((r) => {
      if (!r.group_id || r.group_id === r.id) return;
      const main = visitesById[r.group_id];
      if (main && main.date === r.date && main.creneau === r.creneau) {
        (companionsByMainId[r.group_id] ??= []).push(r);
      }
    });

    const entries: AgendaEntry[] = [];

    reservations
      .filter((r) => (r.type === "Visite" || r.type === "Nuit") && inWeek(r.date) && isMyReservation(r, myPin, null, myPrenom, myNom))
      .forEach((r) => {
        if (r.type === "Nuit") {
          entries.push({
            id: r.id,
            date: r.date,
            time: null,
            title: "🌙 Nuitée",
            subtitle: null,
            nav: { kind: "reservation", type: "Nuit", date: r.date, creneau: null },
          });
          return;
        }
        // N'affiche que les lignes "principales" — un accompagnant dont la
        // date/créneau colle encore au groupe est déjà repris dans le
        // sous-titre de sa ligne principale (voir companionsByMainId).
        if (r.group_id && r.group_id !== r.id && companionsByMainId[r.group_id]?.some((c) => c.id === r.id)) return;
        const linkedCompanions = companionsByMainId[r.id] ?? [];
        // Repli sur companion_firstnames (ancien champ texte libre, prénom
        // seul, pas de nom conservé) quand aucun accompagnant group_id n'est
        // rattaché — mêmes réservations pré-migration que HomeCalendarScreen.tsx.
        const companionLabels = linkedCompanions.length
          ? linkedCompanions.map((c) => `${c.prenom} ${c.nom}`)
          : (r.companion_firstnames ?? "").split(",").map((c) => c.trim()).filter(Boolean);
        const others = getSlotOccupancy(reservations, r.date, r.creneau, r.id).filter(
          (o) => (o.group_id || o.id) !== (r.group_id || r.id),
        );
        const bits: string[] = [];
        if (companionLabels.length) bits.push(`Avec ${companionLabels.join(", ")}`);
        if (others.length) bits.push(`Aussi dans ce créneau : ${others.map((o) => `${o.prenom} ${o.nom}`).join(", ")}`);
        entries.push({
          id: r.id,
          date: r.date,
          time: r.creneau,
          title: "📅 Visite",
          subtitle: bits.length ? bits.join(" · ") : null,
          nav: { kind: "reservation", type: "Visite", date: r.date, creneau: r.creneau },
        });
      });

    tasks
      .filter((t) => t.category === "transport")
      .forEach((t) => {
        const iAmOut = samePerson(t.claimed_by_prenom, t.claimed_by_nom, t.claimed_by_pin);
        const returnClaimedSeparately = !!t.transport_return_claimed_by_prenom;
        const iAmReturn = returnClaimedSeparately
          ? samePerson(t.transport_return_claimed_by_prenom, t.transport_return_claimed_by_nom, t.transport_return_claimed_by_pin)
          : iAmOut && t.transport_round_trip;
        // Personne concernée par le transport (celle transportée) —
        // transport_for_* seulement quand posté "pour quelqu'un d'autre"
        // (voir Entraide.tsx), sinon l'auteur du besoin est lui-même la
        // personne concernée. Comparaison par nom uniquement, comme
        // isForPerson() dans Entraide.tsx (pas de PIN dédié à ce rôle).
        const concernedPrenom = t.transport_for_prenom || t.author_prenom;
        const concernedNom = t.transport_for_nom || t.author_nom;
        const iAmConcerned =
          t.transport_for_prenom && t.transport_for_nom
            ? !!myPrenom &&
              !!myNom &&
              t.transport_for_prenom.trim().toLowerCase() === myPrenom.trim().toLowerCase() &&
              t.transport_for_nom.trim().toLowerCase() === myNom.trim().toLowerCase()
            : samePerson(t.author_prenom, t.author_nom, t.author_pin);
        if (!iAmOut && !iAmReturn && !iAmConcerned) return;
        const trajet = [t.transport_from, t.transport_to].filter(Boolean).join(" → ");
        // Affiche toujours "l'autre partie" du point de vue du lecteur : le
        // conducteur voit qui est transporté, la personne transportée voit
        // qui conduit (ou un texte d'attente si personne n'a encore pris en
        // charge ce trajet).
        function otherParty(driving: boolean, driverPrenom: string | null, driverNom: string | null): string {
          if (driving) return `${concernedPrenom} ${concernedNom}`;
          return driverPrenom && driverNom ? `${driverPrenom} ${driverNom}` : "conducteur non attribué";
        }
        if (iAmOut || iAmConcerned) {
          const date = t.transport_confirmed_date || t.transport_date;
          if (date && inWeek(date)) {
            entries.push({
              id: `${t.id}-aller`,
              date,
              time: t.transport_confirmed_out_time || t.transport_out_time || null,
              title: `🚗 Transport aller : ${otherParty(iAmOut, t.claimed_by_prenom, t.claimed_by_nom)}`,
              subtitle: trajet || null,
              nav: { kind: "task", taskId: t.id },
            });
          }
        }
        if (iAmReturn || (iAmConcerned && t.transport_round_trip)) {
          const date = t.transport_confirmed_date || t.transport_date;
          if (date && inWeek(date)) {
            const returnDriverPrenom = returnClaimedSeparately ? t.transport_return_claimed_by_prenom : t.claimed_by_prenom;
            const returnDriverNom = returnClaimedSeparately ? t.transport_return_claimed_by_nom : t.claimed_by_nom;
            entries.push({
              id: `${t.id}-retour`,
              date,
              time: t.transport_confirmed_return_time || t.transport_return_time || null,
              title: `🚗 Transport retour : ${otherParty(iAmReturn, returnDriverPrenom, returnDriverNom)}`,
              subtitle: trajet ? trajet.split(" → ").reverse().join(" → ") : null,
              nav: { kind: "task", taskId: t.id },
            });
          }
        }
      });

    return entries.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (!a.time && !b.time) return 0;
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });
  }, [reservations, tasks, inWeek, myPin, myPrenom, myNom, samePerson]);

  // Les entrées d'aujourd'hui, une fois triées chronologiquement, forment
  // toujours un bloc contigu (comparaison de dates ISO) — pas besoin de
  // toucher à l'ordre de la semaine pour les regrouper sous un même liseret
  // vert : on segmente juste agendaEntries en tronçons "aujourd'hui"/"autre".
  type AgendaGroup = { isToday: boolean; entries: AgendaEntry[] };
  const agendaGroups = useMemo<AgendaGroup[]>(() => {
    const groups: AgendaGroup[] = [];
    for (const e of agendaEntries) {
      const isToday = e.date === todayIsoStr;
      const last = groups[groups.length - 1];
      if (last && last.isToday === isToday) last.entries.push(e);
      else groups.push({ isToday, entries: [e] });
    }
    return groups;
  }, [agendaEntries, todayIsoStr]);

  // ── Tuile "Mes engagements" : besoins (hors transport, déjà dans "Mon
  // agenda") sur lesquels je suis engagé, pertinents cette semaine. ─────
  const mesEngagementsBesoins = useMemo(() => {
    function effectiveDate(t: Task): string | null {
      if (t.category === "relais") return t.relais_start_date || t.date_limite;
      return t.date_limite;
    }
    // Visible seulement si son échéance (date de début pour un relais, sinon
    // date_limite) tombe cette semaine — demande explicite : un engagement
    // pris aujourd'hui pour une échéance dans une semaine future ne doit
    // apparaître QUE la semaine de son échéance, pas dès sa prise en charge.
    // Un relais est visible dès que sa période [début, fin] chevauche la
    // semaine (pas seulement son jour de début), pour rester affiché tant
    // qu'il est en cours sur plusieurs semaines. Sans date connue, on retombe
    // sur la dernière trace d'activité (comme avant) plutôt que de masquer
    // un besoin fermé sans aucune date.
    function relevantThisWeek(t: Task): boolean {
      if (t.category === "relais") {
        const start = t.relais_start_date || t.date_limite;
        const end = t.date_limite || t.relais_start_date;
        if (start && end) return start <= weekEndIso && end >= weekStartIso;
      } else if (t.date_limite) {
        return inWeek(t.date_limite);
      }
      const touch = t.claimed_at || t.modified_at || t.created_at;
      return !!touch && inWeek(touch.slice(0, 10));
    }
    // Uniquement les besoins sur lesquels je me suis engagé (pris en charge,
    // contribué aux courses, couvert un créneau relais) — pas ceux que j'ai
    // simplement publiés (voir "Mes besoins" dans Mon Compte pour ceux-là).
    function isMyBesoin(t: Task): boolean {
      if (t.category === "transport") return false;
      if (samePerson(t.claimed_by_prenom, t.claimed_by_nom, t.claimed_by_pin)) return true;
      if (t.category === "courses" && courseContributedByMe(t)) return true;
      if (t.category === "relais") return relaisEngagedByMe(t);
      return false;
    }
    // Tri chronologique (date de début pour un relais, échéance sinon) — un
    // besoin sans date connue passe en dernier plutôt que de garder l'ordre
    // de récupération (created_at desc) issu de `tasks`.
    return tasks
      .filter((t) => isMyBesoin(t) && relevantThisWeek(t))
      .sort((a, b) => {
        const da = effectiveDate(a);
        const db = effectiveDate(b);
        if (da && db) return da.localeCompare(db);
        if (da) return -1;
        if (db) return 1;
        return 0;
      });
  }, [tasks, inWeek, samePerson, courseContributedByMe, relaisEngagedByMe]);

  if (loading && !tasks.length) {
    return (
      <View style={[styles.center, { backgroundColor: C.bg }]}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  if (openTile === null) {
    return (
      <View style={[styles.tilesRow, { backgroundColor: C.bg }]}>
        <TouchableOpacity
          style={[styles.tile, { backgroundColor: LOGO_ORANGE }]}
          onPress={() => setOpenTile("agenda")}
          activeOpacity={0.85}
        >
          <Text style={styles.tileCount}>{agendaEntries.length}</Text>
          <Text style={styles.tileLabel}>📅 Mon agenda</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tile, { backgroundColor: LOGO_GREEN }]}
          onPress={() => setOpenTile("engagements")}
          activeOpacity={0.85}
        >
          <Text style={styles.tileCount}>{mesEngagementsBesoins.length}</Text>
          <Text style={styles.tileLabel}>🤝 Mes engagements</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (openTile === "agenda") {
    return (
      <ScrollView style={[styles.detail, { backgroundColor: C.bg }]} contentContainerStyle={styles.detailContent}>
        <Text style={[styles.detailTitle, { color: LOGO_ORANGE }]}>📅 Mon agenda — cette semaine</Text>
        {agendaEntries.length === 0 && (
          <Text style={[styles.emptyText, { color: C.muted }]}>Rien de prévu cette semaine.</Text>
        )}
        {agendaGroups.map((group, gi) => {
          const cards = group.entries.map((e, ei) => (
            <TouchableOpacity
              key={e.id}
              style={[
                styles.card,
                { backgroundColor: C.card, borderColor: C.border },
                group.isToday && ei === group.entries.length - 1 && styles.cardInTodayGroupLast,
              ]}
              activeOpacity={0.8}
              onPress={() => {
                if (e.nav.kind === "task") {
                  router.push(`${entraideBasePath}?focusTaskId=${e.nav.taskId}` as any);
                } else {
                  router.push({
                    pathname: `${basePath}/${e.nav.type === "Nuit" ? "nights" : "slots"}`,
                    params: e.nav.type === "Nuit" ? { focusDate: e.nav.date } : { focusDate: e.nav.date, focusCreneau: e.nav.creneau },
                  } as any);
                }
              }}
            >
              <Text style={[styles.cardDate, { color: C.gold }]}>
                {toFrLong(new Date(e.date + "T12:00:00"))}{e.time ? ` · ${e.time}` : ""}
              </Text>
              <Text style={[styles.cardTitle, { color: C.text }]}>{e.title}</Text>
              {!!e.subtitle && <Text style={[styles.cardSubtitle, { color: C.muted }]}>{e.subtitle}</Text>}
            </TouchableOpacity>
          ));
          if (!group.isToday) return cards;
          return (
            <View key={`today-${gi}`} style={[styles.todayGroup, { borderColor: LOGO_GREEN }]}>
              {cards}
            </View>
          );
        })}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[styles.detail, { backgroundColor: C.bg }]} contentContainerStyle={styles.detailContent}>
      <Text style={[styles.detailTitle, { color: LOGO_GREEN }]}>🤝 Mes engagements — cette semaine</Text>

      {mesEngagementsBesoins.length === 0 && (
        <Text style={[styles.emptyText, { color: C.muted }]}>Aucun besoin en cours cette semaine.</Text>
      )}

      {mesEngagementsBesoins.map((t) => (
        <TouchableOpacity
          key={t.id}
          style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}
          activeOpacity={0.8}
          onPress={() => router.push(`${entraideBasePath}?focusTaskId=${t.id}` as any)}
        >
          <Text style={[styles.cardTitle, { color: C.text }]}>
            {CATEGORY_ICONS[t.category]} Besoin {CATEGORY_LABELS[t.category]}
          </Text>
          {t.category !== "relais" && !!t.date_limite && (
            <Text style={[styles.cardSubtitle, { color: C.muted }]}>pour le {dueDateLabel(t.date_limite)}</Text>
          )}
          <Text style={[styles.cardSubtitle, { color: C.muted }]}>
            Publié par {t.author_prenom} {t.author_nom}
          </Text>
          <Text style={[styles.cardSubtitle, { color: C.muted }]}>
            {t.category === "relais"
              ? t.status === "pris_en_charge"
                ? "🤝 Pris en charge"
                : (relaisCoverageByTask[t.id]?.length ?? 0) > 0
                  ? "🤝 Pris en charge partiellement"
                  : "⏳ Ouvert"
              : t.status === "fait" ? "✓ Fait" : t.status === "ferme" ? "🔒 Fermé" : t.status === "pris_en_charge" ? "🤝 Pris en charge" : "⏳ Ouvert"}
          </Text>

          {t.category !== "relais" && t.category !== "courses" && !!t.claimed_by_prenom && !!t.claimed_by_nom && (() => {
            const key = visitorIdentityKey(t.claimed_by_prenom, t.claimed_by_nom);
            const url = photoByKey[key];
            return (
              <View style={styles.avatarRow}>
                {url ? (
                  <Image source={{ uri: url }} style={[styles.avatar, { borderColor: C.border }]} />
                ) : (
                  <View style={[styles.avatarFallback, { borderColor: C.border }]}>
                    <Text style={{ color: C.muted, fontSize: 11 }}>{initials(t.claimed_by_prenom, t.claimed_by_nom)}</Text>
                  </View>
                )}
              </View>
            );
          })()}

          {t.category === "relais" && (
            <View style={styles.relaisDaysRow}>
              {relaisWeekDays(t, relaisCoverageByTask[t.id] ?? []).map((d) => {
                const coverKey = d.coverPrenom && d.coverNom ? visitorIdentityKey(d.coverPrenom, d.coverNom) : null;
                const coverUrl = coverKey ? photoByKey[coverKey] : null;
                return (
                  <View key={d.iso} style={styles.relaisDayCol}>
                    <View
                      style={[
                        styles.relaisDaySquare,
                        { backgroundColor: d.state === "me" ? C.success : d.state === "other" ? C.orange : C.danger },
                      ]}
                    >
                      <Text style={styles.relaisDayText}>{d.day}</Text>
                    </View>
                    {!!coverKey && (
                      coverUrl ? (
                        <Image source={{ uri: coverUrl }} style={styles.relaisDayAvatar} />
                      ) : (
                        <View style={[styles.relaisDayAvatarFallback, { borderColor: C.border }]}>
                          <Text style={{ color: C.muted, fontSize: 9 }}>{initials(d.coverPrenom!, d.coverNom!)}</Text>
                        </View>
                      )
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {t.category === "courses" && (() => {
            const contributorColors = courseContributorColors(t);
            return (
              <View style={styles.courseList}>
                {(shoppingByTask[t.id] ?? []).map((item) => {
                  const itemKey =
                    item.bought && item.bought_by_prenom && item.bought_by_nom
                      ? visitorIdentityKey(item.bought_by_prenom, item.bought_by_nom)
                      : null;
                  const color = itemKey ? contributorColors.get(itemKey) ?? C.orange : C.text;
                  return (
                    <Text key={item.id} style={[styles.courseItem, { color }]}>
                      {item.bought ? "☑" : "☐"} {item.label}
                    </Text>
                  );
                })}
                <View style={styles.avatarRow}>
                  {Array.from(
                    new Map(
                      (shoppingByTask[t.id] ?? [])
                        .filter((i) => i.bought && i.bought_by_prenom && i.bought_by_nom)
                        .map((i) => [visitorIdentityKey(i.bought_by_prenom!, i.bought_by_nom!), i]),
                    ).values(),
                  ).map((i) => {
                    const key = visitorIdentityKey(i.bought_by_prenom!, i.bought_by_nom!);
                    const url = photoByKey[key];
                    const borderColor = contributorColors.get(key) ?? C.border;
                    return url ? (
                      <Image key={key} source={{ uri: url }} style={[styles.avatar, { borderColor }]} />
                    ) : (
                      <View key={key} style={[styles.avatarFallback, { borderColor }]}>
                        <Text style={{ color: C.muted, fontSize: 11 }}>{initials(i.bought_by_prenom!, i.bought_by_nom!)}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })()}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  tilesRow: { flex: 1, flexDirection: "row", padding: 16, gap: 12 },
  tile: { flex: 1, borderRadius: 20, alignItems: "center", justifyContent: "center", paddingVertical: 32 },
  tileCount: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 48, color: "#fff" },
  tileLabel: { fontFamily: "DM_Sans_600SemiBold", fontSize: 14, color: "#fff", marginTop: 8, textAlign: "center" },
  detail: { flex: 1 },
  detailContent: { padding: 16, paddingBottom: 40 },
  detailTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, marginBottom: 14 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 14, textAlign: "center", marginTop: 24 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  todayGroup: { borderWidth: 2, borderRadius: 18, padding: 8, marginBottom: 10 },
  cardInTodayGroupLast: { marginBottom: 0 },
  cardDate: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 },
  cardTitle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 15 },
  cardSubtitle: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginTop: 4 },
  relaisDaysRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 8 },
  relaisDayCol: { alignItems: "center", gap: 3 },
  relaisDaySquare: { width: 26, height: 26, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  relaisDayText: { fontFamily: "DM_Sans_700Bold", fontSize: 11, color: "#fff" },
  relaisDayAvatar: { width: 20, height: 20, borderRadius: 10 },
  relaisDayAvatarFallback: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  courseList: { marginTop: 8 },
  courseItem: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginBottom: 2 },
  avatarRow: { flexDirection: "row", marginTop: 8, gap: 6 },
  avatar: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
  avatarFallback: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: "center", justifyContent: "center" },
});
