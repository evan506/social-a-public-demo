import Link from 'next/link';
import { PageHeader, FilterPanel, Kpi, Empty } from '@/components/shared';
import { DEMO_NOW, goals, posts } from '@/lib/demo-data';
import { readFilters, number, percent, type SearchParams } from '@/lib/view';
import { summarizeGoalPerformance } from '@/lib/monitoring/goal-performance';
import { compareGoalAccountPriority } from '@/lib/monitoring/goal-account-priority';
import type { GoalStatus } from '@/lib/domain/performance-goals';

const labels: Record<GoalStatus, string> = { achieved: '목표 달성', in_progress: '진행 중', missed: '목표 미달', measurement_incomplete: '일부 미관측', connection_required: '관측 없음', not_configured: '목표 없음' };
export default async function Dashboard({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = readFilters(await searchParams);
  const summary = filters.error ? null : summarizeGoalPerformance({ fromDate: filters.start, toDate: filters.end, todayDate: DEMO_NOW.slice(0, 10), asOfDate: DEMO_NOW.slice(0, 10), goals, accounts: filters.visible, posts: posts.filter(p => p.publishedAt.slice(0, 10) >= filters.start && p.publishedAt.slice(0, 10) <= filters.end) });
  const rows = summary?.accounts.map(row => ({ ...row, account: filters.visible.find(a => a.id === row.accountId)! })).sort((a, b) => compareGoalAccountPriority({ name: a.account.name, achievementRate: a.achievementRate, needsConnection: a.account.connectionStatus !== 'connected' }, { name: b.account.name, achievementRate: b.achievementRate, needsConnection: b.account.connectionStatus !== 'connected' })) ?? [];
  const max = Math.max(1, ...(summary?.days.map(d => Math.max(d.actualViews ?? 0, d.dailyTeamViewTarget)) ?? []));
  return <>
    <PageHeader eyebrow="PERFORMANCE OVERVIEW" title="한눈에 보는 계정 성과" description="계정의 흐름을 살펴보고, 목표까지 남은 거리를 확인하세요." />
    <FilterPanel key={`${filters.start}-${filters.end}-${filters.owner}-${filters.query}`} filters={filters} path="/dashboard" />
    {summary && (rows.length ? <>
      <div className="kpi-grid"><Kpi label="기간 게시물 누적 조회" value={number(summary.actualViews)} note={`${number(summary.measuredPosts)} / ${number(summary.totalPosts)}개 게시물 관측 · 일부 미관측 포함`} accent /><Kpi label="기간 목표 달성률" value={percent(summary.achievementRate)} note={`목표 ${number(summary.periodTarget)}회 · 미관측 포함 여부 확인`} /><Kpi label="목표 달성 계정" value={`${summary.achievedAccounts} / ${summary.evaluatedAccounts}`} note="선택한 계정의 기간 목표 기준" /><Kpi label="관측 가능한 계정" value={`${summary.connectedAccounts}개`} note={`샘플 계정 ${summary.registeredAccounts}개 중`} /></div>
      <section className="panel chart-panel"><div className="panel-heading"><div><h2>목표와 성과의 흐름</h2><p>게시일별 누적 조회 · 조회 기준 2026.10.27</p></div><div className="chart-legend"><span><i />관측 조회</span><span><i className="target" />목표</span></div></div>
        {summary.days.length ? <div className="daily-chart" role="img" aria-label="게시일별 관측 조회와 목표 비교 차트"><div className="chart-y"><span>{number(max)}</span><span>{number(Math.round(max / 2))}</span><span>0</span></div><div className="chart-bars">{summary.days.map(day => <div className="chart-day" key={day.date} title={`${day.date}: ${number(day.actualViews)} / 목표 ${number(day.dailyTeamViewTarget)}`}><div className="bar-track"><div className="target-line" style={{ bottom: `${day.dailyTeamViewTarget / max * 90}%` }} /><>{day.actualViews === null ? <span className="chart-missing">미관측</span> : <div className="bar" style={{ height: `${day.actualViews / max * 90}%` }} />}</></div><small>{day.date.slice(5).replace('-', '.')}</small></div>)}</div></div> : <p className="muted">선택한 기간에 등록된 목표가 없습니다.</p>}
        <details className="chart-data"><summary>차트 수치 보기</summary><div className="table-scroll"><table><caption className="sr-only">날짜별 목표와 관측값</caption><thead><tr><th>게시일</th><th>관측 조회</th><th>목표</th><th>상태</th></tr></thead><tbody>{summary.days.map(day => <tr key={day.date}><th>{day.date}</th><td>{number(day.actualViews)}</td><td>{number(day.dailyTeamViewTarget)}</td><td>{labels[day.status]}</td></tr>)}</tbody></table></div></details>
      </section>
      <section className="panel"><div className="panel-heading"><div><h2>계정별 목표 비교 <span className="count">{rows.length}</span></h2><p>달성률이 낮은 계정부터 표시합니다.</p></div><Link className="text-link" href={`/threads-metrics/?${new URLSearchParams({ start: filters.start, end: filters.end, owner: filters.owner, q: filters.query })}`}>기간별 지표 보기 ↗</Link></div>
        <div className="table-scroll"><table><caption className="sr-only">계정별 목표 비교</caption><thead><tr><th>계정</th><th>기간 조회</th><th>기간 목표</th><th>달성률</th><th>관측 게시물</th><th>상태</th></tr></thead><tbody>{rows.map(row => <tr key={row.accountId}><th><span className="account-cell"><span className="avatar" style={{ background: row.account.color }}>{row.account.name[0]}</span><span>{row.account.name}<small>@{row.account.handle} · {row.account.owner}</small></span></span></th><td className="numeric strong">{number(row.actualViews)}</td><td className="numeric">{number(row.periodTarget)}</td><td><div className="progress-value">{percent(row.achievementRate)}<span className="progress"><i style={{ width: `${Math.min((row.achievementRate ?? 0) * 100, 100)}%` }} /></span></div></td><td>{row.measuredPosts} / {row.totalPosts}</td><td><span className={`badge ${row.status === 'achieved' ? 'good' : row.status === 'measurement_incomplete' || row.status === 'connection_required' ? 'warn' : ''}`}>{labels[row.status]}</span></td></tr>)}</tbody></table></div>
      </section><p className="footnote">이 화면은 선택 기간에 작성된 게시물의 누적 조회를 비교합니다. Metrics의 기간 중 관측 증가량과 집계 기준이 다릅니다.</p>
    </> : <Empty />)}
  </>;
}
