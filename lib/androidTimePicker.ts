import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";

// Boutons Annuler / OK des popups horloge Android, en orange (cohérent avec C.orange).
export const ANDROID_TIME_PICKER_BUTTONS = {
  positiveButton: { label: "OK", textColor: "#f97316" },
  negativeButton: { label: "Annuler", textColor: "#f97316" },
} as const;

// Sur Android, le composant déclaratif <DateTimePicker> rouvre le dialogue natif
// à chaque re-render du parent (son onChange inline change d'identité à chaque
// render, ce qui redéclenche l'effet qui appelle showOrUpdatePicker → open()).
// Résultat : l'heure en cours de sélection est réinitialisée avant que l'utilisateur
// ait pu valider. L'API impérative recommandée par la lib évite ce problème.
export function openAndroidTimePicker(value: Date, onPick: (date: Date) => void) {
  DateTimePickerAndroid.open({
    value,
    mode: "time",
    is24Hour: true,
    display: "clock",
    ...ANDROID_TIME_PICKER_BUTTONS,
    onChange: (event, date) => {
      if (event.type === "set" && date) onPick(date);
    },
  });
}
