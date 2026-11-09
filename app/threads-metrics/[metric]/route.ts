import { NextRequest, NextResponse } from 'next/server';
import { metricsSnapshot } from '@/lib/metrics-service';
export async function GET(request: NextRequest, { params }: { params: Promise<{ metric: string }> }) {
  const { metric } = await params;
  if (!['profile-range', 'follower-range', 'post-range'].includes(metric)) return NextResponse.json({ message: '찾을 수 없습니다.' }, { status: 404 });
  try {
    const snapshot = metricsSnapshot(request.nextUrl.searchParams.get('start') ?? '', request.nextUrl.searchParams.get('end') ?? '');
    return NextResponse.json({ start: snapshot.start, end: snapshot.end, time: snapshot.time, timezone: snapshot.timezone, accounts: snapshot.accounts.map(row => ({ handle: row.handle, ...(metric === 'profile-range' ? row.profile : metric === 'follower-range' ? row.follower : row.posts) })) });
  } catch (error) { return NextResponse.json({ message: error instanceof Error ? error.message : '기간 조회에 실패했습니다.' }, { status: 400 }); }
}
