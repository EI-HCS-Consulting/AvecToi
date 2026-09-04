import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Sans ça, le SDK utilise le flux implicite : les jetons du lien de
    // reset arrivent dans le fragment (avectoi://auth/reset-password
    // #access_token=...), qu'Expo Router jette avant même de router vers
    // l'écran (il ne matche que le chemin) — voir app/auth/reset-password.tsx.
    // En PKCE, ils arrivent en query (?code=...), qu'Expo Router capture
    // bien via useLocalSearchParams().
    flowType: "pkce",
  },
});
