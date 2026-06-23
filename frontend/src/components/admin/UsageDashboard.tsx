import { MouseEvent, useCallback, useEffect, useState } from 'react';
import { fetchSystemUsage } from '../../api';
import type { DailyUsage } from '../../types';
import { UsageView } from './UsageView';

// 달력 아이콘이 아니라 입력 영역 어디를 눌러도 달력 UI가 뜨도록 한다.
// mousedown 기본 동작을 막아 숫자 세그먼트가 선택(드래그 하이라이트)되지 않게 한다.
function openPicker(event: MouseEvent<HTMLInputElement>) {
  event.preventDefault();
  try {
    event.currentTarget.showPicker();
  } catch {
    // showPicker 미지원 브라우저에서는 기본 동작(아이콘 클릭)으로 처리
  }
}

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
            <input type="date" value={from} max={to} onMouseDown={openPicker} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label>
            종료
            <input type="date" value={to} min={from} onMouseDown={openPicker} onChange={(event) => setTo(event.target.value)} />
          </label>
        </div>
      </header>
      <UsageView data={data} loading={loading} error={error} />
    </section>
  );
}
