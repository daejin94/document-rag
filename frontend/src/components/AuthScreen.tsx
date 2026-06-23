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
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  function switchMode(next: AuthMode) {
    setMode(next);
    setError('');
    setNotice('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      if (mode === 'signup') {
        // 가입은 승인 대기 상태로 생성된다. 자동 로그인하지 않고 안내 후 로그인 화면으로 전환한다.
        await signup(email, password, name);
        setMode('login');
        setNotice('가입 신청이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.');
        return;
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
          <button className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')} type="button">
            <Bot size={16} />
            로그인
          </button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')} type="button">
            <UserPlus size={16} />
            회원가입
          </button>
        </div>
        {notice && <p className="notice-text">{notice}</p>}
        {sessionExpired && !notice && (
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
            {mode === 'login' ? '로그인' : '가입 신청'}
          </button>
        </form>
      </section>
    </main>
  );
}
