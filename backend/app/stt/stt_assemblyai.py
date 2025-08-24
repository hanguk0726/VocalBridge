import os
import time
import requests

from .provider_stt import ProviderSTT

# AssemblyAI
# 유료 버전은 안써봤으나 무료일 경우 응답 속도가 매우 느려 사실상 쓸 수 없음
class SSTAssemblyAI(ProviderSTT):
    """
    AssemblyAI 기반 STT Provider 구현.
    """

    def initialize(self) -> None:
        """AssemblyAI는 별도의 초기화가 필요 없으므로 패스"""
        pass

    def speech_to_text(
        self,
        audio_file: str,
        model_id: str | None = None,
        language_code: str | None = None,
        **kwargs,
    ) -> str:
        return self.transcribe_file(audio_file, language_code)

    # =====================
    # 내부 헬퍼 메서드
    # =====================
    @staticmethod
    def transcribe_file(file_path: str, lang: str | None = None) -> str:
        # 환경변수에서 API_KEY 및 BASE_URL 로드
        API_KEY = os.environ.get("ASSEMBLYAI_API_KEY")
        if not API_KEY:
            raise RuntimeError(
                "환경변수 'ASSEMBLYAI_API_KEY'가 설정되어 있지 않습니다."
            )
        BASE_URL = os.environ.get("ASSEMBLYAI_API_URL", "https://api.assemblyai.com")
        HEADERS = {"authorization": API_KEY}

        if not os.path.isfile(file_path):
            raise FileNotFoundError(f"{file_path} 파일이 존재하지 않습니다.")

        try:
            print(f"[INFO] 파일 업로드 시작: {file_path}")
            with open(file_path, "rb") as f:
                upload_resp = requests.post(
                    BASE_URL + "/v2/upload", headers=HEADERS, data=f
                )
            print(f"[DEBUG] 업로드 HTTP 상태 코드: {upload_resp.status_code}")
            print(f"[DEBUG] 업로드 응답: {upload_resp.text}")

            upload_resp.raise_for_status()
            audio_url = upload_resp.json().get("upload_url")
            if not audio_url:
                raise RuntimeError("업로드 응답에 'upload_url'이 없습니다.")

            print(f"[INFO] 트랜스크립션 요청 시작: {audio_url}")
            data = {"audio_url": audio_url, "speech_model": "universal"}

            if lang:
                data["language_code"] = lang

            transcript_resp = requests.post(
                BASE_URL + "/v2/transcript", json=data, headers=HEADERS
            )
            print(f"[DEBUG] 트랜스크립션 HTTP 상태 코드: {transcript_resp.status_code}")
            print(f"[DEBUG] 트랜스크립션 응답: {transcript_resp.text}")

            transcript_resp.raise_for_status()
            transcript_id = transcript_resp.json()["id"]

            polling_endpoint = BASE_URL + "/v2/transcript/" + transcript_id
            while True:
                result = requests.get(polling_endpoint, headers=HEADERS).json()
                print(f"[DEBUG] 폴링 상태: {result.get('status')}")
                if result["status"] == "completed":
                    print(f"[INFO] 트랜스크립션 완료")
                    return result["text"]
                elif result["status"] == "error":
                    raise RuntimeError(f"Transcription failed: {result.get('error')}")
                time.sleep(3)

        except requests.exceptions.RequestException as e:
            print(f"[ERROR] HTTP 요청 실패: {e}")
            raise
