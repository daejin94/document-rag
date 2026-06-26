-- 외부 채팅 플랫폼(텔레그램 등) 연동.
-- 채널 ↔ 프로젝트 바인딩, 외부 사용자 ↔ 앱 계정 매핑, 수신 메시지 비동기 작업 큐.

-- 채널(텔레그램 chat) ↔ 프로젝트 바인딩. 한 채널은 한 프로젝트에만 연결된다.
CREATE TABLE chat_bindings (
    id                 BIGSERIAL PRIMARY KEY,
    platform           VARCHAR(20)  NOT NULL,
    channel_id         VARCHAR(100) NOT NULL,
    project_id         BIGINT       NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_by_user_id BIGINT       NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (platform, channel_id)
);

CREATE INDEX idx_chat_bindings_project_id ON chat_bindings(project_id);

-- 외부 플랫폼 사용자 ↔ 앱 계정 매핑. 매핑된 계정의 권한으로 RAG 질의를 수행한다.
CREATE TABLE identity_links (
    id               BIGSERIAL PRIMARY KEY,
    platform         VARCHAR(20)  NOT NULL,
    external_user_id VARCHAR(100) NOT NULL,
    user_id          BIGINT       NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (platform, external_user_id)
);

CREATE INDEX idx_identity_links_user_id ON identity_links(user_id);

-- 텔레그램 계정 연결용 일회용 코드. 앱에서 발급 → 채팅방에서 /link <code> 로 사용한다.
CREATE TABLE telegram_link_codes (
    id         BIGSERIAL PRIMARY KEY,
    code       VARCHAR(64)  NOT NULL UNIQUE,
    user_id    BIGINT       NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ  NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_telegram_link_codes_user_id ON telegram_link_codes(user_id);

-- 수신 메시지 비동기 작업 큐 + 멱등성. provider_event_id 로 webhook/polling 중복 수신을 차단한다.
CREATE TABLE inbound_messages (
    id                BIGSERIAL PRIMARY KEY,
    platform          VARCHAR(20)  NOT NULL,
    provider_event_id VARCHAR(200) NOT NULL,
    channel_id        VARCHAR(100) NOT NULL,
    external_user_id  VARCHAR(100),
    question          TEXT         NOT NULL,
    reply_ref         VARCHAR(100),
    status            VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    chat_session_id   BIGINT,
    error             TEXT,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (platform, provider_event_id)
);

CREATE INDEX idx_inbound_messages_conversation
    ON inbound_messages(platform, channel_id, external_user_id, created_at DESC);
