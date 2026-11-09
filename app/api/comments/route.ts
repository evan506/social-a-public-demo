import { demoSession, demoOriginAllowed } from '@/lib/demo-session';
import { NextRequest, NextResponse } from 'next/server';
import { createCommentStore, StoreError } from '@/lib/comment-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function failure(error: unknown) {
  return NextResponse.json({ message: error instanceof StoreError ? error.message : '저장소에 접근하지 못했습니다. 입력한 내용을 보관한 뒤 다시 시도해 주세요.' }, { status: error instanceof StoreError ? error.status : 503 });
}
export async function GET(request: NextRequest) {
  try { const session = await demoSession(request); const store = createCommentStore(session.directory); return session.apply(NextResponse.json({ items: await store.list() })); }
  catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  if (!demoOriginAllowed(request)) return NextResponse.json({ message: '이 화면에서 다시 요청해 주세요.' }, { status: 403 });
  if (!request.headers.get('content-type')?.startsWith('application/json')) return NextResponse.json({ message: 'JSON 요청이 필요합니다.' }, { status: 415 });
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new StoreError(400, '저장할 내용이 없습니다.');
    const chunks: Uint8Array[] = []; let bytes = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      bytes += value.byteLength;
      if (bytes > 16384) { await reader.cancel(); throw new StoreError(413, '요청이 너무 큽니다.'); }
      chunks.push(value);
    }
    let body;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new StoreError(400, '요청 내용을 읽을 수 없습니다.'); }
    if (body?.action !== 'save_draft') throw new StoreError(400, '초안 저장만 지원합니다.');
    const session = await demoSession(request); const store = createCommentStore(session.directory);
    return session.apply(NextResponse.json({ item: await store.update(body) }));
  } catch (error) { return failure(error); }
}
