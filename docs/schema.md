# 데이터베이스 스키마

PostgreSQL + pgvector 기준이다. 스키마 변경은 **JPA entity만 바꾸지 않고 새 Flyway 마이그레이션**으로 처리한다(`ddl-auto: validate`). 마이그레이션은 `backend/src/main/resources/db/migration/`에 있다.

## 마이그레이션 이력

| 버전 | 파일 | 내용 |
|---|---|---|
| V1 | `V1__init.sql` | 초기 스키마: `app_users`, `documents`, `document_chunks`, `chat_sessions`, `chat_messages`, `answer_sources`. HNSW 벡터 인덱스 포함 |
| V2 | `V2__add_projects.sql` | `projects`, `project_members` 추가. `documents.project_id` 추가 + 기존 문서 backfill 후 `NOT NULL` |
| V3 | `V3__add_project_to_chat_sessions.sql` | `chat_sessions.project_id` 추가 + backfill 후 `NOT NULL` |
| V4 | `V4__add_project_description.sql` | `projects.description` 추가 |
| V5 | `V5__add_project_deletions.sql` | `project_deletions` 추가(프로젝트 soft delete 감사) |
| V6 | `V6__add_token_usages.sql` | `token_usages` 추가(토큰 사용량 추적) |
| V7 | `V7__add_user_role_and_soft_delete.sql` | `app_users.role`, `app_users.deleted_at` 추가 |
| V8 | `V8__add_user_status.sql` | `app_users.status` 추가(가입 승인 상태, 기존 사용자 `APPROVED` 백필) |
| V9 | `V9__add_user_auth_provider.sql` | `app_users.auth_provider`/`provider_id` 추가, `password` NULL 허용(구글 OAuth 계정) |
| V10 | `V10__add_chat_integrations.sql` | 텔레그램 연동 초기: `chat_bindings`(V11에서 제거), `identity_links`, `telegram_link_codes`, `inbound_messages` 추가 |
| V11 | `V11__bot_installations.sql` | `chat_bindings` 제거, `bot_installations` 추가, `inbound_messages.installation_id` 추가 + 멱등성을 (설치, 이벤트) 단위로 재정의 |

## ER 개요

```text
app_users 1──* project_members *──1 projects
app_users 1──* documents *──1 projects
documents 1──* document_chunks
app_users 1──* chat_sessions *──1 projects
chat_sessions 1──* chat_messages 1──* answer_sources *──1 document_chunks
app_users 1──* token_usages   (projects, chat_sessions 선택 참조)
projects  1──1 project_deletions
projects  1──* bot_installations
app_users 1──* identity_links       (외부 플랫폼 사용자 ↔ 앱 계정)
app_users 1──* telegram_link_codes
bot_installations 1──* inbound_messages
```

## 테이블

### app_users

사용자 계정. 전역 역할, 가입 승인 상태, 인증 수단, soft delete를 가진다.

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | BIGSERIAL | PK |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE |
| `password` | VARCHAR(255) | NULL 허용, BCrypt 해시 (구글 OAuth 전용 계정은 비밀번호 없음) |
| `name` | VARCHAR(100) | NOT NULL |
| `role` | VARCHAR(30) | NOT NULL, DEFAULT `'USER'` (`USER` / `SUPER_ADMIN`) |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT `'APPROVED'`(신규 가입은 앱에서 `PENDING`) (`PENDING` / `APPROVED` / `REJECTED`) |
| `auth_provider` | VARCHAR(20) | NOT NULL, DEFAULT `'LOCAL'` (`LOCAL` / `GOOGLE`) |
| `provider_id` | VARCHAR(255) | OAuth 제공자의 사용자 식별자(구글 `sub`), LOCAL 계정은 NULL |
| `deleted_at` | TIMESTAMPTZ | soft delete 시각(NULL이면 활성) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

인덱스: `idx_app_users_role`, `idx_app_users_deleted_at`, `idx_app_users_status`, `idx_app_users_provider`

### projects

문서와 채팅을 소유하는 단위. 접근 제어의 기준이다.

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | BIGSERIAL | PK |
| `name` | VARCHAR(255) | NOT NULL |
| `description` | VARCHAR(500) | nullable (V4) |
| `created_by_user_id` | BIGINT | NOT NULL, FK → app_users(id) ON DELETE CASCADE |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

인덱스: `idx_projects_created_by_user_id`

### project_members

사용자–프로젝트 멤버십과 프로젝트 내 역할.

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | BIGSERIAL | PK |
| `project_id` | BIGINT | NOT NULL, FK → projects(id) ON DELETE CASCADE |
| `user_id` | BIGINT | NOT NULL, FK → app_users(id) ON DELETE CASCADE |
| `role` | VARCHAR(30) | NOT NULL (`ADMIN` / `MEMBER`) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

제약: `UNIQUE(project_id, user_id)`
인덱스: `idx_project_members_project_id`, `idx_project_members_user_id`

### documents

업로드된 원본 문서. 사용자(업로더)와 프로젝트에 모두 연결된다.

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | BIGSERIAL | PK |
| `user_id` | BIGINT | NOT NULL, FK → app_users(id) ON DELETE CASCADE |
| `project_id` | BIGINT | NOT NULL, FK → projects(id) ON DELETE CASCADE (V2) |
| `title` | VARCHAR(255) | NOT NULL |
| `original_file_name` | VARCHAR(255) | NOT NULL |
| `file_path` | VARCHAR(1000) | NOT NULL |
| `content_type` | VARCHAR(255) | nullable |
| `status` | VARCHAR(30) | NOT NULL (`UPLOADED` / `PROCESSING` / `COMPLETED` / `FAILED`) |
| `error_message` | TEXT | 처리 실패 시 메시지 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

인덱스: `idx_documents_user_id`, `idx_documents_project_id`

### document_chunks

문서를 분할한 chunk와 embedding. **`embedding` 컬럼은 JPA로 매핑하지 않고 raw SQL(`DocumentChunkJdbcRepository`)로 읽고 쓴다.**

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | BIGSERIAL | PK |
| `document_id` | BIGINT | NOT NULL, FK → documents(id) ON DELETE CASCADE |
| `chunk_index` | INTEGER | NOT NULL |
| `content` | TEXT | NOT NULL |
| `embedding` | vector(1536) | NOT NULL, `text-embedding-3-small` 차원 |
| `token_count` | INTEGER | nullable, `content.length()/4` 추정 |
| `page_number` | INTEGER | nullable |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

제약: `UNIQUE(document_id, chunk_index)`
인덱스: `idx_document_chunks_document_id`, `idx_document_chunks_embedding_hnsw`(HNSW, `vector_cosine_ops`)

### chat_sessions

채팅 세션. 사용자와 프로젝트에 모두 연결된다.

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | BIGSERIAL | PK |
| `user_id` | BIGINT | NOT NULL, FK → app_users(id) ON DELETE CASCADE |
| `project_id` | BIGINT | NOT NULL, FK → projects(id) ON DELETE CASCADE (V3) |
| `title` | VARCHAR(255) | NOT NULL, 첫 질문 앞부분 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

인덱스: `idx_chat_sessions_user_id`, `idx_chat_sessions_project_id`, `idx_chat_sessions_user_project`

### chat_messages

세션 내 메시지.

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | BIGSERIAL | PK |
| `chat_session_id` | BIGINT | NOT NULL, FK → chat_sessions(id) ON DELETE CASCADE |
| `role` | VARCHAR(30) | NOT NULL (`USER` / `ASSISTANT`) |
| `content` | TEXT | NOT NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

인덱스: `idx_chat_messages_session_id`

### answer_sources

assistant 답변이 근거로 사용한 chunk(출처).

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | BIGSERIAL | PK |
| `chat_message_id` | BIGINT | NOT NULL, FK → chat_messages(id) ON DELETE CASCADE |
| `document_chunk_id` | BIGINT | NOT NULL, FK → document_chunks(id) ON DELETE CASCADE |
| `similarity_score` | DOUBLE PRECISION | NOT NULL |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

인덱스: `idx_answer_sources_message_id`

### token_usages

OpenAI 호출별 토큰 사용량(V6). 집계 규칙은 [feat/admin.md](feat/admin.md)를 참고한다.

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | BIGSERIAL | PK |
| `user_id` | BIGINT | NOT NULL, FK → app_users(id) ON DELETE CASCADE |
| `project_id` | BIGINT | nullable, FK → projects(id) ON DELETE SET NULL |
| `session_id` | BIGINT | nullable, FK → chat_sessions(id) ON DELETE SET NULL |
| `usage_type` | VARCHAR(30) | NOT NULL (`CHAT` / `EMBEDDING_QUERY` / `EMBEDDING_UPLOAD`) |
| `model` | VARCHAR(100) | NOT NULL |
| `prompt_tokens` | INT | NOT NULL, DEFAULT 0 |
| `completion_tokens` | INT | NOT NULL, DEFAULT 0 |
| `total_tokens` | INT | NOT NULL, DEFAULT 0 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

인덱스: `idx_token_usages_user_created`(user_id, created_at), `idx_token_usages_project`

### project_deletions

프로젝트 soft delete 감사 기록(V5). 행이 존재하면 삭제된 프로젝트다.

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | BIGSERIAL | PK |
| `project_id` | BIGINT | NOT NULL, UNIQUE, FK → projects(id) ON DELETE CASCADE |
| `deleted_by_user_id` | BIGINT | NOT NULL, FK → app_users(id) ON DELETE CASCADE |
| `deleted_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

인덱스: `idx_project_deletions_deleted_by_user_id`

### bot_installations

프로젝트에 등록된 봇. 봇이 받은 메시지는 이 설치가 가리키는 프로젝트로 라우팅된다(봇 = 프로젝트). (V11)

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | BIGSERIAL | PK |
| `platform` | VARCHAR(20) | NOT NULL (`TELEGRAM`) |
| `project_id` | BIGINT | NOT NULL, FK → projects(id) ON DELETE CASCADE |
| `bot_token` | VARCHAR(255) | NOT NULL (현재 평문 저장) |
| `bot_username` | VARCHAR(100) | nullable (`getMe`로 조회) |
| `secret_token` | VARCHAR(100) | NOT NULL (webhook 헤더 검증용, 설치마다 무작위) |
| `created_by_user_id` | BIGINT | NOT NULL, FK → app_users(id) ON DELETE CASCADE |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

제약: `UNIQUE(platform, bot_token)`
인덱스: `idx_bot_installations_project_id`

### identity_links

외부 플랫폼 사용자 ↔ 앱 계정 매핑. 매핑된 계정의 권한으로 RAG 질의를 수행한다. (V10)

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | BIGSERIAL | PK |
| `platform` | VARCHAR(20) | NOT NULL |
| `external_user_id` | VARCHAR(100) | NOT NULL (텔레그램 user id 등) |
| `user_id` | BIGINT | NOT NULL, FK → app_users(id) ON DELETE CASCADE |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

제약: `UNIQUE(platform, external_user_id)`
인덱스: `idx_identity_links_user_id`

### telegram_link_codes

텔레그램 계정 연결용 일회용 코드. 앱에서 발급하고 채팅방의 `/link <code>`로 소비한다. (V10)

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | BIGSERIAL | PK |
| `code` | VARCHAR(64) | NOT NULL, UNIQUE |
| `user_id` | BIGINT | NOT NULL, FK → app_users(id) ON DELETE CASCADE |
| `expires_at` | TIMESTAMPTZ | NOT NULL (발급 후 10분) |
| `used_at` | TIMESTAMPTZ | nullable (사용 시각) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

인덱스: `idx_telegram_link_codes_user_id`

### inbound_messages

외부 플랫폼 수신 질문의 비동기 작업 큐이자 멱등성 키 저장소. (V10, `installation_id`는 V11)

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | BIGSERIAL | PK |
| `platform` | VARCHAR(20) | NOT NULL |
| `installation_id` | BIGINT | nullable, 메시지를 받은 봇 설치 (V11) |
| `provider_event_id` | VARCHAR(200) | NOT NULL (텔레그램 update_id) |
| `channel_id` | VARCHAR(100) | NOT NULL (텔레그램 chat_id) |
| `external_user_id` | VARCHAR(100) | nullable |
| `question` | TEXT | NOT NULL |
| `reply_ref` | VARCHAR(100) | nullable (답글 대상 message_id) |
| `status` | VARCHAR(20) | NOT NULL (`PENDING`/`PROCESSING`/`DONE`/`FAILED`/`SKIPPED`) |
| `chat_session_id` | BIGINT | nullable (생성된 ChatSession) |
| `error` | TEXT | nullable |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() |

제약: `UNIQUE(installation_id, provider_event_id)` (중복 수신 차단, V11)
인덱스: `idx_inbound_messages_conversation` (installation_id, external_user_id, created_at DESC)

## 참고

- embedding 차원(1536)은 `text-embedding-3-small`에 맞춰져 있다. embedding 모델을 바꾸면 컬럼 차원 변경과 재-embedding이 필요하다.
- soft delete: `app_users`(`deleted_at`), `projects`(`project_deletions`). 문서·세션·메시지는 hard delete이며 FK `ON DELETE CASCADE`로 연관 데이터를 정리한다.
- 텔레그램 봇 토큰(`bot_installations.bot_token`)은 현재 평문으로 저장한다. 운영 시 암호화는 후속 과제다. 연동 흐름은 [feat/telegram-bot.md](feat/telegram-bot.md)를 참고한다.
- 벡터 저장/검색의 자세한 내용은 [feat/rag-flow.md](feat/rag-flow.md), 루트 `CLAUDE.md`를 참고한다.
