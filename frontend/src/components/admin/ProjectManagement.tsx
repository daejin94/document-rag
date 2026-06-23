import { useCallback, useEffect, useState } from 'react';
import { fetchAdminProjects, fetchProjectUsage } from '../../api';
import type { AdminProject, DailyUsage } from '../../types';
import { UsageView } from './UsageView';

function formatNumber(value: number) {
  return value.toLocaleString('ko-KR');
}

export function ProjectManagement({ token }: { token: string }) {
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [usage, setUsage] = useState<DailyUsage[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setProjects(await fetchAdminProjects(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : '프로젝트 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(project: AdminProject) {
    if (expandedId === project.projectId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(project.projectId);
    setUsageLoading(true);
    setUsageError('');
    setUsage([]);
    try {
      setUsage(await fetchProjectUsage(token, project.projectId));
    } catch (err) {
      setUsageError(err instanceof Error ? err.message : '사용량을 불러오지 못했습니다.');
    } finally {
      setUsageLoading(false);
    }
  }

  return (
    <section className="admin-panel">
      <header className="admin-panel-head">
        <div>
          <h2>프로젝트 관리</h2>
          <p className="admin-muted">전체 프로젝트의 정보와 포함된 유저, 토큰 사용량을 확인합니다.</p>
        </div>
      </header>

      {error && <p className="error-text">{error}</p>}

      {loading ? (
        <p className="admin-muted">불러오는 중…</p>
      ) : projects.length === 0 ? (
        <p className="admin-muted">프로젝트가 없습니다.</p>
      ) : (
        <ul className="admin-project-list">
          {projects.map((project) => {
            const expanded = expandedId === project.projectId;
            return (
              <li key={project.projectId} className="admin-project-item">
                <button type="button" className="admin-project-head" onClick={() => toggle(project)}>
                  <span className="admin-project-title">
                    <strong>{project.name}</strong>
                    {project.description && <span className="admin-muted"> — {project.description}</span>}
                  </span>
                  <span className="admin-project-meta">
                    멤버 {project.members.length}명 · 토큰 {formatNumber(project.totalTokens)} · {expanded ? '▲' : '▼'}
                  </span>
                </button>

                {expanded && (
                  <div className="admin-project-body">
                    <dl className="admin-project-info">
                      <div>
                        <dt>생성자</dt>
                        <dd>{project.createdByEmail}</dd>
                      </div>
                      <div>
                        <dt>생성일</dt>
                        <dd>{project.createdAt.slice(0, 10)}</dd>
                      </div>
                    </dl>

                    <h4>포함 유저</h4>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>이름</th>
                          <th>이메일</th>
                          <th>역할</th>
                        </tr>
                      </thead>
                      <tbody>
                        {project.members.map((member) => (
                          <tr key={member.userId}>
                            <td>{member.name}</td>
                            <td>{member.email}</td>
                            <td>{member.role === 'ADMIN' ? '관리자' : '멤버'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <h4>일별 사용량</h4>
                    <UsageView data={usage} loading={usageLoading} error={usageError} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
