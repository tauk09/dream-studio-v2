# Dream Studio 2.0 — AI-Native No-Code Creative Platform

**"상상한 아이디어가, 진짜 작품이 되는 곳."**

코딩 경험이 없는 학생이 자신의 장래희망과 아이디어를 한국어로 설명하면, AI가 맞춤형 웹사이트와 실제 플레이 가능한 2D 웹 게임을 새로 설계·구현하고, 학생은 **블록 속성 편집기**와 **AI 대화 수정(Diff 승인)**으로 작품을 자유롭게 발전시킬 수 있는 웹 플랫폼입니다.

## 주요 특징
- **템플릿 한계 제거**: 고정된 웹사이트/게임 템플릿 조합이 아닌, AI가 실행 코드(`index.html`, `styles.css`, `app.js`)와 편집 가능한 `ComponentGraph`를 새로 생성합니다.
- **정직한 AI 상태 관리**: `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` 중 하나가 설정되면 실제 AI로 동작하며, 키가 없을 때는 모의 결과를 AI 생성으로 위장하지 않고 `HTTP 503 AI_NOT_CONFIGURED`를 반환합니다. 파이프라인 검증을 위한 **개발 테스트 모드(Fixture)**는 opt-in 토글로 엄격히 분리되어 있습니다.
- **3중 보안 샌드박스**: 서버 측 정적 문법·보안 검증(`CodeValidator`) + CSP `connect-src 'none'` + Opaque Origin `<iframe sandbox="allow-scripts">` (`allow-same-origin` 미포함).
- **로컬 영속성 & 독립 게시**: Dexie IndexedDB 자동 저장, 버전 복원, 불변 스냅샷 게시(`/p/:slug`, `/g/:slug`).

## 빠른 실행
```bash
cd dream-studio-v2
corepack pnpm install

# (선택) 실제 AI 생성을 활성화하려면 apps/api/.env 생성 후 API 키 입력
# cp apps/api/.env.example apps/api/.env

# 개발 서버 실행 (Web: http://localhost:5173, API: http://127.0.0.1:4000)
corepack pnpm dev
```

## 검증 명령어
```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```

## 문서 목록
- 전체 설계 문서: [`docs/`](./docs/) (15종 완비)
- 외부 기술 검토 보고서: [`DREAM_STUDIO_V2_REVIEW.md`](./DREAM_STUDIO_V2_REVIEW.md)
