import { accounts } from './demo-config';
export type Enrollment = { id: string; handle: string; profileUrl: string; accepted: boolean; connection: 'pending' | 'connected' | 'permission_missing'; collection: 'pending' | 'failed' | 'sample_ready'; codex: boolean; draftReady: boolean; revision: number; updatedAt: string };
export class EnrollmentError extends Error { constructor(public status: number, message: string) { super(message); } }
// Adapted from the original production-account-enrollment validation; no DB or credentials.
export function normalizeThreadsProfile(handle: unknown, profileUrl: unknown) {
  if (typeof handle !== 'string' || !/^[a-z0-9._]{1,64}$/i.test(handle.trim().replace(/^@+/, ''))) throw new EnrollmentError(400, '계정명 형식을 확인해 주세요.');
  const normalized = handle.trim().replace(/^@+/, '').toLowerCase();
  let url: URL;
  try { url = new URL(String(profileUrl)); } catch { throw new EnrollmentError(400, '프로필 주소를 확인해 주세요.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !['threads.com', 'www.threads.com', 'threads.net', 'www.threads.net'].includes(url.hostname) || url.pathname.replace(/\/$/, '').toLowerCase() !== `/@${normalized}` || url.search || url.hash) throw new EnrollmentError(400, 'HTTPS 프로필 주소와 계정명이 일치해야 합니다.');
  return { handle: normalized, profileUrl: `https://www.threads.com/@${normalized}` };
}
export function registration(handle: unknown, profileUrl: unknown): Enrollment {
  const { handle: normalized } = normalizeThreadsProfile(handle, profileUrl);
  const account = accounts.find(a => a.handle === normalized);
  if (!account) throw new EnrollmentError(400, '이 데모에서는 안내된 합성 계정만 등록할 수 있습니다.');
  return { id: account.id, handle: normalized, profileUrl: `https://www.threads.com/@${normalized}`, accepted: false, connection: 'pending', collection: 'pending', codex: false, draftReady: false, revision: 0, updatedAt: new Date().toISOString() };
}
export function transition(item: Enrollment, action: string): Enrollment {
  const next = { ...item };
  if (action === 'accept') next.accepted = true;
  else if (['connect', 'permission_missing', 'cancel'].includes(action)) {
    if (!item.accepted) throw new EnrollmentError(422, '먼저 테스터 수락 단계를 확인해 주세요.');
    next.connection = action === 'connect' ? 'connected' : action === 'cancel' ? 'pending' : 'permission_missing';
    next.collection = 'pending';
  } else if (['collect', 'collection_fail'].includes(action)) {
    if (item.connection !== 'connected') throw new EnrollmentError(422, 'Threads 조회 권한 연결이 필요합니다.');
    next.collection = action === 'collect' ? 'sample_ready' : 'failed';
  } else if (action === 'codex_ready' || action === 'codex_fail') { next.codex = action === 'codex_ready'; }
  else if (action === 'draft') {
    if (item.collection !== 'sample_ready' || !item.codex) throw new EnrollmentError(422, '수집 샘플 확인과 Codex 로그인 모의 확인이 먼저 필요합니다.');
    next.draftReady = true;
  } else throw new EnrollmentError(400, '지원하지 않는 작업입니다.');
  return { ...next, revision: item.revision + 1, updatedAt: new Date().toISOString() };
}

// Validate persisted state before displaying it or advancing the workflow.
export function isEnrollment(value: unknown): value is Enrollment {
  if (!value || typeof value !== 'object') return false;
  const item = value as Enrollment;
  const account = accounts.find(account => account.id === item.id);
  return Boolean(account && item.handle === account.handle && item.profileUrl === `https://www.threads.com/@${account.handle}`
    && typeof item.accepted === 'boolean' && typeof item.codex === 'boolean' && typeof item.draftReady === 'boolean'
    && ['pending', 'connected', 'permission_missing'].includes(item.connection)
    && ['pending', 'failed', 'sample_ready'].includes(item.collection)
    && Number.isSafeInteger(item.revision) && item.revision >= 0
    && typeof item.updatedAt === 'string' && Number.isFinite(Date.parse(item.updatedAt))
    && (item.connection === 'pending' || item.accepted)
    && (item.collection === 'pending' || item.connection === 'connected'));
}
