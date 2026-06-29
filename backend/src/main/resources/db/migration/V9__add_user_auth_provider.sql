-- 로컬/구글 등 인증 수단 구분. 기존 계정은 모두 로컬 비밀번호 계정이다.
ALTER TABLE app_users ADD COLUMN auth_provider VARCHAR(20) NOT NULL DEFAULT 'LOCAL';
ALTER TABLE app_users ADD COLUMN provider_id VARCHAR(255);

-- 구글 전용 계정은 비밀번호가 없으므로 NULL을 허용한다.
ALTER TABLE app_users ALTER COLUMN password DROP NOT NULL;

CREATE INDEX idx_app_users_provider ON app_users(auth_provider, provider_id);
