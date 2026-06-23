-- 가입 승인 상태 컬럼. 기존 사용자는 이미 활성 계정이므로 APPROVED로 백필한다.
-- 신규 가입은 애플리케이션에서 PENDING으로 INSERT한다.
ALTER TABLE app_users ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'APPROVED';

CREATE INDEX idx_app_users_status ON app_users(status);
