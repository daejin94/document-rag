# 작업 완료

## 문서 저장 범위 프로젝트 단위 변경

- 시작일: 2026-05-25
- 완료일: 2026-05-25
- 목적: 현재 유저 단위로 저장/검색되는 문서를 프로젝트 단위로 공유해, 같은 프로젝트의 다수 유저가 동일 문서 내용과 검색 결과를 사용할 수 있도록 변경한다.
- 현재 상태: 완료. 프로젝트 생성, 멤버 추가, 프로젝트 멤버 기준 문서 접근/검색, 프로젝트 관리자 문서 삭제, 기존 문서 project_id 마이그레이션을 구현했다.
- 다음 작업: 실제 DB에 Flyway 마이그레이션 적용 후 프로젝트 생성/멤버 추가/문서 업로드/질문 흐름을 통합 환경에서 확인한다.
- 관련 파일: backend/src/main/java/com/example/rag/project/, backend/src/main/java/com/example/rag/document/, backend/src/main/java/com/example/rag/chat/, backend/src/main/resources/db/migration/V2__add_projects.sql, frontend/src/

## 프로젝트 하위 문서 API 중첩 전환

- 시작일: 2026-05-25
- 완료일: 2026-05-25
- 목적: 문서와 질문 API 경로를 프로젝트 하위 리소스 형태로 정리해 프로젝트 단위 문서 구분을 API 인터페이스까지 명확히 한다.
- 현재 상태: 완료. 문서 API와 질문 API를 `/api/projects/{projectId}/...` 경로로 전환하고, 요청 body/form의 `projectId` 전달을 제거했다.
- 다음 작업: 실제 실행 환경에서 프로젝트별 문서 목록/업로드/상세/삭제/질문 흐름을 수동 확인한다.
- 관련 파일: backend/src/main/java/com/example/rag/document/, backend/src/main/java/com/example/rag/chat/, frontend/src/, README.md

## 대화 세션 프로젝트 단위 전환

- 시작일: 2026-05-25
- 완료일: 2026-05-25
- 목적: 프로젝트별 문서/질문 흐름에 맞춰 대화 세션 목록과 메시지 조회도 프로젝트 단위로 구분한다.
- 현재 상태: 완료. `chat_sessions.project_id` 마이그레이션, 프로젝트별 세션 생성/목록/메시지 조회, 프론트 세션 API 경로 변경을 구현했다.
- 다음 작업: 실제 실행 환경에서 프로젝트 전환 시 세션 목록이 프로젝트별로 분리되는지 수동 확인한다.
- 관련 파일: backend/src/main/java/com/example/rag/chat/, backend/src/main/resources/db/migration/V3__add_project_to_chat_sessions.sql, frontend/src/, README.md
