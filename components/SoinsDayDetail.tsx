import { useState } from "react";
import type { Theme } from "@/lib/themes";
import type { Reservation, SlotConfig } from "@/lib/types";
import type { DayStatus } from "@/lib/slotUtils";
import DaySlotGrid from "@/components/DaySlotGrid";
import SlotOccupantsModal, { type SelectedSlot } from "@/components/SlotOccupantsModal";

// Détail lecture seule des soins du jour sélectionné, vue Hebdo + Soins du
// calendrier principal (visiteur/admin) — même rendu que le planning des
// intervenants (WeeklyPlanningGrid) mais sans sa propre navigation de
// semaine, qui vit déjà dans WeekStrip juste au-dessus. Ni le visiteur ni
// l'admin ne réservent de soin depuis cette vue (c'est à l'intervenant de le
// faire pour lui-même) — seule la consultation (qui/quoi) est proposée ici.
interface Props {
  C: Theme;
  iso: string;
  day: Date;
  config: SlotConfig;
  daySlots: string[];
  reservations: Reservation[];
  status: DayStatus;
}

export default function SoinsDayDetail({ C, iso, day, config, daySlots, reservations, status }: Props) {
  const [selected, setSelected] = useState<SelectedSlot | null>(null);

  return (
    <>
      <DaySlotGrid
        C={C}
        iso={iso}
        day={day}
        config={config}
        daySlots={daySlots}
        reservations={reservations}
        status={status}
        showHeader={false}
        onSlotPress={(slotIso, slot, occupants) => setSelected({ iso: slotIso, slot, occupants })}
      />
      <SlotOccupantsModal C={C} selected={selected} onClose={() => setSelected(null)} readOnly />
    </>
  );
}
