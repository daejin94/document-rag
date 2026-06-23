# 프로젝트와 멤버 기능

이 문서는 프로젝트 단위 접근 제어, 멤버 관리, 역할 흐름을 정리합니다.

접근 제어는 **user 단위가 아니라 project 단위**다. 문서와 채팅은 모두 프로젝트에 속하며, 프로젝트 멤버만 접근할 수 있다. (AGENTS.md 일부 표현은 이 변경 이전의 user 단위 설명이므로, 코드(`ProjectMember` + 아래 가드)를 신뢰한다.)

## API

| Method | Path | 권한 | 설명 |
|---|---|---|---|
| POST | `/api/projects` | 인증 | 프로젝트 생성 |
| GET | `/api/projects` | 인증 | 내가 속한 프로젝트 목록 |
| DELETE | `/api/projects/{projectId}` | 프로젝트 ADMIN | 프로젝트 삭제(soft delete) |
| GET | `/api/projects/{projectId}/members` | 프로젝트 멤버 | 멤버 목록 |
| POST | `/api/projects/{projectId}/members` | 프로젝트 ADMIN | 멤버 추가 |
| DELETE | `/api/projects/{projectId}/members/{memberUserId}` | 프로젝트 ADMIN | 멤버 제거 |

요청/응답 본문은 [api.md](../api.md)를 참고한다.

## 역할

프로젝트 멤버 역할(`ProjectRole`)은 두 가지다.

| 역할 | 권한 |
|---|---|
| `ADMIN` | 멤버 추가/제거, 문서 삭제, 프로젝트 삭제 |
| `MEMBER` | 문서 업로드, 질문, 프로젝트 내용 조회 |

전역 사용자 역할(`UserRole`: `USER` / `SUPER_ADMIN`)과는 별개다. 전역 역할은 [admin.md](admin.md)를 참고한다.

## 접근 제어 가드

모든 문서·채팅 작업은 처리 전에 둘 중 하나를 **먼저** 호출한다. `ProjectService`에 있다.

- `requireMember(projectId, userId)` — 해당 프로젝트의 멤버가 아니면 `403`을 던진다.
- `requireAdmin(projectId, userId)` — 프로젝트 `ADMIN`이 아니면 `403`을 던진다.

가드는 Spring `@PreAuthorize` 애너테이션이 아니라 **명시적인 메서드 호출**이다. 새 엔드포인트를 추가할 때도 이 패턴을 그대로 따른다.

작업별 최소 권한:

| 작업 | 최소 권한 |
|---|---|
| 문서 목록/상세/업로드 | 멤버 |
| 질문, 세션/메시지 조회 | 멤버 |
| 문서 삭제 | ADMIN |
| 멤버 추가/제거, 프로젝트 삭제 | ADMIN |

## 프로젝트 생성

1. 인증 사용자 id로 프로젝트를 생성한다.
2. **생성자는 자동으로 해당 프로젝트의 `ADMIN` 멤버**가 된다.
3. `projectId`, `name`, `description`, `role`(생성자 기준), `createdAt`을 반환한다.

`name`은 필수(최대 255자), `description`은 선택(최대 500자)이다.

## 멤버 추가

1. `requireAdmin`으로 요청자가 ADMIN인지 확인한다.
2. `email`로 사용자를 조회한다. 없으면 사용자를 찾을 수 없다는 오류를 반환한다.
3. 이미 멤버이면 `409 Conflict`를 반환한다.
4. `role`을 지정하지 않으면 `MEMBER`로 추가한다.

## 멤버 제거

1. `requireAdmin`으로 요청자가 ADMIN인지 확인한다.
2. **자기 자신은 제거할 수 없다**(`400`).
3. **프로젝트의 마지막 ADMIN은 제거할 수 없다**(`400`). 항상 ADMIN이 최소 1명 남아야 한다.

## 프로젝트 삭제

- 프로젝트 삭제는 **soft delete**다. `project_deletions` 테이블에 삭제자/삭제 시각을 기록한다.
- 이미 삭제된 프로젝트를 다시 삭제하려 하면 오류를 반환한다.
- 삭제된 프로젝트는 목록과 접근에서 제외된다.

## 데이터 스코프

- `documents.project_id`, `chat_sessions.project_id`가 모두 `NOT NULL`이다. 문서와 세션은 반드시 하나의 프로젝트에 속한다.
- 문서 조회는 `findByIdAndProjectId`(documentId + projectId 이중 키), 세션 조회는 `findByIdAndUserIdAndProjectId`(sessionId + userId + projectId 삼중 키)로 격리한다.
- 다른 프로젝트의 문서 id를 `documentIds`로 보내면 질문 시 `403`을 반환한다.

## 주의사항

- 문서·채팅 작업 전 `requireMember`/`requireAdmin` 호출을 생략하지 않는다.
- 접근 제어를 user 단위로 되돌리지 않는다.
- 마지막 ADMIN 제거 방지 규칙을 우회하지 않는다.
