import { Alert } from "react-native";
import { supabase } from "@/lib/supabase";
import type { Task } from "@/lib/types";

// Se désengager d'un besoin pris en charge (imprévu, changement d'avis) —
// utilisé par le clic prolongé sur "Mon compte / Entraide" (visiteur ET
// admin, l'admin étant aussi un visiteur qui peut prendre en charge des
// besoins). Le bouton "↩️ Me désengager" dans "Modifier le besoin"
// (Entraide.tsx) passe par performUnclaim, une variante propre à ce fichier
// qui gère en plus le nettoyage de la photo stockée — non dupliquée ici.
export async function disengageTask(t: Task): Promise<void> {
  const splitLegs = t.transport_round_trip && !!t.transport_return_claimed_by_prenom;
  await supabase.from("tasks").update({
    status: "ouvert",
    claimed_by_prenom: null,
    claimed_by_nom: null,
    claimed_by_pin: null,
    claimed_photo: null,
    claimed_text: null,
    ...(splitLegs
      ? { transport_confirmed_out_time: null }
      : t.category === "transport"
      ? { transport_confirmed_date: null, transport_confirmed_out_time: null, transport_confirmed_return_time: null }
      : {}),
  }).eq("id", t.id);
  if (t.checklist_batch_id && t.claimed_by_pin) {
    await supabase.from("personal_checklist_items").delete()
      .eq("task_id", t.id)
      .eq("owner_pin", t.claimed_by_pin)
      .eq("owner_prenom", t.claimed_by_prenom ?? "")
      .eq("owner_nom", t.claimed_by_nom ?? "");
  }
}

export function confirmDisengageTask(t: Task, onDone: () => void) {
  Alert.alert("Te désengager de ce besoin ?", "Il sera rouvert et visible par tous.", [
    { text: "Annuler", style: "cancel" },
    {
      text: "Me désengager",
      style: "destructive",
      onPress: async () => {
        await disengageTask(t);
        onDone();
      },
    },
  ]);
}
