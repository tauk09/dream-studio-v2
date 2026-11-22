# Dream Studio 2.0 — Test Strategy

## 1. 자동화 테스트 계층 (`corepack pnpm test`)
- **코어 단위 테스트 (`packages/core/src/__tests__/core.test.ts`)**:
  - `DreamProjectSchema` Zod v2 검증
  - `applyComponentPropertyUpdate` 불변성 및 숫자 min/max 클램핑 검증
  - `restoreDreamProjectVersion` 실행 시 제목·소스·그래프 일괄 복원 검증
- **백엔드 API & 보안 테스트 (`apps/api/src/__tests__/api.test.ts`)**:
  - API 키 미설정 시 `POST /api/ai/jobs` → `HTTP 503 AI_NOT_CONFIGURED` 반환 검증
  - `CodeValidator`가 `eval`, `fetch`, `document.cookie`, 경로 탈출을 차단하는지 검증
  - `PreviewBundler`의 CSP(`connect-src 'none'`) 및 `window.__DREAM_CONFIG__` 주입 검증
  - `testFixtureMode: true` 생성 작업 완료 및 `POST /api/ai/edit` Diff 생성 검증
- **프론트엔드 컴포넌트 테스트 (`apps/web/src/__tests__/App.test.tsx`)**:
  - 랜딩 페이지 및 작품 생성 허브 라우팅 렌더링 검증
  - `SandboxedPreview` iframe의 `sandbox="allow-scripts"` 강제 및 `allow-same-origin` 미포함 검증

## 2. 정적 품질 검사
- `corepack pnpm typecheck` (TypeScript 5.9 strict)
- `corepack pnpm lint` (ESLint 9 + typescript-eslint, 경고 0 / 오류 0)
- `corepack pnpm build` (프로덕션 Vite + tsc 빌드)

## 3. 실브라우저 E2E 검증
- Chromium 브라우저에서 랜딩 → 503 가드 → Fixture 웹사이트 생성·자동 이동 → 3패널 에디터 블록 편집·AI Diff 승인 → 전체 새로고침 IndexedDB 영속성 → 게시 `/p/:slug` 독립 뷰어 → 게임 추천·생성·Canvas 플레이까지 전 흐름 검증 완료.
