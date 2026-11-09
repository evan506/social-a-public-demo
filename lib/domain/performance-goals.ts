export type PerformanceGoalPeriod = {
  id: string;
  startsOn: string;
  endsOn: string;
  targetBasis: "owner" | "account";
  dailyOwnerViewTarget: number | null;
  dailyAccountViewTarget: number | null;
  targetAccountIds: string[];
  targetAccountCount: number;
  postViewThreshold: number | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GoalDay = {
  date: string;
  goalId: string;
  dailyAccountViewTarget: number;
  targetAccountCount: number;
  dailyTeamViewTarget: number;
  actualViews: number | null;
  totalPosts: number;
  measuredPosts: number;
  achievedAccountCount: number;
  achievementRate: number | null;
  status: GoalStatus;
};

export type GoalStatus = "achieved" | "in_progress" | "missed" | "measurement_incomplete" | "connection_required" | "not_configured";

export type GoalPeriodSummary = {
  goalId: string;
  startsOn: string;
  endsOn: string;
  appliedStartsOn: string;
  appliedEndsOn: string;
  dailyAccountViewTarget: number;
  targetAccountCount: number;
  dailyTeamViewTarget: number;
  actualViews: number | null;
  periodTarget: number;
  achievementRate: number | null;
  appliedDays: number;
  totalPosts: number;
  measuredPosts: number;
  status: GoalStatus;
};

export type AccountGoalDay = {
  accountId: string;
  date: string;
  goalId: string;
  actualViews: number | null;
  dailyTarget: number;
  achievementRate: number | null;
  totalPosts: number;
  measuredPosts: number;
  status: GoalStatus;
};

export type AccountGoalPerformance = {
  accountId: string;
  actualViews: number | null;
  periodTarget: number;
  achievementRate: number | null;
  achievedDays: number;
  goalDays: number;
  totalPosts: number;
  measuredPosts: number;
  status: GoalStatus;
};

export type GoalPerformanceSummary = {
  available: boolean;
  periods: PerformanceGoalPeriod[];
  periodSummaries: GoalPeriodSummary[];
  days: GoalDay[];
  accountDays: AccountGoalDay[];
  accounts: AccountGoalPerformance[];
  actualViews: number | null;
  periodTarget: number;
  achievementRate: number | null;
  appliedDays: number;
  rangeDays: number;
  achievedAccounts: number;
  achievedAccountDays: number;
  totalAccountDays: number;
  registeredAccounts: number;
  connectedAccounts: number;
  excludedAccounts: number;
  evaluatedAccounts: number;
  measuredAccounts: number;
  targetAccountCounts: number[];
  totalPosts: number;
  measuredPosts: number;
  status: GoalStatus;
  message?: string;
};

export type PerformanceGoalInput = {
  startsOn: string;
  endsOn: string;
  dailyAccountViewTarget: number;
  postViewThreshold: number | null;
};
