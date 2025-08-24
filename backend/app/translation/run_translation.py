from translation import ProviderTranslation


def run_translation(
    provider: ProviderTranslation,
    text: str,
    target_lang: str,
    source_lang: str,
) -> str:
    """
    편리한 단일 호출용 함수
    """
    print("[번역 실행]")
    provider.initialize()

    return provider.translate(text, to_prompt(target_lang), to_prompt(source_lang))


def to_prompt(language_code: str) -> str:

    if language_code == "ko":
        return "korean"
    elif language_code == "ja":
        return "japanese"
    else:
        return "english"
