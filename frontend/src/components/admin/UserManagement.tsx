import { useCallback, useEffect, useState } from 'react';
import { deleteAdminUser, fetchAdminUsers, fetchUserUsage } from '../../api';
import type { AdminUser, DailyUsage } from '../../types';
import { UsageView } from './UsageView';

function formatNumber(value: number) {
  return value.toLocaleString('ko-KR');
}

export function UserManagement({ token, currentEmail }: { token: string; currentEmail: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [usage, setUsage] = useState<DailyUsage[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setUsers(await fetchAdminUsers(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : '유저 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openUsage(user: AdminUser) {
    setSelected(user);
    setUsageLoading(true);
    setUsageError('');
    setUsage([]);
    try {
      setUsage(await fetchUserUsage(token, user.userId));
    } catch (err) {
      setUsageError(err instanceof Error ? err.message : '사용량을 불러오지 못했습니다.');
    } finally {
      setUsageLoading(false);
    }
  }

  async function removeUser(user: AdminUser) {
    if (!window.confirm(`'${user.name}'(${user.email}) 유저를 삭제하시겠습니까?\n해당 유저는 더 이상 로그인할 수 없습니다.`)) {
      return;
    }
    setError('');
    try {
      await deleteAdminUser(token, user.userId);
      if (selected?.userId === user.userId) {
        setSelected(null);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '유저 삭제에 실패했습니다.');
    }
  }

  return (
    <section className="admin-panel">
      <header className="admin-panel-head">
        <div>
          <h2>유저 관리</h2>
          <p className="admin-muted">유저 정보와 누적 토큰 사용량을 확인하고 계정을 삭제할 수 있습니다.</p>
        </div>
      </header>

      {error && <p className="error-text">{error}</p>}

      {loading ? (
        <p className="admin-muted">불러오는 중…</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>이름</th>
              <th>이메일</th>
              <th>권한</th>
              <th className="num">누적 토큰</th>
              <th>가입일</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.userId}
                className={selected?.userId === user.userId ? 'is-selected' : ''}
                onClick={() => openUsage(user)}
              >
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  {user.role === 'SUPER_ADMIN' ? <span className="admin-badge">관리자</span> : '일반'}
                </td>
                <td className="num">{formatNumber(user.totalTokens)}</td>
                <td>{user.createdAt.slice(0, 10)}</td>
                <td className="action-col">
                  <button
                    type="button"
                    className="ghost-button danger-button"
                    disabled={user.email === currentEmail}
                    title={user.email === currentEmail ? '자기 자신은 삭제할 수 없습니다.' : '유저 삭제'}
                    onClick={(event) => {
                      event.stopPropagation();
                      void removeUser(user);
                    }}
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <div className="admin-detail">
          <h3>
            {selected.name} <span className="admin-muted">({selected.email}) 일별 사용량</span>
          </h3>
          <UsageView data={usage} loading={usageLoading} error={usageError} />
        </div>
      )}
    </section>
  );
}
