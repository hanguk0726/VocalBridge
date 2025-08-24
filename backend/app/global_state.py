# global_state.py

# fastrtc 라이브러리에서 간단히 처리되어야하지만 (set_input)
# https://github.com/gradio-app/fastrtc/issues/376 (최근까지 버그가 있음)


from pydantic import BaseModel


class LanguageState(BaseModel):
    webrtc_id: str
    source_language: str = "ja"
    target_language: str = "en"


language_states: dict[str, LanguageState] = {}


def set_language_state(data: LanguageState):
    language_states[data.webrtc_id] = data


def get_language_state(webrtc_id: str) -> LanguageState:
    return language_states.get(webrtc_id, LanguageState(webrtc_id=webrtc_id))
