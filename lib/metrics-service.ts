import { accounts, accountObservations, metricPosts, DEMO_NOW, DEMO_START, DEMO_END } from './demo-data';
import { accountPeriod, aggregateAccountWindow } from './metrics/account-window.mjs';
import { aggregatePostRange } from './metrics/post-range.mjs';
import { sampleRangeError } from './sample-range';

export function metricsSnapshot(start: string, end: string) {
  const error = sampleRangeError(start, end);
  if (error) throw new Error(error);
  const period = accountPeriod(start, end, '16:00', new Date(DEMO_NOW), 31);
  const window = aggregateAccountWindow({ accounts, snapshots: accountObservations, generated_at: DEMO_NOW }, period);
  return {
    ...window,
    accounts: accounts.map(account => {
      const observation = window.accounts.find((row: { handle: string }) => row.handle === account.handle)!;
      const available = account.connectionStatus === 'connected' && start >= DEMO_START && end <= DEMO_END;
      return { ...account, ...observation, posts: aggregatePostRange(metricPosts.filter(post => post.accountId === account.id), start, end, { inventoryVerified: available, time: '16:00' }) };
    }),
  };
}
export type MetricsSnapshot = ReturnType<typeof metricsSnapshot>;
