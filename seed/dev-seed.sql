-- 개발/테스트 전용 시드 데이터 (운영 환경에서 실행하지 말 것)
--
-- Flyway 마이그레이션이 아니라 수동 실행용 스크립트다. 여러 번 실행해도 안전하도록(idempotent)
-- 작성되어 있다. 적용 방법은 seed/README 또는 아래 명령 참고:
--
--   PGPASSWORD=rag_password psql -h localhost -p 15432 -U rag_user -d rag_db -f seed/dev-seed.sql
--
-- 생성되는 테스트 계정 (비밀번호는 BCrypt 해시로 저장):
--   admin@example.com / admin1234  (이름: 관리자)   → 공유 프로젝트 ADMIN
--   user@example.com  / user1234   (이름: 일반사용자) → 공유 프로젝트 MEMBER

-- 1) 테스트 계정 2개
INSERT INTO app_users (email, password, name)
VALUES
  ('admin@example.com', '$2a$10$pcd75iqLcs4TdYRNY3aPrOqOeq8ine7FA7xcOI0JpWU.8JEQ03nnO', '관리자'),
  ('user@example.com',  '$2a$10$TwmeIODYpcE5S520RayJyem/KGv/4O4oLnuLbiQEB3vwCmob74mn6', '일반사용자')
ON CONFLICT (email) DO NOTHING;

-- 2) 공유 테스트 프로젝트 (admin 소유) — 이름 중복 생성 방지
INSERT INTO projects (name, description, created_by_user_id)
SELECT '테스트 프로젝트', '시드로 생성된 공유 테스트 프로젝트', u.id
FROM app_users u
WHERE u.email = 'admin@example.com'
  AND NOT EXISTS (
    SELECT 1 FROM projects p
    WHERE p.name = '테스트 프로젝트' AND p.created_by_user_id = u.id
  );

-- 3) 멤버 등록: admin = ADMIN
INSERT INTO project_members (project_id, user_id, role)
SELECT p.id, u.id, 'ADMIN'
FROM projects p
JOIN app_users u ON u.email = 'admin@example.com' AND p.created_by_user_id = u.id
WHERE p.name = '테스트 프로젝트'
ON CONFLICT (project_id, user_id) DO NOTHING;

-- 4) 멤버 등록: user = MEMBER
INSERT INTO project_members (project_id, user_id, role)
SELECT p.id, u.id, 'MEMBER'
FROM projects p
JOIN app_users admin ON admin.email = 'admin@example.com' AND p.created_by_user_id = admin.id
JOIN app_users u ON u.email = 'user@example.com'
WHERE p.name = '테스트 프로젝트'
ON CONFLICT (project_id, user_id) DO NOTHING;
