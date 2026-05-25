import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Bot,
  FileText,
  LogOut,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  Shield,
  Trash2,
} from 'lucide-react';
import {
  deleteDocument,
  fetchDocumentDetail,
  fetchDocuments,
  fetchMessages,
  fetchSessions,
  queryDocuments,
} from './api';
import { AuthScreen } from './components/AuthScreen';
import { UploadForm } from './components/UploadForm';
import type { ChatMessage, ChatSession, DocumentDetail, DocumentItem } from './types';

const tokenKey = 'document-rag-token';

export function App() {
  const [token, setToken] = useState(() => localStorage.getItem(tokenKey) || '');

  function handleAuthenticated(accessToken: string) {
    localStorage.setItem(tokenKey, accessToken);
    setToken(accessToken);
  }

  if (!token) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  return <Workspace token={token} onLogout={() => {
    localStorage.removeItem(tokenKey);
    setToken('');
  }} />;
}

function Workspace({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [detail, setDetail] = useState<DocumentDetail | null>(null);
  const [question, setQuestion] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const selectedDocuments = useMemo(
    () => documents.filter((document) => selectedIds.includes(document.documentId)),
    [documents, selectedIds],
  );

  const latestSources = useMemo(() => {
    const assistantMessage = [...messages].reverse().find((message) => message.role === 'ASSISTANT');
    return assistantMessage?.sources ?? [];
  }, [messages]);

  async function refresh() {
    setError('');
    try {
      const [documentItems, sessionItems] = await Promise.all([
        fetchDocuments(token),
        fetchSessions(token),
      ]);
      setDocuments(documentItems);
      setSessions(sessionItems);
      setSelectedIds((current) => current.filter((id) => documentItems.some((document) => document.documentId === id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오지 못했습니다.');
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function inspect(documentId: number) {
    setError('');
    try {
      setDetail(await fetchDocumentDetail(token, documentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : '문서 상세 조회에 실패했습니다.');
    }
  }

  async function openSession(sessionId: number) {
    setError('');
    setBusy(true);
    try {
      const sessionMessages = await fetchMessages(token, sessionId);
      setCurrentSessionId(sessionId);
      setMessages(sessionMessages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '대화 내역 조회에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  function startNewSession() {
    setCurrentSessionId(null);
    setMessages([]);
    setQuestion('');
    setError('');
  }

  async function remove(documentId: number) {
    setError('');
    try {
      await deleteDocument(token, documentId);
      if (detail?.documentId === documentId) {
        setDetail(null);
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '문서 삭제에 실패했습니다.');
    }
  }

  async function ask(event: FormEvent) {
    event.preventDefault();
    if (!question.trim()) {
      return;
    }
    setBusy(true);
    setError('');
    const userMessage: ChatMessage = {
      role: 'USER',
      content: question.trim(),
      sources: [],
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, userMessage]);
    try {
      const response = await queryDocuments(token, userMessage.content, selectedIds, currentSessionId ?? undefined);
      setCurrentSessionId(response.sessionId);
      setMessages((current) => [
        ...current,
        {
          role: 'ASSISTANT',
          content: response.answer,
          sources: response.sources,
          createdAt: new Date().toISOString(),
        },
      ]);
      setQuestion('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '질문 요청에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  function toggle(documentId: number) {
    setSelectedIds((current) => (
      current.includes(documentId)
        ? current.filter((id) => id !== documentId)
        : [...current, documentId]
    ));
  }

  return (
    <main className="workspace">
      <aside className="sidebar">
        <div className="brand-row">
          <Shield size={22} />
          <span>Document RAG</span>
        </div>
        <UploadForm token={token} onUploaded={refresh} />
        <section className="side-section">
          <div className="section-title">
            <FileText size={17} />
            문서
            <button className="icon-button" onClick={refresh} title="새로고침" type="button">
              <RefreshCw size={16} />
            </button>
          </div>
          <div className="document-list">
            {documents.map((document) => (
              <article className="document-row" key={document.documentId}>
                <label className="checkline">
                  <input
                    checked={selectedIds.includes(document.documentId)}
                    onChange={() => toggle(document.documentId)}
                    type="checkbox"
                  />
                  <span>
                    <strong>{document.title}</strong>
                    <small>{document.status} · {document.originalFileName}</small>
                  </span>
                </label>
                <div className="row-tools">
                  <button className="icon-button" onClick={() => inspect(document.documentId)} title="상세" type="button">
                    <Search size={15} />
                  </button>
                  <button className="icon-button danger" onClick={() => remove(document.documentId)} title="삭제" type="button">
                    <Trash2 size={15} />
                  </button>
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
            <button className="icon-button" onClick={startNewSession} title="새 대화" type="button">
              <Plus size={15} />
            </button>
          </div>
          <div className="session-list">
            {sessions.slice(0, 6).map((session) => (
              <button
                className={session.sessionId === currentSessionId ? 'session-button active' : 'session-button'}
                key={session.sessionId}
                onClick={() => openSession(session.sessionId)}
                type="button"
              >
                {session.title}
              </button>
            ))}
            {sessions.length === 0 && <p className="empty-text">대화 없음</p>}
          </div>
        </section>
        <button className="ghost-button logout" onClick={onLogout} type="button">
          <LogOut size={17} />
          로그아웃
        </button>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">RAG Query</p>
            <h1>문서 기반 대화</h1>
          </div>
          <div className="selected-docs">
            {selectedDocuments.length === 0 ? (
              <span>전체 문서</span>
            ) : selectedDocuments.map((document) => (
              <span key={document.documentId}>{document.title}</span>
            ))}
          </div>
        </header>

        {error && <p className="error-banner">{error}</p>}

        <form className="query-box" onSubmit={ask}>
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="JWT 인증 흐름 설명해줘."
            rows={4}
          />
          <button className="primary-button send-button" disabled={busy} type="submit">
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
    </main>
  );
}
