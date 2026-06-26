import { useState, type FormEventHandler } from 'react';
import {
  Bot,
  CircleUserRound,
  FileText,
  FolderKanban,
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
import { Modal } from './Modal';
import { Dropdown } from './Dropdown';
import type { ChatMessage, ChatSession, DocumentDetail, DocumentItem, Project, Source, TelegramBot, TelegramLinkCode } from '../types';

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
  onIssueTelegramCode: () => Promise<TelegramLinkCode>;
  onFetchBots: (projectId: number) => Promise<TelegramBot[]>;
  onRegisterBot: (projectId: number, botToken: string) => Promise<TelegramBot>;
  onDeleteBot: (projectId: number, installationId: number) => Promise<void>;
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
  onIssueTelegramCode,
  onFetchBots,
  onRegisterBot,
  onDeleteBot,
  userEmail,
}: WorkspaceMainProps) {
  const [isProfileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isProjectsModalOpen, setProjectsModalOpen] = useState(false);
  const [isTelegramModalOpen, setTelegramModalOpen] = useState(false);
  const [telegramCode, setTelegramCode] = useState<TelegramLinkCode | null>(null);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramError, setTelegramError] = useState('');
  const profileEmail = userEmail || '로그인 사용자';
  const profileName = userEmail ? userEmail.split('@')[0] : '사용자';

  const [isBotModalOpen, setBotModalOpen] = useState(false);
  const [bots, setBots] = useState<TelegramBot[]>([]);
  const [botToken, setBotToken] = useState('');
  const [botLoading, setBotLoading] = useState(false);
  const [botError, setBotError] = useState('');

  async function openTelegramModal() {
    setProfileMenuOpen(false);
    setTelegramModalOpen(true);
    setTelegramCode(null);
    setTelegramError('');
    setTelegramLoading(true);
    try {
      setTelegramCode(await onIssueTelegramCode());
    } catch (err) {
      setTelegramError(err instanceof Error ? err.message : '코드 발급에 실패했습니다.');
    } finally {
      setTelegramLoading(false);
    }
  }

  async function loadBots(projectId: number) {
    setBotLoading(true);
    setBotError('');
    try {
      setBots(await onFetchBots(projectId));
    } catch (err) {
      setBotError(err instanceof Error ? err.message : '봇 목록을 불러오지 못했습니다.');
    } finally {
      setBotLoading(false);
    }
  }

  function openBotModal() {
    if (!currentProjectId) {
      return;
    }
    setBotToken('');
    setBotError('');
    setBots([]);
    setBotModalOpen(true);
    void loadBots(currentProjectId);
  }

  const submitBot: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!currentProjectId || !botToken.trim()) {
      return;
    }
    setBotLoading(true);
    setBotError('');
    try {
      await onRegisterBot(currentProjectId, botToken.trim());
      setBotToken('');
      await loadBots(currentProjectId);
    } catch (err) {
      setBotError(err instanceof Error ? err.message : '봇 등록에 실패했습니다.');
      setBotLoading(false);
    }
  };

  async function removeBot(installationId: number) {
    if (!currentProjectId) {
      return;
    }
    setBotLoading(true);
    setBotError('');
    try {
      await onDeleteBot(currentProjectId, installationId);
      await loadBots(currentProjectId);
    } catch (err) {
      setBotError(err instanceof Error ? err.message : '봇 삭제에 실패했습니다.');
      setBotLoading(false);
    }
  }

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
            <Dropdown
              ariaLabel="프로젝트 선택"
              disabled={projects.length === 0}
              onChange={(value) => {
                if (value) {
                  onSelectProject(Number(value));
                }
              }}
              options={projects.map((project) => ({
                value: String(project.projectId),
                label: project.name,
              }))}
              placeholder={projects.length === 0 ? '프로젝트 없음' : '프로젝트 선택'}
              value={currentProjectId ? String(currentProjectId) : ''}
            />
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
            title="새 대화"
            type="button"
          >
            <Plus size={16} />
            <span className="action-label">새 대화</span>
          </button>
          <button
            className="ghost-button action-button"
            disabled={!currentProjectId}
            onClick={onOpenUploadModal}
            title="파일 등록"
            type="button"
          >
            <Upload size={16} />
            <span className="action-label">파일 등록</span>
          </button>
          <button
            className="ghost-button action-button"
            disabled={!currentProjectId}
            onClick={onOpenMemberModal}
            title="멤버 관리"
            type="button"
          >
            <Users size={16} />
            <span className="action-label">멤버 관리</span>
          </button>
          {currentProject?.role === 'ADMIN' && (
            <button
              className="ghost-button action-button"
              disabled={!currentProjectId}
              onClick={openBotModal}
              title="텔레그램 봇"
              type="button"
            >
              <Bot size={16} />
              <span className="action-label">텔레그램 봇</span>
            </button>
          )}
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
                </div>
                <div className="profile-actions">
                  <button
                    className="profile-action"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      setProjectsModalOpen(true);
                    }}
                    type="button"
                  >
                    <FolderKanban size={16} />
                    프로젝트 관리
                  </button>
                  <button
                    className="profile-action"
                    onClick={openTelegramModal}
                    type="button"
                  >
                    <Bot size={16} />
                    텔레그램 연결
                  </button>
                  <button
                    className="profile-action profile-logout"
                    onClick={onLogout}
                    type="button"
                  >
                    <LogOut size={16} />
                    로그아웃
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {isTelegramModalOpen && (
        <Modal title="텔레그램 연결" onClose={() => setTelegramModalOpen(false)}>
          <div className="telegram-link">
            <p className="telegram-link-desc">
              아래 코드를 텔레그램 봇(@DocQTest_bot) 채팅방에 <code>/link &lt;코드&gt;</code> 형태로 입력하면
              이 계정과 연결됩니다. 코드는 발급 후 10분간 유효합니다.
            </p>
            {telegramLoading && <p className="empty-text">코드를 발급하는 중…</p>}
            {telegramError && <p className="form-error">{telegramError}</p>}
            {telegramCode && (
              <>
                <div className="telegram-code">{telegramCode.code}</div>
                <div className="telegram-link-command">
                  <code>/link {telegramCode.code}</code>
                  <button
                    className="ghost-button action-button"
                    onClick={() => navigator.clipboard?.writeText(`/link ${telegramCode.code}`)}
                    type="button"
                  >
                    복사
                  </button>
                </div>
                <button className="ghost-button action-button" onClick={openTelegramModal} type="button">
                  <RefreshCw size={16} />
                  <span className="action-label">코드 재발급</span>
                </button>
              </>
            )}
          </div>
        </Modal>
      )}

      {isBotModalOpen && (
        <Modal title="텔레그램 봇 등록" onClose={() => setBotModalOpen(false)}>
          <div className="telegram-link">
            <p className="telegram-link-desc">
              @BotFather에서 만든 봇 토큰을 입력하면 이 프로젝트에 연결됩니다. 이후 그 봇과의 DM이나
              봇이 초대된 그룹의 질문은 모두 이 프로젝트 문서로 답변합니다.
            </p>
            <form className="binding-form" onSubmit={submitBot}>
              <input
                onChange={(event) => setBotToken(event.target.value)}
                placeholder="봇 토큰 (예: 8816265723:AAG...)"
                value={botToken}
              />
              <button
                className="primary-button action-button"
                disabled={botLoading || !botToken.trim()}
                type="submit"
              >
                <Plus size={16} />
                <span className="action-label">등록</span>
              </button>
            </form>
            {botError && <p className="form-error">{botError}</p>}
            <div className="binding-list">
              {botLoading && bots.length === 0 ? (
                <p className="empty-text">불러오는 중…</p>
              ) : bots.length === 0 ? (
                <p className="empty-text">등록된 봇이 없습니다</p>
              ) : (
                bots.map((bot) => (
                  <div className="binding-row" key={bot.id}>
                    <span className="binding-info">
                      <strong>{bot.botUsername ? `@${bot.botUsername}` : '(이름 없음)'}</strong>
                      <small>{bot.maskedToken}</small>
                    </span>
                    <button
                      className="icon-button nav-icon-button danger"
                      disabled={botLoading}
                      onClick={() => removeBot(bot.id)}
                      title="봇 삭제"
                      type="button"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </Modal>
      )}

      {isProjectsModalOpen && (
        <Modal title="프로젝트 관리" onClose={() => setProjectsModalOpen(false)}>
          <div className="project-overview">
            <p className="project-overview-desc">내가 속한 프로젝트와 각 프로젝트에서의 권한입니다.</p>
            <div className="project-overview-list">
              {projects.length === 0 ? (
                <p className="empty-text">속한 프로젝트가 없습니다</p>
              ) : (
                projects.map((project) => (
                  <button
                    className={`project-overview-row${project.projectId === currentProjectId ? ' active' : ''}`}
                    key={project.projectId}
                    onClick={() => {
                      onSelectProject(project.projectId);
                      setProjectsModalOpen(false);
                    }}
                    type="button"
                  >
                    <span className="project-overview-info">
                      <strong>{project.name}</strong>
                      {project.description && <small>{project.description}</small>}
                    </span>
                    <span className={`role-badge role-${project.role.toLowerCase()}`}>
                      {project.role === 'ADMIN' ? '관리자' : '멤버'}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </Modal>
      )}

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
                <p>
                  {projects.length === 0 ? (
                    <strong>먼저 프로젝트를 생성해 주세요!</strong>
                  ) : !currentProjectId ? (
                    '프로젝트를 선택해 주세요.'
                  ) : (
                    '선택한 소스를 바탕으로 질문을 시작하세요.'
                  )}
                </p>
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
            <button className="icon-button nav-icon-button" disabled title="결과 옵션" type="button">
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
