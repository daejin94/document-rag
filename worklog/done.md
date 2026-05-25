# 작업 완료

## 문서 저장 범위 프로젝트 단위 변경

- 시작일: 2026-05-25
- 완료일: 2026-05-25
- 목적: 현재 유저 단위로 저장/검색되는 문서를 프로젝트 단위로 공유해, 같은 프로젝트의 다수 유저가 동일 문서 내용과 검색 결과를 사용할 수 있도록 변경한다.
- 현재 상태: 완료. 프로젝트 생성, 멤버 추가, 프로젝트 멤버 기준 문서 접근/검색, 프로젝트 관리자 문서 삭제, 기존 문서 project_id 마이그레이션을 구현했다.
- 다음 작업: 실제 DB에 Flyway 마이그레이션 적용 후 프로젝트 생성/멤버 추가/문서 업로드/질문 흐름을 통합 환경에서 확인한다.
- 관련 파일: backend/src/main/java/com/example/rag/project/, backend/src/main/java/com/example/rag/document/, backend/src/main/java/com/example/rag/chat/, backend/src/main/resources/db/migration/V2__add_projects.sql, frontend/src/
