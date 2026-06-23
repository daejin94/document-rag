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

`run-backend.sh`는 DB URL이 `localhost` 또는 `127.0.0.1`인 경우 Postgres 컨테이너를 자동으로 실행하고 준비될 때까지 기다린다.

로컬에서 `5432` 포트를 사용할 수 없다면 `.env`에 아래 값을 추가하고 DB URL 포트도 함께 맞춘다.

```env
POSTGRES_HOST_PORT=15432
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:15432/rag_db
```

루트 `.env`를 로드한 뒤 백엔드를 실행한다.

```bash
sh run-backend.sh
```

스크립트 없이 직접 실행할 수도 있다.

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
3. 프로젝트 생성(생성자는 자동으로 ADMIN)
4. `.txt`, `.md`, `.markdown`, `.pdf` 문서 업로드
5. 문서 상태가 `COMPLETED`인지 확인
6. 질문 입력
7. 답변과 출처 확인

문서/채팅은 모두 프로젝트 단위이므로, 먼저 프로젝트가 있어야 업로드와 질문이 가능하다. 관리자 화면(`/api/admin/**`, 프론트 `AdminApp`)은 전역 역할이 `SUPER_ADMIN`인 사용자만 사용할 수 있으며, `SUPER_ADMIN`은 DB에서 직접 부여한다.

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
