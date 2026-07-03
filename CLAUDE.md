# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 작업 규칙 (먼저 읽기)

루트의 `AGENTS.md`가 AI 에이전트를 위한 공식 작업 규칙 문서이며, 컨벤션에 관해서는 이 파일보다 우선합니다. 핵심:

- **답변과 설명은 한국어로 작성한다.** 커밋 메시지는 `[Type] 한글 설명` 형식(50자 이내, 마침표 없음). Type: `[Feat] [Fix] [Refactor] [Docs] [Style] [Test] [Chore] [Build] [CI] [Perf] [Revert]`.
- 작업 시작 전 `worklog/in-progress.md`를 확인한다. 실제 작업 항목은 `worklog/README.md` 규칙에 따라 `worklog/{planned,in-progress,done}.md`에 기록한다.
- 프로젝트별 문서 접근 제어, 출처 반환, 업로드→chunk→embedding→검색 흐름을 깨뜨리지 않는다. OpenAI 모델명을 코드에 고정하지 않는다(환경변수 사용). 지원 파일 형식을 TXT/Markdown/PDF 외로 임의로 늘리지 않는다.

기능/흐름/결정 관련 상세 문서는 `docs/`에 있다 (`docs/feat/rag-flow.md`, `docs/api.md`, `docs/decisions.md`, `docs/troubleshooting.md`).

## 명령어

초기 설정: `cp .env.example .env` 후 `OPENAI_API_KEY`와 `JWT_SECRET`(32바이트 이상; `openssl rand -base64 32`)을 설정한다.

```bash
# 전체 스택(frontend + backend + db) Docker 실행
docker compose up --build

# 로컬 개발: DB만 Docker, backend/frontend는 호스트에서 실행 (로그 확인에 유리)
docker compose up -d postgres
set -a && source .env && set +a   # backend는 .env를 직접 읽지 않고 환경변수를 읽음
cd backend && ./gradlew bootRun   # 또는 저장소 루트에서: sh run-backend.sh
cd frontend && npm install && npm run dev   # http://localhost:5173

# Backend 빌드 / 테스트
cd backend && ./gradlew build
./gradlew test
./gradlew test --tests 'com.example.rag.document.TextExtractorTest'   # 단일 테스트 클래스

# Frontend 빌드 (타입 체크 + 번들)
cd frontend && npm run build
```

접속: frontend `:5173`, backend `:8080`, postgres `:5432`. Vite 개발 서버와 Nginx 컨테이너 모두 `/api` 요청을 backend `:8080`으로 프록시한다.

## 아키텍처

문서 기반 RAG Q&A 시스템. Spring Boot(Java 21) 백엔드 + Vite/React(TypeScript) 프론트엔드 + PostgreSQL/pgvector. embedding과 chat은 OpenAI 사용.

### Backend 패키지 (`backend/src/main/java/com/example/rag/`)

도메인별 패키지로 계층화: `auth`, `project`, `document`, `chat`, `llm`, `user`, `common`. 각 패키지는 Controller → Service(비즈니스 로직) → Repository 구조. 모든 API 경로는 `/api` 아래에 있고, `/api/auth/**`를 제외한 모든 요청은 JWT를 요구한다.

- **`auth`** — 회원가입/로그인 시 JWT 발급(`JwtService`). `JwtAuthenticationFilter`가 Bearer 토큰을 검증하고 `SecurityContext`를 채운다. `SecurityConfig`는 stateless(세션 없음, CSRF 비활성). 참고: refresh token은 MVP 형태로 access token과 동일하게 반환된다.
- **`project`** — 프로젝트가 문서와 채팅을 소유한다. `ProjectService.requireMember(projectId, userId)`와 `requireAdmin(...)`이 접근 제어 관문이며, **모든 문서·채팅 작업은 먼저 둘 중 하나를 호출한다.** 역할: `ADMIN`(멤버 추가, 문서 삭제) / `MEMBER`. 접근 제어는 **user 단위가 아니라 project 단위**다 — `AGENTS.md` 일부 표현은 이 변경 이전 것이니 코드(`ProjectMember` + 위 가드)를 신뢰하라.
- **`document`** — `DocumentService.upload`는 파일 저장과 문서 record 생성(`UPLOADED`)까지만 동기로 하고 즉시 응답한다. 추출→chunk→embedding→저장은 **`DocumentProcessor.process`가 `@Async`(전용 executor)로 처리**한다: `TextExtractor`(UTF-8 후 MS949 fallback; PDF는 PDFBox + OCR fallback, 이미지도 OCR) → `DocumentChunker`(크기/overlap은 config) → 각 chunk embedding → chunk 저장+`COMPLETED` 전이를 단일 트랜잭션으로 커밋. 상태 전이는 `UPLOADED → PROCESSING → COMPLETED | FAILED`(실패 사유는 상세 응답 `errorMessage`)이며, `COMPLETED` 문서만 검색 대상이 된다. 프론트는 처리 중 문서가 있는 동안 목록을 폴링한다.
- **`chat`** — `ChatService.query`가 RAG 읽기 경로다: 질문을 embedding(최근 history를 반영해 `PromptBuilder.searchText`로 재작성) → vector 검색 → prompt 구성 → chat 모델 호출 → assistant 메시지와 출처용 `AnswerSource` 행 저장. 세션은 최대 `MAX_HISTORY_MESSAGES`(20)개의 맥락을 유지한다.
- **`llm`** — `EmbeddingModelClient` / `ChatModelClient` 인터페이스 뒤의 얇은 OpenAI 클라이언트. 모델명과 base URL은 `app.openai.*` 설정에서 온다.
- **`common`** — `ApiException` + `GlobalExceptionHandler`가 일관된 `ApiErrorResponse`를 생성한다. 예상 가능한 오류는 `ApiException(HttpStatus, message)`를 던진다.

### 벡터 저장과 검색 — 핵심적이고 자명하지 않은 부분

embedding은 pgvector의 `vector(1536)` 타입을 쓰는데, JPA로 매핑할 수 없다. 그래서 `document_chunks`는 JPA가 아니라 **`DocumentChunkJdbcRepository`의 raw SQL**(`NamedParameterJdbcTemplate`)로 쓰고 조회한다 — embedding은 `[..]` 벡터 리터럴로 전달되어 `CAST(:embedding AS vector)`로 캐스팅된다. JPA `DocumentChunkRepository`는 count와 id 조회용으로만 존재한다.

`search(...)`는 코사인 거리(`<=>`, HNSW 인덱스)로 정렬하고, 프로젝트의 `COMPLETED` 문서(및 선택적 `documentIds`)로 필터링한다. 그리고 중요한 점으로 — `LATERAL` 조인이 **각 검색 결과를 인접 chunk(chunk_index ±1)까지 확장**해서, LLM이 고립된 조각이 아니라 주변 맥락을 함께 받도록 한다.

관련성 게이트: `ChatService.hasSearchContext`는 **최상위 결과의 similarity만** `app.rag.similarity-threshold`와 비교한다. 임계값을 넘는 결과가 없고 채팅 history도 없으면, chat 모델을 호출하지 않고 고정된 "관련 정보 없음" 답변으로 단락 처리한다.

### Database

Flyway 마이그레이션은 `backend/src/main/resources/db/migration/`에 있다 (`V1` 스키마, `V2` 프로젝트/멤버 추가 + 기존 문서 backfill, `V3` 세션-프로젝트 연결). JPA는 `ddl-auto: validate`로 동작하므로 — **스키마 변경은 새 Flyway 마이그레이션으로** 처리하고, entity만 변경하지 않는다. embedding 차원(1536)은 `text-embedding-3-small`에 맞춰져 있어, embedding 모델을 바꾸면 컬럼 차원 변경과 재-embedding이 필요하다.

### 설정

`backend/src/main/resources/application.yml`이 환경변수를 타입이 지정된 `@ConfigurationProperties`(`JwtProperties`, `OpenAiProperties`, `RagProperties`, `StorageProperties`)에 바인딩한다. RAG 파라미터: `RAG_CHUNK_SIZE`(800), `RAG_CHUNK_OVERLAP`(150), `RAG_TOP_K`(5), `RAG_SIMILARITY_THRESHOLD`. 참고로 임계값 **기본값이 소스마다 다르다** — `application.yml`은 `0.70`, `.env.example`/README는 `0.20`이다. 실제 적용값은 `.env`가 설정한 값이므로, 검색 결과가 나오거나 안 나오는 이유를 따질 때 먼저 확인하라.

### Frontend (`frontend/src/`)

단일 페이지 테스트 클라이언트: `App.tsx`가 인증 + 워크스페이스 상태를 조율하고, `api.ts`가 모든 `/api` 호출을 감싸며 JWT를 붙인다. `components/`에 화면들이 있다(`AuthScreen`, `WorkspaceMain`/`WorkspaceSidebar`, `UploadForm`, `MemberManagement`). 답변은 Markdown으로 렌더링한다(`react-markdown` + `remark-gfm`). 얇은 클라이언트로 유지하라 — UI 라이브러리를 추가하거나 백엔드가 반환하지 않는 응답 구조를 가정하지 않는다.
