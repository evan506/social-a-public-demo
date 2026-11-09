import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { seedComments } from './demo-data';
import type { CommentItem, CommentUpdate } from './domain/comments';

export class StoreError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function createCommentStore(directory = process.env.SOCIAL_A_DEMO_DIRECTORY || path.join(process.cwd(), '.runtime')) {
  const file = path.join(directory, 'comments.json');
  const lock = path.join(directory, 'comments.lock');
  async function locked<T>(fn: () => Promise<T>): Promise<T> {
    await mkdir(directory, { recursive: true });
    let acquired = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      try { await mkdir(lock); acquired = true; break; }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    if (!acquired) throw new StoreError(503, '저장소가 사용 중입니다. 잠시 후 다시 시도해 주세요.');
    try { return await fn(); } finally { await rm(lock, { recursive: true }); }
  }
  async function persist(items: CommentItem[]) {
    const temporary = `${file}.${randomUUID()}.tmp`;
    try { await writeFile(temporary, JSON.stringify({ version: 1, items }, null, 2), { mode: 0o600 }); await rename(temporary, file); }
    finally { await rm(temporary, { force: true }); }
  }
  async function load(): Promise<CommentItem[]> {
    try {
      const data = JSON.parse(await readFile(file, 'utf8'));
      if (data.version !== 1 || !Array.isArray(data.items) || data.items.length !== seedComments().length || data.items.some((item: CommentItem) => !item.id || !Array.isArray(item.drafts) || !Number.isInteger(item.revision) || typeof item.finalBody !== 'string')) throw new Error('invalid_store');
      return data.items;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new StoreError(503, '저장된 초안을 읽지 못했습니다. 기존 파일을 보존했습니다.');
      const items = seedComments(); await persist(items); return items;
    }
  }
  return {
    list: () => locked(load),
    prepareSampleDrafts: (accountId: string) => locked(async () => {
      const items = await load();
      const targets = items.filter(item => item.accountId === accountId);
      if (!targets.length) throw new StoreError(422, '이 계정에는 준비할 합성 댓글이 없습니다.');
      for (const item of targets) {
        const id = `${item.id}-onboarding-sample`;
        if (item.drafts.some(draft => draft.id === id)) continue;
        item.drafts.push({ id, label: '연결 체험 샘플 · AI 생성 아님', body: `“${item.sourceBody.slice(0, 50)}”라고 남겨주셨네요. 이야기 나눠주셔서 고마워요.` });
        item.revision += 1;
        item.updatedAt = new Date().toISOString();
      }
      await persist(items);
      return targets.length;
    }),
    update: (input: CommentUpdate) => locked(async () => {
      if (!input || typeof input !== 'object' || typeof input.id !== 'string' || !Number.isInteger(input.revision) || input.revision < 0 || typeof input.finalBody !== 'string' || !input.finalBody.trim() || input.finalBody.length > 1000 || !['pending', 'reviewed', 'held'].includes(input.status) || typeof input.contextChecked !== 'boolean') throw new StoreError(400, '본문과 검토 상태를 확인해 주세요. 본문은 1~1,000자까지 저장할 수 있습니다.');
      if (input.status === 'reviewed' && !input.contextChecked) throw new StoreError(422, '원문과 댓글의 문맥을 확인한 뒤 검토를 완료해 주세요.');
      const items = await load();
      const item = items.find(row => row.id === input.id);
      if (!item) throw new StoreError(404, '댓글을 찾을 수 없습니다.');
      if (!item.drafts.some(draft => draft.id === input.selectedDraftId)) throw new StoreError(400, '이 댓글에 속한 초안을 선택해 주세요.');
      if (item.revision !== input.revision) throw new StoreError(409, '다른 화면에서 수정되었습니다. 입력한 내용을 복사한 뒤 최신 내용을 다시 불러오세요.');
      Object.assign(item, { selectedDraftId: input.selectedDraftId, finalBody: input.finalBody.trim(), status: input.status, contextChecked: input.contextChecked, revision: item.revision + 1, updatedAt: new Date().toISOString() });
      await persist(items);
      return item;
    }),
  };
}
