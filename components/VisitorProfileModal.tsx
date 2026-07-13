import { useEffect, useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, Image,
  Modal, StyleSheet, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import PatientAvatar from "@/components/PatientAvatar";
import type { Reservation, NewsEntry, Task, SupportMessage, SouvenirPhoto } from "@/lib/types";
import type { Theme } from "@/lib/themes";

// Fiche visiteur en lecture seule — ouverte en cliquant le nom d'un autre
// visiteur dans Nouvelles/Souvenirs/Soutien. Même rapprochement par
// prénom+nom (ilike, pas de PIN) que "Mes contributions" dans
// app/(visitor)/account.tsx : il n'existe pas d'identifiant de compte
// visiteur, donc pas de moyen plus fiable, et comme il s'agit de simple
// consultation (pas de modification), le PIN n'a pas lieu d'être demandé ici.

const CAT_ICONS: Record<Task["category"], string> = {
  repas: "🍽️", affaires: "🧳", courses: "🛒", transport: "🚗", administratif: "🗂️", autre: "📌",
};

function souvenirUrl(spaceId: string, filename: string) {
  const { data } = supabase.storage.from("souvenirs").getPublicUrl(`${spaceId}/${filename}`);
  return data.publicUrl;
}

function visitorPhotoUrl(spaceId: string, filename: string) {
  const { data } = supabase.storage.from("visitor-photos").getPublicUrl(`${spaceId}/${filename}`);
  return data.publicUrl;
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
      supabase.from("visitor_profiles").select("photo").eq("space_id", spaceId)
        .ilike("prenom", p).ilike("nom", n).maybeSingle(),
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
    if (visible && prenom.trim() && nom.trim()) load();
  }, [visible, prenom, nom, load]);

  function goTo(path: string) {
    onClose();
    router.push(path as any);
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
              <Text style={[styles.sub, { color: C.muted }]}>Fiche visiteur</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { borderColor: C.border }]}>
              <Text style={[styles.closeBtnText, { color: C.muted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={C.accent} style={{ marginVertical: 32 }} />
          ) : (
            <ScrollView contentContainerStyle={styles.scroll}>
              <Section title={`📅 Réservations (${reservations.length})`} C={C} empty={reservations.length === 0} emptyText="Aucune réservation.">
                {reservations.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={styles.row}
                    activeOpacity={0.7}
                    onPress={() => goTo(`${basePath}/home/${r.type === "Nuit" ? "nights" : "slots"}`)}
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
  sheet: { maxHeight: "88%", borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, paddingTop: 20, paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, paddingBottom: 16, borderBottomWidth: 1 },
  name: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18 },
  sub: { fontFamily: "DM_Sans_400Regular", fontSize: 12, marginTop: 2 },
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

  lightboxOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center", padding: 16 },
  lightboxCircle: { width: 280, height: 280, borderRadius: 140, borderWidth: 4, overflow: "hidden" },
  lightboxImage: { width: "100%", height: "100%" },
});
