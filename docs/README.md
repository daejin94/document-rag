# 프로젝트 문서

이 폴더는 README에 모두 담기에는 긴 운영 정보와 기능별 흐름을 관리합니다.

## 문서 목록

| 문서 | 용도 |
|---|---|
| [project-structure.md](project-structure.md) | 프로젝트 폴더와 주요 파일 역할 |
| [development.md](development.md) | 로컬 개발 실행과 검증 명령어 |
| [api.md](api.md) | 현재 제공하는 API 목록과 요청/응답 |
| [decisions.md](decisions.md) | 현재 MVP 기준의 기술/정책 결정 |
| [troubleshooting.md](troubleshooting.md) | 자주 만나는 문제와 해결 방법 |
| [feat/rag-flow.md](feat/rag-flow.md) | 전체 RAG 파이프라인 |
| [feat/auth.md](feat/auth.md) | 회원가입, 로그인, JWT 인증 |
| [feat/document-upload.md](feat/document-upload.md) | 문서 업로드, chunk, embedding 저장 |
| [feat/chat-query.md](feat/chat-query.md) | 질문, vector search, 답변 출처 |

## 작업할 때 먼저 볼 문서

- RAG 검색, 답변, 출처 관련 작업: [feat/rag-flow.md](feat/rag-flow.md), [feat/chat-query.md](feat/chat-query.md)
- 문서 업로드나 embedding 저장 작업: [feat/document-upload.md](feat/document-upload.md)
- 인증/JWT 작업: [feat/auth.md](feat/auth.md)
- API 요청/응답 확인: [api.md](api.md)
- 실행 환경 문제 확인: [development.md](development.md), [troubleshooting.md](troubleshooting.md)

AI coding agent 작업 규칙은 프로젝트 루트의 [AGENTS.md](../AGENTS.md)를 따른다.
