import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
export default function Loading() {
  return (
    <View style={styles.overlay}>
      <ActivityIndicator size="large" color="#fff" />
      <Text style={styles.overlayText}>서버에 연결 중...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject, // 화면 전체 덮기
    backgroundColor: "rgba(0,0,0,0.4)", // 반투명
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  overlayText: {
    marginTop: 10,
    color: "#fff",
    fontSize: 16,
  },
});
