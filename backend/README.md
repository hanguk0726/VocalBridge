# 버전
python 3.11.0

# 새 가상환경 생성
python  -m venv rn_task

# 활성화 (Windows)
.\rn_task\Scripts\activate

# 패키지 설치
pip install -r requirements.txt

# 실행
uvicorn app.main:app