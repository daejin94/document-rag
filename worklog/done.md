# 작업 완료

## 회원 가입 승인 기능 (2026-06-23)

- 시작일: 2026-06-23
- 완료일: 2026-06-23
- 목적: 회원 가입을 즉시 활성화하지 않고 대기 상태로 두어, 관리자 승인 후에만 로그인 가능하도록 변경. 관리자 콘솔에 가입 승인 페이지 추가.
- 현재 상태: 완료. 백엔드 컴파일·테스트, 프론트 빌드 통과.
  - 백엔드: `UserStatus`(PENDING/APPROVED/REJECTED) enum + `User.status`(기본 PENDING), V8 마이그레이션(기존 사용자 APPROVED 백필). `AuthService.signup`은 PENDING으로 생성(자동 로그인 없음), `login`은 비밀번호 검증 후 상태 확인해 PENDING/REJECTED는 403. `SuperAdminInitializer`가 승격 시 함께 APPROVED 처리(chicken-and-egg 방지). `AdminController`/`AdminService`에 `GET /api/admin/users/pending`, `POST .../{id}/approve`, `POST .../{id}/reject` 추가. 유저 목록은 APPROVED만 반환. `AdminUserResponse`에 status 추가.
  - 프론트: `AuthScreen` 가입 후 자동 로그인 대신 "승인 대기" 안내 후 로그인 모드 전환. 관리자 콘솔에 "가입 승인" 탭(`UserApproval`) 추가. api/types에 status·승인 함수 추가.
  - 문서: `docs/api.md`, `docs/feat/admin.md` 갱신.
- 관련 파일: backend `user/{User,UserStatus,UserRepository}`, `auth/AuthService`, `admin/{AdminController,AdminService,AdminUserResponse,SuperAdminInitializer}`, `db/migration/V8__add_user_status.sql`; frontend `components/AuthScreen.tsx`, `components/admin/{AdminApp,UserApproval}.tsx`, `api.ts`, `types.ts`; `docs/api.md`, `docs/feat/admin.md`.

## 관리자(Super Admin) 페이지 추가 (2026-06-23)

- 시작일: 2026-06-23
- 완료일: 2026-06-23
- 목적: SUPER_ADMIN 글로벌 role을 도입해 해당 유저 로그인 시 RAG 워크스페이스 대신 관리자 페이지로 진입. 일별 토큰 사용량 조회, 유저 관리(사용량·정보·삭제), 전체 프로젝트 관리 제공.
- 현재 상태: 완료. 백엔드 main/test 컴파일·프론트 빌드 통과. 로컬 DB로 기동해 전 흐름 검증 완료.
  - 백엔드: `app_users`에 `role`/`deleted_at` 추가(V7), `UserRole`(USER/SUPER_ADMIN) enum. JWT에 `role` claim 추가, 삭제 유저 로그인 차단. `SUPER_ADMIN_EMAIL` 환경변수 계정을 기동 시 자동 승격(`SuperAdminInitializer`). `admin` 패키지: `AdminController`(`/api/admin/**`, 핸들러마다 `requireSuperAdmin` DB 검증) + `AdminService` + `AdminUsageRepository`(KST 기준 일별 그룹핑 raw SQL). 유저 삭제는 소프트 삭제(자기 자신 차단).
  - 프론트: 로그인 후 JWT role 디코드해 `SUPER_ADMIN`이면 `AdminApp` 렌더. `components/admin/`(AdminApp 탭 네비, UsageDashboard, UserManagement, ProjectManagement, 공용 UsageView). 새 UI 라이브러리 없이 표+CSS 막대로 시각화. api/types/스타일 추가.
  - 검증: 마이그레이션 적용 → s@admin.me 가입 → 재기동 자동 승격(로그 확인) → 로그인 JWT role=SUPER_ADMIN → /api/admin/{users,usage/daily,projects} 200 → 일반 유저·승격 전 토큰 403 → 자기 삭제 400 → 소프트 삭제 후 로그인 401·목록 제외 → 일별/유저별/프로젝트별 집계 합산(KST) 정상. 테스트용 token_usages 행은 정리 완료.
- 관련 파일: backend `user/{User,UserRole,UserRepository}`, `auth/{JwtService,AuthService}`, `admin/*`(신규), `db/migration/V7__add_user_role_and_soft_delete.sql`, `application.yml`; frontend `App.tsx`, `api.ts`, `types.ts`, `styles.css`, `components/admin/*`(신규); `.env.example`.

## 워크스페이스 UI 다듬기 및 커스텀 드롭다운 (2026-06-22)

- 시작일: 2026-06-22
- 완료일: 2026-06-22
- 목적: 노트북형 화면의 세부 톤앤매너를 정리하고, 촌스러운 네이티브 select 드롭다운을 앱 톤에 맞는 커스텀 컴포넌트로 교체한다.
- 현재 상태: 완료.
  - 사이드바 '출처' 헤더: 전체폭 '소스 추가' 버튼을 새로고침 옆 아이콘 버튼으로 축소, 호버/포커스 시 '소스 추가' 라벨 펼침
  - 채팅 헤더 '전체 소스' 칩 좌우 여백·높이 확대(다른 요소와 톤 통일)
  - '검색 유사도 결과' 패널 헤더를 좌측 '채팅' 헤더와 같은 시작 높이로 정렬(아래 요소 위치는 유지)
  - '검색 유사도 결과' 더보기(...) 버튼 비활성화(미동작 자리표시자)
  - 멤버 목록 행에 다크 톤 배경/테두리 적용(흰 박스 → 모달 톤 일치)
  - 네이티브 select 2곳(프로젝트 선택, 멤버 역할)을 라이브러리 없는 커스텀 Dropdown으로 교체: 둥근 다크 메뉴, 호버/선택 표시, 바깥클릭·Esc·방향키 조작, 접근성 속성
- 다음 작업: 실제 실행 환경에서 프로젝트 선택/멤버 역할 드롭다운 동작과 사이드바·헤더 레이아웃을 수동 확인한다.
- 관련 파일: frontend/src/components/Dropdown.tsx(신규), frontend/src/components/WorkspaceMain.tsx, frontend/src/components/WorkspaceSidebar.tsx, frontend/src/components/MemberManagement.tsx, frontend/src/styles.css
- 검증: npm run build(tsc + vite) 통과

## UI 화면 개선 묶음 (2026-06-22)

- 프로필 드롭다운: 로그아웃 영역을 '프로젝트 관리'/'로그아웃'으로 분할, 내 프로젝트 목록·권한 보여주는 팝업 추가
- 상단 네비 반응형: 폭 축소 시 버튼 겹침·그리드 깨짐 수정(네비 높이 가변 + 미디어쿼리 충돌 차단)
- 사이드바 로그아웃 버튼 제거(프로필로 일원화), 액션 버튼 720px 이하에서 아이콘 전용 + tooltip
- 사이드바 헤더 구분선을 우측 상단 네비(64px) 높이에 맞춰 정렬
- 사이드바 '출처'/'대화 기록' 영역 절반씩 채우고 리스트 넘치면 내부 스크롤(981px↑), 세션 6개 제한 제거
- 채팅 빈 상태 안내를 프로젝트 없음/미선택/선택됨으로 분기, '먼저 프로젝트를 생성해 주세요!' bold 강조
- 관련 파일: frontend/src/{components/WorkspaceMain.tsx, components/WorkspaceSidebar.tsx, App.tsx, styles.css}
- 검증: npm run build(tsc + vite) 통과

## 사용자별 토큰 사용량 저장

- 시작일: 2026-06-22
- 완료일: 2026-06-22
- 목적: 어떤 사용자가 OpenAI 토큰을 얼마나 썼는지 호출 단위로 영구 저장한다(집계는 추후). 채팅 답변뿐 아니라 임베딩까지 포함하되 종류를 구분해 기록한다.
- 현재 상태: 완료. `token_usages` 테이블(V6)과 `usage` 패키지(`TokenUsage` 엔티티/리포지토리/`TokenUsageRecorder`)를 추가했다. `usage_type`으로 `CHAT`/`EMBEDDING_QUERY`/`EMBEDDING_UPLOAD`를 구분한다. 임베딩 토큰을 얻기 위해 `EmbeddingModelClient.embed`가 `EmbedResult(embedding, totalTokens)`를 반환하도록 바꾸고 OpenAI `usage.total_tokens`를 읽는다. `ChatService.query`는 질문 임베딩과 chat 응답을, `DocumentService.upload`는 업로드 chunk 임베딩 합계를 기록한다. JDK21 설치 후 `./gradlew build`로 컴파일·테스트 통과 확인.
- 다음 작업: DB 마이그레이션 적용 후 실제 쿼리/업로드로 token_usages 적재 수동 확인. 이후 사용자별 합계 조회 API/집계는 별도 작업으로 진행.
- 관련 파일: backend/src/main/java/com/example/rag/usage/, backend/src/main/java/com/example/rag/llm/EmbedResult.java, backend/src/main/java/com/example/rag/llm/EmbeddingModelClient.java, backend/src/main/java/com/example/rag/llm/OpenAiEmbeddingModelClient.java, backend/src/main/java/com/example/rag/chat/ChatService.java, backend/src/main/java/com/example/rag/document/DocumentService.java, backend/src/main/resources/db/migration/V6__add_token_usages.sql

## 프로필 메뉴 단일 카드 정리

- 시작일: 2026-06-17
- 완료일: 2026-06-17
- 목적: 프로필 드롭다운에서 내 정보 2단계를 제거하고 Google 계정 팝업처럼 정보를 바로 표시한다.
- 현재 상태: 완료. JWT의 email claim을 읽어 프로필 드롭다운에 이메일과 표시명을 바로 보여주고, 현재 프로젝트 권한과 로그아웃 버튼을 같은 카드 안에 배치했다. 계정 더 보기류의 추가 메뉴는 넣지 않았다.
- 다음 작업: 실제 로그인 상태에서 프로필 메뉴 디자인과 로그아웃 동작을 수동 확인한다.
- 관련 파일: frontend/src/App.tsx, frontend/src/components/WorkspaceMain.tsx, frontend/src/styles.css

## 프로필 드롭다운 전환

- 시작일: 2026-06-17
- 완료일: 2026-06-17
- 목적: 상단 설정 아이콘을 로그인 상태에 맞는 로그인/프로필 아이콘과 드롭다운 메뉴로 변경한다.
- 현재 상태: 완료. 로그인 전 인증 화면에는 로그인 아이콘 버튼을 추가하고, 로그인 후 워크스페이스 상단 설정 버튼은 프로필 아이콘으로 교체했다. 프로필 아이콘 클릭 시 내 정보 보기와 로그아웃 메뉴가 표시된다.
- 다음 작업: 실제 로그인 상태에서 프로필 드롭다운 열림, 내 정보 보기 토글, 로그아웃 동작을 수동 확인한다.
- 관련 파일: frontend/src/components/AuthScreen.tsx, frontend/src/components/WorkspaceMain.tsx, frontend/src/App.tsx, frontend/src/styles.css

## 대화 기록 다크 톤 정리

- 시작일: 2026-06-17
- 완료일: 2026-06-17
- 목적: 왼쪽 대화 기록 버튼 색상을 다크 레이아웃 톤앤매너에 맞게 조정한다.
- 현재 상태: 완료. 밝은 pill 형태로 보이던 세션 버튼을 다크 리스트 아이템 스타일로 덮어써 주변 패널과 톤을 맞췄다.
- 다음 작업: 실제 로그인 화면에서 대화 기록 hover/active 상태를 수동 확인한다.
- 관련 파일: frontend/src/styles.css

## NotebookLM 스타일 패널 배치 재조정

- 시작일: 2026-06-17
- 완료일: 2026-06-17
- 목적: 왼쪽 프로젝트 영역에는 대화 기록을 배치하고, 오른쪽 스튜디오 영역에는 기존 검색 유사도 출처 결과를 표시한다.
- 현재 상태: 완료. 프로젝트 목록이 있던 왼쪽 하단 영역을 대화 기록으로 바꾸고, 프로젝트 선택/생성/삭제는 상단 컨트롤로 이동했다. 오른쪽 스튜디오 패널은 검색 유사도 결과 전용 패널로 정리해 chunk 유사도와 미리보기를 표시하도록 변경했다.
- 다음 작업: 백엔드와 프론트엔드 실행 후 실제 프로젝트 데이터로 대화 기록 열기와 검색 유사도 결과 표시를 수동 확인한다.
- 관련 파일: frontend/src/App.tsx, frontend/src/components/WorkspaceMain.tsx, frontend/src/components/WorkspaceSidebar.tsx, frontend/src/styles.css

## 백엔드 로컬 실행 DB 연결 오류 수정

- 시작일: 2026-06-17
- 완료일: 2026-06-17
- 목적: `run-backend.sh` 실행 시 PostgreSQL 연결 거부로 백엔드가 뜨지 않는 문제를 해결한다.
- 현재 상태: 완료. Docker Postgres host port를 설정 가능하게 하고 로컬 바인딩을 `127.0.0.1`로 제한했다. `run-backend.sh`는 로컬 DB URL 사용 시 Postgres 컨테이너를 자동 실행하고 준비 상태를 확인한 뒤 백엔드를 실행하도록 보완했다. 로컬 `.env`는 5432 포트 바인딩 문제를 피하기 위해 `15432`를 사용하도록 조정했다.
- 다음 작업: 필요 시 프론트엔드와 함께 로그인/문서 업로드/질문 흐름을 수동 확인한다.
- 관련 파일: run-backend.sh, docker-compose.yml, .env.example, README.md, docs/development.md

## NotebookLM 스타일 프로젝트 화면 구조 변경

- 시작일: 2026-06-16
- 완료일: 2026-06-16
- 목적: 프로젝트 선택 후 화면을 첨부한 NotebookLM 화면처럼 출처, 채팅, 스튜디오 중심의 3패널 구조로 변경한다.
- 현재 상태: 완료. 왼쪽 패널을 출처/소스 관리 중심으로 재구성하고, 중앙 채팅 패널과 오른쪽 스튜디오 패널을 추가했다. 기존 프로젝트 전환, 문서 선택, 파일 등록, 멤버 관리, 세션 열기 흐름은 유지했다.
- 다음 작업: 백엔드 실행 및 로그인 상태에서 실제 프로젝트 데이터로 문서 선택, 세션 열기, 파일 등록 버튼, 멤버 관리 버튼을 수동 확인한다.
- 관련 파일: frontend/src/App.tsx, frontend/src/components/WorkspaceMain.tsx, frontend/src/components/WorkspaceSidebar.tsx, frontend/src/styles.css

## 프로젝트 삭제 기능 추가

- 시작일: 2026-06-13
- 완료일: 2026-06-13
- 목적: 프로젝트 목록 아이템에서 삭제 버튼을 제공하고, 확인 팝업을 거쳐 삭제 이력 테이블로 프로젝트 삭제를 관리한다.
- 현재 상태: 완료. 관리자 프로젝트 목록 아이템 끝에 삭제 버튼을 추가하고, 확인 팝업에서 프로젝트 이름과 삭제 경고 문구를 보여준 뒤 삭제 API를 호출하도록 변경했다. 백엔드는 `project_deletions` 테이블에 삭제 이력을 기록하고 삭제된 프로젝트를 목록과 프로젝트 하위 API 접근에서 제외한다.
- 다음 작업: 실제 DB 마이그레이션 적용 후 로그인 상태에서 프로젝트 삭제, 목록 제외, 삭제 프로젝트 접근 차단 흐름을 수동 확인한다.
- 관련 파일: backend/src/main/java/com/example/rag/project/, backend/src/main/resources/db/migration/V5__add_project_deletions.sql, frontend/src/App.tsx, frontend/src/api.ts, frontend/src/components/WorkspaceSidebar.tsx, frontend/src/styles.css

## 프로젝트 추가 팝업 전환

- 시작일: 2026-06-13
- 완료일: 2026-06-13
- 목적: 프로젝트 목록은 유지하고, + 버튼 클릭 시 팝업에서 프로젝트 제목과 간단한 설명을 입력해 추가하도록 변경한다.
- 현재 상태: 완료. 사이드바의 프로젝트 직접 입력 폼을 생성 버튼으로 바꾸고, 프로젝트 추가 모달에서 제목과 설명을 입력해 생성하도록 변경했다. 설명 저장을 위해 프로젝트 API, Entity, 응답 DTO, Flyway 마이그레이션을 함께 반영했다.
- 다음 작업: 실제 DB 마이그레이션 적용 후 브라우저에서 프로젝트 추가 모달과 목록 갱신 흐름을 수동 확인한다.
- 관련 파일: backend/src/main/java/com/example/rag/project/, backend/src/main/resources/db/migration/V4__add_project_description.sql, frontend/src/App.tsx, frontend/src/api.ts, frontend/src/components/WorkspaceSidebar.tsx, frontend/src/types.ts, frontend/src/styles.css

## 워크스페이스 패널 정렬 재조정

- 시작일: 2026-06-10
- 완료일: 2026-06-10
- 목적: 대화/출처/사이드바 패널의 높이와 내부 여백 리듬을 더 자연스럽게 맞춘다.
- 현재 상태: 완료. 상단 작업 바 아래 간격을 줄이고, 대화 스레드의 중첩 배경 박스를 제거해 대화/출처 패널의 시각적 정렬감을 개선했다.
- 다음 작업: 실제 브라우저에서 대화 영역과 출처 레일의 상하 정렬을 수동 확인한다.
- 관련 파일: frontend/src/styles.css

## 워크스페이스 내부 스크롤 고정

- 시작일: 2026-06-10
- 완료일: 2026-06-10
- 목적: 페이지 전체 스크롤을 막고 사이드바, 대화, 출처 영역의 하단 높이를 통일한다.
- 현재 상태: 완료. 워크스페이스를 100vh 고정 레이아웃으로 바꾸고, 사이드바 목록, 대화 스레드, 출처 패널만 내부 스크롤되도록 조정했다.
- 다음 작업: 실제 브라우저에서 하단 정렬과 내부 스크롤 동작을 수동 확인한다.
- 관련 파일: frontend/src/styles.css

## 챗봇 대화 영역 높이 조정

- 시작일: 2026-06-10
- 완료일: 2026-06-10
- 목적: 메시지가 적을 때 대화 영역의 불필요한 빈 공간을 줄인다.
- 현재 상태: 완료. 채팅 패널의 화면 높이 고정을 제거하고 메시지 스레드의 기본 높이를 낮춰, 대화가 적을 때 더 컴팩트하게 보이도록 조정했다.
- 다음 작업: 실제 브라우저에서 메시지 없음/짧은 대화/긴 대화 상태별 높이를 수동 확인한다.
- 관련 파일: frontend/src/styles.css

## 챗봇형 질의 화면 재배치

- 시작일: 2026-06-10
- 완료일: 2026-06-10
- 목적: 질의/답변 영역을 일반적인 챗봇 화면처럼 보이도록 입력창을 대화 영역 하단으로 이동한다.
- 현재 상태: 완료. 상단 질문 타일을 제거하고, 대화 패널 안에 헤더/스크롤 메시지 영역/하단 composer 입력창 구조를 적용했다.
- 다음 작업: 실제 브라우저에서 로그인 후 긴 대화와 모바일 화면에서 입력창/메시지 영역 배치를 수동 확인한다.
- 관련 파일: frontend/src/components/WorkspaceMain.tsx, frontend/src/styles.css

## Apple 스타일 구조 재배치 실험

- 시작일: 2026-06-10
- 완료일: 2026-06-10
- 목적: DESIGN.md의 제품형 레이아웃 감각을 참고해 기존 RAG 화면 구조를 시험 재배치한다.
- 현재 상태: 완료. 상단 frosted 작업 바, 다크 질문 타일, 대화 중심 영역, 오른쪽 출처/상세 컨텍스트 레일, 얇은 사이드 내비게이션 구조로 재배치했다.
- 다음 작업: 실제 브라우저에서 로그인 후 프로젝트/문서/세션/질문 화면의 시각적 밀도와 모바일 접힘을 수동 확인한다.
- 관련 파일: frontend/src/components/WorkspaceMain.tsx, frontend/src/components/WorkspaceSidebar.tsx, frontend/src/styles.css

## Apple 스타일 디자인 테마 실험

- 시작일: 2026-06-10
- 완료일: 2026-06-10
- 목적: DESIGN.md를 참고해 프론트엔드 디자인 테마를 시험 적용한다.
- 현재 상태: 완료. Action Blue, 파치먼트/화이트 캔버스, pill 버튼, SF Pro 계열 폰트 스택, 얇은 hairline 중심으로 프론트엔드 테마를 조정했다.
- 다음 작업: 브라우저 플러그인 연결이 Windows 샌드박스 오류로 실패했으므로 실제 화면에서 인증/워크스페이스 레이아웃을 수동 확인한다.
- 관련 파일: frontend/src/styles.css

## 업로드 오류 메시지 표시 정리

- 시작일: 2026-06-08
- 완료일: 2026-06-08
- 목적: 파일 등록 팝업의 긴 PDF 오류 메시지를 사용자가 읽기 쉬운 형태로 정리한다.
- 현재 상태: 완료. PDF 품질 실패 메시지를 간결하게 줄이고, 업로드 팝업에서는 경고 아이콘과 제목/설명 형태의 안내 박스로 표시하도록 변경했다.
- 다음 작업: 실제 이미지 기반 PDF 업로드 화면에서 안내 박스가 의도대로 보이는지 수동 확인한다.
- 관련 파일: backend/src/main/java/com/example/rag/document/TextExtractor.java, frontend/src/components/UploadForm.tsx, frontend/src/styles.css

## PDF 추출 텍스트 품질 검사 추가

- 시작일: 2026-06-08
- 완료일: 2026-06-08
- 목적: 이미지 기반 또는 깨진 텍스트 PDF가 chunk/embedding으로 저장되지 않도록 업로드 단계에서 거절한다.
- 현재 상태: 완료. PDFBox 추출 결과의 페이지 수 대비 의미 있는 문자 수, 깨진 문자 비율, 의미 문자 비율을 검사해 품질이 낮은 PDF를 BAD_REQUEST로 거절하도록 변경했다.
- 다음 작업: 실제 이미지 기반 PDF 업로드 시 사용자 안내 메시지가 프론트에서 적절히 표시되는지 수동 확인한다.
- 관련 파일: backend/src/main/java/com/example/rag/document/TextExtractor.java, backend/src/test/java/com/example/rag/document/TextExtractorTest.java

## 답변 대기 진행 표시와 타이핑 효과 적용

- 시작일: 2026-06-08
- 완료일: 2026-06-08
- 목적: 질문 요청 후 답변 도착 전 진행 상태를 보여주고, 답변 도착 후 한 글자씩 표시되도록 변경한다.
- 현재 상태: 완료. 질문 요청 대기 중 AI 말풍선에 진행 바를 표시하고, 응답 도착 후 답변을 한 글자씩 렌더링하도록 변경했다.
- 다음 작업: 실제 질문 응답에서 진행 표시와 타이핑 효과를 수동 확인한다.
- 관련 파일: frontend/src/App.tsx, frontend/src/components/WorkspaceMain.tsx, frontend/src/styles.css

## 답변 Markdown 렌더링 적용

- 시작일: 2026-06-08
- 완료일: 2026-06-08
- 목적: 질문 답변 영역에서 Markdown 문법이 화면에 렌더링되도록 변경한다.
- 현재 상태: 완료. AI 답변 메시지에 Markdown/GFM 렌더러를 적용하고, 목록/코드/표/인용문 스타일을 채팅 영역에 맞게 추가했다.
- 다음 작업: 실제 질문 응답에서 Markdown 답변 표시를 수동 확인한다.
- 관련 파일: frontend/package.json, frontend/package-lock.json, frontend/src/components/WorkspaceMain.tsx, frontend/src/styles.css

## Supabase Session pooler 전환

- 시작일: 2026-06-08
- 완료일: 2026-06-08
- 목적: Supabase DB 연결을 Direct에서 Session pooler 방식으로 변경한다.
- 현재 상태: 완료. `.env`, `.env.prod`, `.env.example`의 활성 DB 연결을 Supabase Session pooler로 변경하고 Direct 및 Docker Postgres 연결은 주석 예시로 남겼다.
- 다음 작업: 백엔드 실행으로 Flyway 마이그레이션과 DB 연결을 확인한다.
- 관련 파일: .env, .env.prod, .env.example

## 로컬 환경 DB 연결 전환

- 시작일: 2026-06-08
- 완료일: 2026-06-08
- 목적: 기존 `.env`의 DB 연결을 Supabase Direct 기준으로 바꾸고 Docker Postgres 설정은 주석으로 보존한다.
- 현재 상태: 완료. `.env`의 활성 DB 연결은 Supabase Direct로 변경하고, 기존 Docker Postgres 연결값은 주석으로 남겼다.
- 다음 작업: 실제 접속 전 `.env`의 `SPRING_DATASOURCE_PASSWORD`를 Supabase DB 비밀번호로 교체한다.
- 관련 파일: .env

## 환경변수 예시 통합

- 시작일: 2026-06-08
- 완료일: 2026-06-08
- 목적: 로컬과 운영에서 공통으로 참고할 환경변수 예시를 `.env.example` 하나로 통합한다.
- 현재 상태: 완료. `.env.example`에 OpenAI, JWT, Supabase DB, Supabase Storage, RAG 환경변수를 통합하고 `.env.prod.example`은 제거했다.
- 다음 작업: 실제 환경별 값은 `.env` 또는 `.env.prod`에만 작성한다.
- 관련 파일: .env.example, .env.prod.example

## 운영 환경변수 파일 분리

- 시작일: 2026-06-08
- 완료일: 2026-06-08
- 목적: 실제 운영 설정은 `.env.prod`에 두고 `.env.prod.example`은 템플릿으로 유지한다.
- 현재 상태: 완료. `.env.prod`에 Supabase Direct 연결 값을 두고, `.env.prod.example`은 project ref placeholder를 사용하는 예시 파일로 되돌렸다.
- 다음 작업: 실제 운영 환경에서 `.env.prod`의 `SPRING_DATASOURCE_PASSWORD`를 실제 DB 비밀번호로 교체한다.
- 관련 파일: .env.prod, .env.prod.example

## Supabase Direct URL 반영

- 시작일: 2026-06-08
- 완료일: 2026-06-08
- 목적: 사용자가 복사한 Supabase Direct connection URL 기준으로 운영 환경변수 예시를 수정한다.
- 현재 상태: 완료. 이후 실제 운영 값은 `.env.prod`로 분리하고, `.env.prod.example`은 placeholder 기반 템플릿으로 되돌렸다.
- 다음 작업: 실제 운영 환경에서 `SPRING_DATASOURCE_PASSWORD`를 설정하고 연결을 확인한다.
- 관련 파일: .env.prod, .env.prod.example

## 운영 설정 파일 추가

- 시작일: 2026-06-08
- 완료일: 2026-06-08
- 목적: Supabase Direct DB 연결을 사용하는 운영 환경변수 예시를 추가한다.
- 현재 상태: 완료. `.env.prod.example`에 Supabase Direct JDBC 연결과 HikariCP 최소 설정을 추가하고, 실제 운영 env 파일은 git 추적에서 제외했다.
- 다음 작업: Cloud Run 배포 시 실제 DB 비밀번호와 secret 값을 환경변수 또는 Secret Manager에 설정한다.
- 관련 파일: .env.prod.example, .gitignore

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
