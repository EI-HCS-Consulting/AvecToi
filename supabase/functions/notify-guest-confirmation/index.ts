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

function formatHourMinute(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

// Adresse sur une seule ligne — même logique que joinAddress()/hospitalAddressParts()
// dans lib/address.ts, dupliquée ici (pas de dossier _shared/ dans ce projet,
// chaque fonction Edge est autonome, cf. notify-cancel).
function joinAddress(parts: (string | null)[]): string {
  return parts.filter((p) => p && p.trim().length > 0).join(", ");
}

function googleMapsSearchUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

// Calcule une date/heure décalée de N minutes, en manipulant uniquement les
// champs calendaires (année/mois/jour/heure/minute) sans jamais passer par
// un fuseau réel — le serveur Deno tourne en UTC, mais ces valeurs
// représentent une heure murale Europe/Paris qu'on ne veut pas convertir.
function addMinutes(y: number, mo: number, d: number, h: number, mi: number, deltaMin: number) {
  const dt = new Date(Date.UTC(y, mo - 1, d, h, mi));
  dt.setUTCMinutes(dt.getUTCMinutes() + deltaMin);
  return { y: dt.getUTCFullYear(), mo: dt.getUTCMonth() + 1, d: dt.getUTCDate(), h: dt.getUTCHours(), mi: dt.getUTCMinutes() };
}

function gcalStamp(y: number, mo: number, d: number, h: number, mi: number): string {
  return `${String(y).padStart(4, "0")}${String(mo).padStart(2, "0")}${String(d).padStart(2, "0")}T${String(h).padStart(2, "0")}${String(mi).padStart(2, "0")}00`;
}

// Lien "Ajouter au Google Calendar" — ctz= évite toute conversion UTC, les
// horaires sont pris tels quels comme heure murale du fuseau indiqué.
function googleCalendarLink(title: string, details: string, location: string, start: { y: number; mo: number; d: number; h: number; mi: number }, end: { y: number; mo: number; d: number; h: number; mi: number }): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    details,
    location,
    dates: `${gcalStamp(start.y, start.mo, start.d, start.h, start.mi)}/${gcalStamp(end.y, end.mo, end.d, end.h, end.mi)}`,
    ctz: "Europe/Paris",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { space_id, guest_email, guest_prenom, date, creneau, type } = await req.json();

    if (!space_id || !guest_email || !date || !type) {
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

    const { data: slotConfig } = await supabaseAdmin
      .from("slot_config")
      .select("slot_duration_minutes, night_start_hour, night_start_minute, night_end_hour, night_end_minute")
      .eq("space_id", space_id)
      .single();

    const [y, mo, d] = date.split("-").map(Number);

    let startH: number, startM: number, endY: number, endMo: number, endD: number, endH: number, endM: number;
    let slotLabel: string;

    if (type === "Nuit") {
      startH = slotConfig?.night_start_hour ?? 19;
      startM = slotConfig?.night_start_minute ?? 0;
      const endHour = slotConfig?.night_end_hour ?? 8;
      const endMinute = slotConfig?.night_end_minute ?? 0;
      const nextDay = new Date(Date.UTC(y, mo - 1, d));
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      endY = nextDay.getUTCFullYear(); endMo = nextDay.getUTCMonth() + 1; endD = nextDay.getUTCDate();
      endH = endHour; endM = endMinute;
      slotLabel = `🌙 Nuit (${formatHourMinute(startH, startM)} → ${formatHourMinute(endHour, endMinute)})`;
    } else {
      const [h, mi] = String(creneau).split(":").map(Number);
      startH = h; startM = mi;
      const durationMin = slotConfig?.slot_duration_minutes ?? 20;
      const end = addMinutes(y, mo, d, h, mi, durationMin);
      endY = end.y; endMo = end.mo; endD = end.d; endH = end.h; endM = end.mi;
      slotLabel = creneau;
    }

    const useHome = !!space.home_care_mode;
    const address = joinAddress(useHome
      ? [space.home_address, space.home_address_line2, [space.home_postal_code, space.home_city].filter(Boolean).join(" "), space.home_country]
      : [space.hospital_address, space.hospital_address_line2, [space.hospital_postal_code, space.hospital_city].filter(Boolean).join(" "), space.hospital_country]);
    const locationName = useHome ? "Domicile" : space.hospital_name;
    const mapsUrl = (useHome ? space.home_maps_url : space.hospital_maps_url) || googleMapsSearchUrl(address || locationName);

    const dateObj = new Date(`${date}T12:00:00`);
    const dateFr = dateObj.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const calLink = googleCalendarLink(
      `Visite — ${space.patient_firstname} ${space.patient_lastname}`,
      `Visite organisée via AvecToi.${address ? " Adresse : " + address : ""}`,
      `${locationName}${address ? ", " + address : ""}`,
      { y, mo, d, h: startH, mi: startM },
      { y: endY, mo: endMo, d: endD, h: endH, mi: endM },
    );

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set — email skipped");
      return json({ ok: true, warning: "email not sent" });
    }

    const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:#1F3864;margin-bottom:4px">🎉 Confirmation de visite</h2>
  <p style="color:#666;margin-top:0">AvecToi — ${space.patient_firstname} ${space.patient_lastname}</p>

  <p>Bonjour${guest_prenom ? " " + guest_prenom : ""},<br/>
  Une visite a été réservée pour vous. Voici les informations pratiques :</p>

  <table style="border-collapse:collapse;width:100%;margin-top:16px">
    <tr>
      <td style="padding:10px;border:1px solid #eee;background:#f9f9f9;width:130px"><strong>Date</strong></td>
      <td style="padding:10px;border:1px solid #eee">${dateFr}</td>
    </tr>
    <tr>
      <td style="padding:10px;border:1px solid #eee;background:#f9f9f9"><strong>Créneau</strong></td>
      <td style="padding:10px;border:1px solid #eee">${slotLabel}</td>
    </tr>
    <tr>
      <td style="padding:10px;border:1px solid #eee;background:#f9f9f9"><strong>Lieu</strong></td>
      <td style="padding:10px;border:1px solid #eee">${locationName}${space.hospital_room && !useHome ? " — " + space.hospital_room : ""}${address ? "<br/>" + address : ""}</td>
    </tr>
  </table>

  <div style="margin-top:24px">
    <a href="${mapsUrl}" style="display:inline-block;background:#1F3864;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;margin-right:10px">📍 Voir l'itinéraire</a>
    <a href="${calLink}" style="display:inline-block;background:#2E75B6;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">📅 Ajouter à mon calendrier</a>
  </div>

  <p style="color:#C45911;font-size:12px;font-weight:bold;margin-top:24px;margin-bottom:0">AvecToi</p>
  <p style="color:#999;font-size:12px;margin-top:4px">
    Cet email vous a été envoyé car quelqu'un a réservé une visite en votre nom via l'application AvecToi.
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
        to: [guest_email],
        subject: `AvecToi — Confirmation de votre visite du ${dateFr}`,
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
    console.error("notify-guest-confirmation error:", err);
    return json({ error: String(err) }, 500);
  }
});
