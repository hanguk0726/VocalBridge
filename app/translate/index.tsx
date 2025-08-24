import { useAudioStore } from "@/store/audioStore";
import {
  TranslationUiSection,
  TranslationUiState,
  useTranslationStore,
} from "@/store/translationStore";
import { waveBarColor } from "@/utils/waveBars";
import { WebRTCTranslation } from "@/utils/webRTC";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  NativeEventEmitter,
  NativeModules,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLanguageStore } from "../../store/languageStore";
import ConnectButton from "./components/connect";
import Loading from "./components/loading";
import LogoutButton from "./components/logout";
import TranslationSection from "./components/translationSection";
/**
 *  TranslateScreen
 *
 *  RTC 객체 생성
 *  네이티브 모듈 호출 및 등록 (음성 파동 애니메이션 data 수신)
 *  RTC 연결
 *  마이크 및 UiState 핸들링
 */
export default function TranslateScreen() {
  const apiUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  const router = useRouter();

  const { RtcObserver } = NativeModules;
  const emitter = new NativeEventEmitter(RtcObserver);

  const [rtc] = useState<WebRTCTranslation>(new WebRTCTranslation());
  const [webrtcId, setWebrtcId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [inputEnvelope, setInputEnvelope] = useState<number[]>([]);
  const [outputEnvelope, setOutputEnvelope] = useState<number[]>([]);

  const {
    uiState,
    topText,
    bottomText,
    inputSection,
    setUiState,
    setInputSection,
    setTopText,
    setBottomText,
  } = useTranslationStore();
  const { width: windowWidth } = useWindowDimensions();
  const { topLanguage, bottomLanguage } = useLanguageStore();
  const { muted } = useAudioStore();

  const svgWidth = Math.min(windowWidth - 40, 800);
  const svgHeight = 120;

  const uiStateRef = useRef(uiState);
  const mutedRef = useRef(muted);
  const audioEndTimerRef = useRef<number | null>(null);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    uiStateRef.current = uiState;
    console.log("uiState 변경 감지 및 ref 업데이트:", uiState);
  }, [uiState]);

  const showTopWave = useMemo(() => {
    return (
      (inputSection === TranslationUiSection.TOP &&
        uiState === TranslationUiState.SPEAKING) ||
      (inputSection === TranslationUiSection.BOTTOM &&
        uiState === TranslationUiState.RESPONDING)
    );
  }, [inputSection, uiState]);

  const showBottomWave = useMemo(() => {
    return (
      (inputSection === TranslationUiSection.BOTTOM &&
        uiState === TranslationUiState.SPEAKING) ||
      (inputSection === TranslationUiSection.TOP &&
        uiState === TranslationUiState.RESPONDING)
    );
  }, [inputSection, uiState]);

  /**
   * 기기 출력 오디오가 일정 시간동안 0이면 Ui 상태를 Idle로 변경합니다.
   */
  const handleOutputAudioEnvelope = (noAudioOutput: boolean) => {
    if (uiStateRef.current !== TranslationUiState.RESPONDING) {
      return;
    }
    if (noAudioOutput) {
      // 2. 오디오 신호가 0이 됐을 때, 타이머가 없으면 새로운 타이머를 시작합니다.
      if (!audioEndTimerRef.current) {
        audioEndTimerRef.current = setTimeout(() => {
          setUiState(TranslationUiState.IDLE);
          audioEndTimerRef.current = null; // 타이머 종료 후 초기화
        }, 1500);
      }
    } else {
      // 3. 오디오 신호가 다시 들어오면, 진행 중인 타이머를 취소합니다.
      if (audioEndTimerRef.current) {
        clearTimeout(audioEndTimerRef.current);
        audioEndTimerRef.current = null; // 타이머 취소 후 초기화
      }
    }
  };

  useEffect(() => {
    const sub = emitter.addListener(
      "RtcInputEnvelope",
      ({ envelope: env, sr, ch }) => {
        if (!env || mutedRef.current) {
          setInputEnvelope([]);
          return;
        }
        const arr = Array.isArray(env) ? env : env.toArray ? env.toArray() : [];
        setInputEnvelope(arr as number[]);
      }
    );

    return () => sub.remove();
  }, []);

  useEffect(() => {
    RtcObserver.setupOutputVisualizer();
    const sub = emitter.addListener("RtcOutputEnvelope", (data) => {
      setOutputEnvelope(data.envelope);
      const epsilon = 1e-5; // 0으로 간주할 최대 오차
      const allZero = data.envelope.every((n: number) => Math.abs(n) < epsilon);

      handleOutputAudioEnvelope(allZero);
    });

    return () => {
      sub.remove();
      RtcObserver.removeListeners(0);
    };
  }, []);

  const resetServer = async () => {
    console.log("resetServer");
    const token = await AsyncStorage.getItem("access_token");
    fetch(`${apiUrl}/dev/reset`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  };

  const connect = async () => {
    if (!connected && !isConnecting) {
      await resetServer();
      setWebrtcId(null);
    }
    setIsConnecting(true);
    const ok = await rtc.start();
    setWebrtcId(rtc.getWebrtcId());
    setConnected(ok);
    setIsConnecting(false);
  };

  useEffect(() => {
    connect();
    return () => {
      setWebrtcId(null);
      rtc.stop();
    };
  }, []);

  const onClickMic = async (
    webrtcId: string | null,
    section: TranslationUiSection
  ) => {
    if (!webrtcId) {
      console.log("webrtcId is null");
      return;
    }
    if (uiStateRef.current === TranslationUiState.RESPONDING) {
      setUiState(TranslationUiState.IDLE);
      return;
    }
    console.log("마이크 버튼 클릭됨");
    setTopText("");
    setBottomText("");
    setInputSection(section);
    const sourceLang =
      section === TranslationUiSection.TOP ? topLanguage : bottomLanguage;
    const targetLang =
      section === TranslationUiSection.TOP ? bottomLanguage : topLanguage;
    await setLanguage(webrtcId, sourceLang, targetLang);
    setUiState(TranslationUiState.SPEAKING);
    rtc.unmuteMicrophone();
  };

  /**
   * (마이크 누른 후) 곧 말할 음성의 통역 언어 설정(서버 side)
   */
  const setLanguage = async (
    webrtcId: string,
    sourceLanguage: string,
    targetLanguage: string
  ) => {
    console.log("setLanguage", sourceLanguage, targetLanguage);
    const token = await AsyncStorage.getItem("access_token");
    const json = JSON.stringify({
      webrtc_id: webrtcId,
      target_language: targetLanguage,
      source_language: sourceLanguage,
    });
    console.log("fetching [setLanguage] json", json);
    fetch(`${apiUrl}/set_language`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: json,
    });
  };

  const navigateToLanguageSelect = (section: "top" | "bottom") => {
    const excludedLanguage = section === "top" ? bottomLanguage : topLanguage;
    router.push({
      pathname: "/languageSelect",
      params: { section, excludedLanguage },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <LogoutButton />
      {/* Top Section */}
      <TranslationSection
        webrtcId={webrtcId}
        section={TranslationUiSection.TOP}
        text={topText}
        language={topLanguage}
        connected={connected}
        muted={muted}
        uiState={uiStateRef.current}
        showWave={showTopWave}
        inputSection={inputSection}
        inputEnvelope={inputEnvelope}
        outputEnvelope={outputEnvelope}
        svgWidth={svgWidth}
        svgHeight={svgHeight}
        waveBarColor={waveBarColor}
        navigateToLanguageSelect={navigateToLanguageSelect}
        onClickMic={onClickMic}
      />
      {/* Bottom Section */}
      <TranslationSection
        webrtcId={webrtcId}
        section={TranslationUiSection.BOTTOM}
        text={bottomText}
        language={bottomLanguage}
        connected={connected}
        muted={muted}
        uiState={uiStateRef.current}
        showWave={showBottomWave}
        inputSection={inputSection}
        inputEnvelope={inputEnvelope}
        outputEnvelope={outputEnvelope}
        svgWidth={svgWidth}
        svgHeight={svgHeight}
        waveBarColor={waveBarColor}
        navigateToLanguageSelect={navigateToLanguageSelect}
        onClickMic={onClickMic}
      />
      {!connected && isConnecting && <Loading />}
      {!connected && !isConnecting && (
        <ConnectButton onPress={connect} title="연결 시도" />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
});
