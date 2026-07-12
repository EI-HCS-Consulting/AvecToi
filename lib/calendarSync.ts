import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ExpoCalendar from "expo-calendar";
import { activeAddressParts, joinAddress } from "./address";
import type { SlotConfig, PatientSpace } from "./types";

// Keeps track of which native calendar event (expo-calendar) belongs to
// which reservation, so it can be updated/deleted later if the visitor
// reschedules or cancels. Same on-device storage pattern as
// lib/notifications.ts's notif_${reservationId} mapping — the event only
// exists locally on this device's calendar app, no server sync needed.

export async function linkCalendarEvent(reservationId: string, eventId: string): Promise<void> {
  if (!reservationId || !eventId) return;
  await AsyncStorage.setItem(`calendar_event_${reservationId}`, eventId);
}

export async function getLinkedCalendarEvent(reservationId: string): Promise<string | null> {
  if (!reservationId) return null;
  return AsyncStorage.getItem(`calendar_event_${reservationId}`);
}

export async function unlinkCalendarEvent(reservationId: string): Promise<void> {
  if (!reservationId) return;
  await AsyncStorage.removeItem(`calendar_event_${reservationId}`);
}

// Partagé entre le flux visiteur (components/BookingFlow.tsx) et le flux
// admin (components/AdminAddReservation.tsx) — même logique d'ajout au
// calendrier natif des deux côtés.

export function eventWindow(iso: string, slot: string, type: "Visite" | "Nuit", config: SlotConfig) {
  const startDate = new Date(`${iso}T${slot}:00`);
  let endDate: Date;
  if (type === "Nuit") {
    endDate = new Date(`${iso}T${slot}:00`);
    endDate.setDate(endDate.getDate() + 1);
    endDate.setHours(config.night_end_hour ?? 8, config.night_end_minute ?? 0, 0, 0);
  } else {
    endDate = new Date(startDate.getTime() + config.slot_duration_minutes * 60 * 1000);
  }
  return { startDate, endDate };
}

export async function findTargetCalendar(preferredEmail: string | null) {
  const calendars = await ExpoCalendar.getCalendarsAsync(ExpoCalendar.EntityTypes.EVENT);
  const modifiable = calendars.filter((c) => c.allowsModifications);
  // Priorité au compte Google réel (source.type "com.google" sur Android) —
  // "non local account" seul ne suffit pas : ça peut aussi être un compte
  // Samsung/Outlook/CalDAV synchronisé, qui n'apparaîtra jamais dans
  // l'app Google Calendar de l'utilisateur.
  const google = modifiable.filter((c) => c.source?.type === "com.google");
  const email = preferredEmail?.trim().toLowerCase();
  return (
    (email && google.find((c) => c.ownerAccount?.toLowerCase() === email)) ??
    google.find((c) => c.isPrimary) ??
    google[0] ??
    (email && modifiable.find((c) => c.ownerAccount?.toLowerCase() === email)) ??
    modifiable.find((c) => c.source && !c.source.isLocalAccount) ??
    modifiable.find((c) => c.isPrimary) ??
    modifiable[0] ??
    null
  );
}

export async function addToNativeCalendar(
  space: PatientSpace,
  config: SlotConfig,
  iso: string,
  slot: string,
  type: "Visite" | "Nuit",
  preferredEmail: string | null,
  companions?: string[],
): Promise<{ ok: true; eventId: string } | { ok: false; reason: string }> {
  try {
    const { status } = await ExpoCalendar.requestCalendarPermissionsAsync();
    if (status !== "granted") return { ok: false, reason: "Permission calendrier refusée." };

    const target = await findTargetCalendar(preferredEmail);
    if (!target) return { ok: false, reason: "Aucun calendrier modifiable trouvé sur l'appareil." };

    const { startDate, endDate } = eventWindow(iso, slot, type, config);

    const baseTitle = `${type === "Nuit" ? "Nuitée" : "Visite"} ${space.patient_firstname} ${space.patient_lastname}`;
    const companionNames = (companions ?? []).map((c) => c.trim()).filter(Boolean);
    const title = companionNames.length > 0 ? `${baseTitle} - Avec ${companionNames.join(", ")}` : baseTitle;

    const eventId = await ExpoCalendar.createEventAsync(target.id, {
      title,
      startDate,
      endDate,
      location: space.home_care_mode
        ? "Domicile"
        : `${space.hospital_name}${space.hospital_room ? " — " + space.hospital_room : ""}`,
      notes: joinAddress(activeAddressParts(space)) || undefined,
      alarms: [{ relativeOffset: -60 }],
    });

    return { ok: true, eventId };
  } catch (e: any) {
    return { ok: false, reason: e?.message ?? "Erreur inconnue." };
  }
}

// Version générique pour un événement ponctuel hors modèle créneau/nuitée
// (ex. un transport Entraide : titre/horaire/lieu libres, pas de SlotConfig).
export async function addGenericEventToNativeCalendar(
  title: string,
  startDate: Date,
  endDate: Date,
  location: string,
  notes: string | undefined,
  preferredEmail: string | null,
): Promise<{ ok: true; eventId: string } | { ok: false; reason: string }> {
  try {
    const { status } = await ExpoCalendar.requestCalendarPermissionsAsync();
    if (status !== "granted") return { ok: false, reason: "Permission calendrier refusée." };

    const target = await findTargetCalendar(preferredEmail);
    if (!target) return { ok: false, reason: "Aucun calendrier modifiable trouvé sur l'appareil." };

    const eventId = await ExpoCalendar.createEventAsync(target.id, {
      title,
      startDate,
      endDate,
      location,
      notes,
      alarms: [{ relativeOffset: -60 }],
    });

    return { ok: true, eventId };
  } catch (e: any) {
    return { ok: false, reason: e?.message ?? "Erreur inconnue." };
  }
}

export async function updateLinkedCalendarEvent(
  reservationId: string, iso: string, slot: string, type: "Visite" | "Nuit", config: SlotConfig,
): Promise<void> {
  try {
    const eventId = await getLinkedCalendarEvent(reservationId);
    if (!eventId) return;
    const { status } = await ExpoCalendar.requestCalendarPermissionsAsync();
    if (status !== "granted") return;
    const { startDate, endDate } = eventWindow(iso, slot, type, config);
    await ExpoCalendar.updateEventAsync(eventId, { startDate, endDate });
  } catch {
    // Non-fatal — the reservation itself is already saved either way.
  }
}

export async function deleteLinkedCalendarEvent(reservationId: string): Promise<void> {
  try {
    const eventId = await getLinkedCalendarEvent(reservationId);
    if (!eventId) return;
    const { status } = await ExpoCalendar.requestCalendarPermissionsAsync();
    if (status === "granted") await ExpoCalendar.deleteEventAsync(eventId);
    await unlinkCalendarEvent(reservationId);
  } catch {
    // Non-fatal
  }
}
