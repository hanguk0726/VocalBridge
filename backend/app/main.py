import os
import sys

sys.path.append(os.path.dirname(__file__))

from app.util.auth import SupabaseAuthMiddleware
from app.global_state import LanguageState, get_language_state, set_language_state
from stt import run_stt, SSTElevenLabs
from tts import run_tts, TTSElevenlabs
from translation import run_translation, TranslationGemini
import json
import numpy as np
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import tempfile
import numpy as np
from fastrtc import Stream, ReplyOnPause, get_current_context
from dotenv import load_dotenv
import soundfile as sf

# --- Environment ---

load_dotenv()


# RTC 오디오를 파일로 저장
async def handle_audio(audio: tuple[int, np.ndarray]):

    sample_rate, audio_array = audio

    try:
        with tempfile.TemporaryDirectory() as tmp_dir:
            filename = os.path.join(tmp_dir, "audio.wav")
            sf.write(filename, audio_array.flatten(), sample_rate, format="WAV")

            # STT
            provide_stt = SSTElevenLabs()
            lang_state = get_language_state(get_current_context().webrtc_id)
            text = run_stt(
                provide_stt, filename, language_code=lang_state.source_language
            )
        print(f"STT 결과: {text}")

        # 번역
        translated_provider = TranslationGemini()
        translated = run_translation(
            text=text,
            target_lang=lang_state.target_language,
            source_lang=lang_state.source_language,
            provider=translated_provider,
        )
        print(f"번역 결과: {translated}")
        text_data = {"input": text, "output": translated}
        await send_data("translation", json.dumps(text_data))

        # TTS
        provide_tts = TTSElevenlabs()
        for frame in run_tts(
            provide_tts, translated, language_code=lang_state.target_language
        ):
            yield frame

    finally:
        # TEMP 파일 삭제
        if filename and os.path.exists(filename):
            os.remove(filename)
            print(f"[삭제됨] {filename}")


stream = Stream(ReplyOnPause(handle_audio), modality="audio", mode="send-receive")

app = FastAPI()

app.add_middleware(SupabaseAuthMiddleware)

app.mount("/static", StaticFiles(directory="static"), name="static")

stream.mount(app)


async def send_data(event_type: str, data: str):
    channel = stream.data_channels.get(get_current_context().webrtc_id)
    if not channel or channel.readyState != "open":
        return False

    payload = json.dumps({"type": event_type, "data": data})
    try:
        channel.send(payload)
        return True
    except Exception as e:
        print(e)
        return False


@app.get("/")
async def get():
    with open("static/index.html", "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())


@app.post("/set_language")
async def set_language(data: LanguageState):
    print("/set_language ::", data)
    set_language_state(data)
    return {"ok": True}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/dev/reset")
async def reset():
    try:
        webrtc_ids = list(stream.connections.keys())

        for webrtc_id in webrtc_ids:
            stream.clean_up(webrtc_id)

        return {"message": "All connections have been cleaned up and reset."}

    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
