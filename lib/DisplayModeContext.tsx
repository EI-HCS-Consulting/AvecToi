import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { themes, ThemeKey, Theme } from "@/lib/themes";

const STORAGE_KEY = "avectoi_display_mode";

interface DisplayModeContextValue {
  mode: ThemeKey;
  theme: Theme;
  setMode: (mode: ThemeKey) => void;
}

// Le mode d'affichage (Sombre/Clair) est une préférence locale par utilisateur —
// stockée sur l'appareil, jamais dans Supabase — contrairement à l'ancien
// thème par espace (patient_spaces.theme), qui était partagé par tous les
// visiteurs d'un même espace.
const DisplayModeContext = createContext<DisplayModeContextValue>({
  mode: "dark",
  theme: themes.dark,
  setMode: () => {},
});

export function DisplayModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeKey>("dark");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === "dark" || val === "light") setModeState(val);
    });
  }, []);

  function setMode(next: ThemeKey) {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <DisplayModeContext.Provider value={{ mode, theme: themes[mode], setMode }}>
      {children}
    </DisplayModeContext.Provider>
  );
}

export function useDisplayMode() {
  return useContext(DisplayModeContext);
}
