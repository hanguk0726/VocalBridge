"""
base abstract class for tts providers.
"""
import abc
from typing import Optional, Dict, Any

from typing import Generator, Tuple, Optional
import numpy as np

class ProviderTTS(abc.ABC):
    """base abstract class for tts providers."""

    @abc.abstractmethod
    def initialize(self) -> None:
        """initialize the tts provider."""
        pass

    @abc.abstractmethod
    def text_to_speech(
        self,
        text: str,
        output_file: str,
        model_id: str | None = None,
        language_code: str | None = None,
        voice_id: str | None = None,
        **kwargs: Any
    )  -> Generator[Tuple[int, np.ndarray], None, None]:
        """convert text to speech."""
        pass 
