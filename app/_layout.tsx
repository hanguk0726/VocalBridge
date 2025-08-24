import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/useColorScheme";

import {
  ensureValidSession,
  initializeSession,
  storeTokens,
  supabase,
} from "@/utils/supabaseClient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect } from "react";
import { AppState, Linking } from "react-native";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    // supabase auto refresh 추가
    const subscription = AppState.addEventListener("change", (state) => {
      console.log("Adding supabase auto refresh; state:", state);
      if (state === "active") {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    /**
     * 로컬에 저장된 AuthToken 체크 및 initialize
     */
    AsyncStorage.getItem("access_token").then((accessToken) => {
      if (accessToken) {
        console.log("Access token found, initializing session");
        ensureValidSession();
        initializeSession();
      } else {
        console.log("No access token found, should redirect to login screen");
      }
    });
    return () => {
      subscription.remove();
    };
  }, []);

  /**
   *  Linking API로 전체 URL Listener 등록 & 로그인 전용 deep link 처리
   */
  useEffect(() => {
    const handleUrl = async () => {
      Linking.addEventListener("url", (e) => {
        console.log("URL:", e.url.slice(0, 50));
        if (
          e.url.includes("expo-development-client") ||
          !e.url.includes("com.nemo0726.mynewapp")
        )
          return;
        const raw = e.url.split("#")[1];
        const params = new URLSearchParams(raw);

        // key-value 객체로 변환
        const result: Record<string, string> = {};
        params.forEach((value, key) => {
          result[key] = value;
        });
        console.log("Deep link received");
        storeTokens(
          result.access_token,
          result.refresh_token,
          result.expires_at
        ).then(() => {
          initializeSession();
        });
      });
    };
    handleUrl();
    return () => {
      Linking.removeAllListeners("url");
    };
  }, []);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
