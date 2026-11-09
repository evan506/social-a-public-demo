import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { EnrollmentError, isEnrollment, registration, transition, type Enrollment } from './onboarding-domain';
import { createCommentStore } from './comment-store';
export function createEnrollmentStore(directory = process.env.SOCIAL_A_DEMO_DIRECTORY || path.join(process.cwd(), '.runtime')) {
  const file = path.join(directory, 'enrollments.json'); const lock = path.join(directory, 'enrollments.lock');
  async function run(input?: Record<string, unknown>): Promise<Enrollment[]> {
    await mkdir(directory, { recursive: true });
    try { await mkdir(lock); } catch { throw new EnrollmentError(503, '등록 정보를 처리 중입니다. 다시 시도해 주세요.'); }
    try {
      let items: Enrollment[] = [];
      try { const data = JSON.parse(await readFile(file, 'utf8')); if (data.version !== 1 || !Array.isArray(data.items) || data.items.some((i: unknown) => !isEnrollment(i)) || new Set(data.items.map((i: Enrollment) => i.id)).size !== data.items.length) throw new Error(); items = data.items; }
      catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw new EnrollmentError(503, '등록 정보를 읽지 못했습니다. 기존 파일을 보존했습니다.'); }
      if (!input) return items;
      if (input.action === 'register') {
        const item = registration(input.handle, input.profileUrl);
        if (items.some(i => i.id === item.id)) throw new EnrollmentError(409, '이미 등록된 계정입니다. 목록에서 이어서 진행해 주세요.');
        items.push(item);
      } else {
        const index = items.findIndex(i => i.id === input.id);
        if (index < 0) throw new EnrollmentError(404, '계정을 먼저 등록해 주세요.');
        if (items[index].revision !== input.revision) throw new EnrollmentError(409, '다른 화면에서 변경되었습니다. 새로고침해 주세요.');
        const updated = transition(items[index], String(input.action));
        if (input.action === 'draft') await createCommentStore(directory).prepareSampleDrafts(updated.id);
        items[index] = updated;
      }
      const temp = `${file}.${randomUUID()}.tmp`;
      try { await writeFile(temp, JSON.stringify({ version: 1, items }), { mode: 0o600 }); await rename(temp, file); }
      catch (error) {
        if (input.action === 'draft') throw new EnrollmentError(503, '샘플 후보는 저장했지만 연결 상태를 저장하지 못했습니다. 목록을 다시 불러온 뒤 후보 준비를 재시도해 주세요. 후보는 중복되지 않습니다.');
        throw error;
      } finally { await rm(temp, { force: true }); }
      return items;
    } finally { await rm(lock, { recursive: true }); }
  }
  return { list: () => run(), update: (input: Record<string, unknown>) => run(input) };
}
