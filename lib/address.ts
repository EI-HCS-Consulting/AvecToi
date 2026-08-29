import type { PatientSpace } from "./types";

/**
 * URL "Universal Cross-Platform Maps" de Google — pas de clé API requise,
 * ouvre l'app ou le web Google Maps directement sur la recherche.
 * https://developers.google.com/maps/documentation/urls/get-started
 */
export function googleMapsSearchUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

type AddressParts = {
  street: string | null;
  line2: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
};

function cityLine(postalCode: string | null, city: string | null) {
  return [postalCode, city].filter((p) => p && p.trim().length > 0).join(" ");
}

function cityCountryLine(postalCode: string | null, city: string | null, country: string | null) {
  return [cityLine(postalCode, city), country].filter((p) => p && p.trim().length > 0).join(" - ");
}

/** Adresse sur une seule ligne (virgules), pour la recherche Google Maps et le calendrier natif. */
export function joinAddress({ street, line2, postalCode, city, country }: AddressParts): string {
  return [street, line2, cityLine(postalCode, city), country]
    .filter((p) => p && p.trim().length > 0)
    .join(", ");
}

/** Adresse en plusieurs lignes (rue / complément / CP+ville - pays), pour l'affichage dans le bandeau. */
export function addressLines({ street, line2, postalCode, city, country }: AddressParts): string[] {
  return [street, line2, cityCountryLine(postalCode, city, country)].filter((p) => p && p.trim().length > 0) as string[];
}

export function hospitalAddressParts(space: PatientSpace): AddressParts {
  return {
    street: space.hospital_address,
    line2: space.hospital_address_line2,
    postalCode: space.hospital_postal_code,
    city: space.hospital_city,
    country: space.hospital_country,
  };
}

export function homeAddressParts(space: PatientSpace): AddressParts {
  return {
    street: space.home_address,
    line2: space.home_address_line2,
    postalCode: space.home_postal_code,
    city: space.home_city,
    country: space.home_country,
  };
}

export function activeAddressParts(space: PatientSpace): AddressParts {
  return space.home_care_mode ? homeAddressParts(space) : hospitalAddressParts(space);
}

/**
 * Lien Google Maps vers le lieu d'intervention actif (domicile ou hôpital).
 * Priorité au lien collé à la main par l'admin (home_maps_url/hospital_maps_url
 * — plus fiable qu'une recherche par adresse pour un gros établissement),
 * repli sur une recherche générée depuis l'adresse (ou, à défaut, le nom de
 * l'hôpital) — même logique que SpaceHeader.tsx (bandeau visiteur) et l'edge
 * function notify-guest-confirmation, ici factorisée pour le Planning
 * intervenant (voir app/(visitor)/soins.tsx, bouton "Y Aller").
 */
export function mapsUrlForSpace(
  space: Pick<
    PatientSpace,
    "home_care_mode" | "hospital_name" | "hospital_maps_url" | "home_maps_url" |
    "hospital_address" | "hospital_address_line2" | "hospital_postal_code" | "hospital_city" | "hospital_country" |
    "home_address" | "home_address_line2" | "home_postal_code" | "home_city" | "home_country"
  >,
): string | null {
  const pasted = space.home_care_mode ? space.home_maps_url : space.hospital_maps_url;
  if (pasted) return pasted;
  const full = joinAddress(activeAddressParts(space as PatientSpace));
  // Pour un hôpital, la recherche part du NOM précis renseigné par l'admin
  // avant l'adresse (pas l'adresse seule) — un gros établissement peut avoir
  // plusieurs entrées sur la même rue, et le nom exact lève l'ambiguïté que
  // l'adresse seule ne lève pas.
  const locationName = space.home_care_mode ? "Domicile" : space.hospital_name;
  const query = space.home_care_mode ? full || locationName : [locationName, full].filter(Boolean).join(", ") || locationName;
  return query ? googleMapsSearchUrl(query) : null;
}

/**
 * Résumé court du lieu d'intervention (1 ligne), pour PatientsList.tsx —
 * même logique que le bandeau SpaceHeader.tsx (infoLines) : domicile → ville,
 * hôpital → nom + "Service X · Chambre Y".
 */
export function careLocationSummary(
  space: Pick<PatientSpace, "home_care_mode" | "hospital_name" | "hospital_service" | "hospital_room" | "home_city" | "home_postal_code">,
): string {
  if (space.home_care_mode) {
    const city = cityLine(space.home_postal_code, space.home_city);
    return city ? `Domicile · ${city}` : "Domicile";
  }
  const serviceRoom = [
    space.hospital_service ? `Service ${space.hospital_service}` : null,
    space.hospital_room ? `Chambre ${space.hospital_room}` : null,
  ]
    .filter((p): p is string => !!p)
    .join("  ·  ");
  return [space.hospital_name, serviceRoom].filter((p) => p && p.trim().length > 0).join(" — ") || "Lieu à préciser";
}

/**
 * Lieu du soin pour "Mes Espaces Patients" (planning cross-space d'un
 * intervenant, app/(visitor)/home/mes-espaces-patients.tsx) : hôpital → même
 * format que careLocationSummary (nom + service + chambre) ; domicile →
 * adresse complète (rue, CP ville), contrairement au résumé "Domicile ·
 * Ville" de careLocationSummary (PatientsList.tsx) — ici l'intervenant a
 * besoin de l'adresse exacte pour s'y rendre, pas juste de la ville.
 */
export function careLocationDetail(
  space: Pick<
    PatientSpace,
    "home_care_mode" | "hospital_name" | "hospital_service" | "hospital_room" | "home_address" | "home_address_line2" | "home_postal_code" | "home_city" | "home_country"
  >,
): string {
  if (space.home_care_mode) {
    const addr = joinAddress({
      street: space.home_address,
      line2: space.home_address_line2,
      postalCode: space.home_postal_code,
      city: space.home_city,
      country: space.home_country,
    });
    return addr || "Domicile";
  }
  return careLocationSummary(space);
}

/**
 * Le segment /maps/place/<...>/ contient souvent le nom ET l'adresse
 * complète, séparés par des virgules :
 * "Hôpital Michallon - CHU Grenoble Alpes, Bd de la Chantourne, 38700 La Tronche"
 * → on renvoie chaque partie décodée pour les répartir ensuite (nom / rue /
 * CP+ville) sans dépendre des coordonnées GPS, absentes de certains liens.
 */
function extractPlaceSegments(url: string): string[] {
  const match = url.match(/\/maps\/place\/([^/?]+)/);
  if (!match) return [];
  // Décoder AVANT de remplacer les "+" par des espaces, pas l'inverse : sur un
  // lien enveloppé par l'écran de consentement RGPD de Google, le "+" d'origine
  // est lui-même encodé en "%2B" (double encodage). Remplacer les "+" d'abord
  // ne trouve donc rien à ce stade, et un seul decodeURIComponent laisse à la
  // fois des "%C3%B4" non résolus et des "+" fraîchement révélés jamais
  // convertis en espace. decodeURIComponent ne touche jamais un "+" littéral,
  // donc décoder (jusqu'à 2 fois, comme decodeLayers) puis remplacer ensuite
  // fonctionne aussi bien pour un lien simple que pour un lien enveloppé.
  let raw = match[1];
  for (let i = 0; i < 2; i++) {
    try {
      const next = decodeURIComponent(raw);
      if (next === raw) break;
      raw = next;
    } catch {
      break;
    }
  }
  const decoded = raw.replace(/\+/g, " ");
  return decoded.split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * Répartit les segments d'adresse (hors nom, en position 0) en rue / CP /
 * ville / pays. Pour une adresse hors du pays de l'utilisateur, Google
 * ajoute le pays comme dernier segment ("..., 8001 Zürich, Suisse") — on
 * cherche donc le segment "<CP> <ville>" n'importe où, pas seulement en
 * dernière position, et tout ce qui suit devient le pays.
 *
 * Le segment 0 est traité comme un nom d'établissement (ex. "Hôpital
 * Michallon") seulement s'il y a au moins un segment entre lui et le
 * CP+ville. Pour un lien qui pointe sur une adresse simple sans
 * établissement nommé (cas fréquent d'un domicile : "12 Rue des Lilas,
 * 38000 Grenoble"), le CP+ville arrive juste après le segment 0 — celui-ci
 * est alors la rue elle-même, pas un nom, sinon la rue resterait vide alors
 * que CP/ville se remplissent (bug constaté en usage réel).
 */
function parseAddressFromSegments(segments: string[]): { street: string | null; postalCode: string | null; city: string | null; country: string | null } {
  const rest = segments.slice(1);
  if (rest.length === 0) return { street: null, postalCode: null, city: null, country: null };
  const cpIndex = rest.findIndex((s) => /^\d{4,6}\s+.+$/.test(s));
  if (cpIndex === -1) {
    return { street: rest.join(", ") || null, postalCode: null, city: null, country: null };
  }
  const cpMatch = rest[cpIndex].match(/^(\d{4,6})\s+(.+)$/)!;
  const streetSegments = rest.slice(0, cpIndex);
  const street = streetSegments.length > 0 ? streetSegments.join(", ") : (segments[0] ?? null);
  const country = rest.slice(cpIndex + 1).join(", ") || null;
  return { street, postalCode: cpMatch[1], city: cpMatch[2], country };
}

function extractCoords(url: string): { lat: number; lon: number } | null {
  const at = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) return { lat: parseFloat(at[1]), lon: parseFloat(at[2]) };
  // Repli : format "!3d<lat>!4d<lon>" utilisé dans le paramètre data= de
  // certaines URLs Google Maps quand le "@lat,lon" n'est pas présent.
  const bang = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (bang) return { lat: parseFloat(bang[1]), lon: parseFloat(bang[2]) };
  return null;
}

/**
 * Certaines redirections Google (écran de consentement RGPD en zone UE, par
 * ex. consent.google.com/ml?continue=<url encodée>) transportent la vraie
 * URL maps.google.com dans un paramètre encodé plutôt que dans le path
 * visible. On décode une à deux fois pour faire remonter /maps/place/ et
 * @lat,lon avant d'y appliquer les regex ci-dessus.
 */
function decodeLayers(url: string, times = 2): string {
  let out = url;
  for (let i = 0; i < times; i++) {
    try {
      const next = decodeURIComponent(out);
      if (next === out) break;
      out = next;
    } catch {
      break;
    }
  }
  return out;
}

/**
 * Géocodage inverse gratuit et sans clé via OpenStreetMap Nominatim — leur
 * politique d'usage demande juste un User-Agent identifiant l'app (pas de
 * compte, pas d'inscription). Résultat parfois légèrement différent du
 * découpage d'adresse "officiel" Google — à ajuster à la main si besoin.
 * https://operations.osmfoundation.org/policies/nominatim/
 */
async function reverseGeocode(lat: number, lon: number): Promise<{ street: string | null; postalCode: string | null; city: string | null; country: string | null; note: string }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&email=support%40avectoi.care`,
      { headers: { "User-Agent": "AvecToi/1.0 (support@avectoi.care)", "Accept": "application/json", "Accept-Language": "fr" } }
    );
    if (!res.ok) {
      return { street: null, postalCode: null, city: null, country: null, note: `Nominatim a répondu ${res.status}` };
    }
    const data = await res.json();
    const a = data?.address ?? {};
    const street = ([a.house_number, a.road].filter(Boolean).join(" ") || null) as string | null;
    const postalCode = (a.postcode as string | undefined) ?? null;
    const city = (a.city ?? a.town ?? a.village ?? a.municipality ?? null) as string | null;
    const country = (a.country as string | undefined) ?? null;
    return { street, postalCode, city, country, note: `Nominatim OK : ${JSON.stringify(a)}` };
  } catch (e) {
    return { street: null, postalCode: null, city: null, country: null, note: `Nominatim a échoué : ${String(e)}` };
  }
}

/**
 * Géocodage direct (nom → adresse) via Nominatim, pour les liens Google Maps
 * qui ne contiennent qu'un identifiant de lieu opaque (data=!4m2!3m1!1s0x...,
 * ni adresse texte ni @lat,lon) — cas fréquent pour les gros établissements
 * (Google omet volontairement l'adresse pour raccourcir l'URL). Essaie le nom
 * complet, puis une version simplifiée (avant le premier " - ") si Nominatim
 * ne trouve rien pour le nom complet — un nom composé du type "Hôpital X -
 * CHU de Y" ne matche souvent aucune entrée Nominatim telle quelle.
 */
async function forwardGeocode(name: string): Promise<{ street: string | null; postalCode: string | null; city: string | null; country: string | null; note: string }> {
  const empty = { street: null, postalCode: null, city: null, country: null };
  const search = async (query: string) => {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&addressdetails=1&limit=1&email=support%40avectoi.care`,
      { headers: { "User-Agent": "AvecToi/1.0 (support@avectoi.care)", "Accept": "application/json", "Accept-Language": "fr" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  };
  try {
    let hit = await search(name);
    let usedQuery = name;
    if (!hit) {
      const simplified = name.split(" - ")[0].trim();
      if (simplified && simplified !== name) {
        hit = await search(simplified);
        usedQuery = simplified;
      }
    }
    if (!hit) return { ...empty, note: `Nominatim (recherche par nom) : aucun résultat pour "${name}".` };
    const a = hit.address ?? {};
    const street = ([a.house_number, a.road].filter(Boolean).join(" ") || null) as string | null;
    const postalCode = (a.postcode as string | undefined) ?? null;
    const city = (a.city ?? a.town ?? a.village ?? a.municipality ?? null) as string | null;
    const country = (a.country as string | undefined) ?? null;
    return { street, postalCode, city, country, note: `Nominatim (recherche par nom "${usedQuery}") OK : ${JSON.stringify(a)}` };
  } catch (e) {
    return { ...empty, note: `Nominatim (recherche par nom) a échoué : ${String(e)}` };
  }
}

export type ResolvedPlace = {
  name: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  /** Trace lisible de la résolution, pour affichage de debug côté admin. */
  debug: string;
};

/**
 * Résout nom + adresse depuis un lien Google Maps collé par l'admin.
 * - Nom + adresse : lus directement dans l'URL (segment /maps/place/<nom>,
 *   +<rue>,+<CP>+<ville>/), après avoir suivi la redirection pour un lien
 *   court (maps.app.goo.gl). Aucune clé API requise — pas d'appel à la
 *   Places API, juste une résolution d'URL.
 * - Repli : certains liens (pin déposé sans adresse formatée) n'ont que des
 *   coordonnées GPS et pas de texte d'adresse — dans ce cas seulement, on
 *   interroge Nominatim (géocodage inverse gratuit, sans clé) pour
 *   retrouver rue/CP/ville à partir des coordonnées.
 * Renvoie des champs à null quand rien n'a pu être résolu (lien non
 * reconnu, pas de connexion, etc.) — l'admin garde la main pour corriger.
 */
export async function resolvePlaceFromMapsUrl(url: string): Promise<ResolvedPlace> {
  const trace: string[] = [];
  const finish = (name: string | null, addr: { street: string | null; postalCode: string | null; city: string | null; country: string | null }): ResolvedPlace => ({
    name,
    ...addr,
    debug: trace.join("\n"),
  });
  const empty = { street: null, postalCode: null, city: null, country: null };

  const trimmed = url.trim();
  if (!trimmed) {
    trace.push("Lien vide.");
    return finish(null, empty);
  }

  let finalUrl = trimmed;
  if (extractPlaceSegments(trimmed).length === 0) {
    trace.push(`Lien court détecté, résolution de la redirection : ${trimmed}`);
    try {
      // GET, pas HEAD : la chaîne de redirection de maps.app.goo.gl passe par
      // un écran de consentement RGPD qui ne répond pas de façon fiable aux
      // requêtes HEAD (parfois 405, ou redirection non suivie) — et un
      // User-Agent de navigateur évite un éventuel blocage anti-bot silencieux
      // qui laisserait finalUrl = lien court, donc aucune adresse trouvée.
      const res = await fetch(trimmed, {
        method: "GET",
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36" },
      });
      finalUrl = res.url || trimmed;
      trace.push(`URL finale : ${finalUrl}`);
    } catch (e) {
      trace.push(`Échec de la résolution du lien : ${String(e)}`);
      return finish(null, empty);
    }
  } else {
    trace.push(`Lien direct (déjà une URL /maps/place/) : ${trimmed}`);
  }

  const decoded = decodeLayers(finalUrl);
  const segments = extractPlaceSegments(finalUrl).length ? extractPlaceSegments(finalUrl) : extractPlaceSegments(decoded);
  const name = segments[0] ?? null;
  trace.push(`Nom trouvé : ${name ?? "aucun"}`);

  const addrFromUrl = parseAddressFromSegments(segments);
  if (addrFromUrl.street || addrFromUrl.postalCode || addrFromUrl.city) {
    trace.push(`Adresse lue directement dans le lien → rue=${addrFromUrl.street ?? "—"} / CP=${addrFromUrl.postalCode ?? "—"} / ville=${addrFromUrl.city ?? "—"} / pays=${addrFromUrl.country ?? "—"}`);
    return finish(name, addrFromUrl);
  }

  const coords = extractCoords(finalUrl) ?? extractCoords(decoded);
  trace.push(coords ? `Pas d'adresse texte dans le lien, coordonnées trouvées : ${coords.lat}, ${coords.lon}` : "Pas d'adresse texte ni de coordonnées dans le lien.");

  if (coords) {
    const addr = await reverseGeocode(coords.lat, coords.lon);
    trace.push(`Nominatim (inverse) → rue=${addr.street ?? "—"} / CP=${addr.postalCode ?? "—"} / ville=${addr.city ?? "—"} / pays=${addr.country ?? "—"}`);
    if (addr.street || addr.postalCode || addr.city) return finish(name, addr);
  }

  // Dernier repli : ni adresse texte ni coordonnées exploitables dans le lien
  // (cas des URL basées uniquement sur un Place ID/CID, ex. "data=!4m2!3m1!1s0x...") —
  // on tente une recherche Nominatim directement sur le nom du lieu.
  if (!name) return finish(name, empty);
  const byName = await forwardGeocode(name);
  trace.push(byName.note);
  return finish(name, byName);
}
