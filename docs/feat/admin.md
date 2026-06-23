# 관리자와 토큰 사용량 기능

이 문서는 `SUPER_ADMIN` 관리자 기능과 토큰 사용량 추적을 정리합니다.

## 전역 사용자 역할

`app_users.role`(`UserRole`)은 전역 역할이다. 프로젝트 멤버 역할(ADMIN/MEMBER)과는 별개다.

| 역할 | 의미 |
|---|---|
| `USER` | 일반 사용자. 회원가입 시 기본값 |
| `SUPER_ADMIN` | 시스템 관리자. `/api/admin/**` 접근 가능 |

- `SUPER_ADMIN` 승격은 회원가입으로는 불가능하고, DB 초기화 또는 수동 변경으로만 부여한다.
- 프론트엔드는 JWT의 `role` 클레임으로 화면을 가른다. 토큰 역할이 `SUPER_ADMIN`이면 워크스페이스 대신 관리자 화면(`AdminApp`)을 렌더링한다.

## 관리자 인증 가드

`/api/admin/**`의 모든 엔드포인트는 처리 전에 `AdminService.requireSuperAdmin(userId)`를 호출한다.

- 사용자가 존재하고, 삭제되지 않았고, `role == SUPER_ADMIN`인지 확인한다.
- 조건을 만족하지 못하면 `403`("관리자 권한이 필요합니다.")을 던진다.

JWT만으로는 부족하다 — 일반 `USER` 토큰으로 `/api/admin/**`을 호출하면 `403`이다.

## API

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/admin/usage/daily` | 전체 시스템 일자별 토큰 사용량 |
| GET | `/api/admin/users` | 승인된 사용자 목록(+누적 토큰) |
| GET | `/api/admin/users/pending` | 승인 대기 가입 신청 목록 |
| POST | `/api/admin/users/{userId}/approve` | 가입 승인 |
| POST | `/api/admin/users/{userId}/reject` | 가입 거절 |
| GET | `/api/admin/users/{userId}/usage/daily` | 사용자별 일자별 사용량 |
| DELETE | `/api/admin/users/{userId}` | 사용자 soft delete |
| GET | `/api/admin/projects` | 전체 프로젝트 목록(+멤버, 누적 토큰) |
| GET | `/api/admin/projects/{projectId}/usage/daily` | 프로젝트별 일자별 사용량 |

일자별 사용량 엔드포인트는 선택 쿼리 파라미터 `from`, `to`(ISO date, 예: `2026-06-01`)로 기간을 제한할 수 있다. 요청/응답 본문은 [api.md](../api.md)를 참고한다.

## 가입 승인

회원가입은 즉시 활성화되지 않고 **승인 대기(PENDING)** 상태로 생성된다(`app_users.status`, `UserStatus`).

| status | 의미 | 로그인 |
|---|---|---|
| `PENDING` | 가입 신청 후 승인 대기 | 불가(`403`) |
| `APPROVED` | 관리자 승인 완료 | 가능 |
| `REJECTED` | 관리자 거절 | 불가(`403`) |

- 로그인 시 비밀번호 검증 후 상태를 확인한다(`AuthService.login`). `PENDING`/`REJECTED`는 `403`.
- 승인(`approve`)은 `PENDING → APPROVED`, 거절(`reject`)은 `PENDING → REJECTED`. 대상이 PENDING이 아니면 `400`.
- 사용자 목록(`GET /api/admin/users`)은 `APPROVED`만, 승인 대기 목록(`GET /api/admin/users/pending`)은 `PENDING`만 반환한다.
- **관리자(`SUPER_ADMIN`) 계정은 자기 자신을 승인할 수 없으므로**, `SuperAdminInitializer`가 승격 시 함께 `APPROVED`로 처리한다.
- 기존 사용자는 `V8` 마이그레이션에서 `APPROVED`로 백필된다.
- 프론트엔드 관리자 콘솔에 "가입 승인" 탭(`UserApproval`)이 있다.

## 사용자 삭제

- soft delete다. `app_users.deleted_at`을 현재 시각으로 설정한다.
- **자기 자신은 삭제할 수 없다**(`400`).
- 이미 삭제된 사용자를 다시 삭제하려 하면 `400`이다.
- 사용자 목록은 삭제되지 않은 사용자만 반환한다.

## 토큰 사용량 추적

OpenAI 호출마다 `token_usages` 테이블에 사용량을 기록한다. 기록은 `TokenUsageRecorder.record(...)`가 담당하며, **prompt/completion 토큰이 모두 0이면 저장하지 않는다.**

`usage_type`(`TokenUsageType`)으로 호출 종류를 구분한다.

| usage_type | 발생 위치 | 기록 토큰 |
|---|---|---|
| `CHAT` | 질문 답변 생성(Chat 모델) | promptTokens + completionTokens |
| `EMBEDDING_QUERY` | 질문 embedding(검색용) | promptTokens(=총 토큰) |
| `EMBEDDING_UPLOAD` | 문서 업로드 시 chunk embedding | promptTokens(=총 토큰) |

각 행은 `user_id`, `project_id`(nullable), `session_id`(nullable), `model`, `prompt_tokens`, `completion_tokens`, `total_tokens`, `created_at`을 가진다.

## 사용량 집계 규칙

관리자 일자별 사용량(`DailyUsageResponse`)은 다음과 같이 나눈다.

- `chatPromptTokens`, `chatCompletionTokens` — `usage_type = 'CHAT'`인 행의 prompt/completion 합.
- `embeddingTokens` — `usage_type <> 'CHAT'`(즉 `EMBEDDING_QUERY` + `EMBEDDING_UPLOAD`)인 행의 `total_tokens` 합.
- `totalTokens` — 위 전체의 합.

집계의 날짜 그룹화는 **KST(Asia/Seoul)** 기준이다.

## 주의사항

- `requireSuperAdmin` 가드를 우회하지 않는다.
- 토큰 사용량 기록을 RAG/업로드 흐름에서 제거하지 않는다.
- chat/embedding 구분(`usage_type`)을 유지한다 — 관리자 집계가 이 구분에 의존한다.
