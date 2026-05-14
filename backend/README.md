# Document RAG Q&A

사용자가 업로드한 TXT/Markdown 문서를 chunk 단위로 분할하고 OpenAI Embedding API로 벡터화한 뒤 PostgreSQL + pgvector에 저장하는 Spring Boot 기반 RAG Q&A MVP입니다.

## 포함된 기능

- 회원가입/로그인
- JWT 기반 API 인증
- TXT/MD 문서 업로드
- 문서 텍스트 추출 및 chunking
- OpenAI embedding 생성
- pgvector cosine similarity 검색
- 검색된 chunk 기반 OpenAI chat 답변 생성
- 답변 출처 저장 및 반환
- 사용자별 문서 접근 제한

## 실행

`.env` 또는 셸 환경에 값을 설정합니다.

```bash
OPENAI_API_KEY=...
JWT_SECRET=replace-with-a-long-random-secret-at-least-32-bytes
```

Docker Compose로 실행합니다.

```bash
docker compose up --build
```

앱은 `http://localhost:8080`에서 실행됩니다.

## API 예시

회원가입:

```bash
curl -X POST http://localhost:8080/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"password1234","name":"대진"}'
```

로그인:

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"password1234"}'
```

문서 업로드:

```bash
curl -X POST http://localhost:8080/api/documents \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "title=Spring Security Guide" \
  -F "file=@spring-security-guide.md"
```

질문:

```bash
curl -X POST http://localhost:8080/api/chat/query \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"question":"JWT 인증 흐름 설명해줘.","documentIds":[1]}'
```

## 한계

- 현재 파일 추출은 TXT/MD만 지원합니다.
- 문서 처리는 동기식입니다.
- embedding 컬럼은 `text-embedding-3-small` 기본 차원인 1536으로 생성됩니다.
- refresh token은 별도 저장소 없이 access token과 동일하게 반환하는 MVP 형태입니다.
