import abc
from typing import Any

class ProviderTranslation(abc.ABC):
    """base abstract class for translation providers."""

    @abc.abstractmethod
    def initialize(self) -> None:
        """initialize the translation provider."""
        pass

    @abc.abstractmethod
    def translate(
        self,
        text: str,
        target_lang: str,
        source_lang: str,
        **kwargs: Any
    ) -> str:
        """
        Translate input text to target language.

        :param text: 원문 텍스트
        :param target_lang: 목표 언어 
        :param source_lang: 원문 언어
        :return: 번역된 텍스트
        """
        pass
