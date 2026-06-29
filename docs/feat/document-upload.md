# 문서 업로드 기능

이 문서는 문서 업로드, 텍스트 추출, chunk 생성, embedding 저장 흐름을 정리합니다.

## API

| Method | Path | 권한 |
|---|---|---|
| POST | `/api/projects/{projectId}/documents` | 프로젝트 멤버 |
| GET | `/api/projects/{projectId}/documents` | 프로젝트 멤버 |
| GET | `/api/projects/{projectId}/documents/{documentId}` | 프로젝트 멤버 |
| DELETE | `/api/projects/{projectId}/documents/{documentId}` | 프로젝트 ADMIN |

모든 문서 API는 JWT 인증이 필요하고, 작업 전 `requireMember`(삭제는 `requireAdmin`)로 프로젝트 권한을 확인한다. 자세한 규칙은 [projects.md](projects.md)를 참고한다.

## 지원 형식

지원 확장자:

- `.txt`
- `.md`
- `.markdown`
- `.pdf`
- `.png`
- `.jpg` / `.jpeg`

텍스트 인코딩은 UTF-8을 우선 사용한다. UTF-8 디코딩에 실패하면 Windows 한국어 텍스트 파일 호환을 위해 MS949로 한 번 더 읽는다. 두 인코딩 모두 실패하면 UTF-8 텍스트 형식으로 변환한 뒤 다시 업로드하라는 오류를 반환한다.

PDF는 PDFBox로 텍스트를 추출한다. 추출 가능한 텍스트가 충분하면 그대로 사용하고, 스캔 이미지 기반 PDF처럼 텍스트가 부족하면 페이지를 이미지로 렌더링해 OCR로 텍스트를 추출한다(OCR fallback). 암호화된 PDF는 처리할 수 없다.

이미지 파일(`.png`/`.jpg`/`.jpeg`)은 OpenAI 비전 모델 OCR로 텍스트를 추출한다. OCR 모델은 `OPENAI_OCR_MODEL`(기본 `gpt-4o-mini`)로 지정하고, 스캔 PDF는 비용 상한을 위해 `RAG_OCR_MAX_PAGES`(기본 20) 페이지까지만, `RAG_OCR_DPI`(기본 200) 해상도로 처리한다. OCR로도 텍스트를 찾지 못하면 처리할 수 없다.

## 업로드 처리 흐름

업로드는 `DocumentService.upload` 안에서 동기로 처리된다.

1. `requireMember(projectId, userId)`로 프로젝트 멤버인지 확인한다.
2. 빈 파일인지 확인한다.
3. 원본 파일명을 확인한다.
4. 파일을 storage root 아래에 저장한다.
5. `documents`에 문서 record를 저장한다(`user_id` + `project_id`).
6. 문서 상태를 `PROCESSING`으로 변경한다.
7. 파일 형식에 따라 텍스트를 추출한다. TXT/Markdown은 UTF-8 우선, MS949 fallback 순서로 읽고, PDF는 PDFBox로 읽되 텍스트가 부족하면 페이지를 렌더링해 OCR로 추출하며, 이미지 파일은 OpenAI 비전 OCR로 추출한다.
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
- 업로드 시 발생한 embedding 토큰은 `token_usages`에 `EMBEDDING_UPLOAD`로 기록한다([admin.md](admin.md)).
- OCR을 사용한 경우(이미지/스캔 PDF) 발생한 비전 모델 토큰은 별도로 `OCR_UPLOAD`로 기록한다.

## 접근 제한

- 목록, 상세, 업로드는 프로젝트 멤버만 가능하다. 삭제는 프로젝트 ADMIN만 가능하다.
- 문서 조회는 `documentId` + `projectId` 이중 키로 한다. 다른 프로젝트의 문서 id로 상세/삭제를 요청하면 문서를 찾을 수 없는 응답을 반환한다.
- 문서를 삭제하면 DB record와 저장된 파일을 함께 정리한다.

## 주의사항

- TXT/Markdown/PDF/이미지(PNG/JPG) 외 파일 지원을 임의로 추가하지 않는다.
- chunk와 embedding의 관계를 깨뜨리지 않는다.
- 프로젝트 멤버십 가드를 생략하지 않는다.
- schema 변경 시 Entity, Repository, migration, 문서를 함께 확인한다.
