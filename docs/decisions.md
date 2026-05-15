# 결정 기록

현재 MVP 기준의 기술/정책 결정을 정리합니다. 기능을 바꿀 때는 관련 코드와 문서를 함께 확인합니다.

## 문서 형식

- 업로드 가능한 문서 형식은 TXT, Markdown이다.
- 지원 확장자는 `.txt`, `.md`, `.markdown`이다.
- PDF는 아직 지원하지 않는다.
- PDF 지원을 구현하지 않았다면 문서에 지원한다고 쓰지 않는다.

## Embedding

- 기본 embedding 모델은 `text-embedding-3-small`이다.
- DB embedding 컬럼은 1536 차원이다.
- 모델명은 코드에 고정하지 않고 환경변수를 우선 사용한다.

관련 환경변수:

```env
OPENAI_EMBEDDING_MODEL
```

## Chat 모델

- 기본 chat 모델은 `gpt-4o-mini`이다.
- 모델명은 환경변수로 덮어쓸 수 있다.

관련 환경변수:

```env
OPENAI_CHAT_MODEL
```

## 인증

- Spring Security는 stateless 세션 정책을 사용한다.
- `/api/auth/**`는 공개 API이다.
- 그 외 API는 JWT 인증이 필요하다.
- refresh token은 현재 별도 저장소 없이 access token과 동일하게 반환하는 MVP 형태이다.
- 저장소 기반 refresh token은 사용자가 명시 요청한 경우에만 구현한다.

## RAG 검색

- 질문 시 문서 chunk 검색은 PostgreSQL pgvector cosine distance 기준으로 수행한다.
- 검색 대상은 현재 사용자 소유 문서로 제한한다.
- 문서 상태가 `COMPLETED`인 chunk만 검색한다.
- `documentIds`가 있으면 해당 문서 id로 추가 필터링한다.
- 검색 결과가 없거나 최상위 similarity가 threshold보다 낮으면 고정 답변을 반환한다.

`application.yml` 기준 기본값:

```env
RAG_TOP_K=5
RAG_SIMILARITY_THRESHOLD=0.70
```

`.env.example`과 README의 로컬 개발 예시는 테스트 편의를 위해 `RAG_SIMILARITY_THRESHOLD=0.20`을 사용한다.

## 문서 처리 방식

- 문서 업로드 후 chunk 생성과 embedding 저장은 현재 동기식으로 처리한다.
- 업로드 처리 중 실패하면 문서 상태를 `FAILED`로 바꾸고 에러 메시지를 저장한다.
- 정상 처리된 문서는 `COMPLETED` 상태가 된다.

## API 응답

- 명시 요청 없이는 API 응답 구조를 변경하지 않는다.
- 에러 응답은 `timestamp`, `status`, `error`, `message` 필드를 사용한다.
