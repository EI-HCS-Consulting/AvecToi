import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { normalizePhone } from "./phone";
import { getVisitorSession } from "./visitorSession";
import type { Reservation } from "./types";

export interface OtherSpaceIntervention extends Reservation {
  patientName: string;
}

// Soins "Intervention" de CET intervenant (même téléphone, cf.
// book_intervention/INTERVENTION_OVERLAP_OTHER_SPACE) dans TOUS ses AUTRES
// espaces patients — même requête que app/(visitor)/soins.tsx (onglet
// Planning), réutilisée ici côté Créneaux (home/slots.tsx) pour :
// 1. prévenir immédiatement d'un chevauchement avant même d'ouvrir le popup
//    de réservation (InterventionBookingFlow.openBooking) ;
// 2. teinter en violet les créneaux déjà occupés ailleurs (VisitorSlotsList).
// Pas d'abonnement realtime (comme soins.tsx) : un simple refresh au montage/
// changement de fiche suffit, ce n'est qu'une aide visuelle — la garde
// déterminante reste côté serveur (RPC book_intervention).
export function useOtherSpaceInterventions(
  intervenantProfileId: string | null,
  currentSpaceId: string | null,
): { otherSpaceInterventions: OtherSpaceIntervention[]; refresh: () => Promise<void> } {
  const [list, setList] = useState<OtherSpaceIntervention[]>([]);

  const load = useCallback(async () => {
    if (!intervenantProfileId) {
      setList([]);
      return;
    }
    const session = await getVisitorSession();
    let tel = session?.telephone;
    if (!tel) {
      const { data } = await supabase
        .from("intervenant_profiles")
        .select("telephone")
        .eq("id", intervenantProfileId)
        .maybeSingle();
      tel = data?.telephone ?? "";
    }
    const normalized = normalizePhone(tel ?? "");
    if (normalized.length < 6) {
      setList([]);
      return;
    }

    const { data: profileData } = await supabase
      .from("intervenant_profiles")
      .select("id, space_id, patient_spaces(patient_firstname, patient_lastname)")
      .eq("telephone", normalized);
    const rows = (profileData as any as {
      id: string;
      space_id: string;
      patient_spaces: { patient_firstname: string; patient_lastname: string } | null;
    }[]) ?? [];
    const otherRows = rows.filter((r) => r.space_id !== currentSpaceId);
    const ids = otherRows.map((r) => r.id);
    if (ids.length === 0) {
      setList([]);
      return;
    }

    const nameBySpaceId: Record<string, string> = {};
    otherRows.forEach((r) => {
      if (r.patient_spaces) {
        nameBySpaceId[r.space_id] = `${r.patient_spaces.patient_firstname} ${r.patient_spaces.patient_lastname}`;
      }
    });

    const { data: resaData } = await supabase
      .from("reservations")
      .select("*")
      .in("intervenant_profile_id", ids)
      .eq("type", "Intervention");
    setList((resaData || []).map((r) => ({ ...r, patientName: nameBySpaceId[r.space_id] ?? "" })));
  }, [intervenantProfileId, currentSpaceId]);

  useEffect(() => {
    load();
  }, [load]);

  return { otherSpaceInterventions: list, refresh: load };
}
