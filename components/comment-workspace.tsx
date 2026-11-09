'use client';
import { useEffect, useState } from 'react';
import { accounts, DEMO_NOW } from '@/lib/demo-config';
import { matchesFreshness, statusLabels, type CommentItem, type CommentUpdate } from '@/lib/domain/comments';

function time(value: string) { return new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); }
const RECOVERY_KEY = 'social-a:unsaved-comment:v1';
function recoverEdit(items: CommentItem[]): CommentUpdate | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(RECOVERY_KEY) ?? 'null');
    if (!value || typeof value.finalBody !== 'string' || value.finalBody.length > 1000 || !Number.isInteger(value.revision) || !['pending', 'reviewed', 'held'].includes(value.status) || typeof value.contextChecked !== 'boolean') return null;
    const item = items.find(item => item.id === value.id);
    return item?.drafts.some(draft => draft.id === value.selectedDraftId) ? value : null;
  } catch { return null; }
}
function clearRecovery() { try { sessionStorage.removeItem(RECOVERY_KEY); } catch { /* Browser storage can be disabled. */ } }
function editFor(item: CommentItem): CommentUpdate { return { id: item.id, selectedDraftId: item.selectedDraftId, finalBody: item.finalBody, status: item.status, contextChecked: item.contextChecked, revision: item.revision }; }

export function CommentWorkspace({ initialAccountId = '' }: { initialAccountId?: string }) {
  const [items, setItems] = useState<CommentItem[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [edit, setEdit] = useState<CommentUpdate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [accountId, setAccountId] = useState(initialAccountId);
  const [freshness, setFreshness] = useState('all');
  const [status, setStatus] = useState('');
  const selected = items.find(item => item.id === selectedId);
  const dirty = Boolean(selected && edit && JSON.stringify(editFor(selected)) !== JSON.stringify(edit));
  const visible = items.filter(item => (!accountId || item.accountId === accountId) && (!status || item.status === status) && matchesFreshness(item, freshness, DEMO_NOW));
  const selectedVisible = selected && visible.some(item => item.id === selected.id);

  async function load() {
    setLoading(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/comments', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || '초안을 불러오지 못했습니다.');
      setItems(result.items);
      const recovered = !edit ? recoverEdit(result.items) : null;
      const first = result.items.find((item: CommentItem) => item.id === (recovered?.id ?? selectedId)) ?? result.items.find((item: CommentItem) => !initialAccountId || item.accountId === initialAccountId);
      setSelectedId(first?.id ?? ''); setEdit(recovered ?? (first ? editFor(first) : null));
      if (recovered) { setAccountId(first.accountId); setNotice('이 탭에서 저장하지 않은 내용을 복원했습니다. 내용을 확인한 뒤 저장해 주세요.'); }
    } catch (error) { setError(error instanceof Error ? error.message : '초안을 불러오지 못했습니다.'); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let cancelled = false;
    fetch('/api/comments', { cache: 'no-store' }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || '초안을 불러오지 못했습니다.');
      if (cancelled) return;
      const recovered = recoverEdit(result.items);
      const first = result.items.find((item: CommentItem) => item.id === recovered?.id) ?? result.items.find((item: CommentItem) => !initialAccountId || item.accountId === initialAccountId);
      setItems(result.items); setSelectedId(first?.id ?? ''); setEdit(recovered ?? (first ? editFor(first) : null));
      if (recovered) { setAccountId(first.accountId); setNotice('이 탭에서 저장하지 않은 내용을 복원했습니다. 내용을 확인한 뒤 저장해 주세요.'); }
    }).catch(error => { if (!cancelled) setError(error.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [initialAccountId]);
  useEffect(() => {
    function warn(event: BeforeUnloadEvent) { if (dirty) event.preventDefault(); }
    function guardNavigation(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (dirty && target) { event.preventDefault(); event.stopPropagation(); setNotice('수정한 내용을 저장하거나 변경 취소 후 이동해 주세요.'); }
    }
    window.addEventListener('beforeunload', warn);
    document.addEventListener('click', guardNavigation, true);
    return () => { window.removeEventListener('beforeunload', warn); document.removeEventListener('click', guardNavigation, true); };
  }, [dirty]);

  function select(item: CommentItem) {
    if (dirty || saving) { setNotice('수정한 내용을 저장하거나 변경 취소 후 다른 댓글을 선택해 주세요.'); return; }
    setSelectedId(item.id); setEdit(editFor(item)); setError(''); setNotice('');
  }
  function updateEdit(next: CommentUpdate) {
    setEdit(next); setNotice('');
    try {
      if (selected && JSON.stringify(next) === JSON.stringify(editFor(selected))) clearRecovery();
      else sessionStorage.setItem(RECOVERY_KEY, JSON.stringify(next));
    } catch { setNotice('브라우저 임시 보관을 사용할 수 없습니다. 이동하기 전에 초안을 저장해 주세요.'); }
  }
  function changeCandidate(id: string) {
    if (!edit || !selected || id === edit.selectedDraftId) return;
    const currentBody = edit.selectedDraftId === selected.selectedDraftId ? selected.finalBody : selected.drafts.find(draft => draft.id === edit.selectedDraftId)?.body;
    if (edit.finalBody !== currentBody) { setNotice('수정한 본문을 저장하거나 변경 취소 후 다른 후보를 선택해 주세요.'); return; }
    const draft = selected.drafts.find(draft => draft.id === id)!;
    updateEdit({ ...edit, selectedDraftId: id, finalBody: id === selected.selectedDraftId ? selected.finalBody : draft.body, status: 'pending', contextChecked: false });
  }
  async function save() {
    if (!edit || saving) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'save_draft', ...edit }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || '저장하지 못했습니다.');
      setItems(previous => previous.map(item => item.id === result.item.id ? result.item : item));
      setEdit(editFor(result.item)); clearRecovery(); setNotice('초안을 저장했습니다.');
    } catch (error) { setError(error instanceof Error ? error.message : '저장하지 못했습니다.'); }
    finally { setSaving(false); }
  }
  return <>
    <div className="comment-intro"><span className="badge good">받은 댓글 답글</span><span>초안 선택 → 문맥 검토 → 수정·저장</span><span className="muted">합성 댓글 · 게시 기능 없음</span></div>
    <section className="filter-panel comment-filters" aria-label="댓글 필터">
      <label>계정<select value={accountId} onChange={e => setAccountId(e.target.value)} disabled={dirty || saving}><option value="">전체 계정</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
      <label>댓글 시점<select value={freshness} onChange={e => setFreshness(e.target.value)} disabled={dirty || saving}><option value="all">전체 기간</option><option value="2h">최근 2시간</option><option value="6h">2~6시간</option></select></label>
      <label>검토 상태<select value={status} onChange={e => setStatus(e.target.value)} disabled={dirty || saving}><option value="">전체 상태</option>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <button onClick={() => void load()} disabled={loading || dirty || saving}>다시 불러오기</button><small>시간 필터 기준: 2026.10.27 12:00 KST</small>
    </section>
    {error && <div role="alert" className="alert-error">{error}{!dirty && <button onClick={() => void load()} disabled={saving || loading}>다시 시도</button>}</div>}
    <div role="status" className={`save-notice ${notice ? 'visible' : ''}`}>{notice}</div>
    {loading ? <div role="status" className="empty-state">댓글 초안을 불러오고 있습니다…</div> : !items.length ? <div className="empty-state"><h2>댓글을 표시할 수 없습니다.</h2><p>오류 내용을 확인한 후 다시 불러오세요.</p></div> : <div className="comment-grid">
      <section className="comment-list panel" aria-label="받은 댓글 목록"><div className="queue-heading"><h2>받은 댓글 <span className="count">{visible.length}</span></h2><p>최근 댓글부터 차례로 확인하세요.</p></div>
        {visible.map(item => <button key={item.id} className={`queue-item ${selectedId === item.id ? 'active' : ''}`} onClick={() => select(item)} aria-pressed={selectedId === item.id}><span className="queue-meta"><strong>{accounts.find(a => a.id === item.accountId)?.name}</strong><small>{time(item.publishedAt)}</small></span><b>{item.sourceAuthor}</b><p>{item.sourceBody}</p><span className={`badge ${item.status === 'reviewed' ? 'good' : ''}`}>{statusLabels[item.status]}</span></button>)}
        {!visible.length && <div className="empty-state"><h3>조건에 맞는 댓글이 없습니다.</h3><p>계정이나 기간, 검토 상태를 바꿔 보세요.</p></div>}
      </section>
      {selectedVisible && edit ? <div className="comment-detail">
        <section className="panel conversation"><div className="panel-heading"><div><p className="eyebrow">READ THE CONTEXT</p><h2>원문과 독자 댓글</h2></div><span className="badge">{accounts.find(a => a.id === selected.accountId)?.name}</span></div>
          <div className="root-post"><span className="section-kicker">원 게시물</span><p>{selected.rootBody}</p></div>
          {selected.parentBody && <div className="parent-reply"><small>상위 댓글</small><p>{selected.parentBody}</p></div>}
          <div className="reader-reply"><span className="reader-avatar">{selected.sourceAuthor.at(-1)}</span><div><strong>{selected.sourceAuthor}</strong><small>{time(selected.publishedAt)} KST · 가상 독자</small><p>{selected.sourceBody}</p></div></div>
        </section>
        <section className="panel draft-editor"><div className="panel-heading"><div><p className="eyebrow">CRAFT YOUR REPLY</p><h2>답글 초안 검토</h2></div><span className="badge">{dirty ? '저장 전' : '저장된 초안'}</span></div>
          <fieldset className="draft-options" disabled={saving}><legend>초안 후보 선택</legend>{selected.drafts.map((draft, index) => <label key={draft.id} className={edit.selectedDraftId === draft.id ? 'chosen' : ''}><input type="radio" name="draft" value={draft.id} checked={edit.selectedDraftId === draft.id} onChange={() => changeCandidate(draft.id)} /><span><strong><small>0{index + 1}</small>{draft.label}</strong><p>{draft.body}</p></span></label>)}</fieldset>
          <label className="editor-label" htmlFor="reply-body">답글 본문 <span>{edit.finalBody.length} / 1,000자</span></label><textarea id="reply-body" rows={5} maxLength={1000} value={edit.finalBody} disabled={saving} onChange={e => updateEdit({ ...edit, finalBody: e.target.value, status: edit.status === 'reviewed' ? 'pending' : edit.status, contextChecked: false })} />
          <label className="context-check"><input type="checkbox" checked={edit.contextChecked} disabled={saving} onChange={e => updateEdit({ ...edit, contextChecked: e.target.checked })} />원문과 댓글의 문맥을 확인했습니다.</label>
          <div className="editor-actions"><label>검토 상태<select value={edit.status} disabled={saving} onChange={e => updateEdit({ ...edit, status: e.target.value as CommentUpdate['status'] })}>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><div>{dirty && <button disabled={saving} onClick={() => { setEdit(editFor(selected)); clearRecovery(); setError(''); setNotice('변경을 취소했습니다.'); }}>변경 취소</button>}<button className="primary" onClick={() => void save()} disabled={saving || !edit.finalBody.trim() || (edit.status === 'reviewed' && !edit.contextChecked)}>{saving ? '저장 중…' : '초안 저장'}</button></div></div>
          {edit.status === 'reviewed' && !edit.contextChecked && <p className="warning-note">문맥 확인을 체크하면 검토 완료 상태로 저장할 수 있습니다.</p>}
          <p className="editor-footnote">{selected.updatedAt ? `마지막 저장 ${time(selected.updatedAt)} KST` : '아직 수정하지 않은 샘플 초안입니다.'} · 현재 방문자 세션에 임시 저장됩니다.</p>
        </section>
      </div> : <section className="panel empty-state"><h2>댓글을 선택해 주세요.</h2><p>목록에서 원문과 초안을 확인할 댓글을 선택하세요.</p></section>}
    </div>}
  </>;
}
