import os
import abc
from elevenlabs.client import ElevenLabs
from .provider_stt import ProviderSTT


class SSTElevenLabs(ProviderSTT):
    """
    ElevenLabs STT Provider 구현체
    """

    def __init__(self):
        # 객체 생성 시점에는 최소 속성만 초기화
        self.elevenlabs = None
        self.initialized = False

    def initialize(self) -> None:
        """
        ElevenLabs 클라이언트 초기화
        """
        api_key = os.environ.get("ELEVENLABS_API_KEY")
        if not api_key:
            raise RuntimeError(
                "환경변수 'ELEVENLABS_API_KEY'가 설정되어 있지 않습니다."
            )
        self.elevenlabs = ElevenLabs(api_key=api_key)
        self.initialized = True

    def speech_to_text(
        self,
        audio_file: str,
        model_id: str | None = "scribe_v1",
        language_code: str | None = None,
        **kwargs
    ) -> str:
        if not self.initialized:
            raise RuntimeError(
                "Provider가 초기화되지 않았습니다. initialize()를 먼저 호출하세요."
            )

        with open(audio_file, "rb") as f:
            params = dict(file=f, model_id=model_id, tag_audio_events=False, **kwargs)
            if language_code is not None:
                params["language_code"] = language_code

            transcription = self.elevenlabs.speech_to_text.convert(**params)  # type: ignore

        # transcription 객체에 text 속성이 없으면 객체 자체 반환
        return getattr(transcription, "text", transcription)  # type: ignore
