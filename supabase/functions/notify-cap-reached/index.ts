import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Placeholder — à remplacer par l'URL réelle de la page de paiement une
// fois connue. Ce lien n'apparaît que dans cet email, jamais dans l'app
// (conformité reader-app, voir CLAUDE.md).
const UPGRADE_URL = "https://avectoi.care/upgrade";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // Appelée uniquement depuis le trigger Postgres (pg_net), jamais par un
  // utilisateur — même schéma d'auth que rgpd-purge.
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret) {
    const auth = req.headers.get("Authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return json({ error: "Unauthorized" }, 401);
    }
  }

  try {
    const { space_id } = await req.json();
    if (!space_id) return json({ error: "Missing space_id" }, 400);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: space } = await supabaseAdmin
      .from("patient_spaces")
      .select("admin_id, patient_firstname, patient_lastname")
      .eq("id", space_id)
      .single();

    if (!space) return json({ error: "Space not found" }, 404);

    const { data: adminData } = await supabaseAdmin.auth.admin.getUserById(space.admin_id);
    const adminEmail = adminData?.user?.email;
    if (!adminEmail) return json({ error: "Admin email not found" }, 400);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set — email skipped");
      return json({ ok: true, warning: "email not sent" });
    }

    const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:#1F3864;margin-bottom:4px">📋 Limite de l'espace atteinte</h2>
  <p style="color:#666;margin-top:0">AvecToi — ${space.patient_firstname} ${space.patient_lastname}</p>

  <p>
    L'espace de <strong>${space.patient_firstname} ${space.patient_lastname}</strong> a atteint
    sa limite de réservations gratuites. Le planning est temporairement bloqué pour les
    visiteurs comme pour vous.
  </p>

  <div style="background:#fdece1;border:1px solid #C45911;border-radius:8px;padding:16px;margin:20px 0">
    <strong>Passez à la version illimitée</strong> pour débloquer instantanément l'espace,
    sans limite de réservations.<br/><br/>
    <a href="${UPGRADE_URL}" style="color:#1F3864;font-weight:bold">${UPGRADE_URL}</a>
  </div>

  <p style="color:#C45911;font-size:12px;font-weight:bold;margin-top:24px;margin-bottom:0">AvecToi</p>
  <p style="color:#999;font-size:12px;margin-top:4px">
    Ce message est envoyé automatiquement. Ne pas répondre à cet email.
  </p>
</div>`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "AvecToi <notifications@notifications.avectoi.care>",
        to: [adminEmail],
        subject: `AvecToi — Limite atteinte pour ${space.patient_firstname} ${space.patient_lastname}`,
        html,
      }),
    });

    if (!resendRes.ok) {
      const detail = await resendRes.text();
      console.error("Resend error:", detail);
      return json({ error: "Email failed", detail }, 500);
    }

    return json({ ok: true });
  } catch (err) {
    console.error("notify-cap-reached error:", err);
    return json({ error: String(err) }, 500);
  }
});
