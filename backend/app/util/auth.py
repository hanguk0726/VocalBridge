import os
from fastapi import Response
from supabase import create_client, Client
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse


def get_supabase_client() -> Client:
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("SUPABASE_URL or SUPABASE_KEY environment variable is not set")
    return create_client(SUPABASE_URL, SUPABASE_KEY)


class SupabaseAuthMiddleware(BaseHTTPMiddleware):

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,  # 타입 힌트 추가
    ) -> Response:
        # WebRTC offer 엔드포인트만 인증 확인
        if request.url.path.endswith("/webrtc/offer") and request.method == "POST":
            auth_header = request.headers.get("Authorization")

            if not auth_header or not auth_header.startswith("Bearer "):
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Authorization header missing or invalid"},
                    headers={"WWW-Authenticate": "Bearer"},
                )

            token = auth_header.replace("Bearer ", "").strip()

            try:
                supabase = get_supabase_client()
                user = supabase.auth.get_user(token)

                if not user:
                    return JSONResponse(
                        status_code=401,
                        content={"detail": "Invalid token"},
                    )

                # 인증된 사용자 정보를 request.state에 저장
                request.state.user = user

            except Exception as e:
                return JSONResponse(
                    status_code=401,
                    content={"detail": f"Authentication failed: {str(e)}"},
                )

        # 인증 통과 또는 인증이 필요 없는 요청
        response = await call_next(request)
        return response
