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

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { space_id, prenom, nom, email, purpose } = await req.json();

    if (!space_id || !prenom || !nom || !email || !purpose) {
      return json({ error: "Missing required fields" }, 400);
    }
    if (purpose !== "accept" && purpose !== "reset") {
      return json({ error: "Invalid purpose" }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Le demandeur doit correspondre à une invitation en attente (accept) ou
    // à un co-admin déjà actif+accepté avec cet email (reset) — sinon on ne
    // révèle rien et on ne génère aucun code.
    let query = supabaseAdmin
      .from("patient_space_coadmins")
      .select("id, email")
      .eq("space_id", space_id)
      .ilike("prenom", prenom.trim())
      .ilike("nom", nom.trim())
      .eq("active", true)
      .order("granted_at", { ascending: false })
      .limit(1);

    query = purpose === "accept" ? query.is("accepted_at", null) : query.not("accepted_at", "is", null);

    const { data: coadminRow } = await query.maybeSingle();

    if (!coadminRow) {
      return json({ error: "No matching co-admin record" }, 404);
    }
    if (purpose === "reset" && coadminRow.email?.toLowerCase().trim() !== String(email).toLowerCase().trim()) {
      return json({ error: "Email does not match" }, 404);
    }

    // Anti-spam : pas de nouveau code si un code non expiré/non utilisé
    // existe déjà depuis moins de 60s pour la même identité+purpose.
    const { data: recent } = await supabaseAdmin
      .from("coadmin_verification_codes")
      .select("created_at")
      .eq("space_id", space_id)
      .ilike("prenom", prenom.trim())
      .ilike("nom", nom.trim())
      .eq("purpose", purpose)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recent && Date.now() - new Date(recent.created_at).getTime() < 60_000) {
      return json({ ok: true, warning: "code already sent recently" });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();

    const { error: insertError } = await supabaseAdmin.from("coadmin_verification_codes").insert({
      space_id,
      prenom: prenom.trim(),
      nom: nom.trim(),
      email,
      purpose,
      code,
      expires_at: expiresAt,
    });
    if (insertError) return json({ error: "Failed to create code", detail: insertError.message }, 500);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set — email skipped");
      return json({ ok: true, warning: "email not sent" });
    }

    const title = purpose === "accept"
      ? "🛡️ Confirmez votre prise de fonction de co-administrateur"
      : "🔑 Réinitialisation de votre code d'accès co-administrateur";
    const intro = purpose === "accept"
      ? "Voici votre code de confirmation pour devenir co-administrateur temporaire sur AvecToi :"
      : "Voici votre code pour réinitialiser votre code d'accès (PIN) co-administrateur sur AvecToi :";

    const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:#1F3864;margin-bottom:4px">${title}</h2>
  <p style="color:#666;margin-top:0">${intro}</p>
  <p style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#1F3864;text-align:center;margin:24px 0">${code}</p>
  <p style="color:#666;font-size:13px">Ce code est valable 10 minutes et à usage unique.</p>
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
        to: [email],
        subject: purpose === "accept"
          ? "AvecToi — Confirmez votre prise de fonction"
          : "AvecToi — Réinitialisation de votre code d'accès",
        html,
      }),
    });

    if (!resendRes.ok) {
      const detail = await resendRes.text();
      console.error("Resend error:", detail);
      return json({ ok: true, warning: "email failed", detail });
    }

    return json({ ok: true });
  } catch (err) {
    console.error("send-coadmin-verification-code error:", err);
    return json({ error: String(err) }, 500);
  }
});
