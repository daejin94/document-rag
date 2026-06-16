CREATE TABLE project_deletions (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    deleted_by_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    deleted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_deletions_deleted_by_user_id ON project_deletions(deleted_by_user_id);
