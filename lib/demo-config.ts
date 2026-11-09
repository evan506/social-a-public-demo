import type { AccountPerformance } from './domain/accounts';
export const DEMO_NOW = '2026-10-27T12:00:00+09:00';
export const DEMO_END = '2026-10-26';
export const DEMO_START = '2026-09-17';
export const accounts: AccountPerformance[] = [
  { id: 'demo-atelier', name: '작은 작업실', handle: 'sample_atelier', owner: '샘플 A팀', connectionStatus: 'connected', color: '#df785f' },
  { id: 'demo-garden', name: '느린 정원', handle: 'sample_garden', owner: '샘플 A팀', connectionStatus: 'connected', color: '#578a76' },
  { id: 'demo-note', name: '아침 노트', handle: 'sample_note', owner: '샘플 B팀', connectionStatus: 'connected', color: '#9b86bd' },
  { id: 'demo-studio', name: '다음 스튜디오', handle: 'sample_studio', owner: '샘플 B팀', connectionStatus: 'unavailable', color: '#8393a2' },
];

