import Link from 'next/link';
import { DEMO_END, DEMO_START } from '@/lib/demo-config';
import { shiftDate } from '@/lib/date-range';
import type { Filters } from '@/lib/view';

export function PageHeader({ eyebrow, title, description, referenceDate = '2026. 10. 26' }: { eyebrow: string; title: string; description: string; referenceDate?: string | null }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{referenceDate && <span className="reference-date">샘플 기준일 <strong>{referenceDate}</strong></span>}</div>;
}
export function FilterPanel({ filters, path }: { filters: Filters; path: string }) {
  return <section className="filter-panel" aria-label="조회 조건">
    <div className="filter-top"><span className="section-kicker">조회 기간</span><div className="presets">{[{ days: 1, label: '기준일' }, { days: 7, label: '최근 7일' }, { days: 30, label: '최근 30일' }].map(({ days, label }) => {
      const start = shiftDate(DEMO_END, 1 - days);
      const search = new URLSearchParams({ start, end: DEMO_END, owner: filters.owner, q: filters.query });
      return <Link key={days} className={filters.start === start && filters.end === DEMO_END ? 'selected' : ''} href={`${path}?${search}`} aria-current={filters.start === start && filters.end === DEMO_END ? 'true' : undefined}>{label}</Link>;
    })}</div><span className="muted">최대 31일</span></div>
    <form action={path} method="get" className="filters">
      <label>시작일<input aria-label="시작일" type="date" name="start" defaultValue={filters.start} required /></label>
      <label>종료일<input aria-label="종료일" type="date" name="end" defaultValue={filters.end} required /></label>
      <label>담당 팀<select name="owner" defaultValue={filters.owner}><option value="">전체 팀</option><option>샘플 A팀</option><option>샘플 B팀</option></select></label>
      <label className="search-filter">계정 검색<input name="q" type="search" placeholder="계정 이름 또는 아이디" defaultValue={filters.query} maxLength={100} /></label>
      <button type="submit" className="primary">조회하기 <span aria-hidden="true">↗</span></button>
    </form>
    <p className="footnote" style={{ margin: '12px 0 0' }}>샘플 데이터 제공 기간: {DEMO_START} ~ {DEMO_END} · 기간 밖의 날짜는 조회할 수 없습니다.</p>
    {filters.error && <p role="alert" className="error-text">{filters.error}</p>}
  </section>;
}
export function Kpi({ label, value, note, accent = false }: { label: string; value: string; note: string; accent?: boolean }) {
  return <article className={`kpi ${accent ? 'accent' : ''}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}
export function Empty({ message = '조건에 맞는 계정이 없습니다.' }: { message?: string }) { return <div className="empty-state"><span aria-hidden="true">⌕</span><h2>{message}</h2><p>조회 기간이나 검색 조건을 바꿔 보세요.</p></div>; }
