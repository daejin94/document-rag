CREATE TABLE token_usages (
    id                BIGSERIAL PRIMARY KEY,
    user_id           BIGINT       NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    project_id        BIGINT       REFERENCES projects(id) ON DELETE SET NULL,
    session_id        BIGINT       REFERENCES chat_sessions(id) ON DELETE SET NULL,
    usage_type        VARCHAR(30)  NOT NULL,
    model             VARCHAR(100) NOT NULL,
    prompt_tokens     INT          NOT NULL DEFAULT 0,
    completion_tokens INT          NOT NULL DEFAULT 0,
    total_tokens      INT          NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_token_usages_user_created ON token_usages(user_id, created_at);
CREATE INDEX idx_token_usages_project ON token_usages(project_id);
