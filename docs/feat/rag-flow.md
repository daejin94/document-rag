# RAG 흐름

이 문서는 문서 업로드부터 질문 답변까지의 전체 RAG 파이프라인을 정리합니다.

## 전체 흐름

```text
문서 업로드
  -> 파일 저장
  -> 텍스트 추출
  -> chunk 분할
  -> OpenAI Embedding 생성
  -> PostgreSQL pgvector 저장
  -> 질문 입력
  -> 질문 Embedding 생성
  -> 사용자 소유 COMPLETED 문서 chunk 검색
  -> OpenAI Chat API로 답변 생성
  -> 답변과 출처 저장/반환
  -> 같은 sessionId로 후속 질문 이어가기
```

## 업로드 단계

1. 사용자가 `/api/documents`에 `title`, `file`을 multipart로 전송한다.
2. 서버는 인증 사용자 id를 기준으로 문서를 생성한다.
3. 파일을 로컬 저장소에 저장한다.
4. 문서 상태를 `PROCESSING`으로 변경한다.
5. TXT/Markdown은 UTF-8로 먼저 읽고 실패하면 MS949로 다시 읽으며, PDF는 PDFBox로 텍스트를 추출한다.
6. 텍스트를 chunk로 분할한다.
7. 각 chunk를 embedding으로 변환한다.
8. `document_chunks`에 chunk와 embedding을 저장한다.
9. 성공하면 문서 상태를 `COMPLETED`로 변경한다.
10. 실패하면 문서 상태를 `FAILED`로 변경하고 에러 메시지를 저장한다.

## 질문 단계

1. 사용자가 `/api/chat/query`에 `question`, `documentIds`, 선택적으로 `sessionId`를 전송한다.
2. 서버는 `documentIds`가 현재 사용자 소유인지 검증한다.
3. `sessionId`가 있으면 기존 세션을 사용하고, 없으면 새 세션을 생성한다.
4. 현재 질문과 최근 대화 히스토리를 embedding 입력으로 사용한다.
5. pgvector cosine distance 기준으로 유사 chunk를 검색한다.
6. 검색은 현재 사용자 소유 문서와 `COMPLETED` 상태 문서로 제한된다.
7. `documentIds`가 있으면 해당 문서들만 검색한다.
8. 새 세션에서 검색 결과가 없거나 최상위 similarity가 threshold보다 낮으면 고정 답변을 반환한다.
9. 기존 세션의 후속 질문이면 대화 히스토리를 prompt에 포함해 이전 답변의 요약, 재설명, 형식 변경 요청을 처리할 수 있다.
10. threshold를 통과한 검색 결과가 있으면 chunk 내용을 prompt에 넣고 OpenAI Chat API로 답변을 생성한다.
11. 답변 메시지와 출처 chunk를 저장한다.
12. `sessionId`, 답변, 출처, 모델명, token usage를 반환한다.

## 주요 설정

| 설정 | 기본값 | 설명 |
|---|---:|---|
| `RAG_CHUNK_SIZE` | `800` | chunk 최대 문자 길이 |
| `RAG_CHUNK_OVERLAP` | `150` | chunk 간 겹치는 문자 수 |
| `RAG_TOP_K` | `5` | 검색할 chunk 수 |
| `RAG_SIMILARITY_THRESHOLD` | `0.70` | 답변 생성 최소 similarity |

위 값은 `application.yml` 기준 기본값이다. `.env.example`과 README의 로컬 개발 예시는 테스트 편의를 위해 `0.20`을 사용한다.

## 지켜야 할 규칙

- 접근 권한이 없는 문서 chunk가 검색 결과에 포함되면 안 된다.
- `COMPLETED` 상태 문서만 정상 질의 대상으로 삼는다.
- 검색된 chunk 기반으로만 답변해야 한다.
- 출처 반환 기능을 깨뜨리지 않는다.
- 검색 결과가 없는 경우를 무시하지 않는다.
