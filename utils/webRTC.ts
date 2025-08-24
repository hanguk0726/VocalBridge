import { useAudioStore } from "@/store/audioStore";
import {
  TranslationUiSection,
  TranslationUiState,
  useTranslationStore,
} from "@/store/translationStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import {
  mediaDevices,
  MediaStream as RNMediaStream,
  RTCPeerConnection,
  RTCSessionDescription,
} from "react-native-webrtc";
import { requestMicrophonePermission } from "./permission";
import { ensureValidSession } from "./supabaseClient";

interface ServerMessage {
  type: string;
  data: string;
}

interface TranslationData {
  input: string;
  output: string;
}

export class WebRTCTranslation {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: any | null = null;
  private webrtcId: string | null = null;
  private localStream: RNMediaStream | null = null;
  public onMessage: ((msg: string) => void) | null = null;
  private isConnecting = false;
  private apiUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  // Store state setters
  private setMuted = (isMuted: boolean) =>
    useAudioStore.setState({ muted: isMuted });

  private setTranslationUiState = (uiState: TranslationUiState) =>
    useTranslationStore.setState({ uiState });

  private setTopText = (topText: string) =>
    useTranslationStore.setState({ topText });

  private setBottomText = (bottomText: string) =>
    useTranslationStore.setState({ bottomText });

  private getCurrentInputSection = (): TranslationUiSection =>
    useTranslationStore.getState().inputSection;

  // Public methods
  getWebrtcId = () => this.webrtcId;

  healthCheck = async (): Promise<boolean> => {
    try {
      const token = await AsyncStorage.getItem("access_token");
      const response = await fetch(`${this.apiUrl}/health`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      console.log("Server health check:", data);
      return data.status === "ok";
    } catch (error) {
      console.error("Health check failed:", error);
      return false;
    }
  };

  async start(): Promise<boolean> {
    try {
      if (!(await this.healthCheck())) {
        console.log("Server health check failed");
        return false;
      }
      if (!(await this.requestMicrophonePermission())) {
        console.log("Microphone permission denied");
        return false;
      }
      if (this.peerConnection || this.isConnecting) {
        console.log("WebRTC connection already in progress");
        return false;
      }

      this.isConnecting = true;
      this.initializeWebRTC();

      await this.setupLocalStream();
      await this.createAndSendOffer();

      console.log("WebRTC connection established");
      return true;
    } catch (error) {
      this.handleConnectionError(error);
      return false;
    } finally {
      console.log("isConnecting:", this.isConnecting);
      this.isConnecting = false;
    }
  }

  private async requestMicrophonePermission(): Promise<boolean> {
    const allowed = await requestMicrophonePermission();
    if (!allowed) {
      Alert.alert(
        "마이크 권한 필요",
        "마이크 권한이 없을 때 앱 기능을 사용할 수 없습니다."
      );
    }
    return allowed;
  }

  private initializeWebRTC(): void {
    this.webrtcId = this.generateWebRTCId();
    console.log("WebRTC ID:", this.webrtcId);
    // loop print log every 1s

    this.peerConnection = new RTCPeerConnection();
    (this.peerConnection as any).icegatheringstatechange = (event: any) => {
      // 'new' | 'gathering' | 'complete'
      console.log(`ICE gathering state: ${event.target.iceGatheringState}`);
    };

    this.setupDataChannel();
  }

  private generateWebRTCId = (): string =>
    Math.random().toString(36).substring(2);

  private setupDataChannel(): void {
    this.dataChannel = this.peerConnection!.createDataChannel("text");
    this.dataChannel.onopen = () => console.log("DataChannel connected");
    this.dataChannel.onmessage = this.handleDataChannelMessage;
  }

  private handleDataChannelMessage = (event: MessageEvent): void => {
    try {
      const message: ServerMessage = JSON.parse(event.data);

      switch (message.type) {
        case "log":
          this.handleLogMessage(message.data);
          break;
        case "translation":
          this.handleTranslationMessage(message.data);
          break;
      }
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  };

  private handleLogMessage = (data: string): void => {
    switch (data) {
      case "pause_detected":
        this.muteMicrophone();
        break;
      case "response_starting":
        this.setTranslationUiState(TranslationUiState.RESPONDING);
        break;
    }
  };

  private handleTranslationMessage = (data: string): void => {
    const translation: TranslationData = JSON.parse(data);
    const isTopInput =
      this.getCurrentInputSection() === TranslationUiSection.TOP;

    this.setTopText(isTopInput ? translation.input : translation.output);
    this.setBottomText(isTopInput ? translation.output : translation.input);
  };

  private async setupLocalStream(): Promise<void> {
    this.localStream = await mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    this.localStream
      .getTracks()
      .forEach((track) =>
        this.peerConnection!.addTrack(track, this.localStream!)
      );

    this.muteMicrophone();
  }

  private async createAndSendOffer(): Promise<void> {
    const offer = await this.peerConnection!.createOffer();
    await this.peerConnection!.setLocalDescription(offer);
    await this.waitForIceGathering();
    await this.sendOfferToServer();
  }

  private waitForIceGathering(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("ICE gathering timeout")),
        10000
      );

      (this.peerConnection as any).onicecandidate = (event: any) => {
        if (
          !event.candidate &&
          this.peerConnection!.iceGatheringState === "complete"
        ) {
          clearTimeout(timeout);
          resolve();
        }
      };
    });
  }

  private async sendOfferToServer(): Promise<void> {
    const token = await AsyncStorage.getItem("access_token");
    const response = await fetch(`${this.apiUrl}/webrtc/offer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        sdp: this.peerConnection!.localDescription?.sdp,
        type: this.peerConnection!.localDescription?.type,
        webrtc_id: this.webrtcId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    const answer = await response.json();
    if (answer.status === "failed") {
      throw new Error(answer.meta?.error || "Unknown server error");
    }

    await this.peerConnection!.setRemoteDescription(
      new RTCSessionDescription(answer)
    );
  }

  private handleConnectionError(error: unknown): void {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    console.error("WebRTC connection failed:", error);
    Alert.alert("Connection Failed", errorMessage);
    console.log(`WebRTC connection failed: ${errorMessage}`);
    if (errorMessage.includes("401")) {
      ensureValidSession();
    }
  }

  muteMicrophone(): void {
    if (!this.localStream) return;

    this.setMuted(true);
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = false;
    });
    console.log("마이크 OFF");
  }

  unmuteMicrophone(): void {
    if (!this.localStream) return;

    this.setMuted(false);
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = true;
    });
    console.log("마이크 ON");
  }

  stop(): void {
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.peerConnection?.close();

    this.peerConnection = null;
    this.dataChannel = null;
    this.webrtcId = null;

    console.log("WebRTC 연결 종료됨");
  }
}
