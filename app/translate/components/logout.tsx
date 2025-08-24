import React from "react";
import { View, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { useRouter } from "expo-router"; // 또는 react-navigation 등 사용중인 라우터
import { clearTokens, supabase } from "@/utils/supabaseClient";
import { Ionicons } from "@expo/vector-icons";

const LogoutButton: React.FC = () => {
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      "로그아웃",
      "정말로 로그아웃 하시겠습니까?",
      [
        {
          text: "취소",
          onPress: () => console.log("로그아웃 취소"),
          style: "cancel",
        },
        {
          text: "확인",
          onPress: async () => {
            try {
              const { error } = await supabase.auth.signOut();
              if (error) throw error;
              clearTokens();
              Alert.alert("로그아웃", "로그아웃이 완료되었습니다.");
              router.replace("/login");
            } catch (e: any) {
              console.error("Logout error:", e);
              Alert.alert("로그아웃 실패", e.message);
            }
          },
          style: "destructive",
        },
      ],
      { cancelable: false }
    );
  };

  return (
    <View style={styles.logoutButton}>
      <TouchableOpacity onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={32} color="#00000088" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  logoutButton: {
    alignSelf: "flex-end", // 오른쪽 정렬
    marginTop: 16,
    marginRight: 16,
  },
});

export default LogoutButton;
