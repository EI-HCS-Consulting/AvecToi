import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Doit rester synchronisé avec FREE_TRIAL_DAYS (lib/freemiumCap.ts) et le
// délai codé dans check_visite_cap() (voir 20260902_freemium_7day_window.sql).
const FREE_TRIAL_DAYS = 7;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// Appelée quotidiennement par pg_cron (voir 20260902_freemium_7day_window.sql),
// même schéma d'auth que rgpd-purge. Contrairement à l'ancien cap à 8
// réservations — qui se détectait naturellement au moment de l'insert — le
// cap à 7 jours glissants peut être franchi sans aucune nouvelle réservation :
// il faut donc un scan périodique plutôt qu'un trigger AFTER INSERT.
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret) {
    const auth = req.headers.get("Authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return json({ error: "Unauthorized" }, 401);
    }
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: spaces, error: spacesError } = await supabaseAdmin
      .from("patient_spaces")
      .select("id")
      .eq("premium", false)
      .is("cap_email_sent_at", null);

    if (spacesError) throw spacesError;
    if (!spaces || spaces.length === 0) return json({ ok: true, checked: 0, notified: 0 });

    const notifyUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-cap-reached`;
    let notified = 0;

    for (const space of spaces) {
      const { data: firstVisite } = await supabaseAdmin
        .from("reservations")
        .select("timestamp")
        .eq("space_id", space.id)
        .eq("type", "Visite")
        .order("timestamp", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!firstVisite) continue;

      const deadline = new Date(firstVisite.timestamp);
      deadline.setUTCDate(deadline.getUTCDate() + FREE_TRIAL_DAYS);
      if (deadline > new Date()) continue;

      // Pose le marqueur avant d'appeler notify-cap-reached : garantit un
      // seul envoi même si deux exécutions du cron se chevauchent.
      const { data: updated } = await supabaseAdmin
        .from("patient_spaces")
        .update({ cap_email_sent_at: new Date().toISOString() })
        .eq("id", space.id)
        .is("cap_email_sent_at", null)
        .select("id");

      if (!updated || updated.length === 0) continue;

      await fetch(notifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cronSecret}`,
        },
        body: JSON.stringify({ space_id: space.id }),
      });
      notified++;
    }

    return json({ ok: true, checked: spaces.length, notified });
  } catch (err) {
    console.error("check-freemium-expiry error:", err);
    return json({ error: String(err) }, 500);
  }
});
