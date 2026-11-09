import type { AccountPerformance, DashboardPostSummary } from "@/lib/domain/accounts";
import type {
  AccountGoalDay,
  AccountGoalPerformance,
  GoalDay,
  GoalPeriodSummary,
  GoalPerformanceSummary,
  GoalStatus,
  PerformanceGoalPeriod,
} from "@/lib/domain/performance-goals";
import { shiftDate } from "../date-range.ts";

export function kstDateForTimestamp(value: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function enumerateDates(fromDate: string, toDate: string): string[] {
  const dates: string[] = [];
  for (let date = fromDate; date <= toDate; date = shiftDate(date, 1)) dates.push(date);
  return dates;
}

export function goalForDate(goals: PerformanceGoalPeriod[], date: string): PerformanceGoalPeriod | null {
  return goals.find((goal) => !goal.archivedAt && goal.startsOn <= date && goal.endsOn >= date) ?? null;
}

function accountGoalForDate(goals: PerformanceGoalPeriod[], date: string): PerformanceGoalPeriod | null {
  const goal = goalForDate(goals, date);
  return goal?.targetBasis === "account" ? goal : null;
}

function rate(actual: number | null, target: number): number | null {
  return actual === null || target <= 0 ? null : actual / target;
}

function statusFor(actual: number | null, target: number, incomplete: boolean, lastGoalDate: string | null, asOfDate: string): GoalStatus {
  if (!target) return "not_configured";
  if (incomplete) return "measurement_incomplete";
  if ((actual ?? 0) >= target) return "achieved";
  return lastGoalDate && lastGoalDate >= asOfDate ? "in_progress" : "missed";
}

function observedViews(posts: DashboardPostSummary[]): number {
  return posts.reduce((sum, post) => sum + (post.latestViews ?? 0), 0);
}

export function summarizeGoalPerformance(input: {
  fromDate: string;
  toDate: string;
  todayDate: string;
  asOfDate: string;
  goals: PerformanceGoalPeriod[];
  accounts: AccountPerformance[];
  posts: DashboardPostSummary[];
  available?: boolean;
  message?: string;
}): GoalPerformanceSummary {
  const allDates = enumerateDates(input.fromDate, input.toDate);
  const activeGoals = input.goals.filter((goal) => !goal.archivedAt).sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  const accountGoals = activeGoals.filter((goal) => goal.targetBasis === "account" && goal.dailyAccountViewTarget !== null);
  const accountById = new Map(input.accounts.map((account) => [account.id, account]));
  const visibleAccountIds = new Set(accountById.keys());
  const goalDates = allDates.flatMap((date) => {
    const goal = accountGoalForDate(accountGoals, date);
    if (!goal || goal.dailyAccountViewTarget === null) return [];
    const targetAccountIds = goal.targetAccountIds.filter((accountId) => visibleAccountIds.has(accountId));
    return [{ date, goal, targetAccountIds }];
  });
  const postsByDate = new Map<string, DashboardPostSummary[]>();
  for (const post of input.posts) {
    if (!visibleAccountIds.has(post.accountId)) continue;
    const date = kstDateForTimestamp(post.publishedAt);
    postsByDate.set(date, [...(postsByDate.get(date) ?? []), post]);
  }

  const accountDays: AccountGoalDay[] = goalDates.flatMap(({ date, goal, targetAccountIds }) => targetAccountIds.map((accountId) => {
    const account = accountById.get(accountId);
    const posts = (postsByDate.get(date) ?? []).filter((post) => post.accountId === accountId);
    const measuredPosts = posts.filter((post) => post.latestViews !== null).length;
    const connectionRequired = account?.connectionStatus !== "connected";
    const incomplete = measuredPosts < posts.length;
    const actualViews = connectionRequired || (posts.length > 0 && measuredPosts === 0) ? null : observedViews(posts);
    const dailyTarget = goal.dailyAccountViewTarget ?? 0;
    return {
      accountId,
      date,
      goalId: goal.id,
      actualViews,
      dailyTarget,
      achievementRate: rate(actualViews, dailyTarget),
      totalPosts: posts.length,
      measuredPosts,
      status: connectionRequired ? "connection_required" : statusFor(actualViews, dailyTarget, incomplete, date, input.asOfDate),
    };
  }));

  const days: GoalDay[] = goalDates.map(({ date, goal, targetAccountIds }) => {
    const rows = accountDays.filter((row) => row.date === date && row.goalId === goal.id);
    const targetAccountCount = targetAccountIds.length;
    const dailyAccountViewTarget = goal.dailyAccountViewTarget ?? 0;
    const dailyTeamViewTarget = dailyAccountViewTarget * targetAccountCount;
    const totalPosts = rows.reduce((sum, row) => sum + row.totalPosts, 0);
    const measuredPosts = rows.reduce((sum, row) => sum + row.measuredPosts, 0);
    const incomplete = rows.some((row) => row.status === "measurement_incomplete" || row.status === "connection_required");
    const actualViews = rows.length === 0 || rows.every(row => row.actualViews === null)
      ? null : rows.reduce((sum, row) => sum + (row.actualViews ?? 0), 0);
    return {
      date,
      goalId: goal.id,
      dailyAccountViewTarget,
      targetAccountCount,
      dailyTeamViewTarget,
      actualViews,
      totalPosts,
      measuredPosts,
      achievedAccountCount: rows.filter((row) => row.status === "achieved").length,
      achievementRate: rate(actualViews, dailyTeamViewTarget),
      status: targetAccountCount === 0 ? "connection_required" : statusFor(actualViews, dailyTeamViewTarget, incomplete, date, input.asOfDate),
    };
  });

  const periodSummaries: GoalPeriodSummary[] = accountGoals.flatMap((goal) => {
    const periodDays = days.filter((day) => day.goalId === goal.id);
    if (!periodDays.length || goal.dailyAccountViewTarget === null) return [];
    const totalPosts = periodDays.reduce((sum, day) => sum + day.totalPosts, 0);
    const measuredPosts = periodDays.reduce((sum, day) => sum + day.measuredPosts, 0);
    const incomplete = periodDays.some((day) => day.status === "measurement_incomplete" || day.status === "connection_required");
    const actualViews = periodDays.every((day) => day.actualViews === null)
      ? null
      : periodDays.reduce((sum, day) => sum + (day.actualViews ?? 0), 0);
    const periodTarget = periodDays.reduce((sum, day) => sum + day.dailyTeamViewTarget, 0);
    const targetAccountCount = periodDays[0].targetAccountCount;
    return [{
      goalId: goal.id,
      startsOn: goal.startsOn,
      endsOn: goal.endsOn,
      appliedStartsOn: periodDays[0].date,
      appliedEndsOn: periodDays.at(-1)?.date ?? periodDays[0].date,
      dailyAccountViewTarget: goal.dailyAccountViewTarget,
      targetAccountCount,
      dailyTeamViewTarget: goal.dailyAccountViewTarget * targetAccountCount,
      actualViews,
      periodTarget,
      achievementRate: rate(actualViews, periodTarget),
      appliedDays: periodDays.length,
      totalPosts,
      measuredPosts,
      status: targetAccountCount === 0 ? "connection_required" : statusFor(actualViews, periodTarget, incomplete, periodDays.at(-1)?.date ?? null, input.asOfDate),
    }];
  });

  const accountRows: AccountGoalPerformance[] = input.accounts.map((account) => {
    const rows = accountDays.filter((row) => row.accountId === account.id);
    const totalPosts = rows.reduce((sum, row) => sum + row.totalPosts, 0);
    const measuredPosts = rows.reduce((sum, row) => sum + row.measuredPosts, 0);
    const periodTarget = rows.reduce((sum, row) => sum + row.dailyTarget, 0);
    const actualViews = rows.length === 0 || rows.every((row) => row.actualViews === null)
      ? null
      : rows.reduce((sum, row) => sum + (row.actualViews ?? 0), 0);
    const incomplete = rows.some((row) => row.status === "measurement_incomplete" || row.status === "connection_required");
    const connectionRequired = rows.length > 0 && rows.every((row) => row.status === "connection_required");
    return {
      accountId: account.id,
      actualViews,
      periodTarget,
      achievementRate: rate(actualViews, periodTarget),
      achievedDays: rows.filter((row) => row.status === "achieved").length,
      goalDays: rows.length,
      totalPosts,
      measuredPosts,
      status: rows.length === 0 ? "not_configured" : connectionRequired ? "connection_required" : statusFor(actualViews, periodTarget, incomplete, rows.at(-1)?.date ?? null, input.asOfDate),
    };
  });

  const totalPosts = days.reduce((sum, day) => sum + day.totalPosts, 0);
  const measuredPosts = days.reduce((sum, day) => sum + day.measuredPosts, 0);
  const incomplete = days.some((day) => day.status === "measurement_incomplete" || day.status === "connection_required");
  const actualViews = days.length === 0 || days.every((day) => day.actualViews === null)
    ? null
    : days.reduce((sum, day) => sum + (day.actualViews ?? 0), 0);
  const periodTarget = days.reduce((sum, day) => sum + day.dailyTeamViewTarget, 0);
  const targetAccountCounts = [...new Set(days.map((day) => day.targetAccountCount))].sort((a, b) => a - b);
  const targetRows = accountRows.filter((row) => row.goalDays > 0);
  const achievedAccounts = targetRows.filter((row) => row.status === "achieved").length;
  const measuredAccounts = targetRows.filter((row) => row.measuredPosts > 0).length;
  return {
    available: input.available ?? true,
    periods: activeGoals,
    periodSummaries,
    days,
    accountDays,
    accounts: accountRows,
    actualViews,
    periodTarget,
    achievementRate: rate(actualViews, periodTarget),
    appliedDays: days.length,
    rangeDays: allDates.length,
    achievedAccounts,
    achievedAccountDays: days.reduce((sum, day) => sum + day.achievedAccountCount, 0),
    totalAccountDays: days.reduce((sum, day) => sum + day.targetAccountCount, 0),
    registeredAccounts: input.accounts.length,
    connectedAccounts: input.accounts.filter((account) => account.connectionStatus === "connected").length,
    excludedAccounts: input.accounts.filter((account) => account.connectionStatus !== "connected").length,
    evaluatedAccounts: targetRows.length,
    measuredAccounts,
    targetAccountCounts,
    totalPosts,
    measuredPosts,
    status: days.length === 0 ? "not_configured" : statusFor(actualViews, periodTarget, incomplete, goalDates.at(-1)?.date ?? null, input.asOfDate),
    ...(input.message ? { message: input.message } : {}),
  };
}
