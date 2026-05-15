# 개발 환경

## 필수 환경변수

루트 경로에 `.env` 파일을 만든다.

```bash
cp .env.example .env
```

필수 값:

```env
OPENAI_API_KEY
JWT_SECRET
```

`JWT_SECRET`은 최소 32바이트 이상이어야 한다.

```bash
openssl rand -base64 32
```

## Docker Compose 통합 실행

프론트엔드, 백엔드, DB를 모두 컨테이너로 실행한다.

```bash
docker compose up --build
```

서비스 주소:

| 서비스 | 주소 |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:8080 |
| PostgreSQL | localhost:5432 |

## 로컬 개발 실행

DB만 Docker로 실행한다.

```bash
docker compose up -d postgres
docker compose ps
```

루트 `.env`를 로드한 뒤 백엔드를 실행한다.

```bash
set -a
source .env
set +a

cd backend
./gradlew bootRun
```

프론트엔드를 실행한다.

```bash
cd frontend
npm install
npm run dev
```

접속 주소:

```text
http://localhost:5173
```

## 검증 흐름

1. 회원가입
2. 로그인
3. `.txt`, `.md`, `.markdown` 문서 업로드
4. 문서 상태가 `COMPLETED`인지 확인
5. 질문 입력
6. 답변과 출처 확인

## 자주 쓰는 명령어

Backend 실행:

```bash
cd backend
./gradlew bootRun
```

Frontend 실행:

```bash
cd frontend
npm run dev
```

DB만 실행:

```bash
docker compose up -d postgres
```
