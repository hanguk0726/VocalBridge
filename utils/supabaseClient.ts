// supabaseClient.ts
import Constants from "expo-constants";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, processLock, Session } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl!;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
});

export const initializeSession = async (callback?: () => void) => {
  const accessToken = await AsyncStorage.getItem("access_token");
  const refreshToken = await AsyncStorage.getItem("refresh_token");
  if (accessToken && refreshToken) {
    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    console.log("Session initialized");
    callback && callback();
  }
};

export const storeTokens = async (
  accessToken: string,
  refreshToken: string,
  expiresAt: string
) => {
  try {
    await AsyncStorage.setItem("access_token", accessToken);
    await AsyncStorage.setItem("refresh_token", refreshToken);
    await AsyncStorage.setItem("expires_at", expiresAt);
    console.log("Tokens stored successfully");
  } catch (error) {
    console.error("Error storing tokens:", error);
  }
};

// 토큰 삭제 (로그아웃 시)
export const clearTokens = async () => {
  await AsyncStorage.multiRemove([
    "access_token",
    "refresh_token",
    "expires_at",
  ]);
};

// 토큰 만료 검사 및 리프레시
export const ensureValidSession = async (): Promise<Session | null> => {
  console.log("ensureValidSession");
  const expiresAt = await AsyncStorage.getItem("expires_at");
  const refreshToken = await AsyncStorage.getItem("refresh_token");

  if (!expiresAt || !refreshToken) return null;

  console.log("Expires at:", expiresAt);

  const expiresAtNum = parseInt(expiresAt, 10);
  const now = Math.floor(Date.now() / 1000);

  // 토큰 만료 임박 (30초 전이면 리프레시 시도)
  if (expiresAtNum - now < 30) {
    console.log("Access token expired or near expiry, refreshing...");

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      console.error("Token refresh failed:", error.message);
      await clearTokens();
      return null;
    }

    if (data.session) {
      await storeTokens(
        data.session.access_token,
        data.session.refresh_token!,
        String(data.session.expires_at)
      );
      return data.session;
    }
  }

  // 아직 유효
  return (await supabase.auth.getSession()).data.session;
};
