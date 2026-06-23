# API 목록

기본 주소:

```text
http://localhost:8080
```

Frontend에서는 `/api` 프록시를 기준으로 호출한다.

## 공통

인증이 필요한 API는 `Authorization` 헤더를 사용한다.

```text
Authorization: Bearer <ACCESS_TOKEN>
```

에러 응답:

```json
{
  "timestamp": "2026-05-15T00:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "에러 메시지"
}
```

## Auth

| Method | Path | 인증 | 설명 |
|---|---|---|---|
| POST | `/api/auth/signup` | 불필요 | 회원가입 |
| POST | `/api/auth/login` | 불필요 | 로그인 |

### 회원가입

```http
POST /api/auth/signup
Content-Type: application/json
```

요청:

```json
{
  "email": "user@example.com",
  "password": "password1234",
  "name": "대진"
}
```

응답:

```json
{
  "userId": 1,
  "email": "user@example.com",
  "name": "대진"
}
```

가입한 계정은 **승인 대기(PENDING)** 상태로 생성되며, 관리자가 승인하기 전까지는 로그인할 수 없다. 승인 처리는 [feat/admin.md](feat/admin.md)를 참고한다.

### 로그인

```http
POST /api/auth/login
Content-Type: application/json
```

요청:

```json
{
  "email": "user@example.com",
  "password": "password1234"
}
```

응답:

```json
{
  "accessToken": "<JWT>",
  "refreshToken": "<JWT>"
}
```

현재 MVP에서는 `refreshToken`이 `accessToken`과 동일하게 반환된다. JWT payload에는 전역 역할 `role`(`USER` / `SUPER_ADMIN`) 클레임이 포함되며, 프론트엔드는 이 값으로 관리자 화면 진입을 가른다.

가입 승인 상태에 따라 로그인이 제한된다. 비밀번호 검증 후 상태를 확인하며, `PENDING`(승인 대기)·`REJECTED`(거절)인 계정은 `403`을 반환한다.

## 접근 제어 개요

접근 제어는 **project 단위**다. 문서와 채팅은 프로젝트에 속하며, 경로도 `/api/projects/{projectId}/...` 아래에 있다. 각 작업은 처리 전에 `requireMember`(멤버) 또는 `requireAdmin`(프로젝트 ADMIN) 가드를 통과해야 하고, 권한이 없으면 `403`을 반환한다. 자세한 규칙은 [feat/projects.md](feat/projects.md)를 참고한다.

`/api/admin/**`는 전역 `SUPER_ADMIN`만 접근할 수 있다. [feat/admin.md](feat/admin.md)를 참고한다.

## Projects

| Method | Path | 권한 | 설명 |
|---|---|---|---|
| POST | `/api/projects` | 인증 | 프로젝트 생성 |
| GET | `/api/projects` | 인증 | 내가 속한 프로젝트 목록 |
| DELETE | `/api/projects/{projectId}` | 프로젝트 ADMIN | 프로젝트 삭제 |
| GET | `/api/projects/{projectId}/members` | 프로젝트 멤버 | 멤버 목록 |
| POST | `/api/projects/{projectId}/members` | 프로젝트 ADMIN | 멤버 추가 |
| DELETE | `/api/projects/{projectId}/members/{memberUserId}` | 프로젝트 ADMIN | 멤버 제거 |

### 프로젝트 생성

```http
POST /api/projects
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

요청:

```json
{
  "name": "제품 매뉴얼",
  "description": "선택, 최대 500자"
}
```

응답(생성자는 자동으로 ADMIN):

```json
{
  "projectId": 1,
  "name": "제품 매뉴얼",
  "description": "선택, 최대 500자",
  "role": "ADMIN",
  "createdAt": "2026-06-01T00:00:00Z"
}
```

### 프로젝트 목록

```http
GET /api/projects
Authorization: Bearer <ACCESS_TOKEN>
```

응답:

```json
[
  {
    "projectId": 1,
    "name": "제품 매뉴얼",
    "description": null,
    "role": "ADMIN",
    "createdAt": "2026-06-01T00:00:00Z"
  }
]
```

`role`은 해당 사용자의 그 프로젝트 내 역할이다.

### 프로젝트 삭제

```http
DELETE /api/projects/1
Authorization: Bearer <ACCESS_TOKEN>
```

응답:

```json
{
  "deleted": true
}
```

삭제는 soft delete이며 ADMIN만 가능하다.

### 멤버 목록

```http
GET /api/projects/1/members
Authorization: Bearer <ACCESS_TOKEN>
```

응답:

```json
[
  {
    "userId": 1,
    "email": "owner@example.com",
    "name": "대진",
    "role": "ADMIN",
    "joinedAt": "2026-06-01T00:00:00Z"
  }
]
```

### 멤버 추가

```http
POST /api/projects/1/members
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

요청(`role` 생략 시 `MEMBER`):

```json
{
  "email": "member@example.com",
  "role": "MEMBER"
}
```

응답:

```json
{
  "userId": 2,
  "email": "member@example.com",
  "name": "민수",
  "role": "MEMBER",
  "joinedAt": "2026-06-02T00:00:00Z"
}
```

이미 멤버이면 `409 Conflict`를 반환한다.

### 멤버 제거

```http
DELETE /api/projects/1/members/2
Authorization: Bearer <ACCESS_TOKEN>
```

응답:

```json
{
  "deleted": true
}
```

자기 자신이거나 프로젝트의 마지막 ADMIN이면 `400`을 반환한다.

## Documents

| Method | Path | 권한 | 설명 |
|---|---|---|---|
| POST | `/api/projects/{projectId}/documents` | 프로젝트 멤버 | 문서 업로드 |
| GET | `/api/projects/{projectId}/documents` | 프로젝트 멤버 | 문서 목록 조회 |
| GET | `/api/projects/{projectId}/documents/{documentId}` | 프로젝트 멤버 | 문서 상세 조회 |
| DELETE | `/api/projects/{projectId}/documents/{documentId}` | 프로젝트 ADMIN | 문서 삭제 |

### 문서 업로드

```http
POST /api/projects/1/documents
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: multipart/form-data
```

요청 필드:

| 필드 | 타입 | 설명 |
|---|---|---|
| `title` | string | 문서 제목 |
| `file` | file | TXT, Markdown, PDF 파일 |

응답:

```json
{
  "documentId": 1,
  "title": "Spring Security Guide",
  "status": "COMPLETED"
}
```

### 문서 목록

```http
GET /api/projects/1/documents
Authorization: Bearer <ACCESS_TOKEN>
```

응답:

```json
[
  {
    "documentId": 1,
    "title": "Spring Security Guide",
    "originalFileName": "spring-security-guide.md",
    "status": "COMPLETED",
    "createdAt": "2026-05-15T00:00:00Z"
  }
]
```

### 문서 상세

```http
GET /api/projects/1/documents/1
Authorization: Bearer <ACCESS_TOKEN>
```

응답:

```json
{
  "documentId": 1,
  "title": "Spring Security Guide",
  "originalFileName": "spring-security-guide.md",
  "status": "COMPLETED",
  "chunkCount": 3,
  "createdAt": "2026-05-15T00:00:00Z"
}
```

### 문서 삭제

```http
DELETE /api/projects/1/documents/1
Authorization: Bearer <ACCESS_TOKEN>
```

응답:

```json
{
  "deleted": true
}
```

문서 삭제는 프로젝트 ADMIN만 가능하다.

## Chat

| Method | Path | 권한 | 설명 |
|---|---|---|---|
| POST | `/api/projects/{projectId}/chat/query` | 프로젝트 멤버 | 문서 기반 질문 |
| GET | `/api/projects/{projectId}/chat/sessions` | 프로젝트 멤버 | 채팅 세션 목록 |
| GET | `/api/projects/{projectId}/chat/sessions/{sessionId}/messages` | 프로젝트 멤버 | 세션 메시지 목록 |

### 질문

```http
POST /api/projects/1/chat/query
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

요청:

```json
{
  "question": "JWT 인증 흐름 설명해줘.",
  "documentIds": [1],
  "sessionId": null
}
```

`documentIds`가 비어 있거나 `null`이면 프로젝트의 `COMPLETED` 문서 전체를 검색 대상으로 삼는다. `documentIds`에 다른 프로젝트의 문서 id가 포함되면 `403`을 반환한다.
`sessionId`가 `null`이거나 없으면 새 채팅 세션을 생성한다. 기존 세션 id를 보내면 해당 세션의 최근 대화 맥락을 함께 사용한다.

응답:

```json
{
  "sessionId": 1,
  "answer": "답변 내용",
  "sources": [
    {
      "documentId": 1,
      "documentTitle": "Spring Security Guide",
      "chunkId": 10,
      "chunkIndex": 0,
      "similarity": 0.82,
      "contentPreview": "근거 chunk 미리보기"
    }
  ],
  "model": {
    "chatModel": "gpt-4o-mini",
    "embeddingModel": "text-embedding-3-small"
  },
  "usage": {
    "promptTokens": 100,
    "completionTokens": 50
  }
}
```

새 세션에서 검색 결과가 없거나 similarity threshold를 넘지 못하면 `sources`는 빈 배열이고 아래 답변이 반환된다.

```text
등록된 문서에서 관련 정보를 찾을 수 없습니다.
```

기존 세션의 후속 질문인 경우 검색 결과가 threshold를 넘지 못해도 최근 대화 맥락을 기반으로 요약, 재설명, 형식 변경 같은 요청을 처리할 수 있다. 이때 새 문서 근거가 없으면 `sources`는 빈 배열이다.

### 채팅 세션 목록

```http
GET /api/projects/1/chat/sessions
Authorization: Bearer <ACCESS_TOKEN>
```

응답:

```json
[
  {
    "sessionId": 1,
    "title": "JWT 인증 흐름 설명해줘.",
    "createdAt": "2026-05-15T00:00:00Z",
    "updatedAt": "2026-05-15T00:00:01Z"
  }
]
```

### 세션 메시지 목록

```http
GET /api/projects/1/chat/sessions/1/messages
Authorization: Bearer <ACCESS_TOKEN>
```

응답:

```json
[
  {
    "role": "USER",
    "content": "JWT 인증 흐름 설명해줘.",
    "sources": [],
    "createdAt": "2026-05-15T00:00:00Z"
  },
  {
    "role": "ASSISTANT",
    "content": "답변 내용",
    "sources": [
      {
        "documentId": 1,
        "documentTitle": "Spring Security Guide",
        "chunkId": 10,
        "chunkIndex": 0,
        "similarity": 0.82,
        "contentPreview": "근거 chunk 미리보기"
      }
    ],
    "createdAt": "2026-05-15T00:00:01Z"
  }
]
```

## Admin

전역 `SUPER_ADMIN`만 접근할 수 있다. 일반 `USER` 토큰으로 호출하면 `403`을 반환한다. 자세한 내용은 [feat/admin.md](feat/admin.md)를 참고한다.

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/admin/usage/daily` | 시스템 전체 일자별 토큰 사용량 |
| GET | `/api/admin/users` | 승인된 사용자 목록(+누적 토큰) |
| GET | `/api/admin/users/pending` | 승인 대기 가입 신청 목록 |
| POST | `/api/admin/users/{userId}/approve` | 가입 승인 |
| POST | `/api/admin/users/{userId}/reject` | 가입 거절 |
| GET | `/api/admin/users/{userId}/usage/daily` | 사용자별 일자별 사용량 |
| DELETE | `/api/admin/users/{userId}` | 사용자 soft delete |
| GET | `/api/admin/projects` | 프로젝트 목록(+멤버, 누적 토큰) |
| GET | `/api/admin/projects/{projectId}/usage/daily` | 프로젝트별 일자별 사용량 |

일자별 사용량 엔드포인트는 선택 쿼리 파라미터 `from`, `to`(ISO date)로 기간을 제한할 수 있다.

### 일자별 사용량

```http
GET /api/admin/usage/daily?from=2026-06-01&to=2026-06-23
Authorization: Bearer <ACCESS_TOKEN>
```

응답(날짜 그룹화는 KST 기준):

```json
[
  {
    "date": "2026-06-01",
    "chatPromptTokens": 1200,
    "chatCompletionTokens": 800,
    "embeddingTokens": 3400,
    "totalTokens": 5400
  }
]
```

`chatPromptTokens`/`chatCompletionTokens`는 `CHAT` 사용분, `embeddingTokens`는 `EMBEDDING_QUERY` + `EMBEDDING_UPLOAD` 사용분이다. 사용자별/프로젝트별 엔드포인트도 같은 형태를 반환한다.

### 사용자 목록

```http
GET /api/admin/users
Authorization: Bearer <ACCESS_TOKEN>
```

응답:

```json
[
  {
    "userId": 1,
    "email": "owner@example.com",
    "name": "대진",
    "role": "USER",
    "status": "APPROVED",
    "createdAt": "2026-06-01T00:00:00Z",
    "totalTokens": 5400
  }
]
```

`status`는 `PENDING` / `APPROVED` / `REJECTED`다. 이 목록은 `APPROVED` 계정만 반환한다.

### 가입 승인 / 거절

```http
GET  /api/admin/users/pending      # 승인 대기 목록(status=PENDING)
POST /api/admin/users/3/approve    # 승인 → status=APPROVED, 로그인 가능
POST /api/admin/users/3/reject     # 거절 → status=REJECTED, 로그인 불가
Authorization: Bearer <ACCESS_TOKEN>
```

`approve`/`reject` 응답은 갱신된 사용자 객체(`AdminUser`)다. 대상이 승인 대기(PENDING) 상태가 아니면 `400`을 반환한다.

### 사용자 삭제

```http
DELETE /api/admin/users/2
Authorization: Bearer <ACCESS_TOKEN>
```

응답:

```json
{
  "deleted": true
}
```

자기 자신이거나 이미 삭제된 사용자이면 `400`을 반환한다.

### 프로젝트 목록

```http
GET /api/admin/projects
Authorization: Bearer <ACCESS_TOKEN>
```

응답:

```json
[
  {
    "projectId": 1,
    "name": "제품 매뉴얼",
    "description": null,
    "createdAt": "2026-06-01T00:00:00Z",
    "createdByEmail": "owner@example.com",
    "members": [
      {
        "userId": 1,
        "email": "owner@example.com",
        "name": "대진",
        "role": "ADMIN"
      }
    ],
    "totalTokens": 5400
  }
]
```
