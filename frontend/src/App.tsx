import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Bot,
  Check,
  FileText,
  LogOut,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Shield,
  Trash2,
  Upload,
  UserPlus,
} from 'lucide-react';
import {
  deleteDocument,
  fetchDocumentDetail,
  fetchDocuments,
  fetchSessions,
  login,
  queryDocuments,
  signup,
  uploadDocument,
} from './api';
import type { ChatSession, DocumentDetail, DocumentItem, QueryResponse } from './types';

type AuthMode = 'login' | 'signup';

const tokenKey = 'document-rag-token';

export function App() {
  const [token, setToken] = useState(() => localStorage.getItem(tokenKey) || '');

  if (!token) {
    return <AuthScreen onAuthenticated={setToken} />;
  }

  return <Workspace token={token} onLogout={() => {
    localStorage.removeItem(tokenKey);
    setToken('');
  }} />;
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (token: string) => void }) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('user@example.com');
  const [password, setPassword] = useState('password1234');
  const [name, setName] = useState('대진');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signup') {
        await signup(email, password, name);
      }
      const response = await login(email, password);
      localStorage.setItem(tokenKey, response.accessToken);
      onAuthenticated(response.accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : '요청에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-visual" aria-hidden="true">
        <div className="document-stack">
          <div className="paper paper-one">
            <span />
            <span />
            <span />
          </div>
          <div className="paper paper-two">
            <span />
            <span />
            <span />
          </div>
          <div className="vector-node node-a" />
          <div className="vector-node node-b" />
          <div className="vector-node node-c" />
        </div>
      </section>
      <section className="auth-panel">
        <div className="brand-row">
          <Shield size={24} />
          <span>Document RAG</span>
        </div>
        <div className="segmented">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')} type="button">
            <Bot size={16} />
            로그인
          </button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')} type="button">
            <UserPlus size={16} />
            회원가입
          </button>
        </div>
        <form className="auth-form" onSubmit={submit}>
          {mode === 'signup' && (
            <label>
              이름
              <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
            </label>
          )}
          <label>
            이메일
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" />
          </label>
          <label>
            비밀번호
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button className="primary-button" disabled={busy} type="submit">
            {busy ? <RefreshCw className="spin" size={18} /> : <Check size={18} />}
            {mode === 'login' ? '로그인' : '가입 후 로그인'}
          </button>
        </form>
      </section>
    </main>
  );
}

function Workspace({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [detail, setDetail] = useState<DocumentDetail | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<QueryResponse | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const selectedDocuments = useMemo(
    () => documents.filter((document) => selectedIds.includes(document.documentId)),
    [documents, selectedIds],
  );

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
    setAnswer(null);
    try {
      const response = await queryDocuments(token, question, selectedIds);
      setAnswer(response);
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
          <div className="section-title">
            <MessageSquare size={17} />
            세션
          </div>
          <div className="session-list">
            {sessions.slice(0, 6).map((session) => (
              <span key={session.sessionId}>{session.title}</span>
            ))}
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
            <h1>문서 기반 질문</h1>
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
          <article className="answer-panel">
            <div className="section-title">
              <Bot size={18} />
              답변
            </div>
            {answer ? (
              <>
                <p className="answer-text">{answer.answer}</p>
                <div className="meta-line">
                  <span>{answer.model.chatModel}</span>
                  <span>{answer.model.embeddingModel}</span>
                  <span>{answer.usage.promptTokens + answer.usage.completionTokens} tokens</span>
                </div>
              </>
            ) : (
              <p className="empty-text">대기 중</p>
            )}
          </article>

          <article className="source-panel">
            <div className="section-title">
              <FileText size={18} />
              출처
            </div>
            {answer?.sources.map((source) => (
              <div className="source-item" key={source.chunkId}>
                <strong>{source.documentTitle}</strong>
                <small>chunk {source.chunkIndex} · {(source.similarity * 100).toFixed(1)}%</small>
                <p>{source.contentPreview}</p>
              </div>
            ))}
            {(!answer || answer.sources.length === 0) && <p className="empty-text">출처 없음</p>}
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

function UploadForm({ token, onUploaded }: { token: string; onUploaded: () => Promise<void> }) {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }
    if (!file) {
      setError('파일을 선택해주세요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await uploadDocument(token, title, file);
      setTitle('');
      setFile(null);
      setFileInputKey((value) => value + 1);
      await onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="upload-form" onSubmit={submit}>
      <label>
        제목
        <input
          disabled={busy}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            if (error) {
              setError('');
            }
          }}
        />
      </label>
      <label>
        파일
        <input
          accept=".txt,.md,.markdown,text/plain,text/markdown"
          disabled={busy}
          key={fileInputKey}
          onChange={(event) => {
            setFile(event.target.files?.[0] || null);
            if (error) {
              setError('');
            }
          }}
          type="file"
        />
      </label>
      {busy && (
        <div className="upload-progress" aria-live="polite" role="status">
          <div className="upload-progress-track">
            <span />
          </div>
          <p>문서 업로드 중입니다.</p>
        </div>
      )}
      {error && <p className="error-text">{error}</p>}
      <button className="primary-button" disabled={busy} type="submit">
        {busy ? <RefreshCw className="spin" size={17} /> : <Upload size={17} />}
        {busy ? '업로드 중' : '업로드'}
      </button>
    </form>
  );
}
