import { Session } from "@supabase/supabase-js";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { clearTokens, supabase } from "../utils/supabaseClient";

// Expo-auth-session 사용 지양, https://github.com/expo/expo/issues/23781

export default function KakaoLoginScreen() {
  const [user, setUser] = useState<any>(null);
  const [userSession, setUserSession] = useState<Session | null>(null);

  const redirectedRef = useRef(false); // 한 번만 리다이렉트

  useEffect(() => {
    // userSession이 준비되지 않았으면 무시
    if (userSession === undefined) return;

    // 로그인 되어 있고, 아직 리다이렉트 안 했으면
    if (userSession && !redirectedRef.current) {
      redirectedRef.current = true;
      router.replace("/translate");
    }
  }, [userSession, router]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Auth state changed:", session?.user?.id);
      setUserSession(session);
      setUser(session?.user ?? null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth state changed:", event, session?.user?.id);
        setUserSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => authListener.subscription.unsubscribe();
  }, []);

  const signInWithKakao = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
      });

      if (error) throw error;
      console.log("Kakao login data:", data);

      //open url in browser
      if (data.url) {
        await Linking.openURL(data.url);
      }
    } catch (e: any) {
      console.error("Error in signInWithKakao:", e);
      Alert.alert("로그인 실패", e.message || "로그인 중 오류가 발생했습니다.");
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      clearTokens();
      Alert.alert("로그아웃 성공");
    } catch (e: any) {
      console.error("Logout error:", e);
      Alert.alert("로그아웃 실패", e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>VocalBridge</Text>
      <Text style={styles.subtitle}>실시간 통역 앱</Text>
      <View style={styles.contentContainer}>
        {user ? (
          <>
            <Text>로그인 되었습니다. 리다이렉트 중...</Text>
          </>
        ) : (
          <TouchableOpacity style={styles.button} onPress={signInWithKakao}>
            <Text style={styles.buttonText}>카카오톡으로 로그인</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 30,
  },
  contentContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  subtitle: {
    fontSize: 18,
    color: "#666",
    marginBottom: 100, // 부제목과 버튼 사이 간격
  },
  button: {
    backgroundColor: "#FEE500",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonText: { color: "#3C1E1E", fontWeight: "bold", fontSize: 16 },
  welcome: { fontSize: 18, fontWeight: "500" },
});
