import { rm } from 'node:fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import { clearDemoSession, demoOriginAllowed, demoSession } from '@/lib/demo-session';
import { localVerificationEnabled } from '@/lib/app-mode';
export async function POST(request: NextRequest) {
  if (localVerificationEnabled()) return NextResponse.json({ message: '데모 모드에서만 초기화할 수 있습니다.' }, { status: 404 });
  if (!demoOriginAllowed(request)) return NextResponse.json({ message: '현재 화면에서 요청해 주세요.' }, { status: 403 });
  const session = await demoSession(request);
  await rm(session.directory, { recursive: true, force: true });
  return clearDemoSession(NextResponse.json({ reset: true }, { headers: { 'Cache-Control': 'no-store' } }));
}
