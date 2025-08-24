// handle supabse auth callback
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function KakaoLoginScreen() {
  return (
    <View style={styles.container}>
      <Text>리다이렉트 중...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
});
