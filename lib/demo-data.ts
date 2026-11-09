import type { DashboardPostSummary } from './domain/accounts';
import type { PerformanceGoalPeriod } from './domain/performance-goals';
import { shiftDate } from './date-range';
import type { CommentItem } from './domain/comments';

export { accounts, DEMO_NOW, DEMO_START, DEMO_END } from './demo-config';
import { accounts, DEMO_NOW, DEMO_START, DEMO_END } from './demo-config';

export const posts: DashboardPostSummary[] = accounts.flatMap((account, index) =>
  Array.from({ length: 40 }, (_, day) => ({
    id: `${account.id}-post-${day}`, accountId: account.id,
    publishedAt: `${shiftDate(DEMO_START, day)}T10:00:00+09:00`,
    latestViews: index === 3 || (index === 1 && day === 39) ? null : index === 2 ? 0 : 900 + index * 150 + (day % 7) * 180,
  })));

export const goals: PerformanceGoalPeriod[] = [{
  id: 'demo-goal', startsOn: DEMO_START, endsOn: DEMO_END, targetBasis: 'account',
  dailyOwnerViewTarget: null, dailyAccountViewTarget: 1200, targetAccountIds: accounts.map(a => a.id),
  targetAccountCount: 4, postViewThreshold: null, archivedAt: null, createdAt: DEMO_NOW, updatedAt: DEMO_NOW,
}];

export type AccountObservation = { handle: string; observed_at: string; profile_views: number; followers_count: number };
export const accountObservations: AccountObservation[] = accounts.flatMap((account, index) => {
  if (index === 3) return [];
  const start = Date.parse(`${shiftDate(DEMO_START, -1)}T16:00:00+09:00`);
  return Array.from({ length: 40 * 96 + 1 }, (_, slot) => {
    const time = start + slot * 15 * 60_000;
    // Fixtures cover September/October: Pacific midnight is 07:00 UTC.
    const minutes = ((time - Date.parse('2026-09-01T07:00:00Z')) % 86_400_000) / 60_000;
    return { handle: account.handle, observed_at: new Date(time).toISOString(), profile_views: index === 2 ? 0 : Math.floor(minutes / 15) * (index + 2), followers_count: index === 2 ? 320 : 700 + index * 500 + Math.floor(slot / 96) * (index + 3) };
  }).filter(row => !(index === 1 && row.observed_at >= '2026-10-26T06:45:00.000Z'));
});

export const metricPosts = posts.map(post => {
  const account = accounts.find(a => a.id === post.accountId)!;
  const born = Date.parse(post.publishedAt);
  const end = Date.parse(`${DEMO_END}T16:00:00+09:00`);
  const accountIndex = accounts.indexOf(account);
  const observations = Array.from({ length: Math.max(0, Math.floor((end - born) / 86_400_000) + 1) }, (_, day) => ({
    observed_at: `${shiftDate(post.publishedAt.slice(0, 10), day)}T16:00:00+09:00`,
    views: accountIndex === 2 ? 0 : 400 + day * (80 + accountIndex * 30),
  })).filter(row => accountIndex !== 3 && !(accountIndex === 1 && row.observed_at.startsWith(DEMO_END)));
  return { id: post.id, accountId: post.accountId, published_at: post.publishedAt, observations };
});

const conversations = [
  ['작업실을 정리할 때는 가장 작은 서랍부터 시작해요. 오늘은 도구 세 개만 제자리에 두었습니다.', '한 번에 다 정리하려다 늘 포기했는데, 서랍 하나라면 해볼 수 있겠네요!', '작게 시작하면 다음 날 이어가기에도 부담이 덜하더라고요. 오늘은 가장 자주 여는 서랍부터 해보세요.'],
  ['씨앗을 심고 바로 변화가 보이지 않아도 흙의 습도를 천천히 살펴봅니다.', '처음 키우는 식물인데 물 주는 간격은 어떻게 정하면 좋을까요?', '날짜를 정하기보다 흙이 마른 정도를 먼저 살펴보세요. 어떤 식물을 키우고 계신가요?'],
  ['아침에 떠오른 생각을 세 줄만 적어 봤어요. 짧게 쓰니 매일 이어갈 수 있었습니다.', '꼭 아침에 써야 하나요? 저는 저녁이 더 편해서요.', '편하게 이어갈 수 있는 시간이 가장 좋겠지요. 저녁에 하루를 돌아보며 세 줄 적는 것도 좋아요.'],
  ['오늘은 쓰지 않는 도구를 한곳에 모아 작업 공간을 비웠습니다.', '분류한 도구는 어떻게 보관하시나요?', '자주 쓰는 것만 손 닿는 곳에 두고, 나머지는 종류별 상자에 모아두고 있어요.'],
  ['비 오는 날의 정원은 잎의 색이 더 짙게 보이네요.', '사진 없이 글만 읽어도 정원에 있는 기분이에요.', '그렇게 읽어 주셔서 고마워요. 다음에는 비가 그친 뒤의 풍경도 적어볼게요.'],
  ['잠깐 멈춰 주변 소리를 기록하는 시간을 가졌습니다.', '기록을 시작할 때 어떤 질문이 도움이 되나요?', '지금 가장 가까이 들리는 소리가 무엇인지부터 적어보세요. 한 문장이면 충분해요.'],
];

export function seedComments(): CommentItem[] {
  return conversations.map(([rootBody, sourceBody, draft], index) => {
    const account = accounts[index % 3];
    const id = `comment-${index + 1}`;
    return {
      id, accountId: account.id, sourceAuthor: `가상 독자 ${index + 1}`, rootBody, sourceBody,
      parentBody: index === 1 ? '물을 너무 자주 주면 뿌리가 힘들어할 수도 있어요.' : null,
      publishedAt: new Date(Date.parse(DEMO_NOW) - [35, 90, 210, 330, 900, 1800][index] * 60_000).toISOString(),
      drafts: [{ id: `${id}-a`, label: '공감하며 이어가기', body: draft }, { id: `${id}-b`, label: '짧게 답하기', body: ['작은 시작을 응원해요. 편한 속도로 함께 해봐요.', '흙의 상태를 먼저 살펴보세요. 식물 이름도 알려주세요.', '저녁도 좋아요. 편한 시간에 세 줄부터 시작해보세요.', '자주 쓰는 도구부터 손 닿는 곳에 두고 있어요.', '따뜻한 말씀 고마워요. 다음 풍경도 나눌게요.', '지금 들리는 소리 하나부터 적어보세요.'][index] }],
      selectedDraftId: `${id}-a`, finalBody: draft, status: index === 4 ? 'reviewed' : 'pending',
      contextChecked: index === 4, revision: 0, updatedAt: null,
    };
  });
}
