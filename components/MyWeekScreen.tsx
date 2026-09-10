import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "@/lib/supabase";
import type { PatientSpace, Reservation, Task, ShoppingListItem, TaskRelaisCoverage } from "@/lib/types";
import type { Theme } from "@/lib/themes";
import { LOGO_ORANGE, LOGO_GREEN } from "@/lib/themes";
import { isMyReservation, getSlotOccupancy, getWeekDates, toISO, toFrLong, toFrShort, addDays } from "@/lib/slotUtils";
import { visitorIdentityKey } from "@/lib/visitorRoster";

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

  const relaisEngagedByMe = useCallback(
    (t: Task): boolean => (relaisCoverageByTask[t.id] ?? []).some((c) => samePerson(c.prenom, c.nom, c.pin)),
    [relaisCoverageByTask, samePerson],
  );

  // ── Semaine en cours (lundi -> dimanche), comparée en "YYYY-MM-DD" comme
  // les colonnes date/date_limite/transport_*_date en base. ──────────────
  const weekStartIso = useMemo(() => toISO(getWeekDates(new Date())[0]), []);
  const weekEndIso = useMemo(() => toISO(getWeekDates(new Date())[6]), []);
  const inWeek = useCallback((iso: string) => iso >= weekStartIso && iso <= weekEndIso, [weekStartIso, weekEndIso]);

  // Barre de progression d'un besoin relais dans "Mes engagements" — variante
  // à 3 couleurs (vert = moi, orange = quelqu'un d'autre, rouge = personne)
  // du damier à 2 couleurs de RelaisDayProgress.tsx (Mon Compte / Besoins SOS
  // admin / mur d'entraide), et bornée à la semaine en cours quand le besoin
  // s'étend sur plusieurs semaines — les deux différences demandées pour
  // cette tuile la rendent non réutilisable telle quelle.
  const relaisWeekDays = useCallback(
    (t: Task, coverage: TaskRelaisCoverage[]): { iso: string; day: number; state: "me" | "other" | "none" }[] => {
      const periodStart = t.relais_start_date || t.date_limite;
      const periodEnd = t.date_limite || t.relais_start_date;
      if (!periodStart || !periodEnd) return [];
      const rangeStart = periodStart > weekStartIso ? periodStart : weekStartIso;
      const rangeEnd = periodEnd < weekEndIso ? periodEnd : weekEndIso;
      if (rangeStart > rangeEnd) return [];
      const days: { iso: string; day: number; state: "me" | "other" | "none" }[] = [];
      let cursor = new Date(rangeStart + "T12:00:00");
      const end = new Date(rangeEnd + "T12:00:00");
      while (cursor <= end) {
        const iso = toISO(cursor);
        const coveredByMe = coverage.some((c) => c.start_date <= iso && c.end_date >= iso && samePerson(c.prenom, c.nom, c.pin));
        const coveredByOther = !coveredByMe && coverage.some((c) => c.start_date <= iso && c.end_date >= iso);
        days.push({ iso, day: cursor.getDate(), state: coveredByMe ? "me" : coveredByOther ? "other" : "none" });
        cursor = addDays(cursor, 1);
      }
      return days;
    },
    [weekStartIso, weekEndIso, samePerson],
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

  // ── Tuile "Mes engagements" : besoins (hors transport, déjà dans "Mon
  // agenda") sur lesquels je suis engagé, pertinents cette semaine. ─────
  const mesEngagementsBesoins = useMemo(() => {
    function effectiveDate(t: Task): string | null {
      if (t.category === "relais") return t.relais_start_date || t.date_limite;
      return t.date_limite;
    }
    // Toujours visible tant qu'ouvert/pris en charge (engagement actif, peu
    // importe l'échéance) ; une fois fait/fermé, seulement si sa date (ou, à
    // défaut, la dernière trace d'activité) tombe cette semaine — accord
    // explicite : un besoin fermé sans aucune date reste visible tant qu'il
    // date de cette semaine plutôt que de disparaître immédiatement.
    function relevantThisWeek(t: Task): boolean {
      if (t.status === "ouvert" || t.status === "pris_en_charge") return true;
      const d = effectiveDate(t);
      if (d) return inWeek(d);
      const touch = t.claimed_at || t.modified_at || t.created_at;
      return !!touch && inWeek(touch.slice(0, 10));
    }
    function isMyBesoin(t: Task): boolean {
      if (t.category === "transport") return false;
      if (samePerson(t.author_prenom, t.author_nom, t.author_pin)) return true;
      if (samePerson(t.claimed_by_prenom, t.claimed_by_nom, t.claimed_by_pin)) return true;
      if (t.category === "courses" && courseContributedByMe(t)) return true;
      if (t.category === "relais") return relaisEngagedByMe(t);
      return false;
    }
    return tasks.filter((t) => isMyBesoin(t) && relevantThisWeek(t));
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
        {agendaEntries.map((e) => (
          <TouchableOpacity
            key={e.id}
            style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}
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
        ))}
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
            {t.category !== "relais" && t.date_limite ? ` pour le ${dueDateLabel(t.date_limite)}` : ""}
          </Text>
          <Text style={[styles.cardSubtitle, { color: C.muted }]}>
            Ouvert par {t.author_prenom} {t.author_nom}
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

          {t.category === "relais" && (
            <View style={styles.relaisDaysRow}>
              {relaisWeekDays(t, relaisCoverageByTask[t.id] ?? []).map((d) => (
                <View
                  key={d.iso}
                  style={[
                    styles.relaisDaySquare,
                    { backgroundColor: d.state === "me" ? C.success : d.state === "other" ? C.orange : C.danger },
                  ]}
                >
                  <Text style={styles.relaisDayText}>{d.day}</Text>
                </View>
              ))}
            </View>
          )}

          {t.category === "courses" && (
            <View style={styles.courseList}>
              {(shoppingByTask[t.id] ?? []).map((item) => (
                <Text key={item.id} style={[styles.courseItem, { color: item.bought ? C.success : C.text }]}>
                  {item.bought ? "☑" : "☐"} {item.label}
                </Text>
              ))}
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
                  return url ? (
                    <Image key={key} source={{ uri: url }} style={styles.avatar} />
                  ) : (
                    <View key={key} style={[styles.avatarFallback, { borderColor: C.border }]}>
                      <Text style={{ color: C.muted, fontSize: 11 }}>{i.bought_by_prenom![0]}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
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
  cardDate: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 },
  cardTitle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 15 },
  cardSubtitle: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginTop: 4 },
  relaisDaysRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 8 },
  relaisDaySquare: { width: 26, height: 26, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  relaisDayText: { fontFamily: "DM_Sans_700Bold", fontSize: 11, color: "#fff" },
  courseList: { marginTop: 8 },
  courseItem: { fontFamily: "DM_Sans_400Regular", fontSize: 13, marginBottom: 2 },
  avatarRow: { flexDirection: "row", marginTop: 8, gap: 6 },
  avatar: { width: 28, height: 28, borderRadius: 14 },
  avatarFallback: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
