// Minimal inputs retained for the extracted goal calculator.
export type AccountPerformance = {
  id: string;
  name: string;
  handle: string;
  owner: string;
  connectionStatus: 'connected' | 'unavailable';
  color: string;
};
export type DashboardPostSummary = {
  id: string;
  accountId: string;
  publishedAt: string;
  latestViews: number | null;
};
