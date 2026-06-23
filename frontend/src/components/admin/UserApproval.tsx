import { useCallback, useEffect, useState } from 'react';
import { approveUser, fetchPendingUsers, rejectUser } from '../../api';
import type { AdminUser } from '../../types';

export function UserApproval({ token }: { token: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingId, setPendingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setUsers(await fetchPendingUsers(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : '가입 신청 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve(user: AdminUser) {
    setError('');
    setPendingId(user.userId);
    try {
      await approveUser(token, user.userId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '승인에 실패했습니다.');
    } finally {
      setPendingId(null);
    }
  }

  async function reject(user: AdminUser) {
    if (!window.confirm(`'${user.name}'(${user.email}) 가입 신청을 거절하시겠습니까?\n거절된 계정은 로그인할 수 없습니다.`)) {
      return;
    }
    setError('');
    setPendingId(user.userId);
    try {
      await rejectUser(token, user.userId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '거절에 실패했습니다.');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="admin-panel">
      <header className="admin-panel-head">
        <div>
          <h2>가입 승인</h2>
          <p className="admin-muted">승인 대기 중인 가입 신청을 검토하고 승인하거나 거절할 수 있습니다.</p>
        </div>
      </header>

      {error && <p className="error-text">{error}</p>}

      {loading ? (
        <p className="admin-muted">불러오는 중…</p>
      ) : users.length === 0 ? (
        <p className="admin-muted">승인 대기 중인 가입 신청이 없습니다.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>이름</th>
              <th>이메일</th>
              <th>신청일</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.userId}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.createdAt.slice(0, 10)}</td>
                <td className="action-col">
                  <button
                    type="button"
                    className="ghost-button"
                    disabled={pendingId === user.userId}
                    onClick={() => void approve(user)}
                  >
                    승인
                  </button>
                  <button
                    type="button"
                    className="ghost-button danger-button"
                    disabled={pendingId === user.userId}
                    onClick={() => void reject(user)}
                  >
                    거절
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
