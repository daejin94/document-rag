# 작업 완료

## 프론트 구조 리팩터링

- 시작일: 2026-05-27
- 완료일: 2026-05-27
- 목적: 기능 변화 없이 프론트엔드 화면/상태/API 호출 구조를 기존 동작 기준으로 정리한다.
- 현재 상태: 완료. `App.tsx`에 집중되어 있던 모달, 사이드바, 메인 대화 영역, 멤버 관리 UI를 별도 컴포넌트로 분리하고 기존 상태/API 호출 흐름은 유지했다.
- 다음 작업: 필요 시 `Workspace`의 프로젝트/문서/세션/질문 상태 로직을 custom hook 단위로 추가 분리한다.
- 관련 파일: frontend/src/App.tsx, frontend/src/components/Modal.tsx, frontend/src/components/WorkspaceSidebar.tsx, frontend/src/components/WorkspaceMain.tsx, frontend/src/components/MemberManagement.tsx

## 관리자 멤버 삭제 기능 추가

- 시작일: 2026-05-26
- 완료일: 2026-05-26
- 목적: 프로젝트 관리자가 멤버 관리 팝업에서 프로젝트 멤버를 삭제할 수 있도록 기능을 추가한다.
- 현재 상태: 완료. 관리자 전용 멤버 삭제 API와 멤버 관리 팝업의 삭제 버튼을 추가했다. 자기 자신 삭제와 마지막 관리자 삭제는 서버에서 차단한다.
- 다음 작업: 실제 백엔드 실행 환경에서 멤버 삭제, 자기 자신 삭제 차단, 마지막 관리자 삭제 차단을 수동 확인한다.
- 관련 파일: backend/src/main/java/com/example/rag/project/, frontend/src/App.tsx, frontend/src/api.ts, frontend/src/styles.css

## 멤버 추가 에러 위치 수정

- 시작일: 2026-05-26
- 완료일: 2026-05-26
- 목적: 멤버 관리 팝업에서 멤버 추가 실패 시 에러 메시지가 메인 화면이 아니라 팝업 내부에 표시되도록 수정한다.
- 현재 상태: 완료. 멤버 추가 전용 에러 상태를 분리해 없는 사용자 추가 등 실패 메시지가 멤버 관리 팝업 내부에 표시되도록 변경했다.
- 다음 작업: 실제 백엔드 실행 환경에서 없는 사용자 추가 시 팝업 내부 에러 표시를 수동 확인한다.
- 관련 파일: frontend/src/App.tsx

## 멤버 관리 팝업 통합

- 시작일: 2026-05-26
- 완료일: 2026-05-26
- 목적: RAG Query 상단 멤버 버튼에서 멤버 목록 확인과 멤버 추가를 함께 관리하도록 UI를 변경한다.
- 현재 상태: 완료. 상단 `멤버 관리` 버튼에서 멤버 목록을 확인하고, 관리자일 경우 같은 팝업에서 멤버를 추가할 수 있도록 변경했다.
- 다음 작업: 실제 백엔드 실행 환경에서 멤버 목록 조회와 멤버 추가 후 목록 갱신을 수동 확인한다.
- 관련 파일: frontend/src/App.tsx, frontend/src/styles.css

## 메인 UI 등록 폼 팝업 전환

- 시작일: 2026-05-26
- 완료일: 2026-05-26
- 목적: 메인 페이지의 파일 등록과 멤버 등록 입력 영역을 팝업 형식으로 변경하고, 관련 실행 버튼을 RAG QUERY 상단에 배치한다.
- 현재 상태: 완료. 파일 등록과 멤버 등록 폼을 모달로 전환하고, RAG Query 상단에 파일 등록/멤버 등록 버튼을 추가했다.
- 다음 작업: 실제 백엔드 실행 환경에서 로그인 후 파일 등록/멤버 등록 모달 동작을 수동 확인한다.
- 관련 파일: frontend/src/App.tsx, frontend/src/components/UploadForm.tsx, frontend/src/styles.css

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
