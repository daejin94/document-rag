# 텔레그램 챗봇 연동

외부 채팅 플랫폼(텔레그램)에서 봇에게 질문하면, RAG API로 전달해 프로젝트 문서 기반 답변을 채팅방으로 응답한다.

## 구조 — 봇 = 프로젝트

봇 토큰을 **프로젝트에 등록**한다. 그 봇이 받은 모든 메시지(DM·그룹)는 등록된 프로젝트 문서로 답한다. 채널별 바인딩은 없다.

```
[1층] 봇 ↔ 프로젝트   ← 봇 토큰 등록 (bot_installations, 프로젝트 ADMIN)
        ▼  "이 봇이 받은 질문은 이 프로젝트로"
[2층] 텔레그램 유저 ↔ 앱 계정   ← /link (identity_links, 본인)
        ▼  "질문한 사람이 그 프로젝트 멤버인지"
[3층] RAG 질의   ← ChatService.query (requireMember로 권한 검증)
```

- **한 봇 = 한 프로젝트.** 한 프로젝트에 봇을 여러 개 둘 수는 있으나, 한 봇 토큰은 한 프로젝트에만 속한다.
- 한 봇은 여러 DM·여러 그룹에 들어갈 수 있고, 그 메시지는 모두 같은 프로젝트로 답한다.

## 권한 — `/link` + 멤버십

답변을 받으려면 두 조건을 모두 만족해야 한다.

1. 텔레그램 계정이 `/link`로 앱 계정에 연결돼 있다(`identity_links`).
2. 연결된 앱 계정이 그 봇의 프로젝트 **멤버**다.

연결 안 됨 → "계정을 연결해 주세요" 안내. 연결됐지만 멤버 아님 → `ChatService.query`의 `requireMember`가 막아 "프로젝트 접근 권한이 없습니다" 응답.

## 수신 모드

`app.integration.telegram.mode`로 전환하며, 등록된 모든 봇에 공통 적용한다.

| 모드 | 동작 | 용도 |
|---|---|---|
| `polling` | 백엔드가 등록된 모든 봇의 `getUpdates`를 주기 폴링(단일 스레드, 봇별 offset) | 로컬·WSL 등 공개 URL 없음 |
| `webhook` | 봇 등록 시 `setWebhook`으로 `/api/integrations/telegram/webhook/{installationId}` 등록. 설치별 secret token으로 검증 | 공개 HTTPS URL(배포·터널) 보유 |
| `off` | 비활성 | 기본값 |

webhook 모드는 `app.integration.telegram.public-base-url`(예: `https://your-host`)이 필요하다. 봇 토큰은 `.env`가 아니라 UI로 등록한다.

## API

봇 등록(프로젝트 ADMIN) — 생성/삭제는 ADMIN, 조회는 멤버.

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/projects/{projectId}/integrations/telegram/bots` | 등록된 봇 목록(토큰은 마스킹) |
| POST | `/api/projects/{projectId}/integrations/telegram/bots` | 봇 등록. body `{ "botToken": "..." }`. `getMe`로 검증 + username 조회 |
| DELETE | `/api/projects/{projectId}/integrations/telegram/bots/{installationId}` | 봇 삭제(웹훅도 해제) |

계정 연결(로그인 사용자).

| Method | Path | 설명 |
|---|---|---|
| POST | `/api/integrations/telegram/link-codes` | 일회용 연결 코드 발급(10분 유효) |

수신(텔레그램 → 백엔드, JWT 없음, secret token으로 보호).

| Method | Path | 설명 |
|---|---|---|
| POST | `/api/integrations/telegram/webhook/{installationId}` | webhook 수신. `X-Telegram-Bot-Api-Secret-Token` 검증 |

## 등록 순서

사전(운영자, 1회): `.env`에 `TELEGRAM_ENABLED=true`, `TELEGRAM_MODE=polling`(또는 webhook) 설정 후 백엔드 기동.

1. **봇 생성** — 텔레그램 @BotFather `/newbot` → 토큰 발급.
2. **봇 등록**(프로젝트 ADMIN) — 웹앱에서 프로젝트 선택 → 헤더 **텔레그램 봇** → 토큰 입력 → 등록.
3. **계정 연결**(본인) — 프로필 ▸ **텔레그램 연결** → 코드 발급 → 텔레그램에서 `/link <코드>`.
4. **질문** — DM은 그냥 질문, 그룹은 `/ask 질문` 또는 `@봇 질문`.

## 봇 명령

| 입력 | 동작 |
|---|---|
| `/start`, `/help` | 사용 안내 |
| `/link <코드>` | 앱에서 발급한 코드로 계정 연결 |
| `/ask <질문>` | 질문(그룹에서 권장) |
| 일반 텍스트 | 질문(주로 1:1 DM) |

그룹에서는 텔레그램 기본 privacy mode 때문에 봇이 `/명령`·`@멘션`·답글만 수신한다. 모든 메시지를 받게 하려면 @BotFather에서 privacy를 끄거나 봇을 그룹 관리자로 둔다.

## 처리 흐름

```
수신(webhook/poller) → TelegramUpdateService(명령 분기)
  → InboundMessageService.intake (멱등성: installation+update_id, 계정 연결 확인)
  → @Async BotQueryWorker → ChatService.query(userId, projectId, ...)  # 기존 RAG 경로 재사용
  → 받은 봇 토큰으로 같은 채널에 답변 + 출처 전송
```

- **멱등성**: `inbound_messages`의 `(installation_id, provider_event_id)` 유니크로 중복 수신 차단.
- **세션 연속성**: 같은 봇+사용자의 최근 세션을 재사용해 후속 질문에 맥락을 잇는다.
- **비동기**: 수신 스레드는 즉시 반환하고 RAG 질의는 `botQueryExecutor`(인메모리 스레드풀)에서 처리한다. 인스턴스 재시작 시 인플라이트는 유실될 수 있다(후속: 영속 큐).

## 관련 코드/스키마

- 백엔드: `backend/.../integration/{config,common,telegram}`
- 마이그레이션: `V10__add_chat_integrations.sql`(identity_links·inbound_messages·telegram_link_codes), `V11__bot_installations.sql`(bot_installations, inbound_messages 재정의)
- 설정: `application.yml`의 `app.integration.telegram.*`, `.env.example`의 `TELEGRAM_*`
- 프론트: `WorkspaceMain.tsx`(텔레그램 봇/연결 모달), `api.ts`

## 후속 가능 항목

- 봇 토큰 암호화 저장(현재 평문), Slack 연동, 영속 작업 큐(재시도/DLQ), 출처 리치 렌더링, 레이트 리밋.
