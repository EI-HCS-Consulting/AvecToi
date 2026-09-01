import { useEffect, useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, Image,
  Modal, StyleSheet, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import PatientAvatar from "@/components/PatientAvatar";
import ConfirmModal from "@/components/ConfirmModal";
import { adminResetVisitorPin } from "@/lib/visitorProfile";
import { relationLabel } from "@/lib/relations";
import type { Reservation, NewsEntry, Task, SupportMessage, SouvenirPhoto } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Fiche visiteur en lecture seule — ouverte en cliquant le nom d'un autre
// visiteur dans Nouvelles/Souvenirs/Soutien. Même rapprochement par
// prénom+nom (ilike, pas de PIN) que "Mes contributions" dans
// app/(visitor)/account.tsx : il n'existe pas d'identifiant de compte
// visiteur, donc pas de moyen plus fiable, et comme il s'agit de simple
// consultation (pas de modification), le PIN n'a pas lieu d'être demandé ici.

const CAT_ICONS: Record<Task["category"], string> = {
  repas: "🍽️", affaires: "🧳", courses: "🛒", transport: "🚗", administratif: "🗂️", autre: "📌", relais: "🆘",
};

function souvenirUrl(spaceId: string, filename: string) {
  const { data } = supabase.storage.from("souvenirs").getPublicUrl(`${spaceId}/${filename}`);
  return data.publicUrl;
}

function visitorPhotoUrl(spaceId: string, filename: string) {
  const { data } = supabase.storage.from("visitor-photos").getPublicUrl(`${spaceId}/${filename}`);
  return data.publicUrl;
}

// Même filet que VisitorsList.tsx : un select portant sur "relation" échoue
// entièrement (et viderait aussi photo/motto) tant que la migration
// 20260821_visitor_profiles_relation.sql n'a pas été rejouée manuellement
// en base — voir le commentaire jumeau dans VisitorsList.tsx.
async function fetchVisitorProfile(spaceId: string, prenom: string, nom: string) {
  const full = await supabase.from("visitor_profiles").select("id, photo, motto, relation").eq("space_id", spaceId)
    .ilike("prenom", prenom).ilike("nom", nom).maybeSingle();
  if (!full.error) return full;
  console.error("[VisitorProfileModal] select avec relation en échec, repli sans cette colonne:", full.error);
  const fallback = await supabase.from("visitor_profiles").select("id, photo, motto").eq("space_id", spaceId)
    .ilike("prenom", prenom).ilike("nom", nom).maybeSingle();
  return { data: fallback.data ? { ...fallback.data, relation: null as string | null } : null, error: fallback.error };
}

interface Props {
  visible: boolean;
  onClose: () => void;
  spaceId: string;
  C: Theme;
  isAdmin: boolean;
  prenom: string;
  nom: string;
}

export default function VisitorProfileModal({ visible, onClose, spaceId, C, isAdmin, prenom, nom }: Props) {
  const router = useRouter();
  const basePath = isAdmin ? "/(admin)" : "/(visitor)";

  const [loading, setLoading] = useState(true);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoLightbox, setPhotoLightbox] = useState(false);
  const [telephone, setTelephone] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [motto, setMotto] = useState<string | null>(null);
  const [relation, setRelation] = useState<string | null>(null);
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [resetConfirmVisible, setResetConfirmVisible] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [news, setNews] = useState<NewsEntry[]>([]);
  const [tasksClaimed, setTasksClaimed] = useState<Task[]>([]);
  const [tasksPublished, setTasksPublished] = useState<Task[]>([]);
  const [souvenirs, setSouvenirs] = useState<(SouvenirPhoto & { url: string })[]>([]);
  const [messages, setMessages] = useState<SupportMessage[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const p = prenom.trim();
    const n = nom.trim();
    const [profile, resv, resvBookedFor, newsRes, claimed, published, souv, msgs] = await Promise.all([
      fetchVisitorProfile(spaceId, p, n),
      supabase.from("reservations").select("*").eq("space_id", spaceId)
        .ilike("prenom", p).ilike("nom", n).order("date", { ascending: false }),
      supabase.from("reservations").select("*").eq("space_id", spaceId)
        .ilike("booked_by_prenom", p).ilike("booked_by_nom", n).order("date", { ascending: false }),
      supabase.from("news_entries").select("*").eq("space_id", spaceId)
        .ilike("author_prenom", p).ilike("author_nom", n).order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").eq("space_id", spaceId)
        .ilike("claimed_by_prenom", p).ilike("claimed_by_nom", n).order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").eq("space_id", spaceId)
        .ilike("author_prenom", p).ilike("author_nom", n).order("created_at", { ascending: false }),
      supabase.from("souvenirs").select("*").eq("space_id", spaceId)
        .ilike("uploaded_by_prenom", p).ilike("uploaded_by_nom", n).order("created_at", { ascending: false }),
      supabase.from("support_messages").select("*").eq("space_id", spaceId)
        .ilike("author_prenom", p).ilike("author_nom", n).order("created_at", { ascending: false }),
    ]);

    setPhotoUrl(profile.data?.photo ? visitorPhotoUrl(spaceId, profile.data.photo) : null);
    setMotto(profile.data?.motto ?? null);
    setRelation(profile.data?.relation ?? null);
    setVisitorId((profile.data as { id?: string } | null)?.id ?? null);
    // Coordonnées (admin uniquement) : téléphone/email vivent sur la réservation
    // elle-même (pas de compte visiteur) — on prend la première réservation
    // faite à son propre nom (pas "booked_by") qui en porte une, peu importe
    // sa date, puisque le téléphone est le même à chaque réservation.
    const ownResv: Reservation[] = resv.data || [];
    setTelephone(ownResv.find((r) => r.telephone)?.telephone ?? null);
    setEmail(ownResv.find((r) => r.email)?.email ?? null);

    const bookedForIds = new Set((resv.data || []).map((r: Reservation) => r.id));
    setReservations([
      ...(resv.data || []),
      ...((resvBookedFor.data || []).filter((r: Reservation) => !bookedForIds.has(r.id))),
    ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)));
    setNews(newsRes.data || []);
    setTasksClaimed(claimed.data || []);
    setTasksPublished(published.data || []);
    setSouvenirs((souv.data || []).map((s: SouvenirPhoto) => ({ ...s, url: souvenirUrl(spaceId, s.filename) })));
    setMessages(msgs.data || []);
    setLoading(false);
  }, [spaceId, prenom, nom]);

  useEffect(() => {
    if (visible && prenom.trim() && nom.trim()) {
      setResetDone(false);
      load();
    }
  }, [visible, prenom, nom, load]);

  async function handleResetPin() {
    if (!visitorId) return;
    setResetting(true);
    const ok = await adminResetVisitorPin(spaceId, visitorId);
    setResetting(false);
    setResetConfirmVisible(false);
    if (ok) setResetDone(true);
  }

  function goTo(path: string) {
    onClose();
    router.push(path as any);
  }

  // Navigue vers le jour de la réservation ciblée plutôt qu'un simple
  // `/home/slots`/`/home/nights` sans contexte (qui atterrissait sur le jour
  // déjà sélectionné, pas forcément celui de cette réservation) — focusDate
  // est lu par les deux écrans (admin et visiteur) pour se repositionner,
  // voir app/(admin)/home/slots.tsx et app/(visitor)/home/slots.tsx.
  // focusCreneau (Visite uniquement, la Nuitée n'a qu'un seul créneau par
  // jour) va plus loin : ces mêmes écrans scrollent jusqu'au créneau exact et
  // le surlignent brièvement, plutôt que de laisser l'utilisateur retrouver
  // la bonne ligne en haut de la liste du jour.
  function goToReservation(r: Reservation) {
    onClose();
    router.push({
      pathname: `${basePath}/home/${r.type === "Nuit" ? "nights" : "slots"}`,
      params: r.type === "Nuit" ? { focusDate: r.date } : { focusDate: r.date, focusCreneau: r.creneau },
    } as any);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: C.card, borderColor: C.accent }]}>
          <View style={[styles.headerRow, { borderBottomColor: C.border }]}>
            <TouchableOpacity
              onPress={() => photoUrl && setPhotoLightbox(true)}
              activeOpacity={photoUrl ? 0.8 : 1}
            >
              <PatientAvatar photoUrl={photoUrl} firstname={prenom} lastname={nom} size={64} C={C} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.name, { color: C.text }]}>{prenom} {nom}</Text>
              {!!relation && (
                <Text style={[styles.relation, { color: C.muted }]}>{relationLabel(relation)}</Text>
              )}
              <Text style={[styles.sub, { color: C.muted }]}>Fiche visiteur</Text>
              {!!motto && (
                <Text style={styles.motto} numberOfLines={2}>{motto}</Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { borderColor: C.border }]}>
              <Text style={[styles.closeBtnText, { color: C.muted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={C.accent} style={{ marginVertical: 32 }} />
          ) : (
            <ScrollView contentContainerStyle={styles.scroll}>
              {isAdmin && (telephone || email) && (
                <Section title="☎️ Coordonnées" C={C} empty={false} emptyText="">
                  {telephone && <Text style={[styles.rowText, { color: C.text }]}>📞 {telephone}</Text>}
                  {email && <Text style={[styles.rowText, { color: C.text, marginTop: telephone ? 4 : 0 }]}>✉️ {email}</Text>}
                </Section>
              )}

              {isAdmin && !!visitorId && (
                <Section title="🔑 Code d'accès" C={C} empty={false} emptyText="">
                  {resetDone ? (
                    <Text style={[styles.rowText, { color: C.text }]}>
                      Code réinitialisé. {prenom} pourra recréer un profil (photo, humeur, relation conservées) en repassant par l'écran d'entrée.
                    </Text>
                  ) : (
                    <TouchableOpacity
                      style={[styles.resetBtn, { borderColor: C.border }]}
                      onPress={() => setResetConfirmVisible(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.resetBtnText, { color: C.text }]}>Réinitialiser le code</Text>
                    </TouchableOpacity>
                  )}
                </Section>
              )}

              <Section title={`📅 Réservations (${reservations.length})`} C={C} empty={reservations.length === 0} emptyText="Aucune réservation.">
                {reservations.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={styles.row}
                    activeOpacity={0.7}
                    onPress={() => goToReservation(r)}
                  >
                    <Text style={[styles.rowText, { color: C.text }]}>
                      {r.type === "Nuit" ? "🌙" : "☀️"} {new Date(r.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} · {r.creneau}
                    </Text>
                    <Text style={[styles.chevron, { color: C.muted }]}>›</Text>
                  </TouchableOpacity>
                ))}
              </Section>

              <Section title={`📰 Nouvelles publiées (${news.length})`} C={C} empty={news.length === 0} emptyText="Aucune nouvelle publiée.">
                {news.map((entry) => (
                  <TouchableOpacity
                    key={entry.id}
                    style={styles.row}
                    activeOpacity={0.7}
                    onPress={() => goTo(`${basePath}/news?focusEntryId=${entry.id}`)}
                  >
                    <Text style={[styles.rowText, { color: C.text, flex: 1 }]} numberOfLines={2}>{entry.content}</Text>
                    <Text style={[styles.chevron, { color: C.muted }]}>›</Text>
                  </TouchableOpacity>
                ))}
              </Section>

              <Section title={`🤝 Besoins publiés (${tasksPublished.length})`} C={C} empty={tasksPublished.length === 0} emptyText="Aucun besoin publié.">
                {tasksPublished.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={styles.row}
                    activeOpacity={0.7}
                    onPress={() => goTo(`${basePath}/entraide?focusTaskId=${t.id}`)}
                  >
                    <Text style={[styles.rowText, { color: C.text, flex: 1 }]} numberOfLines={2}>
                      {CAT_ICONS[t.category]} {t.title}
                    </Text>
                    <Text style={[styles.chevron, { color: C.muted }]}>›</Text>
                  </TouchableOpacity>
                ))}
              </Section>

              <Section title={`🙋 Besoins pris en charge (${tasksClaimed.length})`} C={C} empty={tasksClaimed.length === 0} emptyText="Aucun besoin pris en charge.">
                {tasksClaimed.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={styles.row}
                    activeOpacity={0.7}
                    onPress={() => goTo(`${basePath}/entraide?focusTaskId=${t.id}`)}
                  >
                    <Text style={[styles.rowText, { color: C.text, flex: 1 }]} numberOfLines={2}>
                      {CAT_ICONS[t.category]} {t.title}
                    </Text>
                    <Text style={[styles.chevron, { color: C.muted }]}>›</Text>
                  </TouchableOpacity>
                ))}
              </Section>

              <Section title={`💛 Messages de soutien (${messages.length})`} C={C} empty={messages.length === 0} emptyText="Aucun message envoyé.">
                {messages.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={styles.row}
                    activeOpacity={0.7}
                    onPress={() => goTo(`${basePath}/soutien?focusMessageId=${m.id}`)}
                  >
                    <Text style={[styles.rowText, { color: C.text, flex: 1 }]} numberOfLines={2}>{m.message}</Text>
                    <Text style={[styles.chevron, { color: C.muted }]}>›</Text>
                  </TouchableOpacity>
                ))}
              </Section>

              <Section title={`📷 Souvenirs (${souvenirs.length})`} C={C} empty={souvenirs.length === 0} emptyText="Aucune photo envoyée." last>
                {souvenirs.length > 0 && (
                  <View style={styles.thumbRow}>
                    {souvenirs.map((s) => (
                      <TouchableOpacity key={s.id} onPress={() => goTo(`${basePath}/souvenirs`)} activeOpacity={0.8}>
                        <Image source={{ uri: s.url }} style={styles.thumb} resizeMode="cover" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </Section>
            </ScrollView>
          )}
        </View>
      </View>

      {/* Photo en grand — même présentation circulaire que la photo patient (SpaceHeader) */}
      {!!photoUrl && (
        <Modal visible={photoLightbox} transparent animationType="fade" onRequestClose={() => setPhotoLightbox(false)}>
          <TouchableOpacity style={styles.lightboxOverlay} activeOpacity={1} onPress={() => setPhotoLightbox(false)}>
            <View style={[styles.lightboxCircle, { borderColor: C.gold }]}>
              <Image source={{ uri: photoUrl }} style={styles.lightboxImage} resizeMode="cover" />
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      <ConfirmModal
        visible={resetConfirmVisible}
        icon="🔑"
        title="Réinitialiser le code ?"
        message={`${prenom} devra recréer son code depuis l'écran d'entrée. Son profil (photo, humeur, relation) sera conservé.`}
        confirmLabel="Réinitialiser"
        destructive={false}
        saving={resetting}
        onCancel={() => setResetConfirmVisible(false)}
        onConfirm={handleResetPin}
        C={C}
      />
    </Modal>
  );
}

function Section({
  title, C, empty, emptyText, last, children,
}: { title: string; C: Theme; empty: boolean; emptyText: string; last?: boolean; children: React.ReactNode }) {
  return (
    <View style={[styles.section, !last && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
      <Text style={[styles.sectionTitle, { color: C.gold }]}>{title}</Text>
      {empty ? <Text style={[styles.emptyText, { color: C.muted }]}>{emptyText}</Text> : children}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "flex-end" },
  sheet: { maxHeight: "88%", borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, paddingTop: 20, paddingHorizontal: 20, marginBottom: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, paddingBottom: 16, borderBottomWidth: 1 },
  name: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18 },
  relation: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },
  sub: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },
  motto: { fontFamily: "Caveat_600SemiBold", fontSize: 16, color: "#7EC8E3", marginTop: 3 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  closeBtnText: { fontSize: 14, fontFamily: "DM_Sans_700Bold" },

  scroll: { paddingBottom: 32 },
  section: { paddingVertical: 14 },
  sectionTitle: { fontFamily: "DM_Sans_600SemiBold", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 },
  emptyText: { fontFamily: "DM_Sans_400Regular", fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 6, gap: 8 },
  rowText: { fontFamily: "DM_Sans_400Regular", fontSize: 13, lineHeight: 19 },
  chevron: { fontFamily: "DM_Sans_700Bold", fontSize: 16 },
  thumbRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  thumb: { width: 64, height: 64, borderRadius: 8 },
  resetBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  resetBtnText: { fontFamily: "DM_Sans_600SemiBold", fontSize: 13 },

  lightboxOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center", padding: 16 },
  lightboxCircle: { width: 280, height: 280, borderRadius: 140, borderWidth: 4, overflow: "hidden" },
  lightboxImage: { width: "100%", height: "100%" },
});
