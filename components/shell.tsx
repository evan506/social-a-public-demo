'use client';
import Link from 'next/link';
import { DemoControls } from './demo-controls';
import { usePathname } from 'next/navigation';

const nav = [
  { href: '/accounts', label: '계정 등록·연결', icon: '◎', note: 'Getting started' },
  { href: '/dashboard', label: '대시보드', icon: '▦', note: 'Overview' },
  { href: '/threads-metrics/', label: 'Threads Metrics', icon: '▥', note: 'Performance' },
  { href: '/comments', label: '받은 댓글 답글', icon: '☷', note: 'Conversations' },
];
export function Shell({ children, localVerification = false }: { children: React.ReactNode; localVerification?: boolean }) {
  const pathname = usePathname().replace(/\/$/, '');
  const registrationPage = localVerification && (pathname === '/accounts' || (pathname.startsWith('/accounts/') && pathname !== '/accounts/demo'));
  const active = (href: string) => pathname === href.replace(/\/$/, '') || pathname.startsWith(href.replace(/\/$/, '') + '/');
  return <div className="app-shell">
    <a href="#main" className="skip-link">본문으로 이동</a>
    <aside className="sidebar">
      <Link href="/dashboard" className="brand"><span className="brand-mark">s<span>•</span></span><span>Social A<small>YOUR SOCIAL WORKSPACE</small></span></Link>
      <div className="workspace"><span className="workspace-avatar">A</span><span>{registrationPage ? '로컬 워크스페이스' : '샘플 워크스페이스'}<small>{registrationPage ? 'Local accounts' : 'Portfolio demo'}</small></span><span className="workspace-dot" /></div>
      <p className="nav-label">WORKSPACE</p>
      <nav aria-label="주 메뉴">{nav.map(item => <Link href={item.href} key={item.href} aria-label={item.label} aria-current={active(item.href) ? 'page' : undefined}><span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}<small>{item.note}</small></span></Link>)}</nav>
      <div className="sidebar-bottom"><span className="demo-dot" /> {registrationPage ? '실제 계정 · 로컬 보관' : '합성 데이터 데모'}<p>성과를 살펴보고,<br />대화를 차분히 이어가세요.</p><small>PROJECT SOCIAL A · 2026</small></div>
    </aside>
    <div className="main-wrap"><header className="topbar"><span>워크스페이스 <b>/</b> <strong>{nav.find(n => active(n.href))?.label ?? 'Social A'}</strong></span><span className="demo-tag">{registrationPage ? 'LOCAL' : 'DEMO'} <i /> {registrationPage ? '계정 등록' : '합성 샘플'}</span></header><main id="main" tabIndex={-1}>{!localVerification && <DemoControls />}{children}</main><footer>Social A <span>{registrationPage ? '실제 계정 자료는 로컬에 저장됩니다. 공개 게시 기능은 없습니다.' : '댓글·지표는 합성 데이터입니다.'}</span></footer></div>
  </div>;
}
