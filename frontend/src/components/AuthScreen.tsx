import { FormEvent, useState } from 'react';
import { BookOpenText, Bot, Check, RefreshCw, UserPlus } from 'lucide-react';
import { login, signup } from '../api';

type AuthMode = 'login' | 'signup';

interface AuthScreenProps {
  onAuthenticated: (token: string) => void;
  sessionExpired?: boolean;
}

export function AuthScreen({ onAuthenticated, sessionExpired = false }: AuthScreenProps) {
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
      <section className="auth-panel">
        <div className="brand-row">
          <BookOpenText size={24} />
          <span>DocQ</span>
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
        {sessionExpired && (
          <p className="notice-text">세션이 만료되었습니다. 다시 로그인해주세요.</p>
        )}
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
