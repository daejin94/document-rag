import { useCallback, useEffect, useState } from 'react';
import { fetchSystemUsage } from '../../api';
import type { DailyUsage } from '../../types';
import { UsageView } from './UsageView';

function isoDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function UsageDashboard({ token }: { token: string }) {
  const [from, setFrom] = useState(() => isoDaysAgo(29));
  const [to, setTo] = useState(() => today());
  const [data, setData] = useState<DailyUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await fetchSystemUsage(token, from, to));
    } catch (err) {
      setError(err instanceof Error ? err.message : '사용량을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [token, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="admin-panel">
      <header className="admin-panel-head">
        <div>
          <h2>토큰 사용량</h2>
          <p className="admin-muted">시스템 전체의 일별 토큰 사용량입니다.</p>
        </div>
        <div className="usage-range">
          <label>
            시작
            <input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label>
            종료
            <input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} />
          </label>
        </div>
      </header>
      <UsageView data={data} loading={loading} error={error} />
    </section>
  );
}
