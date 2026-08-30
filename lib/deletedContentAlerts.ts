import { supabase } from "./supabase";
import type { VisitorSession } from "./visitorSession";

// Alerte de connexion (DeletedContentAlertModal) quand l'admin a supprimé "en
// douceur" (deleted_by_admin) une publication d'un visiteur — voir
// supabase/migrations/20260811_content_deleted_by_admin.sql et
// 20260830_deleted_content_seen.sql. Ne concerne jamais l'admin lui-même :
// son propre contenu est toujours supprimé définitivement, sans passer par
// deleted_by_admin (voir Entraide.tsx > deleteOrSoftDeleteTasks).
export type DeletedContentAlert = {
  id: string;
  table: "tasks" | "news_entries" | "support_messages";
  kind: "besoin" | "nouvelle" | "message";
  preview: string;
  created_at: string;
};

function matches(prenom: string, nom: string, pin: string | null, session: VisitorSession): boolean {
  return (
    pin === session.pin
    && prenom.trim().toLowerCase() === session.prenom.trim().toLowerCase()
    && nom.trim().toLowerCase() === session.nom.trim().toLowerCase()
  );
}

export async function fetchOpenDeletedContentAlerts(
  spaceId: string,
  session: VisitorSession,
): Promise<DeletedContentAlert[]> {
  const [tasks, news, messages] = await Promise.all([
    supabase.from("tasks").select("id, title, author_prenom, author_nom, author_pin, created_at")
      .eq("space_id", spaceId).eq("deleted_by_admin", true).eq("deleted_seen", false),
    supabase.from("news_entries").select("id, content, author_prenom, author_nom, author_pin, created_at")
      .eq("space_id", spaceId).eq("deleted_by_admin", true).eq("deleted_seen", false),
    supabase.from("support_messages").select("id, message, author_prenom, author_nom, author_pin, created_at")
      .eq("space_id", spaceId).eq("deleted_by_admin", true).eq("deleted_seen", false),
  ]);
  const alerts: DeletedContentAlert[] = [];
  for (const t of tasks.data ?? []) {
    if (matches(t.author_prenom ?? "", t.author_nom ?? "", t.author_pin, session)) {
      alerts.push({ id: t.id, table: "tasks", kind: "besoin", preview: t.title, created_at: t.created_at });
    }
  }
  for (const n of news.data ?? []) {
    if (matches(n.author_prenom, n.author_nom, n.author_pin, session)) {
      alerts.push({ id: n.id, table: "news_entries", kind: "nouvelle", preview: n.content, created_at: n.created_at });
    }
  }
  for (const m of messages.data ?? []) {
    if (matches(m.author_prenom, m.author_nom, m.author_pin, session)) {
      alerts.push({ id: m.id, table: "support_messages", kind: "message", preview: m.message, created_at: m.created_at });
    }
  }
  return alerts.sort((a, b) => a.created_at.localeCompare(b.created_at));
}
