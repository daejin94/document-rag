import { useMemo, useState } from 'react';
import { ProjectManagement } from './ProjectManagement';
import { UsageDashboard } from './UsageDashboard';
import { UserApproval } from './UserApproval';
import { UserManagement } from './UserManagement';
import { ThemeToggle } from '../ThemeToggle';

type AdminTab = 'usage' | 'approvals' | 'users' | 'projects';

const TABS: { key: AdminTab; label: string }[] = [
  { key: 'usage', label: '토큰 사용량' },
  { key: 'approvals', label: '가입 승인' },
  { key: 'users', label: '유저 관리' },
  { key: 'projects', label: '프로젝트 관리' },
];

function getEmailFromToken(token: string) {
  try {
    const payload = token.split('.')[1];
    if (!payload) return '';
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return (JSON.parse(window.atob(padded)) as { email?: string }).email ?? '';
  } catch {
    return '';
  }
}

export function AdminApp({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [tab, setTab] = useState<AdminTab>('usage');
  const email = useMemo(() => getEmailFromToken(token), [token]);

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="admin-brand">
          <span className="admin-brand-title">관리자 콘솔</span>
          <span className="admin-badge">SUPER ADMIN</span>
        </div>
        <div className="admin-header-right">
          <span className="admin-muted">{email}</span>
          <ThemeToggle />
          <button type="button" className="ghost-button" onClick={onLogout}>
            로그아웃
          </button>
        </div>
      </header>

      <nav className="admin-tabs">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`admin-tab ${tab === item.key ? 'is-active' : ''}`}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <main className="admin-content">
        {tab === 'usage' && <UsageDashboard token={token} />}
        {tab === 'approvals' && <UserApproval token={token} />}
        {tab === 'users' && <UserManagement token={token} currentEmail={email} />}
        {tab === 'projects' && <ProjectManagement token={token} />}
      </main>
    </div>
  );
}
