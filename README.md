# Document RAG Q&A

문서 기반 RAG Q&A 시스템입니다.

- `backend`: Spring Boot, PostgreSQL, pgvector, OpenAI API
- `frontend`: Vite React 클라이언트

## 배포용 Docker Compose

루트 경로의 `.env`에 값을 설정합니다.

```env
OPENAI_API_KEY=sk-...
JWT_SECRET=replace-with-a-long-random-secret-at-least-32-bytes
```

전체 서비스 실행:

```bash
docker compose up --build
```

컨테이너 구성:

- `postgres`: PostgreSQL + pgvector
- `backend`: Spring Boot API, `http://localhost:8080`
- `frontend`: nginx 정적 프론트엔드, `http://localhost:5173`

프론트엔드 컨테이너는 `/api` 요청을 내부 Docker 네트워크의 `backend:8080`으로 프록시합니다.

## 로컬 개발

DB만 Docker로 켜고 백엔드/프론트 로그를 로컬에서 보고 싶으면:

```bash
docker compose up -d postgres
```

백엔드는 `backend`에서 로컬 Java/Gradle로 실행하고, 프론트엔드는 `frontend`에서 `npm run dev`로 실행하면 됩니다.
