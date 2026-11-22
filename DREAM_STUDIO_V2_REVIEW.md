# DREAM STUDIO 2.0 — 외부 기술 검토 보고서 (`DREAM_STUDIO_V2_REVIEW.md`)

> 작성일: 2026-11-22  
> 프로젝트 경로: `/Users/HAHAHA00/Desktop/Gemini/dream-studio-v2`  
> 원칙: 실제로 동작하고 검증된 기능만 완료로 보고하며, **실제 AI 호출 / 개발 테스트 Fixture / 코드 구현만 완료 / 설계 전용 / 미구현**을 엄격히 구분합니다.

---

## 1. 프로젝트 개요 및 아키텍처 전환 요약
- 기존 v1(`/Users/HAHAHA00/Desktop/Gemini/dream-studio`)과 레거시 프로젝트(`/Users/HAHAHA00/Desktop/Gemini/legacy_crossy_project`)를 전혀 수정·삭제하지 않고, 완전히 새로운 독립 모노레포 `dream-studio-v2`를 구축했습니다.
- 고정된 템플릿·3종 엔진 조합 구조를 폐기하고, **AI 코드 생성 + `ComponentGraph` 기반 블록 편집 + AI 대화 Diff 승인 + Opaque-Origin 격리 샌드박스** 아키텍처로 전환했습니다.

## 2. 기술 스택 및 워크스페이스 구성
- **모노레포**: `pnpm@10.34.9` (Corepack), TypeScript `~5.9.3` (strict), ESLint 9, Vitest `5.1.1`
- **`packages/core` (`@dream-studio-v2/core`)**: Zod v2.0.0 스키마, 결정적 SHA-256 해시, 블록 속성 불변 갱신, 버전 복원
- **`apps/api` (`@dream-studio-v2/api`)**: Fastify 5, 멀티 LLM 프로바이더(`Gemini/OpenAI/Anthropic`), `CodeValidator`, `PreviewBundler`, `GenerationJobStore`, `StudioOrchestrator`, 격리된 `DevFixtureProvider`
- **`apps/web` (`@dream-studio-v2/web`)**: React 19, Vite 8, Tailwind CSS v4, React Router 8, Dexie IndexedDB, Lucide React

## 3. 브랜드 & 디자인 시스템 구현 현황
- 컬러 토큰(`#6858F5`, `#5544E4`, `#17182B`, `#70758B`, `#F7F8FC`, `#FFFFFF`, `#E6E8F0`, `#32CDB5`, `#FFB66D`, `#E75566`, `#1EA882`)과 `Pretendard Variable` 타이포그래피, `prefers-reduced-motion`을 `apps/web/src/index.css`에 적용했습니다.
- 공통 UI 프리미티브(`Logo`, `Button`, `Badge`, `SandboxedPreview`, `AIStatusBanner`, `PublicHeader`, `WorkspaceLayout`) 구현 완료.

## 4. 구현된 페이지 및 라우트 현황
- 퍼블릭: `/`, `/about`, `/guide`, `/explore`, `/help`, `/login`
- 스튜디오: `/app`, `/app/create`, `/app/create/website`, `/app/create/game`, `/app/generating/:jobId`, `/app/projects`, `/app/projects/:id/edit`, `/account`
- 독립 게시 뷰어: `/p/:slug`, `/g/:slug`

## 5. 실제 AI 생성 vs 개발 테스트 Fixture 구분 (정직성 보고)
| 구분 | 상태 | 설명 |
| :--- | :--- | :--- |
| **실제 외부 LLM 호출** (`GeminiProvider`, `OpenAIProvider`, `AnthropicProvider`) | 코드 구현 완료 / **라이브 키 미설정** | 현재 호스트 환경에 `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`가 모두 미설정 상태입니다. 따라서 실제 외부 LLM 호출은 실행되지 않았으며, 기본 요청 시 정직하게 `HTTP 503 AI_NOT_CONFIGURED`를 반환함을 API 테스트 및 실브라우저에서 검증했습니다. |
| **개발 테스트 모드** (`DevFixtureProvider`) | 구현 및 E2E 검증 완료 | 사용자가 명시적으로 `개발 테스트 모드 (Fixture)` 체크박스를 켜고 `testFixtureMode: true`를 전송할 때만 동작합니다. 생성된 작품에는 `generatorSource: "dev_fixture"`와 `개발 테스트 Fixture` 배지가 표시됩니다. |

## 6. 생성 파이프라인 및 자동 복구(Repair Agent)
- `POST /api/ai/jobs` → `202 Accepted { ok: true, jobId }` 반환 후 백그라운드 비동기 단계(`analyzing_intent` → `planning_concept` → `generating_code` → `validating_build` → `repairing_code` → `completed/failed/cancelled`)를 `GET /api/ai/jobs/:jobId`로 실시간 폴링합니다.
- 정적 검증 실패 시 최대 2회 Repair Agent 재시도 로직이 `StudioOrchestrator.ts`에 구현되어 있습니다.

## 7. 정적 보안 검증 및 샌드박스 격리
- **정적 검증 (`CodeValidator.ts`)**: `ts.transpileModule` 문법 검사, 경로 탈출 차단, `eval`/`new Function`/`fetch`/`XMLHttpRequest`/`WebSocket`/`document.cookie`/`window.top`/`localStorage`/외부 `<script>` 차단.
- **CSP 번들러 (`PreviewBundler.ts`)**: `connect-src 'none'`, `default-src 'none'` 주입.
- **Opaque Origin iframe (`SandboxedPreview.tsx`)**: `sandbox="allow-scripts"`만 부여(`allow-same-origin` 미포함). 브라우저 검증에서 `frame origin="null"` 확인 완료.

## 8. 3패널 통합 스튜디오 에디터
- **좌측 패널**: `ComponentGraph` 구조 트리(`block` vs `ai_only` 배지), 버전 기록 및 1-클릭 복원, 읽기 전용 소스 파일 뷰어.
- **중앙 캔버스**: PC/태블릿/모바일 반응형 뷰포트 전환 + `SandboxedPreview`.
- **우측 패널**: `블록 속성 편집`(텍스트·색상·숫자 슬라이더·불리언 즉시 `postMessage` 반영) + `AI와 함께 수정`(Diff 미리보기 후 명시적 승인 시에만 반영).
- **Undo/Redo**: 에디터 상단 툴바에서 동작.

## 9. 데이터 영속성 및 독립 게시
- Dexie IndexedDB(`DreamStudioV2DB`)에 `projects`와 `published` 테이블을 분리 저장.
- 에디터에서 블록 수정 + AI Diff 적용 후 브라우저 전체 새로고침(`page.reload()`)을 수행해 제목·노드 수·수정 코드가 그대로 복원됨을 확인했습니다.
- `게시하기` 클릭 시 불변 스냅샷을 저장하고 `/p/:slug`, `/g/:slug` 독립 뷰어에서 편집 UI 없이 실행됨을 확인했습니다.

## 10. 자동화 검증 결과
- `corepack pnpm typecheck`: **PASS** (`core`, `api`, `web` 모두 0 error)
- `corepack pnpm lint`: **PASS** (ESLint 0 error, 0 warning)
- `corepack pnpm test`: **PASS** (3개 테스트 스위트, 8/8 테스트 통과 — `core.test.ts` 1/1, `api.test.ts` 4/4, `App.test.tsx` 3/3)
- `corepack pnpm build`: **PASS** (`tsc` + Vite 8 프로덕션 번들 성공)

## 11. 실브라우저 E2E 검증 결과
호스트 검증 출처: `http://localhost:5173` (차단된 origin 없음)  
호스트 검증 최종 스크린샷: `/Users/HAHAHA00/.gemini/antigravity/brain/cff55fa1-eb8b-4245-9aaa-93c4db908237/browser_evidence/c5a246d5-ab70-40a8-b421-83fb6ad92828/final_step_75.png`

1. **랜딩 페이지 (`/`)**: PASS — 히어로 헤드라인 및 웹사이트/게임 예시 탭 전환 정상, 콘솔 오류 0건.
2. **웹사이트 503 가드 (`/app/create/website`)**: PASS — API 키 미설정 상태 정직 표시, Fixture 미체크 제출 시 `HTTP 503 AI_NOT_CONFIGURED` 알림 표시.
3. **웹사이트 Fixture 생성 & 자동 이동**: PASS — `/app/generating/:jobId` 자동 이동, 완료 후 `SandboxedPreview`(`sandbox="allow-scripts"`, `origin="null"`) 렌더링.
4. **에디터 블록 편집 · AI Diff 승인 · 새로고침 영속성 · 게시 (`/p/:slug`)**: PASS — 제목 변경 즉시 반영, AI Diff 승인 후 3노드 갱신, `page.reload()` 후 IndexedDB 유지, 독립 `/p/:slug` 뷰어 HTTP 200 실행.
5. **게임 추천 & Canvas 플레이 (`/app/create/game`)**: PASS — `아이디어 추천` 카드 2종 정상 렌더링, 선택 후 자동 이동·생성 완료, `<canvas>`(`760x392`) 내 `탐사 시작` 클릭 시 게임 루프(`탐사 중`, `🔋 99%`) 정상 동작.

## 12. 검증 중 발견하고 즉시 수정한 결함
1. **`packages/core/src/operations.ts` 참조 공유 버그**: `versions[0].graphSnapshot`이 `componentGraph`와 참조를 공유할 경우 `structuredClone`이 내부 참조를 유지해 버전 복원 시 v1 제목이 덮어써지던 문제를 `core.test.ts`가 탐지하여, `applyComponentPropertyUpdate` 내부에서 `componentGraph`와 `source.files`를 독립 복제하도록 수정했습니다.
2. **프론트엔드 API 응답 매핑 불일치 2건**: 실브라우저 E2E 중 `POST /api/ai/jobs` 응답(`res.jobId`)과 `POST /api/ai/recommend-games` 응답(`res.ideas`)의 필드명 불일치를 발견하여 `studioApi.ts`, `CreateWebsitePage.tsx`, `CreateGamePage.tsx`를 수정하고 재검증으로 100% 통과시켰습니다.

## 13. 설계 문서 완비 현황 (`docs/` 15종)
`PRODUCT_VISION.md`, `PRODUCT_REQUIREMENTS.md`, `INFORMATION_ARCHITECTURE.md`, `USER_FLOWS.md`, `DESIGN_SYSTEM.md`, `PAGE_BY_PAGE_SPEC.md`, `WEBSITE_EDITOR_SPEC.md`, `GAME_EDITOR_SPEC.md`, `AI_GENERATION_ARCHITECTURE.md`, `SANDBOX_SECURITY.md`, `PROJECT_DATA_MODEL.md`, `API_CONTRACTS.md`, `DEVELOPMENT_ROADMAP.md`, `TEST_STRATEGY.md`, `IMPLEMENTATION_STATUS.md` 작성 완료.

## 14. 현재 미구현 및 향후 과제 (Phase F)
- 외부 LLM API 키 설정 후 실제 Gemini/OpenAI/Anthropic 라이브 생성 품질·Repair Agent 실전 검증
- 학교 계정 로그인(OAuth/이메일) 및 서버 DB(PostgreSQL/S3) 클라우드 동기화
- 타 기기 공유 가능한 서버 호스팅 퍼블릭 URL 및 모더레이션 갤러리
- 사용자 이미지/오디오 에셋 업로드 기능

## 15. 알려진 제한 사항
- 현재 게시 기능(`/p/:slug`, `/g/:slug`)은 로컬 브라우저 IndexedDB 스냅샷 기반이므로 동일 브라우저 내에서만 열람 가능합니다.
- 프론트엔드 프로덕션 번들(`dist/assets/index-*.js`, 553.67 kB / gzip 167.65 kB)은 추후 라우트별 `React.lazy` 코드 스플리팅으로 초기 로딩을 더 줄일 수 있습니다.

## 16. 기존 프로젝트 보존 확인
- `/Users/HAHAHA00/Desktop/Gemini/dream-studio`: 미수정 보존
- `/Users/HAHAHA00/Desktop/Gemini/legacy_crossy_project`: 미수정 보존

## 17. 검토자 확인 권장 사항
1. `apps/api/.env`에 `GEMINI_API_KEY` 등 실제 키를 입력하고 실제 LLM 생성·AI Diff 수정을 테스트할지 여부
2. Phase F(계정 인증·클라우드 DB·서버 공유 URL) 착수 우선순위 결정
