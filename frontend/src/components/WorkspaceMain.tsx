import { useEffect, useRef, useState, type CSSProperties, type FormEventHandler } from 'react';
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
import type { AnswerMode, ChatMessage, ChatSession, DocumentDetail, DocumentItem, Project, Source, TelegramBot, TelegramLinkCode } from '../types';

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
  answerMode: AnswerMode;
  onAnswerModeChange: (mode: AnswerMode) => void;
  similarityThreshold: number;
  onSimilarityThresholdChange: (value: number) => void;
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
  answerMode,
  onAnswerModeChange,
  similarityThreshold,
  onSimilarityThresholdChange,
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

  // 질문 입력창: 수동 리사이즈 대신 내용(줄바꿈)에 따라 높이를 자동 조절한다.
  const questionRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = questionRef.current;
    if (!el) {
      return;
    }
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [question]);

  // 같은 대화 안에서 새 질문이 추가되면, 쌓인 이전 대화 대신 새 질문이 보이도록 그 위치로 스크롤한다.
  const lastUserMessageRef = useRef<HTMLDivElement>(null);
  const prevFirstMessageKeyRef = useRef<string | null>(null);
  const prevUserMessageCountRef = useRef(0);
  useEffect(() => {
    const firstMessageKey = messages[0] ? `${messages[0].createdAt}-0` : null;
    const userMessageCount = messages.filter((message) => message.role === 'USER').length;
    const isSameConversation = firstMessageKey === prevFirstMessageKeyRef.current;
    if (isSameConversation && userMessageCount > prevUserMessageCountRef.current) {
      lastUserMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    prevFirstMessageKeyRef.current = firstMessageKey;
    prevUserMessageCountRef.current = userMessageCount;
  }, [messages]);
  const lastUserMessageIndex = messages.length - 1 - [...messages].reverse().findIndex((message) => message.role === 'USER');

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
            <details className="telegram-guide">
              <summary>봇 토큰은 어떻게 만드나요?</summary>
              <ol className="telegram-guide-steps">
                <li>
                  텔레그램에서 <strong>@BotFather</strong>를 열고 <code>/newbot</code>을 보냅니다.
                </li>
                <li>안내에 따라 봇 표시 이름과 username(<code>...bot</code>으로 끝남)을 입력합니다.</li>
                <li>
                  BotFather가 보내준 <strong>토큰</strong>(<code>123456:AAG...</code> 형태)을 복사해 아래에
                  붙여넣고 <strong>등록</strong>을 누릅니다.
                </li>
                <li>등록한 봇과 DM을 시작하거나, 봇을 사용할 그룹에 초대합니다.</li>
                <li>
                  사용자는 <strong>프로필 ▸ 텔레그램 연결</strong>에서 계정을 연결한 뒤 봇에게 질문하면 됩니다.
                </li>
              </ol>
              <p className="telegram-guide-tip">
                그룹에서 봇이 일반 메시지를 받지 못하면, @BotFather의 <code>/setprivacy</code>로 privacy
                mode를 끄거나 봇을 그룹 관리자로 지정하세요. 그룹에서는 <code>/ask 질문</code> 또는 봇 멘션으로
                질문할 수 있습니다.
              </p>
            </details>
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
                      ref={index === lastUserMessageIndex ? lastUserMessageRef : undefined}
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

          <div className="composer-controls">
            <div className="answer-mode-toggle" role="group" aria-label="답변 모드">
              <button
                type="button"
                className={`answer-mode-option${answerMode === 'STRICT' ? ' active' : ''}`}
                onClick={() => onAnswerModeChange('STRICT')}
                title="업로드한 문서 내용만으로 답합니다."
              >
                문서만
              </button>
              <button
                type="button"
                className={`answer-mode-option${answerMode === 'HYBRID' ? ' active' : ''}`}
                onClick={() => onAnswerModeChange('HYBRID')}
                title="문서를 우선하되, 부족하면 AI 일반 지식으로 보충합니다."
              >
                문서 + AI 보충
              </button>
            </div>
            <div
              className={`threshold-control${answerMode === 'HYBRID' ? ' disabled' : ''}`}
              title={answerMode === 'HYBRID'
                ? '문서 + AI 보충 모드에서는 문서가 부족해도 AI가 답하므로 문서 일치 기준이 적용되지 않습니다.'
                : '낮음: 살짝만 관련 있어도 답변에 사용합니다. 높음: 질문과 확실히 일치하는 문서만 사용합니다.'}
            >
              <label htmlFor="threshold-range">문서 일치 기준</label>
              <input
                id="threshold-range"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={similarityThreshold}
                disabled={answerMode === 'HYBRID'}
                onChange={(event) => onSimilarityThresholdChange(Number(event.target.value))}
                style={{ '--fill': `${Math.round(similarityThreshold * 100)}%` } as CSSProperties}
              />
              <span className="threshold-value">{Math.round(similarityThreshold * 100)}%</span>
            </div>
          </div>

          <form className="chat-composer" onSubmit={onAsk}>
            <textarea
              ref={questionRef}
              value={question}
              onChange={(event) => onQuestionChange(event.target.value)}
              onKeyDown={(event) => {
                // Enter로 전송, Shift+Enter는 줄바꿈. 전송 불가 상태에서는 무시한다.
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  if (!busy && currentProjectId) {
                    event.currentTarget.form?.requestSubmit();
                  }
                }
              }}
              placeholder={answerMode === 'HYBRID' ? '문서 + AI 지식으로 답합니다 (Enter 전송)' : '질문하거나 창작하세요 (Enter 전송)'}
              rows={1}
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
