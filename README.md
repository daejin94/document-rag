# Document RAG Q&A

사용자가 업로드한 문서를 기반으로 질문에 답변하는 RAG 기반 Q&A 시스템입니다.

문서를 chunk 단위로 분할하고 OpenAI Embedding API로 벡터화한 뒤 PostgreSQL + pgvector에 저장합니다.  
질문이 들어오면 질문도 embedding으로 변환하고, 유사한 문서 chunk를 검색한 뒤 OpenAI Chat API를 통해 근거 기반 답변과 출처를 반환합니다.

## 주요 기능

- 회원가입 / 로그인
- JWT 기반 인증
- 프로젝트 생성 및 멤버 추가
- TXT / Markdown / PDF 문서 업로드
- 문서 텍스트 추출 및 chunking
- OpenAI Embedding API를 통한 embedding 생성
- PostgreSQL pgvector 기반 vector search
- 검색된 chunk 기반 답변 생성
- 답변 출처 반환
- 채팅 세션 기반 후속 질문
- 프로젝트 멤버별 문서 접근 제한
- 프로젝트 관리자 문서 삭제
- React 기반 테스트 화면

## 기술 스택

### Backend

- Java 21
- Spring Boot
- Spring Security
- JWT
- PostgreSQL
- pgvector
- OpenAI API

### Frontend

- React
- Vite
- Nginx

### Infra

- Docker
- Docker Compose

## 폴더 구조

```text
.
├── backend/              # Spring Boot API 서버
├── frontend/             # Vite React 클라이언트
├── docs/                 # 프로젝트 문서
├── docker-compose.yml    # 통합 실행용 Docker Compose
├── run-backend.sh        # 로컬 백엔드 실행 스크립트
├── .env.example          # 환경변수 예시
├── README.md             # 프로젝트 설명 문서
└── AGENTS.md             # AI coding agent 작업 지침
```

## 환경변수 설정

루트 경로에 `.env` 파일을 생성합니다.

```bash
cp .env.example .env
```

예시:

```env
OPENAI_API_KEY=sk-...
JWT_SECRET=replace-with-a-long-random-secret-at-least-32-bytes

OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/rag_db
SPRING_DATASOURCE_USERNAME=rag_user
SPRING_DATASOURCE_PASSWORD=rag_password

RAG_TOP_K=5
RAG_SIMILARITY_THRESHOLD=0.20
```

위 DB URL은 DB만 Docker로 실행하고 백엔드는 로컬에서 실행하는 개발용 설정입니다.
통합 Docker Compose로 백엔드까지 컨테이너에서 실행할 때는 docker-compose.yml에서 DB host를 postgres로 덮어씁니다.

`JWT_SECRET`은 최소 32바이트 이상이어야 합니다.

개발용 난수는 아래 명령어로 생성할 수 있습니다.

```bash
openssl rand -base64 32
```

## 실행 방식 1: Docker Compose 통합 실행

프론트엔드, 백엔드, DB를 모두 Docker로 실행합니다.

```bash
docker compose up --build
```

서비스 구성:

| 서비스 | 설명 | 주소 |
|---|---|---|
| frontend | Nginx 정적 서빙 | http://localhost:5173 |
| backend | Spring Boot API 서버 | http://localhost:8080 |
| postgres | PostgreSQL + pgvector | localhost:5432 |

프론트엔드 컨테이너는 `/api` 요청을 Docker 내부 네트워크의 `backend:8080`으로 프록시합니다.

## 실행 방식 2: 개발용 로컬 실행

로그를 직접 확인하기 위해 DB만 Docker로 실행하고, 백엔드와 프론트엔드는 로컬에서 실행하는 방식입니다.

### 1. DB 실행

```bash
docker compose up -d postgres
docker compose ps
```

### 2. 백엔드 실행

```bash
cd /mnt/e/project/01.\ rag/code
sh run-backend.sh
```

스크립트 없이 직접 실행할 수도 있습니다.

```bash
set -a
source .env
set +a

cd backend
./gradlew bootRun
```

정상 실행 로그 예시:

```text
Tomcat started on port 8080
Started RagApplication
```

`bootRun`은 서버 프로세스이므로 종료되지 않고 계속 실행되는 것이 정상입니다.

### 3. 프론트엔드 실행

```bash
cd /mnt/e/project/01.\ rag/code/frontend

npm install
npm run dev
```

접속 주소:

```text
http://localhost:5173
```

Vite 개발 서버는 `/api` 요청을 `http://localhost:8080`으로 프록시합니다.

## 테스트 흐름

1. DB 실행
2. 백엔드 실행
3. 프론트엔드 실행
4. `http://localhost:5173` 접속
5. 회원가입
6. 로그인
7. 프로젝트 생성
8. 필요 시 프로젝트 멤버 추가
9. `.txt`, `.md`, `.markdown`, `.pdf` 문서 업로드
10. 문서 상태가 `COMPLETED`인지 확인
11. 질문 입력
12. 답변과 출처 확인

## API 예시

### 회원가입

```bash
curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password1234",
    "name": "대진"
  }'
```

### 로그인

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password1234"
  }'
```

### 프로젝트 생성

```bash
curl -X POST http://localhost:8080/api/projects \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "RAG Demo"
  }'
```

### 프로젝트 멤버 추가

프로젝트 관리자만 멤버를 추가할 수 있습니다.

```bash
curl -X POST http://localhost:8080/api/projects/1/members \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "member@example.com",
    "role": "MEMBER"
  }'
```

### 문서 업로드

```bash
curl -X POST http://localhost:8080/api/documents \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -F "projectId=1" \
  -F "title=Spring Security Guide" \
  -F "file=@spring-security-guide.md"
```

### 질문

```bash
curl -X POST http://localhost:8080/api/chat/query \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "JWT 인증 흐름 설명해줘.",
    "projectId": 1,
    "documentIds": [1]
  }'
```

응답의 `sessionId`를 다음 질문 요청에 포함하면 같은 대화 세션에서 이전 질문과 답변 맥락을 이어간다.

```bash
curl -X POST http://localhost:8080/api/chat/query \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "방금 답변을 더 쉽게 요약해줘.",
    "projectId": 1,
    "documentIds": [1],
    "sessionId": 1
  }'
```

## 지원 형식 및 현재 제한사항

- TXT / Markdown / PDF 문서를 업로드할 수 있습니다.
- 텍스트 인코딩은 UTF-8을 우선 사용하고, 실패하면 MS949를 한 번 더 시도합니다.
- PDF는 텍스트 추출 가능한 문서만 지원하며, 스캔 이미지 기반 PDF나 암호화된 PDF는 처리할 수 없습니다.
- 문서 처리는 현재 동기식으로 수행됩니다.
- 초기 데이터는 제공하지 않습니다.
- refresh token은 별도 저장소 없이 access token과 동일하게 반환하는 MVP 형태입니다.
- embedding 컬럼은 `text-embedding-3-small` 기본 차원인 1536 기준입니다.

## 트러블슈팅

트러블슈팅 문서는 `docs` 폴더에서 관리합니다.

- [트러블슈팅 문서](docs/troubleshooting.md)

## 프로젝트 문서

기능 흐름, API 목록, 개발 환경, 결정 기록은 `docs` 폴더에서 관리합니다.

- [문서 인덱스](docs/README.md)

## AI Coding Agent 사용

이 프로젝트에서 Codex, Claude 같은 AI coding agent를 사용할 경우 프로젝트 루트의 `AGENTS.md`를 참고합니다.

README는 사람을 위한 프로젝트 설명 문서로 유지하고, AI agent 전용 지침은 `AGENTS.md`에 분리합니다.
