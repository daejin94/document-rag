# 질문 기능

이 문서는 질문 API, vector search, 답변 생성, 출처 반환 흐름을 정리합니다.

## API

| Method | Path | 설명 |
|---|---|---|
| POST | `/api/chat/query` | 문서 기반 질문 |
| GET | `/api/chat/sessions` | 내 채팅 세션 목록 |
| GET | `/api/chat/sessions/{sessionId}/messages` | 세션 메시지 목록 |

모든 Chat API는 JWT 인증이 필요하다.

## 질문 요청

요청 필드:

| 필드 | 조건 | 설명 |
|---|---|---|
| `question` | blank 불가 | 사용자 질문 |
| `documentIds` | 선택 | 검색 대상으로 제한할 문서 id 목록 |
| `sessionId` | 선택 | 이어갈 채팅 세션 id |

`documentIds`가 `null`이거나 비어 있으면 사용자 소유의 모든 `COMPLETED` 문서를 검색 대상으로 삼는다.
`sessionId`가 없으면 새 세션을 만들고, 있으면 현재 사용자 소유 세션인지 확인한 뒤 그 세션에 메시지를 이어서 저장한다.

## 처리 흐름

1. 인증 사용자 id로 사용자를 조회한다.
2. `documentIds`가 있으면 모두 현재 사용자 소유인지 확인한다.
3. `sessionId`가 있으면 기존 세션을 조회하고, 없으면 질문으로 새 세션을 생성한다.
4. 세션의 최근 메시지를 대화 히스토리로 조회한다.
5. 사용자 메시지를 저장한다.
6. 현재 질문과 대화 히스토리를 합쳐 embedding을 생성한다.
7. `document_chunks`에서 유사 chunk를 검색한다.
8. 새 세션이고 검색 결과가 없거나 최상위 similarity가 threshold보다 낮으면 고정 답변을 반환한다.
9. 기존 세션의 후속 질문이면 검색 결과가 threshold를 넘지 못해도 대화 히스토리를 prompt에 포함해 OpenAI Chat API를 호출한다.
10. assistant 메시지를 저장한다.
11. threshold를 통과한 검색 결과가 있으면 답변 출처로 사용된 chunk를 `answer_sources`에 저장한다.
12. `sessionId`, 답변, 출처, 모델명, usage를 반환한다.

## 검색 조건

검색 SQL은 다음 조건을 유지해야 한다.

- `documents.user_id = 현재 사용자 id`
- `documents.status = 'COMPLETED'`
- `documentIds`가 있으면 `documents.id IN (:documentIds)`

정렬은 `embedding <=> queryEmbedding` 기준 오름차순이다. similarity는 `1 - distance`로 계산한다.

## 검색 결과 없음

새 세션에서 검색 결과가 없거나 최상위 similarity가 threshold보다 낮으면 아래 답변을 반환한다.

```text
등록된 문서에서 관련 정보를 찾을 수 없습니다.
```

이 경우:

- `sources`는 빈 배열이다.
- `usage.promptTokens`는 `0`이다.
- `usage.completionTokens`는 `0`이다.

기존 세션에 대화 히스토리가 있으면 검색 결과가 threshold보다 낮아도 LLM을 호출할 수 있다. 이 흐름은 이전 답변의 요약, 재설명, 형식 변경처럼 새 문서 근거가 필요하지 않은 후속 질문을 처리하기 위한 것이다.

## 출처

출처 응답 필드:

| 필드 | 설명 |
|---|---|
| `documentId` | 출처 문서 id |
| `documentTitle` | 출처 문서 제목 |
| `chunkId` | 출처 chunk id |
| `chunkIndex` | 문서 내 chunk 순서 |
| `similarity` | 질문과 chunk의 유사도 |
| `contentPreview` | chunk 내용 미리보기 |

`contentPreview`는 최대 160자 기준으로 잘린다.

## 세션과 메시지

- 첫 질문에서는 새 채팅 세션이 생성된다.
- 후속 질문에서는 요청의 `sessionId`에 해당하는 기존 세션을 사용한다.
- 세션 제목은 첫 질문 앞부분을 사용한다.
- 세션 목록은 최근 수정 시각 기준으로 정렬된다.
- 사용자 메시지와 assistant 메시지를 저장한다.
- assistant 메시지 조회 시 저장된 `answer_sources`를 통해 출처를 함께 반환한다.

## 주의사항

- 사용자별 문서 접근 제한을 제거하지 않는다.
- `documentIds` 검증을 생략하지 않는다.
- 검색 결과가 없는 경우를 무시하지 않는다.
- 출처 저장과 반환 구조를 깨뜨리지 않는다.
