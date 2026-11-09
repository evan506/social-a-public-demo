import { localVerificationEnabled } from '@/lib/app-mode';
import type { Metadata } from 'next';
import { Shell } from '@/components/shell';
import './globals.css';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Social A · 소셜 워크스페이스', description: '합성 데이터로 살펴보는 계정 성과와 댓글 초안 관리 데모', robots: { index: false, follow: false } };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="ko"><body><Shell localVerification={localVerificationEnabled()}>{children}</Shell></body></html>; }
