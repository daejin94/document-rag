ALTER TABLE chat_sessions ADD COLUMN project_id BIGINT;

UPDATE chat_sessions cs
SET project_id = source_projects.project_id
FROM (
    SELECT DISTINCT ON (cm.chat_session_id)
        cm.chat_session_id,
        d.project_id
    FROM chat_messages cm
    JOIN answer_sources ans ON ans.chat_message_id = cm.id
    JOIN document_chunks dc ON dc.id = ans.document_chunk_id
    JOIN documents d ON d.id = dc.document_id
    ORDER BY cm.chat_session_id, ans.created_at ASC
) source_projects
WHERE source_projects.chat_session_id = cs.id;

UPDATE chat_sessions cs
SET project_id = fallback_projects.project_id
FROM (
    SELECT DISTINCT ON (created_by_user_id)
        created_by_user_id,
        id AS project_id
    FROM projects
    ORDER BY created_by_user_id, id ASC
) fallback_projects
WHERE fallback_projects.created_by_user_id = cs.user_id
  AND cs.project_id IS NULL;

ALTER TABLE chat_sessions ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE chat_sessions
    ADD CONSTRAINT fk_chat_sessions_project_id
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

CREATE INDEX idx_chat_sessions_project_id ON chat_sessions(project_id);
CREATE INDEX idx_chat_sessions_user_project ON chat_sessions(user_id, project_id);
