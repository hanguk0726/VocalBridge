from .provider_stt import ProviderSTT

def run_stt(provider: ProviderSTT, audio_file: str, language_code: str | None = None, **kwargs) -> str:
    print("[STT 실행]", audio_file)
    provider.initialize()
    text = provider.speech_to_text(audio_file, language_code=language_code, **kwargs)
    print("[STT 결과]", text)
    return text
