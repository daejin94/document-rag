# AGENTS.md

이 문서는 Codex, Claude 같은 AI coding agent가 이 프로젝트에서 작업할 때 따라야 하는 지침입니다.

README.md는 사람을 위한 프로젝트 설명 문서이고, AGENTS.md는 AI coding agent를 위한 작업 규칙 문서입니다.

## 기본 원칙

- 답변과 설명은 기본적으로 한국어로 작성한다.
- 사용자의 요청 범위를 벗어난 기능을 임의로 추가하지 않는다.
- 필요한 파일만 수정한다.
- 관련 없는 리팩터링은 하지 않는다.
- 기존 코드 스타일과 구조를 우선적으로 따른다.
- 불확실한 요구사항은 구현 전에 명확히 확인한다.
- 추측이 필요한 경우 추측임을 명시한다.
- 보안 정보, API key, secret 값을 코드에 하드코딩하지 않는다.
- `.env` 파일을 커밋 대상으로 만들지 않는다.
- 작업 후 가능한 범위에서 빌드 또는 테스트를 수행한다.
- 테스트를 실행하지 못했다면 그 이유를 명확히 설명한다.

## 프로젝트 개요

이 프로젝트는 문서 기반 RAG Q&A 시스템이다.

사용자가 TXT 또는 Markdown 문서를 업로드하면 서버가 문서를 chunk 단위로 분할하고, OpenAI Embedding API로 벡터화한 뒤 PostgreSQL + pgvector에 저장한다.

사용자가 질문하면 질문도 embedding으로 변환하고, 유사한 문서 chunk를 검색한 뒤 OpenAI Chat API로 근거 기반 답변과 출처를 반환한다.

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

## 프로젝트 구조

```text
backend/              Spring Boot API 서버
frontend/             Vite React 클라이언트
docker-compose.yml    통합 실행용 Docker Compose
.env.example          환경변수 예시
README.md             프로젝트 설명 문서
AGENTS.md             AI coding agent 작업 지침
```

## Backend 작업 규칙

- Controller는 요청/응답 처리에 집중한다.
- 핵심 비즈니스 로직은 Service 계층에 둔다.
- Repository는 데이터 접근 책임만 가진다.
- 인증/인가 로직은 Spring Security 설정과 JWT 관련 컴포넌트에 모은다.
- 예외 처리는 가능한 한 중앙화된 Exception Handler를 사용한다.
- API 응답 형식은 명시 요청 없이는 변경하지 않는다.
- 사용자별 문서 접근 제한을 깨뜨리는 변경을 하지 않는다.
- 문서 업로드, chunk 생성, embedding 저장 흐름을 변경할 때는 전체 RAG 흐름에 미치는 영향을 확인한다.
- RAG 검색 로직 변경 시 `topK`, `similarity threshold`, `documentIds` 필터링 영향을 함께 확인한다.
- refresh token은 현재 MVP 형태로 access token과 동일하게 반환한다. 별도 저장소 기반 refresh token 구현은 사용자가 요청한 경우에만 진행한다.

## Frontend 작업 규칙

- 기존 컴포넌트 구조를 우선적으로 유지한다.
- API 호출 경로는 `/api` 프록시 구조를 기준으로 한다.
- 인증 토큰 처리 방식은 기존 구현을 따른다.
- 테스트 화면 목적의 단순한 UI를 유지한다.
- 불필요한 UI 라이브러리를 추가하지 않는다.
- 백엔드 API 응답 구조를 임의로 가정하지 않는다.
- API 변경이 필요한 경우 백엔드와 프론트엔드 사용부를 함께 확인한다.

## Database 작업 규칙

- PostgreSQL + pgvector를 기준으로 한다.
- embedding 컬럼은 기본적으로 `text-embedding-3-small` 기준 1536 차원을 사용한다.
- 문서 chunk와 embedding의 관계를 깨뜨리지 않는다.
- 사용자별 데이터 접근 제한에 필요한 user id 관계를 임의로 제거하지 않는다.
- schema 변경이 필요한 경우 관련 Entity, Repository, 초기화 SQL, README를 함께 확인한다.
- vector search 쿼리를 변경할 경우 similarity threshold와 정렬 기준을 함께 확인한다.

## RAG 작업 규칙

- 업로드 가능한 문서 형식은 현재 TXT, Markdown만 지원한다.
- PDF 지원을 구현했다고 문서에 작성하지 않는다.
- 문서 처리 상태가 `COMPLETED`인 경우에만 정상 질의 대상으로 간주한다.
- chunkCount가 1 이상인지 확인하는 흐름을 유지한다.
- 질문 답변 시 검색된 chunk 기반으로 답변해야 한다.
- 출처 반환 기능을 깨뜨리지 않는다.
- 사용자가 접근 권한이 없는 문서 chunk가 검색 결과에 포함되지 않도록 한다.

## 환경변수

필수 환경변수:

```env
OPENAI_API_KEY
JWT_SECRET
```

선택 환경변수:

```env
OPENAI_CHAT_MODEL
OPENAI_EMBEDDING_MODEL
SPRING_DATASOURCE_URL
SPRING_DATASOURCE_USERNAME
SPRING_DATASOURCE_PASSWORD
RAG_TOP_K
RAG_SIMILARITY_THRESHOLD
```

`JWT_SECRET`은 최소 32바이트 이상이어야 한다.

개발용 secret 생성 명령어:

```bash
openssl rand -base64 32
```

## 주요 명령어

### Docker Compose 통합 실행

```bash
docker compose up --build
```

### DB만 실행

```bash
docker compose up -d postgres
docker compose ps
```

### Backend 실행

```bash
cd backend
./gradlew bootRun
```

### Frontend 실행

```bash
cd frontend
npm install
npm run dev
```

## 로컬 개발 실행 흐름

DB만 Docker로 실행한다.

```bash
docker compose up -d postgres
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

## 검증 체크리스트

작업 완료 전 가능한 범위에서 아래를 확인한다.

- 백엔드 컴파일 성공 여부
- 관련 테스트 실행 여부
- 회원가입 API 영향 여부
- 로그인 API 영향 여부
- JWT 인증 흐름 영향 여부
- 문서 업로드 흐름 영향 여부
- chunk 생성 및 embedding 저장 흐름 영향 여부
- 질문 API 응답 여부
- 답변 출처 반환 여부
- 사용자별 문서 접근 제한 유지 여부
- 프론트엔드에서 `/api` 프록시 호출이 정상 동작하는지 여부

## API 예시 확인용

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

### 문서 업로드

```bash
curl -X POST http://localhost:8080/api/documents \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
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
    "documentIds": [1]
  }'
```

## 금지 사항

- secret 값을 코드에 하드코딩하지 않는다.
- `.env` 파일을 커밋하지 않는다.
- 사용자가 요청하지 않은 대규모 리팩터링을 하지 않는다.
- API 응답 구조를 임의로 변경하지 않는다.
- 인증 우회 로직을 추가하지 않는다.
- 문서 접근 권한 검증을 제거하지 않는다.
- PDF 지원을 구현했다고 문서에 쓰지 않는다.
- TXT / Markdown 외 파일 지원을 임의로 추가하지 않는다.
- OpenAI 모델명을 코드에 고정하지 않는다. 환경변수를 우선 사용한다.
- RAG 검색 결과가 없는 경우를 무시하지 않는다.
- 테스트 실패를 숨기지 않는다.

## 커밋 메시지 규칙

커밋 메시지는 아래 형식을 따른다.

```text
[Type] 작업 내용
```

사용 가능한 Type:

- [Feat]: 기능 추가 또는 API 개발
- [Fix]: 버그 수정
- [Refactor]: 기능 변화 없는 코드 개선
- [Docs]: 문서 수정
- [Style]: 코드 포맷, 세미콜론 등 기능 변화 없는 스타일 수정
- [Test]: 테스트 추가 또는 수정
- [Chore]: 설정, 의존성, 환경 변수 변경
- [Build]: 빌드 관련 변경
- [CI]: CI/CD 관련 변경
- [Perf]: 성능 개선
- [Revert]: 이전 커밋 되돌리기

규칙:

- Type은 반드시 대괄호 안에 작성한다.
- Type은 첫 글자만 대문자로 작성한다. 예: `[Feat]`
- 작업 내용은 한글로 작성한다.
- 작업 내용은 50자 이내로 간결하게 작성한다.
- 마침표를 붙이지 않는다.
- 한 커밋에는 하나의 목적만 담는다.

예시:

```text
[Feat] 회원가입 API 개발
[Feat] 게시글 이미지 업로드 기능 추가
[Fix] 로그인 토큰 만료 오류 수정
[Refactor] 인증 로직 분리
[Test] 회원가입 서비스 테스트 추가
[Docs] README 실행 방법 추가
[Chore] Gradle 의존성 추가
```

## 작업 완료 보고 방식

작업 후에는 다음 내용을 간단히 정리한다.

- 변경한 파일
- 변경 내용 요약
- 실행한 테스트 또는 검증 명령어
- 테스트를 실행하지 못했다면 그 이유
- 추가로 확인이 필요한 부분
