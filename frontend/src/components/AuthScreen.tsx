import { FormEvent, useEffect, useState } from 'react';
import { BookOpenText, Bot, Check, RefreshCw, UserPlus } from 'lucide-react';
import { fetchOAuthProviders, login, signup } from '../api';

type AuthMode = 'login' | 'signup';

export interface OAuthFeedback {
  message: string;
  type: 'notice' | 'error';
}

interface AuthScreenProps {
  onAuthenticated: (token: string) => void;
  sessionExpired?: boolean;
  oauthFeedback?: OAuthFeedback | null;
}

// 구글 OAuth 로그인 시작 엔드포인트. 백엔드가 구글로 리다이렉트한다(top-level 이동 필요).
const GOOGLE_LOGIN_URL = '/api/oauth2/authorization/google';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.96 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}

export function AuthScreen({ onAuthenticated, sessionExpired = false, oauthFeedback = null }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('user@example.com');
  const [password, setPassword] = useState('password1234');
  const [name, setName] = useState('대진');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    // 구글 OAuth가 서버에 설정된 경우에만 "구글로 로그인" 버튼을 노출한다.
    fetchOAuthProviders()
      .then((providers) => setGoogleEnabled(providers.google))
      .catch(() => setGoogleEnabled(false));
  }, []);

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
        {!notice && oauthFeedback && (
          <p className={oauthFeedback.type === 'error' ? 'error-text' : 'notice-text'}>{oauthFeedback.message}</p>
        )}
        {sessionExpired && !notice && !oauthFeedback && (
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
        {googleEnabled && (
          <>
            <div className="auth-divider"><span>또는</span></div>
            <button
              className="google-button"
              type="button"
              disabled={busy}
              onClick={() => {
                // 백엔드가 구글로 리다이렉트하도록 브라우저 전체를 이동시킨다.
                window.location.href = GOOGLE_LOGIN_URL;
              }}
            >
              <GoogleIcon />
              구글로 로그인
            </button>
          </>
        )}
      </section>
    </main>
  );
}
