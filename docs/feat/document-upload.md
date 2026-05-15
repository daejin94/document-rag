# 문서 업로드 기능

이 문서는 문서 업로드, 텍스트 추출, chunk 생성, embedding 저장 흐름을 정리합니다.

## API

| Method | Path | 설명 |
|---|---|---|
| POST | `/api/documents` | 문서 업로드 |
| GET | `/api/documents` | 내 문서 목록 |
| GET | `/api/documents/{documentId}` | 내 문서 상세 |
| DELETE | `/api/documents/{documentId}` | 내 문서 삭제 |

모든 문서 API는 JWT 인증이 필요하다.

## 지원 형식

지원 확장자:

- `.txt`
- `.md`
- `.markdown`

PDF는 아직 지원하지 않는다.

## 업로드 처리 흐름

1. 빈 파일인지 확인한다.
2. 인증 사용자 id로 사용자를 조회한다.
3. 원본 파일명을 확인한다.
4. 파일을 storage root 아래에 저장한다.
5. `documents`에 문서 record를 저장한다.
6. 문서 상태를 `PROCESSING`으로 변경한다.
7. UTF-8 텍스트를 추출한다.
8. 텍스트를 chunk로 나눈다.
9. 각 chunk의 embedding을 OpenAI Embedding API로 생성한다.
10. `document_chunks`에 chunk와 embedding을 저장한다.
11. 성공하면 문서 상태를 `COMPLETED`로 변경한다.
12. 실패하면 문서 상태를 `FAILED`로 변경하고 에러 메시지를 저장한다.

## DocumentStatus

| 상태 | 의미 |
|---|---|
| `UPLOADED` | 문서 record 생성 직후 |
| `PROCESSING` | chunk/embedding 처리 중 |
| `COMPLETED` | 정상 처리 완료 |
| `FAILED` | 처리 실패 |

## Chunk

- 기본 chunk size는 `800`이다.
- 기본 overlap은 `150`이다.
- 빈 chunk는 저장하지 않는다.
- `token_count`는 현재 `content.length() / 4` 기준으로 추정한다.

## Embedding 저장

- embedding은 `document_chunks.embedding`에 `vector(1536)`으로 저장한다.
- chunk 검색을 위해 HNSW index를 사용한다.
- 기본 모델은 `text-embedding-3-small`이다.

## 접근 제한

- 목록, 상세, 삭제는 모두 현재 사용자 소유 문서만 대상으로 한다.
- 다른 사용자의 문서 id로 상세/삭제를 요청하면 문서를 찾을 수 없는 응답을 반환한다.
- 문서를 삭제하면 DB record와 저장된 파일을 함께 정리한다.

## 주의사항

- TXT/Markdown 외 파일 지원을 임의로 추가하지 않는다.
- PDF 지원을 구현했다고 문서에 쓰지 않는다.
- chunk와 embedding의 관계를 깨뜨리지 않는다.
- schema 변경 시 Entity, Repository, migration, 문서를 함께 확인한다.
