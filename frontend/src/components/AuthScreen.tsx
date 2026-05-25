import { FormEvent, useState } from 'react';
import { Bot, Check, RefreshCw, Shield, UserPlus } from 'lucide-react';
import { login, signup } from '../api';

type AuthMode = 'login' | 'signup';

interface AuthScreenProps {
  onAuthenticated: (token: string) => void;
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
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
