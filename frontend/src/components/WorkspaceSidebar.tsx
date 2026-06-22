import {
  FileText,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
} from 'lucide-react';
import type { ChatSession, DocumentItem } from '../types';

interface WorkspaceSidebarProps {
  documents: DocumentItem[];
  sessions: ChatSession[];
  currentProjectId: number | null;
  currentSessionId: number | null;
  selectedIds: number[];
  isProjectAdmin: boolean;
  onRefresh: () => void;
  onToggleDocument: (documentId: number) => void;
  onInspectDocument: (documentId: number) => void;
  onRemoveDocument: (documentId: number) => void;
  onToggleAllDocuments: () => void;
  onOpenUploadModal: () => void;
  onStartNewSession: () => void;
  onOpenSession: (sessionId: number) => void;
}

export function WorkspaceSidebar({
  documents,
  sessions,
  currentProjectId,
  currentSessionId,
  selectedIds,
  isProjectAdmin,
  onRefresh,
  onToggleDocument,
  onInspectDocument,
  onRemoveDocument,
  onToggleAllDocuments,
  onOpenUploadModal,
  onStartNewSession,
  onOpenSession,
}: WorkspaceSidebarProps) {
  const hasDocuments = documents.length > 0;
  const isAllSelected = hasDocuments && selectedIds.length === documents.length;

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <div className="brand-row">
          <Shield size={22} />
          <span>Document RAG</span>
        </div>
      </div>

      <div className="sidebar-scroll">
        <section className="side-section source-section">
          <div className="section-title">
            <FileText size={17} />
            출처
            <div className="section-title-actions">
              <button className="icon-button" onClick={onRefresh} title="새로고침" type="button">
                <RefreshCw size={16} />
              </button>
              <button
                className="icon-button source-add-icon"
                disabled={!currentProjectId}
                onClick={onOpenUploadModal}
                title="소스 추가"
                type="button"
              >
                <Plus size={17} />
                <span className="source-add-label">소스 추가</span>
              </button>
            </div>
          </div>
          <div className="source-search" aria-hidden="true">
            <Search size={16} />
            <span>업로드한 소스에서 검색</span>
          </div>

          <div className="source-toolbar">
            <button disabled={!hasDocuments} onClick={onToggleAllDocuments} type="button">
              {isAllSelected ? '전체 해제' : '모두 선택'}
            </button>
            <span>{selectedIds.length} / {documents.length}</span>
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

        <section className="side-section project-section">
          <div className="section-title session-title">
            <span>
              <MessageSquare size={17} />
              대화 기록
            </span>
            <button className="icon-button" onClick={onStartNewSession} title="새 대화" type="button">
              <Plus size={15} />
            </button>
          </div>
          <div className="session-list">
            {sessions.map((session) => (
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
    </aside>
  );
}
