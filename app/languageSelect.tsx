// app/languageSelect.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLanguageStore } from "../store/languageStore";

/**
 * 통역 할 Language Select Screen
 */
const languages = [
  { code: "ko", name: "한국어" },
  { code: "en", name: "영어" },
  { code: "ja", name: "일본어" },
];

export default function LanguageSelectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { section, excludedLanguage } = params;
  const setLanguage = useLanguageStore((state) => state.setLanguage);

  const handleLanguageSelect = async (languageCode: string) => {
    setLanguage(section as "top" | "bottom", languageCode);
    router.back(); // 선택 후 그냥 뒤로가기
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Select Language</Text>
      {languages.map((language) => (
        <TouchableOpacity
          key={language.code}
          style={[
            styles.languageButton,
            excludedLanguage === language.code && styles.disabledButton,
          ]}
          onPress={() => handleLanguageSelect(language.code)}
          disabled={excludedLanguage === language.code}
        >
          <Text style={styles.languageButtonText}>{language.name}</Text>
        </TouchableOpacity>
      ))}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 24, marginBottom: 20 },
  languageButton: {
    padding: 15,
    marginVertical: 10,
    backgroundColor: "transparent",
    borderRadius: 10,
    width: "80%",
    alignItems: "center",
  },
  disabledButton: { opacity: 0.5 },
  languageButtonText: { fontSize: 18 },
});
