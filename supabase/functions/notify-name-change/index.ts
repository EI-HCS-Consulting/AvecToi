import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { space_id, new_firstname, new_lastname, reason } = await req.json();

    if (!space_id || !new_firstname || !new_lastname || !reason) {
      return json({ error: "Missing required fields" }, 400);
    }

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
    const adminEmail = adminData?.user?.email ?? null;

    const { error: updateError } = await supabaseAdmin
      .from("patient_spaces")
      .update({ name_change_requested_at: new Date().toISOString() })
      .eq("id", space_id);
    if (updateError) return json({ error: "Failed to record request", detail: updateError.message }, 500);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set — email skipped");
      return json({ ok: true, warning: "email not sent" });
    }

    const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:#1F3864;margin-bottom:4px">✏️ Demande de changement de nom</h2>
  <p style="color:#666;margin-top:0">Espace ${space.patient_firstname} ${space.patient_lastname}</p>

  <table style="border-collapse:collapse;width:100%;margin-top:16px">
    <tr>
      <td style="padding:10px;border:1px solid #eee;background:#f9f9f9;width:180px"><strong>Nom actuel</strong></td>
      <td style="padding:10px;border:1px solid #eee">${space.patient_firstname} ${space.patient_lastname}</td>
    </tr>
    <tr>
      <td style="padding:10px;border:1px solid #eee;background:#f9f9f9"><strong>Nouveau nom demandé</strong></td>
      <td style="padding:10px;border:1px solid #eee">${new_firstname} ${new_lastname}</td>
    </tr>
    <tr>
      <td style="padding:10px;border:1px solid #eee;background:#f9f9f9"><strong>Raison</strong></td>
      <td style="padding:10px;border:1px solid #eee">${reason}</td>
    </tr>
    <tr>
      <td style="padding:10px;border:1px solid #eee;background:#f9f9f9"><strong>Contact admin</strong></td>
      <td style="padding:10px;border:1px solid #eee">${adminEmail ?? "—"}</td>
    </tr>
    <tr>
      <td style="padding:10px;border:1px solid #eee;background:#f9f9f9"><strong>ID espace</strong></td>
      <td style="padding:10px;border:1px solid #eee">${space_id}</td>
    </tr>
  </table>

  <p style="color:#C45911;font-size:12px;font-weight:bold;margin-top:24px;margin-bottom:0">AvecToi</p>
</div>`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "AvecToi <notifications@notifications.avectoi.care>",
        to: ["support@avectoi.care"],
        reply_to: adminEmail ?? undefined,
        subject: `AvecToi — Demande de changement de nom (${space.patient_firstname} ${space.patient_lastname})`,
        html,
      }),
    });

    if (!resendRes.ok) {
      const detail = await resendRes.text();
      console.error("Resend error:", detail);
      // La demande est déjà enregistrée en base (name_change_requested_at) —
      // on ne fait pas échouer toute la requête pour un souci d'envoi email,
      // le support peut retrouver la demande via la colonne le cas échéant.
      return json({ ok: true, warning: "email failed", detail });
    }

    return json({ ok: true });
  } catch (err) {
    console.error("notify-name-change error:", err);
    return json({ error: String(err) }, 500);
  }
});
