from typing import Generator, Tuple
import elevenlabs
from elevenlabs import ElevenLabs

from .provider_tts import ProviderTTS
from loguru import logger
import os
import logging
import numpy as np
import tempfile
from elevenlabs import play
import soundfile as sf


class TTSElevenlabs(ProviderTTS):
    """
    Elevenlabs TTS 기반 TTS Provider 구현체
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

    def text_to_speech(
        self,
        text: str,
        output_file: str | None = None,
        model_id: str | None = None,
        language_code: str | None = None,
        voice_id: str | None = None,
        **kwargs,
    ) -> Generator[Tuple[int, np.ndarray], None, None]:
        """
        텍스트를 음성으로 변환하고 파일로 저장, generator-safe
        """
        if not self.initialized:
            raise RuntimeError(
                "Provider가 초기화되지 않았습니다. initialize()를 먼저 호출하세요."
            )

        try:
            # ElevenLabs TTS 호출 (generator 반환 가능)
            audio_gen = self.elevenlabs.text_to_speech.convert(  # type: ignore
                text=text,
                voice_id=voice_id or "JBFqnCBsd6RMkjVDRZzb",
                model_id=model_id or "eleven_multilingual_v2",
                output_format="mp3_44100_128",
                **kwargs,
            )
            # generator 안의 bytes를 하나로 합침
            audio_bytes = b"".join(audio_gen)

            # # 임시 파일로 저장
            temp_file = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
            temp_file_path = temp_file.name
            temp_file.write(audio_bytes)
            temp_file.close()

            try:
                # audio 파일 읽어서 numpy 배열로 변환
                data, sample_rate = sf.read(temp_file_path, dtype="int16")

                audio_array = np.array(data).reshape(1, -1)

                # yield
                yield (sample_rate, audio_array)

            finally:
                if os.path.exists(temp_file_path):
                    os.remove(temp_file_path)

        except Exception as e:
            logger.error(f"error in elevenlabs text_to_speech: {str(e)}")
            raise
