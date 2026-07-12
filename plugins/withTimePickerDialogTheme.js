const {
  withAndroidColors,
  withAndroidColorsNight,
  withAndroidStyles,
  AndroidConfig,
} = require("@expo/config-plugins");

const { assignColorValue } = AndroidConfig.Colors;
const { assignStylesValue, getAppThemeGroup } = AndroidConfig.Styles;

const STYLE_NAME = "TimePickerDialogTheme";
const COLOR_NAMES = [
  "colorAccent",
  "colorControlNormal",
  "colorControlActivated",
  "textColorPrimary",
];

// Les options du plugin officiel @react-native-community/datetimepicker ne
// couvrent que le cadran (aiguille). Le mode "saisie clavier" (titre "Indiquer
// l'heure", champs HH:MM, icône clavier) est stylé par un thème Android natif
// distinct (android:timePickerDialogTheme) qu'aucune option publique n'expose.
// Ce plugin ajoute ce thème pour aligner ce mode sur le reste du sélecteur,
// sans toucher au thème global de l'app (donc pas d'effet de bord ailleurs).
function withTimePickerDialogTheme(config, { color }) {
  config = withAndroidColors(config, (config) => {
    for (const name of COLOR_NAMES) {
      config.modResults = assignColorValue(config.modResults, {
        name: `timePickerDialog_${name}`,
        value: color,
      });
    }
    return config;
  });

  config = withAndroidColorsNight(config, (config) => {
    for (const name of COLOR_NAMES) {
      config.modResults = assignColorValue(config.modResults, {
        name: `timePickerDialog_${name}`,
        value: color,
      });
    }
    return config;
  });

  config = withAndroidStyles(config, (config) => {
    let { modResults } = config;
    const parent = { name: STYLE_NAME, parent: "Theme.AppCompat.Light.Dialog" };

    modResults = assignStylesValue(modResults, {
      add: true,
      parent,
      name: "android:timePickerStyle",
      value: "@style/TimePickerTheme",
    });

    for (const name of COLOR_NAMES) {
      modResults = assignStylesValue(modResults, {
        add: true,
        parent,
        name: name.startsWith("textColor") ? `android:${name}` : name,
        value: `@color/timePickerDialog_${name}`,
      });
    }

    modResults = assignStylesValue(modResults, {
      add: true,
      parent: getAppThemeGroup(),
      name: "android:timePickerDialogTheme",
      value: `@style/${STYLE_NAME}`,
    });

    config.modResults = modResults;
    return config;
  });

  return config;
}

module.exports = withTimePickerDialogTheme;
