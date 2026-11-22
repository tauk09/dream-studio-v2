# Dream Studio 2.0 — Sandbox & Security Architecture

## 1. 다층 방어(Defense-in-Depth) 구조
AI가 생성한 임의의 HTML/CSS/JS 코드를 학생 브라우저에서 안전하게 실행하기 위해 **정적 검증 + CSP 차단 + Opaque Origin 격리**의 3중 방어를 적용합니다.

### 계층 1: 서버 측 정적 코드 검증 (`apps/api/src/validator/CodeValidator.ts`)
- **문법 검증**: TypeScript 컴파일러(`ts.transpileModule`)로 JS 문법 오류 사전 탐지
- **경로 탈출 차단**: `..`, 선행 `/`, `\` 포함 파일명 거부
- **위험 API 정적 차단**: `eval(`, `new Function`, `document.cookie`, `window.top`, `window.parent.location`, `localStorage`, `sessionStorage`, `indexedDB`, `fetch(`, `XMLHttpRequest`, `WebSocket`, `navigator.sendBeacon`, 외부 `<script src="http...">` 차단
- **용량 제한**: 파일 수 및 전체 바이트 크기 상한 적용

### 계층 2: 프리뷰 번들러 CSP 주입 (`apps/api/src/sandbox/PreviewBundler.ts`)
- 생성된 `srcdoc` HTML에 엄격한 `<meta http-equiv="Content-Security-Policy">` 주입:
  - `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none';`
- 외부 네트워크 요청(`connect-src 'none'`) 및 외부 리소스 로딩을 브라우저 레벨에서 원천 차단

### 계층 3: Opaque Origin iframe (`apps/web/src/components/ui/SandboxedPreview.tsx`)
- `<iframe sandbox="allow-scripts" srcDoc={previewHtml} />`
- **`allow-same-origin`을 절대 포함하지 않음** → 브라우저 검증에서 `frame origin="null"` 확인 완료
- 부모 앱의 IndexedDB, 쿠키, DOM에 접근 불가하며, 오직 허용된 `postMessage` 프로토콜(`DREAM_PREVIEW_READY`, `DREAM_RUNTIME_ERROR`, `DREAM_MANIFEST_UPDATE`)로만 통신합니다.
