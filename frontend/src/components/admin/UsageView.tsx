import type { DailyUsage } from '../../types';

interface UsageViewProps {
  data: DailyUsage[];
  loading?: boolean;
  error?: string;
  emptyText?: string;
}

function formatNumber(value: number) {
  return value.toLocaleString('ko-KR');
}

/** 일별 토큰 사용량을 합계 카드 + 막대 표로 렌더링하는 공용 뷰 */
export function UsageView({ data, loading, error, emptyText = '사용 기록이 없습니다.' }: UsageViewProps) {
  if (loading) {
    return <p className="admin-muted">불러오는 중…</p>;
  }
  if (error) {
    return <p className="error-text">{error}</p>;
  }
  if (data.length === 0) {
    return <p className="admin-muted">{emptyText}</p>;
  }

  const totalPrompt = data.reduce((sum, row) => sum + row.promptTokens, 0);
  const totalCompletion = data.reduce((sum, row) => sum + row.completionTokens, 0);
  const totalAll = data.reduce((sum, row) => sum + row.totalTokens, 0);
  const maxTotal = Math.max(...data.map((row) => row.totalTokens), 1);

  return (
    <div className="usage-view">
      <div className="usage-summary">
        <div className="usage-card">
          <span className="usage-card-label">총 토큰</span>
          <strong className="usage-card-value">{formatNumber(totalAll)}</strong>
        </div>
        <div className="usage-card">
          <span className="usage-card-label">프롬프트</span>
          <strong className="usage-card-value">{formatNumber(totalPrompt)}</strong>
        </div>
        <div className="usage-card">
          <span className="usage-card-label">컴플리션</span>
          <strong className="usage-card-value">{formatNumber(totalCompletion)}</strong>
        </div>
      </div>

      <table className="admin-table usage-table">
        <thead>
          <tr>
            <th>날짜</th>
            <th className="num">프롬프트</th>
            <th className="num">컴플리션</th>
            <th className="num">합계</th>
            <th className="bar-col">추이</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.date}>
              <td>{row.date}</td>
              <td className="num">{formatNumber(row.promptTokens)}</td>
              <td className="num">{formatNumber(row.completionTokens)}</td>
              <td className="num">{formatNumber(row.totalTokens)}</td>
              <td className="bar-col">
                <span className="usage-bar" style={{ width: `${(row.totalTokens / maxTotal) * 100}%` }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
