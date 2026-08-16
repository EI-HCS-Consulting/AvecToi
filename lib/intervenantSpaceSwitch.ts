import type { useRouter } from "expo-router";
import { saveVisitorSession } from "@/lib/visitorSession";

export interface LinkedIntervenantSpaceRow {
  id: string;
  space_id: string;
  prenom: string;
  nom: string;
  pin: string;
  patient_spaces: { invite_token: string } | null;
}

// Bascule la session locale + navigue vers le calendrier d'un autre espace
// patient auquel cet intervenant est rattaché (même téléphone) — partagé
// entre app/(visitor)/account.tsx ("Mes Patients") et
// components/PatientsList.tsx (onglet "Patients"), pour ne garder qu'une
// seule version de cette logique de pivot.
export async function switchToLinkedSpace(
  row: LinkedIntervenantSpaceRow,
  telephone: string,
  router: ReturnType<typeof useRouter>,
  // Jour à cibler une fois arrivé sur le calendrier du nouvel espace — voir
  // app/(visitor)/home/calendar.tsx (param focusIso) qui, en le recevant,
  // enchaîne directement vers home/slots.tsx sur ce jour. Utilisé par le
  // Planning global intervenant (app/(visitor)/soins.tsx) quand on tape un
  // jour pour un patient dont l'espace n'est pas déjà l'espace actif.
  focusIso?: string,
  // Paramètres additionnels à faire suivre jusqu'à home/slots.tsx une fois
  // focusIso consommé (voir home/calendar.tsx) — utilisé par le Planning
  // global intervenant pour marquer "returnTo=planning" + le patient réservé
  // (returnSpaceId), afin qu'une fois le soin réservé InterventionBookingFlow
  // ramène sur l'onglet Planning avec ce patient présélectionné plutôt que
  // sur le calendrier de l'espace.
  extraParams?: Record<string, string>,
): Promise<void> {
  if (!row.patient_spaces) return;
  await saveVisitorSession({
    token: row.patient_spaces.invite_token,
    spaceId: row.space_id,
    prenom: row.prenom,
    nom: row.nom,
    pin: row.pin,
    role: "intervenant",
    intervenantProfileId: row.id,
    telephone,
    motto: "",
    localPhotoUri: null,
  });
  router.replace({
    pathname: "/(visitor)/home/calendar",
    params: {
      spaceId: row.space_id,
      token: row.patient_spaces.invite_token,
      ...(focusIso ? { focusIso } : {}),
      ...(extraParams ?? {}),
    },
  } as any);
}
