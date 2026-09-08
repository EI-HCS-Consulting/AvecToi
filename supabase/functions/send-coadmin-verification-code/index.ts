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

    if (!space_id || !prenom || !nom || !purpose || (purpose !== "reset" && !email)) {
      return json({ error: "Missing required fields" }, 400);
    }
    if (purpose !== "accept" && purpose !== "reset" && purpose !== "propose") {
      return json({ error: "Invalid purpose" }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Adresse effectivement utilisée pour l'insert + l'envoi ci-dessous —
    // pour 'reset', c'est TOUJOURS celle déjà en base (jamais celle du corps
    // de la requête, le client n'en fournit d'ailleurs plus aucune) : le
    // visiteur qui a perdu son code n'a rien à ressaisir, voir
    // 20260908_visitor_email_selfservice.sql.
    let resolvedEmail: string = email;

    // 'propose' est envoyé AVANT toute ligne patient_space_coadmins (le
    // visiteur propose une période de relais, l'admin valide ensuite — voir
    // 20260908_coadmin_propose_verification.sql) : seule l'identité visiteur
    // (visitor_profiles) est vérifiée, pas une invitation préexistante.
    if (purpose === "propose") {
      const { data: profile } = await supabaseAdmin
        .from("visitor_profiles")
        .select("id")
        .eq("space_id", space_id)
        .ilike("prenom", prenom.trim())
        .ilike("nom", nom.trim())
        .maybeSingle();
      if (!profile) {
        return json({ error: "No matching visitor record" }, 404);
      }
    } else if (purpose === "reset") {
      // Généralisé à tout visiteur ayant un email vérifié sur son profil
      // (visitor_profiles.email, alimenté par 'propose' ci-dessus) — plus
      // seulement les co-administrateurs actifs, voir
      // 20260908_visitor_email_selfservice.sql. L'email n'est jamais exposé
      // au client (ni demandé, ni renvoyé) : seule sa présence en base
      // déclenche l'envoi, à l'adresse qui y est déjà enregistrée.
      const { data: profile } = await supabaseAdmin
        .from("visitor_profiles")
        .select("id, email")
        .eq("space_id", space_id)
        .ilike("prenom", prenom.trim())
        .ilike("nom", nom.trim())
        .maybeSingle();
      if (!profile || !profile.email) {
        return json({ error: "No email on file" }, 404);
      }
      resolvedEmail = profile.email;
    } else {
      // purpose === "accept" — flux legacy d'invitation de co-administration,
      // plus déclenché côté client depuis 20260908_coadmin_propose_verification.sql
      // (email vérifié dès la proposition), conservé pour compat descendante.
      const { data: coadminRow } = await supabaseAdmin
        .from("patient_space_coadmins")
        .select("id")
        .eq("space_id", space_id)
        .ilike("prenom", prenom.trim())
        .ilike("nom", nom.trim())
        .eq("active", true)
        .is("accepted_at", null)
        .order("granted_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!coadminRow) {
        return json({ error: "No matching co-admin record" }, 404);
      }
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
      email: resolvedEmail,
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

    const title = purpose === "propose"
      ? "🛡️ Confirmez votre proposition de co-administration"
      : purpose === "accept"
      ? "🛡️ Confirmez votre prise de fonction de co-administrateur"
      : "🔑 Réinitialisation de votre code d'accès co-administrateur";
    const intro = purpose === "propose"
      ? "Voici votre code de confirmation pour valider ta proposition de co-administration temporaire sur AvecToi. Il ne te reste plus qu'à attendre la validation de l'administrateur :"
      : purpose === "accept"
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
        to: [resolvedEmail],
        subject: purpose === "propose"
          ? "AvecToi — Confirmez votre proposition"
          : purpose === "accept"
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
