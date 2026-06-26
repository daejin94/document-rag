-- B-1 구조: 봇 = 프로젝트. 채널 바인딩을 봇 설치(토큰 등록)로 대체한다.
-- 들어온 메시지는 "어느 봇이 받았는가"로 프로젝트가 결정된다.

DROP TABLE IF EXISTS chat_bindings;

-- 프로젝트에 등록된 봇. 한 봇 토큰은 한 프로젝트에만 속한다(봇 → 프로젝트 N:1).
CREATE TABLE bot_installations (
    id                 BIGSERIAL PRIMARY KEY,
    platform           VARCHAR(20)  NOT NULL,
    project_id         BIGINT       NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    bot_token          VARCHAR(255) NOT NULL,
    bot_username       VARCHAR(100),
    -- webhook 요청 검증용 secret(설치마다 무작위 생성)
    secret_token       VARCHAR(100) NOT NULL,
    created_by_user_id BIGINT       NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (platform, bot_token)
);

CREATE INDEX idx_bot_installations_project_id ON bot_installations(project_id);

-- inbound_messages: 멱등성·세션 연속성을 봇(설치) 단위로 재정의한다.
-- (update_id는 봇마다 독립적이므로 전역 unique가 아니라 설치 단위 unique여야 한다.)
ALTER TABLE inbound_messages ADD COLUMN installation_id BIGINT;

ALTER TABLE inbound_messages
    DROP CONSTRAINT IF EXISTS inbound_messages_platform_provider_event_id_key;
ALTER TABLE inbound_messages
    ADD CONSTRAINT uq_inbound_installation_event UNIQUE (installation_id, provider_event_id);

DROP INDEX IF EXISTS idx_inbound_messages_conversation;
CREATE INDEX idx_inbound_messages_conversation
    ON inbound_messages(installation_id, external_user_id, created_at DESC);
