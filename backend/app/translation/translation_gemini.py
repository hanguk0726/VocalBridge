from typing import Any
import requests
from .provider_translation import ProviderTranslation
import os


class TranslationGemini(ProviderTranslation):
    """Gemini API translation implementation"""

    def __init__(self):
        pass

    def initialize(self) -> None:
        self.api_key = os.environ.get("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable is not set")

    def translate(
        self,
        text: str,
        target_lang: str,
        source_lang: str | None = None,
        **kwargs: Any
    ) -> str:
        url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
        headers = {
            "Content-Type": "application/json",
            "X-goog-api-key": self.api_key
        }

        # 번역 프롬프트 작성
        prompt = f"Translate the following text to {target_lang} Only provide the translated text without any explanation: {text}"
        if source_lang:
            prompt = f"Translate the following text from {source_lang} to {target_lang} Only provide the translated text without any explanation: {text}"

        payload = {
            "contents": [
                {"parts": [{"text": prompt}]}
            ]
        }

        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        result = response.json()

        try:
            translated_text = result["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError):
            raise ValueError(f"Unexpected response format: {result}")

        return translated_text
