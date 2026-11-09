# 코드 출처와 재구성 범위

Social A는 프로젝트 작성자의 기존 Project Auto에서 필요한 순수 계산·검증 규칙을 선별 재사용하고 데모 화면·저장소·합성 자료를 별도로 구성한 포트폴리오다. 전체를 처음부터 새로 작성했다고 주장하지 않는다.

| 원본 상대 경로 | 공개 후보의 상대 경로 | 사용 범위 |
|---|---|---|
| lib/date-range.ts | lib/date-range.ts | 날짜·기간 계산, 운영 갱신 제거 |
| lib/monitoring/goal-performance.ts | 동일 경로 | 최소 입력 모델로 목표 집계 재구성 |
| lib/monitoring/goal-account-priority.ts | 동일 경로 | 목표 달성률 정렬 |
| lib/domain/performance-goals.ts | 동일 경로 | 목표 타입 |
| ops/threads-daily/account-window.mjs | lib/metrics/account-window.mjs | 순수 관측 계산 |
| ops/threads-daily/follower-range.mjs | lib/metrics/insights-midnight.mjs | 시간 경계 계산, DB 조회 제외 |
| ops/threads-daily/post-range.mjs | lib/metrics/post-range.mjs | 게시물 기간 증가량 집계, 외부 조회 제외 |
| lib/threads/production-account-enrollment.ts | lib/onboarding-domain.ts | 핸들 정규화·프로필 일치 검증을 선별 재작성 |

화면·세션 저장소는 데모에 맞게 새로 구성했다. 화면 계약과 색상 계열은 원본을 참고했다. 지표·계정·댓글·후보는 합성 자료다. 외부 폰트·이미지·아이콘 패키지나 원본 QA 이미지는 포함하지 않는다.

원본 Git 이력·저장소 주소·팀원 식별 정보·환경 파일·운영 자료는 포함하지 않는다. 작성자는 원본을 직접 만들었다고 확인했고, 작업자는 비공개 원본 저장소의 소유 계정이 연결된 사용자 계정과 일치함을 읽기 전용으로 대조했다.

공개 선별본의 작성자 소유 코드와 동봉 문서는 LICENSE의 MIT 조건으로 제공한다. 비공개 원본 전체와 외부 의존성의 라이선스를 바꾸지는 않는다. 권리 상태는 RIGHTS.md, 의존성은 THIRD-PARTY-NOTICES.md와 DEPENDENCY-LICENSES.json을 참고한다.
