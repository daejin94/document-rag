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

/** 일별 토큰 사용량을 채팅/임베딩으로 구분해 합계 카드 + 막대 표로 렌더링하는 공용 뷰 */
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

  const chatPrompt = data.reduce((sum, row) => sum + row.chatPromptTokens, 0);
  const chatCompletion = data.reduce((sum, row) => sum + row.chatCompletionTokens, 0);
  const chatTotal = chatPrompt + chatCompletion;
  const embeddingTotal = data.reduce((sum, row) => sum + row.embeddingTokens, 0);
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
          <span className="usage-card-label">채팅 토큰</span>
          <strong className="usage-card-value">{formatNumber(chatTotal)}</strong>
          <span className="usage-card-sub">
            프롬프트 {formatNumber(chatPrompt)} · 컴플리션 {formatNumber(chatCompletion)}
          </span>
        </div>
        <div className="usage-card">
          <span className="usage-card-label">임베딩 토큰</span>
          <strong className="usage-card-value">{formatNumber(embeddingTotal)}</strong>
          <span className="usage-card-sub">질문·문서 임베딩</span>
        </div>
      </div>

      <table className="admin-table usage-table">
        <thead>
          <tr>
            <th>날짜</th>
            <th className="num">채팅 프롬프트</th>
            <th className="num">채팅 컴플리션</th>
            <th className="num">임베딩</th>
            <th className="num">합계</th>
            <th className="bar-col">추이</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.date}>
              <td>{row.date}</td>
              <td className="num">{formatNumber(row.chatPromptTokens)}</td>
              <td className="num">{formatNumber(row.chatCompletionTokens)}</td>
              <td className="num">{formatNumber(row.embeddingTokens)}</td>
              <td className="num">{formatNumber(row.totalTokens)}</td>
              <td className="bar-col">
                <span className="usage-bar-stack" title={`채팅 ${formatNumber(row.chatPromptTokens + row.chatCompletionTokens)} / 임베딩 ${formatNumber(row.embeddingTokens)}`}>
                  <span
                    className="usage-bar-seg chat"
                    style={{ width: `${((row.chatPromptTokens + row.chatCompletionTokens) / maxTotal) * 100}%` }}
                  />
                  <span
                    className="usage-bar-seg embedding"
                    style={{ width: `${(row.embeddingTokens / maxTotal) * 100}%` }}
                  />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="usage-legend">
        <span><span className="usage-legend-dot chat" /> 채팅</span>
        <span><span className="usage-legend-dot embedding" /> 임베딩</span>
      </div>
    </div>
  );
}
