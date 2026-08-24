# QA Report: 가능성 예보국

| Field | Value |
|-------|-------|
| **Date** | 2026-08-25 |
| **URL** | https://wbmaker2.github.io/possibility-forecast-office/ (200), 기존 Sites URL (404), http://localhost:4017 |
| **Branch** | `main` |
| **Commit** | 0f7a9ee (배포 소스) |
| **PR** | — |
| **Tier** | Standard |
| **Scope** | 첫 화면, 개념, 안내 연습, 미션 1~5, 최종 요약, 375×812 모바일 |
| **Duration** | 기준선 약 25분 + 수정 후 재검증 약 35분 |
| **Pages visited** | SPA 1개, 주요 상태 49개 |
| **Screenshots** | 기준선 4개 + 수정 후 9개 |
| **Framework** | React/Vinext/Vite |

## Baseline Health Score: 55/100

| Category | Score |
|----------|-------|
| Console | 85 |
| Links | 20 |
| Visual | 72 |
| Functional | 55 |
| UX | 42 |
| Performance | 90 |
| Accessibility | 88 |

## Final Health Score: 96/100

| Category | Score |
|----------|-------|
| Console | 100 |
| Links | 100 |
| Visual | 96 |
| Functional | 100 |
| UX | 96 |
| Performance | 90 |
| Accessibility | 96 |

## Top 3 Things to Fix

1. **ISSUE-001: 공개 주소 404** — 학생이 앱에 들어올 수 없다.
2. **ISSUE-002: 내부 영어 값 노출** — 미션 2의 답과 요약에 영어 코드값이 보인다.
3. **ISSUE-003: 풀이 자료가 다음 화면에서 사라짐** — 선택과 누적 계산에 필요한 값을 외워야 한다.

## Summary

| Severity | Count |
|----------|-------|
| Critical | 1 |
| High | 3 |
| Medium | 4 |
| Low | 0 |
| **Total** | **8** |

## Issues

### ISSUE-001: 공개 주소가 404로 열림

| Field | Value |
|-------|-------|
| **Severity** | critical |
| **Category** | functional |
| **URL** | 공개 URL |

**Description:** 2026-08-25 기준 공개 주소의 제목은 `찾을 수 없음`, HTTP 상태는 404였다. 로컬 복구본은 정상 실행된다.

**Evidence:** ![공개 404](screenshots/2026-08-25/baseline-public-404.png)

### ISSUE-002: 학생 선택지와 요약에 내부 영어 값 노출

| Field | Value |
|-------|-------|
| **Severity** | high |
| **Category** | content / functional |
| **URL** | 미션 2 첫 선택, 최종 선택, 비교, 최종 요약 |

**Description:** `more-likely`, `less-likely`가 라디오 이름과 선택 기록에 그대로 보인다. 학생은 뜻을 알 수 없고 화면 언어도 일관되지 않는다.

### ISSUE-003: 선택·누적 계산 화면에 필요한 자료가 없음

| Field | Value |
|-------|-------|
| **Severity** | high |
| **Category** | ux / functional |
| **URL** | 모든 미션의 첫 선택, 모두 합친 자료, 최종 선택 |

**Description:** 첫 선택에서는 이전 화면의 칸 수나 비율을, 누적 계산에서는 첫 자료와 새 자료 횟수를 기억해야 한다. 미션 1의 예: 파랑 `5+3`, 초록 `5+7`, 회색 `2+2`라는 중간값 없이 0~24에서 답을 고르게 한다.

### ISSUE-004: 실제 결과와 신호판 칸의 쓰임이 연결되지 않음

| Field | Value |
|-------|-------|
| **Severity** | high |
| **Category** | educational UX |
| **URL** | 알려진 구조를 쓰는 안내 연습, 미션 1, 미션 5 |

**Description:** 미션 5에서 학생은 빨강 `5/5`를 센 직후 설명 없이 신호판 `1/2`로 예보해야 한다. 두 수가 왜 다른지와 어느 수를 고를지 같은 화면에서 설명해야 한다.

### ISSUE-005: 같은 결과 그림의 반복과 긴 모바일 스크롤

| Field | Value |
|-------|-------|
| **Severity** | medium |
| **Category** | visual / ux |
| **URL** | 여러 찾을 결과가 같은 실행 자료를 공유하는 미션 |

**Description:** 미션 1과 5에서 같은 실행 결과가 찾을 항목별로 반복된다. 데스크톱에서도 길고 모바일에서는 선택 상자까지 도달하기 전에 맥락을 잃기 쉽다.

### ISSUE-006: 미선택과 오답의 안내가 같고 구체성이 부족함

| Field | Value |
|-------|-------|
| **Severity** | medium |
| **Category** | ux / content |
| **URL** | 횟수, 예보, 선택 검증 단계 |

**Description:** 아무것도 고르지 않은 경우에도 `다시 비교해 골라 주세요`가 나와, 먼저 어떤 칸을 눌러야 하는지 알려 주지 않는다. 오답도 어느 자료를 다시 볼지 충분히 좁혀 주지 않는다.

### ISSUE-007: 조사와 문장부호 오류

| Field | Value |
|-------|-------|
| **Severity** | medium |
| **Category** | content |
| **URL** | 미션 4·5 찾을 결과, 일부 최종 예보 |

**Description:** `파란 표식가 나타남`, `빨강가 나타남`, `신호판의 칸은 그대로예요.:`가 노출된다.

### ISSUE-008: 다음 행동의 시각적·문장 안내 부족

| Field | Value |
|-------|-------|
| **Severity** | medium |
| **Category** | ux / accessibility |
| **URL** | 전체 학습 단계 |

**Description:** 주요 버튼은 동작하지만 다른 컨트롤과 비슷하고, 화면마다 `지금 할 일`이 없다. 375×812에서 가로 넘침은 없었으나 핵심 버튼 너비가 93px인 화면이 있어 발견 가능성을 높일 필요가 있다.

**Evidence:** ![모바일 첫 자료](screenshots/2026-08-25/baseline-mobile-first-count.png)

## Baseline Browser Evidence

- 데스크톱 첫 화면: ![데스크톱 첫 화면](screenshots/2026-08-25/baseline-desktop-home.png)
- 모바일 첫 화면: ![모바일 첫 화면](screenshots/2026-08-25/baseline-mobile-home.png)
- 375×812 가로 넘침: 없음 (`scrollWidth 360 <= innerWidth 375`)
- 로컬 콘솔 오류: 없음
- 실제 아동 참가자 조사: 미실시. 초등학생 첫 사용 상황을 가정한 직접 조작 휴리스틱 테스트임.

## Fixes Applied

| Issue | Fix Status | Commit | Files Changed |
|-------|-----------|--------|---------------|
| ISSUE-001 | fixed — GitHub Pages 공개 주소로 복구 | 0f7a9ee 배포 | 기존 Pages 워크플로 재사용 |
| ISSUE-002 | fixed — 쉬운 한국어 선택 이름 | 136cee5 | session.ts, visuals.tsx, 테스트 |
| ISSUE-003 | fixed — 선택 비율·합치기 도움식 | 7b0d263 | MissionFlow.tsx, visuals.tsx, 콘텐츠·테스트 |
| ISSUE-004 | fixed — 실제 결과와 신호판 칸 비교 | 7b0d263 | MissionFlow.tsx, visuals.tsx |
| ISSUE-005 | fixed — 공유 결과판 한 번만 표시 | 7b0d263 | visuals.tsx, 테스트 |
| ISSUE-006 | fixed — 빈칸·오답별 다음 행동 안내 | 5b1734b | feedback.ts, ForecastOffice.tsx, 테스트 |
| ISSUE-007 | fixed — 조사·문장부호 교정 | 5ba499b | korean.ts, visuals.tsx, 테스트 |
| ISSUE-008 | fixed — 지금 할 일·아우라·모바일 전체 폭 | df8fa3d, 6cf9f2c | StepAction.tsx, CSS, E2E |

## Final Browser Evidence

- 공개 주소 HTTP 200, 제목 '가능성 예보국'
- 375×812 시작 버튼 292px, 단계 버튼 328px
- 375px 가로 넘침 없음
- 현재 공개 페이지 콘솔 오류 0개
- 안내 연습과 미션 1~5 완료, 최종 요약 5행
- 업데이트 내역에 2026-08-25 항목 노출
- 실제 아동 참가자 조사는 미실시했으며 초등 5~6학년 첫 사용 상황을 가정한 직접 조작 점검임

### 수정 후 화면

- 모바일 시작: ![수정 후 모바일 시작](screenshots/2026-08-25/after-mobile-start.png)
- 분수 위·아래와 다음 행동: ![수정 후 첫 자료](screenshots/2026-08-25/after-mobile-first-count.png)
- 실제 결과와 신호판 비교: ![수정 후 신호판 비교](screenshots/2026-08-25/after-known-model-comparison.png)
- 선택에 쓸 비율 요약: ![수정 후 선택 자료](screenshots/2026-08-25/after-decision-summary.png)
- 누적 덧셈 도움식: ![수정 후 합치기 도움](screenshots/2026-08-25/after-cumulative-help.png)
- 같은 비율 오답 안내: ![수정 후 같은 비율 안내](screenshots/2026-08-25/after-same-rate-guidance.png)
- 공유 결과판 한 번 표시: ![수정 후 공유 결과판](screenshots/2026-08-25/after-shared-result-board.png)
- 모바일 완료 요약: ![수정 후 완료 화면](screenshots/2026-08-25/after-mobile-summary.png)
- 실제 공개 페이지: ![공개 모바일 첫 자료](screenshots/2026-08-25/after-public-mobile-first-count.png)

## Verification

| Check | Result |
|-------|--------|
| TypeScript | pass |
| ESLint | pass |
| 콘텐츠 계약 | 안내 1개 + 미션 5개 pass |
| Unit | 43 pass |
| SSR HTML | 2 pass |
| Playwright E2E | 13 pass |
| Vinext build | pass |
| GitHub Pages build | pass |
| Runtime security audit | 0 vulnerabilities |
| GitHub Pages deploy | success |

## Ship Readiness

| Metric | Value |
|--------|-------|
| Health score | 55 → 96 |
| Issues found | 8 |
| Fixes applied | 8 |
| Deferred | 0 |

공개 주소: https://wbmaker2.github.io/possibility-forecast-office/

배포 실행: https://github.com/WBmaker2/possibility-forecast-office/actions/runs/32789496782
