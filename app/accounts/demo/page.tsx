import { PageHeader } from '@/components/shared';
import { AccountOnboarding } from '@/components/account-onboarding';
export default function Accounts() {
  return <><PageHeader referenceDate={null} eyebrow="GETTING STARTED" title="계정 등록부터 답글 준비까지" description="계정 등록, Threads 연결, AI 초안 준비의 순서를 체험하세요." /><AccountOnboarding /></>;
}
