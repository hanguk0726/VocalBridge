import {
  TranslationUiSection,
  TranslationUiState,
} from "@/store/translationStore";
import WaveBars from "@/utils/waveBars";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

const languageMap: Record<string, string> = {
  ko: "한국어",
  en: "영어",
  ja: "일본어",
};

interface SectionProps {
  webrtcId: string | null;
  section: TranslationUiSection;
  text: string;
  language: string;
  connected: boolean;
  muted: boolean;
  uiState: TranslationUiState;
  showWave: boolean;
  inputSection: TranslationUiSection;
  inputEnvelope: number[];
  outputEnvelope: number[];
  svgWidth: number;
  svgHeight: number;
  waveBarColor: (lang: string) => string;
  navigateToLanguageSelect: (section: TranslationUiSection) => void;
  onClickMic: (webrtcId: string | null, section: TranslationUiSection) => void;
}

const TranslationSection: React.FC<SectionProps> = ({
  webrtcId,
  section,
  text,
  language,
  connected,
  muted,
  uiState,
  showWave,
  inputSection,
  inputEnvelope,
  outputEnvelope,
  svgWidth,
  svgHeight,
  waveBarColor,
  navigateToLanguageSelect,
  onClickMic,
}) => {
  return (
    <View
      style={[
        styles.section,
        section === TranslationUiSection.BOTTOM && styles.bottomSection,
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.textInput}>{text}</Text>

        {showWave && (
          <WaveBars
            envelope={inputSection === section ? inputEnvelope : outputEnvelope}
            width={svgWidth}
            height={svgHeight}
            bars={48}
            barGap={3}
            barColor={waveBarColor(language)}
          />
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <View
          style={styles.languageSelector}
          onTouchEnd={() => navigateToLanguageSelect(section)}
        >
          <Text style={styles.languageText}>{languageMap[language]}</Text>
          <Ionicons name="chevron-down" size={16} color="#000" />
        </View>

        <View
          style={[
            styles.micButton,
            {
              opacity: connected ? 1 : 0.5,
            },
          ]}
          onTouchEnd={() => onClickMic(webrtcId, section)}
        >
          <Ionicons
            name={muted ? "mic" : "volume-high"}
            size={24}
            color="#fff"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    flex: 1,
    padding: 20,
    justifyContent: "space-between",
    alignItems: "center",
  },
  bottomSection: {
    backgroundColor: "#e0e0e0",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  textInput: {
    width: "100%",
    fontSize: 24,
    textAlign: "center",
    paddingHorizontal: 10,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    width: "100%",
  },
  languageSelector: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  languageText: {
    fontSize: 16,
    marginRight: 5,
    color: "#007BFF",
  },
  micButton: {
    backgroundColor: "#007BFF",
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
});

export default TranslationSection;
