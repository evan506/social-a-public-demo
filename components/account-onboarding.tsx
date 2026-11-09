'use client';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { accounts } from '@/lib/demo-config';
import type { Enrollment } from '@/lib/onboarding-domain';
export function AccountOnboarding() {
  const [items, setItems] = useState<Enrollment[]>([]);
  const [handle, setHandle] = useState(accounts[0]?.handle ?? '');
  const [url, setUrl] = useState(accounts[0] ? `https://www.threads.com/@${accounts[0].handle}` : '');
  const [busy, setBusy] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function load() {
    setBusy(true); setError('');
    try { const response = await fetch('/api/accounts'); const data = await response.json(); if (!response.ok) throw new Error(data.message); setItems(data.items); setLoaded(true); setMessage(''); }
    catch (error) { setError(error instanceof Error ? error.message : '불러오지 못했습니다.'); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/accounts', { signal: controller.signal }).then(async response => {
      const data = await response.json(); if (!response.ok) throw new Error(data.message);
      setItems(data.items); setLoaded(true);
    }).catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : '불러오지 못했습니다.'); }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, []);
  async function send(body: Record<string, unknown>) {
    setBusy(true); setMessage(''); setError('');
    try { const response = await fetch('/api/accounts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); const data = await response.json(); if (!response.ok) throw new Error(data.message); setItems(data.items); setMessage('체험 상태를 저장했습니다. 실제 외부 인증이나 수집은 실행되지 않았습니다.'); }
    catch (error) { setError(error instanceof Error ? error.message : '처리하지 못했습니다. 다시 시도해 주세요.'); }
    finally { setBusy(false); }
  }
  function register(event: FormEvent) { event.preventDefault(); void send({ action: 'register', handle, profileUrl: url }); }
  return <div className="onboarding">
    <section className="panel onboarding-note"><p className="eyebrow">CONNECTION GUIDE</p><h2>합성 계정으로 연결 과정 체험</h2><p>이 화면의 수락·인증·수집은 모두 모의 처리입니다. 비밀번호·관리자 키·인증값을 입력하지 않습니다. 실제 계정 정보도 입력하지 마세요.</p><p>실제 사용 순서: 등록 → 팀 내부 연락 → Meta 테스터 초대·수락 → Threads 권한 연결 → 수집 → AI 초안 생성.</p><p>Threads 인증은 데이터 조회에, Codex 로그인은 답글 초안 생성에 쓰입니다. 현재 방문자가 등록한 합성 계정을 확인하는 데모입니다. 사용자 로그인·팀 역할별 권한 분리는 제공하지 않습니다.</p></section>
    <section className="panel"><p className="eyebrow">REGISTER AN ACCOUNT</p><h2>1. 합성 계정 등록</h2><p>사용 가능한 계정: {accounts.map(a => `@${a.handle}`).join(', ')}</p>
      <label className="sample-picker">샘플 계정 선택<select value={accounts.some(a => a.handle === handle) ? handle : ''} disabled={busy} onChange={e => { setHandle(e.target.value); setUrl(`https://www.threads.com/@${e.target.value}`); }}><option value="" disabled>합성 계정을 선택하세요</option>{accounts.map(account => <option key={account.id} value={account.handle}>{account.name} · @{account.handle}</option>)}</select></label>
      <form onSubmit={register} className="onboarding-form"><label>Threads 핸들<input value={handle} onChange={e => setHandle(e.target.value)} required maxLength={65} autoCapitalize="none" /></label><label>프로필 주소<input value={url} onChange={e => setUrl(e.target.value)} type="url" required maxLength={200} /></label><button className="primary" disabled={busy || !loaded}>계정 등록</button></form>
      <p>등록 후 팀에서 사용하는 연락 수단으로 관리자에게 테스터 초대를 요청하세요. 이 서비스에서 메시지를 보내지는 않습니다.</p>
    </section>
    <div role="status" className={`save-notice ${message ? 'visible' : ''}`} aria-live="polite">{message}</div>
    {error && <div role="alert" className="alert-error">{error}</div>}<button onClick={() => void load()} disabled={busy}>등록 목록 다시 불러오기</button>
    {!loaded && <p>등록 목록을 불러오는 중이거나 재시도가 필요합니다.</p>}
    {loaded && !items.length && <p>아직 등록된 계정이 없습니다.</p>}
    {items.map(item => <section className="panel" key={item.id} aria-label={`@${item.handle} 연결 단계`}>
      <h2>@{item.handle}</h2><p>저장 시각: {new Date(item.updatedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} KST</p>
      <div className="onboarding-steps">
        <Step title="2. Meta 테스터 초대·수락" status={item.accepted ? '수락 모의 확인됨' : '관리자에게 연락 후 수락 필요'}><button disabled={busy || item.accepted} onClick={() => void send({ id: item.id, revision: item.revision, action: 'accept' })}>테스터 수락 모의 확인</button></Step>
        <Step title="3. Threads 조회 권한" status={item.connection === 'connected' ? '조회 권한 연결 모의 완료' : item.connection === 'permission_missing' ? '조회 권한 부족 · 다시 연결 필요' : '연결 필요'}>
          <button className="primary" disabled={busy || !item.accepted} onClick={() => void send({ id: item.id, revision: item.revision, action: 'connect' })}>권한 연결 성공 체험</button><button disabled={busy || !item.accepted} onClick={() => void send({ id: item.id, revision: item.revision, action: 'permission_missing' })}>권한 부족 체험</button><button disabled={busy || !item.accepted} onClick={() => void send({ id: item.id, revision: item.revision, action: 'cancel' })}>연결 취소 체험</button>
        </Step>
        <Step title="4. 첫 수집 결과" status={item.collection === 'sample_ready' ? '수집 성공 상황 모의 완료 · 실수집 아님' : item.collection === 'failed' ? '수집 실패 모의 · 다시 시도 가능' : '수집 전'}>
          <button disabled={busy || item.connection !== 'connected'} onClick={() => void send({ id: item.id, revision: item.revision, action: 'collect' })}>수집 성공 체험</button><button disabled={busy || item.connection !== 'connected'} onClick={() => void send({ id: item.id, revision: item.revision, action: 'collection_fail' })}>수집 실패 체험</button>
          {item.collection === 'sample_ready' && <p className="footnote">아래는 기존 합성 데이터입니다. 연결 체험 상태와 독립된 자료이며, 미관측 상태도 그대로 표시됩니다.<br /><Link href={`/dashboard?q=${item.handle}`}>이 계정의 합성 대시보드</Link> · <Link href={`/threads-metrics/?q=${item.handle}`}>합성 Metrics</Link></p>}
        </Step>
        <Step title="5. Codex 로그인과 답글 초안" status={item.codex ? 'Codex 로그인 가능 상황을 모의 중' : 'Codex 로그인 미확인 · 실제 Codex는 호출하지 않음'}>
          <button disabled={busy} onClick={() => void send({ id: item.id, revision: item.revision, action: 'codex_ready' })}>Codex 로그인 성공 체험</button><button disabled={busy} onClick={() => void send({ id: item.id, revision: item.revision, action: 'codex_fail' })}>Codex 로그인 불가 체험</button><button className="primary" disabled={busy || !item.codex || item.collection !== 'sample_ready'} onClick={() => void send({ id: item.id, revision: item.revision, action: 'draft' })}>샘플 답글 후보 준비</button>
          <p>모델을 호출하지 않고 합성 댓글로 정해진 문구를 구성합니다. 기존 편집 본문은 유지됩니다. 댓글이 없는 계정은 후보를 만들지 않습니다.</p>
          {item.draftReady && <p>샘플 후보 저장됨 · AI 생성 아님. <Link href={`/comments?accountId=${encodeURIComponent(item.id)}`}>이 계정의 받은 댓글 답글 검토</Link></p>}
        </Step>
      </div>
    </section>)}
  </div>;
}
function Step({ title, status, children }: { title: string; status: string; children: React.ReactNode }) { return <div className="onboarding-step"><h3>{title}</h3><p>{status}</p><div>{children}</div></div>; }
