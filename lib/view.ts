import { DEMO_END, accounts } from './demo-config';
import { shiftDate } from './date-range';
import { sampleRangeError } from './sample-range';

export const number = (value: number | null | undefined) => value == null ? '—' : value.toLocaleString('ko-KR');
export const percent = (value: number | null) => value === null ? '—' : `${(value * 100).toFixed(1)}%`;
export type SearchParams = Record<string, string | string[] | undefined>;
export function readFilters(params: SearchParams, defaultDays = 7) {
  const value = (key: string) => typeof params[key] === 'string' ? params[key] as string : '';
  const start = value('start') || shiftDate(DEMO_END, -(defaultDays - 1));
  const end = value('end') || DEMO_END;
  const owner = value('owner'); const query = value('q').trim().slice(0, 100);
  const days = (Date.parse(end) - Date.parse(start)) / 86_400_000 + 1;
  const error = sampleRangeError(start, end);
  const visible = accounts.filter(a => (!owner || a.owner === owner) && `${a.name} ${a.handle}`.toLowerCase().includes(query.toLowerCase()));
  return { start, end, owner, query, days, error, visible };
}
export type Filters = ReturnType<typeof readFilters>;
