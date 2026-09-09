import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useVisitorSpace } from "@/lib/VisitorContext";
import { useDisplayMode } from "@/lib/DisplayModeContext";
import { getVisitorSession } from "@/lib/visitorSession";
import { AdminSpaceProvider } from "@/lib/SpaceContext";
import CoAdminSettingsScreen from "@/app/(admin)/settings";

// Onglet caché (voir Tabs.Screen "settings" dans (visitor)/_layout.tsx),
// accessible uniquement via le bouton "⚙️ Paramètres Co-Administrateur" de
// MyRelaisCommitments — même mécanisme que l'onglet "settings" caché de
// (admin)/_layout.tsx pour l'admin réel : un push vers un Tabs.Screen déjà
// monté du navigateur courant, jamais un <Modal> ni une navigation
// cross-groupe. Ça règle à la fois l'ouverture (plus de risque de course au
// montage d'un <Tabs> pas encore prêt — l'ancien composant-overlay
// CoAdminSettingsOverlay.tsx a été supprimé) et la fermeture (taper un
// autre onglet de la vraie barre visiteur suffit, exactement comme pour
// l'admin — plus besoin d'un bouton "Fermer" dédié).
export default function VisitorCoAdminSettingsScreen() {
  const { space } = useVisitorSpace();
  const { theme: C } = useDisplayMode();
  const [identity, setIdentity] = useState<{ prenom: string; nom: string; pin: string } | null>(null);

  useEffect(() => {
    getVisitorSession().then((s) => {
      if (s?.prenom?.trim() && s?.nom?.trim() && s?.pin) {
        setIdentity({ prenom: s.prenom, nom: s.nom, pin: s.pin });
      }
    });
  }, []);

  if (!space || !identity) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  return (
    <AdminSpaceProvider spaceId={space.id} coAdminIdentity={identity}>
      <CoAdminSettingsScreen />
    </AdminSpaceProvider>
  );
}
