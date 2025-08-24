// app.config.ts
import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config, // pulls in values from app.json if it exists
  name: "my-new-app",
  slug: "my-new-app",
  // other dynamic or overridden values
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_PROJECT_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
});
