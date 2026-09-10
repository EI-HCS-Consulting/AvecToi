import { useState, useEffect } from "react";
import { View } from "react-native";
import { useVisitorSpace } from "@/lib/VisitorContext";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { getVisitorSession } from "@/lib/visitorSession";
import SpaceHeader from "@/components/SpaceHeader";
import MyWeekScreen from "@/components/MyWeekScreen";

// Enveloppe fine autour de MyWeekScreen (commun admin/visiteur), même
// principe que home/calendar.tsx : identité chargée en async depuis la
// session locale (PIN/prénom/nom).
export default function VisitorMaSemaineScreen() {
  const { space, reservations, token } = useVisitorSpace();
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

  if (!space) return null;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SpaceHeader space={space} active="ma-semaine" basePath="/(visitor)/home" C={C} />
      <MyWeekScreen
        space={space}
        reservations={reservations}
        basePath="/(visitor)/home"
        myPin={myPin}
        myPrenom={myPrenom}
        myNom={myNom}
        isAdmin={false}
        C={C}
      />
    </View>
  );
}
