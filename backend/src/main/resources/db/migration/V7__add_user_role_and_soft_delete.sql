ALTER TABLE app_users ADD COLUMN role VARCHAR(30) NOT NULL DEFAULT 'USER';
ALTER TABLE app_users ADD COLUMN deleted_at TIMESTAMPTZ;

CREATE INDEX idx_app_users_role ON app_users(role);
CREATE INDEX idx_app_users_deleted_at ON app_users(deleted_at);
