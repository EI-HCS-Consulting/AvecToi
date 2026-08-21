import { useState, useEffect } from "react";
import { useVisitorSpace } from "@/lib/VisitorContext";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { getVisitorSession } from "@/lib/visitorSession";
import HomeCalendarScreen from "@/components/HomeCalendarScreen";

// Enveloppe fine autour du calendrier commun (HomeCalendarScreen) — alimente
// depuis VisitorContext et la session locale (PIN/prénom/nom, chargés en
// async ici, jamais côté (admin)/home/calendar.tsx qui les tire directement
// de PatientSpace.admin_*). Le rôle Intervenant n'étant plus accessible en V1
// (lib/featureFlags.ts), la session n'a plus qu'un rôle "visiteur" possible.
export default function VisitorCalendarScreen() {
  const {
    space, slotConfig, slots, reservations, selectedDay, setSelectedDay, setPendingBookingSlot,
    token, refreshReservations, getConfigForDate, getSlotsForDate,
  } = useVisitorSpace();
  const { theme: C } = useDisplayMode();
  const [myPin, setMyPin] = useState<string | null>(null);
  const [myPrenom, setMyPrenom] = useState<string | null>(null);
  const [myNom, setMyNom] = useState<string | null>(null);

  useEffect(() => {
    getVisitorSession().then((s) => {
      setMyPin(s?.pin ?? null);
      setMyPrenom(s?.prenom ?? null);
      setMyNom(s?.nom ?? null);
    });
  }, [token]);

  if (!space || !slotConfig) return null;

  return (
    <HomeCalendarScreen
      space={space}
      slotConfig={slotConfig}
      slots={slots}
      reservations={reservations}
      selectedDay={selectedDay}
      setSelectedDay={setSelectedDay}
      setPendingBookingSlot={setPendingBookingSlot}
      refreshReservations={refreshReservations}
      getConfigForDate={getConfigForDate}
      getSlotsForDate={getSlotsForDate}
      basePath="/(visitor)/home"
      myPin={myPin}
      myPrenom={myPrenom}
      myNom={myNom}
      token={token}
      C={C}
    />
  );
}
