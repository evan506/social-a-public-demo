export type CommentStatus = 'pending' | 'reviewed' | 'held';
export type CommentDraft = { id: string; label: string; body: string };
export type CommentItem = {
  id: string; accountId: string; sourceAuthor: string; rootBody: string; sourceBody: string;
  parentBody: string | null; publishedAt: string; drafts: CommentDraft[];
  selectedDraftId: string; finalBody: string; status: CommentStatus; contextChecked: boolean;
  revision: number; updatedAt: string | null;
};
export type CommentUpdate = Pick<CommentItem, 'id' | 'selectedDraftId' | 'finalBody' | 'status' | 'contextChecked' | 'revision'>;
export const statusLabels: Record<CommentStatus, string> = { pending: '검토 중', reviewed: '검토 완료', held: '보류' };

// Preserves the original review workspace's disjoint 0–2h / 2–6h windows.
export function matchesFreshness(item: CommentItem, filter: string, now: string): boolean {
  const age = Date.parse(now) - Date.parse(item.publishedAt);
  if (filter === '2h') return age >= 0 && age <= 2 * 3_600_000;
  if (filter === '6h') return age > 2 * 3_600_000 && age <= 6 * 3_600_000;
  return true;
}
