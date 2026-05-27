import type { FormEventHandler } from 'react';
import { Bot, FileText, RefreshCw, Send, Upload, Users } from 'lucide-react';
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
  onQuestionChange,
  onAsk,
  onOpenUploadModal,
  onOpenMemberModal,
}: WorkspaceMainProps) {
  return (
    <section className="main-panel">
      <header className="topbar">
        <div>
          <p className="eyebrow">RAG Query</p>
          <h1>{currentProject ? currentProject.name : '문서 기반 대화'}</h1>
        </div>
        <div className="topbar-side">
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
          <div className="selected-docs">
            {selectedDocuments.length === 0 ? (
              <span>전체 문서</span>
            ) : selectedDocuments.map((document) => (
              <span key={document.documentId}>{document.title}</span>
            ))}
          </div>
        </div>
      </header>

      {error && <p className="error-banner">{error}</p>}

      <form className="query-box" onSubmit={onAsk}>
        <textarea
          value={question}
          onChange={(event) => onQuestionChange(event.target.value)}
          placeholder="JWT 인증 흐름 설명해줘."
          rows={4}
        />
        <button className="primary-button send-button" disabled={busy || !currentProjectId} type="submit">
          {busy ? <RefreshCw className="spin" size={18} /> : <Send size={18} />}
          질문
        </button>
      </form>

      <section className="result-layout">
        <article className="answer-panel chat-panel">
          <div className="section-title">
            <Bot size={18} />
            대화
          </div>
          {messages.length > 0 ? (
            <div className="message-list">
              {messages.map((message, index) => (
                <div
                  className={message.role === 'USER' ? 'chat-message user-message' : 'chat-message assistant-message'}
                  key={`${message.createdAt}-${index}`}
                >
                  <strong>{message.role === 'USER' ? '나' : 'AI'}</strong>
                  <p>{message.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-text">새 질문으로 대화를 시작하세요.</p>
          )}
        </article>

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
      </section>

      {detail && (
        <section className="detail-strip">
          <strong>{detail.title}</strong>
          <span>{detail.originalFileName}</span>
          <span>{detail.status}</span>
          <span>{detail.chunkCount} chunks</span>
        </section>
      )}
    </section>
  );
}
