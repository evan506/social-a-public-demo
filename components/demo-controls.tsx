'use client';
import { useState } from 'react';
export function DemoControls() {
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  return <div className="demo-controls"><div><strong>포트폴리오 체험</strong><p>합성 데이터 · 외부 계정 연결/AI 호출 없음 · 편집은 이 브라우저 세션에만 저장됩니다. 세션은 최대 24시간이며 재시작·혼잡 시 더 일찍 초기화될 수 있습니다.</p>{error && <p role="alert">{error}</p>}</div><button disabled={busy} onClick={async () => {
    if (!window.confirm('이 브라우저의 데모 편집 내용을 초기화할까요?')) return;
    setBusy(true); setError('');
    try { const response = await fetch('/api/demo/reset', { method: 'POST' }); if (!response.ok) throw new Error(); sessionStorage.removeItem('social-a:unsaved-comment:v1'); window.location.reload(); }
    catch { setError('초기화하지 못했습니다. 다시 시도해 주세요.'); setBusy(false); }
  }}>데모 초기화</button></div>;
}
