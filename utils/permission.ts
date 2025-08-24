import { PermissionsAndroid, Platform, Alert } from "react-native";

export async function requestMicrophonePermission() {
  if (Platform.OS !== "android") return true; // Android만 처리

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: "마이크 권한 요청",
        message: "앱에서 음성 입력을 사용하기 위해 마이크 접근이 필요합니다.",
        buttonPositive: "허용",
        buttonNegative: "거부",
      }
    );

    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      console.log("마이크 권한 허용됨");
      return true;
    } else {
      console.log("마이크 권한 거부됨");
      Alert.alert(
        "권한 필요",
        "마이크 권한이 없으면 음성 기능을 사용할 수 없습니다."
      );
      return false;
    }
  } catch (err) {
    console.warn(err);
    return false;
  }
}

