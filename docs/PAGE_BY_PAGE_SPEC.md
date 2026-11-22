# Dream Studio 2.0 — Page-by-Page Specification

각 핵심 페이지의 라우트, 목적, 대상 사용자, 레이아웃, 핵심 구성요소, 사용자 인터랙션, 데이터/API 연결, 상태(로딩·빈 상태·오류·완료), 보안/접근성 고려사항, 구현 상태를 정리합니다.

## 1. 랜딩 페이지 (`/`)
- **목적**: 서비스 비전 전달 및 즉시 창작 진입 유도
- **레이아웃**: Sticky `PublicHeader` + 12-col Hero + 2-col Website/Game 비교 + 3-col 3단계 플로우 + 최종 CTA + Footer
- **인터랙션**: 히어로 미리보기 카드 `웹사이트 예시` / `게임 예시` 탭 전환, `/app/create` 및 `/app` 이동
- **데이터**: 정적 UI (허위 사용자 통계·가짜 후기 없음)
- **구현 상태**: 구현 및 브라우저 검증 완료 (`apps/web/src/pages/LandingPage.tsx`)

## 2. 대시보드 & 프로젝트 목록 (`/app`, `/app/projects`)
- **목적**: 새 작품 시작 및 기존 로컬 작품 관리
- **레이아웃**: `WorkspaceLayout` (248px 사이드바) + 빠른 생성 2카드 + 검색/필터 바 + 3열 프로젝트 카드 그리드
- **인터랙션**: 검색, 종류 필터(`전체/웹사이트/게임`), 편집, 게시 링크 열기, 복제, 삭제 확인 모달
- **데이터**: Dexie IndexedDB (`listProjects`, `duplicateProject`, `deleteProject`)
- **상태**: 로딩 스켈레톤, 빈 상태 CTA, 삭제 확인 모달
- **구현 상태**: 구현 및 브라우저 검증 완료 (`apps/web/src/pages/DashboardPage.tsx`)

## 3. 작품 종류 선택 허브 (`/app/create`)
- **목적**: 웹사이트와 게임 중 창작 유형 선택
- **레이아웃**: `WorkspaceLayout` + 2열 대형 선택 카드
- **구현 상태**: 구현 및 브라우저 검증 완료 (`apps/web/src/pages/CreateHubPage.tsx`)

## 4. 웹사이트 생성 마법사 (`/app/create/website`)
- **목적**: 3개 질문(주제·분위기 6종·추가 요청)으로 웹사이트 생성 작업 시작
- **데이터/API**: `GET /api/ai/status`, `POST /api/ai/jobs`
- **상태**: API 키 미설정 시 503 오류 알림(`role="alert"`), opt-in 개발 테스트 모드(Fixture) 토글, 제출 중 비활성화
- **구현 상태**: 구현 및 브라우저 검증 완료 (`apps/web/src/pages/CreateWebsitePage.tsx`)

## 5. 게임 생성 마법사 (`/app/create/game`)
- **목적**: Mode A(장래희망 기반 AI 게임 추천) 또는 Mode B(직접 설명)로 2D 게임 생성 시작
- **데이터/API**: `GET /api/ai/status`, `POST /api/ai/recommend-games`, `POST /api/ai/jobs`
- **구현 상태**: 구현 및 브라우저 검증 완료 (`apps/web/src/pages/CreateGamePage.tsx`)

## 6. 생성 진행 및 완료 프리뷰 (`/app/generating/:jobId`)
- **목적**: 백엔드 실제 파이프라인 단계 표시, 취소, 완료 시 자동 저장 및 즉시 샌드박스 실행
- **데이터/API**: `GET /api/ai/jobs/:jobId` (350ms 폴링), `POST /api/ai/jobs/:jobId/cancel`, Dexie `saveProject`
- **상태**: 작업 미발견(404), 진행 중, 취소됨, 실패(오류 상세), 완료(실시간 `SandboxedPreview` + 에디터 이동 CTA)
- **구현 상태**: 구현 및 브라우저 검증 완료 (`apps/web/src/pages/GeneratingPage.tsx`)

## 7. 3패널 통합 스튜디오 에디터 (`/app/projects/:id/edit`)
- **목적**: 블록 속성 즉시 편집, AI 대화 수정(Diff 승인), 버전 복원, 반응형 미리보기, 게시
- **레이아웃**: 상단 툴바(제목·PC/태블릿/모바일·Undo/Redo·저장·게시) + 좌측(256px 구조/버전/코드) + 중앙(`SandboxedPreview`) + 우측(330~360px 블록 속성/AI 수정)
- **데이터/API**: Dexie `getProject/saveProject/publishProject/unpublishProject`, `POST /api/preview/bundle`, `POST /api/ai/edit`
- **구현 상태**: 구현 및 브라우저 검증 완료 (`apps/web/src/pages/ProjectEditorPage.tsx`)

## 8. 독립 게시 뷰어 (`/p/:slug`, `/g/:slug`)
- **목적**: 편집 크롬 없이 게시된 불변 스냅샷을 안전하게 실행·공유
- **데이터**: Dexie `getPublishedBySlug(slug)`
- **구현 상태**: 구현 및 브라우저 검증 완료 (`apps/web/src/pages/PublicViewerPage.tsx`)

## 9. 보조 안내 페이지 (`/about`, `/guide`, `/explore`, `/help`, `/login`, `/account`)
- **목적**: 서비스 철학, 사용법, 게시 갤러리, FAQ, Phase F 계정 로드맵 안내
- **구현 상태**: 구현 완료 (`apps/web/src/pages/SecondaryPages.tsx`)
