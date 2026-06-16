import {
  FileText,
  Folder,
  LogOut,
  MessageSquare,
  Minus,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
} from 'lucide-react';
import type { ChatSession, DocumentItem, Project } from '../types';

interface WorkspaceSidebarProps {
  projects: Project[];
  documents: DocumentItem[];
  sessions: ChatSession[];
  currentProjectId: number | null;
  currentSessionId: number | null;
  selectedIds: number[];
  isProjectAdmin: boolean;
  onOpenProjectModal: () => void;
  onOpenDeleteProjectModal: (project: Project) => void;
  onSelectProject: (projectId: number) => void;
  onRefresh: () => void;
  onToggleDocument: (documentId: number) => void;
  onInspectDocument: (documentId: number) => void;
  onRemoveDocument: (documentId: number) => void;
  onStartNewSession: () => void;
  onOpenSession: (sessionId: number) => void;
  onLogout: () => void;
}

export function WorkspaceSidebar({
  projects,
  documents,
  sessions,
  currentProjectId,
  currentSessionId,
  selectedIds,
  isProjectAdmin,
  onOpenProjectModal,
  onOpenDeleteProjectModal,
  onSelectProject,
  onRefresh,
  onToggleDocument,
  onInspectDocument,
  onRemoveDocument,
  onStartNewSession,
  onOpenSession,
  onLogout,
}: WorkspaceSidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <div className="brand-row">
          <Shield size={22} />
          <span>Document RAG</span>
        </div>
        <button className="ghost-button logout compact-logout" onClick={onLogout} type="button">
          <LogOut size={17} />
          로그아웃
        </button>
      </div>

      <div className="sidebar-scroll">
        <section className="side-section">
          <div className="section-title">
            <Folder size={17} />
            프로젝트
            <button className="icon-button" onClick={onOpenProjectModal} title="프로젝트 생성" type="button">
              <Plus size={15} />
            </button>
          </div>
          <div className="project-list">
            {projects.map((project) => (
              <article
                className={project.projectId === currentProjectId ? 'project-row active' : 'project-row'}
                key={project.projectId}
              >
                <button
                  className="project-button"
                  onClick={() => onSelectProject(project.projectId)}
                  type="button"
                >
                  <strong>{project.name}</strong>
                  <small>{project.role}</small>
                </button>
                {project.role === 'ADMIN' && (
                  <button
                    className="icon-button danger project-delete-button"
                    onClick={() => onOpenDeleteProjectModal(project)}
                    title="프로젝트 삭제"
                    type="button"
                  >
                    <Minus size={15} />
                  </button>
                )}
              </article>
            ))}
            {projects.length === 0 && <p className="empty-text">프로젝트 없음</p>}
          </div>
        </section>

        <section className="side-section">
          <div className="section-title">
            <FileText size={17} />
            문서
            <button className="icon-button" onClick={onRefresh} title="새로고침" type="button">
              <RefreshCw size={16} />
            </button>
          </div>
          <div className="document-list">
            {documents.map((document) => (
              <article className="document-row" key={document.documentId}>
                <label className="checkline">
                  <input
                    checked={selectedIds.includes(document.documentId)}
                    onChange={() => onToggleDocument(document.documentId)}
                    type="checkbox"
                  />
                  <span>
                    <strong>{document.title}</strong>
                    <small>{document.status} · {document.originalFileName}</small>
                  </span>
                </label>
                <div className="row-tools">
                  <button className="icon-button" onClick={() => onInspectDocument(document.documentId)} title="상세" type="button">
                    <Search size={15} />
                  </button>
                  {isProjectAdmin && (
                    <button className="icon-button danger" onClick={() => onRemoveDocument(document.documentId)} title="삭제" type="button">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </article>
            ))}
            {documents.length === 0 && <p className="empty-text">문서 없음</p>}
          </div>
        </section>

        <section className="side-section compact">
          <div className="section-title session-title">
            <span>
              <MessageSquare size={17} />
              세션
            </span>
            <button className="icon-button" onClick={onStartNewSession} title="새 대화" type="button">
              <Plus size={15} />
            </button>
          </div>
          <div className="session-list">
            {sessions.slice(0, 6).map((session) => (
              <button
                className={session.sessionId === currentSessionId ? 'session-button active' : 'session-button'}
                key={session.sessionId}
                onClick={() => onOpenSession(session.sessionId)}
                type="button"
              >
                {session.title}
              </button>
            ))}
            {sessions.length === 0 && <p className="empty-text">대화 없음</p>}
          </div>
        </section>
      </div>

      <button className="ghost-button logout bottom-logout" onClick={onLogout} type="button">
        <LogOut size={17} />
        로그아웃
      </button>
    </aside>
  );
}
