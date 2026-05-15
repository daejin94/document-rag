# 프로젝트 구조

이 문서는 프로젝트의 주요 폴더와 파일 역할을 정리합니다.

```text
.
├── backend/                  # Spring Boot API 서버
│   ├── build.gradle          # Backend Gradle 설정
│   ├── Dockerfile            # Backend 컨테이너 빌드 설정
│   ├── gradlew               # Linux/macOS용 Gradle Wrapper
│   ├── gradlew.bat           # Windows용 Gradle Wrapper
│   └── src/main/
│       ├── java/com/example/rag/
│       │   ├── auth/         # 회원가입, 로그인, JWT, Spring Security
│       │   ├── chat/         # 질문 API, 채팅 세션, 답변 출처
│       │   ├── common/       # 공통 예외와 에러 응답
│       │   ├── document/     # 문서 업로드, chunk, vector search
│       │   ├── llm/          # OpenAI Chat/Embedding 클라이언트
│       │   └── user/         # 사용자 Entity/Repository
│       └── resources/
│           ├── application.yml
│           └── db/migration/ # Flyway DB migration
├── frontend/                 # Vite React 클라이언트
│   ├── Dockerfile            # Frontend 컨테이너 빌드 설정
│   ├── nginx.conf            # Docker 실행 시 /api 프록시 설정
│   ├── vite.config.ts        # Vite 개발 서버 설정
│   └── src/
│       ├── api.ts            # Backend API 호출 래퍼
│       ├── App.tsx           # 테스트 UI
│       ├── main.tsx          # React entrypoint
│       ├── styles.css        # 화면 스타일
│       └── types.ts          # Frontend 타입 정의
├── docs/                     # 프로젝트 문서
│   ├── feat/                 # 기능별 흐름 문서
│   ├── api.md
│   ├── decisions.md
│   ├── development.md
│   ├── project-structure.md
│   ├── README.md
│   └── troubleshooting.md
├── docker-compose.yml        # 통합 실행 구성
├── .env.example              # 환경변수 예시
├── AGENTS.md                 # AI coding agent 작업 규칙
└── README.md                 # 사람을 위한 프로젝트 소개
```

## Backend 패키지 기준

- `auth`: 인증 공개 API, JWT 생성/검증, 인증 필터, Security 설정을 담당한다.
- `document`: 문서 업로드, 파일 저장, 텍스트 추출, chunk 생성, embedding 저장, vector search 쿼리를 담당한다.
- `chat`: 질문 처리, 채팅 세션/메시지 저장, 답변 출처 저장과 조회를 담당한다.
- `llm`: OpenAI API 호출을 감싼다. 모델명은 환경변수를 우선 사용한다.
- `common`: API 예외와 공통 에러 응답을 담당한다.
- `user`: 사용자 데이터 접근을 담당한다.

## Frontend 기준

- API 호출 경로는 `/api`를 기준으로 한다.
- Docker 실행 시 Nginx가 `/api` 요청을 backend 컨테이너로 프록시한다.
- Vite 개발 서버는 로컬 백엔드 `http://localhost:8080`으로 `/api` 요청을 프록시한다.
