import { Linking } from "react-native";
import ConfirmModal from "@/components/ConfirmModal";
import type { Theme } from "@/lib/themes";

interface Props {
  visible: boolean;
  message: string;
  onClose: () => void;
  C: Theme;
}

// Popup Premium générique — remplace les anciens Alert.alert("Fonctionnalité
// Premium", ...) par la modale de confirmation de l'app (ConfirmModal), pour
// un rendu cohérent avec le reste de l'interface. "En savoir plus" renvoie
// vers avectoi.care. Voir lib/freemiumCap.ts pour les fonctions canX() qui
// décident quand l'afficher.
export default function PremiumGateModal({ visible, message, onClose, C }: Props) {
  return (
    <ConfirmModal
      visible={visible}
      icon="✨"
      title="Fonctionnalité Premium"
      message={message}
      cancelLabel="Fermer"
      confirmLabel="En savoir plus"
      destructive={false}
      onCancel={onClose}
      onConfirm={() => {
        onClose();
        Linking.openURL("https://avectoi.care");
      }}
      C={C}
    />
  );
}
