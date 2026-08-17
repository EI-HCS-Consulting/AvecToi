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

// Adresse sur une seule ligne — même logique que joinAddress()/hospitalAddressParts()
// dans lib/address.ts, dupliquée ici (pas de dossier _shared/ dans ce projet,
// chaque fonction Edge est autonome, cf. notify-guest-confirmation).
function joinAddress(parts: (string | null)[]): string {
  return parts.filter((p) => p && p.trim().length > 0).join(", ");
}

function googleMapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { space_id, intervenant_email, intervenant_prenom, date, creneau, duration_minutes, intervention_label } = await req.json();

    if (!space_id || !intervenant_email || !date || !creneau || !intervention_label) {
      return json({ error: "Missing required fields" }, 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: space } = await supabaseAdmin
      .from("patient_spaces")
      .select(
        "patient_firstname, patient_lastname, hospital_name, hospital_room, hospital_address, " +
        "hospital_address_line2, hospital_postal_code, hospital_city, hospital_country, hospital_maps_url, " +
        "home_care_mode, home_address, home_address_line2, home_postal_code, home_city, home_country, home_maps_url",
      )
      .eq("id", space_id)
      .single();

    if (!space) return json({ error: "Space not found" }, 404);

    const useHome = !!space.home_care_mode;
    const address = joinAddress(useHome
      ? [space.home_address, space.home_address_line2, [space.home_postal_code, space.home_city].filter(Boolean).join(" "), space.home_country]
      : [space.hospital_address, space.hospital_address_line2, [space.hospital_postal_code, space.hospital_city].filter(Boolean).join(" "), space.hospital_country]);
    const locationName = useHome ? "Domicile" : space.hospital_name;
    const mapsUrl = (useHome ? space.home_maps_url : space.hospital_maps_url) || googleMapsSearchUrl(address || locationName);

    const dateObj = new Date(`${date}T12:00:00`);
    const dateFr = dateObj.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set — email skipped");
      return json({ ok: true, warning: "email not sent" });
    }

    const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:#1F3864;margin-bottom:4px">🩺 Confirmation de créneau réservé</h2>
  <p style="color:#666;margin-top:0">AvecToi — ${space.patient_firstname} ${space.patient_lastname}</p>

  <p>Bonjour${intervenant_prenom ? " " + intervenant_prenom : ""},<br/>
  Un créneau d'intervention a été réservé pour vous. Voici les informations pratiques :</p>

  <table style="border-collapse:collapse;width:100%;margin-top:16px">
    <tr>
      <td style="padding:10px;border:1px solid #eee;background:#f9f9f9;width:130px"><strong>Date</strong></td>
      <td style="padding:10px;border:1px solid #eee">${dateFr}</td>
    </tr>
    <tr>
      <td style="padding:10px;border:1px solid #eee;background:#f9f9f9"><strong>Heure</strong></td>
      <td style="padding:10px;border:1px solid #eee">${creneau}${duration_minutes ? ` (${duration_minutes} min)` : ""}</td>
    </tr>
    <tr>
      <td style="padding:10px;border:1px solid #eee;background:#f9f9f9"><strong>Type de soin</strong></td>
      <td style="padding:10px;border:1px solid #eee">${intervention_label}</td>
    </tr>
    <tr>
      <td style="padding:10px;border:1px solid #eee;background:#f9f9f9"><strong>Patient</strong></td>
      <td style="padding:10px;border:1px solid #eee">${space.patient_firstname} ${space.patient_lastname}</td>
    </tr>
    <tr>
      <td style="padding:10px;border:1px solid #eee;background:#f9f9f9"><strong>Lieu</strong></td>
      <td style="padding:10px;border:1px solid #eee">${locationName}${space.hospital_room && !useHome ? " — " + space.hospital_room : ""}${address ? "<br/>" + address : ""}</td>
    </tr>
  </table>

  <div style="margin-top:24px">
    <a href="${mapsUrl}" style="display:inline-block;background:#1F3864;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">📍 Voir l'itinéraire</a>
  </div>

  <p style="color:#C45911;font-size:12px;font-weight:bold;margin-top:24px;margin-bottom:0">AvecToi</p>
  <p style="color:#999;font-size:12px;margin-top:4px">
    Cet email vous a été envoyé car l'administrateur de cet espace vous a réservé un créneau via l'application AvecToi.
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
        to: [intervenant_email],
        subject: `AvecToi — Confirmation de votre créneau du ${dateFr}`,
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
    console.error("notify-intervention-confirmation error:", err);
    return json({ error: String(err) }, 500);
  }
});
