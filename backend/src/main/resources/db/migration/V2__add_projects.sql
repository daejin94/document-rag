CREATE TABLE projects (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_by_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_created_by_user_id ON projects(created_by_user_id);

CREATE TABLE project_members (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    role VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);

ALTER TABLE documents ADD COLUMN project_id BIGINT;

INSERT INTO projects (name, created_by_user_id)
SELECT name || '의 프로젝트', id
FROM app_users;

INSERT INTO project_members (project_id, user_id, role)
SELECT projects.id, projects.created_by_user_id, 'ADMIN'
FROM projects;

UPDATE documents
SET project_id = projects.id
FROM projects
WHERE projects.created_by_user_id = documents.user_id;

ALTER TABLE documents ALTER COLUMN project_id SET NOT NULL;
ALTER TABLE documents
    ADD CONSTRAINT fk_documents_project_id
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

CREATE INDEX idx_documents_project_id ON documents(project_id);
