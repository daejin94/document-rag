# 진행 중 작업

## 라이트 모드 지원

- 시작일: 2026-07-01
- 목적: 다크 테마 전용이던 프론트엔드에 라이트 모드를 추가한다. 수동 토글 버튼 + localStorage 저장 + 전체 화면(로그인/워크스페이스/관리자) 적용.
- 현재 상태: Phase 1(테마 인프라 + 토글 + 로그인/회원가입/관리자 화면) 완료.
  - `frontend/src/theme.tsx`(ThemeProvider/useTheme), `frontend/src/components/ThemeToggle.tsx` 추가.
  - `main.tsx`에 ThemeProvider 연결, `index.html`에 FOUC 방지 인라인 스크립트 추가.
  - 로그인/회원가입/관리자 화면은 이미 CSS 변수 기반이라, `.auth-shell`/`.admin-shell`의 다크 팔레트 오버라이드 블록(styles.css)을 `[data-theme='dark']`로 감싸는 것만으로 라이트 모드 지원 완료. hex 색상 직접 변경 없음.
  - 워크스페이스/채팅 화면은 hex가 선택자에 직접 박혀 있어 아직 다크 고정 — Phase 2 대상.
- 다음 작업: Phase 2 — 워크스페이스/사이드바/채팅 영역의 하드코딩된 hex를 CSS 변수로 치환하고 중복 선택자(`.chat-composer`, `.markdown-content`, `.user-message`) 병합, `WorkspaceSidebar.tsx`에 토글 배치.
- 관련 파일: frontend/src/styles.css, frontend/src/theme.tsx, frontend/src/components/ThemeToggle.tsx, frontend/src/components/WorkspaceSidebar.tsx, frontend/src/main.tsx, frontend/index.html
