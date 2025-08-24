# 음성 통역 앱

## 미리보기
<a href="https://drive.google.com/file/d/1ZMRA0mglXikhYYYY2m_hy8nsZ0pGYa8z/view?usp=drive_link">
  <img src="https://raw.githubusercontent.com/hanguk0726/nemo_public/main/assets/vocal_bridge_demo_thumbnail.jpg" width="400"/>
</a>

## 구현 개요
- **클라이언트**: Android Native (음성 파형 애니메이션), Expo 환경
- **서버**: FastAPI
- **RTC**: fastrtc
- **STT/TTS**: ElevenLabs
- **번역**: Gemini

## 제약
- 애플 기기를 소지하지 않아 안드로이드 기준으로 구현 및 테스트했습니다.

## 설치

### 클라이언트 (Expo 환경)
1. `.env` 파일 확인
2. `ngrok`을 통해 로컬 Python 서버와 통신했습니다.
3. ```bash
   npm i
   npx expo run:android
   ```

### 서버 (FastAPI, Python 3.11 환경)
1. `cd backend`
2. `.env` 파일 확인
3. 가상환경 설정
4. ```bash
   pip install -r requirements.txt
   uvicorn app.main:app
   ```

## 설명
- 네이버 파파고 앱의 '대화' 기능을 레퍼런스로 구현
<img src="https://raw.githubusercontent.com/hanguk0726/nemo_public/main/assets/papago.png" width="400"/>

## 기능
- **인증**: Supabase & Kakao 로그인
- **통역**: 한국어, 일본어, 영어 음성 통역 및 텍스트 출력
- **UI**: 입력/출력 음성 파형 애니메이션

## 프로젝트 구조

### ./android
- **MainActivity.kt**: WebRTC와 마이크 음성 처리, 미디어 음량 조절 라우팅
- **RtcObserverModule.kt**: React Native 모듈, RTC 음성 데이터 처리 및 파형 애니메이션용 데이터 전송

### ./backend
- **main.py**: FastAPI 앱 선언, RTC(fastrtc) 핸들링, 유틸 REST API (health check 등)

### ./app
- **_layout.tsx**: 로그인 딥링크 핸들러, Supabase Auto Refresh
- **index.tsx**: login.tsx로 네비게이션
- **login.tsx**: 세션 확인 후 UI 렌더링, translate/index.ts로 네비게이션
- **translate/index.ts**: RTC 객체 생성, 음성 파형 데이터 수신, RTC 연결, 마이크 및 UI 상태 관리

### ./utils
- **webRTC.ts**: RTC 객체, connect/stop 로직
