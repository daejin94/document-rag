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

현재 MVP에서는 `refreshToken`이 `accessToken`과 동일하게 반환된다.

## Documents

| Method | Path | 인증 | 설명 |
|---|---|---|---|
| POST | `/api/documents` | 필요 | 문서 업로드 |
| GET | `/api/documents` | 필요 | 내 문서 목록 조회 |
| GET | `/api/documents/{documentId}` | 필요 | 내 문서 상세 조회 |
| DELETE | `/api/documents/{documentId}` | 필요 | 내 문서 삭제 |

### 문서 업로드

```http
POST /api/documents
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: multipart/form-data
```

요청 필드:

| 필드 | 타입 | 설명 |
|---|---|---|
| `title` | string | 문서 제목 |
| `file` | file | TXT, Markdown 파일 |

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
GET /api/documents
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
GET /api/documents/1
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
DELETE /api/documents/1
Authorization: Bearer <ACCESS_TOKEN>
```

응답:

```json
{
  "deleted": true
}
```

## Chat

| Method | Path | 인증 | 설명 |
|---|---|---|---|
| POST | `/api/chat/query` | 필요 | 문서 기반 질문 |
| GET | `/api/chat/sessions` | 필요 | 내 채팅 세션 목록 |
| GET | `/api/chat/sessions/{sessionId}/messages` | 필요 | 세션 메시지 목록 |

### 질문

```http
POST /api/chat/query
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

요청:

```json
{
  "question": "JWT 인증 흐름 설명해줘.",
  "documentIds": [1]
}
```

`documentIds`가 비어 있거나 `null`이면 사용자 소유의 `COMPLETED` 문서 전체를 검색 대상으로 삼는다.

응답:

```json
{
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

검색 결과가 없거나 similarity threshold를 넘지 못하면 `sources`는 빈 배열이고 아래 답변이 반환된다.

```text
등록된 문서에서 관련 정보를 찾을 수 없습니다.
```

### 채팅 세션 목록

```http
GET /api/chat/sessions
Authorization: Bearer <ACCESS_TOKEN>
```

응답:

```json
[
  {
    "sessionId": 1,
    "title": "JWT 인증 흐름 설명해줘.",
    "createdAt": "2026-05-15T00:00:00Z"
  }
]
```

### 세션 메시지 목록

```http
GET /api/chat/sessions/1/messages
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
