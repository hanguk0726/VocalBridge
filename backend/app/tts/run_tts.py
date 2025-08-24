from .provider_tts import ProviderTTS
import numpy as np
from typing import Generator, Tuple

def run_tts(provider: ProviderTTS, text: str, language_code: str | None = None, **kwargs) -> Generator[Tuple[int, np.ndarray], None, None]:
    print("[TTS 실행]")
    provider.initialize()
    return provider.text_to_speech(text, language_code=language_code, **kwargs)
