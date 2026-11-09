import { DEMO_START, DEMO_END } from './demo-config';
import { isValidDateInput } from './date-range';

export function sampleRangeError(start: string, end: string): string | null {
  const days = (Date.parse(end) - Date.parse(start)) / 86_400_000 + 1;
  if (!isValidDateInput(start) || !isValidDateInput(end) || days < 1 || days > 31) return '올바른 날짜를 최대 31일 범위로 선택해 주세요.';
  if (start < DEMO_START || end > DEMO_END) return `샘플 데이터는 ${DEMO_START} ~ ${DEMO_END} 기간만 제공합니다.`;
  return null;
}
