import { PageHeader } from '@/components/shared';
import { CommentWorkspace } from '@/components/comment-workspace';
import { accounts } from '@/lib/demo-config';
export default async function Comments({ searchParams }: { searchParams: Promise<{ accountId?: string }> }) {
  const params = await searchParams;
  const accountId = accounts.some(account => account.id === params.accountId) ? params.accountId! : '';
  return <><PageHeader referenceDate="2026. 10. 27" eyebrow="CONVERSATION DESK" title="대화를 이어가는 답글" description="원문과 댓글을 함께 읽고, 답글 초안을 다듬어 보세요." /><CommentWorkspace key={accountId} initialAccountId={accountId} /></>;
}
