import { useState, type FormEventHandler } from 'react';
import {
  Bot,
  CircleUserRound,
  FileText,
  LogOut,
  MoreVertical,
  Plus,
  RefreshCw,
  Send,
  Upload,
  Trash2,
  Users,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage, ChatSession, DocumentDetail, DocumentItem, Project, Source } from '../types';

interface WorkspaceMainProps {
  currentProject: Project | null;
  currentProjectId: number | null;
  projects: Project[];
  documents: DocumentItem[];
  sessions: ChatSession[];
  selectedDocuments: DocumentItem[];
  messages: ChatMessage[];
  latestSources: Source[];
  detail: DocumentDetail | null;
  question: string;
  error: string;
  busy: boolean;
  answerStatus: 'idle' | 'waiting' | 'typing';
  onQuestionChange: (question: string) => void;
  onAsk: FormEventHandler<HTMLFormElement>;
  onOpenUploadModal: () => void;
  onOpenMemberModal: () => void;
  onOpenProjectModal: () => void;
  onOpenDeleteProjectModal: (project: Project) => void;
  onSelectProject: (projectId: number) => void;
  onStartNewSession: () => void;
  onLogout: () => void;
  userEmail: string;
}

export function WorkspaceMain({
  currentProject,
  currentProjectId,
  projects,
  documents,
  sessions,
  selectedDocuments,
  messages,
  latestSources,
  detail,
  question,
  error,
  busy,
  answerStatus,
  onQuestionChange,
  onAsk,
  onOpenUploadModal,
  onOpenMemberModal,
  onOpenProjectModal,
  onOpenDeleteProjectModal,
  onSelectProject,
  onStartNewSession,
  onLogout,
  userEmail,
}: WorkspaceMainProps) {
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileEmail = userEmail || '로그인 사용자';
  const profileName = userEmail ? userEmail.split('@')[0] : '사용자';

  return (
    <section className="main-panel">
      <header className="workspace-nav">
        <div className="workspace-nav-title">
          <strong>{currentProject ? currentProject.name : '문서 기반 대화'}</strong>
          <span className="project-summary">
            {documents.length}개 소스 · {sessions.length}개 대화
          </span>
        </div>
        <div className="topbar-actions">
          <div className="project-controls">
            <select
              aria-label="프로젝트 선택"
              disabled={projects.length === 0}
              onChange={(event) => {
                if (event.target.value) {
                  onSelectProject(Number(event.target.value));
                }
              }}
              value={currentProjectId ?? ''}
            >
              {projects.length === 0 ? (
                <option value="">프로젝트 없음</option>
              ) : (
                <>
                  <option value="">프로젝트 선택</option>
                  {projects.map((project) => (
                    <option key={project.projectId} value={project.projectId}>
                      {project.name}
                    </option>
                  ))}
                </>
              )}
            </select>
            <button className="icon-button nav-icon-button" onClick={onOpenProjectModal} title="프로젝트 생성" type="button">
              <Plus size={16} />
            </button>
            {currentProject?.role === 'ADMIN' && (
              <button
                className="icon-button nav-icon-button danger"
                onClick={() => onOpenDeleteProjectModal(currentProject)}
                title="프로젝트 삭제"
                type="button"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
          <button
            className="primary-button action-button"
            disabled={!currentProjectId}
            onClick={onStartNewSession}
            type="button"
          >
            <Plus size={16} />
            새 대화
          </button>
          <button
            className="ghost-button action-button"
            disabled={!currentProjectId}
            onClick={onOpenUploadModal}
            type="button"
          >
            <Upload size={16} />
            파일 등록
          </button>
          <button
            className="ghost-button action-button"
            disabled={!currentProjectId}
            onClick={onOpenMemberModal}
            type="button"
          >
            <Users size={16} />
            멤버 관리
          </button>
          <div className="profile-menu-wrap">
            <button
              aria-expanded={isProfileMenuOpen}
              className="icon-button nav-icon-button profile-trigger"
              onClick={() => setProfileMenuOpen((current) => !current)}
              title="프로필"
              type="button"
            >
              <CircleUserRound size={18} />
            </button>
            {isProfileMenuOpen && (
              <div className="profile-dropdown">
                <div className="profile-card">
                  <div className="profile-avatar">
                    <CircleUserRound size={38} />
                  </div>
                  <strong>{profileName}님</strong>
                  <span>{profileEmail}</span>
                  <small>{currentProject ? `현재 프로젝트 권한: ${currentProject.role}` : '선택된 프로젝트 없음'}</small>
                </div>
                <button
                  className="profile-logout"
                  onClick={onLogout}
                  type="button"
                >
                  <LogOut size={16} />
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {error && <p className="error-banner">{error}</p>}

      <section className="conversation-layout">
        <article className="answer-panel chat-panel">
          <div className="chat-heading">
            <h1>채팅</h1>
            <div className="selected-docs">
              {selectedDocuments.length === 0 ? (
                <span>전체 소스</span>
              ) : selectedDocuments.map((document) => (
                <span key={document.documentId}>{document.title}</span>
              ))}
            </div>
          </div>

          <div className="chat-thread">
            {messages.length > 0 ? (
              <div className="message-list">
                {messages.map((message, index) => {
                  const isTypingAssistant = (
                    answerStatus === 'typing'
                    && message.role === 'ASSISTANT'
                    && index === messages.length - 1
                  );
                  const messageClassName = message.role === 'USER'
                    ? 'chat-message user-message'
                    : `chat-message assistant-message${isTypingAssistant ? ' typing-message' : ''}`;

                  return (
                    <div
                      className={messageClassName}
                      key={`${message.createdAt}-${index}`}
                    >
                      <strong>{message.role === 'USER' ? '나' : 'AI'}</strong>
                      {message.role === 'ASSISTANT' ? (
                        <div className="markdown-content">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                          {isTypingAssistant && <span className="typing-cursor" aria-hidden="true" />}
                        </div>
                      ) : (
                        <p className="plain-message">{message.content}</p>
                      )}
                    </div>
                  );
                })}
                {answerStatus === 'waiting' && (
                  <div className="chat-message assistant-message pending-message" aria-live="polite">
                    <strong>AI</strong>
                    <div className="answer-progress">
                      <span>문서 검색과 답변 생성을 진행 중입니다.</span>
                      <div className="answer-progress-track">
                        <i />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="chat-empty-state">
                <Bot size={28} />
                <p>선택한 소스를 바탕으로 질문을 시작하세요.</p>
              </div>
            )}
          </div>

          <form className="chat-composer" onSubmit={onAsk}>
            <textarea
              value={question}
              onChange={(event) => onQuestionChange(event.target.value)}
              placeholder="질문하거나 창작하세요"
              rows={3}
            />
            <button className="primary-button send-button" disabled={busy || !currentProjectId} type="submit">
              {busy ? <RefreshCw className="spin" size={18} /> : <Send size={18} />}
              질문
            </button>
          </form>
        </article>

        <aside className="studio-panel similarity-panel">
          <div className="studio-header">
            <h2>검색 유사도 결과</h2>
            <button className="icon-button nav-icon-button" title="결과 옵션" type="button">
              <MoreVertical size={17} />
            </button>
          </div>

          <div className="similarity-summary">
            <FileText size={18} />
            <span>
              {latestSources.length > 0
                ? `${latestSources.length}개 chunk가 답변 근거로 사용됐습니다.`
                : '질문 후 검색된 chunk와 유사도가 여기에 표시됩니다.'}
            </span>
          </div>

          <section className="studio-section similarity-results">
            <div className="section-title">
              <FileText size={18} />
              검색 결과
            </div>
            {latestSources.map((source) => (
              <div className="source-item" key={source.chunkId}>
                <strong>{source.documentTitle}</strong>
                <small>chunk {source.chunkIndex} · 유사도 {(source.similarity * 100).toFixed(1)}%</small>
                <p>{source.contentPreview}</p>
              </div>
            ))}
            {latestSources.length === 0 && <p className="empty-text">검색 결과 없음</p>}
          </section>

          {detail && (
            <section className="detail-strip">
              <strong>{detail.title}</strong>
              <span>{detail.originalFileName}</span>
              <span>{detail.status}</span>
              <span>{detail.chunkCount} chunks</span>
            </section>
          )}
        </aside>
      </section>
    </section>
  );
}
