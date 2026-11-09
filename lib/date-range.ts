export type RangePreset = "today" | "yesterday" | "7days" | "custom";

export type DateRange = {
  preset: RangePreset;
  fromDate: string;
  toDate: string;
  todayDate: string;
  asOfDate: string;
  fromIso: string;
  toExclusiveIso: string;
  asOfExclusiveIso: string;
  label: string;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateInput(value: string | undefined): value is string {
  if (!value || !datePattern.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function getKstDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function buildDashboardRangeQuery(range: DateRange, asOfDate: string): string {
  const query = new URLSearchParams({
    preset: range.preset,
    asOf: asOfDate,
    from: range.fromDate,
    to: range.toDate,
  });
  return query.toString();
}

export function resolveDateRange(input: { preset?: string; from?: string; to?: string; asOf?: string }, now = new Date()): DateRange {
  const today = getKstDate(now);
  const preset: RangePreset = ["today", "yesterday", "7days", "custom"].includes(input.preset ?? "")
    ? input.preset as RangePreset
    : "7days";

  let fromDate = today;
  let toDate = today;
  if (preset === "yesterday") fromDate = toDate = shiftDate(today, -1);
  if (preset === "7days") fromDate = shiftDate(today, -6);
  if (preset === "custom") {
    const hasValidBounds = isValidDateInput(input.from) && isValidDateInput(input.to);
    fromDate = hasValidBounds ? input.from! : shiftDate(today, -6);
    toDate = hasValidBounds ? input.to! : today;
    if (fromDate > toDate) [fromDate, toDate] = [toDate, fromDate];
  }
  if (preset !== "custom" && isValidDateInput(input.from) && isValidDateInput(input.to)) {
    fromDate = input.from;
    toDate = input.to;
    if (fromDate > toDate) [fromDate, toDate] = [toDate, fromDate];
  }

  const suffix = preset === "today" ? " · 오늘" : preset === "yesterday" ? " · 어제" : preset === "7days" ? " · 최근 7일" : " · 직접 지정";
  const dateLabel = fromDate === toDate ? fromDate : `${fromDate} ~ ${toDate}`;
  const asOfDate = isValidDateInput(input.asOf) ? input.asOf : today;
  return {
    preset,
    fromDate,
    toDate,
    todayDate: today,
    asOfDate,
    fromIso: `${fromDate}T00:00:00+09:00`,
    toExclusiveIso: `${shiftDate(toDate, 1)}T00:00:00+09:00`,
    asOfExclusiveIso: `${shiftDate(asOfDate, 1)}T00:00:00+09:00`,
    label: `${dateLabel}${suffix}`,
  };
}
