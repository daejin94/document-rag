import type { FormEventHandler } from 'react';
import { Bot, FileText, RefreshCw, Send, Upload, Users } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage, DocumentDetail, DocumentItem, Project, Source } from '../types';

interface WorkspaceMainProps {
  currentProject: Project | null;
  currentProjectId: number | null;
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
}

export function WorkspaceMain({
  currentProject,
  currentProjectId,
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
}: WorkspaceMainProps) {
  return (
    <section className="main-panel">
      <header className="workspace-nav">
        <div className="workspace-nav-title">
          <strong>{currentProject ? currentProject.name : '문서 기반 대화'}</strong>
          <div className="selected-docs">
            {selectedDocuments.length === 0 ? (
              <span>전체 문서</span>
            ) : selectedDocuments.map((document) => (
              <span key={document.documentId}>{document.title}</span>
            ))}
          </div>
        </div>
        <div className="topbar-actions">
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
        </div>
      </header>

      {error && <p className="error-banner">{error}</p>}

      <section className="conversation-layout">
        <article className="answer-panel chat-panel">
          <div className="chat-heading">
            <div>
              <p className="eyebrow">RAG Query</p>
              <h1>문서에서 답을 찾는 대화</h1>
            </div>
            <span>
              <Bot size={18} />
              AI 대화
            </span>
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
                <p>새 질문으로 대화를 시작하세요.</p>
              </div>
            )}
          </div>

          <form className="chat-composer" onSubmit={onAsk}>
            <textarea
              value={question}
              onChange={(event) => onQuestionChange(event.target.value)}
              placeholder="JWT 인증 흐름 설명해줘."
              rows={3}
            />
            <button className="primary-button send-button" disabled={busy || !currentProjectId} type="submit">
              {busy ? <RefreshCw className="spin" size={18} /> : <Send size={18} />}
              질문
            </button>
          </form>
        </article>

        <section className="context-rail">
          <article className="source-panel">
            <div className="section-title">
              <FileText size={18} />
              출처
            </div>
            {latestSources.map((source) => (
              <div className="source-item" key={source.chunkId}>
                <strong>{source.documentTitle}</strong>
                <small>chunk {source.chunkIndex} · {(source.similarity * 100).toFixed(1)}%</small>
                <p>{source.contentPreview}</p>
              </div>
            ))}
            {latestSources.length === 0 && <p className="empty-text">출처 없음</p>}
          </article>

          {detail && (
            <section className="detail-strip">
              <strong>{detail.title}</strong>
              <span>{detail.originalFileName}</span>
              <span>{detail.status}</span>
              <span>{detail.chunkCount} chunks</span>
            </section>
          )}
        </section>
      </section>
    </section>
  );
}
